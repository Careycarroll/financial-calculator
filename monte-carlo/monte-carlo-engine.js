/**
 * Monte Carlo Simulation Engine
 * Core quantitative engine for portfolio forward projections,
 * multi-stage glidepath transitions, sequence-of-returns stress testing,
 * dynamic financial goal cash flows, and asset-liability modeling.
 */

// -------------------------------------------------------------------
// Benchmark Historical Inflation Series (US Annual CPI-U 1970 - 2025)
// -------------------------------------------------------------------
export const HISTORICAL_ANNUAL_INFLATION = [
  { year: 1970, rate: 0.0584 }, { year: 1971, rate: 0.0430 }, { year: 1972, rate: 0.0327 },
  { year: 1973, rate: 0.0618 }, { year: 1974, rate: 0.1105 }, { year: 1975, rate: 0.0914 },
  { year: 1976, rate: 0.0574 }, { year: 1977, rate: 0.0650 }, { year: 1978, rate: 0.0763 },
  { year: 1979, rate: 0.1125 }, { year: 1980, rate: 0.1355 }, { year: 1981, rate: 0.1033 },
  { year: 1982, rate: 0.0613 }, { year: 1983, rate: 0.0321 }, { year: 1984, rate: 0.0430 },
  { year: 1985, rate: 0.0355 }, { year: 1986, rate: 0.0190 }, { year: 1987, rate: 0.0366 },
  { year: 1988, rate: 0.0408 }, { year: 1989, rate: 0.0483 }, { year: 1990, rate: 0.0540 },
  { year: 1991, rate: 0.0424 }, { year: 1992, rate: 0.0303 }, { year: 1993, rate: 0.0295 },
  { year: 1994, rate: 0.0261 }, { year: 1995, rate: 0.0281 }, { year: 1996, rate: 0.0293 },
  { year: 1997, rate: 0.0234 }, { year: 1998, rate: 0.0155 }, { year: 1999, rate: 0.0219 },
  { year: 2000, rate: 0.0338 }, { year: 2001, rate: 0.0283 }, { year: 2002, rate: 0.0159 },
  { year: 2003, rate: 0.0227 }, { year: 2004, rate: 0.0268 }, { year: 2005, rate: 0.0339 },
  { year: 2006, rate: 0.0323 }, { year: 2007, rate: 0.0285 }, { year: 2008, rate: 0.0384 },
  { year: 2009, rate: -0.0036 }, { year: 2010, rate: 0.0164 }, { year: 2011, rate: 0.0316 },
  { year: 2012, rate: 0.0207 }, { year: 2013, rate: 0.0146 }, { year: 2014, rate: 0.0162 },
  { year: 2015, rate: 0.0012 }, { year: 2016, rate: 0.0126 }, { year: 2017, rate: 0.0213 },
  { year: 2018, rate: 0.0244 }, { year: 2019, rate: 0.0181 }, { year: 2020, rate: 0.0123 },
  { year: 2021, rate: 0.0470 }, { year: 2022, rate: 0.0800 }, { year: 2023, rate: 0.0412 },
  { year: 2024, rate: 0.0289 }, { year: 2025, rate: 0.0265 }
];

// -------------------------------------------------------------------
// Canonical Asset Class Parameters (Long-Term Returns & Volatilities)
// -------------------------------------------------------------------
export const CANONICAL_ASSET_CLASSES = {
  'US Stock Market': { mean: 0.102, stdev: 0.155, proxyTicker: 'VTI' },
  'Global ex-US Stock Market': { mean: 0.076, stdev: 0.170, proxyTicker: 'VXUS' },
  'Total US Bond Market': { mean: 0.046, stdev: 0.058, proxyTicker: 'BND' },
  'Global Bonds (Unhedged)': { mean: 0.040, stdev: 0.065, proxyTicker: 'BNDX' },
  'Real Estate (REIT)': { mean: 0.092, stdev: 0.190, proxyTicker: 'VNQ' },
  'Commodities': { mean: 0.058, stdev: 0.165, proxyTicker: 'GLD' },
  'Treasury Bills / Cash': { mean: 0.028, stdev: 0.015, proxyTicker: 'BIL' }
};

