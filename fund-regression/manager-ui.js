/**
 * Manager Performance Analysis Studio UI Controller
 * Manages active manager vs. benchmark evaluation, interactive asset picking,
 * trailing performance scorecard, annual excess return bar chart,
 * dual-axis rolling 36-month excess/tracking error chart, relative drawdown chart,
 * and Student's t-test statistical manager skill analysis.
 */

import {
  analyzeManagerPerformance,
  calculateBrinsonAttribution,
  calculateMultiPeriodBrinson,
  getBrinsonPresetMonthlyData,
  BRINSON_PRESETS
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
  lastResult: null,

  // Brinson Performance Attribution
  brinsonPreset: 'active-growth',
  brinsonModel: 'brinson-fachler',
  brinsonFactors: '3-factor',
  brinsonHorizon: '36',
  lastBrinson: null,

  // Market Timing Econometric Diagnostics
  timingModel: 'treynor-mazuy'
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

  // Brinson Attribution Elements
  elements.selectBrinsonPreset = document.getElementById('select-brinson-preset');
  elements.selectBrinsonModel = document.getElementById('select-brinson-model');
  elements.selectBrinsonFactors = document.getElementById('select-brinson-factors');
  elements.selectBrinsonHorizon = document.getElementById('select-brinson-horizon');
  elements.brinsonMencheroBanner = document.getElementById('brinson-menchero-banner');
  elements.brinsonMencheroDesc = document.getElementById('brinson-menchero-desc');
  elements.brinsonResidualBadge = document.getElementById('brinson-residual-badge');
  elements.wrapperBrinsonWaterfall = document.getElementById('wrapper-brinson-waterfall');
  elements.containerBrinsonWaterfall = document.getElementById('container-brinson-waterfall');
  elements.canvasBrinsonWaterfall = document.getElementById('canvas-brinson-waterfall');
  elements.tooltipBrinsonWaterfall = document.getElementById('tooltip-brinson-waterfall');
  elements.legendWaterfallInter = document.getElementById('legend-waterfall-inter');
  elements.brinsonMetricActive = document.getElementById('brinson-metric-active');
  elements.brinsonSubReturns = document.getElementById('brinson-sub-returns');
  elements.brinsonMetricAlloc = document.getElementById('brinson-metric-alloc');
  elements.brinsonSubAllocPct = document.getElementById('brinson-sub-alloc-pct');
  elements.brinsonMetricSelect = document.getElementById('brinson-metric-select');
  elements.brinsonSubSelectPct = document.getElementById('brinson-sub-select-pct');
  elements.brinsonMetricInter = document.getElementById('brinson-metric-inter');
  elements.canvasBrinsonBars = document.getElementById('canvas-brinson-bars');
  elements.containerBrinsonBars = document.getElementById('container-brinson-bars');
  elements.tooltipBrinsonBars = document.getElementById('tooltip-brinson-bars');
  elements.legendBrinsonInter = document.getElementById('legend-brinson-inter');
  elements.brinsonTableBody = document.getElementById('brinson-table-body');
  elements.brinsonTableFoot = document.getElementById('brinson-table-foot');

  // Market Timing Elements
  elements.selectTimingModel = document.getElementById('select-timing-model');
  elements.timingLabelGamma = document.getElementById('timing-label-gamma');
  elements.timingMetricGamma = document.getElementById('timing-metric-gamma');
  elements.timingSubGamma = document.getElementById('timing-sub-gamma');
  elements.timingMetricAlpha = document.getElementById('timing-metric-alpha');
  elements.timingSubAlpha = document.getElementById('timing-sub-alpha');
  elements.timingLabelBeta = document.getElementById('timing-label-beta');
  elements.timingMetricBeta = document.getElementById('timing-metric-beta');
  elements.timingSubBeta = document.getElementById('timing-sub-beta');
  elements.timingMetricR2 = document.getElementById('timing-metric-r2');
  elements.timingSubR2 = document.getElementById('timing-sub-r2');
  elements.timingVerdictBanner = document.getElementById('timing-verdict-banner');
  elements.timingVerdictIcon = document.getElementById('timing-verdict-icon');
  elements.timingVerdictTitle = document.getElementById('timing-verdict-title');
  elements.timingVerdictText = document.getElementById('timing-verdict-text');
  elements.canvasMarketTiming = document.getElementById('canvas-market-timing');
  elements.containerMarketTiming = document.getElementById('container-market-timing');
  elements.tooltipMarketTiming = document.getElementById('tooltip-market-timing');
  elements.legendSwatchTiming = document.getElementById('legend-swatch-timing');
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
    renderBrinsonAttribution();
    renderAnnualExcessChart();
    renderRollingExcessChart();
    renderRelativeDrawdownChart();
    renderMarketTiming();
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
// Brinson Performance Attribution (Bodie Chapter 24 & Menchero Linking)
// -------------------------------------------------------------------
function renderBrinsonAttribution() {
  const presetKey = state.brinsonPreset || 'active-growth';
  const preset = BRINSON_PRESETS[presetKey] || BRINSON_PRESETS['active-growth'];
  const isMultiPeriod = state.brinsonHorizon !== 'single';
  const is3Factor = state.brinsonFactors !== '2-factor';

  let attribution;
  if (isMultiPeriod) {
    const months = parseInt(state.brinsonHorizon, 10) || 36;
    const data = getBrinsonPresetMonthlyData(presetKey, months);
    attribution = calculateMultiPeriodBrinson(data, {
      model: state.brinsonModel,
      decomposition: state.brinsonFactors
    });

    if (elements.wrapperBrinsonWaterfall) {
      elements.wrapperBrinsonWaterfall.style.display = 'block';
    }
    if (elements.brinsonMencheroBanner) {
      elements.brinsonMencheroBanner.style.display = 'flex';
    }
    if (elements.brinsonMencheroDesc) {
      elements.brinsonMencheroDesc.textContent = `Compounding ${months} monthly attribution periods with exact zero-residual mathematical linking (A + S + I ≡ Rp - Rb).`;
    }
    if (elements.brinsonResidualBadge) {
      const resPct = (attribution.residual * 100).toFixed(8);
      elements.brinsonResidualBadge.textContent = `Residual: ${resPct}%`;
      elements.brinsonResidualBadge.style.color = '#10b981';
    }
  } else {
    attribution = calculateBrinsonAttribution(preset.sectors, { model: state.brinsonModel });
    if (elements.wrapperBrinsonWaterfall) {
      elements.wrapperBrinsonWaterfall.style.display = 'none';
    }
    if (elements.brinsonMencheroBanner) {
      elements.brinsonMencheroBanner.style.display = 'flex';
    }
    if (elements.brinsonMencheroDesc) {
      elements.brinsonMencheroDesc.textContent = `Single-period 1-year annual snapshot decomposition (Bodie, Kane & Marcus, Chapter 24).`;
    }
    if (elements.brinsonResidualBadge) {
      elements.brinsonResidualBadge.textContent = `Single Period Snapshot`;
      elements.brinsonResidualBadge.style.color = '#38bdf8';
    }
  }

  state.lastBrinson = attribution;

  // Toggle interaction column visibility
  document.querySelectorAll('.col-brinson-inter').forEach(el => {
    el.style.display = is3Factor ? '' : 'none';
  });
  if (elements.legendBrinsonInter) {
    elements.legendBrinsonInter.style.display = is3Factor ? 'flex' : 'none';
  }
  if (elements.legendWaterfallInter) {
    elements.legendWaterfallInter.style.display = is3Factor ? 'flex' : 'none';
  }

  // Update Scorecards
  if (elements.brinsonMetricActive) {
    const act = attribution.activeReturn * 100;
    elements.brinsonMetricActive.textContent = `${act >= 0 ? '+' : ''}${act.toFixed(2)}%`;
  }
  if (elements.brinsonSubReturns) {
    elements.brinsonSubReturns.textContent = `Portfolio: ${(attribution.portfolioReturn * 100).toFixed(2)}% | Benchmark: ${(attribution.benchmarkReturn * 100).toFixed(2)}%`;
  }
  if (elements.brinsonMetricAlloc) {
    const alloc = attribution.totalAllocation * 100;
    elements.brinsonMetricAlloc.textContent = `${alloc >= 0 ? '+' : ''}${alloc.toFixed(2)}%`;
  }
  if (elements.brinsonSubAllocPct) {
    const pct = attribution.activeReturn !== 0 ? ((attribution.totalAllocation / attribution.activeReturn) * 100).toFixed(1) : '0.0';
    elements.brinsonSubAllocPct.textContent = `${pct}% of Active Alpha`;
  }
  if (elements.brinsonMetricSelect) {
    const selVal = is3Factor ? attribution.totalSelection : attribution.totalCombinedSelection;
    const sel = selVal * 100;
    elements.brinsonMetricSelect.textContent = `${sel >= 0 ? '+' : ''}${sel.toFixed(2)}%`;
  }
  if (elements.brinsonSubSelectPct) {
    const selVal = is3Factor ? attribution.totalSelection : attribution.totalCombinedSelection;
    const pct = attribution.activeReturn !== 0 ? ((selVal / attribution.activeReturn) * 100).toFixed(1) : '0.0';
    elements.brinsonSubSelectPct.textContent = `${pct}% of Active Alpha`;
  }
  if (elements.brinsonMetricInter) {
    if (is3Factor) {
      const inter = attribution.totalInteraction * 100;
      elements.brinsonMetricInter.textContent = `${inter >= 0 ? '+' : ''}${inter.toFixed(2)}%`;
      elements.brinsonMetricInter.parentElement.style.opacity = '1';
    } else {
      elements.brinsonMetricInter.textContent = 'Merged in Sel';
      elements.brinsonMetricInter.parentElement.style.opacity = '0.5';
    }
  }

  // Populate Table
  if (elements.brinsonTableBody) {
    elements.brinsonTableBody.innerHTML = '';
    attribution.rows.forEach(row => {
      const tr = document.createElement('tr');
      const dW = row.activeWeight * 100;
      const dWColor = dW > 0 ? '#38bdf8' : (dW < 0 ? '#f43f5e' : '#94a3b8');

      const alloc = row.allocation * 100;
      const allocColor = alloc > 0 ? '#38bdf8' : (alloc < 0 ? '#f43f5e' : '#94a3b8');

      const selVal = is3Factor ? row.selection : row.combinedSelection;
      const sel = selVal * 100;
      const selColor = sel > 0 ? '#10b981' : (sel < 0 ? '#f43f5e' : '#94a3b8');

      const inter = row.interaction * 100;
      const interColor = inter > 0 ? '#f59e0b' : (inter < 0 ? '#f43f5e' : '#94a3b8');

      const tot = row.totalEffect * 100;
      const totColor = tot > 0 ? '#eab308' : (tot < 0 ? '#f43f5e' : '#94a3b8');

      tr.innerHTML = `
        <td style="font-weight: 600; color: #f8fafc;">${row.name}</td>
        <td class="num">${(row.portfolioWeight * 100).toFixed(1)}%</td>
        <td class="num">${(row.benchmarkWeight * 100).toFixed(1)}%</td>
        <td class="num" style="color: ${dWColor}; font-weight: 600;">${dW >= 0 ? '+' : ''}${dW.toFixed(1)}%</td>
        <td class="num">${(row.portfolioReturn * 100).toFixed(2)}%</td>
        <td class="num">${(row.benchmarkReturn * 100).toFixed(2)}%</td>
        <td class="num" style="color: ${allocColor}; font-weight: 600;">${alloc >= 0 ? '+' : ''}${alloc.toFixed(2)}%</td>
        <td class="num" style="color: ${selColor}; font-weight: 600;">${sel >= 0 ? '+' : ''}${sel.toFixed(2)}%</td>
        <td class="num col-brinson-inter" style="color: ${interColor}; font-weight: 600; ${is3Factor ? '' : 'display:none;'}">${inter >= 0 ? '+' : ''}${inter.toFixed(2)}%</td>
        <td class="num" style="color: ${totColor}; font-weight: 700;">${tot >= 0 ? '+' : ''}${tot.toFixed(2)}%</td>
      `;
      elements.brinsonTableBody.appendChild(tr);
    });
  }

  // Populate Table Foot (Totals)
  if (elements.brinsonTableFoot) {
    const totAlloc = attribution.totalAllocation * 100;
    const totSel = (is3Factor ? attribution.totalSelection : attribution.totalCombinedSelection) * 100;
    const totInter = attribution.totalInteraction * 100;
    const totAct = attribution.activeReturn * 100;

    elements.brinsonTableFoot.innerHTML = `
      <tr style="border-top: 2px solid #475569; font-weight: 700; background: rgba(30, 41, 59, 0.6);">
        <td>Total / Portfolio Attribution</td>
        <td class="num">100.0%</td>
        <td class="num">100.0%</td>
        <td class="num">0.0%</td>
        <td class="num">${(attribution.portfolioReturn * 100).toFixed(2)}%</td>
        <td class="num">${(attribution.benchmarkReturn * 100).toFixed(2)}%</td>
        <td class="num" style="color: #38bdf8;">${totAlloc >= 0 ? '+' : ''}${totAlloc.toFixed(2)}%</td>
        <td class="num" style="color: #10b981;">${totSel >= 0 ? '+' : ''}${totSel.toFixed(2)}%</td>
        <td class="num col-brinson-inter" style="color: #f59e0b; ${is3Factor ? '' : 'display:none;'}">${totInter >= 0 ? '+' : ''}${totInter.toFixed(2)}%</td>
        <td class="num highlight-gold" style="font-size: 0.95rem;">${totAct >= 0 ? '+' : ''}${totAct.toFixed(2)}%</td>
      </tr>
    `;
  }

  renderBrinsonBarsChart();
  if (isMultiPeriod) {
    renderBrinsonWaterfallChart();
  }
}

// -------------------------------------------------------------------
// Cumulative Active Return Trajectory & Factor Waterfall (Multi-Period)
// -------------------------------------------------------------------
function renderBrinsonWaterfallChart() {
  const canvas = elements.canvasBrinsonWaterfall;
  const container = elements.containerBrinsonWaterfall;
  if (!canvas || !container || !state.lastBrinson || !state.lastBrinson.trajectory) return;

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

  const traj = state.lastBrinson.trajectory;
  const n = traj.length;
  if (n === 0) return;

  const is3Factor = state.brinsonFactors !== '2-factor';

  let minVal = 0;
  let maxVal = 0;
  traj.forEach(pt => {
    const selVal = is3Factor ? pt.cumSelLinked : (pt.cumSelLinked + pt.cumInterLinked);
    const vals = is3Factor
      ? [pt.cumActiveReturn, pt.cumAllocLinked, pt.cumSelLinked, pt.cumInterLinked]
      : [pt.cumActiveReturn, pt.cumAllocLinked, selVal];
    vals.forEach(v => {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    });
  });

  const span = Math.max(0.02, Math.max(Math.abs(minVal), Math.abs(maxVal)) * 1.25);
  const yMin = -span;
  const yMax = span;

  const xToPix = (idx) => pad.left + (idx / Math.max(1, n - 1)) * plotW;
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
    ctx.fillText(`${(v * 100).toFixed(1)}%`, pad.left - 8, py);
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
  ctx.fillText('Compounded Active Alpha (%)', 0, 0);
  ctx.restore();

  // X-axis Dates
  ctx.fillStyle = '#94a3b8';
  ctx.font = fontSm;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const stepIdx = Math.max(1, Math.floor(n / 6));
  for (let i = 0; i < n; i += stepIdx) {
    ctx.fillText(traj[i].date, xToPix(i), pad.top + plotH + 8);
  }
  if ((n - 1) % stepIdx !== 0) {
    ctx.fillText(traj[n - 1].date, xToPix(n - 1), pad.top + plotH + 8);
  }

  // Helper to draw smooth series
  const drawLine = (valAccessor, color, lineWidth, dashed = false) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (dashed) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    traj.forEach((pt, idx) => {
      const x = xToPix(idx);
      const y = yToPix(valAccessor(pt));
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  };

  // Draw factor curves
  drawLine(pt => pt.cumAllocLinked, '#38bdf8', 2.0); // Allocation (Cyan)
  drawLine(pt => is3Factor ? pt.cumSelLinked : (pt.cumSelLinked + pt.cumInterLinked), '#10b981', 2.0); // Selection (Green)
  if (is3Factor) {
    drawLine(pt => pt.cumInterLinked, '#f59e0b', 1.5, true); // Interaction (Amber Dashed)
  }
  drawLine(pt => pt.cumActiveReturn, '#eab308', 3.0); // Total Active Return (Thick Gold)

  // Interactive Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < pad.left || mouseX > pad.left + plotW) {
      elements.tooltipBrinsonWaterfall.style.display = 'none';
      return;
    }

    const ratio = (mouseX - pad.left) / plotW;
    const idx = Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
    const pt = traj[idx];

    const cumActPct = (pt.cumActiveReturn * 100).toFixed(2);
    const cumAllocPct = (pt.cumAllocLinked * 100).toFixed(2);
    const selVal = is3Factor ? pt.cumSelLinked : (pt.cumSelLinked + pt.cumInterLinked);
    const cumSelPct = (selVal * 100).toFixed(2);
    const cumInterPct = (pt.cumInterLinked * 100).toFixed(2);

    elements.tooltipBrinsonWaterfall.innerHTML = `
      <div style="font-weight: 700; color: #38bdf8; margin-bottom: 4px;">Month ${pt.periodIndex}: ${pt.date}</div>
      <div style="display:flex; justify-content:space-between; gap:12px; color: #eab308; font-weight:700;">
        <span>Cum Active Alpha:</span>
        <strong>${pt.cumActiveReturn >= 0 ? '+' : ''}${cumActPct}%</strong>
      </div>
      <div style="display:flex; justify-content:space-between; gap:12px; color: #38bdf8;">
        <span>Cum Allocation (A):</span>
        <strong>${pt.cumAllocLinked >= 0 ? '+' : ''}${cumAllocPct}%</strong>
      </div>
      <div style="display:flex; justify-content:space-between; gap:12px; color: #10b981;">
        <span>Cum Selection (S):</span>
        <strong>${selVal >= 0 ? '+' : ''}${cumSelPct}%</strong>
      </div>
      ${is3Factor ? `
      <div style="display:flex; justify-content:space-between; gap:12px; color: #f59e0b;">
        <span>Cum Interaction (I):</span>
        <strong>${pt.cumInterLinked >= 0 ? '+' : ''}${cumInterPct}%</strong>
      </div>` : ''}
      <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: #94a3b8;">
        Menchero Weight T_t: ${(pt.mencheroWeight).toFixed(4)} | Diff: ${(pt.cumSumLinked - pt.cumActiveReturn).toExponential(2)}
      </div>
    `;

    elements.tooltipBrinsonWaterfall.style.left = `${Math.min(width - 240, mouseX + 15)}px`;
    elements.tooltipBrinsonWaterfall.style.top = `${Math.max(10, mouseY - 30)}px`;
    elements.tooltipBrinsonWaterfall.style.display = 'block';
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipBrinsonWaterfall.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

function renderBrinsonBarsChart() {
  const canvas = elements.canvasBrinsonBars;
  const container = elements.containerBrinsonBars;
  if (!canvas || !container || !state.lastBrinson) return;

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

  const pad = { top: 25, right: 30, bottom: 60, left: 65 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const data = state.lastBrinson.rows;
  const n = data.length;
  if (n === 0) return;

  const is3Factor = state.brinsonFactors !== '2-factor';
  const barsPerGroup = is3Factor ? 4 : 3;

  let minVal = 0;
  let maxVal = 0;
  data.forEach(d => {
    const sel = is3Factor ? d.selection : d.combinedSelection;
    const vals = is3Factor
      ? [d.allocation, d.selection, d.interaction, d.totalEffect]
      : [d.allocation, sel, d.totalEffect];
    vals.forEach(v => {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    });
  });

  const span = Math.max(0.02, Math.max(Math.abs(minVal), Math.abs(maxVal)) * 1.2);
  const yMin = -span;
  const yMax = span;

  const yToPix = (v) => pad.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const zeroY = yToPix(0);

  ctx.clearRect(0, 0, width, height);

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yStep = span > 0.05 ? 0.02 : 0.01;
  for (let v = 0; v <= yMax; v += yStep) {
    const py = yToPix(v);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(v * 100).toFixed(1)}%`, pad.left - 8, py);
  }
  for (let v = -yStep; v >= yMin; v -= yStep) {
    const py = yToPix(v);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(v * 100).toFixed(1)}%`, pad.left - 8, py);
  }

  // Zero axis line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(pad.left + plotW, zeroY);
  ctx.stroke();

  // Render Bars
  const groupW = plotW / n;
  const barW = Math.max(4, Math.min(18, (groupW * 0.75) / barsPerGroup));
  const innerPad = 2;
  const hitBoxes = [];

  data.forEach((d, groupIdx) => {
    const groupCenterX = pad.left + (groupIdx + 0.5) * groupW;
    const totalGroupBarW = barsPerGroup * barW + (barsPerGroup - 1) * innerPad;
    const startX = groupCenterX - totalGroupBarW / 2;

    const selVal = is3Factor ? d.selection : d.combinedSelection;
    const barItems = is3Factor ? [
      { val: d.allocation, color: '#38bdf8', label: 'Allocation Effect (A)' },
      { val: d.selection, color: '#10b981', label: 'Selection Effect (S)' },
      { val: d.interaction, color: '#f59e0b', label: 'Interaction Effect (I)' },
      { val: d.totalEffect, color: '#eab308', label: 'Total Contribution' }
    ] : [
      { val: d.allocation, color: '#38bdf8', label: 'Allocation Effect (A)' },
      { val: selVal, color: '#10b981', label: 'Combined Selection (S+I)' },
      { val: d.totalEffect, color: '#eab308', label: 'Total Contribution' }
    ];

    barItems.forEach((b, bIdx) => {
      const bx = startX + bIdx * (barW + innerPad);
      const by = b.val >= 0 ? yToPix(b.val) : zeroY;
      const bh = Math.max(1, Math.abs(yToPix(b.val) - zeroY));

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.rect(bx, by, barW, bh);
      ctx.fill();

      hitBoxes.push({
        x: bx,
        y: Math.min(by, by + bh),
        w: barW,
        h: Math.max(bh, 5),
        sector: d.name,
        label: b.label,
        color: b.color,
        val: b.val
      });
    });

    // Sector Label below
    ctx.save();
    ctx.translate(groupCenterX, pad.top + plotH + 12);
    ctx.rotate(-Math.PI / 4.5);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const shortName = d.name.length > 14 ? d.name.slice(0, 13) + '…' : d.name;
    ctx.fillText(shortName, 0, 0);
    ctx.restore();
  });

  // Tooltip interaction
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const r = canvas.getBoundingClientRect();
    const mouseX = e.clientX - r.left;
    const mouseY = e.clientY - r.top;

    const hit = hitBoxes.find(b => mouseX >= b.x - 2 && mouseX <= b.x + b.w + 2 && mouseY >= b.y - 4 && mouseY <= b.y + b.h + 4);
    if (hit) {
      elements.tooltipBrinsonBars.innerHTML = `
        <div style="font-weight: 700; color: #f8fafc; margin-bottom: 2px;">${hit.sector}</div>
        <div style="color: ${hit.color};">${hit.label}: <strong>${hit.val >= 0 ? '+' : ''}${(hit.val * 100).toFixed(2)}%</strong></div>
      `;
      elements.tooltipBrinsonBars.style.left = `${Math.min(width - 200, mouseX + 15)}px`;
      elements.tooltipBrinsonBars.style.top = `${Math.max(10, mouseY - 30)}px`;
      elements.tooltipBrinsonBars.style.display = 'block';
    } else {
      elements.tooltipBrinsonBars.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipBrinsonBars.style.display = 'none';
  }, { signal: canvas._controller.signal });
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
// Market Timing Econometric Diagnostics (Treynor-Mazuy & Henriksson-Merton)
// -------------------------------------------------------------------
function renderMarketTiming() {
  if (!state.lastResult || !state.lastResult.marketTiming) return;

  const isHM = state.timingModel === 'henriksson-merton';
  const timing = isHM
    ? state.lastResult.marketTiming.henrikssonMerton
    : state.lastResult.marketTiming.treynorMazuy;

  if (!timing || !timing.hasSufficientData) return;

  // 1. Update Labels & Scorecards
  if (elements.timingLabelGamma) {
    elements.timingLabelGamma.textContent = isHM ? 'Put Protection (γ)' : 'Market Timing (γ)';
  }
  if (elements.timingMetricGamma) {
    const gVal = timing.gamma.value;
    const gSign = gVal >= 0 ? '+' : '';
    elements.timingMetricGamma.textContent = `${gSign}${gVal.toFixed(2)}`;
    if (timing.gamma.isSignificant) {
      elements.timingMetricGamma.className = `metric-value ${gVal > 0 ? 'highlight-cyan' : 'delta-badge-neg'}`;
    } else {
      elements.timingMetricGamma.className = 'metric-value';
    }
  }
  if (elements.timingSubGamma) {
    const pStr = timing.gamma.pValue < 0.001 ? '<0.001' : timing.gamma.pValue.toFixed(3);
    const star = timing.gamma.pValue < 0.01 ? '***' : (timing.gamma.pValue < 0.05 ? '**' : (timing.gamma.pValue < 0.10 ? '*' : ''));
    elements.timingSubGamma.textContent = `t = ${timing.gamma.tStat.toFixed(2)} | p = ${pStr} ${star}`;
  }

  // Alpha Scorecard
  if (elements.timingMetricAlpha) {
    const aVal = timing.alpha.annualized * 100;
    elements.timingMetricAlpha.textContent = `${aVal >= 0 ? '+' : ''}${aVal.toFixed(2)}%/yr`;
  }
  if (elements.timingSubAlpha) {
    const pStr = timing.alpha.pValue < 0.001 ? '<0.001' : timing.alpha.pValue.toFixed(3);
    elements.timingSubAlpha.textContent = `t = ${timing.alpha.tStat.toFixed(2)} | p = ${pStr}`;
  }

  // Beta Scorecard
  if (elements.timingLabelBeta) {
    elements.timingLabelBeta.textContent = isHM ? 'Up / Down Beta (β / βd)' : 'Base Market Beta (β)';
  }
  if (elements.timingMetricBeta) {
    if (isHM) {
      elements.timingMetricBeta.textContent = `${timing.beta.value.toFixed(2)} / ${timing.beta.downsideBeta.toFixed(2)}`;
    } else {
      elements.timingMetricBeta.textContent = timing.beta.value.toFixed(2);
    }
  }
  if (elements.timingSubBeta) {
    elements.timingSubBeta.textContent = `Linear CAPM Beta: ${timing.capm.beta.toFixed(2)}`;
  }

  // Goodness of Fit Scorecard
  if (elements.timingMetricR2) {
    elements.timingMetricR2.textContent = `${(timing.rSquared * 100).toFixed(1)}%`;
  }
  if (elements.timingSubR2) {
    elements.timingSubR2.textContent = `Adj R²: ${(timing.adjRSquared * 100).toFixed(1)}% | CAPM: ${(timing.capm.rSquared * 100).toFixed(1)}%`;
  }

  // 2. Verdict Banner
  if (elements.timingVerdictBanner) {
    if (timing.gamma.isSignificant && timing.gamma.value > 0) {
      elements.timingVerdictBanner.style.background = 'rgba(16, 185, 129, 0.08)';
      elements.timingVerdictBanner.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      if (elements.timingVerdictIcon) elements.timingVerdictIcon.textContent = '🚀';
      if (elements.timingVerdictTitle) elements.timingVerdictTitle.textContent = isHM ? 'Protective Downside Market Timing Verified' : 'Convex Market Timing Skill Verified';
    } else if (timing.gamma.isSignificant && timing.gamma.value < 0) {
      elements.timingVerdictBanner.style.background = 'rgba(239, 68, 68, 0.08)';
      elements.timingVerdictBanner.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      if (elements.timingVerdictIcon) elements.timingVerdictIcon.textContent = '⚠️';
      if (elements.timingVerdictTitle) elements.timingVerdictTitle.textContent = isHM ? 'Adverse Downside Exposure Detected' : 'Perverse Market Timing / Negative Convexity';
    } else {
      elements.timingVerdictBanner.style.background = 'rgba(56, 189, 248, 0.08)';
      elements.timingVerdictBanner.style.borderColor = 'rgba(56, 189, 248, 0.25)';
      if (elements.timingVerdictIcon) elements.timingVerdictIcon.textContent = '🔬';
      if (elements.timingVerdictTitle) elements.timingVerdictTitle.textContent = 'Timing Hypothesis Test Result (Null Hypothesis Retained)';
    }
    if (elements.timingVerdictText) {
      elements.timingVerdictText.textContent = timing.verdict;
    }
  }

  // 3. Legend Swatch Color
  if (elements.legendSwatchTiming) {
    elements.legendSwatchTiming.style.background = isHM ? '#10b981' : '#eab308';
  }

  renderMarketTimingChart();
}

function renderMarketTimingChart() {
  const canvas = elements.canvasMarketTiming;
  const container = elements.containerMarketTiming;
  if (!canvas || !container || !state.lastResult || !state.lastResult.marketTiming) return;

  const isHM = state.timingModel === 'henriksson-merton';
  const timing = isHM
    ? state.lastResult.marketTiming.henrikssonMerton
    : state.lastResult.marketTiming.treynorMazuy;

  if (!timing || !timing.hasSufficientData) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 30, right: 35, bottom: 45, left: 65 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const pts = timing.scatterPoints;
  const curve = timing.curvePoints;
  if (pts.length === 0 || curve.length === 0) return;

  // Determine Plot Bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  pts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  curve.forEach(c => {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.modelY < minY) minY = c.modelY;
    if (c.modelY > maxY) maxY = c.modelY;
    if (c.linearY < minY) minY = c.linearY;
    if (c.linearY > maxY) maxY = c.linearY;
  });

  const spanX = Math.max(0.1, Math.max(Math.abs(minX), Math.abs(maxX)) * 1.15);
  const spanY = Math.max(0.1, Math.max(Math.abs(minY), Math.abs(maxY)) * 1.15);

  const xMin = -spanX;
  const xMax = spanX;
  const yMin = -spanY;
  const yMax = spanY;

  const xToPix = (x) => pad.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const yToPix = (y) => pad.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const zeroX = xToPix(0);
  const zeroY = yToPix(0);

  ctx.clearRect(0, 0, width, height);

  // Fonts
  const fontSm = window.CHART_FONTS ? window.CHART_FONTS.sm : '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  const fontMd = window.CHART_FONTS ? window.CHART_FONTS.md : '600 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';

  // Grid Lines & Ticks
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = fontSm;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const nTicks = 4;
  for (let k = -nTicks; k <= nTicks; k++) {
    const yVal = (k / nTicks) * spanY;
    const py = yToPix(yVal);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(`${(yVal * 100).toFixed(0)}%`, pad.left - 8, py);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let k = -nTicks; k <= nTicks; k++) {
    const xVal = (k / nTicks) * spanX;
    const px = xToPix(xVal);
    ctx.beginPath();
    ctx.moveTo(px, pad.top);
    ctx.lineTo(px, pad.top + plotH);
    ctx.stroke();
    ctx.fillText(`${(xVal * 100).toFixed(0)}%`, px, pad.top + plotH + 8);
  }

  // Crosshairs at (0, 0)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(pad.left + plotW, zeroY);
  ctx.moveTo(zeroX, pad.top);
  ctx.lineTo(zeroX, pad.top + plotH);
  ctx.stroke();

  // Axis Labels
  ctx.save();
  ctx.translate(16, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#38bdf8';
  ctx.font = fontMd;
  ctx.textAlign = 'center';
  ctx.fillText(`Manager Excess Return: ${state.managerTicker} − Rf (%)`, 0, 0);
  ctx.restore();

  ctx.fillStyle = '#94a3b8';
  ctx.font = fontMd;
  ctx.textAlign = 'center';
  ctx.fillText(`Benchmark Excess Return: ${state.benchTicker} − Rf (%)`, pad.left + plotW / 2, pad.top + plotH + 28);

  // 1. Linear CAPM Line (Silver dashed)
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  curve.forEach((c, idx) => {
    const px = xToPix(c.x);
    const py = yToPix(c.linearY);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Timing Curve (Treynor-Mazuy Gold or Henriksson-Merton Emerald)
  const curveColor = isHM ? '#10b981' : '#eab308';
  ctx.strokeStyle = curveColor;
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  curve.forEach((c, idx) => {
    const px = xToPix(c.x);
    const py = yToPix(c.modelY);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // 3. Scatter Points
  pts.forEach(p => {
    const px = xToPix(p.x);
    const py = yToPix(p.y);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  });

  // Interactive Hover Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < pad.left - 10 || mouseX > pad.left + plotW + 10 || mouseY < pad.top - 10 || mouseY > pad.top + plotH + 10) {
      elements.tooltipMarketTiming.style.display = 'none';
      return;
    }

    // Find closest scatter point
    let closest = null;
    let minD2 = Infinity;
    pts.forEach(p => {
      const px = xToPix(p.x);
      const py = yToPix(p.y);
      const d2 = (mouseX - px) * (mouseX - px) + (mouseY - py) * (mouseY - py);
      if (d2 < minD2) {
        minD2 = d2;
        closest = p;
      }
    });

    if (closest && minD2 <= 30 * 30) {
      const xPct = (closest.x * 100).toFixed(2);
      const yPct = (closest.y * 100).toFixed(2);
      const fitPct = (closest.fittedY * 100).toFixed(2);
      const resPct = (closest.residual * 100).toFixed(2);

      elements.tooltipMarketTiming.innerHTML = `
        <div style="font-weight:700; color:#38bdf8; margin-bottom:4px;">Month: ${closest.date}</div>
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span style="color:#94a3b8;">${state.benchTicker} Excess (Rm − Rf):</span>
          <strong>${closest.x >= 0 ? '+' : ''}${xPct}%</strong>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span style="color:#cbd5e1;">${state.managerTicker} Excess (Rp − Rf):</span>
          <strong style="color:#38bdf8;">${closest.y >= 0 ? '+' : ''}${yPct}%</strong>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px; margin-top:3px; padding-top:3px; border-top:1px solid rgba(255,255,255,0.1);">
          <span style="color:${curveColor};">${isHM ? 'HM' : 'TM'} Model Predicted:</span>
          <strong>${closest.fittedY >= 0 ? '+' : ''}${fitPct}%</strong>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px; font-size:10px; color:#94a3b8;">
          <span>Model Residual (ε):</span>
          <span>${closest.residual >= 0 ? '+' : ''}${resPct}%</span>
        </div>
      `;

      elements.tooltipMarketTiming.style.left = `${Math.min(width - 240, mouseX + 15)}px`;
      elements.tooltipMarketTiming.style.top = `${Math.max(10, mouseY - 30)}px`;
      elements.tooltipMarketTiming.style.display = 'block';
    } else {
      elements.tooltipMarketTiming.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipMarketTiming.style.display = 'none';
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

  // Brinson Attribution Selectors
  if (elements.selectBrinsonPreset) {
    elements.selectBrinsonPreset.addEventListener('change', (e) => {
      state.brinsonPreset = e.target.value;
      renderBrinsonAttribution();
    });
  }
  if (elements.selectBrinsonModel) {
    elements.selectBrinsonModel.addEventListener('change', (e) => {
      state.brinsonModel = e.target.value;
      renderBrinsonAttribution();
    });
  }
  if (elements.selectBrinsonFactors) {
    elements.selectBrinsonFactors.addEventListener('change', (e) => {
      state.brinsonFactors = e.target.value;
      renderBrinsonAttribution();
    });
  }
  if (elements.selectBrinsonHorizon) {
    elements.selectBrinsonHorizon.addEventListener('change', (e) => {
      state.brinsonHorizon = e.target.value;
      renderBrinsonAttribution();
    });
  }

  // Market Timing Model Selector
  if (elements.selectTimingModel) {
    elements.selectTimingModel.addEventListener('change', (e) => {
      state.timingModel = e.target.value;
      renderMarketTiming();
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
        renderMarketTimingChart();
      }
      if (state.lastBrinson) {
        renderBrinsonBarsChart();
        if (state.brinsonHorizon !== 'single') {
          renderBrinsonWaterfallChart();
        }
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
