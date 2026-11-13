/**
 * Fund Regression & Factor Analysis Lab UI Controller
 * Manages reactive UI state, Canvas SML & Rolling charts, scorecard table, and localStorage fund sync.
 */

import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import { parseCSV, resampleToMonthly } from '../dca-comparator/dca-engine.js';
import { analyzeFundRegression } from './regression-engine.js';

const STORAGE_KEY_CUSTOM_FUNDS = 'dca_custom_funds_library';

const PALETTE = [
  '#38bdf8', // Sky Blue
  '#a855f7', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#8b5cf6', // Indigo
  '#84cc16', // Lime
  '#f97316', // Orange
  '#e11d48'  // Rose
];

// App State
const state = {
  benchmarkTicker: 'VOO',
  annualRf: 0.03,
  useDRIP: true,
  windowMonths: 36,
  activeTab: 'sml', // 'sml' | 'rolling' | 'capture'
  focusFundTicker: 'QQQ',
  selectedTickers: new Set(['VOO', 'SPY', 'QQQ', 'SCHD', 'BND']),
  sortColumn: 'alpha',
  sortDirection: 'desc',
  profiles: [],
  mousePos: null
};

let elements = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
  cacheDOMElements();
  loadCustomLibraryIntoUniverse();
  renderUniverseChips();
  populateDropdowns();
  attachEventListeners();
  runAnalysis();
}

function cacheDOMElements() {
  elements = {
    statusBenchmarkName: document.getElementById('status-benchmark-name'),
    statusUniverseCount: document.getElementById('status-universe-count'),
    statusRfRate: document.getElementById('status-rf-rate'),
    alertsContainer: document.getElementById('regression-alerts-container'),
    selectBenchmark: document.getElementById('select-benchmark'),
    inputRf: document.getElementById('input-risk-free-rate'),
    quickRfButtons: document.querySelectorAll('.btn-quick-rf'),
    checkDRIP: document.getElementById('check-regression-drip'),
    selectRollingWindow: document.getElementById('select-rolling-window'),
    selectFocusFund: document.getElementById('select-focus-fund'),
    universeBadge: document.getElementById('universe-badge'),
    presetUniverseChips: document.getElementById('preset-universe-chips'),
    savedCustomSection: document.getElementById('saved-custom-section'),
    customUniverseChips: document.getElementById('custom-universe-chips'),
    dropzone: document.getElementById('regression-dropzone'),
    fileInput: document.getElementById('regression-file-input'),
    kpiGrid: document.getElementById('kpi-highlights-grid'),
    chartTabButtons: document.querySelectorAll('.chart-tab-btn'),
    canvas: document.getElementById('regression-chart'),
    chartLegend: document.getElementById('regression-chart-legend'),
    scorecardBody: document.getElementById('scorecard-table-body'),
    sortHeaders: document.querySelectorAll('.scorecard-table th[data-sort]'),
    btnExportCSV: document.getElementById('btn-export-csv')
  };
}

// ----------------------------------------------------
// Universe & Custom Library Management
// ----------------------------------------------------
let allFunds = [...PRESET_BENCHMARKS];

function getCustomLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_FUNDS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomFundToLibrary(fund) {
  try {
    const lib = getCustomLibrary();
    const idx = lib.findIndex(f => f.ticker === fund.ticker);
    if (idx !== -1) lib[idx] = fund;
    else lib.push(fund);
    localStorage.setItem(STORAGE_KEY_CUSTOM_FUNDS, JSON.stringify(lib));
  } catch (e) {
    console.warn('Could not cache to localStorage', e);
  }
}

function loadCustomLibraryIntoUniverse() {
  const custom = getCustomLibrary();
  allFunds = [...PRESET_BENCHMARKS];

  custom.forEach(cf => {
    if (!allFunds.some(f => f.ticker === cf.ticker)) {
      allFunds.push({
        ...cf,
        color: PALETTE[(allFunds.length) % PALETTE.length]
      });
      state.selectedTickers.add(cf.ticker);
    }
  });
}

