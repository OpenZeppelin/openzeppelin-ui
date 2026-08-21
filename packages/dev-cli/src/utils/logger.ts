import pc from 'picocolors';

import type {
  TailwindDoctorResult,
  TailwindFixResult,
  TailwindPrintResult,
} from '@openzeppelin/ui-tailwind-utils';

import { AdapterPeerResult } from '../lib/adapterPeers';
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
 * Prints a human-readable summary for `check-peers`.
 */
export function printAdapterPeerResult(result: AdapterPeerResult): void {
  if (result.ok) {
    const pairLabel = result.pairs.length === 1 ? 'pair' : 'pairs';
    writeStdout(
      pc.green(
        `Adapter peer check passed for ${result.projectRoot} (${result.pairs.length} adapter/peer ${pairLabel})`
      )
    );
    return;
  }

  writeStdout(pc.red(`Adapter peer check failed for ${result.projectRoot}`));
  for (const issue of result.issues) {
    writeStdout(pc.red(`  [${issue.severity}] ${issue.message}`));
  }

  if (result.remediation.length > 0) {
    writeStdout('');
    for (const line of result.remediation) {
      writeStdout(line);
    }
  }
}

/**
 * Prints a human-readable summary for `tailwind doctor`.
 */
export function printTailwindDoctorResult(result: TailwindDoctorResult): void {
  if (result.issues.length === 0) {
    writeStdout(pc.green(`Tailwind doctor passed for ${result.projectRoot}`));
    if (result.cssPath) {
      writeStdout(`  stylesheet: ${result.cssPath}`);
    }
    return;
  }

  writeStdout(
    result.ok
      ? pc.yellow(`Tailwind doctor warnings for ${result.projectRoot}`)
      : pc.red(`Tailwind doctor found issues for ${result.projectRoot}`)
  );
  for (const issue of result.issues) {
    const color =
      issue.severity === 'error' ? pc.red : issue.severity === 'warning' ? pc.yellow : pc.blue;
    const location = issue.file ? ` (${issue.file})` : '';
    writeStdout(color(`  [${issue.severity}] ${issue.code}${location}: ${issue.message}`));
  }
}

/**
 * Prints a human-readable summary for `tailwind fix`.
 */
export function printTailwindFixResult(result: TailwindFixResult, dryRun: boolean): void {
  if (!result.ok) {
    writeStdout(pc.red(`Tailwind fix could not resolve a stylesheet for ${result.projectRoot}`));
    return;
  }

  const heading = dryRun
    ? `Tailwind fix dry run for ${result.projectRoot}`
    : `Tailwind fix completed for ${result.projectRoot}`;
  writeStdout(pc.green(heading));

  if (result.changes.length === 0) {
    writeStdout(pc.dim('  No file changes were needed.'));
    return;
  }

  for (const change of result.changes) {
    writeStdout(`  ${pc.bold(change.action)} ${change.path} - ${change.summary}`);
  }
}

/**
 * Prints a human-readable summary for `tailwind print`.
 */
export function printTailwindPrintResult(result: TailwindPrintResult): void {
  if (!result.ok || !result.sourcePlan) {
    writeStdout(pc.red(`Could not resolve a Tailwind source plan for ${result.projectRoot}`));
    return;
  }

  writeStdout(pc.bold(`Tailwind source plan for ${result.projectRoot}`));
  if (result.cssPath) {
    writeStdout(`  stylesheet: ${result.cssPath}`);
  }
  if (result.generatedCssPath) {
    writeStdout(`  managed file: ${result.generatedCssPath}`);
  }
  for (const source of result.sourcePlan.sources) {
    writeStdout(`  @source ${source}`);
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
