/**
 * Factor Analysis Studio UI Controller
 * Fama-French & Carhart Multi-Factor Regression Studio
 * 
 * Features:
 * - Dynamic econometric regression across CAPM, FF3, Carhart4, FF5, and FF6 models
 * - Multi-asset portfolio/basket comparison (e.g. IJS, IWN, RZV, VBR)
 * - 36-month walk-forward rolling factor loadings time series to detect style drift
 * - High-DPI canvas charts with AbortController, rafThrottle, and window.CHART_FONTS
 * - Performance return attribution and factor premia decomposition
 * - Factor statistics and pairwise correlation heatmap matrix
 * - CSV exports for econometric tables and time series
 */

import {
  FACTOR_DEFINITIONS,
  FACTOR_MODELS,
  PRELOADED_FACTOR_FUNDS,
  FAMA_FRENCH_FACTORS
} from './factor-data.js';

import {
  alignFundWithFactors,
  runMultivariateRegression,
  runRollingFactorRegression,
  computeFactorAttribution,
  computeFactorStatistics
} from './factor-engine.js';

import { openAssetModal } from '../js/asset-modal.js';
import { getAllFundsSync, initSessionFunds, subscribeSessionFunds } from '../js/session-funds.js';
import { rafThrottle, formatCurrency } from '../js/chart-utils.js';

// -------------------------------------------------------------------
// State Definition
// -------------------------------------------------------------------
const state = {
  modelId: 'ff5',
  rollingMonths: 36,
  activeTickers: ['IJS', 'IWN', 'RZV', 'VBR'],
  focusTicker: 'IJS',
  activeFactorFilter: 'all', // 'all' or specific factor key ('mkt_rf', 'smb', etc.)
  analysisResults: null,
  isConfigCollapsed: false
};

// DOM Elements Cache
const el = {};

function initDom() {
  el.statusModelName = document.getElementById('status-model-name');
  el.statusAssetsCount = document.getElementById('status-assets-count');
  el.statusFocusAsset = document.getElementById('status-focus-asset');
  el.statusRollingWindow = document.getElementById('status-rolling-window');
  el.statusTimeline = document.getElementById('status-timeline');
  el.statusSampleMonths = document.getElementById('status-sample-months');

  el.btnToggleConfig = document.getElementById('btn-toggle-config-panel');
  el.configCard = document.getElementById('config-card');
  el.btnConfigIcon = document.getElementById('btn-config-icon');
  el.btnConfigText = document.getElementById('btn-config-text');

  el.modelSelectorControl = document.getElementById('model-selector-control');
  el.rollingWindowControl = document.getElementById('rolling-window-control');

  el.presetScv = document.getElementById('preset-scv');
  el.presetCore = document.getElementById('preset-core');
  el.presetExtremes = document.getElementById('preset-extremes');

  el.assetChipList = document.getElementById('asset-chip-list');
  el.btnAddAsset = document.getElementById('btn-add-asset');

  // Scorecards
  el.cardRSquared = document.getElementById('card-r-squared');
  el.cardAdjRSquared = document.getElementById('card-adj-r-squared');
  el.cardAlpha = document.getElementById('card-alpha');
  el.cardAlphaSub = document.getElementById('card-alpha-sub');
  el.cardBetaMkt = document.getElementById('card-beta-mkt');
  el.cardBetaMktSub = document.getElementById('card-beta-mkt-sub');
  el.cardBetaSmb = document.getElementById('card-beta-smb');
  el.cardBetaSmbSub = document.getElementById('card-beta-smb-sub');
  el.cardBetaHml = document.getElementById('card-beta-hml');
  el.cardBetaHmlSub = document.getElementById('card-beta-hml-sub');

  // Tables
  el.summaryTableHeaderRow = document.getElementById('summary-table-header-row');
  el.regressionSummaryTableBody = document.getElementById('regression-summary-table-body');
  el.detailAssetName = document.getElementById('detail-asset-name');
  el.selectFocusAsset = document.getElementById('select-focus-asset');
  el.parameterDetailTableBody = document.getElementById('parameter-detail-table-body');

  // Canvases
  el.canvasFactorExposure = document.getElementById('factor-exposure-canvas');
  el.containerFactorExposure = document.getElementById('container-factor-exposure');
  el.tooltipFactorExposure = document.getElementById('tooltip-factor-exposure');

  el.canvasRollingLoadings = document.getElementById('rolling-loadings-canvas');
  el.containerRollingLoadings = document.getElementById('container-rolling-loadings');
  el.tooltipRollingLoadings = document.getElementById('tooltip-rolling-loadings');
  el.labelRollingWindow = document.getElementById('label-rolling-window');
  el.rollingFactorFilters = document.getElementById('rolling-factor-filters');

  el.canvasAttribution = document.getElementById('attribution-canvas');
  el.containerAttribution = document.getElementById('container-attribution');
  el.tooltipAttribution = document.getElementById('tooltip-attribution');

  el.factorStatsTableBody = document.getElementById('factor-stats-table-body');
  el.factorCorrelationTable = document.getElementById('factor-correlation-table');
  el.diagnosticsContent = document.getElementById('diagnostics-content');

  el.btnExportSummaryCsv = document.getElementById('btn-export-summary-csv');
  el.btnExportRollingCsv = document.getElementById('btn-export-rolling-csv');
}

// -------------------------------------------------------------------
// Helper: Safe Font Accessor
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
// Colors for Assets
// -------------------------------------------------------------------
const ASSET_COLORS = [
  '#38bdf8', '#34d399', '#fbbf24', '#f43f5e',
  '#a855f7', '#06b6d4', '#ec4899', '#10b981',
  '#6366f1', '#f97316'
];

