/**
 * Asset Analytics Studio UI Controller
 * Manages reactive UI state, Canvas charts, underwater drawdown tables,
 * monthly return heatmaps, rolling metric diagnostics, searchable asset selector modal,
 * multi-factor fund screening, weighted performance rankings, and asset correlation matrix studio.
 */

import {
  initSessionFunds,
  getAllFundsSync,
  importFilesToSession,
  resetSessionToDefault,
  subscribeSessionFunds
} from '../js/session-funds.js';
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
import {
  calculateTrailingReturns,
  screenAndProfileFunds,
  filterFundProfiles,
  rankFundProfiles,
  METRIC_DIRECTION,
  SUB_CATEGORIES_BY_ASSET_CLASS
} from './screener-engine.js';
import {
  calculatePearsonCorrelation,
  calculateCovariance,
  alignMultiAssetReturns,
  computeCorrelationMatrix,
  calculateRollingCorrelation
} from './correlation-engine.js';
import {
  calculateSampleAutocorrelation,
  calculateRollingAutocorrelation,
  alignTwoAssetPrices,
  runCointegrationAnalysis
} from './timeseries-engine.js';
import { formatCurrency, rafThrottle } from '../js/chart-utils.js';
import { formatPct } from '../js/formatting.js';

// App Reactive State
const state = {
  activeTab: 'performance', // 'performance' | 'screener' | 'rankings' | 'correlations' | 'autocorr' | 'cointegration'

  // Fund Performance Analyzer State
  fundTicker: 'QQQ',
  benchTicker: 'VOO',
  timeHorizon: 'all', // 'all' | '10y' | '5y' | '3y' | '1y'
  useDRIP: true,
  viewMode: 'simple', // 'simple' | 'quant'
  growthScale: 'linear', // 'linear' | 'log'
  rollingWindowMonths: 36, // 12 | 36 | 60
  annualRf: 0.03, // 3% risk-free rate

  // Screener State
  screenerBenchmark: 'VOO',
  screenerFundType: 'all', // 'all' | 'ETF' | 'Mutual Fund' | 'Closed-End Fund'
  screenerAssetClass: 'all',
  screenerSubCategory: 'all',
  screenerExpenseRatio: 'all',
  screenerMinHistory: 0,
  screenerMinSharpe: 'all',
  screenerSearch: '',
  screenerSortCol: 'cagr',
  screenerSortAsc: false,
  screenerPage: 1,
  screenerPageSize: 15,
  screenerFilteredProfiles: [],

  // Rankings State
  rankingsMetric: 'sharpe',
  rankingsBenchmark: 'VOO',
  rankingsAssetClass: 'all',
  rankingsOrderAsc: false,
  rankingsRankedProfiles: [],

  // Correlation Studio State
  corrTickers: new Set(['VOO', 'QQQ', 'SCHD', 'BND', 'SPY']),
  corrHorizon: 'all',
  corrWindowMonths: 36,
  corrFocusPairA: 'QQQ',
  corrFocusPairB: 'VOO',
  corrResult: null,
  corrRolling: null,

  // Autocorrelation Lab State
  autocorrTicker: 'TSLA',
  autocorrRollPeriod: 24, // 12 | 24 | 36 | 60
  autocorrResult: null,

  // Cointegration Analysis State
  cointDepTicker: 'EWA',
  cointIndepTicker: 'EWC',
  cointPriceBasis: 'monthly', // 'monthly' | 'drip'
  cointAdfLags: 1,
  cointResult: null,

  // Cached calculation results
  analysis: null,
  fundObj: null,
  benchObj: null
};

// Searchable Modal State
let modalMode = 'target'; // 'target' | 'benchmark' | 'autocorr' | 'coint-dep' | 'coint-indep'
let activeCategoryFilter = 'all'; // 'all' | 'preset' | 'custom'

// DOM Elements Cache
let elements = {};

// Canvas Controllers for event cleanup
const canvasControllers = {
  growth: null,
  annual: null,
  drawdown: null,
  rolling: null,
  correlation: null,
  autocorr1: null,
  autocorr3: null,
  autocorr12: null,
  cointegration: null
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheDOMElements();
  bindEvents();

  // Initialize IndexedDB session repository
  await initSessionFunds();

  updatePickerButtons();
  updateAutocorrPickerButton();
  updateCointPickerButtons();
  updateCategoryCounts();
  updateSubCategoryDropdown();
  renderCorrelationChips();
  updateViewModeUI();
  runAnalysis();

  // Subscribe to changes in the session fund repository
  subscribeSessionFunds(() => {
    updateCategoryCounts();
    updatePickerButtons();
    updateAutocorrPickerButton();
    updateCointPickerButtons();
    if (elements.assetModalOverlay && !elements.assetModalOverlay.classList.contains('hidden')) {
      renderModalAssetList();
    }
    if (state.activeTab === 'screener') {
      runScreener();
    } else if (state.activeTab === 'rankings') {
      runRankings();
    } else if (state.activeTab === 'correlations') {
      renderCorrelationChips();
      runCorrelationAnalysis();
    } else if (state.activeTab === 'autocorr') {
      runAutocorrelationAnalysis();
    } else if (state.activeTab === 'cointegration') {
      runCointegrationAnalysisUI();
    }
  });

  // Handle window resizing with debounce
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.activeTab === 'performance' && state.analysis) {
        drawAllCharts();
      } else if (state.activeTab === 'correlations' && state.corrRolling) {
        drawCorrelationChart();
      } else if (state.activeTab === 'autocorr' && state.autocorrResult) {
        drawAllAutocorrCharts();
      } else if (state.activeTab === 'cointegration' && state.cointResult) {
        drawCointegrationSpreadChart();
      }
    }, 200);
  });
}

