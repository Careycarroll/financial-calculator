/**
 * Unit Test Suite for Portfolio Backtest & Rebalancing Engine
 * Validates allocation normalizers, periodic rebalancing algorithms,
 * cashflow modeling, risk metrics (CAGR, Vol, Sharpe, Sortino, MaxDD),
 * and side-by-side multi-portfolio simulation vs Benchmark.
 */

import assert from 'node:assert';
import {
  validateAllocations,
  findCommonDateRange,
  shouldRebalance,
  calculatePortfolioMetrics,
  simulatePortfolio,
  calculateCorrelation,
  runMultiPortfolioBacktest,
  PORTFOLIO_PRESETS
} from '../portfolio-backtest/portfolio-engine.js';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';

console.log('=== RUNNING PORTFOLIO BACKTEST ENGINE TESTS ===\n');

// TEST 1: Allocation Validation & Weight Normalization
console.log('--- TEST 1: Allocation Validation & Normalization ---');
const validAlloc = validateAllocations([
  { ticker: 'VOO', weight: 60 },
  { ticker: 'BND', weight: 40 }
]);
assert(validAlloc.valid, '60/40 allocation is valid');
assert(validAlloc.totalWeight === 100, 'Total weight equals 100%');
assert(validAlloc.normalized[0].targetShare === 0.6, 'VOO target share is 0.6');
assert(validAlloc.normalized[1].targetShare === 0.4, 'BND target share is 0.4');

const invalidAlloc = validateAllocations([
  { ticker: 'VOO', weight: 50 },
  { ticker: 'BND', weight: 30 } // Only 80%
]);
assert(!invalidAlloc.valid, '80% allocation is correctly flagged as invalid');
assert(invalidAlloc.totalWeight === 80, 'Total weight is 80');

const emptyFiltered = validateAllocations([
  { ticker: 'VOO', weight: 50 },
  { ticker: '', weight: 20 },
  { ticker: '   ', weight: 10 },
  { ticker: 'BND', weight: 50 }
]);
assert(emptyFiltered.valid, 'Empty tickers are pruned and valid 50/50 passes');
assert(emptyFiltered.normalized.length === 2, 'Only 2 valid tickers kept');
console.log('✅ PASS: Allocation validation and normalization passed.');

// TEST 2: Presets Integrity
console.log('\n--- TEST 2: Portfolio Presets Integrity ---');
assert(PORTFOLIO_PRESETS.length >= 4, 'At least 4 presets defined');
PORTFOLIO_PRESETS.forEach(preset => {
  const v = validateAllocations(preset.allocations);
  assert(v.valid, `Preset "${preset.name}" must sum to 100%`);
  assert(preset.id && preset.name && preset.description, `Preset "${preset.id}" has metadata`);
});
console.log(`✅ PASS: All ${PORTFOLIO_PRESETS.length} portfolio presets verified with 100% weights.`);

// TEST 3: Periodic Rebalance Frequency Logic
console.log('\n--- TEST 3: Rebalance Frequency Decision Logic ---');
assert(!shouldRebalance('none', 12, '2020-12'), 'Frequency "none" never rebalances');
assert(!shouldRebalance('annual', 0, '2020-12'), 'Month index 0 never rebalances (T=0)');
assert(shouldRebalance('annual', 12, '2020-12'), 'Annual rebalances in December');
assert(!shouldRebalance('annual', 6, '2020-06'), 'Annual does not rebalance in June');

assert(shouldRebalance('semi-annual', 6, '2020-06'), 'Semi-annual rebalances in June');
assert(shouldRebalance('semi-annual', 12, '2020-12'), 'Semi-annual rebalances in December');
assert(!shouldRebalance('semi-annual', 3, '2020-03'), 'Semi-annual does not rebalance in March');

assert(shouldRebalance('quarterly', 3, '2020-03'), 'Quarterly rebalances in March');
assert(shouldRebalance('quarterly', 9, '2020-09'), 'Quarterly rebalances in September');
assert(!shouldRebalance('quarterly', 4, '2020-04'), 'Quarterly does not rebalance in April');

assert(shouldRebalance('monthly', 1, '2020-01'), 'Monthly rebalances every single month');
console.log('✅ PASS: Periodic rebalance rules verified for all frequencies.');

