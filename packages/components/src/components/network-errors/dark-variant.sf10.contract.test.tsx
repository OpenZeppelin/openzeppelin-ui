/**
 * 006 SF-10: the shared styles' `dark:` variant contract, checked without a browser.
 *
 * - INV-1: compiling the shipped `@openzeppelin/ui-styles/global.css` gives a `dark:` utility a
 *   selector that matches an element with class `dark` and everything inside it, and nothing else
 *   (not a sibling, an ancestor, or a portal under `body`).
 * - INV-2: that selector adds no specificity over the plain utility (`:where`, not `:is`).
 * - INV-7: dark contrast on card radios and the multi-select doesn't depend on which `ui-styles`
 *   version a consumer installs (SF-34's scoped workarounds; since SF-11, plain classes for the
 *   borders and the scoped active-option ring).
 * - INV-10 / R2: the error banner's settings button carries no `dark:` class, and the banner icon's
 *   dark colour is set from the Alert, where it can beat the Alert's own `[&>svg]` colour.
 * - INV-5: `ui-components` takes no dependency or peer dependency on `ui-styles`.
 *
 * The computed-style side of these (contrast, the live theme toggle) is in the example app's
 * `e2e/dark-variant.sf10.spec.ts`.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import { NetworkServiceErrorBanner } from './NetworkServiceErrorBanner';

const pkgRoot = process.cwd();
const globalCss = readFileSync(resolve(pkgRoot, '../styles/global.css'), 'utf8');
const requireFromPkg = createRequire(resolve(pkgRoot, 'package.json'));

/** The 005 variant (descendant-only, never matched the kit's `html.dark`). */
const VARIANT_005 = '@custom-variant dark (.dark, .dark *);';
const VARIANT_LINE = /^@custom-variant dark .*;$/m;

interface TailwindCompiler {
  build(candidates: string[]): string;
}
type Compile = (
  css: string,
  opts: {
    base: string;
    loadStylesheet: (
      id: string,
      base: string
    ) => Promise<{ path: string; base: string; content: string }>;
  }
) => Promise<TailwindCompiler>;

async function compileWith(stylesheet: string, candidates: string[]): Promise<string> {
  const tw = (await import(requireFromPkg.resolve('tailwindcss'))) as {
    compile?: Compile;
    default?: { compile: Compile };
  };
  const compile = tw.compile ?? tw.default!.compile;
  const compiler = await compile(`@import "tailwindcss";\n${stylesheet}`, {
    base: pkgRoot,
    loadStylesheet: async (id) => {
      const path = requireFromPkg.resolve(id === 'tailwindcss' ? 'tailwindcss/index.css' : id);
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
    },
  });
  return compiler.build(candidates);
}

const escapeClass = (cls: string): string => cls.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);

/**
 * Flattens the one level of CSS nesting Tailwind emits for a variant into a plain selector list.
 * `.u { &:where(X) {…} }` → `.u:where(X)`; `.u { .a, .a * {…} }` → `.u .a, .u .a *`.
 */
