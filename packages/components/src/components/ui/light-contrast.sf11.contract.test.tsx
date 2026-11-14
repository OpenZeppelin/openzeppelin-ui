/**
 * 006 SF-11: the light-theme contrast contract, checked without a browser.
 *
 * - INV-1: light `--muted-foreground` and `--ring` are `oklch(0.53 0 0)` in `:root` and in the first
 *   `@theme` block, and the light and dark tokens SF-11 doesn't own keep their values.
 * - INV-2 / INV-4 (token maths): that value gives ≥ 4.5:1 text and ≥ 3:1 rings on every light surface
 *   the kit uses, including the tinted `primary/5` and `primary/10`. The old value and a one-step
 *   lighter value fail the same check, so it can tell them apart.
 * - INV-5 (class side): `Checkbox` draws a full-opacity focus ring and keeps its invalid ring classes.
 * - INV-6: the unchecked borders of `Checkbox`, default and card `RadioGroupItem` and the multi-select
 *   option checkbox are a plain `border-muted-foreground`, and every state class that must win over
 *   it compiles to a more specific selector.
 * - INV-7: a consumer border colour in `className` replaces the kit's; a border width doesn't.
 * - INV-10: the border class reads only `--muted-foreground`, which every `ui-styles` defines.
 *
 * Measured contrast in the running app (Chromium, both themes) is in the example app's
 * `e2e/light-contrast.sf11.spec.ts`.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Checkbox } from './checkbox';
import { RadioGroup, RadioGroupItem } from './radio-group';

const pkgRoot = process.cwd();
const globalCss = readFileSync(resolve(pkgRoot, '../styles/global.css'), 'utf8');
const requireFromPkg = createRequire(resolve(pkgRoot, 'package.json'));
const source = (rel: string): string => readFileSync(resolve(pkgRoot, rel), 'utf8');

const SF11_VALUE = 'oklch(0.53 0 0)';

// ---------------------------------------------------------------------------------------------
// global.css parsing
// ---------------------------------------------------------------------------------------------

/** Declarations of the first top-level block whose header matches, as a name → value map. */
function block(css: string, header: RegExp): Record<string, string> {
  const at = css.search(header);
  expect(at, `global.css has a block matching ${header}`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf('{', at);
  const close = css.indexOf('\n}', open);
  const body = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const lightRoot = (css: string) => block(css, /^:root\s*\{/m);
const lightTheme = (css: string) => block(css, /^@theme\s*\{/m);
const dark = (css: string) => block(css, /^\.dark\s*\{/m);

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

/** `fg` at `alpha` over an opaque `bg`, in gamma-encoded sRGB (how the browser composites). */
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

/** Every light surface muted text or a focus ring sits on in the kit (Design § Pre-assessed ratios). */
function lightSurfaces(tokens: Record<string, string>): Record<string, Rgb> {
  const c = (name: string) => oklchToSrgb(tokens[name]!);
  const bg = c('--background');
  return {
    background: bg,
    card: c('--card'),
    popover: c('--popover'),
    muted: c('--muted'),
    accent: c('--accent'),
    secondary: c('--secondary'),
    sidebar: c('--sidebar'),
    'muted/50': over(c('--muted'), 0.5, bg),
    'primary/5': over(c('--primary'), 0.05, bg),
    'primary/10': over(c('--primary'), 0.1, bg),
  };
}

/** Surfaces where `value` falls below `need` (empty = passes everywhere). */
function failingSurfaces(value: string, need: number, tokens = lightRoot(globalCss)): string[] {
  const fg = oklchToSrgb(value);
  return Object.entries(lightSurfaces(tokens))
    .filter(([, surface]) => contrast(fg, surface) < need)
    .map(([name, surface]) => `${name} ${contrast(fg, surface)}`);
}

// ---------------------------------------------------------------------------------------------
// Tailwind compile (the repo's own tailwindcss, as in SF-10's contract test)
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

/** The flattened selector and the declarations of a utility's rule (one nesting level). */
function rule(css: string, utility: string): { selector: string; body: string } {
  const host = `.${escapeClass(utility)}`;
  const at = css.indexOf(`${host} {`);
  expect(at, `compiled CSS has a rule for ${utility}`).toBeGreaterThanOrEqual(0);
  const rest = css.slice(at + host.length + 2);
  const nested = rest.match(/^\s*(&[^{]*?)\s*\{([^}]*)\}/);
  if (nested) return { selector: nested[1].split('&').join(host), body: nested[2].trim() };
  return { selector: host, body: rest.slice(0, rest.indexOf('}')).trim() };
}

/** Class-level specificity of the selectors Tailwind emits here: classes + attributes + pseudos. */
const classSpecificity = (selector: string): number =>
  (selector.replace(/\\./g, 'x').match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) ?? []).length;

// ---------------------------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------------------------

const classesOf = (el: Element | null): string[] => {
  expect(el).not.toBeNull();
  return Array.from(el!.classList);
};

function renderCheckbox(className?: string): Element | null {
  const { container } = render(<Checkbox aria-label="Accept" className={className} />);
  return container.querySelector('[data-slot="checkbox"]');
}

function renderDefaultRadio(className?: string): Element | null {
  const { container } = render(
    <RadioGroup aria-label="Plan">
      <RadioGroupItem value="a" aria-label="A" className={className} />
    </RadioGroup>
  );
  return container.querySelector('[role="radio"]');
}

function renderCardRadio(className?: string): { card: Element | null; dot: Element | null } {
  const { container } = render(
    <RadioGroup variant="card" aria-label="Product type">
      <RadioGroupItem value="spot" title="Spot" description="Buy now" className={className} />
    </RadioGroup>
  );
  const card = container.querySelector('[role="radio"][data-variant="card"]');
  return { card, dot: card?.querySelector(':scope > span') ?? null };
}

// The source strings for the five unchecked borders (Design K1–K5).
const RADIO = 'src/components/ui/radio-group.tsx';
const CHECKBOX = 'src/components/ui/checkbox.tsx';
const CORE = 'src/components/ui/searchable-multi-select/searchable-select-core.tsx';

// =============================================================================================

describe('SF-11 INV-1: light token values', () => {
  it('light --muted-foreground and --ring are oklch(0.53 0 0) in :root and in the first @theme', () => {
    const root = lightRoot(globalCss);
    const theme = lightTheme(globalCss);
    expect({
      ':root --muted-foreground': root['--muted-foreground'],
      ':root --ring': root['--ring'],
      '@theme --color-muted-foreground': theme['--color-muted-foreground'],
      '@theme --color-ring': theme['--color-ring'],
    }).toEqual({
      ':root --muted-foreground': SF11_VALUE,
      ':root --ring': SF11_VALUE,
      '@theme --color-muted-foreground': SF11_VALUE,
      '@theme --color-ring': SF11_VALUE,
    });
  });

  it('every token the @theme block and :root both declare has the same value in each', () => {
    // Boundary: the two copies are where a half-applied edit hides (the page still renders right).
    const root = lightRoot(globalCss);
    const theme = lightTheme(globalCss);
    const mismatched = Object.entries(theme)
      // `--selected` aliases `var(--color-primary)` in @theme and `var(--primary)` in :root: same token.
      .map(
        ([name, value]) =>
          [name.replace(/^--color-/, '--'), value.replace(/var\(--color-/g, 'var(--')] as const
      )
      .filter(([name, value]) => root[name] !== undefined && root[name] !== value)
      .map(([name, value]) => `${name}: @theme ${value} ≠ :root ${root[name]}`);
    expect(mismatched).toEqual([]);
  });

  it('the light tokens SF-11 does not own keep their 3b66893e2 values', () => {
    const root = lightRoot(globalCss);
    const pinned: Record<string, string> = {
      '--background': 'oklch(1 0 0)',
      '--card': 'oklch(1 0 0)',
      '--popover': 'oklch(1 0 0)',
      '--primary': 'oklch(55.43% 0.238 273.87)',
      '--secondary': 'oklch(0.97 0 0)',
      '--muted': 'oklch(0.97 0 0)',
      '--accent': 'oklch(0.97 0 0)',
      '--border': 'oklch(0.922 0 0)',
      '--input': 'oklch(0.922 0 0)',
      '--selected': 'var(--primary)',
      '--sidebar': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.708 0 0)',
    };
    expect(Object.fromEntries(Object.keys(pinned).map((k) => [k, root[k]]))).toEqual(pinned);
  });

  it('the dark tokens SF-11 measures against keep their values (no .dark edit)', () => {
    // A search-and-replace of `oklch(0.708 0 0)` would also hit dark --muted-foreground.
    const d = dark(globalCss);
    const pinned: Record<string, string> = {
      '--background': 'oklch(0.145 0 0)',
      '--card': 'oklch(0.145 0 0)',
      '--popover': 'oklch(0.145 0 0)',
      '--primary': 'oklch(0.72 0.18 273.87)',
      '--muted': 'oklch(0.269 0 0)',
      '--muted-foreground': 'oklch(0.708 0 0)',
      '--accent': 'oklch(0.269 0 0)',
      '--border': 'oklch(0.439 0 0)',
      '--input': 'oklch(0.439 0 0)',
      '--ring': 'oklch(0.439 0 0)',
      '--selected': 'var(--primary)',
      '--sidebar-ring': 'oklch(0.439 0 0)',
    };
    expect(Object.fromEntries(Object.keys(pinned).map((k) => [k, d[k]]))).toEqual(pinned);
  });

  it('the value converts to #6c6c6c, the computed colour the browser readout pins', () => {
    expect(oklchToSrgb(SF11_VALUE)).toEqual([108, 108, 108]);
  });
});

describe('SF-11 INV-2, INV-4: token maths on every light surface', () => {
  it('the maths reproduces the browser composites for the tinted surfaces', () => {
    // Chromium reads primary/5 as #f6f6ff and primary/10 as #edeefe (Code Draft readout). Its
    // compositing rounds differently, so allow one 8-bit step per channel.
    const s = lightSurfaces(lightRoot(globalCss));
    const near = (actual: Rgb, expected: Rgb) =>
      actual.every((v, i) => Math.abs(v - expected[i]!) <= 1);
    expect(near(s['primary/5']!, [0xf6, 0xf6, 0xff]), `primary/5 ${s['primary/5']}`).toBe(true);
    expect(near(s['primary/10']!, [0xed, 0xee, 0xfe]), `primary/10 ${s['primary/10']}`).toBe(true);
  });

  it('INV-2: muted text is ≥ 4.5:1 on every light surface', () => {
    const root = lightRoot(globalCss);
    expect(failingSurfaces(root['--muted-foreground']!, 4.5)).toEqual([]);
    // Boundary: the tightest surface is primary/10, just above the line.
    const fg = oklchToSrgb(root['--muted-foreground']!);
    const tightest = Math.min(
      ...Object.values(lightSurfaces(root)).map((surface) => contrast(fg, surface))
    );
    expect(tightest).toBeGreaterThanOrEqual(4.5);
    expect(tightest).toBeLessThan(4.7);
  });

  it('INV-4: the focus ring is ≥ 3:1 on every light surface', () => {
    expect(failingSurfaces(lightRoot(globalCss)['--ring']!, 3)).toEqual([]);
  });

  it('control: the 005 values fail the same checks (the check can see the bug SF-11 fixes)', () => {
    // 005 muted text: about 4.4:1 on the checked card's primary/5 tint and on muted / accent;
    // 005 ring: 2.58:1 on white.
    expect(failingSurfaces('oklch(0.556 0 0)', 4.5)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^primary\/5 4\.[34]\d$/),
        expect.stringMatching(/^muted 4\.[34]\d$/),
      ])
    );
    expect(failingSurfaces('oklch(0.708 0 0)', 3)).toContain('background 2.58');
  });

  it('control: one step lighter (0.54) already fails on primary/10', () => {
    expect(failingSurfaces('oklch(0.54 0 0)', 4.5)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^primary\/10 4\.[34]\d$/)])
    );
  });
});