// -------------------------------------------------------------------
// Parse URL Parameters (Portfolio Visualizer compatibility)
// -------------------------------------------------------------------
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);

  // Symbols (e.g. symbols=IJS+IWN+RZV+VBR or tickers=VOO,QQQ)
  const symParam = params.get('symbols') || params.get('tickers');
  if (symParam) {
    const rawList = symParam.replace(/\+/g, ' ').split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    if (rawList.length > 0) {
      state.activeTickers = Array.from(new Set(rawList));
      state.focusTicker = state.activeTickers[0];
    }
  }

  // Rolling Period (rollPeriod=36)
  const rollParam = parseInt(params.get('rollPeriod') || params.get('rolling'), 10);
  if ([24, 36, 48, 60].includes(rollParam)) {
    state.rollingMonths = rollParam;
  }

  // Factor Model
  // PV: 0=CAPM, 1=FF3, 2=Carhart4, 3=FF5, 4=FF5/FF6
  const modelParam = params.get('factorModel') || params.get('model');
  if (modelParam) {
    if (modelParam === '0' || modelParam.toLowerCase() === 'capm') state.modelId = 'capm';
    else if (modelParam === '1' || modelParam.toLowerCase() === 'ff3') state.modelId = 'ff3';
    else if (modelParam === '2' || modelParam.toLowerCase() === 'carhart4' || modelParam.toLowerCase() === 'carhart') state.modelId = 'carhart4';
    else if (modelParam === '3' || modelParam.toLowerCase() === 'ff5') state.modelId = 'ff5';
    else if (modelParam === '4' || modelParam.toLowerCase() === 'ff6') state.modelId = 'ff5';
  }
}

// -------------------------------------------------------------------
// Resolve Fund Object & Monthly Returns
// -------------------------------------------------------------------
function resolveFund(ticker) {
  const sym = ticker.toUpperCase();

  // 1. Check preloaded benchmark funds
  const preloaded = PRELOADED_FACTOR_FUNDS.find(f => f.ticker === sym);
  if (preloaded) {
    return {
      ticker: preloaded.ticker,
      name: preloaded.name,
      category: preloaded.category || 'Equity ETF',
      color: preloaded.color || '#38bdf8',
      returns: preloaded.data.map(d => ({ date: d.date, ret: d.ret }))
    };
  }

  // 2. Check session funds / presets
  const sessionFunds = getAllFundsSync();
  const sFund = sessionFunds.find(f => f.ticker.toUpperCase() === sym);
  if (sFund && sFund.data && sFund.data.length >= 2) {
    const rets = [];
    for (let i = 1; i < sFund.data.length; i++) {
      const prev = sFund.data[i - 1].adjClose ?? sFund.data[i - 1].close;
      const curr = sFund.data[i].adjClose ?? sFund.data[i].close;
      if (prev > 0) {
        rets.push({
          date: sFund.data[i].date,
          ret: (curr - prev) / prev
        });
      }
    }
    return {
      ticker: sFund.ticker,
      name: sFund.name || sFund.ticker,
      category: sFund.category || 'Asset',
      color: sFund.color || '#38bdf8',
      returns: rets
    };
  }

  return null;
}

// -------------------------------------------------------------------
// Run Factor Analysis Engine for All Active Assets
// -------------------------------------------------------------------
function runAnalysis() {
  const model = FACTOR_MODELS.find(m => m.id === state.modelId) || FACTOR_MODELS[3]; // default FF5
  const factorKeys = model.factors;

  // Resolve fund returns
  const loadedFunds = [];
  state.activeTickers.forEach((ticker, idx) => {
    const fund = resolveFund(ticker);
    if (fund && fund.returns.length >= 12) {
      fund.color = ASSET_COLORS[idx % ASSET_COLORS.length];
      loadedFunds.push(fund);
    }
  });

  if (loadedFunds.length === 0) {
    state.analysisResults = null;
    return;
  }

  // Ensure focus ticker is valid
  if (!loadedFunds.some(f => f.ticker === state.focusTicker)) {
    state.focusTicker = loadedFunds[0].ticker;
  }

  // 1. Align each fund with Fama-French empirical factors
  const alignedByFund = new Map();
  loadedFunds.forEach(fund => {
    const aligned = alignFundWithFactors(fund.returns, FAMA_FRENCH_FACTORS);
    alignedByFund.set(fund.ticker, aligned);
  });

  // 2. Find shared/common time period across all funds
  let commonStart = '1970-01';
  let commonEnd = '2099-12';

  loadedFunds.forEach(fund => {
    const aligned = alignedByFund.get(fund.ticker);
    if (aligned && aligned.length > 0) {
      const start = aligned[0].date;
      const end = aligned[aligned.length - 1].date;
      if (start > commonStart) commonStart = start;
      if (end < commonEnd) commonEnd = end;
    }
  });

  // 3. Slice each fund to the common shared period
  const fundResults = [];
  loadedFunds.forEach(fund => {
    const fullAligned = alignedByFund.get(fund.ticker);
    const commonAligned = fullAligned.filter(pt => pt.date >= commonStart && pt.date <= commonEnd);

    if (commonAligned.length > factorKeys.length + 2) {
      const reg = runMultivariateRegression(commonAligned, factorKeys);
      const rolling = runRollingFactorRegression(fullAligned, factorKeys, state.rollingMonths);
      const attribution = computeFactorAttribution(commonAligned, reg, factorKeys);

      fundResults.push({
        fund,
        alignedCount: commonAligned.length,
        regression: reg,
        rolling,
        attribution
      });
    }
  });

  // 4. Compute Factor Risk & Statistics Matrix
  const factorStats = computeFactorStatistics(FAMA_FRENCH_FACTORS, factorKeys, commonStart, commonEnd);

  state.analysisResults = {
    model,
    commonStart,
    commonEnd,
    commonMonths: fundResults.length > 0 ? fundResults[0].alignedCount : 0,
    funds: fundResults,
    factorStats
  };
}

// -------------------------------------------------------------------
// Render UI Components
// -------------------------------------------------------------------
export function renderUI() {
  if (!state.analysisResults || state.analysisResults.funds.length === 0) {
    renderEmptyState();
    return;
  }

  renderStatusBar();
  renderScorecards();
  renderSummaryTable();
  renderDetailTable();
  renderFactorExposureChart();
  renderRollingLoadingsChart();
  renderAttributionChart();
  renderFactorStats();
  renderDiagnostics();
  renderAssetChips();
}

// -------------------------------------------------------------------
// 1. Status Bar
// -------------------------------------------------------------------
function renderStatusBar() {
  const res = state.analysisResults;
  if (!res) return;

  if (el.statusModelName) el.statusModelName.textContent = res.model.name;
  if (el.statusAssetsCount) el.statusAssetsCount.textContent = `${res.funds.length} Assets`;
  if (el.statusFocusAsset) el.statusFocusAsset.textContent = state.focusTicker;
  if (el.statusRollingWindow) el.statusRollingWindow.textContent = `${state.rollingMonths} Months`;
  if (el.statusTimeline) el.statusTimeline.textContent = `${res.commonStart} to ${res.commonEnd}`;
  if (el.statusSampleMonths) el.statusSampleMonths.textContent = `(${res.commonMonths} M)`;
}

