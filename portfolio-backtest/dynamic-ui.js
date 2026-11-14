/**
 * Backtest Dynamic Allocation Studio UI Controller
 * 
 * Features:
 * - Dual-Mode: Simple Lifecycle Glidepath vs Advanced Tactical Trend Protection
 * - Interactive multi-stage milestone cards with linear glidepath or step jumps
 * - 10-Month Simple Moving Average (SMA) and 12-Month Dual Momentum overlays
 * - High-DPI DPR-scaled Canvas Charts:
 *     1. Cumulative Portfolio Growth ($10k initial, Linear & Log scale)
 *     2. Dynamic Asset Allocation Over Time (Stacked Area Target Weight History)
 *     3. Calendar Year Annual Returns Grouped Bar Chart
 *     4. Underwater Drawdown Curves
 * - Detailed Signal & Reallocation Event Log
 * - Institutional MPT Scorecards & CSV Download
 * - Strict AbortController & rafThrottle compliance with window.CHART_FONTS
 */

import {
  ASSET_CLASS_CATALOG,
  getAssetClassById,
  getAssetClassPriceSeries,
  getAvailableTimelineRange
} from './asset-class-data.js';

import {
  DYNAMIC_PRESETS,
  simulateDynamicPortfolio
} from './dynamic-engine.js';

import {
  simulatePortfolio
} from './portfolio-engine.js';

import { rafThrottle, formatCurrency } from '../js/chart-utils.js';

// -------------------------------------------------------------------
// State
// -------------------------------------------------------------------
const state = {
  mode: 'simple', // 'simple' | 'advanced'
  transitionMode: 'glidepath', // 'glidepath' | 'step'
  tacticalRule: 'none', // 'none' | '10m_sma' | 'dual_momentum'
  defensiveAsset: 'Cash',
  // Default to Vanguard Lifecycle Preset stages
  stages: [
    {
      startMonthStr: '1972-01',
      label: 'Early Career (Aggressive)',
      allocations: [
        { assetId: 'TotalStockMarket', weight: 90 },
        { assetId: 'TotalBond', weight: 10 }
      ]
    },
    {
      startMonthStr: '1990-01',
      label: 'Mid Career (Diversification)',
      allocations: [
        { assetId: 'TotalStockMarket', weight: 65 },
        { assetId: 'IntlStockMarket', weight: 15 },
        { assetId: 'TotalBond', weight: 20 }
      ]
    },
    {
      startMonthStr: '2005-01',
      label: 'Pre-Retirement (Balanced)',
      allocations: [
        { assetId: 'TotalStockMarket', weight: 45 },
        { assetId: 'IntlStockMarket', weight: 15 },
        { assetId: 'TotalBond', weight: 30 },
        { assetId: 'REIT', weight: 10 }
      ]
    },
    {
      startMonthStr: '2016-01',
      label: 'Retirement (Preservation)',
      allocations: [
        { assetId: 'TotalStockMarket', weight: 30 },
        { assetId: 'IntlStockMarket', weight: 10 },
        { assetId: 'TotalBond', weight: 40 },
        { assetId: 'ShortTreasury', weight: 10 },
        { assetId: 'Cash', weight: 10 }
      ]
    }
  ],
  settings: {
    startYear: 1972,
    startMonth: 1,
    endYear: 2026,
    endMonth: 8,
    initialAmount: 10000,
    rebalancing: 'annual',
    annualRf: 0.03,
    cashflow: {
      type: 'none',
      amount: 500,
      frequency: 'monthly'
    },
    useLogScale: false
  },
  lastResults: null,
  isConfigCollapsed: false
};

// -------------------------------------------------------------------
// DOM Elements
// -------------------------------------------------------------------
let elements = {};

function initDOMElements() {
  elements = {
    // Mode
    btnModeSimple: document.getElementById('btn-mode-simple'),
    btnModeAdvanced: document.getElementById('btn-mode-advanced'),

    // Status Bar
    statusTimelineRange: document.getElementById('status-timeline-range'),
    statusTotalMonths: document.getElementById('status-total-months'),
    statusTransitionMode: document.getElementById('status-transition-mode'),
    statusTacticalRule: document.getElementById('status-tactical-rule'),
    statusInitialAmount: document.getElementById('status-initial-amount'),
    btnToggleConfig: document.getElementById('btn-toggle-config-panel'),
    btnConfigIcon: document.getElementById('btn-config-icon'),
    btnConfigText: document.getElementById('btn-config-text'),
    configPanel: document.getElementById('config-panel'),
    alertsContainer: document.getElementById('portfolio-alerts-container'),

    // Tabs
    tabBtnStages: document.getElementById('tab-btn-cfg-stages'),
    tabBtnTactical: document.getElementById('tab-btn-cfg-tactical'),
    tabBtnSettings: document.getElementById('tab-btn-cfg-settings'),
    paneStages: document.getElementById('cfg-pane-stages'),
    paneTactical: document.getElementById('cfg-pane-tactical'),
    paneSettings: document.getElementById('cfg-pane-settings'),

    // Tab 1 Elements
    radioGlidepath: document.getElementById('radio-mode-glidepath'),
    radioStep: document.getElementById('radio-mode-step'),
    stagesContainer: document.getElementById('stages-container'),
    btnAddStage: document.getElementById('btn-add-new-stage'),

    // Tab 2 Elements
    selectTacticalRule: document.getElementById('select-tactical-rule'),
    selectDefensiveAsset: document.getElementById('select-defensive-asset'),
    ruleExplainerTitle: document.getElementById('rule-explainer-title'),
    ruleExplainerText: document.getElementById('rule-explainer-text'),

    // Tab 3 Elements
    selectStartYear: document.getElementById('select-start-year'),
    selectStartMonth: document.getElementById('select-start-month'),
    selectEndYear: document.getElementById('select-end-year'),
    selectEndMonth: document.getElementById('select-end-month'),
    inputInitialAmount: document.getElementById('input-initial-amount'),
    selectRebalancingFreq: document.getElementById('select-rebalancing-freq'),
    inputRfRate: document.getElementById('input-rf-rate'),
    selectCashflowType: document.getElementById('select-cashflow-type'),
    rowCashflowAmount: document.getElementById('row-cashflow-amount'),
    inputCashflowAmount: document.getElementById('input-cashflow-amount'),
    rowCashflowFreq: document.getElementById('row-cashflow-freq'),
    selectCashflowFreq: document.getElementById('select-cashflow-freq'),

    // Actions
    btnRunSimulation: document.getElementById('btn-run-simulation'),
    btnResetDefaults: document.getElementById('btn-reset-defaults'),

    // Scorecards
    scDynamicWealthVal: document.getElementById('sc-dynamic-wealth-val'),
    scDynamicWealthSub: document.getElementById('sc-dynamic-wealth-sub'),
    scDynamicCagrVal: document.getElementById('sc-dynamic-cagr-val'),
    scDynamicCagrSub: document.getElementById('sc-dynamic-cagr-sub'),
    scDynamicDdVal: document.getElementById('sc-dynamic-dd-val'),
    scDynamicDdSub: document.getElementById('sc-dynamic-dd-sub'),
    scDynamicSharpeVal: document.getElementById('sc-dynamic-sharpe-val'),
    scDynamicSharpeSub: document.getElementById('sc-dynamic-sharpe-sub'),

    // Canvas
    canvasGrowth: document.getElementById('canvas-growth'),
    tooltipGrowth: document.getElementById('tooltip-growth'),
    chkLogScale: document.getElementById('chk-log-scale'),

    canvasStackedWeights: document.getElementById('canvas-stacked-weights'),
    tooltipWeights: document.getElementById('tooltip-weights'),

    canvasAnnualReturns: document.getElementById('canvas-annual-returns'),
    tooltipAnnual: document.getElementById('tooltip-annual'),

    canvasDrawdowns: document.getElementById('canvas-drawdowns'),
    tooltipDrawdown: document.getElementById('tooltip-drawdown'),

    // Tables
    tbodyPerformanceSummary: document.getElementById('tbody-performance-summary'),
    cardEventLog: document.getElementById('card-event-log'),
    eventLogCount: document.getElementById('event-log-count'),
    tbodyEventLog: document.getElementById('tbody-event-log'),
    tbodyAnnualReturns: document.getElementById('tbody-annual-returns'),
    btnDownloadCsv: document.getElementById('btn-download-csv')
  };
}

