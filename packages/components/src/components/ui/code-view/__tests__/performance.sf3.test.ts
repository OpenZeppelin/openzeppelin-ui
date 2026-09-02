/**
 * @vitest-environment node
 *
 * SF-3 · Performance / stability — INV-8, INV-9, INV-10.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { LANGUAGE_SAMPLES } from './fixtures/language-samples';

import { highlightSource } from '../highlight';
import { readDeployShFixture } from './helpers';

const MODULE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

describe('INV-9: the current maximum never loses highlighting', () => {
  it('reports tokenizer p95 below 50 ms across 20 deploy.sh updates in Node', () => {
    const source = readDeployShFixture();
    const samples: number[] = [];
    for (let index = 0; index < 20; index += 1) {
      const started = performance.now();
      const result = highlightSource(`${source}\n# run ${index}`, 'shell');
      samples.push(performance.now() - started);
      expect(result.kind, 'deploy.sh must stay highlighted for every update').toBe('highlighted');
    }
    const p95 = percentile(samples, 95);
    expect(
      p95,
      `tokenizer p95=${p95.toFixed(2)}ms on ${process.version}; runner=${process.platform}/${process.arch}`
    ).toBeLessThan(50);
  });
});

describe('INV-10: grammar registration stays module-private', () => {
  it('does not expose registry mutation helpers from product modules', () => {
    const productFiles = readdirSync(MODULE_DIR).filter(
      (file) => /\.(ts|tsx)$/.test(file) && !/\.test\./.test(file)
    );
    for (const file of productFiles) {
      const source = readFileSync(join(MODULE_DIR, file), 'utf-8');
      expect(source, `${file} must not export createLowlight`).not.toMatch(
        /export\s+\{[^}]*createLowlight/
      );
      expect(source, `${file} must not register grammars in component lifecycle`).not.toMatch(
        /useEffect\([\s\S]*registerLanguage/
      );
    }
  });

  it('returns identical highlighted output across repeated highlightSource calls', () => {
    const first = highlightSource(LANGUAGE_SAMPLES.rust, 'rust');
    const second = highlightSource(LANGUAGE_SAMPLES.rust, 'rust');
    expect(first).toEqual(second);
  });
});

describe('INV-8: highlight derivation depends only on source and language', () => {
  it('documents that CodeView useMemo lists only source and language (static review helper)', () => {
    const source = readFileSync(join(MODULE_DIR, 'CodeView.tsx'), 'utf-8');
    expect(source).toMatch(
      /useMemo\(\(\) => highlightSource\(source, language\), \[source, language\]\)/
    );
  });
});
