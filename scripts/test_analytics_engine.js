/**
 * Unit Test Suite for Asset Analytics Engine
 * Validates Growth of $10k, Annual Calendar Returns, Drawdown Episodes,
 * Monthly Heatmap Matrix, Rolling Windows, VaR/CVaR, and Diagnostic Verdicts.
 */

import assert from 'node:assert';
import {
  calculateGrowthOf10k,
  calculateFundFeeDrag,
  calculateAnnualReturns,
  calculateDrawdownEpisodes,
  calculateMonthlyCalendarHeatmap,
  calculateRollingMetrics,
  calculateVaRAndCVaR,
  generateSimpleVerdict,
  computeMonthlyReturns
} from '../asset-analytics/analytics-engine.js';
import {
  inverseNormalCdf,
  normalPdf,
  calculateMoments,
  calculateHistoricalVaR,
  calculateHistoricalCVaR,
  calculateParametricVaR,
  calculateParametricCVaR,
  calculateCornishFisherVaR,
  calculateCornishFisherCVaR,
  computeTailRiskMetrics
} from '../asset-analytics/tail-risk.js';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import { FINANCIAL_TERMS } from '../js/financial-terms.js';

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

// TEST 8: Educational Suite Financial Terms Definitions
console.log('\n--- TEST 8: Financial Terms Glossary Definitions ---');
const requiredTerms = [
  'cagr', 'volatility', 'sharpeRatio', 'sortinoRatio', 'calmarRatio',
  'maxDrawdown', 'ulcerIndex', 'martinRatio', 'omegaRatio', 'gainToPain',
  'var95', 'cvar95', 'alpha', 'beta', 'rSquared',
  'upCapture', 'downCapture', 'captureRatio', 'correlation', 'rollingCorrelation',
  'autocorrelation', 'lag1Momentum', 'lag3Cycle', 'lag12Seasonality',
  'cointegration', 'adfStatistic', 'hedgeRatio'
];
for (const term of requiredTerms) {
  assert(FINANCIAL_TERMS[term], `Financial term "${term}" must exist in FINANCIAL_TERMS`);
  assert(FINANCIAL_TERMS[term].term && FINANCIAL_TERMS[term].term.length > 0, `Term "${term}" has title/term`);
  assert(FINANCIAL_TERMS[term].definition && FINANCIAL_TERMS[term].definition.length > 20, `Term "${term}" has informative definition`);
}
console.log(`✅ PASS: All ${requiredTerms.length} educational glossary terms verified with titles and definitions.`);

// TEST 9: Fund Cost & Fee Drag Suite Modeling
console.log('\n--- TEST 9: Fund Cost & Fee Drag Suite Modeling ---');
const feeDrag = calculateFundFeeDrag(vooReturns, '0.03%', 10000);
assert(feeDrag.annualExpenseRatio === 0.03, 'Expense ratio parsed as 0.03%');
assert(feeDrag.compoundedFeeDrag > 0, 'Compounded fee drag is greater than $0');
assert(feeDrag.compoundedFeeDrag >= feeDrag.totalFeesPaid, 'Compounded fee drag includes lost opportunity compounding');
assert(feeDrag.grossFinal > feeDrag.netFinal, '0%-fee gross final balance exceeds net balance');

// Reconstructed Growth with Fee
const growthWithFee = calculateGrowthOf10k(vooReturns, null, 10000, { annualExpenseRatio: '0.03%' });
assert(growthWithFee.length === vooReturns.length + 1, 'Growth series has T=0 plus all return months');
const lastGrowth = growthWithFee[growthWithFee.length - 1];
assert(lastGrowth.grossFundGrowth > lastGrowth.fundGrowth, 'Gross fund growth strictly exceeds net fund growth');

// Verdict with Fee Drag Info
const verdictWithFee = generateSimpleVerdict(dummyProfile, dummyBench, ddResult.topEpisodes, rolling, feeDrag);
assert(verdictWithFee.feeVerdict.includes('Expense Ratio'), 'Verdict includes expense ratio commentary');
console.log(`✅ PASS: Fee drag calculated: Direct Fees $${feeDrag.totalFeesPaid} | Total Drag $${feeDrag.compoundedFeeDrag} | Opp Cost $${feeDrag.lostOpportunityCost}`);
console.log(`   Fee Verdict: ${verdictWithFee.feeVerdict}`);

// TEST 10: Value at Risk (VaR) & Expected Shortfall (CVaR) with Cornish-Fisher Tail Expansion (Issue #123)
console.log('\n--- TEST 10: VaR, Expected Shortfall (CVaR) & Cornish-Fisher Expansion ---');

