import { describe, expect, test } from 'vitest';

import type { ContractLoadingCapability, FormFieldType, FormValues } from '@openzeppelin/ui-types';

import { buildRequiredInputSnapshot, requiredSnapshotsEqual } from '../requiredInputs';

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

describe('buildRequiredInputSnapshot', () => {
  test('returns null when formValues is null', () => {
    const contractLoading = makeContractLoading([{ id: 'a', required: true }]);
    expect(buildRequiredInputSnapshot(contractLoading, null)).toBeNull();
  });

  test('returns null when formValues is undefined', () => {
    const contractLoading = makeContractLoading([{ id: 'a', required: true }]);
    expect(buildRequiredInputSnapshot(contractLoading, undefined)).toBeNull();
  });

  test('returns null when adapter is null', () => {
    const values: FormValues = { a: 'value' };
    expect(buildRequiredInputSnapshot(null, values)).toBeNull();
  });

  test('returns null when adapter has no required fields', () => {
    const contractLoading = makeContractLoading([
      { id: 'optional1', required: false },
      { id: 'optional2', required: false },
    ]);
    const values: FormValues = { optional1: 'value1', optional2: 'value2' };
    expect(buildRequiredInputSnapshot(contractLoading, values)).toBeNull();
  });

  test('returns null when adapter has no getContractDefinitionInputs method', () => {
    const contractLoading = {
      networkConfig: {} as ContractLoadingCapability['networkConfig'],
      dispose: () => {},
      loadContract: async () => ({
        name: 'x',
        ecosystem: 'evm',
        address: '0x',
        functions: [],
        events: [],
      }),
    } as unknown as ContractLoadingCapability;
    const values: FormValues = { a: 'value' };
    expect(buildRequiredInputSnapshot(contractLoading, values)).toBeNull();
  });

  test('builds snapshot with required fields only', () => {
    const contractLoading = makeContractLoading([
      { id: 'contractAddress', required: true },
      { id: 'privateStateId', required: true },
      { id: 'optionalField', required: false },
    ]);
    const values: FormValues = {
      contractAddress: '0xabc',
      privateStateId: 'state-1',
      optionalField: 'ignored',
    };
    const snapshot = buildRequiredInputSnapshot(contractLoading, values);
    expect(snapshot).toEqual({
      contractAddress: '0xabc',
      privateStateId: 'state-1',
    });
  });

  test('normalizes string values by trimming whitespace', () => {
    const contractLoading = makeContractLoading([{ id: 'address', required: true }]);
    const values: FormValues = { address: '  0x123  ' };
    const snapshot = buildRequiredInputSnapshot(contractLoading, values);
    expect(snapshot).toEqual({ address: '0x123' });
  });

  test('normalizes File objects to metadata', () => {
    const contractLoading = makeContractLoading([{ id: 'file', required: true }]);
    const file = new File(['content'], 'test.zip', { type: 'application/zip' });
    const values: FormValues = { file };
    const snapshot = buildRequiredInputSnapshot(contractLoading, values);
    expect(snapshot).toEqual({
      file: {
        name: 'test.zip',
        size: file.size,
        lastModified: file.lastModified,
      },
    });
  });

  test('normalizes undefined to null', () => {
    const contractLoading = makeContractLoading([{ id: 'field', required: true }]);
    const values: FormValues = { field: undefined };
    const snapshot = buildRequiredInputSnapshot(contractLoading, values);
    expect(snapshot).toEqual({ field: null });
  });

  test('preserves other types as-is', () => {
    const contractLoading = makeContractLoading([
      { id: 'number', required: true },
      { id: 'boolean', required: true },
      { id: 'object', required: true },
    ]);
    const values: FormValues = {
      number: 42,
      boolean: true,
      object: { nested: 'value' },
    };
    const snapshot = buildRequiredInputSnapshot(contractLoading, values);
    expect(snapshot).toEqual({
      number: 42,
      boolean: true,
      object: { nested: 'value' },
    });
  });

  test('uses field.name when available, falls back to field.id', () => {
    const contractLoading = makeContractLoading([
      { id: 'fieldId', name: 'fieldName', required: true },
      { id: 'noName', required: true },
    ]);
    const values: FormValues = {
      fieldName: 'value1',
      noName: 'value2',
    };
    const snapshot = buildRequiredInputSnapshot(contractLoading, values);
    expect(snapshot).toEqual({
      fieldName: 'value1',
      noName: 'value2',
    });
  });

  test('skips fields without name or id', () => {
    const contractLoading = makeContractLoading([
      { id: '', name: '', required: true },
      { id: 'valid', required: true },
    ]);
    const values: FormValues = { valid: 'value' };
    const snapshot = buildRequiredInputSnapshot(contractLoading, values);
    expect(snapshot).toEqual({ valid: 'value' });
  });

  test('handles adapter throwing errors gracefully', () => {
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
    const values: FormValues = { a: 'value' };
    expect(() => buildRequiredInputSnapshot(badContractLoading, values)).not.toThrow();
    expect(buildRequiredInputSnapshot(badContractLoading, values)).toBeNull();
  });
});