function cacheDOMElements() {
  elements = {
    // Studio Sub-Tabs
    tabBtnPerformance: document.getElementById('tab-btn-performance'),
    tabBtnScreener: document.getElementById('tab-btn-screener'),
    tabBtnRankings: document.getElementById('tab-btn-rankings'),
    tabBtnCorrelations: document.getElementById('tab-btn-correlations'),
    tabBtnAutocorr: document.getElementById('tab-btn-autocorr'),
    tabBtnCointegration: document.getElementById('tab-btn-cointegration'),
    tabPerformance: document.getElementById('tab-performance'),
    tabScreener: document.getElementById('tab-screener'),
    tabRankings: document.getElementById('tab-rankings'),
    tabCorrelations: document.getElementById('tab-correlations'),
    tabAutocorr: document.getElementById('tab-autocorr'),
    tabCointegration: document.getElementById('tab-cointegration'),
    performanceControlsBar: document.getElementById('performance-controls-bar'),

    // Modal Triggers & Labels
    btnOpenTargetModal: document.getElementById('btn-open-target-modal'),
    btnOpenBenchModal: document.getElementById('btn-open-bench-modal'),
    targetPickerTicker: document.getElementById('target-picker-ticker'),
    targetPickerName: document.getElementById('target-picker-name'),
    benchPickerTicker: document.getElementById('bench-picker-ticker'),
    benchPickerName: document.getElementById('bench-picker-name'),

    // Searchable Modal
    assetModalOverlay: document.getElementById('asset-modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    modalTargetTypeBadge: document.getElementById('modal-target-type-badge'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    modalSearchInput: document.getElementById('modal-search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    modalAssetList: document.getElementById('modal-asset-list'),
    countAll: document.getElementById('count-all'),
    countPreset: document.getElementById('count-preset'),
    countCustom: document.getElementById('count-custom'),
    btnResetSessionFunds: document.getElementById('btn-reset-session-funds'),
    presetChips: document.querySelectorAll('.preset-chip'),
    catTabs: document.querySelectorAll('.cat-tab'),
    modalDropzone: document.getElementById('modal-dropzone'),
    modalFileInput: document.getElementById('modal-file-input'),
    btnBrowseFiles: document.getElementById('btn-browse-files'),
    dropzoneProgress: document.getElementById('dropzone-progress'),
    dropzoneProgressBar: document.getElementById('dropzone-progress-bar'),
    dropzoneProgressText: document.getElementById('dropzone-progress-text'),

    // Performance Tab Controls
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
    mCaptureRatio: document.getElementById('m-capture-ratio'),

    // Screener Elements
    screenerFundType: document.getElementById('screener-fund-type'),
    screenerAssetClass: document.getElementById('screener-asset-class'),
    screenerSubCategory: document.getElementById('screener-sub-category'),
    screenerExpenseRatio: document.getElementById('screener-expense-ratio'),
    screenerHistory: document.getElementById('screener-history'),
    screenerBenchmark: document.getElementById('screener-benchmark'),
    screenerMinSharpe: document.getElementById('screener-min-sharpe'),
    screenerSearchInput: document.getElementById('screener-search-input'),
    screenerStatusText: document.getElementById('screener-status-text'),
    btnResetScreenerFilters: document.getElementById('btn-reset-screener-filters'),
    btnExportScreenerCsv: document.getElementById('btn-export-screener-csv'),
    screenerEntriesSelect: document.getElementById('screener-entries-select'),
    screenerTable: document.getElementById('screener-results-table'),
    screenerTableBody: document.getElementById('screener-table-body'),
    screenerPaginationInfo: document.getElementById('screener-pagination-info'),
    btnScreenerPrev: document.getElementById('btn-screener-prev'),
    btnScreenerNext: document.getElementById('btn-screener-next'),
    screenerPageDisplay: document.getElementById('screener-page-display'),

    // Rankings Elements
    rankingsMetricSelect: document.getElementById('rankings-metric-select'),
    rankingsBenchmarkSelect: document.getElementById('rankings-benchmark-select'),
    rankingsAssetClass: document.getElementById('rankings-asset-class'),
    rankingsOrderSelect: document.getElementById('rankings-order-select'),
    rankingsStatusText: document.getElementById('rankings-status-text'),
    btnExportRankingsCsv: document.getElementById('btn-export-rankings-csv'),
    rankingsTable: document.getElementById('rankings-results-table'),
    rankingsTableBody: document.getElementById('rankings-table-body'),
    rankingsColMetricHeader: document.getElementById('rankings-col-metric-header'),

    // Correlation Elements
    corrUniverseChips: document.getElementById('corr-universe-chips'),
    btnCorrSelectCore: document.getElementById('btn-corr-select-core'),
    btnCorrSelectAll: document.getElementById('btn-corr-select-all'),
    btnCorrClearAll: document.getElementById('btn-corr-clear-all'),
    corrHorizonSelect: document.getElementById('corr-horizon-select'),
    corrWindowSelect: document.getElementById('corr-window-select'),
    corrFocusPairA: document.getElementById('corr-focus-pair-a'),
    corrFocusPairB: document.getElementById('corr-focus-pair-b'),
    corrStatusText: document.getElementById('corr-status-text'),
    btnExportCorrCsv: document.getElementById('btn-export-corr-csv'),
    corrResultsTable: document.getElementById('corr-results-table'),
    corrChartTitle: document.getElementById('corr-chart-title'),
    corrChartSubtitle: document.getElementById('corr-chart-subtitle'),
    corrLegendPair: document.getElementById('corr-legend-pair'),
    corrLegendText: document.getElementById('corr-legend-text'),
    corrCanvas: document.getElementById('correlation-canvas'),
    corrTooltip: document.getElementById('correlation-tooltip'),
    corrStatCurrent: document.getElementById('corr-stat-current'),
    corrStatMean: document.getElementById('corr-stat-mean'),
    corrStatMin: document.getElementById('corr-stat-min'),
    corrStatMax: document.getElementById('corr-stat-max'),

    // Autocorrelation Lab Elements
    btnOpenAutocorrModal: document.getElementById('btn-open-autocorr-modal'),
    autocorrPickerTicker: document.getElementById('autocorr-picker-ticker'),
    autocorrPickerName: document.getElementById('autocorr-picker-name'),
    autocorrRollPeriod: document.getElementById('autocorr-roll-period'),
    autocorrStatusText: document.getElementById('autocorr-status-text'),
    btnExportAutocorrCsv: document.getElementById('btn-export-autocorr-csv'),
    autocorrDateRangeText: document.getElementById('autocorr-date-range-text'),
    autocorrTitleLag1: document.getElementById('autocorr-title-lag1'),
    autocorrLag1Current: document.getElementById('autocorr-lag1-current'),
    autocorrLag1Mean: document.getElementById('autocorr-lag1-mean'),
    autocorrLag1Min: document.getElementById('autocorr-lag1-min'),
    autocorrLag1Max: document.getElementById('autocorr-lag1-max'),
    canvasAutocorrLag1: document.getElementById('canvas-autocorr-lag1'),
    tooltipAutocorrLag1: document.getElementById('tooltip-autocorr-lag1'),
    autocorrTitleLag3: document.getElementById('autocorr-title-lag3'),
    autocorrLag3Current: document.getElementById('autocorr-lag3-current'),
    autocorrLag3Mean: document.getElementById('autocorr-lag3-mean'),
    autocorrLag3Min: document.getElementById('autocorr-lag3-min'),
    autocorrLag3Max: document.getElementById('autocorr-lag3-max'),
    canvasAutocorrLag3: document.getElementById('canvas-autocorr-lag3'),
    tooltipAutocorrLag3: document.getElementById('tooltip-autocorr-lag3'),
    autocorrTitleLag12: document.getElementById('autocorr-title-lag12'),
    autocorrLag12Current: document.getElementById('autocorr-lag12-current'),
    autocorrLag12Mean: document.getElementById('autocorr-lag12-mean'),
    autocorrLag12Min: document.getElementById('autocorr-lag12-min'),
    autocorrLag12Max: document.getElementById('autocorr-lag12-max'),
    canvasAutocorrLag12: document.getElementById('canvas-autocorr-lag12'),
    tooltipAutocorrLag12: document.getElementById('tooltip-autocorr-lag12'),

    // Cointegration Elements
    btnOpenCointDepModal: document.getElementById('btn-open-coint-dep-modal'),
    cointDepTicker: document.getElementById('coint-dep-ticker'),
    cointDepName: document.getElementById('coint-dep-name'),
    btnOpenCointIndepModal: document.getElementById('btn-open-coint-indep-modal'),
    cointIndepTicker: document.getElementById('coint-indep-ticker'),
    cointIndepName: document.getElementById('coint-indep-name'),
    cointPricesSelect: document.getElementById('coint-prices-select'),
    cointLagSelect: document.getElementById('coint-lag-select'),
    btnRunCointegration: document.getElementById('btn-run-cointegration'),
    btnExportCointCsv: document.getElementById('btn-export-coint-csv'),
    cointStatusText: document.getElementById('coint-status-text'),
    cointConstraintNote: document.getElementById('coint-constraint-note'),
    cointResultsTable: document.getElementById('coint-results-table'),
    cointTableBody: document.getElementById('coint-table-body'),
    cointTableCaption: document.getElementById('coint-table-caption'),
    cointStatBeta: document.getElementById('coint-stat-beta'),
    cointStatAlpha: document.getElementById('coint-stat-alpha'),
    cointStatStd: document.getElementById('coint-stat-std'),
    cointStatHalflife: document.getElementById('coint-stat-halflife'),
    cointegrationCanvas: document.getElementById('cointegration-canvas'),
    cointegrationTooltip: document.getElementById('cointegration-tooltip')
  };
}

function updatePickerButtons() {
  const allFunds = getAllFundsSync();
  const fund = allFunds.find(f => f.ticker === state.fundTicker) || allFunds[0];
  const bench = allFunds.find(f => f.ticker === state.benchTicker) || allFunds.find(f => f.ticker === 'VOO');

  if (elements.targetPickerTicker && fund) {
    elements.targetPickerTicker.textContent = fund.ticker;
    elements.targetPickerName.textContent = fund.name;
  }
  if (elements.benchPickerTicker && bench) {
    elements.benchPickerTicker.textContent = bench.ticker;
    elements.benchPickerName.textContent = bench.name;
  }
}

function updateAutocorrPickerButton() {
  const allFunds = getAllFundsSync();
  const fund = allFunds.find(f => f.ticker === state.autocorrTicker) || allFunds[0];
  if (fund) {
    state.autocorrTicker = fund.ticker;
    if (elements.autocorrPickerTicker) elements.autocorrPickerTicker.textContent = fund.ticker;
    if (elements.autocorrPickerName) elements.autocorrPickerName.textContent = fund.name || fund.ticker;
  }
}

function updateCointPickerButtons() {
  const allFunds = getAllFundsSync();
  const dep = allFunds.find(f => f.ticker === state.cointDepTicker) || allFunds[0];
  const indep = allFunds.find(f => f.ticker === state.cointIndepTicker) || (allFunds[1] || allFunds[0]);
  if (dep) {
    state.cointDepTicker = dep.ticker;
    if (elements.cointDepTicker) elements.cointDepTicker.textContent = dep.ticker;
    if (elements.cointDepName) elements.cointDepName.textContent = dep.name || dep.ticker;
  }
  if (indep) {
    state.cointIndepTicker = indep.ticker;
    if (elements.cointIndepTicker) elements.cointIndepTicker.textContent = indep.ticker;
    if (elements.cointIndepName) elements.cointIndepName.textContent = indep.name || indep.ticker;
  }
}

function updateCategoryCounts() {
  const allFunds = getAllFundsSync();
  const presets = allFunds.filter(f => f.isPreset).length;
  const custom = allFunds.filter(f => !f.isPreset).length;

  if (elements.countAll) elements.countAll.textContent = allFunds.length;
  if (elements.countPreset) elements.countPreset.textContent = presets;
  if (elements.countCustom) elements.countCustom.textContent = custom;
}

function bindEvents() {
  // Studio Sub-Navigation Tabs
  if (elements.tabBtnPerformance) {
    elements.tabBtnPerformance.addEventListener('click', () => switchStudioTab('performance'));
  }
  if (elements.tabBtnScreener) {
    elements.tabBtnScreener.addEventListener('click', () => switchStudioTab('screener'));
  }
  if (elements.tabBtnRankings) {
    elements.tabBtnRankings.addEventListener('click', () => switchStudioTab('rankings'));
  }
  if (elements.tabBtnCorrelations) {
    elements.tabBtnCorrelations.addEventListener('click', () => switchStudioTab('correlations'));
  }
  if (elements.tabBtnAutocorr) {
    elements.tabBtnAutocorr.addEventListener('click', () => switchStudioTab('autocorr'));
  }
  if (elements.tabBtnCointegration) {
    elements.tabBtnCointegration.addEventListener('click', () => switchStudioTab('cointegration'));
  }

  // Modal Triggers
  if (elements.btnOpenTargetModal) {
    elements.btnOpenTargetModal.addEventListener('click', () => openAssetModal('target'));
  }
  if (elements.btnOpenBenchModal) {
    elements.btnOpenBenchModal.addEventListener('click', () => openAssetModal('benchmark'));
  }
  if (elements.btnOpenAutocorrModal) {
    elements.btnOpenAutocorrModal.addEventListener('click', () => openAssetModal('autocorr'));
  }
  if (elements.btnOpenCointDepModal) {
    elements.btnOpenCointDepModal.addEventListener('click', () => openAssetModal('coint-dep'));
  }
  if (elements.btnOpenCointIndepModal) {
    elements.btnOpenCointIndepModal.addEventListener('click', () => openAssetModal('coint-indep'));
  }

  // Modal Close Handlers
  if (elements.btnCloseModal) {
    elements.btnCloseModal.addEventListener('click', closeAssetModal);
  }
  if (elements.assetModalOverlay) {
    elements.assetModalOverlay.addEventListener('click', (e) => {
      if (e.target === elements.assetModalOverlay) {
        closeAssetModal();
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.assetModalOverlay && !elements.assetModalOverlay.classList.contains('hidden')) {
      closeAssetModal();
    }
  });

  // Modal Search Filter
  if (elements.modalSearchInput) {
    elements.modalSearchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (elements.btnClearSearch) {
        if (val.length > 0) {
          elements.btnClearSearch.classList.remove('hidden');
        } else {
          elements.btnClearSearch.classList.add('hidden');
        }
      }
      renderModalAssetList();
    });
  }

  if (elements.btnClearSearch) {
    elements.btnClearSearch.addEventListener('click', () => {
      if (elements.modalSearchInput) {
        elements.modalSearchInput.value = '';
        elements.modalSearchInput.focus();
      }
      elements.btnClearSearch.classList.add('hidden');
      renderModalAssetList();
    });
  }

  // Category Tabs Filter
  if (elements.catTabs) {
    elements.catTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        elements.catTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeCategoryFilter = tab.dataset.cat || 'all';
        renderModalAssetList();
      });
    });
  }

  // Quick Preset Chips
  if (elements.presetChips) {
    elements.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const ticker = chip.dataset.ticker;
        if (ticker) {
          selectFund(ticker);
        }
      });
    });
  }

  // Reset Session Funds Button
  if (elements.btnResetSessionFunds) {
    elements.btnResetSessionFunds.addEventListener('click', async () => {
      if (confirm('Reset temporary uploads and revert to the default 5 core benchmarks?')) {
        await resetSessionToDefault();

        const all = getAllFundsSync();
        if (!all.some(f => f.ticker === state.fundTicker)) {
          state.fundTicker = 'QQQ';
        }
        if (!all.some(f => f.ticker === state.benchTicker)) {
          state.benchTicker = 'VOO';
        }

        updatePickerButtons();
        updateCategoryCounts();
        renderModalAssetList();
        renderCorrelationChips();

        if (state.activeTab === 'performance') runAnalysis();
        else if (state.activeTab === 'screener') runScreener();
        else if (state.activeTab === 'rankings') runRankings();
        else if (state.activeTab === 'correlations') runCorrelationAnalysis();
      }
    });
  }

  // Modal File Dropzone & Browse Handlers
  if (elements.btnBrowseFiles && elements.modalFileInput) {
    elements.btnBrowseFiles.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.modalFileInput.click();
    });
  }

  if (elements.modalFileInput) {
    elements.modalFileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        await handleFilesImport(e.target.files);
        elements.modalFileInput.value = '';
      }
    });
  }

  if (elements.modalDropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      elements.modalDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.modalDropzone.querySelector('.dropzone-inner')?.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      elements.modalDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.modalDropzone.querySelector('.dropzone-inner')?.classList.remove('dragover');
      });
    });

    elements.modalDropzone.addEventListener('drop', async (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await handleFilesImport(e.dataTransfer.files);
      }
    });
  }

  // Performance Controls
  if (elements.rangeSelect) {
    elements.rangeSelect.addEventListener('change', (e) => {
      state.timeHorizon = e.target.value;
      runAnalysis();
    });
  }

  if (elements.dripToggle) {
    elements.dripToggle.addEventListener('change', (e) => {
      state.useDRIP = e.target.value === 'true';
      if (state.activeTab === 'performance') runAnalysis();
      else if (state.activeTab === 'screener') runScreener();
      else if (state.activeTab === 'rankings') runRankings();
      else if (state.activeTab === 'correlations') runCorrelationAnalysis();
    });
  }

  if (elements.btnModeSimple) {
    elements.btnModeSimple.addEventListener('click', () => {
      state.viewMode = 'simple';
      updateViewModeUI();
    });
  }

  if (elements.btnModeQuant) {
    elements.btnModeQuant.addEventListener('click', () => {
      state.viewMode = 'quant';
      updateViewModeUI();
    });
  }

  if (elements.btnScaleLinear) {
    elements.btnScaleLinear.addEventListener('click', () => {
      state.growthScale = 'linear';
      elements.btnScaleLinear.classList.add('active');
      elements.btnScaleLog.classList.remove('active');
      drawGrowthChart();
    });
  }

  if (elements.btnScaleLog) {
    elements.btnScaleLog.addEventListener('click', () => {
      state.growthScale = 'log';
      elements.btnScaleLog.classList.add('active');
      elements.btnScaleLinear.classList.remove('active');
      drawGrowthChart();
    });
  }

  if (elements.rollingWindowBtns) {
    elements.rollingWindowBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.rollingWindowBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.rollingWindowMonths = parseInt(btn.dataset.window, 10);
        computeAndDrawRolling();
      });
    });
  }

  if (elements.btnExportCsv) {
    elements.btnExportCsv.addEventListener('click', exportPerformanceReportCSV);
  }

  // Screener Event Handlers
  if (elements.screenerFundType) {
    elements.screenerFundType.addEventListener('change', (e) => {
      state.screenerFundType = e.target.value;
      state.screenerPage = 1;
      runScreener();
    });
  }

  if (elements.screenerAssetClass) {
    elements.screenerAssetClass.addEventListener('change', (e) => {
      state.screenerAssetClass = e.target.value;
      updateSubCategoryDropdown();
      state.screenerPage = 1;
      runScreener();
    });
  }

  if (elements.screenerSubCategory) {
    elements.screenerSubCategory.addEventListener('change', (e) => {
      state.screenerSubCategory = e.target.value;
      state.screenerPage = 1;
      runScreener();
    });
  }

  if (elements.screenerExpenseRatio) {
    elements.screenerExpenseRatio.addEventListener('change', (e) => {
      state.screenerExpenseRatio = e.target.value;
      state.screenerPage = 1;
      runScreener();
    });
  }

  if (elements.screenerHistory) {
    elements.screenerHistory.addEventListener('change', (e) => {
      state.screenerMinHistory = parseInt(e.target.value, 10);
      state.screenerPage = 1;
      runScreener();
    });
  }

  if (elements.screenerBenchmark) {
    elements.screenerBenchmark.addEventListener('change', (e) => {
      state.screenerBenchmark = e.target.value;
      runScreener();
    });
  }

  if (elements.screenerMinSharpe) {
    elements.screenerMinSharpe.addEventListener('change', (e) => {
      state.screenerMinSharpe = e.target.value;
      state.screenerPage = 1;
      runScreener();
    });
  }

  if (elements.screenerSearchInput) {
    elements.screenerSearchInput.addEventListener('input', (e) => {
      state.screenerSearch = e.target.value;
      state.screenerPage = 1;
      runScreener();
    });
  }

  if (elements.btnResetScreenerFilters) {
    elements.btnResetScreenerFilters.addEventListener('click', () => {
      state.screenerFundType = 'all';
      state.screenerAssetClass = 'all';
      state.screenerSubCategory = 'all';
      state.screenerExpenseRatio = 'all';
      state.screenerMinHistory = 0;
      state.screenerMinSharpe = 'all';
      state.screenerSearch = '';
      state.screenerPage = 1;

      if (elements.screenerFundType) elements.screenerFundType.value = 'all';
      if (elements.screenerAssetClass) elements.screenerAssetClass.value = 'all';
      if (elements.screenerExpenseRatio) elements.screenerExpenseRatio.value = 'all';
      if (elements.screenerHistory) elements.screenerHistory.value = '0';
      if (elements.screenerMinSharpe) elements.screenerMinSharpe.value = 'all';
      if (elements.screenerSearchInput) elements.screenerSearchInput.value = '';

      updateSubCategoryDropdown();
      runScreener();
    });
  }

  if (elements.btnExportScreenerCsv) {
    elements.btnExportScreenerCsv.addEventListener('click', exportScreenerCSV);
  }

  if (elements.screenerEntriesSelect) {
    elements.screenerEntriesSelect.addEventListener('change', (e) => {
      state.screenerPageSize = e.target.value;
      state.screenerPage = 1;
      renderScreenerTable();
    });
  }

  if (elements.btnScreenerPrev) {
    elements.btnScreenerPrev.addEventListener('click', () => {
      if (state.screenerPage > 1) {
        state.screenerPage--;
        renderScreenerTable();
      }
    });
  }

  if (elements.btnScreenerNext) {
    elements.btnScreenerNext.addEventListener('click', () => {
      const pageSize = state.screenerPageSize === 'all' ? state.screenerFilteredProfiles.length : parseInt(state.screenerPageSize, 10);
      const totalPages = Math.max(1, Math.ceil(state.screenerFilteredProfiles.length / pageSize));
      if (state.screenerPage < totalPages) {
        state.screenerPage++;
        renderScreenerTable();
      }
    });
  }

  if (elements.screenerTable) {
    elements.screenerTable.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (state.screenerSortCol === col) {
          state.screenerSortAsc = !state.screenerSortAsc;
        } else {
          state.screenerSortCol = col;
          state.screenerSortAsc = false;
        }
        runScreener();
      });
    });
  }

  // Rankings Event Handlers
  if (elements.rankingsMetricSelect) {
    elements.rankingsMetricSelect.addEventListener('change', (e) => {
      state.rankingsMetric = e.target.value;
      runRankings();
    });
  }

  if (elements.rankingsBenchmarkSelect) {
    elements.rankingsBenchmarkSelect.addEventListener('change', (e) => {
      state.rankingsBenchmark = e.target.value;
      runRankings();
    });
  }

  if (elements.rankingsAssetClass) {
    elements.rankingsAssetClass.addEventListener('change', (e) => {
      state.rankingsAssetClass = e.target.value;
      runRankings();
    });
  }

  if (elements.rankingsOrderSelect) {
    elements.rankingsOrderSelect.addEventListener('change', (e) => {
      state.rankingsOrderAsc = e.target.value === 'asc';
      runRankings();
    });
  }

  if (elements.btnExportRankingsCsv) {
    elements.btnExportRankingsCsv.addEventListener('click', exportRankingsCSV);
  }

  // Correlation Event Handlers
  if (elements.btnCorrSelectCore) {
    elements.btnCorrSelectCore.addEventListener('click', () => {
      state.corrTickers = new Set(['VOO', 'SPY', 'QQQ', 'SCHD', 'BND']);
      renderCorrelationChips();
      runCorrelationAnalysis();
    });
  }

  if (elements.btnCorrSelectAll) {
    elements.btnCorrSelectAll.addEventListener('click', () => {
      const all = getAllFundsSync();
      state.corrTickers = new Set(all.map(f => f.ticker));
      renderCorrelationChips();
      runCorrelationAnalysis();
    });
  }

  if (elements.btnCorrClearAll) {
    elements.btnCorrClearAll.addEventListener('click', () => {
      state.corrTickers = new Set(['QQQ', 'VOO']); // Minimum 2 assets
      renderCorrelationChips();
      runCorrelationAnalysis();
    });
  }

  if (elements.corrHorizonSelect) {
    elements.corrHorizonSelect.addEventListener('change', (e) => {
      state.corrHorizon = e.target.value;
      runCorrelationAnalysis();
    });
  }

  if (elements.corrWindowSelect) {
    elements.corrWindowSelect.addEventListener('change', (e) => {
      state.corrWindowMonths = parseInt(e.target.value, 10);
      computeAndDrawRollingCorrelation();
    });
  }

  if (elements.corrFocusPairA) {
    elements.corrFocusPairA.addEventListener('change', (e) => {
      state.corrFocusPairA = e.target.value;
      computeAndDrawRollingCorrelation();
    });
  }

  if (elements.corrFocusPairB) {
    elements.corrFocusPairB.addEventListener('change', (e) => {
      state.corrFocusPairB = e.target.value;
      computeAndDrawRollingCorrelation();
    });
  }

  if (elements.btnExportCorrCsv) {
    elements.btnExportCorrCsv.addEventListener('click', exportCorrelationCSV);
  }

  // Autocorrelation Lab Event Handlers
  if (elements.autocorrRollPeriod) {
    elements.autocorrRollPeriod.addEventListener('change', (e) => {
      state.autocorrRollPeriod = parseInt(e.target.value, 10);
      runAutocorrelationAnalysis();
    });
  }

  if (elements.btnExportAutocorrCsv) {
    elements.btnExportAutocorrCsv.addEventListener('click', exportAutocorrelationCSV);
  }

  // Cointegration Event Handlers
  if (elements.cointPricesSelect) {
    elements.cointPricesSelect.addEventListener('change', (e) => {
      state.cointPriceBasis = e.target.value;
      runCointegrationAnalysisUI();
    });
  }

  if (elements.cointLagSelect) {
    elements.cointLagSelect.addEventListener('change', (e) => {
      state.cointAdfLags = parseInt(e.target.value, 10);
      runCointegrationAnalysisUI();
    });
  }

  if (elements.btnRunCointegration) {
    elements.btnRunCointegration.addEventListener('click', runCointegrationAnalysisUI);
  }

  if (elements.btnExportCointCsv) {
    elements.btnExportCointCsv.addEventListener('click', exportCointegrationCSV);
  }
}

