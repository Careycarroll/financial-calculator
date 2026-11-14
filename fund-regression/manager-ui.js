/**
 * Manager Performance Analysis Studio UI Controller
 * Manages active manager vs. benchmark evaluation, interactive asset picking,
 * trailing performance scorecard, annual excess return bar chart,
 * dual-axis rolling 36-month excess/tracking error chart, relative drawdown chart,
 * and Student's t-test statistical manager skill analysis.
 */

import {
  analyzeManagerPerformance
} from './manager-engine.js';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import { openAssetModal } from '../js/asset-modal.js';
import { getAllFundsSync, subscribeSessionFunds } from '../js/session-funds.js';
import { rafThrottle, formatCurrency } from '../js/chart-utils.js';

// Reactive State
const state = {
  managerTicker: 'QQQ',
  benchTicker: 'SPY',
  annualRf: 0.03,
  rollingMonths: 36,
  confidenceLevel: 0.80,
  useDRIP: true,
  lastResult: null
};

// DOM Elements Cache
const elements = {};

function initDom() {
  elements.statusManagerName = document.getElementById('status-manager-name');
  elements.statusBenchName = document.getElementById('status-bench-name');
  elements.statusTimeline = document.getElementById('status-timeline');
  elements.statusTotalMonths = document.getElementById('status-total-months');
  elements.statusExcessVal = document.getElementById('status-excess-val');
  elements.statusIrVal = document.getElementById('status-ir-val');

  elements.configCard = document.getElementById('config-card');
  elements.btnToggleConfig = document.getElementById('btn-toggle-config-panel');
  elements.btnConfigText = document.getElementById('btn-config-text');

  elements.managerTickerDisplay = document.getElementById('manager-ticker-display');
  elements.managerNameDisplay = document.getElementById('manager-name-display');
  elements.managerDot = document.getElementById('manager-dot');
  elements.btnChangeManager = document.getElementById('btn-change-manager');

  elements.benchTickerDisplay = document.getElementById('bench-ticker-display');
  elements.benchNameDisplay = document.getElementById('bench-name-display');
  elements.benchDot = document.getElementById('bench-dot');
  elements.btnChangeBench = document.getElementById('btn-change-bench');

  elements.selectRollingWindow = document.getElementById('select-rolling-window');
  elements.selectConfidenceLevel = document.getElementById('select-confidence-level');
  elements.inputAnnualRf = document.getElementById('input-annual-rf');
  elements.checkDrip = document.getElementById('check-drip');
  elements.btnRunAnalysis = document.getElementById('btn-run-analysis');

  elements.metricExcessReturn = document.getElementById('metric-excess-return');
  elements.metricFundCagr = document.getElementById('metric-fund-cagr');
  elements.metricBenchCagr = document.getElementById('metric-bench-cagr');
  elements.metricTrackingError = document.getElementById('metric-tracking-error');
  elements.metricInformationRatio = document.getElementById('metric-information-ratio');
  elements.metricWinRate = document.getElementById('metric-win-rate');
  elements.metricWinCounts = document.getElementById('metric-win-counts');

  elements.skillTitle = document.getElementById('skill-title');
  elements.skillText = document.getElementById('skill-text');

  elements.trailingTableBody = document.getElementById('trailing-table-body');

  elements.canvasAnnualExcess = document.getElementById('canvas-annual-excess');
  elements.containerAnnualExcess = document.getElementById('container-annual-excess');
  elements.tooltipAnnualExcess = document.getElementById('tooltip-annual-excess');

  elements.canvasRollingExcess = document.getElementById('canvas-rolling-excess');
  elements.containerRollingExcess = document.getElementById('container-rolling-excess');
  elements.tooltipRollingExcess = document.getElementById('tooltip-rolling-excess');
  elements.rollingMonthsLabel = document.getElementById('rolling-months-label');

  elements.canvasRelativeDd = document.getElementById('canvas-relative-dd');
  elements.containerRelativeDd = document.getElementById('container-relative-dd');
  elements.tooltipRelativeDd = document.getElementById('tooltip-relative-dd');

  elements.distributionTableBody = document.getElementById('distribution-table-body');
  elements.regimeTableBody = document.getElementById('regime-table-body');
  elements.annualReturnsTableBody = document.getElementById('annual-returns-table-body');
  elements.colManagerRet = document.getElementById('col-manager-ret');
  elements.colBenchRet = document.getElementById('col-bench-ret');
  elements.btnExportCsv = document.getElementById('btn-export-csv');
}

