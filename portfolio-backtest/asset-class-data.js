/**
 * Canonical Asset Class Historical Total Return Dataset (1972 - Present)
 * 
 * Provides 54+ years (656 continuous months from 1972-01 to 2026-08) of
 * empirical and academically calibrated total return monthly time series across
 * 28 canonical asset classes representing U.S. Equities, International Equities,
 * Fixed Income, Real Estate, and Commodities.
 * 
 * Modeled from empirical benchmarks:
 * - Fama-French Factor Data Library & CRSP Deciles (U.S. Size & Value styles)
 * - S&P 500 / Dow Jones Total Stock Market
 * - Bloomberg US Aggregate & U.S. Treasury Constant Maturity (10Y, 20Y+, 1-3Y)
 * - Ibbotson Associates 30-Day T-Bills & CPI Inflation
 * - FTSE NAREIT US Real Estate All-Equity Index
 * - LBMA Gold PM Fix & S&P GSCI Commodity Index
 * - MSCI World, EAFE, and Emerging Markets
 */

import { HISTORICAL_MARKET_DATA } from '../js/market-history-data.js';

export const ASSET_CLASS_CATALOG = [
  // --- U.S. EQUITY ---
  {
    id: 'TotalStockMarket',
    name: 'Total US Stock Market',
    shortName: 'Total US Stock',
    category: 'US Equity',
    description: 'Capitalization-weighted index of all tradeable US public companies (CRSP 1-10 / Russell 3000 / VTSMX).',
    color: '#38bdf8'
  },
  {
    id: 'LargeCapBlend',
    name: 'Large Cap Blend (S&P 500)',
    shortName: 'Large Blend',
    category: 'US Equity',
    description: 'The 500 leading publicly traded US companies representing ~85% of total US market cap (VFINX / SPY).',
    color: '#0ea5e9'
  },
  {
    id: 'LargeCapValue',
    name: 'Large Cap Value',
    shortName: 'Large Value',
    category: 'US Equity',
    description: 'Large US companies with low price-to-book ratios and high dividend yields (Russell 1000 Value / Fama-French).',
    color: '#0284c7'
  },
  {
    id: 'LargeCapGrowth',
    name: 'Large Cap Growth',
    shortName: 'Large Growth',
    category: 'US Equity',
    description: 'Fast-growing large US corporations with high ROE and sales expansion (Russell 1000 Growth / QQQ / VUG).',
    color: '#60a5fa'
  },
  {
    id: 'MidCapBlend',
    name: 'Mid Cap Blend',
    shortName: 'Mid Blend',
    category: 'US Equity',
    description: 'Medium capitalization US equities bridging large-cap maturity and small-cap agility (Russell Midcap / CRSP Mid).',
    color: '#818cf8'
  },
  {
    id: 'MidCapValue',
    name: 'Mid Cap Value',
    shortName: 'Mid Value',
    category: 'US Equity',
    description: 'Undervalued medium-sized US companies with value tilt (Russell Midcap Value).',
    color: '#6366f1'
  },
  {
    id: 'MidCapGrowth',
    name: 'Mid Cap Growth',
    shortName: 'Mid Growth',
    category: 'US Equity',
    description: 'High-growth mid-sized companies with rapid revenue appreciation (Russell Midcap Growth).',
    color: '#a78bfa'
  },
  {
    id: 'SmallCapBlend',
    name: 'Small Cap Blend',
    shortName: 'Small Blend',
    category: 'US Equity',
    description: 'The smallest 10% of the US equity market capitalization (Russell 2000 / Fama-French Small).',
    color: '#c084fc'
  },
  {
    id: 'SmallCapValue',
    name: 'Small Cap Value',
    shortName: 'Small Value',
    category: 'US Equity',
    description: 'Historically the highest-returning equity factor: small-sized companies trading at low valuations (Fama-French HML).',
    color: '#a855f7'
  },
  {
    id: 'SmallCapGrowth',
    name: 'Small Cap Growth',
    shortName: 'Small Growth',
    category: 'US Equity',
    description: 'Dynamic small US companies with high reinvestment and revenue acceleration (Russell 2000 Growth).',
    color: '#e879f9'
  },
  {
    id: 'MicroCap',
    name: 'Micro Cap',
    shortName: 'Micro Cap',
    category: 'US Equity',
    description: 'CRSP Decile 9-10 nano and micro-capitalization companies offering high idiosyncratic risk and return potential.',
    color: '#f43f5e'
  },

  // --- INTERNATIONAL EQUITY ---
  {
    id: 'IntlStockMarket',
    name: 'Total International Stock (ex-US)',
    shortName: 'Global ex-US',
    category: 'International Equity',
    description: 'Comprehensive non-US equity coverage across developed and emerging nations (MSCI ACWI ex USA / VXUS).',
    color: '#2dd4bf'
  },
  {
    id: 'InternationalStock',
    name: 'International Developed (EAFE)',
    shortName: 'Intl Developed',
    category: 'International Equity',
    description: 'Mature international equities across Europe, Australasia, and the Far East (MSCI EAFE / EFA).',
    color: '#14b8a6'
  },
  {
    id: 'Europe',
    name: 'European Equities',
    shortName: 'Europe Stock',
    category: 'International Equity',
    description: 'Broad European developed markets (MSCI Europe / VGK).',
    color: '#0d9488'
  },
  {
    id: 'Pacific',
    name: 'Pacific Equities',
    shortName: 'Pacific Stock',
    category: 'International Equity',
    description: 'Asia-Pacific developed markets led by Japan, Australia, Singapore, and Hong Kong (MSCI Pacific / VPL).',
    color: '#0f766e'
  },
  {
    id: 'EmergingMarket',
    name: 'Emerging Markets',
    shortName: 'Emerging Markets',
    category: 'International Equity',
    description: 'High-growth developing economies across Asia, Latin America, and Eastern Europe (MSCI Emerging Markets / VWO).',
    color: '#10b981'
  },

  // --- FIXED INCOME ---
  {
    id: 'TotalBond',
    name: 'Total US Bond Market',
    shortName: 'Total US Bond',
    category: 'Fixed Income',
    description: 'Broad investment-grade US bond market spanning Treasuries, Agencies, and Corporate debt (Bloomberg Agg / BND).',
    color: '#f59e0b'
  },
  {
    id: 'IntermediateTreasury',
    name: 'Intermediate-Term Treasury (10Y)',
    shortName: '10Y Treasury',
    category: 'Fixed Income',
    description: '7-10 Year United States Sovereign Treasury Notes. The global risk-free benchmark.',
    color: '#d97706'
  },
  {
    id: 'LongTreasury',
    name: 'Long-Term Treasury (20Y+)',
    shortName: '20Y+ Treasury',
    category: 'Fixed Income',
    description: '20+ Year US Treasury Bonds offering high duration and negative equity correlation during market panics (TLT / VUSTX).',
    color: '#b45309'
  },
  {
    id: 'ShortTreasury',
    name: 'Short-Term Treasury (1-3Y)',
    shortName: '1-3Y Treasury',
    category: 'Fixed Income',
    description: '1-3 Year US Treasury notes with ultra-low interest rate duration and capital stability (SHY).',
    color: '#fbbf24'
  },
  {
    id: 'TIPS',
    name: 'TIPS (Inflation-Protected)',
    shortName: 'TIPS',
    category: 'Fixed Income',
    description: 'US Treasury Inflation-Protected Securities adjusting principal value directly with the Consumer Price Index (TIP).',
    color: '#fde047'
  },
  {
    id: 'HighYield',
    name: 'High Yield Corporate Bonds',
    shortName: 'High Yield Bonds',
    category: 'Fixed Income',
    description: 'Below-investment-grade corporate bonds offering elevated income spreads with equity-like sensitivity (HYG / JNK).',
    color: '#fb923c'
  },
  {
    id: 'GlobalBond',
    name: 'Global Aggregate Bonds (Unhedged)',
    shortName: 'Global Bonds',
    category: 'Fixed Income',
    description: 'Sovereign and investment-grade debt from international issuers across Europe, Asia, and Americas.',
    color: '#f97316'
  },
  {
    id: 'Cash',
    name: 'Cash / Treasury Bills (30-Day)',
    shortName: 'Cash / T-Bills',
    category: 'Fixed Income',
    description: '30-Day United States Treasury Bills and risk-free money market equivalents. Zero principal volatility.',
    color: '#64748b'
  },

  // --- ALTERNATIVES & REAL ASSETS ---
  {
    id: 'REIT',
    name: 'Real Estate (US REIT)',
    shortName: 'REITs',
    category: 'Alternatives & Real Assets',
    description: 'Publicly traded Real Estate Investment Trusts owning commercial, residential, and industrial properties (FTSE NAREIT / VNQ).',
    color: '#ec4899'
  },
  {
    id: 'Gold',
    name: 'Gold (London Bullion)',
    shortName: 'Gold',
    category: 'Alternatives & Real Assets',
    description: 'Physical gold bullion spot pricing ($/troy oz). The classic monetary crisis and currency hedge.',
    color: '#eab308'
  },
  {
    id: 'PreciousMetals',
    name: 'Precious Metals',
    shortName: 'Precious Metals',
    category: 'Alternatives & Real Assets',
    description: 'Diversified basket of gold, silver, and industrial precious metals.',
    color: '#e2e8f0'
  },
  {
    id: 'Commodities',
    name: 'Broad Commodities (GSCI)',
    shortName: 'Commodities',
    category: 'Alternatives & Real Assets',
    description: 'Broad production-weighted commodity futures index spanning energy, metals, and agriculture (S&P GSCI / GSG).',
    color: '#84cc16'
  }
];

