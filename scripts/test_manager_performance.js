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
  analyzeManagerPerformance,
  calculateBrinsonAttribution,
  BRINSON_PRESETS,
  calculateMencheroWeights,
  calculateMultiPeriodBrinson,
  getBrinsonPresetMonthlyData,
  calculateMarketTiming
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

// --- TEST 11: Brinson Performance Attribution (Bodie Chapter 24) ---
console.log('\n--- TEST 11: Brinson Performance Attribution (BF & BHB Models) ---');

// 1. Active Growth Preset Validation (Brinson-Fachler)
const growthPreset = BRINSON_PRESETS['active-growth'];
assert(growthPreset && growthPreset.sectors.length === 10, 'Active growth preset contains 10 sectors/classes');

const bf = calculateBrinsonAttribution(growthPreset.sectors, { model: 'brinson-fachler' });
assert(bf.identityVerified, 'Brinson-Fachler exact mathematical identity verified: A + S + I = Rp - Rb');
assert(Math.abs(bf.residual) < 1e-12, `Residual is strictly zero (got ${bf.residual})`);
assert(bf.portfolioReturn > bf.benchmarkReturn, 'Active manager outperforms benchmark');
assert(bf.totalAllocation > 0, 'Asset allocation added positive active excess return');
assert(bf.totalSelection > 0, 'Security selection added positive active excess return');

console.log('Brinson-Fachler Decomposition (Active Growth):');
console.log(`  Portfolio Return:  ${(bf.portfolioReturn * 100).toFixed(2)}%`);
console.log(`  Benchmark Return:  ${(bf.benchmarkReturn * 100).toFixed(2)}%`);
console.log(`  Active Return:     ${(bf.activeReturn * 100).toFixed(2)}%`);
console.log(`  Allocation Effect: +${(bf.totalAllocation * 100).toFixed(2)}% (${((bf.totalAllocation/bf.activeReturn)*100).toFixed(1)}% of Alpha)`);
console.log(`  Selection Effect:  +${(bf.totalSelection * 100).toFixed(2)}% (${((bf.totalSelection/bf.activeReturn)*100).toFixed(1)}% of Alpha)`);
console.log(`  Interaction Effect: +${(bf.totalInteraction * 100).toFixed(2)}% (${((bf.totalInteraction/bf.activeReturn)*100).toFixed(1)}% of Alpha)`);
console.log(`  Identity Check:    ${(bf.totalSum * 100).toFixed(4)}% == ${(bf.activeReturn * 100).toFixed(4)}% (Diff: ${bf.residual})`);
console.log('✅ PASS: Brinson-Fachler 3-factor decomposition satisfies exact mathematical identity');

// 2. Brinson-Hood-Beebower Equivalence at Portfolio Level
const bhb = calculateBrinsonAttribution(growthPreset.sectors, { model: 'brinson-hood-beebower' });
assert(bhb.identityVerified, 'BHB satisfies exact identity A + S + I = Rp - Rb');
assert(Math.abs(bhb.totalAllocation - bf.totalAllocation) < 1e-12, 'Portfolio-level Allocation Effect in BHB strictly equals BF');
assert(Math.abs(bhb.totalSelection - bf.totalSelection) < 1e-12, 'Portfolio-level Selection Effect in BHB strictly equals BF');
console.log('✅ PASS: Brinson-Hood-Beebower total allocation effect strictly equals Brinson-Fachler');

// 3. Directional Attribution Mechanics
// Technology: Overweight (48% vs 30%), Sector beat market (22% vs 13.29%) -> Positive Allocation
const techRow = bf.rows.find(r => r.name === 'Information Technology');
assert(techRow.allocation > 0, 'Overweighting outperforming sector yields positive allocation effect');
assert(techRow.selection > 0, 'Manager outperforming sector benchmark yields positive selection effect');

// Industrials: Underweight (4% vs 9%), Sector underperformed market (13% vs 13.29%) -> Positive Allocation
const indRow = bf.rows.find(r => r.name === 'Industrials');
assert(indRow.activeWeight < 0, 'Industrials is underweight');

// 4. 2-Factor Combined Selection Equivalence
assert(Math.abs(bf.totalCombinedSelection - (bf.totalSelection + bf.totalInteraction)) < 1e-12, 'Combined selection strictly equals Selection + Interaction');
assert(Math.abs(bf.totalAllocation + bf.totalCombinedSelection - bf.activeReturn) < 1e-12, '2-factor Allocation + Combined Selection = Active Return');
console.log('✅ PASS: 2-factor Brinson decomposition (Allocation + Combined Selection) confirmed');

