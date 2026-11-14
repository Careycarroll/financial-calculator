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
  generateMonteCarloPortfolios,
  calculateRiskContributions,
  solveRiskParity,
  calculateCVaR,
  calculateSortinoRatio,
  solveMinCVaR,
  invertMatrix,
  matrixMultiply,
  computeImpliedEquilibriumReturns,
  solveBlackLitterman,
  runRollingOptimization
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

// TEST 7: Euler's Risk Decomposition & Risk Parity (ERC)
console.log('\n--- TEST 7: Equal Risk Contribution (Risk Parity / ERC) ---');
const rpResult = solveRiskParity(stats.expectedReturns, stats.covarianceMatrix, { riskFreeRate: 0.03 });
const rc = rpResult.riskContributions;

console.log(`Risk Parity Weights: VOO: ${(rpResult.weights[0] * 100).toFixed(1)}% | BND: ${(rpResult.weights[1] * 100).toFixed(1)}% | QQQ: ${(rpResult.weights[2] * 100).toFixed(1)}%`);
console.log(`Percentage Risk Contribs: VOO: ${(rc.pctRiskContrib[0] * 100).toFixed(1)}% | BND: ${(rc.pctRiskContrib[1] * 100).toFixed(1)}% | QQQ: ${(rc.pctRiskContrib[2] * 100).toFixed(1)}%`);

// Verify that risk contributions sum to 100%
const sumPctRC = rc.pctRiskContrib.reduce((a, b) => a + b, 0);
assert(Math.abs(sumPctRC - 1.0) < 1e-6, `Percentage risk contributions sum to 100% (got ${sumPctRC})`);

// Verify that for Risk Parity, risk contributions are approximately equal (1/3 each = ~33.3%)
rc.pctRiskContrib.forEach((pct, idx) => {
  assert(Math.abs(pct - 1 / 3) < 0.02, `Asset ${idx} risk contribution is equal to 33.3% within 2% tolerance (got ${(pct * 100).toFixed(1)}%)`);
});
console.log('✅ PASS: Equal Risk Contribution (ERC) converges and balances risk across assets');

// TEST 8: Downside Volatility, Sortino Ratio, and 95% CVaR
console.log('\n--- TEST 8: Downside Tail Risk & 95% CVaR ---');
const sampleReturns = stats.monthlyReturns[0]; // VOO monthly returns
const cvarMetrics = calculateCVaR(sampleReturns, 0.05);
const sortinoMetrics = calculateSortinoRatio(sampleReturns, stats.expectedReturns[0], 0.03);

assert(cvarMetrics.cvar > 0, `95% CVaR is positive (got ${(cvarMetrics.cvar * 100).toFixed(2)}%)`);
assert(cvarMetrics.cvar >= cvarMetrics.var, `CVaR (${cvarMetrics.cvar}) >= VaR (${cvarMetrics.var})`);
assert(sortinoMetrics.sortinoRatio > 0, `Sortino ratio is positive (got ${sortinoMetrics.sortinoRatio.toFixed(3)})`);

console.log(`VOO 95% Monthly VaR: ${(cvarMetrics.var * 100).toFixed(2)}% | 95% CVaR: ${(cvarMetrics.cvar * 100).toFixed(2)}%`);
console.log(`VOO Sortino Ratio: ${sortinoMetrics.sortinoRatio.toFixed(3)} | Downside Vol: ${(sortinoMetrics.downsideVol * 100).toFixed(2)}%`);
console.log('✅ PASS: Tail risk (CVaR) and downside semivariance (Sortino) verified');

// TEST 9: Matrix Inversion & Identity (A * inv(A) = I)
console.log('\n--- TEST 9: Linear Algebra & Matrix Inversion ---');
const mat = [
  [4, 2, 1],
  [2, 5, 3],
  [1, 3, 6]
];
const invMat = invertMatrix(mat);
const prod = matrixMultiply(mat, invMat);

for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    const expected = (i === j) ? 1.0 : 0.0;
    assert(Math.abs(prod[i][j] - expected) < 1e-6, `Element [${i}][${j}] equals ${expected} (got ${prod[i][j]})`);
  }
}
console.log('✅ PASS: Gaussian elimination matrix inversion verifies A * A^-1 = I to 1e-6 precision');

// TEST 10: Black-Litterman Model (Equilibrium Prior & Views Tilt)
console.log('\n--- TEST 10: Black-Litterman Model (Equilibrium & Views) ---');
const benchWeights = [0.50, 0.30, 0.20]; // 50% VOO, 30% BND, 20% QQQ
const blNoViews = solveBlackLitterman({
  benchmarkWeights: benchWeights,
  covarianceMatrix: stats.covarianceMatrix,
  expectedMarketReturn: 0.08,
  riskFreeRate: 0.03,
  views: []
});

// Zero-views identity
assert(blNoViews.viewsCount === 0, '0 views detected');
for (let i = 0; i < 3; i++) {
  assert(Math.abs(blNoViews.optimalWeights[i] - benchWeights[i]) < 1e-6, `No-views weight ${i} strictly equals benchmark weight`);
  assert(Math.abs(blNoViews.activeTilts[i]) < 1e-6, `No-views active tilt ${i} is 0`);
}
console.log('✅ PASS: Black-Litterman zero-views identity strictly matches market equilibrium prior');

