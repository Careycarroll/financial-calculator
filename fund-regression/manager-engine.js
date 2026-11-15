/**
 * Manager Performance Analysis Engine
 * 
 * Provides institutional evaluation of active manager / fund performance vs. benchmark:
 * 1. Annualized Excess Return & Tracking Error (Active Risk)
 * 2. Information Ratio (IR = Excess Return / Tracking Error)
 * 3. Trailing Performance Scorecard (1Y, 3Y, 5Y, 10Y, Full Period)
 * 4. Excess Return Distribution Statistics (Mean, Median, Skewness, Kurtosis, Win Rate)
 * 5. Up vs. Down Market Regime Performance & Asymmetric Capture Analysis
 * 6. Annual Excess Returns Breakdown by Calendar Year
 * 7. Rolling 36-Month Excess Return, Tracking Error, and Information Ratio
 * 8. Absolute vs. Relative Drawdown Analysis (Peak-to-Trough relative underperformance)
 * 9. Manager Skill vs. Luck Statistical Significance Test (t-stat, p-value, confidence intervals)
 */

import { computeMonthlyReturns, alignReturns, runCAPMRegression } from './regression-engine.js';

export { computeMonthlyReturns, alignReturns };

/**
 * Computes arithmetic and geometric annualized excess returns.
 * @param {number} cagrFund 
 * @param {number} cagrBench 
 * @param {number} meanMonthlyDiff 
 * @returns {{ arithmetic: number, geometric: number }}
 */
export function calculateExcessReturns(cagrFund, cagrBench, meanMonthlyDiff) {
  return {
    arithmetic: meanMonthlyDiff * 12,
    geometric: (1 + cagrFund) / (1 + cagrBench) - 1
  };
}

/**
 * Computes Sample Tracking Error (annualized standard deviation of excess returns).
 * @param {Array<number>} excessReturns - Monthly return differences (rFund - rBench)
 * @returns {{ trackingError: number, meanExcess: number, variance: number }}
 */
export function calculateTrackingError(excessReturns) {
  const n = excessReturns.length;
  if (n < 2) return { trackingError: 0, meanExcess: 0, variance: 0 };

  const mean = excessReturns.reduce((a, b) => a + b, 0) / n;
  const variance = excessReturns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (n - 1);
  const trackingError = Math.sqrt(Math.max(0, variance)) * Math.sqrt(12);

  return {
    trackingError,
    meanExcess: mean,
    variance
  };
}

/**
 * Computes Trailing Period Performance Metrics (1Y, 3Y, 5Y, 10Y, and Inception).
 * @param {Array<{date: string, rFund: number, rBench: number}>} alignedPairs
 * @param {number} annualRf
 * @returns {Array<Object>} Trailing periods scorecard
 */
export function computeTrailingPerformance(alignedPairs, annualRf = 0.03) {
  const n = alignedPairs.length;
  const windows = [
    { label: '1 Year', months: 12 },
    { label: '3 Years', months: 36 },
    { label: '5 Years', months: 60 },
    { label: '10 Years', months: 120 },
    { label: 'Full Period', months: n }
  ];

  return windows
    .filter(w => w.months <= n)
    .map(w => {
      const slice = alignedPairs.slice(n - w.months);
      const k = slice.length;
      const years = k / 12;

      // Compound growth
      let fundComp = 1;
      let benchComp = 1;
      const diffs = [];

      slice.forEach(p => {
        fundComp *= (1 + p.rFund);
        benchComp *= (1 + p.rBench);
        diffs.push(p.rFund - p.rBench);
      });

      const fundCagr = Math.pow(fundComp, 1 / years) - 1;
      const benchCagr = Math.pow(benchComp, 1 / years) - 1;
      const teData = calculateTrackingError(diffs);
      const excessReturn = fundCagr - benchCagr;
      const informationRatio = teData.trackingError > 1e-6 ? excessReturn / teData.trackingError : 0;

      const capm = runCAPMRegression(slice, annualRf);

      return {
        label: w.label,
        months: k,
        startDate: slice[0].date,
        endDate: slice[k - 1].date,
        fundReturn: fundCagr,
        benchReturn: benchCagr,
        excessReturn,
        trackingError: teData.trackingError,
        informationRatio,
        alpha: capm.annualizedAlpha,
        beta: capm.beta,
        rSquared: capm.rSquared
      };
    });
}

