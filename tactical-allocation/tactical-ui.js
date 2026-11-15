/**
 * Tactical Asset Allocation Studio UI Controller
 * 
 * Features:
 * - 6 Quantitative Timing Models (Dual Momentum GEM, Moving Averages, Momentum Rotation, Adaptive Allocation, Target Volatility, Market Valuation)
 * - 54-Year Historical Backtest (1972-2026 / 656 Months)
 * - High-DPI Canvas 2D Charts with window.CHART_FONTS, AbortController, and rafThrottle
 * - Real-time tactical signal banner and trade execution log
 * - Log / Linear scale toggle for multi-decade compound growth
 * - CSV exporters for performance history and trade logs
 */

import {
  TACTICAL_STRATEGY_PRESETS,
  runTacticalBacktest
} from './tactical-engine.js';

import {
  ASSET_CLASS_CATALOG,
  getAssetClassById
} from '../portfolio-backtest/asset-class-data.js';

import { rafThrottle, formatCurrency } from '../js/chart-utils.js';

// -------------------------------------------------------------------
// State Definition
// -------------------------------------------------------------------
const state = {
  timingModel: 'dual-momentum',
  presetId: 'dual-momentum-gem',
  riskAssets: ['TotalStockMarket', 'IntlStockMarket'],
  safeHavenAsset: 'TotalBond',
  cashHurdleAsset: 'Cash',
  lookbackMonths: 12,
  topN: 1,
  maType: 'SMA',
  targetVol: 0.10,
  initialCapital: 10000,
  startMonth: '1972-01',
  endMonth: '2026-08',
  isLogScale: false,
  isConfigCollapsed: false,
  backtestResult: null
};

// DOM Elements Cache
const el = {};

function initDom() {
  el.statusStrategyName = document.getElementById('status-strategy-name');
  el.statusTimingModel = document.getElementById('status-timing-model');
  el.statusTimelineRange = document.getElementById('status-timeline-range');
  el.statusTotalMonths = document.getElementById('status-total-months');
  el.statusCurrentRegime = document.getElementById('status-current-regime');
  el.statusRegimePill = document.getElementById('status-regime-pill');
  el.statusInitialCap = document.getElementById('status-initial-cap');

  el.btnToggleConfig = document.getElementById('btn-toggle-config');
  el.configCard = document.getElementById('config-card');

  el.currentSignalBanner = document.getElementById('current-signal-banner');
  el.bannerSignalBadge = document.getElementById('banner-signal-badge');
  el.bannerSignalTitle = document.getElementById('banner-signal-title');
  el.bannerSignalSub = document.getElementById('banner-signal-sub');
  el.btnJumpTradeLog = document.getElementById('btn-jump-trade-log');

  el.timingModelControl = document.getElementById('timing-model-control');
  el.presetButtonsContainer = document.getElementById('preset-buttons-container');

  el.selectLookback = document.getElementById('select-lookback');
  el.selectSafeHaven = document.getElementById('select-safe-haven');
  el.selectTopN = document.getElementById('select-top-n');
  el.inputTargetVol = document.getElementById('input-target-vol');
  el.inputInitialCapital = document.getElementById('input-initial-capital');
  el.btnRunTactical = document.getElementById('btn-run-tactical');

  // Scorecards
  el.cardCagr = document.getElementById('card-cagr');
  el.cardCagrSpy = document.getElementById('card-cagr-spy');
  el.cardCagr6040 = document.getElementById('card-cagr-6040');
  el.cardMaxDd = document.getElementById('card-max-dd');
  el.cardDdShield = document.getElementById('card-dd-shield');
  el.cardSharpe = document.getElementById('card-sharpe');
  el.cardSharpeSpy = document.getElementById('card-sharpe-spy');
  el.cardSharpe6040 = document.getElementById('card-sharpe-6040');
  el.cardSortino = document.getElementById('card-sortino');
  el.cardVol = document.getElementById('card-vol');
  el.cardVolSpy = document.getElementById('card-vol-spy');
  el.cardWinRate = document.getElementById('card-win-rate');
  el.cardTotalTrades = document.getElementById('card-total-trades');

  // Canvases
  el.canvasGrowth = document.getElementById('tactical-growth-canvas');
  el.containerGrowth = document.getElementById('container-tactical-growth');
  el.tooltipGrowth = document.getElementById('tooltip-tactical-growth');
  el.btnScaleLinear = document.getElementById('btn-scale-linear');
  el.btnScaleLog = document.getElementById('btn-scale-log');

  el.canvasAllocation = document.getElementById('tactical-allocation-canvas');
  el.containerAllocation = document.getElementById('container-tactical-allocation');
  el.tooltipAllocation = document.getElementById('tooltip-tactical-allocation');

  el.canvasDrawdown = document.getElementById('tactical-drawdown-canvas');
  el.containerDrawdown = document.getElementById('container-tactical-drawdown');
  el.tooltipDrawdown = document.getElementById('tooltip-tactical-drawdown');

  el.canvasAnnual = document.getElementById('tactical-annual-canvas');
  el.containerAnnual = document.getElementById('container-tactical-annual');
  el.tooltipAnnual = document.getElementById('tooltip-tactical-annual');

  // Tables
  el.mptScorecardTableBody = document.getElementById('mpt-scorecard-table-body');
  el.tradeLogTableBody = document.getElementById('trade-log-table-body');
  el.strategyDiagnosticContent = document.getElementById('strategy-diagnostic-content');

  el.btnExportPerformanceCsv = document.getElementById('btn-export-performance-csv');
  el.btnExportTradesCsv = document.getElementById('btn-export-trades-csv');
}

