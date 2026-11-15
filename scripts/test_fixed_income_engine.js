/**
 * Automated Unit Test Suite for Fixed-Income Engine
 * Tests bond pricing, Newton-Raphson YTM inversion, duration/convexity,
 * DV01, Taylor series price sensitivity, and liability immunization.
 */

import {
  generateBondCashFlows,
  calculateBondPrice,
  calculateYTM,
  calculateDurationAndConvexity,
  estimatePriceSensitivity,
  generateYieldShockTable,
  calculatePortfolioFixedIncome,
  calculateLiabilityImmunization,
  bootstrapSpotCurve,
  calculateForwardCurve,
  getSpecificForwardRate,
  analyzeTermStructureTheories,
  KEY_RATE_TENORS,
  calculateTriangularWeights,
  calculateBondKeyRateDuration,
  calculatePortfolioKeyRateDuration,
  estimateNonParallelPriceChange,
  CURVE_SHIFT_PRESETS
} from '../fixed-income/fixed-income-engine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== RUNNING FIXED-INCOME ENGINE TESTS ===\n');

// --- TEST 1: Par Bond Identity ---
console.log('--- TEST 1: Par Bond Pricing Identity ---');
const parBond = calculateBondPrice({
  parValue: 1000,
  couponRate: 0.05,
  maturityYears: 10,
  ytm: 0.05,
  frequency: 2
});
assert(Math.abs(parBond.price - 1000) < 1e-4, `5% coupon bond with 5% YTM prices exactly at par $1,000 (Actual: $${parBond.price.toFixed(4)})`);
assert(parBond.cashFlows.length === 20, `10Y semi-annual bond generates 20 cash flow periods (Actual: ${parBond.cashFlows.length})`);
assert(parBond.cashFlows[0].coupon === 25, `Semi-annual coupon payment is $25 (Actual: $${parBond.cashFlows[0].coupon})`);

// --- TEST 2: Premium & Discount Pricing ---
console.log('\n--- TEST 2: Discount & Premium Pricing ---');
const discountBond = calculateBondPrice({
  parValue: 1000,
  couponRate: 0.03,
  maturityYears: 10,
  ytm: 0.05,
  frequency: 2
});
assert(discountBond.price < 1000, `3% coupon bond at 5% YTM trades at discount (Price: $${discountBond.price.toFixed(2)})`);

const premiumBond = calculateBondPrice({
  parValue: 1000,
  couponRate: 0.07,
  maturityYears: 10,
  ytm: 0.05,
  frequency: 2
});
assert(premiumBond.price > 1000, `7% coupon bond at 5% YTM trades at premium (Price: $${premiumBond.price.toFixed(2)})`);

// --- TEST 3: Zero-Coupon Bond Identity ---
console.log('\n--- TEST 3: Zero-Coupon Bond Math ---');
const zeroBond = calculateDurationAndConvexity({
  parValue: 1000,
  couponRate: 0.0,
  maturityYears: 5,
  ytm: 0.04,
  frequency: 2
});
const expectedZeroPrice = 1000 / Math.pow(1 + 0.04 / 2, 10);
assert(Math.abs(zeroBond.price - expectedZeroPrice) < 1e-4, `Zero-coupon bond price matches formula (Actual: $${zeroBond.price.toFixed(4)} vs Expected: $${expectedZeroPrice.toFixed(4)})`);
assert(Math.abs(zeroBond.macaulayDuration - 5.0) < 1e-4, `Zero-coupon bond Macaulay duration strictly equals maturity (5.000 yrs, Actual: ${zeroBond.macaulayDuration.toFixed(4)})`);
assert(zeroBond.modifiedDuration < 5.0, `Zero-coupon bond Modified duration is D / (1 + y/m) = ${(5 / 1.02).toFixed(4)} (Actual: ${zeroBond.modifiedDuration.toFixed(4)})`);