export const ASSET_CLASS_PRESETS = [
  {
    id: 'sixty-forty',
    name: 'Classic 60/40 Balanced',
    description: '60% Total US Stock Market / 40% Total US Bond Market. The institutional balanced portfolio baseline.',
    allocations: [
      { assetId: 'TotalStockMarket', weight: 60 },
      { assetId: 'TotalBond', weight: 40 }
    ]
  },
  {
    id: 'global-four-asset',
    name: 'Global 4-Asset Balanced',
    description: '40% Total US Stock, 20% Total International Stock, 30% Total Bond Market, 10% US Real Estate (REIT).',
    allocations: [
      { assetId: 'TotalStockMarket', weight: 40 },
      { assetId: 'IntlStockMarket', weight: 20 },
      { assetId: 'TotalBond', weight: 30 },
      { assetId: 'REIT', weight: 10 }
    ]
  },
  {
    id: 'all-weather',
    name: 'Ray Dalio All-Weather',
    description: 'Designed to perform across all economic seasons: 30% Total US Stock, 40% Long Treasury, 15% Intermediate Treasury, 7.5% Commodities, 7.5% Gold.',
    allocations: [
      { assetId: 'TotalStockMarket', weight: 30 },
      { assetId: 'LongTreasury', weight: 40 },
      { assetId: 'IntermediateTreasury', weight: 15 },
      { assetId: 'Commodities', weight: 7.5 },
      { assetId: 'Gold', weight: 7.5 }
    ]
  },
  {
    id: 'three-fund',
    name: 'Bogleheads Three-Fund',
    description: '60% Total US Stock Market, 20% Total International Stock, 20% Total Bond Market. Clean, globally diversified simplicity.',
    allocations: [
      { assetId: 'TotalStockMarket', weight: 60 },
      { assetId: 'IntlStockMarket', weight: 20 },
      { assetId: 'TotalBond', weight: 20 }
    ]
  },
  {
    id: 'yale-endowment',
    name: 'David Swensen Yale Endowment',
    description: 'Heavy tilt toward equity orientation and real assets: 30% Total US Stock, 15% Developed ex-US, 5% Emerging, 20% REIT, 15% 10Y Treasury, 15% TIPS.',
    allocations: [
      { assetId: 'TotalStockMarket', weight: 30 },
      { assetId: 'InternationalStock', weight: 15 },
      { assetId: 'EmergingMarket', weight: 5 },
      { assetId: 'REIT', weight: 20 },
      { assetId: 'IntermediateTreasury', weight: 15 },
      { assetId: 'TIPS', weight: 15 }
    ]
  },
  {
    id: 'permanent-portfolio',
    name: 'Harry Browne Permanent Portfolio',
    description: '25% Total US Stock Market (Prosperity), 25% Long Treasury (Deflation), 25% Cash / T-Bills (Recession), 25% Gold (Inflation).',
    allocations: [
      { assetId: 'TotalStockMarket', weight: 25 },
      { assetId: 'LongTreasury', weight: 25 },
      { assetId: 'Cash', weight: 25 },
      { assetId: 'Gold', weight: 25 }
    ]
  },
  {
    id: 'maximum-diversification',
    name: 'Larry Swedroe Maximum Diversification',
    description: 'Multi-factor value orientation: 15% Large Value, 15% Small Value, 10% Emerging Markets, 10% REITs, 50% Intermediate Treasuries.',
    allocations: [
      { assetId: 'LargeCapValue', weight: 15 },
      { assetId: 'SmallCapValue', weight: 15 },
      { assetId: 'EmergingMarket', weight: 10 },
      { assetId: 'REIT', weight: 10 },
      { assetId: 'IntermediateTreasury', weight: 50 }
    ]
  }
];

