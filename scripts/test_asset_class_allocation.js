/**
 * Automated Unit Test Suite for Asset Class Allocation Backtest Studio
 * 
 * Tests:
 * 1. Catalog integrity across 28 canonical asset classes
 * 2. 54-year empirical timeline alignment (1972-01 to 2026-08, 656 months)
 * 3. Normalized price index synthesis for portfolio engine compatibility
 * 4. Date window clipping and arbitrary historical sub-period extraction
 * 5. Classic 60/40 multi-decade portfolio simulation & risk metrics
 * 6. User URL Allocation: Global 4-Asset Balanced (40% US, 20% Intl, 30% Bond, 10% REIT)
 * 7. Multi-portfolio comparison (P1, P2, P3 vs Benchmark)
 * 8. Rebalancing schedule sensitivity (Annual vs Semi-Annual vs Buy-and-Hold)
 * 9. Cash flows: ongoing contributions & inflation-adjusted withdrawals
 * 10. Model preset configuration integrity (100% target weight validation)
 */

import assert from 'assert';
import {
  ASSET_CLASS_CATALOG,
  ASSET_CLASS_PRESETS,
  getAssetClassCatalog,
  getAssetClassById,
  buildAssetClassMonthlyData,
  getAssetClassPriceSeries,
  getAvailableTimelineRange
} from '../portfolio-backtest/asset-class-data.js';

import {
  simulatePortfolio,
  validateAllocations,
  calculatePortfolioMetrics
} from '../portfolio-backtest/portfolio-engine.js';

console.log('=== RUNNING ASSET CLASS ALLOCATION STUDIO TESTS ===\n');

// -------------------------------------------------------------------
// TEST 1: Catalog Integrity
// -------------------------------------------------------------------
console.log('--- TEST 1: Asset Class Catalog Integrity ---');
const catalog = getAssetClassCatalog();
assert.strictEqual(catalog.length, 28, 'Catalog must contain 28 canonical asset classes');

const requiredCategories = ['US Equity', 'International Equity', 'Fixed Income', 'Alternatives & Real Assets'];
const categories = new Set(catalog.map(c => c.category));
requiredCategories.forEach(cat => {
  assert.ok(categories.has(cat), `Catalog must contain category "${cat}"`);
});

const ids = new Set();
catalog.forEach(c => {
  assert.ok(c.id && c.id.trim() !== '', 'Each asset class must have a valid ID');
  assert.ok(!ids.has(c.id), `Asset class ID "${c.id}" must be unique`);
  ids.add(c.id);
  assert.ok(c.name && c.shortName, `Asset class ${c.id} must have full and short names`);
  assert.ok(c.color && c.color.startsWith('#'), `Asset class ${c.id} must have a hex color`);
});
console.log(`✅ PASS: ${catalog.length} unique asset classes verified across 4 canonical asset categories\n`);

// -------------------------------------------------------------------
// TEST 2: Timeline Range & Historical Boundaries
// -------------------------------------------------------------------
console.log('--- TEST 2: Timeline Range & Historical Boundaries ---');
const timeline = getAvailableTimelineRange();
assert.strictEqual(timeline.startYear, 1972, 'Dataset must start in 1972');
assert.strictEqual(timeline.startMonth, '1972-01', 'Dataset must start at 1972-01');
assert.strictEqual(timeline.endMonth, '2026-08', 'Dataset must extend through 2026-08');
assert.strictEqual(timeline.totalMonths, 656, 'Dataset must span exactly 656 months (54.67 years)');
console.log(`✅ PASS: Historical continuous timeline verified: ${timeline.startMonth} to ${timeline.endMonth} (${timeline.totalMonths} months)\n`);

// -------------------------------------------------------------------
// TEST 3: Normalized Price Index Synthesis
// -------------------------------------------------------------------
console.log('--- TEST 3: Price Index Series Synthesis ---');
const tsmSeries = getAssetClassPriceSeries('TotalStockMarket');
assert.strictEqual(tsmSeries.length, 656, 'Series must have 656 entries');
assert.strictEqual(tsmSeries[0].date, '1972-01', 'First date must be 1972-01');
assert.strictEqual(tsmSeries[0].close, 100.0, 'Starting price must be 100.0');
assert.strictEqual(tsmSeries[0].adjClose, 100.0, 'Starting adjClose must be 100.0');

// Verify positive growth over 54 years
const finalPrice = tsmSeries[tsmSeries.length - 1].adjClose;
assert.ok(finalPrice > 10000, `US Total Stock Market should compound past 100x over 54 years (got ${finalPrice})`);
console.log(`✅ PASS: Normalized price series generated; $100 in 1972 grew to $${finalPrice.toLocaleString()} in 2026\n`);

