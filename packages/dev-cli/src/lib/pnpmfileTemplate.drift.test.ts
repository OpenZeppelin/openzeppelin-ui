import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { createPnpmfileContent } from './init';

/**
 * The repository-root `.pnpmfile.cjs` is NOT hand-maintained: it is generated from the same
 * `createPnpmfileContent()` template that `oz-ui-dev init` writes into consumer repos, so the
 * two can never drift apart again.
 *
 * If this test fails, the root hook is stale. Regenerate it (do not edit it by hand):
 *   pnpm generate:pnpmfile
 */
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../..');
const rootPnpmfilePath = path.join(repoRoot, '.pnpmfile.cjs');

describe('root .pnpmfile.cjs stays in sync with the canonical template', () => {
  it('matches createPnpmfileContent() byte-for-byte', () => {
    const generated = createPnpmfileContent();

    // Regeneration path: `UPDATE_PNPMFILE=1` rewrites the root hook from the template.
    if (process.env.UPDATE_PNPMFILE === '1') {
      fs.writeFileSync(rootPnpmfilePath, generated);
    }

    expect(fs.existsSync(rootPnpmfilePath)).toBe(true);
    expect(fs.readFileSync(rootPnpmfilePath, 'utf8')).toBe(generated);
  });
});