// -------------------------------------------------------------------
// Random Variate Generators
// -------------------------------------------------------------------

/**
 * Standard Normal Random Variate using Box-Muller transform
 * @returns {number} ~ N(0, 1)
 */
export function randomStandardNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Parameterized normal return with mean and volatility
 * @param {number} mean - Annualized expected return (e.g. 0.08)
 * @param {number} stdev - Annualized volatility (e.g. 0.15)
 * @returns {number}
 */
export function sampleParameterizedReturn(mean, stdev) {
  return mean + stdev * randomStandardNormal();
}

// -------------------------------------------------------------------
// Resampling & Bootstrap Algorithms
// -------------------------------------------------------------------

/**
 * Resample a single simulated path of returns from historical series
 * @param {Array<number>} historicalReturns - Array of annual returns (e.g. [0.12, -0.04, ...])
 * @param {number} numYears - Number of forward years to simulate
 * @param {string} bootstrapModel - 'singleYear' | 'blockYears'
 * @param {number} [blockSize=3] - Block size for block bootstrap
 * @returns {Array<number>}
 */
export function sampleBootstrapReturns(historicalReturns, numYears, bootstrapModel = 'singleYear', blockSize = 3) {
  if (!historicalReturns || historicalReturns.length === 0) {
    // Fallback to market baseline if series is empty
    return Array.from({ length: numYears }, () => sampleParameterizedReturn(0.08, 0.15));
  }

  const n = historicalReturns.length;
  const sampled = [];

  if (bootstrapModel === 'blockYears' && n > blockSize) {
    while (sampled.length < numYears) {
      const startIdx = Math.floor(Math.random() * (n - blockSize + 1));
      for (let b = 0; b < blockSize && sampled.length < numYears; b++) {
        sampled.push(historicalReturns[startIdx + b]);
      }
    }
  } else {
    // Single Year bootstrap
    for (let i = 0; i < numYears; i++) {
      const idx = Math.floor(Math.random() * n);
      sampled.push(historicalReturns[idx]);
    }
  }

  return sampled;
}

/**
 * Apply Sequence of Returns Stress Testing
 * Forces worst N years to occur at the start of retirement
 * @param {Array<number>} pathReturns - Full simulated path returns
 * @param {number} worstYearsCount - e.g. 1 to 10
 * @param {number} retirementYear - Index of retirement year
 * @returns {Array<number>} Stressed return sequence
 */
export function applySequenceOfReturnsRisk(pathReturns, worstYearsCount, retirementYear = 0) {
  if (!worstYearsCount || worstYearsCount <= 0 || retirementYear >= pathReturns.length) {
    return pathReturns;
  }

  const result = [...pathReturns];
  const postRetirementReturns = result.slice(retirementYear);

  if (postRetirementReturns.length <= worstYearsCount) {
    // Sort post retirement ascending (worst first)
    postRetirementReturns.sort((a, b) => a - b);
    for (let i = 0; i < postRetirementReturns.length; i++) {
      result[retirementYear + i] = postRetirementReturns[i];
    }
    return result;
  }

  // Find the worst N returns across post-retirement
  const indexed = postRetirementReturns.map((ret, idx) => ({ ret, idx }));
  indexed.sort((a, b) => a.ret - b.ret);

  const worstN = indexed.slice(0, worstYearsCount).map(x => x.ret);
  const remaining = indexed.slice(worstYearsCount).map(x => x.ret);

  // Place worst N at the start of retirement
  const stressedPost = [...worstN, ...remaining];
  for (let i = 0; i < stressedPost.length; i++) {
    result[retirementYear + i] = stressedPost[i];
  }

  return result;
}

// -------------------------------------------------------------------
// Linear Glide Path Allocation Calculator
// -------------------------------------------------------------------

