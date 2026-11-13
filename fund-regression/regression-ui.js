/**
 * Fund Regression & Factor Analysis Lab UI Controller
 * Manages reactive UI state, Canvas SML & Rolling charts, scorecard table, and localStorage fund sync.
 */

import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import { parseCSV, resampleToMonthly } from '../dca-comparator/dca-engine.js';
import { analyzeFundRegression } from './regression-engine.js';

const STORAGE_KEY_CUSTOM_FUNDS = 'dca_custom_funds_library';

const ZOOM_STEPS = [
  0.5, 0.6, 0.7, 0.8, 0.9,
  1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0,
  2.2, 2.4, 2.6, 2.8, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 10.0, 15.0, 20.0, 30.0
];

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
  viewMode: 'simple', // 'simple' | 'quant'
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
  mousePos: null,
  // Zoom & Pan
  zoom: 1.0,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  searchQuery: ''
};

let elements = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
  cacheDOMElements();
  loadCustomLibraryIntoUniverse();
  renderUniverseChips();
  populateDropdowns();
  attachEventListeners();
  setMode('simple');
  runAnalysis();
}

function cacheDOMElements() {
  elements = {
    btnModeSimple: document.getElementById('btn-mode-simple'),
    btnModeQuant: document.getElementById('btn-mode-quant'),
    cheatSheetSection: document.getElementById('cheat-sheet-section'),
    cheatSheetToggle: document.getElementById('cheat-sheet-toggle'),
    cheatSheetBody: document.getElementById('cheat-sheet-body'),
    cheatSheetArrow: document.getElementById('cheat-sheet-arrow'),
    storyTakeawayText: document.getElementById('story-takeaway-text'),
    statusBenchmarkName: document.getElementById('status-benchmark-name'),
    statusUniverseCount: document.getElementById('status-universe-count'),
    statusRfRate: document.getElementById('status-rf-rate'),
    statusRfPill: document.getElementById('status-rf-pill'),
    alertsContainer: document.getElementById('regression-alerts-container'),
    panelBenchmark: document.getElementById('panel-benchmark'),
    panelAdvancedParams: document.getElementById('panel-advanced-params'),
    panelRollingSetup: document.getElementById('panel-rolling-setup'),
    panelFundUniverse: document.getElementById('panel-fund-universe'),
    selectBenchmark: document.getElementById('select-benchmark'),
    inputRf: document.getElementById('input-risk-free-rate'),
    quickRfButtons: document.querySelectorAll('.btn-quick-rf'),
    checkDRIP: document.getElementById('check-regression-drip'),
    selectRollingWindow: document.getElementById('select-rolling-window'),
    selectFocusFund: document.getElementById('select-focus-fund'),
    universeBadge: document.getElementById('universe-badge'),
    inputUniverseSearch: document.getElementById('universe-search-input'),
    universeFilteredCount: document.getElementById('universe-filtered-count'),
    btnSelectAllFunds: document.getElementById('btn-select-all-funds'),
    btnDeselectAllFunds: document.getElementById('btn-deselect-all-funds'),
    presetUniverseChips: document.getElementById('preset-universe-chips'),
    savedCustomSection: document.getElementById('saved-custom-section'),
    customUniverseChips: document.getElementById('custom-universe-chips'),
    dropzone: document.getElementById('regression-dropzone'),
    fileInput: document.getElementById('regression-file-input'),
    kpiGrid: document.getElementById('kpi-highlights-grid'),
    chartTabsWrapper: document.getElementById('chart-tabs-wrapper'),
    simpleChartTitle: document.getElementById('simple-chart-title'),
    chartTabButtons: document.querySelectorAll('.chart-tab-btn'),
    canvasWrapper: document.getElementById('canvas-wrapper'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnZoomReset: document.getElementById('btn-zoom-reset'),
    zoomLevelPill: document.getElementById('zoom-level-pill'),
    canvas: document.getElementById('regression-chart'),
    chartLegend: document.getElementById('regression-chart-legend'),
    simpleScorecardCard: document.getElementById('simple-scorecard-card'),
    simpleScorecardBody: document.getElementById('simple-scorecard-body'),
    quantScorecardCard: document.getElementById('quant-scorecard-card'),
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

function saveCustomFundsBatch(funds) {
  try {
    const lib = getCustomLibrary();
    const map = new Map(lib.map(f => [f.ticker, f]));
    funds.forEach(fund => {
      map.set(fund.ticker, {
        ticker: fund.ticker,
        name: fund.name,
        color: fund.color,
        data: fund.data
      });
    });
    const updated = Array.from(map.values());
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_FUNDS, JSON.stringify(updated));
    } catch (quotaErr) {
      console.warn('LocalStorage quota limit reached. Preserved in memory for this session.', quotaErr);
    }
  } catch (e) {
    console.warn('Could not cache to localStorage', e);
  }
}

function saveCustomFundToLibrary(fund) {
  saveCustomFundsBatch([fund]);
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
  const benchFrag = document.createDocumentFragment();
  allFunds.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.ticker;
    opt.textContent = `${f.ticker} - ${f.name}`;
    if (f.ticker === state.benchmarkTicker) opt.selected = true;
    benchFrag.appendChild(opt);
  });
  elements.selectBenchmark.appendChild(benchFrag);

  // Focus fund selector
  elements.selectFocusFund.innerHTML = '';
  const focusFrag = document.createDocumentFragment();
  allFunds.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.ticker;
    opt.textContent = `${f.ticker} - ${f.name}`;
    if (f.ticker === state.focusFundTicker) opt.selected = true;
    focusFrag.appendChild(opt);
  });
  elements.selectFocusFund.appendChild(focusFrag);
}

