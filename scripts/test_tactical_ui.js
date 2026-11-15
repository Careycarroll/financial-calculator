// ===================================================================
// TEST SUITE: Tactical Asset Allocation UI & Integration Validation
// Verifies HTML DOM structure, preset strategies, MPT comparisons,
// trade execution logs, and CSV outputs.
// ===================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  TACTICAL_STRATEGY_PRESETS,
  runTacticalBacktest
} from '../tactical-allocation/tactical-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== RUNNING TACTICAL ASSET ALLOCATION UI & INTEGRATION TESTS ===\n');

// 1. HTML DOM Structure & Element IDs
console.log('--- TEST 1: HTML Structure & Element IDs Across All 7 Tactical Pages ---');
const tacticalPages = [
  { file: 'index.html', model: 'dual-momentum' },
  { file: 'market-valuation.html', model: 'market-valuation' },
  { file: 'moving-averages.html', model: 'moving-average' },
  { file: 'momentum-rotation.html', model: 'momentum-rotation' },
  { file: 'dual-momentum.html', model: 'dual-momentum' },
  { file: 'adaptive-allocation.html', model: 'adaptive-allocation' },
  { file: 'target-volatility.html', model: 'target-volatility' }
];

const requiredIds = [
  'status-strategy-name',
  'status-timing-model',
  'status-timeline-range',
  'status-total-months',
  'status-current-regime',
  'status-regime-pill',
  'status-initial-cap',
  'btn-toggle-config',
  'config-card',
  'current-signal-banner',
  'banner-signal-badge',
  'banner-signal-title',
  'banner-signal-sub',
  'btn-jump-trade-log',
  'preset-buttons-container',
  'select-lookback',
  'select-safe-haven',
  'input-initial-capital',
  'btn-run-tactical',
  'card-cagr',
  'card-cagr-spy',
  'card-cagr-6040',
  'card-max-dd',
  'card-dd-shield',
  'card-sharpe',
  'card-sharpe-spy',
  'card-sharpe-6040',
  'card-sortino',
  'card-vol',
  'card-vol-spy',
  'card-win-rate',
  'card-total-trades',
  'tactical-growth-canvas',
  'container-tactical-growth',
  'tooltip-tactical-growth',
  'btn-scale-linear',
  'btn-scale-log',
  'tactical-allocation-canvas',
  'container-tactical-allocation',
  'tooltip-tactical-allocation',
  'tactical-drawdown-canvas',
  'container-tactical-drawdown',
  'tooltip-tactical-drawdown',
  'tactical-annual-canvas',
  'container-tactical-annual',
  'tooltip-tactical-annual',
  'mpt-scorecard-table-body',
  'trade-log-table-body',
  'strategy-diagnostic-content',
  'btn-export-performance-csv',
  'btn-export-trades-csv',
  'executive-guide-tactical',
  'executive-guide-toggle',
  'executive-guide-body',
  'executive-guide-arrow'
];

tacticalPages.forEach(page => {
  const pagePath = path.join(rootDir, 'tactical-allocation', page.file);
  assert.ok(fs.existsSync(pagePath), `tactical-allocation/${page.file} exists on disk`);
  const content = fs.readFileSync(pagePath, 'utf8');

  // Verify elements
  requiredIds.forEach(id => {
    assert.ok(content.includes(`id="${id}"`), `${page.file} contains required element ID: "${id}"`);
  });

  // Verify suite-subnav
  assert.ok(content.includes('class="suite-subnav"'), `${page.file} has .suite-subnav`);
  assert.ok(content.includes('dual-momentum.html'), `${page.file} suite-subnav links to dual-momentum.html`);
  assert.ok(content.includes('moving-averages.html'), `${page.file} suite-subnav links to moving-averages.html`);
  assert.ok(content.includes('momentum-rotation.html'), `${page.file} suite-subnav links to momentum-rotation.html`);
  assert.ok(content.includes('market-valuation.html'), `${page.file} suite-subnav links to market-valuation.html`);
  assert.ok(content.includes('adaptive-allocation.html'), `${page.file} suite-subnav links to adaptive-allocation.html`);
  assert.ok(content.includes('target-volatility.html'), `${page.file} suite-subnav links to target-volatility.html`);

  // Verify executive decision framework
  assert.ok(content.includes('Executive Purpose'), `${page.file} has Executive Purpose quadrant`);
  assert.ok(content.includes('How to Use'), `${page.file} has How to Use quadrant`);
  assert.ok(content.includes('What to Expect'), `${page.file} has What to Expect quadrant`);
  assert.ok(content.includes('Executive Output Decoder'), `${page.file} has Executive Output Decoder quadrant`);
});