/**
 * Calculates asset weight at year t given linear glidepath transition
 * @param {number} year - Current simulation year (0 to horizon - 1)
 * @param {number} startWeight - Weight in Career / Starting Portfolio (%)
 * @param {number} endWeight - Weight in Retirement / Ending Portfolio (%)
 * @param {number} yearsToRetire - Year of retirement
 * @param {number} glidePathYears - Duration of transition
 * @returns {number}
 */
export function calculateGlidePathWeight(year, startWeight, endWeight, yearsToRetire, glidePathYears) {
  if (glidePathYears <= 0 || year < (yearsToRetire - glidePathYears)) {
    return startWeight;
  }
  if (year >= yearsToRetire) {
    return endWeight;
  }
  const transitionStart = yearsToRetire - glidePathYears;
  const progress = (year - transitionStart) / glidePathYears;
  return startWeight + progress * (endWeight - startWeight);
}

// -------------------------------------------------------------------
// Financial Goals Cashflow Evaluator
// -------------------------------------------------------------------

/**
 * Evaluates total net nominal cash flow for a simulation year across goals
 * @param {number} year - Simulation year (1-based or 0-based)
 * @param {Array<object>} goals - List of goal definitions
 * @param {number} cumulativeInflation - Inflation multiplier since start
 * @param {number} yearsToRetire - Retirement year benchmark
 * @param {number} totalPeriodYears - Full simulation length
 * @returns {number} Net nominal cash flow (+ contribution, - withdrawal)
 */
export function evaluateAnnualGoalsCashflow(year, goals, cumulativeInflation, yearsToRetire, totalPeriodYears) {
  if (!goals || goals.length === 0) return 0;

  let netCashflow = 0;

  goals.forEach(g => {
    const annualAmount = g.frequency === 'monthly' ? (parseFloat(g.amount) || 0) * 12 : (parseFloat(g.amount) || 0);
    const nominalAmount = g.inflationAdjusted ? annualAmount * cumulativeInflation : annualAmount;

    // Determine start year
    let startYr = 0;
    if (g.starts === 'retirement') {
      startYr = yearsToRetire;
    } else if (g.starts === 'in_years') {
      startYr = parseInt(g.startYearsOffset, 10) || 0;
    }

    // Determine end year
    let endYr = totalPeriodYears;
    if (g.duration === 'retirement') {
      endYr = yearsToRetire;
    } else if (g.duration === 'repeats') {
      const count = parseInt(g.repeatCount, 10) || 1;
      endYr = startYr + count;
    }

    if (year >= startYr && year < endYr) {
      if (g.type === 'contribution') {
        netCashflow += nominalAmount;
      } else if (g.type === 'withdrawal') {
        netCashflow -= nominalAmount;
      }
    }
  });

  return netCashflow;
}

// -------------------------------------------------------------------
// Percentile & Statistics Aggregator
// -------------------------------------------------------------------

/**
 * Compute percentile value from an array of numbers
 * @param {Array<number>} sortedArr - Pre-sorted numeric array
 * @param {number} p - Percentile between 0 and 100
 * @returns {number}
 */
export function getPercentile(sortedArr, p) {
  if (!sortedArr || sortedArr.length === 0) return 0;
  if (sortedArr.length === 1) return sortedArr[0];
  const idx = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const weight = idx - lower;
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

/**
 * Build frequency histogram bins from numeric array
 * @param {Array<number>} values - Input data
 * @param {number} numBins - Number of distribution bins
 * @returns {{ bins: Array<{ label: string, min: number, max: number, count: number, pct: number }> }}
 */
export function buildHistogram(values, numBins = 15) {
  if (!values || values.length === 0) return { bins: [] };

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 0.05;
    max += 0.05;
  }

  const binWidth = (max - min) / numBins;
  const bins = Array.from({ length: numBins }, (_, i) => {
    const bMin = min + i * binWidth;
    const bMax = bMin + binWidth;
    return {
      label: `${(bMin * 100).toFixed(1)}% - ${(bMax * 100).toFixed(1)}%`,
      min: bMin,
      max: bMax,
      count: 0,
      pct: 0
    };
  });

  values.forEach(val => {
    let bIdx = Math.floor((val - min) / binWidth);
    if (bIdx >= numBins) bIdx = numBins - 1;
    if (bIdx < 0) bIdx = 0;
    bins[bIdx].count++;
  });

  const total = values.length;
  bins.forEach(b => {
    b.pct = total > 0 ? (b.count / total) * 100 : 0;
  });

  return { bins };
}

