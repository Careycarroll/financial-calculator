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
 * Computes eigenvalues and eigenvectors of a real symmetric K x K matrix
 * using the classical Jacobi rotation method with quadratic convergence.
 *
 * @param {Array<Array<number>>} A - Symmetric K x K matrix
 * @param {number} [maxSweeps=50]
 * @param {number} [tol=1e-12]
 * @returns {{ eigenvalues: Array<number>, eigenvectors: Array<Array<number>> }}
 */
export function jacobiEigenvalues(A, maxSweeps = 50, tol = 1e-12) {
  const K = A.length;
  if (K === 0) return { eigenvalues: [], eigenvectors: [] };
  if (K === 1) return { eigenvalues: [A[0][0]], eigenvectors: [[1]] };

  // Clone A into working matrix S
  const S = Array.from({ length: K }, (_, r) => Float64Array.from(A[r]));

  // Initialize V to identity matrix I_K
  const V = Array.from({ length: K }, (_, r) => {
    const row = new Float64Array(K);
    row[r] = 1.0;
    return row;
  });

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let maxOffDiag = 0;
    for (let i = 0; i < K - 1; i++) {
      for (let j = i + 1; j < K; j++) {
        const absVal = Math.abs(S[i][j]);
        if (absVal > maxOffDiag) maxOffDiag = absVal;
      }
    }

    if (maxOffDiag < tol) break;

    for (let p = 0; p < K - 1; p++) {
      for (let q = p + 1; q < K; q++) {
        const spq = S[p][q];
        if (Math.abs(spq) < tol) continue;

        const spp = S[p][p];
        const sqq = S[q][q];
        const theta = (sqq - spp) / (2.0 * spq);
        const t = Math.sign(theta || 1.0) / (Math.abs(theta) + Math.sqrt(theta * theta + 1.0));
        const c = 1.0 / Math.sqrt(t * t + 1.0);
        const s = t * c;
        const tau = s / (1.0 + c);

        S[p][p] = spp - t * spq;
        S[q][q] = sqq + t * spq;
        S[p][q] = 0.0;
        S[q][p] = 0.0;

        for (let r = 0; r < K; r++) {
          if (r !== p && r !== q) {
            const s_rp = S[r][p];
            const s_rq = S[r][q];
            S[r][p] = s_rp - s * (s_rq + tau * s_rp);
            S[p][r] = S[r][p];
            S[r][q] = s_rq + s * (s_rp - tau * s_rq);
            S[q][r] = S[r][q];
          }
        }

        for (let r = 0; r < K; r++) {
          const v_rp = V[r][p];
          const v_rq = V[r][q];
          V[r][p] = v_rp - s * (v_rq + tau * v_rp);
          V[r][q] = v_rq + s * (v_rp - tau * v_rq);
        }
      }
    }
  }

  const rawEvals = Array.from({ length: K }, (_, i) => S[i][i]);
  const indices = Array.from({ length: K }, (_, i) => i);
  indices.sort((a, b) => rawEvals[b] - rawEvals[a]);

  const sortedEvals = indices.map(i => rawEvals[i]);
  const sortedEvecs = Array.from({ length: K }, (_, r) => indices.map(col => V[r][col]));

  return { eigenvalues: sortedEvals, eigenvectors: sortedEvecs };
}

/**
 * Computes the 2-norm condition number kappa(A) of a symmetric positive semi-definite matrix.
 * kappa(A) = lambda_max / lambda_min
 *
 * @param {Array<Array<number>>} matrix
 * @returns {{ conditionNumber: number, maxEigenvalue: number, minEigenvalue: number }}
 */
export function calculateMatrixConditionNumber(matrix) {
  const K = matrix.length;
  if (K === 0) return { conditionNumber: 1, maxEigenvalue: 0, minEigenvalue: 0 };
  if (K === 1) return { conditionNumber: 1, maxEigenvalue: matrix[0][0], minEigenvalue: matrix[0][0] };

  const { eigenvalues } = jacobiEigenvalues(matrix);
  const maxEigenvalue = eigenvalues[0];
  const minEigenvalue = Math.max(1e-12, eigenvalues[eigenvalues.length - 1]);
  const conditionNumber = maxEigenvalue / minEigenvalue;

  return { conditionNumber, maxEigenvalue, minEigenvalue };
}

/**
 * Computes the Ledoit & Wolf (2004) constant-correlation covariance shrinkage estimator.
 * Solves analytically for the optimal shrinkage intensity delta* minimizing Frobenius loss:
 * Sigma_shrunk = delta* F + (1 - delta*) S
 *
 * @param {Array<Array<number>>} returns - N assets by T monthly return observations
 * @param {Object} [options]
 * @param {boolean} [options.annualize=true] - Whether to annualize covariance matrices (* 12)
 * @returns {Object} Shrinkage results, target, condition numbers, and shrunk covariance
 */
