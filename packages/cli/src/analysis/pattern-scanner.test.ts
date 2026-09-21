import { describe, expect, it } from 'vitest';

import { scanCanonicalPatterns, scanPatternObservations, scanPatterns } from './pattern-scanner';
import type { ScannedFile } from './scanner';

describe('scanPatterns', () => {
  it('detects wagmi imports', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/hooks/useWallet.ts',
        relativePath: 'src/hooks/useWallet.ts',
        content: "import { useAccount, useConnect } from 'wagmi';\n",
      },
    ];

    const patterns = scanPatterns(files);
    const wagmi = patterns.find((p) => p.pattern === 'wagmi');

    expect(wagmi).toBeDefined();
    expect(wagmi!.count).toBe(1);
    expect(wagmi!.category).toBe('wallet');
  });

  it('normalizes subpath imports into canonical families', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/config.ts',
        relativePath: 'src/config.ts',
        content: [
          "import { mainnet } from 'wagmi/chains';",
          "import { createConfig } from '@wagmi/core';",
          "import { privateKeyToAccount } from 'viem/accounts';",
        ].join('\n'),
      },
    ];

    const patterns = scanCanonicalPatterns(files);

    expect(patterns.find((p) => p.pattern === 'wagmi')?.files).toEqual(['src/config.ts']);
    expect(patterns.find((p) => p.pattern === 'viem')?.files).toEqual(['src/config.ts']);
  });

  it('detects localStorage usage', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/utils/storage.ts',
        relativePath: 'src/utils/storage.ts',
        content: [
          "localStorage.setItem('key', 'value');",
          "const v = localStorage.getItem('key');",
          "localStorage.removeItem('key');",
        ].join('\n'),
      },
    ];

    const patterns = scanPatterns(files);
    const storage = patterns.find((p) => p.pattern === 'localStorage');

    expect(storage).toBeDefined();
    expect(storage!.count).toBe(3);
    expect(storage!.category).toBe('storage');
  });

  it('detects existing OZ packages', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/App.tsx',
        relativePath: 'src/App.tsx',
        content: "import { Button } from '@openzeppelin/ui-components';\n",
      },
    ];

    const patterns = scanPatterns(files);
    const oz = patterns.find((p) => p.pattern === 'oz-ui-components');

    expect(oz).toBeDefined();
    expect(oz!.category).toBe('oz-existing');
  });

  it('returns empty for clean files', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/utils.ts',
        relativePath: 'src/utils.ts',
        content: 'export function add(a: number, b: number): number { return a + b; }',
      },
    ];

    const patterns = scanPatterns(files);
    expect(patterns).toHaveLength(0);
  });

  it('does not match import-like text inside comments or strings (AST, not regex)', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/notes.ts',
        relativePath: 'src/notes.ts',
        content: [
          "// import { useAccount } from 'wagmi';",
          'const docs = "import { x } from \'wagmi\'";',
          'export const noop = () => docs;',
        ].join('\n'),
      },
    ];

    const patterns = scanPatterns(files);
    expect(patterns.find((p) => p.pattern === 'wagmi')).toBeUndefined();
  });

  it('detects dynamic imports, re-exports, and side-effect imports', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/lazy.ts',
        relativePath: 'src/lazy.ts',
        content: "export const load = () => import('wagmi');\n",
      },
      {
        absolutePath: '/project/src/reexport.ts',
        relativePath: 'src/reexport.ts',
        content: "export { useAccount } from 'wagmi';\n",
      },
    ];

    const patterns = scanPatterns(files);
    const wagmi = patterns.find((p) => p.pattern === 'wagmi');

    expect(wagmi).toBeDefined();
    expect(wagmi!.files).toEqual(['src/lazy.ts', 'src/reexport.ts']);
  });

  it('returns rich observations with evidence', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/App.tsx',
        relativePath: 'src/App.tsx',
        content: [
          "import { Button } from '@openzeppelin/ui-components';",
          "localStorage.setItem('key', 'value');",
        ].join('\n'),
      },
    ];

    const observations = scanPatternObservations(files);
    const ozObservation = observations.find(
      (observation) => observation.pattern === 'oz-ui-components'
    );
    const storageObservation = observations.find(
      (observation) => observation.pattern === 'localStorage'
    );

    expect(observations).toHaveLength(2);
    expect(ozObservation?.evidences[0]?.snippet).toContain('@openzeppelin/ui-components');
    expect(storageObservation?.evidences[0]?.matchedValue).toContain('localStorage.setItem');
    expect(storageObservation?.migrationRelevance).toBeTruthy();
  });
});
