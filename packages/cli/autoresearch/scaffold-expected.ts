/**
 * Scaffold an expected.json template for a new benchmark fixture.
 *
 * Runs the analyzer against a fixture directory and outputs a template
 * that you review and edit to create the ground truth.
 *
 * Usage:
 *   npx tsx autoresearch/scaffold-expected.ts <fixture-name>
 *
 * Example:
 *   npx tsx autoresearch/scaffold-expected.ts zama-accounts-ui
 *
 * This generates expected/<fixture-name>.scaffold.json with ALL components
 * the analyzer currently detects (mapped and unmapped). You then:
 *   1. Remove components that should NOT be detected (icons, routing, etc.)
 *   2. Fix ozTarget for components the analyzer missed or mapped incorrectly
 *   3. Add components the analyzer missed entirely
 *   4. Rename the file to <fixture-name>.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeProject } from '../src/analysis/index.ts';
import { getExternalFixtureDefinition } from './capabilities/fixture-resolver.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function main(): void {
  const fixtureName = process.argv[2];

  if (!fixtureName) {
    console.error('Usage: npx tsx autoresearch/scaffold-expected.ts <fixture-name>');
    console.error('');
    console.error('Available fixtures:');
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (fs.existsSync(fixturesDir)) {
      const dirs = fs
        .readdirSync(fixturesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      for (const d of dirs) {
        const hasExpected = fs.existsSync(path.join(__dirname, 'expected', `${d}.json`));
        console.error(`  ${d}${hasExpected ? ' (expected.json exists)' : ' (no expected.json yet)'}`);
      }
    }
    process.exit(1);
  }

  const fixtureDir = path.join(__dirname, 'fixtures', fixtureName);
  if (!fs.existsSync(fixtureDir)) {
    console.error(`Fixture not found: ${fixtureDir}`);
    console.error('Copy project source into autoresearch/fixtures/<name>/ first.');
    process.exit(1);
  }

  console.error(`Analyzing fixture: ${fixtureName}...`);
  const ext = getExternalFixtureDefinition(fixtureName);
  const report = analyzeProject(fixtureDir, undefined, ext?.tailwindCssPath);

  const mapped = report.components.filter((c) => c.ozTarget !== null);
  const unmapped = report.components.filter((c) => c.ozTarget === null);

  const scaffold = {
    fixture: fixtureName,
    description: 'TODO: describe what makes this fixture interesting for the benchmark',
    _instructions: [
      'Review each component below and decide:',
      '  1. Should it be detected? Remove icons, routing, app-level components, etc.',
      '  2. Is the ozTarget correct? Fix false positives and add missing mappings.',
      '  3. Is the sourceLibrary correct? Set to shadcn, radix, html-elements, etc.',
      '  4. Are there components the analyzer missed entirely? Add them manually.',
      'When done, remove this _instructions field, the _unmapped section,',
      'and all _review markers, then rename the file from .scaffold.json to .json',
    ],
    components: mapped.map((c) => ({
      name: c.name,
      ozTarget: c.ozTarget,
      sourceLibrary: c.sourceLibrary ?? 'TODO',
      _review: `Detected from "${c.sourceImport}" (${c.usageCount} usages in ${c.files.length} files)`,
    })),
    _unmapped: unmapped
      .filter((c) => c.usageCount >= 2)
      .slice(0, 30)
      .map((c) => ({
        name: c.name,
        ozTarget: null,
        sourceImport: c.sourceImport,
        usageCount: c.usageCount,
        files: c.files.length,
        _hint: 'Should this component map to an OZ target? If yes, add it to components above.',
      })),
  };

  const outputPath = path.join(__dirname, 'expected', `${fixtureName}.scaffold.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(scaffold, null, 2) + '\n');

  console.error(`\nScaffold written to: expected/${fixtureName}.scaffold.json`);
  console.error(`\nSummary:`);
  console.error(`  Total components detected: ${report.components.length}`);
  console.error(`  Currently mapped (ozTarget != null): ${mapped.length}`);
  console.error(`  Unmapped (shown if usageCount >= 2): ${scaffold._unmapped.length}`);
  console.error(`\nNext steps:`);
  console.error(`  1. Open expected/${fixtureName}.scaffold.json`);
  console.error(`  2. Review and edit following the _instructions`);
  console.error(`  3. Rename to expected/${fixtureName}.json`);
  console.error(`  4. Run: pnpm --filter @openzeppelin/ui-cli evaluate`);
}

main();