export function ledoitWolfConstantCorrelation(returns, options = {}) {
  const annualize = options.annualize !== false;
  const N = returns.length;
  const T = returns[0].length;

  if (N < 2) {
    throw new Error('At least 2 assets are required for Ledoit-Wolf shrinkage.');
  }
  if (T < 3) {
    throw new Error('At least 3 observations are required for covariance estimation.');
  }

  // 1. De-mean returns: y_{i,t} = r_{i,t} - mean(r_i)
  const means = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let sum = 0;
    for (let t = 0; t < T; t++) sum += returns[i][t];
    means[i] = sum / T;
  }

  const y = [];
  for (let i = 0; i < N; i++) {
    const row = new Float64Array(T);
    for (let t = 0; t < T; t++) {
      row[t] = returns[i][t] - means[i];
    }
    y.push(row);
  }

  // 2. Sample covariance matrix S: s_{i,j} = (1 / T) * sum_t (y_{i,t} * y_{j,t})
  const S = [];
  for (let i = 0; i < N; i++) {
    S[i] = new Float64Array(N);
  }

  for (let i = 0; i < N; i++) {
    for (let j = i; j < N; j++) {
      let sum = 0;
      for (let t = 0; t < T; t++) {
        sum += y[i][t] * y[j][t];
      }
      const s_ij = sum / T;
      S[i][j] = s_ij;
      S[j][i] = s_ij;
    }
  }

  // Variances and standard deviations
  const std = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    std[i] = Math.sqrt(Math.max(1e-12, S[i][i]));
  }

  // Sample correlation matrix R
  const R = [];
  for (let i = 0; i < N; i++) {
    R[i] = new Float64Array(N);
    for (let j = 0; j < N; j++) {
      R[i][j] = S[i][j] / (std[i] * std[j]);
    }
  }

  // 3. Average correlation: rBar = 2 / (N * (N - 1)) * sum_{i < j} r_{i,j}
  let sumCorr = 0;
  let countPairs = 0;
  for (let i = 0; i < N - 1; i++) {
    for (let j = i + 1; j < N; j++) {
      sumCorr += R[i][j];
      countPairs++;
    }
  }
  const rBar = countPairs > 0 ? sumCorr / countPairs : 0;

  // 4. Target matrix F: f_{i,i} = s_{i,i}, f_{i,j} = rBar * std_i * std_j
  const F = [];
  for (let i = 0; i < N; i++) {
    F[i] = new Float64Array(N);
    for (let j = 0; j < N; j++) {
      if (i === j) {
        F[i][j] = S[i][j];
      } else {
        F[i][j] = rBar * std[i] * std[j];
      }
    }
  }

  // 5. Asymptotic variance components:
  let piHat = 0;
  const piMat = [];
  for (let i = 0; i < N; i++) {
    piMat[i] = new Float64Array(N);
    for (let j = 0; j < N; j++) {
      let sumSq = 0;
      for (let t = 0; t < T; t++) {
        const dev = y[i][t] * y[j][t] - S[i][j];
        sumSq += dev * dev;
      }
      const p_ij = sumSq / T;
      piMat[i][j] = p_ij;
      piHat += p_ij;
    }
  }

  // gammaHat = sum_{i,j} (f_{i,j} - s_{i,j})^2
  let gammaHat = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const diff = F[i][j] - S[i][j];
      gammaHat += diff * diff;
    }
  }

  // rhoHat = sum_i piMat_{i,i} + sum_{i != j} rhoOff_{i,j}
  let rhoDiag = 0;
  for (let i = 0; i < N; i++) {
    rhoDiag += piMat[i][i];
  }

  let rhoOff = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      let sumThetaI = 0;
      let sumThetaJ = 0;
      for (let t = 0; t < T; t++) {
        const prodDev = y[i][t] * y[j][t] - S[i][j];
        sumThetaI += (y[i][t] * y[i][t] - S[i][i]) * prodDev;
        sumThetaJ += (y[j][t] * y[j][t] - S[j][j]) * prodDev;
      }
      const thetaI = sumThetaI / T;
      const thetaJ = sumThetaJ / T;
      const rho_ij = (rBar / 2) * ((std[j] / std[i]) * thetaI + (std[i] / std[j]) * thetaJ);
      rhoOff += rho_ij;
    }
  }

  const rhoHat = rhoDiag + rhoOff;

  // 6. Optimal shrinkage intensity delta^*:
  let deltaStar = 0;
  if (gammaHat > 1e-15) {
    const kappa = (piHat - rhoHat) / gammaHat;
    deltaStar = Math.max(0, Math.min(1, kappa / T));
  }

  // 7. Shrunk covariance matrix: Sigma = deltaStar * F + (1 - deltaStar) * S
  const Sigma = [];
  for (let i = 0; i < N; i++) {
    Sigma[i] = new Float64Array(N);
    for (let j = 0; j < N; j++) {
      Sigma[i][j] = deltaStar * F[i][j] + (1 - deltaStar) * S[i][j];
    }
  }

  // Scale by 12 if annualize requested
  const scale = annualize ? 12 : 1;
  const sampleCov = S.map(r => Array.from(r).map(v => v * scale));
  const targetCov = F.map(r => Array.from(r).map(v => v * scale));
  const shrunkCov = Sigma.map(r => Array.from(r).map(v => v * scale));

  // Condition numbers
  const sampleCond = calculateMatrixConditionNumber(sampleCov);
  const shrunkCond = calculateMatrixConditionNumber(shrunkCov);

  return {
    shrinkageIntensity: deltaStar,
    averageCorrelation: rBar,
    piHat: piHat * (scale * scale),
    rhoHat: rhoHat * (scale * scale),
    gammaHat: gammaHat * (scale * scale),
    sampleCovariance: sampleCov,
    targetCovariance: targetCov,
    shrunkCovariance: shrunkCov,
    sampleConditionNumber: sampleCond.conditionNumber,
    shrunkConditionNumber: shrunkCond.conditionNumber,
    conditionImprovementPercent: sampleCond.conditionNumber > 0
      ? ((sampleCond.conditionNumber - shrunkCond.conditionNumber) / sampleCond.conditionNumber) * 100
      : 0
  };
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

  // 5. Ledoit & Wolf (2004) Constant-Correlation Covariance Shrinkage
  const lw = ledoitWolfConstantCorrelation(monthlyReturns, { annualize: true });
  const estimator = options.covarianceEstimator === 'ledoit-wolf' ? 'ledoit-wolf' : 'sample';
  const activeCovariance = estimator === 'ledoit-wolf' ? lw.shrunkCovariance : covarianceMatrix;

  return {
    dateRange: { start, end, totalMonths: totalPeriods },
    numAssets,
    tickers,
    names,
    riskFreeRate: annualRf,
    expectedReturns,
    volatilities,
    sharpeRatios,
    covarianceMatrix: activeCovariance,
    sampleCovarianceMatrix: covarianceMatrix,
    shrunkCovarianceMatrix: lw.shrunkCovariance,
    targetCovarianceMatrix: lw.targetCovariance,
    shrinkageIntensity: lw.shrinkageIntensity,
    averageCorrelation: lw.averageCorrelation,
    sampleConditionNumber: lw.sampleConditionNumber,
    shrunkConditionNumber: lw.shrunkConditionNumber,
    conditionImprovementPercent: lw.conditionImprovementPercent,
    covarianceEstimator: estimator,
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
  const steps = options.steps || 120;
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
  const maxPolishIter = options.maxPolishIter || 150;
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


/**
 * Calculates marginal and percentage risk contributions (Euler's decomposition):
 * PRC_i = (w_i * (Sigma * w)_i) / (w^T * Sigma * w)
 * Guaranteed to sum to 100% across all assets.
 *
 * @param {Array<number>} weights
 * @param {Array<Array<number>>} covarianceMatrix
 * @returns {{ variance: number, volatility: number, marginalRisk: number[], totalRiskContrib: number[], pctRiskContrib: number[] }}
 */
export function calculateRiskContributions(weights, covarianceMatrix) {
  const n = weights.length;
  let variance = 0;
  const sigW = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sigW[i] += covarianceMatrix[i][j] * weights[j];
    }
    variance += weights[i] * sigW[i];
  }

  variance = Math.max(1e-12, variance);
  const volatility = Math.sqrt(variance);

  const marginalRisk = new Array(n);
  const totalRiskContrib = new Array(n);
  const pctRiskContrib = new Array(n);

  for (let i = 0; i < n; i++) {
    marginalRisk[i] = sigW[i] / volatility;
    totalRiskContrib[i] = weights[i] * marginalRisk[i];
    pctRiskContrib[i] = (weights[i] * sigW[i]) / variance;
  }

  return {
    variance,
    volatility,
    marginalRisk,
    totalRiskContrib,
    pctRiskContrib
  };
}

/**
 * Solves for the Equal Risk Contribution (Risk Parity / ERC) Portfolio:
 * Uses Florin Spinu's (2013) cyclical coordinate descent algorithm on the convex logarithmic barrier:
 * min_x (1/2) x^T Sigma x - sum(b_i * ln x_i)
 * where optimal weights are w = x / sum(x_i).
 *
 * @param {Array<number>} expectedReturns
 * @param {Array<Array<number>>} covarianceMatrix
 * @param {Object} [options]
 * @param {Array<number>} [options.budgets] - Risk budgets (default 1/n)
 * @param {number} [options.riskFreeRate=0.03]
 * @returns {Object} Risk Parity portfolio stats with risk contributions
 */