// 1. Inverse Normal CDF Accuracy Check
const z95 = inverseNormalCdf(0.95);
const z99 = inverseNormalCdf(0.99);
assert(Math.abs(z95 - 1.6448536) < 1e-6, `Inverse normal CDF 95% critical value: ${z95}`);
assert(Math.abs(z99 - 2.3263479) < 1e-6, `Inverse normal CDF 99% critical value: ${z99}`);
console.log(`✅ PASS: Acklam inverse normal CDF precision verified (z_95 = ${z95.toFixed(6)}, z_99 = ${z99.toFixed(6)})`);

// 2. Normal Distribution Identity: Cornish-Fisher identically collapses to Gaussian when S = 0 and K = 0
const testMean = 0.01;
const testStd = 0.045;
const paramVaR95 = calculateParametricVaR(testMean, testStd, 0.95);
const cfVaR95_normal = calculateCornishFisherVaR(testMean, testStd, 0, 0, 0.95);
assert(Math.abs(paramVaR95 - cfVaR95_normal) < 1e-10, `Normal identity: Parametric ${paramVaR95} == CF ${cfVaR95_normal}`);

const paramCVaR95 = calculateParametricCVaR(testMean, testStd, 0.95);
const cfCVaR95_normal = calculateCornishFisherCVaR(testMean, testStd, 0, 0, 0.95, 200);
assert(Math.abs(paramCVaR95 - cfCVaR95_normal) < 0.0005, `Normal CVaR identity: Parametric ${paramCVaR95.toFixed(4)} matches integrated CF ${cfCVaR95_normal.toFixed(4)}`);
console.log('✅ PASS: Cornish-Fisher expansion satisfies exact Gaussian identity when S = 0 and K = 0');

// 3. Negative Skewness & Fat-Tail Stress Test (Bodie Section 5.5)
// Negative skewness and positive kurtosis must strictly penalize the portfolio (mVaR > Parametric VaR)
const fatTailSkew = -0.65; // negative left-tail crash skew
const fatTailKurt = 3.50; // fat tails (leptokurtosis)
const mVaR95 = calculateCornishFisherVaR(testMean, testStd, fatTailSkew, fatTailKurt, 0.95);
const mCVaR95 = calculateCornishFisherCVaR(testMean, testStd, fatTailSkew, fatTailKurt, 0.95);
assert(mVaR95 > paramVaR95, `Modified VaR (${(mVaR95*100).toFixed(2)}%) strictly exceeds Gaussian VaR (${(paramVaR95*100).toFixed(2)}%) under crash risk`);
assert(mCVaR95 > mVaR95, `Expected Shortfall CVaR strictly exceeds VaR threshold (${(mCVaR95*100).toFixed(2)}% > ${(mVaR95*100).toFixed(2)}%)`);
console.log(`✅ PASS: Left-tail crash risk penalizes VaR from ${(paramVaR95*100).toFixed(2)}% to ${(mVaR95*100).toFixed(2)}% (mCVaR = ${(mCVaR95*100).toFixed(2)}%)`);

// 4. Real Benchmark Validation on VOO and QQQ Returns
const vooRaw = vooReturns.map(r => r.return);
const vooTail = computeTailRiskMetrics(vooRaw);
assert(vooTail.hasSufficientData, 'VOO tail risk metrics computed');
assert(vooTail.moments.count === vooRaw.length, 'Correct sample observation count');
assert(vooTail.var95.historical > 0.02 && vooTail.var95.historical < 0.15, 'VOO Historical VaR 95% is realistic (2% - 15%)');
assert(vooTail.cvar95.historical >= vooTail.var95.historical, 'VOO Historical CVaR >= VaR');
assert(vooTail.var99.cornishFisher > vooTail.var95.cornishFisher, '99% VaR strictly exceeds 95% VaR');
console.log(`VOO Tail Risk Report (N = ${vooTail.sampleSize} Months):`);
console.log(`  Skewness: ${vooTail.moments.skewness.toFixed(3)} | Excess Kurtosis: ${vooTail.moments.excessKurtosis.toFixed(3)}`);
console.log(`  95% Historical VaR: ${(vooTail.var95.historical * 100).toFixed(2)}% | 95% Cornish-Fisher VaR: ${(vooTail.var95.cornishFisher * 100).toFixed(2)}%`);
console.log(`  95% Historical CVaR: ${(vooTail.cvar95.historical * 100).toFixed(2)}% | 95% Cornish-Fisher CVaR: ${(vooTail.cvar95.cornishFisher * 100).toFixed(2)}%`);
console.log(`  Diagnosis: "${vooTail.tailRiskSeverity}" (Ratio CF/Param: ${vooTail.ratioCFtoParam95.toFixed(3)})`);
console.log('✅ PASS: Real institutional fund tail risk validation complete');

console.log('\n🎉 ALL ASSET ANALYTICS TESTS PASSED SUCCESSFULLY!');