// TEST 4: Single Portfolio Simulation (Classic 60/40)
console.log('\n--- TEST 4: Single Portfolio Simulation (Classic 60/40 VOO/BND) ---');
const voo = PRESET_BENCHMARKS.find(f => f.ticker === 'VOO');
const bnd = PRESET_BENCHMARKS.find(f => f.ticker === 'BND');
const commonRange = findCommonDateRange([voo, bnd]);
assert(commonRange.totalMonths > 100, 'VOO & BND have >100 overlapping months');

// Filter aligned dates
const dateSet = new Set(voo.data.map(d => d.date));
const bndDates = new Set(bnd.data.map(d => d.date));
const alignedDates = Array.from(dateSet).filter(d => bndDates.has(d)).sort();

const testDataMap = new Map();
testDataMap.set('VOO', voo.data.filter(d => alignedDates.includes(d.date)));
testDataMap.set('BND', bnd.data.filter(d => alignedDates.includes(d.date)));

// Run simulation with Annual Rebalancing
const simAnnual = simulatePortfolio(
  alignedDates,
  testDataMap,
  [{ ticker: 'VOO', weight: 60 }, { ticker: 'BND', weight: 40 }],
  { initialAmount: 10000, rebalancing: 'annual', useDRIP: true }
);

assert(simAnnual, 'Simulation completed');
assert(simAnnual.trajectory.length === alignedDates.length, 'Trajectory spans all aligned months');
assert(simAnnual.metrics.initialBalance === 10000, 'Initial balance is $10,000');
assert(simAnnual.metrics.finalBalance > 10000, 'Final balance shows capital appreciation');
assert(simAnnual.metrics.cagr > 0.04 && simAnnual.metrics.cagr < 0.20, '60/40 CAGR is in realistic range');
assert(simAnnual.metrics.annualVolatility > 0.05 && simAnnual.metrics.annualVolatility < 0.20, 'Volatility is reasonable');
assert(simAnnual.metrics.maxDrawdown < 0, 'Max Drawdown is negative percentage');
assert(simAnnual.metrics.monthlyVaR95 > 0.01 && simAnnual.metrics.monthlyVaR95 < 0.12, '60/40 monthly VaR 95% is between 1% and 12%');
assert(simAnnual.metrics.monthlyCVaR95 >= simAnnual.metrics.monthlyVaR95, 'CVaR >= VaR');
assert(simAnnual.metrics.tailRisk && simAnnual.metrics.tailRisk.hasSufficientData, 'Tail risk metrics computed');
assert(simAnnual.rebalanceCount > 5, 'Annual rebalancing fired multiple times over holding period');

console.log(`✅ PASS: 60/40 Portfolio: Initial $10k -> Final $${simAnnual.metrics.finalBalance.toLocaleString()}`);
console.log(`   CAGR: ${(simAnnual.metrics.cagr * 100).toFixed(2)}% | Volatility: ${(simAnnual.metrics.annualVolatility * 100).toFixed(2)}% | Sharpe: ${simAnnual.metrics.sharpeRatio} | MaxDD: ${(simAnnual.metrics.maxDrawdown * 100).toFixed(1)}%`);
console.log(`   Monthly VaR (95%): ${(simAnnual.metrics.monthlyVaR95 * 100).toFixed(2)}% | Monthly CVaR (95%): ${(simAnnual.metrics.monthlyCVaR95 * 100).toFixed(2)}% | Diagnosis: "${simAnnual.metrics.tailRisk.tailRiskSeverity}"`);

// TEST 5: Rebalance vs No-Rebalance (Drift)
console.log('\n--- TEST 5: Rebalancing vs Buy-and-Hold Drift ---');
const simDrift = simulatePortfolio(
  alignedDates,
  testDataMap,
  [{ ticker: 'VOO', weight: 60 }, { ticker: 'BND', weight: 40 }],
  { initialAmount: 10000, rebalancing: 'none', useDRIP: true }
);

assert(simDrift.rebalanceCount === 0, 'Drift mode has 0 rebalances');
const lastDriftPt = simDrift.trajectory[simDrift.trajectory.length - 1];
// Due to equities outperforming bonds over 2011-2026, VOO weight should drift higher than 60% in drift mode
assert(lastDriftPt.assetWeights['VOO'] > 60, `Equity drifted higher in buy-and-hold (actual: ${lastDriftPt.assetWeights['VOO']}%)`);
console.log(`✅ PASS: Without rebalancing, VOO weight drifted from 60% to ${lastDriftPt.assetWeights['VOO']}%.`);

