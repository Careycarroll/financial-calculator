/**
 * Unit Test Suite for Screener & Rankings Engine
 * Validates trailing return calculations, multi-factor screening, and percentile rankings.
 */

import assert from 'node:assert';
import { PRESET_BENCHMARKS } from '../dca-comparator/preset-funds.js';
import {
  calculateTrailingReturns,
  buildFundScreenerProfile,
  screenAndProfileFunds,
  filterFundProfiles,
  rankFundProfiles
} from '../asset-analytics/screener-engine.js';

console.log('=== RUNNING SCREENER & RANKINGS ENGINE TESTS ===\n');

const voo = PRESET_BENCHMARKS.find(b => b.ticker === 'VOO');
const qqq = PRESET_BENCHMARKS.find(b => b.ticker === 'QQQ');
const schd = PRESET_BENCHMARKS.find(b => b.ticker === 'SCHD');
const bnd = PRESET_BENCHMARKS.find(b => b.ticker === 'BND');

// TEST 1: Trailing Returns Computation
console.log('--- TEST 1: Trailing Returns (YTD, 1Y, 3Y, 5Y, CAGR) ---');
const qqqTrailing = calculateTrailingReturns(qqq.data, true);
assert(qqqTrailing.return1y !== null, 'QQQ has valid 1Y return');
assert(qqqTrailing.return3y !== null, 'QQQ has valid 3Y annualized return');
assert(qqqTrailing.return5y !== null, 'QQQ has valid 5Y annualized return');
assert(qqqTrailing.cagr > 0.08, 'QQQ long-term CAGR is positive and > 8%');
console.log(`✅ PASS: QQQ Trailing Returns => 1Y: ${(qqqTrailing.return1y * 100).toFixed(2)}% | 3Y: ${(qqqTrailing.return3y * 100).toFixed(2)}% | 5Y: ${(qqqTrailing.return5y * 100).toFixed(2)}% | Full CAGR: ${(qqqTrailing.cagr * 100).toFixed(2)}%`);

// TEST 2: Multi-Factor Profile Generation
console.log('\n--- TEST 2: Fund Screener Profiles against VOO Benchmark ---');
const profiles = screenAndProfileFunds(PRESET_BENCHMARKS, voo, { useDRIP: true, annualRf: 0.03 });
assert.strictEqual(profiles.length, 5, 'All 5 preset benchmarks profiled successfully');

const qProfile = profiles.find(p => p.ticker === 'QQQ');
assert(qProfile.beta > 1.0, 'QQQ Beta > 1.0 vs VOO');
assert(qProfile.sharpe > 0.5, 'QQQ Sharpe is positive');
assert(qProfile.upCapture > 1.0, 'QQQ Up-Capture is high');

const bndProfile = profiles.find(p => p.ticker === 'BND');
assert(bndProfile.volatility < qProfile.volatility, 'Bond volatility is significantly lower than equity');
console.log(`✅ PASS: Profiles generated: QQQ Beta: ${qProfile.beta.toFixed(2)}, Sharpe: ${qProfile.sharpe.toFixed(2)}, BND Vol: ${(bndProfile.volatility * 100).toFixed(2)}%`);

// TEST 3: Multi-Factor Filtering
console.log('\n--- TEST 3: Multi-Factor Filtering Logic ---');
// 3A: Filter by Asset Class
const techEquity = filterFundProfiles(profiles, { assetClass: 'Growth' });
assert.strictEqual(techEquity.length, 1, 'Only QQQ matches Growth class');
assert.strictEqual(techEquity[0].ticker, 'QQQ', 'Matched ticker is QQQ');

// 3B: Filter by Sharpe Ratio Threshold
const highSharpe = filterFundProfiles(profiles, { minSharpe: 0.70 });
assert(highSharpe.length >= 1, 'At least one fund passes Sharpe >= 0.70 threshold');

// 3C: Filter by Max Drawdown Constraint
const lowDrawdown = filterFundProfiles(profiles, { maxDrawdown: -0.25 });
assert(lowDrawdown.some(f => f.ticker === 'BND'), 'BND passes max drawdown constraint (-25%)');
console.log('✅ PASS: Asset class, Sharpe threshold, and max drawdown filters verified');

// TEST 4: Performance Leaderboard & Percentile Rankings
console.log('\n--- TEST 4: Ordinal & Percentile Rankings ---');
// Rank by Sharpe
const rankedBySharpe = rankFundProfiles(profiles, 'sharpe');
assert.strictEqual(rankedBySharpe[0].rank, 1, 'First entry has rank 1');
assert.strictEqual(rankedBySharpe[0].percentile, 100, 'Top ranked fund has 100th percentile');
assert(rankedBySharpe[0].sharpe >= rankedBySharpe[1].sharpe, 'Rank 1 Sharpe >= Rank 2 Sharpe');

// Rank by lowest Max Drawdown (least negative)
const rankedBySafety = rankFundProfiles(profiles, 'maxDrawdown');
assert.strictEqual(rankedBySafety[0].rank, 1, 'Safest fund is Rank 1');
assert(rankedBySafety[0].maxDrawdown >= rankedBySafety[1].maxDrawdown, 'Rank 1 maxDrawdown is closer to 0 than Rank 2');
assert.strictEqual(rankedBySafety[0].ticker, 'BND', 'BND is safest fund with lowest max drawdown');

console.log(`✅ PASS: Top Sharpe: ${rankedBySharpe[0].ticker} (${rankedBySharpe[0].sharpe.toFixed(2)}) | Safest: ${rankedBySafety[0].ticker} (DD: ${(rankedBySafety[0].maxDrawdown * 100).toFixed(2)}%)`);

console.log('\n🎉 ALL SCREENER & RANKINGS ENGINE TESTS PASSED SUCCESSFULLY!');
