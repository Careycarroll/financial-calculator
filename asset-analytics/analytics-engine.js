/**
 * Asset Analytics Engine
 * Pure ES module for deep-dive fund performance analysis, underwater drawdown tracking,
 * calendar return heatmaps, and rolling window diagnostics.
 */

import {
  computeMonthlyReturns,
  alignReturns,
  runCAPMRegression,
  computeRiskMetrics,
  computeDualBetaAndCapture,
  computeRollingRegression,
  analyzeFundRegression
} from '../fund-regression/regression-engine.js';
import {
  computeTailRiskMetrics,
  calculateHistoricalVaR,
  calculateHistoricalCVaR,
  calculateParametricVaR,
  calculateParametricCVaR,
  calculateCornishFisherVaR,
  calculateCornishFisherCVaR
} from './tail-risk.js';

/**
 * Computes Growth of a fixed principal (e.g. $10,000) over aligned monthly return series.
 * Supports dividend reinvestment and optional 0%-fee gross curve reconstruction.
 * @param {Array<{date: string, return: number}>} fundReturns - Fund monthly returns
 * @param {Array<{date: string, return: number}>} benchReturns - Benchmark monthly returns (optional)
 * @param {number} [initialAmount=10000] - Starting balance
 * @param {object|number} [options={}] - Options object or numeric annual fee %
 * @returns {Array<{date: string, fundGrowth: number, grossFundGrowth: number, benchGrowth: number|null}>}
 */
export function calculateGrowthOf10k(fundReturns, benchReturns = [], initialAmount = 10000, options = {}) {
  if (!fundReturns || fundReturns.length === 0) return [];

  const benchMap = new Map();
  if (benchReturns) {
    benchReturns.forEach(b => benchMap.set(b.date, b.return));
  }

  const rawFee = typeof options === 'number' ? options : (options?.annualExpenseRatio || 0);
  const er = typeof rawFee === 'string' ? parseFloat(rawFee.replace('%', '')) : rawFee;
  const mFee = (!isNaN(er) && er > 0) ? (er / 100) / 12 : 0;

  const results = [];
  let fundValue = initialAmount;
  let grossFundValue = initialAmount;
  let benchValue = benchReturns && benchReturns.length > 0 ? initialAmount : null;

  // Add initial period (T=0)
  results.push({
    date: fundReturns[0].date,
    fundGrowth: initialAmount,
    grossFundGrowth: initialAmount,
    benchGrowth: benchValue
  });

  for (let i = 0; i < fundReturns.length; i++) {
    const f = fundReturns[i];
    fundValue *= (1 + f.return);
    grossFundValue *= (1 + f.return + mFee);

    if (benchValue !== null && benchMap.has(f.date)) {
      benchValue *= (1 + benchMap.get(f.date));
    }

    results.push({
      date: f.date,
      fundGrowth: Math.round(fundValue * 100) / 100,
      grossFundGrowth: Math.round(grossFundValue * 100) / 100,
      benchGrowth: benchValue !== null ? Math.round(benchValue * 100) / 100 : null
    });
  }

  return results;
}

/**
 * Calculates cumulative fee drag, cash fees paid, and lost opportunity cost for an asset series.
 * @param {Array<{date: string, return: number}>} fundReturns
 * @param {number|string} annualExpenseRatio - e.g. 0.20 or "0.20%"
 * @param {number} [initialAmount=10000]
 * @returns {object}
 */
