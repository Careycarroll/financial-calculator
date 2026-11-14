/**
 * Monte Carlo Simulation Studio UI Controller (Page 1)
 * Manages reactive user configuration, background Web Worker simulation execution,
 * High-DPI canvas percentile growth fan cones, survival curves, and histograms.
 */

import { getAllFundsSync, subscribeSessionFunds } from '../js/session-funds.js';
import { openAssetModal } from '../js/asset-modal.js';
import { runMonteCarloSimulation, CANONICAL_ASSET_CLASSES } from './monte-carlo-engine.js';

// Color palette for assets and percentile curves
const ASSET_PALETTE = [
  '#38bdf8', '#34d399', '#fbbf24', '#f43f5e', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const PERCENTILE_COLORS = {
  10: '#ef4444',
  25: '#fbbf24',
  50: '#38bdf8',
  75: '#34d399',
  90: '#10b981'
};

// Application State
const state = {
  activeTab: 'assets', // 'assets' | 'settings'
  isConfigCollapsed: false,
  growthScale: 'linear', // 'linear' | 'log'

  settings: {
    initialAmount: 100000,
    simulationPeriod: 30,
    simulationModel: 'historical',
    bootstrapModel: 'singleYear',
    sequenceRisk: 'none',
    inflationModel: 'historical',
    taxTreatment: 'preTax',
    numSimulations: 1000
  },

  rows: [
    { id: 'row-1', ticker: 'VOO', weight: 60 },
    { id: 'row-2', ticker: 'BND', weight: 40 }
  ],

  simulationResult: null,
  isSimulating: false
};

// Web Worker instance
let worker = null;

// DOM Element Cache
let elements = {};

function cacheDOMElements() {
  elements = {
    // Status Bar
    statusPeriod: document.getElementById('status-period'),
    statusSimCount: document.getElementById('status-sim-count'),
    statusModelType: document.getElementById('status-model-type'),
    statusSequenceRisk: document.getElementById('status-sequence-risk'),
    btnToggleConfig: document.getElementById('btn-toggle-config-panel'),
    btnConfigText: document.getElementById('btn-config-text'),
    configCard: document.getElementById('config-card'),
    alertsContainer: document.getElementById('alerts-container'),

    // Tabs
    tabBtnAssets: document.getElementById('tab-btn-assets'),
    tabBtnSettings: document.getElementById('tab-btn-settings'),
    paneAssets: document.getElementById('pane-assets'),
    paneSettings: document.getElementById('pane-settings'),

    // Allocations Table
    allocationsTbody: document.getElementById('allocations-tbody'),
    totalAllocVal: document.getElementById('total-alloc-val'),
    totalAllocStatus: document.getElementById('total-alloc-status'),
    btnAddAssetRow: document.getElementById('btn-add-asset-row'),
    btnResetTable: document.getElementById('btn-reset-table'),

    // Settings
    inputInitialCapital: document.getElementById('input-initial-capital'),
    selectPeriodYears: document.getElementById('select-period-years'),
    selectSimulationModel: document.getElementById('select-simulation-model'),
    selectBootstrapModel: document.getElementById('select-bootstrap-model'),
    selectSequenceRisk: document.getElementById('select-sequence-risk'),
    selectInflationModel: document.getElementById('select-inflation-model'),
    selectTaxTreatment: document.getElementById('select-tax-treatment'),
    selectSimCount: document.getElementById('select-sim-count'),

    // Run & Progress
    btnRunSimulation: document.getElementById('btn-run-simulation'),
    runProgressFill: document.getElementById('run-progress-fill'),
    runProgressLabel: document.getElementById('run-progress-label'),

    // Results Suite
    resultsSuite: document.getElementById('results-suite'),
    donutsContainer: document.getElementById('donuts-container'),
    scorecardTbody: document.getElementById('scorecard-tbody'),
    btnExportCsv: document.getElementById('btn-export-csv'),

    btnScaleLinear: document.getElementById('btn-scale-linear'),
    btnScaleLog: document.getElementById('btn-scale-log'),
    growthCanvas: document.getElementById('growth-canvas'),
    growthTooltip: document.getElementById('growth-tooltip'),
    growthLegendBar: document.getElementById('growth-legend-bar'),

    survivalCanvas: document.getElementById('survival-canvas'),
    survivalTooltip: document.getElementById('survival-tooltip'),

    returnHistCanvas: document.getElementById('return-hist-canvas'),
    drawdownHistCanvas: document.getElementById('drawdown-hist-canvas'),

    swrTbody: document.getElementById('swr-tbody'),
    milestonesTbody: document.getElementById('milestones-tbody')
  };
}

// -------------------------------------------------------------------
// Helper Utilities
// -------------------------------------------------------------------
function formatCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return '$0';
  return '$' + Math.round(val).toLocaleString();
}

