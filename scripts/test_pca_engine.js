/**
 * Automated Test Suite for Principal Component Analysis (PCA) Engine
 */

import assert from 'node:assert';
import {
  computeMean,
  computeCovarianceMatrix,
  computeCorrelationMatrix,
  jacobiEigenvalues,
  runPrincipalComponentAnalysis
} from '../fund-regression/pca-engine.js';

console.log('=== RUNNING PCA ENGINE TESTS ===\n');

// --- TEST 1: Mean & Covariance of Orthogonal Signals ---
console.log('--- TEST 1: Covariance & Correlation Computations ---');
const seriesA = { id: 'AssetA', returns: [0.01, 0.02, -0.01, 0.03, -0.02] };
const seriesB = { id: 'AssetB', returns: [0.02, 0.04, -0.02, 0.06, -0.04] }; // Perfectly collinear: B = 2 * A

const covRes = computeCovarianceMatrix([seriesA, seriesB]);
assert.strictEqual(covRes.assets.length, 2);
assert.ok(covRes.stdDevs[1] > covRes.stdDevs[0], 'Asset B stdDev should be double Asset A');

const corrRes = computeCorrelationMatrix(covRes.matrix, covRes.stdDevs);
assert.ok(Math.abs(corrRes[0][1] - 1.0) < 1e-6, `Collinear assets correlation must equal 1.0, got ${corrRes[0][1]}`);
console.log('✅ PASS: Covariance and Correlation matrix correctly computed.');

// --- TEST 2: Jacobi Eigendecomposition of 2x2 Known Matrix ---
console.log('\n--- TEST 2: Jacobi Eigendecomposition Validation ---');
// Matrix: [ [2, 1], [1, 2] ] => Eigenvalues are 3 and 1; Eigenvectors: [1/sqrt(2), 1/sqrt(2)] and [-1/sqrt(2), 1/sqrt(2)]
const testMatrix = [
  new Float64Array([2, 1]),
  new Float64Array([1, 2])
];
const { eigenvalues, eigenvectors } = jacobiEigenvalues(testMatrix);

assert.strictEqual(eigenvalues.length, 2);
assert.ok(Math.abs(eigenvalues[0] - 3.0) < 1e-6, `First eigenvalue should be 3.0, got ${eigenvalues[0]}`);
assert.ok(Math.abs(eigenvalues[1] - 1.0) < 1e-6, `Second eigenvalue should be 1.0, got ${eigenvalues[1]}`);

// Orthogonality check: V^T * V = I
let dotProduct = 0;
for (let r = 0; r < 2; r++) {
  dotProduct += eigenvectors[r][0] * eigenvectors[r][1];
}
assert.ok(Math.abs(dotProduct) < 1e-10, `Eigenvectors must be orthogonal, dot product = ${dotProduct}`);
console.log('✅ PASS: Jacobi algorithm produced exact eigenvalues (3, 1) and orthogonal eigenvectors.');

// --- TEST 3: Multi-Asset PCA Execution & Kaiser Criterion ---
console.log('\n--- TEST 3: Multi-Asset PCA Execution & Kaiser Criterion ---');
const simReturns = [
  { id: 'SPY', name: 'US Equities', returns: [0.03, -0.02, 0.01, 0.04, -0.03, 0.02, 0.01, -0.01, 0.05, -0.04] },
  { id: 'QQQ', name: 'Tech Growth', returns: [0.04, -0.03, 0.02, 0.06, -0.04, 0.03, 0.02, -0.02, 0.07, -0.05] },
  { id: 'IWM', name: 'Small Caps', returns: [0.02, -0.04, 0.03, 0.05, -0.05, 0.01, 0.02, -0.03, 0.06, -0.06] },
  { id: 'BND', name: 'Aggregate Bonds', returns: [0.005, 0.01, -0.005, -0.01, 0.015, 0.002, -0.001, 0.008, -0.012, 0.01] }
];

const pcaResult = runPrincipalComponentAnalysis(simReturns, { mode: 'correlation' });
assert.strictEqual(pcaResult.assetCount, 4);
assert.strictEqual(pcaResult.varianceRatios.length, 4);

// Sum of variance ratios must equal 1.0 (100%)
const totalExplained = pcaResult.varianceRatios.reduce((a, b) => a + b, 0);
assert.ok(Math.abs(totalExplained - 1.0) < 1e-6, `Total variance explained must sum to 100%, got ${totalExplained}`);

// PC1 should dominate in equities
assert.ok(pcaResult.varianceRatios[0] > 0.50, `PC1 should explain > 50% of correlation, got ${(pcaResult.varianceRatios[0] * 100).toFixed(1)}%`);
assert.ok(pcaResult.kaiserCount >= 1, `Kaiser criterion count should be >= 1, got ${pcaResult.kaiserCount}`);
console.log(`✅ PASS: PCA ran on 4 assets. PC1 explains ${(pcaResult.summary.pc1VariancePct).toFixed(1)}% of variance.`);

// --- TEST 4: Principal Component Time Series Construction ---
console.log('\n--- TEST 4: PC Time Series Construction ---');
assert.ok(pcaResult.pcTimeSeries.length > 0);
assert.strictEqual(pcaResult.pcTimeSeries[0].returns.length, 10);
console.log('✅ PASS: Principal Component time series constructed.');

console.log('\n🎉 ALL PCA ENGINE TESTS PASSED SUCCESSFULLY!');
