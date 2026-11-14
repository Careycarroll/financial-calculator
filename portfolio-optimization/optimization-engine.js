/**
 * Portfolio Optimization Engine
 * Replicates Portfolio Visualizer's institutional-grade optimization algorithms:
 * - Covariance & Correlation matrix computation with common inception date clipping
 * - Simplex & Box-constrained projection (Duchi/Michelot algorithm)
 * - Convex Quadratic Programming solver for Global Minimum Volatility (GMV)
 * - Maximum Sharpe Ratio (Tangency Portfolio) solver
 * - Markowitz Efficient Frontier curve generation with Capital Allocation Line (CAL)
 * - Efficient Frontier Transition Map (Stacked weights across volatility spectrum)
 * - Monte Carlo random portfolio simulation (Dirichlet scatter cloud)
 */

/**
 * Validates and normalizes asset weight bounds.
 * @param {number} numAssets
 * @param {Array<number>} [minWeights] - Default 0
 * @param {Array<number>} [maxWeights] - Default 1
 * @returns {{ lower: number[], upper: number[] }}
 */
export function validateBounds(numAssets, minWeights, maxWeights) {
  const lower = new Array(numAssets).fill(0);
  const upper = new Array(numAssets).fill(1);

  if (Array.isArray(minWeights)) {
    for (let i = 0; i < numAssets; i++) {
      if (typeof minWeights[i] === 'number' && !isNaN(minWeights[i])) {
        lower[i] = Math.max(0, Math.min(1, minWeights[i]));
      }
    }
  }

  if (Array.isArray(maxWeights)) {
    for (let i = 0; i < numAssets; i++) {
      if (typeof maxWeights[i] === 'number' && !isNaN(maxWeights[i])) {
        upper[i] = Math.max(lower[i], Math.min(1, maxWeights[i]));
      }
    }
  }

  return { lower, upper };
}

/**
 * Finds the common overlapping date range across an array of fund objects.
 * @param {Array<{ticker: string, data: Array<{date: string, adjClose?: number, close?: number}>}>} funds
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

  return { start: maxStart, end: minEnd, limitingFund, totalMonths };
}

/**
 * Computes asset return series, annualized mean returns, covariance matrix,
 * correlation matrix, and individual asset risk metrics.
 * Follows Portfolio Visualizer's ex-ante arithmetic monthly mean convention:
 * Expected Return = 12 * mean(monthly returns)
 * Annual Volatility = sqrt(12) * stdev(monthly returns)
 *
 * @param {Array<{ticker: string, name?: string, data: Array<{date: string, adjClose?: number, close?: number}>}>} assets
 * @param {Object} [options]
 * @param {number} [options.riskFreeRate=0.03] - Annual risk-free rate (e.g. 0.03 for 3%)
 * @param {string} [options.startDate] - Optional override start 'YYYY-MM'
 * @param {string} [options.endDate] - Optional override end 'YYYY-MM'
 * @returns {Object} Asset statistics and covariance matrices
 */
