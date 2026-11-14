/**
 * Automated Test Suite for Factor Exposure Matching & Risk Factor Allocation
 */

import assert from 'node:assert';
import {
  projectOntoSimplex,
  solveMatchExposures,
  solveFactorRiskParity
} from '../fund-regression/matching-engine.js';

console.log('=== RUNNING MATCHING & RISK FACTOR ENGINE TESTS ===\n');

// --- TEST 1: Simplex Projection ---
console.log('--- TEST 1: Simplex Projection Verification ---');
const v1 = [0.8, -0.2, 0.4];
const p1 = projectOntoSimplex(v1);

// Must be non-negative
for (let i = 0; i < p1.length; i++) {
  assert.ok(p1[i] >= 0, `Component ${i} must be non-negative, got ${p1[i]}`);
}
// Sum must equal 1.0
const sumP1 = p1.reduce((a, b) => a + b, 0);
assert.ok(Math.abs(sumP1 - 1.0) < 1e-6, `Sum of projected vector must equal 1.0, got ${sumP1}`);
console.log('✅ PASS: Simplex projection strictly enforces non-negativity and sum=1.');

// --- TEST 2: Match Factor Exposures (Direct Target Replication) ---
console.log('\n--- TEST 2: Factor Exposure Matching Optimizer ---');
// Factors: [MKT, SMB, HML]
// Target: Berkshire Hathaway-style tilt: [MKT: 0.80, SMB: -0.20, HML: 0.40]
const targetBetas = [0.80, -0.20, 0.40];

// Candidate funds:
// 1. SPY:  [1.00,  0.00,  0.00]
// 2. IWN (Small Value): [1.05, 0.70, 0.60]
// 3. VTV (Large Value): [0.90, -0.15, 0.45]
// 4. BND (Bonds):       [0.00, 0.00, 0.00]
const candidateBetas = [
  [1.00, 1.05, 0.90, 0.00], // MKT
  [0.00, 0.70, -0.15, 0.00], // SMB
  [0.00, 0.60, 0.45, 0.00]  // HML
];
const candidateFunds = [
  { id: 'SPY', name: 'SPDR S&P 500 ETF' },
  { id: 'IWN', name: 'iShares Russell 2000 Value ETF' },
  { id: 'VTV', name: 'Vanguard Value ETF' },
  { id: 'BND', name: 'Vanguard Total Bond Market' }
];

const matchResult = solveMatchExposures(targetBetas, candidateBetas, candidateFunds);
assert.strictEqual(matchResult.weights.length, 4);

// Weights sum to 1.0
const totalWeight = matchResult.weights.reduce((a, b) => a + b, 0);
assert.ok(Math.abs(totalWeight - 1.0) < 1e-5, `Weights must sum to 1.0, got ${totalWeight}`);

// All weights >= 0
for (const w of matchResult.weights) {
  assert.ok(w >= -1e-6, `Weights must be non-negative, got ${w}`);
}

// Check tracking error is low
assert.ok(matchResult.rootMeanSqError < 0.20, `RMS error should be < 0.20, got ${matchResult.rootMeanSqError}`);
assert.ok(matchResult.factorFitPct > 80, `Replication fit should be > 80%, got ${matchResult.factorFitPct.toFixed(1)}%`);

console.log(`✅ PASS: Factor Exposure Matching converged. Fit: ${matchResult.factorFitPct.toFixed(1)}%, RMSE: ${matchResult.rootMeanSqError.toFixed(4)}`);

// --- TEST 3: Equal Risk Contribution (Factor Risk Parity) ---
console.log('\n--- TEST 3: Factor Risk Parity Solver ---');
// 3-asset covariance matrix:
// Asset 1 (Vol 20%), Asset 2 (Vol 15%), Asset 3 (Vol 10%) with 0 correlation
const covMatrix = [
  [0.20 * 0.20, 0.0, 0.0],
  [0.0, 0.15 * 0.15, 0.0],
  [0.0, 0.0, 0.10 * 0.10]
];
const assets = [
  { id: 'Equity', name: 'Equities' },
  { id: 'Commodities', name: 'Commodities' },
  { id: 'Treasuries', name: 'Treasuries' }
];

const ercResult = solveFactorRiskParity(covMatrix, assets);
assert.strictEqual(ercResult.weights.length, 3);

// In un-correlated assets, ERC risk contributions must be exactly equal (33.33% each)
for (const w of ercResult.weights) {
  assert.ok(
    Math.abs(w.riskContributionPct - 33.333) < 0.1,
    `Risk contribution should be ~33.3%, got ${w.riskContributionPct.toFixed(2)}%`
  );
}

// Lower vol asset (Treasuries) must have higher capital weight than higher vol asset (Equity)
assert.ok(
  ercResult.weights[2].weight > ercResult.weights[0].weight,
  'Lower volatility asset must receive higher capital weight in risk parity'
);

console.log('✅ PASS: Risk Parity achieved identical 33.33% risk contribution across assets.');

console.log('\n🎉 ALL MATCHING & RISK FACTOR ENGINE TESTS PASSED SUCCESSFULLY!');
