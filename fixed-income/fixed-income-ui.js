/**
 * Fixed-Income Analytics UI Controller
 * Reactive UI, Canvas Visualizations, and Tab Switching.
 */

import {
  calculateBondPrice,
  calculateYTM,
  calculateDurationAndConvexity,
  generateYieldShockTable,
  calculateLiabilityImmunization
} from './fixed-income-engine.js';

// Global UI State
const state = {
  activeTab: 'valuation', // 'valuation' | 'immunization'
  solverMode: 'priceFromYtm', // 'priceFromYtm' | 'ytmFromPrice'
  bond: {
    parValue: 1000,
    couponRate: 0.045, // 4.5%
    maturityYears: 10,
    frequency: 2,
    ytm: 0.045,
    price: 1000
  },
  immunization: {
    discountRate: 0.045,
    liabilities: [
      { year: 5, amount: 250000 },
      { year: 10, amount: 500000 },
      { year: 15, amount: 750000 }
    ],
    shortBond: { parValue: 1000, couponRate: 0.04, maturityYears: 3, ytm: 0.045, frequency: 2 },
    longBond: { parValue: 1000, couponRate: 0.05, maturityYears: 20, ytm: 0.045, frequency: 2 }
  }
};

const PRESETS = {
  'treasury-10y': {
    name: '10-Year US Treasury',
    parValue: 1000,
    couponRate: 0.0425,
    maturityYears: 10,
    frequency: 2,
    ytm: 0.0440
  },
  'treasury-30y': {
    name: '30-Year Long Bond',
    parValue: 1000,
    couponRate: 0.0450,
    maturityYears: 30,
    frequency: 2,
    ytm: 0.0465
  },
  'treasury-2y': {
    name: '2-Year Short Note',
    parValue: 1000,
    couponRate: 0.0475,
    maturityYears: 2,
    frequency: 2,
    ytm: 0.0475
  },
  'corp-ig-7y': {
    name: 'Corporate IG (7Y 5.5%)',
    parValue: 1000,
    couponRate: 0.0550,
    maturityYears: 7,
    frequency: 2,
    ytm: 0.0520
  },
  'zero-20y': {
    name: 'Zero-Coupon STRIPS (20Y)',
    parValue: 1000,
    couponRate: 0.0000,
    maturityYears: 20,
    frequency: 2,
    ytm: 0.0460
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  updateValuationView();
});

function initEventListeners() {
  // Studio Tab Switching
  document.querySelectorAll('.fi-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      switchTab(tab);
    });
  });

  // Solver Mode Toggle
  const btnPriceFromYtm = document.getElementById('btn-mode-price');
  const btnYtmFromPrice = document.getElementById('btn-mode-ytm');
  if (btnPriceFromYtm && btnYtmFromPrice) {
    btnPriceFromYtm.addEventListener('click', () => setSolverMode('priceFromYtm'));
    btnYtmFromPrice.addEventListener('click', () => setSolverMode('ytmFromPrice'));
  }

  // Inputs
  const bindInput = (id, prop, isPct = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      let val = parseFloat(e.target.value) || 0;
      state.bond[prop] = isPct ? val / 100 : val;
      updateValuationView();
    });
  };

  bindInput('inp-par-value', 'parValue');
  bindInput('inp-coupon-rate', 'couponRate', true);
  bindInput('inp-maturity-years', 'maturityYears');
  bindInput('inp-ytm', 'ytm', true);
  bindInput('inp-market-price', 'price');

  const elFreq = document.getElementById('inp-coupon-frequency');
  if (elFreq) {
    elFreq.addEventListener('change', (e) => {
      state.bond.frequency = parseInt(e.target.value, 10) || 2;
      updateValuationView();
    });
  }

  // Presets
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.dataset.preset;
      applyPreset(key);
    });
  });

  // Immunization Inputs
  const elImmDisc = document.getElementById('imm-discount-rate');
  if (elImmDisc) {
    elImmDisc.addEventListener('input', (e) => {
      state.immunization.discountRate = (parseFloat(e.target.value) || 4.5) / 100;
      updateImmunizationView();
    });
  }

  const elImmShortMat = document.getElementById('imm-short-maturity');
  if (elImmShortMat) {
    elImmShortMat.addEventListener('input', (e) => {
      state.immunization.shortBond.maturityYears = parseFloat(e.target.value) || 3;
      updateImmunizationView();
    });
  }

  const elImmLongMat = document.getElementById('imm-long-maturity');
  if (elImmLongMat) {
    elImmLongMat.addEventListener('input', (e) => {
      state.immunization.longBond.maturityYears = parseFloat(e.target.value) || 20;
      updateImmunizationView();
    });
  }

  // Redraw charts on window resize
  window.addEventListener('resize', () => {
    if (state.activeTab === 'valuation') {
      drawCashFlowChart();
      drawSensitivityChart();
    }
  });
}

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.fi-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  const secValuation = document.getElementById('section-valuation');
  const secImmunization = document.getElementById('section-immunization');

  if (tab === 'valuation') {
    if (secValuation) secValuation.style.display = 'block';
    if (secImmunization) secImmunization.style.display = 'none';
    updateValuationView();
  } else {
    if (secValuation) secValuation.style.display = 'none';
    if (secImmunization) secImmunization.style.display = 'block';
    updateImmunizationView();
  }
}

