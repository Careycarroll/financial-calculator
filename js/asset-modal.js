/**
 * Searchable Asset Modal & Selector Component
 * Reusable modal for instant live searching across pre-bundled benchmarks and custom session funds,
 * category filtering, quick preset selection, in-modal drag-and-drop file ingestion,
 * and multi-asset basket configuration (for Correlation Matrix & Portfolio Blends).
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
let multiSelectedSet = new Set();

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

        <!-- Multi-Asset Basket Bar (visible only in multi-select mode) -->
        <div class="asset-modal-basket-bar hidden" id="asset-modal-basket-bar">
          <div class="basket-bar-title">
            <span>Selected for Matrix (<strong id="asset-modal-basket-count">0</strong>/<span id="asset-modal-basket-max">15</span>):</span>
            <span style="font-size: 0.7rem; color: var(--text-secondary, #94a3b8);">Min <span id="asset-modal-basket-min">2</span>, Max <span id="asset-modal-basket-max-sub">15</span> assets</span>
          </div>
          <div class="basket-chips-wrap" id="asset-modal-basket-chips"></div>
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

        <!-- Multi-Asset Footer Action (visible only in multi-select mode) -->
        <div class="asset-modal-footer hidden" id="asset-modal-footer">
          <div class="footer-left">
            <span class="footer-summary" id="asset-modal-footer-summary">5 assets in active matrix</span>
          </div>
          <div class="footer-actions">
            <button type="button" class="btn-modal-cancel" id="btn-asset-modal-cancel">Cancel</button>
            <button type="button" class="btn-modal-apply" id="btn-asset-modal-apply">Apply &amp; Update Matrix ✓</button>
          </div>
        </div>

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
        if (currentOptions?.isMulti) renderBasketBar();
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
  const applyBtn = document.getElementById('btn-asset-modal-apply');
  const cancelBtn = document.getElementById('btn-asset-modal-cancel');

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

  // Multi-select actions
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      if (currentOptions?.isMulti && typeof currentOptions.onApply === 'function') {
        currentOptions.onApply(Array.from(multiSelectedSet));
      }
      closeAssetModal();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeAssetModal);
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
      if (!ticker) return;
      if (currentOptions?.isMulti) {
        toggleMultiFund(ticker);
      } else {
        selectFund(ticker);
      }
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
        if (currentOptions?.isMulti) {
          multiSelectedSet = new Set(['VOO', 'QQQ', 'SCHD', 'BND', 'SPY']);
          renderBasketBar();
        }
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

    // If exactly 1 fund was uploaded in single-select mode, automatically select it
    if (files.length === 1 && !currentOptions?.isMulti) {
      const allFunds = getAllFundsSync();
      const lastUploaded = allFunds[allFunds.length - 1];
      if (lastUploaded && !lastUploaded.isPreset) {
        selectFund(lastUploaded.ticker);
      }
    } else if (currentOptions?.isMulti && files.length === 1) {
      const allFunds = getAllFundsSync();
      const lastUploaded = allFunds[allFunds.length - 1];
      if (lastUploaded && !lastUploaded.isPreset) {
        toggleMultiFund(lastUploaded.ticker);
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
 * Toggles a ticker into/out of multiSelectedSet
 */
function toggleMultiFund(ticker) {
  const sym = ticker.toUpperCase();
  const min = currentOptions?.minSelected || 2;
  const max = currentOptions?.maxSelected || 15;

  if (multiSelectedSet.has(sym)) {
    if (multiSelectedSet.size <= min) {
      alert(`At least ${min} assets are required for the correlation matrix.`);
      return;
    }
    multiSelectedSet.delete(sym);
  } else {
    if (multiSelectedSet.size >= max) {
      alert(`A maximum of ${max} assets can be included in the correlation matrix at once for numerical stability.`);
      return;
    }
    multiSelectedSet.add(sym);
  }

  renderBasketBar();
  renderAssetList();
}

/**
 * Renders the top active basket bar inside the modal
 */
