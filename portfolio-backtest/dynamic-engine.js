/**
 * Dynamic Portfolio Allocation & Tactical Rules Engine
 * 
 * Provides:
 * 1. Multi-Stage Lifecycle & Glidepath target weight interpolation (Step vs Smooth Monthly Glidepath)
 * 2. Tactical Trend-Following filter (10-Month Simple Moving Average - Meb Faber model)
 * 3. 12-Month Dual Momentum Relative Strength rotation (Gary Antonacci model)
 * 4. Dynamic portfolio simulation with periodic rebalancing and cashflows
 * 5. Target weight trajectory history for High-DPI Stacked Area Canvas visualization
 * 6. Signal & Reallocation event logging
 */

import { calculatePortfolioMetrics, shouldRebalance } from './portfolio-engine.js';

export const DYNAMIC_PRESETS = [
  {
    id: 'lifecycle-target-date',
    name: 'Lifecycle Glide Path (Target Retirement)',
    mode: 'glidepath',
    tacticalRule: 'none',
    description: 'Classic institutional lifecycle glidepath: aggressive 90/10 in early accumulation, transitioning smoothly through 70/30 in mid-career to 40/60 in retirement.',
    stages: [
      {
        startMonth: '1972-01',
        label: 'Early Career (Aggressive)',
        allocations: [
          { assetId: 'TotalStockMarket', weight: 90 },
          { assetId: 'TotalBond', weight: 10 }
        ]
      },
      {
        startMonth: '1990-01',
        label: 'Mid Career (Diversification)',
        allocations: [
          { assetId: 'TotalStockMarket', weight: 65 },
          { assetId: 'IntlStockMarket', weight: 15 },
          { assetId: 'TotalBond', weight: 20 }
        ]
      },
      {
        startMonth: '2005-01',
        label: 'Pre-Retirement (Balanced)',
        allocations: [
          { assetId: 'TotalStockMarket', weight: 45 },
          { assetId: 'IntlStockMarket', weight: 15 },
          { assetId: 'TotalBond', weight: 30 },
          { assetId: 'REIT', weight: 10 }
        ]
      },
      {
        startMonth: '2016-01',
        label: 'Retirement (Capital Preservation)',
        allocations: [
          { assetId: 'TotalStockMarket', weight: 30 },
          { assetId: 'IntlStockMarket', weight: 10 },
          { assetId: 'TotalBond', weight: 40 },
          { assetId: 'ShortTreasury', weight: 10 },
          { assetId: 'Cash', weight: 10 }
        ]
      }
    ]
  },
  {
    id: 'two-stage-career',
    name: 'Two-Stage Career Pivot (Accumulation to Retirement)',
    mode: 'step',
    tacticalRule: 'none',
    description: 'A sharp, disciplined pivot at retirement age from 80/20 equity growth into a defensive 40/40/10/10 income portfolio.',
    stages: [
      {
        startMonth: '1972-01',
        label: 'Working & Accumulation (80/20)',
        allocations: [
          { assetId: 'TotalStockMarket', weight: 80 },
          { assetId: 'TotalBond', weight: 20 }
        ]
      },
      {
        startMonth: '2000-01',
        label: 'Retirement Decumulation',
        allocations: [
          { assetId: 'TotalStockMarket', weight: 40 },
          { assetId: 'TotalBond', weight: 40 },
          { assetId: 'REIT', weight: 10 },
          { assetId: 'Cash', weight: 10 }
        ]
      }
    ]
  },
  {
    id: 'trend-following-defense',
    name: '10-Month Trend Defense (60/40 + SMA Filter)',
    mode: 'step',
    tacticalRule: '10m_sma',
    defensiveAsset: 'Cash',
    description: 'Tactical trend following: maintains 60% Total US Stock and 40% Bonds, but automatically shifts any asset below its 10-month SMA into Cash to dodge bear markets.',
    stages: [
      {
        startMonth: '1972-01',
        label: 'Core Trend-Protected 60/40',
        allocations: [
          { assetId: 'TotalStockMarket', weight: 60 },
          { assetId: 'TotalBond', weight: 40 }
        ]
      }
    ]
  },
  {
    id: 'dual-momentum-gem',
    name: 'Global Dual Momentum (Antonacci GEM)',
    mode: 'step',
    tacticalRule: 'dual_momentum',
    defensiveAsset: 'TotalBond',
    description: 'Rotates between Total US Stock and International Stock based on 12-month relative strength. If both are negative, moves to Total Bond Market.',
    stages: [
      {
        startMonth: '1972-01',
        label: 'Dual Momentum Engine',
        allocations: [
          { assetId: 'TotalStockMarket', weight: 50 },
          { assetId: 'IntlStockMarket', weight: 50 }
        ]
      }
    ]
  }
];

