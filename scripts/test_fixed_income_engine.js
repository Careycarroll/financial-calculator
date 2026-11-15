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
  calculateLiabilityImmunization
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

console.log('\n=============================================');
if (failed === 0) {
  console.log(`🎉 ALL ${passed} FIXED-INCOME ENGINE TESTS PASSED SUCCESSFULLY!`);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED out of ${passed + failed}!`);
  process.exit(1);
}
