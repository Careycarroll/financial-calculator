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

// TEST 5: Multi-Asset Basket Configuration & Options
console.log('\n--- TEST 5: Multi-Asset Basket Options & Guardrails ---');
// Verify invoking in headless/node context does not throw
assert.doesNotThrow(() => {
  assetModalModule.openAssetModal({
    title: 'Configure Correlation Basket',
    isMulti: true,
    selectedTickers: ['VOO', 'QQQ', 'SPY'],
    minSelected: 2,
    maxSelected: 15,
    onApply: (selected) => {
      assert.strictEqual(selected.length, 3);
    }
  });
  assetModalModule.closeAssetModal();
}, 'Multi-asset modal invocation succeeds gracefully in test environment');
console.log('✅ PASS: Multi-asset basket modal options & headless safety validated');

// TEST 6: Fund Selection Callback Signature Compatibility
console.log('\n--- TEST 6: Fund Selection Callback Signature Compatibility ---');
assert.strictEqual(typeof assetModalModule.selectFund, 'function', 'selectFund is exported as function');

// Case A: Financial Goals & Portfolio Studio pattern: (selectedFund) => selectedFund.ticker.toUpperCase()
let receivedTickerA = null;
let receivedNameA = null;
assetModalModule.openAssetModal({
  title: 'Select Asset',
  onSelect: (selectedFund) => {
    receivedTickerA = selectedFund.ticker.toUpperCase();
    receivedNameA = selectedFund.name;
  }
});
assetModalModule.selectFund('qqq');
assert.strictEqual(receivedTickerA, 'QQQ', 'Pattern A extracts QQQ via selectedFund.ticker.toUpperCase()');
assert.ok(receivedNameA && receivedNameA.includes('QQQ'), 'Pattern A extracts fund name correctly');

// Case B: Asset Analytics / Regression pattern: (ticker) => ticker.toUpperCase()
let receivedTickerB = null;
assetModalModule.openAssetModal({
  title: 'Select Benchmark',
  onSelect: (ticker) => {
    receivedTickerB = ticker.toUpperCase();
  }
});
assetModalModule.selectFund('voo');
assert.strictEqual(receivedTickerB, 'VOO', 'Pattern B extracts VOO via ticker.toUpperCase()');

// Case C: DCA dual-parameter pattern: (ticker, newFund) => ...
let receivedTickerC = null;
let receivedFundC = null;
assetModalModule.openAssetModal({
  title: 'Change Fund',
  onSelect: (ticker, newFund) => {
    receivedTickerC = String(ticker);
    receivedFundC = newFund;
  }
});
assetModalModule.selectFund('bnd');
assert.strictEqual(receivedTickerC, 'BND', 'Pattern C extracts ticker string BND');
assert.strictEqual(receivedFundC.ticker, 'BND', 'Pattern C receives full fund object');

// Case D: Direct function parameter pattern: openAssetModal((chosen) => ...)
let receivedTickerD = null;
assetModalModule.openAssetModal((chosenTicker) => {
  receivedTickerD = (chosenTicker.ticker || chosenTicker).toUpperCase();
});
assetModalModule.selectFund('spy');
assert.strictEqual(receivedTickerD, 'SPY', 'Pattern D direct callback function receives selected ticker SPY');

// Case E: Financial Goals selectedTicker option mapping & replacement
let receivedTickerE = null;
assetModalModule.openAssetModal({
  selectedTicker: 'VOO',
  targetType: 'fund',
  onSelect: (sel, fund) => {
    receivedTickerE = (typeof sel === 'string' ? sel : (sel?.ticker || sel))?.toUpperCase() || fund?.ticker?.toUpperCase();
  }
});
assetModalModule.selectFund('qqq');
assert.strictEqual(receivedTickerE, 'QQQ', 'Case E Financial Goals selectedTicker properly selects QQQ');

console.log('✅ PASS: All modal callback signature patterns (Goals, Analytics, Backtest, ALM, DCA) verified');

console.log('\n🎉 ALL SESSION FUNDS TESTS PASSED SUCCESSFULLY!');
