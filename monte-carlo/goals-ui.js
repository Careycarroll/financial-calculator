/**
 * Financial Goals & Glide Path Studio UI Controller (Page 2)
 * Manages multi-stage career-to-retirement glide paths, dynamic goal cash flows,
 * background Web Worker simulation execution, and High-DPI canvas charts.
 */

import { getAllFundsSync, subscribeSessionFunds } from '../js/session-funds.js';
import { openAssetModal } from '../js/asset-modal.js';
import { runMonteCarloSimulation, calculateGlidePathWeight } from './monte-carlo-engine.js';

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

const state = {
  activeTab: 'starting', // 'starting' | 'ending' | 'goals' | 'settings'
  isConfigCollapsed: false,
  growthScale: 'linear',

  settings: {
    planningType: 'multistage',
    yearsToRetire: 35,
    glidePathYears: 10,
    initialAmount: 100000,
    simulationPeriod: 50,
    simulationModel: 'historical',
    sequenceRisk: 'none',
    inflationModel: 'historical',
    taxTreatment: 'preTax',
    numSimulations: 1000
  },

  // Career Growth Starting Portfolio (Matching PV screenshot default)
  startRows: [
    { id: 'start-1', ticker: 'VOO', weight: 52 },
    { id: 'start-2', ticker: 'VXUS', weight: 28 },
    { id: 'start-3', ticker: 'BND', weight: 16 },
    { id: 'start-4', ticker: 'BNDX', weight: 4 }
  ],

  // Retirement Income Ending Portfolio (Matching PV screenshot default)
  endRows: [
    { id: 'end-1', ticker: 'VOO', weight: 13 },
    { id: 'end-2', ticker: 'VXUS', weight: 7 },
    { id: 'end-3', ticker: 'BND', weight: 64 },
    { id: 'end-4', ticker: 'BNDX', weight: 16 }
  ],

  // Financial Goals (Matching PV screenshot default)
  goals: [
    {
      id: 'goal-1',
      label: 'Career Savings',
      type: 'contribution',
      amount: 1500,
      frequency: 'monthly',
      starts: 'immediate',
      startYearsOffset: 0,
      duration: 'retirement',
      repeatCount: 1,
      inflationAdjusted: true
    },
    {
      id: 'goal-2',
      label: 'College Tuition',
      type: 'withdrawal',
      amount: 40000,
      frequency: 'annual',
      starts: 'in_years',
      startYearsOffset: 12,
      duration: 'repeats',
      repeatCount: 4,
      inflationAdjusted: true
    },
    {
      id: 'goal-3',
      label: 'Retirement Spending',
      type: 'withdrawal',
      amount: 3500,
      frequency: 'monthly',
      starts: 'retirement',
      startYearsOffset: 0,
      duration: 'all',
      repeatCount: 1,
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
    statusPlanType: document.getElementById('status-plan-type'),
    statusHorizon: document.getElementById('status-horizon'),
    statusRetireYr: document.getElementById('status-retire-yr'),
    statusGlideYrs: document.getElementById('status-glide-yrs'),
    btnToggleConfig: document.getElementById('btn-toggle-config-panel'),
    btnConfigText: document.getElementById('btn-config-text'),
    configCard: document.getElementById('config-card'),
    alertsContainer: document.getElementById('alerts-container'),

    // Tabs
    tabBtnStarting: document.getElementById('tab-btn-starting'),
    tabBtnEnding: document.getElementById('tab-btn-ending'),
    tabBtnGoals: document.getElementById('tab-btn-goals'),
    tabBtnSettings: document.getElementById('tab-btn-settings'),

    paneStarting: document.getElementById('pane-starting'),
    paneEnding: document.getElementById('pane-ending'),
    paneGoals: document.getElementById('pane-goals'),
    paneSettings: document.getElementById('pane-settings'),

    // Tables & Builders
    startAllocationsTbody: document.getElementById('start-allocations-tbody'),
    totalStartVal: document.getElementById('total-start-val'),
    totalStartStatus: document.getElementById('total-start-status'),
    btnAddStartRow: document.getElementById('btn-add-start-row'),
    btnResetStart: document.getElementById('btn-reset-start'),

    endAllocationsTbody: document.getElementById('end-allocations-tbody'),
    totalEndVal: document.getElementById('total-end-val'),
    totalEndStatus: document.getElementById('total-end-status'),
    btnAddEndRow: document.getElementById('btn-add-end-row'),
    btnResetEnd: document.getElementById('btn-reset-end'),

    goalsContainer: document.getElementById('goals-container'),
    btnAddGoal: document.getElementById('btn-add-goal'),

    // Settings
    selectPlanningType: document.getElementById('select-planning-type'),
    inputYearsToRetire: document.getElementById('input-years-to-retire'),
    inputGlideYears: document.getElementById('input-glide-years'),
    inputInitialCapital: document.getElementById('input-initial-capital'),
    selectSimPeriod: document.getElementById('select-sim-period'),
    selectSimulationModel: document.getElementById('select-simulation-model'),
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

    glidepathCanvas: document.getElementById('glidepath-canvas'),
    glidepathTooltip: document.getElementById('glidepath-tooltip'),
    glidepathLegendBar: document.getElementById('glidepath-legend-bar'),

    btnScaleLinear: document.getElementById('btn-scale-linear'),
    btnScaleLog: document.getElementById('btn-scale-log'),
    growthCanvas: document.getElementById('growth-canvas'),
    growthTooltip: document.getElementById('growth-tooltip'),
    growthLegendBar: document.getElementById('growth-legend-bar'),

    survivalCanvas: document.getElementById('survival-canvas'),
    survivalTooltip: document.getElementById('survival-tooltip'),

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

function showAlert(msg, type = 'error') {
  if (!elements.alertsContainer) return;
  elements.alertsContainer.innerHTML = `
    <div class="portfolio-alert ${type}">
      <span>${msg}</span>
    </div>
  `;
}

function clearAlerts() {
  if (elements.alertsContainer) elements.alertsContainer.innerHTML = '';
}

// -------------------------------------------------------------------
// Table Rendering: Starting & Ending Allocations
// -------------------------------------------------------------------
function renderAllocTable(tbodyEl, rows, totalValEl, totalStatusEl) {
  if (!tbodyEl) return;
  tbodyEl.innerHTML = '';

  const allFunds = getAllFundsSync();
  const fundMap = new Map(allFunds.map(f => [f.ticker.toUpperCase(), f]));

  rows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.rowId = row.id;

    const fund = fundMap.get(row.ticker.toUpperCase());
    const name = fund ? fund.name : row.ticker;
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

    tbodyEl.appendChild(tr);
  });

  updateTableTotals(rows, totalValEl, totalStatusEl);
}

function updateTableTotals(rows, totalValEl, totalStatusEl) {
  const sum = rows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);
  if (totalValEl) totalValEl.textContent = `${sum.toFixed(1)}%`;

  if (totalStatusEl) {
    if (Math.abs(sum - 100) < 0.05) {
      totalStatusEl.className = 'total-status valid';
      totalStatusEl.textContent = '✓ Valid';
    } else {
      totalStatusEl.className = 'total-status invalid';
      totalStatusEl.textContent = sum < 100 ? `${(100 - sum).toFixed(1)}% Left` : `+${(sum - 100).toFixed(1)}% Over`;
    }
  }
}

