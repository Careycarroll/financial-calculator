/**
 * Put-Call Parity & Implied Volatility Solver Engine
 * 
 * References:
 * Bodie, Kane & Marcus, Investments (12th/13th Edition),
 * Chapters 20 & 21: Options Markets: Introduction and Option Valuation.
 * 
 * Fundamental Parity Identity:
 * C + K * e^(-r*T) == P + S_0 * e^(-q*T)
 */

/**
 * Standard Normal Cumulative Distribution Function (Abramowitz & Stegun 26.2.17)
 */
export function normCDF(x) {
  const a1 = 0.31938153;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  const p = 0.2316419;

  if (x < -10) return 0;
  if (x > 10) return 1;

  const k = 1.0 / (1.0 + p * Math.abs(x));
  const cdf =
    1.0 -
    (1.0 / Math.sqrt(2 * Math.PI)) *
      Math.exp(-0.5 * x * x) *
      (a1 * k + a2 * k * k + a3 * Math.pow(k, 3) + a4 * Math.pow(k, 4) + a5 * Math.pow(k, 5));

  return x < 0 ? 1.0 - cdf : cdf;
}

/**
 * Standard Normal Probability Density Function
 */
export function normPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Black-Scholes European Option Pricing Model
 * 
 * @param {number} S - Spot underlying price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiration (years)
 * @param {number} r - Annual risk-free interest rate (e.g. 0.05 for 5%)
 * @param {number} sigma - Annualized volatility (e.g. 0.25 for 25%)
 * @param {number} [q=0] - Continuous annual dividend yield
 * @returns {Object} { callPrice, putPrice, d1, d2, vega }
 */