export function solveRiskParity(expectedReturns, covarianceMatrix, options = {}) {
  const n = expectedReturns.length;
  const rf = typeof options.riskFreeRate === 'number' ? options.riskFreeRate : 0.03;

  // Default equal risk budgets: b_i = 1 / n
  const b = Array.isArray(options.budgets) && options.budgets.length === n
    ? [...options.budgets]
    : new Array(n).fill(1 / n);

  // Initialize x_i = 1 / sqrt(Sigma_ii) (inverse volatility)
  let x = new Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = 1 / Math.sqrt(Math.max(1e-6, covarianceMatrix[i][i]));
  }

  const maxIter = 100;
  const tol = 1e-8;

  for (let iter = 0; iter < maxIter; iter++) {
    let maxDelta = 0;

    for (let i = 0; i < n; i++) {
      // a_i = sum_{j != i} Sigma_ij * x_j
      let a_i = 0;
      for (let j = 0; j < n; j++) {
        if (j !== i) {
          a_i += covarianceMatrix[i][j] * x[j];
        }
      }

      // Solve quadratic: Sigma_ii * x_i^2 + a_i * x_i - b_i = 0
      const sig_ii = covarianceMatrix[i][i];
      const disc = Math.sqrt(a_i * a_i + 4 * sig_ii * b[i]);
      const newX_i = (-a_i + disc) / (2 * sig_ii);

      maxDelta = Math.max(maxDelta, Math.abs(newX_i - x[i]));
      x[i] = newX_i;
    }

    if (maxDelta < tol) break;
  }

  // Normalize weights: w_i = x_i / sum(x_j)
  const sumX = x.reduce((a, b) => a + b, 0);
  const w = x.map(val => val / sumX);

  const stats = calculatePortfolioStats(w, expectedReturns, covarianceMatrix, rf);
  const rc = calculateRiskContributions(w, covarianceMatrix);

  return {
    ...stats,
    riskContributions: rc
  };
}

/**
 * Computes the Pearson correlation matrix from a covariance matrix.
 *
 * @param {Array<Array<number>>} covarianceMatrix - N x N covariance matrix
 * @returns {Array<Array<number>>} N x N correlation matrix with values in [-1, 1]
 */
export function calculateCorrelationMatrix(covarianceMatrix) {
  const n = covarianceMatrix.length;
  const corr = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        corr[i][j] = 1.0;
      } else {
        const denom = Math.sqrt(Math.max(1e-16, covarianceMatrix[i][i] * covarianceMatrix[j][j]));
        corr[i][j] = denom > 0 ? Math.max(-1, Math.min(1, covarianceMatrix[i][j] / denom)) : 0;
      }
    }
  }
  return corr;
}

/**
 * Computes correlation distance metric matrix:
 * d_{i,j} = sqrt(0.5 * (1 - rho_{i,j}))
 *
 * @param {Array<Array<number>>} corrMatrix - N x N correlation matrix
 * @returns {Array<Array<number>>} N x N distance matrix in [0, 1]
 */
export function correlationDistanceMatrix(corrMatrix) {
  const n = corrMatrix.length;
  const dist = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        dist[i][j] = 0;
      } else {
        const rho = Math.max(-1, Math.min(1, corrMatrix[i][j]));
        dist[i][j] = Math.sqrt(Math.max(0, 0.5 * (1 - rho)));
      }
    }
  }
  return dist;
}

/**
 * Computes Euclidean distance matrix between rows of distance matrix D:
 * \tilde{D}_{i,j} = sqrt(sum_k (d_{i,k} - d_{j,k})^2)
 *
 * @param {Array<Array<number>>} distMatrix - N x N correlation distance matrix
 * @returns {Array<Array<number>>} N x N Euclidean distance matrix
 */
export function euclideanDistanceMatrix(distMatrix) {
  const n = distMatrix.length;
  const D_tilde = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let sumSq = 0;
      for (let k = 0; k < n; k++) {
        const diff = distMatrix[i][k] - distMatrix[j][k];
        sumSq += diff * diff;
      }
      const d = Math.sqrt(sumSq);
      D_tilde[i][j] = d;
      D_tilde[j][i] = d;
    }
  }
  return D_tilde;
}

/**
 * Performs Hierarchical Agglomerative Clustering (HAC).
 *
 * @param {Array<Array<number>>} distMatrix - N x N distance matrix
 * @param {('single'|'complete'|'average')} [linkageMethod='single']
 * @returns {Array<[number, number, number, number]>} Linkage matrix of size (N-1) x 4:
 *   [cluster1, cluster2, distance, memberCount]
 */
export function hierarchicalClustering(distMatrix, linkageMethod = 'single') {
  const n = distMatrix.length;
  if (n <= 1) return [];

  const linkage = [];
  const clusterMembers = {};
  for (let i = 0; i < n; i++) {
    clusterMembers[i] = [i];
  }
  const activeClusters = new Set(Array.from({ length: n }, (_, i) => i));

  for (let k = 0; k < n - 1; k++) {
    const activeArr = Array.from(activeClusters);
    let minD = Infinity;
    let bestPair = [-1, -1];

    for (let i = 0; i < activeArr.length; i++) {
      const u = activeArr[i];
      for (let j = i + 1; j < activeArr.length; j++) {
        const v = activeArr[j];
        const memU = clusterMembers[u];
        const memV = clusterMembers[v];
        let d;
        if (linkageMethod === 'complete') {
          let maxPairD = -Infinity;
          for (const iu of memU) {
            for (const iv of memV) {
              if (distMatrix[iu][iv] > maxPairD) maxPairD = distMatrix[iu][iv];
            }
          }
          d = maxPairD;
        } else if (linkageMethod === 'average') {
          let sumPairD = 0;
          for (const iu of memU) {
            for (const iv of memV) {
              sumPairD += distMatrix[iu][iv];
            }
          }
          d = sumPairD / (memU.length * memV.length);
        } else {
          // 'single' linkage
          let minPairD = Infinity;
          for (const iu of memU) {
            for (const iv of memV) {
              if (distMatrix[iu][iv] < minPairD) minPairD = distMatrix[iu][iv];
            }
          }
          d = minPairD;
        }

        if (d < minD) {
          minD = d;
          bestPair = [Math.min(u, v), Math.max(u, v)];
        }
      }
    }

    const [u, v] = bestPair;
    const newClusterId = n + k;
    const newMembers = [...clusterMembers[u], ...clusterMembers[v]];
    clusterMembers[newClusterId] = newMembers;
    linkage.push([u, v, minD, newMembers.length]);

    activeClusters.delete(u);
    activeClusters.delete(v);
    activeClusters.add(newClusterId);
  }

  return linkage;
}

/**
 * Extracts quasi-diagonal leaf order from a hierarchical clustering linkage tree.
 *
 * @param {Array<[number, number, number, number]>} linkage - (N-1) x 4 linkage matrix
 * @param {number} numAssets - Number of leaf assets N
 * @returns {Array<number>} Quasi-diagonal asset indices
 */
export function getQuasiDiag(linkage, numAssets) {
  if (numAssets <= 1) return [0];
  let order = [2 * numAssets - 2];
  while (order.some(id => id >= numAssets)) {
    const nextOrder = [];
    for (const id of order) {
      if (id >= numAssets) {
        const row = linkage[id - numAssets];
        nextOrder.push(row[0]);
        nextOrder.push(row[1]);
      } else {
        nextOrder.push(id);
      }
    }
    order = nextOrder;
  }
  return order;
}