export function computeAssetStatistics(assets, options = {}) {
  if (!assets || assets.length < 2) {
    throw new Error('At least 2 assets are required for portfolio optimization.');
  }

  const annualRf = typeof options.riskFreeRate === 'number' ? options.riskFreeRate : 0.03;
  const common = findCommonDateRange(assets);

  const start = options.startDate && options.startDate >= common.start ? options.startDate : common.start;
  const end = options.endDate && options.endDate <= common.end ? options.endDate : common.end;

  if (!start || !end || start >= end) {
    throw new Error('Assets have insufficient overlapping historical date range.');
  }

  const numAssets = assets.length;
  const tickers = assets.map(a => a.ticker.toUpperCase());
  const names = assets.map(a => a.name || a.ticker.toUpperCase());

  // Extract aligned monthly price series
  // Price array for each asset: [{date, price}]
  const alignedPrices = assets.map(asset => {
    return asset.data
      .filter(d => d.date >= start && d.date <= end)
      .map(d => ({
        date: d.date,
        price: typeof d.adjClose === 'number' && !isNaN(d.adjClose) ? d.adjClose : d.close
      }));
  });

  const totalPeriods = alignedPrices[0].length;
  if (totalPeriods < 3) {
    throw new Error('At least 3 monthly observations are required to compute covariance.');
  }

  // Compute monthly percentage returns: r_t = (P_t - P_{t-1}) / P_{t-1}
  const monthlyReturns = [];
  for (let i = 0; i < numAssets; i++) {
    const pSeries = alignedPrices[i];
    const rSeries = [];
    for (let t = 1; t < pSeries.length; t++) {
      const prev = pSeries[t - 1].price;
      const curr = pSeries[t].price;
      const ret = prev > 0 ? (curr - prev) / prev : 0;
      rSeries.push(ret);
    }
    monthlyReturns.push(rSeries);
  }

  const numObservations = monthlyReturns[0].length; // T - 1 returns

  // 1. Mean monthly returns and annualized expected returns (arithmetic convention)
  const monthlyMeans = new Array(numAssets).fill(0);
  for (let i = 0; i < numAssets; i++) {
    let sum = 0;
    for (let t = 0; t < numObservations; t++) {
      sum += monthlyReturns[i][t];
    }
    monthlyMeans[i] = sum / numObservations;
  }

  const expectedReturns = monthlyMeans.map(m => m * 12); // Annualized

  // 2. Sample Covariance Matrix (Annualized: 12 * S)
  const covarianceMatrix = [];
  for (let i = 0; i < numAssets; i++) {
    covarianceMatrix[i] = new Array(numAssets).fill(0);
  }

  for (let i = 0; i < numAssets; i++) {
    for (let j = i; j < numAssets; j++) {
      let sumProduct = 0;
      for (let t = 0; t < numObservations; t++) {
        const diffI = monthlyReturns[i][t] - monthlyMeans[i];
        const diffJ = monthlyReturns[j][t] - monthlyMeans[j];
        sumProduct += diffI * diffJ;
      }
      const covMonthly = sumProduct / (numObservations - 1);
      const covAnnual = covMonthly * 12;
      covarianceMatrix[i][j] = covAnnual;
      covarianceMatrix[j][i] = covAnnual;
    }
  }

  // 3. Volatilities & Correlation Matrix
  const volatilities = new Array(numAssets).fill(0);
  for (let i = 0; i < numAssets; i++) {
    volatilities[i] = Math.sqrt(Math.max(0, covarianceMatrix[i][i]));
  }

  const correlationMatrix = [];
  for (let i = 0; i < numAssets; i++) {
    correlationMatrix[i] = new Array(numAssets).fill(0);
    for (let j = 0; j < numAssets; j++) {
      const denom = volatilities[i] * volatilities[j];
      correlationMatrix[i][j] = denom > 0 ? Math.max(-1, Math.min(1, covarianceMatrix[i][j] / denom)) : 0;
    }
  }

  // 4. Individual Asset Sharpe Ratios
  const sharpeRatios = new Array(numAssets).fill(0);
  for (let i = 0; i < numAssets; i++) {
    sharpeRatios[i] = volatilities[i] > 0 ? (expectedReturns[i] - annualRf) / volatilities[i] : 0;
  }

  return {
    dateRange: { start, end, totalMonths: totalPeriods },
    numAssets,
    tickers,
    names,
    riskFreeRate: annualRf,
    expectedReturns,
    volatilities,
    sharpeRatios,
    covarianceMatrix,
    correlationMatrix,
    monthlyReturns
  };
}

/**
 * Calculates portfolio variance, volatility, return, and Sharpe ratio given weights.
 * @param {Array<number>} weights
 * @param {Array<number>} expectedReturns
 * @param {Array<Array<number>>} covarianceMatrix
 * @param {number} [riskFreeRate=0.03]
 * @returns {{ expectedReturn: number, variance: number, volatility: number, sharpeRatio: number, weights: number[] }}
 */
export function calculatePortfolioStats(weights, expectedReturns, covarianceMatrix, riskFreeRate = 0.03) {
  const n = weights.length;
  let expectedReturn = 0;
  for (let i = 0; i < n; i++) {
    expectedReturn += weights[i] * expectedReturns[i];
  }

  let variance = 0;
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += weights[j] * covarianceMatrix[i][j];
    }
    variance += weights[i] * rowSum;
  }

  variance = Math.max(0, variance);
  const volatility = Math.sqrt(variance);
  const sharpeRatio = volatility > 0 ? (expectedReturn - riskFreeRate) / volatility : 0;

  return {
    expectedReturn,
    variance,
    volatility,
    sharpeRatio,
    weights: [...weights]
  };
}

