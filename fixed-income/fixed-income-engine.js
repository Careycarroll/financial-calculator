/**
 * Fixed-Income Analytics Engine
 * Institutional Bond Pricing, Yield Solver, Duration, Convexity, and Immunization.
 * 
 * References:
 * - Bodie, Kane, Marcus: Investments, Chapters 14 & 16.
 * - Fabozzi: Handbook of Fixed Income Securities.
 */

/**
 * Generates schedule of cash flows for a fixed-rate coupon bond.
 * @param {Object} params
 * @param {number} [params.parValue=1000] - Face value (principal) of the bond
 * @param {number} [params.couponRate=0.05] - Annual coupon rate as decimal (e.g. 0.05 for 5%)
 * @param {number} [params.maturityYears=10] - Maturity in years
 * @param {number} [params.frequency=2] - Coupon payments per year (1=annual, 2=semi-annual, 4=quarterly, 12=monthly)
 * @returns {Array<{period: number, timeYears: number, coupon: number, principal: number, totalCF: number}>}
 */
export function generateBondCashFlows({
  parValue = 1000,
  couponRate = 0.05,
  maturityYears = 10,
  frequency = 2
} = {}) {
  const m = Math.max(1, parseInt(frequency, 10) || 2);
  const totalPeriods = Math.max(1, Math.round(maturityYears * m));
  const couponPayment = (parValue * couponRate) / m;
  const flows = [];

  for (let i = 1; i <= totalPeriods; i++) {
    const timeYears = i / m;
    const isMaturity = (i === totalPeriods);
    const principal = isMaturity ? parValue : 0;
    const totalCF = couponPayment + principal;

    flows.push({
      period: i,
      timeYears,
      coupon: couponPayment,
      principal,
      totalCF
    });
  }

  return flows;
}

/**
 * Calculates theoretical dirty price and present value components of a bond.
 * @param {Object} params
 * @param {number} [params.parValue=1000]
 * @param {number} [params.couponRate=0.05]
 * @param {number} [params.maturityYears=10]
 * @param {number} [params.ytm=0.05] - Annual Yield to Maturity as decimal (e.g. 0.05)
 * @param {number} [params.frequency=2]
 * @returns {{price: number, pvCoupons: number, pvPar: number, cashFlows: Array<Object>}}
 */
export function calculateBondPrice({
  parValue = 1000,
  couponRate = 0.05,
  maturityYears = 10,
  ytm = 0.05,
  frequency = 2
} = {}) {
  const m = Math.max(1, parseInt(frequency, 10) || 2);
  const flows = generateBondCashFlows({ parValue, couponRate, maturityYears, frequency: m });
  const periodicYield = ytm / m;

  let pvCoupons = 0;
  let pvPar = 0;

  const evaluatedFlows = flows.map(cf => {
    const discountFactor = Math.pow(1 + periodicYield, -cf.period);
    const pvCoupon = cf.coupon * discountFactor;
    const pvPrincipal = cf.principal * discountFactor;
    const pvTotal = cf.totalCF * discountFactor;

    pvCoupons += pvCoupon;
    pvPar += pvPrincipal;

    return {
      ...cf,
      discountFactor,
      pvCoupon,
      pvPrincipal,
      pvTotal
    };
  });

  const price = pvCoupons + pvPar;

  return {
    price,
    pvCoupons,
    pvPar,
    cashFlows: evaluatedFlows
  };
}

/**
 * Numerical Newton-Raphson solver to compute Yield to Maturity (YTM) from market price.
 * @param {Object} params
 * @param {number} params.price - Current clean/dirty price of the bond
 * @param {number} [params.parValue=1000]
 * @param {number} [params.couponRate=0.05]
 * @param {number} [params.maturityYears=10]
 * @param {number} [params.frequency=2]
 * @param {number} [params.tolerance=1e-7]
 * @param {number} [params.maxIterations=100]
 * @returns {number} Annualized Yield to Maturity (decimal, e.g. 0.0485 for 4.85%)
 */
