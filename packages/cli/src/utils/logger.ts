import pc from 'picocolors';

import { CLI_VERSION } from '../branding';
import {
  CLI_PACKAGE_NAME,
  JSON_SCHEMA_VERSION,
  type JsonEnvelope,
} from '../commands/migrate/json-results';

function buildEnvelope(): JsonEnvelope {
  return {
    schemaVersion: JSON_SCHEMA_VERSION,
    cli: { name: CLI_PACKAGE_NAME, version: CLI_VERSION },
  };
}

/**
 * Wrap an object payload with the stable JSON envelope. Non-object payloads
 * (arrays, primitives) are returned unchanged because the envelope only makes
 * sense at the top of a command-result object.
 */
function withEnvelope(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return payload;
  }
  return { ...buildEnvelope(), ...(payload as Record<string, unknown>) };
}

/**
 * Print a command result as JSON to stdout, prefixed with the stable envelope
 * (`schemaVersion`, `cli`). All `oz-ui --json` outputs flow through here so
 * agent consumers can rely on a single envelope shape.
 */
export function printJson(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(withEnvelope(payload), null, 2)}\n`);
}

/**
 *
 */
export function printError(error: unknown, json: boolean): never {
  const message = error instanceof Error ? error.message : String(error);
  if (json) {
    const payload = withEnvelope({ ok: false, error: message });
    process.stderr.write(JSON.stringify(payload, null, 2) + '\n');
  } else {
    process.stderr.write(pc.red(`Error: ${message}`) + '\n');
  }

  process.exit(1);
}
