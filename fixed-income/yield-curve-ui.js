/**
 * Term Structure & Forward Rates UI Controller
 * Interactive Curve Bootstrapping, High-DPI Curve Comparison Chart, and Arbitrary Forward Calculator.
 */

import {
  bootstrapSpotCurve,
  calculateForwardCurve,
  getSpecificForwardRate,
  analyzeTermStructureTheories
} from './fixed-income-engine.js';

// Historical Curve Presets
const REGIME_PRESETS = {
  'current-treasury': {
    name: 'Current US Treasury Benchmark',
    points: [
      { tenor: 0.25, parYield: 0.0450 },
      { tenor: 1, parYield: 0.0435 },
      { tenor: 2, parYield: 0.0425 },
      { tenor: 3, parYield: 0.0428 },
      { tenor: 5, parYield: 0.0435 },
      { tenor: 7, parYield: 0.0442 },
      { tenor: 10, parYield: 0.0450 },
      { tenor: 20, parYield: 0.0475 },
      { tenor: 30, parYield: 0.0465 }
    ]
  },
  'steep-normal': {
    name: 'Steep Normal Curve (2018 Expansion)',
    points: [
      { tenor: 0.25, parYield: 0.0175 },
      { tenor: 1, parYield: 0.0210 },
      { tenor: 2, parYield: 0.0245 },
      { tenor: 3, parYield: 0.0260 },
      { tenor: 5, parYield: 0.0285 },
      { tenor: 7, parYield: 0.0298 },
      { tenor: 10, parYield: 0.0315 },
      { tenor: 20, parYield: 0.0330 },
      { tenor: 30, parYield: 0.0335 }
    ]
  },
  'inverted-2023': {
    name: 'Deeply Inverted (2023 Rate Hikes)',
    points: [
      { tenor: 0.25, parYield: 0.0545 },
      { tenor: 1, parYield: 0.0540 },
      { tenor: 2, parYield: 0.0495 },
      { tenor: 3, parYield: 0.0460 },
      { tenor: 5, parYield: 0.0425 },
      { tenor: 7, parYield: 0.0415 },
      { tenor: 10, parYield: 0.0398 },
      { tenor: 20, parYield: 0.0425 },
      { tenor: 30, parYield: 0.0405 }
    ]
  },
  'flat-2019': {
    name: 'Flat Curve (2019 Transition)',
    points: [
      { tenor: 0.25, parYield: 0.0240 },
      { tenor: 1, parYield: 0.0238 },
      { tenor: 2, parYield: 0.0235 },
      { tenor: 3, parYield: 0.0235 },
      { tenor: 5, parYield: 0.0238 },
      { tenor: 7, parYield: 0.0242 },
      { tenor: 10, parYield: 0.0245 },
      { tenor: 20, parYield: 0.0260 },
      { tenor: 30, parYield: 0.0265 }
    ]
  },
  'zirp-2020': {
    name: 'ZIRP Pandemic Lows (2020)',
    points: [
      { tenor: 0.25, parYield: 0.0010 },
      { tenor: 1, parYield: 0.0015 },
      { tenor: 2, parYield: 0.0020 },
      { tenor: 3, parYield: 0.0028 },
      { tenor: 5, parYield: 0.0045 },
      { tenor: 7, parYield: 0.0065 },
      { tenor: 10, parYield: 0.0085 },
      { tenor: 20, parYield: 0.0135 },
      { tenor: 30, parYield: 0.0150 }
    ]
  }
};

const state = {
  parPoints: [...REGIME_PRESETS['current-treasury'].points],
  frequency: 2,
  forwardQuery: { t1: 1, t2: 5 }
};

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  updateCurveAnalysis();
});