export function calculateFundFeeDrag(fundReturns, annualExpenseRatio, initialAmount = 10000) {
  const er = typeof annualExpenseRatio === 'string' ? parseFloat(annualExpenseRatio.replace('%', '')) : annualExpenseRatio;
  if (!fundReturns || fundReturns.length === 0 || !er || isNaN(er) || er <= 0) {
    return {
      annualExpenseRatio: 0,
      totalFeesPaid: 0,
      compoundedFeeDrag: 0,
      lostOpportunityCost: 0,
      feeErosionPct: 0,
      grossFinal: initialAmount,
      netFinal: initialAmount
    };
  }

  const mFee = (er / 100) / 12;
  let netVal = initialAmount;
  let grossVal = initialAmount;
  let totalFees = 0;

  for (let i = 0; i < fundReturns.length; i++) {
    const rNet = fundReturns[i].return;
    const rGross = rNet + mFee;
    const fee = netVal * mFee;
    totalFees += fee;

    netVal *= (1 + rNet);
    grossVal *= (1 + rGross);
  }

  const feeDrag = Math.max(0, grossVal - netVal);
  const oppCost = Math.max(0, feeDrag - totalFees);
  const grossProfit = grossVal - initialAmount;
  const feeErosionPct = grossProfit > 0 ? (feeDrag / grossProfit) * 100 : 0;

  return {
    annualExpenseRatio: er,
    totalFeesPaid: Math.round(totalFees * 100) / 100,
    compoundedFeeDrag: Math.round(feeDrag * 100) / 100,
    lostOpportunityCost: Math.round(oppCost * 100) / 100,
    feeErosionPct: Math.round(feeErosionPct * 100) / 100,
    grossFinal: Math.round(grossVal * 100) / 100,
    netFinal: Math.round(netVal * 100) / 100
  };
}

/**
 * Computes calendar year-by-year compounded returns for fund and benchmark.
 * @param {Array<{date: string, return: number}>} fundReturns
 * @param {Array<{date: string, return: number}>} benchReturns
 * @returns {Array<{year: number, fundReturn: number, benchReturn: number|null, excessReturn: number|null, monthCount: number}>}
 */
export function calculateAnnualReturns(fundReturns, benchReturns = []) {
  if (!fundReturns || fundReturns.length === 0) return [];

  const benchMap = new Map();
  if (benchReturns) {
    benchReturns.forEach(b => benchMap.set(b.date, b.return));
  }

  // Group by year
  const yearGroups = new Map();

  fundReturns.forEach(f => {
    const year = parseInt(f.date.substring(0, 4), 10);
    if (!yearGroups.has(year)) {
      yearGroups.set(year, { fund: [], bench: [] });
    }
    const grp = yearGroups.get(year);
    grp.fund.push(f.return);
    if (benchMap.has(f.date)) {
      grp.bench.push(benchMap.get(f.date));
    }
  });

  const sortedYears = Array.from(yearGroups.keys()).sort((a, b) => a - b);
  const annualResults = [];

  sortedYears.forEach(yr => {
    const grp = yearGroups.get(yr);
    const fundCompound = grp.fund.reduce((acc, r) => acc * (1 + r), 1) - 1;
    let benchCompound = null;
    let excess = null;

    if (grp.bench.length > 0 && grp.bench.length === grp.fund.length) {
      benchCompound = grp.bench.reduce((acc, r) => acc * (1 + r), 1) - 1;
      excess = fundCompound - benchCompound;
    }

    annualResults.push({
      year: yr,
      fundReturn: fundCompound,
      benchReturn: benchCompound,
      excessReturn: excess,
      monthCount: grp.fund.length
    });
  });

  return annualResults;
}

/**
 * Identifies discrete historical drawdown episodes (crashes), tracking peak, trough,
 * recovery, depth %, and duration in months.
 * @param {Array<{date: string, return: number}>} returns - Monthly return series
 * @returns {{
 *   timeline: Array<{date: string, drawdown: number, hwm: number}>,
 *   topEpisodes: Array<{peakDate: string, troughDate: string, recoveryDate: string|null, depth: number, monthsToTrough: number, monthsToRecover: number|null, totalMonths: number|null, isOngoing: boolean}>,
 *   maxDrawdown: number
 * }}
 */