/**
 * Switches between studio sub-tabs ('performance', 'screener', 'rankings', 'correlations', 'autocorr', 'cointegration')
 */
function switchStudioTab(tabKey) {
  state.activeTab = tabKey;

  const tabList = [
    { btn: elements.tabBtnPerformance, pane: elements.tabPerformance, key: 'performance' },
    { btn: elements.tabBtnScreener, pane: elements.tabScreener, key: 'screener' },
    { btn: elements.tabBtnRankings, pane: elements.tabRankings, key: 'rankings' },
    { btn: elements.tabBtnCorrelations, pane: elements.tabCorrelations, key: 'correlations' },
    { btn: elements.tabBtnAutocorr, pane: elements.tabAutocorr, key: 'autocorr' },
    { btn: elements.tabBtnCointegration, pane: elements.tabCointegration, key: 'cointegration' }
  ];

  tabList.forEach(t => {
    if (t.btn) {
      if (t.key === tabKey) t.btn.classList.add('active');
      else t.btn.classList.remove('active');
    }
    if (t.pane) {
      if (t.key === tabKey) t.pane.classList.remove('hidden');
      else t.pane.classList.add('hidden');
    }
  });

  if (tabKey === 'performance') {
    elements.performanceControlsBar?.classList.remove('hidden');
    if (state.analysis) drawAllCharts();
  } else {
    elements.performanceControlsBar?.classList.add('hidden');
  }

  if (tabKey === 'screener') {
    runScreener();
  } else if (tabKey === 'rankings') {
    runRankings();
  } else if (tabKey === 'correlations') {
    renderCorrelationChips();
    runCorrelationAnalysis();
  } else if (tabKey === 'autocorr') {
    runAutocorrelationAnalysis();
  } else if (tabKey === 'cointegration') {
    runCointegrationAnalysisUI();
  }
}

/**
 * 1-Click drill down from Screener/Rankings to Fund Performance Analyzer
 */
function drillDownToFund(ticker) {
  state.fundTicker = ticker.toUpperCase();
  updatePickerButtons();
  switchStudioTab('performance');
  runAnalysis();
}

/**
 * Dynamically populates the Category / Style dropdown based on active Asset Class
 */
