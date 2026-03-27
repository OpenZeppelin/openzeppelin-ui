import { describe, expect, it } from 'vitest';

import { validatePeerVersions } from '../peerValidation';

describe('validatePeerVersions', () => {
  const CONSUMER = '@openzeppelin/adapter-evm';

  it('passes when installed version equals minimum', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': { installed: '1.6.0', minimum: '1.6.0' },
      })
    ).not.toThrow();
  });

  it('passes when installed version exceeds minimum (patch)', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': { installed: '1.6.1', minimum: '1.6.0' },
      })
    ).not.toThrow();
  });

  it('passes when installed version exceeds minimum (minor)', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': { installed: '1.7.0', minimum: '1.6.0' },
      })
    ).not.toThrow();
  });

  it('passes when installed version exceeds minimum (major)', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': { installed: '2.0.0', minimum: '1.6.0' },
      })
    ).not.toThrow();
  });

  it('throws when installed version is below minimum (minor)', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': { installed: '1.4.0', minimum: '1.6.0' },
      })
    ).toThrow('Incompatible @openzeppelin/ui-components');
  });

  it('throws when installed version is below minimum (patch)', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': { installed: '1.5.9', minimum: '1.6.0' },
      })
    ).toThrow('Incompatible @openzeppelin/ui-components');
  });

  it('throws when installed version is below minimum (major)', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-types': { installed: '0.9.0', minimum: '1.11.1' },
      })
    ).toThrow('Incompatible @openzeppelin/ui-types');
  });

  it('throws with actionable error message', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': { installed: '1.4.0', minimum: '1.6.0' },
      })
    ).toThrow('npm install @openzeppelin/ui-components@latest');
  });

  it('includes consumer name in error message', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': { installed: '1.4.0', minimum: '1.6.0' },
      })
    ).toThrow(`[${CONSUMER}]`);
  });

  it('throws when installed version is undefined', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': {
          installed: undefined as unknown as string,
          minimum: '1.6.0',
        },
      })
    ).toThrow('version could not be determined');
  });

  it('validates multiple peers and throws on first failure', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': { installed: '1.6.0', minimum: '1.6.0' },
        '@openzeppelin/ui-types': { installed: '1.10.0', minimum: '1.11.1' },
      })
    ).toThrow('Incompatible @openzeppelin/ui-types');
  });

  it('passes when all multiple peers satisfy minimums', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': { installed: '1.6.0', minimum: '1.6.0' },
        '@openzeppelin/ui-react': { installed: '1.1.0', minimum: '1.1.0' },
        '@openzeppelin/ui-types': { installed: '1.11.1', minimum: '1.11.1' },
        '@openzeppelin/ui-utils': { installed: '1.3.0', minimum: '1.3.0' },
      })
    ).not.toThrow();
  });

  it('strips pre-release suffix during comparison', () => {
    expect(() =>
      validatePeerVersions(CONSUMER, {
        '@openzeppelin/ui-components': { installed: '1.6.0-rc.1', minimum: '1.6.0' },
      })
    ).not.toThrow();
  });
});
