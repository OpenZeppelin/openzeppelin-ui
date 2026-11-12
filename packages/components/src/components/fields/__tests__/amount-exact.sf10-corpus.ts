/**
 * The AmountField amount corpus, shared by the component suites (through
 * `amount-exact.sf10-kit.ts`, which re-exports it) and by the example app's e2e specs,
 * which import this file directly.
 *
 * It has no imports and no bigint literals, so the example app's `tsconfig.node.json`
 * (no JSX, default target) can compile it. Test fixture only; never exported from the
 * package.
 *
 * - `SC003_*`: 005 SF-10's exact-entry corpus at 18 decimals. Every text is typed as-is
 *   into an exact field with grouping on.
 * - `DEFAULT_FORMAT_*`: 006 SF-1's extension for the default field (SC-003 of 006): the
 *   same amounts in plain form, plus rows for trailing dots, leading zeros, 30-digit
 *   integers, ties and carry chains.
 */

// ---------------------------------------------------------------------------
// 005 SF-10 · SC-003 precision-hostile corpus at decimals 18
// ---------------------------------------------------------------------------

export const SC003_VALID_CASES: readonly string[] = [
  '12,345,678,901,234,567.123456789012345678',
  '12345678901234567.123456789012345678',
  '9007199254740993',
  '9,007,199,254,740,993',
  '9007199254740992.000000000000000001',
  '18446744073709551616',
  '18,446,744,073,709,551,616',
  '115792089237316195423570985008687907853269984665640564039457584007913129639935',
  '115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457,584,007,913,129,639,935',
  '0.1',
  '0.100000000000000001',
  '0.123456789012345678',
  '0.000000000000000001',
  '.000000000000000001',
  '1.999999999999999999',
  '999999999999999999.999999999999999999',
  '999,999,999,999,999,999.999999999999999999',
  '1,000',
  '1,000.5',
  '1,000.',
  '1,000.000000000000000000',
  '1,234,567.89',
  '123,456,789,012,345,678,901,234,567,890',
  '100000000000000000000000000000000000000000',
  '0.30000000000000004',
  '4.35',
  '1.005',
  '2.675',
  '0.07',
  '-0',
  '-0.000000000000000001',
  '-12,345.678901234567890123',
  '-9007199254740993',
  '007',
  '000123.450',
  '5.',
  '.5',
  '-.5',
  '1.500',
  '0.000000000000000000',
  '123456789.123456789123456789',
  '3.141592653589793238',
  '2,718.281828459045235',
  '1,000,000,000,000,000,000,000',
  '340282366920938463463374607431768211455',
  '79228162514264337593543950335.000000000000000001',
  '12,345.6789012345678901',
  '1',
  '0',
  '10,000,000',
  '-1,000,000.000001',
  '42.000000000000000042',
];

/** Valid texts with more than 18 decimals: kept on screen, flagged, never submitted (decimals 18). */
export const SC003_OVER_LIMIT_CASES: readonly string[] = [
  '0.1234567890123456789',
  '1.2345678901234567890',
  '0.0000000000000000001',
  '1,000.0000000000000000000',
  '9007199254740993.0000000000000000001',
];

/** Texts that must be flagged and never submitted, in an exact field with grouping on. */
export const SC003_INVALID_CASES: readonly string[] = [
  '1e18',
  '1E18',
  '1..2',
  '1.2.3',
  '1,5',
  '1,00',
  '1234,567',
  ',123',
  '1,,000',
  '1,000,',
  '1,000.5,0',
  '0,123',
  ' 1,000 ',
  '-',
  '.',
  '-.',
  '+1',
  '1 000',
  '١٢',
  '１２',
  '−1',
  'NaN',
  'Infinity',
  'abc',
];

// ---------------------------------------------------------------------------
// 006 SF-1 · default-field extension (SC-003 of 006)
// ---------------------------------------------------------------------------

/** Plain form of a corpus text: grouping commas removed. */
function plainForm(text: string): string {
  return text.split(',').join('');
}

function fractionLength(plain: string): number {
  const point = plain.indexOf('.');
  return point === -1 ? 0 : plain.length - point - 1;
}

/** Extra in-limit rows (≤ 18 fraction digits) the 005 list lacks. */
const DEFAULT_FORMAT_EXTRA_CASES: readonly string[] = [
  '123456789012345678.5', // scenario 2's digits; padded at 18
  '123456789012345678901234567890', // 30 integer digits
  '123456789012345678901234567890.123456789012345678', // 30 integer + 18 fraction digits
  '000000000000000000000000000001.5', // 30 integer digits, 29 of them leading zeros
  '-000000000000000000000000000001', // leading zeros on a negative
  '0.',
  '00.',
  '-0.',
  '-0.000000000000000000',
  '-007.50',
  '10.',
  '1.10',
  '9.995', // a tie at 2 decimals, in limit at 18
  '-0.995',
  '1.239',
  '0.000000000000000005',
  '900719925474099.3',
  '0.123456789012345678',
  '18.',
  '.1',
];

/**
 * 006 SF-1 rows typed into both fields: every 005 valid text in plain form, plus the
 * extras, de-duplicated. All have at most 18 fraction digits, so in both modes they are
 * valid and the default field never rounds them.
 */
export const DEFAULT_FORMAT_BOTH_MODES_CASES: readonly string[] = Array.from(
  new Set([...SC003_VALID_CASES.map(plainForm), ...DEFAULT_FORMAT_EXTRA_CASES])
).filter((text) => fractionLength(text) <= 18);

/**
 * 006 SF-1 over-limit rows at 18 decimals: the default field rounds them half away from
 * zero. Includes 005's over-limit texts in plain form, exact ties, carry chains and
 * signed zeros. The expected text is computed by each suite's own reference rounder.
 */
export const DEFAULT_FORMAT_OVER_LIMIT_CASES: readonly string[] = [
  ...SC003_OVER_LIMIT_CASES.map(plainForm),
  '0.0000000000000000005', // tie → up
  '-0.0000000000000000005', // tie → away from zero
  '0.0000000000000000004999', // just under the tie → 0
  '-0.0000000000000000004', // rounds to zero, unsigned
  '9.9999999999999999995', // carry into the integer part
  '-9.9999999999999999995',
  '999999999999999999.9999999999999999999', // carry chain of 36 digits
  '1.0000000000000000015',
  '2.6750000000000000005',
  '123456789012345678901234567890.1234567890123456785',
  '0.12345678901234567849999',
  '.00000000000000000050',
];
