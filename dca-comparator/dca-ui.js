/**
 * DCA Comparator UI Controller
 * Manages user interactions, file ingestion, preset toggles, high-DPI canvas charting, and KPI cards.
 */

import { PRESET_BENCHMARKS } from './preset-funds.js';
import {
  parseCSV,
  resampleToMonthly,
  findCommonDateRange,
  alignSeries,
  simulateDCA
} from './dca-engine.js';

// Vibrant neon-accessible color palette for funds
const FUND_COLORS = [
  '#3b82f6', // Electric Blue
  '#a855f7', // Bright Purple
  '#10b981', // Emerald Green
  '#f59e0b', // Amber / Orange
  '#ec4899', // Pink
];

// App State
const state = {
  // Pre-load VOO, QQQ, SCHD as default 3-way benchmark comparison
  activeFunds: [
    { ...PRESET_BENCHMARKS.find(b => b.ticker === 'VOO'), color: FUND_COLORS[0] },
    { ...PRESET_BENCHMARKS.find(b => b.ticker === 'QQQ'), color: FUND_COLORS[1] },
    { ...PRESET_BENCHMARKS.find(b => b.ticker === 'SCHD'), color: FUND_COLORS[2] }
  ],
  initialBalance: 1000,
  monthlyDeposit: 500,
  useDRIP: true,
  viewMode: 'calendar', // 'calendar' | 'elapsed'
  customStart: null,
  customEnd: null,
  hoverIndex: -1
};

// Simulation results cache for rendering
let currentSimulationResults = null;

// DOM Elements
let elements = {};

export function initDCAComparator() {
  cacheDOMElements();
  renderPresetChips();
  attachEventListeners();
  runComparison();
}

function cacheDOMElements() {
  elements = {
    dropzone: document.getElementById('dca-dropzone'),
    fileInput: document.getElementById('dca-file-input'),
    presetChips: document.getElementById('preset-chips'),
    activeFundsList: document.getElementById('active-funds-list'),
    inputInitial: document.getElementById('input-initial-balance'),
    inputMonthly: document.getElementById('input-monthly-deposit'),
    checkDRIP: document.getElementById('check-drip'),
    btnModeCalendar: document.getElementById('btn-mode-calendar'),
    btnModeElapsed: document.getElementById('btn-mode-elapsed'),
    selectStartMonth: document.getElementById('select-start-month'),
    selectEndMonth: document.getElementById('select-end-month'),
    presetDateButtons: document.querySelectorAll('.btn-date-preset'),
    statusBar: document.getElementById('dca-status-bar'),
    statusMonths: document.getElementById('status-total-months'),
    statusBottleneck: document.getElementById('status-bottleneck'),
    kpiCardsContainer: document.getElementById('kpi-cards-container'),
    chartCanvas: document.getElementById('dca-chart-canvas'),
    chartLegend: document.getElementById('chart-legend'),
    alertsContainer: document.getElementById('dca-alerts-container'),
    detailsTableBody: document.getElementById('details-table-body'),
    detailsTableHead: document.getElementById('details-table-head')
  };
}

function renderPresetChips() {
  if (!elements.presetChips) return;
  elements.presetChips.innerHTML = '';

  PRESET_BENCHMARKS.forEach(preset => {
    const isActive = state.activeFunds.some(f => f.ticker === preset.ticker);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `preset-chip ${isActive ? 'active' : ''}`;
    chip.innerHTML = `
      <span class="preset-dot" style="background-color: ${preset.color}"></span>
      <span>${preset.ticker}</span>
    `;
    chip.title = `${preset.name} (${preset.assetClass}) - Inception ${preset.inception}`;
    chip.addEventListener('click', () => togglePresetFund(preset));
    elements.presetChips.appendChild(chip);
  });
}

