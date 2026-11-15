/**
 * Asset Liability Modeling Studio UI Controller (Page 3)
 * Manages institutional asset allocation against structured future liability obligations,
 * background Web Worker simulation execution, High-DPI canvas charts, and actuarial metrics.
 */

import { getAllFundsSync, subscribeSessionFunds } from '../js/session-funds.js';
import { openAssetModal } from '../js/asset-modal.js';
import { runMonteCarloSimulation, computeRemainingLiabilitiesPV } from './monte-carlo-engine.js';

const ASSET_PALETTE = [
  '#38bdf8', '#34d399', '#fbbf24', '#f43f5e', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const PERCENTILE_COLORS = {
  10: '#ef4444',
  25: '#f97316',
  50: '#eab308',
  75: '#22c55e',
  90: '#38bdf8'
};

const state = {
  activeTab: 'assets', // 'assets' | 'liabilities' | 'settings'
  isConfigCollapsed: false,

  settings: {
    initialAmount: 1000000,
    simulationPeriod: 30,
    numSimulations: 1000,
    liabilityDiscountRate: 0.04,
    simulationModel: 'historical',
    bootstrapModel: 'singleYear',
    sequenceRisk: 'none',
    inflationModel: 'historical',
    taxTreatment: 'preTax'
  },

  assets: [
    { id: 'asset-1', ticker: 'VOO', weight: 60 },
    { id: 'asset-2', ticker: 'BND', weight: 40 }
  ],

  liabilities: [
    {
      id: 'liab-1',
      name: 'Pension Benefit Payout',
      type: 'recurring',
      startYear: 1,
      endYear: 20,
      amount: 40000,
      inflationAdjusted: true
    },
    {
      id: 'liab-2',
      name: 'Debt Service Balloon Payoff',
      type: 'lumpSum',
      startYear: 5,
      endYear: 5,
      amount: 100000,
      inflationAdjusted: false
    },
    {
      id: 'liab-3',
      name: 'Legacy Endowment Grant',
      type: 'lumpSum',
      startYear: 15,
      endYear: 15,
      amount: 150000,
      inflationAdjusted: true
    }
  ],

  simulationResult: null,
  isSimulating: false
};

let worker = null;
let elements = {};

function cacheDOMElements() {
  elements = {
    // Status Bar
    statusInitialAssets: document.getElementById('status-initial-assets'),
    statusHorizon: document.getElementById('status-horizon'),
    statusDiscountRate: document.getElementById('status-discount-rate'),
    statusInitialFundedRatio: document.getElementById('status-initial-funded-ratio'),
    btnToggleConfig: document.getElementById('btn-toggle-config-panel'),
    btnConfigText: document.getElementById('btn-config-text'),
    configCard: document.getElementById('config-card'),
    alertsContainer: document.getElementById('alerts-container'),

    // Tabs
    tabBtnAssets: document.getElementById('tab-btn-assets'),
    tabBtnLiabilities: document.getElementById('tab-btn-liabilities'),
    tabBtnSettings: document.getElementById('tab-btn-settings'),
    paneAssets: document.getElementById('pane-assets'),
    paneLiabilities: document.getElementById('pane-liabilities'),
    paneSettings: document.getElementById('pane-settings'),

    // Assets Table
    assetsTbody: document.getElementById('assets-tbody'),
    btnAddAsset: document.getElementById('btn-add-asset'),
    btnResetAssets: document.getElementById('btn-reset-assets'),
    totalAssetsBar: document.getElementById('total-assets-bar'),
    totalAssetsPercent: document.getElementById('total-assets-percent'),
    badgeAssetsStatus: document.getElementById('badge-assets-status'),

    // Liabilities Builder
    liabilitiesBuilder: document.getElementById('liabilities-builder'),
    btnAddLiability: document.getElementById('btn-add-liability'),
    btnResetLiabilities: document.getElementById('btn-reset-liabilities'),

    // Settings Inputs
    cfgInitialAssets: document.getElementById('cfg-initial-assets'),
    cfgSimPeriod: document.getElementById('cfg-sim-period'),
    cfgNumSims: document.getElementById('cfg-num-sims'),
    cfgDiscountRate: document.getElementById('cfg-discount-rate'),
    cfgSimModel: document.getElementById('cfg-sim-model'),
    cfgBootstrapModel: document.getElementById('cfg-bootstrap-model'),
    cfgSeqRisk: document.getElementById('cfg-seq-risk'),
    cfgInflationModel: document.getElementById('cfg-inflation-model'),
    cfgTaxTreatment: document.getElementById('cfg-tax-treatment'),

    // Action Bar
    btnRunSim: document.getElementById('btn-run-sim'),
    simProgressWrap: document.getElementById('sim-progress-wrap'),
    simProgressBar: document.getElementById('sim-progress-bar'),

    // Results Section
    resultsSection: document.getElementById('results-section'),
    donutAssetCount: document.getElementById('donut-asset-count'),
    donutCanvasAssets: document.getElementById('donut-canvas-assets'),
    donutLegendAssets: document.getElementById('donut-legend-assets'),

    // Capital Adequacy Scorecard
    metricInitialLiabPv: document.getElementById('metric-initial-liab-pv'),
    metricInitialFundedRatio: document.getElementById('metric-initial-funded-ratio'),
    metricMedianFinalRatio: document.getElementById('metric-median-final-ratio'),
    metricPeakDeficitProb: document.getElementById('metric-peak-deficit-prob'),
    metricFinalSolvency: document.getElementById('metric-final-solvency'),

    // Canvases & Tooltips
    canvasFundedRatio: document.getElementById('canvas-funded-ratio'),
    tooltipFundedRatio: document.getElementById('tooltip-funded-ratio'),
    canvasDeficitProb: document.getElementById('canvas-deficit-prob'),
    tooltipDeficitProb: document.getElementById('tooltip-deficit-prob'),
    canvasAssetsVsLiab: document.getElementById('canvas-assets-vs-liab'),
    tooltipAssetsVsLiab: document.getElementById('tooltip-assets-vs-liab'),
    canvasLiabilityOutflows: document.getElementById('canvas-liability-outflows'),
    tooltipLiabilityOutflows: document.getElementById('tooltip-liability-outflows'),

    // Detailed Table & CSV
    almScorecardTbody: document.getElementById('alm-scorecard-tbody'),
    btnExportCsv: document.getElementById('btn-export-csv'),

    // Asset Modal
    assetModal: document.getElementById('asset-modal'),
    btnCloseAssetModal: document.getElementById('btn-close-asset-modal'),
    assetModalSearch: document.getElementById('asset-modal-search'),
    assetModalList: document.getElementById('asset-modal-list')
  };
}

// -------------------------------------------------------------------
// Formatters
// -------------------------------------------------------------------
function formatCurrency(val) {
  if (isNaN(val) || val === null || val === undefined) return '$0';
  return '$' + Math.round(val).toLocaleString();
}

function formatPct(val) {
  if (isNaN(val) || val === null || val === undefined) return '0.0%';
  return (val * 100).toFixed(1) + '%';
}

function formatRatio(val) {
  if (isNaN(val) || val === null || val === undefined) return '0.0%';
  return val.toFixed(1) + '%';
}

// -------------------------------------------------------------------
// Worker Initialization
// -------------------------------------------------------------------
function initWorker() {
  try {
    worker = new Worker('./monte-carlo-worker.js', { type: 'module' });
    worker.onmessage = handleWorkerMessage;
    worker.onerror = (err) => {
      console.warn('Web Worker error, falling back to main thread execution:', err);
      worker = null;
    };
  } catch (e) {
    console.warn('Worker initialization failed, fallback active:', e);
    worker = null;
  }
}

function handleWorkerMessage(e) {
  const { type, progress, result, error } = e.data;
  if (type === 'progress') {
    if (elements.simProgressBar) {
      elements.simProgressBar.style.width = `${progress}%`;
    }
  } else if (type === 'complete') {
    state.isSimulating = false;
    state.simulationResult = result;
    finishSimulation();
  } else if (type === 'error') {
    state.isSimulating = false;
    showNotification(`Simulation error: ${error}`, 'error');
    if (elements.btnRunSim) elements.btnRunSim.disabled = false;
    if (elements.simProgressWrap) elements.simProgressWrap.style.display = 'none';
  }
}

// -------------------------------------------------------------------
// Notifications
// -------------------------------------------------------------------
function showNotification(msg, type = 'info') {
  if (!elements.alertsContainer) return;
  const alert = document.createElement('div');
  alert.className = `alert-banner ${type}`;
  alert.innerHTML = `
    <span>${type === 'error' ? '⚠️' : 'ℹ️'} ${msg}</span>
    <button type="button" class="btn-close-alert">✕</button>
  `;
  alert.querySelector('.btn-close-alert').onclick = () => alert.remove();
  elements.alertsContainer.appendChild(alert);
  setTimeout(() => alert.remove(), 6000);
}

// -------------------------------------------------------------------
// Tab Switching
// -------------------------------------------------------------------
function switchTab(target) {
  state.activeTab = target;
  const isAssets = target === 'assets';
  const isLiabilities = target === 'liabilities';
  const isSettings = target === 'settings';

  elements.tabBtnAssets?.classList.toggle('active', isAssets);
  elements.tabBtnLiabilities?.classList.toggle('active', isLiabilities);
  elements.tabBtnSettings?.classList.toggle('active', isSettings);

  if (elements.paneAssets) elements.paneAssets.style.display = isAssets ? 'block' : 'none';
  if (elements.paneLiabilities) elements.paneLiabilities.style.display = isLiabilities ? 'block' : 'none';
  if (elements.paneSettings) elements.paneSettings.style.display = isSettings ? 'block' : 'none';
}

// -------------------------------------------------------------------
// Asset Table Rendering & Validation
// -------------------------------------------------------------------
function getFundMeta(ticker) {
  const all = getAllFundsSync();
  const f = all.find(item => item.ticker.toUpperCase() === ticker.toUpperCase());
  if (f) return { name: f.name || f.ticker, assetClass: f.assetClass || 'Equity' };
  return { name: ticker, assetClass: 'Asset Class' };
}

function renderAssetsTable() {
  if (!elements.assetsTbody) return;
  elements.assetsTbody.innerHTML = '';

  state.assets.forEach((row, idx) => {
    const meta = getFundMeta(row.ticker);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="asset-cell-wrap">
          <button type="button" class="btn-select-asset" data-asset-id="${row.id}">
            <span class="asset-ticker">${row.ticker}</span>
            <span class="asset-edit-icon">🔍</span>
          </button>
        </div>
      </td>
      <td>
        <span class="asset-name-label">${meta.name}</span>
      </td>
      <td style="text-align: right;">
        <div class="weight-input-wrap">
          <input type="number" class="weight-input" data-asset-id="${row.id}" value="${row.weight}" min="0" max="100" step="1" />
          <span class="percent-suffix">%</span>
        </div>
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-delete-row" data-delete-id="${row.id}" title="Remove asset">✕</button>
      </td>
    `;
    elements.assetsTbody.appendChild(tr);
  });

  updateTotalAssetAllocation();
}

function updateTotalAssetAllocation() {
  const sum = state.assets.reduce((acc, r) => acc + (parseFloat(r.weight) || 0), 0);
  const rounded = Math.round(sum * 10) / 10;

  if (elements.totalAssetsPercent) {
    elements.totalAssetsPercent.textContent = `${rounded.toFixed(1)}%`;
  }

  if (elements.badgeAssetsStatus) {
    const isValid = Math.abs(rounded - 100) < 0.1;
    elements.badgeAssetsStatus.className = `alloc-badge ${isValid ? 'success' : 'warning'}`;
    elements.badgeAssetsStatus.textContent = isValid ? '✓ 100%' : `${rounded.toFixed(1)}%`;
  }
}

// -------------------------------------------------------------------
// Liabilities Builder Rendering
// -------------------------------------------------------------------
function renderLiabilitiesBuilder() {
  if (!elements.liabilitiesBuilder) return;
  elements.liabilitiesBuilder.innerHTML = '';

  state.liabilities.forEach((liab) => {
    const card = document.createElement('div');
    card.className = 'liability-card';
    card.innerHTML = `
      <div class="liability-field-group">
        <label class="liability-field-label">Obligation / Benefit Name</label>
        <input type="text" class="form-control liab-name-input" data-id="${liab.id}" value="${liab.name}" placeholder="e.g. Pension Payout" />
      </div>

      <div class="liability-field-group">
        <label class="liability-field-label">Cashflow Type</label>
        <select class="form-control liab-type-select" data-id="${liab.id}">
          <option value="recurring" ${liab.type === 'recurring' ? 'selected' : ''}>Annual Recurring Stream</option>
          <option value="lumpSum" ${liab.type === 'lumpSum' ? 'selected' : ''}>Discrete Lump Sum Payoff</option>
        </select>
      </div>

      <div class="liability-field-group">
        <label class="liability-field-label">Timing (Years)</label>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <input type="number" class="form-control liab-start-input" data-id="${liab.id}" value="${liab.startYear}" min="1" max="50" style="width: 70px;" title="Start Year" />
          <span style="color: #64748b; font-size: 0.85rem;" class="liab-to-label ${liab.type === 'lumpSum' ? 'hidden' : ''}">to</span>
          <input type="number" class="form-control liab-end-input ${liab.type === 'lumpSum' ? 'hidden' : ''}" data-id="${liab.id}" value="${liab.endYear}" min="1" max="50" style="width: 70px;" title="End Year" />
        </div>
      </div>

      <div class="liability-field-group">
        <label class="liability-field-label">Annual Amount ($)</label>
        <input type="number" class="form-control liab-amount-input" data-id="${liab.id}" value="${liab.amount}" min="1000" step="5000" />
      </div>

      <div class="liability-field-group" style="justify-content: flex-end; padding-bottom: 0.35rem;">
        <label class="liability-checkbox-label">
          <input type="checkbox" class="liab-inflation-chk" data-id="${liab.id}" ${liab.inflationAdjusted ? 'checked' : ''} />
          <span>Inflation Adjusted</span>
        </label>
      </div>

      <div>
        <button type="button" class="btn-delete-row" data-delete-liab="${liab.id}" title="Remove obligation" style="margin-top: 0.8rem;">✕</button>
      </div>
    `;
    elements.liabilitiesBuilder.appendChild(card);
  });
}

// -------------------------------------------------------------------
// Model Presets
// -------------------------------------------------------------------
function applyPreset(presetKey) {
  if (presetKey === 'classic-60-40') {
    state.assets = [
      { id: 'a1', ticker: 'VOO', weight: 60 },
      { id: 'a2', ticker: 'BND', weight: 40 }
    ];
  } else if (presetKey === 'endowment-70-30') {
    state.assets = [
      { id: 'a1', ticker: 'VOO', weight: 50 },
      { id: 'a2', ticker: 'QQQ', weight: 20 },
      { id: 'a3', ticker: 'BND', weight: 30 }
    ];
  } else if (presetKey === 'conservative-40-60') {
    state.assets = [
      { id: 'a1', ticker: 'VOO', weight: 40 },
      { id: 'a2', ticker: 'BND', weight: 60 }
    ];
  } else if (presetKey === 'all-weather') {
    state.assets = [
      { id: 'a1', ticker: 'VOO', weight: 30 },
      { id: 'a2', ticker: 'BND', weight: 40 },
      { id: 'a3', ticker: 'GLD', weight: 15 },
      { id: 'a4', ticker: 'SCHD', weight: 15 }
    ];
  }

  renderAssetsTable();
  showNotification(`Applied preset: ${presetKey.replace(/-/g, ' ')}`, 'info');
}

// -------------------------------------------------------------------
// Simulation Runner
// -------------------------------------------------------------------
function runSimulation() {
  if (state.isSimulating) return;

  // Validation: Check total asset weight
  const totalWeight = state.assets.reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0);
  if (Math.abs(totalWeight - 100) > 0.5) {
    showNotification(`Asset portfolio weights must equal 100% (currently ${totalWeight.toFixed(1)}%).`, 'error');
    switchTab('assets');
    return;
  }

  state.isSimulating = true;
  if (elements.btnRunSim) elements.btnRunSim.disabled = true;
  if (elements.simProgressWrap) elements.simProgressWrap.style.display = 'block';
  if (elements.simProgressBar) elements.simProgressBar.style.width = '10%';

  const config = {
    initialAmount: state.settings.initialAmount,
    simulationPeriod: state.settings.simulationPeriod,
    numSimulations: state.settings.numSimulations,
    planningType: 'singleStage',
    startingAllocations: state.assets.map(a => ({ ticker: a.ticker, weight: parseFloat(a.weight) || 0 })),
    simulationModel: state.settings.simulationModel,
    bootstrapModel: state.settings.bootstrapModel,
    sequenceRisk: state.settings.sequenceRisk,
    inflationModel: state.settings.inflationModel,
    taxTreatment: state.settings.taxTreatment,
    liabilityDiscountRate: state.settings.liabilityDiscountRate,
    liabilities: state.liabilities.map(l => ({
      id: l.id,
      name: l.name,
      type: l.type,
      startYear: parseInt(l.startYear, 10) || 1,
      endYear: l.type === 'lumpSum' ? (parseInt(l.startYear, 10) || 1) : (parseInt(l.endYear, 10) || 1),
      amount: parseFloat(l.amount) || 0,
      inflationAdjusted: Boolean(l.inflationAdjusted)
    }))
  };

  if (worker) {
    worker.postMessage({ type: 'runSimulation', config });
  } else {
    // Synchronous execution fallback
    setTimeout(() => {
      try {
        const result = runMonteCarloSimulation(config);
        state.isSimulating = false;
        state.simulationResult = result;
        finishSimulation();
      } catch (err) {
        state.isSimulating = false;
        showNotification(`Simulation error: ${err.message}`, 'error');
        if (elements.btnRunSim) elements.btnRunSim.disabled = false;
        if (elements.simProgressWrap) elements.simProgressWrap.style.display = 'none';
      }
    }, 50);
  }
}

function finishSimulation() {
  if (elements.btnRunSim) elements.btnRunSim.disabled = false;
  if (elements.simProgressWrap) elements.simProgressWrap.style.display = 'none';
  if (elements.resultsSection) elements.resultsSection.style.display = 'block';

  // Update Status Bar
  if (elements.statusInitialAssets) elements.statusInitialAssets.textContent = formatCurrency(state.settings.initialAmount);
  if (elements.statusHorizon) elements.statusHorizon.textContent = `${state.settings.simulationPeriod} Years`;
  if (elements.statusDiscountRate) elements.statusDiscountRate.textContent = `${(state.settings.liabilityDiscountRate * 100).toFixed(1)}%`;

  const initFundedRatio = state.simulationResult?.fundedRatioPercentiles?.['50']?.[0] || 0;
  if (elements.statusInitialFundedRatio) {
    elements.statusInitialFundedRatio.textContent = `${Math.round(initFundedRatio)}%`;
  }

  // Render Visuals
  renderDonutChart();
  renderCapitalAdequacyMetrics();
  drawFundedRatioConesChart();
  drawDeficitProbChart();
  drawAssetsVsLiabilitiesChart();
  drawLiabilityOutflowsChart();
  renderScorecardTable();

  // Scroll to results if not visible
  elements.resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// -------------------------------------------------------------------
// 1. Donut Chart (Asset Portfolio)
// -------------------------------------------------------------------
function renderDonutChart() {
  const canvas = elements.donutCanvasAssets;
  const legendWrap = elements.donutLegendAssets;
  if (!canvas || !legendWrap) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = 220;
  const h = 220;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const outerR = 85;
  const innerR = 55;

  let startAngle = -Math.PI / 2;
  let legendHtml = '';

  state.assets.forEach((item, idx) => {
    const wt = parseFloat(item.weight) || 0;
    if (wt <= 0) return;

    const sliceAngle = (wt / 100) * (Math.PI * 2);
    const endAngle = startAngle + sliceAngle;
    const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fill();

    startAngle = endAngle;

    legendHtml += `
      <div class="donut-legend-item">
        <div class="donut-legend-left">
          <span class="donut-legend-dot" style="background: ${color};"></span>
          <span class="donut-ticker">${item.ticker}</span>
        </div>
        <span class="donut-legend-pct" style="color: ${color};">${wt}%</span>
      </div>
    `;
  });

  // Donut center text
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${state.assets.length} Assets`, cx, cy - 6);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 9px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.fillText('PORTFOLIO', cx, cy + 9);

  legendWrap.innerHTML = legendHtml;
  if (elements.donutAssetCount) {
    elements.donutAssetCount.textContent = `${state.assets.length} Assets`;
  }
}

// -------------------------------------------------------------------
// 2. Capital Adequacy Scorecard
// -------------------------------------------------------------------
function renderCapitalAdequacyMetrics() {
  if (!state.simulationResult) return;
  const res = state.simulationResult;
  const period = state.settings.simulationPeriod;

  const initLiabPv = res.liabilityPVTrajectory ? res.liabilityPVTrajectory[0] : 0;
  const initRatio = res.fundedRatioPercentiles?.['50']?.[0] || 0;
  const finalRatio = res.fundedRatioPercentiles?.['50']?.[period] || 0;
  const peakDeficit = res.deficitProbabilities ? Math.max(...res.deficitProbabilities) : 0;
  const finalSolvency = res.survivalRates ? res.survivalRates[period] : 100;

  if (elements.metricInitialLiabPv) elements.metricInitialLiabPv.textContent = formatCurrency(initLiabPv);

  if (elements.metricInitialFundedRatio) {
    elements.metricInitialFundedRatio.textContent = `${Math.round(initRatio)}%`;
    elements.metricInitialFundedRatio.style.color = initRatio >= 100 ? '#22c55e' : '#ef4444';
  }

  if (elements.metricMedianFinalRatio) {
    elements.metricMedianFinalRatio.textContent = `${Math.round(finalRatio)}%`;
    elements.metricMedianFinalRatio.style.color = finalRatio >= 100 ? '#22c55e' : '#ef4444';
  }

  if (elements.metricPeakDeficitProb) {
    elements.metricPeakDeficitProb.textContent = `${peakDeficit.toFixed(1)}%`;
    elements.metricPeakDeficitProb.style.color = peakDeficit > 25 ? '#ef4444' : (peakDeficit > 10 ? '#f97316' : '#22c55e');
  }

  if (elements.metricFinalSolvency) {
    elements.metricFinalSolvency.textContent = `${finalSolvency.toFixed(1)}%`;
    elements.metricFinalSolvency.style.color = finalSolvency >= 90 ? '#22c55e' : (finalSolvency >= 75 ? '#eab308' : '#ef4444');
  }
}

// -------------------------------------------------------------------
// 3. Chart: Funded Ratio Percentile Cones
// -------------------------------------------------------------------
function drawFundedRatioConesChart() {
  const canvas = elements.canvasFundedRatio;
  if (!canvas || !state.simulationResult?.fundedRatioPercentiles) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 25, right: 35, bottom: 40, left: 65 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const period = state.settings.simulationPeriod;
  const pcts = state.simulationResult.fundedRatioPercentiles;

  // Find scale range
  let maxRatio = 200;
  [10, 25, 50, 75, 90].forEach(p => {
    for (let y = 0; y <= period; y++) {
      if (pcts[p][y] > maxRatio) maxRatio = pcts[p][y];
    }
  });
  maxRatio = Math.min(600, Math.ceil(maxRatio / 50) * 50);

  function getX(yr) {
    return pad.left + (yr / period) * plotW;
  }

  function getY(ratio) {
    const clamped = Math.min(maxRatio, Math.max(0, ratio));
    return pad.top + plotH * (1 - clamped / maxRatio);
  }

  // Draw Underfunded Danger Zone (< 100%)
  const y100 = getY(100);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
  ctx.fillRect(pad.left, y100, plotW, (pad.top + plotH) - y100);

  // Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const val = (i / gridSteps) * maxRatio;
    const gy = getY(val);

    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(w - pad.right, gy);
    ctx.stroke();

    ctx.fillText(`${Math.round(val)}%`, pad.left - 10, gy);
  }

  // 100% Fully Funded Benchmark Reference Line (Bold red dash)
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.left, y100);
  ctx.lineTo(w - pad.right, y100);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('100% Fully Funded Threshold', pad.left + 10, y100 - 8);

  // Time Axis Ticks
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = Math.max(1, Math.floor(period / 8));
  for (let y = 0; y <= period; y += step) {
    ctx.fillText(`Yr ${y}`, getX(y), h - pad.bottom + 8);
  }

  // Draw Shaded Percentile Fan Zones
  // 10th - 90th outer cone
  ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.beginPath();
  for (let y = 0; y <= period; y++) {
    const x = getX(y);
    const py = getY(pcts['90'][y]);
    if (y === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  for (let y = period; y >= 0; y--) {
    ctx.lineTo(getX(y), getY(pcts['10'][y]));
  }
  ctx.closePath();
  ctx.fill();

  // 25th - 75th inner cone
  ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
  ctx.beginPath();
  for (let y = 0; y <= period; y++) {
    const x = getX(y);
    const py = getY(pcts['75'][y]);
    if (y === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  for (let y = period; y >= 0; y--) {
    ctx.lineTo(getX(y), getY(pcts['25'][y]));
  }
  ctx.closePath();
  ctx.fill();

  // Draw Percentile Lines
  const lineConfigs = [
    { p: 10, color: PERCENTILE_COLORS[10], width: 1.5, dash: [4, 3] },
    { p: 25, color: PERCENTILE_COLORS[25], width: 1.5, dash: [4, 3] },
    { p: 75, color: PERCENTILE_COLORS[75], width: 1.5, dash: [4, 3] },
    { p: 90, color: PERCENTILE_COLORS[90], width: 1.5, dash: [4, 3] },
    { p: 50, color: PERCENTILE_COLORS[50], width: 2.5, dash: [] } // Median
  ];

  lineConfigs.forEach(({ p, color, width, dash }) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    for (let y = 0; y <= period; y++) {
      const x = getX(y);
      const py = getY(pcts[p][y]);
      if (y === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Attach hover crosshair tooltip
  setupCanvasTooltip(canvas, elements.tooltipFundedRatio, (yr) => {
    if (yr < 0 || yr > period) return null;
    return `
      <strong>Timeline: Year ${yr}</strong><br/>
      <span style="color: ${PERCENTILE_COLORS[90]};">● 90th Pct:</span> ${formatRatio(pcts['90'][yr])}<br/>
      <span style="color: ${PERCENTILE_COLORS[75]};">● 75th Pct:</span> ${formatRatio(pcts['75'][yr])}<br/>
      <span style="color: ${PERCENTILE_COLORS[50]};">● Median (50th):</span> <strong>${formatRatio(pcts['50'][yr])}</strong><br/>
      <span style="color: ${PERCENTILE_COLORS[25]};">● 25th Pct:</span> ${formatRatio(pcts['25'][yr])}<br/>
      <span style="color: ${PERCENTILE_COLORS[10]};">● 10th Pct:</span> ${formatRatio(pcts['10'][yr])}
    `;
  });
}

// -------------------------------------------------------------------
// 4. Chart: Deficit & Depletion Probability by Year
// -------------------------------------------------------------------
function drawDeficitProbChart() {
  const canvas = elements.canvasDeficitProb;
  if (!canvas || !state.simulationResult?.deficitProbabilities) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 25, right: 35, bottom: 40, left: 60 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const period = state.settings.simulationPeriod;
  const deficitProbs = state.simulationResult.deficitProbabilities;
  const survivalRates = state.simulationResult.survivalRates;

  function getX(yr) {
    return pad.left + (yr / period) * plotW;
  }

  function getY(prob) {
    const clamped = Math.min(100, Math.max(0, prob));
    return pad.top + plotH * (1 - clamped / 100);
  }

  // Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  [0, 20, 40, 60, 80, 100].forEach(prob => {
    const gy = getY(prob);
    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(w - pad.right, gy);
    ctx.stroke();
    ctx.fillText(`${prob}%`, pad.left - 10, gy);
  });

  // Time Axis Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = Math.max(1, Math.floor(period / 8));
  for (let y = 0; y <= period; y += step) {
    ctx.fillText(`Yr ${y}`, getX(y), h - pad.bottom + 8);
  }

  // Deficit Shaded Area
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
  ctx.beginPath();
  for (let y = 0; y <= period; y++) {
    const x = getX(y);
    const py = getY(deficitProbs[y]);
    if (y === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.lineTo(getX(period), getY(0));
  ctx.lineTo(getX(0), getY(0));
  ctx.closePath();
  ctx.fill();

  // Deficit Probability Line (Red)
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let y = 0; y <= period; y++) {
    const x = getX(y);
    const py = getY(deficitProbs[y]);
    if (y === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();

  // Depletion Probability Line (Purple: 100 - survivalRate)
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  for (let y = 0; y <= period; y++) {
    const depletionProb = 100 - survivalRates[y];
    const x = getX(y);
    const py = getY(depletionProb);
    if (y === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Tooltip
  setupCanvasTooltip(canvas, elements.tooltipDeficitProb, (yr) => {
    if (yr < 0 || yr > period) return null;
    const def = deficitProbs[yr];
    const dep = 100 - survivalRates[yr];
    return `
      <strong>Timeline: Year ${yr}</strong><br/>
      <span style="color: #ef4444;">● Deficit Probability (&lt; 100%):</span> <strong>${def.toFixed(1)}%</strong><br/>
      <span style="color: #a855f7;">● Depletion Probability ($0):</span> <strong>${dep.toFixed(1)}%</strong><br/>
      <span style="color: #22c55e;">● Solvency Rate:</span> ${(100 - dep).toFixed(1)}%
    `;
  });
}

// -------------------------------------------------------------------
// 5. Chart: Portfolio Assets vs Remaining Liabilities PV
// -------------------------------------------------------------------
function drawAssetsVsLiabilitiesChart() {
  const canvas = elements.canvasAssetsVsLiab;
  if (!canvas || !state.simulationResult) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 25, right: 35, bottom: 40, left: 75 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const period = state.settings.simulationPeriod;
  const medianAssets = state.simulationResult.percentileTrajectories['50'];
  const liabPv = state.simulationResult.liabilityPVTrajectory || new Float64Array(period + 1);

  let maxVal = 0;
  for (let y = 0; y <= period; y++) {
    if (medianAssets[y] > maxVal) maxVal = medianAssets[y];
    if (liabPv[y] > maxVal) maxVal = liabPv[y];
  }
  maxVal = maxVal * 1.15;

  function getX(yr) {
    return pad.left + (yr / period) * plotW;
  }

  function getY(val) {
    const clamped = Math.max(0, val);
    return pad.top + plotH * (1 - clamped / maxVal);
  }

  // Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const val = (i / gridSteps) * maxVal;
    const gy = getY(val);

    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(w - pad.right, gy);
    ctx.stroke();

    ctx.fillText(formatCurrency(val), pad.left - 10, gy);
  }

  // Time Axis Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = Math.max(1, Math.floor(period / 8));
  for (let y = 0; y <= period; y += step) {
    ctx.fillText(`Yr ${y}`, getX(y), h - pad.bottom + 8);
  }

  // Remaining Liabilities PV Line (Amber)
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  for (let y = 0; y <= period; y++) {
    const x = getX(y);
    const py = getY(liabPv[y]);
    if (y === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Median Portfolio Assets Line (Cyan)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let y = 0; y <= period; y++) {
    const x = getX(y);
    const py = getY(medianAssets[y]);
    if (y === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();

  // Tooltip
  setupCanvasTooltip(canvas, elements.tooltipAssetsVsLiab, (yr) => {
    if (yr < 0 || yr > period) return null;
    return `
      <strong>Timeline: Year ${yr}</strong><br/>
      <span style="color: #38bdf8;">● Median Assets:</span> <strong>${formatCurrency(medianAssets[yr])}</strong><br/>
      <span style="color: #f59e0b;">● Remaining Liab PV:</span> <strong>${formatCurrency(liabPv[yr])}</strong><br/>
      <span style="color: #22c55e;">● Net Capital Surplus:</span> ${formatCurrency(medianAssets[yr] - liabPv[yr])}
    `;
  });
}

// -------------------------------------------------------------------
// 6. Chart: Annual Liability Outflows Schedule
// -------------------------------------------------------------------
function drawLiabilityOutflowsChart() {
  const canvas = elements.canvasLiabilityOutflows;
  if (!canvas || !state.simulationResult) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 25, right: 35, bottom: 40, left: 65 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const period = state.settings.simulationPeriod;
  const outflows = state.simulationResult.annualOutflowsByYear || new Float64Array(period + 1);

  let maxOutflow = 0;
  for (let y = 1; y <= period; y++) {
    if (outflows[y] > maxOutflow) maxOutflow = outflows[y];
  }
  maxOutflow = Math.max(50000, maxOutflow * 1.2);

  function getY(val) {
    return pad.top + plotH * (1 - Math.max(0, val) / maxOutflow);
  }

  // Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const val = (i / gridSteps) * maxOutflow;
    const gy = getY(val);

    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(w - pad.right, gy);
    ctx.stroke();

    ctx.fillText(formatCurrency(val), pad.left - 10, gy);
  }

  // Time Axis Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = Math.max(1, Math.floor(period / 8));
  for (let y = 1; y <= period; y += step) {
    const x = pad.left + ((y - 0.5) / period) * plotW;
    ctx.fillText(`Yr ${y}`, x, h - pad.bottom + 8);
  }

  // Draw Bars for each Year
  const barWidth = Math.max(3, (plotW / period) * 0.7);
  for (let y = 1; y <= period; y++) {
    const val = outflows[y];
    if (val > 0) {
      const x = pad.left + ((y - 1) / period) * plotW + (plotW / period - barWidth) / 2;
      const barY = getY(val);
      const barH = (pad.top + plotH) - barY;

      ctx.fillStyle = '#ec4899';
      ctx.fillRect(x, barY, barWidth, barH);
    }
  }

  // Tooltip
  setupCanvasTooltip(canvas, elements.tooltipLiabilityOutflows, (yr) => {
    if (yr < 1 || yr > period) return null;
    const val = outflows[yr] || 0;
    return `
      <strong>Timeline: Year ${yr}</strong><br/>
      <span style="color: #ec4899;">● Scheduled Outflow:</span> <strong>${formatCurrency(val)}</strong>
    `;
  });
}

// -------------------------------------------------------------------
// 7. Interactive Canvas Crosshair Tooltip Helper
// -------------------------------------------------------------------
function setupCanvasTooltip(canvas, tooltipEl, contentFn) {
  if (!canvas || !tooltipEl) return;

  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pad = { left: 60, right: 35 };
    const plotW = rect.width - pad.left - pad.right;

    const period = state.settings.simulationPeriod;
    const norm = (x - pad.left) / plotW;
    const yr = Math.round(norm * period);

    const html = contentFn(yr);
    if (!html) {
      tooltipEl.style.display = 'none';
      return;
    }

    tooltipEl.innerHTML = html;
    tooltipEl.style.display = 'block';

    const ttW = tooltipEl.offsetWidth;
    let posX = e.clientX - rect.left + 15;
    if (posX + ttW > rect.width) posX = e.clientX - rect.left - ttW - 15;

    tooltipEl.style.left = `${posX}px`;
    tooltipEl.style.top = `${e.clientY - rect.top - 10}px`;
  };

  canvas.onmouseleave = () => {
    tooltipEl.style.display = 'none';
  };
}

// -------------------------------------------------------------------
// 8. Detailed ALM Scorecard Table & CSV
// -------------------------------------------------------------------
function renderScorecardTable() {
  if (!elements.almScorecardTbody || !state.simulationResult) return;
  const res = state.simulationResult;
  const period = state.settings.simulationPeriod;

  const medianAssets = res.percentileTrajectories['50'];
  const p10Assets = res.percentileTrajectories['10'];
  const p90Assets = res.percentileTrajectories['90'];
  const liabPv = res.liabilityPVTrajectory || new Float64Array(period + 1);
  const outflows = res.annualOutflowsByYear || new Float64Array(period + 1);
  const fundedRatios = res.fundedRatioPercentiles?.['50'] || new Float64Array(period + 1);
  const deficitProbs = res.deficitProbabilities || new Float64Array(period + 1);
  const survivalRates = res.survivalRates || new Float64Array(period + 1);

  let html = '';
  for (let y = 0; y <= period; y++) {
    const ratio = fundedRatios[y];
    const isFunded = ratio >= 100;
    const badgeColor = isFunded ? '#22c55e' : '#ef4444';

    html += `
      <tr>
        <td><strong>${y === 0 ? 'Year 0 (Start)' : `Year ${y}`}</strong></td>
        <td style="text-align: right; color: #ec4899;">${y === 0 ? '--' : formatCurrency(outflows[y])}</td>
        <td style="text-align: right; color: #f59e0b;">${formatCurrency(liabPv[y])}</td>
        <td style="text-align: right; font-weight: 700; color: #fff;">${formatCurrency(medianAssets[y])}</td>
        <td style="text-align: right; color: #94a3b8;">${formatCurrency(p10Assets[y])}</td>
        <td style="text-align: right; color: #94a3b8;">${formatCurrency(p90Assets[y])}</td>
        <td style="text-align: right;">
          <span style="display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.85rem; background: ${isFunded ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${badgeColor};">
            ${formatRatio(ratio)}
          </span>
        </td>
        <td style="text-align: right; color: ${deficitProbs[y] > 20 ? '#ef4444' : '#94a3b8'};">${deficitProbs[y].toFixed(1)}%</td>
        <td style="text-align: right; color: #22c55e;">${survivalRates[y].toFixed(1)}%</td>
      </tr>
    `;
  }

  elements.almScorecardTbody.innerHTML = html;
}

function exportCSV() {
  if (!state.simulationResult) return;
  const res = state.simulationResult;
  const period = state.settings.simulationPeriod;

  const medianAssets = res.percentileTrajectories['50'];
  const p10Assets = res.percentileTrajectories['10'];
  const p90Assets = res.percentileTrajectories['90'];
  const liabPv = res.liabilityPVTrajectory || new Float64Array(period + 1);
  const outflows = res.annualOutflowsByYear || new Float64Array(period + 1);
  const fundedRatios = res.fundedRatioPercentiles?.['50'] || new Float64Array(period + 1);
  const deficitProbs = res.deficitProbabilities || new Float64Array(period + 1);
  const survivalRates = res.survivalRates || new Float64Array(period + 1);

  let csv = 'Year,Scheduled Outflow,Remaining Liab PV,Median Assets,10th Pct Assets,90th Pct Assets,Median Funded Ratio,Deficit Probability,Solvency Rate\n';
  for (let y = 0; y <= period; y++) {
    csv += `${y},${outflows[y] || 0},${Math.round(liabPv[y])},${Math.round(medianAssets[y])},${Math.round(p10Assets[y])},${Math.round(p90Assets[y])},${fundedRatios[y].toFixed(2)}%,${deficitProbs[y].toFixed(2)}%,${survivalRates[y].toFixed(2)}%\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asset-liability-modeling-${period}yr.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------------
// Event Listeners Setup
// -------------------------------------------------------------------
function setupEventListeners() {
  // Config Toggle
  elements.btnToggleConfig?.addEventListener('click', () => {
    state.isConfigCollapsed = !state.isConfigCollapsed;
    if (elements.configCard) {
      elements.configCard.classList.toggle('collapsed', state.isConfigCollapsed);
    }
    if (elements.btnConfigText) {
      elements.btnConfigText.textContent = state.isConfigCollapsed
        ? 'Expand Model Configuration'
        : 'Collapse Model Configuration';
    }
  });

  // Tab Buttons
  elements.tabBtnAssets?.addEventListener('click', () => switchTab('assets'));
  elements.tabBtnLiabilities?.addEventListener('click', () => switchTab('liabilities'));
  elements.tabBtnSettings?.addEventListener('click', () => switchTab('settings'));

  // Preset Chips
  document.querySelectorAll('.btn-preset-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const presetKey = e.currentTarget.getAttribute('data-preset');
      if (presetKey) applyPreset(presetKey);
    });
  });

  // Add Asset Button
  elements.btnAddAsset?.addEventListener('click', () => {
    const id = `asset-${Date.now()}`;
    state.assets.push({ id, ticker: 'VOO', weight: 0 });
    renderAssetsTable();
  });

  // Reset Assets Button
  elements.btnResetAssets?.addEventListener('click', () => {
    applyPreset('classic-60-40');
  });

  // Assets Table Delegation (Input changes & Deletions)
  elements.assetsTbody?.addEventListener('input', (e) => {
    if (e.target.classList.contains('weight-input')) {
      const id = e.target.getAttribute('data-asset-id');
      const row = state.assets.find(r => r.id === id);
      if (row) {
        row.weight = parseFloat(e.target.value) || 0;
        updateTotalAssetAllocation();
      }
    }
  });

  elements.assetsTbody?.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.btn-delete-row');
    if (delBtn) {
      const id = delBtn.getAttribute('data-delete-id');
      state.assets = state.assets.filter(r => r.id !== id);
      renderAssetsTable();
      return;
    }

    const selectBtn = e.target.closest('.btn-select-asset');
    if (selectBtn) {
      const id = selectBtn.getAttribute('data-asset-id');
      openAssetModal({
        targetType: 'fund',
        onSelect: (chosenTicker) => {
          const row = state.assets.find(r => r.id === id);
          if (row) {
            row.ticker = (typeof chosenTicker === 'string' ? chosenTicker : (chosenTicker?.ticker || chosenTicker))?.toUpperCase();
            renderAssetsTable();
          }
        }
      });
    }
  });

  // Liabilities Builder Delegation
  elements.btnAddLiability?.addEventListener('click', () => {
    const id = `liab-${Date.now()}`;
    state.liabilities.push({
      id,
      name: 'Custom Obligation',
      type: 'recurring',
      startYear: 1,
      endYear: 10,
      amount: 25000,
      inflationAdjusted: true
    });
    renderLiabilitiesBuilder();
  });

  elements.btnResetLiabilities?.addEventListener('click', () => {
    state.liabilities = [
      { id: 'l1', name: 'Pension Benefit Payout', type: 'recurring', startYear: 1, endYear: 20, amount: 40000, inflationAdjusted: true },
      { id: 'l2', name: 'Debt Service Balloon Payoff', type: 'lumpSum', startYear: 5, endYear: 5, amount: 100000, inflationAdjusted: false }
    ];
    renderLiabilitiesBuilder();
  });

  elements.liabilitiesBuilder?.addEventListener('input', (e) => {
    const id = e.target.getAttribute('data-id');
    const liab = state.liabilities.find(l => l.id === id);
    if (!liab) return;

    if (e.target.classList.contains('liab-name-input')) {
      liab.name = e.target.value;
    } else if (e.target.classList.contains('liab-start-input')) {
      liab.startYear = parseInt(e.target.value, 10) || 1;
    } else if (e.target.classList.contains('liab-end-input')) {
      liab.endYear = parseInt(e.target.value, 10) || 1;
    } else if (e.target.classList.contains('liab-amount-input')) {
      liab.amount = parseFloat(e.target.value) || 0;
    }
  });

  elements.liabilitiesBuilder?.addEventListener('change', (e) => {
    const id = e.target.getAttribute('data-id');
    const liab = state.liabilities.find(l => l.id === id);
    if (!liab) return;

    if (e.target.classList.contains('liab-type-select')) {
      liab.type = e.target.value;
      renderLiabilitiesBuilder();
    } else if (e.target.classList.contains('liab-inflation-chk')) {
      liab.inflationAdjusted = e.target.checked;
    }
  });

  elements.liabilitiesBuilder?.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-delete-liab]');
    if (delBtn) {
      const id = delBtn.getAttribute('data-delete-liab');
      state.liabilities = state.liabilities.filter(l => l.id !== id);
      renderLiabilitiesBuilder();
    }
  });

  // Settings Synchronization
  elements.cfgInitialAssets?.addEventListener('change', (e) => {
    state.settings.initialAmount = parseFloat(e.target.value) || 1000000;
  });

  elements.cfgSimPeriod?.addEventListener('change', (e) => {
    state.settings.simulationPeriod = parseInt(e.target.value, 10) || 30;
  });

  elements.cfgNumSims?.addEventListener('change', (e) => {
    state.settings.numSimulations = parseInt(e.target.value, 10) || 1000;
  });

  elements.cfgDiscountRate?.addEventListener('change', (e) => {
    state.settings.liabilityDiscountRate = parseFloat(e.target.value) || 0.04;
  });

  elements.cfgSimModel?.addEventListener('change', (e) => {
    state.settings.simulationModel = e.target.value;
  });

  elements.cfgBootstrapModel?.addEventListener('change', (e) => {
    state.settings.bootstrapModel = e.target.value;
  });

  elements.cfgSeqRisk?.addEventListener('change', (e) => {
    state.settings.sequenceRisk = e.target.value;
  });

  elements.cfgInflationModel?.addEventListener('change', (e) => {
    state.settings.inflationModel = e.target.value;
  });

  elements.cfgTaxTreatment?.addEventListener('change', (e) => {
    state.settings.taxTreatment = e.target.value;
  });

  // Run Simulation Button
  elements.btnRunSim?.addEventListener('click', runSimulation);

  // CSV Export Button
  elements.btnExportCsv?.addEventListener('click', exportCSV);

  // Window Resize
  window.addEventListener('resize', () => {
    if (state.simulationResult) {
      renderDonutChart();
      drawFundedRatioConesChart();
      drawDeficitProbChart();
      drawAssetsVsLiabilitiesChart();
      drawLiabilityOutflowsChart();
    }
  });
}

// -------------------------------------------------------------------
// Initialization
// -------------------------------------------------------------------
function init() {
  cacheDOMElements();
  initWorker();
  renderAssetsTable();
  renderLiabilitiesBuilder();
  setupEventListeners();

  // Run initial simulation on load
  runSimulation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
