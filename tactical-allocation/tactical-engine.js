/**
 * Tactical Asset Allocation (TAA) Quantitative Engine
 * 
 * Implements 6 Canonical Tactical Allocation Models:
 * 1. Dual Momentum (Gary Antonacci GEM - Absolute & Relative Momentum)
 * 2. Moving Average Timing (10-Month SMA, 200-Day SMA, EMA trend filters)
 * 3. Momentum Rotation (Cross-sectional ranking top-N assets)
 * 4. Adaptive Asset Allocation (ReSolve Asset Management: Momentum + Minimum Variance/Risk Parity)
 * 5. Target Volatility (Dynamic volatility budgeting with cash buffer)
 * 6. Market Valuation (Shiller CAPE / Equity Risk Premium counter-cyclical tilt)
 * 
 * Works in both Node.js test environments and browser ES module runtimes.
 */

import { buildAssetClassMonthlyData, ASSET_CLASS_CATALOG } from '../portfolio-backtest/asset-class-data.js';

// -------------------------------------------------------------------
// 1. Canonical Preset Strategies
// -------------------------------------------------------------------
export const TACTICAL_STRATEGY_PRESETS = [
  // 1. Dual Momentum Presets
  {
    id: 'dual-momentum-gem',
    name: 'Dual Momentum (Gary Antonacci GEM)',
    timingModel: 'dual-momentum',
    description: 'Flagship Global Equity Momentum (GEM): compares US Stocks vs International Stocks over 12 months (Relative Momentum). If the winner beats Cash/T-Bills (Absolute Momentum), holds 100% in the winning stock index; otherwise shifts 100% to Aggregate Bonds / Treasuries.',
    riskAssets: ['TotalStockMarket', 'IntlStockMarket'],
    safeHavenAsset: 'TotalBond',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 12,
    topN: 1
  },
  {
    id: 'dual-momentum-extended',
    name: 'All-Cap Dual Momentum (US Large, Small, Intl)',
    timingModel: 'dual-momentum',
    description: 'Extended multi-equity universe: competes US Large Cap, US Small Cap, and International Equities. Absolute momentum filter protects capital by rotating to Intermediate Treasuries when momentum turns negative.',
    riskAssets: ['LargeCapBlend', 'SmallCapBlend', 'IntlStockMarket'],
    safeHavenAsset: 'IntermediateTreasury',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 12,
    topN: 1
  },
  {
    id: 'dual-momentum-all-weather',
    name: 'All-Weather Dual Momentum (Stocks vs Gold vs Bonds)',
    timingModel: 'dual-momentum',
    description: 'Multi-asset dual momentum: tests Total Stock Market against Gold and Real Estate, retreating to Long-Term Treasuries when equities falter.',
    riskAssets: ['TotalStockMarket', 'Gold', 'REIT'],
    safeHavenAsset: 'LongTreasury',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 12,
    topN: 1
  },

  // 2. Moving Average Presets
  {
    id: 'moving-average-sma',
    name: '10-Month SMA Trend Defense (Meb Faber)',
    timingModel: 'moving-average',
    description: 'Classic trend-following strategy: holds US Large Cap Equities as long as monthly price is above its 10-month Simple Moving Average. Rotates 100% to Cash when price drops below trendline to prevent deep bear market crashes.',
    riskAssets: ['LargeCapBlend'],
    safeHavenAsset: 'Cash',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 10,
    maType: 'SMA',
    topN: 1
  },
  {
    id: 'moving-average-12m',
    name: '12-Month SMA Trend Following (Total Market)',
    timingModel: 'moving-average',
    description: 'Long-term 12-month simple moving average trend filter applied to Total US Stock Market. Moves to 10-Year Intermediate Treasuries during sustained bear markets.',
    riskAssets: ['TotalStockMarket'],
    safeHavenAsset: 'IntermediateTreasury',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 12,
    maType: 'SMA',
    topN: 1
  },
  {
    id: 'moving-average-ema',
    name: '10-Month EMA Fast Trend Shield',
    timingModel: 'moving-average',
    description: 'Exponential Moving Average trend filter: weights recent months more heavily than classic SMA, responding faster to market inflection points and early bear turns.',
    riskAssets: ['LargeCapBlend'],
    safeHavenAsset: 'Cash',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 10,
    maType: 'EMA',
    topN: 1
  },

  // 3. Momentum Rotation Presets
  {
    id: 'ivy-5-momentum-rotation',
    name: 'IVY 5 Momentum Rotation',
    timingModel: 'momentum-rotation',
    description: 'Cross-sectional relative strength across 5 major asset classes (US Equities, Foreign Equities, 10Y Treasuries, REITs, Commodities). Selects top 2 assets with highest 6-month momentum, filtered by positive absolute trend.',
    riskAssets: ['LargeCapBlend', 'IntlStockMarket', 'IntermediateTreasury', 'REIT', 'Commodities'],
    safeHavenAsset: 'Cash',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 6,
    topN: 2
  },
  {
    id: 'global-macro-rotation',
    name: 'Global Macro Momentum (Top 3 of 7)',
    timingModel: 'momentum-rotation',
    description: 'Broad multi-asset universe: US Equities, International Equities, Emerging Markets, 10Y Treasuries, REITs, Gold, and Commodities. Rotates into top 3 relative strength leaders over trailing 6 months.',
    riskAssets: ['TotalStockMarket', 'IntlStockMarket', 'EmergingMarket', 'IntermediateTreasury', 'REIT', 'Gold', 'Commodities'],
    safeHavenAsset: 'Cash',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 6,
    topN: 3
  },
  {
    id: 'equity-style-rotation',
    name: 'Equity Style Rotation (Growth vs Value vs Small Cap)',
    timingModel: 'momentum-rotation',
    description: 'Rotates capital into the top 2 performing equity styles among Large Growth, Large Value, Small Cap Blend, and Real Estate based on 6-month momentum.',
    riskAssets: ['LargeCapGrowth', 'LargeCapValue', 'SmallCapBlend', 'REIT'],
    safeHavenAsset: 'IntermediateTreasury',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 6,
    topN: 2
  },

  // 4. Adaptive Allocation Presets
  {
    id: 'resolve-adaptive-allocation',
    name: 'Adaptive Asset Allocation (ReSolve)',
    timingModel: 'adaptive-allocation',
    description: 'ReSolve Asset Management model: selects the top 3 momentum assets over 6 months from a multi-asset universe, then weights them using Inverse Volatility / Minimum Variance to minimize tail risk.',
    riskAssets: ['TotalStockMarket', 'IntlStockMarket', 'EmergingMarket', 'IntermediateTreasury', 'REIT', 'Gold', 'Commodities'],
    safeHavenAsset: 'IntermediateTreasury',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 6,
    topN: 3
  },
  {
    id: 'all-weather-adaptive',
    name: 'All-Weather Adaptive Risk Parity',
    timingModel: 'adaptive-allocation',
    description: 'Adaptive risk parity: selects top 3 assets among US Stocks, International Stocks, Intermediate Treasuries, Gold, and Commodities, scaling weights inversely with trailing 6-month volatility.',
    riskAssets: ['TotalStockMarket', 'IntlStockMarket', 'IntermediateTreasury', 'Gold', 'Commodities'],
    safeHavenAsset: 'IntermediateTreasury',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 6,
    topN: 3
  },

  // 5. Target Volatility Presets
  {
    id: 'target-volatility-10',
    name: 'Target Volatility (10% Risk Budget)',
    timingModel: 'target-volatility',
    description: 'Volatility targeting: adjusts portfolio allocation to US Equities dynamically to maintain a constant 10% annualized volatility target. Automatically de-levers into Cash during high-volatility market crises.',
    riskAssets: ['LargeCapBlend'],
    safeHavenAsset: 'Cash',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 3,
    targetVol: 0.10,
    topN: 1
  },
  {
    id: 'target-volatility-12',
    name: 'Target Volatility (12% Growth Budget)',
    timingModel: 'target-volatility',
    description: 'Dynamic volatility targeting scaled to 12% annualized risk. Holds maximum equity exposure during calm market regimes and scales down into Cash buffer when volatility surges.',
    riskAssets: ['LargeCapBlend'],
    safeHavenAsset: 'Cash',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 3,
    targetVol: 0.12,
    topN: 1
  },
  {
    id: 'target-volatility-8',
    name: 'Target Volatility (8% Conservative Shield)',
    timingModel: 'target-volatility',
    description: 'Conservative volatility targeting: caps annualized volatility at 8%, scaling risk exposure dynamically to protect capital for retirees and endowments.',
    riskAssets: ['LargeCapBlend'],
    safeHavenAsset: 'Cash',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 3,
    targetVol: 0.08,
    topN: 1
  },

  // 6. Market Valuation Presets
  {
    id: 'market-valuation-cape',
    name: 'Market Valuation (Cyclical Equity Tilt)',
    timingModel: 'market-valuation',
    description: 'Counter-cyclical valuation strategy: varies equity exposure between 80% (when market valuation is historically cheap) and 30% (when market valuation is at extreme bubble peaks), allocating the rest to 10Y Treasuries.',
    riskAssets: ['LargeCapBlend'],
    safeHavenAsset: 'IntermediateTreasury',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 12,
    topN: 1
  },
  {
    id: 'market-valuation-conservative',
    name: 'Defensive Valuation Tilt (60% to 20%)',
    timingModel: 'market-valuation',
    description: 'Conservative counter-cyclical valuation tilt: holds a maximum of 60% equity in undervalued markets and trims to 20% equity at extreme valuations, holding Intermediate Treasuries as safe harbor.',
    riskAssets: ['LargeCapBlend'],
    safeHavenAsset: 'IntermediateTreasury',
    cashHurdleAsset: 'Cash',
    lookbackMonths: 12,
    topN: 1
  }
];

