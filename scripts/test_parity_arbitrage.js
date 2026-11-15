import assert from "node:assert";
import {
  analyzePutCallParity,
  solveImpliedVolatility,
  calculateVolatilitySmile,
  getParityPresets,
  blackScholesPrice
} from "../js/parity-engine.js";

console.log("==================================================================");
console.log("TEST SUITE: Put-Call Parity Arbitrage Analyzer & Implied Volatility Solver");
console.log("References: Bodie, Kane & Marcus, Investments, Chapters 20 & 21");
console.log("==================================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------
// Test 1: Theoretical Put-Call Parity Zero-Arbitrage Identity
// -----------------------------------------------------------------
runTest("Test 1: Theoretical Parity Identity strictly holds with Black-Scholes prices", () => {
  const S = 100;
  const K = 105;
  const T = 0.75;
  const r = 0.045;
  const sigma = 0.28;
  const q = 0.015;

  const bs = blackScholesPrice(S, K, T, r, sigma, q);
  const parity = analyzePutCallParity({
    spot: S,
    strike: K,
    time: T,
    rate: r,
    dividendYield: q,
    callPrice: bs.callPrice,
    putPrice: bs.putPrice,
    frictionThreshold: 0.01
  });

  // Parity Identity: C + K*e^(-rT) == P + S*e^(-qT)
  assert(parity.absDiscrepancy < 1e-10, `Parity discrepancy too large: ${parity.absDiscrepancy}`);
  assert.strictEqual(parity.arbitrage.opportunity, 'NONE');
  assert(Math.abs(parity.synthetics.theoreticalCall - bs.callPrice) < 1e-10);
  assert(Math.abs(parity.synthetics.theoreticalPut - bs.putPrice) < 1e-10);
  assert(Math.abs(parity.synthetics.theoreticalSyntheticStock - S * Math.exp(-q * T)) < 1e-10);

  // Implied risk-free rate should recover r
  assert(Math.abs(parity.synthetics.impliedRate - r) < 1e-8, `Implied rate mismatch: ${parity.synthetics.impliedRate} vs ${r}`);
});

// -----------------------------------------------------------------
// Test 2: Conversion Arbitrage Detection & Trade Ledger Verification
// -----------------------------------------------------------------
runTest("Test 2: Conversion Arbitrage Scanner flags overpriced Call & generates riskless 4-leg ledger", () => {
  const S = 150;
  const K = 150;
  const T = 0.25;
  const r = 0.04;
  const q = 0.0;

  // Theoretical prices at sigma=0.25
  const bs = blackScholesPrice(S, K, T, r, 0.25, q);

  // Market anomaly: Call is overpriced by $3.50
  const marketCall = bs.callPrice + 3.50;
  const marketPut = bs.putPrice;

  const parity = analyzePutCallParity({
    spot: S,
    strike: K,
    time: T,
    rate: r,
    dividendYield: q,
    callPrice: marketCall,
    putPrice: marketPut,
    frictionThreshold: 0.10
  });

  assert.strictEqual(parity.arbitrage.opportunity, 'CONVERSION');
  assert(Math.abs(parity.arbitrage.profitPerShare - 3.50) < 1e-8);
  assert.strictEqual(parity.arbitrage.tradeLegs.length, 4);

  // Check 4 legs: Buy Stock, Buy Put, Sell Call, Borrow Cash
  const buyStock = parity.arbitrage.tradeLegs.find(l => l.action.includes('BUY') && l.asset.includes('Stock'));
  const buyPut = parity.arbitrage.tradeLegs.find(l => l.action.includes('BUY') && l.asset.includes('Put'));
  const sellCall = parity.arbitrage.tradeLegs.find(l => l.action.includes('SELL') && l.asset.includes('Call'));
  const borrowCash = parity.arbitrage.tradeLegs.find(l => l.action.includes('BORROW'));

  assert(buyStock && buyStock.cashFlow < 0);
  assert(buyPut && buyPut.cashFlow < 0);
  assert(sellCall && sellCall.cashFlow > 0);
  assert(borrowCash && borrowCash.cashFlow > 0);

  // Net upfront cash flow equals arbitrage profit
  const netCashFlow = buyStock.cashFlow + buyPut.cashFlow + sellCall.cashFlow + borrowCash.cashFlow;
  assert(Math.abs(netCashFlow - 3.50) < 1e-8);
});

// -----------------------------------------------------------------
// Test 3: Reversal Arbitrage Detection & Trade Ledger Verification
// -----------------------------------------------------------------
runTest("Test 3: Reversal Arbitrage Scanner flags overpriced Put & generates reverse conversion ledger", () => {
  const S = 200;
  const K = 200;
  const T = 0.5;
  const r = 0.05;
  const q = 0.01;

  const bs = blackScholesPrice(S, K, T, r, 0.20, q);

  // Market anomaly: Put is overpriced by $2.80
  const marketCall = bs.callPrice;
  const marketPut = bs.putPrice + 2.80;

  const parity = analyzePutCallParity({
    spot: S,
    strike: K,
    time: T,
    rate: r,
    dividendYield: q,
    callPrice: marketCall,
    putPrice: marketPut,
    frictionThreshold: 0.10
  });

  assert.strictEqual(parity.arbitrage.opportunity, 'REVERSAL');
  assert(Math.abs(parity.arbitrage.profitPerShare - 2.80) < 1e-8);
  assert.strictEqual(parity.arbitrage.tradeLegs.length, 4);

  const shortStock = parity.arbitrage.tradeLegs.find(l => l.action.includes('SHORT') || (l.action.includes('SELL') && l.asset.includes('Stock')));
  const buyCall = parity.arbitrage.tradeLegs.find(l => l.action.includes('BUY') && l.asset.includes('Call'));
  const sellPut = parity.arbitrage.tradeLegs.find(l => l.action.includes('SELL') && l.asset.includes('Put'));
  const lendCash = parity.arbitrage.tradeLegs.find(l => l.action.includes('LEND'));

  assert(shortStock && shortStock.cashFlow > 0);
  assert(buyCall && buyCall.cashFlow < 0);
  assert(sellPut && sellPut.cashFlow > 0);
  assert(lendCash && lendCash.cashFlow < 0);

  const netCashFlow = shortStock.cashFlow + buyCall.cashFlow + sellPut.cashFlow + lendCash.cashFlow;
  assert(Math.abs(netCashFlow - 2.80) < 1e-8);
});

// -----------------------------------------------------------------
// Test 4: Newton-Raphson Implied Volatility Solver Recovery
// -----------------------------------------------------------------
runTest("Test 4: Newton-Raphson Implied Volatility accurately recovers true volatility", () => {
  const S = 100;
  const K = 100;
  const T = 0.5;
  const r = 0.05;
  const targetSigma = 0.35;

  // 1. Recover Call IV
  const bsCall = blackScholesPrice(S, K, T, r, targetSigma, 0);
  const solvedCall = solveImpliedVolatility({
    type: 'call',
    marketPrice: bsCall.callPrice,
    spot: S,
    strike: K,
    time: T,
    rate: r
  });
  assert.strictEqual(solvedCall.converged, true);
  assert(Math.abs(solvedCall.iv - targetSigma) < 1e-6, `Call IV error: ${Math.abs(solvedCall.iv - targetSigma)}`);
  assert(solvedCall.iterations <= 10, `Too many iterations: ${solvedCall.iterations}`);

  // 2. Recover Put IV
  const bsPut = blackScholesPrice(S, K, T, r, targetSigma, 0);
  const solvedPut = solveImpliedVolatility({
    type: 'put',
    marketPrice: bsPut.putPrice,
    spot: S,
    strike: K,
    time: T,
    rate: r
  });
  assert.strictEqual(solvedPut.converged, true);
  assert(Math.abs(solvedPut.iv - targetSigma) < 1e-6, `Put IV error: ${Math.abs(solvedPut.iv - targetSigma)}`);

  // 3. High-volatility stress test (sigma = 1.20)
  const highVolBS = blackScholesPrice(S, 120, 1.0, r, 1.20, 0);
  const highVolSolved = solveImpliedVolatility({
    type: 'call',
    marketPrice: highVolBS.callPrice,
    spot: S,
    strike: 120,
    time: 1.0,
    rate: r
  });
  assert.strictEqual(highVolSolved.converged, true);
  assert(Math.abs(highVolSolved.iv - 1.20) < 1e-5);
});

// -----------------------------------------------------------------
// Test 5: Boundary Condition Violations & Volatility Smile
// -----------------------------------------------------------------
runTest("Test 5: Boundary condition violation rejection and Volatility Smile extraction", () => {
  // Call price below intrinsic value (S - K*e^(-rT) = 100 - 80*e^(-0.05*1) = 23.89)
  // Given price of 10 is impossible
  const invalidCall = solveImpliedVolatility({
    type: 'call',
    marketPrice: 10,
    spot: 100,
    strike: 80,
    time: 1.0,
    rate: 0.05
  });
  assert.strictEqual(invalidCall.converged, false);
  assert(invalidCall.error.includes('intrinsic floor'));

  // Volatility Smile generation
  const presets = getParityPresets();
  const techPreset = presets.find(p => p.id === 'high-vol-skew');
  assert(techPreset);
  assert(Array.isArray(techPreset.data.volatilityCurve));

  const smile = calculateVolatilitySmile({
    spot: techPreset.data.spot,
    time: techPreset.data.time,
    rate: techPreset.data.rate,
    strikes: techPreset.data.volatilityCurve
  });

  assert.strictEqual(smile.length, techPreset.data.volatilityCurve.length);
  smile.forEach(pt => {
    assert(pt.blendedIV > 0.10 && pt.blendedIV < 2.0);
  });
});

console.log(`\nTests passed: ${passed} / ${passed + failed}`);
if (failed > 0) {
  process.exit(1);
}
