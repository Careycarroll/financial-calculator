/**
 * Black-Litterman Model Studio UI Controller
 * Manages benchmark universe, interactive investor views builder,
 * real-time Bayesian optimization, and High-DPI comparison canvas charts.
 */

import {
  computeAssetStatistics,
  solveBlackLitterman,
  findCommonDateRange
} from './optimization-engine.js';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import { openAssetModal } from '../js/asset-modal.js';
import { getAllFundsSync, subscribeSessionFunds } from '../js/session-funds.js';
import { rafThrottle, formatCurrency } from '../js/chart-utils.js';

// Color Palette
const ASSET_PALETTE = [
  '#38bdf8', '#34d399', '#fbbf24', '#f43f5e', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// Presets mapping
const OPT_PRESETS = {
  'core-two': [
    { ticker: 'VOO', weight: 60 },
    { ticker: 'BND', weight: 40 }
  ],
  'three-fund': [
    { ticker: 'VOO', weight: 50 },
    { ticker: 'SCHD', weight: 25 },
    { ticker: 'BND', weight: 25 }
  ],
  'growth-four': [
    { ticker: 'VOO', weight: 40 },
    { ticker: 'QQQ', weight: 25 },
    { ticker: 'SCHD', weight: 20 },
    { ticker: 'BND', weight: 15 }
  ],
  'equities': [
    { ticker: 'VOO', weight: 50 },
    { ticker: 'QQQ', weight: 30 },
    { ticker: 'SCHD', weight: 20 }
  ]
};

// Reactive State
const state = {
  selectedAssets: [
    { ticker: 'VOO', weight: 50 },
    { ticker: 'BND', weight: 30 },
    { ticker: 'QQQ', weight: 20 }
  ],
  expectedMarketReturn: 0.08,
  riskFreeRate: 0.03,
  tau: 0.05,
  views: [
    {
      id: 1,
      type: 'absolute',
      ticker1: 'QQQ',
      ticker2: null,
      expectedReturn: 0.16,
      confidence: 0.75
    }
  ],
  nextViewId: 2,
  lastStats: null,
  lastBLResult: null
};

// DOM Elements
const elements = {
  // Status Bar
  statusTimelineRange: document.getElementById('status-timeline-range'),
  statusTotalMonths: document.getElementById('status-total-months'),
  statusDeltaVal: document.getElementById('status-delta-val'),
  statusViewsCount: document.getElementById('status-views-count'),
  statusTauVal: document.getElementById('status-tau-val'),
  btnToggleConfig: document.getElementById('btn-toggle-config-panel'),
  configCard: document.getElementById('config-card'),
  btnConfigIcon: document.getElementById('btn-config-icon'),
  btnConfigText: document.getElementById('btn-config-text'),

  // Config Step 1
  tableBenchmarkBody: document.getElementById('benchmark-rows-body'),
  btnOpenModal: document.getElementById('btn-open-asset-modal'),
  lblBenchmarkSum: document.getElementById('lbl-benchmark-sum'),
  inputMarketReturn: document.getElementById('bl-market-return'),
  inputRf: document.getElementById('bl-rf-input'),
  inputTau: document.getElementById('bl-tau-input'),

  // Config Step 2: Views
  viewsContainer: document.getElementById('views-list-container'),
  btnAddView: document.getElementById('btn-add-view'),
  btnRunBL: document.getElementById('btn-run-bl'),

  // Scorecards
  blMetricReturn: document.getElementById('bl-metric-return'),
  blMetricVol: document.getElementById('bl-metric-vol'),
  blMetricSharpe: document.getElementById('bl-metric-sharpe'),
  canvasDonutBl: document.getElementById('canvas-donut-bl'),
  blWeightsList: document.getElementById('bl-weights-list'),

  bmMetricReturn: document.getElementById('bm-metric-return'),
  bmMetricVol: document.getElementById('bm-metric-vol'),
  bmMetricSharpe: document.getElementById('bm-metric-sharpe'),
  canvasDonutBm: document.getElementById('canvas-donut-bm'),
  bmWeightsList: document.getElementById('bm-weights-list'),

  // Charts
  containerTiltsChart: document.getElementById('container-tilts-chart'),
  canvasTiltsChart: document.getElementById('canvas-tilts-chart'),
  tooltipTilts: document.getElementById('tooltip-tilts'),

  containerReturnsChart: document.getElementById('container-returns-chart'),
  canvasReturnsChart: document.getElementById('canvas-returns-chart'),
  tooltipReturns: document.getElementById('tooltip-returns'),

  // Table
  tableBlDetails: document.getElementById('table-bl-details')
};

// -------------------------------------------------------------------
// Helper: Get Fund Objects
// -------------------------------------------------------------------
function getActiveFundObjects() {
  const allFunds = getAllFundsSync();
  const fundMap = new Map();

  PRESET_BENCHMARKS.forEach(f => fundMap.set(f.ticker.toUpperCase(), f));
  allFunds.forEach(f => fundMap.set(f.ticker.toUpperCase(), f));

  return state.selectedAssets
    .map(a => fundMap.get(a.ticker.toUpperCase()))
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

  // Add Asset modal
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

  // Add View button
  if (elements.btnAddView) {
    elements.btnAddView.addEventListener('click', () => {
      addNewView();
    });
  }

  // Run BL button
  if (elements.btnRunBL) {
    elements.btnRunBL.addEventListener('click', () => {
      syncInputsToState();
      runBlackLitterman();
    });
  }

  // Model parameters inputs
  if (elements.inputMarketReturn) {
    elements.inputMarketReturn.addEventListener('change', () => {
      state.expectedMarketReturn = (parseFloat(elements.inputMarketReturn.value) || 8.0) / 100;
    });
  }

  if (elements.inputRf) {
    elements.inputRf.addEventListener('change', () => {
      state.riskFreeRate = Math.max(0, (parseFloat(elements.inputRf.value) || 3.0) / 100);
    });
  }

  if (elements.inputTau) {
    elements.inputTau.addEventListener('change', () => {
      state.tau = Math.max(0.001, parseFloat(elements.inputTau.value) || 0.05);
      if (elements.statusTauVal) elements.statusTauVal.textContent = state.tau.toFixed(2);
    });
  }

  // Subscribe to session fund updates
  subscribeSessionFunds(() => {
    renderBenchmarkTable();
    updateTimelineStatus();
  });

  // Resize handler
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.lastBLResult) {
        renderTiltsChart();
        renderReturnsChart();
        renderDonuts();
      }
    }, 250);
  });

  // Initial setup
  renderBenchmarkTable();
  renderViewsList();
  updateTimelineStatus();
  runBlackLitterman();
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
function applyPreset(presetAssets) {
  state.selectedAssets = presetAssets.map(a => ({ ticker: a.ticker, weight: a.weight }));
  // Validate views tickers
  const validTickers = state.selectedAssets.map(a => a.ticker);
  state.views = state.views.filter(v => validTickers.includes(v.ticker1) && (!v.ticker2 || validTickers.includes(v.ticker2)));
  if (state.views.length === 0 && validTickers.length >= 1) {
    state.views.push({
      id: state.nextViewId++,
      type: 'absolute',
      ticker1: validTickers[0],
      ticker2: null,
      expectedReturn: 0.14,
      confidence: 0.70
    });
  }

  renderBenchmarkTable();
  renderViewsList();
  updateTimelineStatus();
  runBlackLitterman();
}

