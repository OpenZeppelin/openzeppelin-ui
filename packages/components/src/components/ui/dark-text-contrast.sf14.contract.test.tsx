/**
 * 006 SF-14: the dark-theme text contrast contract, checked without a browser.
 *
 * - INV-1: dark `--destructive` is `oklch(0.704 0.191 22.216)` (Tailwind red-400), declared once in
 *   `.dark`; every other dark token, and the light `--destructive` in `:root` and the first `@theme`,
 *   keep their values; `@theme inline` still maps `--color-destructive` to the token.
 * - INV-2 / INV-6 (token maths): that value is ≥ 4.5:1 as text and ≥ 3:1 as a border on every dark
 *   surface the kit puts it on. The old value, and red-500, fail the same check.
 * - INV-3 (token maths): green-400 is ≥ 4.5:1 on the dark page; green-700 (before) is not.
 * - INV-4 / INV-10: white on the red-900 pin keeps 9.6:1 (hover about 10.5:1); white on the new token
 *   would be about 2.77:1, which is why the kit pins its fills.
 * - INV-7: the three class strings (K1 Button destructive, K2 solid danger Badge, K3 success Alert)
 *   are exact, their light halves are the pre-SF-14 strings, and the pins are palette classes.
 * - INV-10 (a), INV-12, INV-14: each pin compiles to a palette variable (no `ui-styles` variable),
 *   adds no specificity, and is emitted after the light class it must beat, so it wins on order.
 * - INV-11: a consumer `className` override of a token class still wins; a light-only override of a
 *   pinned property keeps the kit's `dark:` class next to it; a matching `dark:` override replaces it.
 *
 * Measured contrast in the running app (Chromium, both themes) is in the example app's
 * `e2e/dark-text-contrast.sf14.spec.ts`.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buttonVariants } from '../../utils/button-variants';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Badge } from './badge';
import { Button } from './button';
import { LoadingButton } from './loading-button';

const pkgRoot = process.cwd();
const globalCss = readFileSync(resolve(pkgRoot, '../styles/global.css'), 'utf8');
const requireFromPkg = createRequire(resolve(pkgRoot, 'package.json'));
const twTheme = readFileSync(requireFromPkg.resolve('tailwindcss/theme.css'), 'utf8');
const source = (rel: string): string => readFileSync(resolve(pkgRoot, rel), 'utf8');

/** Tailwind red-400: the new dark `--destructive`. */
const SF14_DESTRUCTIVE = 'oklch(0.704 0.191 22.216)';
/** Tailwind red-900: the dark `--destructive` before SF-14, and the kit's dark fill pin. */
const OLD_DARK_DESTRUCTIVE = 'oklch(0.396 0.141 25.723)';
const LIGHT_DESTRUCTIVE = 'oklch(0.577 0.245 27.325)';

// ---------------------------------------------------------------------------------------------
// global.css parsing (as in SF-11's contract test)
// ---------------------------------------------------------------------------------------------

