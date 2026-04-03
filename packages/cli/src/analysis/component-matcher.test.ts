import { describe, expect, it } from 'vitest';

import type { ComponentCatalog, SourceLibrary } from '../catalog';
import { analyzeComponents } from './component-matcher';
import type { ScannedFile } from './scanner';

const MOCK_CATALOG: ComponentCatalog = {
  catalogVersion: '1.0.0',
  generatedAt: '2026-01-01T00:00:00.000Z',
  components: {
    Button: {
      package: '@openzeppelin/ui-components',
      importPath: 'ui/button',
      category: 'ui',
      capabilities: [],
    },
    AddressField: {
      package: '@openzeppelin/ui-components',
      importPath: 'fields',
      category: 'field',
      capabilities: ['AddressingCapability'],
    },
  },
  capabilities: ['AddressingCapability'],
};

const MOCK_SHADCN: Record<string, SourceLibrary> = {
  shadcn: {
    library: 'shadcn/ui',
    importPatterns: ['@/components/ui/'],
    mappings: {
      Button: { source: 'Button', effort: 'low', notes: 'Near 1:1 parity' },
      Card: { source: 'Card', effort: 'low', notes: 'Near 1:1 parity' },
    },
  },
};

describe('analyzeComponents', () => {
  it('matches a shadcn Button import with JSX usage', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/App.tsx',
        relativePath: 'src/App.tsx',
        content: [
          "import { Button } from '@/components/ui/button';",
          '',
          'export function App() {',
          '  return <Button variant="default">Click</Button>;',
          '}',
        ].join('\n'),
      },
    ];

    const matches = analyzeComponents(files, MOCK_CATALOG, MOCK_SHADCN);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual(
      expect.objectContaining({
        name: 'Button',
        sourceLibrary: 'shadcn',
        ozTarget: 'Button',
        effort: 'low',
        usageCount: 1,
        files: ['src/App.tsx'],
      })
    );
  });

  it('counts usage across multiple files', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/A.tsx',
        relativePath: 'src/A.tsx',
        content: "import { Button } from '@/components/ui/button';\n<Button />\n<Button />",
      },
      {
        absolutePath: '/project/src/B.tsx',
        relativePath: 'src/B.tsx',
        content: "import { Button } from '@/components/ui/button';\n<Button />",
      },
    ];

    const matches = analyzeComponents(files, MOCK_CATALOG, MOCK_SHADCN);

    expect(matches[0].usageCount).toBe(3);
    expect(matches[0].files).toEqual(['src/A.tsx', 'src/B.tsx']);
  });

  it('skips components imported but never used in JSX', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/A.tsx',
        relativePath: 'src/A.tsx',
        content: "import { Card } from '@/components/ui/card';\nexport const x = 1;",
      },
    ];

    const matches = analyzeComponents(files, MOCK_CATALOG, MOCK_SHADCN);
    expect(matches).toHaveLength(0);
  });

  it('skips @openzeppelin imports (already migrated)', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/A.tsx',
        relativePath: 'src/A.tsx',
        content:
          "import { Button } from '@openzeppelin/ui-components';\nexport function A() { return <Button />; }",
      },
    ];

    const matches = analyzeComponents(files, MOCK_CATALOG, MOCK_SHADCN);
    expect(matches).toHaveLength(0);
  });
});
