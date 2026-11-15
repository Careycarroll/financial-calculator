// ===================================================================
// DYNAMIC NAVIGATION & CONTEXTUAL SUITE SWITCHER
// Loaded as a plain script (not a module) across all pages.
// Enhances .top-nav with dynamic category breadcrumb & jump menus.
// ===================================================================

(function () {
  const SITE_CATALOG = [
    {
      id: "portfolio",
      name: "Portfolio & Allocation",
      icon: "💼",
      tools: [
        { id: "portfolio-backtest", name: "Portfolio Studio", icon: "💼", path: "portfolio-backtest/index.html", desc: "Multi-asset allocation, rebalancing frequencies & side-by-side models" },
        { id: "asset-class-allocation", name: "Asset Class Backtest", icon: "🏛️", path: "portfolio-backtest/asset-class-allocation.html", desc: "54-year backtest across 28 canonical asset classes (1972-present)" },
        { id: "dynamic-allocation", name: "Dynamic Allocation", icon: "🔄", path: "portfolio-backtest/dynamic-allocation.html", desc: "Lifecycle glidepaths & tactical trend-following crash protection" },
        { id: "asset-analytics", name: "Fund Performance Analysis", icon: "📊", path: "asset-analytics/index.html", desc: "Fund performance, underwater crashes, heatmaps & rolling bands" },
        { id: "asset-correlations", name: "Asset Correlations", icon: "🔗", path: "asset-analytics/asset-correlations.html", desc: "Pairwise correlation matrix, covariance & rolling co-movement regimes" },
        { id: "fund-screener", name: "Fund Screener & Rankings", icon: "🔍", path: "asset-analytics/fund-screener.html", desc: "Multi-factor ETF/fund screener, style classification & risk-adjusted leaderboards" },
        { id: "time-series", name: "Time Series Lab", icon: "⏱️", path: "asset-analytics/time-series.html", desc: "Autocorrelation, momentum persistence, seasonality & cointegration ADF test" },
        { id: "dca-comparator", name: "DCA Backtest", icon: "📊", path: "dca-comparator/index.html", desc: "Historical DCA & dividend reinvestment" }
      ],
      bridges: [
        { id: "tactical-allocation", name: "Tactical Allocation", icon: "⚡", path: "tactical-allocation/index.html", desc: "Quantitative timing models & GTAA" },
        { id: "portfolio-optimization", name: "Optimization", icon: "⚖️", path: "portfolio-optimization/portfolio-optimization.html", desc: "Mean-variance & Risk Parity" }
      ]
    },
    {
      id: "tactical",
      name: "Tactical Asset Allocation",
      icon: "⚡",
      tools: [
        { id: "tactical-allocation", name: "Tactical Studio Hub", icon: "⚡", path: "tactical-allocation/index.html", desc: "Compare all 6 tactical allocation models across 54 years" },
        { id: "market-valuation", name: "Market Valuation", icon: "🏛️", path: "tactical-allocation/market-valuation.html", desc: "Shiller CAPE & counter-cyclical valuation equity tilt" },
        { id: "moving-averages", name: "Moving Averages", icon: "📈", path: "tactical-allocation/moving-averages.html", desc: "Meb Faber 10-month & 200-day trend defense filters" },
        { id: "momentum-rotation", name: "Momentum Rotation", icon: "🔄", path: "tactical-allocation/momentum-rotation.html", desc: "Cross-sectional relative strength rotation (IVY 5)" },
        { id: "dual-momentum", name: "Dual Momentum", icon: "🚀", path: "tactical-allocation/dual-momentum.html", desc: "Gary Antonacci Global Equity Momentum (GEM)" },
        { id: "adaptive-allocation", name: "Adaptive Allocation", icon: "⚖️", path: "tactical-allocation/adaptive-allocation.html", desc: "ReSolve momentum + inverse volatility risk parity" },
        { id: "target-volatility", name: "Target Volatility", icon: "🎯", path: "tactical-allocation/target-volatility.html", desc: "Constant risk budgeting & dynamic cash buffering" }
      ],
      bridges: [
        { id: "dynamic-allocation", name: "Dynamic Allocation", icon: "🔄", path: "portfolio-backtest/dynamic-allocation.html", desc: "Lifecycle glidepaths & trend signals" },
        { id: "portfolio-backtest", name: "Portfolio Studio", icon: "💼", path: "portfolio-backtest/index.html", desc: "Multi-asset allocation & rebalancing" }
      ]
    },
    {
      id: "optimization",
      name: "Portfolio Optimization",
      icon: "⚖️",
      tools: [
        { id: "efficient-frontier", name: "Efficient Frontier", icon: "📈", path: "portfolio-optimization/index.html", desc: "Markowitz efficient frontier, CAL, Tangency portfolio & transition map" },
        { id: "portfolio-optimization", name: "Portfolio Optimization", icon: "⚖️", path: "portfolio-optimization/portfolio-optimization.html", desc: "Multi-objective portfolio optimization, Risk Parity & CVaR" },
        { id: "black-litterman", name: "Black-Litterman Model", icon: "🧠", path: "portfolio-optimization/black-litterman.html", desc: "Bayesian market views, implied equilibrium prior & active tilts" },
        { id: "rolling-optimization", name: "Rolling Optimization", icon: "🔄", path: "portfolio-optimization/rolling-optimization.html", desc: "Out-of-sample walk-forward portfolio optimization & dynamic rebalancing" }
      ],
      bridges: [
        { id: "portfolio-backtest", name: "Portfolio Studio", icon: "💼", path: "portfolio-backtest/index.html", desc: "Backtest optimal weights historically" }
      ]
    },
    {
      id: "factors",
      name: "Factor Analysis & Risk",
      icon: "📈",
      tools: [
        { id: "fund-regression", name: "Regression Lab", icon: "📈", path: "fund-regression/index.html", desc: "CAPM, Dual-Beta, factor regression & risk suite" },
        { id: "manager-performance", name: "Manager Performance", icon: "🏆", path: "fund-regression/manager-performance.html", desc: "Active manager vs benchmark tracking error, Information Ratio & skill test" },
        { id: "factor-analysis", name: "Factor Analysis Studio", icon: "🔬", path: "fund-regression/factor-analysis.html", desc: "Fama-French & Carhart multi-factor regressions, style drift & attribution" },
        { id: "pca", name: "Principal Component Analysis", icon: "🧠", path: "fund-regression/pca.html", desc: "Eigenvalue decomposition, scree plot & asset factor loadings" },
        { id: "factor-matching", name: "Match Factor Exposures", icon: "🎯", path: "fund-regression/factor-matching.html", desc: "Replicate target factor exposures with liquid ETFs & factor risk parity" }
      ],
      bridges: [
        { id: "asset-analytics", name: "Asset Analytics", icon: "📊", path: "asset-analytics/index.html", desc: "Deep-dive fund performance & drawdown recovery" }
      ]
    },
    {
      id: "monte-carlo",
      name: "Monte Carlo Simulation",
      icon: "🎲",
      tools: [
        { id: "monte-carlo", name: "Monte Carlo Simulation", icon: "🎲", path: "monte-carlo/index.html", desc: "Growth percentiles, sequence risk & retirement survival" },
        { id: "financial-goals", name: "Financial Goals", icon: "🎯", path: "monte-carlo/financial-goals.html", desc: "Multi-stage glide path career-to-retirement goal cashflows" },
        { id: "asset-liability", name: "Asset Liability Modeling", icon: "⚖️", path: "monte-carlo/asset-liability.html", desc: "Stress test asset allocation against future liability obligations" },
        { id: "options", name: "Options Strategy Lab", icon: "🎯", path: "pages/options.html", desc: "Black-Scholes pricing, Greeks & 40+ payoff diagrams" }
      ],
      bridges: [
        { id: "drawdown-engine", name: "Drawdown Engine", icon: "🛡️", path: "pages/drawdown-engine.html", desc: "Tax-aware Guyton-Klinger withdrawal guardrails" }
      ]
    },
    {
      id: "retirement",
      name: "Retirement Planning",
      icon: "🛡️",
      tools: [
        { id: "fire", name: "FIRE Dashboard", icon: "🔥", path: "pages/fire.html", desc: "Financial Independence number & Coast FIRE target" },
        { id: "drawdown-engine", name: "Drawdown Engine", icon: "🛡️", path: "pages/drawdown-engine.html", desc: "Tax-aware Guyton-Klinger withdrawal guardrails & RMDs" },
        { id: "projections", name: "Investment Projections", icon: "📈", path: "pages/projections.html", desc: "Multi-scenario portfolio growth & milestones" },
        { id: "market-stress", name: "Market Stress", icon: "⚡", path: "pages/market-stress.html", desc: "Mega-cap concentration & 401(k) DCA stress testing" }
      ],
      bridges: [
        { id: "monte-carlo", name: "Monte Carlo Studio", icon: "🎲", path: "monte-carlo/index.html", desc: "Simulate portfolio survival & retirement solvency" }
      ]
    },
    {
      id: "calculators",
      name: "Calculators",
      icon: "🏦",
      tools: [
        { id: "loan", name: "Loan Calculator", icon: "🏦", path: "pages/loan.html", desc: "Monthly payments & amortization schedules" },
        { id: "loan-advanced", name: "Advanced Loan", icon: "🏦", path: "pages/loan-advanced.html", desc: "Extra payments & payoff strategies" },
        { id: "pv", name: "PV Calculator", icon: "💰", path: "pages/pv.html", desc: "Present value of future cash flows" },
        { id: "npv-irr", name: "NPV & IRR", icon: "📊", path: "pages/npv-irr.html", desc: "Net present value & internal rate of return" }
      ]
    },
    {
      id: "research",
      name: "Research Tools",
      icon: "🔍",
      tools: [
        { id: "valuator", name: "Stock Evaluator", icon: "🔍", path: "pages/valuator.html", desc: "DCF, Graham Number & valuation models" },
        { id: "analyzer", name: "10-K Analyzer", icon: "📑", path: "pages/analyzer.html", desc: "SEC filings health score & red flag detection" }
      ]
    },
    {
      id: "accounting",
      name: "Managerial Accounting",
      icon: "📊",
      tools: [
        { id: "cm-analysis", name: "Contribution Margin", icon: "📊", path: "pages/cm-analysis.html", desc: "Breakeven, multi-product mix & operating leverage" },
        { id: "cost-structure", name: "Cost Structure", icon: "🏗️", path: "pages/cost-structure.html", desc: "Fixed vs variable costs & overhead allocation" }
      ]
    },
    {
      id: "economics",
      name: "Economics",
      icon: "📉",
      tools: [
        { id: "micro-econ", name: "Supply & Demand", icon: "📉", path: "pages/micro-econ.html", desc: "Linear supply & demand curve equilibrium" },
        { id: "consumer-theory", name: "Consumer Theory", icon: "📐", path: "pages/consumer-theory.html", desc: "Price elasticity, cross-price & expected utility" }
      ]
    }
  ];

  function detectContext() {
    const href = window.location.href;
    const logoEl = document.querySelector(".top-nav-logo");
    const isSubdir = logoEl ? (logoEl.getAttribute("href") || "").startsWith("..") : false;
    const root = isSubdir ? "../" : "./";

    // Match active tool
    for (const cat of SITE_CATALOG) {
      for (const tool of cat.tools) {
        let isMatch = false;
        if (tool.path.endsWith("index.html")) {
          const folder = tool.path.split("/")[0];
          const isExactIndex = href.endsWith("/" + folder) || 
                              href.endsWith("/" + folder + "/") || 
                              href.includes("/" + folder + "/index.html");
          if (isExactIndex) {
            isMatch = true;
          }
        } else {
          const filename = tool.path.split("/").pop();
          if (href.includes("/" + filename) || href.endsWith(filename)) {
            isMatch = true;
          }
        }
        if (isMatch) {
          return { category: cat, tool: tool, root: root, isHome: false };
        }
      }
    }

    if (href.includes("news.html")) {
      return { category: null, tool: { id: "news", name: "News Feed", icon: "📰", path: "pages/news.html" }, root: root, isHome: false };
    }

    return { category: null, tool: null, root: root, isHome: true };
  }

  function renderNav() {
    const navInner = document.querySelector(".top-nav-inner");
    if (!navInner) return;

    const ctx = detectContext();
    const root = ctx.root;

    // Check if .top-nav-left already exists, else wrap logo
    let navLeft = navInner.querySelector(".top-nav-left");
    const logoEl = navInner.querySelector(".top-nav-logo");

    if (!navLeft && logoEl) {
      navLeft = document.createElement("div");
      navLeft.className = "top-nav-left";
      logoEl.parentNode.insertBefore(navLeft, logoEl);
      navLeft.appendChild(logoEl);
    }

    if (!navLeft) return;

    // Remove existing dynamic dropdown if any
    const existingDropdown = navLeft.querySelector(".nav-category-dropdown");
    if (existingDropdown) existingDropdown.remove();

    const existingSep = navLeft.querySelector(".nav-breadcrumb-sep");
    if (existingSep) existingSep.remove();

    // Create dropdown wrapper
    const dropdownWrapper = document.createElement("div");
    dropdownWrapper.className = "nav-category-dropdown";

    const currentCat = ctx.category;
    const btnLabel = currentCat ? currentCat.name : "Explore All Suites";
    const btnIcon = currentCat ? currentCat.icon : "📂";

    if (!ctx.isHome && currentCat) {
      const sep = document.createElement("span");
      sep.className = "nav-breadcrumb-sep";
      sep.textContent = "/";
      navLeft.appendChild(sep);
    }

    dropdownWrapper.innerHTML = `
      <button class="nav-category-btn ${ctx.isHome ? "nav-category-btn-home" : ""}" id="navCategoryBtn" type="button" aria-haspopup="true" aria-expanded="false" title="Switch suite or jump between tools">
        <span class="nav-category-icon">${btnIcon}</span>
        <span class="nav-category-label">${btnLabel}</span>
        <svg class="nav-category-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5L6 8L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="nav-dropdown-menu" id="navDropdownMenu" role="menu">
        ${renderDropdownContent(ctx)}
      </div>
    `;

    navLeft.appendChild(dropdownWrapper);

    // Update .top-nav-links with contextual sibling links
    const navLinks = navInner.querySelector(".top-nav-links");
    if (navLinks) {
      // Preserve font-scale button if it exists
      const fontBtn = navLinks.querySelector("#font-scale-btn");

      const DOMAIN_SUITE_TABS = [
        { id: "portfolio", name: "Portfolio", icon: "💼", path: "portfolio-backtest/index.html", match: ["portfolio-backtest", "dca-comparator", "asset-analytics"] },
        { id: "tactical", name: "Tactical Allocation", icon: "⚡", path: "tactical-allocation/index.html", match: ["tactical-allocation"] },
        { id: "optimization", name: "Optimization", icon: "⚖️", path: "portfolio-optimization/portfolio-optimization.html", match: ["portfolio-optimization"] },
        { id: "factors", name: "Factor Analysis", icon: "📈", path: "fund-regression/index.html", match: ["fund-regression"] },
        { id: "monte-carlo", name: "Monte Carlo", icon: "🎲", path: "monte-carlo/index.html", match: ["monte-carlo"] },
        { id: "retirement", name: "Retirement", icon: "🛡️", path: "pages/drawdown-engine.html", match: ["drawdown-engine", "fire", "projections", "market-stress"] }
      ];

      const href = window.location.href;
      let linksHtml = `
        <a href="${root}index.html" class="top-nav-link nav-home-link ${ctx.isHome ? "active" : ""}" title="Return to All Calculators">← All Tools</a>
      `;

      DOMAIN_SUITE_TABS.forEach(suite => {
        const isActive = !ctx.isHome && (
          (ctx.category && ctx.category.id === suite.id) ||
          suite.match.some(m => href.includes(m))
        );
        linksHtml += `
          <a href="${root}${suite.path}" class="top-nav-link ${isActive ? "active" : ""}" title="${suite.name}">
            <span class="nav-link-icon">${suite.icon}</span> ${suite.name}
          </a>
        `;
      });

      navLinks.innerHTML = linksHtml;

      if (fontBtn) {
        navLinks.appendChild(fontBtn);
      }
    }

    setupDropdownEvents(dropdownWrapper);
  }

  function renderDropdownContent(ctx) {
    const root = ctx.root;
    let html = "";

    // 1. Current Suite Section (if inside a specific category)
    if (ctx.category) {
      html += `
        <div class="nav-dropdown-section">
          <div class="nav-dropdown-header">
            <span>${ctx.category.icon} ${ctx.category.name}</span>
            <span class="nav-dropdown-badge">Current Suite</span>
          </div>
          <div class="nav-dropdown-tools">
      `;

      ctx.category.tools.forEach(tool => {
        const isActive = ctx.tool && ctx.tool.id === tool.id;
        html += `
          <a href="${root}${tool.path}" class="nav-dropdown-item ${isActive ? "active" : ""}" role="menuitem">
            <div class="nav-item-icon">${tool.icon}</div>
            <div class="nav-item-content">
              <div class="nav-item-title-row">
                <span class="nav-item-title">${tool.name}</span>
                ${isActive ? '<span class="nav-active-pill">Active</span>' : ''}
              </div>
              <div class="nav-item-desc">${tool.desc}</div>
            </div>
          </a>
        `;
      });

      if (ctx.category.bridges && ctx.category.bridges.length > 0) {
        ctx.category.bridges.forEach(b => {
          html += `
            <a href="${root}${b.path}" class="nav-dropdown-item nav-dropdown-bridge-item" role="menuitem">
              <div class="nav-item-icon">${b.icon}</div>
              <div class="nav-item-content">
                <div class="nav-item-title-row">
                  <span class="nav-item-title">${b.name}</span>
                  <span class="nav-bridge-badge">Cross-Analysis</span>
                </div>
                <div class="nav-item-desc">${b.desc}</div>
              </div>
            </a>
          `;
        });
      }

      html += `
          </div>
        </div>
        <div class="nav-dropdown-divider"></div>
      `;
    }

    // 2. All Other Suites
    html += `
      <div class="nav-dropdown-section">
        <div class="nav-dropdown-header">
          <span>Explore All Suites & Tools</span>
        </div>
        <div class="nav-dropdown-categories">
    `;

    SITE_CATALOG.forEach(cat => {
      const isCurrentCat = ctx.category && ctx.category.id === cat.id;
      html += `
        <div class="nav-cat-group ${isCurrentCat ? "is-current-group" : ""}">
          <div class="nav-cat-group-title">
            <span class="nav-cat-group-icon">${cat.icon}</span> ${cat.name}
          </div>
          <div class="nav-cat-group-links">
      `;

      cat.tools.forEach(tool => {
        const isCurrentTool = ctx.tool && ctx.tool.id === tool.id;
        html += `
          <a href="${root}${tool.path}" class="nav-cat-link ${isCurrentTool ? "active" : ""}" title="${tool.desc}">
            ${tool.name}
          </a>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  function setupDropdownEvents(wrapper) {
    const btn = wrapper.querySelector("#navCategoryBtn");
    const menu = wrapper.querySelector("#navDropdownMenu");
    if (!btn || !menu) return;

    function toggleMenu(open) {
      const isOpen = open !== undefined ? open : !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", isOpen);
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) {
        toggleMenu(false);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        toggleMenu(false);
        btn.focus();
      }
    });
  }

  // ===================================================================
  // UNIVERSAL EXECUTIVE DECISION FRAMEWORK & COLLAPSIBLE SUMMARY
  // ===================================================================
  function setupExecutiveGuides() {
    const cards = document.querySelectorAll('.cheat-sheet-card, .executive-guide-card');
    cards.forEach((card, index) => {
      const header = card.querySelector('.cheat-sheet-header, .executive-guide-header');
      const body = card.querySelector('.cheat-sheet-body, .executive-guide-body');
      const arrow = card.querySelector('.cheat-sheet-arrow, .executive-guide-arrow');
      if (!header || !body) return;

      const pageKey = window.location.pathname.replace(/[^a-zA-Z0-9]/g, '_');
      const storageKey = `exec_guide_collapsed_${pageKey}_${card.id || index}`;

      function setCollapsed(collapsed, save = true) {
        if (collapsed) {
          body.style.display = 'none';
          header.classList.remove('open');
          if (arrow) {
            arrow.classList.remove('open');
            arrow.textContent = '▶';
          }
        } else {
          body.style.display = 'block';
          header.classList.add('open');
          if (arrow) {
            arrow.classList.add('open');
            arrow.textContent = '▼';
          }
        }
        if (save) {
          try {
            localStorage.setItem(storageKey, collapsed ? 'true' : 'false');
          } catch (e) {}
        }
      }

      // Check stored preference
      const isStoredCollapsed = localStorage.getItem(storageKey) === 'true';
      if (isStoredCollapsed) {
        setCollapsed(true, false);
      }

      // Header click toggle
      header.addEventListener('click', () => {
        const currentlyOpen = body.style.display !== 'none';
        setCollapsed(currentlyOpen, true);
      });

      // Inject bottom collapse button inside the body if not present
      if (!body.querySelector('.btn-collapse-exec-guide')) {
        const collapseBtn = document.createElement('button');
        collapseBtn.type = 'button';
        collapseBtn.className = 'btn-collapse-exec-guide';
        collapseBtn.innerHTML = '▲ Collapse Executive Summary (Hide when not needed)';
        collapseBtn.title = 'Collapse this summary to focus on calculations and charts';
        collapseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setCollapsed(true, true);
          header.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        body.appendChild(collapseBtn);
      }
    });

    // Auto-collapse when user executes calculation/optimization/backtest actions
    const actionButtons = document.querySelectorAll(
      '#btn-calculate, #btn-run, #btn-optimize, #btn-backtest, #btn-rebalance, #btn-regress, #btn-run-simulation, .btn-run-calc, #btn-run-cointegration'
    );
    actionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const cards = document.querySelectorAll('.cheat-sheet-card, .executive-guide-card');
        cards.forEach((card, index) => {
          const header = card.querySelector('.cheat-sheet-header, .executive-guide-header');
          const body = card.querySelector('.cheat-sheet-body, .executive-guide-body');
          const arrow = card.querySelector('.cheat-sheet-arrow, .executive-guide-arrow');
          if (body && body.style.display !== 'none') {
            body.style.display = 'none';
            if (header) header.classList.remove('open');
            if (arrow) {
              arrow.classList.remove('open');
              arrow.textContent = '▶';
            }
            const pageKey = window.location.pathname.replace(/[^a-zA-Z0-9]/g, '_');
            try {
              localStorage.setItem(`exec_guide_collapsed_${pageKey}_${card.id || index}`, 'true');
            } catch (e) {}
          }
        });
      });
    });
  }

  function initNavAndGuides() {
    renderNav();
    setupExecutiveGuides();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavAndGuides);
  } else {
    initNavAndGuides();
  }
})();