// 5. Global Multi-Asset & Value Presets Verification
['global-multi-asset', 'value-dividend'].forEach(key => {
  const res = calculateBrinsonAttribution(BRINSON_PRESETS[key].sectors);
  assert(res.identityVerified, `Preset ${key} verified with zero residual`);
});
console.log('✅ PASS: All institutional attribution presets validated with zero residual');

// --- TEST 12: Menchero Multi-Period Compounded Brinson Attribution (Issue #129) ---
console.log('\n--- TEST 12: Menchero Multi-Period Compounded Attribution & L\'Hôpital Limits ---');

// 1. Menchero Weight Scaling & Exact Additivity
const syntheticPeriods = [
  { portfolioReturn: 0.045, benchmarkReturn: 0.020 },
  { portfolioReturn: -0.015, benchmarkReturn: 0.010 },
  { portfolioReturn: 0.035, benchmarkReturn: -0.005 },
  { portfolioReturn: -0.020, benchmarkReturn: -0.025 }
];
const mencheroRes = calculateMencheroWeights(syntheticPeriods);
assert.strictEqual(mencheroRes.weights.length, 4, '4 Menchero weights generated');
let linkedActiveSum = 0;
syntheticPeriods.forEach((p, idx) => {
  linkedActiveSum += mencheroRes.weights[idx] * (p.portfolioReturn - p.benchmarkReturn);
});
assert(Math.abs(linkedActiveSum - mencheroRes.cumulativeActive) < 1e-14,
  `Menchero linked active return strictly matches cumulative active return: diff=${Math.abs(linkedActiveSum - mencheroRes.cumulativeActive)}`);
console.log(`✅ PASS: Menchero logarithmic linking exact additivity verified (diff < 1e-14)`);

// 2. L'Hôpital Boundary Check: Zero Active Period (Rp_t == Rb_t)
const equalPeriod = [
  { portfolioReturn: 0.03, benchmarkReturn: 0.03 },
  { portfolioReturn: 0.05, benchmarkReturn: 0.02 }
];
const lhopitalPeriodRes = calculateMencheroWeights(equalPeriod);
assert(Number.isFinite(lhopitalPeriodRes.weights[0]), 'L\'Hopital period limit is finite');
assert(Number.isFinite(lhopitalPeriodRes.weights[1]), 'Second weight is finite');
let lhopitalSum = equalPeriod[0].portfolioReturn - equalPeriod[0].benchmarkReturn;
let lhopitalLinkedSum = lhopitalPeriodRes.weights[0] * (equalPeriod[0].portfolioReturn - equalPeriod[0].benchmarkReturn)
  + lhopitalPeriodRes.weights[1] * (equalPeriod[1].portfolioReturn - equalPeriod[1].benchmarkReturn);
assert(Math.abs(lhopitalLinkedSum - lhopitalPeriodRes.cumulativeActive) < 1e-14, 'L\'Hopital period condition holds');
console.log('✅ PASS: L\'Hopital boundary condition for identical period returns verified');

// 3. L'Hôpital Boundary Check: Zero Cumulative Active Return (Rp == Rb)
const zeroActiveCum = [
  { portfolioReturn: 0.04, benchmarkReturn: 0.02 },
  { portfolioReturn: 0.02, benchmarkReturn: 0.04 }
];
const zeroCumRes = calculateMencheroWeights(zeroActiveCum);
assert(zeroCumRes.weights.every(w => Number.isFinite(w)), 'Weights with zero cumulative active return are all finite');
assert(Math.abs(zeroCumRes.cumulativeActive) < 1e-12, 'Cumulative active return is zero');
console.log('✅ PASS: L\'Hopital boundary condition for zero cumulative active return verified');

