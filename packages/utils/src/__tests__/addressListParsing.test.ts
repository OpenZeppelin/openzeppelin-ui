import { describe, expect, it } from 'vitest';

import type { AddressingCapability } from '@openzeppelin/ui-types';

import { classifyAddressCandidates, parseDelimitedAddressInput } from '../addressListParsing';

const validA = 'C' + 'A'.repeat(55);
const validB = 'C' + 'B'.repeat(55);

const mockAddressing: AddressingCapability = {
  isValidAddress: (addr: string) => addr.startsWith('C') && addr.length === 56,
};

describe('parseDelimitedAddressInput', () => {
  it('splits comma, semicolon, and newline separated values', () => {
    expect(parseDelimitedAddressInput(`${validA}, ${validB};${validA}\n${validB}`)).toEqual([
      validA,
      validB,
      validA,
      validB,
    ]);
  });

  it('trims whitespace and drops empty segments', () => {
    expect(parseDelimitedAddressInput(`  ${validA}  , , \n `)).toEqual([validA]);
  });
});

describe('classifyAddressCandidates', () => {
  it('accepts valid new addresses and rejects invalid ones', () => {
    const result = classifyAddressCandidates([validA, 'bad', validB], [], mockAddressing);
    expect(result.accepted).toEqual([validA, validB]);
    expect(result.invalid).toEqual(['bad']);
  });

  it('tracks duplicates within the paste batch and existing list entries', () => {
    const result = classifyAddressCandidates([validA, validA, validB], [validB], mockAddressing);
    expect(result.accepted).toEqual([validA]);
    expect(result.alreadyListed).toEqual([validB]);
    expect(result.duplicatesInInput).toEqual([validA]);
  });

  it('respects maxItems when classifying accepted addresses', () => {
    const result = classifyAddressCandidates([validA, validB], [], mockAddressing, 1);
    expect(result.accepted).toEqual([validA]);
  });
});
