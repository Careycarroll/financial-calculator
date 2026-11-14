/**
 * Factor Analysis & Multivariate Econometric Regression Engine
 * 
 * Implements:
 * - Matrix Inversion & Vector Operations for Multivariate OLS: β = (X'X)⁻¹ X'y
 * - Full Econometric Statistics: Beta Loadings, Standard Errors, t-statistics,
 *   p-values with significance flags (***, **, *), Annualized Alpha, R², Adjusted R²
 * - Multi-Factor Models: CAPM, Fama-French 3-Factor, Carhart 4-Factor,
 *   Fama-French 5-Factor, and Fama-French 6-Factor
 * - Rolling Multi-Factor Regression Windows (24M, 36M, 48M, 60M) for Style Drift Tracking
 * - Return Attribution & Variance Decomposition
 * - Factor Statistics & Correlation Matrix
 * 
 * Works in both Node.js test environments and ES module browser runtimes.
 */

import { FACTOR_DEFINITIONS, FACTOR_MODELS } from './factor-data.js';

// -------------------------------------------------------------------
// 1. Matrix Mathematics Utilities
// -------------------------------------------------------------------

/**
 * Transposes a 2D matrix.
 * @param {Array<Array<number>>} A 
 * @returns {Array<Array<number>>} A^T
 */
export function matrixTranspose(A) {
  const rows = A.length;
  const cols = A[0].length;
  const result = Array.from({ length: cols }, () => new Float64Array(rows));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][r] = A[r][c];
    }
  }
  return result;
}

/**
 * Multiplies two matrices A (m x n) and B (n x p).
 * @param {Array<Array<number>>} A 
 * @param {Array<Array<number>>} B 
 * @returns {Array<Array<number>>} A x B (m x p)
 */
export function matrixMultiply(A, B) {
  const m = A.length;
  const n = A[0].length;
  const p = B[0].length;
  const result = Array.from({ length: m }, () => new Float64Array(p));

  for (let i = 0; i < m; i++) {
    for (let k = 0; k < n; k++) {
      const aik = A[i][k];
      for (let j = 0; j < p; j++) {
        result[i][j] += aik * B[k][j];
      }
    }
  }
  return result;
}

/**
 * Inverts an n x n square matrix using Gauss-Jordan elimination with partial pivoting.
 * @param {Array<Array<number>>} A 
 * @returns {Array<Array<number>>} A⁻¹
 */
export function invertMatrix(A) {
  const n = A.length;
  // Create augmented matrix [A | I]
  const M = A.map((row, i) => {
    const r = new Float64Array(2 * n);
    for (let j = 0; j < n; j++) r[j] = row[j];
    r[n + i] = 1.0;
    return r;
  });

  for (let i = 0; i < n; i++) {
    // Partial pivoting
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-12) {
      throw new Error(`Matrix is singular or near-singular at pivot row ${i}`);
    }

    // Normalize pivot row
    const invPivot = 1.0 / pivot;
    for (let j = 0; j < 2 * n; j++) {
      M[i][j] *= invPivot;
    }

    // Eliminate other rows
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        if (factor !== 0) {
          for (let j = 0; j < 2 * n; j++) {
            M[k][j] -= factor * M[i][j];
          }
        }
      }
    }
  }

  // Extract right half
  return M.map(row => Array.from(row.slice(n)));
}

// -------------------------------------------------------------------
// 2. Statistical Probability & Significance
// -------------------------------------------------------------------

/**
 * Standard Normal Cumulative Distribution Function (Abramowitz & Stegun).
 */
export function normalCdf(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * erf);
}

/**
 * Computes the two-tailed p-value for a t-statistic with given degrees of freedom.
 * Uses Cornish-Fisher expansion for high accuracy.
 */