// -------------------------------------------------------------------
// Asset Select Options Generator
// -------------------------------------------------------------------
function buildAssetSelectOptions(selectedId = 'TotalStockMarket') {
  const categories = ['US Equity', 'International Equity', 'Fixed Income', 'Alternatives & Real Assets'];
  let html = '';

  categories.forEach(cat => {
    const list = ASSET_CLASS_CATALOG.filter(c => c.category === cat);
    if (list.length === 0) return;
    html += `<optgroup label="${cat}">`;
    list.forEach(c => {
      const isSelected = c.id === selectedId ? 'selected' : '';
      html += `<option value="${c.id}" ${isSelected}>${c.name}</option>`;
    });
    html += `</optgroup>`;
  });

  return html;
}

// -------------------------------------------------------------------
// Render Stages Cards
// -------------------------------------------------------------------
function renderStages() {
  if (!elements.stagesContainer) return;
  elements.stagesContainer.innerHTML = '';

  const timeline = getAvailableTimelineRange();

  state.stages.forEach((stage, sIdx) => {
    const parts = stage.startMonthStr.split('-');
    const curYear = parseInt(parts[0], 10);
    const curMonth = parseInt(parts[1], 10);

    let yearOpts = '';
    for (let y = timeline.startYear; y <= timeline.endYear; y++) {
      yearOpts += `<option value="${y}" ${y === curYear ? 'selected' : ''}>${y}</option>`;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let monthOpts = '';
    months.forEach((mName, mIdx) => {
      const mNum = mIdx + 1;
      monthOpts += `<option value="${mNum}" ${mNum === curMonth ? 'selected' : ''}>${mName}</option>`;
    });

    const isOnlyStage = state.stages.length <= 1;

    let allocRowsHtml = '';
    let stageTotalWeight = 0;

    stage.allocations.forEach((alloc, aIdx) => {
      stageTotalWeight += Number(alloc.weight) || 0;
      allocRowsHtml += `
        <tr class="stage-alloc-row" data-stage="${sIdx}" data-alloc="${aIdx}">
          <td style="width: 60%;">
            <select class="form-select stage-asset-select" data-stage="${sIdx}" data-alloc="${aIdx}">
              ${buildAssetSelectOptions(alloc.assetId)}
            </select>
          </td>
          <td style="width: 30%; text-align: center;">
            <input type="number" class="form-input stage-weight-input" data-stage="${sIdx}" data-alloc="${aIdx}" value="${alloc.weight}" min="0" max="100" step="1" />
          </td>
          <td style="width: 10%; text-align: center;">
            <button type="button" class="btn-remove-row btn-remove-alloc" data-stage="${sIdx}" data-alloc="${aIdx}">✕</button>
          </td>
        </tr>
      `;
    });

    stageTotalWeight = Math.round(stageTotalWeight * 10) / 10;
    const isSumValid = Math.abs(stageTotalWeight - 100) < 0.05;
    const sumColor = isSumValid ? '#10b981' : '#f43f5e';

    const card = document.createElement('div');
    card.className = 'stage-card';
    card.dataset.stage = sIdx;

    card.innerHTML = `
      <div class="stage-card-header">
        <div class="stage-title-group">
          <span class="stage-badge">Stage ${sIdx + 1}</span>
          <input type="text" class="stage-label-input" data-stage="${sIdx}" value="${stage.label}" placeholder="Milestone Name" />
        </div>
        <div class="stage-date-group">
          <span style="font-size: 0.85rem; color: #94a3b8;">Starts:</span>
          <select class="form-select date-sub-select stage-start-month-select" data-stage="${sIdx}">${monthOpts}</select>
          <select class="form-select date-sub-select stage-start-year-select" data-stage="${sIdx}">${yearOpts}</select>
          <button type="button" class="btn-delete-stage" data-stage="${sIdx}" ${isOnlyStage ? 'disabled' : ''}>🗑️ Delete Stage</button>
        </div>
      </div>

      <div class="table-responsive" style="margin-bottom: 0.75rem;">
        <table class="allocations-table">
          <thead>
            <tr>
              <th>Target Asset Class</th>
              <th style="text-align: center;">Target Allocation (%)</th>
              <th style="text-align: center;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${allocRowsHtml}
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td><strong>Stage Total:</strong></td>
              <td style="text-align: center; color: ${sumColor}; font-weight: 700;">${stageTotalWeight}%</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button type="button" class="btn-add-asset btn-add-stage-alloc" data-stage="${sIdx}">
        <span>➕ Add Asset Class to Stage ${sIdx + 1}</span>
      </button>
    `;

    elements.stagesContainer.appendChild(card);
  });

  bindStageEventListeners();
}

// -------------------------------------------------------------------
// Bind Event Listeners on Stage Elements
// -------------------------------------------------------------------
function bindStageEventListeners() {
  // Label edits
  const labelInputs = elements.stagesContainer.querySelectorAll('.stage-label-input');
  labelInputs.forEach(inp => {
    inp.addEventListener('change', (e) => {
      const sIdx = parseInt(e.target.dataset.stage, 10);
      state.stages[sIdx].label = e.target.value.trim() || `Stage ${sIdx + 1}`;
    });
  });

  // Date edits
  const monthSelects = elements.stagesContainer.querySelectorAll('.stage-start-month-select');
  monthSelects.forEach(sel => {
    sel.addEventListener('change', (e) => {
      const sIdx = parseInt(e.target.dataset.stage, 10);
      const m = parseInt(e.target.value, 10);
      const y = parseInt(state.stages[sIdx].startMonthStr.split('-')[0], 10);
      state.stages[sIdx].startMonthStr = `${y}-${String(m).padStart(2, '0')}`;
      sortStagesChronologically();
      renderStages();
      runSimulation();
    });
  });

  const yearSelects = elements.stagesContainer.querySelectorAll('.stage-start-year-select');
  yearSelects.forEach(sel => {
    sel.addEventListener('change', (e) => {
      const sIdx = parseInt(e.target.dataset.stage, 10);
      const y = parseInt(e.target.value, 10);
      const m = parseInt(state.stages[sIdx].startMonthStr.split('-')[1], 10);
      state.stages[sIdx].startMonthStr = `${y}-${String(m).padStart(2, '0')}`;
      sortStagesChronologically();
      renderStages();
      runSimulation();
    });
  });

  // Delete Stage
  const deleteBtns = elements.stagesContainer.querySelectorAll('.btn-delete-stage');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sIdx = parseInt(e.target.dataset.stage, 10);
      if (state.stages.length <= 1) return;
      state.stages.splice(sIdx, 1);
      renderStages();
      runSimulation();
    });
  });

  // Asset Select in Stage
  const assetSelects = elements.stagesContainer.querySelectorAll('.stage-asset-select');
  assetSelects.forEach(sel => {
    sel.addEventListener('change', (e) => {
      const sIdx = parseInt(e.target.dataset.stage, 10);
      const aIdx = parseInt(e.target.dataset.alloc, 10);
      state.stages[sIdx].allocations[aIdx].assetId = e.target.value;
      runSimulation();
    });
  });

  // Weight Input in Stage
  const weightInputs = elements.stagesContainer.querySelectorAll('.stage-weight-input');
  weightInputs.forEach(inp => {
    inp.addEventListener('input', (e) => {
      const sIdx = parseInt(e.target.dataset.stage, 10);
      const aIdx = parseInt(e.target.dataset.alloc, 10);
      state.stages[sIdx].allocations[aIdx].weight = parseFloat(e.target.value) || 0;
    });
    inp.addEventListener('change', () => {
      renderStages();
      runSimulation();
    });
  });

  // Remove Alloc
  const removeAllocBtns = elements.stagesContainer.querySelectorAll('.btn-remove-alloc');
  removeAllocBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sIdx = parseInt(e.target.dataset.stage, 10);
      const aIdx = parseInt(e.target.dataset.alloc, 10);
      if (state.stages[sIdx].allocations.length <= 1) {
        showAlert(`Stage ${sIdx + 1} must have at least one asset class.`);
        return;
      }
      state.stages[sIdx].allocations.splice(aIdx, 1);
      renderStages();
      runSimulation();
    });
  });

  // Add Alloc to Stage
  const addAllocBtns = elements.stagesContainer.querySelectorAll('.btn-add-stage-alloc');
  addAllocBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sIdx = parseInt(e.target.dataset.stage, 10);
      state.stages[sIdx].allocations.push({ assetId: 'TotalBond', weight: 0 });
      renderStages();
    });
  });
}