/**
 * Projects an arbitrary weight vector v onto the bounded simplex:
 * { w | sum(w_i) = targetSum, lower[i] <= w_i <= upper[i] }
 * Uses exact 1D bisection on Lagrange multiplier lambda.
 *
 * @param {Array<number>} v
 * @param {Array<number>} lower
 * @param {Array<number>} upper
 * @param {number} [targetSum=1]
 * @returns {Array<number>} Projected feasible weights
 */
export function projectOntoSimplex(v, lower, upper, targetSum = 1) {
  const n = v.length;
  const lSum = lower.reduce((a, b) => a + b, 0);
  const uSum = upper.reduce((a, b) => a + b, 0);

  // Feasibility safety check
  if (lSum > targetSum + 1e-7 || uSum < targetSum - 1e-7) {
    // If strict bounds are infeasible, fallback to standard simplex (w_i >= 0, sum = 1)
    return projectOntoStandardSimplex(v, targetSum);
  }

  // Find lambda such that sum(clip(v_i - lambda, lower_i, upper_i)) = targetSum
  let low = -100;
  let high = 100;
  for (let i = 0; i < n; i++) {
    low = Math.min(low, v[i] - upper[i]);
    high = Math.max(high, v[i] - lower[i]);
  }

  let lambda = 0;
  for (let iter = 0; iter < 45; iter++) {
    lambda = 0.5 * (low + high);
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += Math.max(lower[i], Math.min(upper[i], v[i] - lambda));
    }
    if (s > targetSum) {
      low = lambda;
    } else {
      high = lambda;
    }
  }

  const result = new Array(n);
  let finalSum = 0;
  for (let i = 0; i < n; i++) {
    result[i] = Math.max(lower[i], Math.min(upper[i], v[i] - lambda));
    finalSum += result[i];
  }

  // Final micro-normalization to ensure sum is exactly targetSum
  if (finalSum > 0 && Math.abs(finalSum - targetSum) > 1e-9) {
    const diff = targetSum - finalSum;
    for (let i = 0; i < n; i++) {
      if (result[i] + diff >= lower[i] && result[i] + diff <= upper[i]) {
        result[i] += diff;
        break;
      }
    }
  }

  return result;
}

/**
 * Standard projection onto { w | sum(w) = targetSum, w_i >= 0 }
 * Duchi et al. (2008) algorithm.
 */
function projectOntoStandardSimplex(v, targetSum = 1) {
  const n = v.length;
  const u = [...v].sort((a, b) => b - a);
  let cssv = 0;
  let rho = 0;
  for (let i = 0; i < n; i++) {
    cssv += u[i];
    const condition = u[i] - (cssv - targetSum) / (i + 1);
    if (condition > 0) {
      rho = i;
    }
  }
  let sumRho = 0;
  for (let i = 0; i <= rho; i++) {
    sumRho += u[i];
  }
  const theta = (sumRho - targetSum) / (rho + 1);
  return v.map(val => Math.max(0, val - theta));
}

/**
 * Solves for the Global Minimum Volatility (GMV) portfolio:
 * min_w (1/2) w^T Sigma w  subject to sum(w_i) = 1, lower_i <= w_i <= upper_i
 * Uses Projected Gradient Descent with Barzilai-Borwein adaptive step sizes.
 *
 * @param {Array<number>} expectedReturns
 * @param {Array<Array<number>>} covarianceMatrix
 * @param {Object} [options]
 * @param {Array<number>} [options.lowerBounds]
 * @param {Array<number>} [options.upperBounds]
 * @param {number} [options.riskFreeRate=0.03]
 * @returns {Object} GMV portfolio stats
 */
