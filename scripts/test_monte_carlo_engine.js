/**
 * Automated Unit & Statistical Tests for Monte Carlo Engine
 * Verifies random generation, bootstrap resampling, glide path interpolation,
 * sequence of returns stress risk, goals cash flow, and percentile aggregation.
 */

import {
  randomStandardNormal,
  sampleParameterizedReturn,
  sampleBootstrapReturns,
  applySequenceOfReturnsRisk,
  calculateGlidePathWeight,
  evaluateAnnualGoalsCashflow,
  getPercentile,
  buildHistogram,
  runMonteCarloSimulation,
  HISTORICAL_ANNUAL_INFLATION,
  CANONICAL_ASSET_CLASSES
} from '../monte-carlo/monte-carlo-engine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== RUNNING MONTE CARLO ENGINE TESTS ===\n');

// --- TEST 1: Random Standard Normal Distribution ---
console.log('--- TEST 1: Box-Muller Normal Distribution ---');
const nSamples = 10000;
let sum = 0;
let sumSq = 0;
for (let i = 0; i < nSamples; i++) {
  const z = randomStandardNormal();
  sum += z;
  sumSq += z * z;
}
const mean = sum / nSamples;
const variance = sumSq / nSamples - mean * mean;

assert(Math.abs(mean) < 0.05, `Sample mean is close to 0 (Actual: ${mean.toFixed(4)})`);
assert(Math.abs(variance - 1.0) < 0.08, `Sample variance is close to 1.0 (Actual: ${variance.toFixed(4)})`);

// --- TEST 2: Parameterized Return Sampling ---
console.log('\n--- TEST 2: Parameterized Return Sampling ---');
const paramMean = 0.10;
const paramStdev = 0.18;
let paramSum = 0;
for (let i = 0; i < nSamples; i++) {
  paramSum += sampleParameterizedReturn(paramMean, paramStdev);
}
const sampleAvg = paramSum / nSamples;
assert(Math.abs(sampleAvg - paramMean) < 0.015, `Parameterized average matches target ${paramMean} (Actual: ${sampleAvg.toFixed(4)})`);

// --- TEST 3: Bootstrap Resampling ---
console.log('\n--- TEST 3: Bootstrap Resampling ---');
const historicalSeries = [0.15, -0.05, 0.22, 0.08, -0.12, 0.28, 0.02, 0.18];
const sampledPath = sampleBootstrapReturns(historicalSeries, 30, 'singleYear');
assert(sampledPath.length === 30, 'Generated exactly 30 years of simulated returns');
assert(sampledPath.every(r => historicalSeries.includes(r)), 'All sampled returns originate from historical dataset');

const blockPath = sampleBootstrapReturns(historicalSeries, 20, 'blockYears', 2);
assert(blockPath.length === 20, 'Block bootstrap generated 20 years of returns');

// --- TEST 4: Linear Glide Path Transition ---
console.log('\n--- TEST 4: Linear Glide Path Transition ---');
// Career: 80% stocks, Retirement: 30% stocks. Retirement year: 30, Glide path: 10 years (begins yr 20)
const startW = 80;
const endW = 30;
const retireYr = 30;
const glideYrs = 10;

const wtYear10 = calculateGlidePathWeight(10, startW, endW, retireYr, glideYrs);
assert(wtYear10 === 80, `Year 10 (Career) maintains starting weight of 80% (Actual: ${wtYear10})`);

const wtYear20 = calculateGlidePathWeight(20, startW, endW, retireYr, glideYrs);
assert(wtYear20 === 80, `Year 20 (Glide path start) starts at 80% (Actual: ${wtYear20})`);

const wtYear25 = calculateGlidePathWeight(25, startW, endW, retireYr, glideYrs);
assert(Math.abs(wtYear25 - 55) < 0.01, `Year 25 (Mid-transition) is exactly 55% halfway (Actual: ${wtYear25})`);