console.log(`✅ PASS: Verified HTML structure, ${requiredIds.length} IDs, and Executive Decision Framework across all 7 tactical pages`);

// 2. All Strategy Presets Execution
console.log('\n--- TEST 2: All Strategy Presets Execution ---');
assert.ok(TACTICAL_STRATEGY_PRESETS.length >= 6, `At least 6 canonical presets configured (found ${TACTICAL_STRATEGY_PRESETS.length})`);

TACTICAL_STRATEGY_PRESETS.forEach(preset => {
  const res = runTacticalBacktest({
    ...preset,
    initialCapital: 10000,
    startMonth: '1972-01',
    endMonth: '2026-08'
  });

  assert.strictEqual(res.sampleMonths, 656, `${preset.name} ran over full 656 months`);
  assert.ok(res.finalBalance > 10000, `${preset.name} delivered positive capital growth`);
  assert.ok(res.metrics.tactical.cagr > 0.05, `${preset.name} CAGR (${(res.metrics.tactical.cagr * 100).toFixed(2)}%) > 5%`);
  assert.ok(res.metrics.tactical.maxDrawdown < 0, `${preset.name} has negative drawdown`);
  assert.ok(res.trajectory.length === 656, 'Trajectory length is 656');
  assert.ok(res.monthlySignals.length === 656, 'Signals count is 656');
  assert.ok(res.annualReturns.length >= 54, 'Annual returns cover 54+ years');
});
console.log('✅ PASS: All 6 canonical tactical presets backtested successfully with institutional metrics');

// 3. Trade Execution Log Format
console.log('\n--- TEST 3: Trade Execution Log Format ---');
const gemRes = runTacticalBacktest({
  ...TACTICAL_STRATEGY_PRESETS[0],
  initialCapital: 10000,
  startMonth: '1972-01',
  endMonth: '2026-08'
});

const sampleSignal = gemRes.monthlySignals[100];
assert.ok(sampleSignal.date, 'Trade log entry has date');
assert.ok(sampleSignal.signalName, 'Trade log entry has signal name');
assert.ok(sampleSignal.weights, 'Trade log entry has weights');
assert.ok(typeof sampleSignal.monthReturn === 'number', 'Trade log entry has return');
assert.ok(typeof sampleSignal.portfolioBalance === 'number', 'Trade log entry has balance');
console.log(`✅ PASS: Sample trade log verified: [${sampleSignal.date}] ${sampleSignal.signalName} (${(sampleSignal.monthReturn * 100).toFixed(2)}%)`);

// 4. Crash Defense Validation (2008 Global Financial Crisis)
console.log('\n--- TEST 4: 2008 Crash Protection Validation ---');
const gfcSignals = gemRes.monthlySignals.filter(s => s.date.startsWith('2008'));
const defensiveMonthsIn2008 = gfcSignals.filter(s => s.isDefensive);
assert.ok(defensiveMonthsIn2008.length >= 4, `Dual Momentum shifted to defense for ${defensiveMonthsIn2008.length} months in 2008`);
console.log(`✅ PASS: Confirmed ${defensiveMonthsIn2008.length} months of defensive safe haven allocation during 2008 crash`);

console.log('\n🎉 ALL TACTICAL ASSET ALLOCATION UI & INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
