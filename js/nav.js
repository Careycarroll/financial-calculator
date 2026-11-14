// ===================================================================
// DYNAMIC NAVIGATION & CONTEXTUAL SUITE SWITCHER
// Loaded as a plain script (not a module) across all pages.
// Enhances .top-nav with dynamic category breadcrumb & jump menus.
// ===================================================================

(function () {
  const SITE_CATALOG = [
    {
      id: "retirement",
      name: "Retirement Planning",
      icon: "🛡️",
      tools: [
        { id: "fire", name: "FIRE Dashboard", icon: "🔥", path: "pages/fire.html", desc: "Financial Independence number & Coast FIRE target" },
        { id: "drawdown-engine", name: "Drawdown Engine", icon: "🛡️", path: "pages/drawdown-engine.html", desc: "Tax-aware Guyton-Klinger withdrawal guardrails & RMDs" },
        { id: "market-stress", name: "Market Stress", icon: "⚡", path: "pages/market-stress.html", desc: "Mega-cap concentration & 401(k) DCA stress testing" }
      ],
      bridges: [
        { id: "fund-regression", name: "Regression Lab", icon: "📈", path: "fund-regression/index.html", desc: "Analyze factor risks & Jensen's Alpha" }
      ]
    },
    {
      id: "trading",
      name: "Trading & Fund Analytics",
      icon: "📈",
      tools: [
        { id: "asset-analytics", name: "Asset Analytics Studio", icon: "📊", path: "asset-analytics/index.html", desc: "Fund performance, underwater crashes, heatmaps & rolling bands" },
        { id: "dca-comparator", name: "DCA Backtest", icon: "📊", path: "dca-comparator/index.html", desc: "Historical DCA & dividend reinvestment" },
        { id: "fund-regression", name: "Regression Lab", icon: "📈", path: "fund-regression/index.html", desc: "CAPM, Dual-Beta, factor regression & risk suite" },
        { id: "options", name: "Options Strategy Lab", icon: "🎯", path: "pages/options.html", desc: "Black-Scholes pricing, Greeks & 40+ payoff diagrams" }
      ],
      bridges: [
        { id: "market-stress", name: "Market Stress", icon: "⚡", path: "pages/market-stress.html", desc: "Stress test against historical crashes" }
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
        { id: "npv-irr", name: "NPV & IRR", icon: "📊", path: "pages/npv-irr.html", desc: "Net present value & internal rate of return" },
        { id: "projections", name: "Investment Projections", icon: "📈", path: "pages/projections.html", desc: "Multi-scenario portfolio growth & milestones" }
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
          if (href.includes("/" + folder + "/") || href.endsWith("/" + folder)) {
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

      if (ctx.isHome) {
        navLinks.innerHTML = `
          <a href="${root}index.html" class="top-nav-link active">Calculators</a>
          <a href="${root}pages/news.html" class="top-nav-link">News Feed</a>
        `;
      } else if (currentCat) {
        let linksHtml = `
          <a href="${root}index.html" class="top-nav-link nav-home-link" title="Return to All Calculators">← All Tools</a>
        `;

        currentCat.tools.forEach(t => {
          const isActive = ctx.tool && ctx.tool.id === t.id;
          linksHtml += `
            <a href="${root}${t.path}" class="top-nav-link ${isActive ? "active" : ""}">
              <span class="nav-link-icon">${t.icon}</span> ${t.name}
            </a>
          `;
        });

        if (currentCat.bridges && currentCat.bridges.length > 0) {
          currentCat.bridges.forEach(b => {
            linksHtml += `
              <a href="${root}${b.path}" class="top-nav-link nav-bridge-link" title="${b.desc}">
                <span class="nav-link-icon">${b.icon}</span> ${b.name}
              </a>
            `;
          });
        }

        navLinks.innerHTML = linksHtml;
      } else {
        navLinks.innerHTML = `
          <a href="${root}index.html" class="top-nav-link">← All Tools</a>
          <a href="${root}pages/news.html" class="top-nav-link active">News Feed</a>
        `;
      }

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderNav);
  } else {
    renderNav();
  }
})();