/**
 * Computes cluster variance using inverse-variance allocations for sub-assets:
 * V_C = w_C^T * Sigma_C * w_C
 *
 * @param {Array<Array<number>>} covarianceMatrix - Full covariance matrix
 * @param {Array<number>} clusterIndices - Indices of assets in this cluster
 * @returns {number} Cluster variance V_C
 */
export function getClusterVariance(covarianceMatrix, clusterIndices) {
  const k = clusterIndices.length;
  if (k === 0) return 0;
  if (k === 1) return Math.max(1e-12, covarianceMatrix[clusterIndices[0]][clusterIndices[0]]);

  let invVarSum = 0;
  const invVars = new Array(k);
  for (let i = 0; i < k; i++) {
    const idx = clusterIndices[i];
    const diag = Math.max(1e-12, covarianceMatrix[idx][idx]);
    invVars[i] = 1 / diag;
    invVarSum += invVars[i];
  }
  const subWeights = invVars.map(v => v / invVarSum);

  let clusterVar = 0;
  for (let i = 0; i < k; i++) {
    const idx_i = clusterIndices[i];
    for (let j = 0; j < k; j++) {
      const idx_j = clusterIndices[j];
      clusterVar += subWeights[i] * subWeights[j] * covarianceMatrix[idx_i][idx_j];
    }
  }
  return Math.max(1e-12, clusterVar);
}

/**
 * Performs recursive bisection capital allocation along the quasi-diagonal leaf order.
 *
 * @param {Array<Array<number>>} covarianceMatrix - N x N covariance matrix
 * @param {Array<number>} quasiDiag - Quasi-diagonal leaf order
 * @returns {Array<number>} Weights of assets summing to 1.0
 */
export function getRecursiveBisectionWeights(covarianceMatrix, quasiDiag) {
  const n = quasiDiag.length;
  if (n <= 1) return [1.0];

  const assetWeights = new Array(n).fill(1.0);
  let clusters = [quasiDiag.slice()];

  while (clusters.length > 0) {
    const nextClusters = [];
    for (const cluster of clusters) {
      if (cluster.length <= 1) continue;

      const mid = Math.floor(cluster.length / 2);
      const c1 = cluster.slice(0, mid);
      const c2 = cluster.slice(mid);

      const v1 = getClusterVariance(covarianceMatrix, c1);
      const v2 = getClusterVariance(covarianceMatrix, c2);

      const totalV = v1 + v2;
      const alpha = totalV > 1e-12 ? 1 - (v1 / totalV) : 0.5;

      for (const idx of c1) {
        assetWeights[idx] *= alpha;
      }
      for (const idx of c2) {
        assetWeights[idx] *= (1 - alpha);
      }

      if (c1.length > 1) nextClusters.push(c1);
      if (c2.length > 1) nextClusters.push(c2);
    }
    clusters = nextClusters;
  }

  const sumW = assetWeights.reduce((a, b) => a + b, 0);
  return assetWeights.map(w => w / (sumW || 1));
}

/**
 * Solves the Hierarchical Risk Parity (HRP) asset allocation problem (López de Prado, 2016).
 * Replaces matrix inversion with machine learning tree clustering and recursive bisection.
 *
 * @param {Array<number>} expectedReturns - Annualized expected returns of assets
 * @param {Array<Array<number>>} covarianceMatrix - N x N covariance matrix
 * @param {Array<Array<number>>} [correlationMatrix=null] - Optional N x N correlation matrix
 * @param {Object} [options={}]
 * @param {number} [options.riskFreeRate=0.03]
 * @param {('single'|'complete'|'average')} [options.linkageMethod='single']
 * @returns {Object} HRP portfolio statistics, weights, dendrogram linkage, and quasi-diagonal order
 */
export function solveHRP(expectedReturns, covarianceMatrix, correlationMatrix = null, options = {}) {
  const n = expectedReturns.length;
  const rf = typeof options.riskFreeRate === 'number' ? options.riskFreeRate : 0.03;
  const linkageMethod = options.linkageMethod || 'single';

  if (n === 0) {
    return { weights: [], expectedReturn: 0, volatility: 0, sharpeRatio: 0, riskContributions: [] };
  }
  if (n === 1) {
    const w = [1.0];
    const stats = calculatePortfolioStats(w, expectedReturns, covarianceMatrix, rf);
    return {
      ...stats,
      weights: w,
      linkage: [],
      quasiDiag: [0],
      riskContributions: [1.0]
    };
  }

  const corr = correlationMatrix || calculateCorrelationMatrix(covarianceMatrix);
  const dist = correlationDistanceMatrix(corr);
  const D_tilde = euclideanDistanceMatrix(dist);
  const linkage = hierarchicalClustering(D_tilde, linkageMethod);
  const quasiDiag = getQuasiDiag(linkage, n);
  const weights = getRecursiveBisectionWeights(covarianceMatrix, quasiDiag);

  const stats = calculatePortfolioStats(weights, expectedReturns, covarianceMatrix, rf);
  const rc = calculateRiskContributions(weights, covarianceMatrix);

  return {
    ...stats,
    weights,
    linkage,
    quasiDiag,
    correlationMatrix: corr,
    correlationDistanceMatrix: dist,
    euclideanDistanceMatrix: D_tilde,
    linkageMethod,
    riskContributions: rc
  };
}

/**
 * Calculates historical Conditional Value-at-Risk (CVaR / Expected Shortfall)
 * at confidence level 1 - alpha (default 95% confidence, alpha = 0.05).
 *
 * @param {Array<number>} returns - Monthly percentage return series
 * @param {number} [alpha=0.05]
 * @returns {{ var: number, cvar: number, worstReturn: number }}
 */
export function calculateCVaR(returns, alpha = 0.05) {
  if (!returns || returns.length === 0) {
    return { var: 0, cvar: 0, worstReturn: 0 };
  }

  const sorted = [...returns].sort((a, b) => a - b);
  const k = Math.max(1, Math.floor(alpha * sorted.length));

  // VaR is the cutoff loss threshold
  const varCutoff = -sorted[k - 1];

  // CVaR is the average loss beyond VaR
  let tailSum = 0;
  for (let i = 0; i < k; i++) {
    tailSum += sorted[i];
  }
  const cvar = -tailSum / k;

  return {
    var: Math.max(0, varCutoff),
    cvar: Math.max(0, cvar),
    worstReturn: sorted[0]
  };
}

/**
 * Calculates downside semivariance and Sortino Ratio.
 *
 * @param {Array<number>} returns - Monthly returns
 * @param {number} expectedReturn - Annualized expected return
 * @param {number} [riskFreeRate=0.03]
 * @returns {{ downsideVol: number, sortinoRatio: number }}
 */
export function calculateSortinoRatio(returns, expectedReturn, riskFreeRate = 0.03) {
  if (!returns || returns.length < 2) {
    return { downsideVol: 0, sortinoRatio: 0 };
  }

  const monthlyRf = riskFreeRate / 12;
  let downsideSumSq = 0;

  for (let i = 0; i < returns.length; i++) {
    const diff = returns[i] - monthlyRf;
    if (diff < 0) {
      downsideSumSq += diff * diff;
    }
  }

  const monthlyDownsideVar = downsideSumSq / returns.length;
  const annualDownsideVol = Math.sqrt(monthlyDownsideVar * 12);
  const sortinoRatio = annualDownsideVol > 0 ? (expectedReturn - riskFreeRate) / annualDownsideVol : 0;

  return {
    downsideVol: annualDownsideVol,
    sortinoRatio
  };
}