function togglePresetFund(preset) {
  const existingIndex = state.activeFunds.findIndex(f => f.ticker === preset.ticker);
  if (existingIndex !== -1) {
    if (state.activeFunds.length <= 1) {
      showAlert('At least 1 fund must remain active for comparison.', 'warning');
      return;
    }
    state.activeFunds.splice(existingIndex, 1);
  } else {
    if (state.activeFunds.length >= 3) {
      // Replace the last one
      state.activeFunds.pop();
    }
    const color = FUND_COLORS[state.activeFunds.length % FUND_COLORS.length];
    state.activeFunds.push({ ...preset, color });
  }

  // Re-assign colors to keep them distinctive
  state.activeFunds.forEach((f, idx) => {
    f.color = FUND_COLORS[idx % FUND_COLORS.length];
  });

  renderPresetChips();
  renderActiveFundsList();
  resetDateRangeToMax();
  runComparison();
}

function renderActiveFundsList() {
  if (!elements.activeFundsList) return;
  elements.activeFundsList.innerHTML = '';

  state.activeFunds.forEach((fund, index) => {
    const item = document.createElement('div');
    item.className = 'active-fund-item';
    item.style.borderLeftColor = fund.color;

    const start = fund.data[0]?.date || '';
    const end = fund.data[fund.data.length - 1]?.date || '';
    const pts = fund.data.length;

    item.innerHTML = `
      <div class="fund-meta">
        <div class="fund-ticker-title">
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${fund.color};"></span>
          <span>${fund.ticker || fund.name}</span>
          ${fund.expenseRatio ? `<span style="font-size:0.7rem; font-weight:normal; color:#94a3b8;">(${fund.expenseRatio} ER)</span>` : ''}
        </div>
        <div class="fund-dates-subtext">
          ${start} → ${end} (${pts} monthly records)
        </div>
      </div>
      <button type="button" class="btn-remove-fund" title="Remove ${fund.ticker}">×</button>
    `;

    item.querySelector('.btn-remove-fund').addEventListener('click', () => {
      if (state.activeFunds.length <= 1) {
        showAlert('At least 1 fund must remain active.', 'warning');
        return;
      }
      state.activeFunds.splice(index, 1);
      state.activeFunds.forEach((f, idx) => {
        f.color = FUND_COLORS[idx % FUND_COLORS.length];
      });
      renderPresetChips();
      renderActiveFundsList();
      resetDateRangeToMax();
      runComparison();
    });

    elements.activeFundsList.appendChild(item);
  });
}

function attachEventListeners() {
  // Input fields
  elements.inputInitial.addEventListener('input', e => {
    state.initialBalance = Math.max(0, parseFloat(e.target.value) || 0);
    runComparison();
  });

  elements.inputMonthly.addEventListener('input', e => {
    state.monthlyDeposit = Math.max(0, parseFloat(e.target.value) || 0);
    runComparison();
  });

  // DRIP toggle
  elements.checkDRIP.addEventListener('change', e => {
    state.useDRIP = e.target.checked;
    runComparison();
  });

  // Mode buttons
  elements.btnModeCalendar.addEventListener('click', () => {
    if (state.viewMode === 'calendar') return;
    state.viewMode = 'calendar';
    elements.btnModeCalendar.classList.add('active');
    elements.btnModeElapsed.classList.remove('active');
    runComparison();
  });

  elements.btnModeElapsed.addEventListener('click', () => {
    if (state.viewMode === 'elapsed') return;
    state.viewMode = 'elapsed';
    elements.btnModeElapsed.classList.add('active');
    elements.btnModeCalendar.classList.remove('active');
    runComparison();
  });

  // Start / End Month selectors
  elements.selectStartMonth.addEventListener('change', e => {
    state.customStart = e.target.value;
    runComparison();
  });

  elements.selectEndMonth.addEventListener('change', e => {
    state.customEnd = e.target.value;
    runComparison();
  });

  // Date Presets
  elements.presetDateButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.presetDateButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyDatePreset(btn.dataset.preset);
    });
  });

  // Drag & Drop
  const dropzone = elements.dropzone;
  const fileInput = elements.fileInput;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUploadedFiles(files);
    }
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files.length > 0) {
      handleUploadedFiles(e.target.files);
      fileInput.value = ''; // reset
    }
  });

  // Canvas Hover Tooltip & Crosshair
  elements.chartCanvas.addEventListener('mousemove', handleChartMouseMove);
  elements.chartCanvas.addEventListener('mouseleave', handleChartMouseLeave);

  // Resize listener
  window.addEventListener('resize', debounce(() => {
    if (currentSimulationResults) {
      renderChart(currentSimulationResults);
    }
  }, 100));
}

