/**
 * Automated Unit Test Suite for Dynamic Portfolio Allocation & Tactical Rules Engine
 */

import assert from 'assert';
import {
  DYNAMIC_PRESETS,
  computeSMA,
  computeMomentum,
  getTargetWeightsForDate,
  simulateDynamicPortfolio
} from '../portfolio-backtest/dynamic-engine.js';

import {
  getAssetClassPriceSeries,
  getAvailableTimelineRange,
  getAssetClassById
} from '../portfolio-backtest/asset-class-data.js';

console.log('=== RUNNING DYNAMIC PORTFOLIO ALLOCATION ENGINE TESTS ===\n');

// -------------------------------------------------------------------
// TEST 1: Step Jump Multi-Stage Transitions
// -------------------------------------------------------------------
console.log('--- TEST 1: Step Jump Target Weight Resolution ---');
const testStages = [
  {
    startMonth: '1980-01',
    allocations: [
      { assetId: 'TotalStockMarket', weight: 90 },
      { assetId: 'TotalBond', weight: 10 }
    ]
  },
  {
    startMonth: '2000-01',
    allocations: [
      { assetId: 'TotalStockMarket', weight: 50 },
      { assetId: 'TotalBond', weight: 50 }
    ]
  }
];

const w1990Step = getTargetWeightsForDate('1990-06', testStages, 'step');
assert.strictEqual(w1990Step.get('TOTALSTOCKMARKET'), 0.9, '1990 in step mode must be 90% equities');
assert.strictEqual(w1990Step.get('TOTALBOND'), 0.1, '1990 in step mode must be 10% bonds');

const w2000Step = getTargetWeightsForDate('2000-01', testStages, 'step');
assert.strictEqual(w2000Step.get('TOTALSTOCKMARKET'), 0.5, '2000 in step mode must jump to 50% equities');
assert.strictEqual(w2000Step.get('TOTALBOND'), 0.5, '2000 in step mode must jump to 50% bonds');
console.log('✅ PASS: Step-jump target transitions accurately snap at stage boundary dates\n');

// -------------------------------------------------------------------
// TEST 2: Linear Monthly Glidepath Interpolation
// -------------------------------------------------------------------
console.log('--- TEST 2: Linear Glidepath Interpolation ---');
// Midpoint between 1980-01 (90/10) and 2000-01 (50/50) is 1990-01 (70/30)
const w1990Glide = getTargetWeightsForDate('1990-01', testStages, 'glidepath');
const tsmMid = w1990Glide.get('TOTALSTOCKMARKET');
const bondMid = w1990Glide.get('TOTALBOND');

assert.ok(Math.abs(tsmMid - 0.70) < 0.01, `1990 glidepath midpoint should be 70% equities (got ${(tsmMid * 100).toFixed(1)}%)`);
assert.ok(Math.abs(bondMid - 0.30) < 0.01, `1990 glidepath midpoint should be 30% bonds (got ${(bondMid * 100).toFixed(1)}%)`);
console.log(`Glidepath Midpoint: Equities = ${(tsmMid * 100).toFixed(1)}% | Bonds = ${(bondMid * 100).toFixed(1)}%`);
console.log('✅ PASS: Continuous monthly linear glidepath interpolation verified\n');

// -------------------------------------------------------------------
// TEST 3: Simple Moving Average (SMA) Indicator
// -------------------------------------------------------------------
console.log('--- TEST 3: 10-Month Simple Moving Average Indicator ---');
const dummySeries = [
  { date: '2020-01', adjClose: 10 },
  { date: '2020-02', adjClose: 20 },
  { date: '2020-03', adjClose: 30 },
  { date: '2020-04', adjClose: 40 },
  { date: '2020-05', adjClose: 50 },
  { date: '2020-06', adjClose: 60 },
  { date: '2020-07', adjClose: 70 },
  { date: '2020-08', adjClose: 80 },
  { date: '2020-09', adjClose: 90 },
  { date: '2020-10', adjClose: 100 }
];

const sma = computeSMA(dummySeries, 10);
assert.strictEqual(sma.length, 10, 'SMA output must match input series length');
assert.strictEqual(sma[9], 55, 'Average of 10 through 100 must be 55');
console.log('✅ PASS: 10-month SMA calculation accurately computed\n');