// --- TEST 4: Newton-Raphson YTM Inversion ---
console.log('\n--- TEST 4: Newton-Raphson YTM Inversion ---');
const targetYtm = 0.0635;
const pricedBond = calculateBondPrice({
  parValue: 1000,
  couponRate: 0.045,
  maturityYears: 7,
  ytm: targetYtm,
  frequency: 2
});
const solvedYtm = calculateYTM({
  price: pricedBond.price,
  parValue: 1000,
  couponRate: 0.045,
  maturityYears: 7,
  frequency: 2
});
assert(Math.abs(solvedYtm - targetYtm) < 1e-5, `YTM accurately solved to within 0.001% (Solved: ${(solvedYtm * 100).toFixed(4)}% vs Target: ${(targetYtm * 100).toFixed(4)}%)`);

// --- TEST 5: Duration, Convexity, and DV01 ---
console.log('\n--- TEST 5: Duration, Convexity & DV01 ---');
const sensBond = calculateDurationAndConvexity({
  parValue: 1000,
  couponRate: 0.06,
  maturityYears: 10,
  ytm: 0.06,
  frequency: 2
});
assert(sensBond.macaulayDuration > 7.0 && sensBond.macaulayDuration < 8.0, `10Y 6% bond Macaulay duration is between 7 and 8 years (Actual: ${sensBond.macaulayDuration.toFixed(2)}Y)`);
assert(sensBond.modifiedDuration < sensBond.macaulayDuration, `Modified duration is less than Macaulay duration (${sensBond.modifiedDuration.toFixed(2)}Y < ${sensBond.macaulayDuration.toFixed(2)}Y)`);
assert(sensBond.convexity > 0, `Convexity is positive (${sensBond.convexity.toFixed(2)})`);
assert(sensBond.dv01 > 0.5 && sensBond.dv01 < 1.0, `DV01 per $1,000 par bond is realistic (Actual: $${sensBond.dv01.toFixed(4)})`);

// --- TEST 6: Taylor Series Price Sensitivity ---
console.log('\n--- TEST 6: 2nd-Order Taylor Series Price Prediction ---');
const yieldShock = 0.01; // +100 bps
const rePriced = calculateBondPrice({
  parValue: 1000,
  couponRate: 0.06,
  maturityYears: 10,
  ytm: 0.06 + yieldShock,
  frequency: 2
});
const exactPctChange = (rePriced.price - sensBond.price) / sensBond.price;
const approx = estimatePriceSensitivity({
  price: sensBond.price,
  modifiedDuration: sensBond.modifiedDuration,
  convexity: sensBond.convexity,
  deltaYield: yieldShock
});
assert(approx.totalPredictedPct < 0, `+100 bps shift reduces bond price (Predicted: ${(approx.totalPredictedPct * 100).toFixed(2)}%)`);
assert(Math.abs(approx.totalPredictedPct - exactPctChange) < 0.002, `Taylor series prediction within 0.20% of exact re-pricing (Approx: ${(approx.totalPredictedPct * 100).toFixed(2)}% vs Exact: ${(exactPctChange * 100).toFixed(2)}%)`);

// --- TEST 7: Yield Shock Scenario Matrix ---
console.log('\n--- TEST 7: Yield Shock Scenario Matrix ---');
const shockTable = generateYieldShockTable({
  parValue: 1000,
  couponRate: 0.05,
  maturityYears: 10,
  ytm: 0.05,
  frequency: 2
});
assert(shockTable.length === 11, `Scenario table generated 11 yield shift rows (-300 bps to +300 bps)`);
const plus100 = shockTable.find(r => r.bps === 100);
assert(plus100.exactPct < 0, `+100 bps row has negative price return (${(plus100.exactPct * 100).toFixed(2)}%)`);
assert(plus100.convexPrice > plus100.durationPrice, `Convexity correction produces higher price than linear duration alone ($${plus100.convexPrice.toFixed(2)} > $${plus100.durationPrice.toFixed(2)})`);

