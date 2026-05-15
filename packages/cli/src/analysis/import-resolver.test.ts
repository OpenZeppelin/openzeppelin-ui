import { describe, expect, it } from 'vitest';

import {
  buildDesignSystemIndicators,
  collectKnownLibraryPatterns,
  findWorkspacePackageForImport,
  isFileInDesignSystemPackage,
  moduleImportsDesignSystem,
  resolveLocalImportToFile,
  type WorkspacePackageInfo,
} from './import-resolver';
import type { ScannedFile } from './scanner';

describe('resolveLocalImportToFile', () => {
  const files: ScannedFile[] = [
    {
      absolutePath: '/p/src/components/Button.tsx',
      relativePath: 'src/components/Button.tsx',
      content: 'export const Button = () => {};',
    },
    {
      absolutePath: '/p/src/components/ui/card.ts',
      relativePath: 'src/components/ui/card.ts',
      content: 'export const Card = () => {};',
    },
    {
      absolutePath: '/p/src/utils/index.tsx',
      relativePath: 'src/utils/index.tsx',
      content: 'export const helper = () => {};',
    },
  ];

  it('resolves relative imports with extension fallback', () => {
    const result = resolveLocalImportToFile('src/App.tsx', './components/Button', files);
    expect(result).toBeDefined();
    expect(result!.relativePath).toBe('src/components/Button.tsx');
  });

  it('resolves parent-relative imports', () => {
    const result = resolveLocalImportToFile(
      'src/views/CardView.tsx',
      '../components/ui/card',
      files
    );
    expect(result).toBeDefined();
    expect(result!.relativePath).toBe('src/components/ui/card.ts');
  });

  it('resolves @/ alias imports via src root', () => {
    const result = resolveLocalImportToFile('src/pages/Home.tsx', '@/components/Button', files);
    expect(result).toBeDefined();
    expect(result!.relativePath).toBe('src/components/Button.tsx');
  });

  it('resolves ~/ alias imports via src root', () => {
    const result = resolveLocalImportToFile('src/pages/Home.tsx', '~/components/Button', files);
    expect(result).toBeDefined();
    expect(result!.relativePath).toBe('src/components/Button.tsx');
  });

  it('resolves index files', () => {
    const result = resolveLocalImportToFile('src/App.tsx', './utils', files);
    expect(result).toBeDefined();
    expect(result!.relativePath).toBe('src/utils/index.tsx');
  });

  it('returns null for non-existent modules', () => {
    expect(resolveLocalImportToFile('src/App.tsx', './NotFound', files)).toBeNull();
  });

  it('returns null for external package imports', () => {
    expect(resolveLocalImportToFile('src/App.tsx', 'react', files)).toBeNull();
  });
});

describe('findWorkspacePackageForImport', () => {
  const packages: WorkspacePackageInfo[] = [
    { name: '@acme/ui', rootDir: 'packages/ui', isDesignSystem: true },
    { name: '@acme/config', rootDir: 'packages/config', isDesignSystem: false },
  ];

  it('finds a matching workspace package', () => {
    expect(findWorkspacePackageForImport('@acme/ui', packages)?.name).toBe('@acme/ui');
  });

  it('returns null for unrecognized imports', () => {
    expect(findWorkspacePackageForImport('react', packages)).toBeNull();
    expect(findWorkspacePackageForImport('@other/pkg', packages)).toBeNull();
  });
});

describe('isFileInDesignSystemPackage', () => {
  const packages: WorkspacePackageInfo[] = [
    { name: '@acme/ui', rootDir: 'packages/ui', isDesignSystem: true },
    { name: '@acme/app', rootDir: 'packages/app', isDesignSystem: false },
  ];

  it('returns true for files in a design-system package', () => {
    const file: ScannedFile = {
      absolutePath: '/p/packages/ui/src/switch.tsx',
      relativePath: 'packages/ui/src/switch.tsx',
      content: '',
    };
    expect(isFileInDesignSystemPackage(file, packages)).toBe(true);
  });

  it('returns false for files in a non-design-system package', () => {
    const file: ScannedFile = {
      absolutePath: '/p/packages/app/src/App.tsx',
      relativePath: 'packages/app/src/App.tsx',
      content: '',
    };
    expect(isFileInDesignSystemPackage(file, packages)).toBe(false);
  });

  it('returns false for files outside any workspace package', () => {
    const file: ScannedFile = {
      absolutePath: '/p/src/App.tsx',
      relativePath: 'src/App.tsx',
      content: '',
    };
    expect(isFileInDesignSystemPackage(file, packages)).toBe(false);
  });
});

describe('moduleImportsDesignSystem', () => {
  it('detects known library patterns in file content', () => {
    const file: ScannedFile = {
      absolutePath: '/p/src/sidebar.tsx',
      relativePath: 'src/sidebar.tsx',
      content: "import { Sidebar } from '@openzeppelin/ui-components';\nexport default Sidebar;",
    };
    expect(moduleImportsDesignSystem(file, ['@openzeppelin/ui-components'])).toBe(true);
  });

  it('returns false when no indicators match', () => {
    const file: ScannedFile = {
      absolutePath: '/p/src/plain.tsx',
      relativePath: 'src/plain.tsx',
      content: "import { useState } from 'react';\nexport const Foo = () => {};",
    };
    expect(
      moduleImportsDesignSystem(file, ['@radix-ui/react-', '@openzeppelin/ui-components'])
    ).toBe(false);
  });
});

describe('collectKnownLibraryPatterns', () => {
  it('aggregates patterns from all source libraries', () => {
    const patterns = collectKnownLibraryPatterns({
      shadcn: { library: 'shadcn/ui', importPatterns: ['@/components/ui/', '/ui/'], mappings: {} },
      radix: { library: 'Radix', importPatterns: ['@radix-ui/react-'], mappings: {} },
    });
    expect(patterns).toContain('@/components/ui/');
    expect(patterns).toContain('/ui/');
    expect(patterns).toContain('@radix-ui/react-');
  });

  it('deduplicates patterns', () => {
    const patterns = collectKnownLibraryPatterns({
      a: { library: 'A', importPatterns: ['/ui/'], mappings: {} },
      b: { library: 'B', importPatterns: ['/ui/'], mappings: {} },
    });
    expect(patterns.filter((p) => p === '/ui/')).toHaveLength(1);
  });
});

describe('buildDesignSystemIndicators', () => {
  it('combines library patterns and workspace packages', () => {
    const indicators = buildDesignSystemIndicators(
      ['@radix-ui/react-', '@openzeppelin/ui-components'],
      [{ name: '@acme/ui', rootDir: 'packages/ui', isDesignSystem: true }]
    );
    expect(indicators).toContain('@radix-ui/react-');
    expect(indicators).toContain('@acme/ui');
    expect(indicators).toContain('@openzeppelin/ui-components');
  });

  it('omits non-design-system workspace packages', () => {
    const indicators = buildDesignSystemIndicators(
      [],
      [{ name: '@acme/config', rootDir: 'packages/config', isDesignSystem: false }]
    );
    expect(indicators).not.toContain('@acme/config');
  });
});
