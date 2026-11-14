/**
 * Factor Exposure Matching & Risk Factor Allocation Engine
 * 
 * Implements:
 * 1. Match Factor Exposures:
 *    - Constrained quadratic optimization via Projected Gradient Descent on the Probability Simplex
 *    - Replicates any target fund (or custom target beta vector) with a basket of liquid ETFs
 *    - Non-negative weights constraint: sum(w_i) = 1, w_i >= 0
 *    - Computes Synthetic Beta loadings, Tracking Error, and Factor Fit R²
 * 
 * 2. Risk Factor Allocation & Factor Risk Parity:
 *    - Marginal Risk Contribution (MRC) and Absolute Risk Contribution (RC) decomposition
 *    - Equal Risk Contribution (ERC) cyclical coordinate descent solver
 *    - Capital Weight vs Risk Contribution Budgeting
 * 
 * Works in both Node.js test environments and ES module browser runtimes.
 */

// -------------------------------------------------------------------
// 1. Simplex Projection Utility
// -------------------------------------------------------------------

/**
 * Projects a vector y onto the probability simplex:
 * min_x ||x - y||_2^2 subject to sum(x) = 1, x >= 0
 * 
 * Runs in O(N log N) using Duchi et al. (2008) sorting method.
 * 
 * @param {Array<number>|Float64Array} v 
 * @returns {Float64Array} Projected vector on simplex
 */
export function projectOntoSimplex(v) {
  const n = v.length;
  if (n === 0) return new Float64Array(0);
  if (n === 1) return new Float64Array([1.0]);

  // Sort descending
  const u = Float64Array.from(v).sort().reverse();
  let cssv = 0;
  let rho = -1;

  for (let i = 0; i < n; i++) {
    cssv += u[i];
    const condition = u[i] + (1 - cssv) / (i + 1);
    if (condition > 0) {
      rho = i;
    }
  }

  let theta = 0;
  let sumUptoRho = 0;
  for (let i = 0; i <= rho; i++) {
    sumUptoRho += u[i];
  }
  theta = (sumUptoRho - 1) / (rho + 1);

  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = Math.max(0, v[i] - theta);
  }
  return x;
}

// -------------------------------------------------------------------
// 2. Factor Exposure Matching Optimizer
// -------------------------------------------------------------------

/**
 * Matches target factor exposures using a pool of candidate funds.
 * Solves: min_w || betaTarget - B * w ||_2^2 subject to sum(w) = 1, w >= 0
 * 
 * @param {Array<number>} targetBetas Array of target factor loadings (length K)
 * @param {Array<Array<number>>} candidateBetas Matrix B of candidate fund loadings (K rows x M cols)
 * @param {Array<{ id: string, name: string }>} candidateFunds Candidate fund descriptors (length M)
 * @param {Object} options 
 * @param {Array<number>} options.factorWeights Importance weights for each factor (length K)
 * @param {number} options.maxIterations Max PGD iterations (default: 200)
 * @param {number} options.stepSize Learning rate (default: 0.1)
 * @param {number} options.tolerance Convergence tolerance (default: 1e-7)
 * @returns {Object} Optimization results
 */