describe('SF-11 INV-6: plain, variant-free unchecked borders (source)', () => {
  const radio = source(RADIO);
  const checkbox = source(CHECKBOX);
  const core = source(CORE);

  it('K1 default radio, K2 card, K3 card dot ring, K4 Checkbox, K5 option checkbox use border-muted-foreground', () => {
    expect(radio).toContain(
      "'border-muted-foreground bg-background text-selected h-4 w-4 rounded-full border shadow-sm" // K1
    );
    expect(radio).toContain(
      "'border-muted-foreground bg-background hover:bg-accent focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 flex" // K2
    );
    expect(radio).toContain(
      'rounded-full border border-muted-foreground">' // K3
    );
    expect(checkbox).toMatch(/'group border-muted-foreground data-\[state=checked\]:bg-selected/); // K4
    expect(core).toContain(": 'border-muted-foreground bg-background'"); // K5
  });

  it('no border-input is left on the four controls, and no scoped dark border workaround', () => {
    for (const [file, text] of [
      [RADIO, radio],
      [CHECKBOX, checkbox],
    ] as const) {
      expect(text, file).not.toContain('border-input');
      expect(text, file).not.toMatch(/\[\.dark_&\]:[\w[\]=-]*:?border-/);
      expect(text, file).not.toMatch(/dark:[\w[\]=-]*:?border-/);
    }
    // The core file keeps one scoped group: the active-option ring (not a border).
    expect(core).not.toMatch(/\[\.dark_&\]:[\w[\]=-]*:?border-/);
    expect(core).not.toContain("'border-input bg-background");
  });

  it('the dark active-option ring stays byte-for-byte', () => {
    expect(core).toContain(
      '[.dark_&]:data-[active]:ring-1 [.dark_&]:data-[active]:ring-inset [.dark_&]:data-[active]:ring-muted-foreground'
    );
  });
});

describe('SF-11 INV-6, INV-10: compiled border rules', () => {
  const STATE_CLASSES = [
    'data-[state=checked]:border-primary', // card radio
    'data-[state=checked]:border-selected', // Checkbox
    'data-[state=indeterminate]:border-selected', // Checkbox
    'aria-invalid:border-destructive', // Checkbox
    'focus-visible:border-ring', // Checkbox
  ];

  it('INV-10: border-muted-foreground reads only --muted-foreground and needs no variant', async () => {
    const css = await compileWith(['border-muted-foreground']);
    const r = rule(css, 'border-muted-foreground');
    expect(r.selector).toBe('.border-muted-foreground');
    expect(r.body).toBe('border-color: var(--muted-foreground);');
    // Every published ui-styles defines it in both themes.
    expect(lightRoot(globalCss)['--muted-foreground']).toBeDefined();
    expect(dark(globalCss)['--muted-foreground']).toBeDefined();
  });

  it('INV-6: every state class that must win compiles more specific than the base border', async () => {
    const css = await compileWith(['border-muted-foreground', ...STATE_CLASSES]);
    const base = classSpecificity(rule(css, 'border-muted-foreground').selector);
    const weaker = STATE_CLASSES.filter(
      (cls) => classSpecificity(rule(css, cls).selector) <= base
    ).map((cls) => `${cls}: ${rule(css, cls).selector}`);
    expect(weaker).toEqual([]);
  });

  it('INV-6 control: a plain colour utility has the base specificity, so the check can fail', async () => {
    const css = await compileWith(['border-muted-foreground', 'border-primary']);
    expect(classSpecificity(rule(css, 'border-primary').selector)).toBe(
      classSpecificity(rule(css, 'border-muted-foreground').selector)
    );
  });
});

describe('SF-11 INV-5, INV-6: rendered classes', () => {
  it('Checkbox renders the plain border and a full-opacity focus ring', () => {
    const cls = classesOf(renderCheckbox());
    expect(cls).toContain('border-muted-foreground');
    expect(cls).not.toContain('border-input');
    expect(cls).toContain('focus-visible:ring-ring');
    expect(cls).toContain('focus-visible:ring-[3px]');
    // INV-5 failure side: the 2.04:1 half-opacity halo is gone.
    expect(cls).not.toContain('focus-visible:ring-ring/50');
  });

  it('Checkbox keeps its invalid ring and border classes (SF-10 R9 values)', () => {
    const { container } = render(<Checkbox aria-label="Required" aria-invalid="true" />);
    const el = container.querySelector('[data-slot="checkbox"]');
    expect(el?.getAttribute('aria-invalid')).toBe('true');
    const cls = classesOf(el);
    expect(cls).toEqual(
      expect.arrayContaining([
        'aria-invalid:ring-destructive/20',
        'dark:aria-invalid:ring-destructive/40',
        'aria-invalid:border-destructive',
      ])
    );
  });

  it('default and card RadioGroupItem render the plain border (card border and dot ring)', () => {
    const plain = classesOf(renderDefaultRadio());
    expect(plain).toContain('border-muted-foreground');
    expect(plain).not.toContain('border-input');
    const { card, dot } = renderCardRadio();
    expect(classesOf(card)).toContain('border-muted-foreground');
    expect(classesOf(card)).toContain('data-[state=checked]:border-primary');
    expect(classesOf(card).filter((c) => c.includes('dark'))).toEqual([]);
    expect(classesOf(dot)).toContain('border-muted-foreground');
    expect(classesOf(dot).filter((c) => c.includes('dark') || c === 'border-input')).toEqual([]);
  });
});

describe('SF-11 INV-7: consumer className still overrides the border colour', () => {
  const cases = [
    ['Checkbox', (cls?: string) => renderCheckbox(cls)],
    ['default RadioGroupItem', (cls?: string) => renderDefaultRadio(cls)],
    ['card RadioGroupItem', (cls?: string) => renderCardRadio(cls).card],
  ] as const;

  it.each(cases)('%s: border-red-500 replaces border-muted-foreground', (_name, mount) => {
    const cls = classesOf(mount('border-red-500'));
    expect(cls).toContain('border-red-500');
    expect(cls).not.toContain('border-muted-foreground');
  });

  it.each(cases)('%s: border-2 (a width) keeps border-muted-foreground', (_name, mount) => {
    const cls = classesOf(mount('border-2'));
    expect(cls).toContain('border-2');
    expect(cls).toContain('border-muted-foreground');
  });

  it.each(cases)('%s: no className keeps the kit colour (happy path)', (_name, mount) => {
    expect(classesOf(mount())).toContain('border-muted-foreground');
  });
});