/**
 * Solves for the Minimum Conditional Value-at-Risk (Min CVaR at 95% confidence) portfolio:
 * Uses projected subgradient descent on historical return trajectories.
 *
 * @param {Array<number>} expectedReturns
 * @param {Array<Array<number>>} monthlyReturns - [numAssets][numMonths]
 * @param {Array<Array<number>>} covarianceMatrix
 * @param {Object} [options]
 * @returns {Object} Min CVaR portfolio stats
 */
export function solveMinCVaR(expectedReturns, monthlyReturns, covarianceMatrix, options = {}) {
  const n = expectedReturns.length;
  const numMonths = monthlyReturns[0].length;
  const { lower, upper } = validateBounds(n, options.lowerBounds, options.upperBounds);
  const rf = typeof options.riskFreeRate === 'number' ? options.riskFreeRate : 0.03;
  const alpha = 0.05;

  // Start at GMV portfolio
  let w = solveGMV(expectedReturns, covarianceMatrix, options).weights;

  // Numerical optimization for CVaR
  const maxIter = 150;
  const eps = 1e-4;
  let step = 0.005;

  const getCVaRForWeights = (weights) => {
    const pReturns = new Array(numMonths).fill(0);
    for (let t = 0; t < numMonths; t++) {
      for (let i = 0; i < n; i++) {
        pReturns[t] += weights[i] * monthlyReturns[i][t];
      }
    }
    return calculateCVaR(pReturns, alpha).cvar;
  };

  let bestCVaR = getCVaRForWeights(w);
  let bestW = [...w];

  for (let iter = 0; iter < maxIter; iter++) {
    const grad = new Array(n);
    const baseCVaR = getCVaRForWeights(w);

    // Finite difference gradient of CVaR
    for (let i = 0; i < n; i++) {
      const wPerturb = [...w];
      wPerturb[i] += eps;
      const cvarPerturb = getCVaRForWeights(wPerturb);
      grad[i] = (cvarPerturb - baseCVaR) / eps;
    }

    const prevW = [...w];
    const trial = new Array(n);
    for (let i = 0; i < n; i++) {
      trial[i] = w[i] - step * grad[i]; // Descent
    }

    w = projectOntoSimplex(trial, lower, upper);
    const newCVaR = getCVaRForWeights(w);

    if (newCVaR < bestCVaR) {
      bestCVaR = newCVaR;
      bestW = [...w];
    }

    let delta = 0;
    for (let i = 0; i < n; i++) {
      delta = Math.max(delta, Math.abs(w[i] - prevW[i]));
    }
    if (delta < 1e-6) break;
  }

  const stats = calculatePortfolioStats(bestW, expectedReturns, covarianceMatrix, rf);
  const pReturns = new Array(numMonths).fill(0);
  for (let t = 0; t < numMonths; t++) {
    for (let i = 0; i < n; i++) {
      pReturns[t] += bestW[i] * monthlyReturns[i][t];
    }
  }
  const cvarMetrics = calculateCVaR(pReturns, alpha);
  const sortinoMetrics = calculateSortinoRatio(pReturns, stats.expectedReturn, rf);

  return {
    ...stats,
    cvar: cvarMetrics.cvar,
    var: cvarMetrics.var,
    downsideVol: sortinoMetrics.downsideVol,
    sortinoRatio: sortinoMetrics.sortinoRatio,
    riskContributions: calculateRiskContributions(bestW, covarianceMatrix)
  };
}

/**
 * Solves for the Maximum Return portfolio subject to Volatility <= targetVol:
 *
 * @param {number} targetVol - Target annual standard deviation
 * @param {Array<number>} expectedReturns
 * @param {Array<Array<number>>} covarianceMatrix
 * @param {Object} [options]
 * @returns {Object} Target risk portfolio stats
 */
export function solveTargetRiskPortfolio(targetVol, expectedReturns, covarianceMatrix, options = {}) {
  // Use Efficient Frontier curve to locate exact target risk boundary point
  const ef = generateEfficientFrontier(expectedReturns, covarianceMatrix, {
    ...options,
    numPoints: 60
  });

  const frontier = ef.frontier;
  let best = frontier[0];
  let minDiff = Math.abs(frontier[0].volatility - targetVol);

  frontier.forEach(p => {
    const diff = Math.abs(p.volatility - targetVol);
    if (diff < minDiff) {
      minDiff = diff;
      best = p;
    }
  });

  return best;
}


// ===================================================================
// LINEAR ALGEBRA & MATRIX UTILITIES FOR BLACK-LITTERMAN
// ===================================================================

/**
 * Multiplies two matrices A (m x k) and B (k x n).
 * @param {Array<Array<number>>} A
 * @param {Array<Array<number>>} B
 * @returns {Array<Array<number>>} Matrix product (m x n)
 */
export function matrixMultiply(A, B) {
  const m = A.length;
  const k = A[0].length;
  const n = B[0].length;

  const result = [];
  for (let i = 0; i < m; i++) {
    result[i] = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let p = 0; p < k; p++) {
        sum += A[i][p] * B[p][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

/**
 * Multiplies matrix A (m x n) by vector v (n x 1).
 * @param {Array<Array<number>>} A
 * @param {Array<number>} v
 * @returns {Array<number>} Result vector (m x 1)
 */
export function matrixVectorMultiply(A, v) {
  const m = A.length;
  const n = v.length;
  const result = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += A[i][j] * v[j];
    }
    result[i] = sum;
  }
  return result;
}

/**
 * Transposes a matrix A (m x n) -> (n x m).
 * @param {Array<Array<number>>} A
 * @returns {Array<Array<number>>}
 */
export function transposeMatrix(A) {
  const m = A.length;
  const n = A[0].length;
  const result = [];
  for (let j = 0; j < n; j++) {
    result[j] = new Array(m);
    for (let i = 0; i < m; i++) {
      result[j][i] = A[i][j];
    }
  }
  return result;
}

/**
 * Inverts an n x n square matrix using Gaussian elimination with partial pivoting.
 * @param {Array<Array<number>>} A
 * @returns {Array<Array<number>>} Inverse matrix A^-1
 */
export function invertMatrix(A) {
  const n = A.length;
  // Augment A with identity matrix [A | I]
  const M = [];
  for (let i = 0; i < n; i++) {
    M[i] = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) {
      M[i][j] = A[i][j];
    }
    M[i][n + i] = 1.0;
  }

  // Gaussian elimination with row pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot row
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) {
      throw new Error(`Matrix is singular or near-singular at column ${col}`);
    }

    // Swap pivot row
    if (maxRow !== col) {
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;
    }

    // Scale pivot row
    const pivot = M[col][col];
    for (let j = 0; j < 2 * n; j++) {
      M[col][j] /= pivot;
    }

    // Eliminate other rows
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = M[row][col];
        for (let j = 0; j < 2 * n; j++) {
          M[row][j] -= factor * M[col][j];
        }
      }
    }
  }

  // Extract right half
  const inv = [];
  for (let i = 0; i < n; i++) {
    inv[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      inv[i][j] = M[i][n + j];
    }
  }
  return inv;
}