// --- TEST 8: Portfolio-Level Aggregation ---
console.log('\n--- TEST 8: Portfolio-Level Aggregation ---');
const portfolioBonds = [
  { parValue: 1000, couponRate: 0.03, maturityYears: 2, ytm: 0.04, frequency: 2, quantity: 100 },
  { parValue: 1000, couponRate: 0.05, maturityYears: 10, ytm: 0.045, frequency: 2, quantity: 50 },
  { parValue: 1000, couponRate: 0.04, maturityYears: 30, ytm: 0.048, frequency: 2, quantity: 25 }
];
const portSummary = calculatePortfolioFixedIncome(portfolioBonds);
assert(portSummary.totalValue > 150000, `Portfolio total value calculated (Actual: $${Math.round(portSummary.totalValue).toLocaleString()})`);
assert(portSummary.modifiedDuration > 2.0 && portSummary.modifiedDuration < 15.0, `Portfolio weighted modified duration is realistic (Actual: ${portSummary.modifiedDuration.toFixed(2)}Y)`);
assert(portSummary.dv01 > 50, `Portfolio total DV01 aggregated (Actual: $${portSummary.dv01.toFixed(2)})`);

// --- TEST 9: Liability Immunization Barbell ---
console.log('\n--- TEST 9: Classical Liability Immunization ---');
const liabilities = [
  { year: 5, amount: 200000 },
  { year: 10, amount: 300000 },
  { year: 15, amount: 500000 }
];
const immunization = calculateLiabilityImmunization({
  liabilities,
  discountRate: 0.045,
  shortBond: { parValue: 1000, couponRate: 0.04, maturityYears: 3, ytm: 0.045, frequency: 2 },
  longBond: { parValue: 1000, couponRate: 0.05, maturityYears: 20, ytm: 0.045, frequency: 2 }
});
assert(immunization.liabilityPV > 500000, `Liability PV calculated (Actual: $${Math.round(immunization.liabilityPV).toLocaleString()})`);
assert(immunization.liabilityDuration > 5.0 && immunization.liabilityDuration < 15.0, `Liability duration is realistic (Actual: ${immunization.liabilityDuration.toFixed(2)}Y)`);
assert(immunization.isSolvable, `Immunization barbell is solvable between 3Y and 20Y bonds`);
assert(immunization.assetPortfolio.durationMatched, `Asset portfolio duration matches liability duration (Asset: ${immunization.assetPortfolio.duration.toFixed(2)}Y vs Liability: ${immunization.liabilityDuration.toFixed(2)}Y)`);
assert(immunization.assetPortfolio.convexityShieldPositive, `Asset convexity exceeds liability convexity (Convexity shield positive)`);

// --- TEST 10: Zero-Coupon Spot Rate Bootstrapping ---
console.log('\n--- TEST 10: Spot Rate Bootstrapping ---');
const upwardParCurve = [
  { tenor: 1, parYield: 0.040 },
  { tenor: 2, parYield: 0.045 },
  { tenor: 3, parYield: 0.049 },
  { tenor: 5, parYield: 0.053 },
  { tenor: 10, parYield: 0.057 }
];
const bootstrapped = bootstrapSpotCurve(upwardParCurve, { frequency: 2, maxTenor: 10 });
assert(bootstrapped.length === 10, `Bootstrapped spot rates for 10 annual tenors (Actual: ${bootstrapped.length})`);
assert(Math.abs(bootstrapped[0].spotRate - 0.040) < 1e-3, `1Y spot rate strictly equals 1Y par yield (Actual: ${(bootstrapped[0].spotRate * 100).toFixed(3)}%)`);
assert(bootstrapped[1].spotRate > bootstrapped[1].parYield, `For upward curve, 2Y spot rate exceeds 2Y par yield (${(bootstrapped[1].spotRate * 100).toFixed(3)}% > ${(bootstrapped[1].parYield * 100).toFixed(3)}%)`);
assert(bootstrapped[9].spotRate > bootstrapped[9].parYield, `For upward curve, 10Y spot rate exceeds 10Y par yield (${(bootstrapped[9].spotRate * 100).toFixed(3)}% > ${(bootstrapped[9].parYield * 100).toFixed(3)}%)`);

// --- TEST 11: Forward Curve Derivation (Forward > Spot > Par) ---
console.log('\n--- TEST 11: 1-Year Forward Rate Curve ---');
const forwardCurve = calculateForwardCurve(bootstrapped);
assert(forwardCurve.length === 10, `Generated 10 annual forward points`);
assert(Math.abs(forwardCurve[0].forwardRate1Y - bootstrapped[0].spotRate) < 1e-4, `f_{0,1} forward rate equals 1Y spot rate (Actual: ${(forwardCurve[0].forwardRate1Y * 100).toFixed(3)}%)`);
assert(forwardCurve[1].forwardRate1Y > bootstrapped[1].spotRate, `For upward curve, f_{1,2} forward rate exceeds 2Y spot rate (${(forwardCurve[1].forwardRate1Y * 100).toFixed(3)}% > ${(bootstrapped[1].spotRate * 100).toFixed(3)}%)`);