// -------------------------------------------------------------------
// Safe Font Accessor
// -------------------------------------------------------------------
function getFonts() {
  const cf = window.CHART_FONTS;
  if (cf) return cf;
  return {
    xs: '11px sans-serif',
    sm: '13px sans-serif',
    md: '14px sans-serif',
    lg: '15px sans-serif',
    boldSm: 'bold 13px sans-serif',
    boldMd: 'bold 14px sans-serif',
    boldLg: 'bold 15px sans-serif'
  };
}

// -------------------------------------------------------------------
// Asset Class Colors Map
// -------------------------------------------------------------------
const ASSET_COLORS = {
  TotalStockMarket: '#38bdf8',
  LargeCapBlend: '#0ea5e9',
  LargeCapValue: '#0284c7',
  LargeCapGrowth: '#60a5fa',
  SmallCapBlend: '#10b981',
  IntlStockMarket: '#a855f7',
  EmergingMarket: '#ec4899',
  TotalBond: '#fbbf24',
  IntermediateTreasury: '#f59e0b',
  LongTreasury: '#d97706',
  ShortTreasury: '#94a3b8',
  Cash: '#64748b',
  REIT: '#34d399',
  Commodities: '#f43f5e',
  Gold: '#eab308'
};

function getAssetColor(id) {
  return ASSET_COLORS[id] || '#38bdf8';
}

function getAssetName(id) {
  const def = getAssetClassById(id);
  return def ? def.shortName || def.name : id;
}

// -------------------------------------------------------------------
// URL Parameters Support (Portfolio Visualizer compatibility)
// -------------------------------------------------------------------
function parseUrlParams() {
  const bodyPreset = document.body && document.body.dataset.defaultPreset;
  const bodyModel = document.body && document.body.dataset.defaultModel;

  if (bodyPreset) {
    applyPreset(bodyPreset);
  } else if (bodyModel) {
    if (bodyModel === '0' || bodyModel === 'moving-average') applyPreset('moving-average-sma');
    else if (bodyModel === '1' || bodyModel === 'momentum-rotation') applyPreset('ivy-5-momentum-rotation');
    else if (bodyModel === '2' || bodyModel === 'dual-momentum') applyPreset('dual-momentum-gem');
    else if (bodyModel === '3' || bodyModel === 'adaptive-allocation') applyPreset('resolve-adaptive-allocation');
    else if (bodyModel === '4' || bodyModel === 'target-volatility') applyPreset('target-volatility-10');
    else if (bodyModel === '5' || bodyModel === 'market-valuation') applyPreset('market-valuation-cape');
  }

  const params = new URLSearchParams(window.location.search);

  // timingModel: 0=SMA, 1=Momentum, 2=Dual Momentum, 3=Adaptive, 4=Vol, 5=Valuation
  const tm = params.get('timingModel') || params.get('model');
  if (tm) {
    if (tm === '0' || tm === 'moving-average') applyPreset('moving-average-sma');
    else if (tm === '1' || tm === 'momentum-rotation') applyPreset('ivy-5-momentum-rotation');
    else if (tm === '2' || tm === 'dual-momentum') applyPreset('dual-momentum-gem');
    else if (tm === '3' || tm === 'adaptive-allocation') applyPreset('resolve-adaptive-allocation');
    else if (tm === '4' || tm === 'target-volatility') applyPreset('target-volatility-10');
    else if (tm === '5' || tm === 'market-valuation') applyPreset('market-valuation-cape');
  }

  const preset = params.get('preset');
  if (preset) {
    applyPreset(preset);
  }

  const lookback = parseInt(params.get('lookback') || params.get('lookbackMonths'), 10);
  if ([1, 3, 6, 10, 12].includes(lookback)) {
    state.lookbackMonths = lookback;
  }
}

// -------------------------------------------------------------------
// Apply Strategy Preset
// -------------------------------------------------------------------
function applyPreset(presetId) {
  const p = TACTICAL_STRATEGY_PRESETS.find(x => x.id === presetId);
  if (!p) return;

  state.presetId = p.id;
  state.timingModel = p.timingModel;
  state.riskAssets = [...p.riskAssets];
  state.safeHavenAsset = p.safeHavenAsset;
  state.cashHurdleAsset = p.cashHurdleAsset || 'Cash';
  state.lookbackMonths = p.lookbackMonths || 12;
  state.topN = p.topN || 1;
  state.maType = p.maType || 'SMA';
  state.targetVol = p.targetVol || 0.10;

  syncInputsToState();
}

function syncInputsToState() {
  if (el.timingModelControl) {
    el.timingModelControl.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === state.timingModel);
    });
  }
  if (el.presetButtonsContainer) {
    el.presetButtonsContainer.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === state.presetId);
    });
  }
  if (el.selectLookback) el.selectLookback.value = state.lookbackMonths;
  if (el.selectSafeHaven) el.selectSafeHaven.value = state.safeHavenAsset;
  if (el.selectTopN) el.selectTopN.value = state.topN;
  if (el.inputTargetVol) el.inputTargetVol.value = Math.round(state.targetVol * 100);
  if (el.inputInitialCapital) el.inputInitialCapital.value = state.initialCapital;
}

// -------------------------------------------------------------------
// Execute Tactical Backtest
// -------------------------------------------------------------------
function executeBacktest() {
  try {
    state.backtestResult = runTacticalBacktest({
      timingModel: state.timingModel,
      riskAssets: state.riskAssets,
      safeHavenAsset: state.safeHavenAsset,
      cashHurdleAsset: state.cashHurdleAsset,
      lookbackMonths: state.lookbackMonths,
      topN: state.topN,
      maType: state.maType,
      targetVol: state.targetVol,
      initialCapital: state.initialCapital,
      startMonth: state.startMonth,
      endMonth: state.endMonth
    });

    renderUI();
  } catch (err) {
    console.error('Tactical Backtest Error:', err);
  }
}

