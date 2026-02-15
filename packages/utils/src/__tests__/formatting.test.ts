/**
 * Unit tests for formatting utilities
 */
import { describe, expect, it } from 'vitest';

import { formatSecondsToReadable } from '../formatting';

describe('formatSecondsToReadable', () => {
  describe('edge cases and invalid input', () => {
    it('returns "0 seconds" for 0', () => {
      expect(formatSecondsToReadable(0)).toBe('0 seconds');
    });

    it('returns "0 seconds" for negative numbers', () => {
      expect(formatSecondsToReadable(-1)).toBe('0 seconds');
      expect(formatSecondsToReadable(-3600)).toBe('0 seconds');
    });

    it('returns "0 seconds" for NaN', () => {
      expect(formatSecondsToReadable(Number.NaN)).toBe('0 seconds');
    });

    it('returns "0 seconds" for Infinity', () => {
      expect(formatSecondsToReadable(Number.POSITIVE_INFINITY)).toBe('0 seconds');
      expect(formatSecondsToReadable(Number.NEGATIVE_INFINITY)).toBe('0 seconds');
    });
  });

  describe('seconds', () => {
    it('returns singular "1 second" for 1', () => {
      expect(formatSecondsToReadable(1)).toBe('1 second');
    });

    it('returns plural "N seconds" for 2 to 59', () => {
      expect(formatSecondsToReadable(2)).toBe('2 seconds');
      expect(formatSecondsToReadable(30)).toBe('30 seconds');
      expect(formatSecondsToReadable(59)).toBe('59 seconds');
    });
  });

  describe('minutes', () => {
    it('returns singular "1 minute" for 60', () => {
      expect(formatSecondsToReadable(60)).toBe('1 minute');
    });

    it('returns "1 minute" for 61-119 (floor)', () => {
      expect(formatSecondsToReadable(61)).toBe('1 minute');
      expect(formatSecondsToReadable(119)).toBe('1 minute');
    });

    it('returns plural "N minutes" for 120+', () => {
      expect(formatSecondsToReadable(120)).toBe('2 minutes');
      expect(formatSecondsToReadable(3599)).toBe('59 minutes');
    });
  });

  describe('hours', () => {
    it('returns singular "1 hour" for 3600', () => {
      expect(formatSecondsToReadable(3600)).toBe('1 hour');
    });

    it('returns "1 hour" for 3601-7199 (floor)', () => {
      expect(formatSecondsToReadable(3601)).toBe('1 hour');
      expect(formatSecondsToReadable(7199)).toBe('1 hour');
    });

    it('returns plural "N hours" for 7200 to under 1 day', () => {
      expect(formatSecondsToReadable(7200)).toBe('2 hours');
      expect(formatSecondsToReadable(86399)).toBe('23 hours');
    });
  });

  describe('days', () => {
    it('returns singular "1 day" for 86400', () => {
      expect(formatSecondsToReadable(86400)).toBe('1 day');
    });

    it('returns "1 day" for 86401-172799 (floor)', () => {
      expect(formatSecondsToReadable(86401)).toBe('1 day');
      expect(formatSecondsToReadable(172799)).toBe('1 day');
    });

    it('returns plural "N days" for 172800+', () => {
      expect(formatSecondsToReadable(172800)).toBe('2 days');
      expect(formatSecondsToReadable(86400 * 7)).toBe('7 days');
    });
  });
});