function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return '0.00%';
  const num = typeof val === 'number' ? val * 100 : parseFloat(val);
  return `${num.toFixed(2)}%`;
}

function hexToRgba(hex, alpha = 0.2) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function showAlert(msg, type = 'error') {
  if (!elements.alertsContainer) return;
  elements.alertsContainer.innerHTML = `
    <div class="portfolio-alert ${type}">
      <span>${msg}</span>
    </div>
  `;
}

function clearAlerts() {
  if (elements.alertsContainer) {
    elements.alertsContainer.innerHTML = '';
  }
}

// -------------------------------------------------------------------
// Presets
// -------------------------------------------------------------------
const PRESETS = {
  'classic-60-40': [
    { ticker: 'VOO', weight: 60 },
    { ticker: 'BND', weight: 40 }
  ],
  'aggressive-80-20': [
    { ticker: 'VOO', weight: 50 },
    { ticker: 'QQQ', weight: 30 },
    { ticker: 'BND', weight: 20 }
  ],
  'three-fund': [
    { ticker: 'VOO', weight: 40 },
    { ticker: 'SCHD', weight: 30 },
    { ticker: 'BND', weight: 30 }
  ],
  'all-weather': [
    { ticker: 'VOO', weight: 30 },
    { ticker: 'BND', weight: 55 },
    { ticker: 'GLD', weight: 15 }
  ]
};

// -------------------------------------------------------------------
// Allocation Table Rendering & Weight Validation
// -------------------------------------------------------------------
function renderAllocationTable() {
  if (!elements.allocationsTbody) return;
  elements.allocationsTbody.innerHTML = '';

  const allFunds = getAllFundsSync();
  const fundMap = new Map(allFunds.map(f => [f.ticker.toUpperCase(), f]));

  state.rows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.rowId = row.id;

    const fund = fundMap.get(row.ticker.toUpperCase());
    const name = fund ? fund.name : (CANONICAL_ASSET_CLASSES[row.ticker] ? row.ticker : 'Custom Asset');
    const color = fund?.color || ASSET_PALETTE[idx % ASSET_PALETTE.length];

    tr.innerHTML = `
      <td>
        <button type="button" class="asset-cell-btn" data-action="pick-asset" data-row-idx="${idx}">
          <span class="picker-dot" style="background: ${color};"></span>
          <strong style="color: #f1f5f9; min-width: 45px;">${row.ticker}</strong>
          <span style="color: #94a3b8; font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
          <span style="margin-left: auto; color: #64748b;">🔍</span>
        </button>
      </td>
      <td class="td-weight">
        <div class="weight-input-wrap">
          <input type="number" class="weight-input" data-row-idx="${idx}" value="${row.weight}" min="0" max="100" step="1" />
          <span class="weight-suffix">%</span>
        </div>
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-remove-row" data-action="remove-row" data-row-idx="${idx}" title="Remove asset row">✕</button>
      </td>
    `;

    elements.allocationsTbody.appendChild(tr);
  });

  updateWeightTotal();
}

function updateWeightTotal() {
  const sum = state.rows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);
  elements.totalAllocVal.textContent = `${sum.toFixed(1)}%`;

  if (Math.abs(sum - 100) < 0.05) {
    elements.totalAllocStatus.className = 'total-status valid';
    elements.totalAllocStatus.textContent = '✓ Valid';
    elements.btnRunSimulation.disabled = false;
  } else {
    elements.totalAllocStatus.className = 'total-status invalid';
    elements.totalAllocStatus.textContent = sum < 100 ? `${(100 - sum).toFixed(1)}% Left` : `+${(sum - 100).toFixed(1)}% Over`;
    elements.btnRunSimulation.disabled = true;
  }
}

// -------------------------------------------------------------------
// Simulation Orchestration & Web Worker Dispatch
// -------------------------------------------------------------------
function initWorker() {
  try {
    worker = new Worker('./monte-carlo-worker.js', { type: 'module' });
    worker.onmessage = function (e) {
      const { action, percent, result, error } = e.data;
      if (action === 'progress') {
        elements.runProgressFill.style.width = `${percent}%`;
        elements.runProgressLabel.textContent = `Simulating... ${percent}%`;
      } else if (action === 'simulationComplete') {
        elements.runProgressFill.style.width = '100%';
        elements.runProgressLabel.textContent = 'Complete (100%)';
        state.isSimulating = false;
        elements.btnRunSimulation.disabled = false;
        state.simulationResult = result;
        renderVisualSuite();
      } else if (action === 'simulationError') {
        showAlert(error || 'Worker execution error');
        state.isSimulating = false;
        elements.btnRunSimulation.disabled = false;
        elements.runProgressLabel.textContent = 'Error';
      }
    };
  } catch (err) {
    console.warn('Web Worker initialization failed, will run synchronously:', err);
    worker = null;
  }
}

