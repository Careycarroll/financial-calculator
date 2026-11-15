/**
 * Portfolio Optimization Studio UI Controller
 * Manages reactive state, goal-based optimization algorithms,
 * comparative baseline metrics, and High-DPI comparison canvas charts.
 */

import {
  computeAssetStatistics,
  calculatePortfolioStats,
  calculateRiskContributions,
  calculateCVaR,
  calculateSortinoRatio,
  solveGMV,
  solveTangencyPortfolio,
  solveRiskParity,
  solveHRP,
  solveMaxUtilityPortfolio,
  calculateExpectedUtility,
  solveMinCVaR,
  solveTargetReturnPortfolio,
  solveTargetRiskPortfolio,
  findCommonDateRange
} from './optimization-engine.js';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import { openAssetModal } from '../js/asset-modal.js';
import { getAllFundsSync, subscribeSessionFunds } from '../js/session-funds.js';
import { rafThrottle, formatCurrency } from '../js/chart-utils.js';

// Color Palette for assets
const ASSET_PALETTE = [
  '#38bdf8', '#34d399', '#fbbf24', '#f43f5e', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// Presets
const OPT_PRESETS = {
  'core-two': ['VOO', 'BND'],
  'three-fund': ['VOO', 'SCHD', 'BND'],
  'growth-four': ['VOO', 'QQQ', 'SCHD', 'BND'],
  'equities': ['VOO', 'QQQ', 'SCHD']
};

// State
const state = {
  selectedTickers: ['VOO', 'BND', 'QQQ'],
  assetBounds: {
    VOO: { min: 0, max: 100 },
    BND: { min: 0, max: 100 },
    QQQ: { min: 0, max: 100 }
  },
  goal: 'max-sharpe',
  riskAversion: 3.0,
  baseline: 'equal',
  covarianceEstimator: 'ledoit-wolf',
  targetValue: 0.10,
  riskFreeRate: 0.03,
  startDate: null,
  endDate: null,
  lastStats: null,
  lastOptimal: null,
  lastBaseline: null
};

// DOM Elements
const elements = {
  // Status Bar
  statusTimelineRange: document.getElementById('status-timeline-range'),
  statusTotalMonths: document.getElementById('status-total-months'),
  statusGoalName: document.getElementById('status-goal-name'),
  statusBaselineName: document.getElementById('status-baseline-name'),
  statusCovName: document.getElementById('status-cov-name'),
  statusCovCond: document.getElementById('status-cov-cond'),
  statusRfRate: document.getElementById('status-rf-rate'),
  btnToggleConfig: document.getElementById('btn-toggle-config-panel'),
  configCard: document.getElementById('config-card'),
  btnConfigIcon: document.getElementById('btn-config-icon'),
  btnConfigText: document.getElementById('btn-config-text'),

  // Config Table & Actions
  tableAssetsBody: document.getElementById('asset-rows-body'),
  btnOpenModal: document.getElementById('btn-open-asset-modal'),
  selectGoal: document.getElementById('select-opt-goal'),
  selectBaseline: document.getElementById('select-opt-baseline'),
  selectCovEstimator: document.getElementById('select-cov-estimator'),
  wrapTargetVal: document.getElementById('wrap-target-val'),
  lblTargetVal: document.getElementById('lbl-target-val'),
  inputTargetVal: document.getElementById('input-target-val'),
  wrapRiskAversion: document.getElementById('wrap-risk-aversion'),
  inputRiskAversion: document.getElementById('opt-risk-aversion'),
  lblRiskAversionVal: document.getElementById('lbl-risk-aversion-opt-val'),
  inputRf: document.getElementById('opt-rf-input'),
  selectStartDate: document.getElementById('opt-start-date'),
  selectEndDate: document.getElementById('opt-end-date'),
  btnRunOptimization: document.getElementById('btn-run-optimization'),

  // Optimal Card
  optCardTitle: document.getElementById('opt-card-title'),
  optCardBadge: document.getElementById('opt-card-badge'),
  optMetricReturn: document.getElementById('opt-metric-return'),
  optMetricVol: document.getElementById('opt-metric-vol'),
  optMetricSharpe: document.getElementById('opt-metric-sharpe'),
  optMetricSortino: document.getElementById('opt-metric-sortino'),
  optMetricCvar: document.getElementById('opt-metric-cvar'),
  optMetricDownside: document.getElementById('opt-metric-downside'),
  canvasDonutOpt: document.getElementById('canvas-donut-opt'),
  optWeightsList: document.getElementById('opt-weights-list'),

  // Baseline Card
  baseCardTitle: document.getElementById('base-card-title'),
  baseCardBadge: document.getElementById('base-card-badge'),
  baseMetricReturn: document.getElementById('base-metric-return'),
  baseMetricVol: document.getElementById('base-metric-vol'),
  baseMetricSharpe: document.getElementById('base-metric-sharpe'),
  baseMetricSortino: document.getElementById('base-metric-sortino'),
  baseMetricCvar: document.getElementById('base-metric-cvar'),
  baseMetricDownside: document.getElementById('base-metric-downside'),
  canvasDonutBase: document.getElementById('canvas-donut-base'),
  baseWeightsList: document.getElementById('base-weights-list'),

  // Charts
  cardDendrogramChart: document.getElementById('card-dendrogram-chart'),
  containerDendrogramChart: document.getElementById('container-dendrogram-chart'),
  canvasDendrogramChart: document.getElementById('canvas-dendrogram-chart'),
  tooltipDendrogram: document.getElementById('tooltip-dendrogram'),

  containerBarChart: document.getElementById('container-bar-chart'),
  canvasBarChart: document.getElementById('canvas-bar-chart'),
  tooltipBars: document.getElementById('tooltip-bars'),

  containerGrowthChart: document.getElementById('container-growth-chart'),
  canvasGrowthChart: document.getElementById('canvas-growth-chart'),
  tooltipGrowth: document.getElementById('tooltip-growth'),

  // Table
  tableOptDetails: document.getElementById('table-opt-details')
};

// -------------------------------------------------------------------
// Helper: Get Active Fund Objects
// -------------------------------------------------------------------
function getActiveFundObjects() {
  const allFunds = getAllFundsSync();
  const fundMap = new Map();

  PRESET_BENCHMARKS.forEach(f => fundMap.set(f.ticker.toUpperCase(), f));
  allFunds.forEach(f => fundMap.set(f.ticker.toUpperCase(), f));

  return state.selectedTickers
    .map(ticker => fundMap.get(ticker.toUpperCase()))
    .filter(Boolean);
}

// -------------------------------------------------------------------
// Initialization & Events
// -------------------------------------------------------------------
function init() {
  // Preset buttons
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      if (OPT_PRESETS[presetKey]) {
        applyPreset(OPT_PRESETS[presetKey]);
      }
    });
  });

  // Config collapse toggle
  if (elements.btnToggleConfig) {
    elements.btnToggleConfig.addEventListener('click', toggleConfigCard);
  }

  // Add Asset Modal
  if (elements.btnOpenModal) {
    elements.btnOpenModal.addEventListener('click', () => {
      openAssetModal({
        allowBatch: true,
        onSelect: (selectedFund) => {
          const ticker = (typeof selectedFund === 'string' ? selectedFund : (selectedFund?.ticker || selectedFund))?.toUpperCase();
          addAsset(ticker);
        }
      });
    });
  }

  // Goal select change
  if (elements.selectGoal) {
    elements.selectGoal.addEventListener('change', () => {
      state.goal = elements.selectGoal.value;
      updateGoalUI();
    });
  }

  // Baseline select change
  if (elements.selectBaseline) {
    elements.selectBaseline.addEventListener('change', () => {
      state.baseline = elements.selectBaseline.value;
      if (elements.statusBaselineName) {
        elements.statusBaselineName.textContent = elements.selectBaseline.options[elements.selectBaseline.selectedIndex].text;
      }
    });
  }

  // Covariance Estimator select change
  if (elements.selectCovEstimator) {
    elements.selectCovEstimator.addEventListener('change', () => {
      state.covarianceEstimator = elements.selectCovEstimator.value;
      runOptimization();
    });
  }

  // Run Optimization button
  if (elements.btnRunOptimization) {
    elements.btnRunOptimization.addEventListener('click', () => {
      syncInputsToState();
      runOptimization();
    });
  }

  // RF input
  if (elements.inputRf) {
    elements.inputRf.addEventListener('change', () => {
      state.riskFreeRate = Math.max(0, (parseFloat(elements.inputRf.value) || 3.0) / 100);
      elements.statusRfRate.textContent = `${(state.riskFreeRate * 100).toFixed(2)}%`;
    });
  }

  // Risk Aversion input
  if (elements.inputRiskAversion) {
    elements.inputRiskAversion.addEventListener('input', () => {
      state.riskAversion = parseFloat(elements.inputRiskAversion.value) || 3.0;
      if (elements.lblRiskAversionVal) {
        elements.lblRiskAversionVal.textContent = state.riskAversion.toFixed(1);
      }
    });
  }

  // Subscribe to session fund updates
  subscribeSessionFunds(() => {
    renderAssetTable();
    updateTimelineSelects();
  });

  // Window resize handler (debounced)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.lastOptimal && state.lastBaseline) {
        renderBarChart();
        renderGrowthChart();
        renderDonuts();
        if (state.goal === 'hrp') {
          renderDendrogramChart();
        }
      }
    }, 250);
  });

  // Initial setup
  renderAssetTable();
  updateTimelineSelects();
  updateGoalUI();
  runOptimization();
}