function sortStagesChronologically() {
  state.stages.sort((a, b) => a.startMonthStr.localeCompare(b.startMonthStr));
}

// -------------------------------------------------------------------
// Populate Timeline Date Selectors
// -------------------------------------------------------------------
function populateDateSelectors() {
  const timeline = getAvailableTimelineRange();
  const months = [
    { num: 1, name: 'Jan' }, { num: 2, name: 'Feb' }, { num: 3, name: 'Mar' },
    { num: 4, name: 'Apr' }, { num: 5, name: 'May' }, { num: 6, name: 'Jun' },
    { num: 7, name: 'Jul' }, { num: 8, name: 'Aug' }, { num: 9, name: 'Sep' },
    { num: 10, name: 'Oct' }, { num: 11, name: 'Nov' }, { num: 12, name: 'Dec' }
  ];

  let yearOpts = '';
  for (let y = timeline.startYear; y <= timeline.endYear; y++) {
    yearOpts += `<option value="${y}">${y}</option>`;
  }

  elements.selectStartYear.innerHTML = yearOpts;
  elements.selectEndYear.innerHTML = yearOpts;

  let monthOpts = '';
  months.forEach(m => {
    monthOpts += `<option value="${m.num}">${m.name}</option>`;
  });

  elements.selectStartMonth.innerHTML = monthOpts;
  elements.selectEndMonth.innerHTML = monthOpts;

  elements.selectStartYear.value = state.settings.startYear;
  elements.selectStartMonth.value = state.settings.startMonth;
  elements.selectEndYear.value = state.settings.endYear;
  elements.selectEndMonth.value = state.settings.endMonth;
}

// -------------------------------------------------------------------
// Alerts
// -------------------------------------------------------------------
function showAlert(message, type = 'warning') {
  if (!elements.alertsContainer) return;
  elements.alertsContainer.innerHTML = `
    <div class="portfolio-alert portfolio-alert-${type}">
      <span>⚠️ ${message}</span>
    </div>
  `;
}

function clearAlerts() {
  if (elements.alertsContainer) {
    elements.alertsContainer.innerHTML = '';
  }
}