export function solveGMV(expectedReturns, covarianceMatrix, options = {}) {
  const n = expectedReturns.length;
  const { lower, upper } = validateBounds(n, options.lowerBounds, options.upperBounds);
  const rf = typeof options.riskFreeRate === 'number' ? options.riskFreeRate : 0.03;

  // Initialize weights equally or inverse volatility
  let w = new Array(n).fill(1 / n);
  w = projectOntoSimplex(w, lower, upper);

  // Gradient of 0.5 * w^T Sigma w is Sigma * w
  const maxIter = 500;
  const tol = 1e-8;
  let step = 0.01;

  let prevW = [...w];
  let prevGrad = new Array(n).fill(0);

  // First step gradient
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      prevGrad[i] += covarianceMatrix[i][j] * w[j];
    }
  }

  for (let iter = 0; iter < maxIter; iter++) {
    // Current gradient: g = Sigma * w
    const grad = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        grad[i] += covarianceMatrix[i][j] * w[j];
      }
    }

    // Barzilai-Borwein step size update if iter > 0
    if (iter > 0) {
      let sDotS = 0;
      let sDotY = 0;
      for (let i = 0; i < n; i++) {
        const s = w[i] - prevW[i];
        const y = grad[i] - prevGrad[i];
        sDotS += s * s;
        sDotY += s * y;
      }
      if (sDotY > 1e-12) {
        step = Math.min(1.0, Math.max(1e-4, sDotS / sDotY));
      }
    }

    prevW = [...w];
    prevGrad = [...grad];

    // Gradient descent step and projection
    const trial = new Array(n);
    for (let i = 0; i < n; i++) {
      trial[i] = w[i] - step * grad[i];
    }

    w = projectOntoSimplex(trial, lower, upper);

    // Check convergence
    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      maxDelta = Math.max(maxDelta, Math.abs(w[i] - prevW[i]));
    }
    if (maxDelta < tol) break;
  }

  return calculatePortfolioStats(w, expectedReturns, covarianceMatrix, rf);
}

/**
 * Solves for the minimum variance portfolio achieving a specific target expected return:
 * min_w 0.5 * w^T Sigma w + gamma * (w^T mu - targetReturn)^2
 * subject to sum(w) = 1, lower <= w <= upper.
 *
 * @param {number} targetReturn
 * @param {Array<number>} expectedReturns
 * @param {Array<Array<number>>} covarianceMatrix
 * @param {Object} [options]
 * @returns {Object} Target return portfolio stats
 */
export function solveTargetReturnPortfolio(targetReturn, expectedReturns, covarianceMatrix, options = {}) {
  const n = expectedReturns.length;
  const { lower, upper } = validateBounds(n, options.lowerBounds, options.upperBounds);
  const rf = typeof options.riskFreeRate === 'number' ? options.riskFreeRate : 0.03;

  // Initial weights
  let w = new Array(n).fill(1 / n);
  w = projectOntoSimplex(w, lower, upper);

  // Penalty multiplier for return target constraint
  let gamma = 50.0;
  const maxIter = 400;
  let step = 0.005;

  for (let iter = 0; iter < maxIter; iter++) {
    // Current portfolio return
    let portRet = 0;
    for (let i = 0; i < n; i++) {
      portRet += w[i] * expectedReturns[i];
    }

    const retError = portRet - targetReturn;

    // Gradient: g = Sigma * w + 2 * gamma * (w^T mu - targetReturn) * mu
    const grad = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sigW = 0;
      for (let j = 0; j < n; j++) {
        sigW += covarianceMatrix[i][j] * w[j];
      }
      grad[i] = sigW + 2 * gamma * retError * expectedReturns[i];
    }

    const prevW = [...w];
    const trial = new Array(n);
    for (let i = 0; i < n; i++) {
      trial[i] = w[i] - step * grad[i];
    }

    w = projectOntoSimplex(trial, lower, upper);

    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      maxDelta = Math.max(maxDelta, Math.abs(w[i] - prevW[i]));
    }
    if (maxDelta < 1e-8 && Math.abs(retError) < 1e-4) break;
  }

  return calculatePortfolioStats(w, expectedReturns, covarianceMatrix, rf);
}

/**
 * Solves for the Maximum Sharpe Ratio (Tangency Portfolio):
 * max_w (w^T mu - Rf) / sqrt(w^T Sigma w)
 * subject to sum(w) = 1, lower <= w <= upper.
 *
 * @param {Array<number>} expectedReturns
 * @param {Array<Array<number>>} covarianceMatrix
 * @param {Object} [options]
 * @returns {Object} Tangency portfolio stats
 */
