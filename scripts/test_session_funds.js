/**
 * Unit Test Suite for Session Funds Repository
 * Validates default 5 presets, session lifecycle, and reset functionality.
 */

import assert from 'node:assert';
import {
  initSessionFunds,
  getAllFundsSync,
  resetSessionToDefault,
  deleteSessionFund,
  subscribeSessionFunds
} from '../js/session-funds.js';

console.log('=== RUNNING SESSION FUNDS REPOSITORY TESTS ===\n');

// TEST 1: Initial Default 5 Benchmarks
console.log('--- TEST 1: Default 5 Core Benchmarks ---');
await initSessionFunds();
const initialFunds = getAllFundsSync();
assert.strictEqual(initialFunds.length, 5, 'Default funds count is exactly 5');

const expectedTickers = ['VOO', 'SPY', 'QQQ', 'SCHD', 'BND'];
expectedTickers.forEach(t => {
  assert(initialFunds.some(f => f.ticker === t), `Default preset includes ${t}`);
});
console.log('✅ PASS: Exactly 5 default benchmarks present (VOO, SPY, QQQ, SCHD, BND)');

// TEST 2: Reset Session Restores Default 5
console.log('\n--- TEST 2: Reset Session to Default 5 ---');
let notified = false;
const unsubscribe = subscribeSessionFunds((funds) => {
  notified = true;
  assert.strictEqual(funds.length, 5, 'Notification received with 5 funds');
});

const afterReset = await resetSessionToDefault();
assert.strictEqual(afterReset.length, 5, 'Reset returns 5 funds');
assert(notified, 'Subscribers notified of reset');
unsubscribe();
console.log('✅ PASS: Session reset verified and subscriber notification confirmed');

// TEST 3: Delete Session Fund
console.log('\n--- TEST 3: Delete Session Fund ---');
const afterDelete = await deleteSessionFund('NONEXISTENT');
assert.strictEqual(afterDelete.length, 5, 'Core 5 remain intact');
console.log('✅ PASS: Delete session fund executed gracefully');

// TEST 4: Shared Asset Modal Module
console.log('\n--- TEST 4: Shared Asset Modal Module ---');
const assetModalModule = await import('../js/asset-modal.js');
assert.strictEqual(typeof assetModalModule.openAssetModal, 'function', 'openAssetModal is exported as function');
assert.strictEqual(typeof assetModalModule.closeAssetModal, 'function', 'closeAssetModal is exported as function');
console.log('✅ PASS: Shared Asset Modal controller exports validated');

console.log('\n🎉 ALL SESSION FUNDS TESTS PASSED SUCCESSFULLY!');
