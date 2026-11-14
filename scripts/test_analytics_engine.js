/**
 * Unit Test Suite for Asset Analytics Engine
 * Validates Growth of $10k, Annual Calendar Returns, Drawdown Episodes,
 * Monthly Heatmap Matrix, Rolling Windows, VaR/CVaR, and Diagnostic Verdicts.
 */

import assert from 'node:assert';
import {
  calculateGrowthOf10k,
  calculateAnnualReturns,
  calculateDrawdownEpisodes,
  calculateMonthlyCalendarHeatmap,
  calculateRollingMetrics,
  calculateVaRAndCVaR,
  generateSimpleVerdict,
  computeMonthlyReturns
} from '../asset-analytics/analytics-engine.js';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';

console.log('=== RUNNING ASSET ANALYTICS ENGINE TESTS ===\n');

// Extract VOO and QQQ returns for testing
const voo = PRESET_BENCHMARKS.find(f => f.ticker === 'VOO');
const qqq = PRESET_BENCHMARKS.find(f => f.ticker === 'QQQ');

const vooReturns = computeMonthlyReturns(voo.data, true);
const qqqReturns = computeMonthlyReturns(qqq.data, true);

// TEST 1: Growth of $10,000
console.log('--- TEST 1: Cumulative Growth of $10,000 ---');
const growth = calculateGrowthOf10k(vooReturns, vooReturns, 10000);
assert.strictEqual(growth.length, vooReturns.length + 1, 'Growth timeline length matches returns + 1');
assert.strictEqual(growth[0].fundGrowth, 10000, 'Initial fund growth is $10,000');
assert.strictEqual(growth[0].benchGrowth, 10000, 'Initial bench growth is $10,000');
assert(growth[growth.length - 1].fundGrowth > 40000, 'VOO $10k grew beyond $40k over full period');
console.log(`✅ PASS: VOO $10k turned into $${growth[growth.length - 1].fundGrowth.toLocaleString()}`);

// TEST 2: Calendar Annual Returns
console.log('\n--- TEST 2: Calendar Annual Returns ---');
const annual = calculateAnnualReturns(qqqReturns, vooReturns);
assert(annual.length >= 10, 'At least 10 calendar years present');
const year2020 = annual.find(a => a.year === 2020);
assert(year2020, 'Year 2020 exists');
assert(year2020.fundReturn > 0.40, 'QQQ 2020 return exceeded +40%');
assert(year2020.excessReturn > 0.15, 'QQQ beat VOO in 2020 by > 15% excess');
console.log(`✅ PASS: 2020 QQQ: ${(year2020.fundReturn * 100).toFixed(1)}% vs VOO: ${(year2020.benchReturn * 100).toFixed(1)}% (Excess: +${(year2020.excessReturn * 100).toFixed(1)}%)`);

// TEST 3: Drawdown Episodes Identification
console.log('\n--- TEST 3: Drawdown Episodes Identification ---');
const ddResult = calculateDrawdownEpisodes(vooReturns);
assert(ddResult.timeline.length === vooReturns.length, 'Drawdown timeline covers all months');
assert(ddResult.topEpisodes.length > 0, 'Detected discrete drawdown episodes');
// Check worst crash is the COVID 2020 or 2022 crash
const worstCrash = ddResult.topEpisodes[0];
assert(worstCrash.depth < -0.15, 'Worst drawdown exceeded -15%');
assert(worstCrash.monthsToTrough >= 1, 'Months to trough is positive');
assert(worstCrash.peakDate && worstCrash.troughDate, 'Episode has peak and trough dates');
console.log(`✅ PASS: Worst VOO Crash: ${(worstCrash.depth * 100).toFixed(1)}% (Peak: ${worstCrash.peakDate} -> Trough: ${worstCrash.troughDate}, Recovery: ${worstCrash.recoveryDate || 'In Progress'})`);

// TEST 4: Monthly Calendar Heatmap Matrix
console.log('\n--- TEST 4: Monthly Calendar Heatmap Matrix ---');
const heatmap = calculateMonthlyCalendarHeatmap(vooReturns);
assert(heatmap.length > 0, 'Heatmap matrix generated');
assert.strictEqual(heatmap[0].months.length, 12, 'Each year has 12 monthly slots');
// Reverse chronological: first row is highest year
assert(heatmap[0].year >= heatmap[heatmap.length - 1].year, 'Years ordered descending');
console.log(`✅ PASS: Heatmap generated ${heatmap.length} calendar years with 12-month slots`);

// TEST 5: Rolling 36-Month Period Metrics
console.log('\n--- TEST 5: Rolling 36-Month Analysis ---');
const rolling = calculateRollingMetrics(qqqReturns, vooReturns, 36, 0.03);
assert(rolling.totalWindows > 100, 'Over 100 rolling 36M windows computed');
assert(rolling.winRate >= 50, 'QQQ beat VOO in majority of 36M rolling periods');
assert(rolling.windows[0].fundCagr !== undefined, 'Window has fund CAGR');
assert(rolling.windows[0].fundSharpe !== undefined, 'Window has fund Sharpe');
console.log(`✅ PASS: QQQ beat VOO in ${rolling.winRate}% of 36-month rolling windows (${rolling.outperformedWindows}/${rolling.totalWindows})`);

// TEST 6: Value at Risk (VaR 95%) & CVaR
console.log('\n--- TEST 6: Value at Risk (VaR 95%) & CVaR ---');
const risk = calculateVaRAndCVaR(vooReturns, 0.95);
assert(risk.varMonthly > 0.03 && risk.varMonthly < 0.15, 'Monthly 95% VaR is between 3% and 15%');
assert(risk.cvarMonthly >= risk.varMonthly, 'CVaR (Expected Shortfall) is at least as severe as VaR');
console.log(`✅ PASS: VOO 95% Monthly VaR: ${(risk.varMonthly * 100).toFixed(2)}% | Monthly CVaR: ${(risk.cvarMonthly * 100).toFixed(2)}%`);

// TEST 7: Simple Diagnostic Verdict
console.log('\n--- TEST 7: Simple Diagnostic Verdict ---');
const dummyProfile = {
  cagr: 0.145,
  volatility: 0.18,
  maxDrawdown: -0.25,
  beta: 1.15,
  sharpe: 0.95,
  alpha: 0.02
};
const dummyBench = { cagr: 0.125 };
const verdict = generateSimpleVerdict(dummyProfile, dummyBench, ddResult.topEpisodes, rolling);
assert(verdict.summary.includes('$10,000'), 'Summary mentions $10,000 initial balance');
assert(verdict.riskVerdict.includes('Beta'), 'Risk verdict mentions Beta');
assert(verdict.badge, 'Verdict has classification badge');
console.log(`✅ PASS: Verdict generated: Badge "${verdict.badge}"`);
console.log(`   Summary: ${verdict.summary}`);

console.log('\n🎉 ALL ASSET ANALYTICS TESTS PASSED SUCCESSFULLY!');