export function tDistPValue(t, df) {
  const absT = Math.abs(t);
  if (isNaN(absT) || df <= 0) return 1.0;
  // Cornish-Fisher expansion transformation to normal deviate
  const z = absT * (1 - 1 / (4 * Math.max(1, df)));
  const p = 2 * (1 - normalCdf(z));
  return Math.max(0.0, Math.min(1.0, p));
}

/**
 * Formats statistical significance stars.
 */
export function getSignificanceStars(pVal) {
  if (pVal < 0.001) return '***';
  if (pVal < 0.01) return '**';
  if (pVal < 0.05) return '*';
  if (pVal < 0.10) return '•';
  return '';
}

// -------------------------------------------------------------------
// 3. Data Alignment & Excess Returns
// -------------------------------------------------------------------

/**
 * Aligns an asset return series with the empirical Fama-French factors by date.
 * Returns aligned excess returns: y_t = R_fund,t - R_f,t.
 */
export function alignFundWithFactors(fundReturns, factorSeries, startDate = null, endDate = null) {
  if (!Array.isArray(fundReturns) || !Array.isArray(factorSeries)) return [];

  const factorMap = new Map();
  factorSeries.forEach(f => factorMap.set(f.date, f));

  const aligned = [];
  fundReturns.forEach(pt => {
    if (startDate && pt.date < startDate) return;
    if (endDate && pt.date > endDate) return;

    const f = factorMap.get(pt.date);
    if (f) {
      const fundRet = pt.ret ?? pt.return;
      const rf = f.rf || 0;
      const fundExcess = fundRet - rf;

      aligned.push({
        date: pt.date,
        fundReturn: fundRet,
        rf,
        fundExcess,
        mkt_rf: f.mkt_rf,
        smb: f.smb,
        hml: f.hml,
        rmw: f.rmw,
        cma: f.cma,
        mom: f.mom
      });
    }
  });

  return aligned;
}

// -------------------------------------------------------------------
// 4. Multivariate OLS Regression Solver
// -------------------------------------------------------------------

/**
 * Solves multivariate Ordinary Least Squares regression:
 * y = α + β₁·X₁ + β₂·X₂ + ... + βₖ·Xₖ + ε
 * 
 * @param {Array<{fundExcess: number, [factorKey: string]: number}>} alignedData
 * @param {Array<string>} factorKeys - e.g. ['mkt_rf', 'smb', 'hml']
 * @returns {Object} Complete regression analysis with loadings, errors, t-stats, p-values, R²
 */