// ===================================================================
// BLACK-LITTERMAN BAYESIAN ASSET ALLOCATION MODEL
// ===================================================================

/**
 * Computes Implied Equilibrium Excess Returns (Reverse Optimization):
 * Pi = delta * Sigma * w_mkt
 *
 * @param {Array<number>} benchmarkWeights - Market capitalization or benchmark weights
 * @param {Array<Array<number>>} covarianceMatrix - Annualized covariance matrix
 * @param {number} marketRiskAversion - delta = (r_mkt - Rf) / sigma_mkt^2
 * @returns {Array<number>} Implied equilibrium excess returns vector Pi
 */
export function computeImpliedEquilibriumReturns(benchmarkWeights, covarianceMatrix, marketRiskAversion) {
  const n = benchmarkWeights.length;
  const Pi = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sigW = 0;
    for (let j = 0; j < n; j++) {
      sigW += covarianceMatrix[i][j] * benchmarkWeights[j];
    }
    Pi[i] = marketRiskAversion * sigW;
  }
  return Pi;
}

/**
 * Solves the complete Black-Litterman model:
 * Blends CAPM equilibrium returns (Prior) with subjective investor views (Views).
 *
 * Formula:
 * M = [ (tau * Sigma)^-1 + P^T * Omega^-1 * P ]^-1
 * mu_BL = M * [ (tau * Sigma)^-1 * Pi + P^T * Omega^-1 * Q ]
 * Sigma_BL = Sigma + M
 * w_BL = (delta * Sigma_BL)^-1 * mu_BL
 *
 * @param {Object} params
 * @param {Array<number>} params.benchmarkWeights - Base market weights (sum to 1)
 * @param {Array<Array<number>>} params.covarianceMatrix - Annualized asset covariance
 * @param {number} [params.expectedMarketReturn=0.08] - Expected annual return of benchmark
 * @param {number} [params.riskFreeRate=0.03] - Risk-free rate
 * @param {number} [params.tau=0.05] - Uncertainty scaling parameter
 * @param {Array<Object>} [params.views] - Array of investor views:
 *   {
 *     type: 'absolute' | 'relative',
 *     assetIndex1: number,
 *     assetIndex2?: number,
 *     expectedReturn: number, // e.g. 0.12 for 12% or relative outperformance 0.04
 *     confidence: number // between 0.05 and 0.95
 *   }
 * @returns {Object} Complete Black-Litterman solution
 */
export function solveBlackLitterman(params) {
  const {
    benchmarkWeights,
    covarianceMatrix,
    expectedMarketReturn = 0.08,
    riskFreeRate = 0.03,
    tau = 0.05,
    views = []
  } = params;

  const n = benchmarkWeights.length;

  // 1. Benchmark Portfolio Risk and Market Risk Aversion delta
  let benchVar = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      benchVar += benchmarkWeights[i] * benchmarkWeights[j] * covarianceMatrix[i][j];
    }
  }
  benchVar = Math.max(1e-8, benchVar);
  const benchVol = Math.sqrt(benchVar);
  const delta = Math.max(0.1, (expectedMarketReturn - riskFreeRate) / benchVar);

  // 2. Prior Equilibrium Excess Returns: Pi = delta * Sigma * w_mkt
  const Pi = computeImpliedEquilibriumReturns(benchmarkWeights, covarianceMatrix, delta);
  const priorTotalReturns = Pi.map(pi => pi + riskFreeRate);

  // If no views provided, posterior equals prior (identity)
  if (!views || views.length === 0) {
    const priorStats = calculatePortfolioStats(benchmarkWeights, priorTotalReturns, covarianceMatrix, riskFreeRate);
    return {
      delta,
      tau,
      benchmarkWeights: [...benchmarkWeights],
      optimalWeights: [...benchmarkWeights],
      activeTilts: new Array(n).fill(0),
      priorReturns: priorTotalReturns,
      posteriorReturns: priorTotalReturns,
      posteriorCovariance: covarianceMatrix,
      benchmarkStats: priorStats,
      optimalStats: priorStats,
      viewsCount: 0
    };
  }

  // 3. Build Pick Matrix P (k x n) and Views Vector Q (k x 1)
  const k = views.length;
  const P = [];
  const Q = new Array(k);
  const confidences = [];

  for (let v = 0; v < k; v++) {
    const view = views[v];
    P[v] = new Array(n).fill(0);
    const i1 = view.assetIndex1;

    if (view.type === 'relative' && typeof view.assetIndex2 === 'number') {
      const i2 = view.assetIndex2;
      P[v][i1] = 1.0;
      P[v][i2] = -1.0;
      Q[v] = view.expectedReturn; // Excess outperformance
    } else {
      // Absolute view: express in excess return over Rf
      P[v][i1] = 1.0;
      Q[v] = view.expectedReturn - riskFreeRate;
    }
    confidences.push(Math.max(0.01, Math.min(0.99, view.confidence || 0.50)));
  }

  // 4. Build Diagonal Uncertainty Matrix Omega (k x k)
  // He & Litterman / Idzorek formulation: Omega_ii = (P * (tau * Sigma) * P^T)_ii * ((1 - c) / c)
  const tauSigma = [];
  for (let i = 0; i < n; i++) {
    tauSigma[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      tauSigma[i][j] = tau * covarianceMatrix[i][j];
    }
  }

  const P_tauSigma = matrixMultiply(P, tauSigma);
  const P_tauSigma_Pt = matrixMultiply(P_tauSigma, transposeMatrix(P));

  const Omega = [];
  const invOmega = [];
  for (let i = 0; i < k; i++) {
    Omega[i] = new Array(k).fill(0);
    invOmega[i] = new Array(k).fill(0);
    const varView = Math.max(1e-10, P_tauSigma_Pt[i][i]);
    const conf = confidences[i];
    const omegaVal = varView * ((1 - conf) / conf);
    Omega[i][i] = omegaVal;
    invOmega[i][i] = 1 / omegaVal;
  }

  // 5. Solve Master Formula for Posterior Expected Excess Returns mu_BL
  // inv(tauSigma)
  const invTauSigma = invertMatrix(tauSigma);
  const Pt = transposeMatrix(P);

  // Pt * invOmega * P  (n x n)
  const Pt_invOmega = matrixMultiply(Pt, invOmega);
  const Pt_invOmega_P = matrixMultiply(Pt_invOmega, P);

  // M_inv = invTauSigma + Pt_invOmega_P
  const M_inv = [];
  for (let i = 0; i < n; i++) {
    M_inv[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      M_inv[i][j] = invTauSigma[i][j] + Pt_invOmega_P[i][j];
    }
  }

  // M = inv(M_inv)
  const M = invertMatrix(M_inv);

  // term1 = invTauSigma * Pi (n x 1)
  const term1 = matrixVectorMultiply(invTauSigma, Pi);

  // term2 = Pt * invOmega * Q (n x 1)
  const invOmega_Q = matrixVectorMultiply(invOmega, Q);
  const term2 = matrixVectorMultiply(Pt, invOmega_Q);

  const bracket = new Array(n);
  for (let i = 0; i < n; i++) {
    bracket[i] = term1[i] + term2[i];
  }

  // Posterior Excess Returns: mu_BL_excess = M * bracket
  const mu_BL_excess = matrixVectorMultiply(M, bracket);
  const posteriorTotalReturns = mu_BL_excess.map(r => r + riskFreeRate);

  // 6. Posterior Covariance: Sigma_BL = Sigma + M
  const Sigma_BL = [];
  for (let i = 0; i < n; i++) {
    Sigma_BL[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      Sigma_BL[i][j] = covarianceMatrix[i][j] + M[i][j];
    }
  }

  // 7. Optimal Black-Litterman Portfolio Allocation:
  // w_unconstrained = inv(delta * Sigma_BL) * mu_BL_excess
  const deltaSigmaBL = [];
  for (let i = 0; i < n; i++) {
    deltaSigmaBL[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      deltaSigmaBL[i][j] = delta * Sigma_BL[i][j];
    }
  }

  const invDeltaSigmaBL = invertMatrix(deltaSigmaBL);
  let rawWeights = matrixVectorMultiply(invDeltaSigmaBL, mu_BL_excess);

  // Normalize raw weights to sum to 1.0 (with long-only non-negative projection)
  const optimalWeights = projectOntoSimplex(rawWeights, new Array(n).fill(0), new Array(n).fill(1));

  // Active Tilts (Delta w = w_BL - w_mkt)
  const activeTilts = optimalWeights.map((w, idx) => w - benchmarkWeights[idx]);

  // Performance stats for Benchmark vs Optimal
  const benchmarkStats = calculatePortfolioStats(benchmarkWeights, posteriorTotalReturns, covarianceMatrix, riskFreeRate);
  const optimalStats = calculatePortfolioStats(optimalWeights, posteriorTotalReturns, covarianceMatrix, riskFreeRate);

  return {
    delta,
    tau,
    benchmarkWeights: [...benchmarkWeights],
    optimalWeights,
    activeTilts,
    priorReturns: priorTotalReturns,
    posteriorReturns: posteriorTotalReturns,
    posteriorCovariance: Sigma_BL,
    benchmarkStats,
    optimalStats,
    viewsCount: k
  };
}


