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
  rankFundProfiles,
  inferFundType,
  classifyFundTaxonomy,
  CANONICAL_ASSET_CLASSES,
  SUB_CATEGORIES_BY_ASSET_CLASS
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

// TEST 2B: Two-Tier Taxonomy & Fund Type Classification
console.log('\n--- TEST 2B: Fund Type Inference & Two-Tier Classification ---');
assert.strictEqual(inferFundType({ ticker: 'VOO', name: 'Vanguard S&P 500 ETF' }), 'ETF');
assert.strictEqual(inferFundType({ ticker: 'VTSAX', name: 'Vanguard Total Stock Market Index Fund Admiral Shares' }), 'Mutual Fund');
assert.strictEqual(inferFundType({ ticker: 'FXAIX', name: 'Fidelity 500 Index Fund' }), 'Mutual Fund');
assert.strictEqual(inferFundType({ ticker: 'UTF', name: 'Cohen & Steers Infrastructure Closed-End Fund' }), 'Closed-End Fund');

const taxVoo = classifyFundTaxonomy({ ticker: 'VOO', name: 'Vanguard S&P 500 ETF' });
assert.strictEqual(taxVoo.assetClass, 'U.S. Equity');
assert.strictEqual(taxVoo.category, 'Large Blend');

const taxBnd = classifyFundTaxonomy({ ticker: 'BND', name: 'Vanguard Total Bond Market ETF' });
assert.strictEqual(taxBnd.assetClass, 'Taxable Bond');
assert.strictEqual(taxBnd.category, 'Intermediate Core Bond');

const taxSchd = classifyFundTaxonomy({ ticker: 'SCHD', name: 'Schwab US Dividend Equity ETF' });
assert.strictEqual(taxSchd.assetClass, 'U.S. Equity');
assert.strictEqual(taxSchd.category, 'High Dividend');

assert.strictEqual(CANONICAL_ASSET_CLASSES.length, 11, 'All 11 canonical PV asset classes present');
assert(Array.isArray(SUB_CATEGORIES_BY_ASSET_CLASS['U.S. Equity']), 'U.S. Equity sub-categories available');
console.log('✅ PASS: Fund type inference (ETF, Mutual Fund, Closed-End Fund) and two-tier taxonomy verified');

// TEST 3: Multi-Factor Filtering
console.log('\n--- TEST 3: Multi-Factor Filtering Logic ---');
// 3A: Filter by Canonical Asset Class & Sub-Category
const usEquities = filterFundProfiles(profiles, { assetClass: 'U.S. Equity' });
assert.strictEqual(usEquities.length, 4, '4 preset funds are classified as U.S. Equity');

const largeGrowth = filterFundProfiles(profiles, { assetClass: 'U.S. Equity', subCategory: 'Large Growth' });
assert.strictEqual(largeGrowth.length, 1, 'Only QQQ matches U.S. Equity -> Large Growth');
assert.strictEqual(largeGrowth[0].ticker, 'QQQ', 'Matched ticker is QQQ');

const bonds = filterFundProfiles(profiles, { assetClass: 'Taxable Bond' });
assert.strictEqual(bonds.length, 1, 'BND matches Taxable Bond');
assert.strictEqual(bonds[0].ticker, 'BND', 'Matched ticker is BND');

// 3B: Filter by Fund Type & Expense Ratio
const allETFs = filterFundProfiles(profiles, { fundType: 'ETF' });
assert.strictEqual(allETFs.length, 5, 'All 5 core benchmarks inferred as ETF');

const lowCostFunds = filterFundProfiles(profiles, { maxExpenseRatio: 0.0010 }); // <= 0.10%
assert(lowCostFunds.some(f => f.ticker === 'VOO'), 'VOO (0.03%) passes <= 0.10% ER filter');
assert(!lowCostFunds.some(f => f.ticker === 'QQQ'), 'QQQ (0.20%) excluded by <= 0.10% ER filter');

// 3C: Filter by Sharpe Ratio Threshold
const highSharpe = filterFundProfiles(profiles, { minSharpe: 0.70 });
assert(highSharpe.length >= 1, 'At least one fund passes Sharpe >= 0.70 threshold');

// 3D: Filter by Max Drawdown Constraint
const lowDrawdown = filterFundProfiles(profiles, { maxDrawdown: -0.25 });
assert(lowDrawdown.some(f => f.ticker === 'BND'), 'BND passes max drawdown constraint (-25%)');
console.log('✅ PASS: Two-tier asset class & category, fund type, expense ratio, Sharpe, and drawdown filters verified');

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