function updateGoalUI() {
  const goal = state.goal;
  if (elements.statusGoalName) {
    elements.statusGoalName.textContent = elements.selectGoal.options[elements.selectGoal.selectedIndex].text.replace(/^[^\w]+/, '');
  }

  if (goal === 'target-return') {
    elements.wrapTargetVal.style.display = 'flex';
    elements.lblTargetVal.textContent = 'Target Return (%)';
    elements.inputTargetVal.value = '10.0';
    if (elements.wrapRiskAversion) elements.wrapRiskAversion.style.display = 'none';
  } else if (goal === 'target-vol') {
    elements.wrapTargetVal.style.display = 'flex';
    elements.lblTargetVal.textContent = 'Target Volatility (%)';
    elements.inputTargetVal.value = '12.0';
    if (elements.wrapRiskAversion) elements.wrapRiskAversion.style.display = 'none';
  } else if (goal === 'max-utility') {
    elements.wrapTargetVal.style.display = 'none';
    if (elements.wrapRiskAversion) elements.wrapRiskAversion.style.display = 'flex';
  } else {
    elements.wrapTargetVal.style.display = 'none';
    if (elements.wrapRiskAversion) elements.wrapRiskAversion.style.display = 'none';
  }
}

function toggleConfigCard() {
  if (!elements.configCard) return;
  const isCollapsed = elements.configCard.classList.toggle('collapsed');
  if (elements.btnConfigIcon) {
    elements.btnConfigIcon.textContent = isCollapsed ? '✏️' : '⚙️';
  }
  if (elements.btnConfigText) {
    elements.btnConfigText.textContent = isCollapsed ? 'Edit Model Configuration' : 'Collapse Configuration';
  }
}