/**
 * Computes Simple Moving Average (SMA) of adjusted close prices for a series.
 * @param {Array<{date: string, adjClose: number}>} series
 * @param {number} period - default 10
 * @returns {Array<number>}
 */
export function computeSMA(series, period = 10) {
  if (!series || series.length === 0) return [];
  const sma = [];
  for (let i = 0; i < series.length; i++) {
    if (i < period - 1) {
      sma.push(series[i].adjClose);
    } else {
      let sum = 0;
      for (let k = 0; k < period; k++) {
        sum += series[i - k].adjClose;
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

/**
 * Computes trailing momentum (period-over-period return).
 * @param {Array<{date: string, adjClose: number}>} series
 * @param {number} period - default 12
 * @returns {Array<number>}
 */
export function computeMomentum(series, period = 12) {
  if (!series || series.length === 0) return [];
  const mom = [];
  for (let i = 0; i < series.length; i++) {
    if (i < period) {
      mom.push(0);
    } else {
      const past = series[i - period].adjClose;
      const cur = series[i].adjClose;
      mom.push(past > 0 ? (cur - past) / past : 0);
    }
  }
  return mom;
}

/**
 * Resolves target asset weights for a specific date in a multi-stage schedule.
 * Handles both 'step' (jump) and 'glidepath' (linear monthly interpolation).
 * 
 * @param {string} date - 'YYYY-MM'
 * @param {Array<Object>} stages - Array of { startMonth, allocations: [{assetId, weight}] } sorted chronologically
 * @param {string} mode - 'step' | 'glidepath'
 * @returns {Map<string, number>} Map of assetId (uppercase) -> targetShare (0.0 to 1.0)
 */
export function getTargetWeightsForDate(date, stages, mode = 'step') {
  if (!stages || stages.length === 0) return new Map();

  // If only 1 stage, return its normalized weights
  if (stages.length === 1 || date <= stages[0].startMonth) {
    return normalizeAllocationsMap(stages[0].allocations);
  }

  // Find surrounding stages: stageA <= date < stageB
  let stageA = stages[0];
  let stageB = null;

  for (let i = 0; i < stages.length; i++) {
    if (stages[i].startMonth <= date) {
      stageA = stages[i];
      stageB = stages[i + 1] || null;
    } else {
      break;
    }
  }

  // If past final stage, return final stage weights
  if (!stageB || mode === 'step') {
    return normalizeAllocationsMap(stageA.allocations);
  }

  // Linear Glidepath Interpolation between stageA and stageB
  const monthsA = parseMonthToCount(stageA.startMonth);
  const monthsB = parseMonthToCount(stageB.startMonth);
  const monthsCur = parseMonthToCount(date);

  const span = monthsB - monthsA;
  const progress = span > 0 ? Math.min(1.0, Math.max(0.0, (monthsCur - monthsA) / span)) : 1.0;

  const weightsA = normalizeAllocationsMap(stageA.allocations);
  const weightsB = normalizeAllocationsMap(stageB.allocations);

  const unionAssets = new Set([...weightsA.keys(), ...weightsB.keys()]);
  const interpolated = new Map();
  let totalInterp = 0;

  unionAssets.forEach(asset => {
    const wA = weightsA.get(asset) || 0;
    const wB = weightsB.get(asset) || 0;
    const blended = (1 - progress) * wA + progress * wB;
    interpolated.set(asset, blended);
    totalInterp += blended;
  });

  // Normalize to 1.0
  if (totalInterp > 0) {
    unionAssets.forEach(asset => {
      interpolated.set(asset, interpolated.get(asset) / totalInterp);
    });
  }

  return interpolated;
}

function normalizeAllocationsMap(allocations) {
  const map = new Map();
  if (!Array.isArray(allocations)) return map;

  let total = 0;
  allocations.forEach(a => {
    const w = Math.max(0, Number(a.weight) || 0);
    const key = (a.assetId || a.ticker || '').trim().toUpperCase();
    if (key) {
      map.set(key, w);
      total += w;
    }
  });

  if (total > 0) {
    for (const [k, v] of map.entries()) {
      map.set(k, v / total);
    }
  }
  return map;
}

function parseMonthToCount(dateStr) {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return y * 12 + m;
}

/**
 * Simulates a Dynamic Portfolio with Lifecycle Glidepaths and optional Tactical Trend/Momentum Rules.
 * 
 * @param {Array<string>} dates - Array of 'YYYY-MM'
 * @param {Map<string, Array<{date: string, close: number, adjClose: number}>>} dataMap - Asset prices
 * @param {Object} dynamicConfig
 * @param {Array<Object>} dynamicConfig.stages - Chronological stages
 * @param {string} [dynamicConfig.transitionMode='glidepath'] - 'step' | 'glidepath'
 * @param {string} [dynamicConfig.tacticalRule='none'] - 'none' | '10m_sma' | 'dual_momentum'
 * @param {string} [dynamicConfig.defensiveAsset='Cash'] - Asset to hold during protective signal
 * @param {Object} options
 * @param {number} [options.initialAmount=10000]
 * @param {string} [options.rebalancing='annual']
 * @param {Object} [options.cashflow]
 * @param {number} [options.annualRf=0.03]
 * @returns {Object}
 */
export function simulateDynamicPortfolio(dates, dataMap, dynamicConfig, options = {}) {
  const {
    stages = [],
    transitionMode = 'glidepath',
    tacticalRule = 'none',
    defensiveAsset = 'Cash'
  } = dynamicConfig;

  const {
    initialAmount = 10000,
    rebalancing = 'annual',
    cashflow = { type: 'none', amount: 0, frequency: 'monthly' },
    annualRf = 0.03
  } = options;

  if (!stages || stages.length === 0 || !dates || dates.length < 2) {
    return null;
  }

  // Pre-index prices and indicators
  const priceMaps = new Map();
  const smaMaps = new Map();
  const momMaps = new Map();

  dataMap.forEach((series, ticker) => {
    const pMap = new Map();
    series.forEach(r => pMap.set(r.date, r.adjClose));
    priceMaps.set(ticker, pMap);

    if (tacticalRule === '10m_sma') {
      const smaList = computeSMA(series, 10);
      const sMap = new Map();
      series.forEach((r, idx) => sMap.set(r.date, smaList[idx]));
      smaMaps.set(ticker, sMap);
    } else if (tacticalRule === 'dual_momentum') {
      const momList = computeMomentum(series, 12);
      const mMap = new Map();
      series.forEach((r, idx) => mMap.set(r.date, momList[idx]));
      momMaps.set(ticker, mMap);
    }
  });

  const defensiveKey = defensiveAsset.toUpperCase();
  const signalLog = [];
  const targetWeightsHistory = [];
  const trajectory = [];

  let totalContributed = initialAmount;
  let rebalanceCount = 0;

  // Month 0 (T=0)
  const initialTargets = getTargetWeightsForDate(dates[0], stages, transitionMode);
  const currentBalances = {};
  const currentWeights = {};

  initialTargets.forEach((share, asset) => {
    currentBalances[asset] = initialAmount * share;
    currentWeights[asset] = share * 100;
  });

  // Track initial target weights
  const t0Targets = {};
  initialTargets.forEach((share, asset) => {
    t0Targets[asset] = Math.round(share * 10000) / 100;
  });
  targetWeightsHistory.push({ date: dates[0], targets: t0Targets });

  trajectory.push({
    date: dates[0],
    portfolioValue: initialAmount,
    netContribution: totalContributed,
    cashflow: 0,
    assetBalances: { ...currentBalances },
    assetWeights: { ...currentWeights },
    monthlyReturn: 0,
    rebalanced: false,
    signalEvent: null
  });

  // State tracker for active tactical signals
  let prevSignalState = {};

  // Simulation Loop Month 1 through N
  for (let i = 1; i < dates.length; i++) {
    const prevDate = dates[i - 1];
    const curDate = dates[i];

    // 1. Asset price return from prevDate to curDate
    let portfolioBeforeCashflow = 0;
    const assetsWithBalances = Object.keys(currentBalances);

    assetsWithBalances.forEach(asset => {
      const pPrev = priceMaps.get(asset)?.get(prevDate);
      const pCur = priceMaps.get(asset)?.get(curDate);
      if (pPrev && pCur && pPrev > 0) {
        const ret = (pCur - pPrev) / pPrev;
        currentBalances[asset] = currentBalances[asset] * (1 + ret);
      }
      portfolioBeforeCashflow += currentBalances[asset];
    });

    const monthlyReturn = trajectory[i - 1].portfolioValue > 0
      ? (portfolioBeforeCashflow - trajectory[i - 1].portfolioValue) / trajectory[i - 1].portfolioValue
      : 0;

    // 2. Process Cashflow
    let cfAmount = 0;
    if (cashflow.type === 'contribute') {
      if (cashflow.frequency === 'monthly' || (cashflow.frequency === 'annual' && curDate.endsWith('-12'))) {
        cfAmount = cashflow.amount;
        totalContributed += cfAmount;
      }
    } else if (cashflow.type === 'withdraw') {
      if (cashflow.frequency === 'monthly' || (cashflow.frequency === 'annual' && curDate.endsWith('-12'))) {
        cfAmount = -Math.min(portfolioBeforeCashflow, cashflow.amount);
        totalContributed += cfAmount;
      }
    }

    const portfolioAfterCashflow = Math.max(0, portfolioBeforeCashflow + cfAmount);

    // 3. Resolve Target Weights for Current Date
    let activeTargets = getTargetWeightsForDate(curDate, stages, transitionMode);

    // 4. Apply Tactical Signal Overlays (if enabled)
    let signalTriggered = null;

    if (tacticalRule === '10m_sma') {
      // Evaluate 10M SMA on previous month end
      const modifiedTargets = new Map();
      let shiftedToDefensive = 0;

      activeTargets.forEach((share, asset) => {
        // Only evaluate non-defensive assets
        if (asset === defensiveKey) {
          modifiedTargets.set(asset, (modifiedTargets.get(asset) || 0) + share);
          return;
        }

        const pPrev = priceMaps.get(asset)?.get(prevDate);
        const smaPrev = smaMaps.get(asset)?.get(prevDate);

        if (pPrev && smaPrev && pPrev < smaPrev) {
          // Bearish trend: shift target share into defensive asset
          shiftedToDefensive += share;
          if (!prevSignalState[asset]) {
            signalLog.push({
              date: curDate,
              type: 'SELL_DEFENSE',
              asset,
              message: `${asset} fell below 10M SMA ($${pPrev.toFixed(1)} < $${smaPrev.toFixed(1)}). Shifted ${(share * 100).toFixed(0)}% to ${defensiveAsset}.`
            });
            signalTriggered = 'SELL_DEFENSE';
          }
          prevSignalState[asset] = true;
        } else {
          modifiedTargets.set(asset, share);
          if (prevSignalState[asset]) {
            signalLog.push({
              date: curDate,
              type: 'BUY_RISK',
              asset,
              message: `${asset} rose above 10M SMA. Restored ${(share * 100).toFixed(0)}% target.`
            });
            signalTriggered = 'BUY_RISK';
          }
          prevSignalState[asset] = false;
        }
      });

      if (shiftedToDefensive > 0) {
        modifiedTargets.set(defensiveKey, (modifiedTargets.get(defensiveKey) || 0) + shiftedToDefensive);
      }
      activeTargets = modifiedTargets;
    } else if (tacticalRule === 'dual_momentum') {
      // Evaluate 12M Dual Momentum across risk assets
      const riskAssets = Array.from(activeTargets.keys()).filter(a => a !== defensiveKey);
      let bestAsset = null;
      let bestMom = -Infinity;

      riskAssets.forEach(asset => {
        const mom = momMaps.get(asset)?.get(prevDate) || 0;
        if (mom > bestMom) {
          bestMom = mom;
          bestAsset = asset;
        }
      });

      const modifiedTargets = new Map();
      if (bestMom > 0 && bestAsset) {
        // Positive absolute momentum: hold winner
        modifiedTargets.set(bestAsset, 1.0);
        if (prevSignalState.winner !== bestAsset) {
          signalLog.push({
            date: curDate,
            type: 'ROTATE_WINNER',
            asset: bestAsset,
            message: `Dual Momentum rotated 100% to ${bestAsset} (12M return: +${(bestMom * 100).toFixed(1)}%).`
          });
          signalTriggered = 'ROTATE_WINNER';
          prevSignalState.winner = bestAsset;
        }
      } else {
        // Negative absolute momentum: rotate 100% to defensive asset
        modifiedTargets.set(defensiveKey, 1.0);
        if (prevSignalState.winner !== defensiveKey) {
          signalLog.push({
            date: curDate,
            type: 'DEFENSIVE_CASH',
            asset: defensiveKey,
            message: `All risk assets had negative 12M momentum. Rotated 100% to ${defensiveAsset}.`
          });
          signalTriggered = 'DEFENSIVE_CASH';
          prevSignalState.winner = defensiveKey;
        }
      }
      activeTargets = modifiedTargets;
    }

    // Record Target Weights History (for stacked area chart)
    const currentTargetsExport = {};
    activeTargets.forEach((share, asset) => {
      currentTargetsExport[asset] = Math.round(share * 10000) / 100;
    });
    targetWeightsHistory.push({ date: curDate, targets: currentTargetsExport });

    // 5. Check Rebalancing Condition
    const isRebalMonth = shouldRebalance(rebalancing, i, curDate) || signalTriggered !== null;
    let didRebalance = false;

    if (isRebalMonth && portfolioAfterCashflow > 0) {
      // Rebalance all asset balances back to target shares
      activeTargets.forEach((share, asset) => {
        currentBalances[asset] = portfolioAfterCashflow * share;
      });

      // Clear any zero-target balances
      Object.keys(currentBalances).forEach(asset => {
        if (!activeTargets.has(asset)) {
          delete currentBalances[asset];
        }
      });

      rebalanceCount++;
      didRebalance = true;
    } else if (cfAmount !== 0 && portfolioAfterCashflow > 0) {
      // Allocate cash flow pro-rata to existing weights
      const curTotal = portfolioBeforeCashflow;
      if (curTotal > 0) {
        Object.keys(currentBalances).forEach(asset => {
          const wt = currentBalances[asset] / curTotal;
          currentBalances[asset] += cfAmount * wt;
        });
      }
    }

    // 6. Record Actual Weights
    const actualWeights = {};
    if (portfolioAfterCashflow > 0) {
      Object.keys(currentBalances).forEach(asset => {
        actualWeights[asset] = (currentBalances[asset] / portfolioAfterCashflow) * 100;
      });
    }

    trajectory.push({
      date: curDate,
      portfolioValue: Math.round(portfolioAfterCashflow * 100) / 100,
      netContribution: Math.round(totalContributed * 100) / 100,
      cashflow: cfAmount,
      assetBalances: { ...currentBalances },
      assetWeights: actualWeights,
      monthlyReturn: Number(monthlyReturn.toFixed(6)),
      rebalanced: didRebalance,
      signalEvent: signalTriggered
    });
  }

  // Calculate standard performance metrics
  const metrics = calculatePortfolioMetrics(trajectory, initialAmount, totalContributed, annualRf);

  return {
    trajectory,
    targetWeightsHistory,
    signalLog,
    metrics,
    rebalanceCount
  };
}
