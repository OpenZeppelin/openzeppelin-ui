/**
 * Runtime peer dependency validation.
 *
 * Compares installed peer package versions against the consumer's minimum
 * requirements and throws immediately if any are below the threshold.
 * This turns silent visual/behavioral degradation into an actionable error.
 */

/**
 * Validates that installed peer packages meet minimum version requirements.
 *
 * @param consumerName - Package name shown in error messages (e.g. `@openzeppelin/adapter-evm`)
 * @param peers - Map of package names to their installed and minimum required versions
 * @throws {Error} If any peer version is missing or below the required minimum
 */
export function validatePeerVersions(
  consumerName: string,
  peers: Record<string, { installed: string | undefined; minimum: string }>
): void {
  for (const [pkg, { installed, minimum }] of Object.entries(peers)) {
    if (!installed) {
      throw new Error(
        `[${consumerName}] ${pkg} version could not be determined.\n` +
          `  This likely means an outdated version is installed that predates the VERSION export.\n` +
          `  Required: >=${minimum}\n` +
          `  Fix: npm install ${pkg}@latest`
      );
    }

    if (compareSemver(installed, minimum) < 0) {
      throw new Error(
        `[${consumerName}] Incompatible ${pkg} version.\n` +
          `  Installed: ${installed}\n` +
          `  Required:  >=${minimum}\n` +
          `  Fix: npm install ${pkg}@latest`
      );
    }
  }
}

function compareSemver(a: string, b: string): number {
  const pa = a.replace(/-.+$/, '').split('.').map(Number);
  const pb = b.replace(/-.+$/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}