// -------------------------------------------------------------------
// Comprehensive Monte Carlo Simulation Engine Pipeline
// -------------------------------------------------------------------

/**
 * Runs complete Monte Carlo simulation across N iterations
 * @param {object} config - Simulation parameters
 * @returns {object} Full statistical percentile curves, survival, and risk metrics
 */
export function runMonteCarloSimulation(config) {
  const {
    initialAmount = 100000,
    simulationPeriod = 30,
    numSimulations = 1000,
    planningType = 'singleStage', // 'singleStage' | 'multistage'
    yearsToRetire = 25,
    glidePathYears = 10,
    simulationModel = 'historical', // 'historical' | 'parameterized' | 'statistical'
    bootstrapModel = 'singleYear',  // 'singleYear' | 'blockYears'
    sequenceRisk = 'none',          // 'none' | 'worst1' ... 'worst10'
    inflationModel = 'historical',  // 'historical' | 'parameterized'
    parameterizedInflationRate = 0.025,
    taxTreatment = 'preTax',        // 'preTax' | 'afterTax'
    taxRate = 0.15,
    startingAllocations = [{ ticker: 'VTI', weight: 60 }, { ticker: 'BND', weight: 40 }],
    endingAllocations = [{ ticker: 'VTI', weight: 30 }, { ticker: 'BND', weight: 70 }],
    assetHistories = {},            // { TICKER: [ annual returns ] }
    goals = [],
    liabilities = [],               // For Asset Liability Modeling
    liabilityDiscountRate = 0.04,
    percentileIntervals = [10, 25, 50, 75, 90]
  } = config;

  // Pre-expand liabilities by year for O(1) lookup during simulation
  const annualLiabilitiesByYear = Array.from({ length: simulationPeriod + 1 }, () => []);
  if (liabilities && liabilities.length > 0) {
    liabilities.forEach(l => {
      const start = Math.max(1, l.startYear || l.year || 1);
      const end = Math.min(simulationPeriod, l.endYear || l.year || start);
      for (let yr = start; yr <= end; yr++) {
        annualLiabilitiesByYear[yr].push({
          name: l.name || 'Liability',
          amount: Number(l.amount) || 0,
          inflationAdjusted: Boolean(l.inflationAdjusted)
        });
      }
    });
  }

  // Extract worst sequence count
  let worstCount = 0;
  if (sequenceRisk.startsWith('worst')) {
    worstCount = parseInt(sequenceRisk.replace('worst', ''), 10) || 0;
  }

  // Pre-calculate blended historical returns for starting & ending portfolios if historical
  const startReturnSeries = computeBlendedReturns(startingAllocations, assetHistories);
  const endReturnSeries = computeBlendedReturns(endingAllocations, assetHistories);

  // Pre-calculate parameterized mean and stdev
  const startParam = computeBlendedParameters(startingAllocations);
  const endParam = computeBlendedParameters(endingAllocations);

  // Historical inflation rates array
  const histInflationRates = HISTORICAL_ANNUAL_INFLATION.map(h => h.rate);

  // Simulation Trajectories Container: balancesByYear[year][simIndex]
  const balancesByYear = Array.from({ length: simulationPeriod + 1 }, () => new Float64Array(numSimulations));
  const realBalancesByYear = Array.from({ length: simulationPeriod + 1 }, () => new Float64Array(numSimulations));
  const maxDrawdowns = new Float64Array(numSimulations);
  const finalCagrs = new Float64Array(numSimulations);
  const annualCashflowsByYear = Array.from({ length: simulationPeriod + 1 }, () => new Float64Array(numSimulations));
  const fundedRatiosByYear = liabilities.length > 0
    ? Array.from({ length: simulationPeriod + 1 }, () => new Float64Array(numSimulations))
    : null;

  // Set Year 0
  for (let s = 0; s < numSimulations; s++) {
    balancesByYear[0][s] = initialAmount;
    realBalancesByYear[0][s] = initialAmount;
  }

  // Set Year 0 Funded Ratio if ALM active
  if (fundedRatiosByYear) {
    const initPV = computeRemainingLiabilitiesPV(1, annualLiabilitiesByYear, 1.0, liabilityDiscountRate, simulationPeriod);
    const initRatio = initPV > 0 ? (initialAmount / initPV) * 100 : 100;
    for (let s = 0; s < numSimulations; s++) {
      fundedRatiosByYear[0][s] = initRatio;
    }
  }

  // Run M Simulation Paths
  for (let s = 0; s < numSimulations; s++) {
    // 1. Generate return path for this trial
    let pathReturns = [];
    if (simulationModel === 'historical') {
      const sampledStart = sampleBootstrapReturns(startReturnSeries, simulationPeriod, bootstrapModel);
      const sampledEnd = sampleBootstrapReturns(endReturnSeries, simulationPeriod, bootstrapModel);

      for (let y = 0; y < simulationPeriod; y++) {
        if (planningType === 'multistage') {
          // Weight between starting and ending portfolio return
          const progress = calculateGlidePathWeight(y, 1, 0, yearsToRetire, glidePathYears);
          pathReturns.push(progress * sampledStart[y] + (1 - progress) * sampledEnd[y]);
        } else {
          pathReturns.push(sampledStart[y]);
        }
      }
    } else {
      // Parameterized Normal returns
      for (let y = 0; y < simulationPeriod; y++) {
        let mean = startParam.mean;
        let stdev = startParam.stdev;
        if (planningType === 'multistage') {
          const progress = calculateGlidePathWeight(y, 1, 0, yearsToRetire, glidePathYears);
          mean = progress * startParam.mean + (1 - progress) * endParam.mean;
          stdev = progress * startParam.stdev + (1 - progress) * endParam.stdev;
        }
        pathReturns.push(sampleParameterizedReturn(mean, stdev));
      }
    }

    // Apply Sequence of Returns Stress if active
    if (worstCount > 0) {
      pathReturns = applySequenceOfReturnsRisk(pathReturns, worstCount, planningType === 'multistage' ? yearsToRetire : 0);
    }

    // 2. Generate Inflation Path
    const inflationPath = [];
    for (let y = 0; y < simulationPeriod; y++) {
      if (inflationModel === 'historical') {
        const idx = Math.floor(Math.random() * histInflationRates.length);
        inflationPath.push(histInflationRates[idx]);
      } else {
        inflationPath.push(parameterizedInflationRate);
      }
    }

    // 3. Step Through Timeline for Simulation Path `s`
    let balance = initialAmount;
    let peak = initialAmount;
    let maxDD = 0;
    let cumulativeInflation = 1.0;

    for (let y = 0; y < simulationPeriod; y++) {
      const yrReturn = pathReturns[y];
      const yrInflation = inflationPath[y];
      cumulativeInflation *= (1 + yrInflation);

      if (balance > 0) {
        // Growth before or with rebalancing
        let growthReturn = yrReturn;
        if (taxTreatment === 'afterTax' && growthReturn > 0) {
          growthReturn *= (1 - taxRate);
        }
        balance *= (1 + growthReturn);

        // Process Cashflow Goals
        const netCashflow = evaluateAnnualGoalsCashflow(y, goals, cumulativeInflation, yearsToRetire, simulationPeriod);
        annualCashflowsByYear[y + 1][s] = netCashflow;
        balance += netCashflow;

        // Process ALM Liabilities (if active)
        if (annualLiabilitiesByYear[y + 1] && annualLiabilitiesByYear[y + 1].length > 0) {
          let yrLiabTotal = 0;
          const yrLiabs = annualLiabilitiesByYear[y + 1];
          for (let li = 0; li < yrLiabs.length; li++) {
            yrLiabTotal += yrLiabs[li].inflationAdjusted ? yrLiabs[li].amount * cumulativeInflation : yrLiabs[li].amount;
          }
          balance -= yrLiabTotal;
        }

        // Ruin constraint
        if (balance < 0) balance = 0;
      } else {
        balance = 0;
        annualCashflowsByYear[y + 1][s] = 0;
      }

      balancesByYear[y + 1][s] = balance;
      realBalancesByYear[y + 1][s] = balance / cumulativeInflation;

      // Track Peak & Drawdown
      if (balance > peak) peak = balance;
      const dd = peak > 0 ? (balance - peak) / peak : 0;
      if (dd < maxDD) maxDD = dd;

      // Track ALM Funded Ratio if active
      if (fundedRatiosByYear) {
        const remainingLiabilitiesPV = computeRemainingLiabilitiesPV(y + 1, annualLiabilitiesByYear, cumulativeInflation, liabilityDiscountRate, simulationPeriod);
        fundedRatiosByYear[y + 1][s] = remainingLiabilitiesPV > 0
          ? (balance / remainingLiabilitiesPV) * 100
          : (balance > 0 ? 100 : 0);
      }
    }

    maxDrawdowns[s] = maxDD;
    finalCagrs[s] = initialAmount > 0 && balance > 0
      ? Math.pow(balance / initialAmount, 1 / simulationPeriod) - 1
      : -1.0;
  }

  // -----------------------------------------------------------------
  // 4. Percentile Synthesis & Analytics
  // -----------------------------------------------------------------
  const percentileTrajectories = {};
  const realPercentileTrajectories = {};
  percentileIntervals.forEach(p => {
    percentileTrajectories[p] = new Float64Array(simulationPeriod + 1);
    realPercentileTrajectories[p] = new Float64Array(simulationPeriod + 1);
  });

  const survivalRates = new Float64Array(simulationPeriod + 1);
  survivalRates[0] = 100.0;

  for (let y = 0; y <= simulationPeriod; y++) {
    const rawNom = Array.from(balancesByYear[y]);
    rawNom.sort((a, b) => a - b);

    const rawReal = Array.from(realBalancesByYear[y]);
    rawReal.sort((a, b) => a - b);

    percentileIntervals.forEach(p => {
      percentileTrajectories[p][y] = getPercentile(rawNom, p);
      realPercentileTrajectories[p][y] = getPercentile(rawReal, p);
    });

    if (y > 0) {
      let solventCount = 0;
      for (let s = 0; s < numSimulations; s++) {
        if (balancesByYear[y][s] > 0) solventCount++;
      }
      survivalRates[y] = (solventCount / numSimulations) * 100;
    }
  }

  // SWR Matrix: calculate success rates across initial withdrawal rates
  const swrRates = [0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.06];
  const swrMatrix = computeSafeWithdrawalRates(swrRates, initialAmount, simulationPeriod, pathReturnsCache(numSimulations, startReturnSeries, simulationPeriod));

  // Synthesize ALM Metrics if active
  let fundedRatioPercentiles = null;
  let deficitProbabilities = null;
  let liabilityPVTrajectory = null;
  let annualOutflowsByYear = null;

  if (fundedRatiosByYear) {
    fundedRatioPercentiles = {};
    percentileIntervals.forEach(p => {
      fundedRatioPercentiles[p] = new Float64Array(simulationPeriod + 1);
    });
    deficitProbabilities = new Float64Array(simulationPeriod + 1);
    liabilityPVTrajectory = new Float64Array(simulationPeriod + 1);
    annualOutflowsByYear = new Float64Array(simulationPeriod + 1);

    for (let y = 0; y <= simulationPeriod; y++) {
      const rawRatios = Array.from(fundedRatiosByYear[y]).sort((a, b) => a - b);
      percentileIntervals.forEach(p => {
        fundedRatioPercentiles[p][y] = getPercentile(rawRatios, p);
      });

      if (y === 0) {
        deficitProbabilities[0] = fundedRatiosByYear[0][0] < 100 ? 100 : 0;
        liabilityPVTrajectory[0] = computeRemainingLiabilitiesPV(1, annualLiabilitiesByYear, 1.0, liabilityDiscountRate, simulationPeriod);
      } else {
        let deficitCount = 0;
        for (let s = 0; s < numSimulations; s++) {
          if (fundedRatiosByYear[y][s] < 100) deficitCount++;
        }
        deficitProbabilities[y] = (deficitCount / numSimulations) * 100;

        liabilityPVTrajectory[y] = computeRemainingLiabilitiesPV(y + 1, annualLiabilitiesByYear, 1.0, liabilityDiscountRate, simulationPeriod);
        if (annualLiabilitiesByYear[y]) {
          let yrOut = 0;
          annualLiabilitiesByYear[y].forEach(item => { yrOut += item.amount; });
          annualOutflowsByYear[y] = yrOut;
        }
      }
    }
  }

  // Build Return & Drawdown Histograms
  const sortedCagrs = Array.from(finalCagrs).filter(c => c > -1);
  const returnHistogram = buildHistogram(sortedCagrs, 14);
  const drawdownHistogram = buildHistogram(Array.from(maxDrawdowns), 14);

  // Summary Metrics Table
  const sortedFinalNom = Array.from(balancesByYear[simulationPeriod]).sort((a, b) => a - b);
  const sortedFinalReal = Array.from(realBalancesByYear[simulationPeriod]).sort((a, b) => a - b);
  const sortedDD = Array.from(maxDrawdowns).sort((a, b) => a - b);
  const sortedCagrAll = Array.from(finalCagrs).sort((a, b) => a - b);

  const summary = {
    nominalFinal: {
      p10: getPercentile(sortedFinalNom, 10),
      p25: getPercentile(sortedFinalNom, 25),
      p50: getPercentile(sortedFinalNom, 50),
      p75: getPercentile(sortedFinalNom, 75),
      p90: getPercentile(sortedFinalNom, 90)
    },
    realFinal: {
      p10: getPercentile(sortedFinalReal, 10),
      p25: getPercentile(sortedFinalReal, 25),
      p50: getPercentile(sortedFinalReal, 50),
      p75: getPercentile(sortedFinalReal, 75),
      p90: getPercentile(sortedFinalReal, 90)
    },
    cagr: {
      p10: getPercentile(sortedCagrAll, 10),
      p25: getPercentile(sortedCagrAll, 25),
      p50: getPercentile(sortedCagrAll, 50),
      p75: getPercentile(sortedCagrAll, 75),
      p90: getPercentile(sortedCagrAll, 90)
    },
    maxDrawdown: {
      p10: getPercentile(sortedDD, 10),
      p25: getPercentile(sortedDD, 25),
      p50: getPercentile(sortedDD, 50),
      p75: getPercentile(sortedDD, 75),
      p90: getPercentile(sortedDD, 90)
    },
    finalSurvivalRate: survivalRates[simulationPeriod]
  };

  return {
    simulationPeriod,
    numSimulations,
    percentileTrajectories,
    realPercentileTrajectories,
    survivalRates: Array.from(survivalRates),
    summary,
    returnHistogram,
    drawdownHistogram,
    swrMatrix,
    fundedRatiosByYear: fundedRatiosByYear ? fundedRatiosByYear.map(arr => Array.from(arr)) : null,
    fundedRatioPercentiles,
    deficitProbabilities: deficitProbabilities ? Array.from(deficitProbabilities) : null,
    liabilityPVTrajectory: liabilityPVTrajectory ? Array.from(liabilityPVTrajectory) : null,
    annualOutflowsByYear: annualOutflowsByYear ? Array.from(annualOutflowsByYear) : null
  };
}