/**
 * Computes shape & distribution statistics of monthly active excess returns.
 * @param {Array<{date: string, rFund: number, rBench: number}>} alignedPairs
 * @returns {Object} Distribution profile
 */
export function computeExcessReturnDistribution(alignedPairs) {
  const n = alignedPairs.length;
  if (n < 3) return null;

  const diffs = alignedPairs.map(p => ({
    date: p.date,
    diff: p.rFund - p.rBench,
    rBench: p.rBench
  }));

  const rawDiffs = diffs.map(d => d.diff);
  const meanMonthly = rawDiffs.reduce((a, b) => a + b, 0) / n;
  const annualExcess = meanMonthly * 12;

  // Median
  const sorted = [...rawDiffs].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Variance & Standard Deviation
  const variance = rawDiffs.reduce((acc, d) => acc + Math.pow(d - meanMonthly, 2), 0) / (n - 1);
  const stdev = Math.sqrt(Math.max(0, variance));

  // Skewness: n / ((n - 1)(n - 2)) * sum(((d - mean) / stdev)^3)
  let skewness = 0;
  let excessKurtosis = 0;

  if (stdev > 1e-8 && n > 3) {
    let sumCube = 0;
    let sumQuad = 0;
    for (let i = 0; i < n; i++) {
      const z = (rawDiffs[i] - meanMonthly) / stdev;
      sumCube += Math.pow(z, 3);
      sumQuad += Math.pow(z, 4);
    }
    skewness = (n / ((n - 1) * (n - 2))) * sumCube;

    // Excess Kurtosis (Fisher): [n(n+1) / ((n-1)(n-2)(n-3))] * sumQuad - [3(n-1)^2 / ((n-2)(n-3))]
    const kTerm1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const kTerm2 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    excessKurtosis = kTerm1 * sumQuad - kTerm2;
  }

  // Best & Worst Monthly Excess Return
  let best = diffs[0];
  let worst = diffs[0];
  let winCount = 0;
  let upWinCount = 0;
  let upTotalCount = 0;
  let downWinCount = 0;
  let downTotalCount = 0;

  diffs.forEach(d => {
    if (d.diff > best.diff) best = d;
    if (d.diff < worst.diff) worst = d;
    if (d.diff > 0) winCount++;

    if (d.rBench > 0) {
      upTotalCount++;
      if (d.diff > 0) upWinCount++;
    } else {
      downTotalCount++;
      if (d.diff > 0) downWinCount++;
    }
  });

  return {
    meanMonthlyExcess: meanMonthly,
    annualizedExcess: annualExcess,
    medianMonthlyExcess: median,
    annualizedTrackingError: stdev * Math.sqrt(12),
    skewness,
    excessKurtosis,
    bestMonth: { date: best.date, excess: best.diff },
    worstMonth: { date: worst.date, excess: worst.diff },
    totalPeriods: n,
    winCount,
    winRate: winCount / n,
    upWinRate: upTotalCount > 0 ? upWinCount / upTotalCount : 0,
    downWinRate: downTotalCount > 0 ? downWinCount / downTotalCount : 0,
    upTotalCount,
    downTotalCount
  };
}

/**
 * Analyzes manager behavior across bull and bear market regimes.
 * @param {Array<{date: string, rFund: number, rBench: number}>} alignedPairs
 * @returns {Object} Up/Down Market Regime profile
 */
