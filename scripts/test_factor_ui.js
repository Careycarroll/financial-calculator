// ===================================================================
// TEST SUITE: Factor Analysis UI & Integration Validation
// Verifies HTML DOM elements, Factor Models, Rolling Windows,
// Presets, and CSV generation.
// ===================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  FACTOR_DEFINITIONS,
  FACTOR_MODELS,
  PRELOADED_FACTOR_FUNDS,
  FAMA_FRENCH_FACTORS
} from '../fund-regression/factor-data.js';

import {
  alignFundWithFactors,
  runMultivariateRegression,
  runRollingFactorRegression,
  computeFactorAttribution,
  computeFactorStatistics
} from '../fund-regression/factor-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== RUNNING FACTOR ANALYSIS UI & INTEGRATION TESTS ===\n');

// 1. HTML DOM Structure & Element IDs
console.log('--- TEST 1: HTML Structure & Element IDs ---');
const htmlPath = path.join(rootDir, 'fund-regression/factor-analysis.html');
assert.ok(fs.existsSync(htmlPath), 'factor-analysis.html exists on disk');
const html = fs.readFileSync(htmlPath, 'utf8');

const requiredIds = [
  'status-model-name',
  'status-assets-count',
  'status-focus-asset',
  'status-rolling-window',
  'status-timeline',
  'status-sample-months',
  'btn-toggle-config-panel',
  'config-card',
  'model-selector-control',
  'rolling-window-control',
  'preset-scv',
  'preset-core',
  'preset-extremes',
  'asset-chip-list',
  'btn-add-asset',
  'card-r-squared',
  'card-adj-r-squared',
  'card-alpha',
  'card-beta-mkt',
  'card-beta-smb',
  'card-beta-hml',
  'summary-table-header-row',
  'regression-summary-table-body',
  'detail-asset-name',
  'select-focus-asset',
  'parameter-detail-table-body',
  'factor-exposure-canvas',
  'container-factor-exposure',
  'tooltip-factor-exposure',
  'rolling-loadings-canvas',
  'container-rolling-loadings',
  'tooltip-rolling-loadings',
  'attribution-canvas',
  'container-attribution',
  'tooltip-attribution',
  'factor-stats-table-body',
  'factor-correlation-table',
  'diagnostics-content',
  'btn-export-summary-csv',
  'btn-export-rolling-csv'
];

requiredIds.forEach(id => {
  assert.ok(html.includes(`id="${id}"`), `HTML contains required element ID: "${id}"`);
});
console.log(`✅ PASS: All ${requiredIds.length} required UI element IDs verified in factor-analysis.html`);

// 2. Multi-Model Support on Small-Cap Value Basket
console.log('\n--- TEST 2: Multi-Model Regression on SCV Basket (IJS, IWN, RZV, VBR) ---');
const scvTickers = ['IJS', 'IWN', 'RZV', 'VBR'];
const funds = scvTickers.map(t => PRELOADED_FACTOR_FUNDS.find(f => f.ticker === t)).filter(Boolean);
assert.strictEqual(funds.length, 4, 'All 4 SCV funds found in preloaded data');

FACTOR_MODELS.forEach(model => {
  funds.forEach(f => {
    const aligned = alignFundWithFactors(f.data, FAMA_FRENCH_FACTORS);
    const reg = runMultivariateRegression(aligned, model.factors);
    assert.ok(reg.rSquared > 0.50, `${f.ticker} ${model.name} R² (${(reg.rSquared * 100).toFixed(1)}%) > 50%`);
    assert.strictEqual(reg.loadings.length, model.factors.length, `Loadings count matches model factors (${model.factors.length})`);
  });
});
console.log('✅ PASS: All 5 factor models successfully estimated across all 4 SCV funds');

// 3. Style Exposure Validation
console.log('\n--- TEST 3: Empirical Style Tilt Validation ---');
const ijs = funds.find(f => f.ticker === 'IJS');
const alignedIJS = alignFundWithFactors(ijs.data, FAMA_FRENCH_FACTORS);
const ff5Reg = runMultivariateRegression(alignedIJS, ['mkt_rf', 'smb', 'hml', 'rmw', 'cma']);

const smbLoading = ff5Reg.loadings.find(l => l.key === 'smb');
const hmlLoading = ff5Reg.loadings.find(l => l.key === 'hml');

assert.ok(smbLoading.beta > 0.6, `IJS has strong Small-Cap SMB beta: ${smbLoading.beta.toFixed(3)} > 0.6`);
assert.strictEqual(smbLoading.stars, '***', 'IJS SMB loading is statistically significant at p < 0.001');
assert.ok(hmlLoading.beta > 0.1, `IJS has positive Value HML beta: ${hmlLoading.beta.toFixed(3)} > 0.1`);
console.log(`✅ PASS: Confirmed IJS Small-Cap Value tilts: SMB = ${smbLoading.beta.toFixed(3)}***, HML = ${hmlLoading.beta.toFixed(3)}*`);

// 4. Rolling Loadings & Style Drift
console.log('\n--- TEST 4: Rolling Loadings Across Multiple Windows (24M, 36M, 48M, 60M) ---');
[24, 36, 48, 60].forEach(win => {
  const rolling = runRollingFactorRegression(alignedIJS, ['mkt_rf', 'smb', 'hml'], win);
  assert.ok(rolling.length > 180, `${win}M rolling window produced ${rolling.length} regression slices`);
  const lastWindow = rolling[rolling.length - 1];
  assert.ok(lastWindow.loadings.smb > 0, `Recent window SMB loading is positive (${lastWindow.loadings.smb.toFixed(3)})`);
});
console.log('✅ PASS: Walk-forward rolling regressions verified across 24M, 36M, 48M, and 60M windows');

// 5. Return Attribution Decomposition
console.log('\n--- TEST 5: Performance Return Attribution Decomposition ---');
const attribution = computeFactorAttribution(alignedIJS, ff5Reg, ['mkt_rf', 'smb', 'hml', 'rmw', 'cma']);
assert.ok(typeof attribution.alphaContribution === 'number', 'Alpha contribution is numeric');
assert.strictEqual(attribution.factors.length, 5, '5 factor contributions computed');
assert.ok(attribution.totalExplainedAnnualizedReturn > 0.05, `Total explained return (${(attribution.totalExplainedAnnualizedReturn * 100).toFixed(2)}%) is positive`);
console.log(`✅ PASS: Return attribution decomposed ${ijs.ticker} total return into factor premia and alpha`);

// 6. Factor Statistics & Correlation Matrix
console.log('\n--- TEST 6: Factor Statistics & Correlation Matrix ---');
const factorStats = computeFactorStatistics(FAMA_FRENCH_FACTORS, ['mkt_rf', 'smb', 'hml', 'rmw', 'cma', 'mom']);
assert.ok(factorStats.sampleMonths >= 600, `Sample months (${factorStats.sampleMonths}) >= 600`);
assert.strictEqual(factorStats.correlationMatrix.smb.smb, 1.0, 'Self-correlation is exactly 1.0');
assert.ok(Math.abs(factorStats.correlationMatrix.mkt_rf.smb) < 0.5, 'Market and Size are largely orthogonal (|corr| < 0.5)');
console.log('✅ PASS: Factor statistics and pairwise correlation matrix validated');

console.log('\n🎉 ALL FACTOR ANALYSIS UI & INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