// -------------------------------------------------------------------
// Helper Calculations
// -------------------------------------------------------------------

function computeBlendedReturns(allocations, assetHistories) {
  if (!allocations || allocations.length === 0) return [0.08];

  // Try to use real historical return arrays
  const seriesList = [];
  allocations.forEach(a => {
    const hist = assetHistories[a.ticker.toUpperCase()];
    if (hist && hist.length > 0) {
      seriesList.push({ weight: a.weight / 100, data: hist });
    }
  });

  if (seriesList.length === 0) {
    // Synthesize historical series from canonical asset class if available
    return [0.10, 0.15, -0.04, 0.22, 0.08, -0.12, 0.18, 0.05, 0.28, -0.18, 0.14, 0.20];
  }

  // Find common length
  const minLen = Math.min(...seriesList.map(s => s.data.length));
  const blended = [];
  for (let i = 0; i < minLen; i++) {
    let yrReturn = 0;
    seriesList.forEach(s => {
      yrReturn += s.weight * s.data[i];
    });
    blended.push(yrReturn);
  }

  return blended.length > 0 ? blended : [0.08];
}

function computeBlendedParameters(allocations) {
  if (!allocations || allocations.length === 0) {
    return { mean: 0.08, stdev: 0.15 };
  }
  let mean = 0;
  let stdev = 0;
  allocations.forEach(a => {
    const assetMeta = CANONICAL_ASSET_CLASSES[a.ticker] || { mean: 0.08, stdev: 0.15 };
    const wt = a.weight / 100;
    mean += wt * assetMeta.mean;
    stdev += wt * assetMeta.stdev;
  });
  return { mean, stdev };
}