function handleUploadedFiles(files) {
  const fileList = Array.from(files).filter(f =>
    f.name.endsWith('.csv') ||
    f.name.endsWith('.txt') ||
    f.type.includes('csv') ||
    f.type.includes('plain')
  );
  if (fileList.length === 0) {
    showAlert('Please upload standard CSV or Stooq text files (.csv, .txt).', 'warning');
    return;
  }

  let filesProcessed = 0;
  const newFunds = [];

  fileList.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target.result;
        const parsed = parseCSV(text, file.name);
        if (parsed.warnings.length > 0) {
          parsed.warnings.forEach(w => showAlert(w, 'warning'));
        }

        const monthly = resampleToMonthly(parsed.rows);
        if (monthly.length === 0) {
          showAlert(`Could not extract monthly price points from "${file.name}".`, 'warning');
          return;
        }

        const color = FUND_COLORS[(state.activeFunds.length + newFunds.length) % FUND_COLORS.length];
        newFunds.push({
          id: `custom_${Date.now()}_${newFunds.length}`,
          ticker: parsed.ticker,
          name: `${parsed.ticker} (Custom Upload)`,
          color,
          data: monthly
        });
      } catch (err) {
        showAlert(err.message, 'warning');
      } finally {
        filesProcessed++;
        if (filesProcessed === fileList.length && newFunds.length > 0) {
          addUploadedFunds(newFunds);
        }
      }
    };
    reader.readAsText(file);
  });
}

function addUploadedFunds(newFunds) {
  // Combine with active funds, cap at 3
  let combined = [...state.activeFunds, ...newFunds];
  if (combined.length > 3) {
    // Keep up to 3 most recent
    combined = combined.slice(combined.length - 3);
  }

  // Re-assign distinct colors
  combined.forEach((f, idx) => {
    f.color = FUND_COLORS[idx % FUND_COLORS.length];
  });

  state.activeFunds = combined;
  renderPresetChips();
  renderActiveFundsList();
  resetDateRangeToMax();
  runComparison();
  showAlert(`Successfully loaded ${newFunds.map(f => f.ticker).join(', ')}!`, 'info');
}

function resetDateRangeToMax() {
  state.customStart = null;
  state.customEnd = null;
  elements.presetDateButtons.forEach(b => {
    if (b.dataset.preset === 'max') b.classList.add('active');
    else b.classList.remove('active');
  });
}

function applyDatePreset(preset) {
  const common = findCommonDateRange(state.activeFunds);
  if (!common.start || !common.end) return;

  if (preset === 'max') {
    state.customStart = null;
    state.customEnd = null;
    runComparison();
    return;
  }

  const endParts = common.end.split('-');
  const endYear = parseInt(endParts[0], 10);
  const endMonth = parseInt(endParts[1], 10);

  let yearsBack = 5;
  if (preset === '1y') yearsBack = 1;
  else if (preset === '3y') yearsBack = 3;
  else if (preset === '5y') yearsBack = 5;
  else if (preset === '10y') yearsBack = 10;

  const targetYear = endYear - yearsBack;
  const candidateStart = `${targetYear}-${String(endMonth).padStart(2, '0')}`;

  state.customStart = candidateStart >= common.start ? candidateStart : common.start;
  state.customEnd = common.end;

  runComparison();
}

/**
 * Main execution loop: aligns active series, runs DCA, and triggers visual updates.
 */
