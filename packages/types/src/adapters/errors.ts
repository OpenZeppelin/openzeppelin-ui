import type { ProfileName } from './profiles/profile-name';

/**
 * Thrown when a consumer invokes a method or reads `networkConfig` on a capability
 * after the parent `EcosystemRuntime` has been disposed.
 */
export class RuntimeDisposedError extends Error {
  /** @param capabilityName - Optional capability name for debugging (e.g. `'wallet'`). */
  constructor(capabilityName?: string) {
    super(
      capabilityName
        ? `Cannot access ${capabilityName}: runtime has been disposed`
        : 'Runtime has been disposed'
    );
    this.name = 'RuntimeDisposedError';
  }
}

/**
 * Thrown synchronously by `EcosystemExport.createRuntime` when the adapter
 * does not implement every capability required by the requested profile.
 */
export class UnsupportedProfileError extends Error {
  readonly profile: ProfileName;

  readonly missingCapabilities: readonly string[];

  /**
   * @param profile - Profile that was requested.
   * @param missingCapabilities - Capability keys the adapter does not provide.
   */
  constructor(profile: ProfileName, missingCapabilities: string[]) {
    super(
      `Adapter does not support profile "${profile}": missing capabilities [${missingCapabilities.join(', ')}]`
    );
    this.name = 'UnsupportedProfileError';
    this.profile = profile;
    this.missingCapabilities = missingCapabilities;
  }
}