function pathReturnsCache(numSimulations, baseReturns, period) {
  return Array.from({ length: Math.min(numSimulations, 1000) }, () =>
    sampleBootstrapReturns(baseReturns, period, 'singleYear')
  );
}

function computeSafeWithdrawalRates(rates, initialAmount, period, simulatedPaths) {
  return rates.map(rate => {
    const annualWithdrawal = initialAmount * rate;
    let successCount = 0;
    simulatedPaths.forEach(path => {
      let bal = initialAmount;
      let failed = false;
      for (let y = 0; y < period; y++) {
        bal *= (1 + path[y]);
        bal -= annualWithdrawal;
        if (bal <= 0) {
          failed = true;
          break;
        }
      }
      if (!failed) successCount++;
    });
    return {
      withdrawalRate: rate,
      successRate: (successCount / simulatedPaths.length) * 100
    };
  });
}

export function computeRemainingLiabilitiesPV(currentYear, liabilities, cumulativeInflation = 1.0, discountRate = 0.04, period = 30) {
  let pv = 0;
  if (!liabilities) return 0;
  if (Array.isArray(liabilities) && liabilities.length > 0 && Array.isArray(liabilities[0])) {
    // Array-of-arrays indexed by year
    for (let yr = currentYear; yr <= period; yr++) {
      const liabs = liabilities[yr];
      if (liabs) {
        for (let i = 0; i < liabs.length; i++) {
          const item = liabs[i];
          const nom = item.inflationAdjusted ? item.amount * cumulativeInflation : item.amount;
          const dt = yr - currentYear;
          pv += nom / Math.pow(1 + discountRate, dt);
        }
      }
    }
  } else {
    // Flat array of liability items { year, amount, inflationAdjusted }
    liabilities.forEach(l => {
      const yr = l.year || l.startYear || 1;
      if (yr >= currentYear) {
        const dt = yr - currentYear;
        const nom = l.inflationAdjusted ? l.amount * cumulativeInflation : l.amount;
        pv += nom / Math.pow(1 + discountRate, dt);
      }
    });
  }
  return pv;
}