function setSolverMode(mode) {
  state.solverMode = mode;
  const btnPrice = document.getElementById('btn-mode-price');
  const btnYtm = document.getElementById('btn-mode-ytm');
  const wrapYtm = document.getElementById('wrap-inp-ytm');
  const wrapPrice = document.getElementById('wrap-inp-price');

  if (btnPrice) btnPrice.classList.toggle('active', mode === 'priceFromYtm');
  if (btnYtm) btnYtm.classList.toggle('active', mode === 'ytmFromPrice');

  if (mode === 'priceFromYtm') {
    if (wrapYtm) wrapYtm.style.display = 'block';
    if (wrapPrice) wrapPrice.style.display = 'none';
  } else {
    if (wrapYtm) wrapYtm.style.display = 'none';
    if (wrapPrice) wrapPrice.style.display = 'block';
  }

  updateValuationView();
}

function applyPreset(key) {
  const p = PRESETS[key];
  if (!p) return;

  state.bond.parValue = p.parValue;
  state.bond.couponRate = p.couponRate;
  state.bond.maturityYears = p.maturityYears;
  state.bond.frequency = p.frequency;
  state.bond.ytm = p.ytm;

  // Sync inputs
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('inp-par-value', p.parValue);
  setVal('inp-coupon-rate', (p.couponRate * 100).toFixed(2));
  setVal('inp-maturity-years', p.maturityYears);
  setVal('inp-coupon-frequency', p.frequency);
  setVal('inp-ytm', (p.ytm * 100).toFixed(2));

  setSolverMode('priceFromYtm');
  updateValuationView();
}

function updateValuationView() {
  const { parValue, couponRate, maturityYears, frequency } = state.bond;

  if (state.solverMode === 'ytmFromPrice') {
    const marketPrice = state.bond.price;
    const solvedYtm = calculateYTM({
      price: marketPrice,
      parValue,
      couponRate,
      maturityYears,
      frequency
    });
    state.bond.ytm = solvedYtm;
    const inpYtm = document.getElementById('inp-ytm');
    if (inpYtm) inpYtm.value = (solvedYtm * 100).toFixed(3);
  }

  const ytm = state.bond.ytm;
  const metrics = calculateDurationAndConvexity({
    parValue,
    couponRate,
    maturityYears,
    ytm,
    frequency
  });

  state.bond.price = metrics.price;
  const inpPrice = document.getElementById('inp-market-price');
  if (inpPrice && state.solverMode === 'priceFromYtm') {
    inpPrice.value = metrics.price.toFixed(2);
  }

  // Update Scorecard KPIs
  const pctPar = (metrics.price / parValue) * 100;
  const priceSub = pctPar > 100.01 ? 'Trading at Premium' : (pctPar < 99.99 ? 'Trading at Discount' : 'Trading at Par');

  setText('kpi-bond-price', `$${metrics.price.toFixed(2)}`);
  setText('kpi-bond-pct-par', `${pctPar.toFixed(2)}% (${priceSub})`);
  setText('kpi-bond-ytm', `${(ytm * 100).toFixed(3)}%`);
  setText('kpi-bond-mac-dur', `${metrics.macaulayDuration.toFixed(2)} Yrs`);
  setText('kpi-bond-mod-dur', `${metrics.modifiedDuration.toFixed(2)} Yrs`);
  setText('kpi-bond-convexity', metrics.convexity.toFixed(2));
  setText('kpi-bond-dv01', `$${metrics.dv01.toFixed(3)}`);

  // Render Charts & Shock Table
  drawCashFlowChart();
  drawSensitivityChart();
  renderShockTable();
}

