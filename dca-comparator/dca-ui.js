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
  simulateDCA,
  parseExpenseRatio
} from './dca-engine.js';
import {
  initSessionFunds,
  getAllFundsSync,
  importFilesToSession,
  resetSessionToDefault,
  deleteSessionFund,
  subscribeSessionFunds
} from '../js/session-funds.js';
import { openAssetModal } from '../js/asset-modal.js';

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
  hoverIndex: -1,
  searchQuery: '',
  // Fee modeling configuration
  includeFees: true,
  feeMode: 'reconstruct', // 'reconstruct' | 'overlay'
  customFeePct: null, // null = use fund's stated expense ratio; number = override
  showGrossCurve: false
};

// Simulation results cache for rendering
let currentSimulationResults = null;

// Persistent Browser Storage for Uploaded Custom Funds
let customLibrary = [];

function loadCustomLibrary() {
  return getAllFundsSync().filter(f => !f.isPreset);
}

function saveCustomLibrary(library) {
  // Maintained for compatibility; session funds are persisted via IndexedDB
}

// DOM Elements
let elements = {};

export async function initDCAComparator() {
  await initSessionFunds();
  customLibrary = loadCustomLibrary();
  cacheDOMElements();
  renderPresetChips();
  renderCustomLibraryChips();
  attachEventListeners();
  runComparison();

  subscribeSessionFunds(all => {
    customLibrary = all.filter(f => !f.isPreset);
    renderCustomLibraryChips();
    runComparison();
  });
}

function cacheDOMElements() {
  elements = {
    btnDcaOpenModal: document.getElementById('btn-dca-open-modal'),
    dropzone: document.getElementById('dca-dropzone'),
    fileInput: document.getElementById('dca-file-input'),
    presetChips: document.getElementById('preset-chips'),
    inputUniverseSearch: document.getElementById('dca-universe-search-input'),
    universeActionRow: document.getElementById('dca-universe-action-row'),
    universeFilteredCount: document.getElementById('dca-universe-filtered-count'),
    customFundsSection: document.getElementById('custom-funds-section'),
    customLibraryChips: document.getElementById('custom-library-chips'),
    btnClearCustomLibrary: document.getElementById('btn-clear-custom-library'),
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
    detailsTableHead: document.getElementById('details-table-head'),
    // Fee drag controls & modal
    checkFeeModeling: document.getElementById('check-fee-modeling'),
    feeControlsPanel: document.getElementById('fee-controls-panel'),
    btnFeeReconstruct: document.getElementById('btn-fee-reconstruct'),
    btnFeeOverlay: document.getElementById('btn-fee-overlay'),
    inputCustomFee: document.getElementById('input-custom-fee'),
    labelFeeRate: document.getElementById('label-fee-rate'),
    feeModeHint: document.getElementById('fee-mode-hint'),
    checkShowGrossCurve: document.getElementById('check-show-gross-curve'),
    modalFeeInspector: document.getElementById('modal-fee-inspector'),
    btnCloseFeeModal: document.getElementById('btn-close-fee-modal'),
    feeModalContent: document.getElementById('fee-modal-content')
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
  renderCustomLibraryChips();
  renderActiveFundsList();
  resetDateRangeToMax();
  runComparison();
}

function renderCustomLibraryChips() {
  if (!elements.customFundsSection || !elements.customLibraryChips) return;

  if (customLibrary.length === 0) {
    elements.customFundsSection.style.display = 'none';
    if (elements.universeActionRow) elements.universeActionRow.style.display = 'none';
    elements.customLibraryChips.innerHTML = '';
    return;
  }

  elements.customFundsSection.style.display = 'block';
  if (elements.universeActionRow) elements.universeActionRow.style.display = 'flex';
  elements.customLibraryChips.innerHTML = '';

  const query = (state.searchQuery || '').trim().toLowerCase();
  let matchCount = 0;
  const frag = document.createDocumentFragment();

  customLibrary.forEach(fund => {
    const isMatch = !query || fund.ticker.toLowerCase().includes(query) || (fund.name && fund.name.toLowerCase().includes(query));
    if (!isMatch) return;
    matchCount++;

    const isActive = state.activeFunds.some(f => f.ticker === fund.ticker);
    const activeFund = state.activeFunds.find(f => f.ticker === fund.ticker);
    const dotColor = isActive ? (activeFund?.color || '#38bdf8') : '#94a3b8';

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `custom-chip ${isActive ? 'active' : ''}`;
    chip.title = `${fund.name} (${fund.data.length} monthly records) - Click to toggle in/out of comparison, × to remove from library`;

    chip.innerHTML = `
      <span class="preset-dot" style="background-color: ${dotColor}"></span>
      <span>${fund.ticker}</span>
      <span class="chip-delete" title="Delete ${fund.ticker} from saved library">×</span>
    `;

    chip.addEventListener('click', e => {
      if (e.target.classList.contains('chip-delete')) return;
      toggleCustomFund(fund);
    });

    chip.querySelector('.chip-delete').addEventListener('click', e => {
      e.stopPropagation();
      deleteCustomFund(fund.ticker);
    });

    frag.appendChild(chip);
  });

  elements.customLibraryChips.appendChild(frag);

  if (elements.universeFilteredCount) {
    elements.universeFilteredCount.textContent = query
      ? `Showing ${matchCount} of ${customLibrary.length} funds`
      : `All ${customLibrary.length} saved funds`;
  }
}

function toggleCustomFund(fund) {
  const existingIndex = state.activeFunds.findIndex(f => f.ticker === fund.ticker);
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
    state.activeFunds.push({ ...fund, color });
  }

  // Re-assign distinct colors
  state.activeFunds.forEach((f, idx) => {
    f.color = FUND_COLORS[idx % FUND_COLORS.length];
  });

  renderPresetChips();
  renderCustomLibraryChips();
  renderActiveFundsList();
  resetDateRangeToMax();
  runComparison();
}