function populateDropdowns() {
  // Benchmark selector
  elements.selectBenchmark.innerHTML = '';
  allFunds.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.ticker;
    opt.textContent = `${f.ticker} - ${f.name}`;
    if (f.ticker === state.benchmarkTicker) opt.selected = true;
    elements.selectBenchmark.appendChild(opt);
  });

  // Focus fund selector
  elements.selectFocusFund.innerHTML = '';
  allFunds.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.ticker;
    opt.textContent = `${f.ticker} - ${f.name}`;
    if (f.ticker === state.focusFundTicker) opt.selected = true;
    elements.selectFocusFund.appendChild(opt);
  });
}

function renderUniverseChips() {
  // Presets
  elements.presetUniverseChips.innerHTML = '';
  PRESET_BENCHMARKS.forEach(p => {
    const isSelected = state.selectedTickers.has(p.ticker);
    const isBench = state.benchmarkTicker === p.ticker;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `fund-chip ${isSelected ? 'active' : ''} ${isBench ? 'bench-active' : ''}`;
    chip.innerHTML = `
      <span class="fund-dot" style="background-color:${isBench ? '#a855f7' : p.color}"></span>
      <span>${p.ticker}${isBench ? ' (Benchmark)' : ''}</span>
    `;
    chip.title = `${p.name} - Click to include/exclude`;
    chip.addEventListener('click', () => toggleUniverseFund(p.ticker));
    elements.presetUniverseChips.appendChild(chip);
  });

  // Custom funds from library
  const custom = allFunds.filter(f => !PRESET_BENCHMARKS.some(p => p.ticker === f.ticker));
  if (custom.length === 0) {
    elements.savedCustomSection.style.display = 'none';
  } else {
    elements.savedCustomSection.style.display = 'block';
    elements.customUniverseChips.innerHTML = '';
    custom.forEach(cf => {
      const isSelected = state.selectedTickers.has(cf.ticker);
      const isBench = state.benchmarkTicker === cf.ticker;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `fund-chip ${isSelected ? 'active' : ''} ${isBench ? 'bench-active' : ''}`;
      chip.innerHTML = `
        <span class="fund-dot" style="background-color:${isBench ? '#a855f7' : (cf.color || '#38bdf8')}"></span>
        <span>${cf.ticker}${isBench ? ' (Benchmark)' : ''}</span>
      `;
      chip.title = `${cf.name} - Click to toggle`;
      chip.addEventListener('click', () => toggleUniverseFund(cf.ticker));
      elements.customUniverseChips.appendChild(chip);
    });
  }

  elements.universeBadge.textContent = `${state.selectedTickers.size} Selected`;
}

function toggleUniverseFund(ticker) {
  if (ticker === state.benchmarkTicker) {
    showAlert('Cannot deselect the reference benchmark.', 'warning');
    return;
  }
  if (state.selectedTickers.has(ticker)) {
    if (state.selectedTickers.size <= 2) {
      showAlert('At least 2 funds must remain selected.', 'warning');
      return;
    }
    state.selectedTickers.delete(ticker);
  } else {
    state.selectedTickers.add(ticker);
  }
  renderUniverseChips();
  runAnalysis();
}

