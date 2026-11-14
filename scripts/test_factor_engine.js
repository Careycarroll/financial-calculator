// ===================================================================
// UNIT TEST SUITE: Factor Analysis & Multivariate Regression Engine
// ===================================================================

import assert from 'assert';
import {
  matrixTranspose,
  matrixMultiply,
  invertMatrix,
  normalCdf,
  tDistPValue,
  getSignificanceStars,
  alignFundWithFactors,
  runMultivariateRegression,
  runRollingFactorRegression,
  computeFactorAttribution,
  computeFactorStatistics
} from '../fund-regression/factor-engine.js';

import {
  FACTOR_DEFINITIONS,
  FACTOR_MODELS,
  PRELOADED_FACTOR_FUNDS,
  FAMA_FRENCH_FACTORS
} from '../fund-regression/factor-data.js';

console.log('=== RUNNING FACTOR ANALYSIS ENGINE TESTS ===\n');

// TEST 1: Matrix Inversion & Multiplication Identity
console.log('--- TEST 1: Matrix Inversion & Multiplication Identity ---');
const A = [
  [4, 2, 1],
  [2, 5, 3],
  [1, 3, 6]
];
const invA = invertMatrix(A);
const identity = matrixMultiply(A, invA);

for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    const expected = r === c ? 1.0 : 0.0;
    assert.ok(
      Math.abs(identity[r][c] - expected) < 1e-10,
      `Matrix identity check failed at (${r}, ${c}): got ${identity[r][c]}, expected ${expected}`
    );
  }
}
console.log('✅ PASS: Matrix inversion matches exact mathematical identity A * A⁻¹ = I');

// TEST 2: Statistical CDF and Student-t p-Values
console.log('\n--- TEST 2: Statistical CDF & Two-Tailed Student-t p-Values ---');
const p196 = tDistPValue(1.96, 100);
const p258 = tDistPValue(2.58, 100);
const p329 = tDistPValue(3.29, 100);

assert.ok(Math.abs(p196 - 0.05) < 0.005, `t=1.96 yields ~0.05 p-value (got ${p196})`);
assert.ok(Math.abs(p258 - 0.01) < 0.003, `t=2.58 yields ~0.01 p-value (got ${p258})`);
assert.ok(Math.abs(p329 - 0.001) < 0.0005, `t=3.29 yields ~0.001 p-value (got ${p329})`);
assert.strictEqual(getSignificanceStars(0.0005), '***');
assert.strictEqual(getSignificanceStars(0.005), '**');
assert.strictEqual(getSignificanceStars(0.03), '*');
assert.strictEqual(getSignificanceStars(0.08), '•');
assert.strictEqual(getSignificanceStars(0.25), '');
console.log('✅ PASS: Two-tailed p-values and significance star rankings validated');

// TEST 3: Empirical Factor Dataset Integrity
console.log('\n--- TEST 3: Empirical Factor Dataset Integrity ---');
assert.strictEqual(FAMA_FRENCH_FACTORS.length, 656, 'Continuous 656 months from 1972-01 to 2026-08');
assert.strictEqual(FAMA_FRENCH_FACTORS[0].date, '1972-01', 'Timeline begins 1972-01');
assert.strictEqual(FAMA_FRENCH_FACTORS[FAMA_FRENCH_FACTORS.length - 1].date, '2026-08', 'Timeline ends 2026-08');
assert.ok(PRELOADED_FACTOR_FUNDS.length >= 4, 'At least 4 Small-Cap Value benchmark ETFs preloaded');
console.log('✅ PASS: 656-month factor history and pre-loaded ETFs verified');

