/**
 * Unit Test Suite for Asset Correlation Engine
 * Validates Pearson correlation, multi-asset date alignment, matrix symmetry, and rolling correlation series.
 */

import assert from 'node:assert';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import {
  calculatePearsonCorrelation,
  calculateCovariance,
  alignMultiAssetReturns,
  computeCorrelationMatrix,
  calculateRollingCorrelation
} from '../asset-analytics/correlation-engine.js';

console.log('=== RUNNING ASSET CORRELATION ENGINE TESTS ===\n');

// TEST 1: Mathematical Accuracy of Pearson Correlation
console.log('--- TEST 1: Pearson Correlation Mathematical Properties ---');
const seriesA = [0.02, 0.04, -0.01, 0.03, -0.02, 0.05];
const seriesB = [0.03, 0.05, -0.01, 0.04, -0.03, 0.06];
const seriesInverse = [-0.02, -0.04, 0.01, -0.03, 0.02, -0.05];

const selfCorr = calculatePearsonCorrelation(seriesA, seriesA);
assert(Math.abs(selfCorr - 1.0) < 1e-6, 'Self correlation is 1.00');

const invCorr = calculatePearsonCorrelation(seriesA, seriesInverse);
assert(Math.abs(invCorr - (-1.0)) < 1e-6, 'Perfect inverse correlation is -1.00');

const highCorr = calculatePearsonCorrelation(seriesA, seriesB);
assert(highCorr > 0.95, 'Positively aligned series has high correlation');
console.log(`✅ PASS: Self Corr: ${selfCorr.toFixed(4)} | Inverse: ${invCorr.toFixed(4)} | High: ${highCorr.toFixed(4)}`);

// TEST 2: Multi-Asset Alignment Across Presets
console.log('\n--- TEST 2: Multi-Asset Return Alignment ---');
const voo = PRESET_BENCHMARKS.find(b => b.ticker === 'VOO');
const qqq = PRESET_BENCHMARKS.find(b => b.ticker === 'QQQ');
const schd = PRESET_BENCHMARKS.find(b => b.ticker === 'SCHD');
const bnd = PRESET_BENCHMARKS.find(b => b.ticker === 'BND');

const { commonDates, fundReturnsMap, minDate, maxDate } = alignMultiAssetReturns([voo, qqq, schd, bnd], true, 'all');
assert(commonDates.length >= 170, 'Common overlapping period has at least 170 months');
assert.strictEqual(minDate, '2011-11', 'Common start date is bounded by SCHD inception');
assert.strictEqual(fundReturnsMap.get('VOO').length, commonDates.length, 'VOO aligned length matches common dates');
assert.strictEqual(fundReturnsMap.get('QQQ').length, commonDates.length, 'QQQ aligned length matches common dates');
console.log(`✅ PASS: Aligned ${commonDates.length} months from ${minDate} to ${maxDate}`);

// TEST 3: Pairwise Correlation & Covariance Matrix
console.log('\n--- TEST 3: Pairwise Correlation Matrix ---');
const result = computeCorrelationMatrix([voo, qqq, schd, bnd], { useDRIP: true, horizon: 'all' });
assert.strictEqual(result.assets.length, 4, '4 assets in matrix');
assert.strictEqual(result.matrix.length, 4, '4x4 matrix dimensions');

// Check diagonal
for (let i = 0; i < 4; i++) {
  assert.strictEqual(result.matrix[i][i], 1.0, `Matrix diagonal [${i}][${i}] is 1.00`);
}

// Check symmetry: M[i][j] == M[j][i]
for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    assert(Math.abs(result.matrix[i][j] - result.matrix[j][i]) < 1e-6, `Symmetry at [${i}][${j}]`);
    assert(Math.abs(result.covarianceMatrix[i][j] - result.covarianceMatrix[j][i]) < 1e-6, `Covariance symmetry at [${i}][${j}]`);
  }
}

// Economic checks: QQQ vs VOO is high; BND vs VOO is low
const idxVOO = result.assets.findIndex(a => a.ticker === 'VOO');
const idxQQQ = result.assets.findIndex(a => a.ticker === 'QQQ');
const idxBND = result.assets.findIndex(a => a.ticker === 'BND');

const corrQqqVoo = result.matrix[idxVOO][idxQQQ];
const corrBndVoo = result.matrix[idxVOO][idxBND];

assert(corrQqqVoo > 0.85, 'QQQ and VOO correlation is > 0.85');
assert(corrBndVoo < 0.40, 'BND and VOO correlation is < 0.40');
console.log(`✅ PASS: Matrix verified! QQQ vs VOO: ${corrQqqVoo.toFixed(2)} | BND vs VOO: ${corrBndVoo.toFixed(2)}`);

// TEST 4: Rolling 36-Month Correlation Time Series
console.log('\n--- TEST 4: Rolling 36-Month Correlation ---');
const vooReturns = result.fundReturnsMap.get('VOO');
const qqqReturns = result.fundReturnsMap.get('QQQ');

const rolling = calculateRollingCorrelation(vooReturns, qqqReturns, result.commonDates, 36);
assert(rolling.series.length > 130, 'Rolling series generated over 130 windows');
assert(rolling.meanCorrelation > 0.80, 'Rolling mean correlation is > 0.80');
assert(rolling.minCorrelation > 0.50, 'Rolling min correlation is > 0.50');
assert(rolling.maxCorrelation <= 1.0, 'Rolling max correlation <= 1.00');
console.log(`✅ PASS: Rolling 36M: Mean=${rolling.meanCorrelation.toFixed(2)}, Min=${rolling.minCorrelation.toFixed(2)}, Max=${rolling.maxCorrelation.toFixed(2)}, Current=${rolling.currentCorrelation.toFixed(2)}`);

console.log('\n🎉 ALL ASSET CORRELATION TESTS PASSED SUCCESSFULLY!');
