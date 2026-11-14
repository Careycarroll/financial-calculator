/**
 * Principal Component Analysis (PCA) Engine
 * 
 * Provides:
 * - Return Covariance and Correlation Matrix computation for asset returns
 * - Jacobi Eigenvalue Algorithm for symmetric positive semi-definite real matrices
 * - Sorted Eigenvalues & Orthogonal Eigenvectors (V^T * V = I)
 * - Explained Variance Ratios and Cumulative Explained Variance
 * - Kaiser Criterion & Scree Plot coordinates
 * - Asset Factor Loadings / Correlation with Principal Components
 * - Principal Component Time Series construction
 * 
 * Works in both Node.js test environments and ES module browser runtimes.
 */

// -------------------------------------------------------------------
// 1. Covariance & Correlation Matrix Computations
// -------------------------------------------------------------------

/**
 * Computes mean of an array of numbers.
 * @param {Array<number>} arr 
 * @returns {number}
 */
export function computeMean(arr) {
  if (!arr || arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum / arr.length;
}

/**
 * Computes covariance matrix of an array of asset return series.
 * @param {Array<{ id: string, name: string, returns: Array<number> }>} assetSeries 
 * @returns {{ matrix: Array<Array<number>>, assets: Array<string>, means: Array<number>, stdDevs: Array<number> }}
 */
export function computeCovarianceMatrix(assetSeries) {
  const K = assetSeries.length;
  if (K === 0) {
    return { matrix: [], assets: [], means: [], stdDevs: [] };
  }
  const T = assetSeries[0].returns.length;
  const means = assetSeries.map(a => computeMean(a.returns));
  const stdDevs = new Array(K);

  // Compute std devs
  for (let i = 0; i < K; i++) {
    let sumSq = 0;
    const rets = assetSeries[i].returns;
    const m = means[i];
    for (let t = 0; t < T; t++) {
      const diff = rets[t] - m;
      sumSq += diff * diff;
    }
    stdDevs[i] = Math.sqrt(sumSq / Math.max(1, T - 1));
  }

  // Compute covariance matrix
  const matrix = Array.from({ length: K }, () => new Float64Array(K));
  const denom = Math.max(1, T - 1);

  for (let i = 0; i < K; i++) {
    const retsI = assetSeries[i].returns;
    const mI = means[i];
    for (let j = i; j < K; j++) {
      const retsJ = assetSeries[j].returns;
      const mJ = means[j];
      let sumProd = 0;
      for (let t = 0; t < T; t++) {
        sumProd += (retsI[t] - mI) * (retsJ[t] - mJ);
      }
      const cov = sumProd / denom;
      matrix[i][j] = cov;
      matrix[j][i] = cov;
    }
  }

  return {
    matrix,
    assets: assetSeries.map(a => a.id),
    means,
    stdDevs
  };
}

/**
 * Converts covariance matrix to correlation matrix.
 * @param {Array<Array<number>>} covMatrix 
 * @param {Array<number>} stdDevs 
 * @returns {Array<Array<number>>}
 */
export function computeCorrelationMatrix(covMatrix, stdDevs) {
  const K = covMatrix.length;
  const corr = Array.from({ length: K }, () => new Float64Array(K));

  for (let i = 0; i < K; i++) {
    const sI = stdDevs[i];
    for (let j = 0; j < K; j++) {
      const sJ = stdDevs[j];
      if (i === j) {
        corr[i][j] = 1.0;
      } else if (sI > 1e-9 && sJ > 1e-9) {
        const val = covMatrix[i][j] / (sI * sJ);
        corr[i][j] = Math.max(-1.0, Math.min(1.0, val));
      } else {
        corr[i][j] = 0.0;
      }
    }
  }
  return corr;
}

// -------------------------------------------------------------------
// 2. Jacobi Eigenvalue Algorithm for Real Symmetric Matrices
// -------------------------------------------------------------------

/**
 * Computes eigenvalues and eigenvectors of a real symmetric K x K matrix
 * using the classical Jacobi rotation method with quadratic convergence.
 * 
 * Guaranteed to find all real eigenvalues and strictly orthogonal eigenvectors:
 * A * V = V * diag(eigenvalues)
 * V^T * V = I
 * 
 * @param {Array<Array<number>>} A Symmetric K x K matrix
 * @param {number} maxSweeps Maximum number of sweeps (default: 50)
 * @param {number} tol Convergence tolerance (default: 1e-12)
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
    // Find maximum off-diagonal magnitude
    let maxOffDiag = 0;
    for (let i = 0; i < K - 1; i++) {
      for (let j = i + 1; j < K; j++) {
        const absVal = Math.abs(S[i][j]);
        if (absVal > maxOffDiag) maxOffDiag = absVal;
      }
    }

    if (maxOffDiag < tol) {
      break;
    }

    for (let p = 0; p < K - 1; p++) {
      for (let q = p + 1; q < K; q++) {
        const spq = S[p][q];
        if (Math.abs(spq) < tol) continue;

        const spp = S[p][p];
        const sqq = S[q][q];
        const theta = (sqq - spp) / (2 * spq);
        const signTheta = theta >= 0 ? 1 : -1;
        const t = signTheta / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        const tau = s / (1 + c);

        // Update diagonal elements
        S[p][p] = spp - t * spq;
        S[q][q] = sqq + t * spq;
        S[p][q] = 0;
        S[q][p] = 0;

        // Update off-diagonal elements for i != p, q
        for (let i = 0; i < K; i++) {
          if (i !== p && i !== q) {
            const sip = S[i][p];
            const siq = S[i][q];
            S[i][p] = sip - s * (siq + tau * sip);
            S[p][i] = S[i][p];
            S[i][q] = siq + s * (sip - tau * siq);
            S[q][i] = S[i][q];
          }
        }

        // Accumulate rotation into eigenvectors V
        for (let i = 0; i < K; i++) {
          const vip = V[i][p];
          const viq = V[i][q];
          V[i][p] = vip - s * (viq + tau * vip);
          V[i][q] = viq + s * (vip - tau * viq);
        }
      }
    }
  }

  // Extract raw eigenvalues from diagonal of S
  const rawEvals = new Float64Array(K);
  for (let i = 0; i < K; i++) {
    rawEvals[i] = Math.max(0, S[i][i]); // Eigenvalues of covariance are non-negative
  }

  // Sort eigenvalues in descending order and permute eigenvector columns
  const indices = Array.from({ length: K }, (_, i) => i);
  indices.sort((a, b) => rawEvals[b] - rawEvals[a]);

  const sortedEvals = new Array(K);
  const sortedEvecs = Array.from({ length: K }, () => new Float64Array(K));

  for (let k = 0; k < K; k++) {
    const origIdx = indices[k];
    sortedEvals[k] = rawEvals[origIdx];
    for (let r = 0; r < K; r++) {
      sortedEvecs[r][k] = V[r][origIdx];
    }
  }

  // Ensure consistent sign convention: largest absolute element in each eigenvector is positive
  for (let k = 0; k < K; k++) {
    let maxAbs = 0;
    let sign = 1;
    for (let r = 0; r < K; r++) {
      const absVal = Math.abs(sortedEvecs[r][k]);
      if (absVal > maxAbs) {
        maxAbs = absVal;
        sign = Math.sign(sortedEvecs[r][k]) || 1;
      }
    }
    if (sign < 0) {
      for (let r = 0; r < K; r++) {
        sortedEvecs[r][k] = -sortedEvecs[r][k];
      }
    }
  }

  return {
    eigenvalues: sortedEvals,
    eigenvectors: sortedEvecs
  };
}

// -------------------------------------------------------------------
// 3. Complete Principal Component Analysis Routine
// -------------------------------------------------------------------

/**
 * Runs full Principal Component Analysis over a multi-asset return series.
 * Supports analyzing either the Return Covariance Matrix or Correlation Matrix.
 * 
 * @param {Array<{ id: string, name: string, returns: Array<number> }>} assetSeries 
 * @param {Object} options 
 * @param {'correlation'|'covariance'} options.mode Matrix type (default: 'correlation')
 * @returns {Object} Complete PCA results
 */
export function runPrincipalComponentAnalysis(assetSeries, options = {}) {
  const mode = options.mode || 'correlation';
  const K = assetSeries.length;
  if (K < 2) {
    throw new Error('Principal Component Analysis requires at least 2 asset return series.');
  }

  const T = assetSeries[0].returns.length;
  const covResult = computeCovarianceMatrix(assetSeries);
  const { matrix: covMatrix, assets, means, stdDevs } = covResult;
  const corrMatrix = computeCorrelationMatrix(covMatrix, stdDevs);

  // Select matrix based on mode
  const targetMatrix = mode === 'correlation' ? corrMatrix : covMatrix;

  // Perform Jacobi Eigendecomposition
  const { eigenvalues, eigenvectors } = jacobiEigenvalues(targetMatrix);

  // Compute variance ratios
  const totalVariance = eigenvalues.reduce((sum, val) => sum + val, 0);
  const varianceRatios = new Array(K);
  const cumulativeRatios = new Array(K);
  let cumSum = 0;

  for (let k = 0; k < K; k++) {
    const ratio = totalVariance > 0 ? (eigenvalues[k] / totalVariance) : (1 / K);
    cumSum += ratio;
    varianceRatios[k] = ratio;
    cumulativeRatios[k] = Math.min(1.0, cumSum);
  }

  // Asset Factor Loadings on Principal Components
  // For correlation matrix: Loading(i, k) = v_{i, k} * sqrt(lambda_k)
  // which equals the Pearson correlation between Asset i and PC k!
  const loadings = Array.from({ length: K }, () => new Float64Array(K));
  for (let i = 0; i < K; i++) {
    for (let k = 0; k < K; k++) {
      if (mode === 'correlation') {
        const loading = eigenvectors[i][k] * Math.sqrt(Math.max(0, eigenvalues[k]));
        loadings[i][k] = Math.max(-1.0, Math.min(1.0, loading));
      } else {
        // Covariance loading
        loadings[i][k] = eigenvectors[i][k] * Math.sqrt(Math.max(0, eigenvalues[k]));
      }
    }
  }

  // Construct Principal Component Return Time Series
  // PC_k(t) = sum_i [ v_{i,k} * Normalized_Return_i(t) ]
  const numPCsToKeep = Math.min(K, 5);
  const pcTimeSeries = [];

  for (let k = 0; k < numPCsToKeep; k++) {
    const rets = new Float64Array(T);
    for (let t = 0; t < T; t++) {
      let val = 0;
      for (let i = 0; i < K; i++) {
        if (mode === 'correlation' && stdDevs[i] > 1e-9) {
          // Standardized return: (R_i - mean_i) / stdDev_i
          const z = (assetSeries[i].returns[t] - means[i]) / stdDevs[i];
          val += eigenvectors[i][k] * z;
        } else {
          val += eigenvectors[i][k] * assetSeries[i].returns[t];
        }
      }
      rets[t] = val;
    }
    pcTimeSeries.push({
      pcIndex: k + 1,
      name: `PC ${k + 1}`,
      returns: Array.from(rets)
    });
  }

  // Kaiser Criterion: retains components with eigenvalue >= 1.0 (for correlation matrix)
  const kaiserCount = mode === 'correlation'
    ? eigenvalues.filter(e => e >= 1.0).length
    : eigenvalues.filter((e, idx) => varianceRatios[idx] >= (1 / K)).length;

  return {
    mode,
    assetCount: K,
    sampleMonths: T,
    assets: assetSeries.map(a => ({ id: a.id, name: a.name || a.id })),
    means,
    stdDevs,
    covMatrix,
    corrMatrix,
    eigenvalues,
    eigenvectors,
    totalVariance,
    varianceRatios,
    cumulativeRatios,
    loadings,
    pcTimeSeries,
    kaiserCount: Math.max(1, kaiserCount),
    summary: {
      pc1VariancePct: varianceRatios[0] * 100,
      pc2VariancePct: (varianceRatios[1] || 0) * 100,
      pc3VariancePct: (varianceRatios[2] || 0) * 100,
      top3CumulativePct: (cumulativeRatios[Math.min(K - 1, 2)]) * 100
    }
  };
}

// -------------------------------------------------------------------
// 4. Canonical PCA Presets
// -------------------------------------------------------------------

export const PCA_PRESETS = {
  'all-weather': {
    name: 'Multi-Asset All-Weather',
    assetIds: ['TotalStockMarket', 'IntermediateTreasury', 'Gold', 'REIT', 'Commodities'],
    source: 'asset-class'
  },
  'us-styles': {
    name: 'US Equity Styles',
    assetIds: ['LargeCapBlend', 'LargeCapValue', 'LargeCapGrowth', 'SmallCapBlend', 'SmallCapValue'],
    source: 'asset-class'
  },
  'factor-etfs': {
    name: 'Small-Cap Factor ETFs',
    assetIds: ['IJS', 'IWN', 'RZV', 'VBR'],
    source: 'factor-data'
  },
  'global-macro': {
    name: 'Global Macro Universe',
    assetIds: ['TotalStockMarket', 'IntlStockMarket', 'EmergingMarket', 'TotalBond', 'Cash'],
    source: 'asset-class'
  }
};