export function calculateDrawdownEpisodes(returns) {
  if (!returns || returns.length === 0) {
    return { timeline: [], topEpisodes: [], maxDrawdown: 0 };
  }

  // 1. Build cumulative price index and high-water mark timeline
  let priceIndex = 1000.0;
  let hwm = 1000.0;
  const timeline = [];

  returns.forEach(r => {
    priceIndex *= (1 + r.return);
    if (priceIndex > hwm) {
      hwm = priceIndex;
    }
    const dd = (priceIndex - hwm) / hwm; // <= 0
    timeline.push({
      date: r.date,
      drawdown: dd,
      hwm: hwm,
      price: priceIndex
    });
  });

  // 2. Identify discrete drawdown episodes
  const episodes = [];
  let inDrawdown = false;
  let currentEpisode = null;

  for (let i = 0; i < timeline.length; i++) {
    const t = timeline[i];

    if (!inDrawdown && t.drawdown < -0.00001) {
      // Drawdown begins. The peak is the previous month (i - 1), or current if i == 0
      inDrawdown = true;
      const peakIndex = Math.max(0, i - 1);
      currentEpisode = {
        peakIndex: peakIndex,
        peakDate: timeline[peakIndex].date,
        troughIndex: i,
        troughDate: t.date,
        depth: t.drawdown,
        recoveryIndex: null,
        recoveryDate: null,
        isOngoing: true
      };
    } else if (inDrawdown) {
      // Check if new deepest trough in this episode
      if (t.drawdown < currentEpisode.depth) {
        currentEpisode.depth = t.drawdown;
        currentEpisode.troughIndex = i;
        currentEpisode.troughDate = t.date;
      }

      // Check if recovered (back to or above previous peak)
      if (t.drawdown >= -0.00001) {
        inDrawdown = false;
        currentEpisode.recoveryIndex = i;
        currentEpisode.recoveryDate = t.date;
        currentEpisode.isOngoing = false;

        const monthsToTrough = currentEpisode.troughIndex - currentEpisode.peakIndex;
        const monthsToRecover = currentEpisode.recoveryIndex - currentEpisode.troughIndex;
        const totalMonths = currentEpisode.recoveryIndex - currentEpisode.peakIndex;

        episodes.push({
          peakDate: currentEpisode.peakDate,
          troughDate: currentEpisode.troughDate,
          recoveryDate: currentEpisode.recoveryDate,
          depth: currentEpisode.depth,
          monthsToTrough: Math.max(1, monthsToTrough),
          monthsToRecover: Math.max(0, monthsToRecover),
          totalMonths: Math.max(1, totalMonths),
          isOngoing: false
        });
        currentEpisode = null;
      }
    }
  }

  // If ended in an ongoing drawdown
  if (inDrawdown && currentEpisode) {
    const monthsToTrough = currentEpisode.troughIndex - currentEpisode.peakIndex;
    const ongoingDuration = (timeline.length - 1) - currentEpisode.peakIndex;

    episodes.push({
      peakDate: currentEpisode.peakDate,
      troughDate: currentEpisode.troughDate,
      recoveryDate: null,
      depth: currentEpisode.depth,
      monthsToTrough: Math.max(1, monthsToTrough),
      monthsToRecover: null,
      totalMonths: Math.max(1, ongoingDuration),
      isOngoing: true
    });
  }

  // Sort episodes by depth ascending (deepest crashes first)
  const sortedEpisodes = [...episodes].sort((a, b) => a.depth - b.depth);

  const maxDrawdown = sortedEpisodes.length > 0 ? sortedEpisodes[0].depth : 0;

  return {
    timeline: timeline.map(t => ({ date: t.date, drawdown: t.drawdown, hwm: t.hwm })),
    topEpisodes: sortedEpisodes,
    maxDrawdown: maxDrawdown
  };
}

/**
 * Builds the 12-month calendar heatmap matrix (Jan through Dec + Annual return).
 * @param {Array<{date: string, return: number}>} returns - Monthly return series
 * @returns {Array<{year: number, months: Array<number|null>, annualReturn: number}>}
 */