// -------------------------------------------------------------------
// Core Simulation Execution
// -------------------------------------------------------------------
export function runSimulation() {
  clearAlerts();

  // Validate dates
  const sYear = parseInt(elements.selectStartYear.value, 10);
  const sMonth = parseInt(elements.selectStartMonth.value, 10);
  const eYear = parseInt(elements.selectEndYear.value, 10);
  const eMonth = parseInt(elements.selectEndMonth.value, 10);

  const startMonthStr = `${sYear}-${String(sMonth).padStart(2, '0')}`;
  const endMonthStr = `${eYear}-${String(eMonth).padStart(2, '0')}`;

  if (startMonthStr >= endMonthStr) {
    showAlert('Start date must be earlier than End date.');
    return;
  }

  // Update Settings
  state.settings.startYear = sYear;
  state.settings.startMonth = sMonth;
  state.settings.endYear = eYear;
  state.settings.endMonth = eMonth;
  state.settings.initialAmount = Math.max(100, parseFloat(elements.inputInitialAmount.value) || 10000);
  state.settings.rebalancing = elements.selectRebalancingFreq.value;
  state.settings.annualRf = (parseFloat(elements.inputRfRate.value) || 3.0) / 100;

  const cfType = elements.selectCashflowType.value;
  state.settings.cashflow = {
    type: cfType,
    amount: parseFloat(elements.inputCashflowAmount.value) || 0,
    frequency: elements.selectCashflowFreq.value
  };

  // Validate stages
  if (!state.stages || state.stages.length === 0) {
    showAlert('At least one milestone stage is required.');
    return;
  }

  // Check stage sums
  for (let i = 0; i < state.stages.length; i++) {
    const st = state.stages[i];
    const sumW = st.allocations.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);
    if (Math.abs(sumW - 100) >= 0.1) {
      showAlert(`Stage ${i + 1} ("${st.label}") allocations must sum to 100% (currently ${sumW}%).`);
      return;
    }
  }

  // Build list of all active asset class IDs
  const activeAssetIds = new Set();
  state.stages.forEach(st => {
    st.allocations.forEach(a => activeAssetIds.add(a.assetId));
  });
  activeAssetIds.add('TotalStockMarket');
  activeAssetIds.add('TotalBond');
  activeAssetIds.add(state.defensiveAsset);

  // Load price series for each asset
  const dataMap = new Map();
  let dates = null;

  activeAssetIds.forEach(id => {
    const series = getAssetClassPriceSeries(id, startMonthStr, endMonthStr);
    dataMap.set(id.toUpperCase(), series);
    if (!dates && series.length > 0) {
      dates = series.map(s => s.date);
    }
  });

  if (!dates || dates.length < 2) {
    showAlert('Not enough historical data points available for the selected dates.');
    return;
  }

  // Status Bar Updates
  elements.statusTimelineRange.textContent = `${dates[0]} to ${dates[dates.length - 1]}`;
  elements.statusTotalMonths.textContent = `(${dates.length} Months)`;
  elements.statusTransitionMode.textContent = state.transitionMode === 'glidepath' ? 'Smooth Monthly Glide Path' : 'Step Jump';
  elements.statusTacticalRule.textContent = state.tacticalRule === '10m_sma'
    ? '10-Month SMA Trend Defense'
    : (state.tacticalRule === 'dual_momentum' ? '12-Month Dual Momentum' : 'None (Pure Glidepath)');
  elements.statusInitialAmount.textContent = formatCurrency(state.settings.initialAmount);

  // Dynamic Portfolio Simulation
  const dynamicConfig = {
    stages: state.stages.map(st => ({
      startMonth: st.startMonthStr,
      label: st.label,
      allocations: st.allocations.map(a => ({ assetId: a.assetId, weight: a.weight }))
    })),
    transitionMode: state.transitionMode,
    tacticalRule: state.tacticalRule,
    defensiveAsset: state.defensiveAsset
  };

  const simOpts = {
    initialAmount: state.settings.initialAmount,
    rebalancing: state.settings.rebalancing,
    cashflow: state.settings.cashflow,
    annualRf: state.settings.annualRf
  };

  const dynamicSim = simulateDynamicPortfolio(dates, dataMap, dynamicConfig, simOpts);

  // Static 60/40 Baseline Simulation
  const static6040Alloc = [
    { ticker: 'TOTALSTOCKMARKET', weight: 60 },
    { ticker: 'TOTALBOND', weight: 40 }
  ];
  const static6040Sim = simulatePortfolio(dates, dataMap, static6040Alloc, simOpts);

  // Static 100% US Equity Benchmark Simulation
  const static100Alloc = [{ ticker: 'TOTALSTOCKMARKET', weight: 100 }];
  const static100Sim = simulatePortfolio(dates, dataMap, static100Alloc, simOpts);

  state.lastResults = {
    dynamicSim,
    static6040Sim,
    static100Sim,
    dates
  };

  // Render Visuals & Tables
  updateScorecards();
  renderGrowthChart();
  renderStackedWeightsChart();
  renderAnnualReturnsChart();
  renderDrawdownsChart();
  renderPerformanceSummaryTable();
  renderEventLogTable();
  renderYearByYearTable();
}

// -------------------------------------------------------------------
// Scorecards
// -------------------------------------------------------------------
function updateScorecards() {
  const { dynamicSim } = state.lastResults;
  if (!dynamicSim) return;

  const m = dynamicSim.metrics;
  elements.scDynamicWealthVal.textContent = formatCurrency(m.finalBalance);
  elements.scDynamicWealthSub.textContent = `from ${formatCurrency(m.initialBalance)} Initial`;

  elements.scDynamicCagrVal.textContent = `${(m.cagr * 100).toFixed(2)}%`;
  elements.scDynamicCagrSub.textContent = `Annualized Growth`;

  elements.scDynamicDdVal.textContent = `${(m.maxDrawdown * 100).toFixed(2)}%`;
  elements.scDynamicDdSub.textContent = `Peak-to-Trough Loss`;

  elements.scDynamicSharpeVal.textContent = m.sharpeRatio.toFixed(2);
  elements.scDynamicSharpeSub.textContent = `Sortino: ${m.sortinoRatio.toFixed(2)}`;
}