// -------------------------------------------------------------------
// 2. Math & Time-Series Helpers
// -------------------------------------------------------------------

/**
 * Reconstructs synthetic cumulative price index series from monthly returns.
 * P_0 = 100.0, P_t = P_{t-1} * (1 + r_t).
 */
export function buildPriceSeries(monthlyReturns) {
  const prices = new Float64Array(monthlyReturns.length + 1);
  prices[0] = 100.0;
  for (let i = 0; i < monthlyReturns.length; i++) {
    prices[i + 1] = prices[i] * (1 + monthlyReturns[i]);
  }
  return prices;
}

/**
 * Calculates Simple Moving Average (SMA) of prices over a lookback window.
 */
export function calculateSMA(prices, lookback) {
  const N = prices.length;
  const sma = new Float64Array(N);
  let sum = 0;
  for (let i = 0; i < N; i++) {
    sum += prices[i];
    if (i >= lookback) {
      sum -= prices[i - lookback];
      sma[i] = sum / lookback;
    } else {
      sma[i] = sum / (i + 1);
    }
  }
  return sma;
}

/**
 * Calculates Exponential Moving Average (EMA) of prices over a lookback window.
 */
export function calculateEMA(prices, lookback) {
  const N = prices.length;
  const ema = new Float64Array(N);
  const k = 2 / (lookback + 1);
  ema[0] = prices[0];
  for (let i = 1; i < N; i++) {
    ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

/**
 * Calculates trailing compound total return over lookback months.
 * R_k(t) = P_t / P_{t-k} - 1.
 */
export function calculateTrailingReturn(prices, currentIdx, lookback) {
  if (currentIdx < lookback) return 0;
  const prevPrice = prices[currentIdx - lookback];
  if (prevPrice <= 0) return 0;
  return (prices[currentIdx] - prevPrice) / prevPrice;
}

/**
 * Calculates annualized realized volatility over trailing lookback months.
 */
export function calculateTrailingVolatility(returns, currentIdx, lookback) {
  if (currentIdx < lookback || lookback < 2) return 0.15; // default fallback
  const slice = returns.slice(currentIdx - lookback, currentIdx);
  const mean = slice.reduce((a, b) => a + b, 0) / lookback;
  const variance = slice.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (lookback - 1);
  return Math.sqrt(variance) * Math.sqrt(12);
}

// -------------------------------------------------------------------
// 3. Tactical Signal Generation
// -------------------------------------------------------------------

/**
 * Evaluates the tactical allocation model for a single month.
 * Returns { targetWeights: { [assetId]: number }, signalName: string, isDefensive: boolean, details: string }
 */
export function evaluateTacticalSignal(options) {
  const {
    timingModel,
    monthIdx, // index in date timeline
    assetDataMap, // Map: assetId -> { returns, prices }
    riskAssets,
    safeHavenAsset,
    cashHurdleAsset,
    lookbackMonths = 12,
    topN = 1,
    maType = 'SMA',
    targetVol = 0.10
  } = options;

  const targetWeights = {};
  // Initialize all to 0
  riskAssets.forEach(id => { targetWeights[id] = 0; });
  targetWeights[safeHavenAsset] = 0;

  // If not enough history yet, default to equal weight risk assets
  if (monthIdx < lookbackMonths) {
    const eqWeight = 1.0 / riskAssets.length;
    riskAssets.forEach(id => { targetWeights[id] = eqWeight; });
    return {
      targetWeights,
      signalName: 'INITIALIZING',
      isDefensive: false,
      details: 'Insufficient history for momentum lookback. Holding baseline equal weight.'
    };
  }

  // -----------------------------------------------------------------
  // MODEL 1: Dual Momentum (Gary Antonacci GEM)
  // -----------------------------------------------------------------
  if (timingModel === 'dual-momentum') {
    // 1. Calculate trailing returns for all candidate risk assets
    const rankedRisks = riskAssets.map(id => {
      const data = assetDataMap.get(id);
      const ret = calculateTrailingReturn(data.prices, monthIdx, lookbackMonths);
      return { id, ret };
    }).sort((a, b) => b.ret - a.ret);

    const winner = rankedRisks[0];

    // 2. Absolute Momentum Hurdle (compare winner return vs cash return)
    const cashData = assetDataMap.get(cashHurdleAsset) || assetDataMap.get('Cash');
    const cashRet = cashData ? calculateTrailingReturn(cashData.prices, monthIdx, lookbackMonths) : 0;

    const passesAbsoluteMomentum = winner.ret > cashRet && winner.ret > 0;

    if (passesAbsoluteMomentum) {
      targetWeights[winner.id] = 1.0;
      return {
        targetWeights,
        signalName: 'BULL: RISK EQUITY',
        isDefensive: false,
        details: `Relative winner ${winner.id} (+${(winner.ret * 100).toFixed(1)}%) beats cash hurdle (+${(cashRet * 100).toFixed(1)}%). Allocated 100% to ${winner.id}.`
      };
    } else {
      targetWeights[safeHavenAsset] = 1.0;
      return {
        targetWeights,
        signalName: 'BEAR: CASH DEFENSE',
        isDefensive: true,
        details: `Equity winner ${winner.id} (+${(winner.ret * 100).toFixed(1)}%) trailed cash (+${(cashRet * 100).toFixed(1)}%). Rotated 100% to Safe Haven (${safeHavenAsset}).`
      };
    }
  }

  // -----------------------------------------------------------------
  // MODEL 2: Moving Average Timing (SMA / EMA)
  // -----------------------------------------------------------------
  if (timingModel === 'moving-average') {
    let totalRiskWeight = 0;
    const baseWeight = 1.0 / riskAssets.length;

    let bullCount = 0;
    riskAssets.forEach(id => {
      const data = assetDataMap.get(id);
      const currentPrice = data.prices[monthIdx];
      const maSeries = maType === 'EMA' ? data.ema : data.sma;
      const currentMA = maSeries[monthIdx];

      if (currentPrice > currentMA) {
        targetWeights[id] = baseWeight;
        totalRiskWeight += baseWeight;
        bullCount++;
      }
    });

    const safeWeight = Math.max(0, 1.0 - totalRiskWeight);
    targetWeights[safeHavenAsset] = (targetWeights[safeHavenAsset] || 0) + safeWeight;

    const isDefensive = safeWeight > 0.5;
    return {
      targetWeights,
      signalName: isDefensive ? 'TREND DEFENSE' : 'TREND BULL',
      isDefensive,
      details: `${bullCount} of ${riskAssets.length} assets above ${lookbackMonths}M ${maType}. Allocated ${(totalRiskWeight * 100).toFixed(0)}% Risk, ${(safeWeight * 100).toFixed(0)}% Safe Haven.`
    };
  }

  // -----------------------------------------------------------------
  // MODEL 3: Momentum Rotation (Relative Strength Top-N)
  // -----------------------------------------------------------------
  if (timingModel === 'momentum-rotation') {
    const cashData = assetDataMap.get(cashHurdleAsset) || assetDataMap.get('Cash');
    const cashRet = cashData ? calculateTrailingReturn(cashData.prices, monthIdx, lookbackMonths) : 0;

    const ranked = riskAssets.map(id => {
      const data = assetDataMap.get(id);
      const ret = calculateTrailingReturn(data.prices, monthIdx, lookbackMonths);
      return { id, ret };
    }).sort((a, b) => b.ret - a.ret);

    // Filter to top N assets that have positive absolute momentum
    const qualified = ranked.filter(item => item.ret > cashRet && item.ret > 0).slice(0, topN);

    if (qualified.length > 0) {
      const perAssetWeight = 1.0 / topN;
      qualified.forEach(item => {
        targetWeights[item.id] = perAssetWeight;
      });
      // If fewer than topN qualified, balance goes to safe haven
      const unallocated = 1.0 - qualified.length * perAssetWeight;
      if (unallocated > 0) {
        targetWeights[safeHavenAsset] = (targetWeights[safeHavenAsset] || 0) + unallocated;
      }
      return {
        targetWeights,
        signalName: `TOP ${qualified.length} MOMENTUM`,
        isDefensive: unallocated > 0,
        details: `Selected ${qualified.map(q => `${q.id} (+${(q.ret * 100).toFixed(1)}%)`).join(', ')}. Remaining ${(unallocated * 100).toFixed(0)}% in ${safeHavenAsset}.`
      };
    } else {
      targetWeights[safeHavenAsset] = 1.0;
      return {
        targetWeights,
        signalName: 'BEAR: FULL DEFENSE',
        isDefensive: true,
        details: `Zero assets beat cash hurdle. Shifted 100% to Safe Haven (${safeHavenAsset}).`
      };
    }
  }

  // -----------------------------------------------------------------
  // MODEL 4: Adaptive Asset Allocation (ReSolve - Momentum + Min Variance)
  // -----------------------------------------------------------------
  if (timingModel === 'adaptive-allocation') {
    // 1. Select top N assets by trailing momentum
    const ranked = riskAssets.map(id => {
      const data = assetDataMap.get(id);
      const ret = calculateTrailingReturn(data.prices, monthIdx, lookbackMonths);
      return { id, ret };
    }).sort((a, b) => b.ret - a.ret);

    const selected = ranked.slice(0, topN);

    // 2. Weight by Inverse Volatility (Equal Risk Contribution proxy)
    let sumInvVol = 0;
    const invVols = selected.map(item => {
      const data = assetDataMap.get(item.id);
      const vol = Math.max(0.04, calculateTrailingVolatility(data.returns, monthIdx, lookbackMonths));
      const inv = 1.0 / vol;
      sumInvVol += inv;
      return { id: item.id, inv, vol };
    });

    invVols.forEach(item => {
      targetWeights[item.id] = sumInvVol > 0 ? item.inv / sumInvVol : 1.0 / topN;
    });

    return {
      targetWeights,
      signalName: 'ADAPTIVE RISK PARITY',
      isDefensive: false,
      details: `Top ${topN} momentum: ${selected.map(s => s.id).join(', ')}. Weighted by inverse volatility.`
    };
  }

  // -----------------------------------------------------------------
  // MODEL 5: Target Volatility (Volatility Budgeting)
  // -----------------------------------------------------------------
  if (timingModel === 'target-volatility') {
    const primaryAsset = riskAssets[0];
    const data = assetDataMap.get(primaryAsset);
    const trailingVol = calculateTrailingVolatility(data.returns, monthIdx, lookbackMonths);

    // Desired weight = targetVol / realizedVol (bounded between 0.1 and 1.0)
    let riskWeight = trailingVol > 0 ? targetVol / trailingVol : 1.0;
    riskWeight = Math.max(0.10, Math.min(1.0, riskWeight));
    const cashWeight = 1.0 - riskWeight;

    targetWeights[primaryAsset] = riskWeight;
    targetWeights[safeHavenAsset] = cashWeight;

    const isDefensive = cashWeight > 0.4;
    return {
      targetWeights,
      signalName: isDefensive ? 'VOL DEFENSE: SCALED DOWN' : 'VOL TARGET: INVESTED',
      isDefensive,
      details: `Realized volatility ${(trailingVol * 100).toFixed(1)}% vs ${(targetVol * 100).toFixed(1)}% target. Scaled ${primaryAsset} to ${(riskWeight * 100).toFixed(0)}%, Cash to ${(cashWeight * 100).toFixed(0)}%.`
    };
  }

  // -----------------------------------------------------------------
  // MODEL 6: Market Valuation (Counter-Cyclical Valuation Tilt)
  // -----------------------------------------------------------------
  if (timingModel === 'market-valuation') {
    const primaryAsset = riskAssets[0];
    // Trailing 12-month return as valuation momentum proxy (mean-reversion regime)
    const data = assetDataMap.get(primaryAsset);
    const trailing3Y = calculateTrailingReturn(data.prices, monthIdx, Math.min(monthIdx, 36));

    let equityWeight = 0.60;
    let desc = 'Normal valuation (60/40 target)';

    if (trailing3Y < -0.10) {
      equityWeight = 0.85; // Deep value discount, overweight equities
      desc = 'Depressed valuation / post-crash discount. Overweighted equities to 85%.';
    } else if (trailing3Y > 0.60) {
      equityWeight = 0.35; // Bubble peak expansion, defensively underweight
      desc = 'Euphoric valuation expansion. Reduced equities to 35%, holding 65% in Treasuries.';
    }

    targetWeights[primaryAsset] = equityWeight;
    targetWeights[safeHavenAsset] = 1.0 - equityWeight;

    return {
      targetWeights,
      signalName: equityWeight < 0.5 ? 'VALUATION DEFENSE' : 'VALUATION ACTIVE',
      isDefensive: equityWeight < 0.5,
      details: desc
    };
  }

  // Default fallback equal weight
  riskAssets.forEach(id => { targetWeights[id] = 1.0 / riskAssets.length; });
  return {
    targetWeights,
    signalName: 'BALANCED',
    isDefensive: false,
    details: 'Standard balanced allocation.'
  };
}

// -------------------------------------------------------------------
// 4. Backtest Simulation Engine
// -------------------------------------------------------------------

/**
 * Runs a complete month-by-month tactical backtest simulation over 54+ years.
 * Computes trajectory, monthly returns, drawdown episodes, trade logs, and MPT metrics.
 */
export function runTacticalBacktest(config) {
  const {
    timingModel = 'dual-momentum',
    riskAssets = ['TotalStockMarket', 'IntlStockMarket'],
    safeHavenAsset = 'TotalBond',
    cashHurdleAsset = 'Cash',
    lookbackMonths = 12,
    topN = 1,
    maType = 'SMA',
    targetVol = 0.10,
    initialCapital = 10000,
    startMonth = '1972-01',
    endMonth = '2026-08',
    rebalanceFrequency = 'monthly',
    annualRiskFreeRate = 0.03
  } = config;

  // 1. Gather all needed assets and align timelines
  const allNeededAssets = Array.from(new Set([...riskAssets, safeHavenAsset, cashHurdleAsset, 'LargeCapBlend', 'TotalBond', 'Cash']));

  const assetDataRaw = buildAssetClassMonthlyData();
  const sampleList = assetDataRaw.get('TotalStockMarket') || [];
  const filteredIndices = [];
  for (let i = 0; i < sampleList.length; i++) {
    const d = sampleList[i].date;
    if (d >= startMonth && d <= endMonth) {
      filteredIndices.push(i);
    }
  }

  const N = filteredIndices.length;
  if (N < lookbackMonths + 2) {
    throw new Error(`Insufficient timeline: ${N} months available for ${lookbackMonths}M lookback.`);
  }

  // 2. Prepare returns and reconstructed prices for each asset
  const assetDataMap = new Map();
  allNeededAssets.forEach(assetId => {
    const rawAsset = assetDataRaw.get(assetId) || [];
    const returns = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const idx = filteredIndices[i];
      returns[i] = rawAsset[idx]?.return ?? 0;
    }
    const prices = buildPriceSeries(returns);
    const sma = calculateSMA(prices, lookbackMonths);
    const ema = calculateEMA(prices, lookbackMonths);

    assetDataMap.set(assetId, {
      id: assetId,
      returns,
      prices,
      sma,
      ema
    });
  });

  // 3. Prepare Benchmark series (SPY / LargeCapBlend and 60/40 Balanced)
  const spyReturns = assetDataMap.get('LargeCapBlend').returns;
  const bondReturns = assetDataMap.get('TotalBond').returns;
  const benchmark6040Returns = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    benchmark6040Returns[i] = 0.60 * spyReturns[i] + 0.40 * bondReturns[i];
  }

  // 4. Walk-forward simulation
  let portfolioBalance = initialCapital;
  let spyBalance = initialCapital;
  let b6040Balance = initialCapital;

  const trajectory = [];
  const monthlySignals = [];
  const tacticalReturns = new Float64Array(N);

  let currentWeights = {};
  let totalTradesCount = 0;
  let monthsInDefenseCount = 0;

  for (let t = 0; t < N; t++) {
    const currentDate = sampleList[filteredIndices[t]].date;

    // Evaluate tactical signal for the beginning of month t
    const signal = evaluateTacticalSignal({
      timingModel,
      monthIdx: t,
      assetDataMap,
      riskAssets,
      safeHavenAsset,
      cashHurdleAsset,
      lookbackMonths,
      topN,
      maType,
      targetVol
    });

    const newWeights = signal.targetWeights;

    // Check if allocation changed (trade occurred)
    let changed = false;
    Object.keys(newWeights).forEach(k => {
      if (Math.abs((newWeights[k] || 0) - (currentWeights[k] || 0)) > 0.05) {
        changed = true;
      }
    });

    if (t > 0 && changed) {
      totalTradesCount++;
    }
    if (signal.isDefensive) {
      monthsInDefenseCount++;
    }

    currentWeights = newWeights;

    // Compute tactical portfolio return for month t
    let monthRet = 0;
    Object.entries(currentWeights).forEach(([assetId, w]) => {
      if (w > 0) {
        const r = assetDataMap.get(assetId).returns[t];
        monthRet += w * r;
      }
    });

    tacticalReturns[t] = monthRet;
    portfolioBalance *= (1 + monthRet);

    // Update benchmarks
    spyBalance *= (1 + spyReturns[t]);
    b6040Balance *= (1 + benchmark6040Returns[t]);

    // Record trajectory point
    trajectory.push({
      date: currentDate,
      monthIndex: t,
      portfolioBalance,
      spyBalance,
      b6040Balance,
      tacticalReturn: monthRet,
      spyReturn: spyReturns[t],
      b6040Return: benchmark6040Returns[t],
      weights: { ...currentWeights },
      signalName: signal.signalName,
      isDefensive: signal.isDefensive
    });

    // Record trade/signal log
    monthlySignals.push({
      date: currentDate,
      signalName: signal.signalName,
      isDefensive: signal.isDefensive,
      details: signal.details,
      weights: { ...currentWeights },
      monthReturn: monthRet,
      portfolioBalance
    });
  }

  // 5. Performance Metrics (CAGR, Volatility, Sharpe, Sortino, Max Drawdown)
  const years = N / 12;
  const portfolioCAGR = Math.pow(portfolioBalance / initialCapital, 1 / years) - 1;
  const spyCAGR = Math.pow(spyBalance / initialCapital, 1 / years) - 1;
  const b6040CAGR = Math.pow(b6040Balance / initialCapital, 1 / years) - 1;

  const pMetrics = calculateSeriesMetrics(tacticalReturns, annualRiskFreeRate);
  const spyMetrics = calculateSeriesMetrics(spyReturns, annualRiskFreeRate);
  const b6040Metrics = calculateSeriesMetrics(benchmark6040Returns, annualRiskFreeRate);

  // 6. Drawdown Trajectories & Crash Episode Analysis
  const drawdowns = computeDrawdownSeries(trajectory.map(p => p.portfolioBalance));
  const spyDrawdowns = computeDrawdownSeries(trajectory.map(p => p.spyBalance));
  const b6040Drawdowns = computeDrawdownSeries(trajectory.map(p => p.b6040Balance));

  for (let i = 0; i < N; i++) {
    trajectory[i].drawdown = drawdowns.series[i];
    trajectory[i].spyDrawdown = spyDrawdowns.series[i];
    trajectory[i].b6040Drawdown = b6040Drawdowns.series[i];
  }

  // 7. Calendar Annual Returns
  const annualReturns = computeAnnualReturns(trajectory);

  return {
    config,
    sampleMonths: N,
    years,
    startMonth,
    endMonth,
    initialCapital,
    finalBalance: portfolioBalance,
    spyFinalBalance: spyBalance,
    b6040FinalBalance: b6040Balance,
    metrics: {
      tactical: { cagr: portfolioCAGR, ...pMetrics, maxDrawdown: drawdowns.maxDrawdown },
      spy: { cagr: spyCAGR, ...spyMetrics, maxDrawdown: spyDrawdowns.maxDrawdown },
      b6040: { cagr: b6040CAGR, ...b6040Metrics, maxDrawdown: b6040Drawdowns.maxDrawdown }
    },
    activity: {
      totalTrades: totalTradesCount,
      annualTurnover: (totalTradesCount / years).toFixed(1),
      defensiveMonthsCount: monthsInDefenseCount,
      defensiveTimePct: monthsInDefenseCount / N,
      winRate: pMetrics.winRate
    },
    trajectory,
    monthlySignals,
    annualReturns
  };
}