// 4. Multi-Period Brinson Attribution on 60-Month Presets
['active-growth', 'global-multi-asset', 'value-dividend'].forEach(presetKey => {
  [12, 36, 60].forEach(horizon => {
    const data = getBrinsonPresetMonthlyData(presetKey, horizon);
    assert.strictEqual(data.length, horizon, `${presetKey} data length matches horizon ${horizon}`);

    // Brinson-Fachler 3-Factor
    const bfMulti = calculateMultiPeriodBrinson(data, { model: 'brinson-fachler', decomposition: '3-factor' });
    assert(bfMulti.identityVerified, `${presetKey} ${horizon}M BF multi-period identity verified (residual < 1e-10)`);
    assert(Math.abs(bfMulti.residual) < 1e-12, `Residual is under 1e-12 (got ${bfMulti.residual})`);
    assert.strictEqual(bfMulti.trajectory.length, horizon, `Trajectory has ${horizon} points`);

    // Verify sector additivity
    const sumSecAlloc = bfMulti.sectors.reduce((acc, s) => acc + s.allocation, 0);
    const sumSecSel = bfMulti.sectors.reduce((acc, s) => acc + s.selection, 0);
    const sumSecInter = bfMulti.sectors.reduce((acc, s) => acc + s.interaction, 0);
    assert(Math.abs(sumSecAlloc - bfMulti.totalAllocation) < 1e-12, 'Sector allocation sum matches total allocation');
    assert(Math.abs(sumSecSel - bfMulti.totalSelection) < 1e-12, 'Sector selection sum matches total selection');
    assert(Math.abs(sumSecInter - bfMulti.totalInteraction) < 1e-12, 'Sector interaction sum matches total interaction');

    // Trajectory endpoint check
    const lastPoint = bfMulti.trajectory[bfMulti.trajectory.length - 1];
    assert(Math.abs(lastPoint.cumActiveReturn - bfMulti.cumulativeActive) < 1e-12, 'Trajectory end active matches cumulative active');
    assert(Math.abs(lastPoint.cumAllocLinked - bfMulti.totalAllocation) < 1e-12, 'Trajectory end allocation matches total allocation');
    assert(Math.abs(lastPoint.cumSelLinked - bfMulti.totalSelection) < 1e-12, 'Trajectory end selection matches total selection');

    // Brinson-Hood-Beebower equivalence
    const bhbMulti = calculateMultiPeriodBrinson(data, { model: 'brinson-hood-beebower' });
    assert(bhbMulti.identityVerified, `${presetKey} ${horizon}M BHB multi-period identity verified`);
    assert(Math.abs(bhbMulti.totalAllocation - bfMulti.totalAllocation) < 1e-12, 'BHB multi-period allocation strictly equals BF');
    assert(Math.abs(bhbMulti.totalSelection - bfMulti.totalSelection) < 1e-12, 'BHB multi-period selection strictly equals BF');

    // 2-Factor decomposition
    assert(Math.abs(bfMulti.totalCombinedSelection - (bfMulti.totalSelection + bfMulti.totalInteraction)) < 1e-12,
      'Combined selection equals selection + interaction');
  });
});
console.log('✅ PASS: Multi-period Menchero Brinson attribution validated across all horizons (1Y, 3Y, 5Y) and presets');

// --- TEST 13: Treynor-Mazuy & Henriksson-Merton Market Timing Regressions (Issue #121) ---
console.log('\n--- TEST 13: Treynor-Mazuy & Henriksson-Merton Market Timing Models ---');

// 1. Synthetic Treynor-Mazuy Simulation (Quadratic Market Timing)
const N_syn = 150;
const tmSyntheticPairs = [];
const trueAlphaTM = 0.004; // ~4.9% annualized alpha
const trueBetaTM = 1.15;
const trueGammaTM = 3.50; // strong positive curvature

for (let i = 0; i < N_syn; i++) {
  const rBench = (Math.sin(i * 1.7) * 0.05); // market -5% to +5%
  const x = rBench - (0.03 / 12);
  const err = Math.cos(i * 3.1) * 0.001;
  const y = trueAlphaTM + trueBetaTM * x + trueGammaTM * (x * x) + err;
  const rFund = y + (0.03 / 12);
  tmSyntheticPairs.push({ date: `2010-${String(i+1).padStart(3, '0')}`, rFund, rBench });
}

const tmResult = calculateMarketTiming(tmSyntheticPairs, { annualRf: 0.03, model: 'treynor-mazuy' });
assert(tmResult.hasSufficientData, 'TM has sufficient data');
assert(Math.abs(tmResult.alpha.monthly - trueAlphaTM) < 0.001, `Recovered alpha: ${tmResult.alpha.monthly.toFixed(5)} vs ${trueAlphaTM}`);
assert(Math.abs(tmResult.beta.value - trueBetaTM) < 0.01, `Recovered beta: ${tmResult.beta.value.toFixed(4)} vs ${trueBetaTM}`);
assert(Math.abs(tmResult.gamma.value - trueGammaTM) < 0.05, `Recovered gamma: ${tmResult.gamma.value.toFixed(4)} vs ${trueGammaTM}`);
assert(tmResult.gamma.tStat > 10, `Gamma t-stat is highly significant (>10, got ${tmResult.gamma.tStat.toFixed(2)})`);
assert(tmResult.gamma.pValue < 0.001, 'Gamma p-value is < 0.001');
assert(tmResult.gamma.isSignificant, 'Gamma is marked statistically significant');
assert(tmResult.verdict.includes('Statistically Significant Convex Market Timing'), 'Verdict confirms convex market timing skill');
assert.strictEqual(tmResult.curvePoints.length, 81, '81 curve evaluation points generated');
console.log(`✅ PASS: Treynor-Mazuy recovered true parameters: α=${(tmResult.alpha.annualized*100).toFixed(2)}%, β=${tmResult.beta.value.toFixed(2)}, γ=+${tmResult.gamma.value.toFixed(2)} (t=${tmResult.gamma.tStat.toFixed(1)}, p<0.001)`);