function renderBasketBar() {
  const chipsContainer = document.getElementById('asset-modal-basket-chips');
  const countLabel = document.getElementById('asset-modal-basket-count');
  const maxLabel = document.getElementById('asset-modal-basket-max');
  const maxSubLabel = document.getElementById('asset-modal-basket-max-sub');
  const minLabel = document.getElementById('asset-modal-basket-min');
  const footerSummary = document.getElementById('asset-modal-footer-summary');

  const max = currentOptions?.maxSelected || 15;
  const min = currentOptions?.minSelected || 2;

  if (countLabel) countLabel.textContent = multiSelectedSet.size;
  if (maxLabel) maxLabel.textContent = max;
  if (maxSubLabel) maxSubLabel.textContent = max;
  if (minLabel) minLabel.textContent = min;
  if (footerSummary) footerSummary.textContent = `${multiSelectedSet.size} assets selected for matrix (min ${min}, max ${max})`;

  if (!chipsContainer) return;

  const allFunds = getAllFundsSync();
  let html = '';

  Array.from(multiSelectedSet).forEach(sym => {
    const f = allFunds.find(fund => fund.ticker.toUpperCase() === sym) || { ticker: sym, color: '#38bdf8' };
    html += `
      <span class="basket-pill">
        <span class="picker-dot" style="background: ${f.color || '#38bdf8'};"></span>
        <span>${escapeHtml(sym)}</span>
        <button type="button" class="basket-pill-remove" data-remove-ticker="${escapeHtml(sym)}" title="Remove ${escapeHtml(sym)} from matrix">✕</button>
      </span>
    `;
  });

  chipsContainer.innerHTML = html;

  chipsContainer.querySelectorAll('[data-remove-ticker]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sym = btn.dataset.removeTicker;
      if (sym) toggleMultiFund(sym);
    });
  });
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
  const isMulti = Boolean(currentOptions?.isMulti);
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

  // 3. Sort: In multi mode, active items first, then presets, then alphabetical
  filtered.sort((a, b) => {
    if (isMulti) {
      const aIn = multiSelectedSet.has(a.ticker.toUpperCase());
      const bIn = multiSelectedSet.has(b.ticker.toUpperCase());
      if (aIn && !bIn) return -1;
      if (!aIn && bIn) return 1;
    }
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
    const sym = f.ticker.toUpperCase();
    const isSelected = isMulti ? multiSelectedSet.has(sym) : sym === currentActive;
    const dateRange = f.data && f.data.length > 0
      ? `${f.data[0].date} &rarr; ${f.data[f.data.length - 1].date} (${f.data.length} months)`
      : 'Historical series loaded';

    html += `
      <div class="asset-list-item ${isSelected ? 'is-selected' : ''}" data-ticker="${escapeHtml(f.ticker)}" role="button" tabindex="0" style="cursor: pointer;">
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
        ${isMulti ? `
          <button type="button" class="item-select-btn ${isSelected ? 'is-added' : ''}" data-toggle-ticker="${escapeHtml(f.ticker)}">
            ${isSelected ? '✓ Added' : '+ Add'}
          </button>
        ` : `
          <button type="button" class="item-select-btn" data-select-ticker="${escapeHtml(f.ticker)}">
            ${isSelected ? 'Active ✓' : 'Select'}
          </button>
        `}
      </div>
    `;
  });

  listContainer.innerHTML = html;

  if (isMulti) {
    listContainer.querySelectorAll('.asset-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const toggleBtn = item.querySelector('[data-toggle-ticker]');
        const ticker = toggleBtn ? toggleBtn.dataset.toggleTicker : item.dataset.ticker;
        if (ticker) toggleMultiFund(ticker);
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const toggleBtn = item.querySelector('[data-toggle-ticker]');
          const ticker = toggleBtn ? toggleBtn.dataset.toggleTicker : item.dataset.ticker;
          if (ticker) toggleMultiFund(ticker);
        }
      });
    });
  } else {
    listContainer.querySelectorAll('.asset-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const selectBtn = item.querySelector('[data-select-ticker]');
        const ticker = selectBtn ? selectBtn.dataset.selectTicker : item.dataset.ticker;
        if (ticker) selectFund(ticker);
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const selectBtn = item.querySelector('[data-select-ticker]');
          const ticker = selectBtn ? selectBtn.dataset.selectTicker : item.dataset.ticker;
          if (ticker) selectFund(ticker);
        }
      });
    });
  }
}

/**
 * Handles selection of a fund (single-select mode)
 */