// -------------------------------------------------------------------
// 2. Scorecards for Focus Asset
// -------------------------------------------------------------------
function renderScorecards() {
  const res = state.analysisResults;
  if (!res) return;

  const focusData = res.funds.find(f => f.fund.ticker === state.focusTicker) || res.funds[0];
  if (!focusData) return;

  const reg = focusData.regression;

  // Goodness of Fit R²
  if (el.cardRSquared) el.cardRSquared.textContent = `${(reg.rSquared * 100).toFixed(1)}%`;
  if (el.cardAdjRSquared) el.cardAdjRSquared.textContent = `${(reg.adjRSquared * 100).toFixed(1)}%`;

  // Annualized Alpha
  if (el.cardAlpha) {
    const a = reg.alpha.annualized * 100;
    el.cardAlpha.textContent = `${a >= 0 ? '+' : ''}${a.toFixed(2)}%${reg.alpha.stars}`;
    el.cardAlpha.className = `scorecard-metric-value ${a >= 0 ? 'highlight-gold' : 'delta-badge-neg'}`;
  }
  if (el.cardAlphaSub) {
    el.cardAlphaSub.textContent = `t = ${reg.alpha.tStat.toFixed(2)} (p = ${reg.alpha.pVal.toFixed(3)})`;
  }

  // Market Beta
  const mkt = reg.loadings.find(l => l.key === 'mkt_rf');
  if (el.cardBetaMkt && mkt) {
    el.cardBetaMkt.textContent = `${mkt.beta.toFixed(3)}${mkt.stars}`;
    if (el.cardBetaMktSub) el.cardBetaMktSub.textContent = `t = ${mkt.tStat.toFixed(2)} (${mkt.beta > 1 ? 'High Beta' : 'Low Beta'})`;
  }

  // Size SMB
  const smb = reg.loadings.find(l => l.key === 'smb');
  if (el.cardBetaSmb) {
    if (smb) {
      el.cardBetaSmb.textContent = `${smb.beta >= 0 ? '+' : ''}${smb.beta.toFixed(3)}${smb.stars}`;
      if (el.cardBetaSmbSub) {
        el.cardBetaSmbSub.textContent = smb.beta > 0.2 ? 'Small-Cap Tilt' : smb.beta < -0.2 ? 'Large-Cap Tilt' : 'Neutral Size';
      }
    } else {
      el.cardBetaSmb.textContent = 'N/A';
      if (el.cardBetaSmbSub) el.cardBetaSmbSub.textContent = 'Not in active model';
    }
  }

  // Value HML
  const hml = reg.loadings.find(l => l.key === 'hml');
  if (el.cardBetaHml) {
    if (hml) {
      el.cardBetaHml.textContent = `${hml.beta >= 0 ? '+' : ''}${hml.beta.toFixed(3)}${hml.stars}`;
      if (el.cardBetaHmlSub) {
        el.cardBetaHmlSub.textContent = hml.beta > 0.2 ? 'Value Tilt' : hml.beta < -0.2 ? 'Growth Tilt' : 'Blend Tilt';
      }
    } else {
      el.cardBetaHml.textContent = 'N/A';
      if (el.cardBetaHmlSub) el.cardBetaHmlSub.textContent = 'Not in active model';
    }
  }
}