// -------------------------------------------------------------------
// Goals Builder Rendering
// -------------------------------------------------------------------
function renderGoalsBuilder() {
  if (!elements.goalsContainer) return;
  elements.goalsContainer.innerHTML = '';

  state.goals.forEach((g, idx) => {
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.dataset.goalId = g.id;

    card.innerHTML = `
      <div class="goal-field-group">
        <label class="goal-field-label">Goal #${idx + 1} Name</label>
        <input type="text" class="control-input goal-input-label" data-idx="${idx}" value="${g.label}" />
      </div>

      <div class="goal-field-group">
        <label class="goal-field-label">Type</label>
        <select class="control-select goal-select-type" data-idx="${idx}">
          <option value="contribution" ${g.type === 'contribution' ? 'selected' : ''}>Contribution (Deposit)</option>
          <option value="withdrawal" ${g.type === 'withdrawal' ? 'selected' : ''}>Fixed Withdrawal (Spend)</option>
        </select>
      </div>

      <div class="goal-field-group">
        <label class="goal-field-label">Amount ($)</label>
        <input type="number" class="control-input goal-input-amount" data-idx="${idx}" value="${g.amount}" min="0" step="500" />
      </div>

      <div class="goal-field-group">
        <label class="goal-field-label">Frequency</label>
        <select class="control-select goal-select-freq" data-idx="${idx}">
          <option value="monthly" ${g.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
          <option value="annual" ${g.frequency === 'annual' ? 'selected' : ''}>Annually</option>
        </select>
      </div>

      <div class="goal-field-group">
        <label class="goal-field-label">Starts</label>
        <select class="control-select goal-select-starts" data-idx="${idx}">
          <option value="immediate" ${g.starts === 'immediate' ? 'selected' : ''}>Immediately</option>
          <option value="in_years" ${g.starts === 'in_years' ? 'selected' : ''}>Starts In...</option>
          <option value="retirement" ${g.starts === 'retirement' ? 'selected' : ''}>At Retirement</option>
        </select>
        ${g.starts === 'in_years' ? `<input type="number" class="control-input goal-input-offset" data-idx="${idx}" value="${g.startYearsOffset}" min="1" max="50" style="margin-top:4px;" placeholder="Years" />` : ''}
      </div>

      <div class="goal-field-group">
        <label class="goal-field-label">Duration</label>
        <select class="control-select goal-select-duration" data-idx="${idx}">
          <option value="retirement" ${g.duration === 'retirement' ? 'selected' : ''}>Until Retirement</option>
          <option value="repeats" ${g.duration === 'repeats' ? 'selected' : ''}>Repeats...</option>
          <option value="all" ${g.duration === 'all' ? 'selected' : ''}>Until End</option>
        </select>
        ${g.duration === 'repeats' ? `<input type="number" class="control-input goal-input-repeats" data-idx="${idx}" value="${g.repeatCount}" min="1" max="50" style="margin-top:4px;" placeholder="Times" />` : ''}
      </div>

      <div class="goal-field-group" style="justify-content:center;">
        <label class="goal-checkbox-label">
          <input type="checkbox" class="goal-check-inflation" data-idx="${idx}" ${g.inflationAdjusted ? 'checked' : ''} />
          <span>Inflation Adjusted</span>
        </label>
      </div>

      <button type="button" class="btn-tool-secondary" data-action="remove-goal" data-idx="${idx}" style="color:#ef4444;">
        Remove
      </button>
    `;

    elements.goalsContainer.appendChild(card);
  });
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
      }
    };
  } catch (err) {
    console.warn('Worker initialization failed, fallback to main thread:', err);
    worker = null;
  }
}