export function calculateMonthlyCalendarHeatmap(returns) {
  if (!returns || returns.length === 0) return [];

  const yearMap = new Map();

  returns.forEach(r => {
    const year = parseInt(r.date.substring(0, 4), 10);
    const month = parseInt(r.date.substring(5, 7), 10); // 1 to 12

    if (!yearMap.has(year)) {
      yearMap.set(year, new Array(12).fill(null));
    }
    const monthArr = yearMap.get(year);
    monthArr[month - 1] = r.return;
  });

  const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a); // Most recent year first
  const matrix = [];

  sortedYears.forEach(year => {
    const months = yearMap.get(year);
    // Compounded return for available months
    const validReturns = months.filter(m => m !== null);
    const annualReturn = validReturns.reduce((acc, r) => acc * (1 + r), 1) - 1;

    matrix.push({
      year: year,
      months: months,
      annualReturn: annualReturn
    });
  });

  return matrix;
}

/**
 * Computes rolling period metrics (e.g. 12M, 36M, 60M rolling CAGR, rolling Sharpe, and outperformance win rate).
 * @param {Array<{date: string, return: number}>} fundReturns
 * @param {Array<{date: string, return: number}>} benchReturns
 * @param {number} [windowMonths=36] - Window size in months
 * @param {number} [annualRf=0.03] - Risk-free rate
 * @returns {{
 *   windows: Array<{date: string, fundCagr: number, benchCagr: number|null, fundVol: number, fundSharpe: number}>,
 *   winRate: number,
 *   totalWindows: number,
 *   outperformedWindows: number,
 *   medianFundCagr: number,
 *   medianBenchCagr: number|null
 * }}
 */
export function calculateRollingMetrics(fundReturns, benchReturns = [], windowMonths = 36, annualRf = 0.03) {
  if (!fundReturns || fundReturns.length < windowMonths) {
    return {
      windows: [],
      winRate: 0,
      totalWindows: 0,
      outperformedWindows: 0,
      medianFundCagr: 0,
      medianBenchCagr: null
    };
  }

  const benchMap = new Map();
  if (benchReturns) {
    benchReturns.forEach(b => benchMap.set(b.date, b.return));
  }

  const monthlyRf = Math.pow(1 + annualRf, 1 / 12) - 1;
  const windows = [];
  let winCount = 0;
  let comparableWindows = 0;

  for (let i = windowMonths - 1; i < fundReturns.length; i++) {
    const windowSlice = fundReturns.slice(i - windowMonths + 1, i + 1);
    const endDate = fundReturns[i].date;

    // Compound product for window
    const fundCompound = windowSlice.reduce((acc, r) => acc * (1 + r.return), 1);
    const fundCagr = Math.pow(fundCompound, 12 / windowMonths) - 1;

    // Standard deviation
    const fundMean = windowSlice.reduce((acc, r) => acc + r.return, 0) / windowMonths;
    const fundVar = windowSlice.reduce((acc, r) => acc + Math.pow(r.return - fundMean, 2), 0) / (windowMonths - 1);
    const fundVol = Math.sqrt(fundVar) * Math.sqrt(12);

    const fundExcessReturn = fundCagr - annualRf;
    const fundSharpe = fundVol > 0.0001 ? fundExcessReturn / fundVol : 0;

    // Benchmark comparison
    let benchCagr = null;
    let hasAllBench = true;
    let benchCompound = 1.0;

    for (let k = 0; k < windowSlice.length; k++) {
      const dt = windowSlice[k].date;
      if (benchMap.has(dt)) {
        benchCompound *= (1 + benchMap.get(dt));
      } else {
        hasAllBench = false;
        break;
      }
    }

    if (hasAllBench && benchCompound > 0) {
      benchCagr = Math.pow(benchCompound, 12 / windowMonths) - 1;
      comparableWindows++;
      if (fundCagr > benchCagr) {
        winCount++;
      }
    }

    windows.push({
      date: endDate,
      fundCagr: fundCagr,
      benchCagr: benchCagr,
      fundVol: fundVol,
      fundSharpe: fundSharpe
    });
  }

  const winRate = comparableWindows > 0 ? (winCount / comparableWindows) * 100 : 0;

  // Compute medians
  const fundCagrs = windows.map(w => w.fundCagr).sort((a, b) => a - b);
  const benchCagrs = windows.map(w => w.benchCagr).filter(b => b !== null).sort((a, b) => a - b);

  const medianFund = fundCagrs.length > 0 ? fundCagrs[Math.floor(fundCagrs.length / 2)] : 0;
  const medianBench = benchCagrs.length > 0 ? benchCagrs[Math.floor(benchCagrs.length / 2)] : null;

  return {
    windows: windows,
    winRate: Math.round(winRate * 10) / 10,
    totalWindows: comparableWindows,
    outperformedWindows: winCount,
    medianFundCagr: medianFund,
    medianBenchCagr: medianBench
  };
}