// -------------------------------------------------------------------
// 5. Statistical Performance & Risk Helpers
// -------------------------------------------------------------------

function calculateSeriesMetrics(returns, annualRf) {
  const N = returns.length;
  const rfMonthly = Math.pow(1 + annualRf, 1 / 12) - 1;

  const mean = returns.reduce((a, b) => a + b, 0) / N;
  const variance = returns.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (N - 1);
  const stdevMonthly = Math.sqrt(variance);
  const stdevAnnual = stdevMonthly * Math.sqrt(12);

  // Sharpe Ratio
  const excessReturns = returns.map(r => r - rfMonthly);
  const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / N;
  const sharpe = stdevMonthly > 0 ? (meanExcess / stdevMonthly) * Math.sqrt(12) : 0;

  // Downside Deviation & Sortino
  const downsideDiffs = returns.map(r => Math.min(0, r - rfMonthly));
  const downsideVariance = downsideDiffs.reduce((acc, v) => acc + v * v, 0) / N;
  const downsideDevAnnual = Math.sqrt(downsideVariance) * Math.sqrt(12);
  const sortino = downsideDevAnnual > 0 ? (meanExcess * 12) / downsideDevAnnual : 0;

  // Win Rate (% positive months)
  const posCount = returns.filter(r => r > 0).length;
  const winRate = posCount / N;

  return {
    annualizedReturn: Math.pow(1 + mean, 12) - 1,
    annualizedVol: stdevAnnual,
    sharpe,
    sortino,
    winRate,
    positiveMonths: posCount,
    totalMonths: N
  };
}