// -------------------------------------------------------------------
// Resolve Fund from session or presets
// -------------------------------------------------------------------
function resolveFund(ticker) {
  const sym = ticker.toUpperCase();
  const sessionFunds = getAllFundsSync();
  const foundSession = sessionFunds.find(f => f.ticker.toUpperCase() === sym);
  if (foundSession) return foundSession;

  const foundPreset = PRESET_BENCHMARKS.find(f => f.ticker.toUpperCase() === sym);
  if (foundPreset) return foundPreset;

  return null;
}

// -------------------------------------------------------------------
// Update UI Header Cards for Pickers
// -------------------------------------------------------------------
function updatePickerCards() {
  const mFund = resolveFund(state.managerTicker);
  const bFund = resolveFund(state.benchTicker);

  if (elements.managerTickerDisplay) elements.managerTickerDisplay.textContent = state.managerTicker;
  if (elements.managerNameDisplay) elements.managerNameDisplay.textContent = mFund ? mFund.name : state.managerTicker;
  if (elements.managerDot && mFund?.color) elements.managerDot.style.background = mFund.color;

  if (elements.benchTickerDisplay) elements.benchTickerDisplay.textContent = state.benchTicker;
  if (elements.benchNameDisplay) elements.benchNameDisplay.textContent = bFund ? bFund.name : state.benchTicker;
  if (elements.benchDot && bFund?.color) elements.benchDot.style.background = bFund.color;

  if (elements.colManagerRet) elements.colManagerRet.textContent = `${state.managerTicker} Return`;
  if (elements.colBenchRet) elements.colBenchRet.textContent = `${state.benchTicker} Return`;

  if (elements.rollingMonthsLabel) elements.rollingMonthsLabel.textContent = state.rollingMonths;
}

// -------------------------------------------------------------------
// Main Analysis Calculation
// -------------------------------------------------------------------
function runAnalysis() {
  try {
    const manager = resolveFund(state.managerTicker);
    const bench = resolveFund(state.benchTicker);

    if (!manager) throw new Error(`Could not find historical data for manager ${state.managerTicker}.`);
    if (!bench) throw new Error(`Could not find historical data for benchmark ${state.benchTicker}.`);

    const result = analyzeManagerPerformance(manager, bench, {
      useDRIP: state.useDRIP,
      annualRf: state.annualRf,
      rollingMonths: state.rollingMonths,
      confidenceLevel: state.confidenceLevel
    });

    state.lastResult = result;

    // Update Status Bar
    if (elements.statusManagerName) elements.statusManagerName.textContent = result.manager.ticker;
    if (elements.statusBenchName) elements.statusBenchName.textContent = result.benchmark.ticker;
    if (elements.statusTimeline) elements.statusTimeline.textContent = `${result.startDate} to ${result.endDate}`;
    if (elements.statusTotalMonths) elements.statusTotalMonths.textContent = `(${result.totalMonths} Months)`;
    if (elements.statusExcessVal) {
      const ex = result.fullTrailing.excessReturn * 100;
      elements.statusExcessVal.textContent = `${ex >= 0 ? '+' : ''}${ex.toFixed(2)}%`;
      elements.statusExcessVal.className = ex >= 0 ? 'delta-badge-pos' : 'delta-badge-neg';
    }
    if (elements.statusIrVal) {
      elements.statusIrVal.textContent = result.fullTrailing.informationRatio.toFixed(3);
    }

    // Render Components
    renderHighlightCards(result);
    renderSkillConfidence(result);
    renderTrailingTable(result);
    renderAnnualExcessChart();
    renderRollingExcessChart();
    renderRelativeDrawdownChart();
    renderDistributionTable(result);
    renderRegimeTable(result);
    renderAnnualTable(result);

  } catch (err) {
    console.error('Manager analysis error:', err);
    alert(`Analysis calculation failed: ${err.message}`);
  }
}

// -------------------------------------------------------------------
// 1. Highlight Cards
// -------------------------------------------------------------------
function renderHighlightCards(result) {
  const full = result.fullTrailing;
  const dist = result.distribution;

  if (elements.metricExcessReturn) {
    const ex = full.excessReturn * 100;
    elements.metricExcessReturn.textContent = `${ex >= 0 ? '+' : ''}${ex.toFixed(2)}%`;
    elements.metricExcessReturn.className = `scorecard-metric-value ${ex >= 0 ? 'highlight-gold' : 'delta-badge-neg'}`;
  }
  if (elements.metricFundCagr) elements.metricFundCagr.textContent = `${(full.fundReturn * 100).toFixed(2)}%`;
  if (elements.metricBenchCagr) elements.metricBenchCagr.textContent = `${(full.benchReturn * 100).toFixed(2)}%`;

  if (elements.metricTrackingError) {
    elements.metricTrackingError.textContent = `${(full.trackingError * 100).toFixed(2)}%`;
  }
  if (elements.metricInformationRatio) {
    elements.metricInformationRatio.textContent = full.informationRatio.toFixed(3);
  }
  if (elements.metricWinRate) {
    elements.metricWinRate.textContent = `${(dist.winRate * 100).toFixed(1)}%`;
  }
  if (elements.metricWinCounts) {
    elements.metricWinCounts.textContent = `${dist.winCount} of ${dist.totalPeriods} months`;
  }
}