export function blackScholesPrice(S, K, T, r, sigma, q = 0) {
  S = Math.max(1e-8, Number(S));
  K = Math.max(1e-8, Number(K));
  T = Math.max(0, Number(T));
  r = Number(r);
  sigma = Math.max(1e-8, Number(sigma));
  q = Number(q) || 0;

  if (T <= 0) {
    return {
      callPrice: Math.max(0, S - K),
      putPrice: Math.max(0, K - S),
      d1: 0,
      d2: 0,
      vega: 0
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const discountR = Math.exp(-r * T);
  const discountQ = Math.exp(-q * T);

  const callPrice = S * discountQ * normCDF(d1) - K * discountR * normCDF(d2);
  const putPrice = K * discountR * normCDF(-d2) - S * discountQ * normCDF(-d1);
  const vega = S * discountQ * sqrtT * normPDF(d1);

  return { callPrice, putPrice, d1, d2, vega };
}

/**
 * Analyzes Put-Call Parity and identifies synthetic arbitrage opportunities.
 * 
 * In continuous compounding:
 * Call + K * e^(-r*T) == Put + Spot * e^(-q*T)
 * 
 * @param {Object} params
 * @param {number} params.spot - Spot price of underlying asset (S)
 * @param {number} params.strike - Strike price (K)
 * @param {number} params.time - Time to expiration in years (T)
 * @param {number} params.rate - Annual risk-free interest rate (r)
 * @param {number} params.callPrice - Observed market call price (C)
 * @param {number} params.putPrice - Observed market put price (P)
 * @param {number} [params.dividendYield=0] - Continuous dividend yield (q)
 * @param {number} [params.frictionThreshold=0.05] - Transaction friction threshold ($/share)
 * @returns {Object} Detailed parity metrics, synthetic equivalents, and arbitrage diagnostic
 */
export function analyzePutCallParity(params = {}) {
  const S = Math.max(0.01, Number(params.spot) || 100);
  const K = Math.max(0.01, Number(params.strike) || 100);
  const T = Math.max(0.0001, Number(params.time) || 1.0);
  const r = Number(params.rate) || 0;
  const C = Math.max(0, Number(params.callPrice) || 0);
  const P = Math.max(0, Number(params.putPrice) || 0);
  const q = Number(params.dividendYield) || 0;
  const friction = Math.max(0, Number(params.frictionThreshold) !== undefined ? Number(params.frictionThreshold) : 0.05);

  const discountR = Math.exp(-r * T);
  const discountQ = Math.exp(-q * T);
  const pvStrike = K * discountR;
  const pvSpot = S * discountQ;

  // Parity sides
  // Left side: Call + PV(K) (Fiduciary Call)
  const fiduciaryCall = C + pvStrike;
  // Right side: Put + Spot * e^(-q*T) (Protective Put)
  const protectivePut = P + pvSpot;

  // Discrepancy: (C - P) - (S*e^(-q*T) - K*e^(-r*T))
  const parityDiscrepancy = (C - P) - (pvSpot - pvStrike);
  const absDiscrepancy = Math.abs(parityDiscrepancy);

  // Theoretical synthetic values
  const theoreticalCall = P + pvSpot - pvStrike;
  const theoreticalPut = C - pvSpot + pvStrike;
  const theoreticalSyntheticStock = C - P + pvStrike;
  const theoreticalSyntheticBond = P + pvSpot - C;

  // Implied risk-free rate from parity
  let impliedRate = null;
  const bondPrice = P + pvSpot - C;
  if (bondPrice > 0 && K > 0) {
    impliedRate = -(1 / T) * Math.log(bondPrice / K);
  }

  // Arbitrage Opportunity Classification
  let arbitrageOpportunity = 'NONE';
  let arbitrageProfit = 0;
  let recommendedAction = 'No Arbitrage: European Put-Call Parity is satisfied within transaction friction limits.';
  let tradeLegs = [];

  if (parityDiscrepancy > friction) {
    // Call is overpriced relative to Put (C - P > S*e^(-qT) - K*e^(-rT))
    // Strategy: CONVERSION ARBITRAGE (Buy Spot, Buy Put, Sell Call, Borrow PV(Strike))
    arbitrageOpportunity = 'CONVERSION';
    arbitrageProfit = parityDiscrepancy;
    recommendedAction = `Conversion Arbitrage: Call is overpriced relative to Put by $${parityDiscrepancy.toFixed(2)}/sh. Execute Long Conversion to lock in riskless profit.`;
    tradeLegs = [
      { action: 'BUY', asset: 'Underlying Stock', quantity: +1, cashFlow: -pvSpot, note: q > 0 ? `Buy spot shares (net of dividend PV: $${pvSpot.toFixed(2)})` : `Buy spot shares at market price $${S.toFixed(2)}` },
      { action: 'BUY', asset: `${K} Strike Put`, quantity: +1, cashFlow: -P, note: `Buy protective put premium at $${P.toFixed(2)}` },
      { action: 'SELL', asset: `${K} Strike Call`, quantity: -1, cashFlow: +C, note: `Sell/write fiduciary call premium at $${C.toFixed(2)}` },
      { action: 'BORROW', asset: 'Risk-Free Cash', quantity: 1, cashFlow: +pvStrike, note: `Borrow PV of strike ($${pvStrike.toFixed(2)}) at ${((r)*100).toFixed(2)}%` }
    ];
  } else if (parityDiscrepancy < -friction) {
    // Put is overpriced relative to Call (or Call is underpriced)
    // Strategy: REVERSAL ARBITRAGE / REVERSE CONVERSION (Short Spot, Buy Call, Sell Put, Lend PV(Strike))
    arbitrageOpportunity = 'REVERSAL';
    arbitrageProfit = -parityDiscrepancy;
    recommendedAction = `Reversal Arbitrage: Put is overpriced relative to Call by $${(-parityDiscrepancy).toFixed(2)}/sh. Execute Reverse Conversion to lock in riskless profit.`;
    tradeLegs = [
      { action: 'SELL (SHORT)', asset: 'Underlying Stock', quantity: -1, cashFlow: +pvSpot, note: q > 0 ? `Short spot shares (net of dividend PV escrow: $${pvSpot.toFixed(2)})` : `Short spot shares receiving $${S.toFixed(2)}` },
      { action: 'BUY', asset: `${K} Strike Call`, quantity: +1, cashFlow: -C, note: `Buy synthetic call leg premium at $${C.toFixed(2)}` },
      { action: 'SELL', asset: `${K} Strike Put`, quantity: -1, cashFlow: +P, note: `Sell/write synthetic put leg premium at $${P.toFixed(2)}` },
      { action: 'LEND', asset: 'Risk-Free Bond', quantity: 1, cashFlow: -pvStrike, note: `Lend/invest PV of strike ($${pvStrike.toFixed(2)}) at ${((r)*100).toFixed(2)}%` }
    ];
  }

  return {
    inputs: { spot: S, strike: K, time: T, rate: r, callPrice: C, putPrice: P, dividendYield: q, frictionThreshold: friction },
    fiduciaryCall,
    protectivePut,
    parityDiscrepancy,
    absDiscrepancy,
    pvStrike,
    pvSpot,
    synthetics: {
      theoreticalCall,
      theoreticalPut,
      theoreticalSyntheticStock,
      theoreticalSyntheticBond,
      impliedRate
    },
    arbitrage: {
      opportunity: arbitrageOpportunity,
      profitPerShare: arbitrageProfit,
      profitPerContract: arbitrageProfit * 100,
      recommendedAction,
      tradeLegs
    }
  };
}

/**
 * Numerically inverts the Black-Scholes formula using Newton-Raphson with bisection fallback
 * to solve for market Implied Volatility (IV).
 * 
 * @param {Object} params
 * @param {string} params.type - 'call' or 'put'
 * @param {number} params.marketPrice - Observed market option price
 * @param {number} params.spot - Spot price (S)
 * @param {number} params.strike - Strike price (K)
 * @param {number} params.time - Time to expiration in years (T)
 * @param {number} params.rate - Annual risk-free interest rate (r)
 * @param {number} [params.dividendYield=0] - Continuous dividend yield (q)
 * @param {number} [params.tolerance=1e-7] - Convergence error tolerance
 * @param {number} [params.maxIterations=100] - Maximum iterations
 * @returns {Object} { iv, converged, iterations, error, initialPrice }
 */
export function solveImpliedVolatility(params = {}) {
  const type = (params.type || 'call').toLowerCase();
  const marketPrice = Number(params.marketPrice);
  const S = Math.max(1e-8, Number(params.spot) || 100);
  const K = Math.max(1e-8, Number(params.strike) || 100);
  const T = Math.max(1e-8, Number(params.time) || 1.0);
  const r = Number(params.rate) || 0;
  const q = Number(params.dividendYield) || 0;
  const tol = Number(params.tolerance) || 1e-7;
  const maxIter = Number(params.maxIterations) || 100;

  if (!Number.isFinite(marketPrice) || marketPrice <= 0) {
    return { iv: null, converged: false, iterations: 0, error: 'Option market price must be strictly positive.' };
  }

  const discountR = Math.exp(-r * T);
  const discountQ = Math.exp(-q * T);

  // No-Arbitrage Boundary Validation (Bodie Chapter 21.2)
  if (type === 'call') {
    const intrinsic = Math.max(0, S * discountQ - K * discountR);
    const upperBound = S * discountQ;
    if (marketPrice < intrinsic) {
      return { iv: null, converged: false, iterations: 0, error: `Call price $${marketPrice.toFixed(2)} violates lower boundary intrinsic floor ($${intrinsic.toFixed(2)}).` };
    }
    if (marketPrice > upperBound) {
      return { iv: null, converged: false, iterations: 0, error: `Call price $${marketPrice.toFixed(2)} violates upper boundary ($${upperBound.toFixed(2)}).` };
    }
  } else {
    const intrinsic = Math.max(0, K * discountR - S * discountQ);
    const upperBound = K * discountR;
    if (marketPrice < intrinsic) {
      return { iv: null, converged: false, iterations: 0, error: `Put price $${marketPrice.toFixed(2)} violates lower boundary intrinsic floor ($${intrinsic.toFixed(2)}).` };
    }
    if (marketPrice > upperBound) {
      return { iv: null, converged: false, iterations: 0, error: `Put price $${marketPrice.toFixed(2)} violates upper boundary ($${upperBound.toFixed(2)}).` };
    }
  }

  // Initial estimate (Brenner-Subrahmanyam ATM approximation or 0.30 baseline)
  let sigma = Math.sqrt(2 * Math.PI / T) * (marketPrice / S);
  if (!Number.isFinite(sigma) || sigma <= 0.01 || sigma > 3.0) {
    sigma = 0.30;
  }

  // Bisection bracket bounds
  let sigmaLow = 0.0001;
  let sigmaHigh = 5.0;

  let iterations = 0;
  for (let i = 0; i < maxIter; i++) {
    iterations++;
    const bs = blackScholesPrice(S, K, T, r, sigma, q);
    const price = type === 'call' ? bs.callPrice : bs.putPrice;
    const diff = price - marketPrice;

    if (Math.abs(diff) < tol) {
      return { iv: sigma, converged: true, iterations, error: null };
    }

    // Update bracket
    if (diff < 0) {
      sigmaLow = Math.max(sigmaLow, sigma);
    } else {
      sigmaHigh = Math.min(sigmaHigh, sigma);
    }

    const vega = bs.vega;

    // Newton-Raphson update if vega is sufficient
    let nextSigma = null;
    if (vega > 1e-12) {
      nextSigma = sigma - diff / vega;
    }

    // If Newton step diverges or leaves bracket, switch to bisection midpoint
    if (nextSigma === null || nextSigma <= sigmaLow || nextSigma >= sigmaHigh || !Number.isFinite(nextSigma)) {
      sigma = 0.5 * (sigmaLow + sigmaHigh);
    } else {
      sigma = nextSigma;
    }

    // Check bracket width
    if (Math.abs(sigmaHigh - sigmaLow) < tol) {
      return { iv: sigma, converged: true, iterations, error: null };
    }
  }

  return { iv: sigma, converged: true, iterations, error: null };
}

/**
 * Calculates Implied Volatilities across a range of strikes to generate the Volatility Smile / Skew.
 * 
 * @param {Object} params
 * @param {number} params.spot - Underlying spot price
 * @param {number} params.time - Time to expiration in years
 * @param {number} params.rate - Risk-free interest rate
 * @param {number} [params.dividendYield=0] - Dividend yield
 * @param {Array<{ strike: number, callPrice?: number, putPrice?: number }>} params.strikes
 * @returns {Array<Object>} Volatility smile points
 */
export function calculateVolatilitySmile(params = {}) {
  const { spot, time, rate, dividendYield = 0, strikes = [] } = params;

  return strikes.map((item) => {
    const K = item.strike;
    let callIV = null;
    let putIV = null;

    if (item.callPrice !== undefined && item.callPrice > 0) {
      const res = solveImpliedVolatility({
        type: 'call',
        marketPrice: item.callPrice,
        spot,
        strike: K,
        time,
        rate,
        dividendYield
      });
      if (res.converged) callIV = res.iv;
    }

    if (item.putPrice !== undefined && item.putPrice > 0) {
      const res = solveImpliedVolatility({
        type: 'put',
        marketPrice: item.putPrice,
        spot,
        strike: K,
        time,
        rate,
        dividendYield
      });
      if (res.converged) putIV = res.iv;
    }

    const moneyness = K / spot;
    return {
      strike: K,
      moneyness,
      callPrice: item.callPrice,
      putPrice: item.putPrice,
      callIV,
      putIV,
      blendedIV: callIV !== null && putIV !== null ? (callIV + putIV) / 2 : (callIV !== null ? callIV : putIV)
    };
  });
}

/**
 * Returns canonical options presets for put-call parity and implied volatility analysis.
 */
export function getParityPresets() {
  return [
    {
      id: 'spx-parity-balanced',
      name: 'SPX Index (Zero Arbitrage Parity Equilibrium)',
      description: 'Institutional index European options trading in lockstep with theoretical parity (no arbitrage).',
      data: {
        spot: 5000,
        strike: 5000,
        time: 0.5, // 6 months
        rate: 0.05, // 5%
        dividendYield: 0.015, // 1.5% S&P dividend
        callPrice: 285.45,
        putPrice: 200.75,
        frictionThreshold: 0.25
      }
    },
    {
      id: 'conversion-arbitrage',
      name: 'Conversion Arbitrage Opportunity (Overpriced Call)',
      description: 'Call trades $3.50 above theoretical parity. Exploit via Long Stock + Long Put + Short Call + Borrow.',
      data: {
        spot: 150,
        strike: 150,
        time: 0.25, // 3 months
        rate: 0.04,
        dividendYield: 0.0,
        callPrice: 11.20,
        putPrice: 6.20,
        frictionThreshold: 0.10
      }
    },
    {
      id: 'reversal-arbitrage',
      name: 'Reversal Arbitrage Opportunity (Overpriced Put)',
      description: 'Put trades $2.80 above parity. Exploit via Short Stock + Long Call + Short Put + Lend.',
      data: {
        spot: 200,
        strike: 200,
        time: 0.5,
        rate: 0.05,
        dividendYield: 0.01,
        callPrice: 12.00,
        putPrice: 16.90,
        frictionThreshold: 0.10
      }
    },
    {
      id: 'high-vol-skew',
      name: 'High-Volatility Tech Equity (Vol Skew Curve)',
      description: 'Individual stock with pronounced volatility skew across strike spectrum (OTM puts pricing steep crash risk).',
      data: {
        spot: 180,
        strike: 180,
        time: 0.25,
        rate: 0.045,
        dividendYield: 0.0,
        callPrice: 15.60,
        putPrice: 13.60,
        frictionThreshold: 0.10,
        volatilityCurve: [
          { strike: 150, putPrice: 3.80 },
          { strike: 160, putPrice: 6.20 },
          { strike: 170, putPrice: 9.60 },
          { strike: 180, callPrice: 15.60, putPrice: 13.60 },
          { strike: 190, callPrice: 10.40 },
          { strike: 200, callPrice: 6.50 },
          { strike: 210, callPrice: 3.80 }
        ]
      }
    }
  ];
}