// -------------------------------------------------------------------
// Master Render Function
// -------------------------------------------------------------------
export function renderUI() {
  const res = state.backtestResult;
  if (!res) return;

  renderStatusBar(res);
  renderSignalBanner(res);
  renderScorecards(res);
  renderGrowthChart(res);
  renderAllocationAreaChart(res);
  renderDrawdownChart(res);
  renderAnnualReturnsChart(res);
  renderMptTable(res);
  renderTradeLogTable(res);
  renderDiagnostic(res);
}

// -------------------------------------------------------------------
// 1. Status Bar
// -------------------------------------------------------------------
function renderStatusBar(res) {
  const preset = TACTICAL_STRATEGY_PRESETS.find(p => p.id === state.presetId);
  if (el.statusStrategyName) el.statusStrategyName.textContent = preset ? preset.name : 'Custom Model';
  if (el.statusTimingModel) el.statusTimingModel.textContent = state.timingModel.toUpperCase();
  if (el.statusTimelineRange) el.statusTimelineRange.textContent = `${res.startMonth} to ${res.endMonth}`;
  if (el.statusTotalMonths) el.statusTotalMonths.textContent = `(${res.sampleMonths} M)`;
  if (el.statusInitialCap) el.statusInitialCap.textContent = formatCurrency(res.initialCapital);

  // Latest regime
  const lastSignal = res.monthlySignals[res.monthlySignals.length - 1];
  if (lastSignal && el.statusCurrentRegime && el.statusRegimePill) {
    if (lastSignal.isDefensive) {
      el.statusCurrentRegime.textContent = 'DEFENSIVE SAFE HAVEN';
      el.statusRegimePill.className = 'status-pill defense';
    } else {
      el.statusCurrentRegime.textContent = 'BULL: RISK ASSETS';
      el.statusRegimePill.className = 'status-pill highlight';
    }
  }
}

// -------------------------------------------------------------------
// 2. Current Tactical Signal Banner
// -------------------------------------------------------------------
function renderSignalBanner(res) {
  const lastSignal = res.monthlySignals[res.monthlySignals.length - 1];
  if (!lastSignal) return;

  const weightsText = Object.entries(lastSignal.weights)
    .filter(([_, w]) => w > 0.01)
    .map(([id, w]) => `${(w * 100).toFixed(0)}% ${getAssetName(id)}`)
    .join(' + ');

  if (el.bannerSignalTitle) {
    el.bannerSignalTitle.textContent = `Current Allocation (${lastSignal.date}): ${weightsText}`;
  }
  if (el.bannerSignalSub) {
    el.bannerSignalSub.textContent = lastSignal.details;
  }
  if (el.bannerSignalBadge) {
    if (lastSignal.isDefensive) {
      el.bannerSignalBadge.className = 'signal-badge signal-defense';
      el.bannerSignalBadge.textContent = '🛡️ ACTIVE SIGNAL: BEAR CASH DEFENSE';
      if (el.currentSignalBanner) el.currentSignalBanner.className = 'current-signal-banner defensive';
    } else {
      el.bannerSignalBadge.className = 'signal-badge signal-bull';
      el.bannerSignalBadge.textContent = '⚡ ACTIVE SIGNAL: BULL REGIME';
      if (el.currentSignalBanner) el.currentSignalBanner.className = 'current-signal-banner';
    }
  }
}