/**
 * Computes Historical, Parametric, and Cornish-Fisher Modified Value-at-Risk (VaR)
 * and Conditional VaR (CVaR / Expected Shortfall) across 95% and 99% horizons.
 * 
 * References: Bodie, Kane & Marcus, Investments, Chapter 5.5.
 * 
 * @param {Array<{date: string, return: number}|number>} returns - Monthly return series
 * @param {number} [confidence=0.95]
 * @returns {{
 *   varMonthly: number,
 *   cvarMonthly: number,
 *   varAnnualized: number,
 *   historicalVaR: number,
 *   historicalCVaR: number,
 *   parametricVaR: number,
 *   parametricCVaR: number,
 *   cornishFisherVaR: number,
 *   cornishFisherCVaR: number,
 *   tailRisk: Object
 * }}
 */
export function calculateVaRAndCVaR(returns, confidence = 0.95) {
  if (!returns || returns.length === 0) {
    return {
      varMonthly: 0,
      cvarMonthly: 0,
      varAnnualized: 0,
      historicalVaR: 0,
      historicalCVaR: 0,
      parametricVaR: 0,
      parametricCVaR: 0,
      cornishFisherVaR: 0,
      cornishFisherCVaR: 0,
      tailRisk: null
    };
  }

  const rawReturns = returns.map(r => typeof r === 'number' ? r : r.return);
  const tailRisk = computeTailRiskMetrics(rawReturns);

  const is99 = confidence >= 0.985;
  const histVaR = is99 ? tailRisk.var99.historical : tailRisk.var95.historical;
  const histCVaR = is99 ? tailRisk.cvar99.historical : tailRisk.cvar95.historical;
  const paramVaR = is99 ? tailRisk.var99.parametric : tailRisk.var95.parametric;
  const paramCVaR = is99 ? tailRisk.cvar99.parametric : tailRisk.cvar95.parametric;
  const cfVaR = is99 ? tailRisk.var99.cornishFisher : tailRisk.var95.cornishFisher;
  const cfCVaR = is99 ? tailRisk.cvar99.cornishFisher : tailRisk.cvar95.cornishFisher;

  // Primary reported monthly VaR and CVaR default to Cornish-Fisher (higher-order corrected)
  const varMonthly = cfVaR;
  const cvarMonthly = cfCVaR;
  const varAnnualized = varMonthly * Math.sqrt(12);

  return {
    varMonthly,
    cvarMonthly,
    varAnnualized,
    historicalVaR: histVaR,
    historicalCVaR: histCVaR,
    parametricVaR: paramVaR,
    parametricCVaR: paramCVaR,
    cornishFisherVaR: cfVaR,
    cornishFisherCVaR: cfCVaR,
    tailRisk
  };
}

/**
 * Generates an executive plain-English diagnostic verdict for learners (Simple Mode).
 * @param {Object} fundProfile - Output from analyzeFundRegression
 * @param {Object} benchProfile - Output for benchmark
 * @param {Array} topEpisodes - Output from calculateDrawdownEpisodes
 * @param {Object} rollingStats - Output from calculateRollingMetrics
 * @returns {{ summary: string, riskVerdict: string, winVerdict: string, badge: string }}
 */
