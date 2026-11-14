/**
 * Screener & Rankings Engine
 * Computes multi-factor trailing returns, risk-adjusted metrics, CAPM benchmark-relative factors,
 * and ordinal/percentile rankings across the fund universe.
 */

import { computeMonthlyReturns } from './analytics-engine.js';
import {
  computeRiskMetrics,
  runCAPMRegression,
  computeDualBetaAndCapture,
  analyzeFundRegression
} from '../fund-regression/regression-engine.js';

/**
 * Canonical 11 Asset Classes from Portfolio Visualizer
 */
export const CANONICAL_ASSET_CLASSES = [
  'U.S. Equity',
  'International Equity',
  'Taxable Bond',
  'Municipal Bond',
  'Sector Equity',
  'Allocation',
  'Alternative',
  'Commodities',
  'Money Market',
  'Miscellaneous',
  'Nontraditional Equity'
];

/**
 * Sub-Categories mapped to each Canonical Asset Class
 */
export const SUB_CATEGORIES_BY_ASSET_CLASS = {
  'U.S. Equity': [
    'Large Blend',
    'Large Growth',
    'Large Value',
    'Mid-Cap Blend',
    'Mid-Cap Growth',
    'Mid-Cap Value',
    'Small Blend',
    'Small Growth',
    'Small Value',
    'High Dividend'
  ],
  'International Equity': [
    'Foreign Large Blend',
    'Foreign Large Growth',
    'Foreign Large Value',
    'Emerging Markets',
    'Global Equity',
    'Europe',
    'Pacific/Asia'
  ],
  'Taxable Bond': [
    'Intermediate Core Bond',
    'Short-Term Bond',
    'Ultrashort Bond',
    'Long-Term Treasury',
    'Corporate Bond',
    'High Yield Bond',
    'Securitized Bond Focus'
  ],
  'Municipal Bond': [
    'National Muni',
    'Single State Muni',
    'High Yield Muni',
    'Short-Term Muni'
  ],
  'Sector Equity': [
    'Technology',
    'Healthcare',
    'Financials',
    'Consumer Cyclical',
    'Consumer Defensive',
    'Energy',
    'Industrials',
    'Utilities',
    'Real Estate Sector'
  ],
  'Allocation': [
    'Target-Date Retirement',
    'Conservative Allocation',
    'Moderate Allocation',
    'Moderately Aggressive Allocation',
    'Aggressive Allocation',
    'Tactical Allocation'
  ],
  'Alternative': [
    'Long-Short Equity',
    'Market Neutral',
    'Managed Futures',
    'Commodity Focused',
    'Private Debt - General',
    'Real Estate Focus'
  ],
  'Commodities': [
    'Precious Metals (Gold/Silver)',
    'Energy (Oil/Gas)',
    'Agriculture',
    'Broad Commodity Focused'
  ],
  'Money Market': [
    'Treasury Money Market',
    'Prime Money Market',
    'Tax-Free Money Market'
  ],
  'Nontraditional Equity': [
    'Leveraged 2x/3x Long',
    'Inverse / Short',
    'Derivative Income / Covered Call',
    'Defined Outcome / Buffer'
  ],
  'Miscellaneous': [
    'General Session Upload',
    'Other'
  ]
};

/**
 * Infers Fund Type (ETF, Mutual Fund, Closed-End Fund) based on ticker conventions and metadata.
 * @param {object} fund
 * @returns {'ETF' | 'Mutual Fund' | 'Closed-End Fund'}
 */
export function inferFundType(fund) {
  if (fund.fundType) return fund.fundType;
  const name = (fund.name || '').toLowerCase();
  const ticker = (fund.ticker || '').toUpperCase();

  if (name.includes('closed-end') || name.includes('cef') || (fund.category && fund.category.toLowerCase().includes('closed-end'))) {
    return 'Closed-End Fund';
  }
  // US Mutual funds have 5-letter tickers ending in 'X' (e.g. VTSAX, FXAIX, AAAAX)
  if (ticker.length === 5 && ticker.endsWith('X')) {
    return 'Mutual Fund';
  }
  if (name.includes('mutual fund') || name.includes('investor shares') || name.includes('admiral shares')) {
    return 'Mutual Fund';
  }
  return 'ETF';
}

/**
 * Classifies a fund into Portfolio Visualizer's Two-Tier Taxonomy (Asset Class + Sub-Category).
 * @param {object} fund
 * @returns {{ fundType: string, assetClass: string, category: string }}
 */
