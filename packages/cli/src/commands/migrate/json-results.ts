export interface JsonCommandResult<TAction extends string> {
  ok: boolean;
  action: TAction;
}

/**
 * Stable identity envelope injected by the JSON printer onto every command result.
 *
 * Agent consumers (e.g. the `scaffold-dapp` and `migrate-to-oz-uikit` skills) read
 * `schemaVersion` to detect breaking changes and `cli` to know which binary produced
 * the output. The shape mirrors `migration-manifest.json` (`schemaVersion` /
 * `catalogVersion`) so all `oz-ui` artifacts share one drift-detection mechanism.
 */
export interface JsonEnvelope {
  schemaVersion: string;
  cli: { name: string; version: string };
}

/**
 * The shape an agent sees on stdout: the in-process command result plus the
 * stable envelope. Construct results as `JsonCommandResult` and let the printer
 * produce `JsonCommandOutput`.
 */
export type JsonCommandOutput<TAction extends string> = JsonCommandResult<TAction> & JsonEnvelope;

export const JSON_SCHEMA_VERSION = '1.0.0';
export const CLI_PACKAGE_NAME = '@openzeppelin/ui-cli';

export interface JsonTaskStateSummary {
  id: string;
  phase: string;
  phaseDetail?: string;
  type: string;
  statusBefore: string;
  statusAfter: string;
}
