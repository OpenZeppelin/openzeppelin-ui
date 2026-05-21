import { describe, expect, it } from 'vitest';

import { assertValidTransition, getValidNextStatuses, isValidTransition } from './transitions';

describe('isValidTransition', () => {
  it('allows pending → in_progress', () => {
    expect(isValidTransition('pending', 'in_progress')).toBe(true);
  });

  it('allows pending → skipped', () => {
    expect(isValidTransition('pending', 'skipped')).toBe(true);
  });

  it('rejects pending → completed', () => {
    expect(isValidTransition('pending', 'completed')).toBe(false);
  });

  it('allows in_progress → completed', () => {
    expect(isValidTransition('in_progress', 'completed')).toBe(true);
  });

  it('allows in_progress → failed', () => {
    expect(isValidTransition('in_progress', 'failed')).toBe(true);
  });

  it('allows failed → in_progress (retry)', () => {
    expect(isValidTransition('failed', 'in_progress')).toBe(true);
  });

  it('allows failed → skipped', () => {
    expect(isValidTransition('failed', 'skipped')).toBe(true);
  });

  it('rejects completed → anything', () => {
    expect(isValidTransition('completed', 'pending')).toBe(false);
    expect(isValidTransition('completed', 'in_progress')).toBe(false);
    expect(isValidTransition('completed', 'failed')).toBe(false);
  });

  it('allows skipped → in_progress', () => {
    expect(isValidTransition('skipped', 'in_progress')).toBe(true);
  });
});

describe('getValidNextStatuses', () => {
  it('returns correct transitions for pending', () => {
    expect(getValidNextStatuses('pending')).toEqual(['in_progress', 'skipped']);
  });

  it('returns empty for completed', () => {
    expect(getValidNextStatuses('completed')).toEqual([]);
  });
});

describe('assertValidTransition', () => {
  it('throws for invalid transitions with descriptive message', () => {
    expect(() => assertValidTransition('completed', 'pending', 'task-123')).toThrow(
      /Invalid task status transition for "task-123": completed → pending/
    );
  });

  it('does not throw for valid transitions', () => {
    expect(() => assertValidTransition('pending', 'in_progress', 'task-1')).not.toThrow();
  });
});
