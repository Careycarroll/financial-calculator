// ===================================================================
// HOME INTERACTION & CATALOG CONTROLLER
// Handles dynamic rendering of Suite vs Workflow views, global search,
// category filtering, and persistent layout preferences.
// ===================================================================

import { SUITES_CONFIG, WORKFLOWS_CONFIG, TOOLS_CATALOG } from './home-catalog.js';

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
            <span class="suite-tool-badge badge-${tool.badge.toLowerCase()}">${tool.badge}</span>
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
      // Find workflows that contain tools from the selected suite
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
              <span class="workflow-card-badge badge-${tool.badge.toLowerCase()}">${tool.badge}</span>
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
            <span class="workflow-card-badge badge-${tool.badge.toLowerCase()}">${tool.badge}</span>
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

  // --- KEYBOARD SHORTCUTS ---
  window.addEventListener('keydown', (e) => {
    // '/' or 'Cmd+K' / 'Ctrl+K' to focus search
    if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) && document.activeElement !== searchInput) {
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    } else if (e.key === 'Escape') {
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
