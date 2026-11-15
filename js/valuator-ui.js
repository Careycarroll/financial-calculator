import {
  formatLargeNumberRaw, formatRatio, formatRatioPlain, formatPercent, formatValuationCurrency
} from "./formatting.js";
import { evaluateStock, getDuPontPresets } from "./valuator.js";
import {
  fetchStockData, getApiKeys, saveApiKey, removeApiKey,
  getUsageSummary, getRemainingCalls
} from "./api-manager.js";

// Active preset multi-year history cache
let activePresetHistory = null;

// ===================================================================
// STOCK EVALUATOR — UI Controller
// ===================================================================

function initValuator() {
  // Load saved API keys into fields
  loadKeysIntoForm();
  renderUsageBar();
  updateValuatorMode();

  const apiToggle = document.getElementById("val-use-api-toggle");
  if (apiToggle) {
    apiToggle.checked = getApiEnabled();
    apiToggle.addEventListener("change", () =>
      setApiEnabled(apiToggle.checked),
    );
  }

  const apiModeBtn = document.getElementById("val-mode-api-btn");
  const manualModeBtn = document.getElementById("val-mode-manual-btn");

  if (apiModeBtn) {
    apiModeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      setValuatorMode("api");
    });
  }

  if (manualModeBtn) {
    manualModeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      setValuatorMode("manual");
    });
  }

  // Evaluate button
  document
    .getElementById("val-evaluate-btn")
    .addEventListener("click", runEvaluation);

  const manualEvaluateBtn = document.getElementById("val-manual-evaluate-btn");
  if (manualEvaluateBtn) {
    manualEvaluateBtn.addEventListener("click", (event) => {
      event.preventDefault();
      runManualEvaluation();
    });
  }

  // DuPont Archetype Preset Buttons
  const presetContainer = document.getElementById("val-manual-presets");
  if (presetContainer) {
    presetContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-preset]");
      if (!btn) return;
      loadDuPontPreset(btn.dataset.preset);
    });
  }

  // Enter key on ticker input
  document.getElementById("val-ticker").addEventListener("keydown", (e) => {
    if (e.key === "Enter") runEvaluation();
  });

  document
    .getElementById("val-manual-ticker")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") runManualEvaluation();
    });

  // Settings toggle
  document.getElementById("val-settings-btn").addEventListener("click", () => {
    document.getElementById("val-settings-panel").classList.toggle("hidden");
  });

  // Save keys
  document
    .getElementById("val-save-keys-btn")
    .addEventListener("click", saveKeysFromForm);
}

// ===================================================================
// API KEY MANAGEMENT UI
// ===================================================================

const VALUATOR_API_ENABLED_KEY = "valuator_api_enabled";
const VALUATOR_MODE_KEY = "valuator_mode";

function getApiEnabled() {
  const stored = localStorage.getItem(VALUATOR_API_ENABLED_KEY);
  return stored === null || stored === "true";
}

function setApiEnabled(enabled) {
  localStorage.setItem(VALUATOR_API_ENABLED_KEY, enabled ? "true" : "false");
}

function getValuatorMode() {
  const stored = localStorage.getItem(VALUATOR_MODE_KEY);
  return stored === "manual" ? "manual" : "api";
}

function setValuatorMode(mode) {
  localStorage.setItem(VALUATOR_MODE_KEY, mode === "manual" ? "manual" : "api");
  updateValuatorMode();
}

function updateValuatorMode() {
  const mode = getValuatorMode();
  const apiButton = document.getElementById("val-mode-api-btn");
  const manualButton = document.getElementById("val-mode-manual-btn");
  const apiTile = document.getElementById("tile-search");
  const manualTile = document.getElementById("tile-manual-inputs");

  if (apiButton) apiButton.classList.toggle("active", mode === "api");
  if (manualButton) manualButton.classList.toggle("active", mode === "manual");
  if (apiTile) apiTile.classList.toggle("hidden", mode !== "api");
  if (manualTile) manualTile.classList.toggle("hidden", mode !== "manual");
}

function loadKeysIntoForm() {
  const keys = getApiKeys();
  const fields = {
    fmp: "val-key-fmp",
    finnhub: "val-key-finnhub",
    alphavantage: "val-key-alphavantage",
    yahoo: "val-key-yahoo",
    iex: "val-key-iex",
  };

  Object.entries(fields).forEach(([provider, fieldId]) => {
    const el = document.getElementById(fieldId);
    if (el && keys[provider]) {
      el.value = keys[provider];
    }
  });
}

function saveKeysFromForm() {
  const fields = {
    fmp: "val-key-fmp",
    finnhub: "val-key-finnhub",
    alphavantage: "val-key-alphavantage",
    yahoo: "val-key-yahoo",
    iex: "val-key-iex",
  };

  Object.entries(fields).forEach(([provider, fieldId]) => {
    const el = document.getElementById(fieldId);
    if (el) {
      const val = el.value.trim();
      if (val) {
        saveApiKey(provider, val);
      } else {
        removeApiKey(provider);
      }
    }
  });

  renderUsageBar();
  document.getElementById("val-settings-panel").classList.add("hidden");
}