/** Raw body (comments kept) of the first top-level block whose header matches. */
function blockBody(css: string, header: RegExp): string {
  const at = css.search(header);
  expect(at, `global.css has a block matching ${header}`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf('{', at);
  return css.slice(open + 1, css.indexOf('\n}', open));
}

/** Declarations of a block as a name → value map (comments stripped). */
function block(css: string, header: RegExp): Record<string, string> {
  const body = blockBody(css, header).replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const lightRoot = (css: string) => block(css, /^:root\s*\{/m);
const lightTheme = (css: string) => block(css, /^@theme\s*\{/m);
const themeInline = (css: string) => block(css, /^@theme inline\s*\{/m);
const dark = (css: string) => block(css, /^\.dark\s*\{/m);

/** A Tailwind v4 palette colour (`red-400`) as written in tailwindcss/theme.css. */
function palette(name: string): string {
  const m = twTheme.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  expect(m, `tailwindcss/theme.css defines --color-${name}`).not.toBeNull();
  return m![1].trim();
}

/** The `.dark` block at 6d743fccf (the 006 base SF-14 branched from), minus `--destructive`. */
const DARK_AT_BASE: Record<string, string> = {
  '--background': 'oklch(0.145 0 0)',
  '--foreground': 'oklch(0.985 0 0)',
  '--card': 'oklch(0.145 0 0)',
  '--card-foreground': 'oklch(0.985 0 0)',
  '--popover': 'oklch(0.145 0 0)',
  '--popover-foreground': 'oklch(0.985 0 0)',
  '--primary': 'oklch(0.72 0.18 273.87)',
  '--primary-foreground': 'oklch(0.145 0 0)',
  '--secondary': 'oklch(0.269 0 0)',
  '--secondary-foreground': 'oklch(0.985 0 0)',
  '--muted': 'oklch(0.269 0 0)',
  '--muted-foreground': 'oklch(0.708 0 0)',
  '--accent': 'oklch(0.269 0 0)',
  '--accent-foreground': 'oklch(0.985 0 0)',
  '--destructive-foreground': 'oklch(0.985 0 0)',
  '--success': 'oklch(0.396 0.12 150)',
  '--success-foreground': 'oklch(0.985 0 0)',
  '--warning': 'oklch(0.5 0.17 80)',
  '--warning-foreground': 'oklch(0.985 0 0)',
  '--info': 'oklch(0.396 0.18 225)',
  '--info-foreground': 'oklch(0.985 0 0)',
  '--selected': 'var(--primary)',
  '--selected-foreground': 'var(--primary-foreground)',
  '--border': 'oklch(0.439 0 0)',
  '--input': 'oklch(0.439 0 0)',
  '--ring': 'oklch(0.439 0 0)',
  '--chart-1': 'oklch(0.488 0.243 264.376)',
  '--chart-2': 'oklch(0.696 0.17 162.48)',
  '--chart-3': 'oklch(0.769 0.188 70.08)',
  '--chart-4': 'oklch(0.627 0.265 303.9)',
  '--chart-5': 'oklch(0.645 0.246 16.439)',
  '--sidebar': 'oklch(0.205 0 0)',
  '--sidebar-foreground': 'oklch(0.985 0 0)',
  '--sidebar-primary': 'oklch(0.488 0.243 264.376)',
  '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
  '--sidebar-accent': 'oklch(0.269 0 0)',
  '--sidebar-accent-foreground': 'oklch(0.985 0 0)',
  '--sidebar-border': 'oklch(0.269 0 0)',
  '--sidebar-ring': 'oklch(0.439 0 0)',
};

// ---------------------------------------------------------------------------------------------
// Colour maths (CSS Color 4 OKLCH → sRGB, 8-bit like the browser, WCAG 2 contrast)
// ---------------------------------------------------------------------------------------------

type Rgb = [number, number, number];

function oklchToSrgb(value: string): Rgb {
  const m = value.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  expect(m, `parsable oklch: ${value}`).not.toBeNull();
  const L = Number(m![1]) / (m![2] ? 100 : 1);
  const C = Number(m![3]);
  const h = (Number(m![4]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  const enc = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
  };
  return [enc(lin[0]), enc(lin[1]), enc(lin[2])];
}

const hex = (c: Rgb): string => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

/** `fg` at `alpha` over an opaque `bg`, in gamma-encoded sRGB. */
const over = (fg: Rgb, alpha: number, bg: Rgb): Rgb =>
  [0, 1, 2].map((i) => Math.round(fg[i] * alpha + bg[i] * (1 - alpha))) as Rgb;

function contrast(x: Rgb, y: Rgb): number {
  const lum = (c: Rgb) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
}

/** Every dark surface `text-destructive` sits on in the kit (Invariants INV-2). */
function darkSurfaces(destructive: string): Record<string, Rgb> {
  const d = dark(globalCss);
  const c = (name: string) => oklchToSrgb(d[name]!);
  const bg = c('--background');
  const fill = oklchToSrgb(destructive);
  return {
    background: bg,
    card: c('--card'),
    popover: c('--popover'),
    muted: c('--muted'),
    accent: c('--accent'),
    secondary: c('--secondary'),
    sidebar: c('--sidebar'),
    'banner red-950/20': over(oklchToSrgb(palette('red-950')), 0.2, bg),
    'destructive/10': over(fill, 0.1, bg),
    'destructive/5': over(fill, 0.05, bg),
  };
}

/** Surfaces where `value` falls below `need` against the dark surfaces it would sit on. */
function failingDark(value: string, need: number): string[] {
  const fg = oklchToSrgb(value);
  return Object.entries(darkSurfaces(value))
    .filter(([, surface]) => contrast(fg, surface) < need)
    .map(([name, surface]) => `${name} ${contrast(fg, surface)}`);
}

// ---------------------------------------------------------------------------------------------
// Tailwind compile (the repo's own tailwindcss, as in SF-10's and SF-11's contract tests)
// ---------------------------------------------------------------------------------------------

type Compile = (
  css: string,
  opts: {
    base: string;
    loadStylesheet: (
      id: string,
      base: string
    ) => Promise<{ path: string; base: string; content: string }>;
  }
) => Promise<{ build(candidates: string[]): string }>;

async function compileWith(candidates: string[]): Promise<string> {
  const tw = (await import(requireFromPkg.resolve('tailwindcss'))) as {
    compile?: Compile;
    default?: { compile: Compile };
  };
  const compile = tw.compile ?? tw.default!.compile;
  const compiler = await compile(`@import "tailwindcss";\n${globalCss}`, {
    base: pkgRoot,
    loadStylesheet: async (id) => {
      const path = requireFromPkg.resolve(id === 'tailwindcss' ? 'tailwindcss/index.css' : id);
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
    },
  });
  return compiler.build(candidates);
}

const escapeClass = (cls: string): string => cls.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);

/** Where a utility's rule starts in the compiled CSS (-1 if absent). */
const ruleAt = (css: string, utility: string): number => css.indexOf(`.${escapeClass(utility)} {`);

/** A utility's whole rule, nesting included (balanced braces from its selector). */
function ruleText(css: string, utility: string): string {
  const at = ruleAt(css, utility);
  expect(at, `compiled CSS has a rule for ${utility}`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = css.indexOf('{', at); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(at, i + 1);
  }
  throw new Error(`unbalanced rule for ${utility}`);
}

// ---------------------------------------------------------------------------------------------
// Class strings and rendering helpers
// ---------------------------------------------------------------------------------------------

const tokens = (s: string): string[] => s.split(/\s+/).filter(Boolean);
const lightHalf = (s: string): string =>
  tokens(s)
    .filter((t) => !t.startsWith('dark:'))
    .join(' ');

/** K1–K3 after SF-14 (Invariants INV-7). */
const K1 =
  'bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-red-900 dark:hover:bg-red-900/90';
const K2 = 'bg-destructive text-destructive-foreground dark:bg-red-900';
const K3 =
  'border-green-500/50 text-green-700 dark:border-green-500 dark:text-green-400 [&>svg]:text-green-700 dark:[&>svg]:text-green-400';
/** The same three strings at 6d743fccf. */
const K1_BEFORE = 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
const K2_BEFORE = 'bg-destructive text-destructive-foreground';
const K3_BEFORE = 'border-green-500/50 text-green-700 dark:border-green-500 [&>svg]:text-green-700';

/** The new dark tokens, each of which reaches the browser only through a palette variable. */
const PINS = [
  'dark:bg-red-900',
  'dark:hover:bg-red-900/90',
  'dark:text-green-400',
  'dark:[&>svg]:text-green-400',
];

const classesOf = (el: Element | null): string[] => {
  expect(el).not.toBeNull();
  return Array.from(el!.classList);
};

function renderAlert(variant: 'destructive' | 'success', className?: string): Element | null {
  const { container } = render(
    <Alert variant={variant} className={className}>
      <svg aria-hidden="true" />
      <AlertTitle>Title</AlertTitle>
      <AlertDescription>Description</AlertDescription>
    </Alert>
  );
  return container.querySelector('[role="alert"]');
}

function renderButton(className?: string): Element | null {
  const { container } = render(
    <Button variant="destructive" className={className}>
      Delete
    </Button>
  );
  return container.querySelector('button');
}

function renderDangerBadge(className?: string): Element | null {
  const { container } = render(
    <Badge variant="solid" tone="danger" label="Failed" className={className} />
  );
  return container.querySelector('span, button');
}

// =============================================================================================

describe('SF-14 INV-1: dark --destructive is red-400, and nothing else moves', () => {
  it('the .dark block declares --destructive: oklch(0.704 0.191 22.216), exactly once', () => {
    expect(dark(globalCss)['--destructive']).toBe(SF14_DESTRUCTIVE);
    const declarations = blockBody(globalCss, /^\.dark\s*\{/m).match(/--destructive\s*:/g) ?? [];
    expect(declarations).toHaveLength(1);
  });

  it('the value is Tailwind red-400 and computes to #ff6467, the colour the browser readout pins', () => {
    expect(palette('red-400')).toBe('oklch(70.4% 0.191 22.216)');
    expect(hex(oklchToSrgb(SF14_DESTRUCTIVE))).toBe('#ff6467');
    // The previous value is red-900 (#82181a), which the kit's fills now pin by class.
    expect(palette('red-900')).toBe('oklch(39.6% 0.141 25.723)');
    expect(hex(oklchToSrgb(OLD_DARK_DESTRUCTIVE))).toBe('#82181a');
  });

  it('every other dark token keeps its 6d743fccf value (no extra .dark edit)', () => {
    // Boundary: --success and --info share the `oklch(0.396` prefix with the old value, so a
    // search-and-replace would hit them (Invariants INV-14 violation scenario).
    const { '--destructive': _changed, ...rest } = dark(globalCss);
    expect(rest).toEqual(DARK_AT_BASE);
  });

  it('light --destructive is unchanged in :root and the first @theme, and @theme inline still maps it', () => {
    expect(lightRoot(globalCss)['--destructive']).toBe(LIGHT_DESTRUCTIVE);
    expect(lightTheme(globalCss)['--color-destructive']).toBe(LIGHT_DESTRUCTIVE);
    expect(themeInline(globalCss)['--color-destructive']).toBe('var(--destructive)');
    expect(themeInline(globalCss)['--color-destructive-foreground']).toBe(
      'var(--destructive-foreground)'
    );
  });
});

describe('SF-14 INV-2, INV-6: destructive token maths on every dark surface', () => {
  /** The value global.css ships, so a wrong token fails these as well as INV-1. */
  const live = () => dark(globalCss)['--destructive']!;

  it('INV-2: as text it is ≥ 4.5:1 on every dark surface, including its own tints and the banner', () => {
    expect(failingDark(live(), 4.5)).toEqual([]);
  });

  it('INV-2 boundary: the tightest surface is muted/accent/secondary, about 5.2:1', () => {
    const fg = oklchToSrgb(live());
    const ratios = Object.values(darkSurfaces(live())).map((s) => contrast(fg, s));
    const tightest = Math.min(...ratios);
    expect(tightest).toBeGreaterThanOrEqual(4.5);
    expect(tightest).toBeLessThan(5.5);
    expect(contrast(fg, oklchToSrgb(dark(globalCss)['--accent']!))).toBe(tightest);
  });

  it('INV-6: as a border or the RadioField dot it is ≥ 3:1 on every dark surface', () => {
    expect(failingDark(live(), 3)).toEqual([]);
  });

  it('INV-6: the invalid focus halo (destructive/40) rises from about 1.2 to about 1.9 on the page', () => {
    const bg = oklchToSrgb(dark(globalCss)['--background']!);
    const halo = (v: string) => contrast(over(oklchToSrgb(v), 0.4, bg), bg);
    expect(halo(OLD_DARK_DESTRUCTIVE)).toBeLessThan(1.3);
    expect(halo(live())).toBeGreaterThan(halo(OLD_DARK_DESTRUCTIVE));
    expect(halo(live())).toBeGreaterThan(1.8);
  });

  it('control: the old dark value fails as text everywhere (about 1.97 on the page)', () => {
    const fails = failingDark(OLD_DARK_DESTRUCTIVE, 4.5);
    expect(fails).toHaveLength(Object.keys(darkSurfaces(OLD_DARK_DESTRUCTIVE)).length);
    expect(fails).toContain('background 1.97');
  });

  it('control: red-500 passes on the page but fails on accent (the focused menu item)', () => {
    // Invariants INV-1 violation scenario: about 3.96:1 for a focused destructive menu item.
    const red500 = palette('red-500');
    const fails = failingDark(red500, 4.5);
    expect(fails).toEqual(expect.arrayContaining([expect.stringMatching(/^accent 3\.9\d$/)]));
    expect(fails.some((f) => f.startsWith('background '))).toBe(false);
  });
});

describe('SF-14 INV-3: success Alert green-400 token maths', () => {
  const bg = () => oklchToSrgb(dark(globalCss)['--background']!);

  it('green-400 is ≥ 4.5:1 on the dark page (about 11:1)', () => {
    const r = contrast(oklchToSrgb(palette('green-400')), bg());
    expect(r).toBeGreaterThanOrEqual(4.5);
    expect(r).toBeGreaterThan(10.5);
  });

  it('control: green-700, the light colour the Alert showed in dark before, is about 4.0:1', () => {
    const r = contrast(oklchToSrgb(palette('green-700')), bg());
    expect(r).toBeLessThan(4.5);
    expect(r).toBeGreaterThan(3.9);
  });
});

describe('SF-14 INV-4, INV-10: white on the kit fills', () => {
  const white = () => oklchToSrgb(dark(globalCss)['--destructive-foreground']!);
  const bg = () => oklchToSrgb(dark(globalCss)['--background']!);
  const red900 = () => oklchToSrgb(palette('red-900'));

  it('INV-4: white on the red-900 pin is about 9.6:1 at rest and higher on the 90% hover fill', () => {
    const rest = contrast(white(), red900());
    const hover = contrast(white(), over(red900(), 0.9, bg()));
    expect(rest).toBeGreaterThanOrEqual(9.5);
    expect(hover).toBeGreaterThan(rest);
  });

  it('INV-4: the pin is the exact colour of the pre-SF-14 token, so the fill does not move', () => {
    expect(oklchToSrgb(palette('red-900'))).toEqual(oklchToSrgb(OLD_DARK_DESTRUCTIVE));
  });

  it('INV-10 (b) failure side: white on the new token itself is about 2.77:1', () => {
    // What old ui-components (no pin) draw on new ui-styles, and what a consumer's own
    // white-on-bg-destructive fill gets in dark. The changeset warns about it.
    const r = contrast(white(), oklchToSrgb(dark(globalCss)['--destructive']!));
    expect(r).toBeLessThan(3);
    expect(r).toBeGreaterThan(2.6);
  });
});

describe('SF-14 INV-7: K1, K2, K3 class strings', () => {
  const buttonSrc = source('src/utils/button-variants.ts');
  const badgeSrc = source('src/components/ui/badge.tsx');
  const alertSrc = source('src/components/ui/alert.tsx');

  it('K1, K2, K3 are the exact SF-14 strings in source', () => {
    expect(buttonSrc).toContain(`'${K1}'`);
    expect(badgeSrc).toContain(`danger: '${K2}'`);
    expect(alertSrc).toContain(`'${K3}'`);
  });

  it('with dark: tokens removed, each equals its 6d743fccf string (light half byte-identical)', () => {
    expect(lightHalf(K1)).toBe(K1_BEFORE);
    expect(lightHalf(K2)).toBe(K2_BEFORE);
    expect(lightHalf(K3)).toBe(lightHalf(K3_BEFORE));
    // K3 kept its one pre-existing dark token (the border) and added two.
    expect(tokens(K3).filter((t) => !tokens(K3_BEFORE).includes(t))).toEqual([
      'dark:text-green-400',
      'dark:[&>svg]:text-green-400',
    ]);
  });

  it('the pins are palette classes: no oklch(, arbitrary value, text-white or CSS variable', () => {
    for (const pin of PINS) {
      expect(pin).toMatch(/^dark:(hover:|\[&>svg\]:)?(bg|text)-(red|green)-\d00(\/90)?$/);
    }
    for (const src of [buttonSrc, badgeSrc]) {
      expect(src).not.toContain('oklch(');
      expect(src).not.toMatch(/\b(bg|text)-\[/);
      expect(src).not.toContain('text-white');
      expect(src).not.toMatch(/var\(--/);
    }
  });

  it('the other variants are untouched: no other Button variant, Badge tone or Alert variant pins red-900', () => {
    for (const variant of ['default', 'outline', 'secondary', 'ghost', 'link'] as const) {
      expect(buttonVariants({ variant }), variant).not.toMatch(/red-900|green-400/);
    }
    expect(alertSrc).toContain(
      "'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive'"
    );
    // The pin appears once in each file: on the solid danger line and the destructive variant.
    expect(badgeSrc.match(/dark:bg-red-900/g)).toHaveLength(1);
    expect(buttonSrc.match(/dark:bg-red-900/g)).toHaveLength(1);
  });

  it('Button, LoadingButton and buttonVariants render every K1 token', () => {
    expect(tokens(buttonVariants({ variant: 'destructive' }))).toEqual(
      expect.arrayContaining(tokens(K1))
    );
    expect(classesOf(renderButton())).toEqual(expect.arrayContaining(tokens(K1)));
    const { container } = render(
      <LoadingButton variant="destructive" loading>
        Delete
      </LoadingButton>
    );
    expect(classesOf(container.querySelector('button'))).toEqual(
      expect.arrayContaining(tokens(K1))
    );
  });

  it('the solid danger Badge renders every K2 token; solid success gets no pin', () => {
    expect(classesOf(renderDangerBadge())).toEqual(expect.arrayContaining(tokens(K2)));
    const { container } = render(<Badge variant="solid" tone="success" label="Done" />);
    const success = classesOf(container.querySelector('span'));
    expect(success).toContain('bg-success');
    expect(success.filter((c) => c.startsWith('dark:'))).toEqual([]);
  });

  it('INV-12: an interactive, pressed solid danger Badge keeps the pin; hover and pressed set no fill', () => {
    // Hover is a brightness filter and pressed an inset ring on solid badges, so neither can
    // replace the red-900 base. No demo has an interactive solid danger Badge to hover in Chromium.
    const { container } = render(
      <Badge variant="solid" tone="danger" label="Failed" pressed onActivate={() => undefined} />
    );
    const button = container.querySelector('button');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    const cls = classesOf(button);
    expect(cls).toEqual(expect.arrayContaining([...tokens(K2), 'hover:brightness-95']));
    expect(cls.filter((c) => /^(dark:)?(hover|aria-pressed|data-\[[^\]]+\]):bg-/.test(c))).toEqual(
      []
    );
    expect(cls.filter((c) => /^bg-/.test(c))).toEqual(['bg-destructive']);
  });

  it('the success Alert renders every K3 token; the destructive Alert gets none of them', () => {
    expect(classesOf(renderAlert('success'))).toEqual(expect.arrayContaining(tokens(K3)));
    const destructive = classesOf(renderAlert('destructive'));
    expect(destructive).toContain('text-destructive');
    expect(destructive.filter((c) => PINS.includes(c))).toEqual([]);
  });
});

describe('SF-14 INV-10 (a), INV-12, INV-14: compiled pins', () => {
  const LIGHT_PARTNER: [pin: string, light: string][] = [
    ['dark:bg-red-900', 'bg-destructive'],
    ['dark:hover:bg-red-900/90', 'hover:bg-destructive/90'],
    ['dark:text-green-400', 'text-green-700'],
    ['dark:[&>svg]:text-green-400', '[&>svg]:text-green-700'],
  ];

  it('INV-10 (a): each pin reads a Tailwind palette variable, never a ui-styles token', async () => {
    const css = await compileWith(PINS);
    expect(ruleText(css, 'dark:bg-red-900')).toContain('background-color: var(--color-red-900)');
    expect(ruleText(css, 'dark:hover:bg-red-900/90')).toMatch(
      /background-color: color-mix\(in oklab, var\(--color-red-900\) 90%, transparent\)/
    );
    expect(ruleText(css, 'dark:text-green-400')).toContain('color: var(--color-green-400)');
    expect(ruleText(css, 'dark:[&>svg]:text-green-400')).toContain('color: var(--color-green-400)');
    for (const pin of PINS)
      expect(ruleText(css, pin), pin).not.toMatch(/var\(--(destructive|success)/);
    // The palette variables come from Tailwind's own theme, which ui-styles doesn't define.
    expect(css).toMatch(/--color-red-900: oklch\(39\.6% 0\.141 25\.723\)/);
    expect(css).toMatch(/--color-green-400: oklch\(79\.2% 0\.209 151\.711\)/);
  });

  it('INV-12: each pin goes through the zero-specificity dark variant', async () => {
    const css = await compileWith(PINS);
    for (const pin of PINS) expect(ruleText(css, pin), pin).toContain(':where(.dark, .dark *)');
  });

  it('INV-12, INV-14: each pin is emitted after the light class it must beat (order decides)', async () => {
    const css = await compileWith(LIGHT_PARTNER.flat());
    const late = LIGHT_PARTNER.filter(([pin, light]) => ruleAt(css, pin) < ruleAt(css, light)).map(
      ([pin, light]) => `${pin} (${ruleAt(css, pin)}) before ${light} (${ruleAt(css, light)})`
    );
    expect(late).toEqual([]);
    // The hover pair both sit inside @media (hover: hover), so the real-hover row in the e2e spec
    // is what proves the outcome; this check explains a failure.
    expect(ruleText(css, 'dark:hover:bg-red-900/90')).toContain('@media (hover: hover)');
    expect(ruleText(css, 'hover:bg-destructive/90')).toContain('@media (hover: hover)');
  });
});

describe('SF-14 INV-11: consumer className overrides', () => {
  it('a token-class override still wins in both themes: text-red-900 drops text-destructive', () => {
    const cls = classesOf(renderAlert('destructive', 'text-red-900'));
    expect(cls).toContain('text-red-900');
    expect(cls).not.toContain('text-destructive');
  });

  it('happy path: no className keeps the kit pins', () => {
    expect(classesOf(renderButton())).toContain('dark:bg-red-900');
    expect(classesOf(renderDangerBadge())).toContain('dark:bg-red-900');
    expect(classesOf(renderAlert('success'))).toContain('dark:text-green-400');
  });

  it('a light-only fill override wins in light but keeps the kit dark: pin next to it', () => {
    // Button: bg-red-600 replaces bg-destructive; dark:bg-red-900 stays and wins in dark.
    const button = classesOf(renderButton('bg-red-600'));
    expect(button).toContain('bg-red-600');
    expect(button).not.toContain('bg-destructive');
    expect(button).toEqual(expect.arrayContaining(['dark:bg-red-900', 'dark:hover:bg-red-900/90']));
    const badge = classesOf(renderDangerBadge('bg-red-600'));
    expect(badge).toContain('bg-red-600');
    expect(badge).not.toContain('bg-destructive');
    expect(badge).toContain('dark:bg-red-900');
  });

  it('a light-only text override on the success Alert keeps dark:text-green-400', () => {
    const cls = classesOf(renderAlert('success', 'text-red-900'));
    expect(cls).toContain('text-red-900');
    expect(cls).not.toContain('text-green-700');
    expect(cls).toContain('dark:text-green-400');
  });

  it('a matching dark: override replaces the pin (the changeset advice works)', () => {
    const button = classesOf(renderButton('bg-red-600 dark:bg-red-950/20'));
    expect(button).toContain('dark:bg-red-950/20');
    expect(button).not.toContain('dark:bg-red-900');
    const badge = classesOf(renderDangerBadge('bg-red-600 dark:bg-red-950/20'));
    expect(badge).not.toContain('dark:bg-red-900');
    const alert = classesOf(renderAlert('success', 'text-red-900 dark:text-red-100'));
    expect(alert).toContain('dark:text-red-100');
    expect(alert).not.toContain('dark:text-green-400');
  });
});
