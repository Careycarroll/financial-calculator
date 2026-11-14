import assert from 'assert';
import {
  calculateSampleAutocorrelation,
  calculateRollingAutocorrelation,
  solveOLS,
  testAugmentedDickeyFuller,
  calculateCointegrationCriticalValues,
  calculateMacKinnonPValue,
  runCointegrationAnalysis
} from '../asset-analytics/timeseries-engine.js';

console.log('=== RUNNING ASSET TIME-SERIES ENGINE TESTS ===\n');

// -------------------------------------------------------------
// TEST 1: Sample Autocorrelation Mathematical Identity & Properties
// -------------------------------------------------------------
console.log('--- TEST 1: Sample Autocorrelation Properties ---');

const alternating = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1];
const acfLag0 = calculateSampleAutocorrelation(alternating, 0);
assert.strictEqual(acfLag0, 1.0, 'Lag 0 autocorrelation must be strictly 1.0');

const acfLag1 = calculateSampleAutocorrelation(alternating, 1);
assert(acfLag1 < -0.85, `Lag 1 autocorrelation for alternating series should be strongly negative (~ -0.9), got ${acfLag1}`);

const persistent = [0.01, 0.02, 0.015, 0.025, 0.03, 0.028, 0.035, 0.04];
const acfLag1Persist = calculateSampleAutocorrelation(persistent, 1);
assert(acfLag1Persist > 0.4, `Lag 1 autocorrelation for persistent series should be positive, got ${acfLag1Persist}`);

console.log(`✅ PASS: Autocorrelation verified! Lag 0: ${acfLag0.toFixed(2)} | Alternating Lag 1: ${acfLag1.toFixed(4)} | Persistent Lag 1: ${acfLag1Persist.toFixed(4)}\n`);

// -------------------------------------------------------------
// TEST 2: Multi-Lag Rolling Autocorrelation
// -------------------------------------------------------------
console.log('--- TEST 2: Multi-Lag Rolling Autocorrelation ---');

const dates = [];
const returns = [];
for (let y = 2020; y <= 2023; y++) {
  for (let m = 1; m <= 12; m++) {
    const moStr = m < 10 ? `0${m}` : `${m}`;
    dates.push(`${y}-${moStr}`);
    // Monthly return oscillating around 1% with some seasonality
    returns.push(0.01 + 0.03 * Math.sin((m / 12) * 2 * Math.PI));
  }
} // 48 months total

const rolling = calculateRollingAutocorrelation(returns, dates, 24, [1, 3, 12]);
assert.strictEqual(rolling.dates.length, 48 - 24 + 1, 'Expected 25 rolling 24M windows for 48 months');
assert(rolling.series[1].length === 25, 'Lag 1 series populated');
assert(rolling.series[3].length === 25, 'Lag 3 series populated');
assert(rolling.series[12].length === 25, 'Lag 12 series populated');

const summary1 = rolling.summary[1];
assert(typeof summary1.mean === 'number' && !isNaN(summary1.mean), 'Summary mean is valid');
assert(summary1.min <= summary1.max, 'Min is <= Max');

console.log(`✅ PASS: Rolling 24M multi-lag generated ${rolling.dates.length} windows. Lag 1 Mean: ${summary1.mean.toFixed(3)}, Range: [${summary1.min.toFixed(2)}, ${summary1.max.toFixed(2)}]\n`);

// -------------------------------------------------------------
// TEST 3: OLS Multiple Linear Regression Solver
// -------------------------------------------------------------
console.log('--- TEST 3: OLS Solver Validation ---');

// Model: y = 3.0 + 2.5 * x1 - 1.2 * x2
const N_ols = 50;
const X_test = [];
const y_test = [];
for (let i = 0; i < N_ols; i++) {
  const x1 = i * 0.5;
  const x2 = Math.sin(i);
  X_test.push([1.0, x1, x2]); // Constant + 2 regressors
  y_test.push(3.0 + 2.5 * x1 - 1.2 * x2);
}

const olsResult = solveOLS(X_test, y_test);
assert(Math.abs(olsResult.beta[0] - 3.0) < 1e-4, `Intercept should be 3.0, got ${olsResult.beta[0]}`);
assert(Math.abs(olsResult.beta[1] - 2.5) < 1e-4, `Beta1 should be 2.5, got ${olsResult.beta[1]}`);
assert(Math.abs(olsResult.beta[2] - (-1.2)) < 1e-4, `Beta2 should be -1.2, got ${olsResult.beta[2]}`);
assert(Math.abs(olsResult.r2 - 1.0) < 1e-6, `R2 should be 1.0 for noise-free fit, got ${olsResult.r2}`);

console.log(`✅ PASS: OLS solver recovered exact parameters: alpha=${olsResult.beta[0].toFixed(2)}, beta1=${olsResult.beta[1].toFixed(2)}, beta2=${olsResult.beta[2].toFixed(2)}, R²=${olsResult.r2.toFixed(4)}\n`);

