// ===================================================================
// HOME INTERACTION & CATALOG CONTROLLER
// Handles dynamic rendering of Suite vs Workflow views, global search,
// category filtering, persistent layout preferences, and interactive
// badge taxonomy popovers.
// ===================================================================

import { SUITES_CONFIG, WORKFLOWS_CONFIG, TOOLS_CATALOG, BADGE_DEFINITIONS } from './home-catalog.js';

(function () {
  const STORAGE_KEY = 'fc_home_view';
  let currentView = localStorage.getItem(STORAGE_KEY) || 'suite';
  let activeCategoryFilter = 'all';
  let searchQuery = '';

  // Elements
  const navToggleSuite = document.getElementById('nav-toggle-suite');
  const navToggleWorkflow = document.getElementById('nav-toggle-workflow');
  const searchInput = document.getElementById('home-search');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const filterPillsContainer = document.getElementById('filter-pills');
  const contentArea = document.getElementById('home-content-area');

  if (!contentArea) return;

  // --- FLOATING BADGE POPOVER SINGLETON (OPTION A) ---
  let popoverEl = null;
  let activeBadgeEl = null;

  function getOrCreatePopover() {
    if (popoverEl) return popoverEl;
    popoverEl = document.createElement('div');
    popoverEl.id = 'badge-popover';
    popoverEl.className = 'badge-popover hidden';
    popoverEl.setAttribute('role', 'tooltip');
    popoverEl.setAttribute('aria-hidden', 'true');
    popoverEl.innerHTML = `
      <div class="popover-arrow"></div>
      <div class="popover-header">
        <span class="popover-icon"></span>
        <span class="popover-title"></span>
      </div>
      <p class="popover-desc"></p>
    `;
    document.body.appendChild(popoverEl);
    return popoverEl;
  }

  function showBadgePopover(badgeEl) {
    const badgeKey = badgeEl.getAttribute('data-badge');
    if (!badgeKey) return;
    const def = BADGE_DEFINITIONS[badgeKey];
    if (!def) return;

    activeBadgeEl = badgeEl;
    const popover = getOrCreatePopover();
    popover.querySelector('.popover-icon').textContent = def.icon;
    popover.querySelector('.popover-title').textContent = `${badgeKey} • ${def.name}`;
    popover.querySelector('.popover-desc').textContent = def.desc;

    popover.classList.remove('hidden');
    popover.classList.add('visible');
    popover.setAttribute('aria-hidden', 'false');

    positionPopover(badgeEl, popover);
  }

  function positionPopover(badgeEl, popover) {
    const badgeRect = badgeEl.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    // Default position: above the badge, centered horizontally
    let top = badgeRect.top + scrollY - popoverRect.height - 10;
    let left = badgeRect.left + scrollX + badgeRect.width / 2 - popoverRect.width / 2;
    let arrowOnBottom = true;

    // If overflowing top of viewport, flip to below badge
    if (badgeRect.top - popoverRect.height - 10 < 10) {
      top = badgeRect.bottom + scrollY + 10;
      arrowOnBottom = false;
    }

    // Ensure horizontal boundaries (at least 12px padding from screen edge)
    const minLeft = scrollX + 12;
    const maxLeft = scrollX + document.documentElement.clientWidth - popoverRect.width - 12;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.classList.toggle('arrow-bottom', arrowOnBottom);
    popover.classList.toggle('arrow-top', !arrowOnBottom);
  }

  function hideBadgePopover() {
    if (!popoverEl) return;
    popoverEl.classList.remove('visible');
    popoverEl.classList.add('hidden');
    popoverEl.setAttribute('aria-hidden', 'true');
    activeBadgeEl = null;
  }

  // --- ESCAPE HTML UTILITY ---
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- HIGHLIGHT MATCH TEXT ---
  function highlightMatch(text, query) {
    if (!query || !text) return escapeHTML(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const escapedText = escapeHTML(text);
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // --- RENDER SUITE VIEW (OPTION 1: PORTFOLIO VISUALIZER STYLE) ---
  function renderSuiteView() {
    let suitesToRender = SUITES_CONFIG;
    if (activeCategoryFilter !== 'all') {
      suitesToRender = SUITES_CONFIG.filter((s) => s.id === activeCategoryFilter);
    }

    if (suitesToRender.length === 0) {
      contentArea.innerHTML = `
        <div class="search-empty-state">
          <div class="search-empty-icon">🔍</div>
          <h3 class="search-empty-title">No Suites Found</h3>
          <p class="search-empty-desc">No tool suites match the current category filter.</p>
          <button type="button" class="search-reset-btn" id="btn-reset-filters">Show All Tools</button>
        </div>
      `;
      wireResetFiltersBtn();
      return;
    }

    let html = '<div class="suite-hub-grid">';

    for (const suite of suitesToRender) {
      const suiteTools = TOOLS_CATALOG.filter((t) => t.suiteId === suite.id);

      html += `
        <article class="suite-tile" data-suite-id="${suite.id}">
          <header class="suite-tile-header">
            <div class="suite-tile-title-group">
              <span class="suite-tile-icon">${suite.icon}</span>
              <h3 class="suite-tile-title">${escapeHTML(suite.title)}</h3>
            </div>
            <span class="suite-tile-badge">${suiteTools.length} Tools</span>
          </header>
          <p class="suite-tile-desc">${escapeHTML(suite.desc)}</p>
          <div class="suite-tools-list">
      `;

      for (const tool of suiteTools) {
        html += `
          <a href="${tool.path}" class="suite-tool-link">
            <span class="suite-tool-icon">${tool.icon}</span>
            <div class="suite-tool-info">
              <span class="suite-tool-name">${escapeHTML(tool.title)}</span>
              <span class="suite-tool-snippet">${escapeHTML(tool.desc)}</span>
            </div>
            <span class="suite-tool-badge badge-${tool.badge.toLowerCase()}" data-badge="${tool.badge}" role="button" tabindex="0" title="Click or hover to learn about ${tool.badge} tools">${tool.badge}</span>
            <span class="suite-tool-arrow">»</span>
          </a>
        `;
      }

      html += `
          </div>
        </article>
      `;
    }

    html += '</div>';
    contentArea.innerHTML = html;
  }

  // --- RENDER WORKFLOW VIEW (OPTION 3: GOAL/INTENT-DRIVEN) ---
  function renderWorkflowView() {
    let workflowsToRender = WORKFLOWS_CONFIG;

    if (activeCategoryFilter !== 'all') {
      const suiteTools = TOOLS_CATALOG.filter((t) => t.suiteId === activeCategoryFilter);
      const activeWorkflowIds = new Set(suiteTools.map((t) => t.workflowId));
      workflowsToRender = WORKFLOWS_CONFIG.filter((wf) => activeWorkflowIds.has(wf.id));
    }

    if (workflowsToRender.length === 0) {
      contentArea.innerHTML = `
        <div class="search-empty-state">
          <div class="search-empty-icon">🎯</div>
          <h3 class="search-empty-title">No Workflows Found</h3>
          <p class="search-empty-desc">No workflow categories match the active filter.</p>
          <button type="button" class="search-reset-btn" id="btn-reset-filters">Show All Tools</button>
        </div>
      `;
      wireResetFiltersBtn();
      return;
    }

    let html = '<div class="workflow-sections-container">';

    for (const wf of workflowsToRender) {
      let wfTools = TOOLS_CATALOG.filter((t) => t.workflowId === wf.id);
      if (activeCategoryFilter !== 'all') {
        wfTools = wfTools.filter((t) => t.suiteId === activeCategoryFilter);
      }

      if (wfTools.length === 0) continue;

      html += `
        <section class="workflow-section">
          <header class="workflow-section-header">
            <div class="workflow-section-title-row">
              <span class="workflow-section-icon">${wf.icon}</span>
              <h3 class="workflow-section-title">${escapeHTML(wf.title)}</h3>
            </div>
            <p class="workflow-section-desc">${escapeHTML(wf.desc)}</p>
          </header>
          <div class="workflow-cards-grid">
      `;

      for (const tool of wfTools) {
        html += `
          <a href="${tool.path}" class="workflow-card">
            <div class="workflow-card-top">
              <span class="workflow-card-icon">${tool.icon}</span>
              <span class="workflow-card-badge badge-${tool.badge.toLowerCase()}" data-badge="${tool.badge}" role="button" tabindex="0" title="Click or hover to learn about ${tool.badge} tools">${tool.badge}</span>
            </div>
            <h4 class="workflow-card-title">${escapeHTML(tool.title)}</h4>
            <p class="workflow-card-desc">${escapeHTML(tool.desc)}</p>
            <div class="workflow-card-action">
              <span>Launch Tool</span>
              <span class="workflow-action-arrow">→</span>
            </div>
          </a>
        `;
      }

      html += `
          </div>
        </section>
      `;
    }

    html += '</div>';
    contentArea.innerHTML = html;
  }

  // --- RENDER LIVE SEARCH RESULTS ---
  function renderSearchResults(query) {
    const q = query.trim().toLowerCase();
    const queryTokens = q.split(/\s+/).filter(Boolean);

    const matches = TOOLS_CATALOG.filter((tool) => {
      const searchBlob = `${tool.title} ${tool.shortTitle} ${tool.desc} ${tool.badge} ${tool.keywords.join(' ')}`.toLowerCase();
      return queryTokens.every((token) => searchBlob.includes(token));
    });

    if (matches.length === 0) {
      contentArea.innerHTML = `
        <div class="search-empty-state">
          <div class="search-empty-icon">🔍</div>
          <h3 class="search-empty-title">No Tools Found Matching "${escapeHTML(query)}"</h3>
          <p class="search-empty-desc">
            Try checking for typos or searching general terms like "Monte Carlo", "Loan", "DCA", "Regression", "FIRE", or "DCF".
          </p>
          <button type="button" class="search-reset-btn" id="btn-clear-search">Clear Search</button>
        </div>
      `;

      const clearBtn = document.getElementById('btn-clear-search');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          searchInput.value = '';
          searchQuery = '';
          if (searchClearBtn) searchClearBtn.classList.add('hidden');
          applyCurrentView();
        });
      }
      return;
    }

    let html = `
      <div class="search-results-container">
        <header class="search-results-header">
          <div class="search-results-summary">
            Found <span>${matches.length}</span> tool${matches.length === 1 ? '' : 's'} matching "${escapeHTML(query)}"
          </div>
          <button type="button" class="search-reset-btn" id="btn-clear-search">Clear Search (Esc)</button>
        </header>
        <div class="workflow-cards-grid">
    `;

    for (const tool of matches) {
      const highlightedTitle = highlightMatch(tool.title, query);
      const highlightedDesc = highlightMatch(tool.desc, query);

      html += `
        <a href="${tool.path}" class="workflow-card">
          <div class="workflow-card-top">
            <span class="workflow-card-icon">${tool.icon}</span>
            <span class="workflow-card-badge badge-${tool.badge.toLowerCase()}" data-badge="${tool.badge}" role="button" tabindex="0" title="Click or hover to learn about ${tool.badge} tools">${tool.badge}</span>
          </div>
          <h4 class="workflow-card-title">${highlightedTitle}</h4>
          <p class="workflow-card-desc">${highlightedDesc}</p>
          <div class="workflow-card-action">
            <span>Launch Tool</span>
            <span class="workflow-action-arrow">→</span>
          </div>
        </a>
      `;
    }

    html += `
        </div>
      </div>
    `;

    contentArea.innerHTML = html;

    const clearBtn = document.getElementById('btn-clear-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        if (searchClearBtn) searchClearBtn.classList.add('hidden');
        applyCurrentView();
      });
    }
  }

  // --- HELPER: RESET FILTERS ---
  function wireResetFiltersBtn() {
    const btn = document.getElementById('btn-reset-filters');
    if (btn) {
      btn.addEventListener('click', () => {
        activeCategoryFilter = 'all';
        updateFilterPillsActiveState();
        applyCurrentView();
      });
    }
  }

  // --- RENDER DISPATCHER ---
  function applyCurrentView() {
    hideBadgePopover();

    if (searchQuery.trim().length > 0) {
      renderSearchResults(searchQuery);
      return;
    }

    if (currentView === 'workflow') {
      renderWorkflowView();
    } else {
      renderSuiteView();
    }
  }

  // --- VIEW TOGGLE HANDLERS ---
  function setView(view) {
    currentView = view;
    localStorage.setItem(STORAGE_KEY, view);

    if (navToggleSuite) {
      navToggleSuite.classList.toggle('active', view === 'suite');
      navToggleSuite.setAttribute('aria-pressed', view === 'suite');
    }
    if (navToggleWorkflow) {
      navToggleWorkflow.classList.toggle('active', view === 'workflow');
      navToggleWorkflow.setAttribute('aria-pressed', view === 'workflow');
    }

    applyCurrentView();
  }

  if (navToggleSuite) {
    navToggleSuite.addEventListener('click', () => setView('suite'));
  }
  if (navToggleWorkflow) {
    navToggleWorkflow.addEventListener('click', () => setView('workflow'));
  }

  // --- SEARCH INPUT LISTENERS ---
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchClearBtn) {
        if (searchQuery.length > 0) {
          searchClearBtn.classList.remove('hidden');
        } else {
          searchClearBtn.classList.add('hidden');
        }
      }
      applyCurrentView();
    });

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.classList.add('hidden');
        searchInput.focus();
        applyCurrentView();
      });
    }
  }

  // --- BADGE INTERACTION EVENT DELEGATION (OPTION A) ---
  contentArea.addEventListener('mouseover', (e) => {
    const badge = e.target.closest('[data-badge]');
    if (badge) {
      showBadgePopover(badge);
    }
  });

  contentArea.addEventListener('mouseout', (e) => {
    const badge = e.target.closest('[data-badge]');
    if (badge) {
      hideBadgePopover();
    }
  });

  // Tap / click handler on badge (especially for phones)
  contentArea.addEventListener('click', (e) => {
    const badge = e.target.closest('[data-badge]');
    if (badge) {
      e.preventDefault();
      e.stopPropagation();
      if (activeBadgeEl === badge) {
        hideBadgePopover();
      } else {
        showBadgePopover(badge);
      }
    }
  });

  // Global dismiss listeners
  window.addEventListener('click', (e) => {
    if (popoverEl && !popoverEl.contains(e.target) && !e.target.closest('[data-badge]')) {
      hideBadgePopover();
    }
  });

  window.addEventListener('scroll', () => {
    if (activeBadgeEl && popoverEl && !popoverEl.classList.contains('hidden')) {
      positionPopover(activeBadgeEl, popoverEl);
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (activeBadgeEl && popoverEl && !popoverEl.classList.contains('hidden')) {
      positionPopover(activeBadgeEl, popoverEl);
    }
  }, { passive: true });

  // --- KEYBOARD SHORTCUTS ---
  window.addEventListener('keydown', (e) => {
    // '/' or 'Cmd+K' / 'Ctrl+K' to focus search
    if (
      (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
      document.activeElement !== searchInput
    ) {
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    } else if (e.key === 'Escape') {
      if (popoverEl && !popoverEl.classList.contains('hidden')) {
        hideBadgePopover();
        return;
      }
      if (searchInput && (document.activeElement === searchInput || searchQuery.length > 0)) {
        searchInput.value = '';
        searchQuery = '';
        if (searchClearBtn) searchClearBtn.classList.add('hidden');
        searchInput.blur();
        applyCurrentView();
      }
    }
  });

  // --- CATEGORY FILTER PILLS GENERATION & LISTENERS ---
  function updateFilterPillsActiveState() {
    if (!filterPillsContainer) return;
    const pills = filterPillsContainer.querySelectorAll('.filter-pill');
    pills.forEach((p) => {
      const filterId = p.getAttribute('data-filter');
      p.classList.toggle('active', filterId === activeCategoryFilter);
    });
  }

  function initFilterPills() {
    if (!filterPillsContainer) return;

    let html = `
      <button type="button" class="filter-pill active" data-filter="all">
        All Tools <span class="pill-count">${TOOLS_CATALOG.length}</span>
      </button>
    `;

    for (const suite of SUITES_CONFIG) {
      const count = TOOLS_CATALOG.filter((t) => t.suiteId === suite.id).length;
      html += `
        <button type="button" class="filter-pill" data-filter="${suite.id}">
          ${suite.icon} ${escapeHTML(suite.title.replace(' Suite', ''))} <span class="pill-count">${count}</span>
        </button>
      `;
    }

    filterPillsContainer.innerHTML = html;

    filterPillsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      activeCategoryFilter = pill.getAttribute('data-filter') || 'all';
      updateFilterPillsActiveState();
      applyCurrentView();
    });
  }

  // --- INITIALIZATION ---
  initFilterPills();
  setView(currentView);
})();