// 2. Synthetic Henriksson-Merton Simulation (Option Replication)
const hmSyntheticPairs = [];
const trueAlphaHM = 0.002;
const trueBetaHM = 1.25;
const trueGammaHM = 0.45; // downside beta = 1.25 - 0.45 = 0.80

for (let i = 0; i < N_syn; i++) {
  const rBench = (Math.sin(i * 1.5) * 0.06);
  const x = rBench - (0.03 / 12);
  const putPayoff = Math.max(0, -x);
  const err = Math.cos(i * 2.3) * 0.001;
  const y = trueAlphaHM + trueBetaHM * x + trueGammaHM * putPayoff + err;
  const rFund = y + (0.03 / 12);
  hmSyntheticPairs.push({ date: `2010-${String(i+1).padStart(3, '0')}`, rFund, rBench });
}

const hmResult = calculateMarketTiming(hmSyntheticPairs, { annualRf: 0.03, model: 'henriksson-merton' });
assert(hmResult.hasSufficientData, 'HM has sufficient data');
assert(Math.abs(hmResult.alpha.monthly - trueAlphaHM) < 0.001, `HM alpha matches: ${hmResult.alpha.monthly.toFixed(5)} vs ${trueAlphaHM}`);
assert(Math.abs(hmResult.beta.value - trueBetaHM) < 0.01, `HM beta matches: ${hmResult.beta.value.toFixed(4)} vs ${trueBetaHM}`);
assert(Math.abs(hmResult.gamma.value - trueGammaHM) < 0.05, `HM gamma matches: ${hmResult.gamma.value.toFixed(4)} vs ${trueGammaHM}`);
assert(Math.abs(hmResult.beta.downsideBeta - (trueBetaHM - trueGammaHM)) < 0.05, `Downside beta matches ~0.80 (got ${hmResult.beta.downsideBeta.toFixed(2)})`);
assert(hmResult.gamma.tStat > 10, 'HM gamma t-stat > 10');
assert(hmResult.gamma.isSignificant, 'HM gamma is significant');
assert(hmResult.verdict.includes('Downside Protection'), 'Verdict confirms synthetic put option protection');
console.log(`✅ PASS: Henriksson-Merton recovered parameters: Up-Beta=${hmResult.beta.value.toFixed(2)}, Down-Beta=${hmResult.beta.downsideBeta.toFixed(2)}, γ=+${hmResult.gamma.value.toFixed(2)} (t=${hmResult.gamma.tStat.toFixed(1)})`);

// 3. Real Institutional Evaluation: QQQ vs SPY (329 Months)
assert(qqqVsSpy.marketTiming, 'Full manager analysis contains marketTiming object');
const qqqTM = qqqVsSpy.marketTiming.treynorMazuy;
const qqqHM = qqqVsSpy.marketTiming.henrikssonMerton;
assert.strictEqual(qqqTM.sampleSize, 329, '329 sample months analyzed');
assert(qqqTM.rSquared > 0.60, `High R^2 for QQQ vs SPY (got ${qqqTM.rSquared.toFixed(3)})`);
assert(Number.isFinite(qqqTM.gamma.value), 'TM gamma is a finite number');
assert(Number.isFinite(qqqHM.gamma.value), 'HM gamma is a finite number');
console.log(`QQQ vs SPY Treynor-Mazuy:  β=${qqqTM.beta.value.toFixed(3)}, γ=${qqqTM.gamma.value >= 0 ? '+' : ''}${qqqTM.gamma.value.toFixed(3)} (t=${qqqTM.gamma.tStat.toFixed(2)}, p=${qqqTM.gamma.pValue.toFixed(3)})`);
console.log(`QQQ vs SPY Henriksson-Merton: Up-β=${qqqHM.beta.value.toFixed(3)}, Down-β=${qqqHM.beta.downsideBeta.toFixed(3)}, γ=${qqqHM.gamma.value >= 0 ? '+' : ''}${qqqHM.gamma.value.toFixed(3)}`);
console.log(`Verdict: "${qqqTM.verdict}"`);
console.log('✅ PASS: Real institutional fund market timing regressions verified');

console.log('\n🎉 ALL MANAGER PERFORMANCE ENGINE TESTS PASSED SUCCESSFULLY!');
