/**
 * Key Rate Duration (KRD) & Non-Parallel Risk UI Controller
 * Interactive Tenor Attribution, Curve Shift Simulator & Scenario Analysis.
 */

import {
  KEY_RATE_TENORS,
  CURVE_SHIFT_PRESETS,
  calculatePortfolioKeyRateDuration,
  estimateNonParallelPriceChange
} from './fixed-income-engine.js';

// Pre-configured Bond ETF & Structure Presets
const PORTFOLIO_PRESETS = {
  'ief-10y': {
    name: 'IEF (7–10 Year Treasury)',
    holdings: [
      { parValue: 1000, couponRate: 0.0425, maturityYears: 8.5, ytm: 0.044, frequency: 2, quantity: 100 }
    ]
  },
  'tlt-long': {
    name: 'TLT (20+ Year Long Treasury)',
    holdings: [
      { parValue: 1000, couponRate: 0.0450, maturityYears: 24, ytm: 0.0465, frequency: 2, quantity: 100 }
    ]
  },
  'shy-short': {
    name: 'SHY (1–3 Year Short Treasury)',
    holdings: [
      { parValue: 1000, couponRate: 0.0475, maturityYears: 2.0, ytm: 0.0475, frequency: 2, quantity: 100 }
    ]
  },
  'bnd-aggregate': {
    name: 'BND (Total Bond Market Index)',
    holdings: [
      { parValue: 1000, couponRate: 0.045, maturityYears: 2, ytm: 0.045, frequency: 2, quantity: 25 },
      { parValue: 1000, couponRate: 0.045, maturityYears: 5, ytm: 0.045, frequency: 2, quantity: 35 },
      { parValue: 1000, couponRate: 0.045, maturityYears: 10, ytm: 0.045, frequency: 2, quantity: 30 },
      { parValue: 1000, couponRate: 0.045, maturityYears: 25, ytm: 0.045, frequency: 2, quantity: 10 }
    ]
  },
  'barbell-match': {
    name: 'Barbell (2Y + 30Y Duration Match)',
    holdings: [
      { parValue: 1000, couponRate: 0.045, maturityYears: 2, ytm: 0.045, frequency: 2, quantity: 60 },
      { parValue: 1000, couponRate: 0.045, maturityYears: 30, ytm: 0.045, frequency: 2, quantity: 40 }
    ]
  }
};

const state = {
  activePreset: 'ief-10y',
  activeScenario: 'bull-steepener',
  portfolioCapital: 100000,
  shifts: [
    { tenor: 0.25, bps: -150 },
    { tenor: 2, bps: -100 },
    { tenor: 5, bps: -50 },
    { tenor: 10, bps: -20 },
    { tenor: 20, bps: 0 },
    { tenor: 30, bps: 0 }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  updateKrdAnalysis();
});

function initEventListeners() {
  // Preset buttons
  document.querySelectorAll('.btn-preset-krd').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.dataset.preset;
      applyPortfolioPreset(key);
    });
  });

  // Scenario buttons
  document.querySelectorAll('.btn-scenario-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.dataset.scenario;
      applyScenarioPreset(key);
    });
  });

  // Capital input
  const elCap = document.getElementById('inp-portfolio-capital');
  if (elCap) {
    elCap.addEventListener('input', (e) => {
      state.portfolioCapital = parseFloat(e.target.value) || 100000;
      updateKrdAnalysis();
    });
  }

  // Key Rate shift sliders
  KEY_RATE_TENORS.forEach(tenor => {
    const slider = document.getElementById(`slider-shift-${tenor.toString().replace('.', '_')}`);
    const numDisplay = document.getElementById(`val-shift-${tenor.toString().replace('.', '_')}`);
    if (slider) {
      slider.addEventListener('input', (e) => {
        const bps = parseInt(e.target.value, 10);
        if (numDisplay) numDisplay.textContent = `${bps > 0 ? '+' : ''}${bps} bps`;
        const shiftObj = state.shifts.find(s => Math.abs(s.tenor - tenor) < 1e-4);
        if (shiftObj) shiftObj.bps = bps;
        updateKrdAnalysis();
      });
    }
  });

  // Redraw on window resize
  window.addEventListener('resize', () => {
    drawKrdBarChart();
    drawCurveShiftChart();
  });
}

