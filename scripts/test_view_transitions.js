// ===================================================================
// TEST SUITE: View Transitions & Prefetching Verification
// Validates cross-document view transitions and prefetch coverage
// across the entire application.
// ===================================================================

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function testBaseCssViewTransitions() {
  const cssPath = path.join(ROOT_DIR, 'css', 'base.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert(
    /@view-transition\s*\{\s*navigation:\s*auto;\s*\}/.test(css),
    'css/base.css must define @view-transition { navigation: auto; }'
  );

  assert(
    /\.top-nav\s*\{[^}]*view-transition-name:\s*top-nav;/.test(css),
    'css/base.css must define view-transition-name: top-nav on .top-nav'
  );

  assert(
    /\.suite-subnav\s*\{[^}]*view-transition-name:\s*suite-subnav;/.test(css),
    'css/base.css must define view-transition-name: suite-subnav on .suite-subnav'
  );

  assert(
    css.includes('::view-transition-old(root)') && css.includes('::view-transition-new(root)'),
    'css/base.css must style root view transitions'
  );

  assert(
    css.includes('prefers-reduced-motion: reduce'),
    'css/base.css must respect prefers-reduced-motion'
  );

  console.log('✓ css/base.css view transition rules verified');
}

function testPrefetchScript() {
  const prefetchPath = path.join(ROOT_DIR, 'js', 'prefetch.js');
  const js = fs.readFileSync(prefetchPath, 'utf8');

  assert(js.includes('rel = "prefetch"'), 'js/prefetch.js must create prefetch links');
  assert(js.includes('mouseover'), 'js/prefetch.js must listen for mouseover');
  assert(js.includes('pointerdown'), 'js/prefetch.js must listen for pointerdown');
  assert(js.includes('touchstart'), 'js/prefetch.js must listen for touchstart');
  assert(js.includes('requestIdleCallback'), 'js/prefetch.js must support idle prefetch');

  console.log('✓ js/prefetch.js pointer & idle prefetching verified');
}

function getAllHtmlFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'coverage') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllHtmlFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function testHtmlPagesInclusion() {
  const htmlFiles = getAllHtmlFiles(ROOT_DIR);
  assert(htmlFiles.length >= 40, `Expected at least 40 HTML files, found ${htmlFiles.length}`);

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relative = path.relative(ROOT_DIR, file);

    assert(
      content.includes('base.css'),
      `${relative} must include base.css`
    );

    assert(
      content.includes('prefetch.js'),
      `${relative} must include prefetch.js`
    );
  }

  console.log(`✓ All ${htmlFiles.length} HTML files include base.css and prefetch.js`);
}

function run() {
  console.log('Running View Transitions & Prefetch Test Suite...');
  testBaseCssViewTransitions();
  testPrefetchScript();
  testHtmlPagesInclusion();
  console.log('All View Transitions & Prefetch tests passed successfully! 🎉');
}

run();
