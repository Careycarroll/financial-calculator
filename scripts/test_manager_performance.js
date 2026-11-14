/**
 * Automated Unit Test Suite for Manager Performance Analysis Engine
 * Validates active excess return, tracking error, information ratio,
 * trailing performance windows, distribution statistics, up/down capture regimes,
 * rolling excess returns, relative drawdowns, and statistical skill confidence.
 */

import assert from 'assert';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import {
  calculateExcessReturns,
  calculateTrackingError,
  computeTrailingPerformance,
  computeExcessReturnDistribution,
  computeMarketRegimeAnalysis,
  computeAnnualExcessReturns,
  computeRollingManagerMetrics,
  computeRelativeDrawdowns,
  computeManagerSkillConfidence,
  analyzeManagerPerformance
} from '../fund-regression/manager-engine.js';

console.log('=== RUNNING MANAGER PERFORMANCE ANALYSIS ENGINE TESTS ===\n');

const qqq = PRESET_BENCHMARKS.find(f => f.ticker === 'QQQ');
const spy = PRESET_BENCHMARKS.find(f => f.ticker === 'SPY');
const voo = PRESET_BENCHMARKS.find(f => f.ticker === 'VOO');
const bnd = PRESET_BENCHMARKS.find(f => f.ticker === 'BND');

assert(qqq, 'QQQ benchmark exists');
assert(spy, 'SPY benchmark exists');
assert(voo, 'VOO benchmark exists');
assert(bnd, 'BND benchmark exists');

// --- TEST 1: Identity Self-Comparison (VOO vs. VOO) ---
console.log('--- TEST 1: Identity Benchmark Self-Comparison (VOO vs. VOO) ---');
const selfAnalysis = analyzeManagerPerformance(voo, voo, { annualRf: 0.03 });
assert.strictEqual(selfAnalysis.totalMonths, 191, '191 monthly return periods aligned');
assert(Math.abs(selfAnalysis.fullTrailing.excessReturn) < 1e-6, 'Self-comparison excess return is 0');
assert(Math.abs(selfAnalysis.fullTrailing.trackingError) < 1e-6, 'Self-comparison tracking error is 0');
assert(Math.abs(selfAnalysis.drawdowns.maxRelativeDrawdown) < 1e-6, 'Self-comparison relative drawdown is 0');
assert(selfAnalysis.distribution.bestMonth.excess < 1e-6, 'Best month excess is 0');
assert(selfAnalysis.distribution.worstMonth.excess < 1e-6, 'Worst month excess is 0');
console.log('✅ PASS: Perfect benchmark self-comparison yields zero excess return and zero tracking error');

// --- TEST 2: Active Growth Manager (QQQ vs. SPY) ---
console.log('\n--- TEST 2: Active Growth Manager Evaluation (QQQ vs. SPY) ---');
const qqqVsSpy = analyzeManagerPerformance(qqq, spy, { annualRf: 0.03, rollingMonths: 36, confidenceLevel: 0.80 });

console.log(`Timeline:                  ${qqqVsSpy.startDate} to ${qqqVsSpy.endDate} (${qqqVsSpy.totalMonths} Months)`);
console.log(`QQQ Return (CAGR):         ${(qqqVsSpy.fullTrailing.fundReturn * 100).toFixed(2)}%`);
console.log(`SPY Return (CAGR):         ${(qqqVsSpy.fullTrailing.benchReturn * 100).toFixed(2)}%`);
console.log(`Annualized Excess Return:  ${(qqqVsSpy.fullTrailing.excessReturn * 100).toFixed(2)}%`);
console.log(`Tracking Error (Active σ): ${(qqqVsSpy.fullTrailing.trackingError * 100).toFixed(2)}%`);
console.log(`Information Ratio (IR):    ${qqqVsSpy.fullTrailing.informationRatio.toFixed(3)}`);
console.log(`Jensen's Alpha:            ${(qqqVsSpy.fullTrailing.alpha * 100).toFixed(2)}% | Beta: ${qqqVsSpy.fullTrailing.beta.toFixed(3)}`);

assert(qqqVsSpy.fullTrailing.fundReturn > qqqVsSpy.fullTrailing.benchReturn, 'QQQ outperformed SPY over long run');
assert(qqqVsSpy.fullTrailing.excessReturn > 0.005, 'QQQ produced positive annualized excess return (>0.5% net over 27 years including 2000 crash)');
assert(qqqVsSpy.fullTrailing.trackingError > 0.05 && qqqVsSpy.fullTrailing.trackingError < 0.15, 'Tracking error in realistic 5-15% range');
assert(qqqVsSpy.fullTrailing.informationRatio > 0.05, 'Information ratio is positive');
console.log('✅ PASS: Core excess return, tracking error, and Information Ratio verified');