function drawCashFlowChart() {
  const canvas = document.getElementById('canvas-cash-flows');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || 560;
  const h = 260;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const priceData = calculateBondPrice({
    parValue: state.bond.parValue,
    couponRate: state.bond.couponRate,
    maturityYears: state.bond.maturityYears,
    ytm: state.bond.ytm,
    frequency: state.bond.frequency
  });

  const flows = priceData.cashFlows;
  if (!flows.length) return;

  const padding = { top: 25, right: 20, bottom: 35, left: 55 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const maxVal = Math.max(...flows.map(f => f.totalCF), 100);

  // Y-axis grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';

  const gridSteps = 4;
  for (let s = 0; s <= gridSteps; s++) {
    const val = (maxVal / gridSteps) * s;
    const y = padding.top + chartH - (s / gridSteps) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
    ctx.fillText(`$${Math.round(val)}`, padding.left - 8, y + 3);
  }

  // Draw Bars
  const n = flows.length;
  const barWidth = Math.max(3, Math.min(24, (chartW / n) * 0.7));
  const stepW = chartW / n;

  flows.forEach((f, idx) => {
    const x = padding.left + idx * stepW + (stepW - barWidth) / 2;
    const barH = (f.totalCF / maxVal) * chartH;
    const y = padding.top + chartH - barH;

    const isLast = (idx === n - 1);
    ctx.fillStyle = isLast ? '#38bdf8' : '#0284c7';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barWidth, barH, [3, 3, 0, 0]) : ctx.rect(x, y, barWidth, barH);
    ctx.fill();

    // X-axis label (show selected years)
    if (idx === 0 || idx === n - 1 || (idx % Math.ceil(n / 6) === 0)) {
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(`${f.timeYears.toFixed(1)}Y`, x + barWidth / 2, h - padding.bottom + 16);
    }
  });

  // Chart Title
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Cash Flow Schedule (Coupons + Principal)', padding.left, 16);
}

