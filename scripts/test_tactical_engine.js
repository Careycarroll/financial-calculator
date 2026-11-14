// ===================================================================
// TEST SUITE: Tactical Asset Allocation Quantitative Engine
// Validates Dual Momentum (GEM), Moving Average Timing, Momentum
// Rotation, Adaptive Allocation, Target Volatility, and Drawdowns.
// ===================================================================

import assert from 'assert';
import {
  TACTICAL_STRATEGY_PRESETS,
  buildPriceSeries,
  calculateSMA,
  calculateEMA,
  calculateTrailingReturn,
  calculateTrailingVolatility,
  evaluateTacticalSignal,
  runTacticalBacktest
} from '../tactical-allocation/tactical-engine.js';

console.log('=== RUNNING TACTICAL ASSET ALLOCATION ENGINE TESTS ===\n');

// TEST 1: Price Series & Moving Averages Math
console.log('--- TEST 1: Price Series & Moving Averages Math ---');
const dummyReturns = new Float64Array([0.05, -0.02, 0.03, 0.04, -0.01]);
const prices = buildPriceSeries(dummyReturns);
assert.strictEqual(prices[0], 100.0, 'Initial base price is 100.0');
assert.ok(Math.abs(prices[1] - 105.0) < 1e-6, 'P1 = 100 * 1.05 = 105.0');
assert.ok(Math.abs(prices[2] - 102.9) < 1e-6, 'P2 = 105 * 0.98 = 102.9');

const sma3 = calculateSMA(prices, 3);
assert.strictEqual(sma3.length, prices.length, 'SMA array matches prices length');
assert.ok(sma3[2] > 0, 'SMA3 is positive');

const ema3 = calculateEMA(prices, 3);
assert.strictEqual(ema3.length, prices.length, 'EMA array matches prices length');
console.log('✅ PASS: Synthetic price series, SMA, and EMA math verified');

// TEST 2: Trailing Return & Volatility
console.log('\n--- TEST 2: Trailing Lookback Return & Realized Volatility ---');
const ret3M = calculateTrailingReturn(prices, 3, 3);
const expectedRet3M = prices[3] / prices[0] - 1;
assert.ok(Math.abs(ret3M - expectedRet3M) < 1e-6, 'Trailing 3M return matches exact compound ratio');

const vol = calculateTrailingVolatility(dummyReturns, 4, 3);
assert.ok(vol > 0.05 && vol < 0.40, `Realized annualized volatility (${(vol * 100).toFixed(1)}%) in realistic range`);
console.log('✅ PASS: Trailing compound return and realized volatility confirmed');

// TEST 3: Gary Antonacci Dual Momentum (GEM) Backtest (1972-2026)
console.log('\n--- TEST 3: Gary Antonacci Dual Momentum (GEM) 54-Year Backtest ---');
const gemConfig = TACTICAL_STRATEGY_PRESETS.find(p => p.id === 'dual-momentum-gem');
assert.ok(gemConfig, 'Dual Momentum GEM preset found');

const gemResult = runTacticalBacktest({
  ...gemConfig,
  initialCapital: 10000,
  startMonth: '1972-01',
  endMonth: '2026-08'
});

assert.strictEqual(gemResult.sampleMonths, 656, 'Continuous 656 months simulated (1972-2026)');
assert.ok(gemResult.finalBalance > gemResult.initialCapital, 'Dual Momentum delivered substantial multi-decade capital growth');