function updateSubCategoryDropdown() {
  if (!elements.screenerSubCategory) return;
  const assetClass = state.screenerAssetClass;
  const subCategories = SUB_CATEGORIES_BY_ASSET_CLASS[assetClass] || [];

  let html = '<option value="all" selected>All Categories</option>';
  if (subCategories.length > 0) {
    subCategories.forEach(cat => {
      html += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`;
    });
  }
  elements.screenerSubCategory.innerHTML = html;
  state.screenerSubCategory = 'all';
}

/**
 * Screener Engine Evaluation & Filtering
 */
function runScreener() {
  const allFunds = getAllFundsSync();
  const benchmarkFund = allFunds.find(f => f.ticker === state.screenerBenchmark) || allFunds[0];

  const profiles = screenAndProfileFunds(allFunds, benchmarkFund, {
    useDRIP: state.useDRIP,
    annualRf: state.annualRf
  });

  const filtered = filterFundProfiles(profiles, {
    searchQuery: state.screenerSearch,
    fundType: state.screenerFundType,
    assetClass: state.screenerAssetClass,
    subCategory: state.screenerSubCategory,
    maxExpenseRatio: state.screenerExpenseRatio === 'all' ? null : parseFloat(state.screenerExpenseRatio),
    minHistoryYears: state.screenerMinHistory,
    minSharpe: state.screenerMinSharpe === 'all' ? null : parseFloat(state.screenerMinSharpe)
  });

  // Sort Profiles
  const isHigherBetter = METRIC_DIRECTION[state.screenerSortCol] !== false;
  const desc = state.screenerSortAsc ? !isHigherBetter : isHigherBetter;

  filtered.sort((a, b) => {
    const valA = a[state.screenerSortCol];
    const valB = b[state.screenerSortCol];
    if (valA == null && valB == null) return 0;
    if (valA == null) return 1;
    if (valB == null) return -1;
    if (typeof valA === 'string') {
      return state.screenerSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return desc ? valB - valA : valA - valB;
  });

  state.screenerFilteredProfiles = filtered;
  renderScreenerTable();
}

function renderScreenerTable() {
  if (!elements.screenerTableBody) return;

  const allFunds = getAllFundsSync();
  const filtered = state.screenerFilteredProfiles;

  if (elements.screenerStatusText) {
    elements.screenerStatusText.textContent = `Showing ${filtered.length} of ${allFunds.length} funds in universe (Bench: ${state.screenerBenchmark})`;
  }

  // Update Sorting Headers
  if (elements.screenerTable) {
    elements.screenerTable.querySelectorAll('th[data-sort]').forEach(th => {
      const col = th.dataset.sort;
      const icon = th.querySelector('.sort-icon');
      if (col === state.screenerSortCol) {
        th.classList.add('active-sort');
        if (icon) icon.textContent = state.screenerSortAsc ? '▲' : '▼';
      } else {
        th.classList.remove('active-sort');
        if (icon) icon.textContent = '↕';
      }
    });
  }

  // Pagination Slice
  const pageSize = state.screenerPageSize === 'all' ? filtered.length : parseInt(state.screenerPageSize, 10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (state.screenerPage > totalPages) state.screenerPage = totalPages;

  const startIdx = (state.screenerPage - 1) * pageSize;
  const endIdx = Math.min(filtered.length, startIdx + pageSize);
  const pageSlice = filtered.slice(startIdx, endIdx);

  if (pageSlice.length === 0) {
    elements.screenerTableBody.innerHTML = `
      <tr>
        <td colspan="18" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
          🔍 No funds match the active screen criteria. Try broadening your filters or uploading custom CSVs.
        </td>
      </tr>
    `;
  } else {
    let html = '';
    pageSlice.forEach(p => {
      html += `
        <tr>
          <td>
            <span class="table-ticker-pill" data-ticker="${p.ticker}">
              <span class="picker-dot" style="background: ${p.color};"></span>
              ${p.ticker}
            </span>
          </td>
          <td><span class="table-fund-name" data-ticker="${p.ticker}" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span></td>
          <td>${escapeHtml(p.assetClass)}</td>
          <td>${escapeHtml(p.category || '—')}</td>
          <td class="num-col">${p.ytd != null ? formatPct(p.ytd) : '—'}</td>
          <td class="num-col">${p.return1y != null ? formatPct(p.return1y) : '—'}</td>
          <td class="num-col">${p.return3y != null ? formatPct(p.return3y) : '—'}</td>
          <td class="num-col">${p.return5y != null ? formatPct(p.return5y) : '—'}</td>
          <td class="num-col" style="font-weight: 700;">${p.cagr != null ? formatPct(p.cagr) : '—'}</td>
          <td class="num-col">${p.sharpe != null ? p.sharpe.toFixed(2) : '—'}</td>
          <td class="num-col">${p.sortino != null ? p.sortino.toFixed(2) : '—'}</td>
          <td class="num-col">${p.volatility != null ? formatPct(p.volatility) : '—'}</td>
          <td class="num-col" style="color: #f87171;">${p.maxDrawdown != null ? formatPct(p.maxDrawdown) : '—'}</td>
          <td class="num-col">${p.alpha != null ? `${p.alpha >= 0 ? '+' : ''}${formatPct(p.alpha)}` : '—'}</td>
          <td class="num-col">${p.beta != null ? p.beta.toFixed(2) : '—'}</td>
          <td class="num-col">${p.upCapture != null ? `${(p.upCapture * 100).toFixed(0)}%` : '—'}</td>
          <td class="num-col">${p.downCapture != null ? `${(p.downCapture * 100).toFixed(0)}%` : '—'}</td>
          <td style="text-align: right;">
            <button type="button" class="btn-table-analyze" data-ticker="${p.ticker}">Analyze 📊</button>
          </td>
        </tr>
      `;
    });
    elements.screenerTableBody.innerHTML = html;

    // Attach drill-down click handlers
    elements.screenerTableBody.querySelectorAll('[data-ticker]').forEach(el => {
      el.addEventListener('click', () => {
        const ticker = el.dataset.ticker;
        if (ticker) drillDownToFund(ticker);
      });
    });
  }

  // Update Pagination Controls
  if (elements.screenerPaginationInfo) {
    elements.screenerPaginationInfo.textContent = `Showing ${filtered.length === 0 ? 0 : startIdx + 1} to ${endIdx} of ${filtered.length} entries`;
  }
  if (elements.screenerPageDisplay) {
    elements.screenerPageDisplay.textContent = `${state.screenerPage} / ${totalPages}`;
  }
  if (elements.btnScreenerPrev) {
    elements.btnScreenerPrev.disabled = state.screenerPage <= 1;
  }
  if (elements.btnScreenerNext) {
    elements.btnScreenerNext.disabled = state.screenerPage >= totalPages;
  }
}

/**
 * Rankings Leaderboard Engine
 */
function runRankings() {
  const allFunds = getAllFundsSync();
  const benchmarkFund = allFunds.find(f => f.ticker === state.rankingsBenchmark) || allFunds[0];

  let profiles = screenAndProfileFunds(allFunds, benchmarkFund, {
    useDRIP: state.useDRIP,
    annualRf: state.annualRf
  });

  if (state.rankingsAssetClass !== 'all') {
    profiles = profiles.filter(p => p.assetClass.toLowerCase() === state.rankingsAssetClass.toLowerCase());
  }

  const ranked = rankFundProfiles(profiles, state.rankingsMetric, state.rankingsOrderAsc);
  state.rankingsRankedProfiles = ranked;
  renderRankingsTable();
}

function renderRankingsTable() {
  if (!elements.rankingsTableBody) return;

  const ranked = state.rankingsRankedProfiles;

  if (elements.rankingsStatusText) {
    elements.rankingsStatusText.textContent = `Ranked ${ranked.length} funds in active universe by ${getMetricLabel(state.rankingsMetric)}`;
  }

  if (elements.rankingsColMetricHeader) {
    elements.rankingsColMetricHeader.textContent = getMetricLabel(state.rankingsMetric);
  }

  if (ranked.length === 0) {
    elements.rankingsTableBody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
          No funds available for ranking.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  ranked.forEach(r => {
    let rankBadgeClass = 'rank-badge rank-badge-other';
    if (r.rank === 1) rankBadgeClass = 'rank-badge rank-badge-1';
    else if (r.rank === 2) rankBadgeClass = 'rank-badge rank-badge-2';
    else if (r.rank === 3) rankBadgeClass = 'rank-badge rank-badge-3';

    let pctPillClass = 'percentile-pill pct-mid';
    if (r.percentile >= 95) pctPillClass = 'percentile-pill pct-top-5';
    else if (r.percentile >= 90) pctPillClass = 'percentile-pill pct-top-10';
    else if (r.percentile >= 80) pctPillClass = 'percentile-pill pct-top-20';
    else if (r.percentile <= 20) pctPillClass = 'percentile-pill pct-bottom-20';

    const formattedRankValue = formatRankValue(state.rankingsMetric, r.rankValue);

    html += `
      <tr>
        <td><span class="${rankBadgeClass}">#${r.rank}</span></td>
        <td><span class="${pctPillClass}">${r.percentileBadge}</span></td>
        <td>
          <span class="table-ticker-pill" data-ticker="${r.ticker}">
            <span class="picker-dot" style="background: ${r.color};"></span>
            ${r.ticker}
          </span>
          <span class="table-fund-name" data-ticker="${r.ticker}" style="margin-left: 0.5rem;" title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</span>
        </td>
        <td>${escapeHtml(r.assetClass)}</td>
        <td class="num-col rank-metric-highlight">${formattedRankValue}</td>
        <td class="num-col">${r.cagr != null ? formatPct(r.cagr) : '—'}</td>
        <td class="num-col">${r.sharpe != null ? r.sharpe.toFixed(2) : '—'}</td>
        <td class="num-col">${r.sortino != null ? r.sortino.toFixed(2) : '—'}</td>
        <td class="num-col" style="color: #f87171;">${r.maxDrawdown != null ? formatPct(r.maxDrawdown) : '—'}</td>
        <td class="num-col">${r.beta != null ? r.beta.toFixed(2) : '—'}</td>
        <td style="text-align: right;">
          <button type="button" class="btn-table-analyze" data-ticker="${r.ticker}">Analyze 📊</button>
        </td>
      </tr>
    `;
  });

  elements.rankingsTableBody.innerHTML = html;

  // Drill-down click handlers
  elements.rankingsTableBody.querySelectorAll('[data-ticker]').forEach(el => {
    el.addEventListener('click', () => {
      const ticker = el.dataset.ticker;
      if (ticker) drillDownToFund(ticker);
    });
  });
}

function getMetricLabel(metric) {
  const map = {
    sharpe: 'Sharpe Ratio',
    cagr: 'CAGR Return',
    sortino: 'Sortino Ratio',
    alpha: "Jensen's Alpha",
    maxDrawdown: 'Lowest Max DD',
    upCapture: 'Up Capture',
    captureRatio: 'Capture Ratio',
    treynor: 'Treynor Ratio',
    return1y: '1Y Return',
    return3y: '3Y CAGR',
    return5y: '5Y CAGR',
    ytd: 'YTD Return'
  };
  return map[metric] || metric.toUpperCase();
}

function formatRankValue(metric, val) {
  if (val == null) return '—';
  if (['cagr', 'maxDrawdown', 'alpha', 'return1y', 'return3y', 'return5y', 'ytd', 'volatility'].includes(metric)) {
    return formatPct(val);
  }
  if (['upCapture', 'downCapture'].includes(metric)) {
    return `${(val * 100).toFixed(1)}%`;
  }
  return Number(val).toFixed(2);
}

/**
 * Correlation Studio Logic
 */
function renderCorrelationChips() {
  if (!elements.corrUniverseChips) return;

  const allFunds = getAllFundsSync();
  let html = '';

  allFunds.forEach(fund => {
    const isSelected = state.corrTickers.has(fund.ticker);
    html += `
      <button type="button" class="corr-chip ${isSelected ? 'active' : ''}" data-ticker="${fund.ticker}">
        <span class="picker-dot" style="background: ${fund.color || '#38bdf8'};"></span>
        <span>${fund.ticker}</span>
      </button>
    `;
  });

  elements.corrUniverseChips.innerHTML = html;

  // Bind Chip Toggles
  elements.corrUniverseChips.querySelectorAll('.corr-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const ticker = chip.dataset.ticker;
      if (state.corrTickers.has(ticker)) {
        if (state.corrTickers.size > 2) {
          state.corrTickers.delete(ticker);
        } else {
          alert('At least 2 assets are required for correlation analysis.');
          return;
        }
      } else {
        state.corrTickers.add(ticker);
      }
      renderCorrelationChips();
      runCorrelationAnalysis();
    });
  });

  populatePairSelectors();
}

function populatePairSelectors() {
  const tickers = Array.from(state.corrTickers);

  // If focus pair is not in current active set, fallback
  if (!state.corrTickers.has(state.corrFocusPairA)) {
    state.corrFocusPairA = tickers[0] || 'QQQ';
  }
  if (!state.corrTickers.has(state.corrFocusPairB)) {
    state.corrFocusPairB = tickers.length > 1 ? tickers[1] : (tickers[0] || 'VOO');
  }

  let optHtmlA = '';
  let optHtmlB = '';

  tickers.forEach(t => {
    optHtmlA += `<option value="${t}" ${t === state.corrFocusPairA ? 'selected' : ''}>${t}</option>`;
    optHtmlB += `<option value="${t}" ${t === state.corrFocusPairB ? 'selected' : ''}>${t}</option>`;
  });

  if (elements.corrFocusPairA) elements.corrFocusPairA.innerHTML = optHtmlA;
  if (elements.corrFocusPairB) elements.corrFocusPairB.innerHTML = optHtmlB;
}

function runCorrelationAnalysis() {
  const allFunds = getAllFundsSync();
  const selectedFunds = allFunds.filter(f => state.corrTickers.has(f.ticker));

  if (selectedFunds.length < 2) {
    if (elements.corrStatusText) elements.corrStatusText.textContent = 'Please select at least 2 assets.';
    return;
  }

  const result = computeCorrelationMatrix(selectedFunds, {
    useDRIP: state.useDRIP,
    horizon: state.corrHorizon
  });

  state.corrResult = result;

  if (result.error) {
    if (elements.corrStatusText) elements.corrStatusText.textContent = result.error;
    if (elements.corrResultsTable) {
      elements.corrResultsTable.innerHTML = `<tr><td style="padding: 2rem; color: #f87171;">${result.error}</td></tr>`;
    }
    return;
  }

  if (elements.corrStatusText) {
    elements.corrStatusText.textContent = `Matrix analyzing ${result.assets.length} assets across ${result.commonDates.length} common months (${result.minDate} → ${result.maxDate})`;
  }

  renderCorrelationMatrixTable();
  computeAndDrawRollingCorrelation();
}

function renderCorrelationMatrixTable() {
  if (!elements.corrResultsTable || !state.corrResult) return;

  const { assets, matrix } = state.corrResult;
  const n = assets.length;

  // 1. Table Header
  let headHtml = '<thead><tr><th class="th-asset-meta">Asset Name</th><th class="th-asset-meta">Ticker</th>';
  assets.forEach(a => {
    headHtml += `<th>${a.ticker}</th>`;
  });
  headHtml += '<th class="cell-summary-stat">CAGR Return</th><th class="cell-summary-stat">Monthly Vol</th><th class="cell-summary-stat">Annual Vol</th></tr></thead>';

  // 2. Table Body
  let bodyHtml = '<tbody>';
  for (let i = 0; i < n; i++) {
    const assetI = assets[i];
    bodyHtml += `<tr>`;
    bodyHtml += `<td class="cell-asset-name"><span class="table-fund-name" data-ticker="${assetI.ticker}" title="${escapeHtml(assetI.name)}">${escapeHtml(assetI.name)}</span></td>`;
    bodyHtml += `<td><span class="table-ticker-pill" data-ticker="${assetI.ticker}"><span class="picker-dot" style="background:${assetI.color};"></span>${assetI.ticker}</span></td>`;

    for (let j = 0; j < n; j++) {
      const assetJ = assets[j];
      const val = matrix[i][j];

      if (i === j) {
        bodyHtml += `<td class="cell-self">1.00</td>`;
      } else {
        const heatClass = getCorrHeatClass(val);
        const isActive = (assetI.ticker === state.corrFocusPairA && assetJ.ticker === state.corrFocusPairB) ||
                         (assetI.ticker === state.corrFocusPairB && assetJ.ticker === state.corrFocusPairA);
        const activeClass = isActive ? 'cell-active-pair' : '';

        bodyHtml += `
          <td class="cell-clickable ${heatClass} ${activeClass}"
              data-pair-a="${assetI.ticker}"
              data-pair-b="${assetJ.ticker}"
              title="Click to plot rolling correlation for ${assetI.ticker} vs ${assetJ.ticker}">
            ${val.toFixed(2)}
          </td>
        `;
      }
    }

    bodyHtml += `<td class="cell-summary-stat">${formatPct(assetI.cagr)}</td>`;
    bodyHtml += `<td class="cell-summary-stat">${formatPct(assetI.monthlyVol)}</td>`;
    bodyHtml += `<td class="cell-summary-stat">${formatPct(assetI.annualVol)}</td>`;
    bodyHtml += `</tr>`;
  }
  bodyHtml += '</tbody>';

  elements.corrResultsTable.innerHTML = headHtml + bodyHtml;

  // Bind cell clicks to switch rolling focus pair
  elements.corrResultsTable.querySelectorAll('.cell-clickable').forEach(cell => {
    cell.addEventListener('click', () => {
      const pairA = cell.dataset.pairA;
      const pairB = cell.dataset.pairB;
      if (pairA && pairB) {
        state.corrFocusPairA = pairA;
        state.corrFocusPairB = pairB;
        populatePairSelectors();
        renderCorrelationMatrixTable(); // Re-highlight active pair
        computeAndDrawRollingCorrelation();
      }
    });
  });

  // Ticker click drills down to Performance Analyzer
  elements.corrResultsTable.querySelectorAll('[data-ticker]').forEach(el => {
    el.addEventListener('click', () => {
      const ticker = el.dataset.ticker;
      if (ticker) drillDownToFund(ticker);
    });
  });
}

function getCorrHeatClass(val) {
  if (val >= 0.70) return 'corr-pos-high';
  if (val >= 0.30) return 'corr-pos-mid';
  if (val <= -0.70) return 'corr-neg-high';
  if (val <= -0.30) return 'corr-neg-mid';
  return 'corr-neutral';
}

function computeAndDrawRollingCorrelation() {
  const result = state.corrResult;
  if (!result || !result.fundReturnsMap) return;

  const returnsA = result.fundReturnsMap.get(state.corrFocusPairA);
  const returnsB = result.fundReturnsMap.get(state.corrFocusPairB);

  if (!returnsA || !returnsB) return;

  const rolling = calculateRollingCorrelation(
    returnsA,
    returnsB,
    result.commonDates,
    state.corrWindowMonths
  );

  state.corrRolling = rolling;

  // Update Headers & Legend
  if (elements.corrChartTitle) {
    elements.corrChartTitle.textContent = `${state.corrFocusPairA} vs ${state.corrFocusPairB} Rolling Correlation`;
  }
  if (elements.corrChartSubtitle) {
    elements.corrChartSubtitle.textContent = `Rolling ${state.corrWindowMonths}-month Pearson correlation history. Range: -1.00 (inverse) to +1.00 (identical).`;
  }
  if (elements.corrLegendText) {
    elements.corrLegendText.textContent = `${state.corrFocusPairA} vs ${state.corrFocusPairB} (${state.corrWindowMonths}M)`;
  }

  // Update Stats Banner
  if (elements.corrStatCurrent) elements.corrStatCurrent.textContent = rolling.currentCorrelation.toFixed(2);
  if (elements.corrStatMean) elements.corrStatMean.textContent = rolling.meanCorrelation.toFixed(2);
  if (elements.corrStatMin) elements.corrStatMin.textContent = rolling.minCorrelation.toFixed(2);
  if (elements.corrStatMax) elements.corrStatMax.textContent = rolling.maxCorrelation.toFixed(2);

  drawCorrelationChart();
}

/**
 * Draws High-DPI Rolling Correlation Canvas Chart
 */
function drawCorrelationChart() {
  const canvas = elements.corrCanvas;
  const rolling = state.corrRolling;
  if (!canvas || !rolling) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 30, right: 35, bottom: 40, left: 60 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const series = rolling.series;
  if (!series || series.length < 2) {
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.font = '13px -apple-system, sans-serif';
    ctx.fillText('Insufficient historical overlap for rolling correlation', w / 2, h / 2);
    return;
  }

  // Fixed bounds [-1.0, 1.0] for canonical financial correlation
  const minVal = -1.0;
  const maxVal = 1.0;

  function getY(corr) {
    return pad.top + plotH * (1 - (corr - minVal) / (maxVal - minVal));
  }

  function getX(idx) {
    return pad.left + (idx / (series.length - 1)) * plotW;
  }

  const zeroY = getY(0);

  // Horizontal Gridlines (-1.0, -0.5, 0.0, 0.5, 1.0)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridLevels = [-1.0, -0.5, 0.0, 0.5, 1.0];
  gridLevels.forEach(val => {
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    ctx.fillText(val.toFixed(1), pad.left - 8, y);
  });

  // Highlighted Zero Axis Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.25;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(w - pad.right, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  // X Time Axis Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const yearStep = Math.max(1, Math.floor(series.length / 8));
  for (let i = 0; i < series.length; i += yearStep) {
    const x = getX(i);
    const dateStr = series[i].date.substring(0, 4);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, h - pad.bottom);
    ctx.stroke();

    ctx.fillText(dateStr, x, h - pad.bottom + 8);
  }

  // Gradient Area Fill Above & Below Zero
  const grad = ctx.createLinearGradient(0, getY(1.0), 0, getY(-1.0));
  grad.addColorStop(0, 'rgba(45, 212, 191, 0.35)');
  grad.addColorStop(0.5, 'rgba(45, 212, 191, 0.05)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0.35)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(getX(0), zeroY);
  series.forEach((pt, idx) => {
    ctx.lineTo(getX(idx), getY(pt.correlation));
  });
  ctx.lineTo(getX(series.length - 1), zeroY);
  ctx.closePath();
  ctx.fill();

  // Draw Rolling Curve Line
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  series.forEach((pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.correlation);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Hover Tooltip Handler
  setupCanvasHover(canvas, elements.corrTooltip, (mouse) => {
    const relX = mouse.x - pad.left;
    if (relX < 0 || relX > plotW) return null;
    const idx = Math.min(series.length - 1, Math.max(0, Math.round((relX / plotW) * (series.length - 1))));
    const pt = series[idx];
    const corrVal = pt.correlation;

    const dotColor = corrVal >= 0.70 ? '#10b981' : (corrVal <= -0.30 ? '#ef4444' : '#2dd4bf');

    return {
      x: getX(idx),
      y: getY(pt.correlation),
      html: `
        <div class="canvas-tooltip-date">${pt.date} (${state.corrWindowMonths}M Ending)</div>
        <div class="canvas-tooltip-row">
          <span><span class="canvas-tooltip-dot" style="background: ${dotColor};"></span>${state.corrFocusPairA} vs ${state.corrFocusPairB}:</span>
          <strong>${corrVal.toFixed(2)}</strong>
        </div>
        <div class="canvas-tooltip-row" style="margin-top: 0.2rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.2rem; color: #94a3b8; font-size: 0.7rem;">
          <span>Relationship:</span>
          <strong>${corrVal >= 0.7 ? 'Strong Positive' : corrVal >= 0.3 ? 'Moderate Positive' : corrVal <= -0.3 ? 'Inverse / Hedging' : 'Uncorrelated'}</strong>
        </div>
      `
    };
  }, 'correlation');
}

function exportCorrelationCSV() {
  const result = state.corrResult;
  if (!result || !result.assets) return;

  const { assets, matrix } = result;
  let csv = 'Ticker,Name,' + assets.map(a => a.ticker).join(',') + ',CAGR,Monthly Vol,Annual Vol\n';

  assets.forEach((a, i) => {
    csv += `"${a.ticker}","${a.name.replace(/"/g, '""')}",`;
    for (let j = 0; j < assets.length; j++) {
      csv += `${matrix[i][j].toFixed(4)},`;
    }
    csv += `${(a.cagr * 100).toFixed(2)}%,`;
    csv += `${(a.monthlyVol * 100).toFixed(2)}%,`;
    csv += `${(a.annualVol * 100).toFixed(2)}%\n`;
  });

  downloadCSV(csv, 'asset_correlation_matrix.csv');
}

