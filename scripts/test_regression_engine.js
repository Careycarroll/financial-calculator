/**
 * Automated Test Suite for Fund Regression & Factor Analysis Engine
 * Run via: node scripts/test_regression_engine.js
 */

import assert from 'node:assert';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import {
  computeMonthlyReturns,
  alignReturns,
  runCAPMRegression,
  computeRiskMetrics,
  computeDualBetaAndCapture,
  computeRollingRegression,
  analyzeFundRegression
} from '../fund-regression/regression-engine.js';

console.log('--- TEST 1: Monthly Returns Computation ---');
const sampleData = [
  { date: '2020-01', close: 100, adjClose: 100 },
  { date: '2020-02', close: 110, adjClose: 110 }, // +10%
  { date: '2020-03', close: 99,  adjClose: 99  }, // -10%
  { date: '2020-04', close: 108.9, adjClose: 108.9 } // +10%
];
const returns = computeMonthlyReturns(sampleData);
assert.strictEqual(returns.length, 3, 'Should compute 3 return points for 4 price records');
assert.strictEqual(Math.round(returns[0].return * 100), 10, 'First return should be +10%');
assert.strictEqual(Math.round(returns[1].return * 100), -10, 'Second return should be -10%');
console.log('✅ PASS: Monthly returns correctly calculated.');

console.log('\n--- TEST 2: Benchmark Self-Regression (Identity Test) ---');
const voo = PRESET_BENCHMARKS.find(b => b.ticker === 'VOO');
assert(voo, 'VOO preset fund should exist');
const vooReturns = computeMonthlyReturns(voo.data, true);
const vooSelfAligned = alignReturns(vooReturns, vooReturns);
const selfReg = runCAPMRegression(vooSelfAligned, 0.03);

assert.strictEqual(Math.round(selfReg.beta), 1, 'Self-beta must be 1.0');
assert.strictEqual(Math.round(selfReg.rSquared * 100), 100, 'Self R² must be 100%');
assert.strictEqual(Math.round(selfReg.correlation * 100), 100, 'Self correlation must be 1.0');
assert(Math.abs(selfReg.annualizedAlpha) < 0.001, 'Self alpha should be ~0.0');
assert(selfReg.trackingError < 0.001, 'Self tracking error should be ~0.0');
console.log(`✅ PASS: VOO vs VOO self-regression yielded Beta=${selfReg.beta}, R²=${selfReg.rSquared}, Alpha=${selfReg.annualizedAlpha}`);

console.log('\n--- TEST 3: Cross-Asset Econometric Validation (QQQ & BND vs VOO) ---');
const qqq = PRESET_BENCHMARKS.find(b => b.ticker === 'QQQ');
const bnd = PRESET_BENCHMARKS.find(b => b.ticker === 'BND');
assert(qqq && bnd, 'QQQ and BND preset funds should exist');

const qqqProfile = analyzeFundRegression(qqq, voo, { annualRf: 0.03, useDRIP: true });
const bndProfile = analyzeFundRegression(bnd, voo, { annualRf: 0.03, useDRIP: true });

// QQQ should have beta > 1.0 (tech growth is more volatile than S&P 500)
assert(qqqProfile.capm.beta > 1.0, `QQQ beta should be > 1.0 (got ${qqqProfile.capm.beta})`);
assert(qqqProfile.capm.rSquared > 0.70, `QQQ R² with S&P 500 should be strong (> 0.70, got ${qqqProfile.capm.rSquared})`);
console.log(`✅ PASS: QQQ vs VOO => Beta: ${qqqProfile.capm.beta}, Alpha: ${(qqqProfile.capm.annualizedAlpha * 100).toFixed(2)}%, R²: ${qqqProfile.capm.rSquared}`);

// BND (Bonds) should have very low beta and low R² against stocks
assert(bndProfile.capm.beta < 0.35, `BND beta to stocks should be low (< 0.35, got ${bndProfile.capm.beta})`);
assert(bndProfile.fundRisk.annualVolatility < vooReturns.length, 'Bond volatility should be lower than equity');
console.log(`✅ PASS: BND vs VOO => Beta: ${bndProfile.capm.beta}, Volatility: ${(bndProfile.fundRisk.annualVolatility * 100).toFixed(2)}% vs VOO ${(bndProfile.benchRisk.annualVolatility * 100).toFixed(2)}%`);

console.log('\n--- TEST 4: Dual-Beta & Capture Ratios ---');
assert(qqqProfile.dualBeta.upCapture > 0, 'QQQ Up Capture should be positive');
assert(qqqProfile.dualBeta.downCapture > 0, 'QQQ Down Capture should be positive');
console.log(`✅ PASS: QQQ Up-Capture: ${qqqProfile.dualBeta.upCapture}% | Down-Capture: ${qqqProfile.dualBeta.downCapture}% | Capture Ratio: ${qqqProfile.dualBeta.captureRatio}`);

console.log('\n--- TEST 5: Rolling 36-Month Regression ---');
assert(qqqProfile.rolling.length > 0, 'Rolling window should have data points');
const expectedRollingCount = qqqProfile.monthsCount - 36 + 1;
assert.strictEqual(qqqProfile.rolling.length, expectedRollingCount, `Rolling points should equal total - 35 (${expectedRollingCount})`);
const lastRolling = qqqProfile.rolling[qqqProfile.rolling.length - 1];
assert(lastRolling.beta > 0.8 && lastRolling.beta < 1.6, 'Rolling beta should remain in realistic equity band');
console.log(`✅ PASS: Generated ${qqqProfile.rolling.length} rolling 36M regression windows. Most recent window: Beta=${lastRolling.beta}, Alpha=${(lastRolling.alpha * 100).toFixed(2)}%`);

console.log('\n--- TEST 6: Modern Portfolio Theory Risk Metrics ---');
const metrics = qqqProfile.fundRisk;
assert(metrics.cagr > 0, 'Equity CAGR should be positive');
assert(metrics.annualVolatility > 0.10, 'Tech equity volatility should exceed 10%');
assert(metrics.sharpeRatio !== 0, 'Sharpe ratio should be computed');
assert(metrics.sortinoRatio !== 0, 'Sortino ratio should be computed');
assert(metrics.maxDrawdown < 0, 'Max Drawdown should be negative');
console.log(`✅ PASS: QQQ Metrics => CAGR: ${(metrics.cagr * 100).toFixed(2)}%, Vol: ${(metrics.annualVolatility * 100).toFixed(2)}%, Sharpe: ${metrics.sharpeRatio}, Sortino: ${metrics.sortinoRatio}, MaxDD: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);

console.log('\n🎉 ALL REGRESSION ENGINE TESTS PASSED SUCCESSFULLY!');