function initEventListeners() {
  // Preset buttons
  document.querySelectorAll('.btn-preset-curve').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.dataset.preset;
      applyCurvePreset(key);
    });
  });

  // Par yield inputs
  document.querySelectorAll('.inp-par-tenor').forEach(input => {
    input.addEventListener('input', (e) => {
      const tenor = parseFloat(e.target.dataset.tenor);
      const val = parseFloat(e.target.value) || 0;
      const pt = state.parPoints.find(p => Math.abs(p.tenor - tenor) < 1e-4);
      if (pt) {
        pt.parYield = val / 100;
        updateCurveAnalysis();
      }
    });
  });

  // Arbitrary forward rate calculator
  const elT1 = document.getElementById('forward-t1');
  const elT2 = document.getElementById('forward-t2');
  if (elT1 && elT2) {
    const handleForwardChange = () => {
      let t1 = parseFloat(elT1.value) || 1;
      let t2 = parseFloat(elT2.value) || 5;
      if (t2 <= t1) t2 = t1 + 1;
      elT2.value = t2;
      state.forwardQuery = { t1, t2 };
      updateForwardQueryResult();
    };
    elT1.addEventListener('input', handleForwardChange);
    elT2.addEventListener('input', handleForwardChange);
  }

  // Redraw on window resize
  window.addEventListener('resize', () => {
    drawTermStructureChart();
  });
}

function applyCurvePreset(key) {
  const p = REGIME_PRESETS[key];
  if (!p) return;

  state.parPoints = p.points.map(pt => ({ ...pt }));

  // Update input fields
  state.parPoints.forEach(pt => {
    const el = document.querySelector(`.inp-par-tenor[data-tenor="${pt.tenor}"]`);
    if (el) el.value = (pt.parYield * 100).toFixed(2);
  });

  document.querySelectorAll('.btn-preset-curve').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === key);
  });

  updateCurveAnalysis();
}

function updateCurveAnalysis() {
  const spotCurve = bootstrapSpotCurve(state.parPoints, { frequency: state.frequency, maxTenor: 30 });
  const forwardCurve = calculateForwardCurve(spotCurve);
  const diagnostics = analyzeTermStructureTheories(spotCurve, forwardCurve);

  state._currentSpotCurve = spotCurve;
  state._currentForwardCurve = forwardCurve;

  // Update Scorecards
  const pt2Y = spotCurve.find(p => p.tenor === 2) || spotCurve[1];
  const pt10Y = spotCurve.find(p => p.tenor === 10) || spotCurve[spotCurve.length - 1];
  const spread10_2 = (pt10Y && pt2Y) ? Math.round((pt10Y.parYield - pt2Y.parYield) * 10000) : 0;

  setText('kpi-10_2-spread', `${spread10_2 > 0 ? '+' : ''}${spread10_2} bps`);
  const elBadge = document.getElementById('kpi-curve-regime');
  if (elBadge && diagnostics) {
    elBadge.textContent = diagnostics.regime.type;
    elBadge.className = `fi-badge ${diagnostics.regime.badge === 'warning' ? 'gold' : (diagnostics.regime.badge === 'positive' ? 'green' : '')}`;
  }

  const f9_10 = forwardCurve.find(f => f.tenor === 10);
  setText('kpi-forward-10y', f9_10 ? `${(f9_10.forwardRate1Y * 100).toFixed(2)}%` : '--');
  setText('kpi-spot-10y', pt10Y ? `${(pt10Y.spotRate * 100).toFixed(2)}%` : '--');

  // Regime Explanation
  const elExpl = document.getElementById('term-structure-explanation');
  if (elExpl && diagnostics) {
    elExpl.textContent = diagnostics.regime.summary;
  }

  // Draw High-DPI Chart
  drawTermStructureChart();

  // Update Arbitrary Forward Solver
  updateForwardQueryResult();

  // Render Decomposition Table
  renderDecompositionTable(diagnostics?.forwardDecomposition || []);
}

