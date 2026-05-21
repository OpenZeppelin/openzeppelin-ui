import { describe, expect, it, vi } from 'vitest';

import {
  buildTransactionSuccessPayload,
  invokeOnTransactionSuccess,
  normalizeTransactionSuccessHash,
} from '../transactionSuccessCallback';

describe('normalizeTransactionSuccessHash', () => {
  it('returns undefined for null, undefined, and blank strings', () => {
    expect(normalizeTransactionSuccessHash(null)).toBeUndefined();
    expect(normalizeTransactionSuccessHash(undefined)).toBeUndefined();
    expect(normalizeTransactionSuccessHash('')).toBeUndefined();
    expect(normalizeTransactionSuccessHash('   ')).toBeUndefined();
  });

  it('trims non-empty values', () => {
    expect(normalizeTransactionSuccessHash('  0xabc  ')).toBe('0xabc');
  });
});

describe('buildTransactionSuccessPayload', () => {
  it('omits transaction_hash when hash is empty', () => {
    const p = buildTransactionSuccessPayload({
      networkId: 'net-1',
      ecosystem: 'evm',
      executionMethod: 'eoa',
      finalTxHash: '',
    });
    expect(p).toEqual({
      network_id: 'net-1',
      ecosystem: 'evm',
      execution_method: 'eoa',
    });
    expect('transaction_hash' in p).toBe(false);
  });

  it('includes transaction_hash when present', () => {
    const p = buildTransactionSuccessPayload({
      networkId: 'net-1',
      ecosystem: 'stellar',
      executionMethod: 'relayer',
      finalTxHash: 'deadbeef',
    });
    expect(p.transaction_hash).toBe('deadbeef');
  });
});

describe('invokeOnTransactionSuccess', () => {
  const payload = buildTransactionSuccessPayload({
    networkId: 'n',
    ecosystem: 'evm',
    executionMethod: 'eoa',
    finalTxHash: '0x1',
  });

  it('does nothing when callback is undefined', () => {
    const log = { error: vi.fn() };
    expect(() => invokeOnTransactionSuccess(undefined, payload, log)).not.toThrow();
    expect(log.error).not.toHaveBeenCalled();
  });

  it('does not rethrow when callback throws synchronously', () => {
    const log = { error: vi.fn() };
    expect(() =>
      invokeOnTransactionSuccess(
        () => {
          throw new Error('sync boom');
        },
        payload,
        log
      )
    ).not.toThrow();
    expect(log.error).toHaveBeenCalledWith(
      'TransactionForm',
      'onTransactionSuccess callback threw an error',
      expect.any(Error)
    );
  });

  it('logs async rejection without rethrowing from invoke', async () => {
    const log = { error: vi.fn() };
    expect(() =>
      invokeOnTransactionSuccess(
        async () => {
          throw new Error('async boom');
        },
        payload,
        log
      )
    ).not.toThrow();

    await Promise.resolve();
    await Promise.resolve();

    expect(log.error).toHaveBeenCalledWith(
      'TransactionForm',
      'onTransactionSuccess callback rejected with an error',
      expect.any(Error)
    );
  });

  it('invokes callback with payload', () => {
    const log = { error: vi.fn() };
    const fn = vi.fn();
    invokeOnTransactionSuccess(fn, payload, log);
    expect(fn).toHaveBeenCalledWith(payload);
    expect(log.error).not.toHaveBeenCalled();
  });
});
