/**
 * Asset Analytics Studio UI Controller
 * Manages reactive UI state, Canvas charts, underwater drawdown tables,
 * monthly return heatmaps, and rolling metric diagnostics.
 */

import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import {
  computeMonthlyReturns,
  calculateGrowthOf10k,
  calculateAnnualReturns,
  calculateDrawdownEpisodes,
  calculateMonthlyCalendarHeatmap,
  calculateRollingMetrics,
  calculateVaRAndCVaR,
  generateSimpleVerdict,
  analyzeFundRegression
} from './analytics-engine.js';
import { formatCurrency, rafThrottle } from '../js/chart-utils.js';
import { formatPct } from '../js/formatting.js';

const STORAGE_KEY_CUSTOM_FUNDS = 'dca_custom_funds_library';

// App Reactive State
const state = {
  fundTicker: 'QQQ',
  benchTicker: 'VOO',
  timeHorizon: 'all', // 'all' | '10y' | '5y' | '3y' | '1y'
  useDRIP: true,
  viewMode: 'simple', // 'simple' | 'quant'
  growthScale: 'linear', // 'linear' | 'log'
  rollingWindowMonths: 36, // 12 | 36 | 60
  annualRf: 0.03, // 3% risk-free rate
  // Cached calculation results
  analysis: null,
  fundObj: null,
  benchObj: null
};

// DOM Elements Cache
let elements = {};

// Canvas Controllers for event cleanup
const canvasControllers = {
  growth: null,
  annual: null,
  drawdown: null,
  rolling: null
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  cacheDOMElements();
  populateFundSelectors();
  bindEvents();
  updateViewModeUI();
  runAnalysis();

  // Handle window resizing with debounce
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.analysis) {
        drawAllCharts();
      }
    }, 200);
  });
}

function cacheDOMElements() {
  elements = {
    fundSelect: document.getElementById('fund-select'),
    benchSelect: document.getElementById('benchmark-select'),
    rangeSelect: document.getElementById('range-select'),
    dripToggle: document.getElementById('drip-toggle'),
    btnModeSimple: document.getElementById('btn-mode-simple'),
    btnModeQuant: document.getElementById('btn-mode-quant'),
    btnScaleLinear: document.getElementById('btn-scale-linear'),
    btnScaleLog: document.getElementById('btn-scale-log'),
    rollingWindowBtns: document.querySelectorAll('[data-window]'),
    btnExportCsv: document.getElementById('btn-export-report-csv'),

    // View Containers
    verdictContainer: document.getElementById('diagnostic-verdict-container'),
    verdictBadge: document.getElementById('verdict-badge'),
    verdictSummary: document.getElementById('verdict-summary'),
    verdictRisk: document.getElementById('verdict-risk'),
    verdictWinRate: document.getElementById('verdict-winrate'),
    kpiScorecardGrid: document.getElementById('kpi-scorecard-grid'),

    // KPI Cards
    kpiFinalVal: document.getElementById('kpi-final-val'),
    kpiFinalSub: document.getElementById('kpi-final-sub'),
    kpiCagr: document.getElementById('kpi-cagr'),
    kpiCagrSub: document.getElementById('kpi-cagr-sub'),
    kpiVol: document.getElementById('kpi-vol'),
    kpiVolSub: document.getElementById('kpi-vol-sub'),
    kpiMaxDd: document.getElementById('kpi-maxdd'),
    kpiMaxDdSub: document.getElementById('kpi-maxdd-sub'),
    kpiSharpe: document.getElementById('kpi-sharpe'),
    kpiSharpeSub: document.getElementById('kpi-sharpe-sub'),
    kpiSortino: document.getElementById('kpi-sortino'),
    kpiSortinoSub: document.getElementById('kpi-sortino-sub'),

    // Canvases & Tooltips
    growthCanvas: document.getElementById('growth-canvas'),
    growthTooltip: document.getElementById('growth-tooltip'),
    annualCanvas: document.getElementById('annual-canvas'),
    annualTooltip: document.getElementById('annual-tooltip'),
    drawdownCanvas: document.getElementById('drawdown-canvas'),
    drawdownTooltip: document.getElementById('drawdown-tooltip'),
    rollingCanvas: document.getElementById('rolling-canvas'),
    rollingTooltip: document.getElementById('rolling-tooltip'),

    // Rolling Stats Banner
    rollingWinRatePill: document.getElementById('rolling-winrate-pill'),
    rollingComparisonsText: document.getElementById('rolling-comparisons-text'),

    // Tables
    crashTableBody: document.getElementById('crash-table-body'),
    heatmapTableBody: document.getElementById('heatmap-table-body'),

    // 20-Metric Institutional Matrix
    mCagr: document.getElementById('m-cagr'),
    mBenchCagr: document.getElementById('m-bench-cagr'),
    mArithMean: document.getElementById('m-arith-mean'),
    mBestYear: document.getElementById('m-best-year'),
    mWorstYear: document.getElementById('m-worst-year'),

    mVol: document.getElementById('m-vol'),
    mDownsideDev: document.getElementById('m-downside-dev'),
    mMaxDd: document.getElementById('m-maxdd'),
    mUlcer: document.getElementById('m-ulcer'),
    mVar: document.getElementById('m-var'),
    mCvar: document.getElementById('m-cvar'),

    mSharpe: document.getElementById('m-sharpe'),
    mSortino: document.getElementById('m-sortino'),
    mTreynor: document.getElementById('m-treynor'),
    mCalmar: document.getElementById('m-calmar'),
    mMartin: document.getElementById('m-martin'),
    mOmega: document.getElementById('m-omega'),
    mGainPain: document.getElementById('m-gain-pain'),
    mMSquared: document.getElementById('m-msquared'),

    mAlpha: document.getElementById('m-alpha'),
    mBeta: document.getElementById('m-beta'),
    mRSquared: document.getElementById('m-rsquared'),
    mTrackingError: document.getElementById('m-tracking-error'),
    mInfoRatio: document.getElementById('m-info-ratio'),
    mUpCapture: document.getElementById('m-up-capture'),
    mDownCapture: document.getElementById('m-down-capture'),
    mCaptureRatio: document.getElementById('m-capture-ratio')
  };
}