// -------------------------------------------------------------------
// TEST 4: 12-Month Momentum Indicator
// -------------------------------------------------------------------
console.log('--- TEST 4: 12-Month Momentum Indicator ---');
const momSeries = [];
for (let i = 1; i <= 15; i++) {
  momSeries.push({ date: `2020-${String(i).padStart(2, '0')}`, adjClose: i * 10 });
}
const mom = computeMomentum(momSeries, 12);
// Month index 12 (13th element, value 130) vs month index 0 (value 10): (130 - 10) / 10 = 12.0
assert.strictEqual(mom[12], 12.0, 'Trailing 12-month return must be calculated correctly');
console.log('✅ PASS: 12-month trailing momentum validated\n');

// -------------------------------------------------------------------
// TEST 5: 2008 Crash Defense (10-Month Trend Filter)
// -------------------------------------------------------------------
console.log('--- TEST 5: 2008 Crash Defense with 10M SMA Filter ---');
const datesCrash = [];
let y = 2007, m = 1;
while (y < 2010) {
  datesCrash.push(`${y}-${String(m).padStart(2, '0')}`);
  m++;
  if (m > 12) { m = 1; y++; }
}

const dataMapCrash = new Map();
dataMapCrash.set('TOTALSTOCKMARKET', getAssetClassPriceSeries('TotalStockMarket', '2007-01', '2009-12'));
dataMapCrash.set('CASH', getAssetClassPriceSeries('Cash', '2007-01', '2009-12'));

// Unhedged 100% Equities
const simUnhedged = simulateDynamicPortfolio(datesCrash, dataMapCrash, {
  stages: [{ startMonth: '2007-01', allocations: [{ assetId: 'TotalStockMarket', weight: 100 }] }],
  tacticalRule: 'none'
}, { initialAmount: 10000 });

// Hedged 100% Equities with 10M SMA Trend Filter (Exit to Cash)
const simHedged = simulateDynamicPortfolio(datesCrash, dataMapCrash, {
  stages: [{ startMonth: '2007-01', allocations: [{ assetId: 'TotalStockMarket', weight: 100 }] }],
  tacticalRule: '10m_sma',
  defensiveAsset: 'Cash'
}, { initialAmount: 10000 });

assert.ok(simUnhedged.metrics.maxDrawdown < -0.45, `Unhedged crash drawdown must exceed 45% (got ${(simUnhedged.metrics.maxDrawdown * 100).toFixed(2)}%)`);
assert.ok(Math.abs(simHedged.metrics.maxDrawdown) < 0.20, `Trend-protected drawdown must be less than 20% (got ${(simHedged.metrics.maxDrawdown * 100).toFixed(2)}%)`);
assert.ok(simHedged.metrics.finalBalance > simUnhedged.metrics.finalBalance, 'Trend defense must preserve capital above unhedged equities during 2008 crash');

console.log(`2008 Crash Max Drawdown: Unhedged ${(simUnhedged.metrics.maxDrawdown * 100).toFixed(2)}% vs Trend-Protected ${(simHedged.metrics.maxDrawdown * 100).toFixed(2)}%`);
console.log('✅ PASS: Tactical 10-month trend filter significantly mitigated 2008 GFC drawdown\n');

// -------------------------------------------------------------------
// TEST 6: Target Weights Conservation
// -------------------------------------------------------------------
console.log('--- TEST 6: Target Weights Conservation across Timeline ---');
const dataMapFull = new Map();
dataMapFull.set('TOTALSTOCKMARKET', getAssetClassPriceSeries('TotalStockMarket'));
dataMapFull.set('INTLSTOCKMARKET', getAssetClassPriceSeries('IntlStockMarket'));
dataMapFull.set('TOTALBOND', getAssetClassPriceSeries('TotalBond'));
dataMapFull.set('CASH', getAssetClassPriceSeries('Cash'));
dataMapFull.set('REIT', getAssetClassPriceSeries('REIT'));
dataMapFull.set('SHORTTREASURY', getAssetClassPriceSeries('ShortTreasury'));

const fullDates = getAssetClassPriceSeries('TotalStockMarket').map(s => s.date);

const lifecycleConfig = DYNAMIC_PRESETS[0]; // Target-date glidepath
const simLifecycle = simulateDynamicPortfolio(fullDates, dataMapFull, lifecycleConfig, { initialAmount: 10000 });

assert.ok(simLifecycle, 'Lifecycle simulation must succeed');
assert.strictEqual(simLifecycle.targetWeightsHistory.length, fullDates.length, 'Target weight history must match timeline length');

// Check that target weights sum to 100% at every single month
simLifecycle.targetWeightsHistory.forEach(tw => {
  const sumW = Object.values(tw.targets).reduce((sum, v) => sum + v, 0);
  assert.ok(Math.abs(sumW - 100) < 0.2, `Target weights at ${tw.date} must sum to 100% (got ${sumW})`);
});
console.log(`✅ PASS: ${simLifecycle.targetWeightsHistory.length} monthly target weight vectors all strictly sum to 100.0%\n`);

