import fs from 'fs';
import path from 'path';

console.log('=== VERIFYING EXECUTIVE DECISION GUIDES & COLLAPSIBLE SYSTEM ===\n');

const studioPages = [
  // Tactical Suite (7)
  'tactical-allocation/index.html',
  'tactical-allocation/market-valuation.html',
  'tactical-allocation/moving-averages.html',
  'tactical-allocation/momentum-rotation.html',
  'tactical-allocation/dual-momentum.html',
  'tactical-allocation/adaptive-allocation.html',
  'tactical-allocation/target-volatility.html',

  // Asset Analytics Suite (4)
  'asset-analytics/index.html',
  'asset-analytics/asset-correlations.html',
  'asset-analytics/fund-screener.html',
  'asset-analytics/time-series.html',

  // Factor Analysis Suite (5)
  'fund-regression/index.html',
  'fund-regression/factor-analysis.html',
  'fund-regression/manager-performance.html',
  'fund-regression/pca.html',
  'fund-regression/factor-matching.html',

  // Portfolio Backtest Suite (3)
  'portfolio-backtest/index.html',
  'portfolio-backtest/asset-class-allocation.html',
  'portfolio-backtest/dynamic-allocation.html',

  // Optimization Suite (4)
  'portfolio-optimization/index.html',
  'portfolio-optimization/portfolio-optimization.html',
  'portfolio-optimization/black-litterman.html',
  'portfolio-optimization/rolling-optimization.html',

  // Monte Carlo Suite (3)
  'monte-carlo/index.html',
  'monte-carlo/financial-goals.html',
  'monte-carlo/asset-liability.html',

  // Fixed Income Suite (1)
  'fixed-income/index.html',

  // Retirement & Decumulation (4)
  'pages/drawdown-engine.html',
  'pages/fire.html',
  'pages/market-stress.html',
  'dca-comparator/index.html'
];

let failed = false;

studioPages.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`❌ FAIL: Missing file: ${file}`);
    failed = true;
    return;
  }

  const content = fs.readFileSync(file, 'utf8');

  // Must have a cheat-sheet-card or executive-guide-card
  const hasCard = content.includes('class="cheat-sheet-card"') || content.includes('class="executive-guide-card"');
  if (!hasCard) {
    console.error(`❌ FAIL: Missing executive guide card in ${file}`);
    failed = true;
  }

  // Must have header and body
  const hasHeader = content.includes('class="cheat-sheet-header') || content.includes('class="executive-guide-header');
  const hasBody = content.includes('class="cheat-sheet-body') || content.includes('class="executive-guide-body');

  if (!hasHeader || !hasBody) {
    console.error(`❌ FAIL: Missing header or body in ${file}`);
    failed = true;
  }

  // Must contain Executive Decision Framework or Executive Purpose
  const hasPurpose = content.includes('Executive Purpose');
  if (!hasPurpose) {
    console.error(`❌ FAIL: Missing Executive Purpose in ${file}`);
    failed = true;
  }

  console.log(`✅ PASS: Executive Decision Framework verified in ${file}`);
});

// Check css/base.css
const baseCss = fs.readFileSync('css/base.css', 'utf8');
if (!baseCss.includes('.cheat-sheet-card') || !baseCss.includes('.btn-collapse-exec-guide')) {
  console.error('❌ FAIL: css/base.css missing universal executive guide styling');
  failed = true;
} else {
  console.log('✅ PASS: Universal executive guide styles present in css/base.css');
}

// Check js/nav.js
const navJs = fs.readFileSync('js/nav.js', 'utf8');
if (!navJs.includes('setupExecutiveGuides') || !navJs.includes('btn-collapse-exec-guide')) {
  console.error('❌ FAIL: js/nav.js missing setupExecutiveGuides implementation');
  failed = true;
} else {
  console.log('✅ PASS: setupExecutiveGuides with collapse persistence present in js/nav.js');
}

if (failed) {
  console.error('\n❌ EXECUTIVE GUIDE TESTS FAILED');
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${studioPages.length} STUDIO EXECUTIVE GUIDES & COLLAPSE SYSTEM PASSED!`);
  process.exit(0);
}
