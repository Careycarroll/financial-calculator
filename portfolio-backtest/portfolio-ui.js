/**
 * Portfolio Backtest Studio UI Controller
 * Manages side-by-side portfolio allocation models, interactive configuration,
 * unified asset modal integration, and High-DPI canvas charts.
 */

import {
  PORTFOLIO_PRESETS,
  validateAllocations,
  runMultiPortfolioBacktest
} from './portfolio-engine.js';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import { openAssetModal } from '../js/asset-modal.js';
import { getAllFundsSync, subscribeSessionFunds } from '../js/session-funds.js';

// Color Palette for assets in donut and drift charts
const ASSET_PALETTE = [
  '#38bdf8', '#34d399', '#fbbf24', '#f43f5e', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// App Reactive State
const state = {
  benchmarkTicker: 'VOO',
  activeCfgTab: 'assets', // 'assets' | 'settings'
  isConfigCollapsed: false,
  growthScale: 'linear', // 'linear' | 'log'
  driftPortfolioId: 'p1',

  settings: {
    rebalancing: 'annual',
    initialCapital: 10000,
    useDRIP: true,
    cashflowType: 'none',
    cashflowAmount: 500,
    cashflowFreq: 'monthly'
  },

  models: {
    p1: { id: 'p1', name: 'Portfolio #1', color: '#38bdf8' },
    p2: { id: 'p2', name: 'Portfolio #2', color: '#34d399' },
    p3: { id: 'p3', name: 'Portfolio #3', color: '#fbbf24' }
  },

  // Default Asset Table Rows: Classic 60/40 vs Aggressive 80/20
  rows: [
    { id: 'row-1', ticker: 'VOO', p1: 60, p2: 50, p3: 0 },
    { id: 'row-2', ticker: 'BND', p1: 40, p2: 20, p3: 0 },
    { id: 'row-3', ticker: 'QQQ', p1: 0, p2: 30, p3: 0 },
    { id: 'row-4', ticker: 'SCHD', p1: 0, p2: 0, p3: 0 }
  ],

  simulationResult: null
};

// DOM Element Cache
let elements = {};

function cacheDOMElements() {
  elements = {
    // Status Bar
    statusTimelineRange: document.getElementById('status-timeline-range'),
    statusTotalMonths: document.getElementById('status-total-months'),
    statusLimitingAsset: document.getElementById('status-limiting-asset'),
    statusRebalanceFreq: document.getElementById('status-rebalance-freq'),
    btnToggleConfig: document.getElementById('btn-toggle-config-panel'),
    btnConfigText: document.getElementById('btn-config-text'),
    configPanel: document.getElementById('config-panel'),
    alertsContainer: document.getElementById('portfolio-alerts-container'),

    // Config Tabs
    tabBtnAssets: document.getElementById('tab-btn-cfg-assets'),
    tabBtnSettings: document.getElementById('tab-btn-cfg-settings'),
    paneAssets: document.getElementById('cfg-pane-assets'),
    paneSettings: document.getElementById('cfg-pane-settings'),

    // Assets Pane
    btnSelectBenchmark: document.getElementById('btn-select-benchmark'),
    benchTickerLabel: document.getElementById('bench-ticker-label'),
    benchNameLabel: document.getElementById('bench-name-label'),
    allocationsTbody: document.getElementById('allocations-tbody'),
    btnAddAssetRow: document.getElementById('btn-add-asset-row'),
    btnClearAllocations: document.getElementById('btn-clear-allocations'),
    btnRunBacktest: document.getElementById('btn-run-backtest'),

    inputP1Name: document.getElementById('input-p1-name'),
    inputP2Name: document.getElementById('input-p2-name'),
    inputP3Name: document.getElementById('input-p3-name'),

    totalValP1: document.getElementById('total-val-p1'),
    totalValP2: document.getElementById('total-val-p2'),
    totalValP3: document.getElementById('total-val-p3'),
    totalStatusP1: document.getElementById('total-status-p1'),
    totalStatusP2: document.getElementById('total-status-p2'),
    totalStatusP3: document.getElementById('total-status-p3'),

    // Settings Pane
    selectRebalanceFreq: document.getElementById('select-rebalance-freq'),
    inputInitialCapital: document.getElementById('input-initial-capital'),
    selectDrip: document.getElementById('select-drip'),
    selectCashflowType: document.getElementById('select-cashflow-type'),
    inputCashflowAmount: document.getElementById('input-cashflow-amount'),
    selectCashflowFreq: document.getElementById('select-cashflow-freq'),

    // Results
    donutsContainer: document.getElementById('donuts-container'),
    scorecardThead: document.getElementById('scorecard-thead'),
    scorecardTbody: document.getElementById('scorecard-tbody'),
    btnExportCsv: document.getElementById('btn-export-csv'),

    btnScaleLinear: document.getElementById('btn-scale-linear'),
    btnScaleLog: document.getElementById('btn-scale-log'),
    growthCanvas: document.getElementById('growth-canvas'),
    growthTooltip: document.getElementById('growth-tooltip'),
    growthLegendBar: document.getElementById('growth-legend-bar'),

    annualCanvas: document.getElementById('annual-canvas'),
    annualTooltip: document.getElementById('annual-tooltip'),
    annualLegendBar: document.getElementById('annual-legend-bar'),

    drawdownCanvas: document.getElementById('drawdown-canvas'),
    drawdownTooltip: document.getElementById('drawdown-tooltip'),
    drawdownLegendBar: document.getElementById('drawdown-legend-bar'),

    selectDriftPortfolio: document.getElementById('select-drift-portfolio'),
    driftCanvas: document.getElementById('drift-canvas'),
    driftTooltip: document.getElementById('drift-tooltip'),
    driftLegendBar: document.getElementById('drift-legend-bar')
  };
}

// -------------------------------------------------------------------
// Helper Utilities
// -------------------------------------------------------------------
function hexToRgba(hex, alpha = 0.2) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
  if (elements.alertsContainer) {
    elements.alertsContainer.innerHTML = '';
  }
}