export function classifyFundTaxonomy(fund) {
  const fundType = inferFundType(fund);
  const rawClass = (fund.assetClass || '').trim();
  const rawCat = (fund.category || '').trim();
  const rawName = (fund.name || '').toLowerCase();
  const ticker = (fund.ticker || '').toUpperCase();

  // If already matches canonical asset class directly
  if (CANONICAL_ASSET_CLASSES.includes(rawClass)) {
    return {
      fundType,
      assetClass: rawClass,
      category: rawCat || SUB_CATEGORIES_BY_ASSET_CLASS[rawClass]?.[0] || 'General'
    };
  }

  let assetClass = 'U.S. Equity';
  let category = 'Large Blend';

  // 1. Bond classification
  if (rawClass.includes('Bond') || rawClass.includes('Fixed Income') || rawName.includes('bond') || rawName.includes('treasury') || ticker === 'BND') {
    if (rawName.includes('muni') || rawName.includes('municipal') || rawClass.includes('Muni')) {
      assetClass = 'Municipal Bond';
      category = 'National Muni';
    } else {
      assetClass = 'Taxable Bond';
      category = rawClass.includes('Total') || ticker === 'BND' ? 'Intermediate Core Bond' : 'Corporate Bond';
    }
  }
  // 2. Commodities
  else if (rawClass.includes('Commodit') || rawName.includes('gold') || rawName.includes('silver') || rawName.includes('commodity') || ticker === 'GLD' || ticker === 'IAU') {
    assetClass = 'Commodities';
    category = 'Precious Metals (Gold/Silver)';
  }
  // 3. International Equity
  else if (rawClass.includes('International') || rawClass.includes('Emerging') || rawClass.includes('Global') || rawName.includes('msci') || rawName.includes('international') || rawName.includes('emerging') || ticker === 'EWA' || ticker === 'EWC') {
    assetClass = 'International Equity';
    category = ticker === 'EWA' ? 'Pacific/Asia' : (ticker === 'EWC' ? 'Global Equity' : 'Foreign Large Blend');
  }
  // 4. Sector Equity
  else if (rawName.includes('sector') || rawName.includes('tech') || rawName.includes('health') || rawName.includes('financial') || rawName.includes('energy') || ticker === 'XLK') {
    assetClass = 'Sector Equity';
    category = (rawName.includes('tech') || ticker === 'XLK') ? 'Technology' : (rawName.includes('energy') ? 'Energy' : 'Sector Equity');
  }
  // 5. Allocation
  else if (rawClass.includes('Allocation') || rawName.includes('balanced') || rawName.includes('target-date') || rawName.includes('target date') || rawName.includes('allocation')) {
    assetClass = 'Allocation';
    category = rawName.includes('aggressive') ? 'Moderately Aggressive Allocation' : 'Target-Date Retirement';
  }
  // 6. Alternative
  else if (rawClass.includes('Alternative') || rawName.includes('reit') || rawName.includes('real estate') || rawName.includes('hedge') || rawName.includes('private debt')) {
    assetClass = 'Alternative';
    category = rawName.includes('private debt') ? 'Private Debt - General' : 'Real Estate Focus';
  }
  // 7. Money Market
  else if (rawClass.includes('Money Market') || rawName.includes('money market') || rawName.includes('t-bill') || rawName.includes('cash')) {
    assetClass = 'Money Market';
    category = 'Treasury Money Market';
  }
  // 8. Nontraditional Equity
  else if (rawName.includes('2x') || rawName.includes('3x') || rawName.includes('leveraged') || rawName.includes('inverse') || rawName.includes('covered call') || rawName.includes('buffer') || ticker === 'TQQQ' || ticker === 'SQQQ' || ticker === 'JEPI') {
    assetClass = 'Nontraditional Equity';
    category = rawName.includes('covered call') || ticker === 'JEPI' ? 'Derivative Income / Covered Call' : 'Leveraged 2x/3x Long';
  }
  // 9. U.S. Equity (default for VOO, SPY, QQQ, SCHD)
  else {
    assetClass = 'U.S. Equity';
    if (ticker === 'QQQ' || rawClass.includes('Growth') || rawName.includes('growth')) {
      category = 'Large Growth';
    } else if (ticker === 'SCHD' || rawClass.includes('Dividend') || rawName.includes('dividend')) {
      category = 'High Dividend';
    } else if (rawClass.includes('Value') || rawName.includes('value')) {
      category = 'Large Value';
    } else if (rawClass.includes('Small') || rawName.includes('small')) {
      category = 'Small Blend';
    } else if (rawClass.includes('Mid') || rawName.includes('mid')) {
      category = 'Mid-Cap Blend';
    } else {
      category = 'Large Blend';
    }
  }

  return {
    fundType,
    assetClass,
    category
  };
}

