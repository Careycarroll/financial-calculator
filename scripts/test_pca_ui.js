/**
 * Automated Test Suite for PCA UI & DOM Integration
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PCA_PRESETS, runPrincipalComponentAnalysis } from '../fund-regression/pca-engine.js';
import { buildAssetClassMonthlyData, ASSET_CLASS_CATALOG } from '../portfolio-backtest/asset-class-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== RUNNING PCA UI & DOM INTEGRATION TESTS ===\n');

// 1. HTML DOM Structure & Element IDs
console.log('--- TEST 1: PCA HTML Structure & Element IDs ---');
const htmlPath = path.join(rootDir, 'fund-regression/pca.html');
assert.ok(fs.existsSync(htmlPath), 'pca.html exists on disk');
const html = fs.readFileSync(htmlPath, 'utf8');

const requiredIds = [
  'status-universe-name',
  'status-asset-count',
  'status-timeline',
  'status-matrix-basis',
  'executive-guide-pca',
  'executive-guide-toggle',
  'executive-guide-body',
  'executive-guide-arrow',
  'preset-container',
  'matrix-mode-control',
  'asset-chips-container',
  'btn-add-asset-pca',
  'card-pc1-var',
  'card-pc2-var',
  'card-top3-cum',
  'card-kaiser-count',
  'scree-plot-canvas',
  'tooltip-scree-plot',
  'pca-loadings-canvas',
  'tooltip-pca-loadings',
  'eigenvalue-table',
  'eigenvalue-table-body',
  'loadings-table',
  'pca-correlation-table',
  'btn-export-scree-csv',
  'btn-export-eigen-csv',
  'btn-export-loadings-csv'
];

requiredIds.forEach(id => {
  assert.ok(html.includes(`id="${id}"`), `HTML must contain element id="${id}"`);
});
console.log(`✅ PASS: All ${requiredIds.length} required DOM IDs present in pca.html`);

// 2. Preset Data Validation & End-to-End PCA Calculation
console.log('\n--- TEST 2: Presets & PCA End-to-End Execution ---');
const presetKeys = Object.keys(PCA_PRESETS);
assert.strictEqual(presetKeys.length, 4, 'Must have 4 universe presets');

const rawAssetData = buildAssetClassMonthlyData();
const allWeatherIds = PCA_PRESETS['all-weather'].assetIds;
const testSeries = allWeatherIds.map(id => {
  const cat = ASSET_CLASS_CATALOG.find(x => x.id === id);
  const series = rawAssetData instanceof Map ? rawAssetData.get(id) : rawAssetData[id];
  return {
    id,
    name: cat ? cat.name : id,
    returns: (series || []).map(d => d.return)
  };
});

const pca = runPrincipalComponentAnalysis(testSeries, { mode: 'correlation' });
assert.strictEqual(pca.assetCount, 5);
assert.ok(pca.varianceRatios[0] > 0.30, `PC1 should explain > 30% for all-weather, got ${(pca.varianceRatios[0] * 100).toFixed(1)}%`);
assert.ok(pca.kaiserCount >= 1, 'Kaiser meaningful count must be >= 1');
assert.ok(Math.abs(pca.cumulativeRatios[4] - 1.0) < 1e-5, 'Cumulative variance must reach 100%');

console.log(`✅ PASS: All-Weather PCA executed. PC1: ${(pca.summary.pc1VariancePct).toFixed(1)}%, Top-3: ${(pca.summary.top3CumulativePct).toFixed(1)}%`);

// 3. Sub-navigation integrity
console.log('\n--- TEST 3: Suite Sub-Navigation Integrity ---');
assert.ok(html.includes('suite-subnav'), 'Sub-navigation bar present');
assert.ok(html.includes('factor-analysis.html'), 'Link to Factor Analysis Studio present');
assert.ok(html.includes('factor-matching.html'), 'Link to Match Factor Exposures present');
assert.ok(html.includes('pca.html" class="suite-subnav-link active"'), 'PCA page marked active in subnav');
console.log('✅ PASS: Suite subnav integrity verified.');

console.log('\n🎉 ALL PCA UI TESTS PASSED SUCCESSFULLY!');