// ===================================================================
// ROLLING WALK-FORWARD PORTFOLIO OPTIMIZATION ENGINE
// ===================================================================

/**
 * Checks whether the current month index qualifies for periodic rebalancing.
 * @param {string} frequency - 'monthly' | 'quarterly' | 'annually'
 * @param {number} monthIndex - Index within out-of-sample simulation
 * @param {string} date - 'YYYY-MM'
 * @returns {boolean}
 */
function isRebalanceMonth(frequency, monthIndex, date) {
  if (monthIndex === 0) return true;
  if (frequency === 'monthly') return true;

  const monthNum = parseInt(date.substring(5, 7), 10);
  if (frequency === 'quarterly') {
    return monthNum === 3 || monthNum === 6 || monthNum === 9 || monthNum === 12;
  }
  if (frequency === 'annually') {
    return monthNum === 12;
  }
  return false;
}

/**
 * Runs walk-forward out-of-sample rolling portfolio optimization.
 * Slides historical lookback window W across time, optimizes on in-sample training window,
 * holds weights out-of-sample until next rebalance, and tracks turnover and performance.
 *
 * @param {Array<Object>} assets - Array of fund objects with {ticker, data: [{date, adjClose}]}
 * @param {Object} options
 * @param {number} [options.lookbackMonths=36] - Lookback window size (12, 24, 36, 48, 60)
 * @param {string} [options.frequency='annually'] - 'monthly' | 'quarterly' | 'annually'
 * @param {string} [options.goal='max-sharpe'] - 'max-sharpe' | 'min-vol' | 'risk-parity' | 'min-cvar'
 * @param {string} [options.baseline='equal'] - 'equal' | 'inv-vol'
 * @param {number} [options.riskFreeRate=0.03]
 * @param {Array<number>} [options.lowerBounds]
 * @param {Array<number>} [options.upperBounds]
 * @returns {Object} Complete rolling simulation result
 */