/**
 * Calculates trailing returns (YTD, 1Y, 3Y, 5Y, 10Y, and Inception CAGR) from monthly series.
 * @param {Array<{date: string, close: number, adjClose?: number}>} data
 * @param {boolean} [useDRIP=true]
 * @returns {object}
 */
export function calculateTrailingReturns(data, useDRIP = true) {
  if (!data || data.length < 2) {
    return {
      ytd: null,
      return1y: null,
      return3y: null,
      return5y: null,
      return10y: null,
      cagr: null,
      monthsCount: data ? data.length : 0,
      startDate: data && data[0] ? data[0].date : null,
      endDate: data && data.length > 0 ? data[data.length - 1].date : null
    };
  }

  const N = data.length;
  const getPrice = (d) => useDRIP ? (d.adjClose ?? d.close) : d.close;
  const pLast = getPrice(data[N - 1]);
  const lastDate = data[N - 1].date;
  const lastYear = parseInt(lastDate.substring(0, 4), 10);

  // 1. YTD Return
  let ytd = null;
  const prevDecDate = `${lastYear - 1}-12`;
  const prevDecIdx = data.findIndex(d => d.date.startsWith(prevDecDate));
  if (prevDecIdx !== -1 && prevDecIdx < N - 1) {
    const pPrevDec = getPrice(data[prevDecIdx]);
    if (pPrevDec > 0) ytd = (pLast / pPrevDec) - 1;
  } else {
    // If previous December not in dataset, use earliest month in current year
    const currYearFirstIdx = data.findIndex(d => d.date.startsWith(`${lastYear}-`));
    if (currYearFirstIdx !== -1 && currYearFirstIdx < N - 1) {
      const pFirst = getPrice(data[currYearFirstIdx]);
      if (pFirst > 0) ytd = (pLast / pFirst) - 1;
    }
  }

  // 2. Trailing 1Y (12 monthly changes = 13 data points)
  let return1y = null;
  if (N >= 13) {
    const p1y = getPrice(data[N - 13]);
    if (p1y > 0) return1y = (pLast / p1y) - 1;
  }

  // 3. Trailing 3Y Annualized CAGR (36 monthly changes = 37 data points)
  let return3y = null;
  if (N >= 37) {
    const p3y = getPrice(data[N - 37]);
    if (p3y > 0) return3y = Math.pow(pLast / p3y, 1 / 3) - 1;
  }

  // 4. Trailing 5Y Annualized CAGR (60 monthly changes = 61 data points)
  let return5y = null;
  if (N >= 61) {
    const p5y = getPrice(data[N - 61]);
    if (p5y > 0) return5y = Math.pow(pLast / p5y, 1 / 5) - 1;
  }

  // 5. Trailing 10Y Annualized CAGR (120 monthly changes = 121 data points)
  let return10y = null;
  if (N >= 121) {
    const p10y = getPrice(data[N - 121]);
    if (p10y > 0) return10y = Math.pow(pLast / p10y, 1 / 10) - 1;
  }

  // 6. Full Inception CAGR
  let cagr = null;
  const totalMonths = N - 1;
  const p0 = getPrice(data[0]);
  if (totalMonths > 0 && p0 > 0) {
    cagr = Math.pow(pLast / p0, 12 / totalMonths) - 1;
  }

  return {
    ytd,
    return1y,
    return3y,
    return5y,
    return10y,
    cagr,
    monthsCount: N,
    startDate: data[0].date,
    endDate: data[N - 1].date
  };
}

/**
 * Builds a multi-factor profile for a single fund evaluated against a benchmark.
 * @param {object} fund - { ticker, name, assetClass, data, ... }
 * @param {object} benchmarkFund - { ticker, name, data, ... }
 * @param {object} [options] - { useDRIP: true, annualRf: 0.03 }
 * @returns {object} Full screener profile
 */
