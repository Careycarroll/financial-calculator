// ===================================================================
// TEST SUITE: Home Catalog Validation
// Verifies all tools, suites, workflows, and file paths.
// ===================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SUITES_CONFIG, WORKFLOWS_CONFIG, TOOLS_CATALOG, BADGE_DEFINITIONS } from '../js/home-catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== RUNNING HOME CATALOG VALIDATION TESTS ===\n');

let failed = false;
function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    failed = true;
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
}

// 1. Suite ID uniqueness
const suiteIds = new Set();
for (const suite of SUITES_CONFIG) {
  assert(!suiteIds.has(suite.id), `Suite ID "${suite.id}" is unique`);
  suiteIds.add(suite.id);
  assert(Boolean(suite.title && suite.icon && suite.desc), `Suite "${suite.id}" has title, icon, desc`);
}

// 2. Workflow ID uniqueness
const workflowIds = new Set();
for (const wf of WORKFLOWS_CONFIG) {
  assert(!workflowIds.has(wf.id), `Workflow ID "${wf.id}" is unique`);
  workflowIds.add(wf.id);
  assert(Boolean(wf.title && wf.icon && wf.desc), `Workflow "${wf.id}" has title, icon, desc`);
}

// 3. Badge definitions
for (const [badgeKey, def] of Object.entries(BADGE_DEFINITIONS)) {
  assert(Boolean(def.name && def.icon && def.desc), `Badge definition "${badgeKey}" has name, icon, desc`);
}

// 4. Tool validations
const toolIds = new Set();
for (const tool of TOOLS_CATALOG) {
  assert(!toolIds.has(tool.id), `Tool ID "${tool.id}" is unique`);
  toolIds.add(tool.id);

  assert(Boolean(tool.title && tool.desc && tool.icon && tool.badge), `Tool "${tool.id}" has all core metadata`);
  assert(tool.badge in BADGE_DEFINITIONS, `Tool "${tool.id}" badge "${tool.badge}" exists in BADGE_DEFINITIONS`);
  assert(suiteIds.has(tool.suiteId), `Tool "${tool.id}" references valid suiteId "${tool.suiteId}"`);
  assert(workflowIds.has(tool.workflowId), `Tool "${tool.id}" references valid workflowId "${tool.workflowId}"`);
  assert(Array.isArray(tool.keywords) && tool.keywords.length >= 3, `Tool "${tool.id}" has at least 3 keywords`);

  const filePath = path.join(rootDir, tool.path);
  assert(fs.existsSync(filePath), `Tool "${tool.id}" path exists on disk: ${tool.path}`);
}

console.log(`\nVerified ${SUITES_CONFIG.length} Suites, ${WORKFLOWS_CONFIG.length} Workflows, and ${TOOLS_CATALOG.length} Tools.`);

if (failed) {
  console.error('\n❌ Test run failed.');
  process.exit(1);
} else {
  console.log('\n🎉 ALL HOME CATALOG VALIDATION TESTS PASSED SUCCESSFULLY!');
}
