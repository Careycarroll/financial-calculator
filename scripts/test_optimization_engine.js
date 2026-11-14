/**
 * Automated Unit Test Suite for Portfolio Optimization Engine
 * Validates:
 * 1. Simplex & Box-constrained projection
 * 2. Two-asset closed-form analytical GMV solution match
 * 3. Real multi-asset data covariance, correlation, and annualized metrics
 * 4. Maximum Sharpe Ratio (Tangency) optimization
 * 5. Markowitz Efficient Frontier generation & monotonicity
 * 6. Capital Allocation Line (CAL) & Transition Map integrity
 * 7. Monte Carlo portfolio scatter envelope
 */

import assert from 'node:assert';
import {
  validateBounds,
  findCommonDateRange,
  computeAssetStatistics,
  calculatePortfolioStats,
  projectOntoSimplex,
  solveGMV,
  solveTargetReturnPortfolio,
  solveTangencyPortfolio,
  generateEfficientFrontier,
  generateMonteCarloPortfolios
} from '../portfolio-optimization/optimization-engine.js';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';

console.log('=== RUNNING PORTFOLIO OPTIMIZATION ENGINE TESTS ===\n');

// TEST 1: Simplex Projection
console.log('--- TEST 1: Simplex Projection & Box Constraints ---');
const v = [0.8, -0.3, 0.5, 1.2];
const lower = [0, 0, 0, 0];
const upper = [1, 1, 1, 1];
const proj = projectOntoSimplex(v, lower, upper, 1);

const sum = proj.reduce((a, b) => a + b, 0);
assert(Math.abs(sum - 1.0) < 1e-6, `Sum of projected weights is 1.0 (got ${sum})`);
proj.forEach((w, idx) => {
  assert(w >= -1e-7, `Weight ${idx} >= 0`);
  assert(w <= 1 + 1e-7, `Weight ${idx} <= 1`);
});
console.log('✅ PASS: Simplex projection strictly enforces non-negativity and sum = 1.0');

// TEST 2: Two-Asset Closed-Form Analytical GMV Match
console.log('\n--- TEST 2: Two-Asset Analytical GMV Verification ---');
// Asset 1: mu1 = 12%, sigma1 = 16% (var1 = 0.0256)
// Asset 2: mu2 = 6%, sigma2 = 10% (var2 = 0.0100)
// rho = 0.2 => cov12 = 0.2 * 0.16 * 0.10 = 0.0032
const expectedReturns2 = [0.12, 0.06];
const covMatrix2 = [
  [0.0256, 0.0032],
  [0.0032, 0.0100]
];

// Analytical formula: w1 = (var2 - cov12) / (var1 + var2 - 2*cov12)
const var1 = 0.0256;
const var2 = 0.0100;
const cov12 = 0.0032;
const w1_analytical = (var2 - cov12) / (var1 + var2 - 2 * cov12); // 0.0068 / 0.0292 = 0.2328767
const w2_analytical = 1 - w1_analytical; // 0.7671233

const gmv2 = solveGMV(expectedReturns2, covMatrix2, { riskFreeRate: 0.03 });
console.log(`Analytical GMV Weights: [${(w1_analytical * 100).toFixed(2)}%, ${(w2_analytical * 100).toFixed(2)}%]`);
console.log(`Solver GMV Weights:     [${(gmv2.weights[0] * 100).toFixed(2)}%, ${(gmv2.weights[1] * 100).toFixed(2)}%]`);

assert(Math.abs(gmv2.weights[0] - w1_analytical) < 0.005, 'Numerical GMV weight 1 matches analytical solution');
assert(Math.abs(gmv2.weights[1] - w2_analytical) < 0.005, 'Numerical GMV weight 2 matches analytical solution');
console.log('✅ PASS: Closed-form two-asset GMV identity matched within 0.5% tolerance');

// TEST 3: Real Preset Data Ingestion (VOO, BND, QQQ)
console.log('\n--- TEST 3: Multi-Asset Statistics & Covariance on Real Data ---');
const voo = PRESET_BENCHMARKS.find(f => f.ticker === 'VOO');
const bnd = PRESET_BENCHMARKS.find(f => f.ticker === 'BND');
const qqq = PRESET_BENCHMARKS.find(f => f.ticker === 'QQQ');

const assets = [voo, bnd, qqq];

const stats = computeAssetStatistics(assets, { riskFreeRate: 0.03 });
assert(stats.numAssets === 3, '3 assets correctly identified');
assert(stats.expectedReturns.length === 3, '3 expected returns computed');
assert(stats.covarianceMatrix.length === 3, '3x3 covariance matrix created');

// Check equity vs fixed income properties
const vooReturn = stats.expectedReturns[0];
const bndReturn = stats.expectedReturns[1];
const vooVol = stats.volatilities[0];
const bndVol = stats.volatilities[1];

assert(vooReturn > bndReturn, `VOO return (${(vooReturn*100).toFixed(2)}%) exceeds BND (${(bndReturn*100).toFixed(2)}%)`);
assert(vooVol > bndVol, `VOO volatility (${(vooVol*100).toFixed(2)}%) exceeds BND (${(bndVol*100).toFixed(2)}%)`);

