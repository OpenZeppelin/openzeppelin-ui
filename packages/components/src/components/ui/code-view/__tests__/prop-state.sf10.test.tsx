/**
 * @vitest-environment jsdom
 *
 * SF-10 · Prop / State Contract — INV-4, INV-5, INV-6.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { RUST_IMPORT_FIXTURE } from './fixtures/rust-import';

import type { CodeViewTokenDecorator } from '../types';
import { captureDecoratorInvocations } from './decoration-helpers';
import { renderCodeView } from './helpers';

const MODULE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY_FILE = join(dirname(fileURLToPath(import.meta.url)), '../../../../code-view.ts');

const DOMAIN_VOCABULARY = [
  /\bstellar[_-]/i,
  /\bCargo\.toml\b/,
  /\brev\s*=/,
  /\bgithub\.com\/openzeppelin\b/i,
  /\bstellar-contracts\b/i,
  /\bRWA\b/,
] as const;

const PRODUCT_FILES = [
  'types.ts',
  'CodeView.tsx',
  'render-hast.tsx',
  'highlight.ts',
  'token-styles.ts',
] as const;

describe('INV-4: public surface stays minimal and generic', () => {
  it('exports decoration types from the subpath entry', () => {
    const entrySource = readFileSync(ENTRY_FILE, 'utf-8');
    expect(entrySource).toContain('CodeViewToken');
    expect(entrySource).toContain('CodeViewDecorationContext');
    expect(entrySource).toContain('CodeViewTokenDecorator');
    expect(entrySource).not.toMatch(/export\s+\{[^}]*renderHast/);
    expect(entrySource).not.toMatch(/export\s+\{[^}]*highlightSource/);
  });

  it('accepts decorateToken alongside existing CodeView props', () => {
    const decorateToken: CodeViewTokenDecorator = () => undefined;
    const { container, getByLabelText } = renderCodeView({
      source: 'let x = 1;\n',
      language: 'rust',
      className: 'custom-pane',
      'aria-label': 'Sample module source',
      decorateToken,
    });
    expect(getByLabelText('Sample module source').className).toContain('custom-pane');
    expect(container.textContent).toContain('let');
  });

  it.each(PRODUCT_FILES)('keeps %s free of Stellar/RWA domain vocabulary', (fileName) => {
    const source = readFileSync(join(MODULE_DIR, fileName), 'utf-8');
    for (const pattern of DOMAIN_VOCABULARY) {
      expect(source, `${fileName} must not match ${pattern}`).not.toMatch(pattern);
    }
  });

  it('keeps subpath entry free of domain vocabulary', () => {
    const entrySource = readFileSync(ENTRY_FILE, 'utf-8');
    for (const pattern of DOMAIN_VOCABULARY) {
      expect(entrySource, `code-view.ts must not match ${pattern}`).not.toMatch(pattern);
    }
  });
});

describe('INV-5: token offset contract through CodeView', () => {
  it('passes aligned offsets for every leaf in a rust import fixture', () => {
    const source = RUST_IMPORT_FIXTURE;
    const invocations = captureDecoratorInvocations({ source, language: 'rust' }, () => undefined);
    expect(invocations.length).toBeGreaterThan(0);
    for (const { token } of invocations) {
      expect(source.slice(token.offset, token.offset + token.text.length)).toBe(token.text);
    }
  });
});

describe('INV-6: parent className reflects immediate span only', () => {
  it('passes immediate parent span class to each leaf without merging ancestors', () => {
    const invocations = captureDecoratorInvocations(
      { source: 'fn main() {}\n', language: 'rust' },
      () => undefined
    );
    const fnLeaf = invocations.find((ctx) => ctx.token.text === 'fn');
    const mainLeaf = invocations.find((ctx) => ctx.token.text === 'main');
    expect(fnLeaf?.token.className).toBe('hljs-keyword');
    expect(mainLeaf?.token.className).toBe('hljs-title function_');
    expect(mainLeaf?.token.className).not.toContain('hljs-keyword');
  });
});

describe('INV-4: product tree excludes private traversal modules from public barrels', () => {
  it('does not export render-hast from the code-view subpath entry', () => {
    const entrySource = readFileSync(ENTRY_FILE, 'utf-8');
    expect(entrySource).not.toContain('render-hast');
    expect(entrySource).not.toMatch(/from\s+['"].*highlight/);
  });
});