function executeSimulation() {
  clearAlerts();

  // Read configuration parameters
  state.settings.initialAmount = parseFloat(elements.inputInitialCapital.value) || 100000;
  state.settings.simulationPeriod = parseInt(elements.selectPeriodYears.value, 10) || 30;
  state.settings.simulationModel = elements.selectSimulationModel.value;
  state.settings.bootstrapModel = elements.selectBootstrapModel.value;
  state.settings.sequenceRisk = elements.selectSequenceRisk.value;
  state.settings.inflationModel = elements.selectInflationModel.value;
  state.settings.taxTreatment = elements.selectTaxTreatment.value;
  state.settings.numSimulations = parseInt(elements.selectSimCount.value, 10) || 1000;

  // Validate allocations
  const activeAllocs = state.rows.filter(r => (parseFloat(r.weight) || 0) > 0);
  const totalWeight = activeAllocs.reduce((s, r) => s + parseFloat(r.weight), 0);
  if (Math.abs(totalWeight - 100) > 0.05) {
    showAlert('Target allocation must sum to exactly 100%.');
    return;
  }

  // Build Asset Histories from Session Fund Database
  const allFunds = getAllFundsSync();
  const assetHistories = {};

  activeAllocs.forEach(a => {
    const fund = allFunds.find(f => f.ticker.toUpperCase() === a.ticker.toUpperCase());
    if (fund && fund.data && fund.data.length > 1) {
      // Calculate calendar annual returns from data
      const annualReturns = extractAnnualReturnsFromData(fund.data);
      assetHistories[a.ticker.toUpperCase()] = annualReturns;
    }
  });

  const config = {
    initialAmount: state.settings.initialAmount,
    simulationPeriod: state.settings.simulationPeriod,
    numSimulations: state.settings.numSimulations,
    planningType: 'singleStage',
    simulationModel: state.settings.simulationModel,
    bootstrapModel: state.settings.bootstrapModel,
    sequenceRisk: state.settings.sequenceRisk,
    inflationModel: state.settings.inflationModel,
    taxTreatment: state.settings.taxTreatment,
    startingAllocations: activeAllocs.map(a => ({ ticker: a.ticker, weight: parseFloat(a.weight) })),
    endingAllocations: activeAllocs.map(a => ({ ticker: a.ticker, weight: parseFloat(a.weight) })),
    assetHistories,
    percentileIntervals: [10, 25, 50, 75, 90]
  };

  // Update Status Bar
  elements.statusPeriod.textContent = `${state.settings.simulationPeriod} Years`;
  elements.statusSimCount.textContent = `${state.settings.numSimulations.toLocaleString()} Runs`;
  elements.statusModelType.textContent = state.settings.simulationModel === 'historical' ? 'Historical Returns' : 'Parameterized Normal';
  elements.statusSequenceRisk.textContent = state.settings.sequenceRisk === 'none' ? 'No Adjustments' : state.settings.sequenceRisk.replace('worst', 'Worst ') + ' Yrs';

  state.isSimulating = true;
  elements.btnRunSimulation.disabled = true;
  elements.runProgressFill.style.width = '15%';
  elements.runProgressLabel.textContent = 'Simulating...';

  if (worker) {
    worker.postMessage({ action: 'runSimulation', config });
  } else {
    // Fallback synchronous execution
    setTimeout(() => {
      try {
        const res = runMonteCarloSimulation(config);
        elements.runProgressFill.style.width = '100%';
        elements.runProgressLabel.textContent = 'Complete (100%)';
        state.isSimulating = false;
        elements.btnRunSimulation.disabled = false;
        state.simulationResult = res;
        renderVisualSuite();
      } catch (err) {
        showAlert(err.message || 'Simulation error');
        state.isSimulating = false;
        elements.btnRunSimulation.disabled = false;
      }
    }, 50);
  }
}

function extractAnnualReturnsFromData(data) {
  // Group monthly rows by year and calculate yearly compound return
  const byYear = {};
  data.forEach(pt => {
    const yr = pt.date.substring(0, 4);
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(pt.adjClose || pt.close);
  });

  const returns = [];
  Object.keys(byYear).sort().forEach(yr => {
    const prices = byYear[yr];
    if (prices.length >= 2) {
      const yrRet = (prices[prices.length - 1] - prices[0]) / prices[0];
      returns.push(yrRet);
    }
  });

  return returns.length >= 2 ? returns : [0.10, 0.15, -0.05, 0.22, 0.08, -0.12, 0.25, 0.04];
}

