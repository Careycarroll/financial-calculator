/**
 * Backtest Asset Class Allocation Studio UI Controller
 * 
 * Drives interactive multi-portfolio asset class simulations (1972-present).
 * Features:
 * - 28 canonical asset classes grouped into US Equity, International Equity, Fixed Income, Alternatives
 * - Multi-portfolio comparison (Portfolios 1, 2, 3 vs Benchmark Index)
 * - Annual, Semi-Annual, Quarterly, Monthly, or Buy-and-Hold rebalancing
 * - Periodic contribution & withdrawal cashflows
 * - High-DPI Canvas 2D charts:
 *     - Cumulative Portfolio Growth ($10,000 Initial, Linear / Log scale)
 *     - Calendar Year Annual Returns Grouped Bar Chart
 *     - Underwater Peak-to-Trough Drawdown Time Series
 * - Institutional MPT Scorecards, Trailing Windows Table, and CSV Export
 * - Full AbortController & rafThrottle compliance with window.CHART_FONTS
 */

import {
  ASSET_CLASS_CATALOG,
  ASSET_CLASS_PRESETS,
  getAssetClassCatalog,
  getAssetClassById,
  getAssetClassPriceSeries,
  getAvailableTimelineRange
} from './asset-class-data.js';

import {
  simulatePortfolio,
  validateAllocations,
  calculatePortfolioMetrics
} from './portfolio-engine.js';

import { rafThrottle, formatCurrency } from '../js/chart-utils.js';

