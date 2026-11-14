/**
 * 007 SF-3 · source and package-surface guards for the grouped exact input: no float or
 * locale API (INV-16), the three write sites (INV-17), selection sites and no focus call
 * (INV-25, INV-36), two effects and nothing else (INV-31), nothing new exported and no
 * new dependency (INV-33), and the files the opt-in must not change (INV-2).
 * Extended for the grouped-path restrictInput / padDecimals helpers and props (exports,
 * JSX props, Number.isSafeInteger gate, onBeforeInput / onSelect, refuse-restore
 * setSelectionRange). The INV-8 compile-time cases live in
 * `AmountField.grouped-types.sf3-check.tsx`, compiled by the package `typecheck`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import * as packageEntry from '../../../index';
import * as groupedInputModule from '../AmountFieldGroupedExactInput';
import * as fieldsBarrel from '../index';
import * as utilsBarrel from '../utils';
import * as amountGrouping from '../utils/amountGrouping';

const fieldsDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(fieldsDir, '../../../../..');
const raw = (file: string): string => readFileSync(path.join(fieldsDir, file), 'utf8');
/** Source with block and line comments removed. */
const source = (file: string): string =>
  raw(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const GROUPED_INPUT = 'AmountFieldGroupedExactInput.tsx';
const GROUPING_UTILS = 'utils/amountGrouping.ts';
const NEW_FILES = [GROUPED_INPUT, GROUPING_UTILS];

const count = (code: string, pattern: RegExp): number => (code.match(pattern) ?? []).length;

describe('INV-16: no float, no Intl and no locale API in the grouped path', () => {
  it.each(NEW_FILES)('%s converts no amount to a JS number', (file) => {
    // Number.isSafeInteger is allowed: it gates the decimals prop, it never converts an amount.
    const code = source(file).replace(/\bNumber\.isSafeInteger\b/g, 'SAFE_INT');
    expect(code).not.toMatch(
      /parseFloat|parseInt|\bNumber\(|\bNumber\.|toFixed|toPrecision|toLocaleString|\bIntl\.|\bMath\./
    );
    // Unary plus on an identifier or a call: `+text`, `= +value`.
    expect(code).not.toMatch(/[=(,:?]\s*\+\s*[A-Za-z_(]/);
  });

  it('boundary: groupAmountText has no lookahead grouping regex and builds no RegExp at runtime', () => {
    // Comma stripping in the restrict/pad helpers may use `.replace`; the grouper itself must not.
    const code = source(GROUPING_UTILS);
    const start = code.indexOf('export function groupAmountText');
    const end = code.indexOf('export function toPlainOffset', start);
    const body = code.slice(start, end === -1 ? undefined : end);
    expect(body).not.toMatch(/\(\?=|\(\?!|new RegExp|\.replace\(/);
  });

  it('every form write in the grouped input goes through the canonical form or is the empty string', () => {
    const calls = source(GROUPED_INPUT).match(/field\.onChange\(([^)]*\)?)\)/g) ?? [];
    expect(calls.sort()).toEqual(
      [
        "field.onChange('')",
        'field.onChange(canonical(field.value))',
        'field.onChange(nextValue)',
      ].sort()
    );
    expect(source(GROUPED_INPUT)).toMatch(/const nextValue = canonical\(nextText\);/);
  });
});

describe('INV-17: the form value has three write sites and no others', () => {
  it('field.onChange is called at exactly three places: the edit, Escape and the passive effect', () => {
    const code = source(GROUPED_INPUT);
    expect(count(code, /field\.onChange\(/g)).toBe(3);
    expect(count(code, /\.onChange\b/g)).toBe(3);
    // No other way to write the form from this file.
    expect(code).not.toMatch(/setValue|useFormContext|useController|\bcontrol\b|_formValues/);
  });

  it('failure case: neither the blur nor the focus handler contains a write', () => {
    const code = source(GROUPED_INPUT);
    const body = (name: string): string => {
      const start = code.indexOf(`const ${name} =`);
      expect(start, name).toBeGreaterThan(-1);
      const next = code.indexOf('\n  const handle', start + 1);
      return code.slice(start, next === -1 ? code.indexOf('return (', start) : next);
    };
    expect(body('handleBlur')).not.toMatch(/field\.onChange/);
    expect(body('handleBlur')).toMatch(/field\.onBlur\(\)/);
    expect(body('handleFocus')).not.toMatch(/field\.on(Change|Blur)/);
  });
});

describe('INV-25 / INV-36: selection sites, and the kit never focuses the input', () => {
  it('setSelectionRange is called twice: focus map in the layout effect, refuse-restore in onChange', () => {
    const code = source(GROUPED_INPUT);
    expect(count(code, /setSelectionRange/g)).toBe(2);
    const layoutStart = code.indexOf('useLayoutEffect(');
    const layoutEnd = code.indexOf('});', layoutStart);
    const layoutAt = code.indexOf('setSelectionRange', layoutStart);
    expect(layoutAt).toBeGreaterThan(layoutStart);
    expect(layoutAt).toBeLessThan(layoutEnd);
    // Guarded by "still the active element", so it cannot pull focus back.
    expect(code.slice(layoutStart, layoutEnd)).toMatch(
      /ownerDocument\.activeElement === pending\.el/
    );
    // The second call restores the caret after a refused insert (restrictInput safety net).
    const changeStart = code.indexOf('const handleChange =');
    const changeAt = code.indexOf('setSelectionRange', changeStart);
    expect(changeAt).toBeGreaterThan(changeStart);
    expect(code.slice(changeStart, changeAt)).toMatch(/restrictInput/);
  });

  it('there is no .focus( or .select( call and no pointer or mouse handler', () => {
    const code = source(GROUPED_INPUT);
    expect(code).not.toMatch(/\.focus\(|\.select\(|autoFocus/);
    // onSelect + onBeforeInput track / refuse for restrictInput; pointer/mouse still forbidden.
    expect(code).not.toMatch(/onMouse|onPointer|onClick|onTouch/);
    expect(code).toMatch(/onBeforeInput=\{handleBeforeInput\}/);
    expect(code).toMatch(/onSelect=\{/);
  });
});

describe('INV-31: two effects, no timers or listeners', () => {
  it('exactly one useEffect and one useLayoutEffect; neither sets local state', () => {
    const code = source(GROUPED_INPUT);
    expect(count(code, /\buseEffect\(/g)).toBe(1);
    expect(count(code, /\buseLayoutEffect\(/g)).toBe(1);
    expect(code).not.toMatch(
      /useInsertionEffect|useMemo|useCallback|useReducer|useSyncExternalStore/
    );
    for (const hook of ['useEffect(', 'useLayoutEffect(']) {
      const start = code.indexOf(hook);
      const body = code.slice(start, code.indexOf('});', start));
      expect(body, hook).not.toMatch(/setState/);
    }
  });

  it('the normalising effect has no dependency list, so it re-checks after every commit', () => {
    const code = source(GROUPED_INPUT);
    const start = code.indexOf('useEffect(');
    const end = code.indexOf('});', start);
    expect(code.slice(end, end + 3)).toBe('});');
    expect(code.slice(start, end)).not.toMatch(/\},\s*\[/);
  });

  it('no timer, animation frame, listener, observer or subscription', () => {
    expect(source(GROUPED_INPUT)).not.toMatch(
      /setTimeout|setInterval|requestAnimationFrame|requestIdleCallback|queueMicrotask|addEventListener|Observer|subscribe\(|flushSync/
    );
  });
});

describe('INV-33: no new dependency and no new public name', () => {
  const internalNames = [...Object.keys(amountGrouping), ...Object.keys(groupedInputModule)];

  it('the two new modules export the expected internal set', () => {
    expect(Object.keys(amountGrouping).sort()).toEqual(
      [
        'groupAmountText',
        'groupPaddedAmountText',
        'isAllowedRestrictedAmountText',
        'isGroupedAmountValue',
        'toPlainOffset',
      ].sort()
    );
    expect(Object.keys(groupedInputModule)).toEqual(['AmountFieldGroupedExactInput']);
  });

  it.each([
    ['fields/utils barrel', utilsBarrel],
    ['fields barrel', fieldsBarrel],
    ['package entry', packageEntry],
  ])('%s re-exports none of them', (_label, barrel) => {
    const keys = new Set(Object.keys(barrel));
    for (const name of internalNames) expect(keys.has(name), name).toBe(false);
  });

  it('no index.ts under src names either new file', () => {
    const srcDir = path.resolve(fieldsDir, '../..');
    const barrels = (readdirSync(srcDir, { recursive: true }) as string[]).filter((f) =>
      /(^|[\\/])index\.tsx?$/.test(f)
    );
    expect(barrels.length).toBeGreaterThan(3);
    for (const barrel of barrels) {
      const text = readFileSync(path.join(srcDir, barrel), 'utf8');
      expect(text, barrel).not.toMatch(/amountGrouping|AmountFieldGroupedExactInput/);
    }
  });

  it('the grouped input takes the plain exact input as a type-only import', () => {
    const imports = raw(GROUPED_INPUT).match(/^import .*AmountFieldExactInput.*$/gm) ?? [];
    expect(imports).toEqual([
      "import type { AmountFieldExactInputProps } from './AmountFieldExactInput';",
    ]);
  });

  it('the new files import only React, the Input and the two internal util modules', () => {
    const froms = (file: string): string[] =>
      Array.from(raw(file).matchAll(/from '([^']+)'/g), (m) => m[1] as string).sort();
    expect(froms(GROUPED_INPUT)).toEqual(
      [
        'react',
        './utils/amountGrouping',
        './utils/decimalValidation',
        '../ui/input',
        './AmountFieldExactInput',
      ].sort()
    );
    expect(froms(GROUPING_UTILS)).toEqual(['./decimalValidation']);
  });

  it('the release note is folded into the unreleased exact-entry changeset; no changeset of its own', () => {
    const dir = path.join(repoRoot, '.changeset');
    const mentioning = readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .filter((f) => readFileSync(path.join(dir, f), 'utf8').includes('groupedDisplay'));
    // The symbol note (a default-mode behaviour change, so its own changeset) names
    // grouped display only as one of the modes the symbol covers; the grouped-display
    // release note itself stays in the exact-entry changeset.
    expect(mentioning).toEqual(['amount-field-exact-entry.md', 'amount-field-symbol.md']);
    const symbolNote = readFileSync(path.join(dir, 'amount-field-symbol.md'), 'utf8');
    expect(symbolNote.match(/groupedDisplay/g)).toHaveLength(1);
    expect(symbolNote).toMatch(/with `groupedDisplay`/);
    const note = readFileSync(path.join(dir, 'amount-field-exact-entry.md'), 'utf8');
    expect(note).not.toMatch(/Behaviour change:/);
    expect(note).not.toMatch(/\bSF-\d|\bINV-\d|artifacts\//);
  });
});

describe('INV-2: the opt-in adds nothing to the files the plain path uses', () => {
  it('AmountFieldExactInput.tsx and decimalValidation.ts know nothing about grouped display', () => {
    for (const file of ['AmountFieldExactInput.tsx', 'utils/decimalValidation.ts']) {
      expect(raw(file), file).not.toMatch(
        /groupedDisplay|amountGrouping|GroupedExact|onFocus|restrictInput|padDecimals/
      );
    }
  });

  it('AmountField.tsx reads the opt-in once, strictly, and picks the component in one place', () => {
    const code = source('AmountField.tsx');
    expect(code).toMatch(
      /const groupedDisplay = allowGrouping && exactProps\?\.groupedDisplay === true;/
    );
    expect(code).toMatch(/restrictInput=\{exactProps\.restrictInput === true\}/);
    expect(code).toMatch(/padDecimals=\{exactProps\.padDecimals === true\}/);
    expect(count(code, /<AmountFieldGroupedExactInput\b/g)).toBe(1);
    expect(count(code, /<AmountFieldExactInput\b/g)).toBe(1);
    // The grouped input gets no `allowGrouping` prop. The plain exact input stays free of
    // restrictInput / padDecimals / decimals; those three stay on the grouped path only.
    // The symbol's two adornment props reach both exact inputs.
    const propsOf = (tag: string): string[] => {
      const jsx = code.slice(code.indexOf(`<${tag}\n`));
      return (jsx.slice(0, jsx.indexOf('/>')).match(/\b(\w+)=/g) ?? []).sort();
    };
    const groupedProps = propsOf('AmountFieldGroupedExactInput');
    expect(groupedProps).toEqual(
      [
        'field=',
        'id=',
        'placeholder=',
        'className=',
        'accessibilityProps=',
        'readOnlyState=',
        'startAdornment=',
        'endAdornment=',
        'decimals=',
        'restrictInput=',
        'padDecimals=',
      ].sort()
    );
    const plainProps = propsOf('AmountFieldExactInput');
    expect(plainProps).toEqual(
      [
        'field=',
        'id=',
        'placeholder=',
        'className=',
        'accessibilityProps=',
        'readOnlyState=',
        'startAdornment=',
        'endAdornment=',
        'allowGrouping=',
      ].sort()
    );
    expect(plainProps).not.toEqual(
      expect.arrayContaining(['restrictInput=', 'padDecimals=', 'decimals='])
    );
  });

  it('shipped source carries no plan ids', () => {
    for (const file of [...NEW_FILES, 'AmountField.tsx']) {
      expect(raw(file), file).not.toMatch(/\bSF-\d|\bINV-\d|artifacts\//);
    }
  });
});