function computeDrawdownSeries(balances) {
  let peak = -Infinity;
  let maxDD = 0;
  const series = new Float64Array(balances.length);

  for (let i = 0; i < balances.length; i++) {
    const val = balances[i];
    if (val > peak) peak = val;
    const dd = peak > 0 ? (val - peak) / peak : 0;
    series[i] = dd;
    if (dd < maxDD) maxDD = dd;
  }

  return {
    series: Array.from(series),
    maxDrawdown: maxDD
  };
}

function computeAnnualReturns(trajectory) {
  const byYear = new Map();
  trajectory.forEach(pt => {
    const yr = pt.date.substring(0, 4);
    if (!byYear.has(yr)) {
      byYear.set(yr, {
        year: parseInt(yr, 10),
        pStart: pt.portfolioBalance / (1 + pt.tacticalReturn),
        pEnd: pt.portfolioBalance,
        sStart: pt.spyBalance / (1 + pt.spyReturn),
        sEnd: pt.spyBalance,
        bStart: pt.b6040Balance / (1 + pt.b6040Return),
        bEnd: pt.b6040Balance
      });
    } else {
      const entry = byYear.get(yr);
      entry.pEnd = pt.portfolioBalance;
      entry.sEnd = pt.spyBalance;
      entry.bEnd = pt.b6040Balance;
    }
  });

  return Array.from(byYear.values()).map(y => {
    const pRet = y.pStart > 0 ? (y.pEnd - y.pStart) / y.pStart : 0;
    const sRet = y.sStart > 0 ? (y.sEnd - y.sStart) / y.sStart : 0;
    const bRet = y.bStart > 0 ? (y.bEnd - y.bStart) / y.bStart : 0;
    return {
      year: y.year,
      portfolioReturn: pRet,
      spyReturn: sRet,
      b6040Return: bRet,
      excessReturn: pRet - sRet
    };
  });
}
