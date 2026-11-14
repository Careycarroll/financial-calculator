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

    drawdownCanvas: document.getElementById('drawdown-canvas'),
    drawdownTooltip: document.getElementById('drawdown-tooltip'),

    selectDriftPortfolio: document.getElementById('select-drift-portfolio'),
    driftCanvas: document.getElementById('drift-canvas'),
    driftTooltip: document.getElementById('drift-tooltip'),
    driftLegendBar: document.getElementById('drift-legend-bar')
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
      statusEl.textContent = '✓ 100%';
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

  portfolios.forEach(p => {
    const card = document.createElement('div');
    card.className = 'donut-card';

    const canvasId = `donut-canvas-${p.id}`;
    card.innerHTML = `
      <div class="donut-title-row">
        <span class="model-color-dot" style="background: ${p.color};"></span>
        <span class="donut-title">${p.name}</span>
      </div>
      <div class="donut-canvas-wrap">
        <canvas id="${canvasId}" width="360" height="360"></canvas>
      </div>
      <div class="donut-legend">
        ${p.allocations.map((a, idx) => {
          const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
          return `
            <div class="donut-legend-item">
              <div class="donut-legend-left">
                <span class="donut-legend-dot" style="background: ${color};"></span>
                <span>${a.ticker}</span>
              </div>
              <span class="donut-legend-pct">${a.weight}%</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    elements.donutsContainer.appendChild(card);

    // Draw Donut on Canvas
    const canvas = document.getElementById(canvasId);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 180 * dpr;
      canvas.height = 180 * dpr;
      ctx.scale(dpr, dpr);

      const cx = 90;
      const cy = 90;
      const rOuter = 75;
      const rInner = 48;
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
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${p.allocations.length} Assets`, cx, cy);
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
      <th style="width: 25%;">Metric</th>
  `;
  portfolios.forEach(p => {
    headHtml += `
      <th style="color: ${p.color};">
        <span class="model-color-dot" style="background:${p.color}; display:inline-block; margin-right:4px;"></span>
        ${p.name}
      </th>
    `;
  });
  if (benchmark) {
    headHtml += `
      <th style="color: #94a3b8;">
        <span class="model-color-dot" style="background:#94a3b8; display:inline-block; margin-right:4px;"></span>
        ${benchmark.ticker} Benchmark
      </th>
    `;
  }
  headHtml += `</tr>`;
  elements.scorecardThead.innerHTML = headHtml;

  // Rows definition
  const metricDefs = [
    { label: 'Initial Balance', key: m => formatCurrency(m.initialBalance) },
    { label: 'Final Balance', key: m => formatCurrency(m.finalBalance), bold: true },
    { label: 'Total Contributions', key: m => formatCurrency(m.totalContributed) },
    { label: 'Total Net Profit', key: m => formatCurrency(m.totalGain) },
    { label: 'CAGR (Annualized Return)', key: m => formatPct(m.cagr), bold: true },
    { label: 'Annualized Volatility (Stdev)', key: m => formatPct(m.annualVolatility) },
    { label: 'Sharpe Ratio (Rf = 3%)', key: m => m.sharpeRatio.toFixed(2), highlight: true },
    { label: 'Sortino Ratio', key: m => m.sortinoRatio.toFixed(2) },
    { label: 'Max Drawdown', key: m => `<span style="color:#ef4444; font-weight:700;">${formatPct(m.maxDrawdown)}</span>` },
    { label: 'Best Year', key: m => `${m.bestYear.year} (${formatPct(m.bestYear.return)})` },
    { label: 'Worst Year', key: m => `${m.worstYear.year} (${formatPct(m.worstYear.return)})` },
    { label: 'Rebalance Events', key: (m, p) => p ? `${p.rebalanceCount} times` : 'N/A' },
    { label: 'Correlation to Benchmark', key: (m, p) => p && p.correlationToBenchmark !== undefined ? p.correlationToBenchmark.toFixed(2) : '1.00' }
  ];

  let bodyHtml = '';
  metricDefs.forEach(row => {
    bodyHtml += `
      <tr>
        <td class="scorecard-metric-name">${row.label}</td>
    `;
    portfolios.forEach(p => {
      const val = row.key(p.metrics, p);
      bodyHtml += `<td style="${row.bold ? 'font-weight:700;' : ''}">${val}</td>`;
    });
    if (benchmark) {
      const bVal = row.key(benchmark.metrics, null);
      bodyHtml += `<td style="color:#94a3b8; ${row.bold ? 'font-weight:700;' : ''}">${bVal}</td>`;
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

  // Draw Grouped Bars per Year
  const numSeries = portfolios.length + (benchmark ? 1 : 0);
  const groupW = plotW / years.length;
  const barW = Math.max(2, Math.min(18, (groupW * 0.75) / numSeries));

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
      const barH = Math.abs(getY(ret) - yZero);

      ctx.fillStyle = p.color;
      ctx.fillRect(barX, barY, barW - 1, barH);
    });

    // Benchmark Bar
    if (benchmark) {
      const bData = benchmark.metrics.annualReturns.find(a => a.year === yr);
      const bRet = bData ? bData.return : 0;
      const barX = groupStart + portfolios.length * barW;
      const barY = bRet >= 0 ? getY(bRet) : yZero;
      const barH = Math.abs(getY(bRet) - yZero);

      ctx.fillStyle = '#64748b';
      ctx.fillRect(barX, barY, barW - 1, barH);
    }
  });
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

  let maxDrop = -0.10;
  pDrawdowns.forEach(p => {
    p.ddSeries.forEach(dd => {
      if (dd < maxDrop) maxDrop = dd;
    });
  });

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

  // Draw Drawdown Lines
  pDrawdowns.forEach(p => {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    p.ddSeries.forEach((dd, idx) => {
      const x = getX(idx);
      const y = getY(dd);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
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
          state.benchmarkTicker = selectedFund.ticker.toUpperCase();
          elements.benchTickerLabel.textContent = selectedFund.ticker;
          elements.benchNameLabel.textContent = selectedFund.name;
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

    elements.allocationsTbody.addEventListener('click', (e) => {
      const pickBtn = e.target.closest('[data-action="pick-asset"]');
      if (pickBtn) {
        const rowIdx = parseInt(pickBtn.dataset.rowIdx, 10);
        const currentRow = state.rows[rowIdx];
        openAssetModal({
          selectedTicker: currentRow.ticker,
          targetType: 'fund',
          onSelect: (selectedFund) => {
            currentRow.ticker = selectedFund.ticker.toUpperCase();
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
          state.rows.push({
            id: `row-${Date.now()}`,
            ticker: selectedFund.ticker.toUpperCase(),
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