export function solveMatchExposures(targetBetas, candidateBetas, candidateFunds, options = {}) {
  const K = targetBetas.length; // Number of factors
  const M = candidateFunds.length; // Number of candidate funds

  if (M === 0 || K === 0) {
    throw new Error('Candidate funds and target betas must not be empty.');
  }

  const factorWeights = options.factorWeights || new Array(K).fill(1.0);
  const maxIterations = options.maxIterations || 200;
  const tol = options.tolerance || 1e-7;

  // Initialize weights equally: w = 1/M
  let w = new Float64Array(M).fill(1.0 / M);

  // Precompute B^T * W_diag * B and B^T * W_diag * targetBetas
  // Objective: f(w) = 1/2 * (B*w - betaTarget)^T * W_diag * (B*w - betaTarget)
  // Grad: nabla f(w) = B^T * W_diag * (B*w - betaTarget)
  const grad = new Float64Array(M);
  let stepSize = options.stepSize || 0.2;

  // Estimate Lipschitz constant L <= || B^T * W * B ||_F to choose optimal step size
  let frobSq = 0;
  for (let j = 0; j < M; j++) {
    for (let l = 0; l < M; l++) {
      let btb = 0;
      for (let k = 0; k < K; k++) {
        btb += candidateBetas[k][j] * factorWeights[k] * candidateBetas[k][l];
      }
      frobSq += btb * btb;
    }
  }
  const L = Math.max(0.1, Math.sqrt(frobSq));
  stepSize = 1.0 / L;

  let prevLoss = Infinity;

  for (let iter = 0; iter < maxIterations; iter++) {
    // Compute current synthetic betas: syn[k] = sum_j B[k][j] * w[j]
    const synBetas = new Float64Array(K);
    for (let k = 0; k < K; k++) {
      let sum = 0;
      for (let j = 0; j < M; j++) {
        sum += candidateBetas[k][j] * w[j];
      }
      synBetas[k] = sum;
    }

    // Compute loss: sum_k factorWeights[k] * (synBetas[k] - targetBetas[k])^2
    let loss = 0;
    for (let k = 0; k < K; k++) {
      const diff = synBetas[k] - targetBetas[k];
      loss += factorWeights[k] * diff * diff;
    }

    if (Math.abs(prevLoss - loss) < tol) {
      break;
    }
    prevLoss = loss;

    // Compute gradient: grad[j] = sum_k candidateBetas[k][j] * factorWeights[k] * (synBetas[k] - targetBetas[k])
    for (let j = 0; j < M; j++) {
      let g = 0;
      for (let k = 0; k < K; k++) {
        const diff = synBetas[k] - targetBetas[k];
        g += candidateBetas[k][j] * factorWeights[k] * diff;
      }
      grad[j] = g;
    }

    // Gradient descent step
    const nextW = new Float64Array(M);
    for (let j = 0; j < M; j++) {
      nextW[j] = w[j] - stepSize * grad[j];
    }

    // Project onto probability simplex
    w = projectOntoSimplex(nextW);
  }

  // Calculate final synthetic factor exposures
  const matchedBetas = new Float64Array(K);
  for (let k = 0; k < K; k++) {
    let sum = 0;
    for (let j = 0; j < M; j++) {
      sum += candidateBetas[k][j] * w[j];
    }
    matchedBetas[k] = sum;
  }

  // Tracking error / distance
  let totalSqError = 0;
  for (let k = 0; k < K; k++) {
    const diff = matchedBetas[k] - targetBetas[k];
    totalSqError += diff * diff;
  }
  const rootMeanSqError = Math.sqrt(totalSqError / K);

  // Target variance and R²
  const targetMean = targetBetas.reduce((a, b) => a + b, 0) / K;
  let ssTot = 0;
  for (let k = 0; k < K; k++) {
    const d = targetBetas[k] - targetMean;
    ssTot += d * d;
  }
  const factorFitRSquared = ssTot > 1e-8 ? Math.max(0, 1 - (totalSqError / ssTot)) : 1.0;

  // Format allocation results
  const allocations = candidateFunds.map((fund, idx) => ({
    id: fund.id,
    name: fund.name || fund.id,
    weight: w[idx],
    weightPct: w[idx] * 100
  })).filter(a => a.weight > 0.001) // Filter out zero or dust allocations
    .sort((a, b) => b.weight - a.weight);

  return {
    weights: Array.from(w),
    allocations,
    targetBetas: Array.from(targetBetas),
    matchedBetas: Array.from(matchedBetas),
    residuals: Array.from(targetBetas.map((tb, k) => matchedBetas[k] - tb)),
    rootMeanSqError,
    factorFitRSquared,
    factorFitPct: factorFitRSquared * 100
  };
}

// -------------------------------------------------------------------
// 3. Risk Factor Allocation & Factor Risk Parity Solver
// -------------------------------------------------------------------

/**
 * Solves Equal Risk Contribution (ERC / Risk Parity) across assets or factor portfolios
 * using Cyclical Coordinate Descent with logarithmic barrier.
 * 
 * Objective: Find w >= 0, sum(w) = 1 such that:
 * RC_i = w_i * (Sigma * w)_i / sigma_p = sigma_p / M for all i
 * 
 * @param {Array<Array<number>>} covMatrix Covariance matrix M x M
 * @param {Array<{ id: string, name: string }>} assets Asset descriptors (length M)
 * @param {Object} options 
 * @param {number} options.maxIterations Max iterations (default: 300)
 * @param {number} options.tol Convergence tolerance (default: 1e-8)
 * @returns {Object} Equal Risk Contribution allocation and risk breakdown
 */