function applyPortfolioPreset(key) {
  state.activePreset = key;
  document.querySelectorAll('.btn-preset-krd').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === key);
  });
  updateKrdAnalysis();
}

function applyScenarioPreset(key) {
  state.activeScenario = key;
  const p = CURVE_SHIFT_PRESETS[key];
  if (!p) return;

  state.shifts = p.shifts.map(s => ({ ...s }));

  // Update slider positions
  state.shifts.forEach(s => {
    const tenorStr = s.tenor.toString().replace('.', '_');
    const slider = document.getElementById(`slider-shift-${tenorStr}`);
    const numDisplay = document.getElementById(`val-shift-${tenorStr}`);
    if (slider) slider.value = s.bps;
    if (numDisplay) numDisplay.textContent = `${s.bps > 0 ? '+' : ''}${s.bps} bps`;
  });

  document.querySelectorAll('.btn-scenario-preset').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scenario === key);
  });

  updateKrdAnalysis();
}

function updateKrdAnalysis() {
  const presetConfig = PORTFOLIO_PRESETS[state.activePreset];
  if (!presetConfig) return;

  const analysis = calculatePortfolioKeyRateDuration(presetConfig.holdings, KEY_RATE_TENORS);
  const impact = estimateNonParallelPriceChange(analysis.krd, state.shifts, state.portfolioCapital);

  state._currentAnalysis = analysis;
  state._currentImpact = impact;

  // Update Top KPIs
  setText('kpi-krd-eff-dur', `${analysis.effectiveDuration.toFixed(2)} Yrs`);
  setText('kpi-krd-dv01', `$${((analysis.effectiveDuration * 0.0001) * state.portfolioCapital).toFixed(2)}`);

  const sign = impact.predictedReturnPct > 0 ? '+' : '';
  const clsPnl = impact.predictedReturnPct > 0 ? 'highlight-green' : (impact.predictedReturnPct < 0 ? 'val-neg' : '');

  const elPnl = document.getElementById('kpi-krd-return');
  if (elPnl) {
    elPnl.textContent = `${sign}${(impact.predictedReturnPct * 100).toFixed(2)}%`;
    elPnl.className = `kpi-val ${clsPnl}`;
  }

  const elDollar = document.getElementById('kpi-krd-dollar-pnl');
  if (elDollar) {
    elDollar.textContent = `${sign}$${Math.round(impact.dollarPnL).toLocaleString()}`;
    elDollar.className = `kpi-val ${clsPnl}`;
  }

  // Draw Charts
  drawKrdBarChart();
  drawCurveShiftChart();

  // Render Table
  renderKrdBreakdownTable(impact.tenorBreakdown, analysis.krd);
}