function renderUniverseChips() {
  const query = (state.searchQuery || '').trim().toLowerCase();
  let matchCount = 0;

  // Presets
  elements.presetUniverseChips.innerHTML = '';
  const presetFrag = document.createDocumentFragment();
  PRESET_BENCHMARKS.forEach(p => {
    const isMatch = !query || p.ticker.toLowerCase().includes(query) || p.name.toLowerCase().includes(query);
    if (!isMatch) return;
    matchCount++;

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
    presetFrag.appendChild(chip);
  });
  elements.presetUniverseChips.appendChild(presetFrag);

  // Custom funds from library
  const custom = allFunds.filter(f => !PRESET_BENCHMARKS.some(p => p.ticker === f.ticker));
  if (custom.length === 0) {
    elements.savedCustomSection.style.display = 'none';
  } else {
    elements.savedCustomSection.style.display = 'block';
    elements.customUniverseChips.innerHTML = '';
    const customFrag = document.createDocumentFragment();
    custom.forEach(cf => {
      const isMatch = !query || cf.ticker.toLowerCase().includes(query) || cf.name.toLowerCase().includes(query);
      if (!isMatch) return;
      matchCount++;

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
      customFrag.appendChild(chip);
    });
    elements.customUniverseChips.appendChild(customFrag);
  }

  elements.universeBadge.textContent = `${state.selectedTickers.size} Selected`;
  if (elements.universeFilteredCount) {
    elements.universeFilteredCount.textContent = query
      ? `Showing ${matchCount} of ${allFunds.length} funds`
      : `All ${allFunds.length} funds`;
  }
}

function selectAllFunds() {
  allFunds.forEach(f => state.selectedTickers.add(f.ticker));
  renderUniverseChips();
  runAnalysis();
}