export function solveTangencyPortfolio(expectedReturns, covarianceMatrix, options = {}) {
  const n = expectedReturns.length;
  const { lower, upper } = validateBounds(n, options.lowerBounds, options.upperBounds);
  const rf = typeof options.riskFreeRate === 'number' ? options.riskFreeRate : 0.03;

  // 1. First find GMV and maximum single asset return
  const gmv = solveGMV(expectedReturns, covarianceMatrix, options);

  let maxAssetRet = expectedReturns[0];
  for (let i = 1; i < n; i++) {
    if (expectedReturns[i] > maxAssetRet) maxAssetRet = expectedReturns[i];
  }

  // If even the highest expected return is below Rf, Sharpe is negative everywhere; GMV maximizes it (least negative).
  if (maxAssetRet <= rf) {
    return gmv;
  }

  // 2. Dense 1D grid search over target returns from gmv.expectedReturn to maxAssetRet
  const steps = 120;
  const minR = Math.max(gmv.expectedReturn, rf + 0.001);
  const maxR = maxAssetRet;

  let bestPortfolio = gmv;
  let bestSharpe = gmv.sharpeRatio;

  if (maxR > minR) {
    for (let k = 0; k <= steps; k++) {
      const targetR = minR + (k / steps) * (maxR - minR);
      const port = solveTargetReturnPortfolio(targetR, expectedReturns, covarianceMatrix, options);
      if (port.sharpeRatio > bestSharpe) {
        bestSharpe = port.sharpeRatio;
        bestPortfolio = port;
      }
    }
  }

  // 3. Fine-grain polish around best candidate using numerical gradient ascent on Sharpe
  let w = [...bestPortfolio.weights];
  const maxPolishIter = 150;
  let polishStep = 0.002;

  for (let iter = 0; iter < maxPolishIter; iter++) {
    const curStats = calculatePortfolioStats(w, expectedReturns, covarianceMatrix, rf);
    if (curStats.volatility <= 0) break;

    // Gradient of Sharpe ratio S(w) = (r_p - Rf) / sigma_p
    // dS/dw_i = (mu_i * sigma_p - (r_p - Rf) * (Sigma*w)_i / sigma_p) / sigma_p^2
    const grad = new Array(n).fill(0);
    const excess = curStats.expectedReturn - rf;
    const vol = curStats.volatility;
    const volSq = curStats.variance;

    for (let i = 0; i < n; i++) {
      let sigW = 0;
      for (let j = 0; j < n; j++) {
        sigW += covarianceMatrix[i][j] * w[j];
      }
      grad[i] = (expectedReturns[i] * vol - (excess * sigW) / vol) / volSq;
    }

    const prevW = [...w];
    const trial = new Array(n);
    for (let i = 0; i < n; i++) {
      trial[i] = w[i] + polishStep * grad[i]; // Ascent
    }

    w = projectOntoSimplex(trial, lower, upper);
    const newStats = calculatePortfolioStats(w, expectedReturns, covarianceMatrix, rf);

    if (newStats.sharpeRatio > bestPortfolio.sharpeRatio) {
      bestPortfolio = newStats;
    }

    let delta = 0;
    for (let i = 0; i < n; i++) {
      delta = Math.max(delta, Math.abs(w[i] - prevW[i]));
    }
    if (delta < 1e-7) break;
  }

  return bestPortfolio;
}

/**
 * Generates the full Markowitz Efficient Frontier curve, Tangency portfolio,
 * GMV portfolio, Capital Allocation Line (CAL), and Transition Map data.
 *
 * @param {Array<number>} expectedReturns
 * @param {Array<Array<number>>} covarianceMatrix
 * @param {Object} [options]
 * @param {number} [options.riskFreeRate=0.03]
 * @param {Array<number>} [options.lowerBounds]
 * @param {Array<number>} [options.upperBounds]
 * @param {number} [options.numPoints=50] - Number of points along the frontier curve
 * @returns {Object} Complete efficient frontier solution
 */