export function buildFundScreenerProfile(fund, benchmarkFund, options = {}) {
  const useDRIP = options.useDRIP !== false;
  const annualRf = options.annualRf ?? 0.03;

  const trailing = calculateTrailingReturns(fund.data, useDRIP);

  let regression = null;
  if (benchmarkFund && benchmarkFund.data && benchmarkFund.data.length >= 6) {
    try {
      regression = analyzeFundRegression(fund, benchmarkFund, {
        useDRIP,
        annualRf,
        windowMonths: 36
      });
    } catch (e) {
      console.warn(`Could not run regression for ${fund.ticker}:`, e);
    }
  }

  const fRisk = regression?.fundRisk;
  const capm = regression?.capm;
  const dualBeta = regression?.dualBeta;

  const taxonomy = classifyFundTaxonomy(fund);

  return {
    ticker: fund.ticker.toUpperCase(),
    name: fund.name || fund.ticker,
    fundType: taxonomy.fundType,
    assetClass: taxonomy.assetClass,
    category: taxonomy.category,
    color: fund.color || '#38bdf8',
    isPreset: !!fund.isPreset,
    expenseRatio: fund.expenseRatio || '—',
    yield: fund.yield || '—',
    inception: fund.inception || (fund.data && fund.data[0] ? fund.data[0].date : '—'),
    monthsCount: fund.data ? fund.data.length : 0,
    startDate: trailing.startDate,
    endDate: trailing.endDate,
    rawFund: fund,

    // Trailing Compounded Returns
    ytd: trailing.ytd,
    return1y: trailing.return1y,
    return3y: trailing.return3y,
    return5y: trailing.return5y,
    return10y: trailing.return10y,
    cagr: fRisk?.cagr ?? trailing.cagr,

    // Risk & Efficiency
    volatility: fRisk?.annualVolatility ?? null,
    downsideDeviation: fRisk?.downsideDeviation ?? null,
    maxDrawdown: fRisk?.maxDrawdown ?? null,
    sharpe: fRisk?.sharpeRatio ?? null,
    sortino: fRisk?.sortinoRatio ?? null,
    calmar: fRisk?.calmarRatio ?? null,
    ulcerIndex: fRisk?.ulcerIndex ?? null,
    treynor: fRisk?.treynorRatio ?? null,

    // Benchmark Relative (CAPM)
    alpha: capm?.alpha ?? null,
    beta: capm?.beta ?? null,
    rSquared: capm?.rSquared ?? null,
    trackingError: capm?.trackingError ?? null,
    infoRatio: regression?.informationRatio ?? null,
    upCapture: dualBeta?.upCapture ?? null,
    downCapture: dualBeta?.downCapture ?? null,
    captureRatio: dualBeta?.captureRatio ?? null
  };
}

/**
 * Builds profiles for an array of funds against a designated benchmark.
 */
export function screenAndProfileFunds(fundsList, benchmarkFund, options = {}) {
  if (!Array.isArray(fundsList)) return [];
  const profiles = [];

  fundsList.forEach(fund => {
    if (fund && fund.data && fund.data.length >= 6) {
      profiles.push(buildFundScreenerProfile(fund, benchmarkFund, options));
    }
  });

  return profiles;
}

/**
 * Filters fund profiles based on search query, fund type, asset class, sub-category, history length,
 * expense ratio, and metric thresholds.
 */