// --- TEST 3: Trailing Performance Windows ---
console.log('\n--- TEST 3: Multi-Horizon Trailing Windows ---');
assert(qqqVsSpy.trailing.length >= 4, 'Includes 1Y, 3Y, 5Y, 10Y, and Full Period');
const trailing1Y = qqqVsSpy.trailing.find(t => t.label === '1 Year');
const trailing3Y = qqqVsSpy.trailing.find(t => t.label === '3 Years');
const trailing5Y = qqqVsSpy.trailing.find(t => t.label === '5 Years');
const trailing10Y = qqqVsSpy.trailing.find(t => t.label === '10 Years');

assert(trailing1Y && trailing1Y.months === 12, '1-Year window has 12 months');
assert(trailing3Y && trailing3Y.months === 36, '3-Year window has 36 months');
assert(trailing5Y && trailing5Y.months === 60, '5-Year window has 60 months');
assert(trailing10Y && trailing10Y.months === 120, '10-Year window has 120 months');
console.log(`1Y Excess: ${(trailing1Y.excessReturn * 100).toFixed(2)}% | 3Y Excess: ${(trailing3Y.excessReturn * 100).toFixed(2)}% | 10Y Excess: ${(trailing10Y.excessReturn * 100).toFixed(2)}%`);
console.log('✅ PASS: Trailing performance windows accurately partition historical sub-periods');

// --- TEST 4: Excess Return Distribution & Shape Statistics ---
console.log('\n--- TEST 4: Excess Return Distribution & Shape ---');
const dist = qqqVsSpy.distribution;
assert(dist.totalPeriods === qqqVsSpy.totalMonths, 'Distribution accounts for all months');
assert(dist.winRate > 0.45 && dist.winRate < 0.70, `Win rate realistic (got ${(dist.winRate * 100).toFixed(1)}%)`);
assert(dist.bestMonth.excess > 0.05, `Best excess month is substantial (got ${(dist.bestMonth.excess * 100).toFixed(2)}% in ${dist.bestMonth.date})`);
assert(dist.worstMonth.excess < -0.05, `Worst excess month is substantial (got ${(dist.worstMonth.excess * 100).toFixed(2)}% in ${dist.worstMonth.date})`);
assert(typeof dist.skewness === 'number', 'Skewness computed');
assert(typeof dist.excessKurtosis === 'number', 'Excess kurtosis computed');
console.log(`Win Rate: ${(dist.winRate * 100).toFixed(1)}% | Best Month: +${(dist.bestMonth.excess * 100).toFixed(2)}% | Worst Month: ${(dist.worstMonth.excess * 100).toFixed(2)}%`);
console.log(`Excess Skewness: ${dist.skewness.toFixed(3)} | Excess Kurtosis: ${dist.excessKurtosis.toFixed(3)}`);
console.log('✅ PASS: Higher-order return distribution moments and win-rate statistics validated');

// --- TEST 5: Market Regime & Asymmetric Up/Down Capture ---
console.log('\n--- TEST 5: Up vs. Down Market Regime Breakdown ---');
const regimes = qqqVsSpy.regimes;
assert(regimes.upMarket.count > 0, 'Up market periods recorded');
assert(regimes.downMarket.count > 0, 'Down market periods recorded');
assert.strictEqual(regimes.upMarket.count + regimes.downMarket.count, qqqVsSpy.totalMonths, 'Up + Down periods sum to total months');
assert(regimes.upMarket.captureRatio > 100, `QQQ has >100% Up-Capture (got ${regimes.upMarket.captureRatio.toFixed(1)}%)`);
assert(regimes.captureRatioSpread > 0, 'Capture ratio spread is positive');
console.log(`Bull Months: ${regimes.upMarket.count} | Up-Capture: ${regimes.upMarket.captureRatio.toFixed(1)}% | Bull Win Rate: ${(regimes.upMarket.winRate * 100).toFixed(1)}%`);
console.log(`Bear Months: ${regimes.downMarket.count} | Down-Capture: ${regimes.downMarket.captureRatio.toFixed(1)}% | Bear Win Rate: ${(regimes.downMarket.winRate * 100).toFixed(1)}%`);
console.log(`Capture Ratio Spread: ${regimes.captureRatioSpread.toFixed(2)}`);
console.log('✅ PASS: Bull and bear market regime partition and capture asymmetry validated');

// --- TEST 6: Annual Excess Returns Matrix ---
console.log('\n--- TEST 6: Calendar Annual Excess Returns ---');
const annuals = qqqVsSpy.annualExcess;
assert(annuals.length >= 25, 'At least 25 calendar years analyzed');
const yr2020 = annuals.find(a => a.year === '2020');
assert(yr2020, '2020 calendar year present');
assert(yr2020.excessReturn > 0.15, `QQQ crushed SPY in 2020 (got excess ${(yr2020.excessReturn * 100).toFixed(2)}%)`);
const yr2022 = annuals.find(a => a.year === '2022');
assert(yr2022, '2022 calendar year present');
assert(yr2022.excessReturn < -0.10, `QQQ lagged SPY in 2022 (got excess ${(yr2022.excessReturn * 100).toFixed(2)}%)`);
console.log(`2020 Excess: +${(yr2020.excessReturn * 100).toFixed(2)}% | 2022 Excess: ${(yr2022.excessReturn * 100).toFixed(2)}%`);
console.log('✅ PASS: Calendar year active outperformance correctly identified');