async function deleteCustomFund(ticker) {
  const activeIdx = state.activeFunds.findIndex(f => f.ticker === ticker);
  if (activeIdx !== -1 && state.activeFunds.length <= 1) {
    showAlert('Cannot delete the only active fund. Please select another fund first.', 'warning');
    return;
  }

  if (activeIdx !== -1) {
    state.activeFunds.splice(activeIdx, 1);
  }

  await deleteSessionFund(ticker);
  customLibrary = loadCustomLibrary();

  state.activeFunds.forEach((f, idx) => {
    f.color = FUND_COLORS[idx % FUND_COLORS.length];
  });

  renderPresetChips();
  renderCustomLibraryChips();
  renderActiveFundsList();
  resetDateRangeToMax();
  runComparison();
  showAlert(`Removed ${ticker} from session library.`, 'info');
}

function addFundToDCA(fund) {
  if (!fund || !fund.data || fund.data.length < 2) {
    showAlert(`Fund ${fund?.ticker || 'selected'} has insufficient history.`, 'warning');
    return;
  }

  const existingIndex = state.activeFunds.findIndex(f => f.ticker === fund.ticker);
  if (existingIndex !== -1) {
    showAlert(`${fund.ticker} is already in the comparison.`, 'info');
    return;
  }

  if (state.activeFunds.length >= 3) {
    state.activeFunds.pop();
  }

  const color = FUND_COLORS[state.activeFunds.length % FUND_COLORS.length];
  state.activeFunds.push({ ...fund, color });

  state.activeFunds.forEach((f, idx) => {
    f.color = FUND_COLORS[idx % FUND_COLORS.length];
  });

  renderPresetChips();
  renderCustomLibraryChips();
  renderActiveFundsList();
  resetDateRangeToMax();
  runComparison();
  showAlert(`Added ${fund.ticker} to comparison!`, 'info');
}