// -------------------------------------------------------------------
// 2. Statistical Skill vs Luck Banner
// -------------------------------------------------------------------
function renderSkillConfidence(result) {
  const skill = result.skill;
  const confPct = Math.round(skill.confidenceLevel * 100);

  if (elements.skillTitle) {
    elements.skillTitle.textContent = `Manager Skill Statistical Test (${confPct}% Confidence Interval)`;
  }
  if (elements.skillText) {
    elements.skillText.innerHTML = `
      <strong>${skill.summary}</strong>
      <div style="margin-top: 4px; font-size: 0.82rem; color: #94a3b8;">
        Student's t-statistic: <strong>${skill.tStat.toFixed(3)}</strong> | 
        One-tailed p-value: <strong>${skill.pValue.toFixed(4)}</strong> | 
        ${confPct}% Confidence Interval: <strong>[${(skill.lowerBoundAnnual * 100).toFixed(2)}%, ${(skill.upperBoundAnnual * 100).toFixed(2)}%] / yr</strong>
      </div>
    `;
  }
}

// -------------------------------------------------------------------
// 3. Trailing Performance Table
// -------------------------------------------------------------------
function renderTrailingTable(result) {
  if (!elements.trailingTableBody) return;
  elements.trailingTableBody.innerHTML = '';

  result.trailing.forEach(t => {
    const tr = document.createElement('tr');
    const ex = t.excessReturn * 100;
    const exClass = ex >= 0 ? 'delta-badge-pos' : 'delta-badge-neg';

    tr.innerHTML = `
      <td><strong>${t.label}</strong> <span style="font-size:0.75rem; color:#64748b;">(${t.months}M)</span></td>
      <td class="num">${(t.fundReturn * 100).toFixed(2)}%</td>
      <td class="num" style="color:#94a3b8;">${(t.benchReturn * 100).toFixed(2)}%</td>
      <td class="num"><strong class="${exClass}">${ex >= 0 ? '+' : ''}${ex.toFixed(2)}%</strong></td>
      <td class="num">${(t.trackingError * 100).toFixed(2)}%</td>
      <td class="num highlight-green">${t.informationRatio.toFixed(3)}</td>
      <td class="num">${(t.alpha * 100).toFixed(2)}%</td>
      <td class="num">${t.beta.toFixed(3)}</td>
      <td class="num" style="color:#94a3b8;">${t.rSquared.toFixed(3)}</td>
    `;
    elements.trailingTableBody.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// Chart 1: Annual Excess Returns Bar Chart
// -------------------------------------------------------------------
function renderAnnualExcessChart() {
  const canvas = elements.canvasAnnualExcess;
  const container = elements.containerAnnualExcess;
  if (!canvas || !container || !state.lastResult) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 25, right: 35, bottom: 45, left: 65 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const data = state.lastResult.annualExcess;
  const nBars = data.length;
  if (nBars === 0) return;

  let minVal = 0;
  let maxVal = 0;
  data.forEach(d => {
    if (d.excessReturn < minVal) minVal = d.excessReturn;
    if (d.excessReturn > maxVal) maxVal = d.excessReturn;
  });

  const span = Math.max(0.1, Math.max(Math.abs(minVal), Math.abs(maxVal)) * 1.15);
  const yMin = -span;
  const yMax = span;

  const yToPix = (v) => pad.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const zeroY = yToPix(0);

  ctx.clearRect(0, 0, width, height);

  // Fonts
  const fontSm = window.CHART_FONTS ? window.CHART_FONTS.sm : '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  const fontMd = window.CHART_FONTS ? window.CHART_FONTS.md : '600 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = fontSm;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const nTicks = 4;
  for (let k = -nTicks; k <= nTicks; k++) {
    const v = (k / nTicks) * span;
    const py = yToPix(v);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(v * 100).toFixed(0)}%`, pad.left - 8, py);
  }

  // Zero Centerline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(pad.left + plotW, zeroY);
  ctx.stroke();

  // Y-axis Label
  ctx.save();
  ctx.translate(16, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#94a3b8';
  ctx.font = fontMd;
  ctx.textAlign = 'center';
  ctx.fillText('Excess Return (%)', 0, 0);
  ctx.restore();

  // Draw Bars
  const barW = Math.max(4, (plotW / nBars) * 0.75);
  const stepW = plotW / nBars;
  const barsData = [];

  for (let i = 0; i < nBars; i++) {
    const d = data[i];
    const bx = pad.left + i * stepW + (stepW - barW) / 2;
    const by = yToPix(d.excessReturn);
    const bHeight = Math.abs(by - zeroY);
    const topY = Math.min(by, zeroY);

    const isPos = d.excessReturn >= 0;
    ctx.fillStyle = isPos ? '#10b981' : '#ef4444';
    ctx.fillRect(bx, topY, barW, Math.max(2, bHeight));

    barsData.push({
      x: bx,
      y: topY,
      w: barW,
      h: Math.max(2, bHeight),
      data: d
    });

    // X-axis Year Label
    if (nBars <= 15 || i % Math.ceil(nBars / 12) === 0 || i === nBars - 1) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = fontSm;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(d.year, bx + barW / 2, pad.top + plotH + 8);
    }
  }

  // Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const hit = barsData.find(b => mouseX >= b.x - 2 && mouseX <= b.x + b.w + 2 && mouseY >= pad.top && mouseY <= pad.top + plotH);

    if (hit) {
      const d = hit.data;
      const exPct = (d.excessReturn * 100).toFixed(2);
      const isPos = d.excessReturn >= 0;

      elements.tooltipAnnualExcess.innerHTML = `
        <div style="font-weight:700; color:#38bdf8; margin-bottom:4px;">${d.year} Calendar Return</div>
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>${state.managerTicker}:</span>
          <strong>${(d.fundReturn * 100).toFixed(2)}%</strong>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span style="color:#94a3b8;">${state.benchTicker}:</span>
          <strong>${(d.benchReturn * 100).toFixed(2)}%</strong>
        </div>
        <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; gap:12px;">
          <span>Excess Return:</span>
          <strong class="${isPos ? 'delta-badge-pos' : 'delta-badge-neg'}">${isPos ? '+' : ''}${exPct}%</strong>
        </div>
        <div style="font-size:10px; color:#64748b; margin-top:2px;">
          Benchmark Regime: ${d.isBenchPositive ? '🟢 Bull (+)' : '🔴 Bear (-)'}
        </div>
      `;

      elements.tooltipAnnualExcess.style.left = `${Math.min(width - 200, mouseX + 15)}px`;
      elements.tooltipAnnualExcess.style.top = `${Math.max(10, mouseY - 30)}px`;
      elements.tooltipAnnualExcess.style.display = 'block';
    } else {
      elements.tooltipAnnualExcess.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipAnnualExcess.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Chart 2: Dual-Axis Rolling Excess Return & Tracking Error
// -------------------------------------------------------------------
function renderRollingExcessChart() {
  const canvas = elements.canvasRollingExcess;
  const container = elements.containerRollingExcess;
  if (!canvas || !container || !state.lastResult) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 25, right: 65, bottom: 45, left: 65 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const data = state.lastResult.rolling;
  const nPoints = data.length;
  if (nPoints === 0) return;

  // Left axis: Excess Return
  let minEx = 0;
  let maxEx = 0;
  // Right axis: Tracking Error (always >= 0)
  let maxTE = 0.05;

  data.forEach(d => {
    if (d.excessReturn < minEx) minEx = d.excessReturn;
    if (d.excessReturn > maxEx) maxEx = d.excessReturn;
    if (d.trackingError > maxTE) maxTE = d.trackingError;
  });

  const spanEx = Math.max(0.1, Math.max(Math.abs(minEx), Math.abs(maxEx)) * 1.15);
  const leftMin = -spanEx;
  const leftMax = spanEx;

  maxTE = Math.ceil(maxTE * 1.2 * 100) / 100;
  const rightMin = 0;
  const rightMax = maxTE;

  const xToPix = (idx) => pad.left + (idx / (nPoints - 1)) * plotW;
  const leftYToPix = (v) => pad.top + plotH - ((v - leftMin) / (leftMax - leftMin)) * plotH;
  const rightYToPix = (v) => pad.top + plotH - ((v - rightMin) / (rightMax - rightMin)) * plotH;
  const zeroY = leftYToPix(0);

  ctx.clearRect(0, 0, width, height);

  // Fonts
  const fontSm = window.CHART_FONTS ? window.CHART_FONTS.sm : '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  const fontMd = window.CHART_FONTS ? window.CHART_FONTS.md : '600 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';

  // Left Grid (Excess Return)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#38bdf8';
  ctx.font = fontSm;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const nTicks = 4;
  for (let k = -nTicks; k <= nTicks; k++) {
    const v = (k / nTicks) * spanEx;
    const py = leftYToPix(v);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(v * 100).toFixed(0)}%`, pad.left - 8, py);
  }

  // Right Ticks (Tracking Error)
  ctx.fillStyle = '#f59e0b';
  ctx.textAlign = 'left';
  for (let k = 0; k <= 4; k++) {
    const v = (k / 4) * rightMax;
    const py = rightYToPix(v);
    ctx.fillText(`${(v * 100).toFixed(1)}%`, pad.left + plotW + 8, py);
  }

  // Zero Centerline
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(pad.left + plotW, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  // X-axis Dates
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const nDateTicks = Math.min(8, Math.max(3, Math.floor(plotW / 90)));
  const stepGap = Math.floor((nPoints - 1) / (nDateTicks - 1));

  for (let k = 0; k < nDateTicks; k++) {
    const idx = Math.min(nPoints - 1, k * stepGap);
    const px = xToPix(idx);
    ctx.fillText(data[idx].date, px, pad.top + plotH + 8);
  }

  // Axis Labels
  ctx.save();
  ctx.translate(16, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#38bdf8';
  ctx.font = fontMd;
  ctx.textAlign = 'center';
  ctx.fillText('Rolling Excess Return (%)', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(width - 16, pad.top + plotH / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#f59e0b';
  ctx.font = fontMd;
  ctx.textAlign = 'center';
  ctx.fillText('Tracking Error (Active σ %)', 0, 0);
  ctx.restore();

  // 1. Draw Tracking Error Curve (Amber dashed)
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  for (let i = 0; i < nPoints; i++) {
    const px = xToPix(i);
    const py = rightYToPix(data[i].trackingError);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Draw Rolling Excess Return Curve (Cyan solid)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < nPoints; i++) {
    const px = xToPix(i);
    const py = leftYToPix(data[i].excessReturn);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < pad.left || mouseX > pad.left + plotW || mouseY < pad.top || mouseY > pad.top + plotH) {
      elements.tooltipRollingExcess.style.display = 'none';
      return;
    }

    const ratio = (mouseX - pad.left) / plotW;
    const hoverIdx = Math.max(0, Math.min(nPoints - 1, Math.round(ratio * (nPoints - 1))));
    const d = data[hoverIdx];

    const exPct = (d.excessReturn * 100).toFixed(2);
    const tePct = (d.trackingError * 100).toFixed(2);
    const irVal = d.informationRatio.toFixed(3);

    elements.tooltipRollingExcess.innerHTML = `
      <div style="font-weight:700; color:#f8fafc; margin-bottom:4px;">${d.date} (${state.rollingMonths}M Window)</div>
      <div style="display:flex; justify-content:space-between; gap:12px; color:#38bdf8;">
        <span>Rolling Excess:</span>
        <strong>${d.excessReturn >= 0 ? '+' : ''}${exPct}%</strong>
      </div>
      <div style="display:flex; justify-content:space-between; gap:12px; color:#f59e0b;">
        <span>Tracking Error:</span>
        <strong>${tePct}%</strong>
      </div>
      <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; gap:12px;">
        <span style="color:#10b981;">Information Ratio:</span>
        <strong style="color:#10b981;">${irVal}</strong>
      </div>
    `;

    elements.tooltipRollingExcess.style.left = `${Math.min(width - 220, mouseX + 15)}px`;
    elements.tooltipRollingExcess.style.top = `${Math.max(10, mouseY - 25)}px`;
    elements.tooltipRollingExcess.style.display = 'block';
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipRollingExcess.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Chart 3: Absolute vs. Relative Drawdowns
// -------------------------------------------------------------------
function renderRelativeDrawdownChart() {
  const canvas = elements.canvasRelativeDd;
  const container = elements.containerRelativeDd;
  if (!canvas || !container || !state.lastResult) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 25, right: 35, bottom: 45, left: 65 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const dd = state.lastResult.drawdowns;
  const nPoints = dd.relativeDrawdown.length;
  if (nPoints === 0) return;

  let minDD = Math.min(dd.maxRelativeDrawdown, dd.maxBenchDrawdown);
  minDD = Math.floor(minDD * 1.15 * 10) / 10;
  const maxDD = 0;

  const xToPix = (idx) => pad.left + (idx / (nPoints - 1)) * plotW;
  const yToPix = (v) => pad.top + ((0 - v) / (0 - minDD)) * plotH;

  ctx.clearRect(0, 0, width, height);

  // Fonts
  const fontSm = window.CHART_FONTS ? window.CHART_FONTS.sm : '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  const fontMd = window.CHART_FONTS ? window.CHART_FONTS.md : '600 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = fontSm;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const nTicks = 5;
  for (let k = 0; k <= nTicks; k++) {
    const v = (k / nTicks) * minDD;
    const py = yToPix(v);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(v * 100).toFixed(0)}%`, pad.left - 8, py);
  }

  // Top Zero Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left + plotW, pad.top);
  ctx.stroke();

  // X-axis Dates
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const nDateTicks = Math.min(8, Math.max(3, Math.floor(plotW / 90)));
  const stepGap = Math.floor((nPoints - 1) / (nDateTicks - 1));

  for (let k = 0; k < nDateTicks; k++) {
    const idx = Math.min(nPoints - 1, k * stepGap);
    const px = xToPix(idx);
    const dStr = idx === 0 ? 'Start' : dd.dates[idx - 1];
    ctx.fillText(dStr, px, pad.top + plotH + 8);
  }

  // Y-axis Label
  ctx.save();
  ctx.translate(16, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#94a3b8';
  ctx.font = fontMd;
  ctx.textAlign = 'center';
  ctx.fillText('Drawdown (%)', 0, 0);
  ctx.restore();

  // 1. Benchmark Absolute Drawdown (Slate dashed)
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  for (let i = 0; i < nPoints; i++) {
    const px = xToPix(i);
    const py = yToPix(dd.benchDrawdown[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Relative Drawdown Gradient Area
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.05)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0.35)');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(xToPix(0), pad.top);
  for (let i = 0; i < nPoints; i++) {
    ctx.lineTo(xToPix(i), yToPix(dd.relativeDrawdown[i]));
  }
  ctx.lineTo(xToPix(nPoints - 1), pad.top);
  ctx.closePath();
  ctx.fill();

  // 3. Relative Drawdown Line (Red solid)
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < nPoints; i++) {
    const px = xToPix(i);
    const py = yToPix(dd.relativeDrawdown[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < pad.left || mouseX > pad.left + plotW || mouseY < pad.top || mouseY > pad.top + plotH) {
      elements.tooltipRelativeDd.style.display = 'none';
      return;
    }

    const ratio = (mouseX - pad.left) / plotW;
    const hoverIdx = Math.max(0, Math.min(nPoints - 1, Math.round(ratio * (nPoints - 1))));
    const dateStr = hoverIdx === 0 ? 'Simulation Inception' : dd.dates[hoverIdx - 1];

    const relPct = (dd.relativeDrawdown[hoverIdx] * 100).toFixed(2);
    const bDDPct = (dd.benchDrawdown[hoverIdx] * 100).toFixed(2);
    const fDDPct = (dd.fundDrawdown[hoverIdx] * 100).toFixed(2);

    elements.tooltipRelativeDd.innerHTML = `
      <div style="font-weight:700; color:#38bdf8; margin-bottom:4px;">${dateStr}</div>
      <div style="display:flex; justify-content:space-between; gap:12px; color:#ef4444;">
        <span>Relative Drawdown:</span>
        <strong>${relPct}%</strong>
      </div>
      <div style="display:flex; justify-content:space-between; gap:12px; color:#94a3b8;">
        <span>${state.benchTicker} Drawdown:</span>
        <strong>${bDDPct}%</strong>
      </div>
      <div style="display:flex; justify-content:space-between; gap:12px; color:#cbd5e1;">
        <span>${state.managerTicker} Drawdown:</span>
        <strong>${fDDPct}%</strong>
      </div>
    `;

    elements.tooltipRelativeDd.style.left = `${Math.min(width - 220, mouseX + 15)}px`;
    elements.tooltipRelativeDd.style.top = `${Math.max(10, mouseY - 25)}px`;
    elements.tooltipRelativeDd.style.display = 'block';
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipRelativeDd.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Table A: Distribution Statistics
// -------------------------------------------------------------------
function renderDistributionTable(result) {
  if (!elements.distributionTableBody) return;
  elements.distributionTableBody.innerHTML = '';

  const d = result.distribution;

  const rows = [
    { label: 'Average Monthly Excess Return', val: `${(d.meanMonthlyExcess * 100).toFixed(2)}%` },
    { label: 'Annualized Arithmetic Excess Return', val: `${(d.annualizedExcess * 100).toFixed(2)}%` },
    { label: 'Median Monthly Excess Return', val: `${(d.medianMonthlyExcess * 100).toFixed(2)}%` },
    { label: 'Annualized Tracking Error (Active σ)', val: `${(d.annualizedTrackingError * 100).toFixed(2)}%` },
    { label: 'Excess Return Skewness', val: d.skewness.toFixed(3) },
    { label: 'Excess Return Kurtosis', val: d.excessKurtosis.toFixed(3) },
    { label: 'Best Monthly Excess Return', val: `+${(d.bestMonth.excess * 100).toFixed(2)}% (${d.bestMonth.date})`, isPos: true },
    { label: 'Worst Monthly Excess Return', val: `${(d.worstMonth.excess * 100).toFixed(2)}% (${d.worstMonth.date})`, isNeg: true },
    { label: '% Periods Outperforming (Win Rate)', val: `${(d.winRate * 100).toFixed(1)}% (${d.winCount}/${d.totalPeriods})` },
    { label: '% Outperforming in Bull Markets', val: `${(d.upWinRate * 100).toFixed(1)}%` },
    { label: '% Outperforming in Bear Markets', val: `${(d.downWinRate * 100).toFixed(1)}%` }
  ];

  rows.forEach(r => {
    const tr = document.createElement('tr');
    let valClass = '';
    if (r.isPos) valClass = 'class="delta-badge-pos"';
    if (r.isNeg) valClass = 'class="delta-badge-neg"';

    tr.innerHTML = `
      <td>${r.label}</td>
      <td class="num"><strong ${valClass}>${r.val}</strong></td>
    `;
    elements.distributionTableBody.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// Table B: Up/Down Regimes
// -------------------------------------------------------------------
function renderRegimeTable(result) {
  if (!elements.regimeTableBody) return;
  elements.regimeTableBody.innerHTML = '';

  const r = result.regimes;

  const rows = [
    {
      regime: 'Bull Markets (Benchmark > 0)',
      months: r.upMarket.count,
      avgActive: `${(r.upMarket.avgActiveAnnual * 100).toFixed(2)}%/yr`,
      winRate: `${(r.upMarket.winRate * 100).toFixed(1)}%`,
      capture: `${r.upMarket.captureRatio.toFixed(1)}%`
    },
    {
      regime: 'Bear Markets (Benchmark ≤ 0)',
      months: r.downMarket.count,
      avgActive: `${(r.downMarket.avgActiveAnnual * 100).toFixed(2)}%/yr`,
      winRate: `${(r.downMarket.winRate * 100).toFixed(1)}%`,
      capture: `${r.downMarket.captureRatio.toFixed(1)}%`
    },
    {
      regime: 'Capture Ratio Spread (Up / Down)',
      months: '--',
      avgActive: '--',
      winRate: '--',
      capture: `${r.captureRatioSpread.toFixed(2)}x`
    }
  ];

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${row.regime}</strong></td>
      <td class="num">${row.months}</td>
      <td class="num highlight-gold">${row.avgActive}</td>
      <td class="num">${row.winRate}</td>
      <td class="num highlight-green"><strong>${row.capture}</strong></td>
    `;
    elements.regimeTableBody.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// Table C: Annual Returns Table
// -------------------------------------------------------------------
function renderAnnualTable(result) {
  if (!elements.annualReturnsTableBody) return;
  elements.annualReturnsTableBody.innerHTML = '';

  result.annualExcess.forEach(a => {
    const tr = document.createElement('tr');
    const ex = a.excessReturn * 100;
    const isPos = a.excessReturn >= 0;

    tr.innerHTML = `
      <td><strong>${a.year}</strong></td>
      <td class="num">${(a.fundReturn * 100).toFixed(2)}%</td>
      <td class="num" style="color:#94a3b8;">${(a.benchReturn * 100).toFixed(2)}%</td>
      <td class="num"><strong class="${isPos ? 'delta-badge-pos' : 'delta-badge-neg'}">${isPos ? '+' : ''}${ex.toFixed(2)}%</strong></td>
      <td>${a.isBenchPositive ? '🟢 Bull' : '🔴 Bear'}</td>
    `;
    elements.annualReturnsTableBody.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// Export CSV Handler
// -------------------------------------------------------------------
function exportCSV() {
  if (!state.lastResult) return;
  const res = state.lastResult;

  const header = ['Year', `${res.manager.ticker} Return (%)`, `${res.benchmark.ticker} Return (%)`, 'Excess Return (%)', 'Benchmark Regime'];
  const rows = res.annualExcess.map(a => [
    a.year,
    (a.fundReturn * 100).toFixed(2),
    (a.benchReturn * 100).toFixed(2),
    (a.excessReturn * 100).toFixed(2),
    a.isBenchPositive ? 'Bull' : 'Bear'
  ]);

  const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `manager_performance_${res.manager.ticker}_vs_${res.benchmark.ticker}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// -------------------------------------------------------------------
// Initialization & Event Listeners
// -------------------------------------------------------------------
function init() {
  initDom();

  // Manager Presets
  const managerChips = document.querySelectorAll('[data-manager]');
  managerChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      managerChips.forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.managerTicker = e.currentTarget.dataset.manager;
      updatePickerCards();
      runAnalysis();
    });
  });

  // Benchmark Presets
  const benchChips = document.querySelectorAll('[data-bench]');
  benchChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      benchChips.forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.benchTicker = e.currentTarget.dataset.bench;
      updatePickerCards();
      runAnalysis();
    });
  });

  // Change Manager Modal Button
  if (elements.btnChangeManager) {
    elements.btnChangeManager.addEventListener('click', () => {
      openAssetModal({
        title: 'Select Target Manager / Fund',
        badgeText: 'Manager',
        badgeColor: '#38bdf8',
        activeTicker: state.managerTicker,
        onSelect: (selectedFund) => {
          const ticker = (typeof selectedFund === 'string' ? selectedFund : (selectedFund?.ticker || selectedFund))?.toUpperCase();
          state.managerTicker = ticker;
          managerChips.forEach(c => c.classList.toggle('active', c.dataset.manager === ticker));
          updatePickerCards();
          runAnalysis();
        }
      });
    });
  }

  // Change Benchmark Modal Button
  if (elements.btnChangeBench) {
    elements.btnChangeBench.addEventListener('click', () => {
      openAssetModal({
        title: 'Select Reference Benchmark',
        badgeText: 'Benchmark',
        badgeColor: '#a855f7',
        activeTicker: state.benchTicker,
        onSelect: (selectedFund) => {
          const ticker = (typeof selectedFund === 'string' ? selectedFund : (selectedFund?.ticker || selectedFund))?.toUpperCase();
          state.benchTicker = ticker;
          benchChips.forEach(c => c.classList.toggle('active', c.dataset.bench === ticker));
          updatePickerCards();
          runAnalysis();
        }
      });
    });
  }

  // Select Inputs
  if (elements.selectRollingWindow) {
    elements.selectRollingWindow.addEventListener('change', (e) => {
      state.rollingMonths = parseInt(e.target.value, 10);
      updatePickerCards();
      runAnalysis();
    });
  }

  if (elements.selectConfidenceLevel) {
    elements.selectConfidenceLevel.addEventListener('change', (e) => {
      state.confidenceLevel = parseFloat(e.target.value);
      runAnalysis();
    });
  }

  if (elements.inputAnnualRf) {
    elements.inputAnnualRf.addEventListener('change', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 3.0;
      state.annualRf = Math.max(0, val) / 100;
      runAnalysis();
    });
  }

  if (elements.checkDrip) {
    elements.checkDrip.addEventListener('change', (e) => {
      state.useDRIP = e.target.checked;
      runAnalysis();
    });
  }

  // Primary Run Button
  if (elements.btnRunAnalysis) {
    elements.btnRunAnalysis.addEventListener('click', runAnalysis);
  }

  // CSV Export Button
  if (elements.btnExportCsv) {
    elements.btnExportCsv.addEventListener('click', exportCSV);
  }

  // Toggle Configuration Panel
  if (elements.btnToggleConfig && elements.configCard) {
    elements.btnToggleConfig.addEventListener('click', () => {
      const isCollapsed = elements.configCard.classList.toggle('collapsed');
      if (elements.btnConfigText) {
        elements.btnConfigText.textContent = isCollapsed ? 'Expand Model Configuration' : 'Collapse Model Configuration';
      }
    });
  }

  // Debounced Window Resize
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.lastResult) {
        renderAnnualExcessChart();
        renderRollingExcessChart();
        renderRelativeDrawdownChart();
      }
    }, 250);
  });

  // Initial Run
  updatePickerCards();
  runAnalysis();
}

// Session funds listener
subscribeSessionFunds(() => {
  if (state.lastResult) {
    updatePickerCards();
    runAnalysis();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