export function selectFund(ticker) {
  const sym = ticker.toUpperCase();
  const allFunds = getAllFundsSync();
  const fund = allFunds.find(f => f.ticker.toUpperCase() === sym) || { ticker: sym, name: sym };

  if (currentOptions && typeof currentOptions.onSelect === 'function') {
    // Construct a hybrid payload that seamlessly supports:
    // 1. String-like usage: arg == 'QQQ', arg.toUpperCase(), String(arg)
    // 2. Object property access: arg.ticker, arg.name, arg.data, arg.color, arg.category
    // 3. Multi-param callbacks: onSelect(ticker, fund) or onSelect(fund, ticker)
    const hybrid = new String(sym);
    hybrid.ticker = sym;
    hybrid.name = fund.name || sym;
    hybrid.color = fund.color;
    hybrid.data = fund.data;
    hybrid.category = fund.category;
    hybrid.inception = fund.inception;

    try {
      currentOptions.onSelect(hybrid, fund);
    } catch (err) {
      console.error('Error in assetModal onSelect callback:', err);
    }
  }
  closeAssetModal();
}

/**
 * Opens the asset modal with the specified configuration
 * @param {Object|Function} options - Options object, or direct onSelect callback function
 * @param {string} [options.title] - Modal title
 * @param {string} [options.badgeText] - Modal header badge label
 * @param {string} [options.badgeColor] - Badge color
 * @param {boolean} [options.isMulti] - Whether in multi-asset basket mode
 * @param {Iterable<string>} [options.selectedTickers] - Currently selected tickers (for multi mode)
 * @param {number} [options.minSelected] - Minimum number of selected assets (default 2)
 * @param {number} [options.maxSelected] - Maximum number of selected assets (default 15)
 * @param {string} [options.activeTicker] - Currently selected ticker (for single mode)
 * @param {Function} [options.onSelect] - Callback when fund is selected in single mode (ticker, fund) => void
 * @param {Function} [options.onApply] - Callback when basket is applied in multi mode (tickerArray) => void
 * @param {Function} [options.onImport] - Callback when files are imported (result) => void
 * @param {Function} [options.onReset] - Callback when session is reset to default 5
 */
export function openAssetModal(options = {}) {
  // Support function argument signature (e.g. in alm-ui.js: openAssetModal(callback))
  if (typeof options === 'function') {
    options = { onSelect: options };
  }

  ensureModalDOM();

  currentOptions = {
    title: options.title || 'Select Asset / Benchmark',
    badgeText: options.badgeText || (options.targetType === 'fund' ? 'Asset' : (options.targetType === 'benchmark' ? 'Benchmark' : 'Asset')),
    badgeColor: options.badgeColor || '#2dd4bf',
    isMulti: Boolean(options.isMulti),
    selectedTickers: options.selectedTickers || [],
    minSelected: options.minSelected != null ? options.minSelected : 2,
    maxSelected: options.maxSelected != null ? options.maxSelected : 15,
    activeTicker: options.activeTicker || options.selectedTicker || '',
    onSelect: options.onSelect || (() => {}),
    onApply: options.onApply || (() => {}),
    onImport: options.onImport || null,
    onReset: options.onReset || null
  };

  if (typeof document === 'undefined') return;

  const titleEl = document.getElementById('asset-modal-title');
  const badgeEl = document.getElementById('asset-modal-badge');
  const searchInput = document.getElementById('asset-modal-search-input');
  const clearSearchBtn = document.getElementById('btn-clear-asset-modal-search');
  const overlay = document.getElementById('asset-modal-overlay');
  const basketBar = document.getElementById('asset-modal-basket-bar');
  const footerBar = document.getElementById('asset-modal-footer');

  if (titleEl) titleEl.textContent = currentOptions.title;
  if (badgeEl) {
    badgeEl.textContent = currentOptions.badgeText;
    badgeEl.style.color = currentOptions.badgeColor;
    badgeEl.style.background = `${currentOptions.badgeColor}25`;
  }

  // Handle multi mode vs single mode UI visibility
  if (currentOptions.isMulti) {
    multiSelectedSet = new Set(Array.from(currentOptions.selectedTickers || []).map(t => t.toUpperCase()));
    if (basketBar) basketBar.classList.remove('hidden');
    if (footerBar) footerBar.classList.remove('hidden');
    renderBasketBar();
  } else {
    if (basketBar) basketBar.classList.add('hidden');
    if (footerBar) footerBar.classList.add('hidden');
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
  if (typeof document === 'undefined') return;
  const overlay = document.getElementById('asset-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}