// -------------------------------------------------------------------
// Module State
// -------------------------------------------------------------------
const state = {
  benchmarkAssetId: 'TotalStockMarket',
  // Default to user URL configuration: P1 60/40 vs P2 40/20/30/10
  assetRows: [
    { assetId: 'TotalStockMarket', w1: 60, w2: 40, w3: 30 },
    { assetId: 'IntlStockMarket', w1: 0, w2: 20, w3: 0 },
    { assetId: 'TotalBond', w1: 40, w2: 30, w3: 0 },
    { assetId: 'REIT', w1: 0, w2: 10, w3: 0 },
    { assetId: 'LongTreasury', w1: 0, w2: 0, w3: 40 },
    { assetId: 'IntermediateTreasury', w1: 0, w2: 0, w3: 15 },
    { assetId: 'Gold', w1: 0, w2: 0, w3: 7.5 },
    { assetId: 'Commodities', w1: 0, w2: 0, w3: 7.5 }
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
// DOM Elements Cache
// -------------------------------------------------------------------
let elements = {};

function initDOMElements() {
  elements = {
    // Header & Status
    statusTimelineRange: document.getElementById('status-timeline-range'),
    statusTotalMonths: document.getElementById('status-total-months'),
    statusBenchmarkName: document.getElementById('status-benchmark-name'),
    statusRebalanceFreq: document.getElementById('status-rebalance-freq'),
    statusInitialAmount: document.getElementById('status-initial-amount'),
    btnToggleConfig: document.getElementById('btn-toggle-config-panel'),
    btnConfigIcon: document.getElementById('btn-config-icon'),
    btnConfigText: document.getElementById('btn-config-text'),
    configPanel: document.getElementById('config-panel'),
    alertsContainer: document.getElementById('portfolio-alerts-container'),

    // Tabs
    tabBtnAssets: document.getElementById('tab-btn-cfg-assets'),
    tabBtnSettings: document.getElementById('tab-btn-cfg-settings'),
    paneAssets: document.getElementById('cfg-pane-assets'),
    paneSettings: document.getElementById('cfg-pane-settings'),

    // Tab 1 Elements
    selectBenchmark: document.getElementById('select-benchmark-asset'),
    assetRowsBody: document.getElementById('asset-rows-body'),
    totalWeightP1: document.getElementById('total-weight-p1'),
    totalWeightP2: document.getElementById('total-weight-p2'),
    totalWeightP3: document.getElementById('total-weight-p3'),
    btnAddAssetRow: document.getElementById('btn-add-asset-row'),

    // Tab 2 Elements
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
    btnRunBacktest: document.getElementById('btn-run-backtest'),
    btnResetDefaults: document.getElementById('btn-reset-defaults'),

    // Scorecards
    scBestWealthVal: document.getElementById('sc-best-wealth-val'),
    scBestWealthSub: document.getElementById('sc-best-wealth-sub'),
    scBestSharpeVal: document.getElementById('sc-best-sharpe-val'),
    scBestSharpeSub: document.getElementById('sc-best-sharpe-sub'),
    scLowestDdVal: document.getElementById('sc-lowest-dd-val'),
    scLowestDdSub: document.getElementById('sc-lowest-dd-sub'),
    scTimelineVal: document.getElementById('sc-timeline-val'),
    scTimelineSub: document.getElementById('sc-timeline-sub'),

    // Canvas Charts
    canvasGrowth: document.getElementById('canvas-growth'),
    tooltipGrowth: document.getElementById('tooltip-growth'),
    chkLogScale: document.getElementById('chk-log-scale'),

    canvasAnnualReturns: document.getElementById('canvas-annual-returns'),
    tooltipAnnual: document.getElementById('tooltip-annual'),

    canvasDrawdowns: document.getElementById('canvas-drawdowns'),
    tooltipDrawdown: document.getElementById('tooltip-drawdown'),

    // Tables
    tbodyPerformanceSummary: document.getElementById('tbody-performance-summary'),
    tbodyTrailingReturns: document.getElementById('tbody-trailing-returns'),
    tbodyAnnualReturns: document.getElementById('tbody-annual-returns'),
    btnDownloadCsv: document.getElementById('btn-download-csv')
  };
}

// -------------------------------------------------------------------
// Asset Select HTML Options (Grouped by Category)
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
// Render Allocation Rows
// -------------------------------------------------------------------
function renderAssetRows() {
  if (!elements.assetRowsBody) return;
  elements.assetRowsBody.innerHTML = '';

  state.assetRows.forEach((row, index) => {
    const tr = document.createElement('tr');
    tr.className = 'asset-config-row';
    tr.dataset.index = index;

    tr.innerHTML = `
      <td>
        <select class="form-select asset-class-select" data-index="${index}">
          ${buildAssetSelectOptions(row.assetId)}
        </select>
      </td>
      <td style="text-align: center;">
        <input type="number" class="form-input weight-input" data-index="${index}" data-portfolio="1" value="${row.w1}" min="0" max="100" step="1" />
      </td>
      <td style="text-align: center;">
        <input type="number" class="form-input weight-input" data-index="${index}" data-portfolio="2" value="${row.w2}" min="0" max="100" step="1" />
      </td>
      <td style="text-align: center;">
        <input type="number" class="form-input weight-input" data-index="${index}" data-portfolio="3" value="${row.w3}" min="0" max="100" step="1" />
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-remove-row" data-index="${index}" title="Remove Asset Class">✕</button>
      </td>
    `;

    elements.assetRowsBody.appendChild(tr);
  });

  updateTotalWeights();
  bindAssetRowListeners();
}

// -------------------------------------------------------------------
// Update Total Weight Labels
// -------------------------------------------------------------------
function updateTotalWeights() {
  let sum1 = 0, sum2 = 0, sum3 = 0;
  state.assetRows.forEach(r => {
    sum1 += Number(r.w1) || 0;
    sum2 += Number(r.w2) || 0;
    sum3 += Number(r.w3) || 0;
  });

  sum1 = Math.round(sum1 * 10) / 10;
  sum2 = Math.round(sum2 * 10) / 10;
  sum3 = Math.round(sum3 * 10) / 10;

  function styleWeightCell(cell, val) {
    if (!cell) return;
    cell.textContent = `${val}%`;
    if (Math.abs(val - 100) < 0.05) {
      cell.style.color = '#10b981'; // Green
    } else if (val === 0) {
      cell.style.color = '#64748b'; // Muted zero
    } else {
      cell.style.color = '#f43f5e'; // Red error
    }
  }

  styleWeightCell(elements.totalWeightP1, sum1);
  styleWeightCell(elements.totalWeightP2, sum2);
  styleWeightCell(elements.totalWeightP3, sum3);
}

// -------------------------------------------------------------------
// Bind Event Listeners for Dynamic Rows
// -------------------------------------------------------------------
function bindAssetRowListeners() {
  const selects = elements.assetRowsBody.querySelectorAll('.asset-class-select');
  selects.forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      state.assetRows[idx].assetId = e.target.value;
      runBacktest();
    });
  });

  const inputs = elements.assetRowsBody.querySelectorAll('.weight-input');
  inputs.forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      const port = e.target.dataset.portfolio;
      const val = parseFloat(e.target.value) || 0;

      if (port === '1') state.assetRows[idx].w1 = val;
      else if (port === '2') state.assetRows[idx].w2 = val;
      else if (port === '3') state.assetRows[idx].w3 = val;

      updateTotalWeights();
    });

    inp.addEventListener('change', () => {
      runBacktest();
    });
  });

  const removeBtns = elements.assetRowsBody.querySelectorAll('.btn-remove-row');
  removeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (state.assetRows.length <= 1) {
        showAlert('At least one asset class row is required.');
        return;
      }
      state.assetRows.splice(idx, 1);
      renderAssetRows();
      runBacktest();
    });
  });
}