/**
 * CSV Exporters for Screener and Rankings
 */
function exportScreenerCSV() {
  const filtered = state.screenerFilteredProfiles;
  if (!filtered || filtered.length === 0) return;

  let csv = 'Ticker,Name,Fund Type,Asset Class,Category,YTD,1Y,3Y,5Y,CAGR,Sharpe,Sortino,Volatility,Max Drawdown,Alpha,Beta,Up Capture,Down Capture\n';
  filtered.forEach(p => {
    csv += `"${p.ticker}","${p.name.replace(/"/g, '""')}","${p.fundType || ''}","${p.assetClass}","${p.category || ''}",`;
    csv += `${p.ytd != null ? (p.ytd * 100).toFixed(2) + '%' : ''},`;
    csv += `${p.return1y != null ? (p.return1y * 100).toFixed(2) + '%' : ''},`;
    csv += `${p.return3y != null ? (p.return3y * 100).toFixed(2) + '%' : ''},`;
    csv += `${p.return5y != null ? (p.return5y * 100).toFixed(2) + '%' : ''},`;
    csv += `${p.cagr != null ? (p.cagr * 100).toFixed(2) + '%' : ''},`;
    csv += `${p.sharpe != null ? p.sharpe.toFixed(2) : ''},`;
    csv += `${p.sortino != null ? p.sortino.toFixed(2) : ''},`;
    csv += `${p.volatility != null ? (p.volatility * 100).toFixed(2) + '%' : ''},`;
    csv += `${p.maxDrawdown != null ? (p.maxDrawdown * 100).toFixed(2) + '%' : ''},`;
    csv += `${p.alpha != null ? (p.alpha * 100).toFixed(2) + '%' : ''},`;
    csv += `${p.beta != null ? p.beta.toFixed(2) : ''},`;
    csv += `${p.upCapture != null ? (p.upCapture * 100).toFixed(1) + '%' : ''},`;
    csv += `${p.downCapture != null ? (p.downCapture * 100).toFixed(1) + '%' : ''}\n`;
  });

  downloadCSV(csv, 'fund_screener_results.csv');
}

