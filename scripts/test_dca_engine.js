/**
 * Automated test suite for DCA Backtest Engine
 */

import {
  parseCSV,
  resampleToMonthly,
  findCommonDateRange,
  alignSeries,
  simulateDCA,
  solveIRR
} from '../dca-comparator/dca-engine.js';

import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    process.exit(1);
  } else {
    console.log('✅ PASS:', message);
  }
}

console.log('--- TEST 1: CSV Parser ---');
const yahooCSV = `Date,Open,High,Low,Close,Adj Close,Volume
2023-01-03,380.0,385.0,379.0,383.5,375.0,1000
2023-01-04,384.0,386.0,383.0,385.2,376.8,1200
2023-02-01,390.0,392.0,388.0,391.0,382.5,1500
2023-03-01,395.0,398.0,394.0,397.0,388.4,1100`;

const parsed = parseCSV(yahooCSV, 'my_fund.csv');
assert(parsed.ticker === 'MY_FUND', 'Ticker extracted from filename');
assert(parsed.rows.length === 4, 'All 4 rows parsed');
assert(parsed.rows[0].adjClose === 375.0, 'First adjClose parsed');
assert(parsed.rows[0].close === 383.5, 'First close parsed');

console.log('\n--- TEST 1B: Stooq Format Parser ---');
const stooqText = `<TICKER>,<PER>,<DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<VOL>,<OPENINT>
VOO.US,D,20220103,000000,439.1,440.5,437.2,439.8,12345,0
VOO.US,D,20220104,000000,440.0,441.2,438.9,440.1,15432,0
VOO.US,D,20220201,000000,412.3,415.0,410.2,414.6,18921,0`;

const parsedStooq = parseCSV(stooqText, 'voo.us.txt');
assert(parsedStooq.ticker === 'VOO', 'Ticker VOO extracted from voo.us.txt');
assert(parsedStooq.rows.length === 3, 'All 3 Stooq rows parsed');
assert(parsedStooq.rows[0].date === '2022-01-03', 'Stooq compact date 20220103 normalized to 2022-01-03');
assert(parsedStooq.rows[0].close === 439.8, 'Stooq close parsed');

console.log('\n--- TEST 2: Monthly Resampling ---');
const monthly = resampleToMonthly(parsed.rows);
assert(monthly.length === 3, 'Resampled 4 daily rows into 3 monthly rows (Jan, Feb, Mar)');
assert(monthly[0].date === '2023-01', 'First month is 2023-01');
assert(monthly[0].firstTradingDate === '2023-01-03', 'First trading day selected');
assert(monthly[0].adjClose === 375.0, 'Takes first trading day adjClose');

console.log('\n--- TEST 3: Common Date Range & Bottleneck ---');
const voo = PRESET_BENCHMARKS.find(p => p.ticker === 'VOO');
const spy = PRESET_BENCHMARKS.find(p => p.ticker === 'SPY');
const schd = PRESET_BENCHMARKS.find(p => p.ticker === 'SCHD');

const common = findCommonDateRange([voo, spy, schd]);
assert(common.start === '2011-10', 'Common start correctly identified as SCHD inception (2011-10)');
assert(common.end === '2026-08', 'Common end correctly identified as 2026-08');
assert(common.limitingFund === 'SCHD', 'Limiting fund identified as SCHD');

console.log('\n--- TEST 4: Calendar Date Alignment ---');
const alignedCalendar = alignSeries([voo, spy, schd], { mode: 'calendar' });
assert(alignedCalendar.dates.length === 179, '179 aligned months found');
assert(alignedCalendar.series.length === 3, '3 series aligned');
assert(alignedCalendar.series[0].data[0].date === '2011-10', 'First aligned date is 2011-10');

console.log('\n--- TEST 5: Elapsed Time Alignment ---');
const alignedElapsed = alignSeries([voo, spy, schd], { mode: 'elapsed' });
assert(alignedElapsed.dates.length === schd.data.length, 'Elapsed alignment bounded by shortest fund');
assert(alignedElapsed.dates[0] === 'Yr 0', 'Elapsed starts at Yr 0 (Month 0)');

console.log('\n--- TEST 6: Monthly DCA Simulation & Math ---');
const simResult = simulateDCA(alignedCalendar.series[0].data, {
  initialBalance: 1000,
  monthlyDeposit: 500,
  useDRIP: true
});
assert(simResult.trajectory.length === 179, '179 trajectory steps');
assert(simResult.metrics.totalInvested === 1000 + 178 * 500, 'Total invested = $1,000 + 178 * $500 = $90,000');
assert(simResult.metrics.finalBalance > simResult.metrics.totalInvested, 'Portfolio experienced positive growth');
assert(simResult.metrics.totalReturnPct > 0, 'Total return percentage is positive');
assert(simResult.metrics.cagrPct > 10 && simResult.metrics.cagrPct < 20, 'CAGR is within realistic equity range (10-20%)');
assert(simResult.metrics.irrPct > 10 && simResult.metrics.irrPct < 20, 'Money-weighted IRR is within realistic equity range (10-20%)');

console.log('\n--- TEST 7: DRIP vs Non-DRIP Compounding ---');
const simDRIP = simulateDCA(schd.data, { initialBalance: 1000, monthlyDeposit: 500, useDRIP: true });
const simNoDRIP = simulateDCA(schd.data, { initialBalance: 1000, monthlyDeposit: 500, useDRIP: false });
assert(simDRIP.metrics.finalBalance > simNoDRIP.metrics.finalBalance, 'DRIP (Adj Close) ending balance exceeds non-DRIP (Close) ending balance');
console.log(`SCHD DRIP Final: $${simDRIP.metrics.finalBalance.toLocaleString()} vs No-DRIP Final: $${simNoDRIP.metrics.finalBalance.toLocaleString()}`);

console.log('\n--- TEST 8: Newton-Raphson IRR Solver ---');
const testCashFlows = [
  { tYears: 0, amount: -1000 },
  { tYears: 1, amount: 1100 }
];
const testIRR = solveIRR(testCashFlows);
assert(Math.abs(testIRR - 0.10) < 0.0001, 'Simple 1-year 10% cash flow returns exactly 10.00% IRR');

console.log('\n🎉 ALL ENGINE TESTS PASSED SUCCESSFULLY!');