function executeSimulation() {
  clearAlerts();

  // Read Settings
  state.settings.planningType = elements.selectPlanningType.value;
  state.settings.yearsToRetire = parseInt(elements.inputYearsToRetire.value, 10) || 35;
  state.settings.glidePathYears = parseInt(elements.inputGlideYears.value, 10) || 10;
  state.settings.initialAmount = parseFloat(elements.inputInitialCapital.value) || 100000;
  state.settings.simulationPeriod = parseInt(elements.selectSimPeriod.value, 10) || 50;
  state.settings.simulationModel = elements.selectSimulationModel.value;
  state.settings.sequenceRisk = elements.selectSequenceRisk.value;
  state.settings.inflationModel = elements.selectInflationModel.value;
  state.settings.taxTreatment = elements.selectTaxTreatment.value;
  state.settings.numSimulations = parseInt(elements.selectSimCount.value, 10) || 1000;

  // Validate allocations
  const startAllocs = state.startRows.filter(r => (parseFloat(r.weight) || 0) > 0);
  const endAllocs = state.endRows.filter(r => (parseFloat(r.weight) || 0) > 0);

  const startSum = startAllocs.reduce((s, r) => s + parseFloat(r.weight), 0);
  const endSum = endAllocs.reduce((s, r) => s + parseFloat(r.weight), 0);

  if (Math.abs(startSum - 100) > 0.05) {
    showAlert('Starting Career Portfolio allocation must sum to exactly 100%.');
    return;
  }
  if (Math.abs(endSum - 100) > 0.05) {
    showAlert('Ending Retirement Portfolio allocation must sum to exactly 100%.');
    return;
  }

  // Update Status Bar
  elements.statusPlanType.textContent = state.settings.planningType === 'multistage' ? 'Multistage Glide Path' : 'Single Stage';
  elements.statusHorizon.textContent = `${state.settings.simulationPeriod} Years`;
  elements.statusRetireYr.textContent = `In ${state.settings.yearsToRetire} Years`;
  elements.statusGlideYrs.textContent = `${state.settings.glidePathYears} Years Transition`;

  // Build Asset Histories from Session Fund Database
  const allFunds = getAllFundsSync();
  const assetHistories = {};
  [...startAllocs, ...endAllocs].forEach(a => {
    const fund = allFunds.find(f => f.ticker.toUpperCase() === a.ticker.toUpperCase());
    if (fund && fund.data && fund.data.length > 1) {
      assetHistories[a.ticker.toUpperCase()] = extractAnnualReturns(fund.data);
    }
  });

  const config = {
    initialAmount: state.settings.initialAmount,
    simulationPeriod: state.settings.simulationPeriod,
    numSimulations: state.settings.numSimulations,
    planningType: state.settings.planningType,
    yearsToRetire: state.settings.yearsToRetire,
    glidePathYears: state.settings.glidePathYears,
    simulationModel: state.settings.simulationModel,
    bootstrapModel: 'singleYear',
    sequenceRisk: state.settings.sequenceRisk,
    inflationModel: state.settings.inflationModel,
    taxTreatment: state.settings.taxTreatment,
    startingAllocations: startAllocs.map(a => ({ ticker: a.ticker, weight: parseFloat(a.weight) })),
    endingAllocations: endAllocs.map(a => ({ ticker: a.ticker, weight: parseFloat(a.weight) })),
    assetHistories,
    goals: state.goals,
    percentileIntervals: [10, 25, 50, 75, 90]
  };

  state.isSimulating = true;
  elements.btnRunSimulation.disabled = true;
  elements.runProgressFill.style.width = '15%';
  elements.runProgressLabel.textContent = 'Simulating Goals...';

  if (worker) {
    worker.postMessage({ action: 'runSimulation', config });
  } else {
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

function extractAnnualReturns(data) {
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
      returns.push((prices[prices.length - 1] - prices[0]) / prices[0]);
    }
  });
  return returns.length >= 2 ? returns : [0.10, 0.15, -0.05, 0.22, 0.08, -0.12, 0.25, 0.04];
}