// ----------------------------------------------------
// Event Listeners
// ----------------------------------------------------
function attachEventListeners() {
  // Benchmark Change
  elements.selectBenchmark.addEventListener('change', e => {
    state.benchmarkTicker = e.target.value;
    state.selectedTickers.add(state.benchmarkTicker);
    renderUniverseChips();
    runAnalysis();
  });

  // Risk Free Rate Input
  elements.inputRf.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0) {
      state.annualRf = val / 100;
      elements.quickRfButtons.forEach(b => b.classList.remove('active'));
      elements.statusRfRate.textContent = `${(state.annualRf * 100).toFixed(2)}% (Annual)`;
      runAnalysis();
    }
  });

  // Quick Rf Buttons
  elements.quickRfButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.quickRfButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const rf = parseFloat(btn.dataset.rf);
      elements.inputRf.value = rf.toFixed(2);
      state.annualRf = rf / 100;
      elements.statusRfRate.textContent = `${rf.toFixed(2)}% (Annual)`;
      runAnalysis();
    });
  });

  // DRIP Toggle
  elements.checkDRIP.addEventListener('change', e => {
    state.useDRIP = e.target.checked;
    runAnalysis();
  });

  // Rolling Window Duration
  elements.selectRollingWindow.addEventListener('change', e => {
    state.windowMonths = parseInt(e.target.value, 10);
    runAnalysis();
  });

  // Focus Fund for Rolling Chart
  elements.selectFocusFund.addEventListener('change', e => {
    state.focusFundTicker = e.target.value;
    renderCurrentChart();
  });

  // Chart Tabs
  elements.chartTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.chartTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTab = btn.dataset.tab;
      renderCurrentChart();
    });
  });

  // Table Sorting
  elements.sortHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (state.sortColumn === col) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortColumn = col;
        state.sortDirection = ['alpha', 'sharpe', 'sortino', 'cagr', 'upCapture'].includes(col) ? 'desc' : 'asc';
      }
      renderScorecardTable();
    });
  });

  // Export CSV
  elements.btnExportCSV.addEventListener('click', exportScorecardCSV);

  // Drag and Drop Upload
  const dropzone = elements.dropzone;
  const fileInput = elements.fileInput;

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, e => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', e => {
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
      fileInput.value = '';
    }
  });

  // Canvas Mouse Move Tooltip
  elements.canvas.addEventListener('mousemove', e => {
    const rect = elements.canvas.getBoundingClientRect();
    state.mousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    renderCurrentChart();
  });

  elements.canvas.addEventListener('mouseleave', () => {
    state.mousePos = null;
    renderCurrentChart();
  });

  window.addEventListener('resize', debounce(() => renderCurrentChart(), 100));
}

// ----------------------------------------------------
// File Upload Processing
// ----------------------------------------------------
function handleFiles(files) {
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target.result, file.name);
        const monthly = resampleToMonthly(parsed.rows);
        if (monthly.length < 12) {
          showAlert(`"${parsed.ticker}" has less than 12 monthly points. Insufficient for regression.`, 'warning');
          return;
        }

        const color = PALETTE[allFunds.length % PALETTE.length];
        const newFund = {
          ticker: parsed.ticker,
          name: `${parsed.ticker} (Custom Upload)`,
          color,
          data: monthly
        };

        saveCustomFundToLibrary(newFund);
        allFunds.push(newFund);
        state.selectedTickers.add(newFund.ticker);

        populateDropdowns();
        renderUniverseChips();
        runAnalysis();
        showAlert(`Successfully loaded ${parsed.ticker} into regression universe!`, 'info');
      } catch (err) {
        showAlert(err.message, 'warning');
      }
    };
    reader.readAsText(file);
  });
}

// ----------------------------------------------------
// Core Econometric Analysis Execution
// ----------------------------------------------------
function runAnalysis() {
  const benchmarkFund = allFunds.find(f => f.ticker === state.benchmarkTicker);
  if (!benchmarkFund) return;

  elements.statusBenchmarkName.textContent = `${benchmarkFund.ticker} - ${benchmarkFund.name}`;
  elements.statusUniverseCount.textContent = `${state.selectedTickers.size} Funds`;

  const selectedFunds = allFunds.filter(f => state.selectedTickers.has(f.ticker));
  const profiles = [];

  selectedFunds.forEach(fund => {
    const profile = analyzeFundRegression(fund, benchmarkFund, {
      useDRIP: state.useDRIP,
      annualRf: state.annualRf,
      windowMonths: state.windowMonths
    });
    if (profile) profiles.push(profile);
  });

  state.profiles = profiles;
  renderKPIHighlights();
  renderScorecardTable();
  renderCurrentChart();
}