function deselectAllFunds() {
  state.selectedTickers.clear();
  state.selectedTickers.add(state.benchmarkTicker);
  const other = allFunds.find(f => f.ticker !== state.benchmarkTicker);
  if (other) state.selectedTickers.add(other.ticker);
  renderUniverseChips();
  runAnalysis();
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

function setMode(mode) {
  state.viewMode = mode;
  if (mode === 'simple') {
    elements.btnModeSimple.classList.add('active');
    elements.btnModeQuant.classList.remove('active');
    elements.panelAdvancedParams.style.display = 'none';
    elements.panelRollingSetup.style.display = 'none';
    elements.kpiGrid.style.display = 'none';
    elements.chartTabsWrapper.style.display = 'none';
    elements.simpleChartTitle.style.display = 'block';
    elements.simpleScorecardCard.style.display = 'block';
    elements.quantScorecardCard.style.display = 'none';
    elements.statusRfPill.style.display = 'none';
    state.activeTab = 'sml';
  } else {
    elements.btnModeQuant.classList.add('active');
    elements.btnModeSimple.classList.remove('active');
    elements.panelAdvancedParams.style.display = 'block';
    elements.panelRollingSetup.style.display = 'block';
    elements.kpiGrid.style.display = 'grid';
    elements.chartTabsWrapper.style.display = 'flex';
    elements.simpleChartTitle.style.display = 'none';
    elements.simpleScorecardCard.style.display = 'none';
    elements.quantScorecardCard.style.display = 'block';
    elements.statusRfPill.style.display = 'inline-flex';
  }
  renderCurrentChart();
}

// ----------------------------------------------------
// Event Listeners
// ----------------------------------------------------
function attachEventListeners() {
  // Mode Buttons (Concept B)
  elements.btnModeSimple.addEventListener('click', () => setMode('simple'));
  elements.btnModeQuant.addEventListener('click', () => setMode('quant'));

  // Cheat Sheet Accordion Toggle (Concept C)
  elements.cheatSheetToggle.addEventListener('click', () => {
    const isClosed = elements.cheatSheetBody.style.display === 'none';
    elements.cheatSheetBody.style.display = isClosed ? 'block' : 'none';
    elements.cheatSheetToggle.classList.toggle('open', isClosed);
    elements.cheatSheetArrow.classList.toggle('open', isClosed);
  });

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

  // Search Universe Filter
  if (elements.inputUniverseSearch) {
    elements.inputUniverseSearch.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      renderUniverseChips();
    });
  }

  // Select / Deselect All
  if (elements.btnSelectAllFunds) {
    elements.btnSelectAllFunds.addEventListener('click', selectAllFunds);
  }
  if (elements.btnDeselectAllFunds) {
    elements.btnDeselectAllFunds.addEventListener('click', deselectAllFunds);
  }

  // Zoom Button Controls (Granular stepped ladder)
  if (elements.btnZoomIn) {
    elements.btnZoomIn.addEventListener('click', () => {
      const rect = elements.canvas.getBoundingClientRect();
      const current = Math.round(state.zoom * 10) / 10;
      const nextStep = ZOOM_STEPS.find(s => s > current + 0.04) || 30.0;
      zoomTo(rect.width / 2, rect.height / 2, nextStep);
    });
  }
  if (elements.btnZoomOut) {
    elements.btnZoomOut.addEventListener('click', () => {
      const rect = elements.canvas.getBoundingClientRect();
      const current = Math.round(state.zoom * 10) / 10;
      const prevStep = [...ZOOM_STEPS].reverse().find(s => s < current - 0.04) || 0.5;
      zoomTo(rect.width / 2, rect.height / 2, prevStep);
    });
  }
  if (elements.btnZoomReset) {
    elements.btnZoomReset.addEventListener('click', resetZoom);
  }

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

  // Canvas Mouse Dragging & Pan
  elements.canvas.addEventListener('mousedown', e => {
    state.isDragging = true;
    state.hasDragged = false;
    state.dragStart = { x: e.clientX, y: e.clientY };
    if (elements.canvasWrapper) elements.canvasWrapper.classList.add('grabbing');
  });

  window.addEventListener('mouseup', () => {
    if (state.isDragging) {
      state.isDragging = false;
      if (elements.canvasWrapper) elements.canvasWrapper.classList.remove('grabbing');
    }
  });

  // Canvas Wheel Zoom (Ultra-smooth, gentle trackpad & mouse wheel scaling)
  elements.canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = elements.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Normalize delta across lines vs pixels
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= 100;

    // Soft damped exponential curve: tuned down sensitivity for micro-control
    const clampedDy = Math.max(-30, Math.min(30, dy));
    const factor = Math.exp(-clampedDy * 0.0008);
    zoomAt(mouseX, mouseY, factor);
  }, { passive: false });

  // Canvas Double Click Reset
  elements.canvas.addEventListener('dblclick', resetZoom);

  // Canvas Mouse Move (Pan or Hover Tooltip)
  elements.canvas.addEventListener('mousemove', e => {
    const rect = elements.canvas.getBoundingClientRect();
    if (state.isDragging) {
      const dx = e.clientX - state.dragStart.x;
      const dy = e.clientY - state.dragStart.y;
      if (Math.hypot(dx, dy) > 3) state.hasDragged = true;
      state.panX += dx;
      state.panY += dy;
      state.dragStart = { x: e.clientX, y: e.clientY };
      renderCurrentChart();
    } else {
      state.mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      renderCurrentChart();
    }
  });

  elements.canvas.addEventListener('mouseleave', () => {
    state.mousePos = null;
    renderCurrentChart();
  });

  window.addEventListener('resize', debounce(() => renderCurrentChart(), 100));
}