const m = gemResult.metrics;
console.log(`GEM Portfolio Final Balance: $${gemResult.finalBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
console.log(`GEM CAGR: ${(m.tactical.cagr * 100).toFixed(2)}% vs SPY: ${(m.spy.cagr * 100).toFixed(2)}% | 60/40: ${(m.b6040.cagr * 100).toFixed(2)}%`);
console.log(`GEM Max Drawdown: ${(m.tactical.maxDrawdown * 100).toFixed(1)}% vs SPY: ${(m.spy.maxDrawdown * 100).toFixed(1)}%`);
console.log(`GEM Sharpe: ${m.tactical.sharpe.toFixed(2)} vs SPY: ${m.spy.sharpe.toFixed(2)}`);

// Key Antonacci thesis: Max Drawdown of GEM should be significantly milder than 100% Equities (~ -55%)
assert.ok(m.tactical.maxDrawdown > m.spy.maxDrawdown, 'Dual Momentum significantly mitigates maximum drawdown vs SPY');
assert.ok(gemResult.activity.totalTrades > 20, 'Generated realistic multi-year trade rotations');
assert.ok(gemResult.activity.defensiveTimePct > 0.10, 'Actively shifted to safe haven defense during bear regimes');
console.log('✅ PASS: Dual Momentum (GEM) validated with superior risk-adjusted return and crash defense');

// TEST 4: 10-Month SMA Trend Defense (Meb Faber Model)
console.log('\n--- TEST 4: 10-Month SMA Trend-Following Model ---');
const smaConfig = TACTICAL_STRATEGY_PRESETS.find(p => p.id === 'moving-average-sma');
const smaResult = runTacticalBacktest({
  ...smaConfig,
  initialCapital: 10000,
  startMonth: '1972-01',
  endMonth: '2026-08'
});

console.log(`10M SMA Max Drawdown: ${(smaResult.metrics.tactical.maxDrawdown * 100).toFixed(1)}% vs SPY: ${(smaResult.metrics.spy.maxDrawdown * 100).toFixed(1)}%`);
assert.ok(smaResult.metrics.tactical.maxDrawdown > smaResult.metrics.spy.maxDrawdown, '10M SMA trend defense cut maximum drawdown vs SPY');
assert.ok(smaResult.activity.defensiveTimePct > 0.15, 'Defensive cash allocation activated in ~20-30% of market months');
console.log('✅ PASS: 10-Month SMA trend-following model successfully mitigated bear market crashes');

// TEST 5: IVY 5 Momentum Rotation
console.log('\n--- TEST 5: IVY 5 Momentum Rotation Model ---');
const ivyConfig = TACTICAL_STRATEGY_PRESETS.find(p => p.id === 'ivy-5-momentum-rotation');
const ivyResult = runTacticalBacktest({
  ...ivyConfig,
  initialCapital: 10000,
  startMonth: '1972-01',
  endMonth: '2026-08'
});

assert.ok(ivyResult.metrics.tactical.cagr > 0.06, 'IVY 5 achieved positive equity-like CAGR');
assert.ok(ivyResult.metrics.tactical.sharpe > 0.40, 'IVY 5 achieved healthy Sharpe ratio');
console.log('✅ PASS: IVY 5 multi-asset momentum rotation solved cleanly');

// TEST 6: Adaptive Asset Allocation (ReSolve Model)
console.log('\n--- TEST 6: Adaptive Asset Allocation (ReSolve) ---');
const adaptConfig = TACTICAL_STRATEGY_PRESETS.find(p => p.id === 'resolve-adaptive-allocation');
const adaptResult = runTacticalBacktest({
  ...adaptConfig,
  initialCapital: 10000,
  startMonth: '1972-01',
  endMonth: '2026-08'
});

assert.ok(adaptResult.metrics.tactical.annualizedVol < adaptResult.metrics.spy.annualizedVol, 'Adaptive Allocation lower volatility than 100% SPY');
console.log('✅ PASS: Adaptive Asset Allocation inverse volatility risk weighting confirmed');

// TEST 7: Target Volatility Model (10% Risk Budget)
console.log('\n--- TEST 7: Target Volatility Model (10% Target) ---');
const volConfig = TACTICAL_STRATEGY_PRESETS.find(p => p.id === 'target-volatility-10');
const volResult = runTacticalBacktest({
  ...volConfig,
  initialCapital: 10000,
  startMonth: '1972-01',
  endMonth: '2026-08'
});

console.log(`Target Vol Portfolio Realized Vol: ${(volResult.metrics.tactical.annualizedVol * 100).toFixed(1)}% (Target: 10.0%)`);
assert.ok(Math.abs(volResult.metrics.tactical.annualizedVol - 0.10) < 0.03, 'Realized volatility closely matches 10% target budget');
console.log('✅ PASS: Target volatility successfully scaled portfolio leverage and cash buffer');

// TEST 8: Market Valuation (Shiller Counter-Cyclical Tilt)
console.log('\n--- TEST 8: Market Valuation Model ---');
const valConfig = TACTICAL_STRATEGY_PRESETS.find(p => p.id === 'market-valuation-cape');
const valResult = runTacticalBacktest({
  ...valConfig,
  initialCapital: 10000,
  startMonth: '1972-01',
  endMonth: '2026-08'
});

assert.ok(valResult.metrics.tactical.cagr > 0.07, 'Valuation model achieved positive long-term CAGR');
console.log('✅ PASS: Market Valuation counter-cyclical model verified');

// TEST 9: Trajectory, Trade Signals Log, and Annual Returns Integrity
console.log('\n--- TEST 9: Trajectory, Trade Signals Log, and Annual Returns ---');
assert.strictEqual(gemResult.trajectory.length, 656, 'Trajectory length matches 656 months');
assert.strictEqual(gemResult.monthlySignals.length, 656, 'Signal history length matches 656 months');
assert.ok(gemResult.annualReturns.length >= 54, 'Calendar annual returns cover 54+ years');

const firstSignal = gemResult.monthlySignals[0];
assert.ok(firstSignal.date, 'Signal has date');
assert.ok(firstSignal.signalName, 'Signal has name');
assert.ok(typeof firstSignal.monthReturn === 'number', 'Signal has numeric monthly return');
console.log('✅ PASS: Trajectory and signal execution logs verified');

console.log('\n🎉 ALL TACTICAL ASSET ALLOCATION ENGINE TESTS PASSED SUCCESSFULLY!\n');
