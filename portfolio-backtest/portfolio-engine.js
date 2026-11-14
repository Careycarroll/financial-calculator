/**
 * Portfolio Backtest & Rebalancing Engine
 * 
 * Provides:
 * 1. Multi-asset date alignment and common timeline clipping
 * 2. Multi-portfolio side-by-side simulation (e.g. Portfolio 1, 2, 3 vs Benchmark)
 * 3. Periodic Rebalancing (Monthly, Quarterly, Semi-Annual, Annual, or Buy-and-Hold / Drift)
 * 4. Cashflow modeling (Initial capital, ongoing monthly/annual contributions or withdrawals)
 * 5. Institutional-grade Risk & Return Analytics:
 *    - Time-Weighted CAGR
 *    - Annualized Volatility (Standard Deviation)
 *    - Sharpe Ratio (using configurable risk-free rate)
 *    - Sortino Ratio (downside semivariance)
 *    - Maximum Drawdown & Underwater time series
 *    - Calendar Annual Returns (Best Year, Worst Year)
 *    - Asset Allocation Drift tracking (monthly actual weights)
 *    - Benchmark Correlation
 */

/**
 * Standard Model Presets for quick 1-click allocation setup
 */
export const PORTFOLIO_PRESETS = [
  {
    id: 'sixty-forty',
    name: 'Classic 60/40',
    description: '60% Large Cap Equity (VOO) / 40% Total Bond Market (BND). The traditional balanced baseline.',
    allocations: [
      { ticker: 'VOO', weight: 60 },
      { ticker: 'BND', weight: 40 }
    ]
  },
  {
    id: 'aggressive-growth',
    name: 'Aggressive Growth (80/20)',
    description: '50% S&P 500 (VOO), 30% Tech (QQQ), 20% Fixed Income (BND). Higher upside with downside cushion.',
    allocations: [
      { ticker: 'VOO', weight: 50 },
      { ticker: 'QQQ', weight: 30 },
      { ticker: 'BND', weight: 20 }
    ]
  },
  {
    id: 'three-fund',
    name: 'Three-Fund Balanced',
    description: '50% Core Equity (VOO), 25% Dividend Equity (SCHD), 25% Total Bond (BND). Diversified income & growth.',
    allocations: [
      { ticker: 'VOO', weight: 50 },
      { ticker: 'SCHD', weight: 25 },
      { ticker: 'BND', weight: 25 }
    ]
  },
  {
    id: 'barbell',
    name: 'Tech & Dividend Barbell',
    description: '50% Nasdaq-100 Growth (QQQ) balanced with 50% High-Quality Dividend Cashflow (SCHD).',
    allocations: [
      { ticker: 'QQQ', weight: 50 },
      { ticker: 'SCHD', weight: 50 }
    ]
  },
  {
    id: 'all-weather',
    name: 'Conservative All-Weather',
    description: '30% S&P 500 (VOO), 20% Dividend (SCHD), 50% Bonds (BND). Capital preservation focus.',
    allocations: [
      { ticker: 'VOO', weight: 30 },
      { ticker: 'SCHD', weight: 20 },
      { ticker: 'BND', weight: 50 }
    ]
  }
];

/**
 * Validates and normalizes allocation weights to guarantee a 100% total sum.
 * @param {Array<{ticker: string, weight: number}>} allocations
 * @returns {{ valid: boolean, totalWeight: number, normalized: Array<{ticker: string, weight: number, targetShare: number}> }}
 */
export function validateAllocations(allocations) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    return { valid: false, totalWeight: 0, normalized: [] };
  }

  // Filter out empty tickers or zero/negative weights
  const active = allocations
    .filter(a => a && a.ticker && typeof a.ticker === 'string' && a.ticker.trim() !== '')
    .map(a => ({
      ticker: a.ticker.trim().toUpperCase(),
      weight: Math.max(0, Number(a.weight) || 0)
    }));

  const totalWeight = active.reduce((sum, a) => sum + a.weight, 0);
  const isValid = Math.abs(totalWeight - 100) < 0.05; // Accept 99.95 to 100.05

  const normalized = active.map(a => ({
    ticker: a.ticker,
    weight: a.weight,
    targetShare: totalWeight > 0 ? a.weight / totalWeight : 0
  }));

  return {
    valid: isValid && active.length > 0,
    totalWeight: Math.round(totalWeight * 100) / 100,
    normalized
  };
}