export function computeMarketRegimeAnalysis(alignedPairs) {
  const upMonths = alignedPairs.filter(p => p.rBench > 0);
  const downMonths = alignedPairs.filter(p => p.rBench <= 0);

  function analyzeRegime(months) {
    const k = months.length;
    if (k === 0) return { count: 0, avgFund: 0, avgBench: 0, avgActive: 0, winRate: 0, captureRatio: 0 };

    let sumF = 0;
    let sumB = 0;
    let win = 0;
    let compF = 1;
    let compB = 1;

    months.forEach(m => {
      sumF += m.rFund;
      sumB += m.rBench;
      if (m.rFund > m.rBench) win++;
      compF *= (1 + m.rFund);
      compB *= (1 + m.rBench);
    });

    const totF = compF - 1;
    const totB = compB - 1;
    const capture = Math.abs(totB) > 1e-6 ? (totF / totB) * 100 : 100;

    return {
      count: k,
      avgFundMonthly: sumF / k,
      avgBenchMonthly: sumB / k,
      avgActiveMonthly: (sumF - sumB) / k,
      avgActiveAnnual: ((sumF - sumB) / k) * 12,
      winCount: win,
      winRate: win / k,
      captureRatio: capture
    };
  }

  const up = analyzeRegime(upMonths);
  const down = analyzeRegime(downMonths);
  const overallCaptureRatio = down.captureRatio !== 0 ? Math.abs(up.captureRatio / down.captureRatio) : 0;

  return {
    upMarket: up,
    downMarket: down,
    captureRatioSpread: overallCaptureRatio
  };
}

/**
 * Groups monthly returns by calendar year and computes annual excess return.
 * @param {Array<{date: string, rFund: number, rBench: number}>} alignedPairs
 * @returns {Array<Object>} Calendar year breakdown
 */
export function computeAnnualExcessReturns(alignedPairs) {
  const byYear = {};

  alignedPairs.forEach(p => {
    const yr = p.date.substring(0, 4);
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(p);
  });

  const years = Object.keys(byYear).sort();
  return years.map(yr => {
    const months = byYear[yr];
    let fundComp = 1;
    let benchComp = 1;

    months.forEach(m => {
      fundComp *= (1 + m.rFund);
      benchComp *= (1 + m.rBench);
    });

    const fundRet = fundComp - 1;
    const benchRet = benchComp - 1;
    const excessRet = fundRet - benchRet;

    return {
      year: yr,
      monthsCount: months.length,
      fundReturn: fundRet,
      benchReturn: benchRet,
      excessReturn: excessRet,
      isBenchPositive: benchRet >= 0
    };
  });
}

/**
 * Computes rolling window excess returns and tracking error (e.g. 36 months).
 * @param {Array<{date: string, rFund: number, rBench: number}>} alignedPairs
 * @param {number} windowMonths
 * @returns {Array<Object>} Rolling time series
 */
export function computeRollingManagerMetrics(alignedPairs, windowMonths = 36) {
  const n = alignedPairs.length;
  if (n < windowMonths) return [];

  const results = [];
  const years = windowMonths / 12;

  for (let i = windowMonths - 1; i < n; i++) {
    const slice = alignedPairs.slice(i - windowMonths + 1, i + 1);
    let fundComp = 1;
    let benchComp = 1;
    const diffs = [];

    slice.forEach(p => {
      fundComp *= (1 + p.rFund);
      benchComp *= (1 + p.rBench);
      diffs.push(p.rFund - p.rBench);
    });

    const fundCagr = Math.pow(fundComp, 1 / years) - 1;
    const benchCagr = Math.pow(benchComp, 1 / years) - 1;
    const excessAnnual = fundCagr - benchCagr;

    const teData = calculateTrackingError(diffs);
    const ir = teData.trackingError > 1e-6 ? excessAnnual / teData.trackingError : 0;

    results.push({
      date: alignedPairs[i].date,
      excessReturn: excessAnnual,
      trackingError: teData.trackingError,
      informationRatio: ir,
      fundCagr,
      benchCagr
    });
  }

  return results;
}

/**
 * Computes absolute and relative (excess return) drawdowns.
 * Relative drawdown tracks the percentage decline in the Manager/Benchmark relative wealth ratio.
 * @param {Array<{date: string, rFund: number, rBench: number}>} alignedPairs
 * @returns {Object} Drawdown trajectories & extreme drawdown statistics
 */