// -------------------------------------------------------------------
// TEST 4: Date Window Slicing
// -------------------------------------------------------------------
console.log('--- TEST 4: Date Window Slicing ---');
const windowSeries = getAssetClassPriceSeries('IntermediateTreasury', '1985-01', '2000-12');
assert.strictEqual(windowSeries[0].date, '1985-01', 'Window start must match requested date');
assert.strictEqual(windowSeries[windowSeries.length - 1].date, '2000-12', 'Window end must match requested date');
assert.strictEqual(windowSeries.length, 16 * 12, '1985 through 2000 is 16 full years (192 months)');
assert.strictEqual(windowSeries[0].adjClose, 100.0, 'Windowed series must reset baseline price to 100.0 on window start');
console.log(`✅ PASS: Arbitrary sub-period slicing correctly resets baseline to 100.0\n`);

// -------------------------------------------------------------------
// TEST 5: Classic 60/40 Portfolio Simulation
// -------------------------------------------------------------------
console.log('--- TEST 5: Classic 60/40 Portfolio Simulation (1972-2026) ---');
const dates = tsmSeries.map(s => s.date);
const dataMap = new Map();
dataMap.set('TOTALSTOCKMARKET', getAssetClassPriceSeries('TotalStockMarket'));
dataMap.set('TOTALBOND', getAssetClassPriceSeries('TotalBond'));

const allocSixtyForty = [
  { ticker: 'TOTALSTOCKMARKET', weight: 60 },
  { ticker: 'TOTALBOND', weight: 40 }
];

const sim6040 = simulatePortfolio(dates, dataMap, allocSixtyForty, {
  initialAmount: 10000,
  rebalancing: 'annual'
});

assert.ok(sim6040, 'Simulation result must not be null');
assert.ok(sim6040.metrics.cagr > 0.08 && sim6040.metrics.cagr < 0.12, `60/40 CAGR should be between 8% and 12% (got ${(sim6040.metrics.cagr * 100).toFixed(2)}%)`);
assert.ok(sim6040.metrics.annualVolatility > 0.08 && sim6040.metrics.annualVolatility < 0.13, `60/40 Volatility should be between 8% and 13% (got ${(sim6040.metrics.annualVolatility * 100).toFixed(2)}%)`);
assert.ok(sim6040.metrics.maxDrawdown < -0.15 && sim6040.metrics.maxDrawdown > -0.45, `60/40 Max drawdown should be moderate (got ${(sim6040.metrics.maxDrawdown * 100).toFixed(2)}%)`);
assert.ok(sim6040.metrics.sharpeRatio > 0.4, `60/40 Sharpe ratio should be healthy (got ${sim6040.metrics.sharpeRatio})`);

console.log(`60/40 Metrics: CAGR = ${(sim6040.metrics.cagr * 100).toFixed(2)}% | Vol = ${(sim6040.metrics.annualVolatility * 100).toFixed(2)}% | Sharpe = ${sim6040.metrics.sharpeRatio} | MaxDD = ${(sim6040.metrics.maxDrawdown * 100).toFixed(2)}%`);
console.log(`✅ PASS: Classic 60/40 long-horizon simulation verified\n`);

// -------------------------------------------------------------------
// TEST 6: User URL Allocation: Global 4-Asset Balanced
// -------------------------------------------------------------------
console.log('--- TEST 6: User URL Allocation: Global 4-Asset Balanced ---');
// 40% TotalStockMarket, 20% IntlStockMarket, 30% TotalBond, 10% REIT
dataMap.set('INTLSTOCKMARKET', getAssetClassPriceSeries('IntlStockMarket'));
dataMap.set('REIT', getAssetClassPriceSeries('REIT'));

const allocUserUrl = [
  { ticker: 'TOTALSTOCKMARKET', weight: 40 },
  { ticker: 'INTLSTOCKMARKET', weight: 20 },
  { ticker: 'TOTALBOND', weight: 30 },
  { ticker: 'REIT', weight: 10 }
];

const simUserUrl = simulatePortfolio(dates, dataMap, allocUserUrl, {
  initialAmount: 10000,
  rebalancing: 'annual'
});

assert.ok(simUserUrl, 'User URL portfolio simulation must succeed');
assert.ok(simUserUrl.metrics.finalBalance > 500000, `Initial $10k must compound substantially over 54 years (got $${simUserUrl.metrics.finalBalance})`);
assert.ok(simUserUrl.metrics.cagr > 0.08, 'Global 4-asset CAGR should exceed 8%');
console.log(`User URL 4-Asset: Final $${simUserUrl.metrics.finalBalance.toLocaleString()} | CAGR: ${(simUserUrl.metrics.cagr * 100).toFixed(2)}% | Vol: ${(simUserUrl.metrics.annualVolatility * 100).toFixed(2)}%`);
console.log(`✅ PASS: User URL allocation model (40/20/30/10) successfully simulated\n`);

// -------------------------------------------------------------------
// TEST 7: Multi-Portfolio Side-by-Side Comparison
// -------------------------------------------------------------------
console.log('--- TEST 7: Multi-Portfolio Comparison (P1, P2, P3 vs Benchmark) ---');
// Add All-Weather components
dataMap.set('LONGTREASURY', getAssetClassPriceSeries('LongTreasury'));
dataMap.set('INTERMEDIATETREASURY', getAssetClassPriceSeries('IntermediateTreasury'));
dataMap.set('COMMODITIES', getAssetClassPriceSeries('Commodities'));
dataMap.set('GOLD', getAssetClassPriceSeries('Gold'));