// -------------------------------------------------------------------
// Render Visual Presentation Suite
// -------------------------------------------------------------------
function renderVisualSuite() {
  if (!state.simulationResult) return;

  renderDonutCards();
  drawGlidePathChart();
  renderScorecardTable();
  drawGrowthFanChart();
  drawSurvivalChart();
  renderMilestonesTable();
}

// -------------------------------------------------------------------
// 1. Side-by-side Starting & Ending Donut Cards
// -------------------------------------------------------------------
function renderDonutCards() {
  if (!elements.donutsContainer) return;
  elements.donutsContainer.innerHTML = '';

  const allFunds = getAllFundsSync();
  const fundMap = new Map(allFunds.map(f => [f.ticker.toUpperCase(), f]));

  const stages = [
    { title: '🌱 Career Accumulation Portfolio', canvasId: 'start-donut-canvas', rows: state.startRows },
    { title: '🏖️ Retirement Income Portfolio', canvasId: 'end-donut-canvas', rows: state.endRows }
  ];

  stages.forEach(st => {
    const activeRows = st.rows.filter(r => (parseFloat(r.weight) || 0) > 0);
    const card = document.createElement('div');
    card.className = 'donut-card';

    card.innerHTML = `
      <div class="donut-card-header">
        <div class="donut-title-group">
          <span class="donut-title">${st.title}</span>
        </div>
        <span class="donut-asset-badge">${activeRows.length} Assets</span>
      </div>
      <div class="donut-body">
        <div class="donut-canvas-wrap">
          <canvas id="${st.canvasId}" width="280" height="280" style="width: 140px; height: 140px;"></canvas>
        </div>
        <div class="donut-legend">
          ${activeRows.map((a, idx) => {
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

    const canvas = document.getElementById(st.canvasId);
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

      activeRows.forEach((a, idx) => {
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

      ctx.fillStyle = '#f8fafc';
      ctx.font = window.CHART_FONTS?.boldLg || 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('100%', cx, cy - 6);

      ctx.fillStyle = '#64748b';
      ctx.font = window.CHART_FONTS?.xs || '600 9px sans-serif';
      ctx.fillText('STAGE', cx, cy + 9);
    }
  });
}

// -------------------------------------------------------------------
// 2. Asset Allocation Glide Path Stacked Area Chart
// -------------------------------------------------------------------
function drawGlidePathChart() {
  const canvas = elements.glidepathCanvas;
  if (!canvas) return;

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
  const retireYr = state.settings.yearsToRetire;
  const glideYrs = state.settings.glidePathYears;

  // Unify all distinct tickers across start & end
  const tickerSet = new Set([
    ...state.startRows.map(r => r.ticker),
    ...state.endRows.map(r => r.ticker)
  ]);
  const tickers = Array.from(tickerSet);

  function getX(yr) {
    return pad.left + (yr / period) * plotW;
  }

  function getY(pct) {
    return pad.top + plotH * (1 - pct / 100);
  }

  // Pre-calculate stacked weights per year
  const stackedByYear = Array.from({ length: period + 1 }, () => []);
  let cumulative = new Array(period + 1).fill(0);

  tickers.forEach((ticker, tIdx) => {
    const color = ASSET_PALETTE[tIdx % ASSET_PALETTE.length];
    const sRow = state.startRows.find(r => r.ticker === ticker);
    const eRow = state.endRows.find(r => r.ticker === ticker);

    const sWt = sRow ? parseFloat(sRow.weight) || 0 : 0;
    const eWt = eRow ? parseFloat(eRow.weight) || 0 : 0;

    const newCumulative = [];

    ctx.fillStyle = color;
    ctx.beginPath();

    // Top curve
    for (let y = 0; y <= period; y++) {
      const wt = state.settings.planningType === 'multistage'
        ? calculateGlidePathWeight(y, sWt, eWt, retireYr, glideYrs)
        : sWt;
      const topVal = cumulative[y] + wt;
      newCumulative.push(topVal);
      const x = getX(y);
      const py = getY(topVal);
      if (y === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }

    // Bottom curve
    for (let y = period; y >= 0; y--) {
      const x = getX(y);
      const py = getY(cumulative[y]);
      ctx.lineTo(x, py);
    }

    ctx.closePath();
    ctx.fill();

    // Subtle layer border
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y <= period; y++) {
      const x = getX(y);
      const py = getY(newCumulative[y]);
      if (y === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();

    cumulative = newCumulative;
  });

  // Vertical Demarcation Line at Retirement
  if (retireYr < period) {
    const rx = getX(retireYr);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(rx, pad.top);
    ctx.lineTo(rx, h - pad.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f43f5e';
    ctx.font = window.CHART_FONTS?.boldSm || 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Retirement', rx, pad.top - 8);
  }

  // Y-Axis Ticks
  ctx.fillStyle = '#64748b';
  ctx.font = window.CHART_FONTS?.sm || '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  [0, 25, 50, 75, 100].forEach(pct => {
    ctx.fillText(`${pct}%`, pad.left - 8, getY(pct));
  });

  // Time Axis Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = Math.max(1, Math.floor(period / 8));
  for (let y = 0; y <= period; y += step) {
    ctx.fillText(`Yr ${y}`, getX(y), h - pad.bottom + 8);
  }

  // Legend Bar
  if (elements.glidepathLegendBar) {
    let legHtml = '';
    tickers.forEach((t, i) => {
      legHtml += `
        <div class="legend-item">
          <span class="legend-color-box" style="background: ${ASSET_PALETTE[i % ASSET_PALETTE.length]};"></span>
          <span>${t}</span>
        </div>
      `;
    });
    elements.glidepathLegendBar.innerHTML = legHtml;
  }
}

// -------------------------------------------------------------------
// 3. Scorecard Table
// -------------------------------------------------------------------
function renderScorecardTable() {
  if (!elements.scorecardTbody || !state.simulationResult) return;
  const { summary } = state.simulationResult;

  const rows = [
    { label: 'Final Portfolio Balance (Nominal)', key: summary.nominalFinal, format: formatCurrency, bold: true },
    { label: 'Final Portfolio Balance (Real / Inflation Adjusted)', key: summary.realFinal, format: formatCurrency },
    { label: 'Annualized Compound Growth (CAGR)', key: summary.cagr, format: formatPct, bold: true },
    { label: 'Maximum Historical Drawdown', key: summary.maxDrawdown, format: formatPct, alert: true }
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
// 4. Growth Fan Cones Canvas Chart
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

  // Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = window.CHART_FONTS?.sm || '11px sans-serif';
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

  // Time Axis
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = Math.max(1, Math.floor(simulationPeriod / 8));
  for (let y = 0; y <= simulationPeriod; y += step) {
    ctx.fillText(`Yr ${y}`, getX(y), h - pad.bottom + 8);
  }

  // Cones Area Fill
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

  // Boundary Curves
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

  // Legend Bar
  let legHtml = '';
  [90, 75, 50, 25, 10].forEach(p => {
    legHtml += `
      <div class="legend-item">
        <span class="legend-color-box" style="background: ${PERCENTILE_COLORS[p]};"></span>
        <strong>${p}th Percentile:</strong> ${formatCurrency(percentileTrajectories[p][simulationPeriod])}
      </div>
    `;
  });
  if (elements.growthLegendBar) elements.growthLegendBar.innerHTML = legHtml;

  // Tooltip
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = mouseX - pad.left;
    if (relX < 0 || relX > plotW) {
      elements.growthTooltip.classList.add('hidden');
      return;
    }

    const yr = Math.min(simulationPeriod, Math.max(0, Math.round((relX / plotW) * simulationPeriod)));

    let tipHtml = `<div style="font-weight:700; margin-bottom: 0.35rem; color:#cbd5e1;">Year ${yr} Goals Outlook</div>`;
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
// 5. Survival Rate Chart
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

  // Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = window.CHART_FONTS?.sm || '11px sans-serif';
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
  const step = Math.max(1, Math.floor(simulationPeriod / 8));
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
}

// -------------------------------------------------------------------
// 6. Milestones Table
// -------------------------------------------------------------------
function renderMilestonesTable() {
  if (!elements.milestonesTbody || !state.simulationResult) return;
  const { simulationPeriod, percentileTrajectories, survivalRates } = state.simulationResult;

  const retireYr = state.settings.yearsToRetire;
  const glideYrs = state.settings.glidePathYears;

  let html = '';
  for (let y = 5; y <= simulationPeriod; y += 5) {
    let stageTag = 'Career Growth';
    if (y >= retireYr) stageTag = 'Retirement';
    else if (y >= (retireYr - glideYrs)) stageTag = 'Glide Path';

    html += `
      <tr>
        <td><strong>Year ${y}</strong></td>
        <td><span class="status-pill">${stageTag}</span></td>
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
  a.download = `financial_goals_simulation_${simulationPeriod}yr.csv`;
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

  // Tabs Switching
  const tabs = [
    { btn: elements.tabBtnStarting, pane: elements.paneStarting, id: 'starting' },
    { btn: elements.tabBtnEnding, pane: elements.paneEnding, id: 'ending' },
    { btn: elements.tabBtnGoals, pane: elements.paneGoals, id: 'goals' },
    { btn: elements.tabBtnSettings, pane: elements.paneSettings, id: 'settings' }
  ];

  tabs.forEach(t => {
    if (t.btn) {
      t.btn.addEventListener('click', () => {
        tabs.forEach(other => {
          other.btn.classList.toggle('active', other.id === t.id);
          other.pane.classList.toggle('hidden', other.id !== t.id);
        });
        state.activeTab = t.id;
      });
    }
  });

  // Table events for Starting Allocations
  wireTableEvents(elements.startAllocationsTbody, () => state.startRows, elements.totalStartVal, elements.totalStartStatus);
  // Table events for Ending Allocations
  wireTableEvents(elements.endAllocationsTbody, () => state.endRows, elements.totalEndVal, elements.totalEndStatus);

  // Add Asset Row Buttons
  if (elements.btnAddStartRow) {
    elements.btnAddStartRow.addEventListener('click', () => {
      openAssetModal({
        selectedTicker: 'QQQ',
        activeTicker: 'QQQ',
        targetType: 'fund',
        onSelect: (sel, fund) => {
          const ticker = (typeof sel === 'string' ? sel : (sel?.ticker || sel))?.toUpperCase() || (fund?.ticker?.toUpperCase()) || 'QQQ';
          state.startRows.push({ id: `start-${Date.now()}`, ticker, weight: 0 });
          renderAllocTable(elements.startAllocationsTbody, state.startRows, elements.totalStartVal, elements.totalStartStatus);
          tryAutoExecuteSimulation();
        }
      });
    });
  }

  if (elements.btnAddEndRow) {
    elements.btnAddEndRow.addEventListener('click', () => {
      openAssetModal({
        selectedTicker: 'BND',
        activeTicker: 'BND',
        targetType: 'fund',
        onSelect: (sel, fund) => {
          const ticker = (typeof sel === 'string' ? sel : (sel?.ticker || sel))?.toUpperCase() || (fund?.ticker?.toUpperCase()) || 'BND';
          state.endRows.push({ id: `end-${Date.now()}`, ticker, weight: 0 });
          renderAllocTable(elements.endAllocationsTbody, state.endRows, elements.totalEndVal, elements.totalEndStatus);
          tryAutoExecuteSimulation();
        }
      });
    });
  }

  // Reset Buttons
  if (elements.btnResetStart) {
    elements.btnResetStart.addEventListener('click', () => {
      state.startRows.splice(0, state.startRows.length,
        { id: `start-${Date.now()}-1`, ticker: 'VOO', weight: 52 },
        { id: `start-${Date.now()}-2`, ticker: 'VXUS', weight: 28 },
        { id: `start-${Date.now()}-3`, ticker: 'BND', weight: 16 },
        { id: `start-${Date.now()}-4`, ticker: 'BNDX', weight: 4 }
      );
      renderAllocTable(elements.startAllocationsTbody, state.startRows, elements.totalStartVal, elements.totalStartStatus);
      tryAutoExecuteSimulation();
    });
  }

  if (elements.btnResetEnd) {
    elements.btnResetEnd.addEventListener('click', () => {
      state.endRows.splice(0, state.endRows.length,
        { id: `end-${Date.now()}-1`, ticker: 'VOO', weight: 13 },
        { id: `end-${Date.now()}-2`, ticker: 'VXUS', weight: 7 },
        { id: `end-${Date.now()}-3`, ticker: 'BND', weight: 64 },
        { id: `end-${Date.now()}-4`, ticker: 'BNDX', weight: 16 }
      );
      renderAllocTable(elements.endAllocationsTbody, state.endRows, elements.totalEndVal, elements.totalEndStatus);
      tryAutoExecuteSimulation();
    });
  }

  // Goals Builder Events
  if (elements.goalsContainer) {
    elements.goalsContainer.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      if (isNaN(idx) || !state.goals[idx]) return;

      if (e.target.classList.contains('goal-input-label')) state.goals[idx].label = e.target.value;
      if (e.target.classList.contains('goal-input-amount')) state.goals[idx].amount = parseFloat(e.target.value) || 0;
      if (e.target.classList.contains('goal-input-offset')) state.goals[idx].startYearsOffset = parseInt(e.target.value, 10) || 0;
      if (e.target.classList.contains('goal-input-repeats')) state.goals[idx].repeatCount = parseInt(e.target.value, 10) || 1;
    });

    elements.goalsContainer.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      if (isNaN(idx) || !state.goals[idx]) return;

      if (e.target.classList.contains('goal-select-type')) state.goals[idx].type = e.target.value;
      if (e.target.classList.contains('goal-select-freq')) state.goals[idx].frequency = e.target.value;
      if (e.target.classList.contains('goal-select-starts')) {
        state.goals[idx].starts = e.target.value;
        renderGoalsBuilder();
      }
      if (e.target.classList.contains('goal-select-duration')) {
        state.goals[idx].duration = e.target.value;
        renderGoalsBuilder();
      }
      if (e.target.classList.contains('goal-check-inflation')) state.goals[idx].inflationAdjusted = e.target.checked;
    });

    elements.goalsContainer.addEventListener('click', (e) => {
      const rmBtn = e.target.closest('[data-action="remove-goal"]');
      if (rmBtn) {
        const idx = parseInt(rmBtn.dataset.idx, 10);
        state.goals.splice(idx, 1);
        renderGoalsBuilder();
      }
    });
  }

  // Add Goal Button
  if (elements.btnAddGoal) {
    elements.btnAddGoal.addEventListener('click', () => {
      state.goals.push({
        id: `goal-${Date.now()}`,
        label: `Goal #${state.goals.length + 1}`,
        type: 'withdrawal',
        amount: 20000,
        frequency: 'annual',
        starts: 'in_years',
        startYearsOffset: 10,
        duration: 'repeats',
        repeatCount: 5,
        inflationAdjusted: true
      });
      renderGoalsBuilder();
    });
  }

  // Run Simulation Button
  if (elements.btnRunSimulation) {
    elements.btnRunSimulation.addEventListener('click', executeSimulation);
  }

  // Scale Toggle
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