export function computeRelativeDrawdowns(alignedPairs) {
  const n = alignedPairs.length;
  if (n === 0) return null;

  const dates = [];
  const fundTrajectory = [10000];
  const benchTrajectory = [10000];
  const fundDrawdown = [0];
  const benchDrawdown = [0];
  const relativeWealth = [1.0];
  const relativeDrawdown = [0];

  let peakFund = 10000;
  let peakBench = 10000;
  let peakRelWealth = 1.0;

  let maxFundDD = 0;
  let maxBenchDD = 0;
  let maxRelDD = 0;
  let maxRelDate = alignedPairs[0].date;

  for (let i = 0; i < n; i++) {
    const date = alignedPairs[i].date;
    dates.push(date);

    const fVal = fundTrajectory[i] * (1 + alignedPairs[i].rFund);
    const bVal = benchTrajectory[i] * (1 + alignedPairs[i].rBench);
    fundTrajectory.push(fVal);
    benchTrajectory.push(bVal);

    if (fVal > peakFund) peakFund = fVal;
    if (bVal > peakBench) peakBench = bVal;

    const fDD = (fVal - peakFund) / peakFund;
    const bDD = (bVal - peakBench) / peakBench;
    fundDrawdown.push(fDD);
    benchDrawdown.push(bDD);

    if (fDD < maxFundDD) maxFundDD = fDD;
    if (bDD < maxBenchDD) maxBenchDD = bDD;

    // Relative wealth index: fVal / bVal
    const relW = fVal / bVal;
    relativeWealth.push(relW);

    if (relW > peakRelWealth) peakRelWealth = relW;
    const relDD = (relW - peakRelWealth) / peakRelWealth;
    relativeDrawdown.push(relDD);

    if (relDD < maxRelDD) {
      maxRelDD = relDD;
      maxRelDate = date;
    }
  }

  return {
    dates,
    fundTrajectory,
    benchTrajectory,
    fundDrawdown,
    benchDrawdown,
    relativeWealth,
    relativeDrawdown,
    maxFundDrawdown: maxFundDD,
    maxBenchDrawdown: maxBenchDD,
    maxRelativeDrawdown: maxRelDD,
    maxRelativeDrawdownDate: maxRelDate
  };
}

/**
 * Standard Normal Cumulative Distribution Function approximation (Abramowitz & Stegun).
 * @param {number} x
 * @returns {number} Probability P(Z <= x)
 */
function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const prob = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - prob : prob;
}

/**
 * Calculates Student's t-statistic and statistical significance of manager outperformance.
 * Tests H0: Active return is random luck (excess return <= 0) vs H1: Genuine skill (excess return > 0).
 * @param {Array<{date: string, rFund: number, rBench: number}>} alignedPairs
 * @param {number} [confidenceLevel=0.80] - Confidence level (e.g. 0.80, 0.90, 0.95)
 * @returns {Object} Statistical confidence profile
 */
export function computeManagerSkillConfidence(alignedPairs, confidenceLevel = 0.80) {
  const n = alignedPairs.length;
  if (n < 6) {
    return {
      tStat: 0,
      pValue: 1.0,
      isSignificant: false,
      confidenceLevel,
      lowerBoundAnnual: 0,
      upperBoundAnnual: 0,
      summary: 'Insufficient data for statistical skill testing.'
    };
  }

  const diffs = alignedPairs.map(p => p.rFund - p.rBench);
  const meanM = diffs.reduce((a, b) => a + b, 0) / n;
  const varianceM = diffs.reduce((acc, d) => acc + Math.pow(d - meanM, 2), 0) / (n - 1);
  const seM = Math.sqrt(varianceM / n);

  const tStat = seM > 1e-10 ? meanM / seM : 0;
  // One-tailed p-value for H0: mean <= 0
  const pValue = 1 - normalCdf(tStat);

  // Critical z / t value approximation for confidence intervals
  const zCritMap = {
    0.80: 1.282,
    0.90: 1.645,
    0.95: 1.960,
    0.99: 2.576
  };
  const zCrit = zCritMap[confidenceLevel] || 1.282;

  const marginAnnual = zCrit * seM * 12;
  const meanAnnual = meanM * 12;

  const isSignificant = pValue < (1 - confidenceLevel);

  let summary = '';
  if (tStat > 2.0 && pValue < 0.05) {
    summary = `High statistical confidence (t = ${tStat.toFixed(2)}, p = ${pValue.toFixed(3)}). Outperformance demonstrates genuine manager skill beyond luck.`;
  } else if (tStat > 1.28 && pValue < 0.15) {
    summary = `Moderate statistical confidence (t = ${tStat.toFixed(2)}, p = ${pValue.toFixed(3)}). Manager exhibits positive active return, with mild sampling variance.`;
  } else if (tStat <= 0) {
    summary = `Negative active return (t = ${tStat.toFixed(2)}). Fund underperformed the benchmark over the analyzed period.`;
  } else {
    summary = `Inconclusive (t = ${tStat.toFixed(2)}, p = ${pValue.toFixed(3)}). Active returns are statistically indistinguishable from random market noise.`;
  }

  return {
    tStat,
    pValue,
    isSignificant,
    confidenceLevel,
    meanAnnualExcess: meanAnnual,
    lowerBoundAnnual: meanAnnual - marginAnnual,
    upperBoundAnnual: meanAnnual + marginAnnual,
    summary
  };
}