// -------------------------------------------------------------
// TEST 4: Augmented Dickey-Fuller (ADF) Test on Residuals
// -------------------------------------------------------------
console.log('--- TEST 4: ADF Test on Stationary vs Non-Stationary Series ---');

// Stationary mean-reverting series (AR(1) with rho = 0.1)
const stationary = [0];
for (let t = 1; t < 150; t++) {
  stationary.push(0.1 * stationary[t - 1] + (Math.sin(t) * 0.5));
}

const adfStat = testAugmentedDickeyFuller(stationary, 1);
assert(adfStat.tStat < -3.0, `ADF t-stat for stationary series should be strongly negative (< -3.0), got ${adfStat.tStat}`);

// Random walk (non-stationary unit root)
const randomWalk = [100];
for (let t = 1; t < 150; t++) {
  randomWalk.push(randomWalk[t - 1] + (t % 2 === 0 ? 0.8 : -0.6));
}
const adfWalk = testAugmentedDickeyFuller(randomWalk, 1);
assert(adfWalk.tStat > -2.0, `ADF t-stat for random walk should be weakly negative (> -2.0), got ${adfWalk.tStat}`);

console.log(`✅ PASS: ADF t-statistic: Stationary = ${adfStat.tStat.toFixed(3)} (Rejects Unit Root) vs Random Walk = ${adfWalk.tStat.toFixed(3)} (Fails to Reject)\n`);

// -------------------------------------------------------------
// TEST 5: MacKinnon Critical Values & p-value Calibration
// -------------------------------------------------------------
console.log('--- TEST 5: MacKinnon Critical Values & p-value Calibration ---');

const crits = calculateCointegrationCriticalValues(200);
assert(crits.crit95 < -3.30 && crits.crit95 > -3.40, `95% crit val should be ~ -3.37, got ${crits.crit95}`);
assert(crits.crit90 < -3.00 && crits.crit90 > -3.10, `90% crit val should be ~ -3.07, got ${crits.crit90}`);

// Calibration check vs Portfolio Visualizer Benchmark (Screenshot 6):
// t = -0.767 -> p-value ~ 0.37
const pValBench = calculateMacKinnonPValue(-0.767, 200);
assert(Math.abs(pValBench - 0.37) < 0.08, `Expected p-value ~0.37 for t=-0.767, got ${pValBench.toFixed(2)}`);

// Significant cointegration t = -3.50 -> p < 0.05
const pValSig = calculateMacKinnonPValue(-3.50, 200);
assert(pValSig < 0.05, `Expected p-value < 0.05 for t=-3.50, got ${pValSig}`);

console.log(`✅ PASS: Critical values at N=200: 95%=${crits.crit95.toFixed(3)}, 90%=${crits.crit90.toFixed(3)}. Calibration: t=-0.767 -> p=${pValBench.toFixed(2)} (PV match), t=-3.50 -> p=${pValSig.toFixed(4)}\n`);

// -------------------------------------------------------------
// TEST 6: Full Engle-Granger Cointegration Analysis
// -------------------------------------------------------------
console.log('--- TEST 6: Full Cointegration Analysis Pipeline ---');

// Build two cointegrated assets: Asset B = 10 + 2.0 * Asset A + stationary noise
const seriesA = [];
const seriesB = [];
let priceA = 50.0;
for (let i = 0; i < 100; i++) {
  const dateStr = `201${Math.floor(i / 12)}-${(i % 12 + 1).toString().padStart(2, '0')}`;
  priceA += (i % 3 === 0 ? 1.5 : -1.0);
  const priceB = 10.0 + 2.0 * priceA + Math.sin(i) * 1.2;
  seriesA.push({ date: dateStr, close: priceA, adjClose: priceA });
  seriesB.push({ date: dateStr, close: priceB, adjClose: priceB });
}

const cointResult = runCointegrationAnalysis(
  { ticker: 'ASSET_B', name: 'Synthetic B', data: seriesB },
  { ticker: 'ASSET_A', name: 'Synthetic A', data: seriesA }
);

assert(cointResult.cointegratingEquation.beta > 1.8 && cointResult.cointegratingEquation.beta < 2.2, `Expected hedge ratio ~2.0, got ${cointResult.cointegratingEquation.beta}`);
assert(cointResult.isCointegrated === true, 'Synthetic cointegrated pair must be identified as Cointegrated');
assert.strictEqual(cointResult.confidence95, 'Cointegrated', 'Confidence 95% verdict is Cointegrated');
assert(cointResult.spreadSeries.length === 100, 'Spread series generated for all 100 months');

console.log(`✅ PASS: Cointegration confirmed! Hedge ratio: ${cointResult.cointegratingEquation.beta.toFixed(3)} | ADF t-stat: ${cointResult.adfTest.testStatistic.toFixed(3)} | p-value: ${cointResult.pValue.toFixed(4)} | Verdict: ${cointResult.confidence95}\n`);

console.log('🎉 ALL ASSET TIME-SERIES ENGINE TESTS PASSED SUCCESSFULLY!');