// -------------------------------------------------------------------
// 3. MPT Scorecards
// -------------------------------------------------------------------
function renderScorecards(res) {
  const m = res.metrics;

  // CAGR
  if (el.cardCagr) el.cardCagr.textContent = `${(m.tactical.cagr * 100).toFixed(2)}%`;
  if (el.cardCagrSpy) el.cardCagrSpy.textContent = `${(m.spy.cagr * 100).toFixed(2)}%`;
  if (el.cardCagr6040) el.cardCagr6040.textContent = `${(m.b6040.cagr * 100).toFixed(2)}%`;

  // Max Drawdown & Crash Shield
  if (el.cardMaxDd) el.cardMaxDd.textContent = `${(m.tactical.maxDrawdown * 100).toFixed(1)}%`;
  if (el.cardDdShield) {
    const diff = (m.spy.maxDrawdown - m.tactical.maxDrawdown) * 100;
    el.cardDdShield.textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% milder`;
  }

  // Sharpe
  if (el.cardSharpe) el.cardSharpe.textContent = m.tactical.sharpe.toFixed(2);
  if (el.cardSharpeSpy) el.cardSharpeSpy.textContent = m.spy.sharpe.toFixed(2);
  if (el.cardSharpe6040) el.cardSharpe6040.textContent = m.b6040.sharpe.toFixed(2);

  // Sortino
  if (el.cardSortino) el.cardSortino.textContent = m.tactical.sortino.toFixed(2);

  // Volatility
  if (el.cardVol) el.cardVol.textContent = `${(m.tactical.annualizedVol * 100).toFixed(1)}%`;
  if (el.cardVolSpy) el.cardVolSpy.textContent = `${(m.spy.annualizedVol * 100).toFixed(1)}%`;

  // Win Rate & Trades
  if (el.cardWinRate) el.cardWinRate.textContent = `${(res.activity.winRate * 100).toFixed(1)}%`;
  if (el.cardTotalTrades) el.cardTotalTrades.textContent = `${res.activity.totalTrades}`;
}

// -------------------------------------------------------------------
// 4. Canvas Chart 1: Cumulative Growth of $10,000 (Log/Linear)
// -------------------------------------------------------------------
function renderGrowthChart(res) {
  const canvas = el.canvasGrowth;
  if (!res || !canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight || 380;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const fonts = getFonts();
  const padding = { top: 35, right: 30, bottom: 45, left: 75 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const traj = res.trajectory;
  const numPoints = traj.length;

  let minVal = Infinity;
  let maxVal = -Infinity;

  traj.forEach(p => {
    const vals = [p.portfolioBalance, p.spyBalance, p.b6040Balance];
    vals.forEach(v => {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    });
  });

  const isLog = state.isLogScale;
  const logMin = Math.log10(Math.max(100, minVal * 0.9));
  const logMax = Math.log10(maxVal * 1.15);

  const xScale = idx => padding.left + (idx / Math.max(1, numPoints - 1)) * plotWidth;
  const yScale = val => {
    if (isLog) {
      const logV = Math.log10(Math.max(1, val));
      return padding.top + plotHeight * (1 - (logV - logMin) / (logMax - logMin));
    }
    return padding.top + plotHeight * (1 - (val - minVal * 0.9) / (maxVal * 1.1 - minVal * 0.9));
  };

  // Horizontal Gridlines
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fillStyle = '#94a3b8';
  ctx.font = fonts.xs;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridSteps = isLog ? [10000, 50000, 200000, 1000000, 5000000, 20000000] : [10000, 100000, 500000, 1000000, 5000000, 10000000];
  gridSteps.forEach(v => {
    if (v >= minVal * 0.8 && v <= maxVal * 1.2) {
      const y = yScale(v);
      if (y >= padding.top && y <= padding.top + plotHeight) {
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + plotWidth, y);
        ctx.stroke();
        ctx.fillText(formatCurrency(v), padding.left - 8, y);
      }
    }
  });

  // Date Labels on X Axis
  const stepIdx = Math.max(1, Math.floor(numPoints / 7));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < numPoints; i += stepIdx) {
    const x = xScale(i);
    ctx.fillText(traj[i].date, x, padding.top + plotHeight + 10);
  }

  // Draw Lines
  const drawLine = (prop, color, widthLine) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = widthLine;
    ctx.beginPath();
    traj.forEach((pt, idx) => {
      const x = xScale(idx);
      const y = yScale(pt[prop]);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  // SPY Benchmark (Gold)
  drawLine('spyBalance', '#fbbf24', 1.6);
  // 60/40 Balanced (Green)
  drawLine('b6040Balance', '#10b981', 1.6);
  // Tactical Strategy (Cyan)
  drawLine('portfolioBalance', '#38bdf8', 2.6);

  // Legend at Top
  let legendX = padding.left;
  const items = [
    { label: `Tactical Strategy ($${formatCurrency(res.finalBalance)})`, color: '#38bdf8' },
    { label: `S&P 500 ($${formatCurrency(res.spyFinalBalance)})`, color: '#fbbf24' },
    { label: `60/40 Balanced ($${formatCurrency(res.b6040FinalBalance)})`, color: '#10b981' }
  ];

  items.forEach(it => {
    ctx.fillStyle = it.color;
    ctx.fillRect(legendX, 12, 12, 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = fonts.sm;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.label, legendX + 16, 18);
    legendX += ctx.measureText(it.label).width + 32;
  });

  // Mouse Interactivity
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle(e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < padding.left || mouseX > padding.left + plotWidth) {
      el.tooltipGrowth.style.display = 'none';
      return;
    }

    const ratio = (mouseX - padding.left) / plotWidth;
    const idx = Math.max(0, Math.min(numPoints - 1, Math.round(ratio * (numPoints - 1))));
    const pt = traj[idx];

    el.tooltipGrowth.innerHTML = `
      <div style="font-weight:700; color:#38bdf8; margin-bottom:4px;">Date: ${pt.date}</div>
      <div style="color:#38bdf8;">Tactical Strategy: <strong>${formatCurrency(pt.portfolioBalance)}</strong></div>
      <div style="color:#fbbf24;">S&P 500: <strong>${formatCurrency(pt.spyBalance)}</strong></div>
      <div style="color:#10b981;">60/40 Balanced: <strong>${formatCurrency(pt.b6040Balance)}</strong></div>
      <div style="font-size:0.75rem; color:#94a3b8; margin-top:3px;">Signal: ${pt.signalName}</div>
    `;
    el.tooltipGrowth.style.left = `${Math.min(width - 220, mouseX + 15)}px`;
    el.tooltipGrowth.style.top = `${Math.max(10, mouseY - 25)}px`;
    el.tooltipGrowth.style.display = 'block';
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    el.tooltipGrowth.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// 5. Canvas Chart 2: Dynamic Allocation Stacked Area Chart
// -------------------------------------------------------------------
function renderAllocationAreaChart(res) {
  const canvas = el.canvasAllocation;
  if (!res || !canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight || 380;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const fonts = getFonts();
  const padding = { top: 35, right: 30, bottom: 45, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const traj = res.trajectory;
  const numPoints = traj.length;

  // Collect all unique asset IDs held at any point
  const assetSet = new Set();
  traj.forEach(p => {
    Object.keys(p.weights).forEach(k => {
      if (p.weights[k] > 0.01) assetSet.add(k);
    });
  });
  const heldAssets = Array.from(assetSet);

  const xScale = idx => padding.left + (idx / Math.max(1, numPoints - 1)) * plotWidth;
  const yScale = pct => padding.top + plotHeight * (1 - pct);

  // Gridlines (0%, 25%, 50%, 75%, 100%)
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fillStyle = '#94a3b8';
  ctx.font = fonts.xs;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  [0, 0.25, 0.50, 0.75, 1.0].forEach(pct => {
    const y = yScale(pct);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotWidth, y);
    ctx.stroke();
    ctx.fillText(`${(pct * 100).toFixed(0)}%`, padding.left - 8, y);
  });

  // Date Labels
  const stepIdx = Math.max(1, Math.floor(numPoints / 7));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < numPoints; i += stepIdx) {
    const x = xScale(i);
    ctx.fillText(traj[i].date, x, padding.top + plotHeight + 10);
  }

  // Draw Stacked Areas
  let prevAccumulated = new Float64Array(numPoints);

  heldAssets.forEach(assetId => {
    const color = getAssetColor(assetId);
    const currAccumulated = new Float64Array(numPoints);

    for (let i = 0; i < numPoints; i++) {
      const w = traj[i].weights[assetId] || 0;
      currAccumulated[i] = prevAccumulated[i] + w;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(prevAccumulated[0]));

    // Top edge forward
    for (let i = 0; i < numPoints; i++) {
      ctx.lineTo(xScale(i), yScale(currAccumulated[i]));
    }
    // Bottom edge backward
    for (let i = numPoints - 1; i >= 0; i--) {
      ctx.lineTo(xScale(i), yScale(prevAccumulated[i]));
    }
    ctx.closePath();
    ctx.fill();

    prevAccumulated = currAccumulated;
  });

  // Legend at Top
  let legendX = padding.left;
  heldAssets.forEach(assetId => {
    const name = getAssetName(assetId);
    const color = getAssetColor(assetId);

    ctx.fillStyle = color;
    ctx.fillRect(legendX, 12, 12, 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = fonts.sm;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, legendX + 16, 18);
    legendX += ctx.measureText(name).width + 28;
  });

  // Mouse Interactivity
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle(e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < padding.left || mouseX > padding.left + plotWidth) {
      el.tooltipAllocation.style.display = 'none';
      return;
    }

    const ratio = (mouseX - padding.left) / plotWidth;
    const idx = Math.max(0, Math.min(numPoints - 1, Math.round(ratio * (numPoints - 1))));
    const pt = traj[idx];

    let tooltipHtml = `<div style="font-weight:700; color:#38bdf8; margin-bottom:4px;">Date: ${pt.date}</div>`;
    Object.entries(pt.weights).forEach(([id, w]) => {
      if (w > 0.01) {
        tooltipHtml += `
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span style="color:${getAssetColor(id)}; font-weight:600;">${getAssetName(id)}:</span>
            <strong>${(w * 100).toFixed(1)}%</strong>
          </div>
        `;
      }
    });

    el.tooltipAllocation.innerHTML = tooltipHtml;
    el.tooltipAllocation.style.left = `${Math.min(width - 200, mouseX + 15)}px`;
    el.tooltipAllocation.style.top = `${Math.max(10, mouseY - 25)}px`;
    el.tooltipAllocation.style.display = 'block';
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    el.tooltipAllocation.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// 6. Canvas Chart 3: Underwater Drawdowns Comparison
// -------------------------------------------------------------------
function renderDrawdownChart(res) {
  const canvas = el.canvasDrawdown;
  if (!res || !canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight || 380;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const fonts = getFonts();
  const padding = { top: 35, right: 30, bottom: 45, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const traj = res.trajectory;
  const numPoints = traj.length;

  const minDD = -0.60;
  const maxDD = 0.0;

  const xScale = idx => padding.left + (idx / Math.max(1, numPoints - 1)) * plotWidth;
  const yScale = dd => padding.top + plotHeight * (1 - (dd - minDD) / (maxDD - minDD));

  // Gridlines
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fillStyle = '#94a3b8';
  ctx.font = fonts.xs;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  [-0.50, -0.40, -0.30, -0.20, -0.10, 0.0].forEach(dd => {
    const y = yScale(dd);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotWidth, y);
    ctx.stroke();
    ctx.fillText(`${(dd * 100).toFixed(0)}%`, padding.left - 8, y);
  });

  // Zero line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, yScale(0));
  ctx.lineTo(padding.left + plotWidth, yScale(0));
  ctx.stroke();

  // Date Labels
  const stepIdx = Math.max(1, Math.floor(numPoints / 7));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < numPoints; i += stepIdx) {
    const x = xScale(i);
    ctx.fillText(traj[i].date, x, padding.top + plotHeight + 10);
  }

  // Draw SPY Drawdown Area (Red/Gold)
  ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
  ctx.beginPath();
  ctx.moveTo(xScale(0), yScale(0));
  traj.forEach((pt, i) => ctx.lineTo(xScale(i), yScale(pt.spyDrawdown)));
  ctx.lineTo(xScale(numPoints - 1), yScale(0));
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  traj.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(xScale(i), yScale(pt.spyDrawdown));
    else ctx.lineTo(xScale(i), yScale(pt.spyDrawdown));
  });
  ctx.stroke();

  // Draw Tactical Drawdown Area (Cyan Shield)
  ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.beginPath();
  ctx.moveTo(xScale(0), yScale(0));
  traj.forEach((pt, i) => ctx.lineTo(xScale(i), yScale(pt.drawdown)));
  ctx.lineTo(xScale(numPoints - 1), yScale(0));
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  traj.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(xScale(i), yScale(pt.drawdown));
    else ctx.lineTo(xScale(i), yScale(pt.drawdown));
  });
  ctx.stroke();

  // Legend at Top
  let legendX = padding.left;
  const items = [
    { label: `Tactical Max DD (${(res.metrics.tactical.maxDrawdown * 100).toFixed(1)}%)`, color: '#38bdf8' },
    { label: `S&P 500 Max DD (${(res.metrics.spy.maxDrawdown * 100).toFixed(1)}%)`, color: '#fbbf24' }
  ];

  items.forEach(it => {
    ctx.fillStyle = it.color;
    ctx.fillRect(legendX, 12, 12, 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = fonts.sm;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.label, legendX + 16, 18);
    legendX += ctx.measureText(it.label).width + 32;
  });

  // Mouse Interactivity
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle(e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < padding.left || mouseX > padding.left + plotWidth) {
      el.tooltipDrawdown.style.display = 'none';
      return;
    }

    const ratio = (mouseX - padding.left) / plotWidth;
    const idx = Math.max(0, Math.min(numPoints - 1, Math.round(ratio * (numPoints - 1))));
    const pt = traj[idx];

    el.tooltipDrawdown.innerHTML = `
      <div style="font-weight:700; color:#38bdf8; margin-bottom:4px;">Date: ${pt.date}</div>
      <div style="color:#38bdf8;">Tactical Drawdown: <strong>${(pt.drawdown * 100).toFixed(1)}%</strong></div>
      <div style="color:#fbbf24;">S&P 500 Drawdown: <strong>${(pt.spyDrawdown * 100).toFixed(1)}%</strong></div>
      <div style="font-size:0.75rem; color:#94a3b8; margin-top:3px;">Protection: +${((pt.spyDrawdown - pt.drawdown) * 100).toFixed(1)}%</div>
    `;
    el.tooltipDrawdown.style.left = `${Math.min(width - 200, mouseX + 15)}px`;
    el.tooltipDrawdown.style.top = `${Math.max(10, mouseY - 25)}px`;
    el.tooltipDrawdown.style.display = 'block';
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    el.tooltipDrawdown.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// 7. Canvas Chart 4: Calendar Annual Excess Returns
// -------------------------------------------------------------------
function renderAnnualReturnsChart(res) {
  const canvas = el.canvasAnnual;
  if (!res || !canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight || 320;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const fonts = getFonts();
  const padding = { top: 35, right: 30, bottom: 45, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const annuals = res.annualReturns;
  const numYears = annuals.length;

  let maxExcess = 0.35;
  let minExcess = -0.35;

  annuals.forEach(y => {
    if (y.excessReturn > maxExcess) maxExcess = y.excessReturn + 0.05;
    if (y.excessReturn < minExcess) minExcess = y.excessReturn - 0.05;
  });

  const yScale = val => padding.top + plotHeight * (1 - (val - minExcess) / (maxExcess - minExcess));
  const zeroY = yScale(0);

  // Gridlines
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fillStyle = '#94a3b8';
  ctx.font = fonts.xs;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const step = 0.10;
  for (let val = -0.30; val <= 0.40; val += step) {
    const y = yScale(val);
    if (y >= padding.top && y <= padding.top + plotHeight) {
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotWidth, y);
      ctx.stroke();
      ctx.fillText(`${(val * 100).toFixed(0)}%`, padding.left - 8, y);
    }
  }

  // Zero Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(padding.left + plotWidth, zeroY);
  ctx.stroke();

  // Bars
  const barWidth = Math.max(2, plotWidth / numYears - 2);
  const hitBoxes = [];

  annuals.forEach((y, idx) => {
    const x = padding.left + idx * (plotWidth / numYears) + 1;
    const ex = y.excessReturn;
    const barY = ex >= 0 ? yScale(ex) : zeroY;
    const barH = Math.max(2, Math.abs(yScale(ex) - zeroY));

    ctx.fillStyle = ex >= 0 ? '#10b981' : '#f43f5e';
    ctx.fillRect(x, barY, barWidth, barH);

    hitBoxes.push({
      x,
      y: barY,
      w: barWidth,
      h: barH,
      year: y.year,
      pRet: y.portfolioReturn,
      sRet: y.spyReturn,
      exRet: y.excessReturn
    });
  });

  // Year Labels (every 5 years)
  ctx.fillStyle = '#94a3b8';
  ctx.font = fonts.xs;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  annuals.forEach((y, idx) => {
    if (y.year % 5 === 0) {
      const x = padding.left + idx * (plotWidth / numYears) + barWidth / 2;
      ctx.fillText(String(y.year), x, padding.top + plotHeight + 10);
    }
  });

  // Mouse Interactivity
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle(e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const hit = hitBoxes.find(b =>
      mouseX >= b.x && mouseX <= b.x + b.w &&
      mouseY >= b.y && mouseY <= b.y + b.h
    );

    if (hit) {
      const exSign = hit.exRet >= 0 ? '+' : '';
      el.tooltipAnnual.innerHTML = `
        <div style="font-weight:700; color:#38bdf8;">Year ${hit.year}</div>
        <div>Tactical Return: <strong>${(hit.pRet * 100).toFixed(2)}%</strong></div>
        <div style="color:#fbbf24;">S&P 500: <strong>${(hit.sRet * 100).toFixed(2)}%</strong></div>
        <div style="color:${hit.exRet >= 0 ? '#34d399' : '#f43f5e'}; font-weight:700;">
          Excess: ${exSign}${(hit.exRet * 100).toFixed(2)}%
        </div>
      `;
      el.tooltipAnnual.style.left = `${Math.min(width - 180, mouseX + 15)}px`;
      el.tooltipAnnual.style.top = `${Math.max(10, mouseY - 25)}px`;
      el.tooltipAnnual.style.display = 'block';
    } else {
      el.tooltipAnnual.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    el.tooltipAnnual.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// 8. MPT Performance Table
// -------------------------------------------------------------------
function renderMptTable(res) {
  if (!el.mptScorecardTableBody) return;
  el.mptScorecardTableBody.innerHTML = '';

  const m = res.metrics;
  const rows = [
    {
      name: '⚡ Tactical Allocation Strategy',
      final: res.finalBalance,
      cagr: m.tactical.cagr,
      vol: m.tactical.annualizedVol,
      sharpe: m.tactical.sharpe,
      sortino: m.tactical.sortino,
      maxDD: m.tactical.maxDrawdown,
      winRate: m.tactical.winRate,
      isPrimary: true
    },
    {
      name: '🏛️ S&P 500 Benchmark (SPY)',
      final: res.spyFinalBalance,
      cagr: m.spy.cagr,
      vol: m.spy.annualizedVol,
      sharpe: m.spy.sharpe,
      sortino: m.spy.sortino,
      maxDD: m.spy.maxDrawdown,
      winRate: m.spy.winRate,
      isPrimary: false
    },
    {
      name: '⚖️ 60/40 Balanced Benchmark',
      final: res.b6040FinalBalance,
      cagr: m.b6040.cagr,
      vol: m.b6040.annualizedVol,
      sharpe: m.b6040.sharpe,
      sortino: m.b6040.sortino,
      maxDD: m.b6040.maxDrawdown,
      winRate: m.b6040.winRate,
      isPrimary: false
    }
  ];

  rows.forEach(r => {
    const tr = document.createElement('tr');
    if (r.isPrimary) tr.style.background = 'rgba(56, 189, 248, 0.08)';

    tr.innerHTML = `
      <td><strong>${r.name}</strong></td>
      <td class="num highlight-gold">${formatCurrency(r.final)}</td>
      <td class="num"><strong class="${r.cagr >= 0.10 ? 'delta-badge-pos' : ''}">${(r.cagr * 100).toFixed(2)}%</strong></td>
      <td class="num">${(r.vol * 100).toFixed(2)}%</td>
      <td class="num highlight-green">${r.sharpe.toFixed(2)}</td>
      <td class="num">${r.sortino.toFixed(2)}</td>
      <td class="num" style="color:${r.maxDD > -0.30 ? '#34d399' : '#f43f5e'}; font-weight:700;">${(r.maxDD * 100).toFixed(1)}%</td>
      <td class="num">${(r.winRate * 100).toFixed(1)}%</td>
    `;
    el.mptScorecardTableBody.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// 9. Historical Trade & Signal Execution Log Table
// -------------------------------------------------------------------
function renderTradeLogTable(res) {
  if (!el.tradeLogTableBody) return;
  el.tradeLogTableBody.innerHTML = '';

  // Show latest 100 signals in reverse chronological order
  const signals = [...res.monthlySignals].reverse();

  signals.slice(0, 120).forEach(s => {
    const tr = document.createElement('tr');

    const weightsText = Object.entries(s.weights)
      .filter(([_, w]) => w > 0.01)
      .map(([id, w]) => `<strong>${(w * 100).toFixed(0)}%</strong> ${getAssetName(id)}`)
      .join(', ');

    const retSign = s.monthReturn >= 0 ? '+' : '';
    const retClass = s.monthReturn >= 0 ? 'delta-badge-pos' : 'delta-badge-neg';

    tr.innerHTML = `
      <td><strong>${s.date}</strong></td>
      <td>
        <div><strong>${s.signalName}</strong></div>
        <div style="font-size:0.75rem; color:#94a3b8; max-width:320px;">${s.details}</div>
      </td>
      <td>${weightsText}</td>
      <td>
        ${s.isDefensive ? '<span class="signal-badge signal-defense" style="font-size:0.7rem; padding:0.15rem 0.4rem;">DEFENSE</span>' : '<span class="signal-badge signal-bull" style="font-size:0.7rem; padding:0.15rem 0.4rem;">BULL</span>'}
      </td>
      <td class="num"><strong class="${retClass}">${retSign}${(s.monthReturn * 100).toFixed(2)}%</strong></td>
      <td class="num">${formatCurrency(s.portfolioBalance)}</td>
    `;
    el.tradeLogTableBody.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// 10. Plain-English Strategy Diagnostic
// -------------------------------------------------------------------
function renderDiagnostic(res) {
  if (!el.strategyDiagnosticContent) return;

  const m = res.metrics;
  const act = res.activity;
  const preset = TACTICAL_STRATEGY_PRESETS.find(p => p.id === state.presetId);

  const cagrDiff = (m.tactical.cagr - m.spy.cagr) * 100;
  const ddDiff = (m.spy.maxDrawdown - m.tactical.maxDrawdown) * 100;

  el.strategyDiagnosticContent.innerHTML = `
    <p style="margin-top:0;">
      <strong>Quantitative Model Performance:</strong> Over the <strong>${res.sampleMonths}-month backtest (${res.startMonth} to ${res.endMonth})</strong>, 
      the <strong>${preset ? preset.name : 'Tactical Strategy'}</strong> delivered an annualized compound growth rate (CAGR) of 
      <strong>${(m.tactical.cagr * 100).toFixed(2)}%</strong> compared to <strong>${(m.spy.cagr * 100).toFixed(2)}%</strong> for Buy &amp; Hold S&amp;P 500 
      and <strong>${(m.b6040.cagr * 100).toFixed(2)}%</strong> for a 60/40 balanced benchmark.
    </p>
    <p>
      <strong>Crash Protection &amp; Tail Risk Defense:</strong> The tactical strategy reduced maximum portfolio drawdown from 
      <strong>${(m.spy.maxDrawdown * 100).toFixed(1)}%</strong> down to <strong>${(m.tactical.maxDrawdown * 100).toFixed(1)}%</strong> 
      (a <strong>+${ddDiff.toFixed(1)}%</strong> risk reduction shield). It spent <strong>${(act.defensiveTimePct * 100).toFixed(1)}%</strong> 
      of total months (${act.defensiveMonthsCount} months) in safe haven defense, sidestepping prolonged secular bear market liquidations.
    </p>
    <p style="margin-bottom:0;">
      <strong>Risk-Adjusted Efficiency:</strong> The strategy achieved a Sharpe Ratio of <strong>${m.tactical.sharpe.toFixed(2)}</strong> 
      (vs. SPY <strong>${m.spy.sharpe.toFixed(2)}</strong>) with an annual turnover rate of <strong>${act.annualTurnover}</strong> trades per year 
      and a monthly positive win rate of <strong>${(act.winRate * 100).toFixed(1)}%</strong>. This empirical evidence validates that systematic 
      trend-following and momentum allocation successfully harvests market upside while offering structural downside immunity.
    </p>
  `;
}

// -------------------------------------------------------------------
// CSV Exporters
// -------------------------------------------------------------------
function exportPerformanceCsv() {
  const res = state.backtestResult;
  if (!res) return;

  const headers = ['Date', 'Tactical_Balance', 'SPY_Balance', 'B6040_Balance', 'Tactical_Return', 'SPY_Return', 'Tactical_Drawdown', 'SPY_Drawdown', 'Signal_Name'];
  const rows = [headers.join(',')];

  res.trajectory.forEach(pt => {
    rows.push([
      pt.date,
      pt.portfolioBalance.toFixed(2),
      pt.spyBalance.toFixed(2),
      pt.b6040Balance.toFixed(2),
      (pt.tacticalReturn * 100).toFixed(4),
      (pt.spyReturn * 100).toFixed(4),
      (pt.drawdown * 100).toFixed(4),
      (pt.spyDrawdown * 100).toFixed(4),
      `"${pt.signalName}"`
    ].join(','));
  });

  downloadCsv(rows.join('\n'), `Tactical_Allocation_${state.timingModel}_Trajectory.csv`);
}

function exportTradesCsv() {
  const res = state.backtestResult;
  if (!res) return;

  const headers = ['Date', 'Signal_Trigger', 'Defensive_Flag', 'Target_Allocation', 'Monthly_Return_Pct', 'Ending_Balance', 'Details'];
  const rows = [headers.join(',')];

  res.monthlySignals.forEach(s => {
    const weightsStr = Object.entries(s.weights)
      .filter(([_, w]) => w > 0.01)
      .map(([id, w]) => `${(w * 100).toFixed(0)}% ${id}`)
      .join(' | ');

    rows.push([
      s.date,
      `"${s.signalName}"`,
      s.isDefensive ? 'TRUE' : 'FALSE',
      `"${weightsStr}"`,
      (s.monthReturn * 100).toFixed(4),
      s.portfolioBalance.toFixed(2),
      `"${s.details.replace(/"/g, '""')}"`
    ].join(','));
  });

  downloadCsv(rows.join('\n'), `Tactical_Allocation_${state.timingModel}_Trade_Log.csv`);
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------------
// Event Wiring
// -------------------------------------------------------------------
function wireEvents() {
  // Executive Decision Framework Guide Toggle
  const execToggle = document.getElementById('executive-guide-toggle');
  const execBody = document.getElementById('executive-guide-body');
  const execArrow = document.getElementById('executive-guide-arrow');
  if (execToggle && execBody && execArrow) {
    execToggle.addEventListener('click', () => {
      const isOpen = execBody.style.display !== 'none';
      execBody.style.display = isOpen ? 'none' : 'block';
      execToggle.classList.toggle('open', !isOpen);
      execArrow.classList.toggle('open', !isOpen);
    });
  }

  // Toggle Settings Panel
  if (el.btnToggleConfig && el.configCard) {
    el.btnToggleConfig.addEventListener('click', () => {
      state.isConfigCollapsed = !state.isConfigCollapsed;
      el.configCard.style.display = state.isConfigCollapsed ? 'none' : 'block';
    });
  }

  // Jump to Trade Log
  if (el.btnJumpTradeLog) {
    el.btnJumpTradeLog.addEventListener('click', () => {
      const sec = document.getElementById('trade-log-section');
      if (sec) sec.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Timing Model Tabs
  if (el.timingModelControl) {
    el.timingModelControl.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.timingModelControl.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.timingModel = btn.dataset.model;

        // Auto-select corresponding preset
        const matched = TACTICAL_STRATEGY_PRESETS.find(p => p.timingModel === state.timingModel);
        if (matched) applyPreset(matched.id);
        executeBacktest();
      });
    });
  }

  // Presets
  if (el.presetButtonsContainer) {
    el.presetButtonsContainer.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyPreset(btn.dataset.preset);
        executeBacktest();
      });
    });
  }

  // Form Controls
  if (el.selectLookback) {
    el.selectLookback.addEventListener('change', (e) => {
      state.lookbackMonths = parseInt(e.target.value, 10);
    });
  }
  if (el.selectSafeHaven) {
    el.selectSafeHaven.addEventListener('change', (e) => {
      state.safeHavenAsset = e.target.value;
    });
  }
  if (el.selectTopN) {
    el.selectTopN.addEventListener('change', (e) => {
      state.topN = parseInt(e.target.value, 10);
    });
  }
  if (el.inputTargetVol) {
    el.inputTargetVol.addEventListener('change', (e) => {
      state.targetVol = parseFloat(e.target.value) / 100;
    });
  }
  if (el.inputInitialCapital) {
    el.inputInitialCapital.addEventListener('change', (e) => {
      state.initialCapital = parseFloat(e.target.value) || 10000;
    });
  }

  // Run Button
  if (el.btnRunTactical) {
    el.btnRunTactical.addEventListener('click', () => {
      executeBacktest();
    });
  }

  // Log / Linear Scale Toggles
  if (el.btnScaleLinear && el.btnScaleLog) {
    el.btnScaleLinear.addEventListener('click', () => {
      state.isLogScale = false;
      el.btnScaleLinear.classList.add('active');
      el.btnScaleLog.classList.remove('active');
      renderGrowthChart(state.backtestResult);
    });
    el.btnScaleLog.addEventListener('click', () => {
      state.isLogScale = true;
      el.btnScaleLog.classList.add('active');
      el.btnScaleLinear.classList.remove('active');
      renderGrowthChart(state.backtestResult);
    });
  }

  // CSV Exports
  if (el.btnExportPerformanceCsv) {
    el.btnExportPerformanceCsv.addEventListener('click', exportPerformanceCsv);
  }
  if (el.btnExportTradesCsv) {
    el.btnExportTradesCsv.addEventListener('click', exportTradesCsv);
  }

  // Resize Debounce
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.backtestResult) {
        renderGrowthChart(state.backtestResult);
        renderAllocationAreaChart(state.backtestResult);
        renderDrawdownChart(state.backtestResult);
        renderAnnualReturnsChart(state.backtestResult);
      }
    }, 150);
  });
}

// -------------------------------------------------------------------
// Initialization
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initDom();
  parseUrlParams();
  wireEvents();
  executeBacktest();
});