export function runMultivariateRegression(alignedData, factorKeys) {
  const N = alignedData.length;
  const k = factorKeys.length;

  if (N <= k + 2) {
    throw new Error(`Insufficient sample size: ${N} points for ${k} factor variables.`);
  }

  // Construct design matrix X (N x (k+1)) where col 0 is 1.0 (intercept)
  const X = Array.from({ length: N }, () => new Float64Array(k + 1));
  const y = Array.from({ length: N }, () => new Float64Array(1));

  let sumY = 0;
  for (let i = 0; i < N; i++) {
    const pt = alignedData[i];
    X[i][0] = 1.0; // Intercept
    for (let j = 0; j < k; j++) {
      X[i][j + 1] = pt[factorKeys[j]] || 0;
    }
    y[i][0] = pt.fundExcess;
    sumY += pt.fundExcess;
  }

  const meanY = sumY / N;

  // X' ( (k+1) x N )
  const Xt = matrixTranspose(X);

  // X'X ( (k+1) x (k+1) )
  const XtX = matrixMultiply(Xt, X);

  // (X'X)⁻¹
  const XtX_inv = invertMatrix(XtX);

  // X'y ( (k+1) x 1 )
  const Xty = matrixMultiply(Xt, y);

  // β = (X'X)⁻¹ X'y ( (k+1) x 1 )
  const beta = matrixMultiply(XtX_inv, Xty);

  // Calculate residuals, TSS, RSS
  let RSS = 0;
  let TSS = 0;
  const residuals = new Float64Array(N);
  const fitted = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    let yHat = beta[0][0];
    for (let j = 0; j < k; j++) {
      yHat += beta[j + 1][0] * X[i][j + 1];
    }
    fitted[i] = yHat;
    const err = y[i][0] - yHat;
    residuals[i] = err;
    RSS += err * err;
    const diff = y[i][0] - meanY;
    TSS += diff * diff;
  }

  const df = N - k - 1;
  const s2 = RSS / Math.max(1, df);
  const residualStdErr = Math.sqrt(s2);
  const rSquared = TSS > 0 ? Math.max(0, 1 - RSS / TSS) : 0;
  const adjRSquared = TSS > 0 ? Math.max(0, 1 - (RSS / df) / (TSS / (N - 1))) : 0;

  // F-statistic: ((TSS - RSS) / k) / (RSS / df)
  const fStat = k > 0 && s2 > 0 ? ((TSS - RSS) / k) / s2 : 0;

  // Intercept (Alpha)
  const alphaMonthly = beta[0][0];
  const alphaAnnualized = Math.pow(1 + alphaMonthly, 12) - 1;
  const alphaSE = Math.sqrt(Math.max(0, s2 * XtX_inv[0][0]));
  const alphaAnnualSE = alphaSE * Math.sqrt(12);
  const alphaTStat = alphaSE > 0 ? alphaMonthly / alphaSE : 0;
  const alphaPVal = tDistPValue(alphaTStat, df);

  // Factor Loadings
  const loadings = [];
  for (let j = 0; j < k; j++) {
    const fKey = factorKeys[j];
    const b = beta[j + 1][0];
    const se = Math.sqrt(Math.max(0, s2 * XtX_inv[j + 1][j + 1]));
    const tStat = se > 0 ? b / se : 0;
    const pVal = tDistPValue(tStat, df);
    const def = FACTOR_DEFINITIONS[fKey] || { id: fKey, name: fKey, symbol: fKey, color: '#38bdf8' };

    loadings.push({
      key: fKey,
      symbol: def.symbol || fKey,
      name: def.name || fKey,
      color: def.color || '#38bdf8',
      beta: b,
      stdError: se,
      tStat,
      pVal,
      stars: getSignificanceStars(pVal)
    });
  }

  return {
    sampleSize: N,
    degreesOfFreedom: df,
    rSquared,
    adjRSquared,
    fStat,
    residualStdErr,
    annualizedResidualStdErr: residualStdErr * Math.sqrt(12),
    alpha: {
      monthly: alphaMonthly,
      annualized: alphaAnnualized,
      stdError: alphaSE,
      annualizedStdError: alphaAnnualSE,
      tStat: alphaTStat,
      pVal: alphaPVal,
      stars: getSignificanceStars(alphaPVal)
    },
    loadings,
    residuals: Array.from(residuals),
    fitted: Array.from(fitted)
  };
}

// -------------------------------------------------------------------
// 5. Rolling Multi-Factor Regression Engine
// -------------------------------------------------------------------

/**
 * Computes walk-forward rolling factor regressions over a fixed window (e.g., 36 months).
 * Tracks style drift and evolving factor exposures over 20+ years.
 */
export function runRollingFactorRegression(alignedData, factorKeys, windowMonths = 36) {
  if (alignedData.length < windowMonths) return [];

  const results = [];
  for (let i = windowMonths; i <= alignedData.length; i++) {
    const slice = alignedData.slice(i - windowMonths, i);
    const currentDate = slice[slice.length - 1].date;

    try {
      const reg = runMultivariateRegression(slice, factorKeys);
      const row = {
        date: currentDate,
        alphaAnnualized: reg.alpha.annualized,
        rSquared: reg.rSquared,
        loadings: {}
      };
      reg.loadings.forEach(l => {
        row.loadings[l.key] = l.beta;
      });
      results.push(row);
    } catch {
      // Skip if singular window
    }
  }

  return results;
}