function addAsset(ticker) {
  const normTicker = ticker.toUpperCase();
  if (!state.selectedAssets.some(a => a.ticker === normTicker)) {
    state.selectedAssets.push({ ticker: normTicker, weight: 10 });
    normalizeBenchmarkWeights();
    renderBenchmarkTable();
    renderViewsList();
    updateTimelineStatus();
    runBlackLitterman();
  }
}

function removeAsset(ticker) {
  if (state.selectedAssets.length <= 2) {
    alert('At least 2 benchmark assets are required for the Black-Litterman model.');
    return;
  }
  const normTicker = ticker.toUpperCase();
  state.selectedAssets = state.selectedAssets.filter(a => a.ticker !== normTicker);
  state.views = state.views.filter(v => v.ticker1 !== normTicker && v.ticker2 !== normTicker);
  normalizeBenchmarkWeights();
  renderBenchmarkTable();
  renderViewsList();
  updateTimelineStatus();
  runBlackLitterman();
}

function normalizeBenchmarkWeights() {
  const total = state.selectedAssets.reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0);
  if (total > 0) {
    state.selectedAssets.forEach(a => {
      a.weight = Math.round((a.weight / total) * 100);
    });
  }
}

function updateTimelineStatus() {
  const funds = getActiveFundObjects();
  if (funds.length < 2) return;
  const common = findCommonDateRange(funds);
  elements.statusTimelineRange.textContent = `${common.start} to ${common.end}`;
  elements.statusTotalMonths.textContent = `(${common.totalMonths} Months)`;
}