function updateForwardQueryResult() {
  if (!state._currentSpotCurve || !state._currentSpotCurve.length) return;
  const { t1, t2 } = state.forwardQuery;

  try {
    const fwd = getSpecificForwardRate(state._currentSpotCurve, t1, t2);
    setText('res-fwd-rate', `${(fwd.forwardRate * 100).toFixed(3)}%`);
    setText('res-fwd-term', `${fwd.t2 - fwd.t1}-Year Loan starting in Year ${fwd.t1}`);
    setText('res-fwd-spot1', `${(fwd.spot1 * 100).toFixed(2)}% (${fwd.t1}Y Spot)`);
    setText('res-fwd-spot2', `${(fwd.spot2 * 100).toFixed(2)}% (${fwd.t2}Y Spot)`);
    setText('res-fwd-df', fwd.forwardDiscountFactor.toFixed(4));
  } catch (err) {
    setText('res-fwd-rate', '--');
  }
}

function drawTermStructureChart() {
  const canvas = document.getElementById('canvas-term-structure');
  if (!canvas || !state._currentSpotCurve || !state._currentForwardCurve) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || 800;
  const h = 340;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const spotCurve = state._currentSpotCurve;
  const forwardCurve = state._currentForwardCurve;
  const parCurve = spotCurve.map(s => ({ tenor: s.tenor, yield: s.parYield }));

  const allRates = [
    ...spotCurve.map(s => s.spotRate),
    ...forwardCurve.map(f => f.forwardRate1Y),
    ...parCurve.map(p => p.yield)
  ];

  const minR = Math.max(0, Math.min(...allRates) - 0.005);
  const maxR = Math.max(...allRates) + 0.005;

  const minTenor = 1;
  const maxTenor = Math.max(...spotCurve.map(s => s.tenor));

  const padding = { top: 35, right: 30, bottom: 45, left: 60 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const getX = (t) => padding.left + ((t - minTenor) / (maxTenor - minTenor)) * chartW;
  const getY = (r) => padding.top + chartH - ((r - minR) / (maxR - minR)) * chartH;

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';

  const steps = 5;
  for (let s = 0; s <= steps; s++) {
    const rate = minR + (s / steps) * (maxR - minR);
    const y = getY(rate);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${(rate * 100).toFixed(2)}%`, padding.left - 8, y + 3);
  }

  // Draw 1. Par Yield Curve (Blue dashed)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  parCurve.forEach((pt, idx) => {
    const x = getX(pt.tenor);
    const y = getY(pt.yield);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw 2. Theoretical Spot Curve (Gold Solid)
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  spotCurve.forEach((pt, idx) => {
    const x = getX(pt.tenor);
    const y = getY(pt.spotRate);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw 3. 1-Year Forward Rate Curve (Green Solid)
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  forwardCurve.forEach((pt, idx) => {
    const x = getX(pt.tenor);
    const y = getY(pt.forwardRate1Y);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Plot Data Points
  spotCurve.forEach(pt => {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(getX(pt.tenor), getY(pt.spotRate), 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Legend
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(w - 360, 12, 14, 4);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Par Yield Curve', w - 340, 16);

  ctx.fillStyle = '#facc15';
  ctx.fillRect(w - 230, 12, 14, 4);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Spot Curve (z_t)', w - 210, 16);

  ctx.fillStyle = '#34d399';
  ctx.fillRect(w - 110, 12, 14, 4);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Forward 1Y', w - 90, 16);

  // X-axis Tenor Labels
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  [1, 2, 3, 5, 7, 10, 15, 20, 25, 30].forEach(t => {
    if (t <= maxTenor) {
      const x = getX(t);
      ctx.fillText(`${t}Y`, x, h - padding.bottom + 18);
    }
  });

  ctx.fillText('Maturity / Tenor (Years)', padding.left + chartW / 2, h - 8);
}

function renderDecompositionTable(rows) {
  const tbody = document.getElementById('tbody-term-theories');
  if (!tbody) return;

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>Year ${r.tenor}</strong></td>
      <td>${(r.forwardRate * 100).toFixed(3)}%</td>
      <td class="val-pos">+${(r.liquidityPremium * 100).toFixed(3)}%</td>
      <td class="highlight-gold">${(r.expectedSpotRate * 100).toFixed(3)}%</td>
    </tr>
  `).join('');
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