// ----------------------------------------------------
// KPI Highlights
// ----------------------------------------------------
function renderKPIHighlights() {
  if (state.profiles.length === 0) {
    elements.kpiGrid.innerHTML = '';
    return;
  }

  // 1. Top Alpha Generator
  const topAlpha = [...state.profiles]
    .filter(p => p.ticker !== state.benchmarkTicker)
    .sort((a, b) => b.capm.annualizedAlpha - a.capm.annualizedAlpha)[0] || state.profiles[0];

  // 2. Best Sharpe Ratio
  const topSharpe = [...state.profiles].sort((a, b) => b.fundRisk.sharpeRatio - a.fundRisk.sharpeRatio)[0];

  // 3. Top Asymmetric Performer (Capture Ratio)
  const topCapture = [...state.profiles]
    .filter(p => p.ticker !== state.benchmarkTicker && p.dualBeta.captureRatio > 0)
    .sort((a, b) => b.dualBeta.captureRatio - a.dualBeta.captureRatio)[0] || state.profiles[0];

  // 4. Safest Capital Preserver (Lowest Drawdown or Beta)
  const safest = [...state.profiles].sort((a, b) => b.fundRisk.maxDrawdown - a.fundRisk.maxDrawdown)[0];

  elements.kpiGrid.innerHTML = `
    <!-- Top Alpha -->
    <div class="kpi-card alpha-card">
      <div class="kpi-header">
        <span class="kpi-label">Top Alpha Generator</span>
        <span class="kpi-badge badge-winner">★ Value Add</span>
      </div>
      <div class="kpi-ticker" style="color: ${topAlpha.color}">${topAlpha.ticker}</div>
      <div class="kpi-value green">+${(topAlpha.capm.annualizedAlpha * 100).toFixed(2)}% / Yr</div>
      <div class="kpi-subtext">True excess return above market expectations ($\beta = ${topAlpha.capm.beta}$)</div>
    </div>

    <!-- Best Sharpe Ratio -->
    <div class="kpi-card sharpe-card">
      <div class="kpi-header">
        <span class="kpi-label">Best Risk-Adjusted</span>
        <span class="kpi-badge badge-asymmetric">Sharpe ${topSharpe.fundRisk.sharpeRatio}</span>
      </div>
      <div class="kpi-ticker" style="color: ${topSharpe.color}">${topSharpe.ticker}</div>
      <div class="kpi-value purple">${(topSharpe.fundRisk.cagr * 100).toFixed(2)}% CAGR</div>
      <div class="kpi-subtext">Sortino: ${topSharpe.fundRisk.sortinoRatio} | Vol: ${(topSharpe.fundRisk.annualVolatility * 100).toFixed(1)}%</div>
    </div>

    <!-- Top Asymmetric -->
    <div class="kpi-card capture-card">
      <div class="kpi-header">
        <span class="kpi-label">Asymmetric Winner</span>
        <span class="kpi-badge badge-asymmetric">${topCapture.dualBeta.captureRatio}x Spread</span>
      </div>
      <div class="kpi-ticker" style="color: ${topCapture.color}">${topCapture.ticker}</div>
      <div class="kpi-value">${topCapture.dualBeta.upCapture.toFixed(0)}% Up / ${topCapture.dualBeta.downCapture.toFixed(0)}% Down</div>
      <div class="kpi-subtext">Captures more rallies while absorbing fewer crash losses</div>
    </div>

    <!-- Capital Preserver -->
    <div class="kpi-card defensive-card">
      <div class="kpi-header">
        <span class="kpi-label">Capital Preserver</span>
        <span class="kpi-badge badge-defensive">🛡️ Lowest DD</span>
      </div>
      <div class="kpi-ticker" style="color: ${safest.color}">${safest.ticker}</div>
      <div class="kpi-value" style="color: #60a5fa">${(safest.fundRisk.maxDrawdown * 100).toFixed(1)}% Max Drop</div>
      <div class="kpi-subtext">Market Beta: ${safest.capm.beta} | Vol: ${(safest.fundRisk.annualVolatility * 100).toFixed(1)}%</div>
    </div>
  `;
}