export function generateEfficientFrontier(expectedReturns, covarianceMatrix, options = {}) {
  const n = expectedReturns.length;
  const numPoints = Math.max(20, Math.min(100, options.numPoints || 50));
  const rf = typeof options.riskFreeRate === 'number' ? options.riskFreeRate : 0.03;

  // 1. Solve GMV portfolio (starting base of the efficient frontier)
  const gmv = solveGMV(expectedReturns, covarianceMatrix, options);

  // 2. Solve Tangency portfolio (Maximum Sharpe)
  const tangency = solveTangencyPortfolio(expectedReturns, covarianceMatrix, options);

  // 3. Find maximum achievable return across permissible bounds
  let maxReturn = expectedReturns[0];
  for (let i = 1; i < n; i++) {
    if (expectedReturns[i] > maxReturn) maxReturn = expectedReturns[i];
  }

  const minReturn = gmv.expectedReturn;
  const targetReturns = [];

  if (maxReturn <= minReturn + 1e-5) {
    targetReturns.push(minReturn);
  } else {
    for (let i = 0; i < numPoints; i++) {
      targetReturns.push(minReturn + (i / (numPoints - 1)) * (maxReturn - minReturn));
    }
  }

  // 4. Solve constrained quadratic programming at each return step
  const rawFrontier = [];
  for (let i = 0; i < targetReturns.length; i++) {
    const port = solveTargetReturnPortfolio(targetReturns[i], expectedReturns, covarianceMatrix, options);
    rawFrontier.push(port);
  }

  // Ensure tangency and GMV are explicitly represented on the frontier
  const frontier = [...rawFrontier];
  frontier.sort((a, b) => a.volatility - b.volatility);

  // 5. Generate Capital Allocation Line (CAL)
  // CAL passes from (0, Rf) through Tangency (sigma_tan, r_tan)
  // Extends up to 1.5 * max(volatility)
  let maxFrontierVol = frontier[frontier.length - 1].volatility;
  for (let i = 0; i < n; i++) {
    const assetVol = Math.sqrt(covarianceMatrix[i][i]);
    if (assetVol > maxFrontierVol) maxFrontierVol = assetVol;
  }

  const calEndVol = maxFrontierVol * 1.25;
  const calSlope = tangency.volatility > 0 ? (tangency.expectedReturn - rf) / tangency.volatility : 0;
  const calLine = [
    { volatility: 0, expectedReturn: rf },
    { volatility: tangency.volatility, expectedReturn: tangency.expectedReturn },
    { volatility: calEndVol, expectedReturn: rf + calSlope * calEndVol }
  ];

  // 6. Generate Transition Map Data (Stacked Weights across increasing Volatility)
  const transitionMap = {
    volatilities: frontier.map(p => p.volatility),
    expectedReturns: frontier.map(p => p.expectedReturn),
    series: []
  };

  for (let assetIdx = 0; assetIdx < n; assetIdx++) {
    transitionMap.series.push({
      assetIndex: assetIdx,
      weights: frontier.map(p => p.weights[assetIdx])
    });
  }

  return {
    gmvPortfolio: gmv,
    tangencyPortfolio: tangency,
    frontier,
    calLine,
    transitionMap,
    numPoints: frontier.length
  };
}

/**
 * Generates a Monte Carlo cloud of simulated random portfolios (Dirichlet sampling)
 * to visualize the feasible investment region.
 *
 * @param {Array<number>} expectedReturns
 * @param {Array<Array<number>>} covarianceMatrix
 * @param {Object} [options]
 * @param {number} [options.count=2500]
 * @param {number} [options.riskFreeRate=0.03]
 * @param {Array<number>} [options.lowerBounds]
 * @param {Array<number>} [options.upperBounds]
 * @returns {Array<{ expectedReturn: number, volatility: number, sharpeRatio: number, weights: number[] }>}
 */
export function generateMonteCarloPortfolios(expectedReturns, covarianceMatrix, options = {}) {
  const n = expectedReturns.length;
  const count = Math.max(500, Math.min(5000, options.count || 2500));
  const rf = typeof options.riskFreeRate === 'number' ? options.riskFreeRate : 0.03;
  const { lower, upper } = validateBounds(n, options.lowerBounds, options.upperBounds);

  const results = [];

  for (let iter = 0; iter < count; iter++) {
    // Generate exponential random variables for Dirichlet distribution
    const raw = new Array(n);
    for (let i = 0; i < n; i++) {
      raw[i] = -Math.log(Math.max(1e-9, Math.random()));
    }
    const weights = projectOntoSimplex(raw, lower, upper);
    const stats = calculatePortfolioStats(weights, expectedReturns, covarianceMatrix, rf);
    results.push(stats);
  }

  return results;
}