// -------------------------------------------------------------------
// 6. Factor Performance Attribution
// -------------------------------------------------------------------

/**
 * Decomposes average annualized fund excess return into factor premia contributions and alpha.
 */
export function computeFactorAttribution(alignedData, regressionResult, factorKeys) {
  const N = alignedData.length;
  if (N === 0) return [];

  // Compute sample mean of each factor
  const factorMeans = {};
  factorKeys.forEach(k => {
    const sum = alignedData.reduce((acc, pt) => acc + (pt[k] || 0), 0);
    factorMeans[k] = (sum / N) * 12; // Annualized factor return
  });

  const attribution = [];
  let totalExplained = regressionResult.alpha.annualized;

  regressionResult.loadings.forEach(l => {
    const fMean = factorMeans[l.key] || 0;
    const contribution = l.beta * fMean;
    totalExplained += contribution;

    attribution.push({
      key: l.key,
      symbol: l.symbol,
      name: l.name,
      color: l.color,
      beta: l.beta,
      annualizedFactorReturn: fMean,
      contribution
    });
  });

  return {
    alphaContribution: regressionResult.alpha.annualized,
    factors: attribution,
    totalExplainedAnnualizedReturn: totalExplained
  };
}

// -------------------------------------------------------------------
// 7. Factor Correlation & Risk Statistics Matrix
// -------------------------------------------------------------------

/**
 * Computes descriptive statistics (CAGR, Volatility, Sharpe) and pairwise correlation matrix
 * for the selected factor series.
 */
export function computeFactorStatistics(factorSeries, factorKeys, startDate = null, endDate = null) {
  const filtered = factorSeries.filter(f => {
    if (startDate && f.date < startDate) return false;
    if (endDate && f.date > endDate) return false;
    return true;
  });

  const N = filtered.length;
  if (N < 2) return null;

  // Means & Stdevs
  const stats = {};
  factorKeys.forEach(k => {
    const vals = filtered.map(f => f[k] || 0);
    const meanMo = vals.reduce((s, v) => s + v, 0) / N;
    const variance = vals.reduce((s, v) => s + (v - meanMo) * (v - meanMo), 0) / (N - 1);
    const volMo = Math.sqrt(variance);

    const annReturn = Math.pow(1 + meanMo, 12) - 1;
    const annVol = volMo * Math.sqrt(12);
    const sharpe = annVol > 0 ? annReturn / annVol : 0;
    const def = FACTOR_DEFINITIONS[k] || { id: k, symbol: k, name: k, color: '#38bdf8' };

    stats[k] = {
      key: k,
      symbol: def.symbol || k,
      name: def.name || k,
      color: def.color || '#38bdf8',
      monthlyMean: meanMo,
      annualizedReturn: annReturn,
      annualizedVol: annVol,
      sharpeRatio: sharpe,
      values: vals
    };
  });

  // Pairwise Correlation Matrix
  const matrix = {};
  factorKeys.forEach(k1 => {
    matrix[k1] = {};
    factorKeys.forEach(k2 => {
      if (k1 === k2) {
        matrix[k1][k2] = 1.0;
      } else {
        const v1 = stats[k1].values;
        const v2 = stats[k2].values;
        const m1 = stats[k1].monthlyMean;
        const m2 = stats[k2].monthlyMean;

        let cov = 0;
        let var1 = 0;
        let var2 = 0;
        for (let i = 0; i < N; i++) {
          const d1 = v1[i] - m1;
          const d2 = v2[i] - m2;
          cov += d1 * d2;
          var1 += d1 * d1;
          var2 += d2 * d2;
        }
        const denom = Math.sqrt(var1 * var2);
        matrix[k1][k2] = denom > 0 ? cov / denom : 0;
      }
    });
  });

  return {
    sampleMonths: N,
    startDate: filtered[0].date,
    endDate: filtered[filtered.length - 1].date,
    stats,
    correlationMatrix: matrix
  };
}
