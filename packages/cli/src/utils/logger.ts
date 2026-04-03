import pc from 'picocolors';

/**
 *
 */
export function printJson(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

/**
 *
 */
export function printError(error: unknown, json: boolean): never {
  const message = error instanceof Error ? error.message : String(error);
  if (json) {
    process.stderr.write(JSON.stringify({ ok: false, error: message }, null, 2) + '\n');
  } else {
    process.stderr.write(pc.red(`Error: ${message}`) + '\n');
  }

  process.exit(1);
}