function darkSelector(css: string, utility: string): string {
  const host = `.${escapeClass(utility)}`;
  const at = css.indexOf(`${host} {`);
  expect(at, `compiled CSS has a rule for ${utility}`).toBeGreaterThanOrEqual(0);
  const nested = css
    .slice(at + host.length + 2)
    .match(/^\s*([^{]+?)\s*\{/)?.[1]
    ?.trim();
  expect(nested, `${utility} has a nested variant selector`).toBeTruthy();
  return nested!
    .split(/,(?![^(]*\))/)
    .map((part) => part.trim())
    .map((part) => (part.includes('&') ? part.split('&').join(host) : `${host} ${part}`))
    .join(', ');
}

/** Specificity [ids, classes, types] for the selectors Tailwind emits here (`:where` is zero). */
function specificity(selector: string): [number, number, number] {
  let s = selector;
  while (/:where\([^()]*\)/.test(s)) s = s.replace(/:where\([^()]*\)/g, '');
  let extra: [number, number, number] = [0, 0, 0];
  s = s.replace(/:is\(([^()]*)\)/g, (_m, args: string) => {
    const best = args
      .split(',')
      .map((a) => specificity(a.trim()))
      .sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0];
    extra = [extra[0] + best[0], extra[1] + best[1], extra[2] + best[2]];
    return '';
  });
  const unescaped = s.replace(/\\./g, 'x');
  const ids = (unescaped.match(/#[\w-]+/g) ?? []).length;
  const classes = (unescaped.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) ?? []).length;
  const types = (unescaped.match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return [ids + extra[0], classes + extra[1], types + extra[2]];
}

/**
 * Which nodes of a fixed tree a `dark:` utility applies to, given its compiled selector.
 * `onAncestor: false` is the kit's real shape: `dark` sits on the root, with no utility above it.
 */
function matchedIds(selector: string, utility: string, onAncestor = true): string[] {
  document.body.innerHTML = `
    <section id="ancestor" class="${onAncestor ? utility : ''}">
      <div id="sibling-before" class="${utility}"></div>
      <div id="container" class="dark ${utility}">
        <div id="child" class="${utility}"><span id="grandchild" class="${utility}"></span></div>
      </div>
      <div id="sibling-after" class="${utility}"></div>
    </section>
    <div id="portal" class="${utility}"></div>`;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[id]'));
  return nodes.filter((n) => n.matches(selector)).map((n) => n.id);
}

const UTILITY = 'dark:bg-red-500';
const UNDER_DARK = ['container', 'child', 'grandchild'];

describe('SF-10 dark variant: compiled selector (INV-1, INV-2)', () => {
  it('INV-1: the shipped global.css declares the on-and-under variant', () => {
    expect(globalCss.match(VARIANT_LINE)?.[0]).toBe(
      '@custom-variant dark (&:where(.dark, .dark *));'
    );
  });

  it('INV-1: a dark: utility applies on the .dark element and everything inside it, nothing else', async () => {
    const css = await compileWith(globalCss, [UTILITY]);
    const selector = darkSelector(css, UTILITY);
    expect(selector).toBe(`.${escapeClass(UTILITY)}:where(.dark, .dark *)`);
    // Boundary: the element carrying `dark` itself (the root case, html.dark) and its descendants.
    // Failure side: a sibling, an ancestor and a body-level portal are not matched.
    expect(matchedIds(selector, UTILITY)).toEqual(UNDER_DARK);
  });

  it('INV-1 control: the 005 variant matches none of the elements under .dark', async () => {
    const css = await compileWith(globalCss.replace(VARIANT_LINE, VARIANT_005), [UTILITY]);
    const selector = darkSelector(css, UTILITY);
    // Descendant-only of the utility host: the bug SF-10 fixes. The check above must tell them apart.
    expect(selector).toBe(
      `.${escapeClass(UTILITY)} .dark, .${escapeClass(UTILITY)} .dark *`.replace(/\s+/g, ' ')
    );
    expect(matchedIds(selector, UTILITY, false)).toEqual([]);
  });

  it('INV-2: dark: utilities have the same specificity as their light utility', async () => {
    const plain = 'bg-red-500';
    const css = await compileWith(globalCss, [UTILITY, plain, 'dark:hover:bg-red-600']);
    expect(specificity(darkSelector(css, UTILITY))).toEqual(specificity(`.${plain}`));
    expect(specificity(darkSelector(css, UTILITY))).toEqual([0, 1, 0]);
    // Order half: the dark rule is emitted after its base utility, so it wins on a tie.
    expect(css.indexOf(`.${escapeClass(UTILITY)} {`)).toBeGreaterThan(css.indexOf(`.${plain} {`));
  });

  it('INV-2 control: an `:is()` variant would add a class of specificity, and the check sees it', async () => {
    const css = await compileWith(
      globalCss.replace(VARIANT_LINE, '@custom-variant dark (&:is(.dark, .dark *));'),
      [UTILITY]
    );
    expect(specificity(darkSelector(css, UTILITY))).toEqual([0, 2, 0]);
  });
});

describe('SF-10 release decoupling (INV-5, INV-7)', () => {
  // Updated by 006 SF-11 (Design D-3): SF-34's three scoped border workarounds became a plain
  // `border-muted-foreground`, which depends on no variant and no ui-styles version at all, so the
  // intent of this guard holds more strongly. The active-option ring is still scoped, byte-for-byte.
  it('INV-7: SF-34 dark contrast on card radios and the multi-select needs no dark: variant', () => {
    const radio = readFileSync(resolve(pkgRoot, 'src/components/ui/radio-group.tsx'), 'utf8');
    const core = readFileSync(
      resolve(pkgRoot, 'src/components/ui/searchable-multi-select/searchable-select-core.tsx'),
      'utf8'
    );
    // Card unchecked border and card dot ring: plain class, no scoped or dark: border class.
    expect(radio).toContain("'border-muted-foreground bg-background hover:bg-accent");
    expect(radio).toContain('rounded-full border border-muted-foreground">');
    expect(radio).not.toMatch(/\[\.dark_&\]:[\w[\]=-]*:?border-/);
    // Unselected option checkbox border: plain class.
    expect(core).toContain(": 'border-muted-foreground bg-background'");
    expect(core).not.toMatch(/\[\.dark_&\]:[\w[\]=-]*:?border-/);
    // Active-option ring: unchanged since SF-34.
    expect(core).toContain(
      '[.dark_&]:data-[active]:ring-1 [.dark_&]:data-[active]:ring-inset [.dark_&]:data-[active]:ring-muted-foreground'
    );
  });

  it('INV-5: ui-components has no dependency of any kind on ui-styles', () => {
    const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf8')) as Record<
      string,
      Record<string, string> | undefined
    >;
    for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
      expect(Object.keys(pkg[field] ?? {}), field).not.toContain('@openzeppelin/ui-styles');
    }
  });
});

describe('SF-10 NetworkServiceErrorBanner dark classes (INV-10, R2)', () => {
  const networkConfig = { id: 'ethereum-sepolia', name: 'Sepolia' } as NetworkConfig;
  const darkClasses = (el: Element): string[] =>
    Array.from(el.classList).filter((c) => c.startsWith('dark:'));

  it('INV-10: the settings button keeps one red fill in both themes (no dark: class)', () => {
    render(
      <NetworkServiceErrorBanner
        networkConfig={networkConfig}
        serviceType="rpc"
        onOpenNetworkSettings={() => {}}
      />
    );
    const button = screen.getByRole('button', { name: /settings/i });
    expect(darkClasses(button)).toEqual([]);
    expect(button.className).toMatch(/(^|\s)bg-red-600(\s|$)/);
    expect(button.className).toMatch(/(^|\s)hover:bg-red-700(\s|$)/);
  });

  it('R2: the icon dark colour is set on the Alert as an [&>svg] class, not on the icon', () => {
    render(<NetworkServiceErrorBanner networkConfig={networkConfig} serviceType="rpc" />);
    const alert = screen.getByRole('alert');
    // On the icon a single-class utility loses to the Alert's `[&>svg]:text-destructive` (0-1-1).
    expect(darkClasses(alert)).toContain('dark:[&>svg]:text-red-400');
    const icon = alert.querySelector(':scope > svg');
    expect(icon).not.toBeNull();
    expect(darkClasses(icon!)).toEqual([]);
    // No settings handler and no provider: no button at all (the banner's documented fallback).
    expect(screen.queryByRole('button')).toBeNull();
  });
});