export function runComparison() {
  if (state.activeFunds.length === 0) {
    showAlert('Select or upload at least one fund to compare.', 'warning');
    return;
  }

  renderActiveFundsList();

  const common = findCommonDateRange(state.activeFunds);
  populateDateDropdowns(common);

  const alignment = alignSeries(state.activeFunds, {
    mode: state.viewMode,
    customStart: state.customStart,
    customEnd: state.customEnd
  });

  if (alignment.dates.length === 0) {
    showAlert('No overlapping date records found for the selected funds and range.', 'warning');
    return;
  }

  // Update status bar
  updateStatusBar(common, alignment.dates);

  // Execute DCA for each aligned fund series
  const simulations = alignment.series.map(s => {
    // Run active simulation with user's current DRIP setting
    const activeSim = simulateDCA(s.data, {
      initialBalance: state.initialBalance,
      monthlyDeposit: state.monthlyDeposit,
      useDRIP: state.useDRIP
    });

    // Also run paired simulation (DRIP ON vs DRIP OFF) to quantify exact dividend contribution
    const simDRIP = state.useDRIP
      ? activeSim
      : simulateDCA(s.data, {
          initialBalance: state.initialBalance,
          monthlyDeposit: state.monthlyDeposit,
          useDRIP: true
        });

    const simNoDRIP = !state.useDRIP
      ? activeSim
      : simulateDCA(s.data, {
          initialBalance: state.initialBalance,
          monthlyDeposit: state.monthlyDeposit,
          useDRIP: false
        });

    const dripPayback = Math.max(0, simDRIP.metrics.finalBalance - simNoDRIP.metrics.finalBalance);
    const dripPaybackPct = simNoDRIP.metrics.finalBalance > 0
      ? (dripPayback / simNoDRIP.metrics.finalBalance) * 100
      : 0;

    return {
      fund: s.fund,
      trajectory: activeSim.trajectory,
      metrics: activeSim.metrics,
      dripPayback,
      dripPaybackPct,
      dripFinalBalance: simDRIP.metrics.finalBalance,
      noDripFinalBalance: simNoDRIP.metrics.finalBalance
    };
  });

  // Extract shared principal contributed curve
  const dates = alignment.dates;
  const totalContributedCurve = simulations[0].trajectory.map(t => t.totalContributed);

  currentSimulationResults = {
    dates,
    simulations,
    totalContributedCurve,
    viewMode: state.viewMode,
    useDRIP: state.useDRIP
  };

  renderKPICards(simulations);
  renderChartLegend(simulations);
  renderChart(currentSimulationResults);
  renderDetailsTable(dates, simulations, totalContributedCurve);
}

function updateStatusBar(common, activeDates) {
  if (!elements.statusBar) return;

  if (elements.statusMonths) {
    elements.statusMonths.textContent = `${activeDates.length} Months (${(activeDates.length / 12).toFixed(1)} Yrs)`;
  }

  if (elements.statusBottleneck) {
    if (state.viewMode === 'elapsed') {
      elements.statusBottleneck.textContent = 'Elapsed Mode: Normalized to Month 0';
      elements.statusBottleneck.className = 'status-pill highlight';
    } else if (common.limitingFund && state.activeFunds.length > 1) {
      elements.statusBottleneck.textContent = `Intersection limited by ${common.limitingFund} (${common.start})`;
      elements.statusBottleneck.className = 'status-pill bottleneck';
    } else {
      elements.statusBottleneck.textContent = `${activeDates[0]} → ${activeDates[activeDates.length - 1]}`;
      elements.statusBottleneck.className = 'status-pill highlight';
    }
  }
}

function populateDateDropdowns(common) {
  if (!elements.selectStartMonth || !elements.selectEndMonth) return;
  if (!common.start || !common.end) return;

  // Build full monthly list between common.start and common.end
  const months = [];
  const [sYr, sMo] = common.start.split('-').map(Number);
  const [eYr, eMo] = common.end.split('-').map(Number);

  let curYr = sYr;
  let curMo = sMo;
  while (curYr < eYr || (curYr === eYr && curMo <= eMo)) {
    months.push(`${curYr}-${String(curMo).padStart(2, '0')}`);
    curMo++;
    if (curMo > 12) {
      curMo = 1;
      curYr++;
    }
  }

  const activeStart = state.customStart || common.start;
  const activeEnd = state.customEnd || common.end;

  elements.selectStartMonth.innerHTML = months
    .map(m => `<option value="${m}" ${m === activeStart ? 'selected' : ''}>${m}</option>`)
    .join('');

  elements.selectEndMonth.innerHTML = months
    .map(m => `<option value="${m}" ${m === activeEnd ? 'selected' : ''}>${m}</option>`)
    .join('');
}