// -------------------------------------------------------------------
// Allocation Table Rendering & Weight Synchronization
// -------------------------------------------------------------------
function renderAllocationTable() {
  if (!elements.allocationsTbody) return;
  elements.allocationsTbody.innerHTML = '';

  const allFunds = getAllFundsSync();
  const fundMap = new Map(allFunds.map(f => [f.ticker.toUpperCase(), f]));

  state.rows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.rowId = row.id;

    const fundObj = fundMap.get(row.ticker.toUpperCase());
    const fundName = fundObj ? fundObj.name : 'Custom Asset';
    const fundColor = fundObj ? (fundObj.color || ASSET_PALETTE[idx % ASSET_PALETTE.length]) : ASSET_PALETTE[idx % ASSET_PALETTE.length];

    tr.innerHTML = `
      <td>
        <button type="button" class="asset-cell-btn" data-action="pick-asset" data-row-idx="${idx}">
          <span class="picker-dot" style="background: ${fundColor};"></span>
          <strong style="color: #f1f5f9; min-width: 45px;">${row.ticker}</strong>
          <span style="color: #94a3b8; font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fundName}</span>
          <span style="margin-left: auto; color: #64748b;">🔍</span>
        </button>
      </td>
      <td class="td-p1">
        <div class="weight-input-wrap">
          <input type="number" class="weight-input" data-col="p1" data-row-idx="${idx}" value="${row.p1}" min="0" max="100" step="1" />
          <span class="weight-suffix">%</span>
        </div>
      </td>
      <td class="td-p2">
        <div class="weight-input-wrap">
          <input type="number" class="weight-input" data-col="p2" data-row-idx="${idx}" value="${row.p2}" min="0" max="100" step="1" />
          <span class="weight-suffix">%</span>
        </div>
      </td>
      <td class="td-p3">
        <div class="weight-input-wrap">
          <input type="number" class="weight-input" data-col="p3" data-row-idx="${idx}" value="${row.p3}" min="0" max="100" step="1" />
          <span class="weight-suffix">%</span>
        </div>
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-remove-row" data-action="remove-row" data-row-idx="${idx}" title="Remove asset row">✕</button>
      </td>
    `;

    elements.allocationsTbody.appendChild(tr);
  });

  updateWeightTotals();
}

function updateWeightTotals() {
  const sumP1 = state.rows.reduce((sum, r) => sum + (parseFloat(r.p1) || 0), 0);
  const sumP2 = state.rows.reduce((sum, r) => sum + (parseFloat(r.p2) || 0), 0);
  const sumP3 = state.rows.reduce((sum, r) => sum + (parseFloat(r.p3) || 0), 0);

  function applyStatus(valEl, statusEl, sum) {
    valEl.textContent = `${sum.toFixed(1)}%`;
    statusEl.className = 'total-status';
    if (sum === 0) {
      statusEl.classList.add('inactive');
      statusEl.textContent = '(Inactive)';
    } else if (Math.abs(sum - 100) < 0.05) {
      statusEl.classList.add('valid');
      statusEl.textContent = '✓ Valid';
    } else {
      statusEl.classList.add('invalid');
      statusEl.textContent = sum < 100 ? `${(100 - sum).toFixed(1)}% Left` : `+${(sum - 100).toFixed(1)}% Over`;
    }
  }

  applyStatus(elements.totalValP1, elements.totalStatusP1, sumP1);
  applyStatus(elements.totalValP2, elements.totalStatusP2, sumP2);
  applyStatus(elements.totalValP3, elements.totalStatusP3, sumP3);
}

// -------------------------------------------------------------------
// Simulation Orchestration
// -------------------------------------------------------------------
function executeBacktest() {
  clearAlerts();

  // Read Model Names
  state.models.p1.name = elements.inputP1Name.value.trim() || 'Portfolio #1';
  state.models.p2.name = elements.inputP2Name.value.trim() || 'Portfolio #2';
  state.models.p3.name = elements.inputP3Name.value.trim() || 'Portfolio #3';

  // Read Settings
  state.settings.rebalancing = elements.selectRebalanceFreq.value;
  state.settings.initialCapital = parseFloat(elements.inputInitialCapital.value) || 10000;
  state.settings.useDRIP = elements.selectDrip.value === 'true';
  state.settings.cashflowType = elements.selectCashflowType.value;
  state.settings.cashflowAmount = parseFloat(elements.inputCashflowAmount.value) || 0;
  state.settings.cashflowFreq = elements.selectCashflowFreq.value;

  // Build model allocations
  const activeModels = [];

  ['p1', 'p2', 'p3'].forEach(col => {
    const allocs = state.rows.map(r => ({
      ticker: r.ticker,
      weight: parseFloat(r[col]) || 0
    })).filter(a => a.weight > 0);

    const validation = validateAllocations(allocs);
    if (validation.valid) {
      activeModels.push({
        id: col,
        name: state.models[col].name,
        color: state.models[col].color,
        allocations: validation.normalized
      });
    }
  });

  if (activeModels.length === 0) {
    showAlert('At least one portfolio model must sum to exactly 100% allocation.');
    return;
  }

  const allFunds = getAllFundsSync();
  const options = {
    initialAmount: state.settings.initialCapital,
    rebalancing: state.settings.rebalancing,
    useDRIP: state.settings.useDRIP,
    cashflow: {
      type: state.settings.cashflowType,
      amount: state.settings.cashflowAmount,
      frequency: state.settings.cashflowFreq
    }
  };

  const res = runMultiPortfolioBacktest(allFunds, activeModels, state.benchmarkTicker, options);

  if (!res || res.error) {
    showAlert(res?.error || 'Simulation could not be completed with selected funds.');
    return;
  }

  state.simulationResult = res;

  // Update Status Summary
  elements.statusTimelineRange.textContent = `${res.startDate} to ${res.endDate}`;
  elements.statusTotalMonths.textContent = `(${res.totalMonths} Months / ${(res.totalMonths / 12).toFixed(1)} Years)`;

  const limitingObj = allFunds.find(f => f.ticker === res.limitingFund);
  elements.statusLimitingAsset.textContent = res.limitingFund ? `${res.limitingFund}` : '--';

  const freqLabels = {
    annual: 'Annual (Dec)',
    'semi-annual': 'Semi-Annual',
    quarterly: 'Quarterly',
    monthly: 'Monthly',
    none: 'No Rebalance (Drift)'
  };
  elements.statusRebalanceFreq.textContent = freqLabels[state.settings.rebalancing] || state.settings.rebalancing;

  // Render Visual Suite
  renderDonutCharts();
  renderScorecardTable();
  drawGrowthChart();
  drawAnnualReturnsChart();
  drawDrawdownChart();
  drawDriftChart();
}