/**
 * Master Manager Performance Analysis Orchestrator.
 * Compiles complete active manager scorecard vs reference benchmark.
 * 
 * @param {Object} managerFund - Manager fund object with { ticker, name, data: [{date, close, adjClose}] }
 * @param {Object} benchmarkFund - Benchmark fund object
 * @param {Object} [options]
 * @param {boolean} [options.useDRIP=true]
 * @param {number} [options.annualRf=0.03]
 * @param {number} [options.rollingMonths=36]
 * @param {number} [options.confidenceLevel=0.80]
 * @returns {Object} Full profile
 */
export function analyzeManagerPerformance(managerFund, benchmarkFund, options = {}) {
  const {
    useDRIP = true,
    annualRf = 0.03,
    rollingMonths = 36,
    confidenceLevel = 0.80
  } = options;

  const fundReturns = computeMonthlyReturns(managerFund.data, useDRIP);
  const benchReturns = computeMonthlyReturns(benchmarkFund.data, useDRIP);

  const aligned = alignReturns(fundReturns, benchReturns);
  if (aligned.length < 6) {
    throw new Error(`Insufficient overlapping history (${aligned.length} months). Need at least 6 months.`);
  }

  const trailing = computeTrailingPerformance(aligned, annualRf);
  const distribution = computeExcessReturnDistribution(aligned);
  const regimes = computeMarketRegimeAnalysis(aligned);
  const annualExcess = computeAnnualExcessReturns(aligned);
  const rolling = computeRollingManagerMetrics(aligned, rollingMonths);
  const drawdowns = computeRelativeDrawdowns(aligned);
  const skill = computeManagerSkillConfidence(aligned, confidenceLevel);

  // High-level summary metrics
  const fullTrailing = trailing.find(t => t.label === 'Full Period') || trailing[trailing.length - 1];

  return {
    manager: {
      ticker: managerFund.ticker.toUpperCase(),
      name: managerFund.name || managerFund.ticker.toUpperCase(),
      color: managerFund.color || '#38bdf8'
    },
    benchmark: {
      ticker: benchmarkFund.ticker.toUpperCase(),
      name: benchmarkFund.name || benchmarkFund.ticker.toUpperCase(),
      color: benchmarkFund.color || '#94a3b8'
    },
    startDate: aligned[0].date,
    endDate: aligned[aligned.length - 1].date,
    totalMonths: aligned.length,
    annualRf,
    rollingMonths,
    confidenceLevel,
    fullTrailing,
    trailing,
    distribution,
    regimes,
    annualExcess,
    rolling,
    drawdowns,
    skill
  };
}

/**
 * Canonical institutional presets for Brinson performance attribution.
 */