// --- TEST 7: Rolling 36-Month Excess Return & Active Risk ---
console.log('\n--- TEST 7: Rolling 36-Month Excess Return & Tracking Error ---');
const rolling = qqqVsSpy.rolling;
assert(rolling.length === qqqVsSpy.totalMonths - 36 + 1, 'Rolling series matches N - 36 + 1 points');
assert(typeof rolling[0].excessReturn === 'number', 'Rolling excess return exists');
assert(rolling[0].trackingError > 0, 'Rolling tracking error is strictly positive');
assert(typeof rolling[0].informationRatio === 'number', 'Rolling IR exists');
console.log(`Total Rolling Windows: ${rolling.length}`);
console.log(`First Window (${rolling[0].date}): Excess = ${(rolling[0].excessReturn * 100).toFixed(2)}% | TE = ${(rolling[0].trackingError * 100).toFixed(2)}% | IR = ${rolling[0].informationRatio.toFixed(3)}`);
console.log(`Latest Window (${rolling[rolling.length - 1].date}): Excess = ${(rolling[rolling.length - 1].excessReturn * 100).toFixed(2)}% | TE = ${(rolling[rolling.length - 1].trackingError * 100).toFixed(2)}% | IR = ${rolling[rolling.length - 1].informationRatio.toFixed(3)}`);
console.log('✅ PASS: Walk-forward rolling excess return and tracking error dynamics verified');

// --- TEST 8: Absolute & Relative Drawdowns ---
console.log('\n--- TEST 8: Relative Drawdown & Underperformance Fatigue ---');
const dd = qqqVsSpy.drawdowns;
assert(dd.fundDrawdown.length === qqqVsSpy.totalMonths + 1, 'Fund drawdown length matches trajectory');
assert(dd.relativeDrawdown.length === qqqVsSpy.totalMonths + 1, 'Relative drawdown length matches trajectory');
assert(dd.maxRelativeDrawdown < -0.50, `QQQ experienced severe dot-com relative drawdown (got ${(dd.maxRelativeDrawdown * 100).toFixed(2)}% in ${dd.maxRelativeDrawdownDate})`);
assert(dd.maxFundDrawdown < -0.75, 'Dot-com crash absolute drawdown captured');
console.log(`Max Absolute Fund Drawdown:     ${(dd.maxFundDrawdown * 100).toFixed(2)}%`);
console.log(`Max Benchmark Drawdown:         ${(dd.maxBenchDrawdown * 100).toFixed(2)}%`);
console.log(`Max Relative Excess Drawdown:   ${(dd.maxRelativeDrawdown * 100).toFixed(2)}% (Trough Date: ${dd.maxRelativeDrawdownDate})`);
console.log('✅ PASS: Relative wealth index and peak-to-trough underperformance drawdowns verified');

// --- TEST 9: Manager Skill vs. Luck Statistical Significance ---
console.log('\n--- TEST 9: Manager Skill vs. Luck Statistical Testing ---');
const skill = qqqVsSpy.skill;
assert(skill.tStat > 1.0, `t-statistic is positive (got ${skill.tStat.toFixed(2)})`);
assert(skill.pValue >= 0 && skill.pValue <= 1.0, 'p-value is a valid probability [0, 1]');
assert(skill.lowerBoundAnnual < skill.meanAnnualExcess, 'Lower confidence bound is below mean');
assert(skill.upperBoundAnnual > skill.meanAnnualExcess, 'Upper confidence bound is above mean');
console.log(`t-Statistic:            ${skill.tStat.toFixed(3)}`);
console.log(`p-Value (One-Tailed):   ${skill.pValue.toFixed(4)}`);
console.log(`80% Confidence Interval: [${(skill.lowerBoundAnnual * 100).toFixed(2)}%, ${(skill.upperBoundAnnual * 100).toFixed(2)}%]`);
console.log(`Statistical Summary:    "${skill.summary}"`);
console.log('✅ PASS: Student t-test significance and skill confidence intervals validated');

// --- TEST 10: Fixed Income Defensive Profile (BND vs. VOO) ---
console.log('\n--- TEST 10: Defensive Fixed Income Profile (BND vs. VOO) ---');
const bndVsVoo = analyzeManagerPerformance(bnd, voo, { annualRf: 0.03 });
assert(bndVsVoo.fullTrailing.excessReturn < 0, 'BND has negative excess return vs VOO in bull equity era');
assert(bndVsVoo.regimes.downMarket.captureRatio < 10, 'BND has near-zero downside capture during equity market crashes');
assert(bndVsVoo.skill.tStat < 0, 't-statistic correctly identifies underperformance vs equity baseline');
console.log(`BND Down-Market Capture: ${bndVsVoo.regimes.downMarket.captureRatio.toFixed(1)}% (Capital Preservation verified)`);
console.log('✅ PASS: Defensive asymmetric profile and capital preservation metrics confirmed');

console.log('\n🎉 ALL MANAGER PERFORMANCE ENGINE TESTS PASSED SUCCESSFULLY!');
