/**
 * Fund Regression & Factor Analysis Engine
 * 
 * Implements econometric algorithms:
 * - Ordinary Least Squares (OLS) CAPM Regression (Alpha, Beta, R², Standard Error)
 * - Dual-Beta (Asymmetric Risk: Upside Beta vs. Downside Beta)
 * - Up-Market and Down-Market Capture Ratios
 * - Rolling Window Regression (36M / 60M dynamic Alpha & Beta)
 * - Modern Portfolio Theory Risk Metrics (Sharpe, Sortino, Treynor, Information Ratio, Max Drawdown)
 * 
 * Works in both Node.js and ES module browser environments.
 */

/**
 * Computes monthly percentage return series from resampled monthly price points.
 * @param {Array<{date: string, close: number, adjClose?: number}>} monthlyData
 * @param {boolean} useDRIP - If true, uses adjClose; otherwise uses close.
 * @returns {Array<{date: string, return: number, price: number}>}
 */
export function computeMonthlyReturns(monthlyData, useDRIP = true) {
  if (!Array.isArray(monthlyData) || monthlyData.length < 2) return [];

  const returns = [];
  for (let i = 1; i < monthlyData.length; i++) {
    const prev = monthlyData[i - 1];
    const curr = monthlyData[i];

    const prevPrice = useDRIP ? (prev.adjClose ?? prev.close) : prev.close;
    const currPrice = useDRIP ? (curr.adjClose ?? curr.close) : curr.close;

    if (prevPrice > 0 && currPrice > 0) {
      const ret = (currPrice - prevPrice) / prevPrice;
      returns.push({
        date: curr.date,
        return: ret,
        price: currPrice
      });
    }
  }
  return returns;
}

/**
 * Aligns fund returns with benchmark returns by date.
 * @param {Array<{date: string, return: number}>} fundReturns
 * @param {Array<{date: string, return: number}>} benchmarkReturns
 * @returns {Array<{date: string, rFund: number, rBench: number}>}
 */