function zoomAt(x, y, factor) {
  const newZoom = Math.max(0.5, Math.min(30, state.zoom * factor));
  if (Math.abs(newZoom - state.zoom) < 0.0001) return;
  const scaleRatio = newZoom / state.zoom;
  state.panX = x - (x - state.panX) * scaleRatio;
  state.panY = y - (y - state.panY) * scaleRatio;
  state.zoom = newZoom;
  updateZoomUI();
  renderCurrentChart();
}

function zoomTo(x, y, targetZoom) {
  const newZoom = Math.max(0.5, Math.min(30, targetZoom));
  if (Math.abs(newZoom - state.zoom) < 0.0001) return;
  const scaleRatio = newZoom / state.zoom;
  state.panX = x - (x - state.panX) * scaleRatio;
  state.panY = y - (y - state.panY) * scaleRatio;
  state.zoom = newZoom;
  updateZoomUI();
  renderCurrentChart();
}

function resetZoom() {
  state.zoom = 1.0;
  state.panX = 0;
  state.panY = 0;
  updateZoomUI();
  renderCurrentChart();
}

function updateZoomUI() {
  if (elements.zoomLevelPill) {
    elements.zoomLevelPill.textContent = `${state.zoom.toFixed(1)}x`;
  }
}

let activeProgressToast = null;