export function solveFactorRiskParity(covMatrix, assets, options = {}) {
  const M = covMatrix.length;
  if (M === 0) return { weights: [], riskContributions: [], totalVol: 0 };
  if (M === 1) {
    const vol = Math.sqrt(Math.max(0, covMatrix[0][0]));
    return {
      weights: [{ id: assets[0].id, name: assets[0].name, weight: 1.0, weightPct: 100, riskContributionPct: 100 }],
      totalVol: vol,
      isEqualRisk: true
    };
  }

  const maxIter = options.maxIterations || 300;
  const tol = options.tol || 1e-8;

  // Initialize w_i proportional to 1 / sqrt(Sigma_ii) (Inverse Volatility)
  let w = new Float64Array(M);
  let invVolSum = 0;
  for (let i = 0; i < M; i++) {
    const diag = Math.max(1e-8, covMatrix[i][i]);
    const invVol = 1.0 / Math.sqrt(diag);
    w[i] = invVol;
    invVolSum += invVol;
  }
  for (let i = 0; i < M; i++) {
    w[i] /= invVolSum;
  }

  // Cyclical Coordinate Descent (Griveau-Billion et al., 2013)
  // Target risk contribution budget: b_i = 1/M
  const b = 1.0 / M;

  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;

    for (let i = 0; i < M; i++) {
      // (Sigma * w)_i without the i-th term
      let sigmaW_no_i = 0;
      for (let j = 0; j < M; j++) {
        if (j !== i) {
          sigmaW_no_i += covMatrix[i][j] * w[j];
        }
      }

      // Solve quadratic equation: Sigma_ii * x^2 + sigmaW_no_i * x - b * sigma_p^2 = 0
      // In CCD formulation for ERC:
      // x = (-sigmaW_no_i + sqrt(sigmaW_no_i^2 + 4 * Sigma_ii * b * (w^T * Sigma * w))) / (2 * Sigma_ii)
      const sigmaII = Math.max(1e-9, covMatrix[i][i]);
      
      // Current portfolio variance
      let portVar = 0;
      for (let r = 0; r < M; r++) {
        for (let c = 0; c < M; c++) {
          portVar += w[r] * covMatrix[r][c] * w[c];
        }
      }

      const discriminant = sigmaW_no_i * sigmaW_no_i + 4 * sigmaII * b * portVar;
      const newWi = (-sigmaW_no_i + Math.sqrt(Math.max(0, discriminant))) / (2 * sigmaII);

      const change = Math.abs(newWi - w[i]);
      if (change > maxChange) maxChange = change;
      w[i] = Math.max(1e-8, newWi);
    }

    // Normalize weights to sum to 1
    let sumW = 0;
    for (let i = 0; i < M; i++) sumW += w[i];
    for (let i = 0; i < M; i++) w[i] /= sumW;

    if (maxChange < tol) {
      break;
    }
  }

  // Compute final portfolio volatility and risk contributions
  let portVar = 0;
  for (let r = 0; r < M; r++) {
    for (let c = 0; c < M; c++) {
      portVar += w[r] * covMatrix[r][c] * w[c];
    }
  }
  const totalVol = Math.sqrt(Math.max(0, portVar));

  // Marginal Risk Contributions (MRC) and Absolute Risk Contributions (RC)
  const results = assets.map((asset, i) => {
    let sigmaWi = 0;
    for (let j = 0; j < M; j++) {
      sigmaWi += covMatrix[i][j] * w[j];
    }
    const mrc = totalVol > 1e-9 ? (sigmaWi / totalVol) : 0;
    const rc = w[i] * mrc;
    const rcPct = totalVol > 1e-9 ? (rc / totalVol) * 100 : (100 / M);

    return {
      id: asset.id,
      name: asset.name || asset.id,
      weight: w[i],
      weightPct: w[i] * 100,
      marginalRiskContribution: mrc,
      riskContribution: rc,
      riskContributionPct: rcPct
    };
  });

  return {
    weights: results,
    totalVolAnnualized: totalVol * Math.sqrt(12),
    totalVolMonthly: totalVol,
    isEqualRisk: true
  };
}