export const BRINSON_PRESETS = {
  'active-growth': {
    label: 'US Large Growth vs S&P 500 (GICS Sectors)',
    description: 'Active growth equity manager with significant technology overweight and financial/industrial underweight.',
    sectors: [
      { name: 'Information Technology', portfolioWeight: 0.48, benchmarkWeight: 0.30, portfolioReturn: 0.26, benchmarkReturn: 0.22 },
      { name: 'Communication Services', portfolioWeight: 0.16, benchmarkWeight: 0.09, portfolioReturn: 0.19, benchmarkReturn: 0.15 },
      { name: 'Consumer Discretionary', portfolioWeight: 0.14, benchmarkWeight: 0.10, portfolioReturn: 0.14, benchmarkReturn: 0.12 },
      { name: 'Financials', portfolioWeight: 0.04, benchmarkWeight: 0.13, portfolioReturn: 0.12, benchmarkReturn: 0.10 },
      { name: 'Health Care', portfolioWeight: 0.08, benchmarkWeight: 0.12, portfolioReturn: 0.08, benchmarkReturn: 0.07 },
      { name: 'Industrials', portfolioWeight: 0.04, benchmarkWeight: 0.09, portfolioReturn: 0.11, benchmarkReturn: 0.13 },
      { name: 'Energy', portfolioWeight: 0.01, benchmarkWeight: 0.04, portfolioReturn: 0.05, benchmarkReturn: 0.06 },
      { name: 'Consumer Staples', portfolioWeight: 0.02, benchmarkWeight: 0.06, portfolioReturn: 0.04, benchmarkReturn: 0.05 },
      { name: 'Utilities & Real Estate', portfolioWeight: 0.01, benchmarkWeight: 0.05, portfolioReturn: 0.02, benchmarkReturn: 0.04 },
      { name: 'Cash & Equivalents', portfolioWeight: 0.02, benchmarkWeight: 0.02, portfolioReturn: 0.045, benchmarkReturn: 0.045 }
    ]
  },
  'global-multi-asset': {
    label: 'Global Multi-Asset Endowment vs 60/40',
    description: 'Diversified institutional endowment competing against a canonical 60% US Equity / 40% Aggregate Bond benchmark.',
    sectors: [
      { name: 'US Equities (Large Cap)', portfolioWeight: 0.40, benchmarkWeight: 0.60, portfolioReturn: 0.16, benchmarkReturn: 0.15 },
      { name: 'International Developed', portfolioWeight: 0.18, benchmarkWeight: 0.00, portfolioReturn: 0.12, benchmarkReturn: 0.09 },
      { name: 'Emerging Market Equities', portfolioWeight: 0.10, benchmarkWeight: 0.00, portfolioReturn: 0.14, benchmarkReturn: 0.08 },
      { name: 'Core Fixed Income', portfolioWeight: 0.15, benchmarkWeight: 0.40, portfolioReturn: 0.03, benchmarkReturn: 0.02 },
      { name: 'Private Real Estate / Infrastructure', portfolioWeight: 0.12, benchmarkWeight: 0.00, portfolioReturn: 0.10, benchmarkReturn: 0.05 },
      { name: 'Cash & Short T-Bills', portfolioWeight: 0.05, benchmarkWeight: 0.00, portfolioReturn: 0.045, benchmarkReturn: 0.045 }
    ]
  },
  'value-dividend': {
    label: 'Value / Quality vs S&P 500',
    description: 'Defensive dividend strategy overweighting cash-generative Financials, Staples, and Industrials.',
    sectors: [
      { name: 'Financials', portfolioWeight: 0.28, benchmarkWeight: 0.13, portfolioReturn: 0.15, benchmarkReturn: 0.12 },
      { name: 'Industrials', portfolioWeight: 0.20, benchmarkWeight: 0.09, portfolioReturn: 0.14, benchmarkReturn: 0.12 },
      { name: 'Consumer Staples', portfolioWeight: 0.18, benchmarkWeight: 0.06, portfolioReturn: 0.09, benchmarkReturn: 0.06 },
      { name: 'Health Care', portfolioWeight: 0.14, benchmarkWeight: 0.12, portfolioReturn: 0.10, benchmarkReturn: 0.08 },
      { name: 'Energy', portfolioWeight: 0.10, benchmarkWeight: 0.04, portfolioReturn: 0.12, benchmarkReturn: 0.07 },
      { name: 'Information Technology', portfolioWeight: 0.08, benchmarkWeight: 0.30, portfolioReturn: 0.20, benchmarkReturn: 0.24 },
      { name: 'Communication Services', portfolioWeight: 0.02, benchmarkWeight: 0.09, portfolioReturn: 0.11, benchmarkReturn: 0.16 }
    ]
  }
};

