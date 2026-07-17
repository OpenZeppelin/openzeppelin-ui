/**
 * SF-4 · boundary static audits — display/hook layers must not read opt-in wiring.
 *
 * Verifies: INV-202, INV-210, INV-214, INV-216, INV-203, INV-229 (example app reference).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../../../..');

const SF4_PRODUCTION_FILES = [
  'packages/types/src/adapters/runtime-options.ts',
  'packages/react/src/hooks/runtime/runtimeCreationConfig.ts',
  'packages/react/src/hooks/runtime/createResolveRuntime.ts',
  'packages/react/src/hooks/runtime/useResolveRuntime.ts',
];

const FORBIDDEN_ADAPTER_IMPORTS = ['@openzeppelin/adapter-evm', 'isEnsProvenance'];

function hasForbiddenImport(source: string, symbol: string): boolean {
  const importPattern = new RegExp(
    `import\\s+(?:type\\s+)?(?:\\{[^}]*\\b${symbol}\\b[^}]*\\}|\\*\\s+as\\s+\\w+|${symbol})\\s+from`
  );
  return importPattern.test(source);
}

function readRepoFile(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf-8');
}

function walkProductionSources(rootRelative: string, out: string[] = []): string[] {
  const root = join(REPO_ROOT, rootRelative);
  for (const entry of readdirSync(root)) {
    if (entry === '__tests__' || entry === 'node_modules' || entry === 'dist') {
      continue;
    }
    const full = join(root, entry);
    if (statSync(full).isDirectory()) {
      walkProductionSources(join(rootRelative, entry), out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      out.push(join(rootRelative, entry));
    }
  }
  return out;
}

function grepFiles(pattern: string, files: string[]): string[] {
  const re = new RegExp(pattern);
  return files.filter((file) => re.test(readRepoFile(file)));
}

describe('INV-214: SF-4 production modules import ui-types only — no adapter ENS types', () => {
  it('has zero forbidden adapter imports in SF-4 touched production files', () => {
    for (const file of SF4_PRODUCTION_FILES) {
      const source = readRepoFile(file);
      for (const forbidden of FORBIDDEN_ADAPTER_IMPORTS) {
        expect(source, `${file} must not import "${forbidden}"`).not.toMatch(
          new RegExp(`from\\s+['"]${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`)
        );
      }
      expect(
        hasForbiddenImport(source, 'CreateNameResolutionOptions'),
        `${file} must not import CreateNameResolutionOptions`
      ).toBe(false);
    }
  });
});

describe('INV-202: ui-components and ui-renderer gain no SF-4 opt-in surface', () => {
  it('has zero enableMainnetL1MissFallback references in display/renderer production files', () => {
    const displayFiles = [
      ...walkProductionSources('packages/components/src'),
      ...walkProductionSources('packages/renderer/src'),
    ];

    const hits = grepFiles('enableMainnetL1MissFallback', displayFiles);
    expect(
      hits,
      'INV-202: display/renderer packages must not thread opt-in props — hits: ' + hits.join(', ')
    ).toEqual([]);
  });
});

describe('INV-210 / INV-216: hook and display layers do not accept or read runtime opt-in', () => {
  it('has zero enableMainnetL1MissFallback in nameResolution hook modules (except tests)', () => {
    const hookFiles = walkProductionSources('packages/react/src/hooks/nameResolution');

    const hits = grepFiles('enableMainnetL1MissFallback', hookFiles);
    expect(
      hits,
      'INV-210: ResolutionConfig / hook layer must not gain factory opt-in — hits: ' +
        hits.join(', ')
    ).toEqual([]);
  });

  it('SF-3 display files do not import useResolveRuntime or isMainnetL1MissFallbackEnabled', () => {
    const sf3DisplayFiles = [
      'packages/components/src/components/ui/address-display/address-display.tsx',
      'packages/components/src/components/fields/AddressField.tsx',
      'packages/renderer/src/components/AddressNameResolutionProvider.tsx',
    ];

    for (const file of sf3DisplayFiles) {
      const source = readRepoFile(file);
      expect(source, `${file} must not import useResolveRuntime (INV-216)`).not.toMatch(
        /useResolveRuntime/
      );
      expect(
        source,
        `${file} must not import isMainnetL1MissFallbackEnabled (INV-216)`
      ).not.toMatch(/isMainnetL1MissFallbackEnabled/);
    }
  });
});

describe('INV-203 / INV-229: example app reference toggle copy and accessibility', () => {
  const ENS_DEMO_SOURCE = readRepoFile(
    'examples/basic-react-app/src/components/ENSResolutionDemo.tsx'
  );

  const toggleSource = ENS_DEMO_SOURCE.slice(
    ENS_DEMO_SOURCE.indexOf('function MainnetL1FallbackOptInToggle'),
    ENS_DEMO_SOURCE.indexOf('// Live resolver widget')
  );

  it('uses plain-language toggle label without mechanism branding (INV-203)', () => {
    expect(toggleSource).toMatch(/Allow mainnet fallback when name not found on connected network/);
    expect(toggleSource).not.toMatch(/\bCCIP\b/i);
    expect(toggleSource).not.toMatch(/v2 gateway/i);
  });

  it('renders a native checkbox with label association for keyboard users (INV-229)', () => {
    expect(toggleSource).toMatch(/type="checkbox"/);
    expect(toggleSource).toMatch(/<label[^>]+htmlFor=/);
    expect(toggleSource).toMatch(/aria-describedby=/);
  });
});

describe('INV-220: NameResolutionProvider config unchanged by SF-4', () => {
  it('ResolutionConfig source has no enableMainnetL1MissFallback field', () => {
    const configSource = readRepoFile(
      'packages/react/src/hooks/nameResolution/resolutionConfig.ts'
    );
    expect(configSource).not.toContain('enableMainnetL1MissFallback');
  });
});