function drawSensitivityChart() {
  const canvas = document.getElementById('canvas-sensitivity-curve');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || 560;
  const h = 260;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const shockTable = generateYieldShockTable({
    parValue: state.bond.parValue,
    couponRate: state.bond.couponRate,
    maturityYears: state.bond.maturityYears,
    ytm: state.bond.ytm,
    frequency: state.bond.frequency
  });

  if (!shockTable.length) return;

  const padding = { top: 30, right: 25, bottom: 35, left: 60 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const allPrices = shockTable.flatMap(r => [r.exactPrice, r.durationPrice, r.convexPrice]);
  const minP = Math.min(...allPrices) * 0.96;
  const maxP = Math.max(...allPrices) * 1.04;

  const minBps = shockTable[0].bps;
  const maxBps = shockTable[shockTable.length - 1].bps;

  const getX = (bps) => padding.left + ((bps - minBps) / (maxBps - minBps)) * chartW;
  const getY = (p) => padding.top + chartH - ((p - minP) / (maxP - minP)) * chartH;

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';

  for (let s = 0; s <= 4; s++) {
    const val = minP + (s / 4) * (maxP - minP);
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
    ctx.fillText(`$${Math.round(val)}`, padding.left - 8, y + 3);
  }

  // Draw 0 bps center line
  const xZero = getX(0);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(xZero, padding.top);
  ctx.lineTo(xZero, h - padding.bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  // 1. Duration-only linear line (Red dashed)
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  shockTable.forEach((r, idx) => {
    const x = getX(r.bps);
    const y = getY(r.durationPrice);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Convexity Taylor approximation (Gold line)
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.beginPath();
  shockTable.forEach((r, idx) => {
    const x = getX(r.bps);
    const y = getY(r.convexPrice);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 3. Exact Price curve (Cyan line)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  shockTable.forEach((r, idx) => {
    const x = getX(r.bps);
    const y = getY(r.exactPrice);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Legend
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(w - 240, 10, 12, 4);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Exact Price', w - 222, 15);

  ctx.fillStyle = '#facc15';
  ctx.fillRect(w - 150, 10, 12, 4);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Dur + Convex', w - 132, 15);

  ctx.fillStyle = '#f87171';
  ctx.fillRect(w - 60, 10, 12, 4);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Dur Only', w - 42, 15);

  // X-axis labels
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  [-300, -200, -100, 0, 100, 200, 300].forEach(bps => {
    const x = getX(bps);
    ctx.fillText(`${bps > 0 ? '+' : ''}${bps}bps`, x, h - padding.bottom + 16);
  });
}

function renderShockTable() {
  const tbody = document.getElementById('tbody-yield-shock');
  if (!tbody) return;

  const shockTable = generateYieldShockTable({
    parValue: state.bond.parValue,
    couponRate: state.bond.couponRate,
    maturityYears: state.bond.maturityYears,
    ytm: state.bond.ytm,
    frequency: state.bond.frequency
  });

  tbody.innerHTML = shockTable.map(r => {
    const isBase = (r.bps === 0);
    const clsReturn = r.exactPct > 0 ? 'val-pos' : (r.exactPct < 0 ? 'val-neg' : '');
    const sign = r.exactPct > 0 ? '+' : '';

    return `
      <tr class="${isBase ? 'highlight-base' : ''}">
        <td><strong>${r.bps > 0 ? '+' : ''}${r.bps} bps</strong></td>
        <td>${(r.shockedYtm * 100).toFixed(2)}%</td>
        <td>$${r.exactPrice.toFixed(2)}</td>
        <td class="${clsReturn}">${sign}${(r.exactPct * 100).toFixed(2)}%</td>
        <td>$${r.durationPrice.toFixed(2)}</td>
        <td>$${r.convexPrice.toFixed(2)}</td>
        <td class="val-pos">+$${(r.convexPrice - r.durationPrice).toFixed(2)}</td>
      </tr>
    `;
  }).join('');
}

function updateImmunizationView() {
  const { liabilities, discountRate, shortBond, longBond } = state.immunization;
  const result = calculateLiabilityImmunization({
    liabilities,
    discountRate,
    shortBond,
    longBond
  });

  // Render Liabilities Table
  const tbodyLiab = document.getElementById('tbody-liabilities');
  if (tbodyLiab) {
    tbodyLiab.innerHTML = liabilities.map(l => {
      const pv = l.amount * Math.pow(1 + discountRate, -l.year);
      return `
        <tr>
          <td>Year ${l.year}</td>
          <td>$${l.amount.toLocaleString()}</td>
          <td>$${Math.round(pv).toLocaleString()}</td>
          <td>${(l.year / (1 + discountRate)).toFixed(2)} Yrs</td>
        </tr>
      `;
    }).join('');
  }

  // Update Status Banner
  setText('imm-banner-summary', result.summary);

  // Update Barbell Weights Bar
  const barShort = document.getElementById('imm-bar-short');
  const barLong = document.getElementById('imm-bar-long');
  const wShortPct = Math.max(0, Math.min(100, result.shortBond.weight * 100));
  const wLongPct = 100 - wShortPct;

  if (barShort && barLong) {
    barShort.style.width = `${wShortPct.toFixed(1)}%`;
    barShort.textContent = `${shortBond.maturityYears}Y Bond: ${wShortPct.toFixed(1)}%`;
    barLong.style.width = `${wLongPct.toFixed(1)}%`;
    barLong.textContent = `${longBond.maturityYears}Y Bond: ${wLongPct.toFixed(1)}%`;
  }

  // Update Conditions Cards
  setText('imm-cond-pv', `$${Math.round(result.liabilityPV).toLocaleString()}`);
  setText('imm-cond-dur', `Asset: ${result.assetPortfolio.duration.toFixed(2)}Y = Liab: ${result.liabilityDuration.toFixed(2)}Y`);
  setText('imm-cond-convex', `+${result.assetPortfolio.convexityAdvantage.toFixed(2)} Advantage`);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