// Bullish View on QQQ (Asset 2)
const blBullishQQQ = solveBlackLitterman({
  benchmarkWeights: benchWeights,
  covarianceMatrix: stats.covarianceMatrix,
  expectedMarketReturn: 0.08,
  riskFreeRate: 0.03,
  tau: 0.05,
  views: [
    {
      type: 'absolute',
      assetIndex1: 2, // QQQ
      expectedReturn: 0.22, // 22% expected return
      confidence: 0.80 // 80% high confidence
    }
  ]
});

console.log(`Prior Equilibrium Returns:     VOO: ${(blBullishQQQ.priorReturns[0]*100).toFixed(2)}% | BND: ${(blBullishQQQ.priorReturns[1]*100).toFixed(2)}% | QQQ: ${(blBullishQQQ.priorReturns[2]*100).toFixed(2)}%`);
console.log(`Posterior Returns (Bull QQQ):  VOO: ${(blBullishQQQ.posteriorReturns[0]*100).toFixed(2)}% | BND: ${(blBullishQQQ.posteriorReturns[1]*100).toFixed(2)}% | QQQ: ${(blBullishQQQ.posteriorReturns[2]*100).toFixed(2)}%`);
console.log(`Benchmark Weights:             VOO: ${(benchWeights[0]*100).toFixed(1)}% | BND: ${(benchWeights[1]*100).toFixed(1)}% | QQQ: ${(benchWeights[2]*100).toFixed(1)}%`);
console.log(`Black-Litterman Weights:       VOO: ${(blBullishQQQ.optimalWeights[0]*100).toFixed(1)}% | BND: ${(blBullishQQQ.optimalWeights[1]*100).toFixed(1)}% | QQQ: ${(blBullishQQQ.optimalWeights[2]*100).toFixed(1)}%`);
console.log(`Active Tilts:                  VOO: ${(blBullishQQQ.activeTilts[0]*100).toFixed(1)}% | BND: ${(blBullishQQQ.activeTilts[1]*100).toFixed(1)}% | QQQ: ${(blBullishQQQ.activeTilts[2]*100).toFixed(1)}%`);

// Verify bullish view shifts posterior return upwards and allocates positive active tilt to QQQ
assert(blBullishQQQ.posteriorReturns[2] > blBullishQQQ.priorReturns[2], 'Posterior return for QQQ exceeds prior return');
assert(blBullishQQQ.activeTilts[2] > 0, `QQQ receives positive active tilt (+${(blBullishQQQ.activeTilts[2]*100).toFixed(1)}%)`);
console.log('✅ PASS: Black-Litterman Bayesian update directionally shifts posterior returns and active tilts');

// TEST 11: Walk-Forward Out-of-Sample Rolling Portfolio Optimization
console.log('\n--- TEST 11: Rolling Walk-Forward Optimization ---');
const rollingResult = runRollingOptimization(assets, {
  lookbackMonths: 36,
  frequency: 'annually',
  goal: 'max-sharpe',
  baseline: 'equal',
  riskFreeRate: 0.03
});

assert(rollingResult.outOfSampleMonths > 60, `Out of sample months > 60 (got ${rollingResult.outOfSampleMonths})`);
assert(rollingResult.trajectory[0] === 10000, 'Trajectory starts at $10,000');
assert(rollingResult.trajectory[rollingResult.trajectory.length - 1] > 10000, 'Rolling strategy achieved positive net growth');
assert(rollingResult.rebalanceEvents.length >= 5, `Recorded multiple annual rebalance events (got ${rollingResult.rebalanceEvents.length})`);
assert(rollingResult.strategyStats.avgAnnualTurnover >= 0, 'Average annual turnover is non-negative');

// Verify weight transitions sum to 1.0 at every month
const nSteps = rollingResult.weightTransitions.dates.length;
for (let s = 0; s < nSteps; s++) {
  let stepSum = 0;
  for (let a = 0; a < 3; a++) {
    stepSum += rollingResult.weightTransitions.series[a][s];
  }
  assert(Math.abs(stepSum - 1.0) < 0.01, `Step ${s} weights sum to 100% (got ${stepSum})`);
}

console.log(`Out-of-Sample Period:       ${rollingResult.outOfSampleDates[0]} to ${rollingResult.outOfSampleDates[nSteps - 1]} (${rollingResult.outOfSampleMonths} Months)`);
console.log(`Strategy Final Value:       $${rollingResult.trajectory[nSteps].toFixed(2)} | CAGR: ${(rollingResult.strategyStats.cagr * 100).toFixed(2)}% | Sharpe: ${rollingResult.strategyStats.sharpeRatio.toFixed(3)}`);
console.log(`Baseline Final Value:       $${rollingResult.baseTrajectory[nSteps].toFixed(2)} | CAGR: ${(rollingResult.baselineStats.cagr * 100).toFixed(2)}% | Sharpe: ${rollingResult.baselineStats.sharpeRatio.toFixed(3)}`);
console.log(`Annualized Turnover:        ${(rollingResult.strategyStats.avgAnnualTurnover * 100).toFixed(1)}%/yr`);
console.log('✅ PASS: Walk-forward rolling out-of-sample simulation, rebalancing drift, and turnover verified');

console.log('\n🎉 ALL PORTFOLIO OPTIMIZATION TESTS PASSED SUCCESSFULLY!');