// -------------------------------------------------------------------
// Date Selectors Population
// -------------------------------------------------------------------
function populateDateSelectors() {
  const timeline = getAvailableTimelineRange();
  const months = [
    { num: 1, name: 'Jan' }, { num: 2, name: 'Feb' }, { num: 3, name: 'Mar' },
    { num: 4, name: 'Apr' }, { num: 5, name: 'May' }, { num: 6, name: 'Jun' },
    { num: 7, name: 'Jul' }, { num: 8, name: 'Aug' }, { num: 9, name: 'Sep' },
    { num: 10, name: 'Oct' }, { num: 11, name: 'Nov' }, { num: 12, name: 'Dec' }
  ];

  // Start & End Years
  let yearOpts = '';
  for (let y = timeline.startYear; y <= timeline.endYear; y++) {
    yearOpts += `<option value="${y}">${y}</option>`;
  }

  elements.selectStartYear.innerHTML = yearOpts;
  elements.selectEndYear.innerHTML = yearOpts;

  // Start & End Months
  let monthOpts = '';
  months.forEach(m => {
    monthOpts += `<option value="${m.num}">${m.name}</option>`;
  });

  elements.selectStartMonth.innerHTML = monthOpts;
  elements.selectEndMonth.innerHTML = monthOpts;

  // Defaults
  elements.selectStartYear.value = state.settings.startYear;
  elements.selectStartMonth.value = state.settings.startMonth;
  elements.selectEndYear.value = state.settings.endYear;
  elements.selectEndMonth.value = state.settings.endMonth;
}