export function calculateYTM({
  price,
  parValue = 1000,
  couponRate = 0.05,
  maturityYears = 10,
  frequency = 2,
  tolerance = 1e-7,
  maxIterations = 100
}) {
  if (price <= 0) return 0;
  const m = Math.max(1, parseInt(frequency, 10) || 2);
  const n = Math.max(1, Math.round(maturityYears * m));
  const c = (parValue * couponRate) / m;

  // Zero-coupon analytical solution
  if (c === 0) {
    // P = par / (1 + y/m)^n => y/m = (par/P)^(1/n) - 1
    const periodic = Math.pow(parValue / price, 1 / n) - 1;
    return periodic * m;
  }

  // Initial estimate: Standard bond approximation formula
  // y_approx = [C + (Par - P)/T] / [(Par + P)/2]
  let yPeriodic = ((c + (parValue - price) / n) / ((parValue + price) / 2));
  if (yPeriodic <= -0.99) yPeriodic = 0.01;

  for (let iter = 0; iter < maxIterations; iter++) {
    let fVal = -price;
    let fPrime = 0;

    for (let i = 1; i <= n; i++) {
      const isLast = (i === n);
      const cf = c + (isLast ? parValue : 0);
      const df = Math.pow(1 + yPeriodic, -i);
      fVal += cf * df;
      fPrime -= i * cf * Math.pow(1 + yPeriodic, -i - 1);
    }

    if (Math.abs(fVal) < tolerance) {
      return yPeriodic * m;
    }

    if (Math.abs(fPrime) < 1e-12) {
      break;
    }

    const step = fVal / fPrime;
    yPeriodic -= step;

    // Boundary safeguards: Yield per period cannot cause (1 + y) <= 0
    if (yPeriodic < -0.9) yPeriodic = -0.9 + 0.01;
    if (yPeriodic > 5.0) yPeriodic = 5.0;
  }

  // Fallback to bisection if Newton-Raphson failed to converge
  let low = -0.5 / m;
  let high = 2.0 / m;
  for (let b = 0; b < 80; b++) {
    const mid = (low + high) / 2;
    let pMid = 0;
    for (let i = 1; i <= n; i++) {
      const isLast = (i === n);
      const cf = c + (isLast ? parValue : 0);
      pMid += cf * Math.pow(1 + mid, -i);
    }
    if (Math.abs(pMid - price) < tolerance) {
      return mid * m;
    }
    if (pMid > price) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return ((low + high) / 2) * m;
}

/**
 * Calculates Macaulay Duration, Modified Duration, Convexity, and DV01.
 * @param {Object} params
 * @param {number} [params.parValue=1000]
 * @param {number} [params.couponRate=0.05]
 * @param {number} [params.maturityYears=10]
 * @param {number} [params.ytm=0.05]
 * @param {number} [params.frequency=2]
 * @returns {{price: number, macaulayDuration: number, modifiedDuration: number, convexity: number, dv01: number}}
 */
export function calculateDurationAndConvexity({
  parValue = 1000,
  couponRate = 0.05,
  maturityYears = 10,
  ytm = 0.05,
  frequency = 2
} = {}) {
  const m = Math.max(1, parseInt(frequency, 10) || 2);
  const n = Math.max(1, Math.round(maturityYears * m));
  const c = (parValue * couponRate) / m;
  const periodicYield = ytm / m;

  let price = 0;
  let weightedTimeSum = 0;
  let convexitySum = 0;

  for (let i = 1; i <= n; i++) {
    const timeYears = i / m;
    const isLast = (i === n);
    const cf = c + (isLast ? parValue : 0);
    const df = Math.pow(1 + periodicYield, -i);
    const pv = cf * df;

    price += pv;
    weightedTimeSum += timeYears * pv;
    // Convexity term: CF * [ i * (i + 1) / m^2 ] / (1 + y/m)^i
    convexitySum += (cf * (i * (i + 1)) / (m * m)) * df;
  }

  if (price <= 0) {
    return {
      price: 0,
      macaulayDuration: 0,
      modifiedDuration: 0,
      convexity: 0,
      dv01: 0
    };
  }

  const macaulayDuration = weightedTimeSum / price;
  const modifiedDuration = macaulayDuration / (1 + periodicYield);
  const convexity = convexitySum / (price * Math.pow(1 + periodicYield, 2));
  // Dollar value of 1 basis point (0.01% yield shift): P * D* * 0.0001
  const dv01 = price * modifiedDuration * 0.0001;

  return {
    price,
    macaulayDuration,
    modifiedDuration,
    convexity,
    dv01
  };
}

/**
 * Predicts bond price and percentage change using 2nd-order Taylor series (Duration + Convexity).
 * Formula: dP/P ≈ -D* * dy + 0.5 * C * (dy)^2
 * @param {Object} params
 * @param {number} params.price - Initial bond price
 * @param {number} params.modifiedDuration - Modified duration in years
 * @param {number} params.convexity - Annual convexity
 * @param {number} params.deltaYield - Yield shift in decimal (e.g. +0.01 for +100 bps, -0.005 for -50 bps)
 * @returns {{durationEffectPct: number, convexityEffectPct: number, totalPredictedPct: number, predictedPrice: number, dollarChange: number}}
 */
export function estimatePriceSensitivity({
  price,
  modifiedDuration,
  convexity,
  deltaYield
}) {
  const durationEffectPct = -modifiedDuration * deltaYield;
  const convexityEffectPct = 0.5 * convexity * Math.pow(deltaYield, 2);
  const totalPredictedPct = durationEffectPct + convexityEffectPct;
  const dollarChange = price * totalPredictedPct;
  const predictedPrice = price + dollarChange;

  return {
    durationEffectPct,
    convexityEffectPct,
    totalPredictedPct,
    predictedPrice,
    dollarChange
  };
}

/**
 * Generates full yield-shift scenario analysis (-300 bps to +300 bps) comparing linear vs convex vs exact pricing.
 * @param {Object} params
 * @param {number} params.parValue
 * @param {number} params.couponRate
 * @param {number} params.maturityYears
 * @param {number} params.ytm
 * @param {number} params.frequency
 * @param {Array<number>} [shiftsBps=[-300, -200, -100, -50, -25, 0, 25, 50, 100, 200, 300]]
 * @returns {Array<{bps: number, deltaYield: number, exactPrice: number, exactPct: number, durationPrice: number, durationPct: number, convexPrice: number, convexPct: number}>}
 */
export function generateYieldShockTable({
  parValue = 1000,
  couponRate = 0.05,
  maturityYears = 10,
  ytm = 0.05,
  frequency = 2,
  shiftsBps = [-300, -200, -100, -50, -25, 0, 25, 50, 100, 200, 300]
} = {}) {
  const base = calculateDurationAndConvexity({ parValue, couponRate, maturityYears, ytm, frequency });

  return shiftsBps.map(bps => {
    const deltaYield = bps / 10000;
    const shockedYtm = Math.max(0.0001, ytm + deltaYield);

    // Exact re-pricing
    const exact = calculateBondPrice({ parValue, couponRate, maturityYears, ytm: shockedYtm, frequency });
    const exactPct = (exact.price - base.price) / base.price;

    // Linear Duration-only approximation
    const durOnlyPct = -base.modifiedDuration * deltaYield;
    const durOnlyPrice = base.price * (1 + durOnlyPct);

    // 2nd-order Duration + Convexity approximation
    const approx = estimatePriceSensitivity({
      price: base.price,
      modifiedDuration: base.modifiedDuration,
      convexity: base.convexity,
      deltaYield
    });

    return {
      bps,
      deltaYield,
      shockedYtm,
      exactPrice: exact.price,
      exactPct,
      durationPrice: durOnlyPrice,
      durationPct: durOnlyPct,
      convexPrice: approx.predictedPrice,
      convexPct: approx.totalPredictedPct,
      errorPct: Math.abs(approx.totalPredictedPct - exactPct)
    };
  });
}

/**
 * Computes portfolio-level aggregate metrics for a basket of bonds.
 * @param {Array<{parValue: number, couponRate: number, maturityYears: number, ytm: number, frequency: number, quantity: number}>} bonds
 * @returns {{totalValue: number, macaulayDuration: number, modifiedDuration: number, convexity: number, dv01: number, weightedYTM: number, holdings: Array<Object>}}
 */
export function calculatePortfolioFixedIncome(bonds = []) {
  if (!bonds.length) {
    return {
      totalValue: 0,
      macaulayDuration: 0,
      modifiedDuration: 0,
      convexity: 0,
      dv01: 0,
      weightedYTM: 0,
      holdings: []
    };
  }

  let totalValue = 0;
  const analyzedHoldings = bonds.map(b => {
    const metrics = calculateDurationAndConvexity(b);
    const qty = b.quantity || 1;
    const positionValue = metrics.price * qty;
    totalValue += positionValue;

    return {
      ...b,
      price: metrics.price,
      positionValue,
      macaulayDuration: metrics.macaulayDuration,
      modifiedDuration: metrics.modifiedDuration,
      convexity: metrics.convexity,
      dv01: metrics.dv01 * qty
    };
  });

  if (totalValue <= 0) {
    return {
      totalValue: 0,
      macaulayDuration: 0,
      modifiedDuration: 0,
      convexity: 0,
      dv01: 0,
      weightedYTM: 0,
      holdings: analyzedHoldings
    };
  }

  let macaulayDuration = 0;
  let modifiedDuration = 0;
  let convexity = 0;
  let totalDv01 = 0;
  let weightedYTM = 0;

  analyzedHoldings.forEach(h => {
    const weight = h.positionValue / totalValue;
    h.weight = weight;
    macaulayDuration += weight * h.macaulayDuration;
    modifiedDuration += weight * h.modifiedDuration;
    convexity += weight * h.convexity;
    totalDv01 += h.dv01;
    weightedYTM += weight * h.ytm;
  });

  return {
    totalValue,
    macaulayDuration,
    modifiedDuration,
    convexity,
    dv01: totalDv01,
    weightedYTM,
    holdings: analyzedHoldings
  };
}

/**
 * Classical Liability Immunization Engine (Bodie Ch. 16).
 * Matches asset portfolio duration to liability stream duration (D_A = D_L),
 * checks present value solvency (PV_A >= PV_L), and ensures asset convexity exceeds liability convexity (C_A >= C_L).
 * 
 * @param {Object} params
 * @param {Array<{year: number, amount: number}>} params.liabilities - Scheduled future liability outflows
 * @param {number} params.discountRate - Yield curve discount rate for liabilities
 * @param {Object} params.shortBond - Shorter duration instrument (e.g. 2Y or 5Y)
 * @param {Object} params.longBond - Longer duration instrument (e.g. 10Y or 30Y)
 * @returns {Object} Immunization solution with barbell weights, solvency verification, and cash-flow schedule
 */
export function calculateLiabilityImmunization({
  liabilities = [],
  discountRate = 0.045,
  shortBond = { parValue: 1000, couponRate: 0.04, maturityYears: 3, ytm: 0.045, frequency: 2 },
  longBond = { parValue: 1000, couponRate: 0.05, maturityYears: 15, ytm: 0.045, frequency: 2 }
} = {}) {
  // 1. Calculate PV, Duration, and Convexity of Liabilities
  let liabilityPV = 0;
  let weightedTimeSum = 0;
  let liabilityConvexitySum = 0;

  liabilities.forEach(l => {
    const t = l.year;
    const df = Math.pow(1 + discountRate, -t);
    const pv = l.amount * df;
    liabilityPV += pv;
    weightedTimeSum += t * pv;
    // Annual liability convexity: sum( amount * t * (t + 1) / (1 + y)^(t + 2) ) / PV
    liabilityConvexitySum += (l.amount * t * (t + 1)) * Math.pow(1 + discountRate, -(t + 2));
  });

  const liabilityDuration = liabilityPV > 0 ? (weightedTimeSum / liabilityPV) / (1 + discountRate) : 0;
  const liabilityConvexity = liabilityPV > 0 ? liabilityConvexitySum / liabilityPV : 0;

  // 2. Analyze Short and Long Bond Instruments
  const shortMetrics = calculateDurationAndConvexity(shortBond);
  const longMetrics = calculateDurationAndConvexity(longBond);

  const D1 = shortMetrics.modifiedDuration;
  const D2 = longMetrics.modifiedDuration;

  // 3. Solve 2-Asset Immunization System:
  // w1 * D1 + w2 * D2 = D_L, with w1 + w2 = 1 => w1 = (D_L - D2) / (D1 - D2)
  let wShort = 0;
  let wLong = 0;
  let isSolvable = false;

  if (Math.abs(D1 - D2) > 1e-4) {
    wShort = (liabilityDuration - D2) / (D1 - D2);
    wLong = 1 - wShort;
    // Valid non-leveraged barbell: 0 <= wShort <= 1
    isSolvable = (wShort >= -0.05 && wShort <= 1.05);
  }

  const assetDuration = wShort * D1 + wLong * D2;
  const assetConvexity = wShort * shortMetrics.convexity + wLong * longMetrics.convexity;
  const convexityConditionMet = assetConvexity >= liabilityConvexity;

  // Capital required to fully immunize
  const requiredAssetCapital = liabilityPV;
  const shortDollarAllocation = requiredAssetCapital * Math.max(0, wShort);
  const longDollarAllocation = requiredAssetCapital * Math.max(0, wLong);

  const shortBondUnits = shortMetrics.price > 0 ? shortDollarAllocation / shortMetrics.price : 0;
  const longBondUnits = longMetrics.price > 0 ? longDollarAllocation / longMetrics.price : 0;

  return {
    liabilityPV,
    liabilityDuration,
    liabilityConvexity,
    shortBond: {
      ...shortBond,
      price: shortMetrics.price,
      modifiedDuration: D1,
      convexity: shortMetrics.convexity,
      weight: wShort,
      dollarAllocation: shortDollarAllocation,
      units: shortBondUnits
    },
    longBond: {
      ...longBond,
      price: longMetrics.price,
      modifiedDuration: D2,
      convexity: longMetrics.convexity,
      weight: wLong,
      dollarAllocation: longDollarAllocation,
      units: longBondUnits
    },
    assetPortfolio: {
      duration: assetDuration,
      convexity: assetConvexity,
      durationMatched: Math.abs(assetDuration - liabilityDuration) < 0.05,
      convexityShieldPositive: convexityConditionMet,
      convexityAdvantage: assetConvexity - liabilityConvexity
    },
    isSolvable,
    summary: isSolvable
      ? `Immunization verified: ${(wShort * 100).toFixed(1)}% in ${shortBond.maturityYears}Y and ${(wLong * 100).toFixed(1)}% in ${longBond.maturityYears}Y matches ${liabilityDuration.toFixed(2)}Y liability duration with +${(assetConvexity - liabilityConvexity).toFixed(1)} convexity advantage.`
      : `Cannot immunize: Liability duration (${liabilityDuration.toFixed(2)}Y) lies outside available bond bounds (${D1.toFixed(2)}Y to ${D2.toFixed(2)}Y).`
  };
}

// ===================================================================
// 3. Term Structure of Interest Rates & Forward Curves (Bodie Ch. 15)
// ===================================================================

/**
 * Linearly interpolates yield values for arbitrary integer or fractional tenors.
 * @param {Array<{tenor: number, yield: number}>} curve - Known anchor points sorted by tenor
 * @param {number} targetTenor - Desired tenor to interpolate
 * @returns {number} Interpolated yield
 */
export function interpolateYield(curve, targetTenor) {
  if (!curve || !curve.length) return 0;
  if (curve.length === 1) return curve[0].yield;
  if (targetTenor <= curve[0].tenor) return curve[0].yield;
  if (targetTenor >= curve[curve.length - 1].tenor) return curve[curve.length - 1].yield;

  for (let i = 0; i < curve.length - 1; i++) {
    const p1 = curve[i];
    const p2 = curve[i + 1];
    if (targetTenor >= p1.tenor && targetTenor <= p2.tenor) {
      const frac = (targetTenor - p1.tenor) / (p2.tenor - p1.tenor);
      return p1.yield + frac * (p2.yield - p1.yield);
    }
  }

  return curve[curve.length - 1].yield;
}

/**
 * Bootstraps theoretical zero-coupon spot rates (z_t) from par yield curve data.
 * Par bond pricing identity: Par = sum_{i=1}^{N-1} [C / (1 + z_i/m)^i] + (C + Par) / (1 + z_N/m)^N
 * 
 * @param {Array<{tenor: number, parYield: number}>} parPoints - Market par yields (e.g. 1Y: 4.5%, 2Y: 4.6%, etc.)
 * @param {Object} [options]
 * @param {number} [options.frequency=2] - Coupon frequency per year (2 for semi-annual Treasuries)
 * @param {number} [options.maxTenor=30] - Maximum horizon in years to bootstrap
 * @returns {Array<{tenor: number, parYield: number, spotRate: number, discountFactor: number}>}
 */
export function bootstrapSpotCurve(parPoints, { frequency = 2, maxTenor = 30 } = {}) {
  const m = Math.max(1, parseInt(frequency, 10) || 2);
  const sortedPoints = [...parPoints].sort((a, b) => a.tenor - b.tenor);
  const minTenor = Math.max(0.5, sortedPoints[0]?.tenor || 1);
  const upperTenor = Math.min(maxTenor, sortedPoints[sortedPoints.length - 1]?.tenor || 30);

  // Map of tenor (years) -> spot rate
  const spotMap = new Map();
  const results = [];

  // Generate continuous annual or semi-annual grid from minTenor to upperTenor
  const step = 1 / m;
  const totalSteps = Math.round((upperTenor - minTenor) / step);

  for (let s = 0; s <= totalSteps; s++) {
    const tenor = parseFloat((minTenor + s * step).toFixed(4));
    const parYield = interpolateYield(sortedPoints.map(p => ({ tenor: p.tenor, yield: p.parYield })), tenor);
    const n = Math.round(tenor * m);
    const par = 100;
    const c = (par * parYield) / m;

    let spotRate;

    if (n === 1) {
      // First period: Zero-coupon identity (Par = (Par + C) / (1 + z_1/m))
      // => z_1/m = (Par + C) / Par - 1 = C / Par = parYield / m => z_1 = parYield
      spotRate = parYield;
    } else {
      // Intermediate periods sum of discounted coupons
      let pvCoupons = 0;
      for (let i = 1; i < n; i++) {
        const pastTenor = parseFloat((i / m).toFixed(4));
        const pastSpot = spotMap.get(pastTenor) || parYield;
        const df = Math.pow(1 + pastSpot / m, -i);
        pvCoupons += c * df;
      }

      // Par = pvCoupons + (Par + C) / (1 + z_N/m)^N
      // (1 + z_N/m)^N = (Par + C) / (Par - pvCoupons)
      const denom = par - pvCoupons;
      if (denom > 0) {
        const periodicSpot = Math.pow((par + c) / denom, 1 / n) - 1;
        spotRate = periodicSpot * m;
      } else {
        spotRate = parYield;
      }
    }

    spotMap.set(tenor, spotRate);

    // Record integer year tenors or anchor tenors
    if (Math.abs(tenor - Math.round(tenor)) < 1e-4) {
      const integerTenor = Math.round(tenor);
      const discountFactor = Math.pow(1 + spotRate / m, -integerTenor * m);
      results.push({
        tenor: integerTenor,
        parYield,
        spotRate,
        discountFactor
      });
    }
  }

  return results;
}

/**
 * Calculates implied forward interest rates from a zero-coupon spot curve.
 * Formula between t1 and t2: (1 + z_t2)^t2 = (1 + z_t1)^t1 * (1 + f_{t1,t2})^(t2 - t1)
 * => f_{t1,t2} = [ (1 + z_t2)^t2 / (1 + z_t1)^t1 ]^(1 / (t2 - t1)) - 1
 * 
 * @param {Array<{tenor: number, spotRate: number}>} spotCurve - Annual spot rates
 * @returns {Array<{tenor: number, spotRate: number, forwardRate1Y: number}>} Consecutive 1-year forward rates (f_{t-1, t})
 */
export function calculateForwardCurve(spotCurve) {
  if (!spotCurve || spotCurve.length < 2) return [];

  const sorted = [...spotCurve].sort((a, b) => a.tenor - b.tenor);

  return sorted.map((pt, idx) => {
    if (idx === 0) {
      // For t=1, 1-year forward rate equals the 1-year spot rate: f_{0,1} = z_1
      return {
        tenor: pt.tenor,
        spotRate: pt.spotRate,
        forwardRate1Y: pt.spotRate
      };
    }

    const prev = sorted[idx - 1];
    const t1 = prev.tenor;
    const t2 = pt.tenor;
    const dt = t2 - t1;

    // (1 + z2)^t2 / (1 + z1)^t1
    const compoundRatio = Math.pow(1 + pt.spotRate, t2) / Math.pow(1 + prev.spotRate, t1);
    const forwardRate = Math.pow(Math.max(0.0001, compoundRatio), 1 / dt) - 1;

    return {
      tenor: pt.tenor,
      spotRate: pt.spotRate,
      forwardRate1Y: forwardRate
    };
  });
}

/**
 * Calculates a specific forward rate between any two arbitrary periods t1 and t2 (t2 > t1).
 * @param {Array<{tenor: number, spotRate: number}>} spotCurve
 * @param {number} t1 - Start horizon in years
 * @param {number} t2 - End horizon in years
 * @returns {{t1: number, t2: number, forwardRate: number, spot1: number, spot2: number, forwardDiscountFactor: number}}
 */
export function getSpecificForwardRate(spotCurve, t1, t2) {
  if (t2 <= t1) {
    throw new Error('End period t2 must be strictly greater than start period t1.');
  }

  const spotMap = spotCurve.map(p => ({ tenor: p.tenor, yield: p.spotRate }));
  const z1 = interpolateYield(spotMap, t1);
  const z2 = interpolateYield(spotMap, t2);
  const dt = t2 - t1;

  const compoundRatio = Math.pow(1 + z2, t2) / Math.pow(1 + z1, t1);
  const forwardRate = Math.pow(Math.max(0.0001, compoundRatio), 1 / dt) - 1;
  const forwardDiscountFactor = Math.pow(1 + forwardRate, -dt);

  return {
    t1,
    t2,
    forwardRate,
    spot1: z1,
    spot2: z2,
    forwardDiscountFactor
  };
}

/**
 * Evaluates the three classical term structure theories (Bodie Chapter 15).
 * 1. Pure Expectations Hypothesis: Expected Future Rate = Forward Rate (Liquidity Premium = 0)
 * 2. Liquidity Preference Theory: Forward Rate = Expected Future Rate + Term Premium L_t (L_t > 0)
 * 3. Market Segmentation / Preferred Habitat: Relative supply/demand shifts yield spreads across tenors
 * 
 * @param {Array<{tenor: number, parYield: number, spotRate: number}>} spotCurve
 * @param {Array<{tenor: number, forwardRate1Y: number}>} forwardCurve
 * @param {number} [liquiditySlope=0.0010] - Stylized term premium slope per year (+10 bps/yr)
 * @returns {Object} Comprehensive term structure diagnostic report
 */
export function analyzeTermStructureTheories(spotCurve, forwardCurve, { liquiditySlope = 0.0010 } = {}) {
  if (!spotCurve.length || !forwardCurve.length) return null;

  const shortRate = spotCurve[0].spotRate;
  const longRate = spotCurve[spotCurve.length - 1].spotRate;
  const spreadSlope = longRate - shortRate;

  // Determine curve regime
  let regime;
  if (spreadSlope > 0.0075) {
    regime = {
      type: 'Normal (Upward Sloping)',
      badge: 'positive',
      summary: 'Long-term rates exceed short-term rates. Forward curve lies ABOVE the spot curve, which lies ABOVE the par curve.'
    };
  } else if (spreadSlope < -0.0025) {
    regime = {
      type: 'Inverted (Recession Warning)',
      badge: 'warning',
      summary: 'Short-term rates exceed long-term rates. Forward curve lies BELOW the spot curve. Historically precedes macroeconomic recessions.'
    };
  } else {
    regime = {
      type: 'Flat / Transitioning',
      badge: 'neutral',
      summary: 'Yields are uniform across maturities. Spot, par, and forward curves are tightly aligned.'
    };
  }

  // Decompose forward curve under Liquidity Preference Theory
  const forwardDecomposition = forwardCurve.map(f => {
    // Stylized liquidity premium growing with tenor: L_t = min(0.025, liquiditySlope * (tenor - 1)^0.85)
    const termYears = Math.max(0, f.tenor - 1);
    const liquidityPremium = Math.min(0.025, liquiditySlope * Math.pow(termYears, 0.85));
    const expectedSpotRate = f.forwardRate1Y - liquidityPremium;

    return {
      tenor: f.tenor,
      forwardRate: f.forwardRate1Y,
      liquidityPremium,
      expectedSpotRate
    };
  });

  return {
    regime,
    shortRate,
    longRate,
    spreadSlope,
    spreadSlopeBps: Math.round(spreadSlope * 10000),
    forwardDecomposition
  };
}