function showProgressToast(msg) {
  if (!elements.alertsContainer) return;
  if (!activeProgressToast) {
    activeProgressToast = document.createElement('div');
    activeProgressToast.className = 'alert-box alert-info alert-progress';
    activeProgressToast.style.cssText = `
      background: rgba(56, 189, 248, 0.2);
      border: 1px solid #38bdf8;
      color: #bae6fd;
      padding: 0.65rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    elements.alertsContainer.prepend(activeProgressToast);
  }
  activeProgressToast.innerHTML = `<span>⚡</span> <span>${msg}</span>`;
}

function clearProgressToast() {
  if (activeProgressToast) {
    activeProgressToast.remove();
    activeProgressToast = null;
  }
}

// ----------------------------------------------------
// File Upload Processing (Optimized Async Batch)
// ----------------------------------------------------
async function handleFiles(files) {
  const fileList = Array.from(files).filter(f => {
    const name = f.name.toLowerCase();
    return name.endsWith('.csv') || name.endsWith('.txt');
  });

  if (fileList.length === 0) {
    showAlert('Please select valid CSV or TXT fund price files.', 'warning');
    return;
  }

  const total = fileList.length;
  const startTime = performance.now();
  const CHUNK_SIZE = 50;
  const newFunds = [];
  const errors = [];

  if (total > 1) {
    showProgressToast(`Importing ${total} funds... (0 / ${total})`);
  }

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = fileList.slice(i, i + CHUNK_SIZE);

    const chunkResults = await Promise.all(chunk.map(async file => {
      try {
        let text = '';
        if (typeof file.text === 'function') {
          text = await file.text();
        } else {
          text = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = ev => resolve(ev.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
          });
        }

        const parsed = parseCSV(text, file.name);
        const monthly = resampleToMonthly(parsed.rows);
        if (monthly.length < 12) {
          return { error: `"${parsed.ticker}" has less than 12 monthly points.` };
        }

        return {
          fund: {
            ticker: parsed.ticker,
            name: `${parsed.ticker} (Custom Upload)`,
            data: monthly
          }
        };
      } catch (err) {
        return { error: `Failed to parse ${file.name}: ${err.message}` };
      }
    }));

    chunkResults.forEach(res => {
      if (res.fund) newFunds.push(res.fund);
      if (res.error) errors.push(res.error);
    });

    if (total > 1) {
      const processed = Math.min(i + CHUNK_SIZE, total);
      showProgressToast(`Importing ${total} funds... (${processed} / ${total})`);
      // Yield to UI loop so progress updates and browser paints smoothly
      await new Promise(r => setTimeout(r, 0));
    }
  }

  clearProgressToast();

  if (newFunds.length === 0) {
    showAlert('No valid funds could be imported from the selected files.', 'warning');
    return;
  }

  // Batch insert into allFunds and select them
  newFunds.forEach(fund => {
    const existingIdx = allFunds.findIndex(f => f.ticker === fund.ticker);
    if (existingIdx !== -1) {
      allFunds[existingIdx].data = fund.data;
      fund.color = allFunds[existingIdx].color;
    } else {
      fund.color = PALETTE[allFunds.length % PALETTE.length];
      allFunds.push(fund);
    }
    state.selectedTickers.add(fund.ticker);
  });

  // Single batch save to localStorage
  saveCustomFundsBatch(newFunds);

  // Single DOM updates & single econometric run
  populateDropdowns();
  renderUniverseChips();
  runAnalysis();

  const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(1);
  if (total === 1) {
    showAlert(`Successfully loaded ${newFunds[0].ticker} into regression universe!`, 'info');
  } else {
    showAlert(`⚡ Successfully imported ${newFunds.length} funds in ${elapsedSec}s!`, 'info');
  }

  if (errors.length > 0) {
    if (errors.length <= 3) {
      errors.forEach(e => showAlert(e, 'warning'));
    } else {
      showAlert(`${errors.length} files were skipped due to formatting or insufficient history (<12 months).`, 'warning');
    }
  }
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
  renderTakeawayStory();
  renderKPIHighlights();
  renderSimpleScorecard();
  renderScorecardTable();
  renderCurrentChart();
}

function renderTakeawayStory() {
  if (!elements.storyTakeawayText || state.profiles.length === 0) return;

  const bench = state.profiles.find(p => p.ticker === state.benchmarkTicker);
  const nonBench = state.profiles.filter(p => p.ticker !== state.benchmarkTicker);

  if (nonBench.length === 0) {
    elements.storyTakeawayText.innerHTML = `Comparing benchmark <strong>${bench?.ticker || 'Benchmark'}</strong> against itself. Select additional funds from the universe below to evaluate relative performance.`;
    return;
  }

  const topAlpha = [...nonBench].sort((a, b) => b.capm.annualizedAlpha - a.capm.annualizedAlpha)[0];
  const defensive = [...nonBench].sort((a, b) => a.capm.beta - b.capm.beta)[0];
  const alphaPct = (topAlpha.capm.annualizedAlpha * 100).toFixed(2);
  const alphaSign = topAlpha.capm.annualizedAlpha > 0 ? '+' : '';

  let story = `Compared to the <strong>${bench?.ticker || 'Benchmark'}</strong> baseline: `;
  if (topAlpha.capm.annualizedAlpha > 0.005) {
    story += `<strong>${topAlpha.ticker}</strong> generated the highest true manager Alpha (<strong>${alphaSign}${alphaPct}% / yr</strong> above market expectations). `;
  } else {
    story += `no fund strongly outperformed expectations after factoring in volatility (top Alpha was <strong>${alphaSign}${alphaPct}% / yr</strong>). `;
  }

  if (defensive && defensive.capm.beta < 0.65) {
    story += `<strong>${defensive.ticker}</strong> served as a defensive hedge with a low Market Beta of <strong>${defensive.capm.beta.toFixed(2)}</strong> (absorbing only ${(defensive.capm.beta * 100).toFixed(0)}% of market volatility).`;
  } else {
    story += `Universe funds predominantly exhibited equity-correlated movements.`;
  }

  elements.storyTakeawayText.innerHTML = story;
}

function renderSimpleScorecard() {
  if (!elements.simpleScorecardBody) return;
  elements.simpleScorecardBody.innerHTML = '';
  const frag = document.createDocumentFragment();

  const sorted = [...state.profiles].sort((a, b) => b.capm.annualizedAlpha - a.capm.annualizedAlpha);

  sorted.forEach(p => {
    const isBench = p.ticker === state.benchmarkTicker;
    const alphaSign = p.capm.annualizedAlpha > 0 ? '+' : '';
    const alphaColor = isBench ? '#94a3b8' : (p.capm.annualizedAlpha >= 0 ? '#10b981' : '#ef4444');

    // Friendly Risk Meter
    let riskDesc = '';
    if (isBench) {
      riskDesc = '1.0x (Market Index)';
    } else if (p.capm.beta >= 1.2) {
      riskDesc = `<span style="color:#f59e0b">High Swings (${p.capm.beta.toFixed(2)}x)</span>`;
    } else if (p.capm.beta < 0.5) {
      riskDesc = `<span style="color:#60a5fa">Defensive (${p.capm.beta.toFixed(2)}x)</span>`;
    } else {
      riskDesc = `Moderate (${p.capm.beta.toFixed(2)}x)`;
    }

    // Sharpe quality
    let sharpeDesc = '';
    if (p.fundRisk.sharpeRatio >= 1.0) sharpeDesc = `<strong style="color:#c084fc">${p.fundRisk.sharpeRatio.toFixed(2)}</strong> (Elite)`;
    else if (p.fundRisk.sharpeRatio >= 0.7) sharpeDesc = `<strong>${p.fundRisk.sharpeRatio.toFixed(2)}</strong> (Good)`;
    else sharpeDesc = `${p.fundRisk.sharpeRatio.toFixed(2)} (Moderate)`;

    // Verdict Badge
    let verdict = '';
    if (isBench) {
      verdict = '<span class="badge-defensive">Market Baseline</span>';
    } else if (p.capm.annualizedAlpha > 0.02) {
      verdict = '<span class="badge-winner">★ Beating Market</span>';
    } else if (p.dualBeta.upCapture > p.dualBeta.downCapture && p.capm.beta <= 1.0) {
      verdict = '<span class="badge-asymmetric">🚀 Asymmetric Protection</span>';
    } else if (p.capm.beta < 0.5) {
      verdict = '<span class="badge-defensive">🛡️ Volatility Hedge</span>';
    } else {
      verdict = '<span style="color:#94a3b8; font-size:0.75rem;">Core Asset</span>';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong style="color:${p.color}">${p.ticker}</strong>
        <div style="font-size:0.72rem; color:#94a3b8;">${p.name}</div>
      </td>
      <td><strong>${(p.fundRisk.cagr * 100).toFixed(2)}%</strong></td>
      <td>${riskDesc}</td>
      <td style="color:${alphaColor}"><strong>${isBench ? '0.00% (Base)' : `${alphaSign}${(p.capm.annualizedAlpha * 100).toFixed(2)}% / yr`}</strong></td>
      <td>${sharpeDesc}</td>
      <td>${verdict}</td>
    `;
    frag.appendChild(tr);
  });
  elements.simpleScorecardBody.appendChild(frag);
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
      <div class="kpi-subtext">True excess return above market expectations (&beta; = ${topAlpha.capm.beta})</div>
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
  const frag = document.createDocumentFragment();
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
    frag.appendChild(tr);
  });
  elements.scorecardBody.appendChild(frag);
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
 * Features: Interactive Pan & Zoom, Clipping Mask, Intelligent Label Decluttering for 900+ Funds
 */