describe('requiredSnapshotsEqual', () => {
  test('returns true for same reference', () => {
    const snapshot = { a: 'value' };
    expect(requiredSnapshotsEqual(snapshot, snapshot)).toBe(true);
  });

  test('returns true for both null', () => {
    expect(requiredSnapshotsEqual(null, null)).toBe(true);
  });

  test('returns false when one is null and other is not', () => {
    expect(requiredSnapshotsEqual(null, { a: 'value' })).toBe(false);
    expect(requiredSnapshotsEqual({ a: 'value' }, null)).toBe(false);
  });

  test('returns true for identical simple snapshots', () => {
    const a = { contractAddress: '0xabc', privateStateId: 'state-1' };
    const b = { contractAddress: '0xabc', privateStateId: 'state-1' };
    expect(requiredSnapshotsEqual(a, b)).toBe(true);
  });

  test('returns false for different values', () => {
    const a = { contractAddress: '0xabc' };
    const b = { contractAddress: '0xdef' };
    expect(requiredSnapshotsEqual(a, b)).toBe(false);
  });

  test('returns false for different number of keys', () => {
    const a = { contractAddress: '0xabc' };
    const b = { contractAddress: '0xabc', privateStateId: 'state-1' };
    expect(requiredSnapshotsEqual(a, b)).toBe(false);
  });

  test('compares keys regardless of order', () => {
    const a = { contractAddress: '0xabc', privateStateId: 'state-1' };
    const b = { privateStateId: 'state-1', contractAddress: '0xabc' };
    expect(requiredSnapshotsEqual(a, b)).toBe(true);
  });

  test('compares object values using JSON.stringify', () => {
    const a = { artifacts: { zip: 'base64data', size: 1024 } };
    const b = { artifacts: { zip: 'base64data', size: 1024 } };
    const c = { artifacts: { zip: 'base64data', size: 2048 } };
    expect(requiredSnapshotsEqual(a, b)).toBe(true);
    expect(requiredSnapshotsEqual(a, c)).toBe(false);
  });

  test('handles File metadata objects correctly', () => {
    const file1 = { name: 'test.zip', size: 1024, lastModified: 1234567890 };
    const file2 = { name: 'test.zip', size: 1024, lastModified: 1234567890 };
    const file3 = { name: 'other.zip', size: 1024, lastModified: 1234567890 };
    const a = { file: file1 };
    const b = { file: file2 };
    const c = { file: file3 };
    expect(requiredSnapshotsEqual(a, b)).toBe(true);
    expect(requiredSnapshotsEqual(a, c)).toBe(false);
  });

  test('handles mixed value types', () => {
    const a = {
      string: 'value',
      number: 42,
      boolean: true,
      object: { nested: 'data' },
      nullValue: null,
    };
    const b = {
      string: 'value',
      number: 42,
      boolean: true,
      object: { nested: 'data' },
      nullValue: null,
    };
    const c = {
      string: 'value',
      number: 42,
      boolean: false, // Different boolean
      object: { nested: 'data' },
      nullValue: null,
    };
    expect(requiredSnapshotsEqual(a, b)).toBe(true);
    expect(requiredSnapshotsEqual(a, c)).toBe(false);
  });

  test('handles empty snapshots', () => {
    expect(requiredSnapshotsEqual({}, {})).toBe(true);
  });

  test('case-sensitive string comparison', () => {
    const a = { address: '0xABC' };
    const b = { address: '0xabc' };
    expect(requiredSnapshotsEqual(a, b)).toBe(false);
  });

  test('handles trimmed vs untrimmed strings differently', () => {
    const a = { address: '0xabc' };
    const b = { address: '  0xabc  ' };
    expect(requiredSnapshotsEqual(a, b)).toBe(false);
  });

  test('real-world Midnight adapter scenario', () => {
    const contractLoading = makeContractLoading([
      { id: 'contractAddress', required: true },
      { id: 'privateStateId', required: true },
      { id: 'contractArtifactsZip', required: true },
    ]);

    const initialValues: FormValues = {
      contractAddress: '020000d9cfd7ee1f3932a13d39e81b8445e90e0f1c5c18112e64af45564c5d150ecc',
      privateStateId: 'inputoutputtest_v1',
      contractArtifactsZip: new File(['zip content'], 'artifacts.zip'),
    };

    const snapshot1 = buildRequiredInputSnapshot(contractLoading, initialValues);
    expect(snapshot1).not.toBeNull();

    const changedValues: FormValues = {
      contractAddress: '020000d9cfd7ee1f3932a13d39e81b8445e90e0f1c5c18112e64af45564c5d150ecc',
      privateStateId: 'inputoutputtest_v2', // Changed
      contractArtifactsZip: new File(['zip content'], 'artifacts.zip'),
    };

    const snapshot2 = buildRequiredInputSnapshot(contractLoading, changedValues);
    expect(requiredSnapshotsEqual(snapshot1, snapshot2)).toBe(false);
  });
});