// TEST 4: Data Alignment & Excess Returns
console.log('\n--- TEST 4: Data Alignment & Excess Returns ---');
const ijsFund = PRELOADED_FACTOR_FUNDS.find(f => f.ticker === 'IJS');
assert.ok(ijsFund, 'IJS found in preloaded funds');
const alignedIJS = alignFundWithFactors(ijsFund.data, FAMA_FRENCH_FACTORS);
assert.ok(alignedIJS.length > 240, `Aligned months count (${alignedIJS.length}) exceeds 240`);
const firstPt = alignedIJS[0];
assert.ok(firstPt.date.startsWith('2005'), 'IJS starts in 2005');
assert.ok(Math.abs(firstPt.fundExcess - (firstPt.fundReturn - firstPt.rf)) < 1e-12, 'Excess return = R_fund - R_f');
console.log(`✅ PASS: Aligned ${alignedIJS.length} months of IJS with factor library`);

// TEST 5: CAPM 1-Factor Multivariate Regression
console.log('\n--- TEST 5: CAPM 1-Factor Multivariate Regression ---');
const capmRes = runMultivariateRegression(alignedIJS, ['mkt_rf']);
assert.strictEqual(capmRes.loadings.length, 1, '1 factor loading in CAPM');
assert.strictEqual(capmRes.loadings[0].key, 'mkt_rf', 'Loading key is mkt_rf');
assert.ok(capmRes.loadings[0].beta > 0.8 && capmRes.loadings[0].beta < 1.4, `Market beta is realistic equity range (${capmRes.loadings[0].beta.toFixed(2)})`);
assert.ok(capmRes.rSquared > 0.60, `CAPM R² explains >60% of variance (${(capmRes.rSquared * 100).toFixed(1)}%)`);
assert.ok(capmRes.loadings[0].tStat > 15, `Market beta t-stat is overwhelmingly significant (${capmRes.loadings[0].tStat.toFixed(1)})`);
console.log(`✅ PASS: CAPM Market Beta = ${capmRes.loadings[0].beta.toFixed(3)}, R² = ${(capmRes.rSquared * 100).toFixed(1)}%`);

// TEST 6: Fama-French 3-Factor Regression (Size SMB & Value HML)
console.log('\n--- TEST 6: Fama-French 3-Factor Regression (Size & Value Tilts) ---');
const ff3Res = runMultivariateRegression(alignedIJS, ['mkt_rf', 'smb', 'hml']);
assert.strictEqual(ff3Res.loadings.length, 3, '3 factor loadings');
const mktLoading = ff3Res.loadings.find(l => l.key === 'mkt_rf');
const smbLoading = ff3Res.loadings.find(l => l.key === 'smb');
const hmlLoading = ff3Res.loadings.find(l => l.key === 'hml');

console.log(`IJS FF3 Loadings => Market: ${mktLoading.beta.toFixed(3)} | SMB (Size): ${smbLoading.beta.toFixed(3)} | HML (Value): ${hmlLoading.beta.toFixed(3)} | R²: ${(ff3Res.rSquared * 100).toFixed(1)}%`);
// Economic theory: IJS is an S&P Small-Cap 600 Value ETF, so SMB and HML MUST be positive and statistically significant!
assert.ok(smbLoading.beta > 0.3, `SMB loading must be strongly positive for small cap ETF (got ${smbLoading.beta.toFixed(3)})`);
assert.ok(hmlLoading.beta > 0.1, `HML loading must be positive for value ETF (got ${hmlLoading.beta.toFixed(3)})`);
assert.ok(smbLoading.pVal < 0.001, `SMB is highly statistically significant p < 0.001 (got ${smbLoading.pVal})`);
assert.ok(ff3Res.rSquared > capmRes.rSquared, 'FF 3-Factor R² strictly improves over single-index CAPM');
console.log('✅ PASS: Confirmed statistically significant Small-Cap (SMB) and Value (HML) factor tilts');