// -------------------------------------------------------------------
// Visualization: Donut Charts
// -------------------------------------------------------------------
function renderDonutCharts() {
  if (!elements.donutsContainer || !state.simulationResult) return;
  elements.donutsContainer.innerHTML = '';

  const { portfolios } = state.simulationResult;
  const allFunds = getAllFundsSync();
  const fundMap = new Map(allFunds.map(f => [f.ticker.toUpperCase(), f]));

  portfolios.forEach(p => {
    const card = document.createElement('div');
    card.className = 'donut-card';

    const canvasId = `donut-canvas-${p.id}`;
    card.innerHTML = `
      <div class="donut-card-header">
        <div class="donut-title-group">
          <span class="model-color-dot" style="background: ${p.color};"></span>
          <span class="donut-title">${p.name}</span>
        </div>
        <span class="donut-asset-badge">${p.allocations.length} ${p.allocations.length === 1 ? 'Asset' : 'Assets'}</span>
      </div>
      <div class="donut-body">
        <div class="donut-canvas-wrap">
          <canvas id="${canvasId}" width="280" height="280" style="width: 140px; height: 140px;"></canvas>
        </div>
        <div class="donut-legend">
          ${p.allocations.map((a, idx) => {
            const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
            const fund = fundMap.get(a.ticker.toUpperCase());
            const fundName = fund ? fund.name : '';
            return `
              <div class="donut-legend-item">
                <div class="donut-legend-left">
                  <span class="donut-legend-dot" style="background: ${color};"></span>
                  <span class="donut-ticker">${a.ticker}</span>
                  ${fundName ? `<span class="donut-fund-name" title="${fundName}">${fundName}</span>` : ''}
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
    const canvas = document.getElementById(canvasId);
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

      p.allocations.forEach((a, idx) => {
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
  });
}

// -------------------------------------------------------------------
// Visualization: Scorecard Table
// -------------------------------------------------------------------
function renderScorecardTable() {
  if (!elements.scorecardThead || !elements.scorecardTbody || !state.simulationResult) return;

  const { portfolios, benchmark } = state.simulationResult;

  // Render Header
  let headHtml = `
    <tr>
      <th style="width: 25%; text-align: left;">Metric</th>
  `;
  portfolios.forEach(p => {
    headHtml += `
      <th style="color: ${p.color}; text-align: right;">
        <span class="model-color-dot" style="background:${p.color}; display:inline-block; margin-right:6px; vertical-align: middle;"></span>
        ${p.name}
      </th>
    `;
  });
  if (benchmark) {
    headHtml += `
      <th style="color: #94a3b8; text-align: right;">
        <span class="model-color-dot" style="background:#64748b; display:inline-block; margin-right:6px; vertical-align: middle;"></span>
        ${benchmark.ticker} Benchmark
      </th>
    `;
  }
  headHtml += `</tr>`;
  elements.scorecardThead.innerHTML = headHtml;

  // Metric definitions with best-performer criteria
  const metricDefs = [
    { label: 'Initial Balance', format: m => formatCurrency(m.initialBalance) },
    {
      label: 'Final Balance',
      format: m => formatCurrency(m.finalBalance),
      bold: true,
      findBest: arr => Math.max(...arr.map(m => m.finalBalance))
    },
    { label: 'Total Contributions', format: m => formatCurrency(m.totalContributed) },
    {
      label: 'Total Net Profit',
      format: m => formatCurrency(m.totalGain),
      bold: true,
      findBest: arr => Math.max(...arr.map(m => m.totalGain))
    },
    {
      label: 'CAGR (Annualized Return)',
      format: m => formatPct(m.cagr),
      bold: true,
      findBest: arr => Math.max(...arr.map(m => m.cagr))
    },
    {
      label: 'Annualized Volatility (Stdev)',
      format: m => formatPct(m.annualVolatility),
      findBest: arr => Math.min(...arr.map(m => m.annualVolatility))
    },
    {
      label: 'Sharpe Ratio (Rf = 3%)',
      format: m => m.sharpeRatio.toFixed(2),
      bold: true,
      findBest: arr => Math.max(...arr.map(m => m.sharpeRatio))
    },
    {
      label: 'Sortino Ratio',
      format: m => m.sortinoRatio.toFixed(2),
      findBest: arr => Math.max(...arr.map(m => m.sortinoRatio))
    },
    {
      label: 'Max Drawdown',
      format: m => `<span style="color:#ef4444; font-weight:700;">${formatPct(m.maxDrawdown)}</span>`,
      findBest: arr => Math.max(...arr.map(m => m.maxDrawdown))
    },
    { label: 'Best Year', format: m => `${m.bestYear.year} (${formatPct(m.bestYear.return)})` },
    { label: 'Worst Year', format: m => `${m.worstYear.year} (${formatPct(m.worstYear.return)})` },
    { label: 'Rebalance Events', format: (m, p) => p ? `${p.rebalanceCount} times` : 'N/A' },
    { label: 'Correlation to Benchmark', format: (m, p) => p && p.correlationToBenchmark !== undefined ? p.correlationToBenchmark.toFixed(2) : '1.00' }
  ];

  let bodyHtml = '';
  metricDefs.forEach(row => {
    bodyHtml += `
      <tr>
        <td class="scorecard-metric-name">${row.label}</td>
    `;

    // Determine best value across active portfolios if more than 1 portfolio
    let bestVal = null;
    if (row.findBest && portfolios.length > 1) {
      bestVal = row.findBest(portfolios.map(p => p.metrics));
    }

    portfolios.forEach(p => {
      const val = row.format(p.metrics, p);
      let isBest = false;
      if (row.findBest && portfolios.length > 1) {
        const valNum = row.findBest([p.metrics]);
        if (Math.abs(valNum - bestVal) < 0.0001) isBest = true;
      }

      const style = row.bold ? 'font-weight:700;' : '';
      const badge = isBest
        ? ` <span style="display:inline-block; font-size:0.65rem; padding:0.1rem 0.35rem; background:rgba(52,211,153,0.15); color:#34d399; border:1px solid rgba(52,211,153,0.3); border-radius:4px; margin-left:4px; vertical-align:middle;">BEST</span>`
        : '';

      bodyHtml += `<td style="${style} text-align: right;">${val}${badge}</td>`;
    });

    if (benchmark) {
      const bVal = row.format(benchmark.metrics, null);
      bodyHtml += `<td style="color:#94a3b8; ${row.bold ? 'font-weight:700;' : ''} text-align: right;">${bVal}</td>`;
    }
    bodyHtml += `</tr>`;
  });

  elements.scorecardTbody.innerHTML = bodyHtml;
}

// -------------------------------------------------------------------
// Visualization: Cumulative Growth Line Chart (Canvas)
// -------------------------------------------------------------------
function drawGrowthChart() {
  const canvas = elements.growthCanvas;
  if (!canvas || !state.simulationResult) return;

  const { portfolios, benchmark } = state.simulationResult;
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

  // Find min and max values across all trajectories
  let minVal = Infinity;
  let maxVal = -Infinity;

  portfolios.forEach(p => {
    p.trajectory.forEach(pt => {
      if (pt.portfolioValue > maxVal) maxVal = pt.portfolioValue;
      if (pt.portfolioValue < minVal) minVal = pt.portfolioValue;
    });
  });

  if (benchmark) {
    benchmark.trajectory.forEach(pt => {
      if (pt.portfolioValue > maxVal) maxVal = pt.portfolioValue;
      if (pt.portfolioValue < minVal) minVal = pt.portfolioValue;
    });
  }

  minVal = Math.max(1000, minVal * 0.95);
  maxVal = maxVal * 1.05;

  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);

  function getY(val) {
    if (isLog) {
      const norm = (Math.log10(val) - logMin) / (logMax - logMin);
      return pad.top + plotH * (1 - norm);
    }
    return pad.top + plotH * (1 - (val - minVal) / (maxVal - minVal));
  }

  const nPoints = portfolios[0].trajectory.length;
  function getX(idx) {
    return pad.left + (idx / (nPoints - 1)) * plotW;
  }

  // Draw Horizontal Gridlines & Y-Axis Labels
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

  // Draw Time X-Axis Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const yearStep = Math.max(1, Math.floor(nPoints / 8));
  for (let i = 0; i < nPoints; i += yearStep) {
    const x = getX(i);
    const dateStr = portfolios[0].trajectory[i].date.substring(0, 4);

    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, h - pad.bottom);
    ctx.stroke();

    ctx.fillText(dateStr, x, h - pad.bottom + 8);
  }

  // Draw Benchmark Line (Gray dashed)
  if (benchmark) {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.75;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    benchmark.trajectory.forEach((pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.portfolioValue);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw Active Portfolio Curves
  portfolios.forEach(p => {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2.25;
    ctx.beginPath();
    p.trajectory.forEach((pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.portfolioValue);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // Render Legend Bar below canvas
  let legendHtml = '';
  portfolios.forEach(p => {
    legendHtml += `
      <div class="legend-item">
        <span class="legend-color-box" style="background: ${p.color};"></span>
        <strong>${p.name}:</strong> ${formatCurrency(p.metrics.finalBalance)}
      </div>
    `;
  });
  if (benchmark) {
    legendHtml += `
      <div class="legend-item" style="color: #94a3b8;">
        <span class="legend-color-box" style="background: #64748b; border: 1px dashed #94a3b8;"></span>
        <span>${benchmark.ticker} Benchmark:</span> ${formatCurrency(benchmark.metrics.finalBalance)}
      </div>
    `;
  }
  if (elements.growthLegendBar) elements.growthLegendBar.innerHTML = legendHtml;

  // Setup Hover Tooltip
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = mouseX - pad.left;
    if (relX < 0 || relX > plotW) {
      elements.growthTooltip.classList.add('hidden');
      return;
    }

    const idx = Math.min(nPoints - 1, Math.max(0, Math.round((relX / plotW) * (nPoints - 1))));
    const date = portfolios[0].trajectory[idx].date;

    let tooltipHtml = `<div style="font-weight:700; margin-bottom: 0.35rem; color:#cbd5e1;">${date}</div>`;
    portfolios.forEach(p => {
      const pt = p.trajectory[idx];
      tooltipHtml += `
        <div style="display:flex; justify-content:space-between; gap:1.2rem; color:${p.color}; margin-bottom:0.15rem;">
          <span>${p.name}:</span>
          <strong>${formatCurrency(pt.portfolioValue)}</strong>
        </div>
      `;
    });
    if (benchmark) {
      const bPt = benchmark.trajectory[idx];
      tooltipHtml += `
        <div style="display:flex; justify-content:space-between; gap:1.2rem; color:#94a3b8;">
          <span>${benchmark.ticker} Benchmark:</span>
          <strong>${formatCurrency(bPt.portfolioValue)}</strong>
        </div>
      `;
    }

    elements.growthTooltip.innerHTML = tooltipHtml;
    elements.growthTooltip.style.left = `${mouseX}px`;
    elements.growthTooltip.style.top = `${getY(portfolios[0].trajectory[idx].portfolioValue)}px`;
    elements.growthTooltip.classList.remove('hidden');
  };

  canvas.onmouseleave = () => {
    elements.growthTooltip.classList.add('hidden');
  };
}

// -------------------------------------------------------------------
// Visualization: Annual Returns Bar Chart
// -------------------------------------------------------------------
function drawRoundedBar(ctx, x, y, w, h, isPositive) {
  if (h <= 0 || w <= 0) return;
  const r = Math.min(4, w / 2, h / 2);
  ctx.beginPath();
  if (isPositive) {
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  }
  ctx.closePath();
  ctx.fill();
}

function drawAnnualReturnsChart() {
  const canvas = elements.annualCanvas;
  if (!canvas || !state.simulationResult) return;

  const { portfolios, benchmark } = state.simulationResult;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 25, right: 30, bottom: 40, left: 60 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const years = portfolios[0].metrics.annualReturns.map(a => a.year);
  if (years.length === 0) return;

  // Max and Min Return Bounds
  let minRet = 0;
  let maxRet = 0;
  portfolios.forEach(p => {
    p.metrics.annualReturns.forEach(a => {
      if (a.return > maxRet) maxRet = a.return;
      if (a.return < minRet) minRet = a.return;
    });
  });
  if (benchmark) {
    benchmark.metrics.annualReturns.forEach(a => {
      if (a.return > maxRet) maxRet = a.return;
      if (a.return < minRet) minRet = a.return;
    });
  }

  maxRet = Math.max(0.15, maxRet * 1.15);
  minRet = Math.min(-0.15, minRet * 1.15);

  function getY(ret) {
    return pad.top + plotH * (1 - (ret - minRet) / (maxRet - minRet));
  }

  const yZero = getY(0);

  // Draw Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const ret = minRet + (i / gridSteps) * (maxRet - minRet);
    const y = getY(ret);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillText(formatPct(ret), pad.left - 8, y);
  }

  // Draw Zero Baseline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, yZero);
  ctx.lineTo(w - pad.right, yZero);
  ctx.stroke();

  // Draw Grouped Bars per Year with wider geometry
  const numSeries = portfolios.length + (benchmark ? 1 : 0);
  const groupW = plotW / years.length;
  const barW = Math.max(4, Math.min(22, (groupW * 0.82) / numSeries));

  years.forEach((yr, yIdx) => {
    const groupCenter = pad.left + (yIdx + 0.5) * groupW;
    const groupStart = groupCenter - (numSeries * barW) / 2;

    // Draw Year Label
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(yr, groupCenter, h - pad.bottom + 8);

    // Active Portfolios Bars
    portfolios.forEach((p, pIdx) => {
      const yrData = p.metrics.annualReturns.find(a => a.year === yr);
      const ret = yrData ? yrData.return : 0;
      const barX = groupStart + pIdx * barW;
      const barY = ret >= 0 ? getY(ret) : yZero;
      const barH = Math.max(1, Math.abs(getY(ret) - yZero));

      ctx.fillStyle = p.color;
      drawRoundedBar(ctx, barX + 0.5, barY, barW - 1, barH, ret >= 0);
    });

    // Benchmark Bar
    if (benchmark) {
      const bData = benchmark.metrics.annualReturns.find(a => a.year === yr);
      const bRet = bData ? bData.return : 0;
      const barX = groupStart + portfolios.length * barW;
      const barY = bRet >= 0 ? getY(bRet) : yZero;
      const barH = Math.max(1, Math.abs(getY(bRet) - yZero));

      ctx.fillStyle = '#64748b';
      drawRoundedBar(ctx, barX + 0.5, barY, barW - 1, barH, bRet >= 0);
    }
  });

  // Annual Returns Legend Bar
  if (elements.annualLegendBar) {
    let annualLegend = '';
    portfolios.forEach(p => {
      annualLegend += `
        <div class="legend-item">
          <span class="legend-color-box" style="background: ${p.color};"></span>
          <strong>${p.name}:</strong> CAGR ${formatPct(p.metrics.cagr)}
        </div>
      `;
    });
    if (benchmark) {
      annualLegend += `
        <div class="legend-item" style="color: #94a3b8;">
          <span class="legend-color-box" style="background: #64748b;"></span>
          <span>${benchmark.ticker} Benchmark:</span> CAGR ${formatPct(benchmark.metrics.cagr)}
        </div>
      `;
    }
    elements.annualLegendBar.innerHTML = annualLegend;
  }

  // Annual Hover Tooltip
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = mouseX - pad.left;
    if (relX < 0 || relX > plotW) {
      if (elements.annualTooltip) elements.annualTooltip.classList.add('hidden');
      return;
    }

    const yIdx = Math.min(years.length - 1, Math.max(0, Math.floor(relX / groupW)));
    const yr = years[yIdx];

    let tipHtml = `<div style="font-weight:700; margin-bottom: 0.35rem; color:#cbd5e1;">Year: ${yr}</div>`;
    portfolios.forEach(p => {
      const yrData = p.metrics.annualReturns.find(a => a.year === yr);
      const ret = yrData ? yrData.return : 0;
      tipHtml += `
        <div style="display:flex; justify-content:space-between; gap:1.2rem; color:${p.color}; margin-bottom:0.15rem;">
          <span>${p.name}:</span>
          <strong style="color:${ret >= 0 ? '#34d399' : '#f87171'}">${formatPct(ret)}</strong>
        </div>
      `;
    });
    if (benchmark) {
      const bData = benchmark.metrics.annualReturns.find(a => a.year === yr);
      const bRet = bData ? bData.return : 0;
      tipHtml += `
        <div style="display:flex; justify-content:space-between; gap:1.2rem; color:#94a3b8;">
          <span>${benchmark.ticker} Benchmark:</span>
          <strong style="color:${bRet >= 0 ? '#34d399' : '#f87171'}">${formatPct(bRet)}</strong>
        </div>
      `;
    }

    if (elements.annualTooltip) {
      elements.annualTooltip.innerHTML = tipHtml;
      elements.annualTooltip.style.left = `${Math.min(w - 180, Math.max(pad.left, mouseX))}px`;
      elements.annualTooltip.style.top = `${pad.top + 20}px`;
      elements.annualTooltip.classList.remove('hidden');
    }
  };

  canvas.onmouseleave = () => {
    if (elements.annualTooltip) elements.annualTooltip.classList.add('hidden');
  };
}

// -------------------------------------------------------------------
// Visualization: Underwater Drawdown Area Chart
// -------------------------------------------------------------------
function drawDrawdownChart() {
  const canvas = elements.drawdownCanvas;
  if (!canvas || !state.simulationResult) return;

  const { portfolios, benchmark } = state.simulationResult;
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

  // Compute Drawdowns for each series
  function computeDD(traj) {
    let peak = traj[0].portfolioValue;
    return traj.map(pt => {
      if (pt.portfolioValue > peak) peak = pt.portfolioValue;
      return peak > 0 ? (pt.portfolioValue - peak) / peak : 0;
    });
  }

  const pDrawdowns = portfolios.map(p => ({
    ...p,
    ddSeries: computeDD(p.trajectory)
  }));
  const bDrawdown = benchmark ? {
    ...benchmark,
    ddSeries: computeDD(benchmark.trajectory)
  } : null;

  let maxDrop = -0.10;
  pDrawdowns.forEach(p => {
    p.ddSeries.forEach(dd => {
      if (dd < maxDrop) maxDrop = dd;
    });
  });
  if (bDrawdown) {
    bDrawdown.ddSeries.forEach(dd => {
      if (dd < maxDrop) maxDrop = dd;
    });
  }

  maxDrop = Math.min(-0.25, maxDrop * 1.15); // e.g. -0.55

  function getY(dd) {
    return pad.top + plotH * (dd / maxDrop);
  }

  const nPoints = portfolios[0].trajectory.length;
  function getX(idx) {
    return pad.left + (idx / (nPoints - 1)) * plotW;
  }

  // Draw Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const dd = (i / gridSteps) * maxDrop;
    const y = getY(dd);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillText(formatPct(dd), pad.left - 8, y);
  }

  // Draw Time X-Axis Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const yearStep = Math.max(1, Math.floor(nPoints / 8));
  for (let i = 0; i < nPoints; i += yearStep) {
    const x = getX(i);
    const dateStr = portfolios[0].trajectory[i].date.substring(0, 4);
    ctx.fillText(dateStr, x, h - pad.bottom + 8);
  }

  const yZero = pad.top;

  // Draw Benchmark Drawdown (if present)
  if (bDrawdown) {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    bDrawdown.ddSeries.forEach((dd, idx) => {
      const x = getX(idx);
      const y = getY(dd);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw Underwater Area Fills and Outline Curves for active portfolios
  pDrawdowns.forEach(p => {
    // 1. Shaded area
    const grad = ctx.createLinearGradient(0, yZero, 0, pad.top + plotH);
    grad.addColorStop(0, hexToRgba(p.color, 0.22));
    grad.addColorStop(1, hexToRgba(p.color, 0.03));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(getX(0), yZero);
    p.ddSeries.forEach((dd, idx) => {
      ctx.lineTo(getX(idx), getY(dd));
    });
    ctx.lineTo(getX(nPoints - 1), yZero);
    ctx.closePath();
    ctx.fill();

    // 2. Stroke curve
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    p.ddSeries.forEach((dd, idx) => {
      const x = getX(idx);
      const y = getY(dd);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // Legend Bar
  if (elements.drawdownLegendBar) {
    let ddLegend = '';
    portfolios.forEach(p => {
      ddLegend += `
        <div class="legend-item">
          <span class="legend-color-box" style="background: ${p.color};"></span>
          <strong>${p.name}:</strong> Max DD <span style="color:#ef4444; font-weight:700;">${formatPct(p.metrics.maxDrawdown)}</span>
        </div>
      `;
    });
    if (benchmark) {
      ddLegend += `
        <div class="legend-item" style="color: #94a3b8;">
          <span class="legend-color-box" style="background: #64748b; border: 1px dashed #94a3b8;"></span>
          <span>${benchmark.ticker} Benchmark:</span> Max DD <span style="color:#ef4444; font-weight:700;">${formatPct(benchmark.metrics.maxDrawdown)}</span>
        </div>
      `;
    }
    elements.drawdownLegendBar.innerHTML = ddLegend;
  }

  // Drawdown Tooltip
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = mouseX - pad.left;
    if (relX < 0 || relX > plotW) {
      if (elements.drawdownTooltip) elements.drawdownTooltip.classList.add('hidden');
      return;
    }

    const idx = Math.min(nPoints - 1, Math.max(0, Math.round((relX / plotW) * (nPoints - 1))));
    const date = portfolios[0].trajectory[idx].date;

    let tipHtml = `<div style="font-weight:700; margin-bottom: 0.35rem; color:#cbd5e1;">${date}</div>`;
    pDrawdowns.forEach(p => {
      const dd = p.ddSeries[idx];
      tipHtml += `
        <div style="display:flex; justify-content:space-between; gap:1.2rem; color:${p.color}; margin-bottom:0.15rem;">
          <span>${p.name}:</span>
          <strong style="color:${dd < 0 ? '#ef4444' : '#34d399'}">${formatPct(dd)}</strong>
        </div>
      `;
    });
    if (bDrawdown) {
      const bDd = bDrawdown.ddSeries[idx];
      tipHtml += `
        <div style="display:flex; justify-content:space-between; gap:1.2rem; color:#94a3b8;">
          <span>${benchmark.ticker} Benchmark:</span>
          <strong style="color:${bDd < 0 ? '#ef4444' : '#34d399'}">${formatPct(bDd)}</strong>
        </div>
      `;
    }

    if (elements.drawdownTooltip) {
      elements.drawdownTooltip.innerHTML = tipHtml;
      elements.drawdownTooltip.style.left = `${Math.min(w - 180, Math.max(pad.left, mouseX))}px`;
      elements.drawdownTooltip.style.top = `${getY(pDrawdowns[0].ddSeries[idx])}px`;
      elements.drawdownTooltip.classList.remove('hidden');
    }
  };

  canvas.onmouseleave = () => {
    if (elements.drawdownTooltip) elements.drawdownTooltip.classList.add('hidden');
  };
}

// -------------------------------------------------------------------
// Visualization: Historical Allocation Weight Drift (Stacked Area)
// -------------------------------------------------------------------
function drawDriftChart() {
  const canvas = elements.driftCanvas;
  if (!canvas || !state.simulationResult) return;

  const { portfolios } = state.simulationResult;
  const activeP = portfolios.find(p => p.id === state.driftPortfolioId) || portfolios[0];
  if (!activeP) return;

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

  const traj = activeP.trajectory;
  const nPoints = traj.length;
  const tickers = activeP.allocations.map(a => a.ticker);

  function getX(idx) {
    return pad.left + (idx / (nPoints - 1)) * plotW;
  }

  function getY(pct) {
    return pad.top + plotH * (1 - pct / 100);
  }

  // Stacked Area Calculation
  let cumulativeBaseline = new Array(nPoints).fill(0);

  tickers.forEach((ticker, aIdx) => {
    const color = ASSET_PALETTE[aIdx % ASSET_PALETTE.length];
    const newCumulative = [];

    ctx.fillStyle = color;
    ctx.beginPath();

    // Top curve (current asset added to cumulative)
    for (let i = 0; i < nPoints; i++) {
      const wt = traj[i].assetWeights[ticker] || 0;
      const topVal = cumulativeBaseline[i] + wt;
      newCumulative.push(topVal);
      const x = getX(i);
      const y = getY(topVal);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    // Bottom curve (previous cumulative in reverse)
    for (let i = nPoints - 1; i >= 0; i--) {
      const x = getX(i);
      const y = getY(cumulativeBaseline[i]);
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();

    // Subtle outline separating layers
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < nPoints; i++) {
      const x = getX(i);
      const y = getY(newCumulative[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    cumulativeBaseline = newCumulative;
  });

  // Draw 0% and 100% boundary lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, getY(100));
  ctx.lineTo(w - pad.right, getY(100));
  ctx.stroke();

  // Y-Axis Ticks (0%, 25%, 50%, 75%, 100%)
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  [0, 25, 50, 75, 100].forEach(pct => {
    ctx.fillText(`${pct}%`, pad.left - 8, getY(pct));
  });

  // Time X-Axis Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const yearStep = Math.max(1, Math.floor(nPoints / 8));
  for (let i = 0; i < nPoints; i += yearStep) {
    const x = getX(i);
    const dateStr = traj[i].date.substring(0, 4);
    ctx.fillText(dateStr, x, h - pad.bottom + 8);
  }

  // Drift Legend Bar
  let driftLegend = '';
  tickers.forEach((t, idx) => {
    const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
    driftLegend += `
      <div class="legend-item">
        <span class="legend-color-box" style="background: ${color};"></span>
        <span>${t}</span>
      </div>
    `;
  });
  if (elements.driftLegendBar) elements.driftLegendBar.innerHTML = driftLegend;

  // Drift Hover Tooltip
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = mouseX - pad.left;
    if (relX < 0 || relX > plotW) {
      if (elements.driftTooltip) elements.driftTooltip.classList.add('hidden');
      return;
    }

    const idx = Math.min(nPoints - 1, Math.max(0, Math.round((relX / plotW) * (nPoints - 1))));
    const date = traj[idx].date;

    let tipHtml = `<div style="font-weight:700; margin-bottom: 0.35rem; color:#cbd5e1;">${date}</div>`;
    tickers.forEach((t, tIdx) => {
      const color = ASSET_PALETTE[tIdx % ASSET_PALETTE.length];
      const wt = traj[idx].assetWeights[t] || 0;
      tipHtml += `
        <div style="display:flex; justify-content:space-between; gap:1.2rem; color:${color}; margin-bottom:0.15rem;">
          <span>${t}:</span>
          <strong>${wt.toFixed(1)}%</strong>
        </div>
      `;
    });

    if (elements.driftTooltip) {
      elements.driftTooltip.innerHTML = tipHtml;
      elements.driftTooltip.style.left = `${Math.min(w - 180, Math.max(pad.left, mouseX))}px`;
      elements.driftTooltip.style.top = `${pad.top + 20}px`;
      elements.driftTooltip.classList.remove('hidden');
    }
  };

  canvas.onmouseleave = () => {
    if (elements.driftTooltip) elements.driftTooltip.classList.add('hidden');
  };
}

// -------------------------------------------------------------------
// CSV Export
// -------------------------------------------------------------------
function exportBacktestCSV() {
  if (!state.simulationResult) return;
  const { dates, portfolios, benchmark } = state.simulationResult;

  let csv = `Date`;
  portfolios.forEach(p => { csv += `,${p.name} Balance,${p.name} Return`; });
  if (benchmark) csv += `,${benchmark.ticker} Benchmark Balance,${benchmark.ticker} Return`;
  csv += `\n`;

  dates.forEach((d, idx) => {
    csv += `${d}`;
    portfolios.forEach(p => {
      const pt = p.trajectory[idx];
      csv += `,${pt.portfolioValue},${pt.monthlyReturn}`;
    });
    if (benchmark) {
      const bPt = benchmark.trajectory[idx];
      csv += `,${bPt.portfolioValue},${bPt.monthlyReturn}`;
    }
    csv += `\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfolio_backtest_${dates[0]}_${dates[dates.length - 1]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------------
// Presets Loading
// -------------------------------------------------------------------
function applyPreset(presetId) {
  const preset = PORTFOLIO_PRESETS.find(p => p.id === presetId);
  if (!preset) return;

  // Set preset allocations into Portfolio #1
  const presetAllocs = preset.allocations;
  const newRows = presetAllocs.map((a, idx) => ({
    id: `row-${Date.now()}-${idx}`,
    ticker: a.ticker,
    p1: a.weight,
    p2: 0,
    p3: 0
  }));

  state.rows = newRows;
  renderAllocationTable();
  executeBacktest();
}

// -------------------------------------------------------------------
// Event Listeners & Initialization
// -------------------------------------------------------------------
function attachEventListeners() {
  // Toggle Config Panel Collapse
  if (elements.btnToggleConfig) {
    elements.btnToggleConfig.addEventListener('click', () => {
      state.isConfigCollapsed = !state.isConfigCollapsed;
      elements.configPanel.classList.toggle('collapsed', state.isConfigCollapsed);
      elements.btnConfigText.textContent = state.isConfigCollapsed
        ? 'Expand Model Configuration'
        : 'Collapse Model Configuration';
    });
  }

  // Config Tabs Switching
  if (elements.tabBtnAssets && elements.tabBtnSettings) {
    elements.tabBtnAssets.addEventListener('click', () => {
      state.activeCfgTab = 'assets';
      elements.tabBtnAssets.classList.add('active');
      elements.tabBtnSettings.classList.remove('active');
      elements.paneAssets.classList.remove('hidden');
      elements.paneSettings.classList.add('hidden');
    });

    elements.tabBtnSettings.addEventListener('click', () => {
      state.activeCfgTab = 'settings';
      elements.tabBtnSettings.classList.add('active');
      elements.tabBtnAssets.classList.remove('active');
      elements.paneSettings.classList.remove('hidden');
      elements.paneAssets.classList.add('hidden');
    });
  }

  // Preset Chips
  document.querySelectorAll('.btn-preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      applyPreset(btn.dataset.preset);
    });
  });

  // Benchmark Selector
  if (elements.btnSelectBenchmark) {
    elements.btnSelectBenchmark.addEventListener('click', () => {
      openAssetModal({
        selectedTicker: state.benchmarkTicker,
        targetType: 'benchmark',
        onSelect: (selectedFund) => {
          const ticker = (typeof selectedFund === 'string' ? selectedFund : (selectedFund?.ticker || selectedFund))?.toUpperCase();
          state.benchmarkTicker = ticker;
          elements.benchTickerLabel.textContent = ticker;
          elements.benchNameLabel.textContent = selectedFund?.name || ticker;
          executeBacktest();
        }
      });
    });
  }

  // Allocation Table Delegated Events (Weight changes, Pick Asset, Remove Row)
  if (elements.allocationsTbody) {
    elements.allocationsTbody.addEventListener('input', (e) => {
      if (e.target.classList.contains('weight-input')) {
        const rowIdx = parseInt(e.target.dataset.rowIdx, 10);
        const col = e.target.dataset.col;
        const val = Math.max(0, parseFloat(e.target.value) || 0);
        state.rows[rowIdx][col] = val;
        updateWeightTotals();
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
          onSelect: (selectedFund) => {
            const ticker = (typeof selectedFund === 'string' ? selectedFund : (selectedFund?.ticker || selectedFund))?.toUpperCase();
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
        onSelect: (selectedFund) => {
          const ticker = (typeof selectedFund === 'string' ? selectedFund : (selectedFund?.ticker || selectedFund))?.toUpperCase();
          state.rows.push({
            id: `row-${Date.now()}`,
            ticker,
            p1: 0,
            p2: 0,
            p3: 0
          });
          renderAllocationTable();
        }
      });
    });
  }

  // Clear Allocations
  if (elements.btnClearAllocations) {
    elements.btnClearAllocations.addEventListener('click', () => {
      state.rows.forEach(r => { r.p1 = 0; r.p2 = 0; r.p3 = 0; });
      renderAllocationTable();
    });
  }

  // Run Backtest Button
  if (elements.btnRunBacktest) {
    elements.btnRunBacktest.addEventListener('click', executeBacktest);
  }

  // Linear / Log Scale Buttons
  if (elements.btnScaleLinear && elements.btnScaleLog) {
    elements.btnScaleLinear.addEventListener('click', () => {
      state.growthScale = 'linear';
      elements.btnScaleLinear.classList.add('active');
      elements.btnScaleLog.classList.remove('active');
      drawGrowthChart();
    });

    elements.btnScaleLog.addEventListener('click', () => {
      state.growthScale = 'log';
      elements.btnScaleLog.classList.add('active');
      elements.btnScaleLinear.classList.remove('active');
      drawGrowthChart();
    });
  }

  // Drift Portfolio Select
  if (elements.selectDriftPortfolio) {
    elements.selectDriftPortfolio.addEventListener('change', () => {
      state.driftPortfolioId = elements.selectDriftPortfolio.value;
      drawDriftChart();
    });
  }

  // Export CSV
  if (elements.btnExportCsv) {
    elements.btnExportCsv.addEventListener('click', exportBacktestCSV);
  }
}

// -------------------------------------------------------------------
// Initialization
// -------------------------------------------------------------------
function init() {
  cacheDOMElements();
  attachEventListeners();
  renderAllocationTable();

  // Subscribe to reactive session fund changes
  subscribeSessionFunds(() => {
    renderAllocationTable();
  });

  // Run initial simulation
  executeBacktest();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
