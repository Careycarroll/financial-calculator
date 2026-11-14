/**
 * Searchable Asset Modal & Selector Component
 * Reusable modal for instant live searching across pre-bundled benchmarks and custom session funds,
 * category filtering, quick preset selection, and in-modal drag-and-drop file ingestion.
 */

import {
  getAllFundsSync,
  importFilesToSession,
  resetSessionToDefault,
  subscribeSessionFunds
} from './session-funds.js';

let currentOptions = null;
let activeCategoryFilter = 'all'; // 'all' | 'preset' | 'custom'
let isSubscribed = false;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Ensures modal HTML markup and CSS link exist in DOM
 */
function ensureModalDOM() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('asset-modal-overlay')) return;

  // Auto-inject CSS stylesheet if not present
  if (!document.querySelector('link[href*="asset-modal.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    const isSubdir = document.location.pathname.includes('/fund-regression/') ||
                     document.location.pathname.includes('/dca-comparator/') ||
                     document.location.pathname.includes('/asset-analytics/');
    link.href = isSubdir ? '../css/asset-modal.css' : 'css/asset-modal.css';
    document.head.appendChild(link);
  }

  const modalHtml = `
    <div class="asset-modal-overlay hidden" id="asset-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="asset-modal-title">
      <div class="asset-modal-container">
        <div class="asset-modal-header">
          <div class="asset-modal-title-row">
            <h3 id="asset-modal-title">Select Asset / Benchmark</h3>
            <span class="asset-modal-target-badge" id="asset-modal-badge">Target Asset</span>
          </div>
          <button type="button" class="modal-close-btn" id="btn-close-asset-modal" aria-label="Close modal">✕</button>
        </div>

        <div class="asset-modal-search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="asset-modal-search-input" class="modal-search-input" placeholder="Search by ticker (QQQ, VOO) or name (Dividend, Tech, Bond)..." autocomplete="off" />
          <button type="button" class="modal-clear-search hidden" id="btn-clear-asset-modal-search" aria-label="Clear search">✕</button>
        </div>

        <div class="quick-presets-bar">
          <span class="quick-presets-label">Quick Presets:</span>
          <button type="button" class="preset-chip" data-modal-preset="VOO">VOO (S&P 500)</button>
          <button type="button" class="preset-chip" data-modal-preset="SPY">SPY (S&P 500)</button>
          <button type="button" class="preset-chip" data-modal-preset="QQQ">QQQ (Nasdaq)</button>
          <button type="button" class="preset-chip" data-modal-preset="SCHD">SCHD (Dividend)</button>
          <button type="button" class="preset-chip" data-modal-preset="BND">BND (Total Bond)</button>
        </div>

        <div class="modal-category-tabs">
          <div class="cat-tabs-left">
            <button type="button" class="cat-tab active" data-cat="all">All Available (<span id="asset-modal-count-all">5</span>)</button>
            <button type="button" class="cat-tab" data-cat="preset">Core Presets (<span id="asset-modal-count-preset">5</span>)</button>
            <button type="button" class="cat-tab" data-cat="custom">Session Uploads (<span id="asset-modal-count-custom">0</span>)</button>
          </div>
          <button type="button" class="btn-reset-session" id="btn-asset-modal-reset-session" title="Clear temporary session uploads and reset to default 5">
            <span>🗑️ Reset to 5 Defaults</span>
          </button>
        </div>

        <div class="asset-modal-list" id="asset-modal-list"></div>

        <div class="asset-modal-dropzone" id="asset-modal-dropzone">
          <input type="file" id="asset-modal-file-input" multiple accept=".csv,.txt" style="display:none;" />
          <div class="dropzone-inner" id="asset-modal-dropzone-inner">
            <span class="dropzone-icon">📂</span>
            <div class="dropzone-text">
              <strong>Drag &amp; drop CSV/TXT files here</strong> to add funds to this session (shared across Trading Suite)
              <span class="dropzone-sub">or <button type="button" class="btn-browse-files" id="btn-asset-modal-browse-files">browse files</button></span>
            </div>
          </div>
          <div class="dropzone-progress hidden" id="asset-modal-dropzone-progress">
            <div class="dropzone-progress-bar" id="asset-modal-dropzone-progress-bar"></div>
            <span class="dropzone-progress-text" id="asset-modal-dropzone-progress-text">Importing files...</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  attachModalListeners();

  if (!isSubscribed) {
    subscribeSessionFunds(() => {
      const overlay = document.getElementById('asset-modal-overlay');
      if (overlay && !overlay.classList.contains('hidden')) {
        updateCounts();
        renderAssetList();
      }
    });
    isSubscribed = true;
  }
}

/**
 * Attaches modal event listeners
 */
function attachModalListeners() {
  const overlay = document.getElementById('asset-modal-overlay');
  const closeBtn = document.getElementById('btn-close-asset-modal');
  const searchInput = document.getElementById('asset-modal-search-input');
  const clearSearchBtn = document.getElementById('btn-clear-asset-modal-search');
  const catTabs = document.querySelectorAll('.cat-tab');
  const resetBtn = document.getElementById('btn-asset-modal-reset-session');
  const dropzoneInner = document.getElementById('asset-modal-dropzone-inner');
  const fileInput = document.getElementById('asset-modal-file-input');
  const browseBtn = document.getElementById('btn-asset-modal-browse-files');

  // Close handlers
  if (closeBtn) closeBtn.addEventListener('click', closeAssetModal);
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAssetModal();
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
        closeAssetModal();
      }
    });
  }

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const hasVal = searchInput.value.trim().length > 0;
      if (clearSearchBtn) {
        if (hasVal) clearSearchBtn.classList.remove('hidden');
        else clearSearchBtn.classList.add('hidden');
      }
      renderAssetList();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      clearSearchBtn.classList.add('hidden');
      renderAssetList();
    });
  }

  // Quick Preset Chips
  document.querySelectorAll('[data-modal-preset]').forEach(chip => {
    chip.addEventListener('click', () => {
      const ticker = chip.dataset.modalPreset;
      if (ticker) selectFund(ticker);
    });
  });

  // Category Tabs
  catTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      catTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategoryFilter = tab.dataset.cat || 'all';
      renderAssetList();
    });
  });

  // Reset Session Funds Button
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const confirmed = confirm('Clear all custom uploaded session funds and revert to the 5 default core presets (VOO, SPY, QQQ, SCHD, BND)?');
      if (confirmed) {
        await resetSessionToDefault();
        updateCounts();
        renderAssetList();
        if (currentOptions && typeof currentOptions.onReset === 'function') {
          currentOptions.onReset();
        }
      }
    });
  }

  // Browse Files Trigger
  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropzoneInner && fileInput) {
    dropzoneInner.addEventListener('click', () => fileInput.click());

    dropzoneInner.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzoneInner.classList.add('dragover');
    });

    dropzoneInner.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzoneInner.classList.remove('dragover');
    });

    dropzoneInner.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzoneInner.classList.remove('dragover');
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) handleFilesImport(files);
    });

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      if (files.length > 0) handleFilesImport(files);
      fileInput.value = '';
    });
  }
}

/**
 * Handles batch file import via Drag & Drop or File Input
 */
async function handleFilesImport(files) {
  if (!files || files.length === 0) return;

  const progress = document.getElementById('asset-modal-dropzone-progress');
  const progressBar = document.getElementById('asset-modal-dropzone-progress-bar');
  const progressText = document.getElementById('asset-modal-dropzone-progress-text');

  if (progress) progress.classList.remove('hidden');
  if (progressBar) progressBar.style.width = '0%';
  if (progressText) progressText.textContent = `Importing ${files.length} file(s)...`;

  const result = await importFilesToSession(files, (processed, total) => {
    if (progressBar) progressBar.style.width = `${Math.round((processed / total) * 100)}%`;
    if (progressText) progressText.textContent = `Parsed ${processed} of ${total} files...`;
  });

  if (progress) progress.classList.add('hidden');

  if (result.errors && result.errors.length > 0) {
    console.warn('Import warnings:', result.errors);
  }

  if (result.importedCount > 0) {
    updateCounts();
    renderAssetList();
    if (currentOptions && typeof currentOptions.onImport === 'function') {
      currentOptions.onImport(result);
    }

    // If exactly 1 fund was uploaded, automatically select it!
    if (files.length === 1) {
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
 * Updates fund category counts in tab headers
 */
function updateCounts() {
  const allFunds = getAllFundsSync();
  const presets = allFunds.filter(f => f.isPreset).length;
  const custom = allFunds.filter(f => !f.isPreset).length;

  const countAll = document.getElementById('asset-modal-count-all');
  const countPreset = document.getElementById('asset-modal-count-preset');
  const countCustom = document.getElementById('asset-modal-count-custom');

  if (countAll) countAll.textContent = allFunds.length;
  if (countPreset) countPreset.textContent = presets;
  if (countCustom) countCustom.textContent = custom;
}

/**
 * Renders the scrollable list of funds based on active filter and query
 */
function renderAssetList() {
  const listContainer = document.getElementById('asset-modal-list');
  const searchInput = document.getElementById('asset-modal-search-input');
  if (!listContainer) return;

  const allFunds = getAllFundsSync();
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const currentActive = currentOptions?.activeTicker ? currentOptions.activeTicker.toUpperCase() : '';

  // 1. Filter by category tab
  let filtered = allFunds;
  if (activeCategoryFilter === 'preset') {
    filtered = filtered.filter(f => f.isPreset);
  } else if (activeCategoryFilter === 'custom') {
    filtered = filtered.filter(f => !f.isPreset);
  }

  // 2. Filter by search query
  if (query.length > 0) {
    filtered = filtered.filter(f => {
      const t = (f.ticker || '').toLowerCase();
      const n = (f.name || '').toLowerCase();
      const c = (f.category || '').toLowerCase();
      return t.includes(query) || n.includes(query) || c.includes(query);
    });
  }

  // 3. Sort: Presets first, then alphabetical by ticker
  filtered.sort((a, b) => {
    if (a.isPreset && !b.isPreset) return -1;
    if (!a.isPreset && b.isPreset) return 1;
    return a.ticker.localeCompare(b.ticker);
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary, #94a3b8); font-size: 0.85rem;">
        🔍 No funds found matching "<strong>${escapeHtml(query)}</strong>".
        <br />
        <span style="font-size: 0.75rem; margin-top: 0.5rem; display: inline-block;">
          Drop a CSV file below to import this fund into your session.
        </span>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(f => {
    const isSelected = f.ticker.toUpperCase() === currentActive;
    const dateRange = f.data && f.data.length > 0
      ? `${f.data[0].date} &rarr; ${f.data[f.data.length - 1].date} (${f.data.length} months)`
      : 'Historical series loaded';

    html += `
      <div class="asset-list-item ${isSelected ? 'is-selected' : ''}">
        <div class="item-left">
          <span class="picker-dot" style="background: ${f.color || '#38bdf8'};"></span>
          <span class="item-ticker-badge">${escapeHtml(f.ticker)}</span>
          <div class="item-info">
            <span class="item-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
            <span class="item-meta">
              ${f.isPreset ? '⭐ Core Benchmark' : '💾 Custom Session Fund'} &bull; ${escapeHtml(f.category || 'Asset')} &bull; ${dateRange}
            </span>
          </div>
        </div>
        <button type="button" class="item-select-btn" data-select-ticker="${f.ticker}">
          ${isSelected ? 'Active ✓' : 'Select'}
        </button>
      </div>
    `;
  });

  listContainer.innerHTML = html;

  listContainer.querySelectorAll('[data-select-ticker]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ticker = btn.dataset.selectTicker;
      if (ticker) selectFund(ticker);
    });
  });
}

/**
 * Handles selection of a fund
 */
function selectFund(ticker) {
  const sym = ticker.toUpperCase();
  const allFunds = getAllFundsSync();
  const fund = allFunds.find(f => f.ticker.toUpperCase() === sym) || { ticker: sym };

  if (currentOptions && typeof currentOptions.onSelect === 'function') {
    currentOptions.onSelect(sym, fund);
  }
  closeAssetModal();
}

/**
 * Opens the asset modal with the specified configuration
 * @param {Object} options
 * @param {string} [options.title] - Modal title
 * @param {string} [options.badgeText] - Modal header badge label
 * @param {string} [options.badgeColor] - Badge color
 * @param {string} [options.activeTicker] - Currently selected ticker to highlight
 * @param {Function} [options.onSelect] - Callback when fund is selected (ticker, fund) => void
 * @param {Function} [options.onImport] - Callback when files are imported (result) => void
 * @param {Function} [options.onReset] - Callback when session is reset to default 5
 */
export function openAssetModal(options = {}) {
  ensureModalDOM();

  currentOptions = {
    title: options.title || 'Select Asset / Benchmark',
    badgeText: options.badgeText || 'Asset',
    badgeColor: options.badgeColor || '#2dd4bf',
    activeTicker: options.activeTicker || '',
    onSelect: options.onSelect || (() => {}),
    onImport: options.onImport || null,
    onReset: options.onReset || null
  };

  const titleEl = document.getElementById('asset-modal-title');
  const badgeEl = document.getElementById('asset-modal-badge');
  const searchInput = document.getElementById('asset-modal-search-input');
  const clearSearchBtn = document.getElementById('btn-clear-asset-modal-search');
  const overlay = document.getElementById('asset-modal-overlay');

  if (titleEl) titleEl.textContent = currentOptions.title;
  if (badgeEl) {
    badgeEl.textContent = currentOptions.badgeText;
    badgeEl.style.color = currentOptions.badgeColor;
    badgeEl.style.background = `${currentOptions.badgeColor}25`;
  }

  // Reset category tabs to 'all'
  activeCategoryFilter = 'all';
  document.querySelectorAll('.cat-tab').forEach(t => {
    if (t.dataset.cat === 'all') t.classList.add('active');
    else t.classList.remove('active');
  });

  // Clear search input
  if (searchInput) searchInput.value = '';
  if (clearSearchBtn) clearSearchBtn.classList.add('hidden');

  updateCounts();
  renderAssetList();

  if (overlay) overlay.classList.remove('hidden');

  setTimeout(() => {
    if (searchInput) searchInput.focus();
  }, 50);
}

/**
 * Closes the asset modal
 */
export function closeAssetModal() {
  const overlay = document.getElementById('asset-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}