// -------------------------------------------------------------------
// Render Step 1: Benchmark Table
// -------------------------------------------------------------------
function renderBenchmarkTable() {
  if (!elements.tableBenchmarkBody) return;
  elements.tableBenchmarkBody.innerHTML = '';

  const funds = getActiveFundObjects();
  let totalWeight = 0;

  state.selectedAssets.forEach((asset, idx) => {
    const fund = funds.find(f => f.ticker.toUpperCase() === asset.ticker);
    const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
    totalWeight += parseFloat(asset.weight) || 0;

    let retText = '--';
    let volText = '--';
    if (fund && fund.data && fund.data.length > 12) {
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
          <span>${asset.ticker}</span>
          <span class="status-sub" style="font-weight: 400; margin-left: 0.25rem;">${fund ? fund.name : ''}</span>
        </div>
      </td>
      <td style="text-align: right;">
        <input type="number" class="weight-input bm-weight-input" data-ticker="${asset.ticker}" value="${asset.weight}" min="0" max="100" step="5" />%
      </td>
      <td style="text-align: right; color: #34d399; font-weight: 600;">${retText}</td>
      <td style="text-align: right; color: #94a3b8; font-weight: 600;">${volText}</td>
      <td style="text-align: center;">
        <button type="button" class="btn-remove-asset" data-ticker="${asset.ticker}" title="Remove asset">✕</button>
      </td>
    `;
    elements.tableBenchmarkBody.appendChild(tr);
  });

  if (elements.lblBenchmarkSum) {
    elements.lblBenchmarkSum.textContent = `Total Benchmark Allocation: ${totalWeight.toFixed(1)}%`;
    elements.lblBenchmarkSum.style.color = Math.abs(totalWeight - 100) < 0.1 ? '#34d399' : '#facc15';
  }

  // Bind inputs
  elements.tableBenchmarkBody.querySelectorAll('.bm-weight-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const ticker = e.target.dataset.ticker;
      const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
      e.target.value = val;
      const asset = state.selectedAssets.find(a => a.ticker === ticker);
      if (asset) asset.weight = val;

      const sum = state.selectedAssets.reduce((s, a) => s + (parseFloat(a.weight) || 0), 0);
      elements.lblBenchmarkSum.textContent = `Total Benchmark Allocation: ${sum.toFixed(1)}%`;
      elements.lblBenchmarkSum.style.color = Math.abs(sum - 100) < 0.1 ? '#34d399' : '#facc15';
    });
  });

  // Bind removes
  elements.tableBenchmarkBody.querySelectorAll('.btn-remove-asset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.target.dataset.ticker;
      removeAsset(ticker);
    });
  });
}

// -------------------------------------------------------------------
// Render Step 2: Views List Builder
// -------------------------------------------------------------------
function addNewView() {
  const tickers = state.selectedAssets.map(a => a.ticker);
  if (tickers.length === 0) return;

  state.views.push({
    id: state.nextViewId++,
    type: 'absolute',
    ticker1: tickers[0],
    ticker2: tickers.length > 1 ? tickers[1] : null,
    expectedReturn: 0.12,
    confidence: 0.70
  });

  renderViewsList();
}

function removeView(viewId) {
  state.views = state.views.filter(v => v.id !== viewId);
  renderViewsList();
}

function renderViewsList() {
  if (!elements.viewsContainer) return;
  elements.viewsContainer.innerHTML = '';

  const tickers = state.selectedAssets.map(a => a.ticker);
  elements.statusViewsCount.textContent = `${state.views.length} Active Views`;

  if (state.views.length === 0) {
    elements.viewsContainer.innerHTML = `
      <div style="color: #64748b; font-size: 0.85rem; padding: 0.5rem 0;">
        No investor views added. The model will revert strictly to the CAPM equilibrium market benchmark.
      </div>
    `;
    return;
  }

  state.views.forEach((v, vIdx) => {
    const card = document.createElement('div');
    card.className = 'view-card-item';

    const optionsT1 = tickers.map(t => `<option value="${t}" ${t === v.ticker1 ? 'selected' : ''}>${t}</option>`).join('');
    const optionsT2 = tickers.map(t => `<option value="${t}" ${t === v.ticker2 ? 'selected' : ''}>${t}</option>`).join('');

    card.innerHTML = `
      <div class="view-field">
        <strong style="color: #facc15;">View #${vIdx + 1}:</strong>
        <select class="setting-select view-type-select" data-id="${v.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
          <option value="absolute" ${v.type === 'absolute' ? 'selected' : ''}>Absolute Return</option>
          <option value="relative" ${v.type === 'relative' ? 'selected' : ''}>Relative Outperformance</option>
        </select>
      </div>

      <div class="view-field">
        <select class="setting-select view-t1-select" data-id="${v.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
          ${optionsT1}
        </select>
        <span class="view-rel-text" style="color: #94a3b8; font-weight: 600; display: ${v.type === 'relative' ? 'inline' : 'none'};">will outperform</span>
        <select class="setting-select view-t2-select" data-id="${v.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; display: ${v.type === 'relative' ? 'inline' : 'none'};">
          ${optionsT2}
        </select>
        <span style="color: #94a3b8;">by</span>
        <input type="number" class="weight-input view-ret-input" data-id="${v.id}" value="${(v.expectedReturn * 100).toFixed(1)}" step="0.5" style="width: 70px;" />%
      </div>

      <div class="view-field confidence-slider-wrap">
        <span style="color: #94a3b8; font-size: 0.75rem;">Confidence:</span>
        <input type="range" class="confidence-slider view-conf-slider" data-id="${v.id}" min="10" max="95" value="${Math.round(v.confidence * 100)}" />
        <strong class="view-conf-label" style="color: #38bdf8; font-size: 0.8rem; width: 35px; text-align: right;">${Math.round(v.confidence * 100)}%</strong>
      </div>

      <button type="button" class="btn-remove-asset btn-remove-view" data-id="${v.id}" title="Remove view" style="margin-left: auto;">✕</button>
    `;

    elements.viewsContainer.appendChild(card);
  });

  // Bind events on view controls
  elements.viewsContainer.querySelectorAll('.view-type-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      const view = state.views.find(v => v.id === id);
      if (view) {
        view.type = e.target.value;
        renderViewsList();
      }
    });
  });

  elements.viewsContainer.querySelectorAll('.view-t1-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      const view = state.views.find(v => v.id === id);
      if (view) view.ticker1 = e.target.value;
    });
  });

  elements.viewsContainer.querySelectorAll('.view-t2-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      const view = state.views.find(v => v.id === id);
      if (view) view.ticker2 = e.target.value;
    });
  });

  elements.viewsContainer.querySelectorAll('.view-ret-input').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      const view = state.views.find(v => v.id === id);
      if (view) view.expectedReturn = (parseFloat(e.target.value) || 10.0) / 100;
    });
  });

  elements.viewsContainer.querySelectorAll('.view-conf-slider').forEach(sld => {
    sld.addEventListener('input', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      const view = state.views.find(v => v.id === id);
      const val = parseInt(e.target.value, 10);
      if (view) {
        view.confidence = val / 100;
        const parent = sld.closest('.confidence-slider-wrap');
        if (parent) {
          const lbl = parent.querySelector('.view-conf-label');
          if (lbl) lbl.textContent = `${val}%`;
        }
      }
    });
  });

  elements.viewsContainer.querySelectorAll('.btn-remove-view').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      removeView(id);
    });
  });
}

function syncInputsToState() {
  if (elements.inputMarketReturn) {
    state.expectedMarketReturn = (parseFloat(elements.inputMarketReturn.value) || 8.0) / 100;
  }
  if (elements.inputRf) {
    state.riskFreeRate = Math.max(0, (parseFloat(elements.inputRf.value) || 3.0) / 100);
  }
  if (elements.inputTau) {
    state.tau = Math.max(0.001, parseFloat(elements.inputTau.value) || 0.05);
  }
}

// -------------------------------------------------------------------
// Core Execution Pipeline
// -------------------------------------------------------------------
function runBlackLitterman() {
  const funds = getActiveFundObjects();
  if (funds.length < 2) {
    alert('Please select at least 2 assets.');
    return;
  }

  syncInputsToState();

  // Normalize benchmark weights
  const totalWeight = state.selectedAssets.reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0);
  if (totalWeight <= 0) {
    alert('Total benchmark allocation must be greater than 0%.');
    return;
  }
  const benchmarkWeights = state.selectedAssets.map(a => (parseFloat(a.weight) || 0) / totalWeight);

  try {
    // 1. Asset Statistics & Covariance
    const stats = computeAssetStatistics(funds, {
      riskFreeRate: state.riskFreeRate
    });
    state.lastStats = stats;

    // 2. Format views to asset indices
    const tickerToIndex = new Map();
    stats.tickers.forEach((t, idx) => tickerToIndex.set(t.toUpperCase(), idx));

    const formattedViews = [];
    state.views.forEach(v => {
      const idx1 = tickerToIndex.get(v.ticker1.toUpperCase());
      const idx2 = v.ticker2 ? tickerToIndex.get(v.ticker2.toUpperCase()) : null;

      if (idx1 !== undefined) {
        if (v.type === 'relative' && idx2 !== undefined && idx1 !== idx2) {
          formattedViews.push({
            type: 'relative',
            assetIndex1: idx1,
            assetIndex2: idx2,
            expectedReturn: v.expectedReturn,
            confidence: v.confidence
          });
        } else if (v.type === 'absolute') {
          formattedViews.push({
            type: 'absolute',
            assetIndex1: idx1,
            expectedReturn: v.expectedReturn,
            confidence: v.confidence
          });
        }
      }
    });

    // 3. Solve Black-Litterman
    const blResult = solveBlackLitterman({
      benchmarkWeights,
      covarianceMatrix: stats.covarianceMatrix,
      expectedMarketReturn: state.expectedMarketReturn,
      riskFreeRate: state.riskFreeRate,
      tau: state.tau,
      views: formattedViews
    });
    state.lastBLResult = blResult;

    // 4. Update Status Bar
    if (elements.statusDeltaVal) elements.statusDeltaVal.textContent = blResult.delta.toFixed(2);
    if (elements.statusViewsCount) elements.statusViewsCount.textContent = `${formattedViews.length} Active Views`;

    // 5. Update UI Components
    renderScorecards(blResult, stats);
    renderTiltsChart();
    renderReturnsChart();
    renderDecompositionTable(blResult, stats);

  } catch (err) {
    console.error('Black-Litterman model error:', err);
    alert(`Black-Litterman calculation failed: ${err.message}`);
  }
}

// -------------------------------------------------------------------
// Scorecards & Donut Charts
// -------------------------------------------------------------------
function renderScorecards(blResult, stats) {
  const { optimalStats, benchmarkStats, optimalWeights, benchmarkWeights } = blResult;

  // Optimal BL Card
  elements.blMetricReturn.textContent = `${(optimalStats.expectedReturn * 100).toFixed(2)}%`;
  elements.blMetricVol.textContent = `${(optimalStats.volatility * 100).toFixed(2)}%`;
  elements.blMetricSharpe.textContent = optimalStats.sharpeRatio.toFixed(3);

  // Benchmark Prior Card
  elements.bmMetricReturn.textContent = `${(benchmarkStats.expectedReturn * 100).toFixed(2)}%`;
  elements.bmMetricVol.textContent = `${(benchmarkStats.volatility * 100).toFixed(2)}%`;
  elements.bmMetricSharpe.textContent = benchmarkStats.sharpeRatio.toFixed(3);

  // BL Weights list
  elements.blWeightsList.innerHTML = '';
  stats.tickers.forEach((ticker, idx) => {
    const weight = optimalWeights[idx];
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
      elements.blWeightsList.appendChild(row);
    }
  });

  // Benchmark Weights list
  elements.bmWeightsList.innerHTML = '';
  stats.tickers.forEach((ticker, idx) => {
    const weight = benchmarkWeights[idx];
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
      elements.bmWeightsList.appendChild(row);
    }
  });

  renderDonuts();
}

function renderDonuts() {
  if (!state.lastBLResult) return;
  drawDonut(elements.canvasDonutBl, state.lastBLResult.optimalWeights);
  drawDonut(elements.canvasDonutBm, state.lastBLResult.benchmarkWeights);
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
  ctx.fillText('WEIGHTS', cx, cy + 9);
}

// -------------------------------------------------------------------
// Allocation Weights & Active Tilts Chart
// -------------------------------------------------------------------
function renderTiltsChart() {
  const canvas = elements.canvasTiltsChart;
  const container = elements.containerTiltsChart;
  if (!canvas || !container || !state.lastBLResult || !state.lastStats) return;

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
  const bl = state.lastBLResult;
  const numAssets = stats.numAssets;

  ctx.clearRect(0, 0, width, height);

  // Y-axis grid (-50% to +100%)
  const minY = -0.40;
  const maxY = 1.00;
  const yToPix = (y) => pad.top + plotH - ((y - minY) / (maxY - minY)) * plotH;
  const zeroY = yToPix(0);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let pct = minY; pct <= maxY; pct += 0.2) {
    const py = yToPix(pct);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(pct * 100).toFixed(0)}%`, pad.left - 8, py);
  }

  // Draw prominent 0.0 baseline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(pad.left + plotW, zeroY);
  ctx.stroke();

  // 3 bars per asset:
  // 1. Benchmark Weight (#94a3b8)
  // 2. Black-Litterman Weight (#38bdf8)
  // 3. Active Tilt (+Δw green, -Δw red)
  const groupW = plotW / numAssets;
  const barW = Math.max(10, Math.min(28, (groupW * 0.70) / 3));
  const innerPad = 3;

  const barsData = [];

  for (let i = 0; i < numAssets; i++) {
    const groupCenter = pad.left + (i + 0.5) * groupW;
    const startX = groupCenter - 1.5 * (barW + innerPad);

    const tilt = bl.activeTilts[i];
    const tiltColor = tilt >= 0 ? '#34d399' : '#f43f5e';

    const values = [
      { val: bl.benchmarkWeights[i], color: '#94a3b8', label: 'Benchmark Weight' },
      { val: bl.optimalWeights[i], color: '#38bdf8', label: 'Black-Litterman Weight' },
      { val: tilt, color: tiltColor, label: 'Active Tilt (Δw)' }
    ];

    values.forEach((v, bIdx) => {
      const bx = startX + bIdx * (barW + innerPad);
      let by, bHeight;

      if (v.val >= 0) {
        by = yToPix(v.val);
        bHeight = zeroY - by;
      } else {
        by = zeroY;
        bHeight = yToPix(v.val) - zeroY;
      }

      ctx.fillStyle = v.color;
      ctx.fillRect(bx, by, barW, Math.max(1, bHeight));

      barsData.push({
        x: bx,
        y: by,
        w: barW,
        h: Math.max(1, bHeight),
        ticker: stats.tickers[i],
        label: v.label,
        val: v.val,
        color: v.color
      });
    });

    // Ticker label
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
      elements.tooltipTilts.innerHTML = `
        <div style="font-weight:700; color:${hit.color}; margin-bottom:2px;">${hit.ticker}</div>
        <div>${hit.label}: <strong>${hit.val >= 0 ? '+' : ''}${(hit.val * 100).toFixed(2)}%</strong></div>
      `;
      elements.tooltipTilts.style.left = `${Math.min(width - 180, mouseX + 15)}px`;
      elements.tooltipTilts.style.top = `${Math.max(10, mouseY - 25)}px`;
      elements.tooltipTilts.style.display = 'block';
    } else {
      elements.tooltipTilts.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipTilts.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Prior vs. Posterior Returns Chart
// -------------------------------------------------------------------
function renderReturnsChart() {
  const canvas = elements.canvasReturnsChart;
  const container = elements.containerReturnsChart;
  if (!canvas || !container || !state.lastBLResult || !state.lastStats) return;

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
  const bl = state.lastBLResult;
  const numAssets = stats.numAssets;

  ctx.clearRect(0, 0, width, height);

  let maxRet = Math.max(...bl.priorReturns, ...bl.posteriorReturns) * 1.25;
  let minRet = Math.min(0, ...bl.priorReturns, ...bl.posteriorReturns) * 1.1;

  maxRet = Math.ceil(maxRet * 100) / 100;
  minRet = Math.floor(minRet * 100) / 100;

  const yToPix = (y) => pad.top + plotH - ((y - minRet) / (maxRet - minRet)) * plotH;
  const zeroY = yToPix(0);

  // Y-axis grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const stepY = (maxRet - minRet) / 5;
  for (let s = 0; s <= 5; s++) {
    const val = minRet + s * stepY;
    const py = yToPix(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(val * 100).toFixed(1)}%`, pad.left - 8, py);
  }

  // Draw 2 bars per asset:
  // 1. Prior Equilibrium Return (#94a3b8)
  // 2. Posterior Return (#facc15)
  const groupW = plotW / numAssets;
  const barW = Math.max(12, Math.min(32, (groupW * 0.60) / 2));
  const innerPad = 4;

  const barsData = [];

  for (let i = 0; i < numAssets; i++) {
    const groupCenter = pad.left + (i + 0.5) * groupW;
    const startX = groupCenter - (barW + innerPad / 2);

    const values = [
      { val: bl.priorReturns[i], color: '#94a3b8', label: 'Prior Equilibrium Return (Π + Rf)' },
      { val: bl.posteriorReturns[i], color: '#facc15', label: 'Posterior Expected Return (μ_BL)' }
    ];

    values.forEach((v, bIdx) => {
      const bx = startX + bIdx * (barW + innerPad);
      const by = yToPix(v.val);
      const bHeight = Math.max(1, zeroY - by);

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
      elements.tooltipReturns.innerHTML = `
        <div style="font-weight:700; color:${hit.color}; margin-bottom:2px;">${hit.ticker}</div>
        <div>${hit.label}: <strong>${(hit.val * 100).toFixed(2)}%</strong></div>
      `;
      elements.tooltipReturns.style.left = `${Math.min(width - 180, mouseX + 15)}px`;
      elements.tooltipReturns.style.top = `${Math.max(10, mouseY - 25)}px`;
      elements.tooltipReturns.style.display = 'block';
    } else {
      elements.tooltipReturns.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipReturns.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Detailed Decomposition Table
// -------------------------------------------------------------------
function renderDecompositionTable(blResult, stats) {
  if (!elements.tableBlDetails) return;
  elements.tableBlDetails.innerHTML = '';

  const { benchmarkWeights, optimalWeights, activeTilts, priorReturns, posteriorReturns } = blResult;

  // Thead
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>#</th>
      <th>Asset Ticker / Name</th>
      <th class="num">Benchmark Weight</th>
      <th class="num">Black-Litterman Weight</th>
      <th class="num">Active Tilt (Δw)</th>
      <th class="num">Prior Return (Π + Rf)</th>
      <th class="num">Posterior Return (μ_BL)</th>
      <th class="num">Return Shift (Δμ)</th>
    </tr>
  `;
  elements.tableBlDetails.appendChild(thead);

  // Tbody
  const tbody = document.createElement('tbody');
  stats.tickers.forEach((ticker, idx) => {
    const tilt = activeTilts[idx];
    const tiltClass = tilt >= 0.0001 ? 'tilt-badge-pos' : (tilt <= -0.0001 ? 'tilt-badge-neg' : '');
    const retShift = posteriorReturns[idx] - priorReturns[idx];
    const shiftClass = retShift >= 0.0001 ? 'tilt-badge-pos' : (retShift <= -0.0001 ? 'tilt-badge-neg' : '');

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
      <td class="num" style="color:#94a3b8;">${(benchmarkWeights[idx] * 100).toFixed(1)}%</td>
      <td class="num" style="color:#38bdf8; font-weight:700;">${(optimalWeights[idx] * 100).toFixed(1)}%</td>
      <td class="num ${tiltClass}">${tilt >= 0 ? '+' : ''}${(tilt * 100).toFixed(2)}%</td>
      <td class="num" style="color:#94a3b8;">${(priorReturns[idx] * 100).toFixed(2)}%</td>
      <td class="num" style="color:#facc15; font-weight:700;">${(posteriorReturns[idx] * 100).toFixed(2)}%</td>
      <td class="num ${shiftClass}">${retShift >= 0 ? '+' : ''}${(retShift * 100).toFixed(2)}%</td>
    `;
    tbody.appendChild(tr);
  });

  elements.tableBlDetails.appendChild(tbody);
}

// Kickoff
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