export function filterFundProfiles(profiles, filters = {}) {
  if (!Array.isArray(profiles)) return [];

  const query = (filters.searchQuery || '').trim().toLowerCase();
  const fundType = filters.fundType || 'all';
  const assetClass = filters.assetClass || 'all';
  const subCategory = filters.subCategory || 'all';
  const minHistoryYears = filters.minHistoryYears ? parseInt(filters.minHistoryYears, 10) : 0;
  const maxExpenseRatio = filters.maxExpenseRatio != null && filters.maxExpenseRatio !== 'all'
    ? parseFloat(filters.maxExpenseRatio)
    : null;
  const minSharpe = filters.minSharpe != null ? parseFloat(filters.minSharpe) : null;
  const maxVol = filters.maxVol != null ? parseFloat(filters.maxVol) : null;
  const maxDrawdown = filters.maxDrawdown != null ? parseFloat(filters.maxDrawdown) : null;

  return profiles.filter(p => {
    // 1. Text Search (Ticker, Name, Asset Class, Category, Fund Type)
    if (query) {
      const match = p.ticker.toLowerCase().includes(query) ||
                    p.name.toLowerCase().includes(query) ||
                    p.assetClass.toLowerCase().includes(query) ||
                    p.category.toLowerCase().includes(query) ||
                    p.fundType.toLowerCase().includes(query);
      if (!match) return false;
    }

    // 2. Fund Type Filter (ETF, Mutual Fund, Closed-End Fund)
    if (fundType !== 'all') {
      if (p.fundType.toLowerCase() !== fundType.toLowerCase()) return false;
    }

    // 3. Asset Class Filter (11 Canonical PV Asset Classes)
    if (assetClass !== 'all') {
      if (p.assetClass.toLowerCase() !== assetClass.toLowerCase()) return false;
    }

    // 4. Sub-Category Filter (Drill-down Category)
    if (subCategory !== 'all') {
      if (!p.category.toLowerCase().includes(subCategory.toLowerCase())) return false;
    }

    // 5. Expense Ratio Threshold Filter
    if (maxExpenseRatio != null && !isNaN(maxExpenseRatio)) {
      if (p.expenseRatio && p.expenseRatio !== '—') {
        const erNum = parseFloat(p.expenseRatio.replace('%', '')) / 100;
        if (!isNaN(erNum) && erNum > maxExpenseRatio) return false;
      }
    }

    // 6. Minimum History Years (12 months per year)
    if (minHistoryYears > 0) {
      if (p.monthsCount < minHistoryYears * 12) return false;
    }

    // 7. Metric Thresholds
    if (minSharpe != null && !isNaN(minSharpe)) {
      if (p.sharpe == null || p.sharpe < minSharpe) return false;
    }

    if (maxVol != null && !isNaN(maxVol)) {
      if (p.volatility == null || p.volatility > maxVol) return false;
    }

    if (maxDrawdown != null && !isNaN(maxDrawdown)) {
      // Note: maxDrawdown is negative (e.g. -0.25). A filter of "Max DD <= -30%" means no worse than -0.30
      if (p.maxDrawdown == null || p.maxDrawdown < maxDrawdown) return false;
    }

    return true;
  });
}

/**
 * Metric directionality: true if higher is better; false if lower is better (e.g. maxDrawdown, volatility).
 */
export const METRIC_DIRECTION = {
  cagr: true,
  ytd: true,
  return1y: true,
  return3y: true,
  return5y: true,
  return10y: true,
  sharpe: true,
  sortino: true,
  calmar: true,
  treynor: true,
  alpha: true,
  upCapture: true,
  captureRatio: true,
  infoRatio: true,
  rSquared: true,
  volatility: false,
  downsideDeviation: false,
  maxDrawdown: true, // For maxDrawdown, -10% is greater than -50%, so descending sort puts least negative (-10%) on top!
  ulcerIndex: false,
  trackingError: false,
  downCapture: false
};

/**
 * Ranks fund profiles by a specified metric, assigning ordinal rank (#1..#N) and percentile rank.
 * @param {Array<object>} profiles
 * @param {string} [rankMetric='sharpe']
 * @param {boolean} [invertDirection=false]
 * @returns {Array<object>} Sorted and ranked profiles
 */
export function rankFundProfiles(profiles, rankMetric = 'sharpe', invertDirection = false) {
  if (!Array.isArray(profiles) || profiles.length === 0) return [];

  const isHigherBetter = METRIC_DIRECTION[rankMetric] !== false;
  const sortDescending = invertDirection ? !isHigherBetter : isHigherBetter;

  // Clone profiles
  const sorted = [...profiles].sort((a, b) => {
    const valA = a[rankMetric];
    const valB = b[rankMetric];

    if (valA == null && valB == null) return 0;
    if (valA == null) return 1;
    if (valB == null) return -1;

    return sortDescending ? valB - valA : valA - valB;
  });

  const total = sorted.length;

  return sorted.map((p, idx) => {
    const rank = idx + 1;
    // Percentile: top rank is 100%, last rank is (1 / total) * 100
    const percentile = total > 1 ? Math.round(((total - idx) / total) * 100) : 100;

    let percentileBadge = `${percentile}th Pct`;
    if (percentile >= 95) percentileBadge = 'Top 5%';
    else if (percentile >= 90) percentileBadge = 'Top 10%';
    else if (percentile >= 80) percentileBadge = 'Top 20%';
    else if (percentile <= 20) percentileBadge = 'Bottom 20%';

    return {
      ...p,
      rank,
      percentile,
      percentileBadge,
      rankMetric,
      rankValue: p[rankMetric]
    };
  });
}