function renderSMLChart() {
  const canvas = elements.canvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = 480;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const pad = { top: 30, right: 65, bottom: 50, left: 65 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  if (state.profiles.length === 0) return;

  const benchProfile = state.profiles.find(p => p.ticker === state.benchmarkTicker);
  const rm = benchProfile ? benchProfile.fundRisk.cagr : 0.10;
  const rf = state.annualRf;

  // Determine bounds
  const betas = state.profiles.map(p => p.capm.beta);
  const returns = state.profiles.map(p => p.fundRisk.cagr);

  const minBeta = Math.min(-0.2, ...betas);
  const maxBeta = Math.max(1.6, Math.max(...betas) * 1.15);

  const minRet = Math.min(-0.05, Math.min(...returns) * 1.15, rf - 0.02);
  const maxRet = Math.max(0.25, Math.max(...returns) * 1.15);

  // Coordinate transforms with pan & zoom
  const xToPx = beta => {
    const norm = (beta - minBeta) / (maxBeta - minBeta);
    const baseX = pad.left + norm * plotW;
    return pad.left + (baseX - pad.left) * state.zoom + state.panX;
  };

  const yToPx = ret => {
    const norm = (ret - minRet) / (maxRet - minRet);
    const baseY = pad.top + plotH - norm * plotH;
    return (pad.top + plotH) - ((pad.top + plotH) - baseY) * state.zoom + state.panY;
  };

  // 1. Plot Area Clipping Mask (Content does not spill into margins)
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.left, pad.top, plotW, plotH);
  ctx.clip();

  // Grid Lines inside plot
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';

  const smlY0 = yToPx(rf + minBeta * (rm - rf));
  const smlYMax = yToPx(rf + maxBeta * (rm - rf));

  // Shaded Positive Alpha Zone (Above SML)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
  ctx.beginPath();
  ctx.moveTo(xToPx(minBeta), smlY0);
  ctx.lineTo(xToPx(maxBeta), smlYMax);
  ctx.lineTo(xToPx(maxBeta), yToPx(maxRet + 5));
  ctx.lineTo(xToPx(minBeta), yToPx(maxRet + 5));
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

  // Rf Marker on SML
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`Rf: ${(rf * 100).toFixed(1)}%`, pad.left + 5, yToPx(rf) - 6);

  // 2. Identify Hovered Point
  let hoveredPoint = null;
  if (state.mousePos) {
    let closestDist = Infinity;
    state.profiles.forEach(p => {
      const px = xToPx(p.capm.beta);
      const py = yToPx(p.fundRisk.cagr);
      const dist = Math.hypot(state.mousePos.x - px, state.mousePos.y - py);
      if (dist < 18 && dist < closestDist) {
        closestDist = dist;
        hoveredPoint = { p, px, py };
      }
    });
  }

  // 3. Draw All Dots
  state.profiles.forEach(p => {
    const px = xToPx(p.capm.beta);
    const py = yToPx(p.fundRisk.cagr);
    if (px < pad.left - 20 || px > pad.left + plotW + 20 || py < pad.top - 20 || py > pad.top + plotH + 20) return;

    const isBench = p.ticker === state.benchmarkTicker;
    const isHovered = hoveredPoint && hoveredPoint.p.ticker === p.ticker;

    // Outer Glow
    ctx.beginPath();
    ctx.arc(px, py, isHovered ? 11 : (isBench ? 8 : 5.5), 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? '#38bdf8' : (isBench ? '#a855f7' : (p.color || '#38bdf8'));
    ctx.shadowColor = isHovered ? 'rgba(56, 189, 248, 0.9)' : (isBench ? 'rgba(168, 85, 247, 0.7)' : 'rgba(56, 189, 248, 0.4)');
    ctx.shadowBlur = isHovered ? 14 : 7;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Center White Dot
    ctx.beginPath();
    ctx.arc(px, py, isHovered ? 5 : (isBench ? 3.5 : 2.5), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });

  // 4. Intelligent Label Rendering (Prevents Overlapping White Blob for 900+ Funds!)
  const placedLabels = [];
  const isCrowded = state.profiles.length > 30 && state.zoom < 2.5;

  const sortedForLabels = [...state.profiles].sort((a, b) => {
    if (hoveredPoint && a.ticker === hoveredPoint.p.ticker) return -1;
    if (hoveredPoint && b.ticker === hoveredPoint.p.ticker) return 1;
    if (a.ticker === state.benchmarkTicker) return -1;
    if (b.ticker === state.benchmarkTicker) return 1;
    return Math.abs(b.capm.annualizedAlpha) - Math.abs(a.capm.annualizedAlpha);
  });

  sortedForLabels.forEach(p => {
    const px = xToPx(p.capm.beta);
    const py = yToPx(p.fundRisk.cagr);
    if (px < pad.left - 10 || px > pad.left + plotW + 10 || py < pad.top - 10 || py > pad.top + plotH + 10) return;

    const isBench = p.ticker === state.benchmarkTicker;
    const isHovered = hoveredPoint && hoveredPoint.p.ticker === p.ticker;

    if (isCrowded && !isBench && !isHovered) {
      const bw = 38;
      const bh = 14;
      const bx = px - bw / 2;
      const by = py - 18;

      const collides = placedLabels.some(b => 
        bx < b.x2 && bx + bw > b.x1 && by < b.y2 && by + bh > b.y1
      );
      if (collides) return; // Suppress overlapping label in dense cluster
      placedLabels.push({ x1: bx, y1: by, x2: bx + bw, y2: by + bh });
    }

    ctx.font = (isBench || isHovered) ? 'bold 12px sans-serif' : '10px sans-serif';
    ctx.fillStyle = isHovered ? '#38bdf8' : (isBench ? '#d8b4fe' : '#f8fafc');
    ctx.textAlign = 'center';
    ctx.fillText(p.ticker, px, py - 9);
  });

  ctx.restore(); // End clipping

  // 5. Draw Plot Border
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.left, pad.top, plotW, plotH);

  // Dynamic Axis Ticks
  const retSteps = 6;
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  for (let i = 0; i <= retSteps; i++) {
    const py = pad.top + (i / retSteps) * plotH;
    const baseY = (pad.top + plotH) - ((pad.top + plotH) - py + state.panY) / state.zoom;
    const val = minRet + (((pad.top + plotH) - baseY) / plotH) * (maxRet - minRet);
    ctx.fillText(`${(val * 100).toFixed(0)}%`, pad.left - 8, py + 4);
  }

  const betaSteps = 6;
  ctx.textAlign = 'center';
  for (let i = 0; i <= betaSteps; i++) {
    const px = pad.left + (i / betaSteps) * plotW;
    const baseX = (px - state.panX - pad.left) / state.zoom + pad.left;
    const val = minBeta + ((baseX - pad.left) / plotW) * (maxBeta - minBeta);
    ctx.fillText(val.toFixed(1), px, pad.top + plotH + 18);
  }

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
    <span class="legend-item"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span> Green Area: Positive Alpha Zone</span>
    <span class="legend-item"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#a855f7;"></span> Purple Dot: Benchmark (${state.benchmarkTicker})</span>
    <span class="legend-item" style="color:#38bdf8;"><span style="display:inline-block; width:12px; height:12px; border:1px solid #38bdf8; border-radius:3px; text-align:center; line-height:10px; font-size:9px;">+</span> Zoom: ${state.zoom.toFixed(1)}x</span>
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