function renderKPICards(simulations) {
  if (!elements.kpiCardsContainer) return;
  elements.kpiCardsContainer.innerHTML = '';

  // Determine top performer
  let maxFinalValue = -Infinity;
  simulations.forEach(s => {
    if (s.metrics.finalBalance > maxFinalValue) {
      maxFinalValue = s.metrics.finalBalance;
    }
  });

  simulations.forEach(s => {
    const isLeader = simulations.length > 1 && s.metrics.finalBalance === maxFinalValue;
    const card = document.createElement('div');
    card.className = `kpi-card ${isLeader ? 'leader' : ''}`;
    card.style.borderTopColor = s.fund.color;

    const netProfit = s.metrics.netProfit;
    const isPositive = netProfit >= 0;

    const isDripActive = state.useDRIP;
    const dripPillHtml = `
      <div class="kpi-drip-pill ${isDripActive ? '' : 'inactive'}" title="${isDripActive ? 'Gain added purely by reinvesting dividends into additional shares' : 'Dividends foregone by taking price return only'}">
        <span class="drip-pill-label">
          ${isDripActive ? '💰 DRIP Payback:' : '💤 Foregone DRIP:'}
        </span>
        <span class="drip-pill-val">
          +${formatCurrency(s.dripPayback)} (+${s.dripPaybackPct.toFixed(1)}% ${isDripActive ? 'boost' : 'if on'})
        </span>
      </div>
    `;

    card.innerHTML = `
      ${isLeader ? '<div class="leader-badge">★ Top Performer</div>' : ''}
      <div class="kpi-card-header">
        <div class="kpi-fund-title">
          <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${s.fund.color};"></span>
          <span>${s.fund.ticker || s.fund.name}</span>
        </div>
        <div class="kpi-fund-sub">${s.fund.name || ''}</div>
      </div>

      <div class="kpi-final-value">${formatCurrency(s.metrics.finalBalance)}</div>
      <div class="kpi-profit-gain ${isPositive ? '' : 'negative'}">
        ${isPositive ? '+' : ''}${formatCurrency(netProfit)} (${s.metrics.totalReturnPct.toFixed(1)}%)
      </div>

      ${dripPillHtml}

      <div class="kpi-stats-table">
        <div class="kpi-stat-row">
          <span>Total Invested</span>
          <strong>${formatCurrency(s.metrics.totalInvested)}</strong>
        </div>
        <div class="kpi-stat-row">
          <span>Capital Appreciation (Price)</span>
          <strong>${formatCurrency(s.noDripFinalBalance)}</strong>
        </div>
        <div class="kpi-stat-row">
          <span>Reinvested Dividends</span>
          <strong style="color: #2dd4bf;">+${formatCurrency(s.dripPayback)}</strong>
        </div>
        <div class="kpi-stat-row">
          <span>Annualized Return (CAGR)</span>
          <strong>${s.metrics.cagrPct.toFixed(2)}%</strong>
        </div>
        <div class="kpi-stat-row">
          <span>Money-Weighted IRR</span>
          <strong style="color: #38bdf8;">${s.metrics.irrPct.toFixed(2)}%</strong>
        </div>
        <div class="kpi-stat-row">
          <span>Max Peak Drawdown</span>
          <strong style="color: ${s.metrics.maxDrawdownPct < -20 ? '#ef4444' : 'inherit'};">
            ${s.metrics.maxDrawdownPct.toFixed(1)}%
          </strong>
        </div>
        <div class="kpi-stat-row">
          <span>Accumulated Shares</span>
          <strong>${s.metrics.finalShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
      </div>
    `;

    elements.kpiCardsContainer.appendChild(card);
  });
}