// ----------------------------------------------------
// Scorecard Table
// ----------------------------------------------------
function renderScorecardTable() {
  const sorted = [...state.profiles].sort((a, b) => {
    let valA, valB;
    switch (state.sortColumn) {
      case 'ticker': valA = a.ticker; valB = b.ticker; break;
      case 'cagr': valA = a.fundRisk.cagr; valB = b.fundRisk.cagr; break;
      case 'beta': valA = a.capm.beta; valB = b.capm.beta; break;
      case 'alpha': valA = a.capm.annualizedAlpha; valB = b.capm.annualizedAlpha; break;
      case 'rSquared': valA = a.capm.rSquared; valB = b.capm.rSquared; break;
      case 'vol': valA = a.fundRisk.annualVolatility; valB = b.fundRisk.annualVolatility; break;
      case 'sharpe': valA = a.fundRisk.sharpeRatio; valB = b.fundRisk.sharpeRatio; break;
      case 'sortino': valA = a.fundRisk.sortinoRatio; valB = b.fundRisk.sortinoRatio; break;
      case 'upCapture': valA = a.dualBeta.upCapture; valB = b.dualBeta.upCapture; break;
      case 'downCapture': valA = a.dualBeta.downCapture; valB = b.dualBeta.downCapture; break;
      case 'maxDrawdown': valA = a.fundRisk.maxDrawdown; valB = b.fundRisk.maxDrawdown; break;
      default: valA = a.capm.annualizedAlpha; valB = b.capm.annualizedAlpha;
    }
    if (typeof valA === 'string') {
      return state.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return state.sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  // Update table header sorting classes
  elements.sortHeaders.forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === state.sortColumn) {
      th.classList.add(state.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });

  elements.scorecardBody.innerHTML = '';
  sorted.forEach(p => {
    const isBench = p.ticker === state.benchmarkTicker;
    const alphaSign = p.capm.annualizedAlpha > 0 ? '+' : '';
    const alphaClass = isBench ? '' : (p.capm.annualizedAlpha > 0 ? 'badge-alpha-pos' : 'badge-alpha-neg');

    let badge = '';
    if (isBench) {
      badge = '<span class="badge-defensive">Benchmark</span>';
    } else if (p.capm.annualizedAlpha > 0.02 && p.fundRisk.sharpeRatio > 0.8) {
      badge = '<span class="badge-winner">★ High Alpha</span>';
    } else if (p.dualBeta.upCapture > p.dualBeta.downCapture && p.capm.beta <= 1.0) {
      badge = '<span class="badge-asymmetric">🚀 Asymmetric</span>';
    } else if (p.capm.beta < 0.6) {
      badge = '<span class="badge-defensive">🛡️ Defensive</span>';
    } else {
      badge = '<span style="color:#94a3b8; font-size:0.7rem;">Core Asset</span>';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong style="color:${p.color}">${p.ticker}</strong>
        <div style="font-size:0.72rem; color:#94a3b8;">${p.name}</div>
      </td>
      <td><strong>${(p.fundRisk.cagr * 100).toFixed(2)}%</strong></td>
      <td>${p.capm.beta.toFixed(2)}</td>
      <td class="${alphaClass}"><strong>${alphaSign}${(p.capm.annualizedAlpha * 100).toFixed(2)}%</strong></td>
      <td>${(p.capm.rSquared * 100).toFixed(1)}%</td>
      <td>${(p.fundRisk.annualVolatility * 100).toFixed(1)}%</td>
      <td><strong>${p.fundRisk.sharpeRatio.toFixed(2)}</strong></td>
      <td>${p.fundRisk.sortinoRatio.toFixed(2)}</td>
      <td style="color:#10b981">${p.dualBeta.upCapture.toFixed(0)}%</td>
      <td style="color:#f43f5e">${p.dualBeta.downCapture.toFixed(0)}%</td>
      <td style="color:#f59e0b">${(p.fundRisk.maxDrawdown * 100).toFixed(1)}%</td>
      <td>${badge}</td>
    `;
    elements.scorecardBody.appendChild(tr);
  });
}

function exportScorecardCSV() {
  if (state.profiles.length === 0) return;

  const headers = [
    'Ticker', 'Name', 'CAGR_Pct', 'Beta', 'Alpha_Annual_Pct', 'R_Squared_Pct',
    'Annual_Volatility_Pct', 'Sharpe_Ratio', 'Sortino_Ratio', 'Up_Capture_Pct',
    'Down_Capture_Pct', 'Max_Drawdown_Pct', 'Months_Analyzed'
  ];

  const rows = state.profiles.map(p => [
    p.ticker,
    `"${p.name.replace(/"/g, '""')}"`,
    (p.fundRisk.cagr * 100).toFixed(2),
    p.capm.beta.toFixed(4),
    (p.capm.annualizedAlpha * 100).toFixed(2),
    (p.capm.rSquared * 100).toFixed(2),
    (p.fundRisk.annualVolatility * 100).toFixed(2),
    p.fundRisk.sharpeRatio.toFixed(2),
    p.fundRisk.sortinoRatio.toFixed(2),
    p.dualBeta.upCapture.toFixed(2),
    p.dualBeta.downCapture.toFixed(2),
    (p.fundRisk.maxDrawdown * 100).toFixed(2),
    p.monthsCount
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `fund_regression_leaderboard_${state.benchmarkTicker}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ----------------------------------------------------
// High-DPI Canvas Rendering
// ----------------------------------------------------
function renderCurrentChart() {
  if (state.activeTab === 'sml') {
    renderSMLChart();
  } else if (state.activeTab === 'rolling') {
    renderRollingChart();
  } else if (state.activeTab === 'capture') {
    renderCaptureChart();
  }
}

/**
 * Tab 1: Security Market Line (SML) Scatter Plot
 * X: Beta (Market Risk) | Y: Annualized Return (Expected vs Actual)
 */
function renderSMLChart() {
  const canvas = elements.canvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = 420;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const pad = { top: 30, right: 40, bottom: 50, left: 65 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  if (state.profiles.length === 0) return;

  const benchProfile = state.profiles.find(p => p.ticker === state.benchmarkTicker);
  const rm = benchProfile ? benchProfile.fundRisk.cagr : 0.10;
  const rf = state.annualRf;

  // Determine bounds
  const betas = state.profiles.map(p => p.capm.beta);
  const returns = state.profiles.map(p => p.fundRisk.cagr);

  const minBeta = Math.min(0, ...betas);
  const maxBeta = Math.max(1.8, Math.max(...betas) * 1.15);

  const minRet = Math.min(-0.05, Math.min(...returns) * 1.2, rf - 0.02);
  const maxRet = Math.max(0.25, Math.max(...returns) * 1.2);

  const xToPx = beta => pad.left + ((beta - minBeta) / (maxBeta - minBeta)) * plotW;
  const yToPx = ret => pad.top + plotH - ((ret - minRet) / (maxRet - minRet)) * plotH;

  // Background Grid Lines
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';

  // Horizontal Grid (Returns)
  const retSteps = 6;
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';

  for (let i = 0; i <= retSteps; i++) {
    const val = minRet + (i / retSteps) * (maxRet - minRet);
    const py = yToPx(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(val * 100).toFixed(0)}%`, pad.left - 8, py + 4);
  }

  // Vertical Grid (Beta)
  const betaSteps = 6;
  ctx.textAlign = 'center';
  for (let i = 0; i <= betaSteps; i++) {
    const val = minBeta + (i / betaSteps) * (maxBeta - minBeta);
    const px = xToPx(val);
    ctx.beginPath();
    ctx.moveTo(px, pad.top);
    ctx.lineTo(px, pad.top + plotH);
    ctx.stroke();
    ctx.fillText(val.toFixed(1), px, pad.top + plotH + 18);
  }

  // SML Theoretical Line: Expected Return E(Ri) = Rf + Beta * (Rm - Rf)
  const smlY0 = yToPx(rf + minBeta * (rm - rf));
  const smlYMax = yToPx(rf + maxBeta * (rm - rf));

  // Shaded positive alpha zone (above SML)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
  ctx.beginPath();
  ctx.moveTo(xToPx(minBeta), smlY0);
  ctx.lineTo(xToPx(maxBeta), smlYMax);
  ctx.lineTo(xToPx(maxBeta), pad.top);
  ctx.lineTo(xToPx(minBeta), pad.top);
  ctx.closePath();
  ctx.fill();

  // Draw SML Line
  ctx.beginPath();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.moveTo(xToPx(minBeta), smlY0);
  ctx.lineTo(xToPx(maxBeta), smlYMax);
  ctx.stroke();
  ctx.setLineDash([]);

  // Labels for SML
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Security Market Line (SML: Expected Return)', xToPx(0.1), yToPx(rf + 0.1 * (rm - rf)) - 8);

  // Rf Marker on Y-axis
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`Rf: ${(rf * 100).toFixed(1)}%`, pad.left + 5, yToPx(rf) - 6);

  // Plot Funds as Dots
  let hoveredPoint = null;

  state.profiles.forEach(p => {
    const px = xToPx(p.capm.beta);
    const py = yToPx(p.fundRisk.cagr);
    const isBench = p.ticker === state.benchmarkTicker;

    // Check hover
    if (state.mousePos) {
      const dist = Math.hypot(state.mousePos.x - px, state.mousePos.y - py);
      if (dist < 14) {
        hoveredPoint = { p, px, py };
      }
    }

    // Outer Glow
    ctx.beginPath();
    ctx.arc(px, py, isBench ? 9 : 7, 0, Math.PI * 2);
    ctx.fillStyle = isBench ? '#a855f7' : (p.color || '#38bdf8');
    ctx.shadowColor = isBench ? 'rgba(168, 85, 247, 0.8)' : 'rgba(56, 189, 248, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // White Dot Center
    ctx.beginPath();
    ctx.arc(px, py, isBench ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Ticker label above dot
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(p.ticker, px, py - 11);
  });

  // Axis Titles
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.fillText('Market Beta (β) — Systematic Risk', pad.left + plotW / 2, pad.top + plotH + 40);

  ctx.save();
  ctx.translate(18, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Annualized Return (CAGR)', 0, 0);
  ctx.restore();

  // Floating Tooltip
  if (hoveredPoint) {
    drawSMLTooltip(ctx, hoveredPoint, w, h);
  }

  // Legend
  elements.chartLegend.innerHTML = `
    <span class="legend-item"><span style="display:inline-block; width:14px; height:2px; background:#38bdf8; border-top:1px dashed #38bdf8;"></span> Theoretical SML Line</span>
    <span class="legend-item"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span> Green Area: Positive Alpha Zone (Beating SML)</span>
    <span class="legend-item"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#a855f7;"></span> Purple Dot: Benchmark (${state.benchmarkTicker})</span>
  `;
}

function drawSMLTooltip(ctx, { p, px, py }, w, h) {
  const boxW = 210;
  const boxH = 115;
  let tx = px + 15;
  let ty = py - boxH - 10;

  if (tx + boxW > w - 10) tx = px - boxW - 15;
  if (ty < 10) ty = py + 15;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.strokeStyle = p.color || '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.roundRect(tx, ty, boxW, boxH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'left';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${p.ticker} - ${p.name}`, tx + 12, ty + 22);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Annual Return:`, tx + 12, ty + 42);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`${(p.fundRisk.cagr * 100).toFixed(2)}%`, tx + 130, ty + 42);

  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Market Beta (β):`, tx + 12, ty + 59);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${p.capm.beta.toFixed(2)}`, tx + 130, ty + 59);

  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Jensen's Alpha (α):`, tx + 12, ty + 76);
  ctx.fillStyle = p.capm.annualizedAlpha >= 0 ? '#10b981' : '#ef4444';
  ctx.fillText(`${(p.capm.annualizedAlpha * 100).toFixed(2)}%`, tx + 130, ty + 76);

  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Sharpe / R²:`, tx + 12, ty + 93);
  ctx.fillStyle = '#d8b4fe';
  ctx.fillText(`${p.fundRisk.sharpeRatio} / ${(p.capm.rSquared * 100).toFixed(0)}%`, tx + 130, ty + 93);
}

/**
 * Tab 2: Rolling Beta & Alpha Timeline Chart
 */
function renderRollingChart() {
  const canvas = elements.canvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = 420;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const profile = state.profiles.find(p => p.ticker === state.focusFundTicker) || state.profiles[0];
  if (!profile || !profile.rolling || profile.rolling.length === 0) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText(`Insufficient history to compute a ${state.windowMonths}-month rolling regression for this fund.`, w / 2, h / 2);
    return;
  }

  const rolling = profile.rolling;
  const pad = { top: 30, right: 40, bottom: 50, left: 65 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const betas = rolling.map(r => r.beta);
  const minBeta = Math.min(0.2, Math.min(...betas) - 0.2);
  const maxBeta = Math.max(1.6, Math.max(...betas) + 0.2);

  const xToPx = i => pad.left + (i / (rolling.length - 1)) * plotW;
  const yToPx = beta => pad.top + plotH - ((beta - minBeta) / (maxBeta - minBeta)) * plotH;

  // Grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  const steps = 6;
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';

  for (let i = 0; i <= steps; i++) {
    const val = minBeta + (i / steps) * (maxBeta - minBeta);
    const py = yToPx(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(val.toFixed(1), pad.left - 8, py + 4);
  }

  // 1.0 Benchmark Baseline
  const benchY = yToPx(1.0);
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.left, benchY);
  ctx.lineTo(pad.left + plotW, benchY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#a855f7';
  ctx.textAlign = 'left';
  ctx.fillText('Market Beta Baseline (1.0)', pad.left + 8, benchY - 6);

  // Draw Rolling Beta Curve
  ctx.beginPath();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;

  rolling.forEach((r, idx) => {
    const px = xToPx(idx);
    const py = yToPx(r.beta);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // X Axis Date labels
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  const labelCount = Math.min(6, rolling.length);
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.floor(i * (rolling.length - 1) / (labelCount - 1));
    const px = xToPx(idx);
    ctx.fillText(rolling[idx].date, px, pad.top + plotH + 18);
  }

  // Title
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.fillText(`${state.windowMonths}-Month Rolling Market Beta (β) for ${profile.ticker} vs ${state.benchmarkTicker}`, pad.left + plotW / 2, 18);

  // Legend
  elements.chartLegend.innerHTML = `
    <span class="legend-item"><span style="display:inline-block; width:14px; height:3px; background:#38bdf8;"></span> ${profile.ticker} Rolling Beta</span>
    <span class="legend-item"><span style="display:inline-block; width:14px; height:2px; background:#a855f7; border-top:1px dashed #a855f7;"></span> Market Beta (1.0)</span>
  `;
}

/**
 * Tab 3: Up vs Down Capture Ratio Comparison (Grouped Bar Chart)
 */
function renderCaptureChart() {
  const canvas = elements.canvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = 420;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const pad = { top: 30, right: 30, bottom: 50, left: 55 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  if (state.profiles.length === 0) return;

  const maxCap = Math.max(150, ...state.profiles.map(p => Math.max(p.dualBeta.upCapture, p.dualBeta.downCapture))) * 1.15;
  const yToPx = val => pad.top + plotH - (val / maxCap) * plotH;

  // 100% Benchmark Reference Line
  const y100 = yToPx(100);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.left, y100);
  ctx.lineTo(pad.left + plotW, y100);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('100% Market Match', pad.left + plotW - 8, y100 - 6);

  // Bars per fund
  const groupW = plotW / state.profiles.length;
  const barW = Math.min(28, groupW * 0.35);

  state.profiles.forEach((p, idx) => {
    const cx = pad.left + (idx + 0.5) * groupW;

    // Up Bar (Green)
    const upH = (p.dualBeta.upCapture / maxCap) * plotH;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(cx - barW - 2, pad.top + plotH - upH, barW, upH);

    // Down Bar (Red/Pink)
    const downH = (p.dualBeta.downCapture / maxCap) * plotH;
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(cx + 2, pad.top + plotH - downH, barW, downH);

    // Labels
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.ticker, cx, pad.top + plotH + 18);

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`${p.dualBeta.upCapture.toFixed(0)}%`, cx - barW / 2 - 2, pad.top + plotH - upH - 5);

    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`${p.dualBeta.downCapture.toFixed(0)}%`, cx + barW / 2 + 2, pad.top + plotH - downH - 5);
  });

  // Legend
  elements.chartLegend.innerHTML = `
    <span class="legend-item"><span style="display:inline-block; width:12px; height:12px; background:#10b981; border-radius:2px;"></span> Up-Market Capture % (Higher is Better)</span>
    <span class="legend-item"><span style="display:inline-block; width:12px; height:12px; background:#f43f5e; border-radius:2px;"></span> Down-Market Capture % (Lower is Better)</span>
    <span class="legend-item"><span style="display:inline-block; width:14px; height:2px; background:#94a3b8; border-top:1px dashed #94a3b8;"></span> 100% Baseline</span>
  `;
}

// ----------------------------------------------------
// Utilities
// ----------------------------------------------------
function showAlert(msg, type = 'info') {
  if (!elements.alertsContainer) return;
  const alert = document.createElement('div');
  alert.className = `alert-box alert-${type}`;
  alert.style.cssText = `
    background: ${type === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)'};
    border: 1px solid ${type === 'warning' ? '#f59e0b' : '#38bdf8'};
    color: ${type === 'warning' ? '#fde68a' : '#bae6fd'};
    padding: 0.65rem 1rem;
    border-radius: 6px;
    font-size: 0.82rem;
    margin-bottom: 1rem;
  `;
  alert.innerHTML = msg;
  elements.alertsContainer.appendChild(alert);
  setTimeout(() => alert.remove(), 6000);
}

function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