// -------------------------------------------------------------------
// Alert Banner
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
// Core Backtest Execution
// -------------------------------------------------------------------
export function runBacktest() {
  clearAlerts();

  // Validate Start and End Dates
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

  // Build active allocations for P1, P2, P3
  const alloc1 = state.assetRows.map(r => ({ ticker: r.assetId.toUpperCase(), weight: Number(r.w1) || 0 }));
  const alloc2 = state.assetRows.map(r => ({ ticker: r.assetId.toUpperCase(), weight: Number(r.w2) || 0 }));
  const alloc3 = state.assetRows.map(r => ({ ticker: r.assetId.toUpperCase(), weight: Number(r.w3) || 0 }));

  const v1 = validateAllocations(alloc1);
  const v2 = validateAllocations(alloc2);
  const v3 = validateAllocations(alloc3);

  if (!v1.valid && !v2.valid && !v3.valid) {
    showAlert('At least one Portfolio (P1, P2, or P3) must have valid allocation weights summing to 100%.');
    return;
  }

  // Generate price series for all referenced asset classes and benchmark
  const activeAssetIds = new Set();
  state.assetRows.forEach(r => activeAssetIds.add(r.assetId));
  activeAssetIds.add(state.benchmarkAssetId);

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
    showAlert('Not enough historical data available for the selected dates.');
    return;
  }

  // Status Bar Updates
  elements.statusTimelineRange.textContent = `${dates[0]} to ${dates[dates.length - 1]}`;
  elements.statusTotalMonths.textContent = `(${dates.length} Months)`;
  const benchMeta = getAssetClassById(state.benchmarkAssetId);
  elements.statusBenchmarkName.textContent = benchMeta ? benchMeta.name : state.benchmarkAssetId;
  elements.statusRebalanceFreq.textContent = elements.selectRebalancingFreq.options[elements.selectRebalancingFreq.selectedIndex].text;
  elements.statusInitialAmount.textContent = formatCurrency(state.settings.initialAmount);

  // Simulation Options
  const simOpts = {
    initialAmount: state.settings.initialAmount,
    rebalancing: state.settings.rebalancing,
    cashflow: state.settings.cashflow,
    annualRf: state.settings.annualRf
  };

  // Simulate Portfolios
  const sim1 = v1.valid ? simulatePortfolio(dates, dataMap, alloc1, simOpts) : null;
  const sim2 = v2.valid ? simulatePortfolio(dates, dataMap, alloc2, simOpts) : null;
  const sim3 = v3.valid ? simulatePortfolio(dates, dataMap, alloc3, simOpts) : null;

  // Simulate Benchmark (100% of chosen benchmark asset)
  const benchAlloc = [{ ticker: state.benchmarkAssetId.toUpperCase(), weight: 100 }];
  const benchSim = simulatePortfolio(dates, dataMap, benchAlloc, simOpts);

  state.lastResults = {
    sim1,
    sim2,
    sim3,
    benchSim,
    dates,
    v1,
    v2,
    v3
  };

  // Render Charts and Tables
  updateScorecards();
  renderGrowthChart();
  renderAnnualReturnsChart();
  renderDrawdownsChart();
  renderPerformanceSummaryTable();
  renderTrailingReturnsTable();
  renderYearByYearTable();
}