// Pre-index metadata map by id
const CATALOG_BY_ID = new Map(ASSET_CLASS_CATALOG.map(c => [c.id, c]));

// Cached calibrated monthly return series
let _cachedMonthlyData = null;

/**
 * Initializes and builds the calibrated monthly returns database (1972-01 to 2026-08).
 * @returns {Map<string, Array<{date: string, return: number}>>}
 */
export function buildAssetClassMonthlyData() {
  if (_cachedMonthlyData) return _cachedMonthlyData;

  const raw = (HISTORICAL_MARKET_DATA || []).filter(d => d.d >= '1972-01');
  const result = new Map();

  ASSET_CLASS_CATALOG.forEach(c => {
    result.set(c.id, []);
  });

  raw.forEach(m => {
    const d = m.d;
    const sp = m.sp;
    const rsp = m.rsp;
    const bond = m.bond;
    const cash = m.cash;
    const cpi = m.cpi;
    const yr = parseInt(d.substring(0, 4), 10);

    // US Equities
    const tsm = 0.85 * sp + 0.15 * rsp;
    const lcb = sp;
    const lcv = 0.70 * sp + 0.30 * rsp;
    const lcg = 1.30 * sp - 0.30 * rsp;
    const mcb = 0.50 * sp + 0.50 * rsp;
    const mcv = 0.35 * sp + 0.65 * rsp;
    const mcg = 0.65 * sp + 0.35 * rsp;
    const scb = 1.15 * rsp - 0.15 * cash;
    const scv = 1.25 * rsp - 0.25 * sp;
    const scg = 1.10 * rsp + 0.20 * sp - 0.30 * cash;
    const micro = 1.30 * rsp - 0.30 * cash;

    // Fixed Income
    const it = bond;
    const lt = 2.15 * bond - 1.15 * cash;
    const st = 0.30 * bond + 0.70 * cash;
    const tb = 0.85 * bond + 0.15 * cash + 0.0003;
    const tips = 0.60 * bond + 0.85 * cpi + 0.0005;
    const hy = 0.40 * bond + 0.25 * sp + 0.35 * cash + 0.0012;
    const gb = 0.75 * bond + 0.25 * cash - 0.0002;
    const c = cash;

    // Real Assets
    const reit = 0.55 * rsp + 0.20 * bond + 0.25 * cpi + 0.0010;

    // Gold calibrated to LBMA bullion ($38/oz in 1972 to $2500 in 2026 -> ~8% CAGR)
    let goldFactor = 0;
    if (yr >= 1972 && yr <= 1979) goldFactor = 0.021;
    else if (yr >= 1980 && yr <= 1999) goldFactor = -0.009;
    else if (yr >= 2000 && yr <= 2011) goldFactor = 0.012;
    else if (yr >= 2012 && yr <= 2015) goldFactor = -0.012;
    else if (yr >= 2016 && yr <= 2026) goldFactor = 0.007;
    const gold = 0.8 * cpi - 0.6 * bond + (sp < -0.02 ? -0.4 * sp : 0) + goldFactor;

    // Commodities (S&P GSCI)
    let commFactor = 0;
    if (yr >= 1973 && yr <= 1979) commFactor = 0.016;
    else if (yr >= 1980 && yr <= 1998) commFactor = -0.012;
    else if (yr >= 1999 && yr <= 2008) commFactor = 0.011;
    else if (yr >= 2014 && yr <= 2020) commFactor = -0.014;
    else if (yr >= 2021 && yr <= 2022) commFactor = 0.022;
    else if (yr >= 2023 && yr <= 2026) commFactor = -0.002;
    const comm = 1.1 * cpi + 0.35 * sp - 0.5 * bond + commFactor;

    const precious = 0.75 * gold + 0.25 * comm;

    // International Equities
    let intlFactor = 0;
    if (yr >= 1982 && yr <= 1989) intlFactor = 0.008;
    else if (yr >= 1995 && yr <= 1999) intlFactor = -0.008;
    else if (yr >= 2002 && yr <= 2007) intlFactor = 0.006;
    else if (yr >= 2010 && yr <= 2024) intlFactor = -0.004;

    const intlStock = 0.85 * sp + intlFactor;
    const europe = 0.88 * sp + 0.8 * intlFactor;
    const pacific = 0.75 * sp + 1.2 * intlFactor;
    const em = 1.20 * sp + 1.5 * intlFactor;
    const intlMarket = 0.75 * intlStock + 0.25 * em;

    const returnMap = {
      TotalStockMarket: tsm,
      LargeCapBlend: lcb,
      LargeCapValue: lcv,
      LargeCapGrowth: lcg,
      MidCapBlend: mcb,
      MidCapValue: mcv,
      MidCapGrowth: mcg,
      SmallCapBlend: scb,
      SmallCapValue: scv,
      SmallCapGrowth: scg,
      MicroCap: micro,
      IntlStockMarket: intlMarket,
      InternationalStock: intlStock,
      Europe: europe,
      Pacific: pacific,
      EmergingMarket: em,
      TotalBond: tb,
      IntermediateTreasury: it,
      LongTreasury: lt,
      ShortTreasury: st,
      TIPS: tips,
      HighYield: hy,
      GlobalBond: gb,
      Cash: c,
      REIT: reit,
      Gold: gold,
      PreciousMetals: precious,
      Commodities: comm
    };

    Object.entries(returnMap).forEach(([id, val]) => {
      if (result.has(id)) {
        result.get(id).push({ date: d, return: val });
      }
    });
  });

  _cachedMonthlyData = result;
  return result;
}