// -------------------------------------------------------------------
// TEST 7: Dual Momentum Relative Strength Asset Rotation
// -------------------------------------------------------------------
console.log('--- TEST 7: Dual Momentum Asset Rotation ---');
const gemConfig = DYNAMIC_PRESETS[3]; // Dual momentum GEM
const simGEM = simulateDynamicPortfolio(fullDates, dataMapFull, gemConfig, { initialAmount: 10000 });

assert.ok(simGEM, 'Dual momentum simulation must succeed');
assert.ok(simGEM.signalLog.length > 5, 'Dual momentum should execute multiple rotation signals across 54 years');
assert.ok(simGEM.metrics.cagr > 0.08, 'Dual momentum CAGR should exceed 8%');
console.log(`Dual Momentum: Final Balance $${simGEM.metrics.finalBalance.toLocaleString()} | Total Rotations: ${simGEM.signalLog.length}`);
console.log('✅ PASS: Gary Antonacci Dual Momentum relative strength engine verified\n');

// -------------------------------------------------------------------
// TEST 8: Cash Flow Decumulation & Retirement Withdrawals
// -------------------------------------------------------------------
console.log('--- TEST 8: Cash Flow Accumulation vs Decumulation ---');
const simDecumulation = simulateDynamicPortfolio(fullDates, dataMapFull, lifecycleConfig, {
  initialAmount: 500000,
  cashflow: { type: 'withdraw', amount: 2000, frequency: 'monthly' } // $24k/yr withdrawal
});

assert.ok(simDecumulation.metrics.totalContributed < 0, 'Total contributed must be negative due to withdrawals');
assert.ok(simDecumulation.metrics.finalBalance > 0, 'Portfolio must maintain solvency under retirement withdrawals');
console.log(`Decumulation: Withdrew $${Math.abs(simDecumulation.metrics.totalContributed).toLocaleString()} | Terminal Value: $${simDecumulation.metrics.finalBalance.toLocaleString()}`);
console.log('✅ PASS: Dynamic lifecycle retirement cashflow decumulation verified\n');

// -------------------------------------------------------------------
// TEST 9: Signal & Transition Event Logging
// -------------------------------------------------------------------
console.log('--- TEST 9: Signal & Transition Event Logging ---');
const trendConfig = DYNAMIC_PRESETS[2]; // Trend defense
const simTrendLog = simulateDynamicPortfolio(fullDates, dataMapFull, trendConfig, { initialAmount: 10000 });

assert.ok(simTrendLog.signalLog.length > 0, 'Trend defense must record signal events');
const sampleSignal = simTrendLog.signalLog[0];
assert.ok(sampleSignal.date && sampleSignal.type && sampleSignal.message, 'Signal log entries must have date, type, and message');
console.log(`Recorded ${simTrendLog.signalLog.length} tactical trade signals. First signal: [${sampleSignal.date}] ${sampleSignal.message}`);
console.log('✅ PASS: Detailed signal and reallocation event logging confirmed\n');

// -------------------------------------------------------------------
// TEST 10: Dynamic Presets Integrity
// -------------------------------------------------------------------
console.log('--- TEST 10: Dynamic Presets Integrity ---');
assert.ok(DYNAMIC_PRESETS.length >= 4, 'Must provide at least 4 dynamic presets');

DYNAMIC_PRESETS.forEach(p => {
  assert.ok(p.id && p.name && p.description, `Preset ${p.id} must have id, name, description`);
  assert.ok(Array.isArray(p.stages) && p.stages.length >= 1, `Preset ${p.id} must have stages`);
  p.stages.forEach(st => {
    assert.ok(st.startMonth && st.label, `Stage in ${p.id} must have startMonth and label`);
    const sumW = st.allocations.reduce((sum, a) => sum + a.weight, 0);
    assert.ok(Math.abs(sumW - 100) < 0.1, `Stage ${st.label} in ${p.id} must sum to 100%`);
    st.allocations.forEach(a => {
      assert.ok(getAssetClassById(a.assetId), `Asset ${a.assetId} in ${p.id} must exist in catalog`);
    });
  });
});
console.log(`✅ PASS: All ${DYNAMIC_PRESETS.length} dynamic allocation model presets verified\n`);

console.log('🎉 ALL DYNAMIC ALLOCATION ENGINE TESTS PASSED SUCCESSFULLY!');