let autoSimTimer = null;
function debouncedAutoExecuteSimulation(delay = 400) {
  if (autoSimTimer) clearTimeout(autoSimTimer);
  autoSimTimer = setTimeout(() => {
    tryAutoExecuteSimulation();
  }, delay);
}

function tryAutoExecuteSimulation() {
  const startSum = state.startRows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);
  const endSum = state.endRows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);
  if (Math.abs(startSum - 100) < 0.05 && Math.abs(endSum - 100) < 0.05) {
    executeSimulation();
  } else {
    renderDonutCards();
    drawGlidePathChart();
  }
}

function wireTableEvents(tbodyEl, getRows, totalValEl, totalStatusEl) {
  if (!tbodyEl) return;

  tbodyEl.addEventListener('input', (e) => {
    if (e.target.classList.contains('weight-input')) {
      const rows = typeof getRows === 'function' ? getRows() : getRows;
      const idx = parseInt(e.target.dataset.rowIdx, 10);
      if (rows && rows[idx]) {
        rows[idx].weight = Math.max(0, parseFloat(e.target.value) || 0);
        updateTableTotals(rows, totalValEl, totalStatusEl);
        debouncedAutoExecuteSimulation();
      }
    }
  });

  tbodyEl.addEventListener('focusin', (e) => {
    if (e.target.classList.contains('weight-input')) e.target.select();
  });

  tbodyEl.addEventListener('click', (e) => {
    const rows = typeof getRows === 'function' ? getRows() : getRows;
    const pickBtn = e.target.closest('[data-action="pick-asset"]');
    if (pickBtn) {
      const idx = parseInt(pickBtn.dataset.rowIdx, 10);
      if (!rows || !rows[idx]) return;
      openAssetModal({
        selectedTicker: rows[idx].ticker,
        activeTicker: rows[idx].ticker,
        targetType: 'fund',
        onSelect: (sel, fund) => {
          const ticker = (typeof sel === 'string' ? sel : (sel?.ticker || sel))?.toUpperCase() || (fund?.ticker?.toUpperCase()) || rows[idx].ticker;
          rows[idx].ticker = ticker;
          renderAllocTable(tbodyEl, rows, totalValEl, totalStatusEl);
          tryAutoExecuteSimulation();
        }
      });
      return;
    }

    const rmBtn = e.target.closest('[data-action="remove-row"]');
    if (rmBtn) {
      const idx = parseInt(rmBtn.dataset.rowIdx, 10);
      if (!rows || rows.length <= 1) {
        showAlert('Portfolio must contain at least one asset row.');
        return;
      }
      rows.splice(idx, 1);
      renderAllocTable(tbodyEl, rows, totalValEl, totalStatusEl);
      tryAutoExecuteSimulation();
    }
  });
}

function init() {
  cacheDOMElements();
  initWorker();
  attachEventListeners();
  renderAllocTable(elements.startAllocationsTbody, state.startRows, elements.totalStartVal, elements.totalStartStatus);
  renderAllocTable(elements.endAllocationsTbody, state.endRows, elements.totalEndVal, elements.totalEndStatus);
  renderGoalsBuilder();

  subscribeSessionFunds(() => {
    renderAllocTable(elements.startAllocationsTbody, state.startRows, elements.totalStartVal, elements.totalStartStatus);
    renderAllocTable(elements.endAllocationsTbody, state.endRows, elements.totalEndVal, elements.totalEndStatus);
  });

  executeSimulation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