function renderUsageBar() {
  const container = document.getElementById("val-usage-indicators");
  const summary = getUsageSummary();
  const keys = getApiKeys();

  container.innerHTML = Object.entries(summary)
    .map(([id, info]) => {
      let dotClass = "no-key";
      if (id === "yahoo") {
        dotClass = info.remaining > 0 ? "active" : "exhausted";
      } else if (keys[id]) {
        dotClass = info.remaining > 0 ? "active" : "exhausted";
      }

      return `
      <div class="val-usage-item">
        <span class="val-usage-dot ${dotClass}"></span>
        <span>${info.name}</span>
        <span class="val-usage-count">${info.used}/${info.limit}</span>
      </div>
    `;
    })
    .join("");
}

// ===================================================================
// EVALUATION
// ===================================================================

async function runEvaluation() {
  const ticker = document
    .getElementById("val-ticker")
    .value.trim()
    .toUpperCase();
  if (!ticker) return;

  // Show loading
  showTile("tile-loading");
  hideTile("tile-verdict");
  hideTile("tile-dupont");
  hideTile("tile-asset");
  hideTile("tile-income");
  hideTile("tile-multiples");
  hideTile("tile-enterprise");
  hideTile("tile-equity");
  hideTile("tile-wacc");
  hideTile("tile-summary-chart");
  hideTile("tile-links");
  hideTile("tile-dcf-sensitivity");

  document.getElementById("val-loading-text").textContent =
    `Fetching data for ${ticker}...`;

  if (getValuatorMode() === "manual") {
    hideTile("tile-loading");
    runManualEvaluation();
    return;
  }

  if (!getApiEnabled()) {
    hideTile("tile-loading");
    renderResearchLinks(
      ticker,
      `API usage is disabled. Use these research links while you preserve calls for later.`,
    );
    return;
  }

  try {
    const data = await fetchStockData(ticker);

    document.getElementById("val-loading-text").textContent =
      "Calculating valuations...";

    const results = evaluateStock(data);

    if (results.error) {
      document.getElementById("val-loading-text").textContent =
        `Error: ${results.error}`;
      renderResearchLinks(
        ticker,
        `Data incomplete from the API. Use these research links while you update keys or wait for rate limits to reset.`,
      );
      return;
    }

    renderResults(results);
    renderUsageBar();
  } catch (err) {
    document.getElementById("val-loading-text").textContent =
      `Error: ${err.message}`;
    console.error("Evaluation failed:", err);
    renderResearchLinks(
      ticker,
      `API access failed: ${err.message}. Use these research links until the provider becomes available.`,
    );
  }
}

function runManualEvaluation() {
  const ticker = document
    .getElementById("val-manual-ticker")
    .value.trim()
    .toUpperCase();
  const company = document.getElementById("val-manual-company").value.trim();
  const profile = {
    provider: "Manual",
    symbol: ticker || "MANUAL",
    name: company || "Manual Entry",
    price: parseManualNumber("val-manual-price"),
    marketCap: parseManualNumber("val-manual-marketcap"),
    sector: document.getElementById("val-manual-sector").value.trim(),
    industry: document.getElementById("val-manual-industry").value.trim(),
    exchange: document.getElementById("val-manual-exchange").value.trim(),
    sharesOutstanding: parseManualNumber("val-manual-shares"),
  };

  const income = [
    {
      revenue: parseManualNumber("val-manual-revenue"),
      operatingIncome: parseManualNumber("val-manual-operating-income"),
      netIncome: parseManualNumber("val-manual-net-income"),
      ebitda: parseManualNumber("val-manual-ebitda"),
      eps: parseManualNumber("val-manual-eps"),
      weightedAvgShares: profile.sharesOutstanding,
    },
  ];

  const balance = [
    {
      totalEquity: parseManualNumber("val-manual-total-equity"),
      totalDebt: parseManualNumber("val-manual-total-debt"),
      cashAndEquivalents: parseManualNumber("val-manual-cash"),
      totalAssets: parseManualNumber("val-manual-total-assets"),
      totalCurrentAssets: parseManualNumber("val-manual-current-assets"),
      totalCurrentLiabilities: parseManualNumber(
        "val-manual-current-liabilities",
      ),
      propertyPlantEquipment: parseManualNumber("val-manual-ppe"),
      goodwill: parseManualNumber("val-manual-goodwill"),
      intangibleAssets: parseManualNumber("val-manual-intangibles"),
    },
  ];

  const cashflow = [
    {
      freeCashFlow: parseManualNumber("val-manual-fcf"),
      dividendsPaid: parseManualNumber("val-manual-dividends"),
    },
  ];

  if (!profile.price || !income[0].netIncome || !balance[0].totalEquity) {
    document.getElementById("val-loading-text").textContent =
      "Enter at least price, net income, and total equity for manual evaluation.";
    showTile("tile-loading");
    return;
  }

  if (!profile.sharesOutstanding && profile.marketCap && profile.price) {
    profile.sharesOutstanding = profile.marketCap / profile.price;
  }

  const data = {
    provider: activePresetHistory ? "Manual (DuPont Archetype Preset)" : "Manual",
    symbol: profile.symbol,
    profile,
    income: activePresetHistory && activePresetHistory.length > 0
      ? activePresetHistory.map((h) => ({
          calendarYear: h.year,
          revenue: h.sales,
          operatingIncome: h.ebit,
          ebt: h.ebt,
          netIncome: h.netIncome,
          eps: h.netIncome / (profile.sharesOutstanding || 1),
          weightedAvgShares: profile.sharesOutstanding,
        }))
      : income,
    balance: activePresetHistory && activePresetHistory.length > 0
      ? activePresetHistory.map((h) => ({
          totalAssets: h.totalAssets,
          totalEquity: h.totalEquity,
          totalDebt: balance[0].totalDebt,
        }))
      : balance,
    cashflow,
    ratios: null,
    quote: null,
    dcf: null,
  };

  document.getElementById("val-loading-text").textContent =
    "Evaluating manual inputs...";
  showTile("tile-loading");
  hideTile("tile-links");
  hideTile("tile-verdict");
  hideTile("tile-dupont");
  hideTile("tile-asset");
  hideTile("tile-income");
  hideTile("tile-multiples");
  hideTile("tile-enterprise");
  hideTile("tile-equity");
  hideTile("tile-wacc");
  hideTile("tile-summary-chart");
  hideTile("tile-dcf-sensitivity");

  const results = evaluateStock(data);
  if (results.error) {
    document.getElementById("val-loading-text").textContent =
      `Manual evaluation failed: ${results.error}`;
    return;
  }

  renderResults(results);
}

