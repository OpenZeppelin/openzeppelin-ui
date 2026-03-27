import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

import { VERSION } from '../version';

describe('VERSION', () => {
  it('is defined as a non-empty string', () => {
    expect(typeof VERSION).toBe('string');
    expect(VERSION.length).toBeGreaterThan(0);
  });

  it('matches the version in package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'));
    expect(VERSION).toBe(pkg.version);
  });

  it('follows semver format', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