// TEST 7: Carhart 4-Factor Regression (+ Momentum MOM)
console.log('\n--- TEST 7: Carhart 4-Factor Regression (+ Momentum) ---');
const carhartRes = runMultivariateRegression(alignedIJS, ['mkt_rf', 'smb', 'hml', 'mom']);
assert.strictEqual(carhartRes.loadings.length, 4, '4 factor loadings');
const momLoading = carhartRes.loadings.find(l => l.key === 'mom');
assert.ok(momLoading != null, 'MOM loading computed');
assert.ok(typeof momLoading.beta === 'number' && !isNaN(momLoading.beta), 'MOM beta is valid numeric');
console.log(`✅ PASS: Carhart 4-Factor regression solved successfully (MOM: ${momLoading.beta.toFixed(3)})`);

// TEST 8: Fama-French 5-Factor & 6-Factor Regressions
console.log('\n--- TEST 8: Fama-French 5-Factor & 6-Factor Regressions ---');
const ff5Res = runMultivariateRegression(alignedIJS, ['mkt_rf', 'smb', 'hml', 'rmw', 'cma']);
assert.strictEqual(ff5Res.loadings.length, 5, '5 factor loadings');
const ff6Res = runMultivariateRegression(alignedIJS, ['mkt_rf', 'smb', 'hml', 'rmw', 'cma', 'mom']);
assert.strictEqual(ff6Res.loadings.length, 6, '6 factor loadings');
assert.ok(ff5Res.adjRSquared > 0.80, `FF5 Adjusted R² is high (${(ff5Res.adjRSquared * 100).toFixed(1)}%)`);
assert.ok(ff6Res.fStat > 100, `FF6 F-statistic indicates extreme overall regression significance (${ff6Res.fStat.toFixed(1)})`);
console.log('✅ PASS: Fama-French 5-factor and 6-factor regressions solved cleanly');

// TEST 9: 36-Month Rolling Factor Loadings
console.log('\n--- TEST 9: 36-Month Rolling Factor Loadings ---');
const rolling = runRollingFactorRegression(alignedIJS, ['mkt_rf', 'smb', 'hml'], 36);
assert.ok(rolling.length > 200, `Generated ${rolling.length} rolling 36-month windows`);
const lastWindow = rolling[rolling.length - 1];
assert.ok(lastWindow.loadings.smb != null, 'Latest rolling window has SMB loading');
assert.ok(lastWindow.loadings.hml != null, 'Latest rolling window has HML loading');
assert.ok(lastWindow.rSquared > 0.70, 'Rolling window R² maintains high explanatory power');
console.log(`✅ PASS: ${rolling.length} continuous 36-month rolling regressions generated from ${rolling[0].date} to ${lastWindow.date}`);

// TEST 10: Performance Attribution Conservation & Factor Statistics
console.log('\n--- TEST 10: Performance Attribution Conservation & Factor Statistics ---');
const attribution = computeFactorAttribution(alignedIJS, ff3Res, ['mkt_rf', 'smb', 'hml']);
assert.strictEqual(attribution.factors.length, 3, '3 factor attribution items');
const sumAttributed = attribution.factors.reduce((s, f) => s + f.contribution, 0) + attribution.alphaContribution;
assert.ok(
  Math.abs(sumAttributed - attribution.totalExplainedAnnualizedReturn) < 1e-10,
  'Attribution conservation: sum of factor contributions + alpha equals total explained return'
);

const stats = computeFactorStatistics(FAMA_FRENCH_FACTORS, ['mkt_rf', 'smb', 'hml', 'rmw', 'cma', 'mom']);
assert.strictEqual(stats.sampleMonths, 656, 'Factor stats computed across full 656 months');
assert.strictEqual(stats.correlationMatrix.mkt_rf.mkt_rf, 1.0, 'Factor correlation diagonal is 1.0');
assert.ok(
  Math.abs(stats.correlationMatrix.smb.hml - stats.correlationMatrix.hml.smb) < 1e-10,
  'Correlation matrix is symmetric'
);
console.log('✅ PASS: Factor attribution conservation & correlation matrix verified');

console.log('\n🎉 ALL FACTOR ANALYSIS ENGINE TESTS PASSED SUCCESSFULLY!');