// -------------------------------------------------------------------
// 3. Multi-Asset Regression Summary Table
// -------------------------------------------------------------------
function renderSummaryTable() {
  const res = state.analysisResults;
  if (!res || !el.summaryTableHeaderRow || !el.regressionSummaryTableBody) return;

  const model = res.model;

  // Render header dynamically
  let headerHtml = `
    <th>Asset</th>
    <th class="num">Alpha (α Ann.)</th>
  `;
  model.factors.forEach(k => {
    const def = FACTOR_DEFINITIONS[k];
    headerHtml += `<th class="num" title="${def.name}">${def.symbol} (β)</th>`;
  });
  headerHtml += `
    <th class="num">R²</th>
    <th class="num">Adj R²</th>
    <th class="num">Residual Vol</th>
    <th class="num">Months</th>
  `;
  el.summaryTableHeaderRow.innerHTML = headerHtml;

  // Render body rows
  el.regressionSummaryTableBody.innerHTML = '';
  res.funds.forEach(fData => {
    const f = fData.fund;
    const reg = fData.regression;
    const isFocus = f.ticker === state.focusTicker;

    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    if (isFocus) tr.style.background = 'rgba(56, 189, 248, 0.08)';

    const alphaPct = (reg.alpha.annualized * 100).toFixed(2);
    const alphaSign = reg.alpha.annualized >= 0 ? '+' : '';
    const alphaClass = reg.alpha.annualized >= 0 ? 'highlight-gold' : 'delta-badge-neg';

    let rowHtml = `
      <td>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span class="asset-chip-color-dot" style="background:${f.color};"></span>
          <strong>${f.ticker}</strong>
          <span style="font-size:0.75rem; color:#94a3b8; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</span>
        </div>
      </td>
      <td class="num"><strong class="${alphaClass}">${alphaSign}${alphaPct}%</strong><span class="stars-sig">${reg.alpha.stars}</span></td>
    `;

    model.factors.forEach(k => {
      const loading = reg.loadings.find(l => l.key === k);
      if (loading) {
        rowHtml += `<td class="num"><strong>${loading.beta.toFixed(3)}</strong><span class="stars-sig">${loading.stars}</span></td>`;
      } else {
        rowHtml += `<td class="num" style="color:#64748b;">--</td>`;
      }
    });

    rowHtml += `
      <td class="num highlight-green">${(reg.rSquared * 100).toFixed(1)}%</td>
      <td class="num">${(reg.adjRSquared * 100).toFixed(1)}%</td>
      <td class="num">${(reg.annualizedResidualStdErr * 100).toFixed(2)}%</td>
      <td class="num">${fData.alignedCount}</td>
    `;

    tr.innerHTML = rowHtml;
    tr.addEventListener('click', () => {
      state.focusTicker = f.ticker;
      renderUI();
    });

    el.regressionSummaryTableBody.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// 4. Parameter Detail Table for Active Focus Asset
// -------------------------------------------------------------------
function renderDetailTable() {
  const res = state.analysisResults;
  if (!res || !el.parameterDetailTableBody) return;

  const focusData = res.funds.find(f => f.fund.ticker === state.focusTicker) || res.funds[0];
  if (!focusData) return;

  const f = focusData.fund;
  const reg = focusData.regression;

  if (el.detailAssetName) el.detailAssetName.textContent = `${f.ticker} - ${f.name}`;

  // Populate focus asset select dropdown
  if (el.selectFocusAsset) {
    el.selectFocusAsset.innerHTML = '';
    res.funds.forEach(fd => {
      const opt = document.createElement('option');
      opt.value = fd.fund.ticker;
      opt.textContent = `${fd.fund.ticker} (${fd.fund.name})`;
      if (fd.fund.ticker === state.focusTicker) opt.selected = true;
      el.selectFocusAsset.appendChild(opt);
    });
  }

  el.parameterDetailTableBody.innerHTML = '';

  // Intercept (Alpha)
  const trAlpha = document.createElement('tr');
  const alphaLower = (reg.alpha.annualized - 1.96 * reg.alpha.annualizedStdError) * 100;
  const alphaUpper = (reg.alpha.annualized + 1.96 * reg.alpha.annualizedStdError) * 100;
  trAlpha.innerHTML = `
    <td>
      <strong>Alpha (α Intercept)</strong>
      <div style="font-size:0.75rem; color:#94a3b8;">Unexplained annual excess return over factor risks</div>
    </td>
    <td class="num highlight-gold">${(reg.alpha.annualized * 100).toFixed(2)}%</td>
    <td class="num">${(reg.alpha.annualizedStdError * 100).toFixed(2)}%</td>
    <td class="num">${reg.alpha.tStat.toFixed(2)}</td>
    <td class="num">${reg.alpha.pVal.toFixed(4)}</td>
    <td class="num">[${alphaLower.toFixed(2)}%, ${alphaUpper.toFixed(2)}%]</td>
    <td><span class="stars-sig">${reg.alpha.stars || 'ns'}</span></td>
  `;
  el.parameterDetailTableBody.appendChild(trAlpha);

  // Factor Loadings
  reg.loadings.forEach(l => {
    const tr = document.createElement('tr');
    const bLower = l.beta - 1.96 * l.stdError;
    const bUpper = l.beta + 1.96 * l.stdError;
    const def = FACTOR_DEFINITIONS[l.key] || {};

    tr.innerHTML = `
      <td>
        <strong style="color:${l.color};">${l.symbol} (${l.name})</strong>
        <div style="font-size:0.75rem; color:#94a3b8;">${def.description || ''}</div>
      </td>
      <td class="num"><strong>${l.beta.toFixed(3)}</strong></td>
      <td class="num">${l.stdError.toFixed(3)}</td>
      <td class="num">${l.tStat.toFixed(2)}</td>
      <td class="num">${l.pVal.toFixed(4)}</td>
      <td class="num">[${bLower.toFixed(3)}, ${bUpper.toFixed(3)}]</td>
      <td><span class="stars-sig">${l.stars || 'ns'}</span></td>
    `;
    el.parameterDetailTableBody.appendChild(tr);
  });
}

// -------------------------------------------------------------------
// 5. Canvas Chart 1: Grouped Factor Loadings Bar Chart
// -------------------------------------------------------------------
function renderFactorExposureChart() {
  const res = state.analysisResults;
  const canvas = el.canvasFactorExposure;
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
  const padding = { top: 40, right: 30, bottom: 60, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const factors = res.model.factors;
  const funds = res.funds;

  // Find min/max beta across all loadings
  let minBeta = -0.5;
  let maxBeta = 1.5;
  funds.forEach(fd => {
    fd.regression.loadings.forEach(l => {
      if (l.beta < minBeta) minBeta = l.beta - 0.2;
      if (l.beta > maxBeta) maxBeta = l.beta + 0.2;
    });
  });

  const yScale = val => padding.top + plotHeight * (1 - (val - minBeta) / (maxBeta - minBeta));
  const zeroY = yScale(0);

  // Horizontal Gridlines
  ctx.lineWidth = 1;
  const step = 0.5;
  const startStep = Math.floor(minBeta / step) * step;
  const endStep = Math.ceil(maxBeta / step) * step;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fillStyle = '#94a3b8';
  ctx.font = fonts.xs;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let val = startStep; val <= endStep; val += step) {
    const y = yScale(val);
    if (y >= padding.top && y <= padding.top + plotHeight) {
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotWidth, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(1), padding.left - 8, y);
    }
  }

  // Zero Baseline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(padding.left + plotWidth, zeroY);
  ctx.stroke();

  // Grouped Bars
  const numGroups = factors.length;
  const groupWidth = plotWidth / numGroups;
  const numBarsPerGroup = funds.length;
  const barWidth = Math.min(28, (groupWidth * 0.75) / numBarsPerGroup);

  const barHitBoxes = [];

  factors.forEach((fKey, gIdx) => {
    const groupCenterX = padding.left + gIdx * groupWidth + groupWidth / 2;
    const groupStartX = groupCenterX - (numBarsPerGroup * barWidth) / 2;
    const def = FACTOR_DEFINITIONS[fKey] || {};

    // Factor label on X-axis
    ctx.fillStyle = '#f8fafc';
    ctx.font = fonts.boldSm;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(def.symbol || fKey, groupCenterX, padding.top + plotHeight + 12);

    ctx.fillStyle = '#94a3b8';
    ctx.font = fonts.xs;
    ctx.fillText(def.shortName || '', groupCenterX, padding.top + plotHeight + 28);

    // Bars for each fund
    funds.forEach((fd, bIdx) => {
      const loading = fd.regression.loadings.find(l => l.key === fKey);
      if (!loading) return;

      const barX = groupStartX + bIdx * barWidth;
      const beta = loading.beta;
      const barY = beta >= 0 ? yScale(beta) : zeroY;
      const barH = Math.max(2, Math.abs(yScale(beta) - zeroY));

      ctx.fillStyle = fd.fund.color;
      ctx.fillRect(barX, barY, barWidth - 3, barH);

      barHitBoxes.push({
        x: barX,
        y: barY,
        w: barWidth - 3,
        h: barH,
        fundTicker: fd.fund.ticker,
        factorSymbol: def.symbol || fKey,
        beta,
        stars: loading.stars,
        stdError: loading.stdError,
        tStat: loading.tStat
      });
    });
  });

  // Legend at Top
  let legendX = padding.left;
  funds.forEach(fd => {
    ctx.fillStyle = fd.fund.color;
    ctx.fillRect(legendX, 15, 12, 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = fonts.sm;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fd.fund.ticker, legendX + 16, 21);
    legendX += ctx.measureText(fd.fund.ticker).width + 36;
  });

  // Mouse Interactivity
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle(e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const hit = barHitBoxes.find(b =>
      mouseX >= b.x && mouseX <= b.x + b.w &&
      mouseY >= b.y && mouseY <= b.y + b.h
    );

    if (hit) {
      el.tooltipFactorExposure.innerHTML = `
        <div style="font-weight:700; color:#38bdf8;">${hit.fundTicker} • ${hit.factorSymbol}</div>
        <div>Loading (β): <strong>${hit.beta.toFixed(3)}</strong> <span class="stars-sig">${hit.stars}</span></div>
        <div style="font-size:0.75rem; color:#94a3b8;">SE: ${hit.stdError.toFixed(3)} | t-stat: ${hit.tStat.toFixed(2)}</div>
      `;
      el.tooltipFactorExposure.style.left = `${Math.min(width - 180, mouseX + 15)}px`;
      el.tooltipFactorExposure.style.top = `${Math.max(10, mouseY - 25)}px`;
      el.tooltipFactorExposure.style.display = 'block';
    } else {
      el.tooltipFactorExposure.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    el.tooltipFactorExposure.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// 6. Canvas Chart 2: Walk-Forward Rolling Factor Loadings Time Series
// -------------------------------------------------------------------
function renderRollingLoadingsChart() {
  const res = state.analysisResults;
  const canvas = el.canvasRollingLoadings;
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
  const padding = { top: 40, right: 30, bottom: 50, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Update label
  if (el.labelRollingWindow) el.labelRollingWindow.textContent = `${state.rollingMonths}-Month`;

  // Render filter buttons in chart header
  renderRollingFilterChips(res);

  // Determine series to draw based on filter
  // If filter is 'all': draw all factors for focus asset
  // If filter is specific factor: draw that factor across all funds
  const seriesToDraw = [];
  if (state.activeFactorFilter === 'all') {
    const focusFund = res.funds.find(f => f.fund.ticker === state.focusTicker) || res.funds[0];
    if (focusFund && focusFund.rolling.length > 0) {
      res.model.factors.forEach(fKey => {
        const def = FACTOR_DEFINITIONS[fKey] || {};
        const points = focusFund.rolling.map(r => ({
          date: r.date,
          val: r.loadings[fKey] ?? 0
        }));
        seriesToDraw.push({
          label: `${def.symbol || fKey} (${def.name})`,
          color: def.color || '#38bdf8',
          points
        });
      });
    }
  } else {
    // Specific factor across funds
    const fKey = state.activeFactorFilter;
    const def = FACTOR_DEFINITIONS[fKey] || {};
    res.funds.forEach(fd => {
      const points = fd.rolling.map(r => ({
        date: r.date,
        val: r.loadings[fKey] ?? 0
      }));
      seriesToDraw.push({
        label: `${fd.fund.ticker} (${def.symbol || fKey})`,
        color: fd.fund.color,
        points
      });
    });
  }

  if (seriesToDraw.length === 0 || seriesToDraw[0].points.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = fonts.md;
    ctx.textAlign = 'center';
    ctx.fillText('Insufficient historical data for rolling regression window.', width / 2, height / 2);
    return;
  }

  // Find min/max values
  let minVal = -0.5;
  let maxVal = 1.5;
  seriesToDraw.forEach(s => {
    s.points.forEach(p => {
      if (p.val < minVal) minVal = p.val - 0.2;
      if (p.val > maxVal) maxVal = p.val + 0.2;
    });
  });

  const numPoints = seriesToDraw[0].points.length;
  const xScale = idx => padding.left + (idx / Math.max(1, numPoints - 1)) * plotWidth;
  const yScale = val => padding.top + plotHeight * (1 - (val - minVal) / (maxVal - minVal));
  const zeroY = yScale(0);

  // Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = fonts.xs;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const step = 0.5;
  const startStep = Math.floor(minVal / step) * step;
  const endStep = Math.ceil(maxVal / step) * step;

  for (let val = startStep; val <= endStep; val += step) {
    const y = yScale(val);
    if (y >= padding.top && y <= padding.top + plotHeight) {
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotWidth, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(1), padding.left - 8, y);
    }
  }

  // Zero Baseline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(padding.left + plotWidth, zeroY);
  ctx.stroke();

  // X Axis Date Labels
  const dateInterval = Math.max(1, Math.floor(numPoints / 7));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < numPoints; i += dateInterval) {
    const x = xScale(i);
    const dStr = seriesToDraw[0].points[i].date;
    ctx.fillText(dStr, x, padding.top + plotHeight + 10);
  }

  // Draw Lines
  seriesToDraw.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    s.points.forEach((pt, i) => {
      const x = xScale(i);
      const y = yScale(pt.val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // Legend at Top
  let legendX = padding.left;
  seriesToDraw.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(legendX, 20);
    ctx.lineTo(legendX + 16, 20);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = fonts.sm;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.label, legendX + 22, 20);
    legendX += ctx.measureText(s.label).width + 36;
  });

  // Mouse Interactivity
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();

  const handleMouseMove = rafThrottle(e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < padding.left || mouseX > padding.left + plotWidth) {
      el.tooltipRollingLoadings.style.display = 'none';
      return;
    }

    const ratio = (mouseX - padding.left) / plotWidth;
    const idx = Math.max(0, Math.min(numPoints - 1, Math.round(ratio * (numPoints - 1))));
    const curDate = seriesToDraw[0].points[idx].date;

    let tooltipHtml = `<div style="font-weight:700; color:#38bdf8; margin-bottom:4px;">Date: ${curDate} (${state.rollingMonths}M Rolling)</div>`;
    seriesToDraw.forEach(s => {
      const val = s.points[idx].val;
      tooltipHtml += `
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span style="color:${s.color}; font-weight:600;">${s.label}:</span>
          <strong>${val.toFixed(3)}</strong>
        </div>
      `;
    });

    el.tooltipRollingLoadings.innerHTML = tooltipHtml;
    el.tooltipRollingLoadings.style.left = `${Math.min(width - 240, mouseX + 15)}px`;
    el.tooltipRollingLoadings.style.top = `${Math.max(10, mouseY - 25)}px`;
    el.tooltipRollingLoadings.style.display = 'block';
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    el.tooltipRollingLoadings.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// Render Filter Chips for Rolling Loadings Chart
// -------------------------------------------------------------------
function renderRollingFilterChips(res) {
  if (!el.rollingFactorFilters) return;
  el.rollingFactorFilters.innerHTML = '';

  // "All Factors" chip
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = `factor-filter-chip ${state.activeFactorFilter === 'all' ? 'active' : ''}`;
  allBtn.textContent = `All Factors (${state.focusTicker})`;
  allBtn.addEventListener('click', () => {
    state.activeFactorFilter = 'all';
    renderRollingLoadingsChart();
  });
  el.rollingFactorFilters.appendChild(allBtn);

  // Individual factor chips
  res.model.factors.forEach(fKey => {
    const def = FACTOR_DEFINITIONS[fKey] || {};
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `factor-filter-chip ${state.activeFactorFilter === fKey ? 'active' : ''}`;
    btn.textContent = def.symbol || fKey;
    btn.addEventListener('click', () => {
      state.activeFactorFilter = fKey;
      renderRollingLoadingsChart();
    });
    el.rollingFactorFilters.appendChild(btn);
  });
}

// -------------------------------------------------------------------
// 7. Canvas Chart 3: Return Attribution Decomposition
// -------------------------------------------------------------------
function renderAttributionChart() {
  const res = state.analysisResults;
  const canvas = el.canvasAttribution;
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
  const padding = { top: 40, right: 30, bottom: 60, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const funds = res.funds;
  const numFunds = funds.length;
  const groupWidth = plotWidth / numFunds;
  const barWidth = Math.min(60, groupWidth * 0.6);

  // Find min/max return attribution
  let minVal = -0.05;
  let maxVal = 0.20;
  funds.forEach(fd => {
    const total = fd.attribution.totalExplainedAnnualizedReturn;
    if (total > maxVal) maxVal = total + 0.05;
    if (total < minVal) minVal = total - 0.05;
  });

  const yScale = val => padding.top + plotHeight * (1 - (val - minVal) / (maxVal - minVal));
  const zeroY = yScale(0);

  // Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = fonts.xs;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const step = 0.05;
  for (let val = -0.10; val <= 0.35; val += step) {
    const y = yScale(val);
    if (y >= padding.top && y <= padding.top + plotHeight) {
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotWidth, y);
      ctx.stroke();
      ctx.fillText(`${(val * 100).toFixed(0)}%`, padding.left - 8, y);
    }
  }

  // Zero Baseline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(padding.left + plotWidth, zeroY);
  ctx.stroke();

  const hitBoxes = [];

  funds.forEach((fd, idx) => {
    const centerX = padding.left + idx * groupWidth + groupWidth / 2;
    const barX = centerX - barWidth / 2;
    const attr = fd.attribution;

    // Stacked segments starting from 0
    let currentYPos = zeroY;
    let currentYNeg = zeroY;

    // Stack factors
    attr.factors.forEach(f => {
      const h = Math.abs(yScale(f.contribution) - zeroY);
      let segY;
      if (f.contribution >= 0) {
        segY = currentYPos - h;
        currentYPos = segY;
      } else {
        segY = currentYNeg;
        currentYNeg += h;
      }

      ctx.fillStyle = f.color;
      ctx.fillRect(barX, segY, barWidth, h);

      hitBoxes.push({
        x: barX,
        y: segY,
        w: barWidth,
        h,
        fundTicker: fd.fund.ticker,
        factorName: f.name,
        contribution: f.contribution
      });
    });

    // Alpha segment
    const alphaH = Math.abs(yScale(attr.alphaContribution) - zeroY);
    let alphaY;
    if (attr.alphaContribution >= 0) {
      alphaY = currentYPos - alphaH;
      currentYPos = alphaY;
    } else {
      alphaY = currentYNeg;
      currentYNeg += alphaH;
    }
    ctx.fillStyle = '#fbbf24'; // Gold for Alpha
    ctx.fillRect(barX, alphaY, barWidth, alphaH);

    hitBoxes.push({
      x: barX,
      y: alphaY,
      w: barWidth,
      h: alphaH,
      fundTicker: fd.fund.ticker,
      factorName: 'Alpha (α)',
      contribution: attr.alphaContribution
    });

    // Asset Ticker on X Axis
    ctx.fillStyle = '#f8fafc';
    ctx.font = fonts.boldSm;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(fd.fund.ticker, centerX, padding.top + plotHeight + 12);

    ctx.fillStyle = '#38bdf8';
    ctx.font = fonts.xs;
    ctx.fillText(`${(attr.totalExplainedAnnualizedReturn * 100).toFixed(1)}% / yr`, centerX, padding.top + plotHeight + 28);
  });

  // Legend at Top
  let legendX = padding.left;
  const legendItems = res.model.factors.map(k => ({
    name: FACTOR_DEFINITIONS[k]?.symbol || k,
    color: FACTOR_DEFINITIONS[k]?.color || '#38bdf8'
  }));
  legendItems.push({ name: 'Alpha (α)', color: '#fbbf24' });

  legendItems.forEach(item => {
    ctx.fillStyle = item.color;
    ctx.fillRect(legendX, 15, 12, 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = fonts.sm;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.name, legendX + 16, 21);
    legendX += ctx.measureText(item.name).width + 28;
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
      el.tooltipAttribution.innerHTML = `
        <div style="font-weight:700; color:#38bdf8;">${hit.fundTicker} • ${hit.factorName}</div>
        <div>Annual Contribution: <strong>${(hit.contribution * 100).toFixed(2)}%</strong> / yr</div>
      `;
      el.tooltipAttribution.style.left = `${Math.min(width - 180, mouseX + 15)}px`;
      el.tooltipAttribution.style.top = `${Math.max(10, mouseY - 25)}px`;
      el.tooltipAttribution.style.display = 'block';
    } else {
      el.tooltipAttribution.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal: canvas._controller.signal });
  canvas.addEventListener('mouseleave', () => {
    el.tooltipAttribution.style.display = 'none';
  }, { signal: canvas._controller.signal });
}

// -------------------------------------------------------------------
// 8. Factor Statistics & Correlation Matrix
// -------------------------------------------------------------------
function renderFactorStats() {
  const res = state.analysisResults;
  if (!res || !res.factorStats) return;

  const stats = res.factorStats.stats;
  const matrix = res.factorStats.correlationMatrix;
  const factors = res.model.factors;

  // Factor stats table
  if (el.factorStatsTableBody) {
    el.factorStatsTableBody.innerHTML = '';
    factors.forEach(k => {
      const s = stats[k];
      if (!s) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="color:${s.color};">${s.symbol} (${s.name})</strong></td>
        <td class="num">${(s.annualizedReturn * 100).toFixed(2)}%</td>
        <td class="num">${(s.annualizedVol * 100).toFixed(2)}%</td>
        <td class="num highlight-green">${s.sharpeRatio.toFixed(2)}</td>
      `;
      el.factorStatsTableBody.appendChild(tr);
    });
  }

  // Correlation matrix
  if (el.factorCorrelationTable) {
    let html = '<thead><tr><th>Factor</th>';
    factors.forEach(k => {
      html += `<th>${FACTOR_DEFINITIONS[k]?.symbol || k}</th>`;
    });
    html += '</tr></thead><tbody>';

    factors.forEach(rKey => {
      html += `<tr><td><strong>${FACTOR_DEFINITIONS[rKey]?.symbol || rKey}</strong></td>`;
      factors.forEach(cKey => {
        const corr = matrix[rKey]?.[cKey] ?? 0;
        let cellBg = 'transparent';
        if (rKey === cKey) {
          cellBg = 'rgba(56, 189, 248, 0.2)';
        } else if (corr > 0.3) {
          cellBg = `rgba(52, 211, 153, ${Math.min(0.4, corr * 0.4)})`;
        } else if (corr < -0.3) {
          cellBg = `rgba(244, 63, 94, ${Math.min(0.4, Math.abs(corr) * 0.4)})`;
        }
        html += `<td class="corr-cell" style="background:${cellBg};">${corr.toFixed(2)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';
    el.factorCorrelationTable.innerHTML = html;
  }
}

// -------------------------------------------------------------------
// 9. Plain-English Style Diagnostics
// -------------------------------------------------------------------
function renderDiagnostics() {
  const res = state.analysisResults;
  if (!res || !el.diagnosticsContent) return;

  const focusData = res.funds.find(f => f.fund.ticker === state.focusTicker) || res.funds[0];
  if (!focusData) return;

  const f = focusData.fund;
  const reg = focusData.regression;
  const mkt = reg.loadings.find(l => l.key === 'mkt_rf')?.beta ?? 1.0;
  const smb = reg.loadings.find(l => l.key === 'smb')?.beta ?? 0;
  const hml = reg.loadings.find(l => l.key === 'hml')?.beta ?? 0;

  let sizeDesc = 'neutral size exposure';
  if (smb > 0.6) sizeDesc = '<strong>heavy small-cap exposure</strong>';
  else if (smb > 0.2) sizeDesc = '<strong>moderate small-cap tilt</strong>';
  else if (smb < -0.3) sizeDesc = '<strong>large-cap tilt</strong>';

  let valueDesc = 'core blend style';
  if (hml > 0.5) valueDesc = '<strong>deep value exposure</strong>';
  else if (hml > 0.15) valueDesc = '<strong>moderate value tilt</strong>';
  else if (hml < -0.2) valueDesc = '<strong>growth orientation</strong>';

  const alphaAnn = (reg.alpha.annualized * 100).toFixed(2);
  const alphaSig = reg.alpha.pVal < 0.05 ? 'statistically significant' : 'not statistically distinguishable from zero';

  el.diagnosticsContent.innerHTML = `
    <p style="margin-top:0;">
      <strong>Style &amp; Factor Profile:</strong> Over the ${res.commonMonths}-month aligned period (${res.commonStart} to ${res.commonEnd}), 
      <strong>${f.ticker} (${f.name})</strong> displays ${sizeDesc} (SMB β = ${smb.toFixed(2)}) and ${valueDesc} (HML β = ${hml.toFixed(2)}). 
      Its market sensitivity is <strong>β = ${mkt.toFixed(2)}</strong>.
    </p>
    <p>
      <strong>Model Explanatory Power:</strong> The ${res.model.name} explains <strong>${(reg.rSquared * 100).toFixed(1)}%</strong> of 
      ${f.ticker}'s monthly return variance, leaving an annualized residual unsystematic risk of <strong>${(reg.annualizedResidualStdErr * 100).toFixed(2)}%</strong>.
    </p>
    <p style="margin-bottom:0;">
      <strong>Alpha Interpretation:</strong> After controlling for factor risks, ${f.ticker}'s annualized alpha is 
      <strong>${reg.alpha.annualized >= 0 ? '+' : ''}${alphaAnn}%</strong> (t = ${reg.alpha.tStat.toFixed(2)}, p = ${reg.alpha.pVal.toFixed(3)}), 
      which is <em>${alphaSig}</em>. This confirms that performance is predominantly driven by systematic factor exposures rather than unrewarded active risk.
    </p>
  `;
}

// -------------------------------------------------------------------
// 10. Asset Chip List
// -------------------------------------------------------------------
function renderAssetChips() {
  if (!el.assetChipList) return;
  el.assetChipList.innerHTML = '';

  state.activeTickers.forEach((ticker, idx) => {
    const isFocus = ticker === state.focusTicker;
    const color = ASSET_COLORS[idx % ASSET_COLORS.length];

    const chip = document.createElement('div');
    chip.className = `asset-chip ${isFocus ? 'active-focus' : ''}`;
    chip.innerHTML = `
      <span class="asset-chip-color-dot" style="background:${color};"></span>
      <span>${ticker}</span>
      ${state.activeTickers.length > 1 ? `<button type="button" class="asset-chip-remove" title="Remove ${ticker}">×</button>` : ''}
    `;

    // Click chip to focus
    chip.addEventListener('click', (e) => {
      if (e.target.classList.contains('asset-chip-remove')) return;
      state.focusTicker = ticker;
      renderUI();
    });

    // Remove button
    const removeBtn = chip.querySelector('.asset-chip-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activeTickers = state.activeTickers.filter(t => t !== ticker);
        if (state.focusTicker === ticker) {
          state.focusTicker = state.activeTickers[0] || 'IJS';
        }
        runAnalysis();
        renderUI();
      });
    }

    el.assetChipList.appendChild(chip);
  });
}

function renderEmptyState() {
  if (el.diagnosticsContent) {
    el.diagnosticsContent.innerHTML = '<p>No valid assets loaded for factor regression. Please add at least one fund.</p>';
  }
}

// -------------------------------------------------------------------
// CSV Exporters
// -------------------------------------------------------------------
function exportSummaryCsv() {
  const res = state.analysisResults;
  if (!res) return;

  const headers = ['Asset', 'Name', 'Alpha_Annualized_Pct', 'Alpha_pVal'];
  res.model.factors.forEach(k => {
    headers.push(`Beta_${FACTOR_DEFINITIONS[k]?.symbol || k}`);
    headers.push(`pVal_${FACTOR_DEFINITIONS[k]?.symbol || k}`);
  });
  headers.push('R_Squared', 'Adj_R_Squared', 'Residual_Vol_Annualized', 'Sample_Months');

  const rows = [headers.join(',')];
  res.funds.forEach(fd => {
    const f = fd.fund;
    const r = fd.regression;
    const row = [
      f.ticker,
      `"${f.name}"`,
      (r.alpha.annualized * 100).toFixed(4),
      r.alpha.pVal.toFixed(4)
    ];
    res.model.factors.forEach(k => {
      const l = r.loadings.find(x => x.key === k);
      row.push(l ? l.beta.toFixed(4) : '');
      row.push(l ? l.pVal.toFixed(4) : '');
    });
    row.push(
      (r.rSquared * 100).toFixed(2),
      (r.adjRSquared * 100).toFixed(2),
      (r.annualizedResidualStdErr * 100).toFixed(4),
      fd.alignedCount
    );
    rows.push(row.join(','));
  });

  downloadCsv(rows.join('\n'), `Factor_Regression_${res.model.id}_Summary.csv`);
}

function exportRollingCsv() {
  const res = state.analysisResults;
  if (!res) return;

  const focusFund = res.funds.find(f => f.fund.ticker === state.focusTicker) || res.funds[0];
  if (!focusFund || focusFund.rolling.length === 0) return;

  const headers = ['Date', 'Alpha_Annualized', 'R_Squared'];
  res.model.factors.forEach(k => headers.push(`Beta_${FACTOR_DEFINITIONS[k]?.symbol || k}`));

  const rows = [headers.join(',')];
  focusFund.rolling.forEach(r => {
    const row = [
      r.date,
      (r.alphaAnnualized * 100).toFixed(4),
      (r.rSquared * 100).toFixed(4)
    ];
    res.model.factors.forEach(k => {
      row.push((r.loadings[k] ?? 0).toFixed(4));
    });
    rows.push(row.join(','));
  });

  downloadCsv(rows.join('\n'), `${focusFund.fund.ticker}_Rolling_${state.rollingMonths}M_Loadings.csv`);
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
  // Toggle Model Configuration Panel
  if (el.btnToggleConfig && el.configCard) {
    el.btnToggleConfig.addEventListener('click', () => {
      state.isConfigCollapsed = !state.isConfigCollapsed;
      el.configCard.style.display = state.isConfigCollapsed ? 'none' : 'block';
      if (el.btnConfigText) {
        el.btnConfigText.textContent = state.isConfigCollapsed ? 'Show Model Settings' : 'Hide Model Settings';
      }
    });
  }

  // Factor Model Selector buttons
  if (el.modelSelectorControl) {
    el.modelSelectorControl.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.modelSelectorControl.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.modelId = btn.dataset.model;
        runAnalysis();
        renderUI();
      });
    });
  }

  // Rolling Window Selector buttons
  if (el.rollingWindowControl) {
    el.rollingWindowControl.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.rollingWindowControl.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.rollingMonths = parseInt(btn.dataset.window, 10);
        runAnalysis();
        renderUI();
      });
    });
  }

  // Quick Presets
  const setPreset = (tickers, activeBtn) => {
    [el.presetScv, el.presetCore, el.presetExtremes].forEach(b => b && b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
    state.activeTickers = [...tickers];
    state.focusTicker = tickers[0];
    runAnalysis();
    renderUI();
  };

  if (el.presetScv) {
    el.presetScv.addEventListener('click', () => {
      setPreset(['IJS', 'IWN', 'RZV', 'VBR'], el.presetScv);
    });
  }
  if (el.presetCore) {
    el.presetCore.addEventListener('click', () => {
      setPreset(['VOO', 'QQQ', 'SCHD', 'BND'], el.presetCore);
    });
  }
  if (el.presetExtremes) {
    el.presetExtremes.addEventListener('click', () => {
      setPreset(['IWM', 'IJS', 'VTV', 'VUG'], el.presetExtremes);
    });
  }

  // Focus asset select dropdown
  if (el.selectFocusAsset) {
    el.selectFocusAsset.addEventListener('change', (e) => {
      state.focusTicker = e.target.value;
      renderUI();
    });
  }

  // Add Asset via Asset Modal
  if (el.btnAddAsset) {
    el.btnAddAsset.addEventListener('click', () => {
      openAssetModal({
        selectedTicker: state.focusTicker,
        onSelect: (selectedFund) => {
          const sym = selectedFund.ticker.toUpperCase();
          if (!state.activeTickers.includes(sym)) {
            state.activeTickers.push(sym);
          }
          state.focusTicker = sym;
          runAnalysis();
          renderUI();
        }
      });
    });
  }

  // CSV Exports
  if (el.btnExportSummaryCsv) {
    el.btnExportSummaryCsv.addEventListener('click', exportSummaryCsv);
  }
  if (el.btnExportRollingCsv) {
    el.btnExportRollingCsv.addEventListener('click', exportRollingCsv);
  }

  // Window Resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      renderFactorExposureChart();
      renderRollingLoadingsChart();
      renderAttributionChart();
    }, 150);
  });
}

// -------------------------------------------------------------------
// Initialization
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initDom();
  parseUrlParams();

  // Sync active UI buttons with URL/initial state
  if (el.modelSelectorControl) {
    el.modelSelectorControl.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.model === state.modelId);
    });
  }
  if (el.rollingWindowControl) {
    el.rollingWindowControl.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.window, 10) === state.rollingMonths);
    });
  }

  wireEvents();
  await initSessionFunds();

  runAnalysis();
  renderUI();
});
