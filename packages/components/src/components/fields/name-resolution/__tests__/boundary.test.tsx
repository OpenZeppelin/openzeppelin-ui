/**
 * @vitest-environment jsdom
 *
 * SF-3 Rev-2 · INV-118 — the LOCKED capability-free / value-types-only
 * boundary of the `NameResolver` injection seam, plus the dumb-provider
 * contract (memoize-and-forward only).
 *
 * The import-graph half is asserted structurally over the source files:
 * `@openzeppelin/ui-components`' ENS surface must reference no runtime
 * capability, no wallet state, no `ui-react` symbol, and only `import type`
 * from `@openzeppelin/ui-types`. (`NameResolver` itself being types-only is
 * enforced at compile time — `import type` erasure — and re-checked here.)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import type { NameResolver } from '@openzeppelin/ui-types';

import { NameResolverProvider } from '../name-resolver-context';
import { useNameResolver } from '../useNameResolver';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEAM_DIR = join(HERE, '..');
const FIELDS_DIR = join(SEAM_DIR, '..');
const PKG_ROOT = join(FIELDS_DIR, '..', '..', '..');

function seamSourceFiles(): { path: string; content: string }[] {
  const seamFiles = readdirSync(SEAM_DIR)
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((f) => join(SEAM_DIR, f));
  const files = [...seamFiles, join(FIELDS_DIR, 'AddressField.tsx')];
  return files.map((path) => ({ path, content: readFileSync(path, 'utf-8') }));
}

/** Source with block/line comments removed, so doc examples don't false-positive. */
function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Every REAL import statement (comments stripped), with its full multi-line clause. */
function importStatements(content: string): { clause: string; specifier: string }[] {
  const statements: { clause: string; specifier: string }[] = [];
  const re = /import\s+[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/gs;
  for (const m of stripComments(content).matchAll(re)) {
    statements.push({ clause: m[0], specifier: m[1] ?? m[2] });
  }
  return statements;
}

describe('INV-118: import-graph — the ENS surface of ui-components is capability-free', () => {
  it.each(['@openzeppelin/ui-react', '@tanstack/react-query'])(
    'no seam/field source IMPORTS %s (doc-comment mentions are fine)',
    (pkg) => {
      for (const { path, content } of seamSourceFiles()) {
        const hit = importStatements(content).find((s) => s.specifier === pkg);
        expect(hit, `${path} must not import ${pkg}: ${hit?.clause ?? ''}`).toBeUndefined();
      }
    }
  );

  it.each(['useWalletState', 'WalletStateContext', 'NameResolutionCapability'])(
    'no seam/field source imports or uses the runtime symbol %s',
    (symbol) => {
      for (const { path, content } of seamSourceFiles()) {
        expect(
          stripComments(content).includes(symbol),
          `${path} must not reference ${symbol}`
        ).toBe(false);
      }
    }
  );

  it('every ui-types import in the seam/field sources is type-only (erasable)', () => {
    for (const { path, content } of seamSourceFiles()) {
      const uiTypesImports = importStatements(content).filter(
        (s) => s.specifier === '@openzeppelin/ui-types'
      );
      for (const { clause } of uiTypesImports) {
        expect(/^import\s+type\b/.test(clause), `${path}: "${clause}" must be import type`).toBe(
          true
        );
      }
    }
  });

  it('package.json declares no dependency edge to ui-react or a runtime/query package', () => {
    const pkg = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const declared = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ];
    expect(declared).not.toContain('@openzeppelin/ui-react');
    expect(declared).not.toContain('@tanstack/react-query');
  });
});

describe('INV-118: dumb provider — memoize-and-forward only', () => {
  function Reader({ capture }: { capture: (r: NameResolver | null) => void }): null {
    capture(useNameResolver());
    return null;
  }

  it('forwards the injected functions unchanged (same identities)', () => {
    const isValidName = vi.fn((name: string): boolean => name.endsWith('.eth'));
    const resolveName = vi.fn();
    const seen: (NameResolver | null)[] = [];

    render(
      <NameResolverProvider isValidName={isValidName} resolveName={resolveName}>
        <Reader capture={(r) => seen.push(r)} />
      </NameResolverProvider>
    );

    const ctx = seen[seen.length - 1];
    expect(ctx?.isValidName).toBe(isValidName);
    expect(ctx?.resolveName).toBe(resolveName);
    // the provider itself never invokes what it forwards
    expect(isValidName).not.toHaveBeenCalled();
    expect(resolveName).not.toHaveBeenCalled();
  });

  it('memoizes the context value — a re-render with identical functions provides the identical object', () => {
    const isValidName = (name: string): boolean => name.endsWith('.eth');
    const seen: (NameResolver | null)[] = [];

    const { rerender } = render(
      <NameResolverProvider isValidName={isValidName}>
        <Reader capture={(r) => seen.push(r)} />
      </NameResolverProvider>
    );
    rerender(
      <NameResolverProvider isValidName={isValidName}>
        <Reader capture={(r) => seen.push(r)} />
      </NameResolverProvider>
    );

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[seen.length - 1]).toBe(seen[0]); // stable identity — no per-render churn
  });

  it('useNameResolver returns null with no provider mounted (the INV-82 dead-branch key)', () => {
    const seen: (NameResolver | null)[] = [];
    render(<Reader capture={(r) => seen.push(r)} />);
    expect(seen[seen.length - 1]).toBeNull();
  });
});