// -------------------------------------------------------------------
// CHART 1: Cumulative Growth Chart
// -------------------------------------------------------------------
function renderGrowthChart() {
  const canvas = elements.canvasGrowth;
  if (!canvas || !state.lastResults) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = 420;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const { dynamicSim, static6040Sim, static100Sim, dates } = state.lastResults;
  const padding = { top: 30, right: 30, bottom: 45, left: 75 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  let minVal = Infinity;
  let maxVal = -Infinity;

  const seriesList = [
    { label: 'Dynamic Portfolio', color: '#38bdf8', sim: dynamicSim },
    { label: 'Static 60/40 Baseline', color: '#a855f7', sim: static6040Sim },
    { label: '100% US Equities', color: '#64748b', sim: static100Sim, dashed: true }
  ].filter(s => s.sim !== null);

  seriesList.forEach(s => {
    s.sim.trajectory.forEach(t => {
      const v = t.portfolioValue;
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    });
  });

  if (minVal === Infinity) { minVal = 1000; maxVal = 10000; }
  minVal = Math.max(1, minVal * 0.95);
  maxVal = maxVal * 1.05;

  const isLog = state.settings.useLogScale;
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);

  function getY(val) {
    if (isLog) {
      const clamped = Math.max(minVal, val);
      const ratio = (Math.log10(clamped) - logMin) / (logMax - logMin);
      return padding.top + plotHeight - ratio * plotHeight;
    }
    const ratio = (val - minVal) / (maxVal - minVal);
    return padding.top + plotHeight - ratio * plotHeight;
  }

  function getX(index) {
    return padding.left + (index / (dates.length - 1)) * plotWidth;
  }

  ctx.clearRect(0, 0, width, height);
  const fontSm = window.CHART_FONTS ? window.CHART_FONTS.sm : '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  const fontMd = window.CHART_FONTS ? window.CHART_FONTS.md : '600 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';

  ctx.font = fontSm;
  ctx.fillStyle = '#64748b';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;

  const yTicks = 6;
  for (let i = 0; i <= yTicks; i++) {
    let tickVal;
    if (isLog) {
      tickVal = Math.pow(10, logMin + (i / yTicks) * (logMax - logMin));
    } else {
      tickVal = minVal + (i / yTicks) * (maxVal - minVal);
    }
    const yPos = getY(tickVal);

    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(width - padding.right, yPos);
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatCurrency(tickVal), padding.left - 8, yPos);
  }

  const xTickStep = Math.max(1, Math.floor(dates.length / 8));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let i = 0; i < dates.length; i += xTickStep) {
    const xPos = getX(i);
    const yr = dates[i].substring(0, 4);

    ctx.beginPath();
    ctx.moveTo(xPos, padding.top + plotHeight);
    ctx.lineTo(xPos, padding.top + plotHeight + 5);
    ctx.stroke();

    ctx.fillText(yr, xPos, padding.top + plotHeight + 8);
  }

  seriesList.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.dashed ? 1.5 : 2.5;
    ctx.beginPath();

    if (s.dashed) ctx.setLineDash([4, 4]);
    else ctx.setLineDash([]);

    s.sim.trajectory.forEach((t, i) => {
      const x = getX(i);
      const y = getY(t.portfolioValue);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Legend
  ctx.font = fontMd;
  let legendX = padding.left;
  const legendY = padding.top - 12;

  seriesList.forEach(s => {
    ctx.fillStyle = s.color;
    ctx.fillRect(legendX, legendY - 8, 12, 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.label, legendX + 16, legendY - 6);
    legendX += ctx.measureText(s.label).width + 36;
  });

  // Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const bRect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - bRect.left;

    if (mouseX < padding.left || mouseX > width - padding.right) {
      elements.tooltipGrowth.style.display = 'none';
      return;
    }

    const ratio = (mouseX - padding.left) / plotWidth;
    const idx = Math.min(dates.length - 1, Math.max(0, Math.round(ratio * (dates.length - 1))));
    const curDate = dates[idx];

    let tooltipHtml = `<div style="font-weight:700; color:#f8fafc; margin-bottom:6px;">${curDate}</div>`;

    seriesList.forEach(s => {
      const val = s.sim.trajectory[idx]?.portfolioValue || 0;
      tooltipHtml += `
        <div style="display:flex; justify-content:space-between; gap:12px; margin-top:2px;">
          <span style="color:${s.color}; font-weight:600;">${s.label}:</span>
          <span style="color:#f8fafc; font-weight:700;">${formatCurrency(val)}</span>
        </div>
      `;
    });

    elements.tooltipGrowth.innerHTML = tooltipHtml;
    elements.tooltipGrowth.style.display = 'block';

    const ttWidth = elements.tooltipGrowth.offsetWidth || 180;
    let ttX = mouseX + 15;
    if (ttX + ttWidth > width - 10) ttX = mouseX - ttWidth - 15;

    elements.tooltipGrowth.style.left = `${ttX}px`;
    elements.tooltipGrowth.style.top = `${padding.top + 20}px`;
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipGrowth.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// CHART 2: Dynamic Asset Allocation Over Time (Stacked Area Chart)
// -------------------------------------------------------------------
function renderStackedWeightsChart() {
  const canvas = elements.canvasStackedWeights;
  if (!canvas || !state.lastResults) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = 380;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const { dynamicSim, dates } = state.lastResults;
  const history = dynamicSim.targetWeightsHistory;
  if (!history || history.length === 0) return;

  const padding = { top: 30, right: 30, bottom: 45, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Identify all unique asset IDs present in history
  const assetIdSet = new Set();
  history.forEach(h => {
    Object.keys(h.targets).forEach(k => assetIdSet.add(k));
  });
  const assetList = Array.from(assetIdSet);

  // Asset color map
  const colorPalette = {
    TOTALSTOCKMARKET: '#38bdf8',
    LARGECAPBLEND: '#0ea5e9',
    LARGECAPVALUE: '#0284c7',
    LARGECAPGROWTH: '#60a5fa',
    MIDCAPBLEND: '#818cf8',
    SMALLCAPBLEND: '#c084fc',
    INTLSTOCKMARKET: '#2dd4bf',
    INTERNATIONALSTOCK: '#14b8a6',
    EMERGINGMARKET: '#10b981',
    TOTALBOND: '#f59e0b',
    INTERMEDIATETREASURY: '#d97706',
    LONGTREASURY: '#b45309',
    SHORTTREASURY: '#fbbf24',
    TIPS: '#fde047',
    HIGHYIELD: '#fb923c',
    CASH: '#64748b',
    REIT: '#ec4899',
    GOLD: '#eab308',
    COMMODITIES: '#84cc16'
  };

  function getX(index) {
    return padding.left + (index / (history.length - 1)) * plotWidth;
  }

  function getY(percent) {
    return padding.top + plotHeight - (percent / 100) * plotHeight;
  }

  ctx.clearRect(0, 0, width, height);
  const fontSm = window.CHART_FONTS ? window.CHART_FONTS.sm : '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  const fontMd = window.CHART_FONTS ? window.CHART_FONTS.md : '600 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.font = fontSm;

  // Horizontal Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  for (let pct = 0; pct <= 100; pct += 20) {
    const yPos = getY(pct);
    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(width - padding.right, yPos);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${pct}%`, padding.left - 8, yPos);
  }

  // Pre-calculate cumulative stacked percent arrays for each layer
  // layerStacked[assetIdx][timeIdx] = cumulative upper percent
  const layerStacked = [];
  for (let a = 0; a < assetList.length; a++) {
    layerStacked.push(new Float64Array(history.length));
  }

  for (let t = 0; t < history.length; t++) {
    let running = 0;
    for (let a = 0; a < assetList.length; a++) {
      const asset = assetList[a];
      const wt = history[t].targets[asset] || 0;
      running += wt;
      layerStacked[a][t] = running;
    }
  }

  // Draw Stacked Polygons from bottom to top
  for (let a = assetList.length - 1; a >= 0; a--) {
    const asset = assetList[a];
    const color = colorPalette[asset] || '#94a3b8';

    ctx.beginPath();
    // Top boundary
    for (let t = 0; t < history.length; t++) {
      const x = getX(t);
      const y = getY(layerStacked[a][t]);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    // Bottom boundary
    for (let t = history.length - 1; t >= 0; t--) {
      const x = getX(t);
      const lowerPct = a > 0 ? layerStacked[a - 1][t] : 0;
      const y = getY(lowerPct);
      ctx.lineTo(x, y);
    }
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Stroke top boundary line
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // X Axis Year Labels
  const xTickStep = Math.max(1, Math.floor(history.length / 8));
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let i = 0; i < history.length; i += xTickStep) {
    const xPos = getX(i);
    const yr = history[i].date.substring(0, 4);
    ctx.fillText(yr, xPos, padding.top + plotHeight + 6);
  }

  // Legend at Top
  ctx.font = fontMd;
  let legendX = padding.left;
  const legendY = padding.top - 12;

  assetList.slice(0, 6).forEach(asset => {
    const meta = getAssetClassById(asset) || { shortName: asset };
    const color = colorPalette[asset] || '#94a3b8';

    ctx.fillStyle = color;
    ctx.fillRect(legendX, legendY - 8, 10, 10);
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.shortName, legendX + 14, legendY - 3);
    legendX += ctx.measureText(meta.shortName).width + 26;
  });

  // Tooltip with AbortController
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const bRect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - bRect.left;

    if (mouseX < padding.left || mouseX > width - padding.right) {
      elements.tooltipWeights.style.display = 'none';
      return;
    }

    const ratio = (mouseX - padding.left) / plotWidth;
    const idx = Math.min(history.length - 1, Math.max(0, Math.round(ratio * (history.length - 1))));
    const curDate = history[idx].date;

    let tooltipHtml = `<div style="font-weight:700; color:#f8fafc; margin-bottom:6px;">${curDate} Target Weights</div>`;

    assetList.forEach(asset => {
      const wt = history[idx].targets[asset] || 0;
      if (wt > 0.05) {
        const meta = getAssetClassById(asset) || { shortName: asset };
        const color = colorPalette[asset] || '#94a3b8';
        tooltipHtml += `
          <div style="display:flex; justify-content:space-between; gap:12px; margin-top:2px;">
            <span style="color:${color}; font-weight:600;">${meta.shortName}:</span>
            <span style="color:#f8fafc; font-weight:700;">${wt.toFixed(1)}%</span>
          </div>
        `;
      }
    });

    elements.tooltipWeights.innerHTML = tooltipHtml;
    elements.tooltipWeights.style.display = 'block';

    const ttWidth = elements.tooltipWeights.offsetWidth || 180;
    let ttX = mouseX + 15;
    if (ttX + ttWidth > width - 10) ttX = mouseX - ttWidth - 15;

    elements.tooltipWeights.style.left = `${ttX}px`;
    elements.tooltipWeights.style.top = `${padding.top + 20}px`;
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipWeights.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// CHART 3: Calendar Year Annual Returns Bar Chart
// -------------------------------------------------------------------
function renderAnnualReturnsChart() {
  const canvas = elements.canvasAnnualReturns;
  if (!canvas || !state.lastResults) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = 360;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const { dynamicSim, static6040Sim, static100Sim } = state.lastResults;
  const padding = { top: 25, right: 25, bottom: 40, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const years = static6040Sim.metrics.annualReturns.map(a => a.year);
  if (years.length === 0) return;

  const seriesList = [
    { label: 'Dynamic', color: '#38bdf8', returns: dynamicSim.metrics.annualReturns },
    { label: '60/40', color: '#a855f7', returns: static6040Sim.metrics.annualReturns },
    { label: 'Equities', color: '#64748b', returns: static100Sim.metrics.annualReturns }
  ];

  let minRet = -0.30;
  let maxRet = 0.40;

  seriesList.forEach(s => {
    s.returns.forEach(a => {
      if (a.return < minRet) minRet = a.return;
      if (a.return > maxRet) maxRet = a.return;
    });
  });

  minRet = Math.min(-0.25, Math.floor(minRet * 10) / 10);
  maxRet = Math.max(0.30, Math.ceil(maxRet * 10) / 10);

  function getY(ret) {
    const ratio = (ret - minRet) / (maxRet - minRet);
    return padding.top + plotHeight - ratio * plotHeight;
  }

  const zeroY = getY(0);

  ctx.clearRect(0, 0, width, height);
  const fontSm = window.CHART_FONTS ? window.CHART_FONTS.sm : '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.font = fontSm;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 6; i++) {
    const retVal = minRet + (i / 6) * (maxRet - minRet);
    const y = getY(retVal);

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${(retVal * 100).toFixed(0)}%`, padding.left - 8, y);
  }

  // Zero line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(width - padding.right, zeroY);
  ctx.stroke();

  // Grouped Bars
  const nYears = years.length;
  const groupWidth = plotWidth / nYears;
  const nSeries = seriesList.length;
  const barWidth = Math.max(1, (groupWidth * 0.75) / nSeries);

  years.forEach((yr, yrIdx) => {
    const groupLeft = padding.left + yrIdx * groupWidth;

    seriesList.forEach((s, sIdx) => {
      const matchRet = s.returns.find(r => r.year === yr)?.return || 0;
      const barX = groupLeft + (groupWidth * 0.12) + sIdx * barWidth;
      const barY = getY(Math.max(0, matchRet));
      const barHeight = Math.abs(getY(matchRet) - zeroY);

      ctx.fillStyle = s.color;
      ctx.fillRect(barX, Math.min(barY, zeroY), barWidth - 1, Math.max(1, barHeight));
    });

    if (yrIdx % 5 === 0 || yrIdx === nYears - 1) {
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(yr, groupLeft + groupWidth / 2, padding.top + plotHeight + 6);
    }
  });

  // Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const bRect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - bRect.left;

    if (mouseX < padding.left || mouseX > width - padding.right) {
      elements.tooltipAnnual.style.display = 'none';
      return;
    }

    const yrIdx = Math.min(nYears - 1, Math.max(0, Math.floor((mouseX - padding.left) / groupWidth)));
    const yr = years[yrIdx];

    let tooltipHtml = `<div style="font-weight:700; color:#f8fafc; margin-bottom:4px;">${yr} Annual Returns</div>`;

    seriesList.forEach(s => {
      const match = s.returns.find(r => r.year === yr)?.return || 0;
      const sign = match >= 0 ? '+' : '';
      const color = match >= 0 ? '#34d399' : '#f87171';
      tooltipHtml += `
        <div style="display:flex; justify-content:space-between; gap:10px; margin-top:2px;">
          <span style="color:${s.color}; font-weight:600;">${s.label}:</span>
          <span style="color:${color}; font-weight:700;">${sign}${(match * 100).toFixed(2)}%</span>
        </div>
      `;
    });

    elements.tooltipAnnual.innerHTML = tooltipHtml;
    elements.tooltipAnnual.style.display = 'block';

    const ttWidth = elements.tooltipAnnual.offsetWidth || 150;
    let ttX = mouseX + 15;
    if (ttX + ttWidth > width - 10) ttX = mouseX - ttWidth - 15;

    elements.tooltipAnnual.style.left = `${ttX}px`;
    elements.tooltipAnnual.style.top = `${padding.top + 20}px`;
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipAnnual.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// CHART 4: Underwater Drawdowns Chart
// -------------------------------------------------------------------
function renderDrawdownsChart() {
  const canvas = elements.canvasDrawdowns;
  if (!canvas || !state.lastResults) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = 320;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const { dynamicSim, static6040Sim, static100Sim, dates } = state.lastResults;
  const padding = { top: 25, right: 30, bottom: 40, left: 65 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  function getDrawdowns(sim) {
    if (!sim) return [];
    let peak = sim.trajectory[0].portfolioValue;
    return sim.trajectory.map(t => {
      if (t.portfolioValue > peak) peak = t.portfolioValue;
      return peak > 0 ? (t.portfolioValue - peak) / peak : 0;
    });
  }

  const seriesList = [
    { label: 'Dynamic Portfolio', color: '#38bdf8', dd: getDrawdowns(dynamicSim) },
    { label: 'Static 60/40', color: '#a855f7', dd: getDrawdowns(static6040Sim) },
    { label: '100% Equities', color: '#64748b', dd: getDrawdowns(static100Sim), dashed: true }
  ];

  let minDD = -0.50;
  seriesList.forEach(s => {
    s.dd.forEach(val => {
      if (val < minDD) minDD = val;
    });
  });
  minDD = Math.min(-0.30, Math.floor(minDD * 10) / 10);

  function getY(dd) {
    const ratio = dd / minDD;
    return padding.top + ratio * plotHeight;
  }

  function getX(index) {
    return padding.left + (index / (dates.length - 1)) * plotWidth;
  }

  ctx.clearRect(0, 0, width, height);
  const fontSm = window.CHART_FONTS ? window.CHART_FONTS.sm : '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.font = fontSm;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {
    const ddVal = (i / 5) * minDD;
    const y = getY(ddVal);

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${(ddVal * 100).toFixed(0)}%`, padding.left - 8, y);
  }

  seriesList.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.dashed ? 1.5 : 2.0;
    ctx.beginPath();

    if (s.dashed) ctx.setLineDash([4, 4]);
    else ctx.setLineDash([]);

    s.dd.forEach((ddVal, i) => {
      const x = getX(i);
      const y = getY(ddVal);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const bRect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - bRect.left;

    if (mouseX < padding.left || mouseX > width - padding.right) {
      elements.tooltipDrawdown.style.display = 'none';
      return;
    }

    const ratio = (mouseX - padding.left) / plotWidth;
    const idx = Math.min(dates.length - 1, Math.max(0, Math.round(ratio * (dates.length - 1))));
    const curDate = dates[idx];

    let tooltipHtml = `<div style="font-weight:700; color:#f8fafc; margin-bottom:4px;">${curDate} Drawdown</div>`;

    seriesList.forEach(s => {
      const ddVal = s.dd[idx] || 0;
      tooltipHtml += `
        <div style="display:flex; justify-content:space-between; gap:10px; margin-top:2px;">
          <span style="color:${s.color}; font-weight:600;">${s.label}:</span>
          <span style="color:#f87171; font-weight:700;">${(ddVal * 100).toFixed(2)}%</span>
        </div>
      `;
    });

    elements.tooltipDrawdown.innerHTML = tooltipHtml;
    elements.tooltipDrawdown.style.display = 'block';

    const ttWidth = elements.tooltipDrawdown.offsetWidth || 160;
    let ttX = mouseX + 15;
    if (ttX + ttWidth > width - 10) ttX = mouseX - ttWidth - 15;

    elements.tooltipDrawdown.style.left = `${ttX}px`;
    elements.tooltipDrawdown.style.top = `${padding.top + 20}px`;
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipDrawdown.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// TABLE 1: Performance Summary Table
// -------------------------------------------------------------------
function renderPerformanceSummaryTable() {
  if (!elements.tbodyPerformanceSummary || !state.lastResults) return;
  elements.tbodyPerformanceSummary.innerHTML = '';

  const { dynamicSim, static6040Sim, static100Sim } = state.lastResults;
  const list = [
    { name: 'Dynamic Portfolio', color: '#38bdf8', sim: dynamicSim },
    { name: 'Static 60/40 Baseline', color: '#a855f7', sim: static6040Sim },
    { name: '100% US Equities Benchmark', color: '#94a3b8', sim: static100Sim }
  ];

  list.forEach(p => {
    const m = p.sim.metrics;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong style="color: ${p.color};">${p.name}</strong></td>
      <td style="text-align: right;">${formatCurrency(m.initialBalance)}</td>
      <td style="text-align: right;"><strong>${formatCurrency(m.finalBalance)}</strong></td>
      <td style="text-align: right; color: #38bdf8; font-weight: 700;">${(m.cagr * 100).toFixed(2)}%</td>
      <td style="text-align: right;">${(m.annualVolatility * 100).toFixed(2)}%</td>
      <td style="text-align: right; font-weight: 700;">${m.sharpeRatio.toFixed(2)}</td>
      <td style="text-align: right;">${m.sortinoRatio.toFixed(2)}</td>
      <td style="text-align: right; color: #f87171;">${(m.maxDrawdown * 100).toFixed(2)}%</td>
      <td style="text-align: right; color: #34d399;">+${(m.bestYear.return * 100).toFixed(2)}% <span style="font-size:0.75rem; color:#64748b;">(${m.bestYear.year})</span></td>
      <td style="text-align: right; color: #f87171;">${(m.worstYear.return * 100).toFixed(2)}% <span style="font-size:0.75rem; color:#64748b;">(${m.worstYear.year})</span></td>
    `;
    elements.tbodyPerformanceSummary.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// TABLE 2: Tactical Signal & Event Log Table
// -------------------------------------------------------------------
function renderEventLogTable() {
  if (!elements.tbodyEventLog || !state.lastResults) return;
  elements.tbodyEventLog.innerHTML = '';

  const { dynamicSim } = state.lastResults;
  const log = dynamicSim.signalLog;

  elements.eventLogCount.textContent = `${log.length} Events`;

  if (log.length === 0) {
    elements.tbodyEventLog.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; color:#64748b; padding:1.5rem;">
          No active tactical switch events occurred. (Running in pure lifecycle glidepath mode).
        </td>
      </tr>
    `;
    return;
  }

  // Show newest events first
  const displayLog = [...log].reverse();

  displayLog.forEach(evt => {
    let tagClass = 'event-tag-rotate';
    if (evt.type === 'SELL_DEFENSE') tagClass = 'event-tag-sell';
    else if (evt.type === 'BUY_RISK') tagClass = 'event-tag-buy';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${evt.date}</strong></td>
      <td><span class="event-tag ${tagClass}">${evt.type}</span></td>
      <td><strong>${evt.asset}</strong></td>
      <td style="font-size: 0.82rem; color: #cbd5e1;">${evt.message}</td>
    `;
    elements.tbodyEventLog.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// TABLE 3: Year-by-Year Historical Returns Table & CSV Export
// -------------------------------------------------------------------
function renderYearByYearTable() {
  if (!elements.tbodyAnnualReturns || !state.lastResults) return;
  elements.tbodyAnnualReturns.innerHTML = '';

  const { dynamicSim, static6040Sim, static100Sim } = state.lastResults;
  const years = static6040Sim.metrics.annualReturns.map(a => a.year).reverse();

  function fmtRet(val) {
    if (val === undefined || val === null) return '--';
    const sign = val >= 0 ? '+' : '';
    const color = val >= 0 ? '#34d399' : '#f87171';
    return `<span style="color:${color}; font-weight:600;">${sign}${(val * 100).toFixed(2)}%</span>`;
  }

  years.forEach(yr => {
    const rDyn = dynamicSim.metrics.annualReturns.find(a => a.year === yr)?.return;
    const r6040 = static6040Sim.metrics.annualReturns.find(a => a.year === yr)?.return;
    const r100 = static100Sim.metrics.annualReturns.find(a => a.year === yr)?.return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${yr}</strong></td>
      <td style="text-align: right;">${fmtRet(rDyn)}</td>
      <td style="text-align: right;">${fmtRet(r6040)}</td>
      <td style="text-align: right;">${fmtRet(r100)}</td>
    `;
    elements.tbodyAnnualReturns.appendChild(tr);
  });
}

function exportHistoricalCSV() {
  if (!state.lastResults) return;
  const { dynamicSim, static6040Sim, static100Sim } = state.lastResults;
  const years = static6040Sim.metrics.annualReturns.map(a => a.year);

  let csv = 'Year,Dynamic Portfolio (%),Static 60/40 (%),100% US Equities (%)\n';

  years.forEach(yr => {
    const rDyn = (dynamicSim.metrics.annualReturns.find(a => a.year === yr)?.return * 100).toFixed(2);
    const r6040 = (static6040Sim.metrics.annualReturns.find(a => a.year === yr)?.return * 100).toFixed(2);
    const r100 = (static100Sim.metrics.annualReturns.find(a => a.year === yr)?.return * 100).toFixed(2);
    csv += `${yr},${rDyn},${r6040},${r100}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dynamic-portfolio-${state.settings.startYear}-${state.settings.endYear}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------------
// Presets Loading
// -------------------------------------------------------------------
function applyPreset(presetId) {
  const p = DYNAMIC_PRESETS.find(x => x.id === presetId);
  if (!p) return;

  state.transitionMode = p.mode || 'glidepath';
  elements.radioGlidepath.checked = state.transitionMode === 'glidepath';
  elements.radioStep.checked = state.transitionMode === 'step';

  state.tacticalRule = p.tacticalRule || 'none';
  elements.selectTacticalRule.value = state.tacticalRule;

  if (p.defensiveAsset) {
    state.defensiveAsset = p.defensiveAsset;
    elements.selectDefensiveAsset.value = state.defensiveAsset;
  }

  // Mode button sync
  if (state.tacticalRule !== 'none') {
    setStudioMode('advanced');
  } else {
    setStudioMode('simple');
  }

  state.stages = p.stages.map(st => ({
    startMonthStr: st.startMonth,
    label: st.label,
    allocations: st.allocations.map(a => ({ assetId: a.assetId, weight: a.weight }))
  }));

  renderStages();
  runSimulation();
}

// -------------------------------------------------------------------
// Mode Switching (Simple vs Advanced)
// -------------------------------------------------------------------
function setStudioMode(mode) {
  state.mode = mode;
  if (mode === 'simple') {
    elements.btnModeSimple.classList.add('active');
    elements.btnModeAdvanced.classList.remove('active');
    elements.tabBtnTactical.style.display = 'none';
    elements.cardEventLog.style.display = 'none';
    // Switch to stages tab if currently on tactical tab
    if (elements.tabBtnTactical.classList.contains('active')) {
      elements.tabBtnStages.click();
    }
  } else {
    elements.btnModeAdvanced.classList.add('active');
    elements.btnModeSimple.classList.remove('active');
    elements.tabBtnTactical.style.display = 'inline-flex';
    elements.cardEventLog.style.display = 'block';
  }
}

// -------------------------------------------------------------------
// Initialize Application
// -------------------------------------------------------------------
function init() {
  initDOMElements();
  populateDateSelectors();

  // Mode selector pills
  elements.btnModeSimple.addEventListener('click', () => {
    setStudioMode('simple');
    state.tacticalRule = 'none';
    elements.selectTacticalRule.value = 'none';
    runSimulation();
  });

  elements.btnModeAdvanced.addEventListener('click', () => {
    setStudioMode('advanced');
    if (state.tacticalRule === 'none') {
      state.tacticalRule = '10m_sma';
      elements.selectTacticalRule.value = '10m_sma';
    }
    runSimulation();
  });

  // Transition style radio
  elements.radioGlidepath.addEventListener('change', () => {
    state.transitionMode = 'glidepath';
    runSimulation();
  });

  elements.radioStep.addEventListener('change', () => {
    state.transitionMode = 'step';
    runSimulation();
  });

  // Tactical Rule Select
  elements.selectTacticalRule.addEventListener('change', (e) => {
    state.tacticalRule = e.target.value;
    if (state.tacticalRule === 'none') {
      elements.ruleExplainerTitle.textContent = 'Lifecycle Buy & Hold';
      elements.ruleExplainerText.textContent = 'No technical signals are active. Targets strictly follow your milestone stages and glide path.';
    } else if (state.tacticalRule === '10m_sma') {
      elements.ruleExplainerTitle.textContent = '10-Month Trend Defense (Meb Faber)';
      elements.ruleExplainerText.textContent = 'Assets falling below their 10-month SMA are automatically moved to your Defensive Reserve Asset. Full risk exposure is restored once prices climb back above trend.';
    } else if (state.tacticalRule === 'dual_momentum') {
      elements.ruleExplainerTitle.textContent = '12-Month Dual Momentum (Gary Antonacci)';
      elements.ruleExplainerText.textContent = 'Rotates 100% into the top-performing asset based on 12-month relative strength. If all risk assets have negative 12-month momentum, shifts 100% into defensive reserves.';
    }
    runSimulation();
  });

  elements.selectDefensiveAsset.addEventListener('change', (e) => {
    state.defensiveAsset = e.target.value;
    runSimulation();
  });

  // Presets
  const presetChips = document.querySelectorAll('.btn-preset-chip');
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      applyPreset(chip.dataset.preset);
    });
  });

  // Add Stage button
  elements.btnAddStage.addEventListener('click', () => {
    const nextYear = Math.min(2025, parseInt(state.stages[state.stages.length - 1].startMonthStr.split('-')[0], 10) + 10);
    state.stages.push({
      startMonthStr: `${nextYear}-01`,
      label: `Milestone Stage ${state.stages.length + 1}`,
      allocations: [
        { assetId: 'TotalStockMarket', weight: 50 },
        { assetId: 'TotalBond', weight: 50 }
      ]
    });
    sortStagesChronologically();
    renderStages();
    runSimulation();
  });

  // Config Tabs
  elements.tabBtnStages.addEventListener('click', () => {
    elements.tabBtnStages.classList.add('active');
    elements.tabBtnTactical.classList.remove('active');
    elements.tabBtnSettings.classList.remove('active');
    elements.paneStages.style.display = 'block';
    elements.paneTactical.style.display = 'none';
    elements.paneSettings.style.display = 'none';
  });

  elements.tabBtnTactical.addEventListener('click', () => {
    elements.tabBtnTactical.classList.add('active');
    elements.tabBtnStages.classList.remove('active');
    elements.tabBtnSettings.classList.remove('active');
    elements.paneTactical.style.display = 'block';
    elements.paneStages.style.display = 'none';
    elements.paneSettings.style.display = 'none';
  });

  elements.tabBtnSettings.addEventListener('click', () => {
    elements.tabBtnSettings.classList.add('active');
    elements.tabBtnStages.classList.remove('active');
    elements.tabBtnTactical.classList.remove('active');
    elements.paneSettings.style.display = 'block';
    elements.paneStages.style.display = 'none';
    elements.paneTactical.style.display = 'none';
  });

  // Cashflow toggle
  elements.selectCashflowType.addEventListener('change', (e) => {
    const val = e.target.value;
    elements.rowCashflowAmount.style.display = val === 'none' ? 'none' : 'flex';
    elements.rowCashflowFreq.style.display = val === 'none' ? 'none' : 'flex';
    runSimulation();
  });

  // Toggle Config Panel
  elements.btnToggleConfig.addEventListener('click', () => {
    state.isConfigCollapsed = !state.isConfigCollapsed;
    elements.configPanel.style.display = state.isConfigCollapsed ? 'none' : 'block';
    elements.btnConfigIcon.textContent = state.isConfigCollapsed ? '👁️' : '⚙️';
    elements.btnConfigText.textContent = state.isConfigCollapsed ? 'Expand Model Configuration' : 'Collapse Model Configuration';
  });

  // Log scale
  elements.chkLogScale.addEventListener('change', (e) => {
    state.settings.useLogScale = e.target.checked;
    renderGrowthChart();
  });

  // Actions
  elements.btnRunSimulation.addEventListener('click', runSimulation);
  elements.btnResetDefaults.addEventListener('click', () => {
    applyPreset('lifecycle-target-date');
  });

  // CSV
  elements.btnDownloadCsv.addEventListener('click', exportHistoricalCSV);

  // Resize handler
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (state.lastResults) {
        renderGrowthChart();
        renderStackedWeightsChart();
        renderAnnualReturnsChart();
        renderDrawdownsChart();
      }
    }, 250);
  });

  // Set initial mode
  setStudioMode('simple');
  renderStages();
  runSimulation();
}

// Bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