// TEST 6: Cashflow Contributions Modeling
console.log('\n--- TEST 6: Cashflow Contributions ($500/month DCA) ---');
const simCashflow = simulatePortfolio(
  alignedDates,
  testDataMap,
  [{ ticker: 'VOO', weight: 60 }, { ticker: 'BND', weight: 40 }],
  {
    initialAmount: 10000,
    rebalancing: 'annual',
    cashflow: { type: 'contribute', amount: 500, frequency: 'monthly' },
    useDRIP: true
  }
);

assert(simCashflow.metrics.totalContributed > 10000, 'Total contributed includes monthly deposits');
assert(simCashflow.metrics.finalBalance > simAnnual.metrics.finalBalance, 'Contributions significantly increase ending wealth');
console.log(`✅ PASS: With $500/mo cashflow: Contributed $${simCashflow.metrics.totalContributed.toLocaleString()} -> Final $${simCashflow.metrics.finalBalance.toLocaleString()}`);

// TEST 7: Multi-Portfolio Pipeline vs Benchmark
console.log('\n--- TEST 7: Multi-Portfolio Pipeline vs Benchmark ---');
const models = [
  {
    id: 'p1',
    name: 'Classic 60/40',
    color: '#38bdf8',
    allocations: [{ ticker: 'VOO', weight: 60 }, { ticker: 'BND', weight: 40 }]
  },
  {
    id: 'p2',
    name: 'Aggressive 80/20',
    color: '#34d399',
    allocations: [{ ticker: 'VOO', weight: 50 }, { ticker: 'QQQ', weight: 30 }, { ticker: 'BND', weight: 20 }]
  }
];

const multiResult = runMultiPortfolioBacktest(PRESET_BENCHMARKS, models, 'VOO', {
  initialAmount: 10000,
  rebalancing: 'annual',
  useDRIP: true
});

assert(!multiResult.error, 'Multi-portfolio backtest ran without error');
assert(multiResult.portfolios.length === 2, '2 active portfolios simulated');
assert(multiResult.benchmark, 'Benchmark (VOO) simulated');
assert(multiResult.benchmark.ticker === 'VOO', 'Benchmark is VOO');
assert(multiResult.portfolios[0].correlationToBenchmark > 0.8, '60/40 has high correlation to S&P 500');
assert(multiResult.portfolios[1].correlationToBenchmark > 0.8, '80/20 has high correlation to S&P 500');

// Aggressive 80/20 with QQQ should have higher CAGR and higher volatility than 60/40
const p1Metrics = multiResult.portfolios[0].metrics;
const p2Metrics = multiResult.portfolios[1].metrics;
assert(p2Metrics.cagr > p1Metrics.cagr, 'Aggressive 80/20 achieved higher CAGR than conservative 60/40');
assert(p2Metrics.annualVolatility > p1Metrics.annualVolatility, 'Aggressive 80/20 had higher volatility');

console.log(`✅ PASS: Side-by-side comparison verified:`);
console.log(`   P1 (60/40):      CAGR ${(p1Metrics.cagr * 100).toFixed(2)}% | Vol ${(p1Metrics.annualVolatility * 100).toFixed(2)}% | Final $${p1Metrics.finalBalance.toLocaleString()}`);
console.log(`   P2 (80/20 QQQ):  CAGR ${(p2Metrics.cagr * 100).toFixed(2)}% | Vol ${(p2Metrics.annualVolatility * 100).toFixed(2)}% | Final $${p2Metrics.finalBalance.toLocaleString()}`);
console.log(`   Benchmark (VOO): CAGR ${(multiResult.benchmark.metrics.cagr * 100).toFixed(2)}% | Vol ${(multiResult.benchmark.metrics.annualVolatility * 100).toFixed(2)}% | Final $${multiResult.benchmark.metrics.finalBalance.toLocaleString()}`);

console.log('\n🎉 ALL PORTFOLIO ENGINE TESTS PASSED SUCCESSFULLY!');