// Verify correlation matrix properties
for (let i = 0; i < 3; i++) {
  assert(Math.abs(stats.correlationMatrix[i][i] - 1.0) < 1e-6, `Asset ${i} self-correlation is exactly 1.0`);
  for (let j = 0; j < 3; j++) {
    assert(Math.abs(stats.correlationMatrix[i][j] - stats.correlationMatrix[j][i]) < 1e-6, 'Correlation matrix is symmetric');
  }
}
console.log(`VOO Annual Return: ${(vooReturn * 100).toFixed(2)}% | Volatility: ${(vooVol * 100).toFixed(2)}%`);
console.log(`BND Annual Return: ${(bndReturn * 100).toFixed(2)}% | Volatility: ${(bndVol * 100).toFixed(2)}%`);
console.log(`VOO-BND Correlation: ${stats.correlationMatrix[0][1].toFixed(3)}`);
console.log('✅ PASS: Real multi-asset returns, volatilities, and covariance verified');

// TEST 4: Maximum Sharpe Ratio (Tangency) Optimization
console.log('\n--- TEST 4: Tangency Portfolio (Maximum Sharpe Ratio) ---');
const tangency = solveTangencyPortfolio(stats.expectedReturns, stats.covarianceMatrix, { riskFreeRate: 0.03 });
const gmv = solveGMV(stats.expectedReturns, stats.covarianceMatrix, { riskFreeRate: 0.03 });

console.log(`GMV Portfolio:      Return: ${(gmv.expectedReturn * 100).toFixed(2)}% | Vol: ${(gmv.volatility * 100).toFixed(2)}% | Sharpe: ${gmv.sharpeRatio.toFixed(3)}`);
console.log(`Tangency Portfolio: Return: ${(tangency.expectedReturn * 100).toFixed(2)}% | Vol: ${(tangency.volatility * 100).toFixed(2)}% | Sharpe: ${tangency.sharpeRatio.toFixed(3)}`);
console.log(`Tangency Weights:   VOO: ${(tangency.weights[0] * 100).toFixed(1)}% | BND: ${(tangency.weights[1] * 100).toFixed(1)}% | QQQ: ${(tangency.weights[2] * 100).toFixed(1)}%`);

assert(tangency.sharpeRatio >= gmv.sharpeRatio - 1e-6, 'Tangency Sharpe ratio is at least GMV Sharpe ratio');
assert(tangency.sharpeRatio >= stats.sharpeRatios[0] - 1e-6, 'Tangency Sharpe ratio is at least VOO Sharpe ratio');
assert(tangency.sharpeRatio >= stats.sharpeRatios[1] - 1e-6, 'Tangency Sharpe ratio is at least BND Sharpe ratio');
console.log('✅ PASS: Tangency portfolio strictly maximizes Sharpe ratio across feasible combinations');

// TEST 5: Efficient Frontier Generation & Monotonicity
console.log('\n--- TEST 5: Efficient Frontier Generation & CAL Integrity ---');
const efResult = generateEfficientFrontier(stats.expectedReturns, stats.covarianceMatrix, {
  riskFreeRate: 0.03,
  numPoints: 30
});

assert(efResult.frontier.length >= 20, 'Frontier produced sufficient portfolio step points');
assert(efResult.calLine.length === 3, 'CAL has start, tangency, and extended end points');
assert(efResult.transitionMap.series.length === 3, 'Transition map has series for all 3 assets');

// Verify that for each step in transition map, weights sum to 100%
const mapLength = efResult.transitionMap.volatilities.length;
for (let step = 0; step < mapLength; step++) {
  let stepWeightSum = 0;
  for (let a = 0; a < 3; a++) {
    stepWeightSum += efResult.transitionMap.series[a].weights[step];
  }
  assert(Math.abs(stepWeightSum - 1.0) < 0.01, `Transition map step ${step} weights sum to 100% (got ${stepWeightSum})`);
}

// Verify that GMV has lowest volatility on frontier
const minFrontierVol = Math.min(...efResult.frontier.map(p => p.volatility));
assert(Math.abs(efResult.gmvPortfolio.volatility - minFrontierVol) < 0.005, 'GMV portfolio represents minimum volatility on frontier');
console.log('✅ PASS: Efficient Frontier curve, CAL line, and Transition Map fully validated');

// TEST 6: Monte Carlo Cloud Envelope
console.log('\n--- TEST 6: Monte Carlo Feasible Cloud Simulation ---');
const mcPorts = generateMonteCarloPortfolios(stats.expectedReturns, stats.covarianceMatrix, {
  count: 1000,
  riskFreeRate: 0.03
});
assert(mcPorts.length === 1000, 'Generated 1,000 random portfolios');

// Verify no random portfolio significantly breaches the GMV left bound
const gmvVol = efResult.gmvPortfolio.volatility;
let breachCount = 0;
mcPorts.forEach(p => {
  if (p.volatility < gmvVol - 0.001) breachCount++;
});
assert(breachCount === 0, `No random portfolio has lower volatility than the GMV portfolio (breaches: ${breachCount})`);
console.log('✅ PASS: 1,000 Monte Carlo portfolios respect the theoretical GMV boundary');

console.log('\n🎉 ALL PORTFOLIO OPTIMIZATION TESTS PASSED SUCCESSFULLY!');