/**
 * Finds the common overlapping date range across an array of fund objects.
 * @param {Array<{ticker: string, data: Array<{date: string}>}>} funds
 * @returns {{ start: string, end: string, limitingFund: string, totalMonths: number }}
 */
export function findCommonDateRange(funds) {
  if (!funds || funds.length === 0) {
    return { start: '', end: '', limitingFund: '', totalMonths: 0 };
  }

  let maxStart = funds[0].data[0]?.date || '';
  let minEnd = funds[0].data[funds[0].data.length - 1]?.date || '';
  let limitingFund = funds[0].ticker || 'Asset 1';

  for (let i = 0; i < funds.length; i++) {
    const f = funds[i];
    if (!f.data || f.data.length === 0) continue;
    const fStart = f.data[0].date;
    const fEnd = f.data[f.data.length - 1].date;

    if (fStart > maxStart) {
      maxStart = fStart;
      limitingFund = f.ticker;
    }
    if (fEnd < minEnd) {
      minEnd = fEnd;
    }
  }

  let totalMonths = 0;
  if (maxStart && minEnd && maxStart <= minEnd) {
    const ref = funds[0].data.filter(d => d.date >= maxStart && d.date <= minEnd);
    totalMonths = ref.length;
  }

  return {
    start: maxStart,
    end: minEnd,
    limitingFund,
    totalMonths
  };
}

/**
 * Checks whether the current month index qualifies for periodic rebalancing.
 * @param {string} frequency - 'none' | 'annual' | 'semi-annual' | 'quarterly' | 'monthly'
 * @param {number} monthIndex - 0-based month index (1 for first step)
 * @param {string} date - 'YYYY-MM'
 * @returns {boolean}
 */
export function shouldRebalance(frequency, monthIndex, date) {
  if (monthIndex === 0) return false;
  if (!frequency || frequency === 'none') return false;
  if (frequency === 'monthly') return true;

  const monthNum = parseInt(date.substring(5, 7), 10); // 1 to 12

  if (frequency === 'quarterly') {
    // Rebalance at end of Q1 (Mar), Q2 (Jun), Q3 (Sep), Q4 (Dec)
    return monthNum % 3 === 0;
  }

  if (frequency === 'semi-annual') {
    // Rebalance in June and December
    return monthNum === 6 || monthNum === 12;
  }

  if (frequency === 'annual') {
    // Rebalance in December (calendar year end) or every 12 months
    return monthNum === 12;
  }

  return false;
}

/**
 * Calculates risk-adjusted performance metrics for a portfolio simulation series.
 * @param {Array<{date: string, portfolioValue: number, monthlyReturn: number}>} trajectory
 * @param {number} initialBalance
 * @param {number} totalContributed
 * @param {number} annualRf - e.g. 0.03
 * @returns {Object}
 */