function drawKrdBarChart() {
  const canvas = document.getElementById('canvas-krd-bars');
  if (!canvas || !state._currentAnalysis) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || 560;
  const h = 280;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const krdList = state._currentAnalysis.krd;
  const maxDur = Math.max(...krdList.map(k => k.duration), 1.0) * 1.25;

  const padding = { top: 30, right: 20, bottom: 40, left: 50 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';

  for (let s = 0; s <= 4; s++) {
    const val = (maxDur / 4) * s;
    const y = padding.top + chartH - (s / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${val.toFixed(1)}Y`, padding.left - 8, y + 3);
  }

  // Bars
  const n = krdList.length;
  const barW = Math.min(48, (chartW / n) * 0.6);
  const step = chartW / n;

  krdList.forEach((item, idx) => {
    const x = padding.left + idx * step + (step - barW) / 2;
    const barH = (item.duration / maxDur) * chartH;
    const y = padding.top + chartH - barH;

    ctx.fillStyle = item.duration > 0.05 ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]) : ctx.rect(x, y, barW, barH);
    ctx.fill();

    // Value label above bar
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    if (item.duration > 0.05) {
      ctx.fillText(`${item.duration.toFixed(2)}Y`, x + barW / 2, y - 6);
    }

    // X-axis tenor label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    const label = item.tenor === 0.25 ? '3M' : `${item.tenor}Y`;
    ctx.fillText(label, x + barW / 2, h - padding.bottom + 18);
  });

  // Chart Title
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Key Rate Duration Profile (Sensitivity per Tenor)', padding.left, 18);
}

function drawCurveShiftChart() {
  const canvas = document.getElementById('canvas-curve-shift');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || 560;
  const h = 280;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const baseYields = [
    { tenor: 0.25, y: 0.0450 },
    { tenor: 2, y: 0.0425 },
    { tenor: 5, y: 0.0435 },
    { tenor: 10, y: 0.0450 },
    { tenor: 20, y: 0.0475 },
    { tenor: 30, y: 0.0465 }
  ];

  const shiftMap = new Map(state.shifts.map(s => [s.tenor, s.bps]));
  const shockedYields = baseYields.map(pt => ({
    tenor: pt.tenor,
    y: Math.max(0.001, pt.y + (shiftMap.get(pt.tenor) || 0) / 10000)
  }));

  const allRates = [...baseYields.map(b => b.y), ...shockedYields.map(s => s.y)];
  const minR = Math.max(0, Math.min(...allRates) - 0.005);
  const maxR = Math.max(...allRates) + 0.005;

  const padding = { top: 35, right: 25, bottom: 40, left: 55 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const minT = 0.25;
  const maxT = 30;

  const getX = (t) => padding.left + ((Math.log(t) - Math.log(minT)) / (Math.log(maxT) - Math.log(minT))) * chartW;
  const getY = (r) => padding.top + chartH - ((r - minR) / (maxR - minR)) * chartH;

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';

  for (let s = 0; s <= 4; s++) {
    const rate = minR + (s / 4) * (maxR - minR);
    const y = getY(rate);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${(rate * 100).toFixed(2)}%`, padding.left - 8, y + 3);
  }

  // 1. Base Curve (Gold dashed)
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  baseYields.forEach((pt, idx) => {
    const x = getX(pt.tenor);
    const y = getY(pt.y);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Shocked Curve (Cyan solid)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  shockedYields.forEach((pt, idx) => {
    const x = getX(pt.tenor);
    const y = getY(pt.y);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots
  shockedYields.forEach(pt => {
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(getX(pt.tenor), getY(pt.y), 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Legend
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';

  ctx.fillStyle = '#facc15';
  ctx.fillRect(w - 200, 12, 12, 4);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Base Yield Curve', w - 182, 16);

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(w - 90, 12, 12, 4);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Shocked', w - 72, 16);

  // X-axis tenor labels
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  baseYields.forEach(pt => {
    const x = getX(pt.tenor);
    const label = pt.tenor === 0.25 ? '3M' : `${pt.tenor}Y`;
    ctx.fillText(label, x, h - padding.bottom + 18);
  });
}

function renderKrdBreakdownTable(breakdown, krdList) {
  const tbody = document.getElementById('tbody-krd-breakdown');
  if (!tbody) return;

  const totalKrd = krdList.reduce((acc, k) => acc + k.duration, 0);

  tbody.innerHTML = breakdown.map(item => {
    const pctShare = totalKrd > 0 ? (item.krd / totalKrd) * 100 : 0;
    const sign = item.contributionPct > 0 ? '+' : '';
    const clsReturn = item.contributionPct > 0 ? 'val-pos' : (item.contributionPct < 0 ? 'val-neg' : '');
    const tenorLabel = item.tenor === 0.25 ? '3-Month' : `${item.tenor}-Year`;

    return `
      <tr>
        <td><strong>${tenorLabel}</strong></td>
        <td>${item.krd.toFixed(2)} Yrs</td>
        <td>${pctShare.toFixed(1)}%</td>
        <td>${item.shiftBps > 0 ? '+' : ''}${item.shiftBps} bps</td>
        <td class="${clsReturn}"><strong>${sign}${(item.contributionPct * 100).toFixed(2)}%</strong></td>
        <td class="${clsReturn}">${sign}$${Math.round(item.contributionDollar).toLocaleString()}</td>
      </tr>
    `;
  }).join('');
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