/**
 * Calculates single-period Brinson-Fachler (BF) and Brinson-Hood-Beebower (BHB)
 * performance attribution:
 *
 * 1. Allocation Effect:
 *    - BF:  A_i = (w_{p,i} - w_{b,i}) * (R_{b,i} - R_b)
 *    - BHB: A_i = (w_{p,i} - w_{b,i}) * R_{b,i}
 * 2. Selection Effect:
 *    - S_i = w_{b,i} * (R_{p,i} - R_{b,i})
 * 3. Interaction Effect:
 *    - I_i = (w_{p,i} - w_{b,i}) * (R_{p,i} - R_{b,i})
 * 4. Combined Selection (2-Factor):
 *    - S_{comb,i} = S_i + I_i = w_{p,i} * (R_{p,i} - R_{b,i})
 *
 * Mathematical Identity:
 * A_total + S_total + I_total = R_p - R_b (Active Return)
 *
 * References: Bodie, Kane & Marcus, Investments, Chapter 24, Section 24.5.
 *
 * @param {Array<{name: string, portfolioWeight: number, benchmarkWeight: number, portfolioReturn: number, benchmarkReturn: number}>} sectors
 * @param {Object} [options={}]
 * @param {('brinson-fachler'|'brinson-hood-beebower')} [options.model='brinson-fachler']
 * @returns {Object} Complete attribution decomposition with exact identity check
 */
export function calculateBrinsonAttribution(sectors, options = {}) {
  const model = options.model === 'brinson-hood-beebower' ? 'brinson-hood-beebower' : 'brinson-fachler';

  if (!Array.isArray(sectors) || sectors.length === 0) {
    return {
      model,
      portfolioReturn: 0,
      benchmarkReturn: 0,
      activeReturn: 0,
      totalAllocation: 0,
      totalSelection: 0,
      totalInteraction: 0,
      totalCombinedSelection: 0,
      totalSum: 0,
      residual: 0,
      identityVerified: true,
      rows: []
    };
  }

  // Normalize weights if needed
  const rawSumWp = sectors.reduce((acc, s) => acc + (Number(s.portfolioWeight) || 0), 0);
  const rawSumWb = sectors.reduce((acc, s) => acc + (Number(s.benchmarkWeight) || 0), 0);
  const sumWp = rawSumWp > 0 ? rawSumWp : 1;
  const sumWb = rawSumWb > 0 ? rawSumWb : 1;

  const normSectors = sectors.map(s => ({
    name: s.name || 'Unnamed Sector',
    wp: (Number(s.portfolioWeight) || 0) / sumWp,
    wb: (Number(s.benchmarkWeight) || 0) / sumWb,
    rp: Number(s.portfolioReturn) || 0,
    rb: Number(s.benchmarkReturn) || 0
  }));

  const totalRp = normSectors.reduce((acc, s) => acc + s.wp * s.rp, 0);
  const totalRb = normSectors.reduce((acc, s) => acc + s.wb * s.rb, 0);
  const activeReturn = totalRp - totalRb;

  let totalAllocation = 0;
  let totalSelection = 0;
  let totalInteraction = 0;

  const rows = normSectors.map(s => {
    const activeWeight = s.wp - s.wb;
    const activeSectorReturn = s.rp - s.rb;

    let allocation;
    if (model === 'brinson-hood-beebower') {
      allocation = activeWeight * s.rb;
    } else {
      allocation = activeWeight * (s.rb - totalRb);
    }

    const selection = s.wb * activeSectorReturn;
    const interaction = activeWeight * activeSectorReturn;
    const combinedSelection = selection + interaction;
    const totalEffect = allocation + selection + interaction;

    totalAllocation += allocation;
    totalSelection += selection;
    totalInteraction += interaction;

    return {
      name: s.name,
      portfolioWeight: s.wp,
      benchmarkWeight: s.wb,
      activeWeight,
      portfolioReturn: s.rp,
      benchmarkReturn: s.rb,
      activeSectorReturn,
      allocation,
      selection,
      interaction,
      combinedSelection,
      totalEffect
    };
  });

  const totalSum = totalAllocation + totalSelection + totalInteraction;
  const residual = activeReturn - totalSum;

  return {
    model,
    portfolioReturn: totalRp,
    benchmarkReturn: totalRb,
    activeReturn,
    totalAllocation,
    totalSelection,
    totalInteraction,
    totalCombinedSelection: totalSelection + totalInteraction,
    totalSum,
    residual,
    identityVerified: Math.abs(residual) < 1e-10,
    rows
  };
}