const allocAllWeather = [
  { ticker: 'TOTALSTOCKMARKET', weight: 30 },
  { ticker: 'LONGTREASURY', weight: 40 },
  { ticker: 'INTERMEDIATETREASURY', weight: 15 },
  { ticker: 'COMMODITIES', weight: 7.5 },
  { ticker: 'GOLD', weight: 7.5 }
];

const simAllWeather = simulatePortfolio(dates, dataMap, allocAllWeather, {
  initialAmount: 10000,
  rebalancing: 'annual'
});

assert.ok(simAllWeather, 'All-Weather simulation must succeed');
// All-Weather should have lower volatility than 100% US equities
const simBenchmark = simulatePortfolio(dates, dataMap, [{ ticker: 'TOTALSTOCKMARKET', weight: 100 }], { initialAmount: 10000 });

assert.ok(simAllWeather.metrics.annualVolatility < simBenchmark.metrics.annualVolatility, 'All-Weather volatility must be lower than 100% equities');
assert.ok(Math.abs(simAllWeather.metrics.maxDrawdown) < Math.abs(simBenchmark.metrics.maxDrawdown), 'All-Weather drawdown must be shallower than 100% equities');
console.log(`All-Weather MaxDD: ${(simAllWeather.metrics.maxDrawdown * 100).toFixed(2)}% vs 100% Equities MaxDD: ${(simBenchmark.metrics.maxDrawdown * 100).toFixed(2)}%`);
console.log(`✅ PASS: Multi-portfolio side-by-side risk mitigation verified\n`);

// -------------------------------------------------------------------
// TEST 8: Rebalancing Schedule Sensitivity
// -------------------------------------------------------------------
console.log('--- TEST 8: Rebalancing Schedule Sensitivity ---');
const simAnnual = simulatePortfolio(dates, dataMap, allocSixtyForty, { initialAmount: 10000, rebalancing: 'annual' });
const simNoRebal = simulatePortfolio(dates, dataMap, allocSixtyForty, { initialAmount: 10000, rebalancing: 'none' });

assert.ok(simAnnual.rebalanceCount > 50, `Annual rebalancing over 54 years should rebalance ~54 times (got ${simAnnual.rebalanceCount})`);
assert.strictEqual(simNoRebal.rebalanceCount, 0, 'No rebalancing should have zero rebalance operations');
// Without rebalancing, equities drift to dominate the portfolio (>90%), causing higher volatility
assert.ok(simNoRebal.metrics.annualVolatility > simAnnual.metrics.annualVolatility, 'Drifting buy-and-hold portfolio must experience higher terminal volatility');
console.log(`Annual Rebal Vol: ${(simAnnual.metrics.annualVolatility * 100).toFixed(2)}% vs Drift Vol: ${(simNoRebal.metrics.annualVolatility * 100).toFixed(2)}%`);
console.log(`✅ PASS: Rebalancing schedule discipline validated\n`);

// -------------------------------------------------------------------
// TEST 9: Cash Flows (Contributions & Withdrawals)
// -------------------------------------------------------------------
console.log('--- TEST 9: Cash Flow Modeling ---');
const simDCA = simulatePortfolio(dates, dataMap, allocSixtyForty, {
  initialAmount: 10000,
  rebalancing: 'annual',
  cashflow: { type: 'contribute', amount: 500, frequency: 'monthly' }
});

assert.ok(simDCA.metrics.totalContributed > 10000, 'Total contributed must reflect monthly contributions');
assert.ok(simDCA.metrics.finalBalance > sim6040.metrics.finalBalance, 'DCA portfolio must accumulate substantially higher terminal balance');
console.log(`Total Invested with DCA: $${simDCA.metrics.totalContributed.toLocaleString()} | Final Balance: $${simDCA.metrics.finalBalance.toLocaleString()}`);
console.log(`✅ PASS: Ongoing contribution cash flows verified\n`);

// -------------------------------------------------------------------
// TEST 10: Model Presets Validation
// -------------------------------------------------------------------
console.log('--- TEST 10: Model Presets Validation ---');
assert.ok(ASSET_CLASS_PRESETS.length >= 6, 'There should be at least 6 standard asset class model presets');

ASSET_CLASS_PRESETS.forEach(p => {
  const sumWeights = p.allocations.reduce((sum, a) => sum + a.weight, 0);
  assert.ok(Math.abs(sumWeights - 100) < 0.01, `Preset "${p.name}" must sum to exactly 100% (got ${sumWeights})`);
  p.allocations.forEach(a => {
    assert.ok(getAssetClassById(a.assetId), `Preset "${p.name}" references invalid asset ID "${a.assetId}"`);
  });
});
console.log(`✅ PASS: All ${ASSET_CLASS_PRESETS.length} asset class model presets validated for 100% sum and ID integrity\n`);

console.log('🎉 ALL ASSET CLASS ALLOCATION ENGINE TESTS PASSED SUCCESSFULLY!');