const wtYear30 = calculateGlidePathWeight(30, startW, endW, retireYr, glideYrs);
assert(wtYear30 === 30, `Year 30 (Retirement) reaches ending weight of 30% (Actual: ${wtYear30})`);

const wtYear40 = calculateGlidePathWeight(40, startW, endW, retireYr, glideYrs);
assert(wtYear40 === 30, `Year 40 (Deep retirement) maintains 30% (Actual: ${wtYear40})`);

// --- TEST 5: Sequence of Returns Stress Testing ---
console.log('\n--- TEST 5: Sequence of Returns Stress Testing ---');
const rawSequence = [0.10, 0.05, -0.20, 0.15, -0.10, 0.25, 0.02, -0.05];
// Apply Worst 2 Years First starting at retirement year 2
const stressed = applySequenceOfReturnsRisk(rawSequence, 2, 2);
// Post retirement original: [-0.20, 0.15, -0.10, 0.25, 0.02, -0.05]
// Worst 2 returns are -0.20 and -0.10
assert(stressed[2] === -0.20, `Year 2 forced to worst return (-20%) (Actual: ${stressed[2]})`);
assert(stressed[3] === -0.10, `Year 3 forced to second worst return (-10%) (Actual: ${stressed[3]})`);
assert(stressed[0] === 0.10 && stressed[1] === 0.05, 'Pre-retirement returns remained unchanged');

// --- TEST 6: Financial Goals Cashflow Evaluator ---
console.log('\n--- TEST 6: Financial Goals Cashflow Evaluator ---');
const sampleGoals = [
  {
    id: 'g1',
    label: 'Career Savings',
    type: 'contribution',
    amount: 1000,
    frequency: 'monthly', // $12,000 / yr
    starts: 'immediate',
    duration: 'retirement',
    inflationAdjusted: false
  },
  {
    id: 'g2',
    label: 'College Tuition',
    type: 'withdrawal',
    amount: 25000,
    frequency: 'annual',
    starts: 'in_years',
    startYearsOffset: 5,
    duration: 'repeats',
    repeatCount: 4,
    inflationAdjusted: true
  }
];

// Year 2: only Career Savings ($12,000)
const cfYr2 = evaluateAnnualGoalsCashflow(2, sampleGoals, 1.05, 10, 30);
assert(cfYr2 === 12000, `Year 2 net cashflow is +$12,000 contribution (Actual: $${cfYr2})`);

// Year 6: Career savings ($12,000) minus College ($25,000 * 1.20 inflation = -$30,000) => net -$18,000
const cfYr6 = evaluateAnnualGoalsCashflow(6, sampleGoals, 1.20, 10, 30);
assert(cfYr6 === (12000 - 25000 * 1.20), `Year 6 net cashflow accounts for inflation-adjusted college withdrawal (Actual: $${cfYr6})`);

// --- TEST 7: Percentile Interpolation & Histograms ---
console.log('\n--- TEST 7: Percentile Interpolation & Histograms ---');
const testArray = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const p50 = getPercentile(testArray, 50);
assert(p50 === 55, `Median (50th percentile) of 10 items is 55 (Actual: ${p50})`);
const p90 = getPercentile(testArray, 90);
assert(p90 === 91, `90th percentile of 10 items is 91 (Actual: ${p90})`);

const hist = buildHistogram(testArray, 5);
assert(hist.bins.length === 5, 'Histogram created 5 bins');
assert(hist.bins.reduce((sum, b) => sum + b.count, 0) === 10, 'All 10 samples allocated to bins');

// --- TEST 8: Full End-to-End Monte Carlo Simulation Pipeline ---
console.log('\n--- TEST 8: Full End-to-End Simulation Pipeline ---');
const simResult = runMonteCarloSimulation({
  initialAmount: 100000,
  simulationPeriod: 20,
  numSimulations: 500,
  planningType: 'singleStage',
  startingAllocations: [{ ticker: 'US Stock Market', weight: 100 }],
  simulationModel: 'parameterized',
  goals: [
    {
      id: 'g1',
      type: 'contribution',
      amount: 500,
      frequency: 'monthly',
      starts: 'immediate',
      duration: 'all',
      inflationAdjusted: false
    }
  ],
  percentileIntervals: [10, 25, 50, 75, 90]
});

