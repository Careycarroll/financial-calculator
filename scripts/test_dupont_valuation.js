import assert from "node:assert";
import { evaluateStock, calculateDuPont5Stage, calculateMultiYearDuPont, getDuPontPresets, assessEarningsQuality } from "../js/valuator.js";

console.log("==================================================================");
console.log("TEST SUITE: 5-Stage DuPont ROE Decomposition & Operational Quality");
console.log("References: Bodie, Kane & Marcus, Investments, Chapter 19.4");
console.log("==================================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------
// Test 1: Mathematical Multiplicative Identity Proof
// -----------------------------------------------------------------
runTest("Test 1: Mathematical Identity (∏ Stages 1-5 ≡ ROE) holds exactly", () => {
  const params = {
    netIncome: 96995,
    ebt: 113736,
    ebit: 114301,
    sales: 383285,
    totalAssets: 352583,
    totalEquity: 62146,
    totalDebt: 106000
  };

  const res = calculateDuPont5Stage(params);

  const directROE = params.netIncome / params.totalEquity;
  const product = res.stages.taxBurden *
                  res.stages.interestBurden *
                  res.stages.operatingMargin *
                  res.stages.assetTurnover *
                  res.stages.financialLeverage;

  assert(Math.abs(product - directROE) < 1e-12, `Residual too large: ${Math.abs(product - directROE)}`);
  assert.strictEqual(res.ratios.identityResidual < 1e-12, true);
  assert(Math.abs(res.ratios.roe - directROE) < 1e-12);
  assert(Math.abs(res.ratios.reconstructedROE - directROE) < 1e-12);

  // Bodie intermediate bridges
  const operatingROA = res.stages.operatingMargin * res.stages.assetTurnover;
  assert(Math.abs(operatingROA - (params.ebit / params.totalAssets)) < 1e-12);
  assert(Math.abs(res.ratios.compoundROA - (params.ebit / params.totalAssets)) < 1e-12);

  const netROA = res.stages.taxBurden * res.stages.interestBurden * operatingROA;
  assert(Math.abs(netROA - (params.netIncome / params.totalAssets)) < 1e-12);
  assert(Math.abs(res.ratios.netROA - (params.netIncome / params.totalAssets)) < 1e-12);
});

// -----------------------------------------------------------------
// Test 2: Institutional Archetype Presets Verification
// -----------------------------------------------------------------
runTest("Test 2: Institutional Archetype Presets (AAPL, COST, NEE, DEBT)", () => {
  const presets = getDuPontPresets();
  assert(Array.isArray(presets));
  assert(presets.length >= 4);

  // 1. Apple: High Operating Margin
  const aaplPreset = presets.find(p => p.id === 'aapl');
  assert(aaplPreset);
  const aaplRes = calculateDuPont5Stage(aaplPreset.data);
  assert(aaplRes.stages.operatingMargin > 0.25, `Expected AAPL operating margin > 25%, got ${(aaplRes.stages.operatingMargin*100).toFixed(1)}%`);
  assert(aaplRes.ratios.roe > 1.0, `Expected AAPL ROE > 100%, got ${(aaplRes.ratios.roe*100).toFixed(1)}%`);
  assert(aaplRes.ratios.identityResidual < 1e-12);
  assert.strictEqual(aaplRes.quality.qualityRating.includes('High Quality'), true);

  // 2. Costco: Capital Velocity (High Asset Turnover)
  const costPreset = presets.find(p => p.id === 'cost');
  assert(costPreset);
  const costRes = calculateDuPont5Stage(costPreset.data);
  assert(costRes.stages.assetTurnover > 3.0, `Expected COST asset turnover > 3.0x, got ${costRes.stages.assetTurnover.toFixed(2)}x`);
  assert(costRes.stages.operatingMargin < 0.05, `Expected COST operating margin < 5%, got ${(costRes.stages.operatingMargin*100).toFixed(1)}%`);
  assert(costRes.ratios.identityResidual < 1e-12);
  assert.strictEqual(costRes.quality.primaryDriver.includes('Asset Velocity'), true);

  // 3. NextEra: Leveraged Capital-Intensive Utility
  const neePreset = presets.find(p => p.id === 'nee');
  assert(neePreset);
  const neeRes = calculateDuPont5Stage(neePreset.data);
  assert(neeRes.stages.financialLeverage > 3.0, `Expected NEE leverage > 3.0x, got ${neeRes.stages.financialLeverage.toFixed(2)}x`);
  assert(neeRes.stages.assetTurnover < 0.25, `Expected NEE asset turnover < 0.25x, got ${neeRes.stages.assetTurnover.toFixed(2)}x`);
  assert(neeRes.ratios.identityResidual < 1e-12);

  // 4. DEBT: Artificial ROE Inflation via Financial Leverage Warning
  const debtPreset = presets.find(p => p.id === 'leveraged-distress');
  assert(debtPreset);
  const debtRes = calculateDuPont5Stage(debtPreset.data);
  assert(debtRes.stages.financialLeverage > 5.0, `Expected DEBT leverage > 5.0x, got ${debtRes.stages.financialLeverage.toFixed(2)}x`);
  assert.strictEqual(debtRes.quality.isLeverageInflated, true);
  assert.strictEqual(debtRes.quality.primaryDriver.includes('Financial Gearing'), true);
  assert.strictEqual(debtRes.quality.flags.some(f => f.title.includes('Severe Financial Gearing')), true);
});

// -----------------------------------------------------------------
// Test 3: Quality of Earnings Diagnostics & Edge Cases
// -----------------------------------------------------------------
runTest("Test 3: Quality of Earnings Diagnostics & Windfall Edge Cases", () => {
  // Transitory tax windfall scenario: 98% Tax Burden (minimal/negative taxes)
  const taxWindfallRes = calculateDuPont5Stage({
    netIncome: 980,
    ebt: 1000,
    ebit: 1100,
    sales: 10000,
    totalAssets: 8000,
    totalEquity: 4000
  });
  assert(taxWindfallRes.quality.isTaxInflated);
  assert.strictEqual(taxWindfallRes.quality.flags.some(f => f.title.includes('Transitory Tax Burden')), true);

  // Distressed company: negative operating profit
  const distressedRes = calculateDuPont5Stage({
    netIncome: -500,
    ebt: -450,
    ebit: -300,
    sales: 5000,
    totalAssets: 6000,
    totalEquity: 2000
  });
  assert.strictEqual(distressedRes.quality.qualityRating.includes('Low Quality') || distressedRes.quality.qualityRating.includes('Distressed'), true);
  assert.strictEqual(distressedRes.quality.flags.some(f => f.title.includes('Negative Operating Profitability')), true);
});

// -----------------------------------------------------------------
// Test 4: Multi-Year Historical Trajectory & Logarithmic Attribution
// -----------------------------------------------------------------
runTest("Test 4: Multi-Year Historical DuPont & Logarithmic Delta Attribution", () => {
  const aaplPreset = getDuPontPresets().find(p => p.id === 'aapl');
  const multiYear = calculateMultiYearDuPont(
    aaplPreset.history.map(h => ({
      calendarYear: h.year,
      revenue: h.sales,
      operatingIncome: h.ebit,
      ebt: h.ebt,
      netIncome: h.netIncome
    })),
    aaplPreset.history.map(h => ({
      totalAssets: h.totalAssets,
      totalEquity: h.totalEquity
    }))
  );

  assert.strictEqual(multiYear.periods.length, 3);
  multiYear.periods.forEach(p => {
    assert(p.ratios.identityResidual < 1e-12);
  });

  const a = multiYear.attribution;
  assert(a !== null);
  assert.strictEqual(a.baseYear, '2021');
  assert.strictEqual(a.latestYear, '2023');

  // Verify logarithmic decomposition identity:
  // dLogROE == dLogTB + dLogIB + dLogOM + dLogATO + dLogFL
  const sumDLog = a.logDecomposition.dLogTB +
                  a.logDecomposition.dLogIB +
                  a.logDecomposition.dLogOM +
                  a.logDecomposition.dLogATO +
                  a.logDecomposition.dLogFL;
  assert(Math.abs(a.logDecomposition.dLogROE - sumDLog) < 1e-12, `Log identity residual: ${Math.abs(a.logDecomposition.dLogROE - sumDLog)}`);
});

// -----------------------------------------------------------------
// Test 5: End-to-End Stock Evaluator Integration
// -----------------------------------------------------------------
runTest("Test 5: evaluateStock attaches DuPont current & multi-year results", () => {
  const aaplPreset = getDuPontPresets().find(p => p.id === 'aapl');
  const stockData = {
    symbol: "AAPL",
    provider: "Mock Provider",
    profile: {
      price: aaplPreset.data.price,
      marketCap: aaplPreset.data.marketCap,
      sharesOutstanding: aaplPreset.data.sharesOutstanding,
      sector: aaplPreset.sector,
      industry: "Consumer Electronics",
      beta: 1.15
    },
    income: [
      {
        revenue: aaplPreset.data.sales,
        operatingIncome: aaplPreset.data.ebit,
        ebt: aaplPreset.data.ebt,
        netIncome: aaplPreset.data.netIncome,
        ebitda: aaplPreset.data.ebit * 1.15,
        eps: aaplPreset.data.netIncome / aaplPreset.data.sharesOutstanding
      }
    ],
    balance: [
      {
        totalAssets: aaplPreset.data.totalAssets,
        totalEquity: aaplPreset.data.totalEquity,
        totalDebt: aaplPreset.data.totalDebt,
        cashAndEquivalents: 30000000000
      }
    ],
    cashflow: [
      {
        freeCashFlow: 100000000000,
        dividendsPaid: 15000000000
      }
    ]
  };

  const results = evaluateStock(stockData);
  assert(results.dupont, "results.dupont should be populated");
  assert(results.dupont.current, "results.dupont.current should be populated");
  assert(results.dupont.current.ratios.identityResidual < 1e-12);
  assert(results.dupont.current.stages.taxBurden > 0);
  assert(results.dupont.current.stages.interestBurden > 0);
  assert(results.dupont.current.stages.operatingMargin > 0);
  assert(results.dupont.current.stages.assetTurnover > 0);
  assert(results.dupont.current.stages.financialLeverage > 0);
  assert(results.verdict, "results.verdict should remain intact");
});

console.log(`\nTests passed: ${passed} / ${passed + failed}`);
if (failed > 0) {
  process.exit(1);
}