function renderChartLegend(simulations) {
  if (!elements.chartLegend) return;
  elements.chartLegend.innerHTML = '';

  // Neutral Dashed Contributed line
  const contribItem = document.createElement('div');
  contribItem.className = 'legend-item';
  contribItem.innerHTML = `
    <span class="legend-color-line dashed"></span>
    <span>Total Principal Invested</span>
  `;
  elements.chartLegend.appendChild(contribItem);

  simulations.forEach(s => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <span class="legend-color-line" style="background-color: ${s.fund.color};"></span>
      <span style="font-weight:700; color:var(--text-primary);">${s.fund.ticker || s.fund.name}</span>
    `;
    elements.chartLegend.appendChild(item);
  });
}

/**
 * High-DPI Canvas Line Chart Renderer with crosshairs and rich tooltips.
 */
function renderChart(data) {
  const canvas = elements.chartCanvas;
  if (!canvas || !data || data.dates.length === 0) return;

  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const width = rect.width || 800;
  const height = rect.height || 440;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padding = { top: 25, right: 30, bottom: 45, left: 75 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Compute Max Y value
  let maxY = Math.max(...data.totalContributedCurve);
  data.simulations.forEach(s => {
    s.trajectory.forEach(t => {
      if (t.portfolioValue > maxY) maxY = t.portfolioValue;
    });
  });
  // Add 10% headroom
  maxY = maxY * 1.1 || 1000;

  function toX(index) {
    return padding.left + (index / (data.dates.length - 1)) * chartWidth;
  }

  function toY(val) {
    return padding.top + chartHeight - (val / maxY) * chartHeight;
  }

  // Clear Canvas
  ctx.clearRect(0, 0, width, height);

  // 1. Draw Grid Lines & Y-Axis Labels
  const ySteps = 5;
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= ySteps; i++) {
    const val = (maxY / ySteps) * i;
    const y = toY(val);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(formatCompactCurrency(val), padding.left - 10, y);
  }

  // 2. Draw X-Axis Ticks & Labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const maxTicks = Math.min(10, data.dates.length);
  const step = Math.max(1, Math.floor(data.dates.length / maxTicks));

  for (let i = 0; i < data.dates.length; i += step) {
    const x = toX(i);
    const label = data.dates[i];

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(label, x, padding.top + chartHeight + 8);
  }

  // 3. Draw Total Principal Contributed (Dashed Line)
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  data.totalContributedCurve.forEach((val, i) => {
    const x = toX(i);
    const y = toY(val);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();

  // 4. Draw Fund Curves
  data.simulations.forEach(s => {
    ctx.strokeStyle = s.fund.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    s.trajectory.forEach((t, i) => {
      const x = toX(i);
      const y = toY(t.portfolioValue);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // 5. Draw Hover Crosshair and Floating Tooltip
  if (state.hoverIndex >= 0 && state.hoverIndex < data.dates.length) {
    const hIdx = state.hoverIndex;
    const hX = toX(hIdx);

    // Crosshair vertical line
    ctx.save();
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(hX, padding.top);
    ctx.lineTo(hX, padding.top + chartHeight);
    ctx.stroke();
    ctx.restore();

    // Data points dots
    data.simulations.forEach(s => {
      const val = s.trajectory[hIdx].portfolioValue;
      const y = toY(val);
      ctx.fillStyle = s.fund.color;
      ctx.beginPath();
      ctx.arc(hX, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Tooltip Content
    const tooltipLines = [
      { text: `📅 ${data.dates[hIdx]}`, bold: true, color: '#f1f5f9' },
      { text: `Contributed: ${formatCurrency(data.totalContributedCurve[hIdx])}`, color: '#94a3b8' }
    ];

    data.simulations.forEach(s => {
      const val = s.trajectory[hIdx].portfolioValue;
      tooltipLines.push({
        text: `${s.fund.ticker || s.fund.name}: ${formatCurrency(val)}`,
        color: s.fund.color,
        bold: true
      });
    });

    drawTooltipBox(ctx, tooltipLines, hX, padding.top + 20, {
      top: padding.top,
      right: width - padding.right,
      bottom: padding.top + chartHeight,
      left: padding.left,
      width,
      height
    });
  }
}

function drawTooltipBox(ctx, lines, x, y, bounds) {
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  let maxWidth = 0;
  lines.forEach(l => {
    const w = ctx.measureText(l.text).width;
    if (w > maxWidth) maxWidth = w;
  });

  const boxWidth = maxWidth + 24;
  const boxHeight = lines.length * 20 + 16;

  let boxX = x + 15;
  let boxY = y;

  // Clamp right edge
  if (boxX + boxWidth > bounds.right) {
    boxX = x - boxWidth - 15;
  }
  // Clamp bottom edge
  if (boxY + boxHeight > bounds.bottom) {
    boxY = bounds.bottom - boxHeight;
  }

  // Draw background pill
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  const r = 6;
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, r);
  ctx.fill();
  ctx.stroke();

  // Draw text lines
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((l, idx) => {
    ctx.fillStyle = l.color || '#f1f5f9';
    ctx.font = l.bold
      ? 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif'
      : '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(l.text, boxX + 12, boxY + 16 + idx * 20);
  });
  ctx.restore();
}

function handleChartMouseMove(e) {
  if (!currentSimulationResults || currentSimulationResults.dates.length === 0) return;

  const canvas = elements.chartCanvas;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;

  const padding = { top: 25, right: 30, bottom: 45, left: 75 };
  const chartWidth = rect.width - padding.left - padding.right;

  if (mouseX < padding.left || mouseX > rect.width - padding.right) {
    state.hoverIndex = -1;
  } else {
    const fraction = (mouseX - padding.left) / chartWidth;
    const index = Math.round(fraction * (currentSimulationResults.dates.length - 1));
    state.hoverIndex = Math.max(0, Math.min(index, currentSimulationResults.dates.length - 1));
  }

  renderChart(currentSimulationResults);
}

function handleChartMouseLeave() {
  state.hoverIndex = -1;
  if (currentSimulationResults) {
    renderChart(currentSimulationResults);
  }
}

function renderDetailsTable(dates, simulations, totalContributedCurve) {
  if (!elements.detailsTableHead || !elements.detailsTableBody) return;

  // Build Table Header
  let headHtml = '<tr><th>Month / Date</th><th>Principal Invested</th>';
  simulations.forEach(s => {
    headHtml += `<th style="color:${s.fund.color}">${s.fund.ticker || s.fund.name} Balance</th>`;
  });
  headHtml += '</tr>';
  elements.detailsTableHead.innerHTML = headHtml;

  // Build Table Rows (reverse chronological order or periodic sample)
  let rowsHtml = '';
  // Show every 3 months for long series, or monthly if < 36 months
  const step = dates.length > 48 ? 3 : 1;

  for (let i = dates.length - 1; i >= 0; i -= step) {
    rowsHtml += `<tr><td><strong>${dates[i]}</strong></td><td>${formatCurrency(totalContributedCurve[i])}</td>`;
    simulations.forEach(s => {
      rowsHtml += `<td>${formatCurrency(s.trajectory[i].portfolioValue)}</td>`;
    });
    rowsHtml += '</tr>';
  }
  elements.detailsTableBody.innerHTML = rowsHtml;
}

function showAlert(message, type = 'info') {
  if (!elements.alertsContainer) return;
  const alert = document.createElement('div');
  alert.className = `dca-alert ${type === 'warning' ? 'dca-alert-warning' : 'dca-alert-info'}`;
  alert.innerHTML = `
    <span>${type === 'warning' ? '⚠️' : 'ℹ️'}</span>
    <span>${message}</span>
  `;
  elements.alertsContainer.appendChild(alert);

  setTimeout(() => {
    alert.style.opacity = '0';
    alert.style.transition = 'opacity 0.5s ease';
    setTimeout(() => alert.remove(), 500);
  }, 6000);
}

// Helpers
function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
}

function formatCompactCurrency(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
  return `$${val.toFixed(0)}`;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Auto-boot if loaded in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initDCAComparator);
}

export default {
  initDCAComparator,
  runComparison
};
