/**
 * Institutional Tail Risk & Downside Analytics Engine
 * 
 * Provides:
 * 1. Historical Simulation Value at Risk (VaR) & Conditional VaR (Expected Shortfall / CVaR)
 * 2. Gaussian Parametric VaR & Closed-Form Normal Expected Shortfall
 * 3. Cornish-Fisher Modified VaR & CVaR (Higher-order expansion for Skewness and Excess Kurtosis)
 * 
 * References:
 * - Bodie, Kane & Marcus, Investments, Chapter 5 (Section 5.5 Deviations from Normality and Tail Risk).
 * - Cornish, E. A., & Fisher, R. A. (1938). "Moments and Cumulants in the Specification of Distributions."
 * - Favre, L., & Galeano, J. A. (2002). "Mean-Modified Value-at-Risk with Hedge Funds." Journal of Alternative Investments.
 * - Boudt, K., Peterson, B. G., & Croux, C. (2008). "Estimation and Decomposition of Downside Risk for Portfolios with Non-Normal Returns." Journal of Risk.
 */

/**
 * Peter John Acklam's high-precision rational approximation of the standard normal inverse CDF.
 * Absolute error < 1.15e-9 throughout the domain (0, 1).
 * 
 * @param {number} p - Probability in (0, 1)
 * @returns {number} Standard normal quantile z such that Phi(z) = p
 */
