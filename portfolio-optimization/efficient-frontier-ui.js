/**
 * Efficient Frontier Studio UI Controller
 * Manages reactive state, asset selection, weight constraints,
 * High-DPI canvas rendering for Efficient Frontier and Transition Map,
 * and correlation / schedule tables.
 */

import {
  computeAssetStatistics,
  generateEfficientFrontier,
  generateMonteCarloPortfolios,
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

// Presets mapping
const OPT_PRESETS = {
  'core-two': ['VOO', 'BND'],
  'three-fund': ['VOO', 'SCHD', 'BND'],
  'growth-four': ['VOO', 'QQQ', 'SCHD', 'BND'],
  'equities': ['VOO', 'QQQ', 'SCHD']
};

// Reactive State
const state = {
  selectedTickers: ['VOO', 'BND', 'QQQ'],
  assetBounds: {
    VOO: { min: 0, max: 100 },
    BND: { min: 0, max: 100 },
    QQQ: { min: 0, max: 100 }
  },
  riskFreeRate: 0.03,
  riskAversion: 3.0,
  allowLeverage: true,
  borrowingRate: 0.04,
  covarianceEstimator: 'ledoit-wolf',
  startDate: null,
  endDate: null,
  showMonteCarlo: true,
  lastStats: null,
  lastFrontier: null,
  lastMonteCarlo: null
};

// DOM Elements
const elements = {
  // Status Bar
  statusTimelineRange: document.getElementById('status-timeline-range'),
  statusTotalMonths: document.getElementById('status-total-months'),
  statusLimitingAsset: document.getElementById('status-limiting-asset'),
  statusCovName: document.getElementById('status-cov-name'),
  statusCovCond: document.getElementById('status-cov-cond'),
  statusRfRate: document.getElementById('status-rf-rate'),
  statusAssetCount: document.getElementById('status-asset-count'),
  btnToggleConfig: document.getElementById('btn-toggle-config-panel'),
  configCard: document.getElementById('config-card'),
  btnConfigIcon: document.getElementById('btn-config-icon'),
  btnConfigText: document.getElementById('btn-config-text'),

  // Config Table & Actions
  tableAssetsBody: document.getElementById('asset-rows-body'),
  btnOpenModal: document.getElementById('btn-open-asset-modal'),
  selectCovEstimator: document.getElementById('select-cov-estimator'),
  inputRf: document.getElementById('opt-rf-input'),
  inputRiskAversion: document.getElementById('input-risk-aversion'),
  lblRiskAversionVal: document.getElementById('lbl-risk-aversion-val'),
  selectLeverageToggle: document.getElementById('select-leverage-toggle'),
  inputBorrowRate: document.getElementById('input-borrow-rate'),
  wrapBorrowRate: document.getElementById('wrap-borrow-rate'),
  selectStartDate: document.getElementById('opt-start-date'),
  selectEndDate: document.getElementById('opt-end-date'),
  selectMcToggle: document.getElementById('opt-mc-toggle'),
  btnRunOptimization: document.getElementById('btn-run-optimization'),

  // Flagship Cards
  tanMetricReturn: document.getElementById('tan-metric-return'),
  tanMetricVol: document.getElementById('tan-metric-vol'),
  tanMetricSharpe: document.getElementById('tan-metric-sharpe'),
  canvasDonutTangency: document.getElementById('canvas-donut-tangency'),
  tanWeightsList: document.getElementById('tan-weights-list'),

  gmvMetricReturn: document.getElementById('gmv-metric-return'),
  gmvMetricVol: document.getElementById('gmv-metric-vol'),
  gmvMetricSharpe: document.getElementById('gmv-metric-sharpe'),
  canvasDonutGmv: document.getElementById('canvas-donut-gmv'),
  gmvWeightsList: document.getElementById('gmv-weights-list'),

  calCardPill: document.getElementById('cal-card-pill'),
  calMetricYstar: document.getElementById('cal-metric-ystar'),
  calMetricCash: document.getElementById('cal-metric-cash'),
  calMetricUtility: document.getElementById('cal-metric-utility'),
  canvasDonutCal: document.getElementById('canvas-donut-cal'),
  calWeightsList: document.getElementById('cal-weights-list'),

  // Canvas Charts
  containerFrontier: document.getElementById('container-frontier-chart'),
  canvasFrontier: document.getElementById('canvas-frontier-chart'),
  tooltipFrontier: document.getElementById('tooltip-frontier'),

  containerTransition: document.getElementById('container-transition-chart'),
  canvasTransition: document.getElementById('canvas-transition-chart'),
  tooltipTransition: document.getElementById('tooltip-transition'),
  transitionLegend: document.getElementById('transition-legend'),

  // Tables
  tableAssetStatsBody: document.getElementById('table-asset-stats-body'),
  tableCorrelationMatrix: document.getElementById('table-correlation-matrix'),
  tableFrontierSchedule: document.getElementById('table-frontier-schedule')
};

// -------------------------------------------------------------------
// Helper: Get Fund Objects by Ticker
// -------------------------------------------------------------------
function getActiveFundObjects() {
  const allFunds = getAllFundsSync();
  const fundMap = new Map();

  // Load presets first
  PRESET_BENCHMARKS.forEach(f => fundMap.set(f.ticker.toUpperCase(), f));
  // Override or add session/custom funds
  allFunds.forEach(f => fundMap.set(f.ticker.toUpperCase(), f));

  return state.selectedTickers
    .map(ticker => fundMap.get(ticker.toUpperCase()))
    .filter(Boolean);
}

// -------------------------------------------------------------------
// Initialization & Event Binding
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

  // Config panel collapse toggle
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

  // Calculate Button
  if (elements.btnRunOptimization) {
    elements.btnRunOptimization.addEventListener('click', () => {
      syncInputsToState();
      runOptimization();
    });
  }

  // Covariance Estimator
  if (elements.selectCovEstimator) {
    elements.selectCovEstimator.addEventListener('change', () => {
      state.covarianceEstimator = elements.selectCovEstimator.value || 'ledoit-wolf';
      runOptimization();
    });
  }

  // RF input change
  if (elements.inputRf) {
    elements.inputRf.addEventListener('change', () => {
      state.riskFreeRate = Math.max(0, (parseFloat(elements.inputRf.value) || 3.0) / 100);
      elements.statusRfRate.textContent = `${(state.riskFreeRate * 100).toFixed(2)}%`;
    });
  }

  // Risk Aversion input change
  if (elements.inputRiskAversion) {
    elements.inputRiskAversion.addEventListener('input', () => {
      state.riskAversion = parseFloat(elements.inputRiskAversion.value) || 3.0;
      if (elements.lblRiskAversionVal) {
        elements.lblRiskAversionVal.textContent = state.riskAversion.toFixed(1);
      }
      if (state.lastStats && state.lastFrontier) {
        runOptimization();
      }
    });
  }

  // Leverage toggle change
  if (elements.selectLeverageToggle) {
    elements.selectLeverageToggle.addEventListener('change', () => {
      state.allowLeverage = elements.selectLeverageToggle.value === 'true';
      if (elements.wrapBorrowRate) {
        elements.wrapBorrowRate.style.display = state.allowLeverage ? 'block' : 'none';
      }
      if (state.lastStats && state.lastFrontier) {
        runOptimization();
      }
    });
  }

  // Borrow rate input change
  if (elements.inputBorrowRate) {
    elements.inputBorrowRate.addEventListener('change', () => {
      state.borrowingRate = Math.max(0, (parseFloat(elements.inputBorrowRate.value) || 4.0) / 100);
      if (state.lastStats && state.lastFrontier) {
        runOptimization();
      }
    });
  }

  // MC Toggle change
  if (elements.selectMcToggle) {
    elements.selectMcToggle.addEventListener('change', () => {
      state.showMonteCarlo = elements.selectMcToggle.value === 'true';
      if (state.lastStats && state.lastFrontier) {
        renderFrontierChart();
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
      if (state.lastFrontier) {
        renderFrontierChart();
        renderTransitionChart();
        renderDonuts();
      }
    }, 250);
  });

  // Initial setup
  initEducationGuide();
  renderAssetTable();
  updateTimelineSelects();
  runOptimization();
}