function getAvailableFunds() {
  const fundsMap = new Map();

  // 1. Pre-bundled benchmarks
  PRESET_BENCHMARKS.forEach(b => {
    fundsMap.set(b.ticker.toUpperCase(), {
      ticker: b.ticker.toUpperCase(),
      name: b.name,
      category: b.assetClass || 'Broad Index',
      color: b.color || '#38bdf8',
      data: b.data,
      isPreset: true
    });
  });

  // 2. Custom uploaded funds from localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_FUNDS);
    if (raw) {
      const customList = JSON.parse(raw);
      if (Array.isArray(customList)) {
        customList.forEach(cf => {
          if (cf.ticker && cf.data && cf.data.length > 0) {
            fundsMap.set(cf.ticker.toUpperCase(), {
              ticker: cf.ticker.toUpperCase(),
              name: cf.name || cf.ticker,
              category: cf.category || 'Custom ETF',
              color: cf.color || '#a855f7',
              data: cf.data,
              isPreset: false
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('Could not read custom funds library:', err);
  }

  return Array.from(fundsMap.values());
}

function populateFundSelectors() {
  const allFunds = getAvailableFunds();
  const presets = allFunds.filter(f => f.isPreset);
  const custom = allFunds.filter(f => !f.isPreset);

  let fundHtml = '<optgroup label="Core Presets">';
  presets.forEach(p => {
    fundHtml += `<option value="${p.ticker}">${p.ticker} — ${p.name}</option>`;
  });
  fundHtml += '</optgroup>';

  if (custom.length > 0) {
    fundHtml += '<optgroup label="Uploaded Funds Library">';
    custom.forEach(c => {
      fundHtml += `<option value="${c.ticker}">${c.ticker} — ${c.name}</option>`;
    });
    fundHtml += '</optgroup>';
  }

  elements.fundSelect.innerHTML = fundHtml;
  elements.fundSelect.value = state.fundTicker;
}

function bindEvents() {
  elements.fundSelect.addEventListener('change', (e) => {
    state.fundTicker = e.target.value;
    runAnalysis();
  });

  elements.benchSelect.addEventListener('change', (e) => {
    state.benchTicker = e.target.value;
    runAnalysis();
  });

  elements.rangeSelect.addEventListener('change', (e) => {
    state.timeHorizon = e.target.value;
    runAnalysis();
  });

  elements.dripToggle.addEventListener('change', (e) => {
    state.useDRIP = e.target.value === 'true';
    runAnalysis();
  });

  elements.btnModeSimple.addEventListener('click', () => {
    state.viewMode = 'simple';
    updateViewModeUI();
  });

  elements.btnModeQuant.addEventListener('click', () => {
    state.viewMode = 'quant';
    updateViewModeUI();
  });

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

  elements.rollingWindowBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.rollingWindowBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.rollingWindowMonths = parseInt(btn.dataset.window, 10);
      computeAndDrawRolling();
    });
  });

  elements.btnExportCsv.addEventListener('click', exportPerformanceReportCSV);
}

function updateViewModeUI() {
  if (state.viewMode === 'simple') {
    elements.btnModeSimple.classList.add('active');
    elements.btnModeQuant.classList.remove('active');
    elements.verdictContainer.classList.remove('hidden');
    elements.kpiScorecardGrid.classList.add('hidden');
  } else {
    elements.btnModeQuant.classList.add('active');
    elements.btnModeSimple.classList.remove('active');
    elements.verdictContainer.classList.add('hidden');
    elements.kpiScorecardGrid.classList.remove('hidden');
  }
}

function filterDataByHorizon(dataList, horizon) {
  if (!dataList || dataList.length === 0 || horizon === 'all') {
    return dataList;
  }
  const monthsMap = {
    '10y': 120,
    '5y': 60,
    '3y': 36,
    '1y': 12
  };
  const count = monthsMap[horizon] || dataList.length;
  return dataList.slice(Math.max(0, dataList.length - count));
}

function runAnalysis() {
  const allFunds = getAvailableFunds();
  const fund = allFunds.find(f => f.ticker === state.fundTicker) || allFunds[0];
  const bench = allFunds.find(f => f.ticker === state.benchTicker) || allFunds.find(f => f.ticker === 'VOO');

  state.fundObj = fund;
  state.benchObj = bench;

  // Filter raw data by horizon
  const filteredFundData = filterDataByHorizon(fund.data, state.timeHorizon);
  const filteredBenchData = filterDataByHorizon(bench.data, state.timeHorizon);

  // Compute monthly returns
  const fundMonthlyReturns = computeMonthlyReturns(filteredFundData, state.useDRIP);
  const benchMonthlyReturns = computeMonthlyReturns(filteredBenchData, state.useDRIP);

  if (fundMonthlyReturns.length < 3) {
    alert('Insufficient historical price history for the selected date range.');
    return;
  }

  // 1. Cumulative Growth of $10k
  const growthSeries = calculateGrowthOf10k(fundMonthlyReturns, benchMonthlyReturns, 10000);

  // 2. Calendar Annual Returns
  const annualReturns = calculateAnnualReturns(fundMonthlyReturns, benchMonthlyReturns);

  // 3. Drawdown Episodes & High-Water Mark Timeline
  const drawdownResult = calculateDrawdownEpisodes(fundMonthlyReturns);

  // 4. Monthly Calendar Heatmap Matrix
  const heatmapMatrix = calculateMonthlyCalendarHeatmap(fundMonthlyReturns);

  // 5. Value at Risk (VaR 95%) & CVaR
  const riskMetrics = calculateVaRAndCVaR(fundMonthlyReturns, 0.95);

  // 6. Full Econometric Regression & Advanced Risk Suite
  const profile = analyzeFundRegression(
    { ticker: fund.ticker, name: fund.name, color: fund.color, data: filteredFundData },
    { ticker: bench.ticker, name: bench.name, color: bench.color, data: filteredBenchData },
    { useDRIP: state.useDRIP, annualRf: state.annualRf, windowMonths: state.rollingWindowMonths }
  );

  // Store in state
  state.analysis = {
    growthSeries,
    annualReturns,
    drawdownResult,
    heatmapMatrix,
    riskMetrics,
    profile,
    fundMonthlyReturns,
    benchMonthlyReturns
  };

  // Render UI
  renderScorecards();
  renderCrashTable();
  renderHeatmapTable();
  renderInstitutionalMatrix();
  computeAndDrawRolling();
  drawAllCharts();
}

function renderScorecards() {
  const a = state.analysis;
  if (!a || !a.profile) return;

  const fRisk = a.profile.fundRisk;
  const bRisk = a.profile.benchRisk;
  const growth = a.growthSeries;
  const finalFundVal = growth[growth.length - 1].fundGrowth;
  const finalBenchVal = growth[growth.length - 1].benchGrowth;

  // Diagnostic Verdict Card (Simple Mode)
  const verdict = generateSimpleVerdict(
    {
      cagr: fRisk.cagr,
      volatility: fRisk.annualVolatility,
      maxDrawdown: fRisk.maxDrawdown,
      beta: a.profile.capm.beta,
      sharpe: fRisk.sharpeRatio,
      alpha: a.profile.capm.alpha
    },
    { cagr: bRisk.cagr },
    a.drawdownResult.topEpisodes,
    a.rollingStats || { winRate: 0, totalWindows: 0, outperformedWindows: 0 }
  );

  elements.verdictBadge.textContent = verdict.badge;
  elements.verdictSummary.innerHTML = verdict.summary;
  elements.verdictRisk.innerHTML = verdict.riskVerdict;
  elements.verdictWinRate.innerHTML = verdict.winVerdict;

  // KPI Scorecard Cards (Quant Mode)
  elements.kpiFinalVal.textContent = `$${Math.round(finalFundVal).toLocaleString()}`;
  elements.kpiFinalSub.textContent = finalBenchVal ? `vs $${Math.round(finalBenchVal).toLocaleString()} ${state.benchTicker}` : 'Initial: $10,000';

  elements.kpiCagr.textContent = formatPct(fRisk.cagr);
  elements.kpiCagrSub.textContent = `vs ${formatPct(bRisk.cagr)} benchmark`;

  elements.kpiVol.textContent = formatPct(fRisk.annualVolatility);
  elements.kpiVolSub.textContent = `Downside Dev: ${formatPct(fRisk.downsideDeviation)}`;

  elements.kpiMaxDd.textContent = formatPct(fRisk.maxDrawdown);
  elements.kpiMaxDdSub.textContent = `Ulcer Index: ${formatPct(fRisk.ulcerIndex)}`;

  elements.kpiSharpe.textContent = fRisk.sharpeRatio.toFixed(2);
  elements.kpiSharpeSub.textContent = `Sortino: ${fRisk.sortinoRatio.toFixed(2)}`;

  elements.kpiSortino.textContent = fRisk.sortinoRatio.toFixed(2);
  elements.kpiSortinoSub.textContent = `Calmar: ${fRisk.calmarRatio.toFixed(2)}`;
}

function renderCrashTable() {
  const episodes = state.analysis.drawdownResult.topEpisodes.slice(0, 8); // Top 8 worst crashes
  let html = '';

  if (episodes.length === 0) {
    html = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No historical declines identified.</td></tr>';
  } else {
    episodes.forEach((ep, idx) => {
      const recBadge = ep.isOngoing
        ? '<span class="badge-ongoing">In Progress</span>'
        : `<span class="badge-recovered">${ep.recoveryDate}</span>`;

      html += `
        <tr>
          <td style="font-weight: 700;">#${idx + 1}</td>
          <td>${ep.peakDate}</td>
          <td>${ep.troughDate}</td>
          <td><span class="depth-pill">${formatPct(ep.depth)}</span></td>
          <td>${recBadge}</td>
          <td>${ep.totalMonths} mos</td>
        </tr>
      `;
    });
  }

  elements.crashTableBody.innerHTML = html;
}

function renderHeatmapTable() {
  const matrix = state.analysis.heatmapMatrix;
  let html = '';

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function getHeatClass(val) {
    if (val === null) return 'heat-neutral';
    if (val >= 0.06) return 'heat-pos-high';
    if (val >= 0.03) return 'heat-pos-mid';
    if (val > 0.0001) return 'heat-pos-low';
    if (val <= -0.06) return 'heat-neg-high';
    if (val <= -0.03) return 'heat-neg-mid';
    if (val < -0.0001) return 'heat-neg-low';
    return 'heat-neutral';
  }

  matrix.forEach(row => {
    html += `<tr><td class="year-col">${row.year}</td>`;

    row.months.forEach(m => {
      const heatClass = getHeatClass(m);
      const text = m !== null ? `${(m * 100).toFixed(1)}%` : '—';
      html += `<td class="${heatClass}">${text}</td>`;
    });

    const annualClass = getHeatClass(row.annualReturn);
    html += `<td class="total-col ${annualClass}">${formatPct(row.annualReturn)}</td></tr>`;
  });

  elements.heatmapTableBody.innerHTML = html;
}

function renderInstitutionalMatrix() {
  const a = state.analysis;
  if (!a || !a.profile) return;

  const fRisk = a.profile.fundRisk;
  const bRisk = a.profile.benchRisk;
  const capm = a.profile.capm;
  const risk = a.riskMetrics;
  const annReturns = a.annualReturns;

  // Best / Worst Years
  const validAnn = annReturns.filter(r => r.fundReturn !== null);
  const bestYear = validAnn.length > 0 ? Math.max(...validAnn.map(r => r.fundReturn)) : 0;
  const worstYear = validAnn.length > 0 ? Math.min(...validAnn.map(r => r.fundReturn)) : 0;

  // Quad 1: Return & Compounding
  elements.mCagr.textContent = formatPct(fRisk.cagr);
  elements.mBenchCagr.textContent = formatPct(bRisk.cagr);
  elements.mArithMean.textContent = formatPct(fRisk.annualArithmeticMean);
  elements.mBestYear.textContent = formatPct(bestYear);
  elements.mWorstYear.textContent = formatPct(worstYear);

  // Quad 2: Risk & Volatility
  elements.mVol.textContent = formatPct(fRisk.annualVolatility);
  elements.mDownsideDev.textContent = formatPct(fRisk.downsideDeviation);
  elements.mMaxDd.textContent = formatPct(fRisk.maxDrawdown);
  elements.mUlcer.textContent = formatPct(fRisk.ulcerIndex);
  elements.mVar.textContent = `-${formatPct(risk.varMonthly)}`;
  elements.mCvar.textContent = `-${formatPct(risk.cvarMonthly)}`;

  // Quad 3: Risk-Adjusted Efficiency
  elements.mSharpe.textContent = fRisk.sharpeRatio.toFixed(2);
  elements.mSortino.textContent = fRisk.sortinoRatio.toFixed(2);
  elements.mTreynor.textContent = fRisk.treynorRatio.toFixed(4);
  elements.mCalmar.textContent = fRisk.calmarRatio.toFixed(2);
  elements.mMartin.textContent = fRisk.martinRatio.toFixed(2);
  elements.mOmega.textContent = fRisk.omegaRatio.toFixed(2);
  elements.mGainPain.textContent = fRisk.gainToPainRatio.toFixed(2);
  elements.mMSquared.textContent = formatPct(a.profile.mSquared);

  // Quad 4: Benchmark Relative (CAPM)
  elements.mAlpha.textContent = `${capm.alpha >= 0 ? '+' : ''}${formatPct(capm.alpha)}`;
  elements.mBeta.textContent = capm.beta.toFixed(2);
  elements.mRSquared.textContent = capm.rSquared.toFixed(2);
  elements.mTrackingError.textContent = formatPct(capm.trackingError);
  elements.mInfoRatio.textContent = a.profile.informationRatio.toFixed(2);
  elements.mUpCapture.textContent = `${(a.profile.dualBeta.upCapture * 100).toFixed(1)}%`;
  elements.mDownCapture.textContent = `${(a.profile.dualBeta.downCapture * 100).toFixed(1)}%`;
  elements.mCaptureRatio.textContent = a.profile.dualBeta.captureRatio.toFixed(2);
}

function computeAndDrawRolling() {
  const a = state.analysis;
  if (!a) return;

  const rolling = calculateRollingMetrics(
    a.fundMonthlyReturns,
    a.benchMonthlyReturns,
    state.rollingWindowMonths,
    state.annualRf
  );
  a.rollingStats = rolling;

  elements.rollingWinRatePill.textContent = `${rolling.winRate}%`;
  elements.rollingComparisonsText.innerHTML = `Outperformed <strong>${state.benchTicker}</strong> in <strong>${rolling.outperformedWindows}</strong> of <strong>${rolling.totalWindows}</strong> rolling ${state.rollingWindowMonths}-month windows.`;

  drawRollingChart();
}

function drawAllCharts() {
  drawGrowthChart();
  drawAnnualChart();
  drawDrawdownChart();
  drawRollingChart();
}

/**
 * CHART 1: Cumulative Growth of $10,000 Canvas Drawing
 */
function drawGrowthChart() {
  const canvas = elements.growthCanvas;
  if (!canvas || !state.analysis) return;

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

  const series = state.analysis.growthSeries;
  if (series.length < 2) return;

  const isLog = state.growthScale === 'log';

  // Value bounds
  let minVal = Infinity;
  let maxVal = -Infinity;

  series.forEach(pt => {
    if (pt.fundGrowth > maxVal) maxVal = pt.fundGrowth;
    if (pt.fundGrowth < minVal) minVal = pt.fundGrowth;
    if (pt.benchGrowth !== null) {
      if (pt.benchGrowth > maxVal) maxVal = pt.benchGrowth;
      if (pt.benchGrowth < minVal) minVal = pt.benchGrowth;
    }
  });

  minVal = Math.max(1000, minVal * 0.95);
  maxVal = maxVal * 1.05;

  function getY(val) {
    if (isLog) {
      const logMin = Math.log10(minVal);
      const logMax = Math.log10(maxVal);
      const logVal = Math.log10(Math.max(1, val));
      const ratio = (logVal - logMin) / (logMax - logMin);
      return pad.top + plotH * (1 - ratio);
    } else {
      const ratio = (val - minVal) / (maxVal - minVal);
      return pad.top + plotH * (1 - ratio);
    }
  }

  function getX(i) {
    return pad.left + (i / (series.length - 1)) * plotW;
  }

  // Draw Grid Lines & Y Labels
  const gridCount = 5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = (window.CHART_FONTS && window.CHART_FONTS.xs) || '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let g = 0; g <= gridCount; g++) {
    let val;
    if (isLog) {
      const logMin = Math.log10(minVal);
      const logMax = Math.log10(maxVal);
      val = Math.pow(10, logMin + (g / gridCount) * (logMax - logMin));
    } else {
      val = minVal + (g / gridCount) * (maxVal - minVal);
    }
    const y = getY(val);

    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();

    ctx.fillText(`$${Math.round(val).toLocaleString()}`, pad.left - 10, y);
  }

  // Draw Benchmark Line (Dashed Slate)
  if (series[0].benchGrowth !== null) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;

    series.forEach((pt, i) => {
      const x = getX(i);
      const y = getY(pt.benchGrowth);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // Draw Fund Area Fill & Solid Line (Cyan)
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  grad.addColorStop(0, 'rgba(45, 212, 191, 0.28)');
  grad.addColorStop(1, 'rgba(45, 212, 191, 0.01)');

  ctx.beginPath();
  ctx.moveTo(getX(0), pad.top + plotH);
  series.forEach((pt, i) => {
    ctx.lineTo(getX(i), getY(pt.fundGrowth));
  });
  ctx.lineTo(getX(series.length - 1), pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2.5;
  series.forEach((pt, i) => {
    const x = getX(i);
    const y = getY(pt.fundGrowth);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw X-Axis Ticks (Dates)
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = Math.max(1, Math.floor(series.length / 7));
  for (let i = 0; i < series.length; i += step) {
    const x = getX(i);
    ctx.fillText(series[i].date, x, pad.top + plotH + 8);
  }

  // Bind Mousemove Tooltip
  setupCanvasHover(canvas, elements.growthTooltip, (mouse) => {
    if (mouse.x < pad.left || mouse.x > pad.left + plotW) return null;
    const ratio = (mouse.x - pad.left) / plotW;
    const idx = Math.min(series.length - 1, Math.max(0, Math.round(ratio * (series.length - 1))));
    const pt = series[idx];

    return {
      x: getX(idx),
      y: getY(pt.fundGrowth),
      html: `
        <div class="canvas-tooltip-date">${pt.date}</div>
        <div class="canvas-tooltip-row">
          <span><span class="canvas-tooltip-dot" style="background: #2dd4bf;"></span>${state.fundTicker}:</span>
          <strong>$${Math.round(pt.fundGrowth).toLocaleString()}</strong>
        </div>
        ${pt.benchGrowth !== null ? `
        <div class="canvas-tooltip-row" style="color: #94a3b8;">
          <span><span class="canvas-tooltip-dot" style="background: #64748b;"></span>${state.benchTicker}:</span>
          <strong>$${Math.round(pt.benchGrowth).toLocaleString()}</strong>
        </div>` : ''}
      `
    };
  }, 'growth');
}

/**
 * CHART 2: Annual Calendar Returns Bar Chart
 */
function drawAnnualChart() {
  const canvas = elements.annualCanvas;
  if (!canvas || !state.analysis) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 30, right: 30, bottom: 40, left: 65 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const annuals = state.analysis.annualReturns;
  if (annuals.length === 0) return;

  // Max and Min Return Bounds
  let minRet = -0.1;
  let maxRet = 0.2;

  annuals.forEach(a => {
    if (a.fundReturn > maxRet) maxRet = a.fundReturn;
    if (a.fundReturn < minRet) minRet = a.fundReturn;
    if (a.benchReturn !== null) {
      if (a.benchReturn > maxRet) maxRet = a.benchReturn;
      if (a.benchReturn < minRet) minRet = a.benchReturn;
    }
  });

  maxRet = Math.max(0.1, maxRet * 1.15);
  minRet = Math.min(-0.05, minRet * 1.15);

  const zeroY = pad.top + plotH * (maxRet / (maxRet - minRet));

  function getY(ret) {
    return pad.top + plotH * ((maxRet - ret) / (maxRet - minRet));
  }

  // Draw Horizontal Zero Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(pad.left + plotW, zeroY);
  ctx.stroke();

  // Draw Grid Lines & Y Axis
  const gridSteps = 5;
  ctx.fillStyle = '#94a3b8';
  ctx.font = (window.CHART_FONTS && window.CHART_FONTS.xs) || '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';

  for (let i = 0; i <= gridSteps; i++) {
    const val = minRet + (i / gridSteps) * (maxRet - minRet);
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillText(`${(val * 100).toFixed(0)}%`, pad.left - 8, y);
  }

  // Draw Bars
  const barSlotW = plotW / annuals.length;
  const barW = Math.max(3, barSlotW * 0.35);

  annuals.forEach((yr, i) => {
    const slotX = pad.left + i * barSlotW;
    const fundX = slotX + barSlotW * 0.15;
    const benchX = fundX + barW + 2;

    // Fund Bar
    const fundY = getY(yr.fundReturn);
    const fundH = Math.abs(fundY - zeroY);
    ctx.fillStyle = yr.fundReturn >= 0 ? '#10b981' : '#ef4444';
    ctx.fillRect(fundX, Math.min(fundY, zeroY), barW, Math.max(2, fundH));

    // Bench Bar
    if (yr.benchReturn !== null) {
      const benchY = getY(yr.benchReturn);
      const benchH = Math.abs(benchY - zeroY);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(benchX, Math.min(benchY, zeroY), barW, Math.max(2, benchH));
    }

    // X Axis Year Label
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(yr.year, slotX + barSlotW * 0.5, pad.top + plotH + 8);
  });

  // Tooltip
  setupCanvasHover(canvas, elements.annualTooltip, (mouse) => {
    if (mouse.x < pad.left || mouse.x > pad.left + plotW) return null;
    const idx = Math.floor((mouse.x - pad.left) / barSlotW);
    if (idx < 0 || idx >= annuals.length) return null;
    const yr = annuals[idx];

    return {
      x: pad.left + idx * barSlotW + barSlotW * 0.5,
      y: getY(yr.fundReturn),
      html: `
        <div class="canvas-tooltip-date">Calendar Year ${yr.year}</div>
        <div class="canvas-tooltip-row">
          <span>${state.fundTicker}:</span>
          <strong style="color: ${yr.fundReturn >= 0 ? '#10b981' : '#ef4444'};">${formatPct(yr.fundReturn)}</strong>
        </div>
        ${yr.benchReturn !== null ? `
        <div class="canvas-tooltip-row" style="color: #94a3b8;">
          <span>${state.benchTicker}:</span>
          <strong>${formatPct(yr.benchReturn)}</strong>
        </div>
        <div class="canvas-tooltip-row" style="margin-top: 0.2rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.2rem;">
          <span>Excess Return:</span>
          <strong style="color: ${yr.excessReturn >= 0 ? '#38bdf8' : '#f87171'};">${yr.excessReturn >= 0 ? '+' : ''}${formatPct(yr.excessReturn)}</strong>
        </div>` : ''}
      `
    };
  }, 'annual');
}

/**
 * CHART 3: Underwater Drawdown Area Chart
 */
function drawDrawdownChart() {
  const canvas = elements.drawdownCanvas;
  if (!canvas || !state.analysis) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 25, right: 25, bottom: 35, left: 55 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const timeline = state.analysis.drawdownResult.timeline;
  if (timeline.length < 2) return;

  const maxDd = Math.min(-0.05, state.analysis.drawdownResult.maxDrawdown * 1.15);

  function getY(dd) {
    // dd is <= 0. 0 is top (pad.top), maxDd is bottom
    const ratio = dd / maxDd;
    return pad.top + plotH * ratio;
  }

  function getX(i) {
    return pad.left + (i / (timeline.length - 1)) * plotW;
  }

  // Draw 0% Top Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left + plotW, pad.top);
  ctx.stroke();

  // Grid Lines
  const steps = 4;
  ctx.fillStyle = '#94a3b8';
  ctx.font = (window.CHART_FONTS && window.CHART_FONTS.xs) || '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';

  for (let s = 1; s <= steps; s++) {
    const val = (s / steps) * maxDd;
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillText(`${(val * 100).toFixed(0)}%`, pad.left - 6, y);
  }

  // Red Filled Area
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0.55)');

  ctx.beginPath();
  ctx.moveTo(getX(0), pad.top);
  timeline.forEach((pt, i) => {
    ctx.lineTo(getX(i), getY(pt.drawdown));
  });
  ctx.lineTo(getX(timeline.length - 1), pad.top);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Red Contour Line
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  timeline.forEach((pt, i) => {
    const x = getX(i);
    const y = getY(pt.drawdown);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // X Axis Ticks
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tickStep = Math.max(1, Math.floor(timeline.length / 5));
  for (let i = 0; i < timeline.length; i += tickStep) {
    ctx.fillText(timeline[i].date, getX(i), pad.top + plotH + 8);
  }

  // Tooltip
  setupCanvasHover(canvas, elements.drawdownTooltip, (mouse) => {
    if (mouse.x < pad.left || mouse.x > pad.left + plotW) return null;
    const idx = Math.min(timeline.length - 1, Math.max(0, Math.round(((mouse.x - pad.left) / plotW) * (timeline.length - 1))));
    const pt = timeline[idx];

    return {
      x: getX(idx),
      y: getY(pt.drawdown),
      html: `
        <div class="canvas-tooltip-date">${pt.date}</div>
        <div class="canvas-tooltip-row">
          <span>Drawdown from Peak:</span>
          <strong style="color: #ef4444;">${formatPct(pt.drawdown)}</strong>
        </div>
      `
    };
  }, 'drawdown');
}

/**
 * CHART 4: Rolling Period Returns & Sharpe Chart
 */
function drawRollingChart() {
  const canvas = elements.rollingCanvas;
  if (!canvas || !state.analysis || !state.analysis.rollingStats) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 30, right: 35, bottom: 40, left: 65 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const windows = state.analysis.rollingStats.windows;
  if (windows.length < 2) return;

  let minCagr = -0.05;
  let maxCagr = 0.25;

  windows.forEach(w => {
    if (w.fundCagr > maxCagr) maxCagr = w.fundCagr;
    if (w.fundCagr < minCagr) minCagr = w.fundCagr;
    if (w.benchCagr !== null) {
      if (w.benchCagr > maxCagr) maxCagr = w.benchCagr;
      if (w.benchCagr < minCagr) minCagr = w.benchCagr;
    }
  });

  maxCagr = Math.max(0.1, maxCagr * 1.15);
  minCagr = Math.min(-0.05, minCagr * 1.15);

  function getY(cagr) {
    return pad.top + plotH * ((maxCagr - cagr) / (maxCagr - minCagr));
  }

  function getX(i) {
    return pad.left + (i / (windows.length - 1)) * plotW;
  }

  const zeroY = getY(0);

  // Horizontal Zero Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(pad.left + plotW, zeroY);
  ctx.stroke();

  // Grid lines
  const steps = 5;
  ctx.fillStyle = '#94a3b8';
  ctx.font = (window.CHART_FONTS && window.CHART_FONTS.xs) || '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';

  for (let s = 0; s <= steps; s++) {
    const val = minCagr + (s / steps) * (maxCagr - minCagr);
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillText(`${(val * 100).toFixed(0)}%`, pad.left - 8, y);
  }

  // Draw Benchmark Rolling Line (Purple / Dashed)
  if (windows[0].benchCagr !== null) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    windows.forEach((pt, i) => {
      const x = getX(i);
      const y = getY(pt.benchCagr);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // Draw Fund Rolling Line (Cyan)
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  windows.forEach((pt, i) => {
    const x = getX(i);
    const y = getY(pt.fundCagr);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // X Axis Ticks
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tickStep = Math.max(1, Math.floor(windows.length / 6));
  for (let i = 0; i < windows.length; i += tickStep) {
    ctx.fillText(windows[i].date, getX(i), pad.top + plotH + 8);
  }

  // Tooltip
  setupCanvasHover(canvas, elements.rollingTooltip, (mouse) => {
    if (mouse.x < pad.left || mouse.x > pad.left + plotW) return null;
    const idx = Math.min(windows.length - 1, Math.max(0, Math.round(((mouse.x - pad.left) / plotW) * (windows.length - 1))));
    const pt = windows[idx];

    return {
      x: getX(idx),
      y: getY(pt.fundCagr),
      html: `
        <div class="canvas-tooltip-date">${pt.date} (${state.rollingWindowMonths}M Ending)</div>
        <div class="canvas-tooltip-row">
          <span><span class="canvas-tooltip-dot" style="background: #2dd4bf;"></span>${state.fundTicker} Rolling CAGR:</span>
          <strong>${formatPct(pt.fundCagr)}</strong>
        </div>
        ${pt.benchCagr !== null ? `
        <div class="canvas-tooltip-row" style="color: #94a3b8;">
          <span><span class="canvas-tooltip-dot" style="background: #a855f7;"></span>${state.benchTicker} Rolling CAGR:</span>
          <strong>${formatPct(pt.benchCagr)}</strong>
        </div>` : ''}
        <div class="canvas-tooltip-row" style="margin-top: 0.2rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.2rem;">
          <span>Rolling Sharpe:</span>
          <strong>${pt.fundSharpe.toFixed(2)}</strong>
        </div>
      `
    };
  }, 'rolling');
}

/**
 * Universal Canvas Hover Handler with AbortController pattern
 */
function setupCanvasHover(canvas, tooltipEl, pointProvider, controllerKey) {
  if (canvasControllers[controllerKey]) {
    canvasControllers[controllerKey].abort();
  }
  canvasControllers[controllerKey] = new AbortController();
  const signal = canvasControllers[controllerKey].signal;

  const onMouseMove = rafThrottle((e) => {
    const rect = canvas.getBoundingClientRect();
    const mouse = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const pt = pointProvider(mouse);
    if (pt) {
      tooltipEl.innerHTML = pt.html;
      tooltipEl.style.display = 'block';

      // Keep within bounds
      const tipRect = tooltipEl.getBoundingClientRect();
      let left = pt.x + 12;
      let top = pt.y - tipRect.height / 2;

      if (left + tipRect.width > rect.width) {
        left = pt.x - tipRect.width - 12;
      }
      if (top < 5) top = 5;
      if (top + tipRect.height > rect.height - 5) {
        top = rect.height - tipRect.height - 5;
      }

      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
    } else {
      tooltipEl.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', onMouseMove, { signal });
  canvas.addEventListener('mouseleave', () => {
    tooltipEl.style.display = 'none';
  }, { signal });
}

/**
 * Exports comprehensive performance report to CSV
 */
function exportPerformanceReportCSV() {
  const a = state.analysis;
  if (!a || !a.profile) return;

  const fRisk = a.profile.fundRisk;
  const bRisk = a.profile.benchRisk;
  const capm = a.profile.capm;

  let csv = '=== ASSET ANALYTICS PERFORMANCE REPORT ===\n';
  csv += `Target Fund,${state.fundTicker} (${state.fundObj.name})\n`;
  csv += `Benchmark,${state.benchTicker} (${state.benchObj.name})\n`;
  csv += `Time Horizon,${state.timeHorizon.toUpperCase()}\n`;
  csv += `Reinvestment (DRIP),${state.useDRIP ? 'YES' : 'NO'}\n`;
  csv += `Generated Date,${new Date().toISOString().substring(0, 10)}\n\n`;

  csv += '--- KEY RISK & RETURN METRICS ---\n';
  csv += 'Metric,Target Fund,Benchmark\n';
  csv += `CAGR,${(fRisk.cagr * 100).toFixed(2)}%,${(bRisk.cagr * 100).toFixed(2)}%\n`;
  csv += `Annual Volatility,${(fRisk.annualVolatility * 100).toFixed(2)}%,${(bRisk.annualVolatility * 100).toFixed(2)}%\n`;
  csv += `Max Drawdown,${(fRisk.maxDrawdown * 100).toFixed(2)}%,${(bRisk.maxDrawdown * 100).toFixed(2)}%\n`;
  csv += `Sharpe Ratio,${fRisk.sharpeRatio.toFixed(2)},${bRisk.sharpeRatio.toFixed(2)}\n`;
  csv += `Sortino Ratio,${fRisk.sortinoRatio.toFixed(2)},${bRisk.sortinoRatio.toFixed(2)}\n`;
  csv += `Treynor Ratio,${fRisk.treynorRatio.toFixed(4)},N/A\n`;
  csv += `Calmar Ratio,${fRisk.calmarRatio.toFixed(2)},${bRisk.calmarRatio.toFixed(2)}\n`;
  csv += `Martin Ratio (UPI),${fRisk.martinRatio.toFixed(2)},${bRisk.martinRatio.toFixed(2)}\n`;
  csv += `Jensen's Alpha,${(capm.alpha * 100).toFixed(2)}%,N/A\n`;
  csv += `Beta,${capm.beta.toFixed(2)},1.00\n`;
  csv += `R-Squared,${capm.rSquared.toFixed(2)},1.00\n\n`;

  csv += '--- TOP HISTORICAL CRASHES ---\n';
  csv += 'Rank,Peak Date,Trough Date,Recovery Date,Depth %,Total Duration (Months)\n';
  a.drawdownResult.topEpisodes.forEach((ep, i) => {
    csv += `${i + 1},${ep.peakDate},${ep.troughDate},${ep.recoveryDate || 'In Progress'},${(ep.depth * 100).toFixed(2)}%,${ep.totalMonths}\n`;
  });
  csv += '\n';

  csv += '--- CALENDAR ANNUAL RETURNS ---\n';
  csv += 'Year,Target Fund Return,Benchmark Return,Excess Return\n';
  a.annualReturns.forEach(y => {
    const fRet = (y.fundReturn * 100).toFixed(2) + '%';
    const bRet = y.benchReturn !== null ? (y.benchReturn * 100).toFixed(2) + '%' : 'N/A';
    const exRet = y.excessReturn !== null ? (y.excessReturn * 100).toFixed(2) + '%' : 'N/A';
    csv += `${y.year},${fRet},${bRet},${exRet}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `fund_performance_${state.fundTicker}_vs_${state.benchTicker}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
