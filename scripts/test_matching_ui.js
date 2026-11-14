/**
 * Automated Test Suite for Factor Exposure Matching UI & DOM Integration
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  CANDIDATE_ETF_POOL,
  TARGET_PRESETS,
  solveMatchExposures,
  solveFactorRiskParity
} from '../fund-regression/matching-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== RUNNING MATCHING UI & DOM INTEGRATION TESTS ===\n');

// 1. HTML DOM Structure & Element IDs
console.log('--- TEST 1: Matching HTML Structure & Element IDs ---');
const htmlPath = path.join(rootDir, 'fund-regression/factor-matching.html');
assert.ok(fs.existsSync(htmlPath), 'factor-matching.html exists on disk');
const html = fs.readFileSync(htmlPath, 'utf8');

const requiredIds = [
  'executive-guide-matching',
  'executive-guide-toggle',
  'executive-guide-body',
  'executive-guide-arrow',
  'matching-mode-control',
  'target-presets-section',
  'preset-buttons-container',
  'target-inputs-section',
  'input-beta-mkt',
  'input-beta-smb',
  'input-beta-hml',
  'input-beta-rmw',
  'input-beta-cma',
  'input-beta-mom',
  'candidate-checkboxes-container',
  'btn-run-matching-opt',
  'card-fit-r2',
  'card-rmse',
  'card-active-funds',
  'card-max-weight',
  'matching-chart-canvas',
  'tooltip-matching-chart',
  'allocation-table',
  'allocation-table-body',
  'btn-export-weights-csv'
];

requiredIds.forEach(id => {
  assert.ok(html.includes(`id="${id}"`), `HTML must contain element id="${id}"`);
});
console.log(`✅ PASS: All ${requiredIds.length} required DOM IDs present in factor-matching.html`);

// 2. Candidate ETF Pool & Presets
console.log('\n--- TEST 2: Candidate ETF Pool & Presets ---');
assert.ok(CANDIDATE_ETF_POOL.length >= 8, 'Candidate pool must have at least 8 ETFs');
const presetKeys = Object.keys(TARGET_PRESETS);
assert.strictEqual(presetKeys.length, 4, 'Must have 4 target presets');
console.log(`✅ PASS: ${CANDIDATE_ETF_POOL.length} candidate ETFs and 4 presets verified.`);

// 3. Optimization Replication Execution
console.log('\n--- TEST 3: Berkshire Factor Replication Execution ---');
const berkshireBetas = TARGET_PRESETS['berkshire'].betas;
const M = CANDIDATE_ETF_POOL.length;
const candidateMatrix = Array.from({ length: 6 }, (_, k) => {
  const row = new Float64Array(M);
  for (let j = 0; j < M; j++) {
    row[j] = CANDIDATE_ETF_POOL[j].betas[k];
  }
  return row;
});

const matchResult = solveMatchExposures(berkshireBetas, candidateMatrix, CANDIDATE_ETF_POOL);
assert.ok(matchResult.factorFitPct > 80, `Berkshire replication fit should be > 80%, got ${matchResult.factorFitPct.toFixed(1)}%`);
assert.ok(matchResult.allocations.length >= 2, 'Should allocate across multiple funds');
console.log(`✅ PASS: Berkshire replication solved. Fit R²: ${matchResult.factorFitPct.toFixed(1)}%, Active ETFs: ${matchResult.allocations.length}`);

// 4. Suite Subnav Integrity
console.log('\n--- TEST 4: Suite Subnav Integrity ---');
assert.ok(html.includes('suite-subnav'), 'Sub-navigation bar present');
assert.ok(html.includes('pca.html'), 'Link to PCA present');
assert.ok(html.includes('factor-analysis.html'), 'Link to Factor Analysis present');
assert.ok(html.includes('factor-matching.html" class="suite-subnav-link active"'), 'Factor Matching marked active');
console.log('✅ PASS: Suite subnav links verified.');

console.log('\n🎉 ALL MATCHING UI TESTS PASSED SUCCESSFULLY!');