// -------------------------------------------------------------------
// Render Visual Presentation Suite
// -------------------------------------------------------------------
function renderVisualSuite() {
  if (!state.simulationResult) return;

  renderDonutChart();
  renderScorecardTable();
  drawGrowthFanChart();
  drawSurvivalChart();
  drawHistograms();
  renderSWRTable();
  renderMilestonesTable();
}

// -------------------------------------------------------------------
// 1. Target Allocation Donut Card
// -------------------------------------------------------------------
function renderDonutChart() {
  if (!elements.donutsContainer) return;
  elements.donutsContainer.innerHTML = '';

  const allFunds = getAllFundsSync();
  const fundMap = new Map(allFunds.map(f => [f.ticker.toUpperCase(), f]));

  const activeAllocs = state.rows.filter(r => (parseFloat(r.weight) || 0) > 0);

  const card = document.createElement('div');
  card.className = 'donut-card';
  card.innerHTML = `
    <div class="donut-card-header">
      <div class="donut-title-group">
        <span class="model-color-dot" style="background: #38bdf8;"></span>
        <span class="donut-title">Target Portfolio Asset Allocation</span>
      </div>
      <span class="donut-asset-badge">${activeAllocs.length} Assets</span>
    </div>
    <div class="donut-body">
      <div class="donut-canvas-wrap">
        <canvas id="target-donut-canvas" width="280" height="280" style="width: 140px; height: 140px;"></canvas>
      </div>
      <div class="donut-legend">
        ${activeAllocs.map((a, idx) => {
          const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
          const fund = fundMap.get(a.ticker.toUpperCase());
          const name = fund ? fund.name : a.ticker;
          return `
            <div class="donut-legend-item">
              <div class="donut-legend-left">
                <span class="donut-legend-dot" style="background: ${color};"></span>
                <span class="donut-ticker">${a.ticker}</span>
                <span class="donut-fund-name" title="${name}">${name}</span>
              </div>
              <span class="donut-legend-pct" style="color: ${color};">${a.weight}%</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  elements.donutsContainer.appendChild(card);

  // Draw Donut on Canvas
  const canvas = document.getElementById('target-donut-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 140 * dpr;
    canvas.height = 140 * dpr;
    ctx.scale(dpr, dpr);

    const cx = 70;
    const cy = 70;
    const rOuter = 62;
    const rInner = 39;
    let startAngle = -Math.PI / 2;

    activeAllocs.forEach((a, idx) => {
      const sliceAngle = (a.weight / 100) * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;
      const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, startAngle, endAngle);
      ctx.arc(cx, cy, rInner, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();

      startAngle = endAngle;
    });

    // Center Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('100%', cx, cy - 6);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 9px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.fillText('TARGET', cx, cy + 9);
  }
}

// -------------------------------------------------------------------
// 2. Scorecard Table
// -------------------------------------------------------------------
function renderScorecardTable() {
  if (!elements.scorecardTbody || !state.simulationResult) return;
  const { summary } = state.simulationResult;

  const rows = [
    { label: 'Final Portfolio Balance (Nominal)', key: summary.nominalFinal, format: formatCurrency, bold: true },
    { label: 'Final Portfolio Balance (Real / Inflation Adjusted)', key: summary.realFinal, format: formatCurrency },
    { label: 'Annualized Return (CAGR)', key: summary.cagr, format: formatPct, bold: true },
    { label: 'Maximum Drawdown Severity', key: summary.maxDrawdown, format: formatPct, alert: true }
  ];

  let html = '';
  rows.forEach(r => {
    html += `
      <tr>
        <td class="scorecard-metric-name">${r.label}</td>
        <td>${r.format(r.key.p10)}</td>
        <td>${r.format(r.key.p25)}</td>
        <td style="color:#38bdf8; font-weight:700;">${r.format(r.key.p50)}</td>
        <td>${r.format(r.key.p75)}</td>
        <td style="color:#34d399; font-weight:700;">${r.format(r.key.p90)}</td>
      </tr>
    `;
  });

  elements.scorecardTbody.innerHTML = html;
}

