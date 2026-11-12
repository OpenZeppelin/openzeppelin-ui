/**
 * 005 SF-10 · source and package-surface guards: no float API in the exact path (INV-8),
 * no effects / timers / listeners in the exact input (INV-26), and the helpers stay
 * internal while `AmountFieldExactProps` is the only new public name (INV-27).
 * The INV-6 compile-time cases live in `AmountField.types.sf10-check.tsx`, compiled by
 * the package `typecheck`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type React from 'react';

import * as packageEntry from '../../../index';
import * as fieldsBarrel from '../index';
import * as utilsBarrel from '../utils';
import * as decimalValidation from '../utils/decimalValidation';

const fieldsDir = path.resolve(__dirname, '..');
const source = (file: string): string =>
  readFileSync(path.join(fieldsDir, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const EXACT_FILES = ['AmountFieldExactInput.tsx', 'utils/decimalValidation.ts'];

describe('INV-8: no float conversion API in the exact path', () => {
  it.each(EXACT_FILES)('%s has no parseFloat / Number( / toFixed / toPrecision', (file) => {
    const code = source(file);
    expect(code).not.toMatch(/parseFloat|\bNumber\(|toFixed|toPrecision/);
  });

  // 006 SF-1 restated this boundary (SF-1 INV-10). 005 pinned that the default branch still
  // used parseFloat / toFixed to write. Now parseFloat is left only in the default validator
  // (exactly once, so a second one on a write path fails), and the float write path is gone.
  it('boundary: AmountField.tsx keeps exactly one parseFloat (the default validator) and none of the removed float write path (006 SF-1)', () => {
    const code = source('AmountField.tsx');
    expect(code.match(/parseFloat/g)).toHaveLength(1);
    expect(code).toMatch(
      /const numValue = typeof value === 'string' \? parseFloat\(value\) : value;/
    );
    for (const name of [
      'toFixed',
      'toPrecision',
      'formatCurrency',
      'parseAmount',
      'handleNumericKeys',
    ]) {
      expect(code, name).not.toContain(name);
    }
  });

  it('006 SF-1: decimalValidation.ts rounds without Math.round / floor / ceil / trunc', () => {
    expect(source('utils/decimalValidation.ts')).not.toMatch(/Math\.(round|floor|ceil|trunc)\b/);
  });
});

describe('INV-26: the exact input registers no effects, timers or listeners', () => {
  it('AmountFieldExactInput.tsx uses only useState', () => {
    const code = source('AmountFieldExactInput.tsx');
    expect(code).not.toMatch(
      /useEffect|useLayoutEffect|useInsertionEffect|setTimeout|setInterval|requestAnimationFrame|addEventListener|subscribe\(/
    );
    expect(code).toMatch(/useState/);
  });
});

describe('INV-27: helpers stay internal; AmountFieldExactProps is the only new public name', () => {
  const helperNames = Object.keys(decimalValidation);

  it('decimalValidation exports are the expected internal set', () => {
    expect(helperNames.sort()).toEqual(
      [
        'AMOUNT_GENERIC_MESSAGE',
        'AMOUNT_MISCONFIGURED_MESSAGE',
        'AMOUNT_REQUIRED_MESSAGE',
        'AMOUNT_TEXT_ISSUE_MESSAGES',
        'GROUPED_AMOUNT_PATTERN',
        'PLAIN_AMOUNT_PATTERN',
        'classifyAmountText',
        'compareDecimalStrings',
        'formatAmountText', // 006 SF-1 (internal, default-mode blur)
        'fractionDigits',
        'isEmptyAmountValue',
        'isValidAmountText',
        'numberToDecimalString',
        'stepAmountText', // 006 SF-1 (internal, default-mode arrow keys)
        'toAmountDisplayText',
        'toAmountFormValue',
        'validateExactAmount',
      ].sort()
    );
  });

  it.each([
    ['fields/utils barrel', utilsBarrel],
    ['fields barrel', fieldsBarrel],
    ['package entry', packageEntry],
  ])('%s re-exports no helper and no AmountFieldExactInput', (_l, barrel) => {
    const keys = new Set(Object.keys(barrel));
    for (const name of [...helperNames, 'AmountFieldExactInput']) {
      expect(keys.has(name), name).toBe(false);
    }
    if (_l !== 'fields/utils barrel') expect(keys.has('AmountField')).toBe(true);
  });

  it('006 SF-1: handleNumericKeys stays public on the utils, fields and package barrels with its signature', () => {
    for (const barrel of [utilsBarrel, fieldsBarrel, packageEntry]) {
      expect(typeof (barrel as Record<string, unknown>).handleNumericKeys).toBe('function');
    }
    // (onChange, value, step?, min?, max?) => (event) => void: two required parameters.
    expect(utilsBarrel.handleNumericKeys.length).toBe(2);
    expectTypeOf(utilsBarrel.handleNumericKeys).toEqualTypeOf<
      (
        onChange: (value: number) => void,
        value: number,
        step?: number,
        min?: number,
        max?: number
      ) => (e: React.KeyboardEvent) => void
    >();
  });

  it('AmountFieldExactProps is exported by name from the fields barrel source', () => {
    expect(source('AmountField.tsx')).toMatch(/export interface AmountFieldExactProps/);
    expect(readFileSync(path.join(fieldsDir, 'index.ts'), 'utf8')).toMatch(
      /export \* from '\.\/AmountField'/
    );
  });

  it('no decimal library or chain SDK in the package runtime dependencies', () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve(fieldsDir, '../../../package.json'), 'utf8')
    ) as { dependencies?: Record<string, string>; peerDependencies?: Record<string, string> };
    const runtime = { ...pkg.dependencies, ...pkg.peerDependencies };
    for (const lib of [
      'viem',
      'ethers',
      'decimal.js',
      'big.js',
      'bignumber.js',
      'fast-check',
      'ox',
    ]) {
      expect(runtime[lib], lib).toBeUndefined();
    }
  });
});