// -------------------------------------------------------------------
// Educational Decision & Intuition Framework Guide
// -------------------------------------------------------------------
function initEducationGuide() {
  const guideCard = document.getElementById('executive-guide-frontier');
  const guideToggle = document.getElementById('executive-guide-toggle');
  const guideArrow = document.getElementById('executive-guide-arrow');
  const guideBody = document.getElementById('executive-guide-body');
  const btnHide = document.getElementById('btn-hide-edu-guide');
  const restorePill = document.getElementById('edu-guide-restore-pill');
  const btnShow = document.getElementById('btn-show-edu-guide');
  const btnLoadExample = document.getElementById('btn-load-worked-example');
  const tabButtons = document.querySelectorAll('.edu-tab-btn');
  const tabPanes = document.querySelectorAll('.edu-tab-pane');

  if (!guideCard) return;

  // Restore persistence (hidden vs visible)
  try {
    const isHidden = localStorage.getItem('fc_frontier_edu_hidden') === 'true';
    if (isHidden) {
      guideCard.style.display = 'none';
      if (restorePill) restorePill.style.display = 'block';
    }
  } catch (e) {
    // Graceful fallback if localStorage is unavailable
  }

  // Hide Guide completely
  if (btnHide && guideCard && restorePill) {
    btnHide.addEventListener('click', (e) => {
      e.stopPropagation();
      guideCard.style.display = 'none';
      restorePill.style.display = 'block';
      try { localStorage.setItem('fc_frontier_edu_hidden', 'true'); } catch (err) {}
    });
  }

  // Restore Guide (and expand body if currently collapsed)
  if (btnShow && guideCard && restorePill) {
    btnShow.addEventListener('click', () => {
      guideCard.style.display = 'block';
      restorePill.style.display = 'none';
      try { localStorage.removeItem('fc_frontier_edu_hidden'); } catch (err) {}
      if (guideBody && guideBody.style.display === 'none' && guideToggle) {
        guideToggle.click();
      }
    });
  }

  // Educational Tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPane = document.getElementById(targetTab);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Load Worked Example Action
  if (btnLoadExample) {
    btnLoadExample.addEventListener('click', () => {
      applyPreset(['VOO', 'SCHD', 'BND']);
      if (elements.inputRf) elements.inputRf.value = '3.0';
      if (elements.inputRiskAversion) {
        elements.inputRiskAversion.value = '3.0';
        if (elements.lblRiskAversionVal) elements.lblRiskAversionVal.textContent = '3.0';
      }
      if (elements.selectCovEstimator) elements.selectCovEstimator.value = 'ledoit-wolf';
      if (elements.selectLeverageToggle) elements.selectLeverageToggle.value = 'no';
      if (elements.wrapBorrowRate) elements.wrapBorrowRate.style.display = 'none';

      document.querySelectorAll('.btn-preset').forEach(b => {
        b.classList.toggle('active', b.dataset.preset === 'three-fund');
      });

      runOptimization();

      const flagshipGrid = document.querySelector('.flagship-cards-grid');
      if (flagshipGrid) {
        flagshipGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
}

// -------------------------------------------------------------------
// Preset & Asset Management
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
// Render Asset Configuration Table
// -------------------------------------------------------------------
function renderAssetTable() {
  if (!elements.tableAssetsBody) return;
  elements.tableAssetsBody.innerHTML = '';

  const funds = getActiveFundObjects();
  elements.statusAssetCount.textContent = `${funds.length} Assets`;

  funds.forEach((fund, idx) => {
    const ticker = fund.ticker.toUpperCase();
    const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
    const bounds = state.assetBounds[ticker] || { min: 0, max: 100 };

    // Estimate historical return & vol from asset data
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

  // Bind remove buttons
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
  if (elements.selectMcToggle) {
    state.showMonteCarlo = elements.selectMcToggle.value === 'true';
  }
  if (elements.selectCovEstimator) {
    state.covarianceEstimator = elements.selectCovEstimator.value || 'ledoit-wolf';
  }
}

// -------------------------------------------------------------------
// Timeline Dropdown Populator
// -------------------------------------------------------------------
function updateTimelineSelects() {
  const funds = getActiveFundObjects();
  if (funds.length < 2) return;

  const common = findCommonDateRange(funds);
  elements.statusTimelineRange.textContent = `${common.start} to ${common.end}`;
  elements.statusTotalMonths.textContent = `(${common.totalMonths} Months)`;
  elements.statusLimitingAsset.textContent = common.limitingFund;

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
// Core Execution Pipeline
// -------------------------------------------------------------------
function runOptimization() {
  const funds = getActiveFundObjects();
  if (funds.length < 2) {
    alert('Please select at least 2 assets to generate the Efficient Frontier.');
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
    // 1. Asset Statistics & Covariance
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

    // 2. Efficient Frontier & Portfolios
    const frontierResult = generateEfficientFrontier(stats.expectedReturns, stats.covarianceMatrix, {
      riskFreeRate: state.riskFreeRate,
      lowerBounds,
      upperBounds,
      numPoints: 45,
      riskAversion: state.riskAversion,
      allowLeverage: state.allowLeverage,
      borrowingRate: state.borrowingRate
    });
    state.lastFrontier = frontierResult;

    // 3. Monte Carlo Feasible Cloud
    if (state.showMonteCarlo) {
      state.lastMonteCarlo = generateMonteCarloPortfolios(stats.expectedReturns, stats.covarianceMatrix, {
        count: 2000,
        riskFreeRate: state.riskFreeRate,
        lowerBounds,
        upperBounds
      });
    } else {
      state.lastMonteCarlo = null;
    }

    // 4. Update UI Components
    renderFlagshipCards(frontierResult, stats);
    renderFrontierChart(frontierResult);
    renderTransitionChart();
    renderAssetCharacteristicsTable(stats, lowerBounds, upperBounds);
    renderCorrelationMatrix(stats);
    renderFrontierScheduleTable(frontierResult, stats);

  } catch (err) {
    console.error('Optimization error:', err);
    alert(`Optimization calculation failed: ${err.message}`);
  }
}

// -------------------------------------------------------------------
// Flagship Cards & Donut Charts
// -------------------------------------------------------------------
function renderFlagshipCards(frontierResult, stats) {
  const { tangencyPortfolio, gmvPortfolio } = frontierResult;

  // Tangency Card Metrics
  elements.tanMetricReturn.textContent = `${(tangencyPortfolio.expectedReturn * 100).toFixed(2)}%`;
  elements.tanMetricVol.textContent = `${(tangencyPortfolio.volatility * 100).toFixed(2)}%`;
  elements.tanMetricSharpe.textContent = tangencyPortfolio.sharpeRatio.toFixed(3);

  // GMV Card Metrics
  elements.gmvMetricReturn.textContent = `${(gmvPortfolio.expectedReturn * 100).toFixed(2)}%`;
  elements.gmvMetricVol.textContent = `${(gmvPortfolio.volatility * 100).toFixed(2)}%`;
  elements.gmvMetricSharpe.textContent = gmvPortfolio.sharpeRatio.toFixed(3);

  // Render Tangency Weights
  elements.tanWeightsList.innerHTML = '';
  stats.tickers.forEach((ticker, idx) => {
    const weight = tangencyPortfolio.weights[idx];
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
      elements.tanWeightsList.appendChild(row);
    }
  });

  // Render GMV Weights
  elements.gmvWeightsList.innerHTML = '';
  stats.tickers.forEach((ticker, idx) => {
    const weight = gmvPortfolio.weights[idx];
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
      elements.gmvWeightsList.appendChild(row);
    }
  });

  // Complete Portfolio Card Metrics (Bodie Chapter 6)
  if (frontierResult.optimalComplete && elements.calMetricYstar) {
    const cStar = frontierResult.optimalComplete;
    if (elements.calCardPill) {
      elements.calCardPill.textContent = `Bodie Utility (A = ${frontierResult.riskAversion.toFixed(1)})`;
    }
    elements.calMetricYstar.textContent = `${(cStar.yStar * 100).toFixed(1)}%`;
    if (cStar.yStar > 1.0) {
      elements.calMetricCash.textContent = `-${((cStar.yStar - 1.0) * 100).toFixed(1)}% (Margin)`;
      elements.calMetricCash.style.color = '#f43f5e';
    } else {
      elements.calMetricCash.textContent = `${(cStar.cashWeight * 100).toFixed(1)}% (Cash)`;
      elements.calMetricCash.style.color = '#38bdf8';
    }
    elements.calMetricUtility.textContent = `${(cStar.utility * 100).toFixed(2)}% (Ret: ${(cStar.completeReturn * 100).toFixed(1)}%)`;

    // Render Complete Weights
    if (elements.calWeightsList) {
      elements.calWeightsList.innerHTML = '';

      // Cash row
      const cashRow = document.createElement('div');
      cashRow.className = 'donut-weight-row';
      const cashColor = cStar.yStar > 1.0 ? '#f43f5e' : '#38bdf8';
      const cashLabel = cStar.yStar > 1.0 ? 'Borrowed Cash (Margin)' : 'Risk-Free Cash (T-Bills)';
      cashRow.innerHTML = `
        <div class="donut-weight-ticker">
          <span class="asset-color-dot" style="background: ${cashColor};"></span>
          <span>${cashLabel}</span>
        </div>
        <span class="donut-weight-val" style="color: ${cashColor}; font-weight:700;">${(cStar.cashWeight * 100).toFixed(1)}%</span>
      `;
      elements.calWeightsList.appendChild(cashRow);

      // Risky Assets rows (scaled by yStar)
      stats.tickers.forEach((ticker, idx) => {
        const effWeight = cStar.yStar * tangencyPortfolio.weights[idx];
        if (Math.abs(effWeight) > 0.0005) {
          const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
          const row = document.createElement('div');
          row.className = 'donut-weight-row';
          row.innerHTML = `
            <div class="donut-weight-ticker">
              <span class="asset-color-dot" style="background: ${color};"></span>
              <span>${ticker}</span>
            </div>
            <span class="donut-weight-val">${(effWeight * 100).toFixed(1)}%</span>
          `;
          elements.calWeightsList.appendChild(row);
        }
      });
    }
  }

  renderDonuts();
}

function renderDonuts() {
  if (!state.lastFrontier || !state.lastStats) return;
  const { tangencyPortfolio, gmvPortfolio, optimalComplete } = state.lastFrontier;

  drawDonut(elements.canvasDonutTangency, tangencyPortfolio.weights);
  drawDonut(elements.canvasDonutGmv, gmvPortfolio.weights);

  if (elements.canvasDonutCal && optimalComplete) {
    if (optimalComplete.yStar <= 1.0) {
      const calWeights = [optimalComplete.cashWeight, ...tangencyPortfolio.weights.map(w => w * optimalComplete.yStar)];
      drawDonutWithCash(elements.canvasDonutCal, calWeights);
    } else {
      drawDonut(elements.canvasDonutCal, tangencyPortfolio.weights);
    }
  }
}

function drawDonutWithCash(canvas, weights) {
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

  // First slice is cash (#38bdf8), rest are asset palette
  weights.forEach((w, idx) => {
    if (w <= 0.0005) return;
    const sliceAngle = w * (Math.PI * 2);
    const endAngle = startAngle + sliceAngle;
    const color = idx === 0 ? '#38bdf8' : ASSET_PALETTE[(idx - 1) % ASSET_PALETTE.length];

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, startAngle, endAngle);
    ctx.arc(cx, cy, rInner, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fill();

    startAngle = endAngle;
  });

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CAL', cx, cy - 4);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 8px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.fillText('PORT', cx, cy + 9);
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

  // Center Text
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
// Main Efficient Frontier Canvas Chart
// -------------------------------------------------------------------
function renderFrontierChart(frontierResult = state.lastFrontier) {
  const canvas = elements.canvasFrontier;
  const container = elements.containerFrontier;
  if (!canvas || !container || !frontierResult || !state.lastStats) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Setup bounds & margins
  const pad = { top: 35, right: 40, bottom: 50, left: 65 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { frontier, gmvPortfolio, tangencyPortfolio, calLine } = frontierResult;
  const stats = state.lastStats;

  // Find min and max for X (Volatility) and Y (Expected Return)
  let minX = 0;
  let maxX = 0.25;
  let minY = Math.min(0, state.riskFreeRate);
  let maxY = 0.20;

  // Include frontier points
  frontier.forEach(p => {
    if (p.volatility > maxX) maxX = p.volatility;
    if (p.expectedReturn > maxY) maxY = p.expectedReturn;
    if (p.expectedReturn < minY) minY = p.expectedReturn;
  });

  // Include individual assets
  stats.volatilities.forEach((vol, idx) => {
    if (vol > maxX) maxX = vol;
    const ret = stats.expectedReturns[idx];
    if (ret > maxY) maxY = ret;
    if (ret < minY) minY = ret;
  });

  // Include CAL end
  if (calLine && calLine[2]) {
    if (calLine[2].volatility > maxX) maxX = calLine[2].volatility;
    if (calLine[2].expectedReturn > maxY) maxY = calLine[2].expectedReturn;
  }

  maxX = Math.ceil(maxX * 1.15 * 100) / 100;
  maxY = Math.ceil(maxY * 1.15 * 100) / 100;
  minY = Math.floor(minY * 0.9 * 100) / 100;

  const xToPix = (x) => pad.left + (x / maxX) * plotW;
  const yToPix = (y) => pad.top + plotH - ((y - minY) / (maxY - minY)) * plotH;

  // Background Grid & Ticks
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;

  // X grid lines & ticks (Volatility)
  const xStep = maxX > 0.3 ? 0.05 : 0.02;
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let x = 0; x <= maxX; x += xStep) {
    const px = xToPix(x);
    ctx.beginPath();
    ctx.moveTo(px, pad.top);
    ctx.lineTo(px, pad.top + plotH);
    ctx.stroke();
    ctx.fillText(`${(x * 100).toFixed(0)}%`, px, pad.top + plotH + 8);
  }

  // Y grid lines & ticks (Expected Return)
  const yStep = (maxY - minY) > 0.3 ? 0.05 : 0.02;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let y = minY; y <= maxY; y += yStep) {
    const py = yToPix(y);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(y * 100).toFixed(0)}%`, pad.left - 8, py);
  }

  // Axis Labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Standard Deviation / Volatility (Annualized)', pad.left + plotW / 2, height - 12);

  ctx.save();
  ctx.translate(16, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Expected Return (Annualized)', 0, 0);
  ctx.restore();

  // 1. Draw Monte Carlo Feasible Cloud (if enabled)
  if (state.lastMonteCarlo && state.showMonteCarlo) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    state.lastMonteCarlo.forEach(p => {
      const px = xToPix(p.volatility);
      const py = yToPix(p.expectedReturn);
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 2. Draw Capital Allocation Line (CAL)
  if (calLine && calLine.length === 3) {
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.7)';
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(xToPix(calLine[0].volatility), yToPix(calLine[0].expectedReturn));
    ctx.lineTo(xToPix(calLine[2].volatility), yToPix(calLine[2].expectedReturn));
    ctx.stroke();
    ctx.restore();

    // CAL Label
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CAL (Rf = ' + (state.riskFreeRate * 100).toFixed(1) + '%)', xToPix(0) + 6, yToPix(state.riskFreeRate) - 8);
  }

  // 3. Draw Efficient Frontier Curve (Spline)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
  ctx.shadowBlur = 8;
  ctx.beginPath();

  frontier.forEach((p, idx) => {
    const px = xToPix(p.volatility);
    const py = yToPix(p.expectedReturn);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.shadowBlur = 0; // reset shadow

  // 4. Draw Individual Asset Scatter Points
  stats.tickers.forEach((ticker, idx) => {
    const px = xToPix(stats.volatilities[idx]);
    const py = yToPix(stats.expectedReturns[idx]);
    const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];

    // Asset dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Asset Ticker Label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ticker, px + 8, py - 4);
  });

  // 5. Draw Global Minimum Volatility (GMV) Point
  const gmvX = xToPix(gmvPortfolio.volatility);
  const gmvY = yToPix(gmvPortfolio.expectedReturn);
  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.arc(gmvX, gmvY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 6. Draw Tangency Portfolio (Max Sharpe) Point
  const tanX = xToPix(tangencyPortfolio.volatility);
  const tanY = yToPix(tangencyPortfolio.expectedReturn);
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(tanX, tanY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 7. Draw Quadratic Indifference Curve (Bodie Chapter 6)
  if (frontierResult.indifferenceCurve && frontierResult.indifferenceCurve.length > 1) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    frontierResult.indifferenceCurve.forEach(pt => {
      if (pt.volatility <= maxX && pt.expectedReturn <= maxY && pt.expectedReturn >= minY) {
        const px = xToPix(pt.volatility);
        const py = yToPix(pt.expectedReturn);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
    });
    ctx.stroke();
    ctx.restore();
  }

  // 8. Draw Complete Portfolio Point C*
  const cStar = frontierResult.optimalComplete;
  let cStarX = -1;
  let cStarY = -1;
  if (cStar && cStar.completeVolatility <= maxX && cStar.completeReturn <= maxY) {
    cStarX = xToPix(cStar.completeVolatility);
    cStarY = yToPix(cStar.completeReturn);
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(cStarX, cStarY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Label C*
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`C* (y*=${(cStar.yStar * 100).toFixed(0)}%)`, cStarX + 10, cStarY - 4);
  }

  // AbortController mousemove handler for tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < pad.left || mouseX > pad.left + plotW || mouseY < pad.top || mouseY > pad.top + plotH) {
      elements.tooltipFrontier.style.display = 'none';
      return;
    }

    // Check hit on C* Complete Portfolio point
    if (cStarX > 0 && Math.hypot(mouseX - cStarX, mouseY - cStarY) < 18) {
      elements.tooltipFrontier.innerHTML = `
        <div style="font-weight:700; margin-bottom:4px; color:#c084fc;">🎯 Optimal Complete Portfolio (C*)</div>
        <div>Risky Share (y*): <strong>${(cStar.yStar * 100).toFixed(1)}% Tangency</strong></div>
        <div>Cash Share (1-y*): <strong>${(cStar.cashWeight * 100).toFixed(1)}%</strong></div>
        <div>Expected Return: <strong>${(cStar.completeReturn * 100).toFixed(2)}%</strong></div>
        <div>Volatility: <strong>${(cStar.completeVolatility * 100).toFixed(2)}%</strong></div>
        <div>Expected Utility (U*): <strong>${(cStar.utility * 100).toFixed(2)}% (A = ${frontierResult.riskAversion.toFixed(1)})</strong></div>
        <div>Sharpe Ratio: <strong>${cStar.completeSharpe.toFixed(3)}</strong></div>
        <div style="margin-top:6px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1); font-size:11px; color:#cbd5e1; line-height:1.4;">
          💡 Bodie Utility Maximizer: Balances return vs variance risk penalty for risk aversion A = ${frontierResult.riskAversion.toFixed(1)}. Slides toward cash if A increases; slides into leverage if A decreases.
        </div>
      `;
      elements.tooltipFrontier.style.left = `${Math.min(width - 240, mouseX + 15)}px`;
      elements.tooltipFrontier.style.top = `${Math.max(10, mouseY - 40)}px`;
      elements.tooltipFrontier.style.display = 'block';
      return;
    }

    // Check hit on Individual Asset scatter points
    let hitAssetIdx = -1;
    stats.tickers.forEach((ticker, idx) => {
      const ax = xToPix(stats.volatilities[idx]);
      const ay = yToPix(stats.expectedReturns[idx]);
      if (Math.hypot(mouseX - ax, mouseY - ay) < 14) {
        hitAssetIdx = idx;
      }
    });

    if (hitAssetIdx >= 0) {
      const ticker = stats.tickers[hitAssetIdx];
      const ret = stats.expectedReturns[hitAssetIdx];
      const vol = stats.volatilities[hitAssetIdx];
      const sharpe = (ret - state.riskFreeRate) / Math.max(0.0001, vol);
      const color = ASSET_PALETTE[hitAssetIdx % ASSET_PALETTE.length];

      elements.tooltipFrontier.innerHTML = `
        <div style="font-weight:700; color:${color}; margin-bottom:4px;">🏛️ Individual Asset: ${ticker}</div>
        <div>Expected Ann. Return: <strong>${(ret * 100).toFixed(2)}%</strong></div>
        <div>Annualized Volatility: <strong>${(vol * 100).toFixed(2)}%</strong></div>
        <div>Standalone Sharpe: <strong>${sharpe.toFixed(3)}</strong></div>
        <div style="margin-top:6px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1); font-size:11px; color:#cbd5e1; line-height:1.4;">
          💡 Notice this asset lies inside/below the efficient frontier. Holding ${ticker} alone takes uncompensated risk compared to an efficient frontier blend.
        </div>
      `;
      elements.tooltipFrontier.style.left = `${Math.min(width - 240, mouseX + 15)}px`;
      elements.tooltipFrontier.style.top = `${Math.max(10, mouseY - 40)}px`;
      elements.tooltipFrontier.style.display = 'block';
      return;
    }

    // Find closest frontier point
    let closestPoint = null;
    let minDistSq = Infinity;

    frontier.forEach(p => {
      const px = xToPix(p.volatility);
      const py = yToPix(p.expectedReturn);
      const distSq = (mouseX - px) ** 2 + (mouseY - py) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestPoint = p;
      }
    });

    if (closestPoint && Math.sqrt(minDistSq) < 30) {
      const isTan = Math.abs(closestPoint.volatility - tangencyPortfolio.volatility) < 1e-4;
      const isGmv = Math.abs(closestPoint.volatility - gmvPortfolio.volatility) < 1e-4;

      let labelHeader = 'Frontier Portfolio';
      let takeaway = '📈 Markowitz Frontier: Optimal risk-return mix offering maximum return for this volatility.';
      if (isTan) {
        labelHeader = '⭐ Maximum Sharpe Portfolio (Tangency P*)';
        takeaway = '💡 Bodie Separation Property: Maximizes Sharpe ratio (slope of CAL). All rational investors hold this identical risky mix and adjust risk via cash.';
      } else if (isGmv) {
        labelHeader = '🛡️ Global Minimum Volatility (GMV)';
        takeaway = '✨ Free Lunch of Diversification: Lowest risk achievable. Total volatility is lower than any constituent asset alone due to low correlation!';
      }

      let weightsHtml = stats.tickers.map((t, idx) => {
        const w = closestPoint.weights[idx];
        const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
        return `<div><span style="color:${color};">●</span> ${t}: <strong>${(w * 100).toFixed(1)}%</strong></div>`;
      }).join('');

      elements.tooltipFrontier.innerHTML = `
        <div style="font-weight:700; margin-bottom:4px; color:#38bdf8;">${labelHeader}</div>
        <div>Expected Return: <strong>${(closestPoint.expectedReturn * 100).toFixed(2)}%</strong></div>
        <div>Volatility: <strong>${(closestPoint.volatility * 100).toFixed(2)}%</strong></div>
        <div>Sharpe Ratio: <strong>${closestPoint.sharpeRatio.toFixed(3)}</strong></div>
        <div style="margin-top:6px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1); font-size:11px;">
          ${weightsHtml}
        </div>
        <div style="margin-top:6px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1); font-size:11px; color:#cbd5e1; line-height:1.4;">
          ${takeaway}
        </div>
      `;

      elements.tooltipFrontier.style.left = `${Math.min(width - 240, mouseX + 15)}px`;
      elements.tooltipFrontier.style.top = `${Math.max(10, mouseY - 40)}px`;
      elements.tooltipFrontier.style.display = 'block';
    } else {
      elements.tooltipFrontier.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipFrontier.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Transition Map (Stacked Area Chart)
// -------------------------------------------------------------------
function renderTransitionChart() {
  const canvas = elements.canvasTransition;
  const container = elements.containerTransition;
  if (!canvas || !container || !state.lastFrontier || !state.lastStats) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Setup bounds & margins
  const pad = { top: 30, right: 40, bottom: 50, left: 65 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { transitionMap, frontier } = state.lastFrontier;
  const stats = state.lastStats;
  const numSteps = transitionMap.volatilities.length;
  const numAssets = stats.numAssets;

  // Render Transition Legend
  if (elements.transitionLegend) {
    elements.transitionLegend.innerHTML = stats.tickers.map((ticker, idx) => {
      const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
      return `<div class="legend-item"><span class="legend-swatch" style="background:${color};"></span> ${ticker}</div>`;
    }).join('');
  }

  const minVol = transitionMap.volatilities[0];
  const maxVol = transitionMap.volatilities[numSteps - 1];

  const xToPix = (vol) => pad.left + ((vol - minVol) / (maxVol - minVol)) * plotW;
  const yToPix = (cumulativeWeight) => pad.top + plotH - cumulativeWeight * plotH;

  ctx.clearRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;

  // Y-axis grid (0% to 100% allocation)
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let pct = 0; pct <= 1.0; pct += 0.2) {
    const py = yToPix(pct);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(pct * 100).toFixed(0)}%`, pad.left - 8, py);
  }

  // X-axis grid (Volatility)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const volStep = (maxVol - minVol) / 6;

  for (let step = 0; step <= 6; step++) {
    const v = minVol + step * volStep;
    const px = xToPix(v);
    ctx.beginPath();
    ctx.moveTo(px, pad.top);
    ctx.lineTo(px, pad.top + plotH);
    ctx.stroke();
    ctx.fillText(`${(v * 100).toFixed(1)}%`, px, pad.top + plotH + 8);
  }

  // Axis Labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Portfolio Standard Deviation (Volatility)', pad.left + plotW / 2, height - 12);

  ctx.save();
  ctx.translate(16, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Asset Allocation (%)', 0, 0);
  ctx.restore();

  // Draw Stacked Areas
  // Build cumulative weights matrix [step][asset]
  const cumulative = [];
  for (let s = 0; s < numSteps; s++) {
    cumulative[s] = new Array(numAssets + 1).fill(0);
    let running = 0;
    for (let a = 0; a < numAssets; a++) {
      running += transitionMap.series[a].weights[s];
      cumulative[s][a + 1] = Math.min(1.0, running);
    }
  }

  for (let a = 0; a < numAssets; a++) {
    const color = ASSET_PALETTE[a % ASSET_PALETTE.length];
    ctx.fillStyle = color;

    ctx.beginPath();
    // Top boundary left-to-right
    for (let s = 0; s < numSteps; s++) {
      const px = xToPix(transitionMap.volatilities[s]);
      const py = yToPix(cumulative[s][a + 1]);
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    // Bottom boundary right-to-left
    for (let s = numSteps - 1; s >= 0; s--) {
      const px = xToPix(transitionMap.volatilities[s]);
      const py = yToPix(cumulative[s][a]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Subtle border line between areas
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Tooltip & Scrubber Line
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < pad.left || mouseX > pad.left + plotW || mouseY < pad.top || mouseY > pad.top + plotH) {
      elements.tooltipTransition.style.display = 'none';
      return;
    }

    // Find closest volatility step
    const targetVol = minVol + ((mouseX - pad.left) / plotW) * (maxVol - minVol);
    let closestStep = 0;
    let minDiff = Infinity;

    transitionMap.volatilities.forEach((v, idx) => {
      const diff = Math.abs(v - targetVol);
      if (diff < minDiff) {
        minDiff = diff;
        closestStep = idx;
      }
    });

    const activeVol = transitionMap.volatilities[closestStep];
    const activeReturn = frontier[closestStep].expectedReturn;
    const activeSharpe = frontier[closestStep].sharpeRatio;

    let weightsHtml = stats.tickers.map((t, idx) => {
      const w = transitionMap.series[idx].weights[closestStep];
      const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
      return `<div><span style="color:${color};">●</span> ${t}: <strong>${(w * 100).toFixed(1)}%</strong></div>`;
    }).join('');

    elements.tooltipTransition.innerHTML = `
      <div style="font-weight:700; margin-bottom:4px; color:#38bdf8;">Frontier Point #${closestStep + 1}</div>
      <div>Volatility: <strong>${(activeVol * 100).toFixed(2)}%</strong></div>
      <div>Return: <strong>${(activeReturn * 100).toFixed(2)}%</strong></div>
      <div>Sharpe: <strong>${activeSharpe.toFixed(3)}</strong></div>
      <div style="margin-top:6px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1); font-size:11px;">
        ${weightsHtml}
      </div>
      <div style="margin-top:6px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1); font-size:11px; color:#cbd5e1; line-height:1.4;">
        📊 Asset Substitution: At ${(activeVol * 100).toFixed(1)}% volatility, weights dynamically shift between risk-reducing anchors and return drivers.
      </div>
    `;

    elements.tooltipTransition.style.left = `${Math.min(width - 240, mouseX + 15)}px`;
    elements.tooltipTransition.style.top = `${Math.max(10, mouseY - 30)}px`;
    elements.tooltipTransition.style.display = 'block';
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipTransition.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Tables: Asset Stats, Correlation Grid, Frontier Schedule
// -------------------------------------------------------------------
function renderAssetCharacteristicsTable(stats, lowerBounds, upperBounds) {
  if (!elements.tableAssetStatsBody) return;
  elements.tableAssetStatsBody.innerHTML = '';

  stats.tickers.forEach((ticker, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>
        <div class="asset-badge">
          <span class="asset-color-dot" style="background: ${ASSET_PALETTE[idx % ASSET_PALETTE.length]};"></span>
          <span>${ticker}</span>
          <span class="status-sub" style="font-weight: 400; margin-left: 0.25rem;">${stats.names[idx] || ''}</span>
        </div>
      </td>
      <td class="num" style="color: #34d399; font-weight: 600;">${(stats.expectedReturns[idx] * 100).toFixed(2)}%</td>
      <td class="num" style="color: #f1f5f9;">${(stats.volatilities[idx] * 100).toFixed(2)}%</td>
      <td class="num" style="color: #facc15; font-weight: 600;">${stats.sharpeRatios[idx].toFixed(3)}</td>
      <td class="num">${(lowerBounds[idx] * 100).toFixed(1)}%</td>
      <td class="num">${(upperBounds[idx] * 100).toFixed(1)}%</td>
    `;
    elements.tableAssetStatsBody.appendChild(tr);
  });
}

function renderCorrelationMatrix(stats) {
  if (!elements.tableCorrelationMatrix) return;
  elements.tableCorrelationMatrix.innerHTML = '';

  // Thead
  const thead = document.createElement('thead');
  let headerHtml = '<tr><th>Asset</th>';
  stats.tickers.forEach(t => {
    headerHtml += `<th style="text-align: center;">${t}</th>`;
  });
  headerHtml += '</tr>';
  thead.innerHTML = headerHtml;
  elements.tableCorrelationMatrix.appendChild(thead);

  // Tbody
  const tbody = document.createElement('tbody');
  stats.tickers.forEach((rowTicker, i) => {
    const tr = document.createElement('tr');
    let rowHtml = `<td><strong>${rowTicker}</strong></td>`;

    stats.tickers.forEach((colTicker, j) => {
      const r = stats.correlationMatrix[i][j];
      // Color cell based on correlation
      let bg = 'rgba(255, 255, 255, 0.04)';
      let textCol = '#f1f5f9';

      if (i === j) {
        bg = 'rgba(56, 189, 248, 0.2)';
        textCol = '#38bdf8';
      } else if (r > 0.5) {
        bg = `rgba(244, 63, 94, ${Math.min(0.5, (r - 0.5) * 0.8)})`;
      } else if (r < 0.1) {
        bg = `rgba(52, 211, 153, ${Math.min(0.5, (0.5 - r) * 0.8)})`;
      }

      rowHtml += `<td class="corr-cell" style="background:${bg}; color:${textCol};">${r.toFixed(3)}</td>`;
    });

    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });
  elements.tableCorrelationMatrix.appendChild(tbody);
}

function renderFrontierScheduleTable(frontierResult, stats) {
  if (!elements.tableFrontierSchedule) return;
  elements.tableFrontierSchedule.innerHTML = '';

  const { frontier, tangencyPortfolio, gmvPortfolio } = frontierResult;

  // Thead
  const thead = document.createElement('thead');
  let headerHtml = '<tr><th>#</th>';
  stats.tickers.forEach(t => {
    headerHtml += `<th class="num">${t}</th>`;
  });
  headerHtml += `
    <th class="num">Expected Return</th>
    <th class="num">Volatility (SD)</th>
    <th class="num">Sharpe Ratio</th>
  </tr>`;
  thead.innerHTML = headerHtml;
  elements.tableFrontierSchedule.appendChild(thead);

  // Tbody
  const tbody = document.createElement('tbody');
  frontier.forEach((port, idx) => {
    const isTan = Math.abs(port.volatility - tangencyPortfolio.volatility) < 1e-4;
    const isGmv = Math.abs(port.volatility - gmvPortfolio.volatility) < 1e-4;

    const tr = document.createElement('tr');
    if (isTan || isGmv) tr.className = 'highlight-row';

    let badge = `#${idx + 1}`;
    if (isTan) badge += ' ⭐ Max Sharpe';
    else if (isGmv) badge += ' 🛡️ GMV';

    let rowHtml = `<td><strong>${badge}</strong></td>`;
    stats.tickers.forEach((t, aIdx) => {
      rowHtml += `<td class="num">${(port.weights[aIdx] * 100).toFixed(1)}%</td>`;
    });

    rowHtml += `
      <td class="num" style="color:#34d399; font-weight:600;">${(port.expectedReturn * 100).toFixed(2)}%</td>
      <td class="num">${(port.volatility * 100).toFixed(2)}%</td>
      <td class="num" style="color:#facc15; font-weight:600;">${port.sharpeRatio.toFixed(3)}</td>
    `;

    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });

  elements.tableFrontierSchedule.appendChild(tbody);
}

// Kickoff
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