// -------------------------------------------------------------------
// 3. Growth Fan Cones Canvas Chart
// -------------------------------------------------------------------
function drawGrowthFanChart() {
  const canvas = elements.growthCanvas;
  if (!canvas || !state.simulationResult) return;

  const { simulationPeriod, percentileTrajectories } = state.simulationResult;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 30, right: 35, bottom: 40, left: 75 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const isLog = state.growthScale === 'log';
  let minVal = Infinity;
  let maxVal = -Infinity;

  [10, 25, 50, 75, 90].forEach(p => {
    for (let y = 0; y <= simulationPeriod; y++) {
      const v = percentileTrajectories[p][y];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
  });

  minVal = Math.max(1000, minVal * 0.9);
  maxVal = maxVal * 1.08;

  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);

  function getY(val) {
    const clamped = Math.max(minVal, val);
    if (isLog) {
      const norm = (Math.log10(clamped) - logMin) / (logMax - logMin);
      return pad.top + plotH * (1 - norm);
    }
    return pad.top + plotH * (1 - (clamped - minVal) / (maxVal - minVal));
  }

  function getX(yr) {
    return pad.left + (yr / simulationPeriod) * plotW;
  }

  // Draw Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const val = isLog
      ? Math.pow(10, logMin + (i / gridSteps) * (logMax - logMin))
      : minVal + (i / gridSteps) * (maxVal - minVal);
    const y = getY(val);

    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    ctx.fillText(formatCurrency(val), pad.left - 10, y);
  }

  // Draw Time Axis
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = Math.max(1, Math.floor(simulationPeriod / 6));
  for (let y = 0; y <= simulationPeriod; y += step) {
    const x = getX(y);
    ctx.fillText(`Yr ${y}`, x, h - pad.bottom + 8);
  }

  // 1. Outer Fan Area (10th to 90th percentile)
  ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.beginPath();
  for (let y = 0; y <= simulationPeriod; y++) {
    const x = getX(y);
    const yTop = getY(percentileTrajectories[90][y]);
    if (y === 0) ctx.moveTo(x, yTop);
    else ctx.lineTo(x, yTop);
  }
  for (let y = simulationPeriod; y >= 0; y--) {
    const x = getX(y);
    const yBot = getY(percentileTrajectories[10][y]);
    ctx.lineTo(x, yBot);
  }
  ctx.closePath();
  ctx.fill();

  // 2. Inner Fan Area (25th to 75th percentile)
  ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.beginPath();
  for (let y = 0; y <= simulationPeriod; y++) {
    const x = getX(y);
    const yTop = getY(percentileTrajectories[75][y]);
    if (y === 0) ctx.moveTo(x, yTop);
    else ctx.lineTo(x, yTop);
  }
  for (let y = simulationPeriod; y >= 0; y--) {
    const x = getX(y);
    const yBot = getY(percentileTrajectories[25][y]);
    ctx.lineTo(x, yBot);
  }
  ctx.closePath();
  ctx.fill();

  // 3. Percentile Trajectory Boundary Curves
  [10, 25, 50, 75, 90].forEach(p => {
    ctx.strokeStyle = PERCENTILE_COLORS[p];
    ctx.lineWidth = p === 50 ? 2.5 : 1.5;
    if (p !== 50) ctx.setLineDash([4, 4]);
    else ctx.setLineDash([]);

    ctx.beginPath();
    for (let y = 0; y <= simulationPeriod; y++) {
      const x = getX(y);
      const py = getY(percentileTrajectories[p][y]);
      if (y === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Render Legend Bar below canvas
  let legendHtml = '';
  [90, 75, 50, 25, 10].forEach(p => {
    legendHtml += `
      <div class="legend-item">
        <span class="legend-color-box" style="background: ${PERCENTILE_COLORS[p]};"></span>
        <strong>${p}th Percentile:</strong> ${formatCurrency(percentileTrajectories[p][simulationPeriod])}
      </div>
    `;
  });
  if (elements.growthLegendBar) elements.growthLegendBar.innerHTML = legendHtml;

  // Tooltip interaction
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = mouseX - pad.left;
    if (relX < 0 || relX > plotW) {
      elements.growthTooltip.classList.add('hidden');
      return;
    }

    const yr = Math.min(simulationPeriod, Math.max(0, Math.round((relX / plotW) * simulationPeriod)));

    let tipHtml = `<div style="font-weight:700; margin-bottom: 0.35rem; color:#cbd5e1;">Year ${yr} Projections</div>`;
    [90, 75, 50, 25, 10].forEach(p => {
      tipHtml += `
        <div style="display:flex; justify-content:space-between; gap:1.2rem; color:${PERCENTILE_COLORS[p]}; margin-bottom:0.15rem;">
          <span>${p}th Percentile:</span>
          <strong>${formatCurrency(percentileTrajectories[p][yr])}</strong>
        </div>
      `;
    });

    elements.growthTooltip.innerHTML = tipHtml;
    elements.growthTooltip.style.left = `${Math.min(w - 200, Math.max(pad.left, mouseX))}px`;
    elements.growthTooltip.style.top = `${getY(percentileTrajectories[50][yr])}px`;
    elements.growthTooltip.classList.remove('hidden');
  };

  canvas.onmouseleave = () => {
    elements.growthTooltip.classList.add('hidden');
  };
}

// -------------------------------------------------------------------
// 4. Portfolio Survival Probability Chart
// -------------------------------------------------------------------
function drawSurvivalChart() {
  const canvas = elements.survivalCanvas;
  if (!canvas || !state.simulationResult) return;

  const { simulationPeriod, survivalRates } = state.simulationResult;
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

  function getY(pct) {
    return pad.top + plotH * (1 - pct / 100);
  }

  function getX(yr) {
    return pad.left + (yr / simulationPeriod) * plotW;
  }

  // Draw Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  [0, 25, 50, 75, 100].forEach(pct => {
    const y = getY(pct);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillText(`${pct}%`, pad.left - 8, y);
  });

  // Time Axis
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = Math.max(1, Math.floor(simulationPeriod / 6));
  for (let y = 0; y <= simulationPeriod; y += step) {
    ctx.fillText(`Yr ${y}`, getX(y), h - pad.bottom + 8);
  }

  // Area Fill
  const grad = ctx.createLinearGradient(0, getY(100), 0, getY(0));
  grad.addColorStop(0, 'rgba(52, 211, 153, 0.25)');
  grad.addColorStop(1, 'rgba(52, 211, 153, 0.02)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(0));
  for (let y = 0; y <= simulationPeriod; y++) {
    ctx.lineTo(getX(y), getY(survivalRates[y]));
  }
  ctx.lineTo(getX(simulationPeriod), getY(0));
  ctx.closePath();
  ctx.fill();

  // Survival Curve Stroke
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let y = 0; y <= simulationPeriod; y++) {
    const x = getX(y);
    const py = getY(survivalRates[y]);
    if (y === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();

  // Tooltip
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = mouseX - pad.left;
    if (relX < 0 || relX > plotW) {
      elements.survivalTooltip.classList.add('hidden');
      return;
    }

    const yr = Math.min(simulationPeriod, Math.max(0, Math.round((relX / plotW) * simulationPeriod)));
    const rate = survivalRates[yr];

    elements.survivalTooltip.innerHTML = `
      <div style="font-weight:700; color:#cbd5e1;">Year ${yr} Survival Rate</div>
      <div style="color:#34d399; font-weight:800; font-size:1rem; margin-top:0.2rem;">${rate.toFixed(1)}% Solvency</div>
    `;
    elements.survivalTooltip.style.left = `${Math.min(w - 180, Math.max(pad.left, mouseX))}px`;
    elements.survivalTooltip.style.top = `${getY(rate)}px`;
    elements.survivalTooltip.classList.remove('hidden');
  };

  canvas.onmouseleave = () => {
    elements.survivalTooltip.classList.add('hidden');
  };
}

// -------------------------------------------------------------------
// 5. Return & Drawdown Histograms
// -------------------------------------------------------------------
function drawHistograms() {
  if (!state.simulationResult) return;
  const { returnHistogram, drawdownHistogram } = state.simulationResult;

  function renderBarHist(canvas, hist, barColor) {
    if (!canvas || !hist || hist.bins.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 45 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const maxPct = Math.max(...hist.bins.map(b => b.pct), 5);
    const nBins = hist.bins.length;
    const barW = plotW / nBins;

    // Draw Bars
    hist.bins.forEach((b, idx) => {
      const bH = (b.pct / maxPct) * plotH;
      const x = pad.left + idx * barW;
      const y = pad.top + plotH - bH;

      ctx.fillStyle = barColor;
      ctx.fillRect(x + 1, y, barW - 2, bH);
    });

    // Y-Axis Ticks
    ctx.fillStyle = '#64748b';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    [0, maxPct / 2, maxPct].forEach(pct => {
      const y = pad.top + plotH * (1 - pct / maxPct);
      ctx.fillText(`${pct.toFixed(0)}%`, pad.left - 6, y);
    });

    // X-Axis Labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const step = Math.max(1, Math.floor(nBins / 4));
    for (let i = 0; i < nBins; i += step) {
      const x = pad.left + (i + 0.5) * barW;
      const valStr = `${(hist.bins[i].min * 100).toFixed(0)}%`;
      ctx.fillText(valStr, x, h - pad.bottom + 8);
    }
  }

  renderBarHist(elements.returnHistCanvas, returnHistogram, '#38bdf8');
  renderBarHist(elements.drawdownHistCanvas, drawdownHistogram, '#ef4444');
}

// -------------------------------------------------------------------
// 6. Safe Withdrawal Rate (SWR) Table
// -------------------------------------------------------------------
function renderSWRTable() {
  if (!elements.swrTbody || !state.simulationResult) return;
  const { swrMatrix, simulationPeriod } = state.simulationResult;

  let html = '';
  swrMatrix.forEach(row => {
    const annualSpend = state.settings.initialAmount * row.withdrawalRate;
    let badgeClass = 'high';
    if (row.successRate < 75) badgeClass = 'low';
    else if (row.successRate < 90) badgeClass = 'medium';

    html += `
      <tr>
        <td><strong>${(row.withdrawalRate * 100).toFixed(1)}% Initial Withdrawal</strong></td>
        <td>${formatCurrency(annualSpend)} / Year</td>
        <td>${simulationPeriod} Years</td>
        <td><span class="success-badge ${badgeClass}">${row.successRate.toFixed(1)}% Survival</span></td>
        <td>${(100 - row.successRate).toFixed(1)}% Failure Risk</td>
      </tr>
    `;
  });

  elements.swrTbody.innerHTML = html;
}

// -------------------------------------------------------------------
// 7. Milestone Balances by Year Table
// -------------------------------------------------------------------
function renderMilestonesTable() {
  if (!elements.milestonesTbody || !state.simulationResult) return;
  const { simulationPeriod, percentileTrajectories, survivalRates } = state.simulationResult;

  const step = simulationPeriod >= 30 ? 5 : (simulationPeriod >= 20 ? 4 : 2);
  let html = '';

  for (let y = 0; y <= simulationPeriod; y += step) {
    if (y === 0 && simulationPeriod > 5) continue;
    const rate = survivalRates[y];

    html += `
      <tr>
        <td><strong>Year ${y}</strong></td>
        <td>${formatCurrency(percentileTrajectories[10][y])}</td>
        <td>${formatCurrency(percentileTrajectories[25][y])}</td>
        <td style="color:#38bdf8; font-weight:700;">${formatCurrency(percentileTrajectories[50][y])}</td>
        <td>${formatCurrency(percentileTrajectories[75][y])}</td>
        <td style="color:#34d399; font-weight:700;">${formatCurrency(percentileTrajectories[90][y])}</td>
        <td><strong>${rate.toFixed(1)}%</strong></td>
      </tr>
    `;
  }

  // Ensure final year is always in table
  if (simulationPeriod % step !== 0) {
    const y = simulationPeriod;
    html += `
      <tr>
        <td><strong>Year ${y} (Final)</strong></td>
        <td>${formatCurrency(percentileTrajectories[10][y])}</td>
        <td>${formatCurrency(percentileTrajectories[25][y])}</td>
        <td style="color:#38bdf8; font-weight:700;">${formatCurrency(percentileTrajectories[50][y])}</td>
        <td>${formatCurrency(percentileTrajectories[75][y])}</td>
        <td style="color:#34d399; font-weight:700;">${formatCurrency(percentileTrajectories[90][y])}</td>
        <td><strong>${survivalRates[y].toFixed(1)}%</strong></td>
      </tr>
    `;
  }

  elements.milestonesTbody.innerHTML = html;
}

// -------------------------------------------------------------------
// CSV Export
// -------------------------------------------------------------------
function exportTrajectoriesCSV() {
  if (!state.simulationResult) return;
  const { simulationPeriod, percentileTrajectories, realPercentileTrajectories, survivalRates } = state.simulationResult;

  let csv = 'Year,10th_Nominal,25th_Nominal,50th_Nominal,75th_Nominal,90th_Nominal,50th_Real,Survival_Rate\n';
  for (let y = 0; y <= simulationPeriod; y++) {
    csv += `${y},${percentileTrajectories[10][y]},${percentileTrajectories[25][y]},${percentileTrajectories[50][y]},${percentileTrajectories[75][y]},${percentileTrajectories[90][y]},${realPercentileTrajectories[50][y]},${survivalRates[y]}\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `monte_carlo_simulation_${simulationPeriod}yr_${state.settings.numSimulations}runs.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------------
// Event Listeners & Initialization
// -------------------------------------------------------------------
function attachEventListeners() {
  // Toggle Config Panel Collapse
  if (elements.btnToggleConfig) {
    elements.btnToggleConfig.addEventListener('click', () => {
      state.isConfigCollapsed = !state.isConfigCollapsed;
      elements.configCard.classList.toggle('collapsed', state.isConfigCollapsed);
      elements.btnConfigText.textContent = state.isConfigCollapsed
        ? 'Expand Model Configuration'
        : 'Collapse Model Configuration';
    });
  }

  // Config Tabs Switching
  if (elements.tabBtnAssets && elements.tabBtnSettings) {
    elements.tabBtnAssets.addEventListener('click', () => {
      state.activeTab = 'assets';
      elements.tabBtnAssets.classList.add('active');
      elements.tabBtnSettings.classList.remove('active');
      elements.paneAssets.classList.remove('hidden');
      elements.paneSettings.classList.add('hidden');
    });

    elements.tabBtnSettings.addEventListener('click', () => {
      state.activeTab = 'settings';
      elements.tabBtnSettings.classList.add('active');
      elements.tabBtnAssets.classList.remove('active');
      elements.paneSettings.classList.remove('hidden');
      elements.paneAssets.classList.add('hidden');
    });
  }

  // Presets
  document.querySelectorAll('.btn-preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS[btn.dataset.preset];
      if (preset) {
        state.rows = preset.map((a, i) => ({ id: `row-${Date.now()}-${i}`, ticker: a.ticker, weight: a.weight }));
        renderAllocationTable();
        executeSimulation();
      }
    });
  });

  // Allocation Table Events (Input weight, auto-select on focus, pick asset, remove row)
  if (elements.allocationsTbody) {
    elements.allocationsTbody.addEventListener('input', (e) => {
      if (e.target.classList.contains('weight-input')) {
        const rowIdx = parseInt(e.target.dataset.rowIdx, 10);
        const val = Math.max(0, parseFloat(e.target.value) || 0);
        state.rows[rowIdx].weight = val;
        updateWeightTotal();
      }
    });

    elements.allocationsTbody.addEventListener('focusin', (e) => {
      if (e.target.classList.contains('weight-input')) {
        e.target.select();
      }
    });

    elements.allocationsTbody.addEventListener('click', (e) => {
      const pickBtn = e.target.closest('[data-action="pick-asset"]');
      if (pickBtn) {
        const rowIdx = parseInt(pickBtn.dataset.rowIdx, 10);
        const currentRow = state.rows[rowIdx];
        openAssetModal({
          selectedTicker: currentRow.ticker,
          targetType: 'fund',
          onSelect: (selectedFund, fund) => {
            const ticker = (typeof selectedFund === 'string' ? selectedFund : (selectedFund?.ticker || selectedFund))?.toUpperCase() || fund?.ticker?.toUpperCase() || currentRow.ticker;
            currentRow.ticker = ticker;
            renderAllocationTable();
          }
        });
        return;
      }

      const removeBtn = e.target.closest('[data-action="remove-row"]');
      if (removeBtn) {
        const rowIdx = parseInt(removeBtn.dataset.rowIdx, 10);
        if (state.rows.length <= 1) {
          showAlert('Portfolio must contain at least one asset row.');
          return;
        }
        state.rows.splice(rowIdx, 1);
        renderAllocationTable();
      }
    });
  }

  // Add Asset Row
  if (elements.btnAddAssetRow) {
    elements.btnAddAssetRow.addEventListener('click', () => {
      openAssetModal({
        selectedTicker: 'VOO',
        targetType: 'fund',
        onSelect: (selectedFund, fund) => {
          const ticker = (typeof selectedFund === 'string' ? selectedFund : (selectedFund?.ticker || selectedFund))?.toUpperCase() || fund?.ticker?.toUpperCase() || 'VOO';
          state.rows.push({
            id: `row-${Date.now()}`,
            ticker,
            weight: 0
          });
          renderAllocationTable();
        }
      });
    });
  }

  // Reset Table
  if (elements.btnResetTable) {
    elements.btnResetTable.addEventListener('click', () => {
      state.rows = [
        { id: `row-${Date.now()}-1`, ticker: 'VOO', weight: 60 },
        { id: `row-${Date.now()}-2`, ticker: 'BND', weight: 40 }
      ];
      renderAllocationTable();
    });
  }

  // Run Simulation Button
  if (elements.btnRunSimulation) {
    elements.btnRunSimulation.addEventListener('click', executeSimulation);
  }

  // Linear / Log Scale Toggle
  if (elements.btnScaleLinear && elements.btnScaleLog) {
    elements.btnScaleLinear.addEventListener('click', () => {
      state.growthScale = 'linear';
      elements.btnScaleLinear.classList.add('active');
      elements.btnScaleLog.classList.remove('active');
      drawGrowthFanChart();
    });

    elements.btnScaleLog.addEventListener('click', () => {
      state.growthScale = 'log';
      elements.btnScaleLog.classList.add('active');
      elements.btnScaleLinear.classList.remove('active');
      drawGrowthFanChart();
    });
  }

  // Export CSV
  if (elements.btnExportCsv) {
    elements.btnExportCsv.addEventListener('click', exportTrajectoriesCSV);
  }
}

// -------------------------------------------------------------------
// Initialization
// -------------------------------------------------------------------
function init() {
  cacheDOMElements();
  initWorker();
  attachEventListeners();
  renderAllocationTable();

  // Subscribe to session fund updates
  subscribeSessionFunds(() => {
    renderAllocationTable();
  });

  // Run initial default simulation
  executeSimulation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
