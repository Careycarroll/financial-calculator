/**
 * Asset Analytics Studio UI Controller
 * Manages reactive UI state, Canvas charts, underwater drawdown tables,
 * monthly return heatmaps, rolling metric diagnostics, and searchable asset selector modal.
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
import { formatCurrency, rafThrottle } from '../js/chart-utils.js';
import { formatPct } from '../js/formatting.js';

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

// Searchable Modal State
let modalMode = 'target'; // 'target' | 'benchmark'
let activeCategoryFilter = 'all'; // 'all' | 'preset' | 'custom'

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

async function init() {
  cacheDOMElements();
  bindEvents();

  // Initialize IndexedDB session repository
  await initSessionFunds();

  updatePickerButtons();
  updateCategoryCounts();
  updateViewModeUI();
  runAnalysis();

  // Subscribe to changes in the session fund repository
  subscribeSessionFunds(() => {
    updateCategoryCounts();
    updatePickerButtons();
    if (elements.assetModalOverlay && !elements.assetModalOverlay.classList.contains('hidden')) {
      renderModalAssetList();
    }
  });

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

    // Controls
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

function updateCategoryCounts() {
  const allFunds = getAllFundsSync();
  const presets = allFunds.filter(f => f.isPreset).length;
  const custom = allFunds.filter(f => !f.isPreset).length;

  if (elements.countAll) elements.countAll.textContent = allFunds.length;
  if (elements.countPreset) elements.countPreset.textContent = presets;
  if (elements.countCustom) elements.countCustom.textContent = custom;
}

function bindEvents() {
  // Modal Triggers
  if (elements.btnOpenTargetModal) {
    elements.btnOpenTargetModal.addEventListener('click', () => openAssetModal('target'));
  }
  if (elements.btnOpenBenchModal) {
    elements.btnOpenBenchModal.addEventListener('click', () => openAssetModal('benchmark'));
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
        runAnalysis();
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

  // Controls
  if (elements.rangeSelect) {
    elements.rangeSelect.addEventListener('change', (e) => {
      state.timeHorizon = e.target.value;
      runAnalysis();
    });
  }

  if (elements.dripToggle) {
    elements.dripToggle.addEventListener('change', (e) => {
      state.useDRIP = e.target.value === 'true';
      runAnalysis();
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
}

/**
 * Opens Searchable Asset / Benchmark Modal
 * @param {'target' | 'benchmark'} mode
 */
function openAssetModal(mode) {
  modalMode = mode;

  if (elements.modalTitle) {
    elements.modalTitle.textContent = mode === 'target'
      ? 'Select Target Asset / Fund'
      : 'Select Benchmark Reference';
  }

  if (elements.modalTargetTypeBadge) {
    elements.modalTargetTypeBadge.textContent = mode === 'target' ? 'Target Asset' : 'Benchmark Reference';
    elements.modalTargetTypeBadge.style.background = mode === 'target' ? 'rgba(45, 212, 191, 0.15)' : 'rgba(168, 85, 247, 0.15)';
    elements.modalTargetTypeBadge.style.color = mode === 'target' ? '#2dd4bf' : '#c084fc';
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
  if (modalMode === 'target') {
    state.fundTicker = ticker.toUpperCase();
  } else {
    state.benchTicker = ticker.toUpperCase();
  }

  updatePickerButtons();
  closeAssetModal();
  runAnalysis();
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
    item.addEventListener('click', (e) => {
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

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `fund_performance_${state.fundTicker}_vs_${state.benchTicker}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