function exportRankingsCSV() {
  const ranked = state.rankingsRankedProfiles;
  if (!ranked || ranked.length === 0) return;

  let csv = `Rank,Percentile,Ticker,Name,Asset Class,${getMetricLabel(state.rankingsMetric)},CAGR,Sharpe,Sortino,Max Drawdown,Beta\n`;
  ranked.forEach(r => {
    csv += `${r.rank},"${r.percentileBadge}","${r.ticker}","${r.name.replace(/"/g, '""')}","${r.assetClass}",`;
    csv += `"${formatRankValue(state.rankingsMetric, r.rankValue)}",`;
    csv += `${r.cagr != null ? (r.cagr * 100).toFixed(2) + '%' : ''},`;
    csv += `${r.sharpe != null ? r.sharpe.toFixed(2) : ''},`;
    csv += `${r.sortino != null ? r.sortino.toFixed(2) : ''},`;
    csv += `${r.maxDrawdown != null ? (r.maxDrawdown * 100).toFixed(2) + '%' : ''},`;
    csv += `${r.beta != null ? r.beta.toFixed(2) : ''}\n`;
  });

  downloadCSV(csv, `fund_leaderboard_by_${state.rankingsMetric}.csv`);
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens Searchable Asset / Benchmark Modal
 * @param {'target' | 'benchmark'} mode
 */
function openAssetModal(mode) {
  modalMode = mode;

  if (elements.modalTitle) {
    if (mode === 'target') elements.modalTitle.textContent = 'Select Target Asset / Fund';
    else if (mode === 'benchmark') elements.modalTitle.textContent = 'Select Benchmark Reference';
    else if (mode === 'autocorr') elements.modalTitle.textContent = 'Select Autocorrelation Asset';
    else if (mode === 'coint-dep') elements.modalTitle.textContent = 'Select Dependent Asset (Y)';
    else if (mode === 'coint-indep') elements.modalTitle.textContent = 'Select Independent Asset (X)';
  }

  if (elements.modalTargetTypeBadge) {
    if (mode === 'target') {
      elements.modalTargetTypeBadge.textContent = 'Target Asset';
      elements.modalTargetTypeBadge.style.background = 'rgba(45, 212, 191, 0.15)';
      elements.modalTargetTypeBadge.style.color = '#2dd4bf';
    } else if (mode === 'benchmark') {
      elements.modalTargetTypeBadge.textContent = 'Benchmark Reference';
      elements.modalTargetTypeBadge.style.background = 'rgba(168, 85, 247, 0.15)';
      elements.modalTargetTypeBadge.style.color = '#c084fc';
    } else if (mode === 'autocorr') {
      elements.modalTargetTypeBadge.textContent = 'Autocorrelation Asset';
      elements.modalTargetTypeBadge.style.background = 'rgba(45, 212, 191, 0.15)';
      elements.modalTargetTypeBadge.style.color = '#2dd4bf';
    } else if (mode === 'coint-dep') {
      elements.modalTargetTypeBadge.textContent = 'Dependent (Y)';
      elements.modalTargetTypeBadge.style.background = 'rgba(45, 212, 191, 0.15)';
      elements.modalTargetTypeBadge.style.color = '#2dd4bf';
    } else if (mode === 'coint-indep') {
      elements.modalTargetTypeBadge.textContent = 'Independent (X)';
      elements.modalTargetTypeBadge.style.background = 'rgba(168, 85, 247, 0.15)';
      elements.modalTargetTypeBadge.style.color = '#c084fc';
    }
  }

  // Reset category tabs to 'all'
  activeCategoryFilter = 'all';
  if (elements.catTabs) {
    elements.catTabs.forEach(t => {
      if (t.dataset.cat === 'all') t.classList.add('active');
      else t.classList.remove('active');
    });
  }

  // Clear search input
  if (elements.modalSearchInput) {
    elements.modalSearchInput.value = '';
  }
  if (elements.btnClearSearch) {
    elements.btnClearSearch.classList.add('hidden');
  }

  updateCategoryCounts();
  renderModalAssetList();

  if (elements.assetModalOverlay) {
    elements.assetModalOverlay.classList.remove('hidden');
  }

  setTimeout(() => {
    if (elements.modalSearchInput) elements.modalSearchInput.focus();
  }, 50);
}

function closeAssetModal() {
  if (elements.assetModalOverlay) {
    elements.assetModalOverlay.classList.add('hidden');
  }
}

function selectFund(ticker) {
  const sym = ticker.toUpperCase();
  if (modalMode === 'target') {
    state.fundTicker = sym;
    updatePickerButtons();
    closeAssetModal();
    runAnalysis();
  } else if (modalMode === 'benchmark') {
    state.benchTicker = sym;
    updatePickerButtons();
    closeAssetModal();
    runAnalysis();
  } else if (modalMode === 'autocorr') {
    state.autocorrTicker = sym;
    updateAutocorrPickerButton();
    closeAssetModal();
    runAutocorrelationAnalysis();
  } else if (modalMode === 'coint-dep') {
    state.cointDepTicker = sym;
    updateCointPickerButtons();
    closeAssetModal();
    runCointegrationAnalysisUI();
  } else if (modalMode === 'coint-indep') {
    state.cointIndepTicker = sym;
    updateCointPickerButtons();
    closeAssetModal();
    runCointegrationAnalysisUI();
  }
}

/**
 * Handles batch file import via Drag & Drop or File Input
 */
async function handleFilesImport(files) {
  if (!files || files.length === 0) return;

  if (elements.dropzoneProgress) {
    elements.dropzoneProgress.classList.remove('hidden');
  }
  if (elements.dropzoneProgressBar) {
    elements.dropzoneProgressBar.style.width = '0%';
  }
  if (elements.dropzoneProgressText) {
    elements.dropzoneProgressText.textContent = `Importing ${files.length} file(s)...`;
  }

  const result = await importFilesToSession(files, (processed, total) => {
    if (elements.dropzoneProgressBar) {
      elements.dropzoneProgressBar.style.width = `${Math.round((processed / total) * 100)}%`;
    }
    if (elements.dropzoneProgressText) {
      elements.dropzoneProgressText.textContent = `Parsed ${processed} of ${total} files...`;
    }
  });

  if (elements.dropzoneProgress) {
    elements.dropzoneProgress.classList.add('hidden');
  }

  if (result.errors && result.errors.length > 0) {
    console.warn('Import warnings:', result.errors);
  }

  if (result.importedCount > 0) {
    updateCategoryCounts();
    renderModalAssetList();
    renderCorrelationChips();

    if (state.activeTab === 'screener') runScreener();
    else if (state.activeTab === 'rankings') runRankings();
    else if (state.activeTab === 'correlations') runCorrelationAnalysis();

    // If exactly 1 fund was uploaded in target mode, automatically select it!
    if (files.length === 1 && modalMode === 'target') {
      const allFunds = getAllFundsSync();
      const lastUploaded = allFunds[allFunds.length - 1];
      if (lastUploaded && !lastUploaded.isPreset) {
        selectFund(lastUploaded.ticker);
      }
    }
  } else if (result.errors.length > 0) {
    alert(`Import failed: ${result.errors[0]}`);
  }
}

/**
 * Renders the scrollable fund list inside the modal with live search & tab filters
 */
function renderModalAssetList() {
  if (!elements.modalAssetList) return;

  const allFunds = getAllFundsSync();
  const query = (elements.modalSearchInput ? elements.modalSearchInput.value : '').trim().toLowerCase();
  const currentActiveTicker = modalMode === 'target' ? state.fundTicker : state.benchTicker;

  // Filter by active category tab
  let filtered = allFunds;
  if (activeCategoryFilter === 'preset') {
    filtered = filtered.filter(f => f.isPreset);
  } else if (activeCategoryFilter === 'custom') {
    filtered = filtered.filter(f => !f.isPreset);
  }

  // Filter by search query
  if (query.length > 0) {
    filtered = filtered.filter(f => {
      const t = f.ticker.toLowerCase();
      const n = (f.name || '').toLowerCase();
      const c = (f.category || '').toLowerCase();
      return t.includes(query) || n.includes(query) || c.includes(query);
    });
  }

  // Sort: Presets first, then alphabetical by ticker
  filtered.sort((a, b) => {
    if (a.isPreset && !b.isPreset) return -1;
    if (!a.isPreset && b.isPreset) return 1;
    return a.ticker.localeCompare(b.ticker);
  });

  if (filtered.length === 0) {
    elements.modalAssetList.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary); font-size: 0.85rem;">
        <span style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem;">🔍</span>
        No matching funds found for "<strong>${escapeHtml(query)}</strong>".
        <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">
          Try searching another ticker or drop CSV files below to import custom funds.
        </div>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(fund => {
    const isSelected = fund.ticker === currentActiveTicker;
    const tagBadge = fund.isPreset
      ? '<span style="font-size: 0.68rem; padding: 0.1rem 0.35rem; border-radius: 4px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; font-weight: 600;">Core</span>'
      : '<span style="font-size: 0.68rem; padding: 0.1rem 0.35rem; border-radius: 4px; background: rgba(168, 85, 247, 0.15); color: #c084fc; font-weight: 600;">Session</span>';

    const rangeStr = fund.start && fund.end
      ? `${fund.start.substring(0, 7)} → ${fund.end.substring(0, 7)} (${fund.monthsCount} mos)`
      : `${fund.monthsCount} data points`;

    html += `
      <div class="asset-list-item ${isSelected ? 'is-selected' : ''}" data-ticker="${fund.ticker}">
        <div class="item-left">
          <span class="item-ticker-badge" style="border-left: 3px solid ${fund.color || '#38bdf8'};">${fund.ticker}</span>
          <div class="item-info">
            <span class="item-name" title="${escapeHtml(fund.name)}">${escapeHtml(fund.name)}</span>
            <span class="item-meta">${escapeHtml(fund.category)} &bull; ${rangeStr} &bull; ${tagBadge}</span>
          </div>
        </div>
        <button type="button" class="item-select-btn" data-ticker="${fund.ticker}">
          ${isSelected ? '✓ Active' : 'Select'}
        </button>
      </div>
    `;
  });

  elements.modalAssetList.innerHTML = html;

  // Bind click on items and select buttons
  elements.modalAssetList.querySelectorAll('.asset-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const ticker = item.dataset.ticker;
      if (ticker) selectFund(ticker);
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function updateViewModeUI() {
  if (state.viewMode === 'simple') {
    elements.btnModeSimple?.classList.add('active');
    elements.btnModeQuant?.classList.remove('active');
    elements.verdictContainer?.classList.remove('hidden');
    elements.kpiScorecardGrid?.classList.add('hidden');
  } else {
    elements.btnModeQuant?.classList.add('active');
    elements.btnModeSimple?.classList.remove('active');
    elements.verdictContainer?.classList.add('hidden');
    elements.kpiScorecardGrid?.classList.remove('hidden');
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
  const allFunds = getAllFundsSync();
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

  if (elements.verdictBadge) elements.verdictBadge.textContent = verdict.badge;
  if (elements.verdictSummary) elements.verdictSummary.innerHTML = verdict.summary;
  if (elements.verdictRisk) elements.verdictRisk.innerHTML = verdict.riskVerdict;
  if (elements.verdictWinRate) elements.verdictWinRate.innerHTML = verdict.winVerdict;

  // KPI Scorecard Cards (Quant Mode)
  if (elements.kpiFinalVal) elements.kpiFinalVal.textContent = `$${Math.round(finalFundVal).toLocaleString()}`;
  if (elements.kpiFinalSub) elements.kpiFinalSub.textContent = finalBenchVal ? `vs $${Math.round(finalBenchVal).toLocaleString()} ${state.benchTicker}` : 'Initial: $10,000';

  if (elements.kpiCagr) elements.kpiCagr.textContent = formatPct(fRisk.cagr);
  if (elements.kpiCagrSub) elements.kpiCagrSub.textContent = `vs ${formatPct(bRisk.cagr)} benchmark`;

  if (elements.kpiVol) elements.kpiVol.textContent = formatPct(fRisk.annualVolatility);
  if (elements.kpiVolSub) elements.kpiVolSub.textContent = `Downside Dev: ${formatPct(fRisk.downsideDeviation)}`;

  if (elements.kpiMaxDd) elements.kpiMaxDd.textContent = formatPct(fRisk.maxDrawdown);
  if (elements.kpiMaxDdSub) elements.kpiMaxDdSub.textContent = `Ulcer Index: ${formatPct(fRisk.ulcerIndex)}`;

  if (elements.kpiSharpe) elements.kpiSharpe.textContent = fRisk.sharpeRatio.toFixed(2);
  if (elements.kpiSharpeSub) elements.kpiSharpeSub.textContent = `Sortino: ${fRisk.sortinoRatio.toFixed(2)}`;

  if (elements.kpiSortino) elements.kpiSortino.textContent = fRisk.sortinoRatio.toFixed(2);
  if (elements.kpiSortinoSub) elements.kpiSortinoSub.textContent = `Calmar: ${fRisk.calmarRatio.toFixed(2)}`;
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

  if (elements.crashTableBody) elements.crashTableBody.innerHTML = html;
}

function renderHeatmapTable() {
  const matrix = state.analysis.heatmapMatrix;
  let html = '';

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

  if (elements.heatmapTableBody) elements.heatmapTableBody.innerHTML = html;
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
  if (elements.mCagr) elements.mCagr.textContent = formatPct(fRisk.cagr);
  if (elements.mBenchCagr) elements.mBenchCagr.textContent = formatPct(bRisk.cagr);
  if (elements.mArithMean) elements.mArithMean.textContent = formatPct(fRisk.annualArithmeticMean);
  if (elements.mBestYear) elements.mBestYear.textContent = formatPct(bestYear);
  if (elements.mWorstYear) elements.mWorstYear.textContent = formatPct(worstYear);

  // Quad 2: Risk & Volatility
  if (elements.mVol) elements.mVol.textContent = formatPct(fRisk.annualVolatility);
  if (elements.mDownsideDev) elements.mDownsideDev.textContent = formatPct(fRisk.downsideDeviation);
  if (elements.mMaxDd) elements.mMaxDd.textContent = formatPct(fRisk.maxDrawdown);
  if (elements.mUlcer) elements.mUlcer.textContent = formatPct(fRisk.ulcerIndex);
  if (elements.mVar) elements.mVar.textContent = `-${formatPct(risk.varMonthly)}`;
  if (elements.mCvar) elements.mCvar.textContent = `-${formatPct(risk.cvarMonthly)}`;

  // Quad 3: Risk-Adjusted Efficiency
  if (elements.mSharpe) elements.mSharpe.textContent = fRisk.sharpeRatio.toFixed(2);
  if (elements.mSortino) elements.mSortino.textContent = fRisk.sortinoRatio.toFixed(2);
  if (elements.mTreynor) elements.mTreynor.textContent = fRisk.treynorRatio.toFixed(4);
  if (elements.mCalmar) elements.mCalmar.textContent = fRisk.calmarRatio.toFixed(2);
  if (elements.mMartin) elements.mMartin.textContent = fRisk.martinRatio.toFixed(2);
  if (elements.mOmega) elements.mOmega.textContent = fRisk.omegaRatio.toFixed(2);
  if (elements.mGainPain) elements.mGainPain.textContent = fRisk.gainToPainRatio.toFixed(2);
  if (elements.mMSquared) elements.mMSquared.textContent = formatPct(a.profile.mSquared);

  // Quad 4: Benchmark Relative (CAPM)
  if (elements.mAlpha) elements.mAlpha.textContent = `${capm.alpha >= 0 ? '+' : ''}${formatPct(capm.alpha)}`;
  if (elements.mBeta) elements.mBeta.textContent = capm.beta.toFixed(2);
  if (elements.mRSquared) elements.mRSquared.textContent = capm.rSquared.toFixed(2);
  if (elements.mTrackingError) elements.mTrackingError.textContent = formatPct(capm.trackingError);
  if (elements.mInfoRatio) elements.mInfoRatio.textContent = a.profile.informationRatio.toFixed(2);
  if (elements.mUpCapture) elements.mUpCapture.textContent = `${(a.profile.dualBeta.upCapture * 100).toFixed(1)}%`;
  if (elements.mDownCapture) elements.mDownCapture.textContent = `${(a.profile.dualBeta.downCapture * 100).toFixed(1)}%`;
  if (elements.mCaptureRatio) elements.mCaptureRatio.textContent = a.profile.dualBeta.captureRatio.toFixed(2);
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

  if (elements.rollingWinRatePill) elements.rollingWinRatePill.textContent = `${rolling.winRate}%`;
  if (elements.rollingComparisonsText) {
    elements.rollingComparisonsText.innerHTML = `Outperformed <strong>${state.benchTicker}</strong> in <strong>${rolling.outperformedWindows}</strong> of <strong>${rolling.totalWindows}</strong> rolling ${state.rollingWindowMonths}-month windows.`;
  }

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

  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);

  function getY(val) {
    if (isLog) {
      const norm = (Math.log10(val) - logMin) / (logMax - logMin);
      return pad.top + plotH * (1 - norm);
    }
    return pad.top + plotH * (1 - (val - minVal) / (maxVal - minVal));
  }

  function getX(idx) {
    return pad.left + (idx / (series.length - 1)) * plotW;
  }

  // Draw Horizontal Gridlines & Y-Axis Labels
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    let val;
    if (isLog) {
      val = Math.pow(10, logMin + (i / gridSteps) * (logMax - logMin));
    } else {
      val = minVal + (i / gridSteps) * (maxVal - minVal);
    }
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
  const yearStep = Math.max(1, Math.floor(series.length / 8));
  for (let i = 0; i < series.length; i += yearStep) {
    const x = getX(i);
    const dateStr = series[i].date.substring(0, 4);

    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, h - pad.bottom);
    ctx.stroke();

    ctx.fillText(dateStr, x, h - pad.bottom + 8);
  }

  // Draw Benchmark Line (Purple dashed)
  if (series.some(s => s.benchGrowth !== null)) {
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.75;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    let started = false;
    series.forEach((pt, idx) => {
      if (pt.benchGrowth !== null) {
        const x = getX(idx);
        const y = getY(pt.benchGrowth);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw Target Fund Area Gradient & Stroke
  const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
  grad.addColorStop(0, 'rgba(45, 212, 191, 0.28)');
  grad.addColorStop(1, 'rgba(45, 212, 191, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(getX(0), h - pad.bottom);
  series.forEach((pt, idx) => {
    ctx.lineTo(getX(idx), getY(pt.fundGrowth));
  });
  ctx.lineTo(getX(series.length - 1), h - pad.bottom);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  series.forEach((pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.fundGrowth);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Setup Hover Tooltip
  setupCanvasHover(canvas, elements.growthTooltip, (mouse) => {
    const relX = mouse.x - pad.left;
    if (relX < 0 || relX > plotW) return null;
    const idx = Math.min(series.length - 1, Math.max(0, Math.round((relX / plotW) * (series.length - 1))));
    const pt = series[idx];
    return {
      x: getX(idx),
      y: getY(pt.fundGrowth),
      html: `
        <div class="canvas-tooltip-date">${pt.date}</div>
        <div class="canvas-tooltip-row">
          <span><span class="canvas-tooltip-dot" style="background: #2dd4bf;"></span>${state.fundTicker}:</span>
          <strong>${formatCurrency(pt.fundGrowth)}</strong>
        </div>
        ${pt.benchGrowth !== null ? `
        <div class="canvas-tooltip-row" style="color: #94a3b8;">
          <span><span class="canvas-tooltip-dot" style="background: #a855f7;"></span>${state.benchTicker}:</span>
          <strong>${formatCurrency(pt.benchGrowth)}</strong>
        </div>` : ''}
      `
    };
  }, 'growth');
}

/**
 * CHART 2: Calendar Annual Returns Canvas Drawing
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
  const pad = { top: 25, right: 25, bottom: 40, left: 60 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const annuals = state.analysis.annualReturns;
  if (annuals.length === 0) return;

  let minRet = 0;
  let maxRet = 0;
  annuals.forEach(a => {
    if (a.fundReturn !== null) {
      if (a.fundReturn > maxRet) maxRet = a.fundReturn;
      if (a.fundReturn < minRet) minRet = a.fundReturn;
    }
    if (a.benchReturn !== null) {
      if (a.benchReturn > maxRet) maxRet = a.benchReturn;
      if (a.benchReturn < minRet) minRet = a.benchReturn;
    }
  });

  minRet = Math.min(-0.15, minRet * 1.15);
  maxRet = Math.max(0.15, maxRet * 1.15);

  function getY(ret) {
    return pad.top + plotH * (1 - (ret - minRet) / (maxRet - minRet));
  }

  const zeroY = getY(0);

  // Zero axis line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(w - pad.right, zeroY);
  ctx.stroke();

  // Y-axis grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = minRet + (i / steps) * (maxRet - minRet);
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillText(`${(val * 100).toFixed(0)}%`, pad.left - 8, y);
  }

  const barGroupWidth = plotW / annuals.length;
  const singleBarWidth = Math.max(3, Math.min(18, (barGroupWidth - 6) / 2));

  annuals.forEach((a, idx) => {
    const centerX = pad.left + idx * barGroupWidth + barGroupWidth / 2;

    // Fund Bar (Left)
    if (a.fundReturn !== null) {
      const fundX = centerX - singleBarWidth - 1;
      const fundY = getY(a.fundReturn);
      const barH = Math.abs(fundY - zeroY);
      const topY = a.fundReturn >= 0 ? fundY : zeroY;

      ctx.fillStyle = a.fundReturn >= 0 ? '#10b981' : '#ef4444';
      ctx.fillRect(fundX, topY, singleBarWidth, barH);
    }

    // Benchmark Bar (Right)
    if (a.benchReturn !== null) {
      const benchX = centerX + 1;
      const benchY = getY(a.benchReturn);
      const barH = Math.abs(benchY - zeroY);
      const topY = a.benchReturn >= 0 ? benchY : zeroY;

      ctx.fillStyle = 'rgba(168, 85, 247, 0.7)';
      ctx.fillRect(benchX, topY, singleBarWidth, barH);
    }

    // Year Label
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(a.year).substring(2), centerX, h - pad.bottom + 8);
  });

  // Hover Tooltip
  setupCanvasHover(canvas, elements.annualTooltip, (mouse) => {
    const relX = mouse.x - pad.left;
    if (relX < 0 || relX > plotW) return null;
    const idx = Math.min(annuals.length - 1, Math.max(0, Math.floor(relX / barGroupWidth)));
    const a = annuals[idx];
    const centerX = pad.left + idx * barGroupWidth + barGroupWidth / 2;
    return {
      x: centerX,
      y: a.fundReturn !== null ? getY(a.fundReturn) : zeroY,
      html: `
        <div class="canvas-tooltip-date">Calendar Year ${a.year}</div>
        <div class="canvas-tooltip-row">
          <span><span class="canvas-tooltip-dot" style="background: ${a.fundReturn >= 0 ? '#10b981' : '#ef4444'};"></span>${state.fundTicker}:</span>
          <strong>${a.fundReturn !== null ? formatPct(a.fundReturn) : '—'}</strong>
        </div>
        ${a.benchReturn !== null ? `
        <div class="canvas-tooltip-row" style="color: #94a3b8;">
          <span><span class="canvas-tooltip-dot" style="background: #a855f7;"></span>${state.benchTicker}:</span>
          <strong>${formatPct(a.benchReturn)}</strong>
        </div>` : ''}
        ${a.excessReturn !== null ? `
        <div class="canvas-tooltip-row" style="margin-top: 0.2rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.2rem; color: ${a.excessReturn >= 0 ? '#6ee7b7' : '#fca5a5'};">
          <span>Excess Return:</span>
          <strong>${a.excessReturn >= 0 ? '+' : ''}${formatPct(a.excessReturn)}</strong>
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
  const pad = { top: 25, right: 30, bottom: 40, left: 60 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const ddSeries = state.analysis.drawdownResult.drawdownSeries;
  if (ddSeries.length < 2) return;

  const maxDepth = Math.min(...ddSeries.map(d => d.drawdown));
  const minBound = Math.min(-0.1, maxDepth * 1.15);

  function getY(dd) {
    return pad.top + plotH * (dd / minBound);
  }

  function getX(idx) {
    return pad.left + (idx / (ddSeries.length - 1)) * plotW;
  }

  // Draw Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = (i / steps) * minBound;
    const y = getY(val);

    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    ctx.fillText(`${(val * 100).toFixed(0)}%`, pad.left - 8, y);
  }

  // Draw X Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const yearStep = Math.max(1, Math.floor(ddSeries.length / 8));
  for (let i = 0; i < ddSeries.length; i += yearStep) {
    const x = getX(i);
    const dateStr = ddSeries[i].date.substring(0, 4);

    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, h - pad.bottom);
    ctx.stroke();

    ctx.fillText(dateStr, x, h - pad.bottom + 8);
  }

  // Draw Underwater Red Area
  const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.05)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0.45)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(getX(0), pad.top);
  ddSeries.forEach((pt, idx) => {
    ctx.lineTo(getX(idx), getY(pt.drawdown));
  });
  ctx.lineTo(getX(ddSeries.length - 1), pad.top);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ddSeries.forEach((pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.drawdown);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Hover Tooltip
  setupCanvasHover(canvas, elements.drawdownTooltip, (mouse) => {
    const relX = mouse.x - pad.left;
    if (relX < 0 || relX > plotW) return null;
    const idx = Math.min(ddSeries.length - 1, Math.max(0, Math.round((relX / plotW) * (ddSeries.length - 1))));
    const pt = ddSeries[idx];
    return {
      x: getX(idx),
      y: getY(pt.drawdown),
      html: `
        <div class="canvas-tooltip-date">${pt.date}</div>
        <div class="canvas-tooltip-row">
          <span><span class="canvas-tooltip-dot" style="background: #ef4444;"></span>Drawdown from Peak:</span>
          <strong style="color: #f87171;">${formatPct(pt.drawdown)}</strong>
        </div>
      `
    };
  }, 'drawdown');
}

/**
 * CHART 4: Rolling Multi-Year CAGR Comparison Chart
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
  const pad = { top: 25, right: 30, bottom: 40, left: 60 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const rollSeries = state.analysis.rollingStats.series;
  if (!rollSeries || rollSeries.length < 2) {
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.font = '13px -apple-system, sans-serif';
    ctx.fillText('Insufficient historical data for rolling window', w / 2, h / 2);
    return;
  }

  let minVal = Infinity;
  let maxVal = -Infinity;
  rollSeries.forEach(pt => {
    if (pt.fundCagr > maxVal) maxVal = pt.fundCagr;
    if (pt.fundCagr < minVal) minVal = pt.fundCagr;
    if (pt.benchCagr !== null) {
      if (pt.benchCagr > maxVal) maxVal = pt.benchCagr;
      if (pt.benchCagr < minVal) minVal = pt.benchCagr;
    }
  });

  minVal = Math.min(-0.05, minVal * 1.15);
  maxVal = Math.max(0.1, maxVal * 1.15);

  function getY(cagr) {
    return pad.top + plotH * (1 - (cagr - minVal) / (maxVal - minVal));
  }

  function getX(idx) {
    return pad.left + (idx / (rollSeries.length - 1)) * plotW;
  }

  const zeroY = getY(0);

  // Zero axis line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(w - pad.right, zeroY);
  ctx.stroke();

  // Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = minVal + (i / steps) * (maxVal - minVal);
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillText(`${(val * 100).toFixed(0)}%`, pad.left - 8, y);
  }

  // X Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const yearStep = Math.max(1, Math.floor(rollSeries.length / 8));
  for (let i = 0; i < rollSeries.length; i += yearStep) {
    const x = getX(i);
    const dateStr = rollSeries[i].date.substring(0, 4);

    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, h - pad.bottom);
    ctx.stroke();

    ctx.fillText(dateStr, x, h - pad.bottom + 8);
  }

  // Benchmark rolling line (Purple dashed)
  if (rollSeries.some(s => s.benchCagr !== null)) {
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.75;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    let started = false;
    rollSeries.forEach((pt, idx) => {
      if (pt.benchCagr !== null) {
        const x = getX(idx);
        const y = getY(pt.benchCagr);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Target Fund Rolling CAGR Line
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  rollSeries.forEach((pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.fundCagr);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Hover Tooltip
  setupCanvasHover(canvas, elements.rollingTooltip, (mouse) => {
    const relX = mouse.x - pad.left;
    if (relX < 0 || relX > plotW) return null;
    const idx = Math.min(rollSeries.length - 1, Math.max(0, Math.round((relX / plotW) * (rollSeries.length - 1))));
    const pt = rollSeries[idx];
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

  downloadCSV(csv, `fund_performance_${state.fundTicker}_vs_${state.benchTicker}.csv`);
}

/* ===================================================================
   AUTOCORRELATION LAB CONTROLLER & CANVAS RENDERERS
   =================================================================== */

/**
 * Formats a correlation coefficient to 2 decimal places
 */
function formatCorrelation(val) {
  return typeof val === 'number' && !isNaN(val) ? val.toFixed(2) : '0.00';
}

/**
 * Runs Autocorrelation analysis on the selected target asset
 */
function runAutocorrelationAnalysis() {
  const allFunds = getAllFundsSync();
  let fund = allFunds.find(f => f.ticker === state.autocorrTicker);
  if (!fund) {
    fund = allFunds[0];
    if (fund) state.autocorrTicker = fund.ticker;
  }
  if (!fund) return;

  updateAutocorrPickerButton();

  const monthlyReturns = computeMonthlyReturns(fund.data, state.useDRIP);
  if (monthlyReturns.length < state.autocorrRollPeriod) {
    if (elements.autocorrStatusText) {
      elements.autocorrStatusText.textContent = `Insufficient monthly history for ${fund.ticker} (${monthlyReturns.length} months vs ${state.autocorrRollPeriod}M roll).`;
    }
    return;
  }

  const returns = monthlyReturns.map(r => r.return);
  const dates = monthlyReturns.map(r => r.date);

  const rolling = calculateRollingAutocorrelation(returns, dates, state.autocorrRollPeriod, [1, 3, 12]);
  state.autocorrResult = rolling;

  if (elements.autocorrStatusText) {
    elements.autocorrStatusText.textContent = `Calculated ${rolling.dates.length} rolling ${state.autocorrRollPeriod}-month autocorrelation periods for ${fund.ticker}.`;
  }

  if (elements.autocorrDateRangeText && dates.length > 0) {
    elements.autocorrDateRangeText.textContent = `Asset autocorrelations for time period ${dates[0]} - ${dates[dates.length - 1]} based on monthly returns.`;
  }

  // Update Block Titles and Stat Pills
  const rollLabel = `${state.autocorrRollPeriod}-month`;
  const fundLabel = `${fund.name || fund.ticker} (${fund.ticker})`;

  // Lag 1
  if (elements.autocorrTitleLag1) {
    elements.autocorrTitleLag1.textContent = `${fundLabel} ${rollLabel} rolling autocorrelation (monthly returns), Time Lag = 1`;
  }
  const s1 = rolling.summary[1] || { current: 0, mean: 0, min: 0, max: 0 };
  if (elements.autocorrLag1Current) elements.autocorrLag1Current.textContent = formatCorrelation(s1.current);
  if (elements.autocorrLag1Mean) elements.autocorrLag1Mean.textContent = formatCorrelation(s1.mean);
  if (elements.autocorrLag1Min) elements.autocorrLag1Min.textContent = formatCorrelation(s1.min);
  if (elements.autocorrLag1Max) elements.autocorrLag1Max.textContent = formatCorrelation(s1.max);

  // Lag 3
  if (elements.autocorrTitleLag3) {
    elements.autocorrTitleLag3.textContent = `${fundLabel} ${rollLabel} rolling autocorrelation (monthly returns), Time Lag = 3`;
  }
  const s3 = rolling.summary[3] || { current: 0, mean: 0, min: 0, max: 0 };
  if (elements.autocorrLag3Current) elements.autocorrLag3Current.textContent = formatCorrelation(s3.current);
  if (elements.autocorrLag3Mean) elements.autocorrLag3Mean.textContent = formatCorrelation(s3.mean);
  if (elements.autocorrLag3Min) elements.autocorrLag3Min.textContent = formatCorrelation(s3.min);
  if (elements.autocorrLag3Max) elements.autocorrLag3Max.textContent = formatCorrelation(s3.max);

  // Lag 12
  if (elements.autocorrTitleLag12) {
    elements.autocorrTitleLag12.textContent = `${fundLabel} ${rollLabel} rolling autocorrelation (monthly returns), Time Lag = 12`;
  }
  const s12 = rolling.summary[12] || { current: 0, mean: 0, min: 0, max: 0 };
  if (elements.autocorrLag12Current) elements.autocorrLag12Current.textContent = formatCorrelation(s12.current);
  if (elements.autocorrLag12Mean) elements.autocorrLag12Mean.textContent = formatCorrelation(s12.mean);
  if (elements.autocorrLag12Min) elements.autocorrLag12Min.textContent = formatCorrelation(s12.min);
  if (elements.autocorrLag12Max) elements.autocorrLag12Max.textContent = formatCorrelation(s12.max);

  drawAllAutocorrCharts();
}

/**
 * Draws all 3 stacked autocorrelation charts
 */
function drawAllAutocorrCharts() {
  if (!state.autocorrResult || !state.autocorrResult.series) return;

  drawAutocorrCanvasChart(
    elements.canvasAutocorrLag1,
    elements.tooltipAutocorrLag1,
    state.autocorrResult.series[1],
    1,
    'autocorr1'
  );

  drawAutocorrCanvasChart(
    elements.canvasAutocorrLag3,
    elements.tooltipAutocorrLag3,
    state.autocorrResult.series[3],
    3,
    'autocorr3'
  );

  drawAutocorrCanvasChart(
    elements.canvasAutocorrLag12,
    elements.tooltipAutocorrLag12,
    state.autocorrResult.series[12],
    12,
    'autocorr12'
  );
}

/**
 * Draws a single High-DPI rolling autocorrelation chart with zero baseline and purple area shading
 */
function drawAutocorrCanvasChart(canvas, tooltipEl, series, lag, controllerKey) {
  if (!canvas || !series || series.length < 2) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 20, right: 30, bottom: 35, left: 55 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  // Determine Y Bounds (ensure zero line is always well-framed, min span [-0.4, 0.4])
  let minVal = 0;
  let maxVal = 0;
  series.forEach(pt => {
    if (pt.value < minVal) minVal = pt.value;
    if (pt.value > maxVal) maxVal = pt.value;
  });

  minVal = Math.min(-0.35, minVal * 1.2);
  maxVal = Math.max(0.35, maxVal * 1.2);
  // Cap inside [-1.0, 1.0]
  minVal = Math.max(-1.0, minVal);
  maxVal = Math.min(1.0, maxVal);

  function getY(val) {
    return pad.top + plotH * (1 - (val - minVal) / (maxVal - minVal));
  }

  function getX(idx) {
    return pad.left + (idx / (series.length - 1)) * plotW;
  }

  const zeroY = getY(0);

  // 1. Gridlines and Y Labels
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const val = minVal + (i / ySteps) * (maxVal - minVal);
    const y = getY(val);

    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    ctx.fillText(val.toFixed(2), pad.left - 8, y);
  }

  // 2. X Ticks (Date years)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xStep = Math.max(1, Math.floor(series.length / 8));
  for (let i = 0; i < series.length; i += xStep) {
    const x = getX(i);
    const yearStr = series[i].date.substring(0, 4);

    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, h - pad.bottom);
    ctx.stroke();

    ctx.fillText(yearStr, x, h - pad.bottom + 8);
  }

  // 3. Purple Shaded Area Fill between curve and Zero Baseline
  ctx.beginPath();
  ctx.moveTo(getX(0), zeroY);
  for (let i = 0; i < series.length; i++) {
    ctx.lineTo(getX(i), getY(series[i].value));
  }
  ctx.lineTo(getX(series.length - 1), zeroY);
  ctx.closePath();
  ctx.fillStyle = 'rgba(168, 85, 247, 0.32)';
  ctx.fill();

  // 4. Zero Baseline Stroke
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(w - pad.right, zeroY);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 5. Autocorrelation Curve Stroke
  ctx.beginPath();
  for (let i = 0; i < series.length; i++) {
    const x = getX(i);
    const y = getY(series[i].value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 6. Interactive Hover Crosshairs via universal helper
  if (tooltipEl) {
    setupCanvasHover(canvas, tooltipEl, (xPos, yPos) => {
      if (xPos < pad.left || xPos > w - pad.right) return null;

      const ratio = (xPos - pad.left) / plotW;
      const idx = Math.max(0, Math.min(series.length - 1, Math.round(ratio * (series.length - 1))));
      const pt = series[idx];
      const ptX = getX(idx);
      const ptY = getY(pt.value);

      // Redraw crosshair & active dot
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(canvas, 0, 0); // Re-use base buffer

      // Dynamic redraw
      drawAutocorrBase(ctx, w, h, pad, plotW, plotH, series, minVal, maxVal, zeroY, getX, getY);

      // Draw crosshair line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(ptX, pad.top);
      ctx.lineTo(ptX, h - pad.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw dot
      ctx.fillStyle = '#a855f7';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ptX, ptY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Regime badge text
      let regimeBadge = '<span style="color: #94a3b8;">Random Walk (Independent)</span>';
      if (pt.value >= 0.15) {
        regimeBadge = '<span style="color: #34d399; font-weight: 700;">Trend Persistence (Momentum)</span>';
      } else if (pt.value <= -0.15) {
        regimeBadge = '<span style="color: #f59e0b; font-weight: 700;">Mean Reverting (Oscillatory)</span>';
      }

      const html = `
        <div style="font-weight: 700; color: #f8fafc; margin-bottom: 0.35rem; font-size: 0.85rem;">${pt.date}</div>
        <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.25rem;">
          <span style="color: #cbd5e1;">Lag ${lag} Autocorr:</span>
          <strong style="color: #c084fc;">${formatCorrelation(pt.value)}</strong>
        </div>
        <div style="font-size: 0.75rem; margin-top: 0.35rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.3rem;">
          ${regimeBadge}
        </div>
      `;

      return {
        x: ptX,
        y: ptY,
        html
      };
    }, controllerKey);
  }
}

/**
 * Base rendering subroutine for Autocorrelation chart
 */
function drawAutocorrBase(ctx, w, h, pad, plotW, plotH, series, minVal, maxVal, zeroY, getX, getY) {
  // 1. Gridlines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const val = minVal + (i / ySteps) * (maxVal - minVal);
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillText(val.toFixed(2), pad.left - 8, y);
  }

  // 2. X Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xStep = Math.max(1, Math.floor(series.length / 8));
  for (let i = 0; i < series.length; i += xStep) {
    const x = getX(i);
    const yearStr = series[i].date.substring(0, 4);
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, h - pad.bottom);
    ctx.stroke();
    ctx.fillText(yearStr, x, h - pad.bottom + 8);
  }

  // 3. Purple Shaded Area Fill
  ctx.beginPath();
  ctx.moveTo(getX(0), zeroY);
  for (let i = 0; i < series.length; i++) {
    ctx.lineTo(getX(i), getY(series[i].value));
  }
  ctx.lineTo(getX(series.length - 1), zeroY);
  ctx.closePath();
  ctx.fillStyle = 'rgba(168, 85, 247, 0.32)';
  ctx.fill();

  // 4. Zero Baseline Stroke
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(w - pad.right, zeroY);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 5. Curve
  ctx.beginPath();
  for (let i = 0; i < series.length; i++) {
    const x = getX(i);
    const y = getY(series[i].value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Exports Autocorrelation time series to CSV
 */
function exportAutocorrelationCSV() {
  const res = state.autocorrResult;
  if (!res || !res.dates || res.dates.length === 0) return;

  let csv = `Date,Lag 1 Autocorrelation,Lag 3 Autocorrelation,Lag 12 Autocorrelation\n`;
  for (let i = 0; i < res.dates.length; i++) {
    const date = res.dates[i];
    const r1 = res.series[1][i]?.value?.toFixed(4) || '';
    const r3 = res.series[3][i]?.value?.toFixed(4) || '';
    const r12 = res.series[12][i]?.value?.toFixed(4) || '';
    csv += `${date},${r1},${r3},${r12}\n`;
  }

  downloadCSV(csv, `autocorrelation_${state.autocorrTicker}_${state.autocorrRollPeriod}M.csv`);
}

/* ===================================================================
   COINTEGRATION ANALYSIS CONTROLLER & CANVAS RENDERERS
   =================================================================== */

/**
 * Runs Cointegration Analysis on Dependent (Y) and Independent (X) assets
 */
function runCointegrationAnalysisUI() {
  const allFunds = getAllFundsSync();
  let dep = allFunds.find(f => f.ticker === state.cointDepTicker);
  let indep = allFunds.find(f => f.ticker === state.cointIndepTicker);

  if (!dep) {
    dep = allFunds[0];
    if (dep) state.cointDepTicker = dep.ticker;
  }
  if (!indep) {
    indep = allFunds.find(f => f.ticker !== state.cointDepTicker) || allFunds[1] || allFunds[0];
    if (indep) state.cointIndepTicker = indep.ticker;
  }
  if (!dep || !indep) return;

  updateCointPickerButtons();

  const useDRIP = state.cointPriceBasis === 'drip';
  const result = runCointegrationAnalysis(dep, indep, {
    useDRIP,
    adfLags: state.cointAdfLags
  });

  if (result.error) {
    if (elements.cointStatusText) elements.cointStatusText.textContent = `Error: ${result.error}`;
    return;
  }

  state.cointResult = result;

  if (elements.cointStatusText) {
    elements.cointStatusText.textContent = `Analyzed ${result.period.months} overlapping monthly price points. ADF Test Statistic: ${result.adfTest.testStatistic.toFixed(3)}.`;
  }

  if (elements.cointConstraintNote) {
    elements.cointConstraintNote.textContent = `Note: The time period was constrained by the available data for ${result.dependent.name} (${result.dependent.ticker}) [${result.period.start} - ${result.period.end}].`;
  }

  // Populate Table Row
  if (elements.cointTableBody) {
    const isCoint95 = result.isCointegrated;
    const isCoint90 = result.adfTest.testStatistic < result.criticalValues.crit90;

    const rowHtml = `
      <tr>
        <td style="font-weight: 600; color: #f8fafc;">${result.dependent.name} (${result.dependent.ticker})</td>
        <td style="font-weight: 600; color: #f8fafc;">${result.independent.name} (${result.independent.ticker})</td>
        <td class="text-right" style="font-weight: 700; color: #38bdf8;">${result.adfTest.testStatistic.toFixed(3)}</td>
        <td class="text-right" style="font-weight: 700; color: #f8fafc;">${result.pValue.toFixed(2)}</td>
        <td class="text-center">
          <span class="${isCoint95 ? 'badge-coint-yes' : 'badge-coint-no'}">${result.confidence95}</span>
        </td>
        <td class="text-center">
          <span class="${isCoint90 ? 'badge-coint-yes' : 'badge-coint-no'}">${result.confidence90}</span>
        </td>
      </tr>
    `;
    elements.cointTableBody.innerHTML = rowHtml;
  }

  if (elements.cointTableCaption) {
    elements.cointTableCaption.textContent = `Cointegration test results for time period ${result.period.start} - ${result.period.end} based on ${useDRIP ? 'adjusted prices' : 'monthly prices'}.`;
  }

  // Populate Diagnostics Stats Banner
  if (elements.cointStatBeta) elements.cointStatBeta.textContent = result.cointegratingEquation.beta.toFixed(3);
  if (elements.cointStatAlpha) elements.cointStatAlpha.textContent = formatCurrency(result.cointegratingEquation.alpha);
  if (elements.cointStatStd) elements.cointStatStd.textContent = result.cointegratingEquation.residualStd.toFixed(3);

  const gamma = result.adfTest.gamma;
  const halfLife = (gamma < 0 && (1 + gamma) > 0)
    ? (-Math.log(2) / Math.log(1 + gamma)).toFixed(1) + ' Mos'
    : 'N/A';
  if (elements.cointStatHalflife) elements.cointStatHalflife.textContent = halfLife;

  drawCointegrationSpreadChart();
}

/**
 * Draws High-DPI Cointegration Residual & Mean-Reverting Spread Chart with +/- 1 sigma and +/- 2 sigma bounds
 */
function drawCointegrationSpreadChart() {
  const canvas = elements.cointegrationCanvas;
  const tooltipEl = elements.cointegrationTooltip;
  const res = state.cointResult;

  if (!canvas || !res || !res.spreadSeries || res.spreadSeries.length < 2) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 25, right: 35, bottom: 40, left: 60 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const series = res.spreadSeries;

  // Determine Z-Score bounds (ensure +/- 2.5 sigma is visible)
  let minZ = -2.5;
  let maxZ = 2.5;
  series.forEach(pt => {
    if (pt.zScore < minZ) minZ = pt.zScore;
    if (pt.zScore > maxZ) maxZ = pt.zScore;
  });
  minZ *= 1.15;
  maxZ *= 1.15;

  function getY(z) {
    return pad.top + plotH * (1 - (z - minZ) / (maxZ - minZ));
  }

  function getX(idx) {
    return pad.left + (idx / (series.length - 1)) * plotW;
  }

  const zeroY = getY(0);
  const plus1Y = getY(1.0);
  const minus1Y = getY(-1.0);
  const plus2Y = getY(2.0);
  const minus2Y = getY(-2.0);

  // 1. Shaded Band between -1 sigma and +1 sigma
  ctx.fillStyle = 'rgba(45, 212, 191, 0.05)';
  ctx.fillRect(pad.left, plus1Y, plotW, minus1Y - plus1Y);

  // 2. Horizontal Statistical Band Lines
  function drawBand(y, color, dash = [4, 4], label = '') {
    ctx.strokeStyle = color;
    ctx.setLineDash(dash);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (label) {
      ctx.fillStyle = color;
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, w - pad.right - 4, y - 2);
    }
  }

  drawBand(plus2Y, 'rgba(239, 68, 68, 0.6)', [4, 4], '+2σ Overbought (Short Spread)');
  drawBand(plus1Y, 'rgba(234, 179, 8, 0.45)', [3, 3], '+1σ');
  drawBand(minus1Y, 'rgba(234, 179, 8, 0.45)', [3, 3], '-1σ');
  drawBand(minus2Y, 'rgba(34, 197, 94, 0.6)', [4, 4], '-2σ Oversold (Long Spread)');

  // 3. Zero Mean Equilibrium Baseline
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(w - pad.right, zeroY);
  ctx.stroke();

  // 4. Y-Axis Ticks & Labels
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  [-2, -1, 0, 1, 2].forEach(zVal => {
    const y = getY(zVal);
    ctx.fillText(`${zVal > 0 ? '+' : ''}${zVal}σ`, pad.left - 8, y);
  });

  // 5. X Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xStep = Math.max(1, Math.floor(series.length / 8));
  for (let i = 0; i < series.length; i += xStep) {
    const x = getX(i);
    const yearStr = series[i].date.substring(0, 4);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, h - pad.bottom);
    ctx.stroke();

    ctx.fillText(yearStr, x, h - pad.bottom + 8);
  }

  // 6. Draw Residual Spread Curve
  ctx.beginPath();
  for (let i = 0; i < series.length; i++) {
    const x = getX(i);
    const y = getY(series[i].zScore);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 7. Interactive Hover Crosshairs via universal helper
  if (tooltipEl) {
    setupCanvasHover(canvas, tooltipEl, (xPos, yPos) => {
      if (xPos < pad.left || xPos > w - pad.right) return null;

      const ratio = (xPos - pad.left) / plotW;
      const idx = Math.max(0, Math.min(series.length - 1, Math.round(ratio * (series.length - 1))));
      const pt = series[idx];
      const ptX = getX(idx);
      const ptY = getY(pt.zScore);

      // Redraw base
      ctx.clearRect(0, 0, w, h);
      drawCointegrationBase(ctx, w, h, pad, plotW, plotH, series, minZ, maxZ, zeroY, plus1Y, minus1Y, plus2Y, minus2Y, getX, getY);

      // Draw crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(ptX, pad.top);
      ctx.lineTo(ptX, h - pad.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw active dot
      ctx.fillStyle = '#2dd4bf';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ptX, ptY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Determine statistical arbitrage trade signal
      let signalHtml = '<span style="color: #94a3b8;">Equilibrium (Neutral)</span>';
      if (pt.zScore >= 2.0) {
        signalHtml = '<span style="color: #f87171; font-weight: 700;">Overbought (+2σ) &bull; Short Spread</span>';
      } else if (pt.zScore <= -2.0) {
        signalHtml = '<span style="color: #4ade80; font-weight: 700;">Oversold (-2σ) &bull; Long Spread</span>';
      }

      const html = `
        <div style="font-weight: 700; color: #f8fafc; margin-bottom: 0.35rem; font-size: 0.85rem;">${pt.date}</div>
        <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.2rem;">
          <span style="color: #cbd5e1;">Z-Score:</span>
          <strong style="color: #2dd4bf;">${pt.zScore > 0 ? '+' : ''}${pt.zScore.toFixed(2)}σ</strong>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.2rem;">
          <span style="color: #cbd5e1;">Raw Residual (e):</span>
          <span style="color: #f8fafc; font-variant-numeric: tabular-nums;">${pt.residual.toFixed(3)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.2rem;">
          <span style="color: #cbd5e1;">Spread (Y - βX):</span>
          <span style="color: #f8fafc; font-variant-numeric: tabular-nums;">${pt.spread.toFixed(2)}</span>
        </div>
        <div style="font-size: 0.75rem; margin-top: 0.35rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.3rem;">
          ${signalHtml}
        </div>
      `;

      return {
        x: ptX,
        y: ptY,
        html
      };
    }, 'cointegration');
  }
}

/**
 * Base rendering subroutine for Cointegration chart
 */
function drawCointegrationBase(ctx, w, h, pad, plotW, plotH, series, minZ, maxZ, zeroY, plus1Y, minus1Y, plus2Y, minus2Y, getX, getY) {
  // Shaded Band
  ctx.fillStyle = 'rgba(45, 212, 191, 0.05)';
  ctx.fillRect(pad.left, plus1Y, plotW, minus1Y - plus1Y);

  function drawBand(y, color, dash = [4, 4], label = '') {
    ctx.strokeStyle = color;
    ctx.setLineDash(dash);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (label) {
      ctx.fillStyle = color;
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, w - pad.right - 4, y - 2);
    }
  }

  drawBand(plus2Y, 'rgba(239, 68, 68, 0.6)', [4, 4], '+2σ Overbought (Short Spread)');
  drawBand(plus1Y, 'rgba(234, 179, 8, 0.45)', [3, 3], '+1σ');
  drawBand(minus1Y, 'rgba(234, 179, 8, 0.45)', [3, 3], '-1σ');
  drawBand(minus2Y, 'rgba(34, 197, 94, 0.6)', [4, 4], '-2σ Oversold (Long Spread)');

  // Zero Mean
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(w - pad.right, zeroY);
  ctx.stroke();

  // Y Labels
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  [-2, -1, 0, 1, 2].forEach(zVal => {
    const y = getY(zVal);
    ctx.fillText(`${zVal > 0 ? '+' : ''}${zVal}σ`, pad.left - 8, y);
  });

  // X Ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xStep = Math.max(1, Math.floor(series.length / 8));
  for (let i = 0; i < series.length; i += xStep) {
    const x = getX(i);
    const yearStr = series[i].date.substring(0, 4);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, h - pad.bottom);
    ctx.stroke();
    ctx.fillText(yearStr, x, h - pad.bottom + 8);
  }

  // Curve
  ctx.beginPath();
  for (let i = 0; i < series.length; i++) {
    const x = getX(i);
    const y = getY(series[i].zScore);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Exports Cointegration analysis and spread series to CSV
 */
function exportCointegrationCSV() {
  const res = state.cointResult;
  if (!res || !res.spreadSeries) return;

  let csv = '=== ASSET COINTEGRATION TEST REPORT ===\n';
  csv += `Dependent Asset (Y),${res.dependent.ticker} (${res.dependent.name})\n`;
  csv += `Independent Asset (X),${res.independent.ticker} (${res.independent.name})\n`;
  csv += `Analysis Period,${res.period.start} to ${res.period.end} (${res.period.months} months)\n`;
  csv += `Price Basis,${state.cointPriceBasis === 'drip' ? 'Adjusted Prices (DRIP)' : 'Monthly Prices'}\n\n`;

  csv += '--- ADF COINTEGRATION TEST METRICS ---\n';
  csv += `Test Statistic,${res.adfTest.testStatistic.toFixed(4)}\n`;
  csv += `p-value,${res.pValue.toFixed(4)}\n`;
  csv += `95% Confidence Verdict,${res.confidence95} (Critical: ${res.criticalValues.crit95.toFixed(3)})\n`;
  csv += `90% Confidence Verdict,${res.confidence90} (Critical: ${res.criticalValues.crit90.toFixed(3)})\n`;
  csv += `Hedge Ratio (Beta),${res.cointegratingEquation.beta.toFixed(4)}\n`;
  csv += `Cointegrating Intercept (Alpha),${res.cointegratingEquation.alpha.toFixed(4)}\n`;
  csv += `Residual Std Dev,${res.cointegratingEquation.residualStd.toFixed(4)}\n\n`;

  csv += '--- MONTHLY COINTEGRATION SPREAD SERIES ---\n';
  csv += 'Date,Dependent Price,Independent Price,Raw Spread,Residual,Z-Score\n';
  res.spreadSeries.forEach(pt => {
    csv += `${pt.date},${pt.priceDep.toFixed(2)},${pt.priceIndep.toFixed(2)},${pt.spread.toFixed(4)},${pt.residual.toFixed(4)},${pt.zScore.toFixed(4)}\n`;
  });

  downloadCSV(csv, `cointegration_${res.dependent.ticker}_vs_${res.independent.ticker}.csv`);
}