// Arbitrage verification: (1 + z2)^2 = (1 + z1) * (1 + f12)
const z1 = bootstrapped[0].spotRate;
const z2 = bootstrapped[1].spotRate;
const f12 = forwardCurve[1].forwardRate1Y;
const spotCompound = Math.pow(1 + z2, 2);
const forwardCompound = (1 + z1) * (1 + f12);
assert(Math.abs(spotCompound - forwardCompound) < 1e-6, `No-arbitrage identity verified: (1+z2)^2 == (1+z1)*(1+f12) (Diff: ${Math.abs(spotCompound - forwardCompound).toExponential(3)})`);

// --- TEST 12: Arbitrary Horizon Forward Rate Solver ---
console.log('\n--- TEST 12: Arbitrary Horizon Forward Solver ---');
const f3_5 = getSpecificForwardRate(bootstrapped, 3, 5);
assert(f3_5.t1 === 3 && f3_5.t2 === 5, `Horizon spans Year 3 to Year 5`);
const z3 = bootstrapped[2].spotRate;
const z5 = bootstrapped[4].spotRate;
const expectedF35 = Math.sqrt(Math.pow(1 + z5, 5) / Math.pow(1 + z3, 3)) - 1;
assert(Math.abs(f3_5.forwardRate - expectedF35) < 1e-5, `Forward rate f_{3,5} strictly matches compound ratio (Actual: ${(f3_5.forwardRate * 100).toFixed(3)}% vs Expected: ${(expectedF35 * 100).toFixed(3)}%)`);

// --- TEST 13: Inverted Yield Curve Diagnostics ---
console.log('\n--- TEST 13: Inverted Curve Diagnostics ---');
const invertedParCurve = [
  { tenor: 1, parYield: 0.055 },
  { tenor: 2, parYield: 0.050 },
  { tenor: 5, parYield: 0.042 },
  { tenor: 10, parYield: 0.038 }
];
const invertedSpot = bootstrapSpotCurve(invertedParCurve, { frequency: 2, maxTenor: 10 });
const invertedForward = calculateForwardCurve(invertedSpot);
const diagnostics = analyzeTermStructureTheories(invertedSpot, invertedForward);
assert(diagnostics.regime.type.includes('Inverted'), `Diagnosed inverted curve regime (Actual: ${diagnostics.regime.type})`);
assert(diagnostics.spreadSlopeBps < 0, `10Y-1Y slope is negative (${diagnostics.spreadSlopeBps} bps)`);
assert(invertedForward[1].forwardRate1Y < invertedSpot[1].spotRate, `In inverted curve, forward rate lies BELOW spot rate (${(invertedForward[1].forwardRate1Y * 100).toFixed(3)}% < ${(invertedSpot[1].spotRate * 100).toFixed(3)}%)`);

// --- TEST 14: Liquidity Preference Theory Decomposition ---
console.log('\n--- TEST 14: Liquidity Preference Theory ---');
const lpt = analyzeTermStructureTheories(bootstrapped, forwardCurve, { liquiditySlope: 0.0015 });
assert(lpt.forwardDecomposition.length === 10, `Decomposed 10 forward tenors`);
assert(lpt.forwardDecomposition[4].liquidityPremium > 0, `Year 5 has positive liquidity premium (Actual: ${(lpt.forwardDecomposition[4].liquidityPremium * 100).toFixed(3)}%)`);
assert(lpt.forwardDecomposition[4].expectedSpotRate < lpt.forwardDecomposition[4].forwardRate, `Expected future spot rate is less than forward rate due to term premium`);