function parseManualNumber(id) {
  const input = document.getElementById(id);
  if (!input) return null;
  const value = input.value.trim().replace(/,/g, "");
  if (value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// ===================================================================
// RESEARCH LINKS
// ===================================================================

function renderResearchLinks(symbol, message = null) {
  const container = document.getElementById("val-research-links");
  const messageEl = document.getElementById("val-research-message");
  if (!container || !messageEl) return;

  messageEl.textContent =
    message ||
    `If API access is unavailable or rate limits are reached, use these research sources to continue your analysis.`;

  const groups = [
    {
      label: "📋 Financial Statements",
      desc: "Best sources for revenue, income, balance sheet, and cash flow data needed for manual entry.",
      links: [
        { icon: "📊", site: "Macrotrends", desc: "Historical financials, ratios, and charts going back 10+ years", url: `https://www.macrotrends.net/stocks/charts/${symbol}/${symbol}/revenue` },
        { icon: "📋", site: "Stock Analysis", desc: "Clean income, balance sheet, and cash flow statements", url: `https://stockanalysis.com/stocks/${symbol.toLowerCase()}/financials/` },
        { icon: "📈", site: "Yahoo Finance", desc: "Financials, key statistics, and holders", url: `https://finance.yahoo.com/quote/${symbol}/financials/` },
        { icon: "🏛️", site: "MarketWatch", desc: "Income statement, balance sheet, cash flow", url: `https://www.marketwatch.com/investing/stock/${symbol.toLowerCase()}/financials` },
        { icon: "💹", site: "Wisesheets", desc: "Structured financial data and ratios", url: `https://wisesheets.io/quote/${symbol}` },
        { icon: "📱", site: "TIKR", desc: "Institutional-grade financials, free tier available", url: `https://tikr.com/stocks/${symbol}` },
      ],
    },
    {
      label: "🏦 Official Filings",
      desc: "Primary source documents — use these to verify numbers before manual entry.",
      links: [
        { icon: "🏦", site: "SEC EDGAR", desc: "10-K, 10-Q, and all official SEC filings", url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=10-K&dateb=&owner=include&count=10` },
        { icon: "🔎", site: "SEC Full-Text Search", desc: "Search within filings for specific line items", url: `https://efts.sec.gov/LATEST/search-index?q=%22${symbol}%22&dateRange=custom&startdt=2020-01-01&forms=10-K` },
      ],
    },
    {
      label: "🧮 Valuation Tools",
      desc: "Pre-built DCF models, fair value estimates, and valuation multiples.",
      links: [
        { icon: "🧮", site: "GuruFocus", desc: "DCF calculator, Graham Number, intrinsic value", url: `https://www.gurufocus.com/stock/${symbol}/dcf` },
        { icon: "📊", site: "Morningstar", desc: "Analyst fair value estimate and moat rating", url: `https://www.morningstar.com/stocks/xnas/${symbol.toLowerCase()}/quote` },
        { icon: "🔍", site: "Simply Wall St", desc: "Visual valuation snowflake and DCF", url: `https://simplywall.st/stocks/us/${symbol}` },
        { icon: "📉", site: "Finviz", desc: "Screener, ratios, and valuation metrics", url: `https://finviz.com/quote.ashx?t=${symbol}` },
        { icon: "🌐", site: "OpenBB", desc: "Open-source terminal with fundamentals and DCF", url: `https://openbb.co/stocks/${symbol}` },
      ],
    },
    {
      label: "📰 News & Analysis",
      desc: "Qualitative context, earnings coverage, and analyst opinions.",
      links: [
        { icon: "📰", site: "Seeking Alpha", desc: "In-depth analysis, earnings transcripts, news", url: `https://seekingalpha.com/symbol/${symbol}` },
        { icon: "🌐", site: "Google Finance", desc: "Quick overview, recent news, and related stocks", url: `https://www.google.com/finance/quote/${symbol}:NASDAQ` },
      ],
    },
  ];

  container.innerHTML = groups.map(group => `
    <div class="val-link-group">
      <div class="val-link-group-header">
        <span class="val-link-group-title">${group.label}</span>
        <span class="val-link-group-desc">${group.desc}</span>
      </div>
      <div class="val-links-grid">
        ${group.links.map(link => `
          <a href="${link.url}" target="_blank" rel="noopener" class="val-link-card">
            <span class="val-link-icon">${link.icon}</span>
            <div class="val-link-info">
              <span class="val-link-site">${link.site}</span>
              <span class="val-link-desc">${link.desc}</span>
            </div>
          </a>
        `).join("")}
      </div>
    </div>
  `).join("");

  showTile("tile-links");
}

// ===================================================================
// RENDERING
// ===================================================================

function renderResults(results) {
  hideTile("tile-loading");

  renderVerdict(results);
  renderDuPont(results);
  renderAssetBased(results);
  renderIncomeBased(results);
  renderMultiples(results);
  renderEnterprise(results);
  renderEquityMultiples(results);
  renderWACC(results);
  renderSummaryChart(results);
  renderDCFSensitivity(results);
}

function renderVerdict(results) {
  const profile = results.profile;
  const verdict = results.verdict;

  document.getElementById("val-company-name").textContent =
    `${profile.name} (${results.symbol})`;
  document.getElementById("val-company-meta").textContent =
    `${profile.sector || "—"} · ${profile.industry || "—"} · ${profile.exchange || "—"}`;
  document.getElementById("val-current-price").textContent =
    `$${profile.price.toFixed(2)}`;

  const badge = document.getElementById("val-verdict-badge");
  badge.textContent = verdict.rating;
  badge.className = "val-verdict-badge";
  if (verdict.score >= 60) badge.classList.add("undervalued");
  else if (verdict.score <= 40) badge.classList.add("overvalued");
  else badge.classList.add("fair");

  document.getElementById("val-fair-value").textContent = verdict.fairValue
    ? `$${verdict.fairValue.toFixed(2)}`
    : "N/A";
  document.getElementById("val-fair-range").textContent = verdict.range
    ? `$${verdict.range.low.toFixed(2)} — $${verdict.range.high.toFixed(2)}`
    : "N/A";

  // Meter
  const markerPos = Math.max(5, Math.min(95, verdict.score));
  document.getElementById("val-meter-marker").style.left = `${markerPos}%`;

  document.getElementById("val-data-provider").textContent =
    `Data from ${results.provider}`;

  showTile("tile-verdict");
}

function loadDuPontPreset(presetId) {
  const presets = getDuPontPresets();
  const preset = presets.find((p) => p.id === presetId);
  if (!preset) return;

  activePresetHistory = preset.history || null;

  // Set manual inputs
  const d = preset.data;
  document.getElementById("val-manual-ticker").value = preset.ticker;
  document.getElementById("val-manual-company").value = preset.name;
  document.getElementById("val-manual-price").value = d.price;
  document.getElementById("val-manual-marketcap").value = d.marketCap;
  document.getElementById("val-manual-shares").value = d.sharesOutstanding;
  document.getElementById("val-manual-sector").value = preset.sector;
  document.getElementById("val-manual-revenue").value = d.sales;
  document.getElementById("val-manual-operating-income").value = d.ebit;
  document.getElementById("val-manual-net-income").value = d.netIncome;
  document.getElementById("val-manual-ebitda").value = Math.round(d.ebit * 1.15);
  document.getElementById("val-manual-eps").value = (d.netIncome / d.sharesOutstanding).toFixed(2);
  document.getElementById("val-manual-total-equity").value = d.totalEquity;
  document.getElementById("val-manual-total-debt").value = d.totalDebt;
  document.getElementById("val-manual-total-assets").value = d.totalAssets;

  // Highlight active preset button
  const buttons = document.querySelectorAll("#val-manual-presets .preset-btn");
  buttons.forEach((btn) => {
    btn.style.borderColor = btn.dataset.preset === presetId ? "#38bdf8" : "#334155";
    btn.style.background = btn.dataset.preset === presetId ? "rgba(56, 189, 248, 0.15)" : "#1e293b";
  });

  // Automatically execute evaluation
  runManualEvaluation();
}

function renderDuPont(results) {
  const dupont = results.dupont?.current;
  if (!dupont || dupont.ratios.roe === null) {
    hideTile("tile-dupont");
    return;
  }

  const stages = dupont.stages;
  const ratios = dupont.ratios;
  const quality = dupont.quality;

  // Identity Badge
  const identityBadge = document.getElementById("dupont-identity-badge");
  if (identityBadge) {
    identityBadge.textContent = ratios.identityResidual < 1e-9
      ? "✓ Multiplicative Identity Verified (Δ < 10⁻¹²)"
      : `Identity Residual: ${ratios.identityResidual.toExponential(2)}`;
  }

  // Quality Banner
  const ratingBadge = document.getElementById("dupont-rating-badge");
  if (ratingBadge) {
    ratingBadge.textContent = quality.qualityRating;
    ratingBadge.className = "val-verdict-badge";
    if (quality.qualityScore >= 70) ratingBadge.classList.add("undervalued");
    else if (quality.qualityScore <= 40) ratingBadge.classList.add("overvalued");
    else ratingBadge.classList.add("fair");
  }

  const scoreEl = document.getElementById("dupont-quality-score");
  if (scoreEl) {
    scoreEl.textContent = `${quality.qualityScore} / 100`;
  }

  const driverEl = document.getElementById("dupont-primary-driver");
  if (driverEl) {
    driverEl.textContent = quality.primaryDriver;
  }

  const flagsContainer = document.getElementById("dupont-flags-container");
  if (flagsContainer) {
    flagsContainer.innerHTML = (quality.flags || []).map((f) => {
      let bg = "rgba(56, 189, 248, 0.08)";
      let border = "#38bdf8";
      let icon = "ℹ️";
      if (f.type === "positive") {
        bg = "rgba(16, 185, 129, 0.12)";
        border = "#10b981";
        icon = "✅";
      } else if (f.type === "warning") {
        bg = "rgba(245, 158, 11, 0.12)";
        border = "#f59e0b";
        icon = "⚠️";
      } else if (f.type === "danger") {
        bg = "rgba(239, 68, 68, 0.12)";
        border = "#ef4444";
        icon = "🚨";
      }
      return `
        <div style="background:${bg}; border-left:3px solid ${border}; border-radius:4px; padding:0.4rem 0.65rem; font-size:0.8rem; color:#cbd5e1;">
          <strong style="color:#f8fafc;">${icon} ${f.title}</strong>: ${f.detail}
        </div>
      `;
    }).join("");
  }

  // 5 Levers Card Displays
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText("dupont-val-tb", stages.taxBurden !== null ? `${(stages.taxBurden * 100).toFixed(1)}%` : "N/A");
  setText("dupont-sub-tb", ratios.effectiveTaxRate !== null ? `Effective Tax: ${(ratios.effectiveTaxRate * 100).toFixed(1)}%` : "Tax Rate: N/A");

  setText("dupont-val-ib", stages.interestBurden !== null ? `${(stages.interestBurden * 100).toFixed(1)}%` : "N/A");
  setText("dupont-sub-ib", ratios.interestDrag !== null ? `Interest Drag: ${(ratios.interestDrag * 100).toFixed(1)}%` : "Drag: N/A");

  setText("dupont-val-om", stages.operatingMargin !== null ? `${(stages.operatingMargin * 100).toFixed(1)}%` : "N/A");
  setText("dupont-sub-om", "Core EBIT Margin");

  setText("dupont-val-ato", stages.assetTurnover !== null ? `${stages.assetTurnover.toFixed(2)}x` : "N/A");
  setText("dupont-sub-ato", "Capital Turnover");

  setText("dupont-val-fl", stages.financialLeverage !== null ? `${stages.financialLeverage.toFixed(2)}x` : "N/A");
  setText("dupont-sub-fl", ratios.debtToEquity !== null ? `Debt/Equity: ${ratios.debtToEquity.toFixed(2)}x` : "Equity Multiplier");

  setText("dupont-val-roe", ratios.roe !== null ? `${(ratios.roe * 100).toFixed(1)}%` : "N/A");
  setText("dupont-sub-roe", `Net ROA: ${(ratios.netROA * 100).toFixed(1)}% | EBIT ROA: ${(ratios.compoundROA * 100).toFixed(1)}%`);

  // Interactive Canvas Chart
  drawDuPontChart(results);

  // Multi-Year History Table & Attribution
  const multiYear = results.dupont?.multiYear;
  const historySection = document.getElementById("dupont-history-section");
  const historyTbody = document.getElementById("dupont-history-table-body");
  const attribBanner = document.getElementById("dupont-attribution-banner");

  if (historySection && historyTbody && multiYear && multiYear.periods && multiYear.periods.length > 1) {
    historySection.style.display = "block";
    historyTbody.innerHTML = multiYear.periods.map((p) => `
      <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
        <td style="font-weight:700; color:#f8fafc; padding:0.4rem 0.5rem;">${p.year}</td>
        <td style="text-align:right; font-weight:700; color:#38bdf8; padding:0.4rem 0.5rem;">${(p.ratios.roe * 100).toFixed(1)}%</td>
        <td style="text-align:right; color:#cbd5e1; padding:0.4rem 0.5rem;">${(p.stages.taxBurden * 100).toFixed(1)}%</td>
        <td style="text-align:right; color:#cbd5e1; padding:0.4rem 0.5rem;">${(p.stages.interestBurden * 100).toFixed(1)}%</td>
        <td style="text-align:right; color:#34d399; font-weight:600; padding:0.4rem 0.5rem;">${(p.stages.operatingMargin * 100).toFixed(1)}%</td>
        <td style="text-align:right; color:#fbbf24; font-weight:600; padding:0.4rem 0.5rem;">${p.stages.assetTurnover.toFixed(2)}x</td>
        <td style="text-align:right; color:#f472b6; font-weight:600; padding:0.4rem 0.5rem;">${p.stages.financialLeverage.toFixed(2)}x</td>
        <td style="text-align:right; color:#94a3b8; padding:0.4rem 0.5rem;">${(p.ratios.netROA * 100).toFixed(1)}%</td>
        <td style="text-align:left; color:#e2e8f0; padding:0.4rem 0.5rem;">${p.quality.primaryDriver}</td>
      </tr>
    `).join("");

    if (attribBanner && multiYear.attribution) {
      const a = multiYear.attribution;
      attribBanner.innerHTML = `
        <div style="font-weight:700; color:#f8fafc; margin-bottom:0.25rem;">
          📊 Multi-Year ROE Evolution (${a.baseYear} &rarr; ${a.latestYear}): 
          <span style="color:${a.roeDelta >= 0 ? '#10b981' : '#ef4444'}">
            ${a.roeDelta >= 0 ? '+' : ''}${(a.roeGrowthPct * 100).toFixed(1)}% ROE Growth
          </span>
        </div>
        <div>
          <strong>Bodie Logarithmic Driver Attribution:</strong>
          Operating Margin contributed <span style="color:#34d399">${a.percentageContributions.operatingMargin.toFixed(1)}%</span>, 
          Asset Turnover contributed <span style="color:#fbbf24">${a.percentageContributions.assetTurnover.toFixed(1)}%</span>, 
          Financial Leverage contributed <span style="color:#f472b6">${a.percentageContributions.financialLeverage.toFixed(1)}%</span>, 
          and Financing/Tax policy contributed <span style="color:#818cf8">${(a.percentageContributions.taxBurden + a.percentageContributions.interestBurden).toFixed(1)}%</span>.
        </div>
      `;
    }
  } else if (historySection) {
    historySection.style.display = "none";
  }

  showTile("tile-dupont");
}

function drawDuPontChart(results) {
  const canvas = document.getElementById("dupont-chart-canvas");
  const container = document.getElementById("container-dupont-chart");
  const tooltip = document.getElementById("tooltip-dupont-chart");
  if (!canvas || !container || !results.dupont?.current) return;

  const d = results.dupont.current;
  const stages = d.stages;
  const ratios = d.ratios;

  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  const width = rect.width > 0 ? rect.width : 700;
  const height = 280;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  const items = [
    { label: "Tax Burden", sub: "Net/EBT", val: stages.taxBurden !== null ? stages.taxBurden : 0, display: stages.taxBurden !== null ? `${(stages.taxBurden * 100).toFixed(1)}%` : "N/A", color: "#38bdf8", benchmarkLabel: "79% (Corporate Tax)" },
    { label: "Interest Burden", sub: "EBT/EBIT", val: stages.interestBurden !== null ? stages.interestBurden : 0, display: stages.interestBurden !== null ? `${(stages.interestBurden * 100).toFixed(1)}%` : "N/A", color: "#818cf8", benchmarkLabel: "85% (Interest Drain)" },
    { label: "Operating Margin", sub: "EBIT/Sales", val: stages.operatingMargin !== null ? stages.operatingMargin : 0, display: stages.operatingMargin !== null ? `${(stages.operatingMargin * 100).toFixed(1)}%` : "N/A", color: "#34d399", benchmarkLabel: "15% (S&P Median)" },
    { label: "Asset Turnover", sub: "Sales/Assets", val: stages.assetTurnover !== null ? stages.assetTurnover : 0, display: stages.assetTurnover !== null ? `${stages.assetTurnover.toFixed(2)}x` : "N/A", color: "#fbbf24", benchmarkLabel: "1.0x (Capital Turnover)" },
    { label: "Financial Leverage", sub: "Assets/Equity", val: stages.financialLeverage !== null ? stages.financialLeverage : 0, display: stages.financialLeverage !== null ? `${stages.financialLeverage.toFixed(2)}x` : "N/A", color: "#f472b6", benchmarkLabel: "2.0x (Prudent Gearing)" },
    { label: "Return on Equity", sub: "∏ Stages 1-5", val: ratios.roe !== null ? ratios.roe : 0, display: ratios.roe !== null ? `${(ratios.roe * 100).toFixed(1)}%` : "N/A", color: "#38bdf8", isResult: true, benchmarkLabel: "15% (Cost of Capital)" },
  ];

  const pad = { top: 35, right: 30, bottom: 45, left: 30 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const colW = chartW / items.length;
  const barW = Math.min(colW * 0.55, 60);

  items.forEach((it, idx) => {
    let maxVal = 1.0;
    if (idx === 0 || idx === 1) maxVal = Math.max(1.1, it.val * 1.15);
    else if (idx === 2) maxVal = Math.max(0.40, it.val * 1.2);
    else if (idx === 3) maxVal = Math.max(2.5, it.val * 1.2);
    else if (idx === 4) maxVal = Math.max(4.0, it.val * 1.2);
    else if (idx === 5) maxVal = Math.max(0.40, it.val * 1.2);

    const ratio = Math.min(1.0, Math.max(0.06, Math.abs(it.val) / maxVal));
    const barH = ratio * chartH;
    const x = pad.left + idx * colW + (colW - barW) / 2;
    const y = pad.top + (chartH - barH);

    it.bounds = { x, y, w: barW, h: barH };

    // Track
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.beginPath();
    ctx.roundRect(x, pad.top, barW, chartH, [4, 4, 0, 0]);
    ctx.fill();

    // Bar
    const grad = ctx.createLinearGradient(0, y, 0, pad.top + chartH);
    grad.addColorStop(0, it.color);
    grad.addColorStop(1, `${it.color}33`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Border
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + barW, y);
    ctx.stroke();

    // Value
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(it.display, x + barW / 2, y - 5);

    // Label
    ctx.fillStyle = it.isResult ? "#38bdf8" : "#94a3b8";
    ctx.font = it.isResult ? "bold 10px -apple-system, sans-serif" : "9px -apple-system, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(it.label, x + barW / 2, pad.top + chartH + 8);

    ctx.fillStyle = "#64748b";
    ctx.font = "8px -apple-system, sans-serif";
    ctx.fillText(it.sub, x + barW / 2, pad.top + chartH + 22);

    // Operator symbol
    if (idx < items.length - 1) {
      ctx.fillStyle = idx === items.length - 2 ? "#38bdf8" : "#475569";
      ctx.font = "bold 14px -apple-system, sans-serif";
      ctx.textBaseline = "middle";
      const sym = idx === items.length - 2 ? "=" : "×";
      ctx.fillText(sym, pad.left + (idx + 1) * colW, pad.top + chartH / 2);
    }
  });

  // Mouse Interaction
  if (canvas._controller) canvas._controller.abort();
  canvas._controller = new AbortController();
  const { signal } = canvas._controller;

  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    let hovered = null;
    for (const it of items) {
      if (it.bounds && mx >= it.bounds.x && mx <= it.bounds.x + it.bounds.w && my >= pad.top && my <= pad.top + chartH) {
        hovered = it;
        break;
      }
    }

    if (hovered && tooltip) {
      tooltip.style.display = "block";
      tooltip.style.left = `${Math.min(width - 220, Math.max(10, mx + 15))}px`;
      tooltip.style.top = `${Math.max(10, my - 50)}px`;
      tooltip.innerHTML = `
        <div style="font-weight:700; color:${hovered.color}; margin-bottom:2px;">${hovered.label}</div>
        <div style="font-size:0.75rem; color:#cbd5e1;">Current Value: <strong>${hovered.display}</strong></div>
        <div style="font-size:0.72rem; color:#94a3b8;">Formula: ${hovered.sub}</div>
        <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">Benchmark: ${hovered.benchmarkLabel}</div>
      `;
    } else if (tooltip) {
      tooltip.style.display = "none";
    }
  }, { signal });

  canvas.addEventListener("mouseleave", () => {
    if (tooltip) tooltip.style.display = "none";
  }, { signal });
}

function renderAssetBased(results) {
  const ab = results.valuations.assetBased;
  if (!ab) return;

  const metrics = [
    ["Book Value / Share", formatValuationCurrency(ab.bookValuePerShare)],
    ["Tangible Book / Share", formatValuationCurrency(ab.tangibleBookPerShare)],
    [
      "Liquidation Value / Share",
      formatValuationCurrency(ab.liquidationPerShare),
    ],
    ["Net-Net (NCAV) / Share", formatValuationCurrency(ab.ncavPerShare)],
    ["Tobin's Q", ab.tobinsQ ? formatRatio(ab.tobinsQ) : "N/A"],
    ["Replacement Cost", formatValuationCurrency(ab.replacementCost)],
  ];

  renderMetricList("val-asset-metrics", metrics);
  showTile("tile-asset");
}

function renderIncomeBased(results) {
  const ib = results.valuations.incomeBased;
  if (!ib) return;

  const metrics = [
    [
      "DCF Fair Value",
      formatValuationCurrency(ib.dcfPerShare),
      ib.dcfPerShare > 0,
    ],
    ["Graham Number", formatValuationCurrency(ib.grahamNumber)],
    ["Earnings Power Value", formatValuationCurrency(ib.epvPerShare)],
    ["Lynch Fair Value", formatValuationCurrency(ib.lynchFairValue)],
    ["Dividend Discount Model", formatValuationCurrency(ib.ddmValue)],
    ["FCF Growth Rate", formatPercent(ib.fcfGrowth)],
    ["Terminal Growth", formatPercent(ib.terminalGrowth)],
  ];

  renderMetricList("val-income-metrics", metrics);
  showTile("tile-income");
}

function renderMultiples(results) {
  const m = results.multiples;
  if (!m) return;

  const metrics = [
    ["P/E Ratio", formatRatio(m.peRatio)],
    ["Forward P/E", formatRatio(m.forwardPE)],
    [
      "PEG Ratio",
      formatRatio(m.pegRatio),
      m.pegRatio !== null ? m.pegRatio < 1 : null,
    ],
    ["Price / Sales", formatRatio(m.priceToSales)],
    ["Price / FCF", formatRatio(m.priceToFCF)],
    ["Earnings Growth", formatPercent(m.earningsGrowth)],
    ["Dividend Yield", formatPercent(m.dividendYield)],
  ];

  renderMetricList("val-multiples-metrics", metrics);
  showTile("tile-multiples");
}

function renderEnterprise(results) {
  const ev = results.enterprise;
  if (!ev) return;

  const metrics = [
    ["Enterprise Value", formatValuationCurrency(ev.enterpriseValue)],
    ["EV / EBITDA", formatRatio(ev.evToEbitda)],
    ["EV / Revenue", formatRatio(ev.evToRevenue)],
    ["EV / FCF", formatRatio(ev.evToFcf)],
    ["EV / Invested Capital", formatRatio(ev.evToInvestedCapital)],
    ["Invested Capital", formatValuationCurrency(ev.investedCapital)],
    ["ROIC", formatPercent(ev.roic)],
  ];

  renderMetricList("val-enterprise-metrics", metrics);
  showTile("tile-enterprise");
}

function renderEquityMultiples(results) {
  const m = results.multiples;
  const ab = results.valuations.assetBased;
  if (!m || !ab) return;

  const metrics = [
    ["Price / Book", formatRatio(m.priceToBook)],
    ["Price / Tangible Book", formatRatio(m.priceToTangibleBook)],
    [
      "Book Value Multiple",
      m.priceToBook ? formatRatio(m.priceToBook) + "x" : "N/A",
    ],
    ["Dividend Yield", formatPercent(m.dividendYield)],
    ["P/E Ratio", formatRatio(m.peRatio)],
    ["PEG Ratio", formatRatio(m.pegRatio)],
  ];

  renderMetricList("val-equity-metrics", metrics);
  showTile("tile-equity");
}

function renderWACC(results) {
  const ib = results.valuations.incomeBased;
  if (!ib) return;

  const metrics = [
    ["WACC", formatPercent(ib.wacc)],
    ["Cost of Equity", formatPercent(ib.costOfEquity)],
    [
      "Cost of Debt (after tax)",
      formatPercent(ib.costOfDebt * (1 - ib.taxRate)),
    ],
    ["Effective Tax Rate", formatPercent(ib.taxRate)],
    ["Risk-Free Rate", "4.3%"],
    ["Equity Risk Premium", "5.7%"],
    ["Dividend / Share", formatValuationCurrency(ib.dividendPerShare)],
  ];

  renderMetricList("val-wacc-metrics", metrics);
  showTile("tile-wacc");
}

function renderMetricList(containerId, metrics) {
  const container = document.getElementById(containerId);
  container.innerHTML = metrics
    .map(([label, value, isPositive]) => {
      let valueClass = "";
      if (isPositive === true) valueClass = "positive";
      else if (isPositive === false) valueClass = "negative";

      return `
      <div class="val-metric-row">
        <span class="val-metric-label">${label}</span>
        <span class="val-metric-value ${valueClass}">${value}</span>
      </div>
    `;
    })
    .join("");
}

// ===================================================================
// SUMMARY CHART
// ===================================================================

function renderSummaryChart(results) {
  const container = document.getElementById("val-summary-chart");
  const price = results.profile.price;
  const valuations = results.verdict.valuations;

  if (!valuations || valuations.length === 0) return;

  // Find the range for scaling
  const allValues = valuations.map((v) => v.value).concat([price]);
  const maxVal = Math.max(...allValues) * 1.2;

  const pricePercent = (price / maxVal) * 100;

  container.innerHTML = valuations
    .sort((a, b) => a.value - b.value)
    .map((v) => {
      const barPercent = Math.max(1, (v.value / maxVal) * 100);
      let barClass = "fair";
      if (v.value < price * 0.9) barClass = "over";
      else if (v.value > price * 1.1) barClass = "under";

      return `
        <div class="val-summary-row">
          <span class="val-summary-method">${v.method}</span>
          <div class="val-summary-bar-wrap">
            <div class="val-summary-bar ${barClass}" style="width: ${barPercent}%"></div>
            <div class="val-summary-price-line" style="left: ${pricePercent}%">
              <span class="val-summary-price-label">$${price.toFixed(0)}</span>
            </div>
          </div>
          <span class="val-summary-value">${formatValuationCurrency(v.value)}</span>
        </div>
      `;
    })
    .join("");

  showTile("tile-summary-chart");
}

// ===================================================================
// DCF SENSITIVITY TABLE
// ===================================================================

function renderDCFSensitivity(results) {
  const ib = results.valuations.incomeBased;
  const profile = results.profile;
  if (!ib || !ib.dcfPerShare || ib.dcfPerShare <= 0) return;

  const baseWACC = ib.wacc;
  const baseGrowth = ib.fcfGrowth;
  const shares = profile.sharesOutstanding;
  const balance = results.balance || [];
  const cashflow = results.cashflow || [];

  // Get base FCF and balance data
  const fcf = cashflow[0] ? cashflow[0].freeCashFlow : 0;
  const totalDebt = balance[0] ? balance[0].totalDebt : 0;
  const cash = balance[0] ? balance[0].cashAndEquivalents : 0;

  if (!fcf || !shares) return;

  // WACC variations: -2% to +2%
  const waccSteps = [-0.02, -0.01, 0, 0.01, 0.02];
  // Growth variations: -2% to +2%
  const growthSteps = [-0.02, -0.01, 0, 0.01, 0.02];

  const header = document.getElementById("val-dcf-sensitivity-header");
  const body = document.getElementById("val-dcf-sensitivity-body");

  // Header row
  header.innerHTML = `
    <tr>
      <th>WACC \\ Growth</th>
      ${growthSteps
        .map((gs) => {
          const g = baseGrowth + gs;
          const isCurrent = gs === 0;
          return `<th class="${isCurrent ? "current-col" : ""}">${(g * 100).toFixed(1)}%</th>`;
        })
        .join("")}
    </tr>
  `;

  // Body rows
  body.innerHTML = waccSteps
    .map((ws) => {
      const w = baseWACC + ws;
      const isCurrentRow = ws === 0;

      const cells = growthSteps
        .map((gs) => {
          const g = baseGrowth + gs;
          const isCurrentCol = gs === 0;
          const isCurrentCell = isCurrentRow && isCurrentCol;

          // Mini DCF calculation
          let dcfVal = 0;
          let projFCF = fcf;
          const termGrowth = 0.025;

          for (let t = 1; t <= 10; t++) {
            projFCF *= 1 + (t <= 5 ? g : g * 0.5);
            dcfVal += projFCF / Math.pow(1 + w, t);
          }

          if (w > termGrowth) {
            const tv = (projFCF * (1 + termGrowth)) / (w - termGrowth);
            dcfVal += tv / Math.pow(1 + w, 10);
          }

          dcfVal = (dcfVal - totalDebt + cash) / shares;

          let cellClass = "";
          if (isCurrentCell) cellClass = "current-cell";
          else if (isCurrentCol) cellClass = "current-col";
          else if (isCurrentRow) cellClass = "current-row";

          return `<td class="${cellClass}">${dcfVal > 0 ? "$" + dcfVal.toFixed(2) : "N/A"}</td>`;
        })
        .join("");

      return `
      <tr>
        <td class="${isCurrentRow ? "current-row" : ""}" style="font-weight: 600;">${(w * 100).toFixed(1)}%</td>
        ${cells}
      </tr>
    `;
    })
    .join("");

  showTile("tile-dcf-sensitivity");
}

// ===================================================================
// TILE VISIBILITY HELPERS
// ===================================================================

function showTile(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

function hideTile(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}
// ===================================================================
// INIT
// ===================================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initValuator);
} else {
  initValuator();
}
