import fs from 'fs';
import path from 'path';

console.log('=== VERIFYING UNNESTED ANALYTICS PAGES ===\n');

const files = [
  {
    path: 'asset-analytics/index.html',
    defaultTab: null, // default is performance
    activeSubnav: 'index.html',
    requiredIds: ['tab-performance', 'executive-guide-analytics', 'executive-guide-toggle', 'growth-canvas', 'drawdown-canvas']
  },
  {
    path: 'asset-analytics/asset-correlations.html',
    defaultTab: 'correlations',
    activeSubnav: 'asset-correlations.html',
    requiredIds: ['tab-correlations', 'executive-guide-correlations', 'executive-guide-toggle', 'corr-results-table', 'correlation-canvas']
  },
  {
    path: 'asset-analytics/fund-screener.html',
    defaultTab: 'screener',
    activeSubnav: 'fund-screener.html',
    requiredIds: ['tab-screener', 'tab-rankings', 'executive-guide-screener', 'executive-guide-toggle', 'screener-results-table', 'rankings-results-table']
  },
  {
    path: 'asset-analytics/time-series.html',
    defaultTab: 'autocorr',
    activeSubnav: 'time-series.html',
    requiredIds: ['tab-autocorr', 'tab-cointegration', 'executive-guide-timeseries', 'executive-guide-toggle', 'canvas-autocorr-lag1', 'canvas-autocorr-lag3', 'canvas-autocorr-lag12', 'cointegration-canvas']
  }
];

let failed = false;

files.forEach(f => {
  if (!fs.existsSync(f.path)) {
    console.error(`❌ FAIL: File not found: ${f.path}`);
    failed = true;
    return;
  }
  const content = fs.readFileSync(f.path, 'utf8');

  // Check subnav
  if (!content.includes('class="suite-subnav"')) {
    console.error(`❌ FAIL: Missing suite-subnav in ${f.path}`);
    failed = true;
  } else {
    console.log(`✅ PASS: Suite subnav present in ${f.path}`);
  }

  // Check active subnav link
  const activeRegex = new RegExp(`href="${f.activeSubnav}"[^>]*class="[^"]*active[^"]*"`);
  if (!activeRegex.test(content)) {
    console.error(`❌ FAIL: Active subnav link for ${f.activeSubnav} not found or not active in ${f.path}`);
    failed = true;
  } else {
    console.log(`✅ PASS: Subnav has active link for ${f.activeSubnav} in ${f.path}`);
  }

  // Check default tab
  if (f.defaultTab) {
    if (!content.includes(`data-default-tab="${f.defaultTab}"`)) {
      console.error(`❌ FAIL: Missing data-default-tab="${f.defaultTab}" in ${f.path}`);
      failed = true;
    } else {
      console.log(`✅ PASS: data-default-tab="${f.defaultTab}" present in ${f.path}`);
    }
  }

  // Check required IDs
  f.requiredIds.forEach(id => {
    if (!content.includes(`id="${id}"`)) {
      console.error(`❌ FAIL: Missing element id="${id}" in ${f.path}`);
      failed = true;
    } else {
      console.log(`✅ PASS: Element id="${id}" found in ${f.path}`);
    }
  });
});

// Verify nav.js
const navContent = fs.readFileSync('js/nav.js', 'utf8');
['asset-correlations', 'fund-screener', 'time-series'].forEach(toolId => {
  if (!navContent.includes(`id: "${toolId}"`)) {
    console.error(`❌ FAIL: tool "${toolId}" not in js/nav.js`);
    failed = true;
  } else {
    console.log(`✅ PASS: Tool "${toolId}" registered in js/nav.js`);
  }
});

if (failed) {
  console.error('\n❌ UNNESTED ANALYTICS TESTS FAILED');
  process.exit(1);
} else {
  console.log('\n🎉 ALL UNNESTED ANALYTICS PAGE TESTS PASSED!');
  process.exit(0);
}