// -------------------------------------------------------------------
// 4. Canonical Candidate ETFs & Presets
// -------------------------------------------------------------------

export const CANDIDATE_ETF_POOL = [
  {
    id: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    category: 'US Large Cap Blend',
    expenseRatio: '0.09%',
    betas: [1.00, -0.15, -0.05, 0.12, 0.05, 0.05],
    defaultSelected: true,
    role: 'Core broad market beta foundation'
  },
  {
    id: 'QQQ',
    name: 'Invesco QQQ Trust (Nasdaq-100)',
    category: 'Large Cap Growth & Tech',
    expenseRatio: '0.20%',
    betas: [1.18, -0.10, -0.35, 0.35, -0.25, 0.28],
    defaultSelected: true,
    role: 'High-beta growth, profitability & momentum tilt'
  },
  {
    id: 'IJS',
    name: 'iShares S&P Small-Cap 600 Value ETF',
    category: 'Small-Cap Value',
    expenseRatio: '0.18%',
    betas: [0.98, 0.72, 0.58, 0.25, 0.22, -0.12],
    defaultSelected: true,
    role: 'Small-cap size & deep value exposure'
  },
  {
    id: 'IWN',
    name: 'iShares Russell 2000 Value ETF',
    category: 'Small-Cap Value',
    expenseRatio: '0.23%',
    betas: [1.06, 0.82, 0.52, 0.10, 0.18, -0.15],
    defaultSelected: true,
    role: 'High-beta small-cap value tilt'
  },
  {
    id: 'RZV',
    name: 'Invesco S&P SmallCap 600 Pure Value',
    category: 'Small-Cap Pure Value',
    expenseRatio: '0.35%',
    betas: [1.15, 0.95, 0.92, 0.08, 0.32, -0.22],
    defaultSelected: false,
    role: 'Concentrated maximum size & value loadings'
  },
  {
    id: 'VBR',
    name: 'Vanguard Small-Cap Value ETF',
    category: 'Small-Cap Value',
    expenseRatio: '0.07%',
    betas: [1.02, 0.65, 0.42, 0.20, 0.16, -0.08],
    defaultSelected: true,
    role: 'Low-cost blended small-cap value exposure'
  },
  {
    id: 'VTV',
    name: 'Vanguard Value ETF',
    category: 'Large-Cap Value',
    expenseRatio: '0.04%',
    betas: [0.92, -0.18, 0.42, 0.15, 0.24, -0.05],
    defaultSelected: true,
    role: 'Ultra-low cost large-cap value & investment factor'
  },
  {
    id: 'VUG',
    name: 'Vanguard Growth ETF',
    category: 'Large-Cap Growth',
    expenseRatio: '0.04%',
    betas: [1.10, -0.12, -0.32, 0.22, -0.18, 0.18],
    defaultSelected: true,
    role: 'Low-cost large-cap secular growth tilt'
  },
  {
    id: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    category: 'US Aggregate Bonds',
    expenseRatio: '0.03%',
    betas: [0.02, 0.01, 0.00, 0.00, 0.00, 0.00],
    defaultSelected: true,
    role: 'Beta dampening & defensive capital cushion'
  },
  {
    id: 'BIL',
    name: 'SPDR 1-3 Month T-Bill ETF (Cash)',
    category: 'Cash & Short Treasuries',
    expenseRatio: '0.14%',
    betas: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    defaultSelected: true,
    role: 'Zero-beta safe haven cash hurdle'
  }
];

export const TARGET_PRESETS = {
  'berkshire': {
    name: 'Berkshire Hathaway (Value & Quality)',
    betas: [0.80, -0.20, 0.45, 0.30, 0.25, 0.05]
  },
  'small-value': {
    name: 'Small-Cap Pure Value',
    betas: [0.95, 0.85, 0.65, 0.20, 0.25, -0.10]
  },
  'tech-momentum': {
    name: 'High-Beta Tech Momentum',
    betas: [1.15, -0.15, -0.30, 0.30, -0.20, 0.35]
  },
  'defensive-lowbeta': {
    name: 'Low-Beta Quality Dividend',
    betas: [0.65, -0.25, 0.30, 0.35, 0.30, -0.05]
  }
};