export function generateSimpleVerdict(fundProfile, benchProfile, topEpisodes, rollingStats, feeDragInfo = null) {
  if (!fundProfile) {
    return { summary: '', riskVerdict: '', winVerdict: '', badge: 'Neutral', feeVerdict: '' };
  }

  const cagrPct = (fundProfile.cagr * 100).toFixed(1);
  const benchCagrPct = benchProfile ? (benchProfile.cagr * 100).toFixed(1) : null;
  const volPct = (fundProfile.volatility * 100).toFixed(1);
  const maxDdPct = (Math.abs(fundProfile.maxDrawdown) * 100).toFixed(1);
  const beta = fundProfile.beta !== undefined ? fundProfile.beta.toFixed(2) : '1.00';
  const sharpe = fundProfile.sharpe !== undefined ? fundProfile.sharpe.toFixed(2) : '0.00';

  let summary = `Turned $10,000 into a compounded annualized return of **${cagrPct}%**`;
  if (benchCagrPct) {
    summary += ` (vs **${benchCagrPct}%** for the benchmark).`;
  } else {
    summary += '.';
  }

  // Risk profile text
  let riskVerdict = '';
  if (fundProfile.beta < 0.75) {
    riskVerdict = `Exhibits **defensive, low-market sensitivity** (Beta ${beta}) with ${volPct}% annual volatility and a max crash of -${maxDdPct}%.`;
  } else if (fundProfile.beta > 1.25) {
    riskVerdict = `Exhibits **aggressive, high-beta amplification** (Beta ${beta}) with elevated ${volPct}% annual volatility and a max crash of -${maxDdPct}%.`;
  } else {
    riskVerdict = `Moves **in lockstep with the broader market** (Beta ${beta}) with ${volPct}% annual volatility and a max crash of -${maxDdPct}%.`;
  }

  if (topEpisodes && topEpisodes.length > 0) {
    const worst = topEpisodes[0];
    const recText = worst.isOngoing ? 'currently in progress' : `recovered in ${worst.monthsToRecover} months`;
    riskVerdict += ` Deepest historical decline hit -${(Math.abs(worst.depth) * 100).toFixed(1)}% (${worst.troughDate}, ${recText}).`;
  }

  // Rolling win rate verdict
  let winVerdict = '';
  if (rollingStats && rollingStats.totalWindows > 0) {
    winVerdict = `Outperformed the benchmark in **${rollingStats.winRate}%** of 36-month holding periods (${rollingStats.outperformedWindows} of ${rollingStats.totalWindows} windows).`;
  }

  // Fee drag verdict
  let feeVerdict = '';
  if (feeDragInfo && feeDragInfo.annualExpenseRatio > 0 && feeDragInfo.compoundedFeeDrag > 0) {
    const erStr = feeDragInfo.annualExpenseRatio.toFixed(2);
    const dragStr = `$${Math.round(feeDragInfo.compoundedFeeDrag).toLocaleString()}`;
    const paidStr = `$${Math.round(feeDragInfo.totalFeesPaid).toLocaleString()}`;
    const oppStr = `$${Math.round(feeDragInfo.lostOpportunityCost).toLocaleString()}`;
    feeVerdict = `Stated **${erStr}% Expense Ratio** cost a total of **${dragStr}** on a $10,000 balance (${paidStr} direct fees + **${oppStr}** lost compounding).`;
  }

  // Overall badge
  let badge = 'Balanced';
  if (fundProfile.sharpe >= 1.0 && fundProfile.alpha > 0.02) {
    badge = 'Strong Outperformer';
  } else if (fundProfile.sharpe < 0.5) {
    badge = 'High Risk / Low Reward';
  } else if (fundProfile.beta < 0.7) {
    badge = 'Defensive Preserver';
  }

  return {
    summary: summary,
    riskVerdict: riskVerdict,
    winVerdict: winVerdict,
    feeVerdict: feeVerdict,
    badge: badge
  };
}

export {
  computeMonthlyReturns,
  alignReturns,
  runCAPMRegression,
  computeRiskMetrics,
  computeDualBetaAndCapture,
  computeRollingRegression,
  analyzeFundRegression
};

export * from './tail-risk.js';
