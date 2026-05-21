import { describe, expect, test } from 'vitest';

import type { ContractLoadingCapability, FormFieldType, FormValues } from '@openzeppelin/ui-types';

import {
  getMissingRequiredContractInputs,
  hasMissingRequiredContractInputs,
} from '../contractInputs';

function makeContractLoading(
  fields: Array<Partial<FormFieldType> & { id: string; name?: string; required?: boolean }>
): ContractLoadingCapability {
  const inputs: FormFieldType[] = fields.map((f) => ({
    id: f.id,
    name: f.name ?? f.id,
    label: f.name ?? f.id,
    type: 'text',
    validation: { required: f.required ?? false },
  })) as FormFieldType[];

  return {
    networkConfig: {} as ContractLoadingCapability['networkConfig'],
    dispose: () => {},
    loadContract: async () => ({
      name: 'x',
      ecosystem: 'evm',
      address: '0x',
      functions: [],
      events: [],
    }),
    getContractDefinitionInputs: () => inputs,
  } as unknown as ContractLoadingCapability;
}

describe('contractInputs utils', () => {
  test('returns empty when no required inputs', () => {
    const contractLoading = makeContractLoading([{ id: 'a' }, { id: 'b' }]);
    const values: FormValues = { a: '', b: '' };
    expect(getMissingRequiredContractInputs(contractLoading, values)).toEqual([]);
    expect(hasMissingRequiredContractInputs(contractLoading, values)).toBe(false);
  });

  test('detects missing required string fields', () => {
    const contractLoading = makeContractLoading([
      { id: 'contractAddress', required: true },
      { id: 'contractDefinition', required: true },
      { id: 'optionalX', required: false },
    ]);
    const values: FormValues = { contractAddress: '  ', optionalX: 'ok' };
    expect(getMissingRequiredContractInputs(contractLoading, values)).toEqual([
      'contractAddress',
      'contractDefinition',
    ]);
    expect(hasMissingRequiredContractInputs(contractLoading, values)).toBe(true);
  });

  test('passes when all required have non-empty values', () => {
    const contractLoading = makeContractLoading([
      { id: 'contractAddress', required: true },
      { id: 'contractDefinition', required: true },
      { id: 'privateStateId', required: true },
    ]);
    const values: FormValues = {
      contractAddress: '0xabc',
      contractDefinition: '{ }',
      privateStateId: 'state-1',
    };
    expect(getMissingRequiredContractInputs(contractLoading, values)).toEqual([]);
    expect(hasMissingRequiredContractInputs(contractLoading, values)).toBe(false);
  });

  test('tolerates adapters throwing/invalid inputs', () => {
    const badContractLoading = {
      networkConfig: {} as ContractLoadingCapability['networkConfig'],
      dispose: () => {},
      loadContract: async () => ({
        name: 'x',
        ecosystem: 'evm',
        address: '0x',
        functions: [],
        events: [],
      }),
      getContractDefinitionInputs: () => {
        throw new Error('boom');
      },
    } as unknown as ContractLoadingCapability;
    expect(getMissingRequiredContractInputs(badContractLoading, {})).toEqual([]);
    expect(hasMissingRequiredContractInputs(badContractLoading, {})).toBe(false);
  });
});