export function runRollingOptimization(assets, options = {}) {
  if (!assets || assets.length < 2) {
    throw new Error('At least 2 assets are required for rolling optimization.');
  }

  const lookbackMonths = Math.max(12, Math.min(120, options.lookbackMonths || 36));
  const frequency = options.frequency || 'annually';
  const goal = options.goal || 'max-sharpe';
  const baselineType = options.baseline || 'equal';
  const rf = typeof options.riskFreeRate === 'number' ? options.riskFreeRate : 0.03;

  const numAssets = assets.length;
  const tickers = assets.map(a => a.ticker.toUpperCase());
  const names = assets.map(a => a.name || a.ticker.toUpperCase());

  // 1. Find common date range
  const common = findCommonDateRange(assets);
  const alignedPrices = assets.map(asset => {
    return asset.data
      .filter(d => d.date >= common.start && d.date <= common.end)
      .map(d => ({
        date: d.date,
        price: typeof d.adjClose === 'number' && !isNaN(d.adjClose) ? d.adjClose : d.close
      }));
  });

  const totalPeriods = alignedPrices[0].length;
  if (totalPeriods <= lookbackMonths + 6) {
    throw new Error(`Insufficient historical data (${totalPeriods} months). Need at least ${lookbackMonths + 6} months for a ${lookbackMonths}-month lookback window.`);
  }

  // Pre-calculate monthly returns for each asset across full history
  // totalReturnsCount = totalPeriods - 1
  const monthlyReturns = [];
  const returnDates = [];
  for (let t = 1; t < totalPeriods; t++) {
    returnDates.push(alignedPrices[0][t].date);
  }

  for (let i = 0; i < numAssets; i++) {
    const pSeries = alignedPrices[i];
    const rSeries = [];
    for (let t = 1; t < totalPeriods; t++) {
      const prev = pSeries[t - 1].price;
      const curr = pSeries[t].price;
      const ret = prev > 0 ? (curr - prev) / prev : 0;
      rSeries.push(ret);
    }
    monthlyReturns.push(rSeries);
  }

  const numReturnMonths = returnDates.length;
  // Out-of-sample starts after lookbackMonths returns
  const outOfSampleStartIndex = lookbackMonths;
  const outOfSampleCount = numReturnMonths - outOfSampleStartIndex;

  if (outOfSampleCount < 6) {
    throw new Error('Out-of-sample period is too short (less than 6 months).');
  }

  // Prepare Walk-Forward simulation structures
  const outOfSampleDates = [];
  const stratMonthlyReturns = [];
  const baseMonthlyReturns = [];
  const weightTransitions = {
    dates: [],
    series: tickers.map(() => [])
  };
  const rebalanceEvents = [];

  let currentStratWeights = new Array(numAssets).fill(1 / numAssets);
  let currentBaseWeights = new Array(numAssets).fill(1 / numAssets);
  let prevEndingWeights = [...currentStratWeights];
  let totalTurnoverSum = 0;

  // Walk-forward loop over out-of-sample months
  for (let step = 0; step < outOfSampleCount; step++) {
    const t = outOfSampleStartIndex + step;
    const date = returnDates[t];
    outOfSampleDates.push(date);

    // Check rebalance condition
    const isRebal = isRebalanceMonth(frequency, step, date);

    if (isRebal) {
      // Extract in-sample lookback slice: [t - lookbackMonths, t)
      const inSampleReturns = [];
      for (let i = 0; i < numAssets; i++) {
        inSampleReturns.push(monthlyReturns[i].slice(t - lookbackMonths, t));
      }

      // Compute in-sample means & covariance
      const inSampleMeans = inSampleReturns.map(r => r.reduce((a, b) => a + b, 0) / lookbackMonths);
      const inSampleExpectedReturns = inSampleMeans.map(m => m * 12);

      let inSampleCov;
      if (options.covarianceEstimator === 'ledoit-wolf') {
        const lw = ledoitWolfConstantCorrelation(inSampleReturns, { annualize: true });
        inSampleCov = lw.shrunkCovariance;
      } else {
        inSampleCov = [];
        for (let i = 0; i < numAssets; i++) {
          inSampleCov[i] = new Array(numAssets).fill(0);
        }
        for (let i = 0; i < numAssets; i++) {
          for (let j = i; j < numAssets; j++) {
            let sumP = 0;
            for (let m = 0; m < lookbackMonths; m++) {
              sumP += (inSampleReturns[i][m] - inSampleMeans[i]) * (inSampleReturns[j][m] - inSampleMeans[j]);
            }
            const covAnnual = (sumP / (lookbackMonths - 1)) * 12;
            inSampleCov[i][j] = covAnnual;
            inSampleCov[j][i] = covAnnual;
          }
        }
      }

      // Optimize weights based on selected goal
      let optResult;
      const optOpts = {
        riskFreeRate: rf,
        lowerBounds: options.lowerBounds,
        upperBounds: options.upperBounds,
        steps: options.steps || 30,
        maxPolishIter: options.maxPolishIter || 40
      };

      if (goal === 'min-vol') {
        optResult = solveGMV(inSampleExpectedReturns, inSampleCov, optOpts);
      } else if (goal === 'risk-parity') {
        optResult = solveRiskParity(inSampleExpectedReturns, inSampleCov, optOpts);
      } else if (goal === 'min-cvar') {
        optResult = solveMinCVaR(inSampleExpectedReturns, inSampleReturns, inSampleCov, optOpts);
      } else {
        optResult = solveTangencyPortfolio(inSampleExpectedReturns, inSampleCov, optOpts);
      }

      const newWeights = optResult.weights;

      // Calculate turnover: 0.5 * sum |w_new - w_prevEnd|
      let turnover = 0;
      if (step > 0) {
        for (let i = 0; i < numAssets; i++) {
          turnover += Math.abs(newWeights[i] - prevEndingWeights[i]);
        }
        turnover *= 0.5;
        totalTurnoverSum += turnover;
      }

      currentStratWeights = [...newWeights];

      // Update baseline weights
      if (baselineType === 'inv-vol') {
        const invVols = inSampleCov.map((row, i) => 1 / Math.max(1e-4, Math.sqrt(row[i])));
        const sumInv = invVols.reduce((a, b) => a + b, 0);
        currentBaseWeights = invVols.map(v => v / sumInv);
      } else {
        currentBaseWeights = new Array(numAssets).fill(1 / numAssets);
      }

      rebalanceEvents.push({
        date,
        weights: [...newWeights],
        inSampleExpectedReturn: optResult.expectedReturn,
        inSampleVol: optResult.volatility,
        inSampleSharpe: optResult.sharpeRatio,
        turnover
      });
    }

    // Record weights for transition area chart
    weightTransitions.dates.push(date);
    for (let i = 0; i < numAssets; i++) {
      weightTransitions.series[i].push(currentStratWeights[i]);
    }

    // Out-of-sample realization for month t
    let rStratMonth = 0;
    let rBaseMonth = 0;
    for (let i = 0; i < numAssets; i++) {
      const r_i = monthlyReturns[i][t];
      rStratMonth += currentStratWeights[i] * r_i;
      rBaseMonth += currentBaseWeights[i] * r_i;
    }

    stratMonthlyReturns.push(rStratMonth);
    baseMonthlyReturns.push(rBaseMonth);

    // Asset drift during holding period
    const nextEndingStratWeights = new Array(numAssets);
    for (let i = 0; i < numAssets; i++) {
      nextEndingStratWeights[i] = (currentStratWeights[i] * (1 + monthlyReturns[i][t])) / (1 + rStratMonth);
    }
    prevEndingWeights = [...nextEndingStratWeights];

    // If not rebalancing next month, weights drift
    currentStratWeights = [...nextEndingStratWeights];
  }

  // Calculate Cumulative Trajectories ($10,000 initial)
  const trajectory = [10000];
  const baseTrajectory = [10000];
  for (let s = 0; s < outOfSampleCount; s++) {
    trajectory.push(trajectory[s] * (1 + stratMonthlyReturns[s]));
    baseTrajectory.push(baseTrajectory[s] * (1 + baseMonthlyReturns[s]));
  }

  // Calculate Comprehensive Out-of-Sample Performance Metrics
  function computeSeriesMetrics(mReturns, traj) {
    const n = mReturns.length;
    const nYears = n / 12;
    const finalVal = traj[traj.length - 1];
    const cagr = Math.pow(finalVal / 10000, 1 / nYears) - 1;

    // Volatility
    const meanM = mReturns.reduce((a, b) => a + b, 0) / n;
    const varM = mReturns.reduce((sum, r) => sum + Math.pow(r - meanM, 2), 0) / (n - 1);
    const annualVol = Math.sqrt(varM * 12);
    const sharpe = annualVol > 0 ? (cagr - rf) / annualVol : 0;

    // Sortino
    const monthlyRf = rf / 12;
    const downsideVar = mReturns.reduce((sum, r) => sum + Math.pow(Math.min(0, r - monthlyRf), 2), 0) / n;
    const downsideVol = Math.sqrt(downsideVar * 12);
    const sortino = downsideVol > 0 ? (cagr - rf) / downsideVol : 0;

    // Max Drawdown
    let peak = traj[0];
    let maxDD = 0;
    for (let s = 0; s < traj.length; s++) {
      if (traj[s] > peak) peak = traj[s];
      const dd = (traj[s] - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }

    const cvarMetrics = calculateCVaR(mReturns, 0.05);

    return {
      cagr,
      annualVol,
      sharpeRatio: sharpe,
      sortinoRatio: sortino,
      maxDrawdown: maxDD,
      cvar: cvarMetrics.cvar,
      totalReturn: (finalVal - 10000) / 10000,
      finalValue: finalVal
    };
  }

  const strategyStats = computeSeriesMetrics(stratMonthlyReturns, trajectory);
  const baselineStats = computeSeriesMetrics(baseMonthlyReturns, baseTrajectory);

  const nYears = outOfSampleCount / 12;
  const avgAnnualTurnover = nYears > 0 ? (totalTurnoverSum / nYears) : 0;
  strategyStats.avgAnnualTurnover = avgAnnualTurnover;

  return {
    lookbackMonths,
    frequency,
    goal,
    baselineType,
    tickers,
    names,
    outOfSampleDates,
    strategyStats,
    baselineStats,
    trajectory,
    baseTrajectory,
    weightTransitions,
    rebalanceEvents,
    outOfSampleMonths: outOfSampleCount
  };
}
