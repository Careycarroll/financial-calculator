/**
 * Rolling Portfolio Optimization Studio UI Controller
 * Manages walk-forward out-of-sample simulation, dynamic rebalancing,
 * multi-objective optimization, stacked area transition chart,
 * cumulative trajectory growth chart, and rebalance history schedule.
 */

import {
  runRollingOptimization,
  findCommonDateRange
} from './optimization-engine.js';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import { openAssetModal } from '../js/asset-modal.js';
import { getAllFundsSync, subscribeSessionFunds } from '../js/session-funds.js';
import { rafThrottle, formatCurrency } from '../js/chart-utils.js';

// Color Palette for Universe Assets
const ASSET_PALETTE = [
  '#38bdf8', '#34d399', '#fbbf24', '#f43f5e', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// Presets
const OPT_PRESETS = {
  'core-two': [
    { ticker: 'VOO', lower: 0, upper: 100 },
    { ticker: 'BND', lower: 0, upper: 100 }
  ],
  'three-fund': [
    { ticker: 'VOO', lower: 0, upper: 100 },
    { ticker: 'SCHD', lower: 0, upper: 100 },
    { ticker: 'BND', lower: 0, upper: 100 }
  ],
  'growth-four': [
    { ticker: 'VOO', lower: 0, upper: 100 },
    { ticker: 'QQQ', lower: 0, upper: 100 },
    { ticker: 'SCHD', lower: 0, upper: 100 },
    { ticker: 'BND', lower: 0, upper: 100 }
  ],
  'equities': [
    { ticker: 'VOO', lower: 0, upper: 100 },
    { ticker: 'QQQ', lower: 0, upper: 100 },
    { ticker: 'SCHD', lower: 0, upper: 100 }
  ]
};

// Reactive State
const state = {
  selectedAssets: [
    { ticker: 'VOO', lower: 0, upper: 100 },
    { ticker: 'BND', lower: 0, upper: 100 }
  ],
  lookbackMonths: 36,
  frequency: 'annually',
  goal: 'max-sharpe',
  baseline: 'equal',
  covarianceEstimator: 'ledoit-wolf',
  riskFreeRate: 0.03,
  scaleType: 'linear', // 'linear' | 'log'
  lastResult: null,
  activeHoverIdx: -1
};

// DOM Elements Cache
const elements = {};

function initDom() {
  elements.statusTimelineRange = document.getElementById('status-timeline-range');
  elements.statusTotalMonths = document.getElementById('status-total-months');
  elements.statusLookbackVal = document.getElementById('status-lookback-val');
  elements.statusFreqVal = document.getElementById('status-freq-val');
  elements.statusRollingCov = document.getElementById('status-rolling-cov');
  elements.statusTurnoverVal = document.getElementById('status-turnover-val');

  elements.configCard = document.getElementById('config-card');
  elements.btnToggleConfig = document.getElementById('btn-toggle-config-panel');
  elements.btnConfigText = document.getElementById('btn-config-text');

  elements.selectLookback = document.getElementById('select-lookback');
  elements.selectFrequency = document.getElementById('select-frequency');
  elements.selectGoal = document.getElementById('select-goal');
  elements.selectBaseline = document.getElementById('select-baseline');
  elements.selectRollingCov = document.getElementById('select-rolling-cov');
  elements.inputRf = document.getElementById('input-rf');

  elements.assetTableBody = document.getElementById('asset-table-body');
  elements.btnAddAsset = document.getElementById('btn-add-asset');
  elements.btnRunRollingOpt = document.getElementById('btn-run-rolling-opt');

  elements.metricFinalVal = document.getElementById('metric-final-val');
  elements.metricFinalBase = document.getElementById('metric-final-base');
  elements.metricFinalDelta = document.getElementById('metric-final-delta');
  elements.metricCagr = document.getElementById('metric-cagr');
  elements.metricCagrBase = document.getElementById('metric-cagr-base');
  elements.metricCagrDelta = document.getElementById('metric-cagr-delta');
  elements.metricSharpe = document.getElementById('metric-sharpe');
  elements.metricSharpeBase = document.getElementById('metric-sharpe-base');
  elements.metricSharpeDelta = document.getElementById('metric-sharpe-delta');
  elements.metricMaxdd = document.getElementById('metric-maxdd');
  elements.metricMaxddBase = document.getElementById('metric-maxdd-base');
  elements.metricMaxddDelta = document.getElementById('metric-maxdd-delta');

  elements.scorecardTableBody = document.getElementById('scorecard-table-body');

  elements.canvasTransition = document.getElementById('canvas-transition');
  elements.containerTransition = document.getElementById('container-transition');
  elements.tooltipTransition = document.getElementById('tooltip-transition');
  elements.transitionLegend = document.getElementById('transition-legend');

  elements.canvasGrowth = document.getElementById('canvas-growth');
  elements.containerGrowth = document.getElementById('container-growth');
  elements.tooltipGrowth = document.getElementById('tooltip-growth');
  elements.btnScaleLinear = document.getElementById('btn-scale-linear');
  elements.btnScaleLog = document.getElementById('btn-scale-log');

  elements.rebalanceTableBody = document.getElementById('rebalance-table-body');
  elements.btnExportCsv = document.getElementById('btn-export-csv');
}

// -------------------------------------------------------------------
// Helper: Resolve Fund Object by Ticker
// -------------------------------------------------------------------
function resolveFund(ticker) {
  const upper = ticker.toUpperCase();
  const sessionFunds = getAllFundsSync();
  const foundSession = sessionFunds.find(f => f.ticker.toUpperCase() === upper);
  if (foundSession) return foundSession;

  const foundPreset = PRESET_BENCHMARKS.find(f => f.ticker.toUpperCase() === upper);
  if (foundPreset) return foundPreset;

  return null;
}

// -------------------------------------------------------------------
// Renders the Asset Universe & Box Constraints Table
// -------------------------------------------------------------------
function renderAssetTable() {
  if (!elements.assetTableBody) return;
  elements.assetTableBody.innerHTML = '';

  state.selectedAssets.forEach((asset, idx) => {
    const fund = resolveFund(asset.ticker);
    const assetName = fund ? fund.name : asset.ticker;
    const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="legend-swatch" style="background:${color}; display:inline-block; width:12px; height:12px; border-radius:3px;"></span>
      </td>
      <td><strong>${asset.ticker}</strong></td>
      <td style="color:#cbd5e1; font-size:0.85rem;">${assetName}</td>
      <td class="num">
        <input
          type="number"
          class="form-input form-input-sm asset-bound-input"
          data-index="${idx}"
          data-field="lower"
          value="${asset.lower}"
          min="0"
          max="100"
          step="5"
          style="width: 80px; text-align:right;"
        /> %
      </td>
      <td class="num">
        <input
          type="number"
          class="form-input form-input-sm asset-bound-input"
          data-index="${idx}"
          data-field="upper"
          value="${asset.upper}"
          min="0"
          max="100"
          step="5"
          style="width: 80px; text-align:right;"
        /> %
      </td>
      <td>
        <button
          type="button"
          class="btn-icon-danger btn-remove-asset"
          data-index="${idx}"
          title="Remove ${asset.ticker}"
          ${state.selectedAssets.length <= 2 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}
        >
          ✕
        </button>
      </td>
    `;
    elements.assetTableBody.appendChild(tr);
  });

  // Attach input listeners
  const boundInputs = elements.assetTableBody.querySelectorAll('.asset-bound-input');
  boundInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      const field = e.target.dataset.field;
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 0;
      val = Math.max(0, Math.min(100, val));
      e.target.value = val;
      state.selectedAssets[idx][field] = val;
      runOptimization();
    });
  });

  const removeBtns = elements.assetTableBody.querySelectorAll('.btn-remove-asset');
  removeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      if (state.selectedAssets.length > 2) {
        state.selectedAssets.splice(idx, 1);
        renderAssetTable();
        runOptimization();
      }
    });
  });
}

// -------------------------------------------------------------------
// Primary Walk-Forward Optimization Execution
// -------------------------------------------------------------------
function runOptimization() {
  try {
    const assets = [];
    for (const item of state.selectedAssets) {
      const fund = resolveFund(item.ticker);
      if (!fund) {
        throw new Error(`Asset data for ${item.ticker} could not be resolved.`);
      }
      assets.push(fund);
    }

    const lowerBounds = state.selectedAssets.map(a => (a.lower || 0) / 100);
    const upperBounds = state.selectedAssets.map(a => (typeof a.upper === 'number' ? a.upper : 100) / 100);

    const options = {
      lookbackMonths: state.lookbackMonths,
      frequency: state.frequency,
      goal: state.goal,
      baseline: state.baseline,
      covarianceEstimator: state.covarianceEstimator,
      riskFreeRate: state.riskFreeRate,
      lowerBounds,
      upperBounds
    };

    const result = runRollingOptimization(assets, options);
    state.lastResult = result;

    // Update Status Bar
    if (elements.statusRollingCov) {
      elements.statusRollingCov.textContent = state.covarianceEstimator === 'ledoit-wolf' ? 'Ledoit-Wolf Shrunk' : 'Sample Covariance';
    }

    // Update Status Bar
    if (elements.statusTimelineRange) {
      elements.statusTimelineRange.textContent = `${result.outOfSampleDates[0]} to ${result.outOfSampleDates[result.outOfSampleDates.length - 1]}`;
    }
    if (elements.statusTotalMonths) {
      elements.statusTotalMonths.textContent = `(${result.outOfSampleMonths} Months)`;
    }
    if (elements.statusLookbackVal) {
      elements.statusLookbackVal.textContent = `${result.lookbackMonths} Months`;
    }
    if (elements.statusFreqVal) {
      elements.statusFreqVal.textContent = result.frequency.charAt(0).toUpperCase() + result.frequency.slice(1);
    }
    if (elements.statusTurnoverVal) {
      elements.statusTurnoverVal.textContent = `${(result.strategyStats.avgAnnualTurnover * 100).toFixed(1)}% / yr`;
    }

    // Render Components
    renderScorecards(result);
    renderTransitionChart();
    renderGrowthChart();
    renderRebalanceSchedule(result);

  } catch (err) {
    console.error('Rolling optimization failed:', err);
    alert(`Optimization error: ${err.message}`);
  }
}

// -------------------------------------------------------------------
// Scorecards & Comparison Table
// -------------------------------------------------------------------
function renderScorecards(result) {
  const strat = result.strategyStats;
  const base = result.baselineStats;

  // 1. Highlight Cards
  if (elements.metricFinalVal) elements.metricFinalVal.textContent = formatCurrency(strat.finalValue);
  if (elements.metricFinalBase) elements.metricFinalBase.textContent = formatCurrency(base.finalValue);
  if (elements.metricFinalDelta) {
    const dVal = strat.finalValue - base.finalValue;
    const sign = dVal >= 0 ? '+' : '';
    elements.metricFinalDelta.textContent = `${sign}${formatCurrency(dVal)}`;
    elements.metricFinalDelta.className = dVal >= 0 ? 'delta-badge-pos' : 'delta-badge-neg';
  }

  if (elements.metricCagr) elements.metricCagr.textContent = `${(strat.cagr * 100).toFixed(2)}%`;
  if (elements.metricCagrBase) elements.metricCagrBase.textContent = `${(base.cagr * 100).toFixed(2)}%`;
  if (elements.metricCagrDelta) {
    const dCagr = (strat.cagr - base.cagr) * 100;
    const sign = dCagr >= 0 ? '+' : '';
    elements.metricCagrDelta.textContent = `${sign}${dCagr.toFixed(2)}%`;
    elements.metricCagrDelta.className = dCagr >= 0 ? 'delta-badge-pos' : 'delta-badge-neg';
  }

  if (elements.metricSharpe) elements.metricSharpe.textContent = strat.sharpeRatio.toFixed(3);
  if (elements.metricSharpeBase) elements.metricSharpeBase.textContent = base.sharpeRatio.toFixed(3);
  if (elements.metricSharpeDelta) {
    const dSharpe = strat.sharpeRatio - base.sharpeRatio;
    const sign = dSharpe >= 0 ? '+' : '';
    elements.metricSharpeDelta.textContent = `${sign}${dSharpe.toFixed(3)}`;
    elements.metricSharpeDelta.className = dSharpe >= 0 ? 'delta-badge-pos' : 'delta-badge-neg';
  }

  if (elements.metricMaxdd) elements.metricMaxdd.textContent = `${(strat.maxDrawdown * 100).toFixed(2)}%`;
  if (elements.metricMaxddBase) elements.metricMaxddBase.textContent = `${(base.maxDrawdown * 100).toFixed(2)}%`;
  if (elements.metricMaxddDelta) {
    const dDD = (strat.maxDrawdown - base.maxDrawdown) * 100;
    // For drawdown, higher is better (e.g. -15% vs -20% is +5% improvement)
    const sign = dDD >= 0 ? '+' : '';
    elements.metricMaxddDelta.textContent = `${sign}${dDD.toFixed(2)}%`;
    elements.metricMaxddDelta.className = dDD >= 0 ? 'delta-badge-pos' : 'delta-badge-neg';
  }

  // 2. Comprehensive Comparison Table
  if (!elements.scorecardTableBody) return;
  elements.scorecardTableBody.innerHTML = '';

  const baselineLabel = result.baselineType === 'inv-vol' ? 'Inverse Volatility (1/σ)' : 'Equal Weighted (1/N)';
  const rfPct = (state.riskFreeRate * 100).toFixed(1);

  const metrics = [
    {
      label: 'Initial Investment',
      stratVal: '$10,000.00',
      baseVal: '$10,000.00',
      deltaVal: '$0.00',
      isPos: null
    },
    {
      label: 'Ending Wealth Balance',
      stratVal: formatCurrency(strat.finalValue),
      baseVal: formatCurrency(base.finalValue),
      deltaVal: `${strat.finalValue >= base.finalValue ? '+' : ''}${formatCurrency(strat.finalValue - base.finalValue)}`,
      isPos: strat.finalValue >= base.finalValue
    },
    {
      label: 'Compound Annual Growth Rate (CAGR)',
      stratVal: `${(strat.cagr * 100).toFixed(2)}%`,
      baseVal: `${(base.cagr * 100).toFixed(2)}%`,
      deltaVal: `${strat.cagr >= base.cagr ? '+' : ''}${((strat.cagr - base.cagr) * 100).toFixed(2)}%`,
      isPos: strat.cagr >= base.cagr
    },
    {
      label: 'Annualized Volatility (Standard Deviation)',
      stratVal: `${(strat.annualVol * 100).toFixed(2)}%`,
      baseVal: `${(base.annualVol * 100).toFixed(2)}%`,
      deltaVal: `${strat.annualVol <= base.annualVol ? '-' : '+'}${Math.abs((strat.annualVol - base.annualVol) * 100).toFixed(2)}%`,
      isPos: strat.annualVol <= base.annualVol // Lower volatility is favorable
    },
    {
      label: `Sharpe Ratio (Rf = ${rfPct}%)`,
      stratVal: strat.sharpeRatio.toFixed(3),
      baseVal: base.sharpeRatio.toFixed(3),
      deltaVal: `${strat.sharpeRatio >= base.sharpeRatio ? '+' : ''}${(strat.sharpeRatio - base.sharpeRatio).toFixed(3)}`,
      isPos: strat.sharpeRatio >= base.sharpeRatio
    },
    {
      label: `Sortino Ratio (Rf = ${rfPct}%)`,
      stratVal: strat.sortinoRatio.toFixed(3),
      baseVal: base.sortinoRatio.toFixed(3),
      deltaVal: `${strat.sortinoRatio >= base.sortinoRatio ? '+' : ''}${(strat.sortinoRatio - base.sortinoRatio).toFixed(3)}`,
      isPos: strat.sortinoRatio >= base.sortinoRatio
    },
    {
      label: 'Maximum Drawdown',
      stratVal: `${(strat.maxDrawdown * 100).toFixed(2)}%`,
      baseVal: `${(base.maxDrawdown * 100).toFixed(2)}%`,
      deltaVal: `${strat.maxDrawdown >= base.maxDrawdown ? '+' : ''}${((strat.maxDrawdown - base.maxDrawdown) * 100).toFixed(2)}%`,
      isPos: strat.maxDrawdown >= base.maxDrawdown
    },
    {
      label: '95% Monthly Conditional VaR (CVaR)',
      stratVal: `${(strat.cvar * 100).toFixed(2)}%`,
      baseVal: `${(base.cvar * 100).toFixed(2)}%`,
      deltaVal: `${strat.cvar <= base.cvar ? '-' : '+'}${Math.abs((strat.cvar - base.cvar) * 100).toFixed(2)}%`,
      isPos: strat.cvar <= base.cvar
    },
    {
      label: 'Cumulative Total Return',
      stratVal: `${(strat.totalReturn * 100).toFixed(2)}%`,
      baseVal: `${(base.totalReturn * 100).toFixed(2)}%`,
      deltaVal: `${strat.totalReturn >= base.totalReturn ? '+' : ''}${((strat.totalReturn - base.totalReturn) * 100).toFixed(2)}%`,
      isPos: strat.totalReturn >= base.totalReturn
    },
    {
      label: 'Annualized Portfolio Turnover',
      stratVal: `${(strat.avgAnnualTurnover * 100).toFixed(1)}% / yr`,
      baseVal: '0.0% / yr (Drift Only)',
      deltaVal: `+${(strat.avgAnnualTurnover * 100).toFixed(1)}% / yr`,
      isPos: null
    },
    {
      label: 'Rebalance Events Executed',
      stratVal: `${result.rebalanceEvents.length} Events`,
      baseVal: `${result.rebalanceEvents.length} Events`,
      deltaVal: '0',
      isPos: null
    }
  ];

  metrics.forEach(m => {
    const tr = document.createElement('tr');
    let deltaClass = '';
    if (m.isPos === true) deltaClass = 'class="delta-badge-pos"';
    else if (m.isPos === false) deltaClass = 'class="delta-badge-neg"';

    tr.innerHTML = `
      <td><strong>${m.label}</strong></td>
      <td class="num highlight-gold"><strong>${m.stratVal}</strong></td>
      <td class="num" style="color:#94a3b8;">${m.baseVal}</td>
      <td class="num"><span ${deltaClass}>${m.deltaVal}</span></td>
    `;
    elements.scorecardTableBody.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// Chart 1: Stacked Area Walk-Forward Allocation Transitions
// -------------------------------------------------------------------
function renderTransitionChart() {
  const canvas = elements.canvasTransition;
  const container = elements.containerTransition;
  if (!canvas || !container || !state.lastResult) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 25, right: 35, bottom: 45, left: 60 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { weightTransitions, tickers, names } = state.lastResult;
  const dates = weightTransitions.dates;
  const numSteps = dates.length;
  const numAssets = tickers.length;

  // Render Legend
  if (elements.transitionLegend) {
    elements.transitionLegend.innerHTML = tickers.map((t, idx) => {
      const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
      return `<div class="legend-item"><span class="legend-swatch" style="background:${color};"></span> ${t}</div>`;
    }).join('');
  }

  const xToPix = (stepIdx) => pad.left + (stepIdx / (numSteps - 1)) * plotW;
  const yToPix = (cumWeight) => pad.top + plotH - cumWeight * plotH;

  ctx.clearRect(0, 0, width, height);

  // Fonts
  const fontSm = window.CHART_FONTS ? window.CHART_FONTS.sm : '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  const fontBoldSm = window.CHART_FONTS ? window.CHART_FONTS.boldSm : 'bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  const fontMd = window.CHART_FONTS ? window.CHART_FONTS.md : '600 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;

  // Y-axis grid (0% to 100%)
  ctx.fillStyle = '#64748b';
  ctx.font = fontSm;
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

  // X-axis grid (Date milestones)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const nTicks = Math.min(8, Math.max(3, Math.floor(plotW / 90)));
  const stepGap = Math.floor((numSteps - 1) / (nTicks - 1));

  for (let k = 0; k < nTicks; k++) {
    const s = Math.min(numSteps - 1, k * stepGap);
    const px = xToPix(s);
    ctx.beginPath();
    ctx.moveTo(px, pad.top);
    ctx.lineTo(px, pad.top + plotH);
    ctx.stroke();
    ctx.fillText(dates[s], px, pad.top + plotH + 8);
  }

  // Y-axis Label
  ctx.save();
  ctx.translate(16, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#94a3b8';
  ctx.font = fontMd;
  ctx.textAlign = 'center';
  ctx.fillText('Asset Allocation (%)', 0, 0);
  ctx.restore();

  // Compute Cumulative Weights matrix: cumulative[s][a]
  const cumulative = [];
  for (let s = 0; s < numSteps; s++) {
    cumulative[s] = new Array(numAssets + 1).fill(0);
    let runSum = 0;
    for (let a = 0; a < numAssets; a++) {
      runSum += weightTransitions.series[a][s];
      cumulative[s][a + 1] = Math.min(1.0, runSum);
    }
  }

  // Draw Stacked Polygons
  for (let a = 0; a < numAssets; a++) {
    const color = ASSET_PALETTE[a % ASSET_PALETTE.length];
    ctx.fillStyle = color;

    ctx.beginPath();
    // Top boundary left-to-right
    for (let s = 0; s < numSteps; s++) {
      const px = xToPix(s);
      const py = yToPix(cumulative[s][a + 1]);
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    // Bottom boundary right-to-left
    for (let s = numSteps - 1; s >= 0; s--) {
      const px = xToPix(s);
      const py = yToPix(cumulative[s][a]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Subtle border line between asset bands
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Draw Vertical Crosshair if Hovering
  if (state.activeHoverIdx >= 0 && state.activeHoverIdx < numSteps) {
    const hx = xToPix(state.activeHoverIdx);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(hx, pad.top);
    ctx.lineTo(hx, pad.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Mousemove Interactive Hover Tooltip
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < pad.left || mouseX > pad.left + plotW || mouseY < pad.top || mouseY > pad.top + plotH) {
      elements.tooltipTransition.style.display = 'none';
      if (state.activeHoverIdx !== -1) {
        state.activeHoverIdx = -1;
        renderTransitionChart();
      }
      return;
    }

    const ratio = (mouseX - pad.left) / plotW;
    const hoverStep = Math.max(0, Math.min(numSteps - 1, Math.round(ratio * (numSteps - 1))));

    if (state.activeHoverIdx !== hoverStep) {
      state.activeHoverIdx = hoverStep;
      renderTransitionChart();
    }

    const hoverDate = dates[hoverStep];
    const isRebal = state.lastResult.rebalanceEvents.some(r => r.date === hoverDate);

    let weightsHtml = tickers.map((t, idx) => {
      const w = weightTransitions.series[idx][hoverStep];
      const color = ASSET_PALETTE[idx % ASSET_PALETTE.length];
      return `<div style="display:flex; justify-content:space-between; gap:12px; margin-top:2px;">
        <span><span style="color:${color}; font-size:12px;">●</span> ${t}:</span>
        <strong>${(w * 100).toFixed(1)}%</strong>
      </div>`;
    }).join('');

    elements.tooltipTransition.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px;">
        <strong style="color:#38bdf8;">${hoverDate}</strong>
        ${isRebal ? '<span style="background:#0284c7; color:#fff; font-size:9px; font-weight:700; padding:1px 4px; border-radius:3px;">REBALANCED</span>' : '<span style="color:#64748b; font-size:10px;">Holding Drift</span>'}
      </div>
      <div style="font-size:11px; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px;">
        ${weightsHtml}
      </div>
    `;

    elements.tooltipTransition.style.left = `${Math.min(width - 200, mouseX + 15)}px`;
    elements.tooltipTransition.style.top = `${Math.max(10, mouseY - 30)}px`;
    elements.tooltipTransition.style.display = 'block';
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipTransition.style.display = 'none';
    if (state.activeHoverIdx !== -1) {
      state.activeHoverIdx = -1;
      renderTransitionChart();
    }
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Chart 2: Cumulative Wealth Trajectory ($10k Initial Out-of-Sample)
// -------------------------------------------------------------------
function renderGrowthChart() {
  const canvas = elements.canvasGrowth;
  const container = elements.containerGrowth;
  if (!canvas || !container || !state.lastResult) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 25, right: 35, bottom: 45, left: 75 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { trajectory, baseTrajectory, outOfSampleDates } = state.lastResult;
  const numPoints = trajectory.length; // outOfSampleMonths + 1
  const isLog = state.scaleType === 'log';

  // Find min and max across both trajectories
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let s = 0; s < numPoints; s++) {
    if (trajectory[s] < minVal) minVal = trajectory[s];
    if (trajectory[s] > maxVal) maxVal = trajectory[s];
    if (baseTrajectory[s] < minVal) minVal = baseTrajectory[s];
    if (baseTrajectory[s] > maxVal) maxVal = baseTrajectory[s];
  }

  // Padding bounds
  minVal = Math.max(1000, Math.floor(minVal * 0.95 / 1000) * 1000);
  maxVal = Math.ceil(maxVal * 1.05 / 1000) * 1000;

  const logMin = Math.log(minVal);
  const logMax = Math.log(maxVal);

  const xToPix = (s) => pad.left + (s / (numPoints - 1)) * plotW;
  const yToPix = (val) => {
    if (isLog) {
      const v = Math.max(minVal, val);
      return pad.top + plotH - ((Math.log(v) - logMin) / (logMax - logMin)) * plotH;
    }
    return pad.top + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;
  };

  ctx.clearRect(0, 0, width, height);

  // Fonts
  const fontSm = window.CHART_FONTS ? window.CHART_FONTS.sm : '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  const fontMd = window.CHART_FONTS ? window.CHART_FONTS.md : '600 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;

  // Y-axis grid
  ctx.fillStyle = '#64748b';
  ctx.font = fontSm;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const nYSteps = 5;
  for (let k = 0; k <= nYSteps; k++) {
    let tickVal;
    if (isLog) {
      tickVal = Math.exp(logMin + (k / nYSteps) * (logMax - logMin));
    } else {
      tickVal = minVal + (k / nYSteps) * (maxVal - minVal);
    }
    const py = yToPix(tickVal);
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillText(formatCurrency(tickVal), pad.left - 8, py);
  }

  // X-axis grid (Dates)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const nTicks = Math.min(8, Math.max(3, Math.floor(plotW / 90)));
  const stepGap = Math.floor((numPoints - 1) / (nTicks - 1));

  for (let k = 0; k < nTicks; k++) {
    const s = Math.min(numPoints - 1, k * stepGap);
    const px = xToPix(s);
    ctx.beginPath();
    ctx.moveTo(px, pad.top);
    ctx.lineTo(px, pad.top + plotH);
    ctx.stroke();

    const dText = s === 0 ? 'Start' : outOfSampleDates[s - 1];
    ctx.fillText(dText, px, pad.top + plotH + 8);
  }

  // Y-axis Label
  ctx.save();
  ctx.translate(18, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#94a3b8';
  ctx.font = fontMd;
  ctx.textAlign = 'center';
  ctx.fillText('Portfolio Value ($)', 0, 0);
  ctx.restore();

  // 1. Draw Baseline Curve (Slate dashed)
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  for (let s = 0; s < numPoints; s++) {
    const px = xToPix(s);
    const py = yToPix(baseTrajectory[s]);
    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Draw Strategy Gradient Area
  const stratGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  stratGrad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
  stratGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
  ctx.fillStyle = stratGrad;

  ctx.beginPath();
  ctx.moveTo(xToPix(0), pad.top + plotH);
  for (let s = 0; s < numPoints; s++) {
    ctx.lineTo(xToPix(s), yToPix(trajectory[s]));
  }
  ctx.lineTo(xToPix(numPoints - 1), pad.top + plotH);
  ctx.closePath();
  ctx.fill();

  // 3. Draw Strategy Curve (Cyan solid)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let s = 0; s < numPoints; s++) {
    const px = xToPix(s);
    const py = yToPix(trajectory[s]);
    if (s === 0) ctx.moveTo(px, py);
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
      elements.tooltipGrowth.style.display = 'none';
      return;
    }

    const ratio = (mouseX - pad.left) / plotW;
    const hoverIdx = Math.max(0, Math.min(numPoints - 1, Math.round(ratio * (numPoints - 1))));

    const dateStr = hoverIdx === 0 ? 'Simulation Start' : outOfSampleDates[hoverIdx - 1];
    const stratVal = trajectory[hoverIdx];
    const baseVal = baseTrajectory[hoverIdx];
    const deltaVal = stratVal - baseVal;
    const deltaPct = ((stratVal - baseVal) / baseVal) * 100;

    elements.tooltipGrowth.innerHTML = `
      <div style="font-weight:700; color:#38bdf8; margin-bottom:4px;">${dateStr}</div>
      <div style="display:flex; justify-content:space-between; gap:16px;">
        <span style="color:#38bdf8;">● Strategy:</span>
        <strong>${formatCurrency(stratVal)}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; gap:16px;">
        <span style="color:#94a3b8;">● Baseline:</span>
        <strong>${formatCurrency(baseVal)}</strong>
      </div>
      <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1); font-size:11px; display:flex; justify-content:space-between; gap:12px;">
        <span>Outperformance:</span>
        <strong class="${deltaVal >= 0 ? 'delta-badge-pos' : 'delta-badge-neg'}">
          ${deltaVal >= 0 ? '+' : ''}${formatCurrency(deltaVal)} (${deltaVal >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%)
        </strong>
      </div>
    `;

    elements.tooltipGrowth.style.left = `${Math.min(width - 220, mouseX + 15)}px`;
    elements.tooltipGrowth.style.top = `${Math.max(10, mouseY - 25)}px`;
    elements.tooltipGrowth.style.display = 'block';
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    elements.tooltipGrowth.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Rebalance History Schedule Table
// -------------------------------------------------------------------
function renderRebalanceSchedule(result) {
  if (!elements.rebalanceTableBody) return;
  elements.rebalanceTableBody.innerHTML = '';

  const { rebalanceEvents, tickers, lookbackMonths } = result;

  rebalanceEvents.forEach((ev, idx) => {
    const tr = document.createElement('tr');

    const pillsHtml = tickers.map((t, aIdx) => {
      const color = ASSET_PALETTE[aIdx % ASSET_PALETTE.length];
      const w = ev.weights[aIdx];
      return `<span class="weight-pill">
        <span class="weight-dot" style="background:${color};"></span>
        ${t}: <strong>${(w * 100).toFixed(1)}%</strong>
      </span>`;
    }).join('');

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${ev.date}</strong></td>
      <td>${pillsHtml}</td>
      <td class="num">${(ev.inSampleExpectedReturn * 100).toFixed(2)}%</td>
      <td class="num">${(ev.inSampleVol * 100).toFixed(2)}%</td>
      <td class="num highlight-gold">${ev.inSampleSharpe.toFixed(3)}</td>
      <td class="num">${idx === 0 ? '--' : `${(ev.turnover * 100).toFixed(1)}%`}</td>
    `;
    elements.rebalanceTableBody.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// CSV Export Handler
// -------------------------------------------------------------------
function exportScheduleCsv() {
  if (!state.lastResult || !state.lastResult.rebalanceEvents.length) return;

  const { rebalanceEvents, tickers } = state.lastResult;
  const header = ['Event', 'Rebalance Date', ...tickers.map(t => `${t} Weight (%)`), 'In-Sample Return (%)', 'In-Sample Volatility (%)', 'In-Sample Sharpe', 'Turnover (%)'];

  const rows = rebalanceEvents.map((ev, idx) => {
    return [
      idx + 1,
      ev.date,
      ...ev.weights.map(w => (w * 100).toFixed(2)),
      (ev.inSampleExpectedReturn * 100).toFixed(2),
      (ev.inSampleVol * 100).toFixed(2),
      ev.inSampleSharpe.toFixed(3),
      idx === 0 ? '0.00' : (ev.turnover * 100).toFixed(2)
    ];
  });

  const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `rolling_optimization_schedule_${state.lookbackMonths}M_${state.frequency}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// -------------------------------------------------------------------
// Initialization & Event Wiring
// -------------------------------------------------------------------
function init() {
  initDom();

  // Preset Buttons
  const presetBtns = document.querySelectorAll('.btn-preset');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      presetBtns.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      const presetKey = e.currentTarget.dataset.preset;
      if (OPT_PRESETS[presetKey]) {
        state.selectedAssets = JSON.parse(JSON.stringify(OPT_PRESETS[presetKey]));
        renderAssetTable();
        runOptimization();
      }
    });
  });

  // Select Inputs
  if (elements.selectLookback) {
    elements.selectLookback.addEventListener('change', (e) => {
      state.lookbackMonths = parseInt(e.target.value, 10);
      runOptimization();
    });
  }

  if (elements.selectFrequency) {
    elements.selectFrequency.addEventListener('change', (e) => {
      state.frequency = e.target.value;
      runOptimization();
    });
  }

  if (elements.selectGoal) {
    elements.selectGoal.addEventListener('change', (e) => {
      state.goal = e.target.value;
      runOptimization();
    });
  }

  if (elements.selectBaseline) {
    elements.selectBaseline.addEventListener('change', (e) => {
      state.baseline = e.target.value;
      runOptimization();
    });
  }

  if (elements.selectRollingCov) {
    elements.selectRollingCov.addEventListener('change', (e) => {
      state.covarianceEstimator = e.target.value;
      runOptimization();
    });
  }

  if (elements.inputRf) {
    elements.inputRf.addEventListener('change', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 3.0;
      state.riskFreeRate = Math.max(0, val) / 100;
      runOptimization();
    });
  }

  // Add Asset Modal
  if (elements.btnAddAsset) {
    elements.btnAddAsset.addEventListener('click', () => {
      openAssetModal({
        onSelect: (selectedFund) => {
          const upper = (typeof selectedFund === 'string' ? selectedFund : (selectedFund?.ticker || selectedFund))?.toUpperCase();
          const exists = state.selectedAssets.some(a => a.ticker.toUpperCase() === upper);
          if (exists) {
            alert(`${upper} is already in the universe.`);
            return;
          }
          state.selectedAssets.push({
            ticker: upper,
            lower: 0,
            upper: 100
          });
          renderAssetTable();
          runOptimization();
        }
      });
    });
  }

  // Primary Run Button
  if (elements.btnRunRollingOpt) {
    elements.btnRunRollingOpt.addEventListener('click', runOptimization);
  }

  // Scale Toggle for Growth Chart
  if (elements.btnScaleLinear && elements.btnScaleLog) {
    elements.btnScaleLinear.addEventListener('click', () => {
      state.scaleType = 'linear';
      elements.btnScaleLinear.classList.add('active');
      elements.btnScaleLog.classList.remove('active');
      renderGrowthChart();
    });
    elements.btnScaleLog.addEventListener('click', () => {
      state.scaleType = 'log';
      elements.btnScaleLog.classList.add('active');
      elements.btnScaleLinear.classList.remove('active');
      renderGrowthChart();
    });
  }

  // CSV Export
  if (elements.btnExportCsv) {
    elements.btnExportCsv.addEventListener('click', exportScheduleCsv);
  }

  // Toggle Configuration Panel
  if (elements.btnToggleConfig && elements.configCard) {
    elements.btnToggleConfig.addEventListener('click', () => {
      const isCollapsed = elements.configCard.classList.toggle('collapsed');
      if (elements.btnConfigText) {
        elements.btnConfigText.textContent = isCollapsed ? 'Expand Configuration' : 'Collapse Configuration';
      }
    });
  }

  // Window Resize
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.lastResult) {
        renderTransitionChart();
        renderGrowthChart();
      }
    }, 250);
  });

  // Initial Execution - defer compute to requestAnimationFrame so frame 1 renders instantly without freezing
  renderAssetTable();
  requestAnimationFrame(() => {
    runOptimization();
  });
}

// Subscribe to session fund updates
subscribeSessionFunds(() => {
  if (state.lastResult) {
    renderAssetTable();
    runOptimization();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
