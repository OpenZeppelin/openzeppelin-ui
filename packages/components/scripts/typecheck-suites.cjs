#!/usr/bin/env node
/**
 * Type-checks every per-suite configuration (`tsconfig.*-tests.json`) in this package.
 *
 * The main `tsconfig.json` excludes test files, so each suite that ships type fixtures
 * has its own configuration. Globbing them here means a new suite is covered in CI
 * without anyone remembering to add a script. Every suite runs even after one fails, so
 * a single run names all the broken suites.
 */
const { spawnSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const configs = readdirSync(root)
  .filter((name) => /^tsconfig\..+-tests\.json$/.test(name))
  .sort();

if (configs.length === 0) {
  console.error('typecheck:suites found no tsconfig.*-tests.json files; the glob is stale.');
  process.exit(1);
}

const failed = [];
for (const config of configs) {
  console.log(`\n== type check: ${config}`);
  const result = spawnSync('pnpm', ['exec', 'tsc', '--noEmit', '-p', config], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) failed.push(config);
}

if (failed.length > 0) {
  console.error(`\nType check failed for: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`\nAll ${configs.length} suite type checks passed.`);