export function alignReturns(fundReturns, benchmarkReturns) {
  const benchMap = new Map();
  benchmarkReturns.forEach(b => benchMap.set(b.date, b.return));

  const aligned = [];
  fundReturns.forEach(f => {
    if (benchMap.has(f.date)) {
      aligned.push({
        date: f.date,
        rFund: f.return,
        rBench: benchMap.get(f.date)
      });
    }
  });

  return aligned.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Runs Ordinary Least Squares (OLS) linear regression of fund excess returns on benchmark excess returns.
 * Model: (R_fund - R_f) = Alpha + Beta * (R_bench - R_f) + epsilon
 * 
 * @param {Array<{date: string, rFund: number, rBench: number}>} alignedPairs
 * @param {number} annualRf - Annual risk-free rate (e.g., 0.03 for 3%).
 * @returns {Object} Regression coefficients and statistics.
 */
export function runCAPMRegression(alignedPairs, annualRf = 0) {
  const n = alignedPairs.length;
  if (n < 3) {
    return {
      n,
      beta: 0,
      monthlyAlpha: 0,
      annualizedAlpha: 0,
      rSquared: 0,
      correlation: 0,
      stdError: 0,
      trackingError: 0
    };
  }

  const monthlyRf = annualRf / 12;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  const xVals = [];
  const yVals = [];

  for (let i = 0; i < n; i++) {
    const x = alignedPairs[i].rBench - monthlyRf; // benchmark excess return
    const y = alignedPairs[i].rFund - monthlyRf;  // fund excess return
    xVals.push(x);
    yVals.push(y);

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  // Covariance and Variance
  let covXY = 0;
  let varX = 0;
  let varY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xVals[i] - meanX;
    const dy = yVals[i] - meanY;
    covXY += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  // Beta = Cov(X, Y) / Var(X)
  const beta = varX > 1e-12 ? covXY / varX : 0;

  // Monthly Alpha = mean(Y) - beta * mean(X)
  const monthlyAlpha = meanY - beta * meanX;

  // Annualized Alpha: (1 + alpha_m)^12 - 1
  const annualizedAlpha = Math.pow(1 + monthlyAlpha, 12) - 1;

  // Correlation & R-squared
  const denom = Math.sqrt(varX * varY);
  const correlation = denom > 1e-12 ? Math.max(-1, Math.min(1, covXY / denom)) : 0;
  const rSquared = correlation * correlation;

  // Residuals & Standard Error of Estimate
  let sse = 0; // Sum of squared errors
  for (let i = 0; i < n; i++) {
    const predictedY = monthlyAlpha + beta * xVals[i];
    const residual = yVals[i] - predictedY;
    sse += residual * residual;
  }

  const df = Math.max(1, n - 2);
  const stdError = Math.sqrt(sse / df) * Math.sqrt(12); // Annualized residual volatility

  // Tracking Error: Volatility of (R_fund - R_bench)
  let diffSum = 0;
  let diffSqSum = 0;
  for (let i = 0; i < n; i++) {
    const diff = alignedPairs[i].rFund - alignedPairs[i].rBench;
    diffSum += diff;
    diffSqSum += diff * diff;
  }
  const meanDiff = diffSum / n;
  const varDiff = n > 1 ? (diffSqSum - n * meanDiff * meanDiff) / (n - 1) : 0;
  const trackingError = Math.sqrt(Math.max(0, varDiff)) * Math.sqrt(12);

  return {
    n,
    beta: Number(beta.toFixed(4)),
    monthlyAlpha: Number(monthlyAlpha.toFixed(6)),
    annualizedAlpha: Number(annualizedAlpha.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
    correlation: Number(correlation.toFixed(4)),
    stdError: Number(stdError.toFixed(4)),
    trackingError: Number(trackingError.toFixed(4))
  };
}

/**
 * Computes comprehensive Risk-Adjusted metrics for a fund return series.
 * @param {Array<number>} returns - Array of monthly percentage returns.
 * @param {number} annualRf - Annual risk-free rate (e.g. 0.03).
 * @param {number} beta - Pre-computed market beta (optional, for Treynor).
 * @returns {Object} CAGR, Volatility, Sharpe, Sortino, Treynor, MaxDrawdown.
 */
export function computeRiskMetrics(returns, annualRf = 0, beta = 1) {
  const n = returns.length;
  if (n < 2) {
    return {
      cagr: 0,
      annualVolatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      treynorRatio: 0,
      maxDrawdown: 0
    };
  }

  const monthlyRf = annualRf / 12;

  // 1. Compound Total Return & CAGR
  let compound = 1;
  returns.forEach(r => {
    compound *= (1 + r);
  });
  const years = n / 12;
  const cagr = years > 0 ? Math.pow(compound, 1 / years) - 1 : 0;

  // 2. Annualized Volatility
  const meanR = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((acc, r) => acc + Math.pow(r - meanR, 2), 0) / (n - 1);
  const monthlyVol = Math.sqrt(Math.max(0, variance));
  const annualVolatility = monthlyVol * Math.sqrt(12);

  // 3. Sharpe Ratio
  const excessReturn = cagr - annualRf;
  const sharpeRatio = annualVolatility > 1e-6 ? excessReturn / annualVolatility : 0;

  // 4. Downside Semivariance & Sortino Ratio
  // Downside considers only returns below the monthly risk-free rate (or 0)
  const downsideVariance = returns.reduce((acc, r) => {
    const diff = Math.min(0, r - monthlyRf);
    return acc + (diff * diff);
  }, 0) / n;
  const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(12);
  const sortinoRatio = downsideDeviation > 1e-6 ? excessReturn / downsideDeviation : 0;

  // 5. Treynor Ratio: Excess Return / Beta
  const treynorRatio = Math.abs(beta) > 1e-4 ? excessReturn / beta : 0;

  // 6. Max Drawdown across monthly compounding trajectory
  let peak = 1;
  let currentVal = 1;
  let maxDrawdown = 0;

  for (let i = 0; i < n; i++) {
    currentVal *= (1 + returns[i]);
    if (currentVal > peak) {
      peak = currentVal;
    }
    const dd = (currentVal - peak) / peak;
    if (dd < maxDrawdown) {
      maxDrawdown = dd;
    }
  }

  return {
    cagr: Number(cagr.toFixed(4)),
    annualVolatility: Number(annualVolatility.toFixed(4)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    sortinoRatio: Number(sortinoRatio.toFixed(2)),
    treynorRatio: Number(treynorRatio.toFixed(4)),
    maxDrawdown: Number(maxDrawdown.toFixed(4))
  };
}

/**
 * Runs Dual-Beta regression separating Up-market months from Down-market months.
 * Computes Upside Beta (β⁺), Downside Beta (β⁻), Up Capture Ratio, and Down Capture Ratio.
 * 
 * @param {Array<{date: string, rFund: number, rBench: number}>} alignedPairs
 * @param {number} annualRf
 * @returns {Object} Up Beta, Down Beta, Up Capture, Down Capture, Asymmetry Spread.
 */
export function computeDualBetaAndCapture(alignedPairs, annualRf = 0) {
  const upMonths = alignedPairs.filter(p => p.rBench > 0);
  const downMonths = alignedPairs.filter(p => p.rBench <= 0);

  // Up-market OLS
  const upReg = upMonths.length >= 3 ? runCAPMRegression(upMonths, annualRf) : { beta: 0 };
  // Down-market OLS
  const downReg = downMonths.length >= 3 ? runCAPMRegression(downMonths, annualRf) : { beta: 0 };

  // Geometric Up-Market Compounding
  let upFundCompound = 1;
  let upBenchCompound = 1;
  upMonths.forEach(p => {
    upFundCompound *= (1 + p.rFund);
    upBenchCompound *= (1 + p.rBench);
  });
  const upFundTotal = upFundCompound - 1;
  const upBenchTotal = upBenchCompound - 1;
  const upCapture = upBenchTotal !== 0 ? (upFundTotal / upBenchTotal) * 100 : 100;

  // Geometric Down-Market Compounding
  let downFundCompound = 1;
  let downBenchCompound = 1;
  downMonths.forEach(p => {
    downFundCompound *= (1 + p.rFund);
    downBenchCompound *= (1 + p.rBench);
  });
  const downFundTotal = downFundCompound - 1;
  const downBenchTotal = downBenchCompound - 1;
  const downCapture = downBenchTotal !== 0 ? (downFundTotal / downBenchTotal) * 100 : 100;

  // Capture Spread: Ratio of Up Capture to Down Capture
  const captureRatio = downCapture !== 0 ? Math.abs(upCapture / downCapture) : 0;

  return {
    upBeta: upReg.beta,
    downBeta: downReg.beta,
    upCapture: Number(upCapture.toFixed(2)),
    downCapture: Number(downCapture.toFixed(2)),
    captureRatio: Number(captureRatio.toFixed(2)),
    upMonthsCount: upMonths.length,
    downMonthsCount: downMonths.length
  };
}

/**
 * Computes rolling window regression (e.g., 36 months = 3 years).
 * Useful for inspecting dynamic manager edge and beta stability across historical market cycles.
 * 
 * @param {Array<{date: string, rFund: number, rBench: number}>} alignedPairs
 * @param {number} windowMonths - e.g. 36
 * @param {number} annualRf
 * @returns {Array<{date: string, beta: number, alpha: number, rSquared: number}>}
 */
export function computeRollingRegression(alignedPairs, windowMonths = 36, annualRf = 0) {
  if (alignedPairs.length < windowMonths) return [];

  const results = [];
  for (let i = windowMonths - 1; i < alignedPairs.length; i++) {
    const windowSlice = alignedPairs.slice(i - windowMonths + 1, i + 1);
    const reg = runCAPMRegression(windowSlice, annualRf);

    results.push({
      date: alignedPairs[i].date,
      beta: reg.beta,
      alpha: reg.annualizedAlpha,
      rSquared: reg.rSquared
    });
  }

  return results;
}

/**
 * Full Fund Regression Profile
 * Executes complete econometric analysis for a fund against a reference benchmark.
 * 
 * @param {Object} fund - Fund object { ticker, name, color, data: [{date, close, adjClose}] }
 * @param {Object} benchmark - Benchmark fund object
 * @param {Object} options - { useDRIP: boolean, annualRf: number, windowMonths: number }
 * @returns {Object} Complete scorecard profile
 */
export function analyzeFundRegression(fund, benchmark, options = {}) {
  const {
    useDRIP = true,
    annualRf = 0.03, // Default 3% T-Bill
    windowMonths = 36
  } = options;

  const fundReturns = computeMonthlyReturns(fund.data, useDRIP);
  const benchReturns = computeMonthlyReturns(benchmark.data, useDRIP);

  const aligned = alignReturns(fundReturns, benchReturns);
  if (aligned.length < 3) {
    return null;
  }

  // 1. CAPM Linear Regression
  const capm = runCAPMRegression(aligned, annualRf);

  // 2. Risk Metrics
  const fundOnlyReturns = aligned.map(a => a.rFund);
  const benchOnlyReturns = aligned.map(a => a.rBench);

  const fundRisk = computeRiskMetrics(fundOnlyReturns, annualRf, capm.beta);
  const benchRisk = computeRiskMetrics(benchOnlyReturns, annualRf, 1.0);

  // 3. Information Ratio: (Fund Return - Bench Return) / Tracking Error
  const excessOverBench = fundRisk.cagr - benchRisk.cagr;
  const informationRatio = capm.trackingError > 1e-4
    ? Number((excessOverBench / capm.trackingError).toFixed(2))
    : 0;

  // 4. Dual-Beta & Capture
  const dualBeta = computeDualBetaAndCapture(aligned, annualRf);

  // 5. Rolling Regression
  const rolling = computeRollingRegression(aligned, windowMonths, annualRf);

  return {
    ticker: fund.ticker || fund.name,
    name: fund.name,
    color: fund.color || '#3b82f6',
    monthsCount: aligned.length,
    startDate: aligned[0].date,
    endDate: aligned[aligned.length - 1].date,
    capm,
    fundRisk,
    benchRisk,
    informationRatio,
    dualBeta,
    rolling
  };
}
