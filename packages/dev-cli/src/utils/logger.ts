import pc from 'picocolors';

import { DoctorResult, StatusResult, UseLocalResult, UseRemoteResult } from '../lib/localDev';

function writeStdout(message: string): void {
  process.stdout.write(`${message}\n`);
}

function writeStderr(message: string): void {
  process.stderr.write(`${message}\n`);
}

/**
 * Returns whether the current process is connected to an interactive terminal.
 */
export function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Writes a JSON payload to stdout.
 */
export function printJson(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

/**
 * Prints a human-readable summary for `use local`.
 */
export function printUseLocalResult(result: UseLocalResult): void {
  writeStdout(pc.green(`Using local packages for ${result.projectRoot}`));
  for (const manifest of result.manifests) {
    writeStdout(
      `  ${pc.bold(manifest.family)}: ${manifest.tarballCount} tarballs -> ${manifest.manifestPath}`
    );
  }
}

/**
 * Prints a human-readable summary for `use remote`.
 */
export function printUseRemoteResult(result: UseRemoteResult): void {
  writeStdout(pc.green(`Using published packages for ${result.projectRoot}`));
  if (result.removedPaths.length === 0) {
    writeStdout(pc.dim('  No local manifests were present.'));
    return;
  }

  for (const removedPath of result.removedPaths) {
    writeStdout(`  removed ${removedPath}`);
  }
}

/**
 * Prints a human-readable summary for `status`.
 */
export function printStatusResult(result: StatusResult): void {
  writeStdout(pc.bold(`Local development status for ${result.projectRoot}`));
  for (const family of result.families) {
    const manifestState = family.manifestExists
      ? `${family.tarballCount} tarballs ready`
      : 'manifest not generated';
    writeStdout(`  ${pc.bold(family.key)}: ${family.repoRoot} (${manifestState})`);
  }
}

/**
 * Prints a human-readable summary for `doctor`.
 */
export function printDoctorResult(result: DoctorResult): void {
  if (result.issues.length === 0) {
    writeStdout(pc.green(`Doctor passed for ${result.projectRoot}`));
    return;
  }

  writeStdout(
    result.ok
      ? pc.yellow(`Doctor warnings for ${result.projectRoot}`)
      : pc.red(`Doctor found issues for ${result.projectRoot}`)
  );
  for (const issue of result.issues) {
    const color = issue.severity === 'error' ? pc.red : pc.yellow;
    writeStdout(color(`  [${issue.severity}] ${issue.family}: ${issue.message}`));
  }
}

/**
 * Prints a formatted error and exits the process.
 */
export function printError(error: unknown, json: boolean): never {
  const message = error instanceof Error ? error.message : String(error);
  if (json) {
    writeStderr(JSON.stringify({ ok: false, error: message }, null, 2));
  } else {
    writeStderr(pc.red(`Error: ${message}`));
  }

  process.exit(1);
}