function swapDcaFund(index, fund) {
  if (index < 0 || index >= state.activeFunds.length) return;
  if (!fund || !fund.data || fund.data.length < 2) {
    showAlert(`Fund ${fund?.ticker || 'selected'} has insufficient history.`, 'warning');
    return;
  }

  const existingIndex = state.activeFunds.findIndex(f => f.ticker === fund.ticker);
  if (existingIndex !== -1 && existingIndex !== index) {
    showAlert(`${fund.ticker} is already active in another slot.`, 'info');
    return;
  }

  const color = state.activeFunds[index].color;
  state.activeFunds[index] = { ...fund, color };

  renderPresetChips();
  renderCustomLibraryChips();
  renderActiveFundsList();
  resetDateRangeToMax();
  runComparison();
  showAlert(`Changed slot ${index + 1} to ${fund.ticker}!`, 'info');
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
      <div style="display:flex; align-items:center; gap:0.25rem;">
        <button type="button" class="btn-swap-fund" title="Change ${fund.ticker}" style="background:transparent; border:none; color:#38bdf8; cursor:pointer; font-size:0.85rem; padding:0.2rem 0.4rem; border-radius:4px; opacity:0.85;">🔍</button>
        <button type="button" class="btn-remove-fund" title="Remove ${fund.ticker}">×</button>
      </div>
    `;

    item.querySelector('.btn-swap-fund').addEventListener('click', () => {
      openAssetModal({
        title: `Change Fund in Slot ${index + 1}`,
        badgeText: 'Change Asset',
        badgeColor: fund.color || '#38bdf8',
        activeTicker: fund.ticker,
        onSelect: (ticker, newFund) => {
          swapDcaFund(index, newFund);
        }
      });
    });

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
      renderCustomLibraryChips();
      renderActiveFundsList();
      resetDateRangeToMax();
      runComparison();
    });

    elements.activeFundsList.appendChild(item);
  });
}

function attachEventListeners() {
  // Search Universe Modal Trigger
  if (elements.btnDcaOpenModal) {
    elements.btnDcaOpenModal.addEventListener('click', () => {
      openAssetModal({
        title: 'Add Fund to DCA Comparison',
        badgeText: 'DCA Universe',
        badgeColor: '#38bdf8',
        onSelect: (ticker, fund) => {
          addFundToDCA(fund);
        }
      });
    });
  }

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

  // Fee Modeling Controls
  if (elements.checkFeeModeling) {
    elements.checkFeeModeling.addEventListener('change', e => {
      state.includeFees = e.target.checked;
      if (elements.feeControlsPanel) {
        elements.feeControlsPanel.style.display = state.includeFees ? 'block' : 'none';
      }
      runComparison();
    });
  }

  if (elements.btnFeeReconstruct) {
    elements.btnFeeReconstruct.addEventListener('click', () => {
      state.feeMode = 'reconstruct';
      elements.btnFeeReconstruct.classList.add('active');
      elements.btnFeeOverlay.classList.remove('active');
      if (elements.labelFeeRate) elements.labelFeeRate.textContent = 'Annual Fee Override (%)';
      if (elements.feeModeHint) elements.feeModeHint.textContent = 'Reconstructs pre-fee asset performance to reveal exact dollar erosion from stated expense ratios (e.g. QQQ 0.20%, VOO 0.03%).';
      runComparison();
    });
  }

  if (elements.btnFeeOverlay) {
    elements.btnFeeOverlay.addEventListener('click', () => {
      state.feeMode = 'overlay';
      elements.btnFeeOverlay.classList.add('active');
      elements.btnFeeReconstruct.classList.remove('active');
      if (elements.labelFeeRate) elements.labelFeeRate.textContent = 'Advisory / Overlay Fee (%)';
      if (elements.feeModeHint) elements.feeModeHint.textContent = 'Deducts an additional annual management or advisory fee percentage monthly from asset balances.';
      runComparison();
    });
  }

  if (elements.inputCustomFee) {
    elements.inputCustomFee.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      state.customFeePct = isNaN(val) ? null : Math.max(0, val);
      runComparison();
    });
  }

  if (elements.checkShowGrossCurve) {
    elements.checkShowGrossCurve.addEventListener('change', e => {
      state.showGrossCurve = e.target.checked;
      if (currentSimulationResults) {
        renderChartLegend(currentSimulationResults.simulations);
        renderChart(currentSimulationResults);
      }
    });
  }

  if (elements.btnCloseFeeModal) {
    elements.btnCloseFeeModal.addEventListener('click', closeFeeModal);
  }

  if (elements.modalFeeInspector) {
    elements.modalFeeInspector.addEventListener('click', e => {
      if (e.target === elements.modalFeeInspector) closeFeeModal();
    });
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && elements.modalFeeInspector && !elements.modalFeeInspector.classList.contains('hidden')) {
      closeFeeModal();
    }
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

  // Clear Custom Library button
  if (elements.btnClearCustomLibrary) {
    elements.btnClearCustomLibrary.addEventListener('click', async () => {
      if (customLibrary.length === 0) return;
      if (!confirm('Remove all saved custom funds from your session library and reset to default 5?')) return;

      // Filter out custom funds from active funds, but ensure at least 1 benchmark stays
      state.activeFunds = state.activeFunds.filter(f => PRESET_BENCHMARKS.some(b => b.ticker === f.ticker));
      if (state.activeFunds.length === 0) {
        state.activeFunds = [{ ...PRESET_BENCHMARKS[0], color: FUND_COLORS[0] }];
      }

      await resetSessionToDefault();
      customLibrary = [];

      state.activeFunds.forEach((f, idx) => {
        f.color = FUND_COLORS[idx % FUND_COLORS.length];
      });

      renderPresetChips();
      renderCustomLibraryChips();
      renderActiveFundsList();
      resetDateRangeToMax();
      runComparison();
      showAlert('Cleared all session custom funds and reset to 5 default benchmarks.', 'info');
    });
  }

  // Universe Search / Filter
  if (elements.inputUniverseSearch) {
    elements.inputUniverseSearch.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      renderCustomLibraryChips();
    });
  }

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

async function handleUploadedFiles(files) {
  const fileList = Array.from(files).filter(f => {
    const name = f.name.toLowerCase();
    return (
      name.endsWith('.csv') ||
      name.endsWith('.txt') ||
      (f.type && (f.type.includes('csv') || f.type.includes('plain') || f.type.includes('text')))
    );
  });

  if (fileList.length === 0) {
    showAlert('Please upload standard CSV or Stooq text files (.csv, .txt).', 'warning');
    return;
  }

  const total = fileList.length;
  if (total > 5) {
    showAlert(`⚡ Batch importing ${total} funds into DCA library...`, 'info');
  }

  const result = await importFilesToSession(files);

  if (result.importedCount > 0) {
    customLibrary = loadCustomLibrary();
    const newFunds = customLibrary.slice(-result.importedCount);
    addUploadedFunds(newFunds);
    if (total === 1) {
      showAlert(`Successfully loaded ${newFunds[0].ticker} into your library!`, 'info');
    } else {
      showAlert(`⚡ Successfully imported ${result.importedCount} fund(s) into your library!`, 'info');
    }
  } else {
    showAlert('Could not extract monthly price points from uploaded files.', 'warning');
  }

  if (result.errors && result.errors.length > 0 && result.errors.length <= 3) {
    result.errors.forEach(e => showAlert(e, 'warning'));
  }
}

function addUploadedFunds(newFunds) {
  // 1. Update in active funds list (avoiding duplicates)
  let combined = [...state.activeFunds];
  newFunds.forEach(nf => {
    const existingIdx = combined.findIndex(f => f.ticker === nf.ticker);
    if (existingIdx !== -1) {
      combined[existingIdx] = nf;
    } else {
      combined.push(nf);
    }
  });

  // Cap active comparison at 3
  if (combined.length > 3) {
    combined = combined.slice(combined.length - 3);
  }

  // Re-assign distinct colors
  combined.forEach((f, idx) => {
    f.color = FUND_COLORS[idx % FUND_COLORS.length];
  });

  state.activeFunds = combined;
  renderPresetChips();
  renderCustomLibraryChips();
  renderActiveFundsList();
  resetDateRangeToMax();
  runComparison();
  showAlert(`Successfully loaded ${newFunds.map(f => f.ticker).join(', ')}! Saved to browser library.`, 'info');
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
    // Determine effective fee for this fund
    const fundER = parseExpenseRatio(s.fund.expenseRatio || s.fund.rawFund?.expenseRatio);
    const effectiveFeePct = state.includeFees
      ? (state.customFeePct != null && !isNaN(state.customFeePct) ? state.customFeePct : fundER)
      : 0;

    // Run active simulation with user's current DRIP and Fee settings
    const activeSim = simulateDCA(s.data, {
      initialBalance: state.initialBalance,
      monthlyDeposit: state.monthlyDeposit,
      useDRIP: state.useDRIP,
      feeMode: state.feeMode,
      annualFeePct: effectiveFeePct
    });

    // Also run paired simulation (DRIP ON vs DRIP OFF) to quantify exact dividend contribution
    const simDRIP = state.useDRIP
      ? activeSim
      : simulateDCA(s.data, {
          initialBalance: state.initialBalance,
          monthlyDeposit: state.monthlyDeposit,
          useDRIP: true,
          feeMode: state.feeMode,
          annualFeePct: effectiveFeePct
        });

    const simNoDRIP = !state.useDRIP
      ? activeSim
      : simulateDCA(s.data, {
          initialBalance: state.initialBalance,
          monthlyDeposit: state.monthlyDeposit,
          useDRIP: false,
          feeMode: state.feeMode,
          annualFeePct: effectiveFeePct
        });

    const dripPayback = Math.max(0, simDRIP.metrics.finalBalance - simNoDRIP.metrics.finalBalance);
    const dripPaybackPct = simNoDRIP.metrics.finalBalance > 0
      ? (dripPayback / simNoDRIP.metrics.finalBalance) * 100
      : 0;

    return {
      fund: s.fund,
      trajectory: activeSim.trajectory,
      grossTrajectory: activeSim.grossTrajectory,
      metrics: activeSim.metrics,
      dripPayback,
      dripPaybackPct,
      dripFinalBalance: simDRIP.metrics.finalBalance,
      noDripFinalBalance: simNoDRIP.metrics.finalBalance,
      effectiveFeePct
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

    const isFeeActive = state.includeFees && s.effectiveFeePct > 0;
    const feePillHtml = `
      <div class="kpi-fee-pill ${isFeeActive ? '' : 'inactive'}" data-inspect-ticker="${s.fund.ticker || s.fund.name}" title="${isFeeActive ? 'Click to inspect lifetime cost breakdown and fee drag' : 'Fee modeling is currently inactive or 0%'}">
        <span class="fee-pill-label">
          🏷️ Fee Drag (${s.effectiveFeePct.toFixed(2)}% ER):
        </span>
        <span class="fee-pill-val">
          -${formatCurrency(s.metrics.compoundedFeeDrag)} (${s.metrics.feeErosionPct.toFixed(1)}% of gain)
        </span>
        <span class="fee-pill-btn">Inspect 🔍</span>
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
      ${feePillHtml}

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
          <span>Stated Expense Ratio</span>
          <strong style="color: #cbd5e1;">${s.effectiveFeePct.toFixed(2)}%</strong>
        </div>
        ${state.includeFees && s.effectiveFeePct > 0 ? `
        <div class="kpi-stat-row">
          <span>Total Direct Fees Paid</span>
          <strong style="color: #f87171;">-${formatCurrency(s.metrics.totalFeesPaid)}</strong>
        </div>
        <div class="kpi-stat-row">
          <span>Compounded Lost Opportunity</span>
          <strong style="color: #f87171;">-${formatCurrency(s.metrics.lostOpportunityCost)}</strong>
        </div>
        <div class="kpi-stat-row">
          <span>Zero-Fee Wealth Potential</span>
          <strong style="color: #38bdf8;">${formatCurrency(s.metrics.grossFinalBalance)}</strong>
        </div>
        ` : ''}
        <div class="kpi-stat-row">
          <span>Accumulated Shares</span>
          <strong>${s.metrics.finalShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
      </div>
    `;

    // Bind fee inspection trigger
    const feePill = card.querySelector('.kpi-fee-pill');
    if (feePill) {
      feePill.addEventListener('click', () => {
        openFeeInspectorModal(s.fund.ticker || s.fund.name);
      });
    }

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

    if (state.showGrossCurve) {
      const grossItem = document.createElement('div');
      grossItem.className = 'legend-item';
      grossItem.innerHTML = `
        <span class="legend-color-line dashed" style="background-color: ${s.fund.color}; opacity: 0.6;"></span>
        <span style="font-size: 0.72rem; color: #94a3b8;">${s.fund.ticker || s.fund.name} (0%-Fee Gross)</span>
      `;
      elements.chartLegend.appendChild(grossItem);
    }
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

  // 4. Draw Fund Curves (Net and optional 0%-Fee Gross)
  data.simulations.forEach(s => {
    // Optional Gross (0%-Fee) baseline curve
    if (state.showGrossCurve && s.grossTrajectory && s.grossTrajectory.length > 0) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = s.fund.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      s.grossTrajectory.forEach((t, i) => {
        const x = toX(i);
        const y = toY(t.portfolioValue);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Actual Portfolio Curve
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
    if (state.includeFees && s.effectiveFeePct > 0) {
      headHtml += `<th style="color:#f87171;">${s.fund.ticker || s.fund.name} Fee Paid</th>`;
      headHtml += `<th style="color:#38bdf8;">${s.fund.ticker || s.fund.name} 0%-Fee Gross</th>`;
    }
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
      if (state.includeFees && s.effectiveFeePct > 0) {
        rowsHtml += `<td style="color:#f87171;">-${formatCurrency(s.trajectory[i].monthlyFee || 0)}</td>`;
        rowsHtml += `<td style="color:#38bdf8;">${formatCurrency(s.trajectory[i].grossPortfolioValue || s.trajectory[i].portfolioValue)}</td>`;
      }
    });
    rowsHtml += '</tr>';
  }
  elements.detailsTableBody.innerHTML = rowsHtml;
}

/**
 * Opens interactive Fee Impact Inspector Modal for a selected fund
 * @param {string} ticker
 */
function openFeeInspectorModal(ticker) {
  if (!currentSimulationResults || !elements.modalFeeInspector || !elements.feeModalContent) return;
  const sim = currentSimulationResults.simulations.find(s => (s.fund.ticker || s.fund.name) === ticker) || currentSimulationResults.simulations[0];
  if (!sim) return;

  const fund = sim.fund;
  const metrics = sim.metrics;
  const grossFinal = metrics.grossFinalBalance;
  const netFinal = metrics.finalBalance;
  const directFees = metrics.totalFeesPaid;
  const feeDrag = metrics.compoundedFeeDrag;
  const oppCost = metrics.lostOpportunityCost;
  const feePct = sim.effectiveFeePct;
  const months = metrics.totalMonths;
  const years = (months / 12).toFixed(1);

  // Compute alternative fee tiers for comparison over this exact period
  const tiers = [
    { name: 'Ultra-Low Index (VOO tier)', fee: 0.03 },
    { name: `${fund.ticker || 'Current Fund'} (${feePct.toFixed(2)}%)`, fee: feePct, isCurrent: true },
    { name: 'Typical Active ETF', fee: 0.50 },
    { name: 'Financial Advisor (+1% Fee)', fee: feePct + 1.00 }
  ];

  const tierRowsHtml = tiers.map(t => {
    // Run quick simulation for this fee tier
    const tempSim = simulateDCA(sim.trajectory.map(r => ({ date: r.date, close: r.price, adjClose: r.price })), {
      initialBalance: state.initialBalance,
      monthlyDeposit: state.monthlyDeposit,
      useDRIP: state.useDRIP,
      feeMode: 'reconstruct',
      annualFeePct: t.fee
    });
    const tGross = tempSim.metrics.grossFinalBalance;
    const tNet = tempSim.metrics.finalBalance;
    const tDrag = tempSim.metrics.compoundedFeeDrag;
    const tFees = tempSim.metrics.totalFeesPaid;

    return `
      <tr class="${t.isCurrent ? 'active-scenario' : ''}">
        <td><strong>${t.name}</strong></td>
        <td>${t.fee.toFixed(2)}%</td>
        <td style="color: #f87171;">-${formatCurrency(tFees)}</td>
        <td style="color: #f87171; font-weight: 700;">-${formatCurrency(tDrag)}</td>
        <td style="color: #38bdf8; font-weight: 700;">${formatCurrency(tNet)}</td>
      </tr>
    `;
  }).join('');

  // Waterfall percentage calculations
  const totalWealthPotential = Math.max(1, grossFinal);
  const investedPct = Math.min(100, (metrics.totalInvested / totalWealthPotential) * 100);
  const netGainsPct = Math.max(0, ((netFinal - metrics.totalInvested) / totalWealthPotential) * 100);
  const directFeesPct = Math.max(0, (directFees / totalWealthPotential) * 100);
  const oppCostPct = Math.max(0, (oppCost / totalWealthPotential) * 100);

  elements.feeModalContent.innerHTML = `
    <!-- Top KPI Cards -->
    <div class="fee-summary-cards">
      <div class="fee-stat-card">
        <div class="fee-stat-title">Direct Cash Fees Collected</div>
        <div class="fee-stat-value" style="color: #fca5a5;">-${formatCurrency(directFees)}</div>
        <div class="fee-stat-sub">Sum of monthly management deductions</div>
      </div>
      <div class="fee-stat-card">
        <div class="fee-stat-title">Lost Opportunity Growth</div>
        <div class="fee-stat-value" style="color: #f87171;">-${formatCurrency(oppCost)}</div>
        <div class="fee-stat-sub">Compounding forfeited on paid fees</div>
      </div>
      <div class="fee-stat-card">
        <div class="fee-stat-title">Total Lifetime Fee Drag</div>
        <div class="fee-stat-value" style="color: #ef4444;">-${formatCurrency(feeDrag)}</div>
        <div class="fee-stat-sub">${metrics.feeErosionPct.toFixed(1)}% of potential gross profit consumed</div>
      </div>
    </div>

    <!-- Waterfall Progress Bar -->
    <div class="fee-waterfall-wrap">
      <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700;">
        <span>Total Gross Wealth Breakdown (${formatCurrency(grossFinal)})</span>
        <span style="color: #38bdf8;">Take-Home: ${formatCurrency(netFinal)}</span>
      </div>
      <div class="waterfall-bar-container">
        <div class="waterfall-segment" style="width: ${investedPct}%; background: #64748b;" title="Principal Invested: ${formatCurrency(metrics.totalInvested)}"></div>
        <div class="waterfall-segment" style="width: ${netGainsPct}%; background: #2dd4bf;" title="Net Capital Gains: ${formatCurrency(netFinal - metrics.totalInvested)}"></div>
        <div class="waterfall-segment" style="width: ${directFeesPct}%; background: #f59e0b;" title="Direct Fees Paid: ${formatCurrency(directFees)}"></div>
        <div class="waterfall-segment" style="width: ${oppCostPct}%; background: #ef4444;" title="Compounded Lost Opportunity: ${formatCurrency(oppCost)}"></div>
      </div>
      <div class="waterfall-legend">
        <div class="waterfall-legend-item"><span class="legend-dot" style="background: #64748b;"></span>Principal Invested</div>
        <div class="waterfall-legend-item"><span class="legend-dot" style="background: #2dd4bf;"></span>Net Profit Retained</div>
        <div class="waterfall-legend-item"><span class="legend-dot" style="background: #f59e0b;"></span>Direct Fees Paid</div>
        <div class="waterfall-legend-item"><span class="legend-dot" style="background: #ef4444;"></span>Lost Compounding Opportunity</div>
      </div>
    </div>

    <!-- Scenario Comparison Table -->
    <div style="margin-bottom: 0.5rem; font-size: 0.82rem; font-weight: 700; color: #f8fafc;">
      📊 Comparison: Same Strategy Under Alternative Fee Tiers (${years} Years)
    </div>
    <div style="overflow-x: auto;">
      <table class="fee-scenario-table">
        <thead>
          <tr>
            <th>Fee Scenario</th>
            <th>Annual Fee</th>
            <th>Direct Fees Paid</th>
            <th>Total Compounded Drag</th>
            <th>Ending Net Wealth</th>
          </tr>
        </thead>
        <tbody>
          ${tierRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Plain-English Verdict Banner -->
    <div class="fee-verdict-banner">
      💡 <strong>Cost Takeaway:</strong> With a stated expense ratio of <strong>${feePct.toFixed(2)}%</strong>, holding <strong>${fund.ticker}</strong> over <strong>${years} years</strong> cost you <strong>${formatCurrency(directFees)}</strong> in direct fees. Because those fee dollars weren't invested and compounding, your total lifetime wealth was reduced by <strong>${formatCurrency(feeDrag)}</strong> (${metrics.feeErosionPct.toFixed(1)}% of your gross gains).
    </div>
  `;

  elements.modalFeeInspector.classList.remove('hidden');
}

function closeFeeModal() {
  if (elements.modalFeeInspector) {
    elements.modalFeeInspector.classList.add('hidden');
  }
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