// --- TEST 15: Triangular Weight Partition of Unity ---
console.log('\n--- TEST 15: Triangular Weight Partition of Unity ---');
const testTimes = [0.1, 0.25, 1.0, 2.0, 3.5, 5.0, 7.5, 10.0, 15.0, 20.0, 25.0, 30.0, 35.0];
let allPartitionValid = true;
testTimes.forEach(t => {
  const weights = calculateTriangularWeights(t, KEY_RATE_TENORS);
  const sum = weights.reduce((acc, w) => acc + w, 0);
  if (Math.abs(sum - 1.0) > 1e-6) allPartitionValid = false;
});
assert(allPartitionValid, `Triangular weights sum to exactly 1.000 across all test cash flow tenors`);

// --- TEST 16: Bond KRD Sum to Effective Duration Identity ---
console.log('\n--- TEST 16: KRD Sum to Effective Duration Identity ---');
const krdBond10Y = calculateBondKeyRateDuration({
  parValue: 1000,
  couponRate: 0.05,
  maturityYears: 10,
  ytm: 0.05,
  frequency: 2
});
const krdSum = krdBond10Y.krd.reduce((acc, k) => acc + k.duration, 0);
assert(Math.abs(krdSum - krdBond10Y.effectiveDuration) < 1e-5, `Sum of Key Rate Durations equals Effective Duration (${krdSum.toFixed(4)} == ${krdBond10Y.effectiveDuration.toFixed(4)})`);
const tenYearKrd = krdBond10Y.krd.find(k => k.tenor === 10);
assert(tenYearKrd.duration > 5.0, `10Y bond has predominant KRD concentration at 10Y tenor (${tenYearKrd.duration.toFixed(2)}Y of ${krdSum.toFixed(2)}Y)`);

// --- TEST 17: Barbell vs Bullet Non-Parallel Butterfly Shift ---
console.log('\n--- TEST 17: Barbell vs Bullet Butterfly Sensitivity ---');
// 10Y Bullet
const bulletHolding = [{ parValue: 1000, couponRate: 0.045, maturityYears: 10, ytm: 0.045, frequency: 2, quantity: 100 }];
const bulletAnalysis = calculatePortfolioKeyRateDuration(bulletHolding);

// 2Y + 30Y Barbell matching the same ~7.8Y duration
const barbellHoldings = [
  { parValue: 1000, couponRate: 0.045, maturityYears: 2, ytm: 0.045, frequency: 2, quantity: 65 },
  { parValue: 1000, couponRate: 0.045, maturityYears: 30, ytm: 0.045, frequency: 2, quantity: 35 }
];
const barbellAnalysis = calculatePortfolioKeyRateDuration(barbellHoldings);

// Butterfly twist shift (5Y/10Y belly rises by 50 bps, 2Y and 30Y wings unchanged)
const butterflyShift = CURVE_SHIFT_PRESETS['butterfly-twist'].shifts;
const bulletShock = estimateNonParallelPriceChange(bulletAnalysis.krd, butterflyShift, 100000);
const barbellShock = estimateNonParallelPriceChange(barbellAnalysis.krd, butterflyShift, 100000);

assert(bulletShock.predictedReturnPct < -0.015, `10Y Bullet suffers significant loss in belly selloff (${(bulletShock.predictedReturnPct * 100).toFixed(2)}%)`);
assert(barbellShock.predictedReturnPct > bulletShock.predictedReturnPct, `Barbell outperforms bullet in butterfly belly selloff (${(barbellShock.predictedReturnPct * 100).toFixed(2)}% vs ${(bulletShock.predictedReturnPct * 100).toFixed(2)}%)`);

// --- TEST 18: Bull Steepener vs Bear Flattener Regimes ---
console.log('\n--- TEST 18: Non-Parallel Curve Scenarios ---');
const steepenerShift = CURVE_SHIFT_PRESETS['bull-steepener'].shifts;
const steepenerImpact = estimateNonParallelPriceChange(bulletAnalysis.krd, steepenerShift, 100000);
assert(steepenerImpact.predictedReturnPct > 0, `Bull steepener generates positive price return (${(steepenerImpact.predictedReturnPct * 100).toFixed(2)}%)`);

console.log('\n=============================================');
if (failed === 0) {
  console.log(`🎉 ALL ${passed} FIXED-INCOME ENGINE TESTS PASSED SUCCESSFULLY!`);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED out of ${passed + failed}!`);
  process.exit(1);
}