// -------------------------------------------------------------------
// Scorecards
// -------------------------------------------------------------------
function updateScorecards() {
  const { sim1, sim2, sim3, benchSim, dates } = state.lastResults;
  const activeSims = [
    { name: 'Portfolio 1', sim: sim1 },
    { name: 'Portfolio 2', sim: sim2 },
    { name: 'Portfolio 3', sim: sim3 }
  ].filter(p => p.sim !== null);

  if (activeSims.length === 0) return;

  // Best Wealth
  let bestWealth = activeSims[0];
  activeSims.forEach(p => {
    if (p.sim.metrics.finalBalance > bestWealth.sim.metrics.finalBalance) {
      bestWealth = p;
    }
  });

  elements.scBestWealthVal.textContent = formatCurrency(bestWealth.sim.metrics.finalBalance);
  elements.scBestWealthSub.textContent = `${bestWealth.name} (${(bestWealth.sim.metrics.cagr * 100).toFixed(2)}% CAGR)`;

  // Best Sharpe
  let bestSharpe = activeSims[0];
  activeSims.forEach(p => {
    if (p.sim.metrics.sharpeRatio > bestSharpe.sim.metrics.sharpeRatio) {
      bestSharpe = p;
    }
  });

  elements.scBestSharpeVal.textContent = bestSharpe.sim.metrics.sharpeRatio.toFixed(2);
  elements.scBestSharpeSub.textContent = `${bestSharpe.name} (Risk-Adjusted Return)`;

  // Lowest Max Drawdown
  let lowestDD = activeSims[0];
  activeSims.forEach(p => {
    if (Math.abs(p.sim.metrics.maxDrawdown) < Math.abs(lowestDD.sim.metrics.maxDrawdown)) {
      lowestDD = p;
    }
  });

  elements.scLowestDdVal.textContent = `${(lowestDD.sim.metrics.maxDrawdown * 100).toFixed(2)}%`;
  elements.scLowestDdSub.textContent = `${lowestDD.name} (Maximum Drop)`;

  // Timeline
  const nYears = (dates.length / 12).toFixed(1);
  elements.scTimelineVal.textContent = `${nYears} Yrs`;
  elements.scTimelineSub.textContent = `${dates[0]} to ${dates[dates.length - 1]} (${dates.length}M)`;
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

  const { sim1, sim2, sim3, benchSim, dates } = state.lastResults;
  const padding = { top: 30, right: 30, bottom: 45, left: 75 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Determine Min & Max Values
  let minVal = Infinity;
  let maxVal = -Infinity;

  const seriesList = [
    { label: 'Portfolio 1', color: '#38bdf8', sim: sim1 },
    { label: 'Portfolio 2', color: '#a855f7', sim: sim2 },
    { label: 'Portfolio 3', color: '#f59e0b', sim: sim3 },
    { label: 'Benchmark', color: '#64748b', sim: benchSim, dashed: true }
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

  // Draw Grid Lines & Y-Axis Labels
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

  // Draw X-Axis Ticks (Year intervals)
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

  // Draw Portfolio Lines
  seriesList.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.dashed ? 1.5 : 2.5;
    ctx.beginPath();

    if (s.dashed) {
      ctx.setLineDash([4, 4]);
    } else {
      ctx.setLineDash([]);
    }

    s.sim.trajectory.forEach((t, i) => {
      const x = getX(i);
      const y = getY(t.portfolioValue);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Draw Legend at Top
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

  // Tooltip with AbortController
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
// CHART 2: Annual Calendar Returns Bar Chart
// -------------------------------------------------------------------
function renderAnnualReturnsChart() {
  const canvas = elements.canvasAnnualReturns;
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

  const { sim1, sim2, sim3, benchSim } = state.lastResults;
  const padding = { top: 25, right: 25, bottom: 40, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Extract common years from benchmark annual returns
  const years = benchSim.metrics.annualReturns.map(a => a.year);
  if (years.length === 0) return;

  // Min and Max return
  let minRet = -0.30;
  let maxRet = 0.40;

  const seriesList = [
    { label: 'P1', color: '#38bdf8', returns: sim1 ? sim1.metrics.annualReturns : null },
    { label: 'P2', color: '#a855f7', returns: sim2 ? sim2.metrics.annualReturns : null },
    { label: 'P3', color: '#f59e0b', returns: sim3 ? sim3.metrics.annualReturns : null },
    { label: 'Bench', color: '#64748b', returns: benchSim.metrics.annualReturns }
  ].filter(s => s.returns !== null);

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

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  const ticks = 6;

  for (let i = 0; i <= ticks; i++) {
    const retVal = minRet + (i / ticks) * (maxRet - minRet);
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

    // Label every 5th year on X-axis
    if (yrIdx % 5 === 0 || yrIdx === nYears - 1) {
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(yr, groupLeft + groupWidth / 2, padding.top + plotHeight + 6);
    }
  });

  // Tooltip with AbortController
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
// CHART 3: Underwater Drawdowns Chart
// -------------------------------------------------------------------
function renderDrawdownsChart() {
  const canvas = elements.canvasDrawdowns;
  if (!canvas || !state.lastResults) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = 340;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const { sim1, sim2, sim3, benchSim, dates } = state.lastResults;
  const padding = { top: 25, right: 30, bottom: 40, left: 65 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Calculate drawdown series for each portfolio
  function getDrawdownSeries(sim) {
    if (!sim) return [];
    let peak = sim.trajectory[0].portfolioValue;
    return sim.trajectory.map(t => {
      if (t.portfolioValue > peak) peak = t.portfolioValue;
      return peak > 0 ? (t.portfolioValue - peak) / peak : 0;
    });
  }

  const seriesList = [
    { label: 'Portfolio 1', color: '#38bdf8', dd: getDrawdownSeries(sim1) },
    { label: 'Portfolio 2', color: '#a855f7', dd: getDrawdownSeries(sim2) },
    { label: 'Portfolio 3', color: '#f59e0b', dd: getDrawdownSeries(sim3) },
    { label: 'Benchmark', color: '#64748b', dd: getDrawdownSeries(benchSim), dashed: true }
  ].filter(s => s.dd.length > 0);

  // Min Drawdown across series
  let minDD = -0.50;
  seriesList.forEach(s => {
    s.dd.forEach(val => {
      if (val < minDD) minDD = val;
    });
  });
  minDD = Math.min(-0.30, Math.floor(minDD * 10) / 10);

  function getY(dd) {
    const ratio = dd / minDD; // 0 at top, 1 at bottom
    return padding.top + ratio * plotHeight;
  }

  function getX(index) {
    return padding.left + (index / (dates.length - 1)) * plotWidth;
  }

  ctx.clearRect(0, 0, width, height);
  const fontSm = window.CHART_FONTS ? window.CHART_FONTS.sm : '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.font = fontSm;

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  const ddTicks = 5;

  for (let i = 0; i <= ddTicks; i++) {
    const ddVal = (i / ddTicks) * minDD;
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

  // Draw lines
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

  // X Axis Year labels
  const xTickStep = Math.max(1, Math.floor(dates.length / 8));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#94a3b8';

  for (let i = 0; i < dates.length; i += xTickStep) {
    const xPos = getX(i);
    const yr = dates[i].substring(0, 4);
    ctx.fillText(yr, xPos, padding.top + plotHeight + 6);
  }

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
// TABLE 1: Institutional Performance Summary
// -------------------------------------------------------------------
function renderPerformanceSummaryTable() {
  if (!elements.tbodyPerformanceSummary || !state.lastResults) return;
  elements.tbodyPerformanceSummary.innerHTML = '';

  const { sim1, sim2, sim3, benchSim } = state.lastResults;
  const list = [
    { name: 'Portfolio 1', color: '#38bdf8', sim: sim1 },
    { name: 'Portfolio 2', color: '#a855f7', sim: sim2 },
    { name: 'Portfolio 3', color: '#f59e0b', sim: sim3 },
    { name: 'Benchmark (100% ' + (getAssetClassById(state.benchmarkAssetId)?.shortName || state.benchmarkAssetId) + ')', color: '#94a3b8', sim: benchSim }
  ].filter(p => p.sim !== null);

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
// TABLE 2: Trailing Performance Horizons
// -------------------------------------------------------------------
function renderTrailingReturnsTable() {
  if (!elements.tbodyTrailingReturns || !state.lastResults) return;
  elements.tbodyTrailingReturns.innerHTML = '';

  const { sim1, sim2, sim3, benchSim, dates } = state.lastResults;
  const list = [
    { name: 'Portfolio 1', color: '#38bdf8', sim: sim1 },
    { name: 'Portfolio 2', color: '#a855f7', sim: sim2 },
    { name: 'Portfolio 3', color: '#f59e0b', sim: sim3 },
    { name: 'Benchmark', color: '#94a3b8', sim: benchSim }
  ].filter(p => p.sim !== null);

  const totalLen = dates.length;

  function calcTrailingCAGR(traj, months) {
    if (!traj || traj.length < months + 1) return null;
    const startVal = traj[traj.length - 1 - months].portfolioValue;
    const endVal = traj[traj.length - 1].portfolioValue;
    if (startVal <= 0) return 0;
    const nY = months / 12;
    return Math.pow(endVal / startVal, 1 / nY) - 1;
  }

  function fmtCell(val) {
    if (val === null) return '<span style="color:#64748b;">--</span>';
    const sign = val >= 0 ? '+' : '';
    const color = val >= 0 ? '#34d399' : '#f87171';
    return `<span style="color:${color}; font-weight:600;">${sign}${(val * 100).toFixed(2)}%</span>`;
  }

  list.forEach(p => {
    const traj = p.sim.trajectory;
    const r1Y = calcTrailingCAGR(traj, 12);
    const r3Y = calcTrailingCAGR(traj, 36);
    const r5Y = calcTrailingCAGR(traj, 60);
    const r10Y = calcTrailingCAGR(traj, 120);
    const r15Y = calcTrailingCAGR(traj, 180);
    const r20Y = calcTrailingCAGR(traj, 240);
    const rFull = p.sim.metrics.cagr;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong style="color: ${p.color};">${p.name}</strong></td>
      <td style="text-align: right;">${fmtCell(r1Y)}</td>
      <td style="text-align: right;">${fmtCell(r3Y)}</td>
      <td style="text-align: right;">${fmtCell(r5Y)}</td>
      <td style="text-align: right;">${fmtCell(r10Y)}</td>
      <td style="text-align: right;">${fmtCell(r15Y)}</td>
      <td style="text-align: right;">${fmtCell(r20Y)}</td>
      <td style="text-align: right;">${fmtCell(rFull)}</td>
    `;
    elements.tbodyTrailingReturns.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// TABLE 3: Year-by-Year Historical Returns Table
// -------------------------------------------------------------------
function renderYearByYearTable() {
  if (!elements.tbodyAnnualReturns || !state.lastResults) return;
  elements.tbodyAnnualReturns.innerHTML = '';

  const { sim1, sim2, sim3, benchSim } = state.lastResults;
  const years = benchSim.metrics.annualReturns.map(a => a.year).reverse();

  function fmtRet(val) {
    if (val === undefined || val === null) return '--';
    const sign = val >= 0 ? '+' : '';
    const color = val >= 0 ? '#34d399' : '#f87171';
    return `<span style="color:${color}; font-weight:600;">${sign}${(val * 100).toFixed(2)}%</span>`;
  }

  years.forEach(yr => {
    const r1 = sim1 ? sim1.metrics.annualReturns.find(a => a.year === yr)?.return : null;
    const r2 = sim2 ? sim2.metrics.annualReturns.find(a => a.year === yr)?.return : null;
    const r3 = sim3 ? sim3.metrics.annualReturns.find(a => a.year === yr)?.return : null;
    const rB = benchSim.metrics.annualReturns.find(a => a.year === yr)?.return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${yr}</strong></td>
      <td style="text-align: right;">${fmtRet(r1)}</td>
      <td style="text-align: right;">${fmtRet(r2)}</td>
      <td style="text-align: right;">${fmtRet(r3)}</td>
      <td style="text-align: right;">${fmtRet(rB)}</td>
    `;
    elements.tbodyAnnualReturns.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// CSV Export
// -------------------------------------------------------------------
function exportHistoricalCSV() {
  if (!state.lastResults) return;
  const { sim1, sim2, sim3, benchSim } = state.lastResults;
  const years = benchSim.metrics.annualReturns.map(a => a.year);

  let csv = 'Year,Portfolio 1 (%),Portfolio 2 (%),Portfolio 3 (%),Benchmark (%)\n';

  years.forEach(yr => {
    const r1 = sim1 ? (sim1.metrics.annualReturns.find(a => a.year === yr)?.return * 100).toFixed(2) : '';
    const r2 = sim2 ? (sim2.metrics.annualReturns.find(a => a.year === yr)?.return * 100).toFixed(2) : '';
    const r3 = sim3 ? (sim3.metrics.annualReturns.find(a => a.year === yr)?.return * 100).toFixed(2) : '';
    const rB = (benchSim.metrics.annualReturns.find(a => a.year === yr)?.return * 100).toFixed(2);

    csv += `${yr},${r1},${r2},${r3},${rB}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asset-class-allocation-${state.settings.startYear}-${state.settings.endYear}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------------
// Presets Loading
// -------------------------------------------------------------------
function applyPreset(presetId) {
  const p = ASSET_CLASS_PRESETS.find(x => x.id === presetId);
  if (!p) return;

  // Clear existing rows and assign preset allocations into Portfolio 1
  state.assetRows = p.allocations.map(a => ({
    assetId: a.assetId,
    w1: a.weight,
    w2: 0,
    w3: 0
  }));

  renderAssetRows();
  runBacktest();
}

// -------------------------------------------------------------------
// Initialize Application
// -------------------------------------------------------------------
function init() {
  initDOMElements();
  populateDateSelectors();

  // Populate Benchmark Select
  elements.selectBenchmark.innerHTML = buildAssetSelectOptions(state.benchmarkAssetId);
  elements.selectBenchmark.addEventListener('change', (e) => {
    state.benchmarkAssetId = e.target.value;
    runBacktest();
  });

  // Render initial Asset Rows
  renderAssetRows();

  // Presets Buttons
  const presetChips = document.querySelectorAll('.btn-preset-chip');
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      applyPreset(chip.dataset.preset);
    });
  });

  // Add Asset Row Button
  elements.btnAddAssetRow.addEventListener('click', () => {
    state.assetRows.push({ assetId: 'TotalStockMarket', w1: 0, w2: 0, w3: 0 });
    renderAssetRows();
  });

  // Config Tabs
  elements.tabBtnAssets.addEventListener('click', () => {
    elements.tabBtnAssets.classList.add('active');
    elements.tabBtnSettings.classList.remove('active');
    elements.paneAssets.style.display = 'block';
    elements.paneSettings.style.display = 'none';
  });

  elements.tabBtnSettings.addEventListener('click', () => {
    elements.tabBtnSettings.classList.add('active');
    elements.tabBtnAssets.classList.remove('active');
    elements.paneSettings.style.display = 'block';
    elements.paneAssets.style.display = 'none';
  });

  // Cashflow toggle
  elements.selectCashflowType.addEventListener('change', (e) => {
    const val = e.target.value;
    elements.rowCashflowAmount.style.display = val === 'none' ? 'none' : 'flex';
    elements.rowCashflowFreq.style.display = val === 'none' ? 'none' : 'flex';
    runBacktest();
  });

  // Toggle Config Panel
  elements.btnToggleConfig.addEventListener('click', () => {
    state.isConfigCollapsed = !state.isConfigCollapsed;
    elements.configPanel.style.display = state.isConfigCollapsed ? 'none' : 'block';
    elements.btnConfigIcon.textContent = state.isConfigCollapsed ? '👁️' : '⚙️';
    elements.btnConfigText.textContent = state.isConfigCollapsed ? 'Expand Model Configuration' : 'Collapse Model Configuration';
  });

  // Log Scale Checkbox
  elements.chkLogScale.addEventListener('change', (e) => {
    state.settings.useLogScale = e.target.checked;
    renderGrowthChart();
  });

  // Action Buttons
  elements.btnRunBacktest.addEventListener('click', runBacktest);
  elements.btnResetDefaults.addEventListener('click', () => {
    applyPreset('global-four-asset');
  });

  // CSV Download
  elements.btnDownloadCsv.addEventListener('click', exportHistoricalCSV);

  // Debounced Window Resize
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (state.lastResults) {
        renderGrowthChart();
        renderAnnualReturnsChart();
        renderDrawdownsChart();
      }
    }, 250);
  });

  // Initial Run
  runBacktest();
}

// Bootstrap on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