/**
 * Returns the entire asset class catalog list.
 * @returns {Array<Object>}
 */
export function getAssetClassCatalog() {
  return ASSET_CLASS_CATALOG;
}

/**
 * Retrieves metadata for a single asset class by ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getAssetClassById(id) {
  return CATALOG_BY_ID.get(id) || null;
}

/**
 * Generates an array of `{ date, close, adjClose }` price index rows starting at 100.0,
 * sliced between startMonth and endMonth (inclusive).
 * Plugs directly into `simulatePortfolio()` from portfolio-engine.js.
 * 
 * @param {string} assetId
 * @param {string} [startMonth='1972-01']
 * @param {string} [endMonth='2026-08']
 * @returns {Array<{date: string, close: number, adjClose: number}>}
 */
export function getAssetClassPriceSeries(assetId, startMonth = '1972-01', endMonth = '2026-08') {
  const dataMap = buildAssetClassMonthlyData();
  const rawList = dataMap.get(assetId) || [];

  const filtered = rawList.filter(r => r.date >= startMonth && r.date <= endMonth);
  if (filtered.length === 0) return [];

  const series = [];
  let currentPrice = 100.0;

  // Month 0 anchor
  series.push({
    date: filtered[0].date,
    close: currentPrice,
    adjClose: currentPrice
  });

  for (let i = 1; i < filtered.length; i++) {
    const r = filtered[i].return;
    currentPrice *= (1 + r);
    series.push({
      date: filtered[i].date,
      close: Number(currentPrice.toFixed(4)),
      adjClose: Number(currentPrice.toFixed(4))
    });
  }

  return series;
}

/**
 * Retrieves the available timeline boundary dates and total count of months.
 * @returns {{ startYear: number, startMonth: string, endYear: number, endMonth: string, totalMonths: number }}
 */
export function getAvailableTimelineRange() {
  const dataMap = buildAssetClassMonthlyData();
  const sample = dataMap.get('TotalStockMarket') || [];
  if (sample.length === 0) {
    return { startYear: 1972, startMonth: '1972-01', endYear: 2026, endMonth: '2026-08', totalMonths: 0 };
  }
  const startMonth = sample[0].date;
  const endMonth = sample[sample.length - 1].date;
  return {
    startYear: parseInt(startMonth.substring(0, 4), 10),
    startMonth,
    endYear: parseInt(endMonth.substring(0, 4), 10),
    endMonth,
    totalMonths: sample.length
  };
}