// -------------------------------------------------------------------
// Preset & Asset Handlers
// -------------------------------------------------------------------
function applyPreset(tickers) {
  state.selectedTickers = [...tickers];
  state.assetBounds = {};
  tickers.forEach(t => {
    state.assetBounds[t] = { min: 0, max: 100 };
  });

  renderAssetTable();
  updateTimelineSelects();
  runOptimization();
}

function addAsset(ticker) {
  const normTicker = ticker.toUpperCase();
  if (!state.selectedTickers.includes(normTicker)) {
    state.selectedTickers.push(normTicker);
    state.assetBounds[normTicker] = { min: 0, max: 100 };
    renderAssetTable();
    updateTimelineSelects();
    runOptimization();
  }
}

function removeAsset(ticker) {
  if (state.selectedTickers.length <= 2) {
    alert('At least 2 assets are required for portfolio optimization.');
    return;
  }
  const normTicker = ticker.toUpperCase();
  state.selectedTickers = state.selectedTickers.filter(t => t !== normTicker);
  delete state.assetBounds[normTicker];
  renderAssetTable();
  updateTimelineSelects();
  runOptimization();
}

function renderAssetTable() {
  if (!elements.tableAssetsBody) return;
  elements.tableAssetsBody.innerHTML = '';

  const funds = getActiveFundObjects();

  funds.forEach((fund, idx) => {
    const ticker = fund.ticker.toUpperCase();
    const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
    const bounds = state.assetBounds[ticker] || { min: 0, max: 100 };

    let retText = '--';
    let volText = '--';
    if (fund.data && fund.data.length > 12) {
      const returns = [];
      for (let i = 1; i < fund.data.length; i++) {
        const prev = fund.data[i - 1].adjClose || fund.data[i - 1].close;
        const curr = fund.data[i].adjClose || fund.data[i].close;
        if (prev > 0) returns.push((curr - prev) / prev);
      }
      if (returns.length > 0) {
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
        retText = `${(mean * 12 * 100).toFixed(1)}%`;
        volText = `${(Math.sqrt(variance * 12) * 100).toFixed(1)}%`;
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>
        <div class="asset-badge">
          <span class="asset-color-dot" style="background: ${color};"></span>
          <span>${ticker}</span>
          <span class="status-sub" style="font-weight: 400; margin-left: 0.25rem;">${fund.name || ''}</span>
        </div>
      </td>
      <td style="text-align: right;">
        <input type="number" class="weight-input" data-ticker="${ticker}" data-bound="min" value="${bounds.min}" min="0" max="100" step="5" />%
      </td>
      <td style="text-align: right;">
        <input type="number" class="weight-input" data-ticker="${ticker}" data-bound="max" value="${bounds.max}" min="0" max="100" step="5" />%
      </td>
      <td style="text-align: right; color: #34d399; font-weight: 600;">${retText}</td>
      <td style="text-align: right; color: #94a3b8; font-weight: 600;">${volText}</td>
      <td style="text-align: center;">
        <button type="button" class="btn-remove-asset" data-ticker="${ticker}" title="Remove asset">✕</button>
      </td>
    `;

    elements.tableAssetsBody.appendChild(tr);
  });

  // Bind inputs
  elements.tableAssetsBody.querySelectorAll('.weight-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const ticker = e.target.dataset.ticker;
      const bound = e.target.dataset.bound;
      const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
      e.target.value = val;
      if (!state.assetBounds[ticker]) state.assetBounds[ticker] = { min: 0, max: 100 };
      state.assetBounds[ticker][bound] = val;
    });
  });

  elements.tableAssetsBody.querySelectorAll('.btn-remove-asset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.target.dataset.ticker;
      removeAsset(ticker);
    });
  });
}

function syncInputsToState() {
  if (elements.inputRf) {
    state.riskFreeRate = Math.max(0, (parseFloat(elements.inputRf.value) || 3.0) / 100);
  }
  if (elements.selectStartDate) {
    state.startDate = elements.selectStartDate.value || null;
  }
  if (elements.selectEndDate) {
    state.endDate = elements.selectEndDate.value || null;
  }
  if (elements.selectGoal) {
    state.goal = elements.selectGoal.value;
  }
  if (elements.selectBaseline) {
    state.baseline = elements.selectBaseline.value;
  }
  if (elements.selectCovEstimator) {
    state.covarianceEstimator = elements.selectCovEstimator.value || 'ledoit-wolf';
  }
  if (elements.inputTargetVal) {
    state.targetValue = (parseFloat(elements.inputTargetVal.value) || 10.0) / 100;
  }
  if (elements.inputRiskAversion) {
    state.riskAversion = parseFloat(elements.inputRiskAversion.value) || 3.0;
  }
}

function updateTimelineSelects() {
  const funds = getActiveFundObjects();
  if (funds.length < 2) return;

  const common = findCommonDateRange(funds);
  elements.statusTimelineRange.textContent = `${common.start} to ${common.end}`;
  elements.statusTotalMonths.textContent = `(${common.totalMonths} Months)`;

  if (!elements.selectStartDate || !elements.selectEndDate) return;

  const refDates = funds[0].data
    .map(d => d.date)
    .filter(d => d >= common.start && d <= common.end);

  const prevStart = elements.selectStartDate.value;
  const prevEnd = elements.selectEndDate.value;

  elements.selectStartDate.innerHTML = '';
  elements.selectEndDate.innerHTML = '';

  refDates.forEach(d => {
    const optStart = document.createElement('option');
    optStart.value = d;
    optStart.textContent = d;
    elements.selectStartDate.appendChild(optStart);

    const optEnd = document.createElement('option');
    optEnd.value = d;
    optEnd.textContent = d;
    elements.selectEndDate.appendChild(optEnd);
  });

  elements.selectStartDate.value = prevStart && prevStart >= common.start ? prevStart : common.start;
  elements.selectEndDate.value = prevEnd && prevEnd <= common.end ? prevEnd : common.end;
}

// -------------------------------------------------------------------
// Optimization Execution Pipeline
// -------------------------------------------------------------------
function runOptimization() {
  const funds = getActiveFundObjects();
  if (funds.length < 2) {
    alert('Please select at least 2 assets.');
    return;
  }

  syncInputsToState();

  const lowerBounds = state.selectedTickers.map(t => {
    const b = state.assetBounds[t] || { min: 0 };
    return (b.min || 0) / 100;
  });

  const upperBounds = state.selectedTickers.map(t => {
    const b = state.assetBounds[t] || { max: 100 };
    return (b.max || 100) / 100;
  });

  try {
    // 1. Asset Statistics
    const stats = computeAssetStatistics(funds, {
      riskFreeRate: state.riskFreeRate,
      startDate: state.startDate,
      endDate: state.endDate,
      covarianceEstimator: state.covarianceEstimator
    });
    state.lastStats = stats;

    // Update Covariance Status Pill
    if (elements.statusCovName && elements.statusCovCond) {
      if (state.covarianceEstimator === 'ledoit-wolf') {
        elements.statusCovName.textContent = `Ledoit-Wolf (\u03B4* = ${stats.shrinkageIntensity.toFixed(3)})`;
        elements.statusCovCond.textContent = `\u03BA = ${stats.shrunkConditionNumber.toFixed(1)} (-${stats.conditionImprovementPercent.toFixed(0)}%)`;
      } else {
        elements.statusCovName.textContent = 'Sample Covariance';
        elements.statusCovCond.textContent = `\u03BA = ${stats.sampleConditionNumber.toFixed(1)} (Unshrunk)`;
      }
    }

    const optOptions = {
      riskFreeRate: state.riskFreeRate,
      lowerBounds,
      upperBounds
    };

    // 2. Solve Optimal Portfolio based on Goal
    let optimal;
    const goal = state.goal;

    if (goal === 'max-sharpe') {
      optimal = solveTangencyPortfolio(stats.expectedReturns, stats.covarianceMatrix, optOptions);
    } else if (goal === 'min-vol') {
      optimal = solveGMV(stats.expectedReturns, stats.covarianceMatrix, optOptions);
    } else if (goal === 'risk-parity') {
      optimal = solveRiskParity(stats.expectedReturns, stats.covarianceMatrix, optOptions);
    } else if (goal === 'hrp') {
      optimal = solveHRP(stats.expectedReturns, stats.covarianceMatrix, stats.correlationMatrix, optOptions);
    } else if (goal === 'max-utility') {
      optimal = solveMaxUtilityPortfolio(stats.expectedReturns, stats.covarianceMatrix, state.riskAversion, optOptions);
    } else if (goal === 'min-cvar') {
      optimal = solveMinCVaR(stats.expectedReturns, stats.monthlyReturns, stats.covarianceMatrix, optOptions);
    } else if (goal === 'target-return') {
      optimal = solveTargetReturnPortfolio(state.targetValue, stats.expectedReturns, stats.covarianceMatrix, optOptions);
    } else if (goal === 'target-vol') {
      optimal = solveTargetRiskPortfolio(state.targetValue, stats.expectedReturns, stats.covarianceMatrix, optOptions);
    } else {
      optimal = solveTangencyPortfolio(stats.expectedReturns, stats.covarianceMatrix, optOptions);
    }

    // Compute extra tail risk and downside stats for optimal
    const numMonths = stats.monthlyReturns[0].length;
    const optMonthlyReturns = new Array(numMonths).fill(0);
    for (let t = 0; t < numMonths; t++) {
      for (let i = 0; i < stats.numAssets; i++) {
        optMonthlyReturns[t] += optimal.weights[i] * stats.monthlyReturns[i][t];
      }
    }
    const optCvar = calculateCVaR(optMonthlyReturns, 0.05);
    const optSortino = calculateSortinoRatio(optMonthlyReturns, optimal.expectedReturn, state.riskFreeRate);
    const optRC = calculateRiskContributions(optimal.weights, stats.covarianceMatrix);

    state.lastOptimal = {
      ...optimal,
      cvar: optCvar.cvar,
      var: optCvar.var,
      sortinoRatio: optSortino.sortinoRatio,
      downsideVol: optSortino.downsideVol,
      riskContributions: optRC,
      monthlyReturns: optMonthlyReturns
    };

    // 3. Compute Baseline Portfolio
    let baseWeights = new Array(stats.numAssets).fill(1 / stats.numAssets);
    if (state.baseline === 'inv-vol') {
      const invVols = stats.volatilities.map(v => 1 / Math.max(1e-4, v));
      const sumInv = invVols.reduce((a, b) => a + b, 0);
      baseWeights = invVols.map(v => v / sumInv);
    } else if (state.baseline === 'benchmark') {
      baseWeights = new Array(stats.numAssets).fill(0);
      baseWeights[0] = 1.0; // 100% first core asset
    }

    const baseStats = calculatePortfolioStats(baseWeights, stats.expectedReturns, stats.covarianceMatrix, state.riskFreeRate);
    const baseMonthlyReturns = new Array(numMonths).fill(0);
    for (let t = 0; t < numMonths; t++) {
      for (let i = 0; i < stats.numAssets; i++) {
        baseMonthlyReturns[t] += baseWeights[i] * stats.monthlyReturns[i][t];
      }
    }
    const baseCvar = calculateCVaR(baseMonthlyReturns, 0.05);
    const baseSortino = calculateSortinoRatio(baseMonthlyReturns, baseStats.expectedReturn, state.riskFreeRate);
    const baseRC = calculateRiskContributions(baseWeights, stats.covarianceMatrix);

    state.lastBaseline = {
      ...baseStats,
      cvar: baseCvar.cvar,
      var: baseCvar.var,
      sortinoRatio: baseSortino.sortinoRatio,
      downsideVol: baseSortino.downsideVol,
      riskContributions: baseRC,
      monthlyReturns: baseMonthlyReturns
    };

    // 4. Update UI Components
    renderScorecards();
    renderBarChart();
    renderGrowthChart();
    renderDetailsTable();

    if (goal === 'hrp') {
      if (elements.cardDendrogramChart) elements.cardDendrogramChart.style.display = 'block';
      renderDendrogramChart();
    } else {
      if (elements.cardDendrogramChart) elements.cardDendrogramChart.style.display = 'none';
    }

  } catch (err) {
    console.error('Optimization failed:', err);
    alert(`Optimization error: ${err.message}`);
  }
}

// -------------------------------------------------------------------
// Scorecards & Donut Charts
// -------------------------------------------------------------------
function renderScorecards() {
  const opt = state.lastOptimal;
  const base = state.lastBaseline;
  const stats = state.lastStats;
  if (!opt || !base || !stats) return;

  // Optimal Card
  elements.optMetricReturn.textContent = `${(opt.expectedReturn * 100).toFixed(2)}%`;
  elements.optMetricVol.textContent = `${(opt.volatility * 100).toFixed(2)}%`;
  elements.optMetricSharpe.textContent = opt.sharpeRatio.toFixed(3);
  elements.optMetricSortino.textContent = opt.sortinoRatio.toFixed(3);
  elements.optMetricCvar.textContent = `${(opt.cvar * 100).toFixed(2)}%`;
  elements.optMetricDownside.textContent = `${(opt.downsideVol * 100).toFixed(2)}%`;

  // Baseline Card
  elements.baseMetricReturn.textContent = `${(base.expectedReturn * 100).toFixed(2)}%`;
  elements.baseMetricVol.textContent = `${(base.volatility * 100).toFixed(2)}%`;
  elements.baseMetricSharpe.textContent = base.sharpeRatio.toFixed(3);
  elements.baseMetricSortino.textContent = base.sortinoRatio.toFixed(3);
  elements.baseMetricCvar.textContent = `${(base.cvar * 100).toFixed(2)}%`;
  elements.baseMetricDownside.textContent = `${(base.downsideVol * 100).toFixed(2)}%`;

  // Render Optimal Weights List
  elements.optWeightsList.innerHTML = '';
  stats.tickers.forEach((ticker, idx) => {
    const weight = opt.weights[idx];
    if (weight > 0.0005) {
      const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
      const row = document.createElement('div');
      row.className = 'donut-weight-row';
      row.innerHTML = `
        <div class="donut-weight-ticker">
          <span class="asset-color-dot" style="background: ${color};"></span>
          <span>${ticker}</span>
        </div>
        <span class="donut-weight-val">${(weight * 100).toFixed(1)}%</span>
      `;
      elements.optWeightsList.appendChild(row);
    }
  });

  // Render Baseline Weights List
  elements.baseWeightsList.innerHTML = '';
  stats.tickers.forEach((ticker, idx) => {
    const weight = base.weights[idx];
    if (weight > 0.0005) {
      const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
      const row = document.createElement('div');
      row.className = 'donut-weight-row';
      row.innerHTML = `
        <div class="donut-weight-ticker">
          <span class="asset-color-dot" style="background: ${color};"></span>
          <span>${ticker}</span>
        </div>
        <span class="donut-weight-val">${(weight * 100).toFixed(1)}%</span>
      `;
      elements.baseWeightsList.appendChild(row);
    }
  });

  renderDonuts();
}

function renderDonuts() {
  if (!state.lastOptimal || !state.lastBaseline) return;
  drawDonut(elements.canvasDonutOpt, state.lastOptimal.weights);
  drawDonut(elements.canvasDonutBase, state.lastBaseline.weights);
}

function drawDonut(canvas, weights) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 130;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 58;
  const rInner = 36;
  let startAngle = -Math.PI / 2;

  weights.forEach((w, idx) => {
    if (w <= 0.0005) return;
    const sliceAngle = w * (Math.PI * 2);
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
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('100%', cx, cy - 4);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 8px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.fillText('ALLOC', cx, cy + 9);
}

// -------------------------------------------------------------------
// Hierarchical Risk Parity (HRP) Dendrogram Tree Chart
// -------------------------------------------------------------------
function renderDendrogramChart() {
  const canvas = elements.canvasDendrogramChart;
  const container = elements.containerDendrogramChart;
  if (!canvas || !container || !state.lastOptimal || !state.lastStats) return;

  const opt = state.lastOptimal;
  const stats = state.lastStats;
  const linkage = opt.linkage;
  const quasiDiag = opt.quasiDiag;
  const numAssets = stats.numAssets;

  if (!linkage || !quasiDiag || numAssets < 2) {
    if (elements.cardDendrogramChart) elements.cardDendrogramChart.style.display = 'none';
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  const width = Math.max(300, Math.floor(rect.width));
  const height = container.clientHeight || 320;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const pad = { top: 35, right: 35, bottom: 65, left: 65 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  ctx.clearRect(0, 0, width, height);

  // Background subtle grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  // Maximum distance across all linkage rows
  const maxDist = Math.max(0.01, ...linkage.map(row => row[2]));

  // Y-axis grid for distance D
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = 4;
  for (let t = 0; t <= yTicks; t++) {
    const val = (maxDist * t) / yTicks;
    const py = pad.top + plotH - (t / yTicks) * (plotH * 0.85);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(val.toFixed(2), pad.left - 8, py);
  }

  // Y-axis label
  ctx.save();
  ctx.translate(18, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.fillText('Euclidean Tree Distance (\u0100)', 0, 0);
  ctx.restore();

  // Position leaves according to quasiDiag order
  const nodeMap = new Map();
  const stepX = plotW / numAssets;

  for (let k = 0; k < numAssets; k++) {
    const assetIdx = quasiDiag[k];
    const x = pad.left + (k + 0.5) * stepX;
    const y = pad.top + plotH;
    nodeMap.set(assetIdx, {
      id: assetIdx,
      isLeaf: true,
      x,
      y,
      ticker: stats.tickers[assetIdx],
      weight: opt.weights[assetIdx],
      rank: k + 1,
      members: [assetIdx]
    });
  }

  // Position internal nodes from linkage
  const internalNodes = [];
  linkage.forEach((row, stepIdx) => {
    const child1 = row[0];
    const child2 = row[1];
    const dist = row[2];
    const count = row[3];
    const newId = numAssets + stepIdx;

    const n1 = nodeMap.get(child1);
    const n2 = nodeMap.get(child2);
    if (!n1 || !n2) return;

    const x = (n1.x + n2.x) / 2;
    const y = pad.top + plotH - (dist / maxDist) * (plotH * 0.85);
    const members = [...(n1.members || [child1]), ...(n2.members || [child2])];

    const internalNode = {
      id: newId,
      isLeaf: false,
      x,
      y,
      dist,
      count,
      child1: n1,
      child2: n2,
      members,
      step: stepIdx + 1
    };

    nodeMap.set(newId, internalNode);
    internalNodes.push(internalNode);
  });

  // Render branches
  internalNodes.forEach(node => {
    const c1 = node.child1;
    const c2 = node.child2;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(c1.x, node.y);
    ctx.lineTo(c2.x, node.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.stroke();

    // Node pivot dot
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Render Leaves (Asset badges & weights)
  for (let k = 0; k < numAssets; k++) {
    const assetIdx = quasiDiag[k];
    const leaf = nodeMap.get(assetIdx);
    if (!leaf) continue;

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(leaf.x, leaf.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Ticker label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(leaf.ticker, leaf.x, leaf.y + 8);

    // HRP Weight label
    const weightPct = (leaf.weight * 100).toFixed(1);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.fillText(`${weightPct}%`, leaf.x, leaf.y + 24);

    // Order badge below
    ctx.fillStyle = '#a855f7';
    ctx.font = '9px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.fillText(`[#${leaf.rank}]`, leaf.x, leaf.y + 37);
  }

  // Interactive Hover Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let hit = null;
    for (let k = 0; k < numAssets; k++) {
      const assetIdx = quasiDiag[k];
      const leaf = nodeMap.get(assetIdx);
      if (!leaf) continue;
      const dx = mouseX - leaf.x;
      const dy = mouseY - leaf.y;
      if (Math.hypot(dx, dy) <= 18 || (Math.abs(dx) <= stepX / 2 && mouseY >= leaf.y && mouseY <= leaf.y + 50)) {
        hit = { type: 'leaf', ...leaf };
        break;
      }
    }

    if (!hit) {
      for (const node of internalNodes) {
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        if (Math.hypot(dx, dy) <= 12) {
          hit = { type: 'node', ...node };
          break;
        }
      }
    }

    if (hit) {
      if (hit.type === 'leaf') {
        const vol = stats.annualVolatilities[hit.id];
        const ret = stats.expectedReturns[hit.id];
        elements.tooltipDendrogram.innerHTML = `
          <div style="font-weight:700; color:#38bdf8; margin-bottom:3px;">${hit.ticker} (Asset Leaf)</div>
          <div>HRP Weight: <strong>${(hit.weight * 100).toFixed(2)}%</strong></div>
          <div>Quasi-Diag Order: <strong>#${hit.rank} of ${numAssets}</strong></div>
          <div>Expected Return: <strong>${(ret * 100).toFixed(2)}%</strong></div>
          <div>Annual Volatility: <strong>${(vol * 100).toFixed(2)}%</strong></div>
        `;
      } else {
        const memberTickers = hit.members.map(idx => stats.tickers[idx]).join(', ');
        const totalWeight = hit.members.reduce((acc, idx) => acc + opt.weights[idx], 0);
        elements.tooltipDendrogram.innerHTML = `
          <div style="font-weight:700; color:#facc15; margin-bottom:3px;">Cluster Merge (Step ${hit.step})</div>
          <div>Euclidean Distance: <strong>${hit.dist.toFixed(4)}</strong></div>
          <div>Assets (${hit.count}): <strong>[${memberTickers}]</strong></div>
          <div>Total Allocated Capital: <strong>${(totalWeight * 100).toFixed(1)}%</strong></div>
        `;
      }
      elements.tooltipDendrogram.style.left = `${Math.min(width - 200, Math.max(10, mouseX + 15))}px`;
      elements.tooltipDendrogram.style.top = `${Math.max(10, mouseY - 40)}px`;
      elements.tooltipDendrogram.style.display = 'block';
    } else {
      elements.tooltipDendrogram.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipDendrogram.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Grouped Bar Chart: Weights & Risk Contributions
// -------------------------------------------------------------------
function renderBarChart() {
  const canvas = elements.canvasBarChart;
  const container = elements.containerBarChart;
  if (!canvas || !container || !state.lastOptimal || !state.lastBaseline || !state.lastStats) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 35, right: 30, bottom: 50, left: 60 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const stats = state.lastStats;
  const opt = state.lastOptimal;
  const base = state.lastBaseline;
  const numAssets = stats.numAssets;

  ctx.clearRect(0, 0, width, height);

  // Y-axis grid (0% to 100%)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let pct = 0; pct <= 1.0; pct += 0.2) {
    const py = pad.top + plotH - pct * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(pct * 100).toFixed(0)}%`, pad.left - 8, py);
  }

  // Draw 4 bars per asset:
  // 1. Opt Weight (#38bdf8)
  // 2. Base Weight (#94a3b8)
  // 3. Opt Risk Contrib (#facc15)
  // 4. Base Risk Contrib (#f43f5e)
  const groupW = plotW / numAssets;
  const barW = Math.max(8, Math.min(26, (groupW * 0.75) / 4));
  const innerPad = 2;

  const barsData = [];

  for (let i = 0; i < numAssets; i++) {
    const groupCenter = pad.left + (i + 0.5) * groupW;
    const startX = groupCenter - 2 * (barW + innerPad);

    const values = [
      { val: opt.weights[i], color: '#38bdf8', label: 'Optimal Weight' },
      { val: base.weights[i], color: '#94a3b8', label: 'Baseline Weight' },
      { val: opt.riskContributions.pctRiskContrib[i], color: '#facc15', label: 'Optimal Risk Contrib' },
      { val: base.riskContributions.pctRiskContrib[i], color: '#f43f5e', label: 'Baseline Risk Contrib' }
    ];

    values.forEach((v, bIdx) => {
      const bx = startX + bIdx * (barW + innerPad);
      const bHeight = Math.max(0, Math.min(1.0, v.val)) * plotH;
      const by = pad.top + plotH - bHeight;

      ctx.fillStyle = v.color;
      ctx.fillRect(bx, by, barW, bHeight);

      barsData.push({
        x: bx,
        y: by,
        w: barW,
        h: bHeight,
        ticker: stats.tickers[i],
        label: v.label,
        val: v.val,
        color: v.color
      });
    });

    // Asset Ticker label below group
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(stats.tickers[i], groupCenter, pad.top + plotH + 10);
  }

  // Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const hit = barsData.find(b => mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h);

    if (hit) {
      elements.tooltipBars.innerHTML = `
        <div style="font-weight:700; color:${hit.color}; margin-bottom:2px;">${hit.ticker}</div>
        <div>${hit.label}: <strong>${(hit.val * 100).toFixed(2)}%</strong></div>
      `;
      elements.tooltipBars.style.left = `${Math.min(width - 180, mouseX + 15)}px`;
      elements.tooltipBars.style.top = `${Math.max(10, mouseY - 25)}px`;
      elements.tooltipBars.style.display = 'block';
    } else {
      elements.tooltipBars.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipBars.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Cumulative Wealth Growth Trajectory Chart ($10k initial)
// -------------------------------------------------------------------
function renderGrowthChart() {
  const canvas = elements.canvasGrowthChart;
  const container = elements.containerGrowthChart;
  if (!canvas || !container || !state.lastOptimal || !state.lastBaseline || !state.lastStats) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 35, right: 30, bottom: 50, left: 75 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const numMonths = state.lastOptimal.monthlyReturns.length;
  if (numMonths < 2) return;

  // Build cumulative trajectory from $10,000
  const optTraj = [10000];
  const baseTraj = [10000];

  for (let t = 0; t < numMonths; t++) {
    optTraj.push(optTraj[t] * (1 + state.lastOptimal.monthlyReturns[t]));
    baseTraj.push(baseTraj[t] * (1 + state.lastBaseline.monthlyReturns[t]));
  }

  let minVal = Math.min(...optTraj, ...baseTraj) * 0.95;
  let maxVal = Math.max(...optTraj, ...baseTraj) * 1.05;

  const xToPix = (idx) => pad.left + (idx / numMonths) * plotW;
  const yToPix = (val) => pad.top + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

  ctx.clearRect(0, 0, width, height);

  // Y-axis grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const valStep = (maxVal - minVal) / 5;
  for (let s = 0; s <= 5; s++) {
    const val = minVal + s * valStep;
    const py = yToPix(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(formatCurrency(val), pad.left - 8, py);
  }

  // Draw Optimal Line (#38bdf8)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let t = 0; t <= numMonths; t++) {
    const px = xToPix(t);
    const py = yToPix(optTraj[t]);
    if (t === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Draw Baseline Line (#34d399)
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let t = 0; t <= numMonths; t++) {
    const px = xToPix(t);
    const py = yToPix(baseTraj[t]);
    if (t === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    if (mouseX < pad.left || mouseX > pad.left + plotW) {
      elements.tooltipGrowth.style.display = 'none';
      return;
    }

    const t = Math.max(0, Math.min(numMonths, Math.round(((mouseX - pad.left) / plotW) * numMonths)));

    elements.tooltipGrowth.innerHTML = `
      <div style="font-weight:700; color:#cbd5e1; margin-bottom:4px;">Month ${t} of ${numMonths}</div>
      <div>Optimal: <strong style="color:#38bdf8;">${formatCurrency(optTraj[t])}</strong></div>
      <div>Baseline: <strong style="color:#34d399;">${formatCurrency(baseTraj[t])}</strong></div>
    `;

    elements.tooltipGrowth.style.left = `${Math.min(width - 180, mouseX + 15)}px`;
    elements.tooltipGrowth.style.top = `${Math.max(10, e.clientY - rect.top - 30)}px`;
    elements.tooltipGrowth.style.display = 'block';
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipGrowth.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Detailed Asset Decomposition Table
// -------------------------------------------------------------------
function renderDetailsTable() {
  if (!elements.tableOptDetails || !state.lastOptimal || !state.lastBaseline || !state.lastStats) return;
  elements.tableOptDetails.innerHTML = '';

  const stats = state.lastStats;
  const opt = state.lastOptimal;
  const base = state.lastBaseline;

  // Thead
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>#</th>
      <th>Asset Ticker / Name</th>
      <th class="num">Optimal Weight</th>
      <th class="num">Baseline Weight</th>
      <th class="num">Optimal Risk Contrib (%)</th>
      <th class="num">Baseline Risk Contrib (%)</th>
      <th class="num">Marginal Risk Contrib</th>
      <th class="num">Expected Return</th>
      <th class="num">Volatility</th>
    </tr>
  `;
  elements.tableOptDetails.appendChild(thead);

  // Tbody
  const tbody = document.createElement('tbody');
  stats.tickers.forEach((ticker, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>
        <div class="asset-badge">
          <span class="asset-color-dot" style="background: ${ASSET_PALETTE[idx % ASSET_PALETTE.length]};"></span>
          <span>${ticker}</span>
          <span class="status-sub" style="font-weight:400; margin-left:0.25rem;">${stats.names[idx] || ''}</span>
        </div>
      </td>
      <td class="num" style="color:#38bdf8; font-weight:700;">${(opt.weights[idx] * 100).toFixed(2)}%</td>
      <td class="num" style="color:#94a3b8;">${(base.weights[idx] * 100).toFixed(2)}%</td>
      <td class="num" style="color:#facc15; font-weight:600;">${(opt.riskContributions.pctRiskContrib[idx] * 100).toFixed(2)}%</td>
      <td class="num" style="color:#f43f5e;">${(base.riskContributions.pctRiskContrib[idx] * 100).toFixed(2)}%</td>
      <td class="num">${opt.riskContributions.marginalRisk[idx].toFixed(4)}</td>
      <td class="num" style="color:#34d399; font-weight:600;">${(stats.expectedReturns[idx] * 100).toFixed(2)}%</td>
      <td class="num">${(stats.volatilities[idx] * 100).toFixed(2)}%</td>
    `;
    tbody.appendChild(tr);
  });

  elements.tableOptDetails.appendChild(tbody);
}

// Kickoff
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