export function calculatePortfolioMetrics(trajectory, initialBalance, totalContributed, annualRf = 0.03) {
  if (!trajectory || trajectory.length < 2) {
    return {
      initialBalance,
      finalBalance: initialBalance,
      totalContributed,
      totalGain: 0,
      totalReturnPct: 0,
      cagr: 0,
      annualVolatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      bestYear: { year: '--', return: 0 },
      worstYear: { year: '--', return: 0 },
      annualReturns: []
    };
  }

  const finalBalance = trajectory[trajectory.length - 1].portfolioValue;
  const totalGain = finalBalance - totalContributed;
  const totalReturnPct = totalContributed > 0 ? (totalGain / totalContributed) * 100 : 0;

  // Monthly returns series (excluding T=0)
  const returns = trajectory.slice(1).map(t => t.monthlyReturn);
  const nMonths = returns.length;
  const nYears = nMonths / 12;

  // 1. Time-Weighted CAGR
  let compoundedGrowth = 1;
  returns.forEach(r => { compoundedGrowth *= (1 + r); });
  const cagr = nYears > 0 ? Math.pow(compoundedGrowth, 1 / nYears) - 1 : 0;

  // 2. Annualized Volatility
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / nMonths;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (nMonths - 1);
  const monthlyVol = Math.sqrt(variance);
  const annualVolatility = monthlyVol * Math.sqrt(12);

  // 3. Sharpe Ratio
  const sharpeRatio = annualVolatility > 1e-4 ? (cagr - annualRf) / annualVolatility : 0;

  // 4. Downside Semivariance & Sortino Ratio
  const monthlyRf = annualRf / 12;
  const downsideDiffs = returns.filter(r => r < monthlyRf).map(r => Math.pow(r - monthlyRf, 2));
  const downsideVariance = downsideDiffs.length > 0
    ? downsideDiffs.reduce((sum, v) => sum + v, 0) / nMonths
    : 0;
  const downsideDev = Math.sqrt(downsideVariance) * Math.sqrt(12);
  const sortinoRatio = downsideDev > 1e-4 ? (cagr - annualRf) / downsideDev : 0;

  // 5. Maximum Drawdown & Peak-to-Trough
  let peak = trajectory[0].portfolioValue;
  let maxDrawdown = 0;
  for (let i = 0; i < trajectory.length; i++) {
    const val = trajectory[i].portfolioValue;
    if (val > peak) {
      peak = val;
    }
    const dd = peak > 0 ? (val - peak) / peak : 0;
    if (dd < maxDrawdown) {
      maxDrawdown = dd;
    }
  }

  // 6. Calendar Annual Returns
  const yearBuckets = new Map();
  trajectory.slice(1).forEach(t => {
    const yr = t.date.substring(0, 4);
    if (!yearBuckets.has(yr)) yearBuckets.set(yr, []);
    yearBuckets.get(yr).push(t.monthlyReturn);
  });

  const annualReturns = [];
  let bestYear = { year: '--', return: -Infinity };
  let worstYear = { year: '--', return: Infinity };

  yearBuckets.forEach((monthlyList, yr) => {
    let yrGrowth = 1;
    monthlyList.forEach(r => { yrGrowth *= (1 + r); });
    const yrReturn = yrGrowth - 1;

    annualReturns.push({ year: yr, return: yrReturn });

    if (yrReturn > bestYear.return) {
      bestYear = { year: yr, return: yrReturn };
    }
    if (yrReturn < worstYear.return) {
      worstYear = { year: yr, return: yrReturn };
    }
  });

  if (bestYear.return === -Infinity) bestYear = { year: '--', return: 0 };
  if (worstYear.return === Infinity) worstYear = { year: '--', return: 0 };

  return {
    initialBalance: Math.round(initialBalance * 100) / 100,
    finalBalance: Math.round(finalBalance * 100) / 100,
    totalContributed: Math.round(totalContributed * 100) / 100,
    totalGain: Math.round(totalGain * 100) / 100,
    totalReturnPct: Math.round(totalReturnPct * 100) / 100,
    cagr: Number(cagr.toFixed(4)),
    annualVolatility: Number(annualVolatility.toFixed(4)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    sortinoRatio: Number(sortinoRatio.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(4)),
    bestYear,
    worstYear,
    annualReturns
  };
}

/**
 * Simulates a single multi-asset portfolio with periodic rebalancing and cashflows.
 * @param {Array<string>} dates - Array of aligned dates 'YYYY-MM'
 * @param {Map<string, Array<{date: string, close: number, adjClose: number}>>} dataMap - Ticker to monthly price rows
 * @param {Array<{ticker: string, weight: number}>} allocations - Target allocation percentages
 * @param {Object} options
 * @param {number} [options.initialAmount=10000]
 * @param {string} [options.rebalancing='annual'] - 'none' | 'annual' | 'semi-annual' | 'quarterly' | 'monthly'
 * @param {Object} [options.cashflow] - { type: 'none'|'contribute'|'withdraw', amount: number, frequency: 'monthly'|'annual' }
 * @param {boolean} [options.useDRIP=true]
 * @param {number} [options.annualRf=0.03]
 * @returns {Object} { trajectory, metrics, rebalanceCount }
 */
export function simulatePortfolio(dates, dataMap, allocations, options = {}) {
  const {
    initialAmount = 10000,
    rebalancing = 'annual',
    cashflow = { type: 'none', amount: 0, frequency: 'monthly' },
    useDRIP = true,
    annualRf = 0.03
  } = options;

  const validResult = validateAllocations(allocations);
  if (!validResult.valid || dates.length < 2) {
    return null;
  }

  const normalizedAllocations = validResult.normalized;
  const activeTickers = normalizedAllocations.map(a => a.ticker);

  // Verify all required tickers exist in dataMap
  for (const ticker of activeTickers) {
    if (!dataMap.has(ticker) || dataMap.get(ticker).length < dates.length) {
      return null;
    }
  }

  // Pre-index prices by ticker and date for O(1) lookup
  const priceMaps = new Map();
  activeTickers.forEach(ticker => {
    const pMap = new Map();
    dataMap.get(ticker).forEach(row => {
      pMap.set(row.date, useDRIP ? row.adjClose : row.close);
    });
    priceMaps.set(ticker, pMap);
  });

  const trajectory = [];
  let totalContributed = initialAmount;
  let rebalanceCount = 0;

  // Initialize Month 0 (T=0)
  const initialBalances = {};
  const initialWeights = {};
  normalizedAllocations.forEach(a => {
    initialBalances[a.ticker] = initialAmount * a.targetShare;
    initialWeights[a.ticker] = a.weight;
  });

  trajectory.push({
    date: dates[0],
    portfolioValue: initialAmount,
    netContribution: totalContributed,
    cashflow: 0,
    assetBalances: { ...initialBalances },
    assetWeights: { ...initialWeights },
    monthlyReturn: 0,
    rebalanced: false
  });

  let currentBalances = { ...initialBalances };

  // Run Monthly Step Simulation
  for (let t = 1; t < dates.length; t++) {
    const prevDate = dates[t - 1];
    const currDate = dates[t];

    // 1. Asset Price Growth
    let portfolioValuePre = 0;
    const preGrowthBalances = {};

    activeTickers.forEach(ticker => {
      const pPrev = priceMaps.get(ticker).get(prevDate);
      const pCurr = priceMaps.get(ticker).get(currDate);
      const r = (pPrev && pPrev > 0) ? (pCurr - pPrev) / pPrev : 0;

      const grownVal = currentBalances[ticker] * (1 + r);
      preGrowthBalances[ticker] = grownVal;
      portfolioValuePre += grownVal;
    });

    // 2. Pure Time-Weighted Monthly Return
    const prevTotal = trajectory[t - 1].portfolioValue;
    const monthlyReturn = prevTotal > 0 ? (portfolioValuePre - prevTotal) / prevTotal : 0;

    // 3. Cashflow Addition / Withdrawal
    let cfDelta = 0;
    const monthNum = parseInt(currDate.substring(5, 7), 10);
    const isCashflowMonth = cashflow.frequency === 'monthly' || (cashflow.frequency === 'annual' && monthNum === 12);

    if (isCashflowMonth && cashflow.amount > 0) {
      if (cashflow.type === 'contribute') {
        cfDelta = cashflow.amount;
        totalContributed += cfDelta;
        // Allocate deposit proportionally to target shares
        normalizedAllocations.forEach(a => {
          preGrowthBalances[a.ticker] += cfDelta * a.targetShare;
        });
      } else if (cashflow.type === 'withdraw') {
        cfDelta = -cashflow.amount;
        totalContributed += cfDelta;
        // Deduct withdrawal proportionally from current balance
        if (portfolioValuePre > 0) {
          activeTickers.forEach(ticker => {
            const share = preGrowthBalances[ticker] / portfolioValuePre;
            preGrowthBalances[ticker] = Math.max(0, preGrowthBalances[ticker] - cashflow.amount * share);
          });
        }
      }
    }

    let portfolioValuePost = Object.values(preGrowthBalances).reduce((sum, v) => sum + v, 0);

    // 4. Periodic Rebalancing Check
    const isRebalance = shouldRebalance(rebalancing, t, currDate);
    if (isRebalance && portfolioValuePost > 0) {
      rebalanceCount++;
      normalizedAllocations.forEach(a => {
        preGrowthBalances[a.ticker] = portfolioValuePost * a.targetShare;
      });
    }

    currentBalances = { ...preGrowthBalances };

    // 5. Calculate Actual Ending Weights for Drift Analysis
    const actualWeights = {};
    activeTickers.forEach(ticker => {
      actualWeights[ticker] = portfolioValuePost > 0
        ? Math.round((currentBalances[ticker] / portfolioValuePost) * 10000) / 100
        : 0;
    });

    trajectory.push({
      date: currDate,
      portfolioValue: Math.round(portfolioValuePost * 100) / 100,
      netContribution: Math.round(totalContributed * 100) / 100,
      cashflow: cfDelta,
      assetBalances: { ...currentBalances },
      assetWeights: actualWeights,
      monthlyReturn: Number(monthlyReturn.toFixed(6)),
      rebalanced: isRebalance
    });
  }

  const metrics = calculatePortfolioMetrics(trajectory, initialAmount, totalContributed, annualRf);

  return {
    trajectory,
    metrics,
    rebalanceCount,
    allocations: normalizedAllocations
  };
}

/**
 * Computes Pearson correlation coefficient between two numeric return series.
 * @param {Array<number>} x
 * @param {Array<number>} y
 * @returns {number}
 */
export function calculateCorrelation(x, y) {
  if (!x || !y || x.length !== y.length || x.length < 2) return 0;
  const n = x.length;
  const meanX = x.reduce((sum, v) => sum + v, 0) / n;
  const meanY = y.reduce((sum, v) => sum + v, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den > 1e-8 ? Number((num / den).toFixed(2)) : 0;
}

/**
 * Master multi-portfolio backtesting orchestration pipeline.
 * Runs Portfolios 1, 2, 3 and Benchmark on the exact same unified historical date window.
 * @param {Array<Object>} fundsList - Array of available fund objects { ticker, name, data }
 * @param {Array<{id: string, name: string, color: string, allocations: Array<{ticker: string, weight: number}>}>} models
 * @param {string} benchmarkTicker - e.g. 'VOO'
 * @param {Object} options - Simulation options
 * @returns {Object} Complete simulation result with side-by-side portfolios and benchmark
 */
export function runMultiPortfolioBacktest(fundsList, models, benchmarkTicker = 'VOO', options = {}) {
  if (!fundsList || fundsList.length === 0 || !models || models.length === 0) {
    return null;
  }

  // 1. Build Ticker -> Fund Map
  const fundMap = new Map();
  fundsList.forEach(f => {
    if (f && f.ticker) fundMap.set(f.ticker.toUpperCase(), f);
  });

  // 2. Identify all required tickers across active models + benchmark
  const requiredTickers = new Set();
  const validModels = [];

  models.forEach(m => {
    const validation = validateAllocations(m.allocations);
    if (validation.valid) {
      validModels.push({
        ...m,
        validatedAllocations: validation.normalized
      });
      validation.normalized.forEach(a => requiredTickers.add(a.ticker));
    }
  });

  const benchTicker = (benchmarkTicker || 'VOO').trim().toUpperCase();
  if (fundMap.has(benchTicker)) {
    requiredTickers.add(benchTicker);
  }

  if (validModels.length === 0) {
    return { error: 'No valid portfolio models configured with 100% total allocation.' };
  }

  // Check that all required tickers exist in fundMap
  const missingTickers = [];
  requiredTickers.forEach(t => {
    if (!fundMap.has(t) || !fundMap.get(t).data || fundMap.get(t).data.length === 0) {
      missingTickers.push(t);
    }
  });

  if (missingTickers.length > 0) {
    return { error: `Missing historical price data for: ${missingTickers.join(', ')}` };
  }

  // 3. Find unified common date range across all needed assets
  const participatingFunds = Array.from(requiredTickers).map(t => fundMap.get(t));
  const commonRange = findCommonDateRange(participatingFunds);

  let start = options.customStart && options.customStart >= commonRange.start ? options.customStart : commonRange.start;
  let end = options.customEnd && options.customEnd <= commonRange.end ? options.customEnd : commonRange.end;

  if (!start || !end || start > end) {
    return { error: 'No overlapping historical date range found across selected portfolio assets.' };
  }

  // 4. Align dates across all funds
  const dateSet = new Set(participatingFunds[0].data.map(d => d.date));
  participatingFunds.slice(1).forEach(f => {
    const currentDates = new Set(f.data.map(d => d.date));
    dateSet.forEach(d => {
      if (!currentDates.has(d)) dateSet.delete(d);
    });
  });

  const unifiedDates = Array.from(dateSet).filter(d => d >= start && d <= end).sort();
  if (unifiedDates.length < 3) {
    return { error: 'Insufficient overlapping monthly history (at least 3 months required).' };
  }

  // Create aligned data map
  const alignedDataMap = new Map();
  participatingFunds.forEach(f => {
    const dateToRow = new Map(f.data.map(d => [d.date, d]));
    const alignedRows = unifiedDates.map(d => dateToRow.get(d));
    alignedDataMap.set(f.ticker.toUpperCase(), alignedRows);
  });

  // 5. Simulate each active portfolio
  const portfolioResults = [];
  validModels.forEach(m => {
    const sim = simulatePortfolio(unifiedDates, alignedDataMap, m.validatedAllocations, options);
    if (sim) {
      portfolioResults.push({
        id: m.id,
        name: m.name,
        color: m.color || '#3b82f6',
        allocations: m.validatedAllocations,
        trajectory: sim.trajectory,
        metrics: sim.metrics,
        rebalanceCount: sim.rebalanceCount
      });
    }
  });

  // 6. Simulate the Benchmark (100% allocation to benchmark asset)
  let benchmarkResult = null;
  if (alignedDataMap.has(benchTicker)) {
    const benchSim = simulatePortfolio(
      unifiedDates,
      alignedDataMap,
      [{ ticker: benchTicker, weight: 100 }],
      { ...options, rebalancing: 'none' } // Benchmark is single asset
    );
    if (benchSim) {
      const benchFund = fundMap.get(benchTicker);
      benchmarkResult = {
        ticker: benchTicker,
        name: benchFund?.name || `${benchTicker} Benchmark`,
        color: '#94a3b8',
        trajectory: benchSim.trajectory,
        metrics: benchSim.metrics
      };
    }
  }

  // 7. Calculate Correlation of each portfolio against Benchmark
  if (benchmarkResult) {
    const benchReturns = benchmarkResult.trajectory.slice(1).map(t => t.monthlyReturn);
    portfolioResults.forEach(p => {
      const pReturns = p.trajectory.slice(1).map(t => t.monthlyReturn);
      p.correlationToBenchmark = calculateCorrelation(pReturns, benchReturns);
    });
  }

  return {
    dates: unifiedDates,
    startDate: unifiedDates[0],
    endDate: unifiedDates[unifiedDates.length - 1],
    totalMonths: unifiedDates.length,
    portfolios: portfolioResults,
    benchmark: benchmarkResult
  };
}
