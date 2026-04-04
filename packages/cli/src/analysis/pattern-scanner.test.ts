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