export function inverseNormalCdf(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  // Coefficients in rational approximations
  const a = [
    -3.969683028665376e+01,
     2.209460984245205e+02,
    -2.759285104469687e+02,
     1.383577518672690e+02,
    -3.066479806614716e+01,
     2.506628277459239e+00
  ];

  const b = [
    -5.447609879822406e+01,
     1.615858368580409e+02,
    -1.556989798598866e+02,
     6.680131188771972e+01,
    -1.328068155288572e+01
  ];

  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
     4.374664141464968e+00,
     2.938163982698783e+00
  ];

  const d = [
     7.784695709041462e-03,
     3.224671290700398e-01,
     2.445134137142996e+00,
     3.754408661907416e+00
  ];

  const p_low = 0.02425;
  const p_high = 1.0 - p_low;

  if (p < p_low) {
    // Rational approximation for lower region
    const q = Math.sqrt(-2.0 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
  }

  if (p <= p_high) {
    // Rational approximation for central region
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0);
  }

  // Rational approximation for upper region
  const q = Math.sqrt(-2.0 * Math.log(1.0 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
}

/**
 * Standard Normal Probability Density Function phi(z).
 * @param {number} z 
 * @returns {number}
 */
export function normalPdf(z) {
  return (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * z * z);
}

/**
 * Computes return distribution moments: mean, standard deviation, skewness, and excess kurtosis.
 * 
 * @param {Array<number>} returns - Array of period returns
 * @returns {{
 *   count: number,
 *   mean: number,
 *   variance: number,
 *   stdDev: number,
 *   annualStdDev: number,
 *   skewness: number,
 *   excessKurtosis: number
 * }}
 */
export function calculateMoments(returns) {
  const n = Array.isArray(returns) ? returns.length : 0;
  if (n < 2) {
    return {
      count: n,
      mean: 0,
      variance: 0,
      stdDev: 0,
      annualStdDev: 0,
      skewness: 0,
      excessKurtosis: 0
    };
  }

  // 1. Mean
  const mean = returns.reduce((acc, r) => acc + r, 0) / n;

  // 2. Variance & Higher Central Moments
  let sumSq = 0;
  let sumCube = 0;
  let sumQuad = 0;

  for (let i = 0; i < n; i++) {
    const diff = returns[i] - mean;
    const d2 = diff * diff;
    sumSq += d2;
    sumCube += d2 * diff;
    sumQuad += d2 * d2;
  }

  const variance = sumSq / (n - 1);
  const stdDev = Math.sqrt(variance);
  const annualStdDev = stdDev * Math.sqrt(12);

  // Skewness and Excess Kurtosis (sample adjusted)
  let skewness = 0;
  let excessKurtosis = 0;

  if (stdDev > 1e-12 && n >= 3) {
    // Unbiased sample skewness
    const m3 = sumCube / n;
    const s3 = Math.pow(variance, 1.5);
    skewness = (n / ((n - 1) * (n - 2))) * (sumCube / s3);

    if (n >= 4) {
      // Unbiased excess kurtosis (Fisher-Pearson standard)
      const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
      const term2 = sumQuad / Math.pow(variance, 2);
      const term3 = (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
      excessKurtosis = term1 * term2 - term3;
    } else {
      excessKurtosis = (sumQuad / (n * Math.pow(variance, 2))) - 3;
    }
  }

  return {
    count: n,
    mean,
    variance,
    stdDev,
    annualStdDev,
    skewness,
    excessKurtosis
  };
}

/**
 * Historical Simulation Value at Risk (VaR).
 * Computes non-parametric empirical quantile loss at confidence level (e.g. 95% or 99%).
 * 
 * @param {Array<number>} returns - Array of historical returns
 * @param {number} [confidence=0.95] - Confidence level (e.g. 0.95 or 0.99)
 * @returns {number} VaR as a positive fraction loss (e.g. 0.082 = 8.2% loss)
 */
export function calculateHistoricalVaR(returns, confidence = 0.95) {
  if (!Array.isArray(returns) || returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const n = sorted.length;
  const p = Math.max(0.001, Math.min(0.5, 1.0 - confidence));

  // Empirical quantile with linear interpolation
  const idx = p * (n - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  const frac = idx - low;

  const q = sorted[low] + frac * (sorted[high] - sorted[low]);
  // VaR is reported as positive loss: -q
  return -q;
}

/**
 * Historical Simulation Conditional Value at Risk (CVaR / Expected Shortfall).
 * Computes the conditional average loss strictly in the tail beyond the VaR threshold.
 * 
 * @param {Array<number>} returns - Array of historical returns
 * @param {number} [confidence=0.95] - Confidence level (e.g. 0.95 or 0.99)
 * @returns {number} CVaR as a positive fraction loss
 */
export function calculateHistoricalCVaR(returns, confidence = 0.95) {
  if (!Array.isArray(returns) || returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const n = sorted.length;
  const p = Math.max(0.001, Math.min(0.5, 1.0 - confidence));

  // Count of tail observations
  const tailCount = Math.max(1, Math.floor(p * n));
  let tailSum = 0;
  for (let i = 0; i < tailCount; i++) {
    tailSum += sorted[i];
  }

  const expectedShortfallReturn = tailSum / tailCount;
  return -expectedShortfallReturn;
}

/**
 * Gaussian Parametric Value at Risk (VaR).
 * Analytical formula based on mean and standard deviation:
 * VaR = z_c * sigma - mu
 * 
 * @param {number} mean - Mean period return
 * @param {number} stdDev - Standard deviation of period return
 * @param {number} [confidence=0.95] - Confidence level
 * @returns {number} Parametric VaR as a positive loss
 */
export function calculateParametricVaR(mean, stdDev, confidence = 0.95) {
  const z_c = inverseNormalCdf(confidence);
  return z_c * stdDev - mean;
}

/**
 * Gaussian Parametric Conditional Value at Risk (CVaR / Expected Shortfall).
 * Analytical closed-form normal distribution tail expectation:
 * CVaR = sigma * [phi(z_c) / (1 - confidence)] - mu
 * 
 * @param {number} mean - Mean period return
 * @param {number} stdDev - Standard deviation of period return
 * @param {number} [confidence=0.95] - Confidence level
 * @returns {number} Parametric CVaR as a positive loss
 */
export function calculateParametricCVaR(mean, stdDev, confidence = 0.95) {
  const z_c = inverseNormalCdf(confidence);
  const p = 1.0 - confidence;
  const pdfVal = normalPdf(z_c);
  return (stdDev * (pdfVal / p)) - mean;
}

/**
 * Computes Cornish-Fisher lower return quantile w_p for tail probability p = 1 - confidence.
 * Corrects for skewness S (crash asymmetry) and excess kurtosis K (fat tails).
 * 
 * Formula:
 * z_p = -z_c = inverseNormalCdf(p)
 * w_p = z_p + (1/6)(z_p^2 - 1)S + (1/24)(z_p^3 - 3z_p)K - (1/36)(2z_p^3 - 5z_p)S^2
 * returnQuantile = mu + w_p * sigma
 * 
 * @param {number} p - Tail probability (e.g. 0.05 for 95% confidence)
 * @param {number} mean - Mean period return
 * @param {number} stdDev - Standard deviation of period return
 * @param {number} skewness - Sample skewness S
 * @param {number} excessKurtosis - Sample excess kurtosis K
 * @returns {number} Empirical return at the p-th quantile
 */
export function cornishFisherReturnQuantile(p, mean, stdDev, skewness, excessKurtosis) {
  const zp = inverseNormalCdf(p);
  const zp2 = zp * zp;
  const zp3 = zp2 * zp;

  // Cornish-Fisher expansion terms
  const termSkew = (1.0 / 6.0) * (zp2 - 1.0) * skewness;
  const termKurt = (1.0 / 24.0) * (zp3 - 3.0 * zp) * excessKurtosis;
  const termSkewSq = -(1.0 / 36.0) * (2.0 * zp3 - 5.0 * zp) * (skewness * skewness);

  const wp = zp + termSkew + termKurt + termSkewSq;
  return mean + wp * stdDev;
}

/**
 * Cornish-Fisher Modified Value at Risk (mVaR).
 * Accounts for negative skewness and leptokurtic fat tails (Bodie Chapter 5.5).
 * 
 * @param {number} mean - Mean period return
 * @param {number} stdDev - Standard deviation of period return
 * @param {number} skewness - Sample skewness
 * @param {number} excessKurtosis - Sample excess kurtosis
 * @param {number} [confidence=0.95] - Confidence level
 * @returns {number} Modified VaR as a positive fraction loss
 */
export function calculateCornishFisherVaR(mean, stdDev, skewness, excessKurtosis, confidence = 0.95) {
  const p = 1.0 - confidence;
  const qReturn = cornishFisherReturnQuantile(p, mean, stdDev, skewness, excessKurtosis);
  return -qReturn;
}

/**
 * Cornish-Fisher Modified Conditional Value at Risk (mCVaR / Expected Shortfall).
 * Computes tail expectation via continuous numerical integration across [0, p]:
 * mCVaR = - (1/p) * \int_0^p q_{CF}(u) du
 * 
 * @param {number} mean - Mean period return
 * @param {number} stdDev - Standard deviation of period return
 * @param {number} skewness - Sample skewness
 * @param {number} excessKurtosis - Sample excess kurtosis
 * @param {number} [confidence=0.95] - Confidence level
 * @param {number} [nSteps=100] - Midpoint integration steps
 * @returns {number} Modified CVaR as a positive fraction loss
 */
export function calculateCornishFisherCVaR(mean, stdDev, skewness, excessKurtosis, confidence = 0.95, nSteps = 100) {
  const p = 1.0 - confidence;
  const du = p / nSteps;
  let integralSum = 0;

  for (let i = 0; i < nSteps; i++) {
    const u = (i + 0.5) * du;
    const qReturn = cornishFisherReturnQuantile(u, mean, stdDev, skewness, excessKurtosis);
    integralSum += qReturn;
  }

  const expectedTailReturn = integralSum / nSteps;
  return -expectedTailReturn;
}

/**
 * Comprehensive Tail Risk & Downside Analytics Suite.
 * Evaluates returns across Historical, Parametric, and Cornish-Fisher Modified regimes
 * at both 95% and 99% confidence horizons.
 * 
 * @param {Array<number>} returns - Array of monthly/period returns
 * @param {Object} [options={}]
 * @param {number} [options.annualRf=0.03]
 * @returns {Object} Complete tail risk report
 */
export function computeTailRiskMetrics(returns, options = {}) {
  const n = Array.isArray(returns) ? returns.length : 0;
  if (n < 4) {
    return {
      hasSufficientData: false,
      sampleSize: n,
      moments: calculateMoments(returns),
      var95: { historical: 0, parametric: 0, cornishFisher: 0 },
      cvar95: { historical: 0, parametric: 0, cornishFisher: 0 },
      var99: { historical: 0, parametric: 0, cornishFisher: 0 },
      cvar99: { historical: 0, parametric: 0, cornishFisher: 0 },
      tailRiskSeverity: 'Insufficient Data (N < 4)',
      ratioCFtoParam95: 1.0,
      ratioCFtoParam99: 1.0
    };
  }

  const moments = calculateMoments(returns);
  const { mean, stdDev, skewness, excessKurtosis } = moments;

  // 95% Confidence Metrics
  const var95Hist = calculateHistoricalVaR(returns, 0.95);
  const cvar95Hist = calculateHistoricalCVaR(returns, 0.95);
  const var95Param = calculateParametricVaR(mean, stdDev, 0.95);
  const cvar95Param = calculateParametricCVaR(mean, stdDev, 0.95);
  const var95CF = calculateCornishFisherVaR(mean, stdDev, skewness, excessKurtosis, 0.95);
  const cvar95CF = calculateCornishFisherCVaR(mean, stdDev, skewness, excessKurtosis, 0.95);

  // 99% Confidence Metrics
  const var99Hist = calculateHistoricalVaR(returns, 0.99);
  const cvar99Hist = calculateHistoricalCVaR(returns, 0.99);
  const var99Param = calculateParametricVaR(mean, stdDev, 0.99);
  const cvar99Param = calculateParametricCVaR(mean, stdDev, 0.99);
  const var99CF = calculateCornishFisherVaR(mean, stdDev, skewness, excessKurtosis, 0.99);
  const cvar99CF = calculateCornishFisherCVaR(mean, stdDev, skewness, excessKurtosis, 0.99);

  // Ratio of Modified VaR to Gaussian Parametric VaR
  const ratioCFtoParam95 = var95Param > 1e-6 ? var95CF / var95Param : 1.0;
  const ratioCFtoParam99 = var99Param > 1e-6 ? var99CF / var99Param : 1.0;

  // Tail Risk Diagnosis
  let tailRiskSeverity = 'Near-Normal Distribution';
  if (ratioCFtoParam95 > 1.15 || excessKurtosis > 2.5 || (skewness < -0.5 && excessKurtosis > 1.5)) {
    tailRiskSeverity = 'Severe Fat Tails (High Crash Risk)';
  } else if (ratioCFtoParam95 > 1.05 || excessKurtosis > 1.0 || skewness < -0.2) {
    tailRiskSeverity = 'Moderate Leptokurtic Tail Risk';
  }

  return {
    hasSufficientData: true,
    sampleSize: n,
    moments,
    var95: {
      historical: var95Hist,
      parametric: var95Param,
      cornishFisher: var95CF
    },
    cvar95: {
      historical: cvar95Hist,
      parametric: cvar95Param,
      cornishFisher: cvar95CF
    },
    var99: {
      historical: var99Hist,
      parametric: var99Param,
      cornishFisher: var99CF
    },
    cvar99: {
      historical: cvar99Hist,
      parametric: cvar99Param,
      cornishFisher: cvar99CF
    },
    tailRiskSeverity,
    ratioCFtoParam95,
    ratioCFtoParam99
  };
}