assert(simResult.percentileTrajectories['50'].length === 21, 'Trajectory generated 21 data points (Year 0 to 20)');
assert(simResult.percentileTrajectories['50'][0] === 100000, 'Starting balance at Year 0 is $100,000');
assert(simResult.percentileTrajectories['50'][20] > 100000, `Median portfolio grew above starting balance (Final Median: $${Math.round(simResult.percentileTrajectories['50'][20]).toLocaleString()})`);
assert(simResult.percentileTrajectories['90'][20] > simResult.percentileTrajectories['50'][20], '90th percentile exceeds 50th percentile');
assert(simResult.percentileTrajectories['50'][20] > simResult.percentileTrajectories['10'][20], '50th percentile exceeds 10th percentile');
assert(simResult.survivalRates.length === 21, 'Survival rates recorded for each year');
assert(simResult.survivalRates[20] > 90, `Survival rate is high for accumulation phase (Actual: ${simResult.survivalRates[20]}%)`);
assert(simResult.returnHistogram.bins.length > 0, 'Return distribution histogram generated');
assert(simResult.swrMatrix.length === 7, 'Safe withdrawal rate matrix computed for 7 tiers');

// --- TEST 9: Asset Liability Modeling (ALM) ---
console.log('\n--- TEST 9: Asset Liability Modeling (ALM) ---');
const almResult = runMonteCarloSimulation({
  initialAmount: 1000000,
  simulationPeriod: 20,
  numSimulations: 500,
  planningType: 'singleStage',
  startingAllocations: [{ ticker: 'US Stock Market', weight: 60 }, { ticker: 'Total Bond Market', weight: 40 }],
  simulationModel: 'parameterized',
  liabilityDiscountRate: 0.04,
  liabilities: [
    {
      id: 'l1',
      name: 'Pension Payout',
      type: 'recurring',
      startYear: 1,
      endYear: 20,
      amount: 40000,
      inflationAdjusted: true
    },
    {
      id: 'l2',
      name: 'Debt Service Payoff',
      type: 'lumpSum',
      startYear: 5,
      endYear: 5,
      amount: 100000,
      inflationAdjusted: false
    }
  ]
});

assert(almResult.fundedRatioPercentiles !== null, 'ALM generated funded ratio percentiles');
assert(almResult.fundedRatioPercentiles['50'].length === 21, 'Funded ratio trajectory spans 21 years (Year 0 to 20)');
assert(almResult.fundedRatioPercentiles['50'][0] > 100, `Year 0 initial funded ratio exceeds 100% (Actual: ${Math.round(almResult.fundedRatioPercentiles['50'][0])}%)`);
assert(almResult.deficitProbabilities !== null, 'Deficit probabilities generated');
assert(almResult.deficitProbabilities.length === 21, 'Deficit probabilities span 21 years');
assert(almResult.liabilityPVTrajectory !== null, 'Liability PV trajectory generated');
assert(almResult.liabilityPVTrajectory[0] > 0, `Initial liability PV is positive (Actual: $${Math.round(almResult.liabilityPVTrajectory[0]).toLocaleString()})`);
assert(almResult.annualOutflowsByYear !== null, 'Annual outflows tracked');
assert(almResult.annualOutflowsByYear[5] === 140000, `Year 5 outflow combines recurring $40k + lump $100k = $140k (Actual: $${almResult.annualOutflowsByYear[5]})`);

console.log('\n=============================================');
if (failed === 0) {
  console.log(`🎉 ALL ${passed} MONTE CARLO ENGINE TESTS PASSED SUCCESSFULLY!`);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED out of ${passed + failed}!`);
  process.exit(1);
}
