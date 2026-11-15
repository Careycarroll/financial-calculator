import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('Testing Top-Nav Synchronization Across All Pages...');

const EXPECTED_TABS = [
  { name: 'Portfolio', icon: '💼', path: '../portfolio-backtest/index.html' },
  { name: 'Tactical Allocation', icon: '⚡', path: '../tactical-allocation/index.html' },
  { name: 'Optimization', icon: '⚖️', path: '../portfolio-optimization/portfolio-optimization.html' },
  { name: 'Factor Analysis', icon: '📈', path: '../fund-regression/index.html' },
  { name: 'Monte Carlo', icon: '🎲', path: '../monte-carlo/index.html' },
  { name: 'Retirement', icon: '🛡️', path: '../pages/drawdown-engine.html' }
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory() && file !== 'node_modules' && !file.startsWith('.')) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.html')) {
      results.push(full);
    }
  });
  return results;
}

function getExpectedSuite(fileNorm) {
  if (fileNorm.includes('portfolio-backtest/') || fileNorm.includes('asset-analytics/') || fileNorm.includes('dca-comparator/')) {
    return 'Portfolio';
  }
  if (fileNorm.includes('tactical-allocation/')) {
    return 'Tactical Allocation';
  }
  if (fileNorm.includes('portfolio-optimization/')) {
    return 'Optimization';
  }
  if (fileNorm.includes('fund-regression/')) {
    return 'Factor Analysis';
  }
  if (fileNorm.includes('monte-carlo/') || fileNorm.includes('pages/options.html')) {
    return 'Monte Carlo';
  }
  if (fileNorm.includes('pages/drawdown-engine.html') || fileNorm.includes('pages/fire.html') || fileNorm.includes('pages/projections.html') || fileNorm.includes('pages/market-stress.html')) {
    return 'Retirement';
  }
  return null;
}

const allHtmlFiles = walk('.');
assert(allHtmlFiles.length >= 45, `Expected at least 45 HTML files, found ${allHtmlFiles.length}`);

let checkedPages = 0;

allHtmlFiles.forEach(f => {
  const norm = f.replace(/\\/g, '/').replace(/^\.\//, '');
  const content = fs.readFileSync(f, 'utf8');

  // All pages must load nav.js and font-scale.js in <head> to ensure UI scaling & dynamic nav work uniformly
  assert(content.includes('nav.js'), `${norm} must load nav.js script`);
  assert(content.includes('font-scale.js'), `${norm} must load font-scale.js script`);

  const headMatch = content.match(/<head>([\s\S]*?)<\/head>/);
  assert(headMatch && headMatch[1].includes('font-scale.js'), `${norm} must load font-scale.js in <head> for pre-render font scaling`);
  assert(content.includes('id="font-scale-btn"'), `${norm} must have static #font-scale-btn in header`);

  if (norm === 'index.html') {
    assert(content.includes('📰 News Feed'), 'index.html should have News Feed link');
    assert(!content.includes('💼 Portfolio'), 'index.html should NOT have suite tabs in global bar');
    checkedPages++;
    return;
  }

  // Subdirectory page checks
  assert(content.includes('id="navCategoryBtn"'), `${norm} must have static #navCategoryBtn suite dropdown in top-nav-left`);

  // Subdirectory page checks
  const navLinksMatch = content.match(/<div class="top-nav-links">([\s\S]*?)<\/div>/);
  assert(navLinksMatch, `${norm} must have <div class="top-nav-links">`);

  const innerNav = navLinksMatch[1];
  assert(innerNav.includes('← All Tools'), `${norm} must include ← All Tools link`);

  EXPECTED_TABS.forEach(tab => {
    assert(innerNav.includes(tab.path), `${norm} missing expected path: ${tab.path}`);
    assert(innerNav.includes(tab.name), `${norm} missing expected name: ${tab.name}`);
  });

  const expectedSuite = getExpectedSuite(norm);
  if (expectedSuite) {
    const activeRegex = new RegExp(`class="top-nav-link active"[^>]*>.*${expectedSuite}`, 'i');
    assert(activeRegex.test(innerNav), `${norm} should have active class on suite: ${expectedSuite}`);
  }

  checkedPages++;
});

console.log(`✓ Verified top-nav synchronization across all ${checkedPages} HTML pages`);

// Verify nav.js idempotency logic
const navJsContent = fs.readFileSync('js/nav.js', 'utf8');
assert(navJsContent.includes('hasSuiteTabs'), 'js/nav.js must check for existing suite tabs');
assert(navJsContent.includes('classList.toggle("active"'), 'js/nav.js must update active classes idempotently without innerHTML rewrite');
console.log('✓ Verified js/nav.js idempotent navigation rendering');

console.log('All top-nav sync tests passed successfully!');
