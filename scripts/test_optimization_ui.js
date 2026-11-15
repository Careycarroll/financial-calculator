import assert from 'node:assert';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import {
  computeAssetStatistics,
  generateEfficientFrontier,
  findCommonDateRange
} from '../portfolio-optimization/optimization-engine.js';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';

console.log('==================================================================');
console.log('TEST SUITE: Portfolio Optimization UI & Preset Integrity');
console.log('==================================================================\n');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------
// Test 1: Syntax Validation across Portfolio Optimization JS
// -----------------------------------------------------------------
runTest('Test 1: All Portfolio Optimization JS files pass node -c syntax check', () => {
  const files = [
    'portfolio-optimization/efficient-frontier-ui.js',
    'portfolio-optimization/optimization-ui.js',
    'portfolio-optimization/black-litterman-ui.js',
    'portfolio-optimization/rolling-optimization-ui.js',
    'portfolio-optimization/optimization-engine.js'
  ];

  files.forEach(f => {
    execSync(`node -c "${f}"`, { stdio: 'pipe' });
  });
});

// -----------------------------------------------------------------
// Test 2: HTML Element ID Synchronization
// -----------------------------------------------------------------
runTest('Test 2: All DOM element IDs referenced in UI controllers exist in HTML', () => {
  const pairs = [
    { html: 'portfolio-optimization/index.html', js: 'portfolio-optimization/efficient-frontier-ui.js' },
    { html: 'portfolio-optimization/portfolio-optimization.html', js: 'portfolio-optimization/optimization-ui.js' },
    { html: 'portfolio-optimization/black-litterman.html', js: 'portfolio-optimization/black-litterman-ui.js' },
    { html: 'portfolio-optimization/rolling-optimization.html', js: 'portfolio-optimization/rolling-optimization-ui.js' }
  ];

  pairs.forEach(({ html, js }) => {
    const htmlContent = fs.readFileSync(html, 'utf8');
    const jsContent = fs.readFileSync(js, 'utf8');

    const regex = /getElementById\(['"]([^'"]+)['"]\)/g;
    let match;
    const missing = [];
    while ((match = regex.exec(jsContent)) !== null) {
      const id = match[1];
      if (!htmlContent.includes(`id="${id}"`) && !htmlContent.includes(`id='${id}'`)) {
        missing.push(id);
      }
    }
    assert.strictEqual(missing.length, 0, `Missing IDs in ${html}: ${missing.join(', ')}`);
  });
});

// -----------------------------------------------------------------
// Test 3: Preset Baskets Coverage & Data Overlap
// -----------------------------------------------------------------
runTest('Test 3: Optimization Presets resolve to valid benchmarks with overlapping history', () => {
  const OPT_PRESETS = {
    'core-two': ['VOO', 'BND'],
    'three-fund': ['VOO', 'SCHD', 'BND'],
    'growth-four': ['VOO', 'QQQ', 'SCHD', 'BND'],
    'equities': ['VOO', 'QQQ', 'SCHD'],
    'default': ['VOO', 'BND', 'QQQ']
  };

  const benchmarkMap = new Map(PRESET_BENCHMARKS.map(b => [b.ticker.toUpperCase(), b]));

  Object.entries(OPT_PRESETS).forEach(([key, tickers]) => {
    const funds = tickers.map(t => benchmarkMap.get(t));
    assert.strictEqual(funds.every(Boolean), true, `Preset ${key} contains unmapped ticker`);

    const common = findCommonDateRange(funds);
    assert(common.totalMonths >= 24, `Preset ${key} has fewer than 24 common months: ${common.totalMonths}`);

    const stats = computeAssetStatistics(funds, {
      riskFreeRate: 0.03,
      covarianceEstimator: 'ledoit-wolf'
    });

    assert.strictEqual(stats.tickers.length, tickers.length);
    assert(stats.expectedReturns.length === tickers.length);

    const frontier = generateEfficientFrontier(stats.expectedReturns, stats.covarianceMatrix, {
      riskFreeRate: 0.03,
      numPoints: 20
    });

    assert(frontier.frontier.length > 0);
    assert(frontier.tangencyPortfolio.sharpeRatio > 0);
    assert(frontier.gmvPortfolio.volatility > 0);
  });
});

// -----------------------------------------------------------------
// Test 4: Dynamic Asset Addition / Removal Simulation
// -----------------------------------------------------------------
runTest('Test 4: Adding and removing assets dynamically retains frontier solvability', () => {
  const benchmarkMap = new Map(PRESET_BENCHMARKS.map(b => [b.ticker.toUpperCase(), b]));

  // Start with 2 assets
  let universe = ['VOO', 'BND'].map(t => benchmarkMap.get(t));
  let stats = computeAssetStatistics(universe);
  let frontier = generateEfficientFrontier(stats.expectedReturns, stats.covarianceMatrix);
  assert(frontier.frontier.length > 0);

  // Add 3rd asset (QQQ)
  universe.push(benchmarkMap.get('QQQ'));
  stats = computeAssetStatistics(universe);
  frontier = generateEfficientFrontier(stats.expectedReturns, stats.covarianceMatrix);
  assert.strictEqual(stats.tickers.length, 3);
  assert(frontier.tangencyPortfolio.weights.length === 3);

  // Add 4th asset (SCHD)
  universe.push(benchmarkMap.get('SCHD'));
  stats = computeAssetStatistics(universe);
  frontier = generateEfficientFrontier(stats.expectedReturns, stats.covarianceMatrix);
  assert.strictEqual(stats.tickers.length, 4);
  assert(frontier.tangencyPortfolio.weights.length === 4);

  // Remove BND (back to 3 equity assets)
  universe = universe.filter(f => f.ticker !== 'BND');
  stats = computeAssetStatistics(universe);
  frontier = generateEfficientFrontier(stats.expectedReturns, stats.covarianceMatrix);
  assert.strictEqual(stats.tickers.length, 3);
  assert.strictEqual(stats.tickers.includes('BND'), false);
});

console.log(`\nTests passed: ${passed} / ${passed + failed}`);
if (failed > 0) {
  process.exit(1);
}
