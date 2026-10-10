import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import {
  AGENT_ASSET_PROFILE_IDS,
  CREATE_PROFILE_SELECTION_FILENAME,
  parseAgentProfileArg,
  readAgentProfileSelection,
  SCAFFOLD_DAPP_SKILL_ID,
  skillDirectoriesForProfiles,
  writeAgentProfileSelection,
  type AgentAssetProfile,
} from '../../agent-assets';
import { copyTemplateDirectory } from '../../templates';
import { printError, printJson } from '../../utils/logger';
import type { JsonCommandResult } from '../migrate/json-results';

interface CreateInitOptions {
  target: string;
  json?: boolean;
  /** @description Comma-separated: standard, claude, legacy-cursor, all, none */
  agentProfile?: string;
}

interface CreateInitResult extends JsonCommandResult<'create-init'> {
  target: string;
  agentAssetProfiles: string[];
  skillCopied: string[];
  skillSkipped: string[];
  agentProfileSelectionWritten: string;
}

const SCAFFOLD_DAPP_SKILL_TEMPLATE = `skills/${SCAFFOLD_DAPP_SKILL_ID}`;

/**
 * Resolves the agent profiles for `oz-ui create init`. Mirrors
 * `resolveAgentProfilesForInit` (used by `migrate init`) but reads
 * `.oz-ui-create.json` and surfaces a create-specific error message.
 */
function resolveProfilesForCreateInit(
  targetRoot: string,
  raw: string | undefined
): AgentAssetProfile[] {
  if (raw !== undefined && raw.trim() !== '') {
    return parseAgentProfileArg(raw);
  }
  try {
    return readAgentProfileSelection(targetRoot, CREATE_PROFILE_SELECTION_FILENAME);
  } catch {
    throw new Error(
      `Missing required --agent-profile. Choose one of: ${AGENT_ASSET_PROFILE_IDS.join(
        ', '
      )}, all, none. (After the first run, you may omit it to reuse the stored selection in ${CREATE_PROFILE_SELECTION_FILENAME}.)`
    );
  }
}

/**
 * Copies `templates/skills/scaffold-dapp/SKILL.md` into each profile's skill
 * destination under `targetRoot`. Returns relative paths of files copied vs
 * skipped (skipped because they already exist — same semantics as
 * `copyTemplateDirectory`).
 */
function copyScaffoldDappSkill(
  targetRoot: string,
  profiles: readonly AgentAssetProfile[]
): { copied: string[]; skipped: string[] } {
  if (profiles.length === 0) return { copied: [], skipped: [] };
  const copied: string[] = [];
  const skipped: string[] = [];
  const root = path.resolve(targetRoot);

  for (const directory of skillDirectoriesForProfiles(profiles, SCAFFOLD_DAPP_SKILL_ID)) {
    const result = copyTemplateDirectory(SCAFFOLD_DAPP_SKILL_TEMPLATE, path.join(root, directory));
    copied.push(...result.copied.map((f) => `${directory}/${f}`));
    skipped.push(...result.skipped.map((f) => `${directory}/${f}`));
  }

  return { copied, skipped };
}

/**
 * Registers `oz-ui create init` — installs the `scaffold-dapp` skill assets
 * into the user's workspace so an AI agent can orchestrate `oz-ui create`
 * from natural-language intent. Decoupled from the bare scaffolding action
 * (`oz-ui create [project-name]`) because the skill is most useful *before*
 * a new project exists.
 */
export function registerCreateInitCommand(parent: Command): void {
  parent
    .command('init')
    .description(
      'Install the scaffold-dapp AI skill into the current workspace (no project files generated).'
    )
    .option(
      '-t, --target <path>',
      'Target workspace directory where skill assets will be written',
      process.cwd()
    )
    .option('--json', 'Emit machine-readable JSON output')
    .option(
      '--agent-profile <list>',
      `Required on first init: comma-separated ${AGENT_ASSET_PROFILE_IDS.join(
        ', '
      )}, all, or none. On later inits, omit to reuse the selection stored in ${CREATE_PROFILE_SELECTION_FILENAME}.`
    )
    .action((options: CreateInitOptions, cmd: Command) => {
      // Commander 13 silently absorbs duplicate option values to the parent when
      // both parent (`create`) and subcommand (`init`) declare the same flag.
      // `--json` is declared on the parent for the bare scaffold action, so its
      // value lands on `cmd.parent.opts()` here. We still declare `--json` on
      // init above for help-text discoverability, but always resolve it from
      // the parent (or, defensively, from the local options object).
      const json = Boolean(cmd.parent?.opts().json ?? options.json);
      try {
        const targetRoot = path.resolve(options.target);

        if (!fs.existsSync(targetRoot)) {
          throw new Error(`Target directory does not exist: ${targetRoot}`);
        }

        const agentAssetProfiles = resolveProfilesForCreateInit(targetRoot, options.agentProfile);

        const { copied: skillCopied, skipped: skillSkipped } = copyScaffoldDappSkill(
          targetRoot,
          agentAssetProfiles
        );
        const agentProfileSelectionWritten = writeAgentProfileSelection(
          targetRoot,
          agentAssetProfiles,
          CREATE_PROFILE_SELECTION_FILENAME
        );

        const result: CreateInitResult = {
          ok: true,
          action: 'create-init',
          target: targetRoot,
          agentAssetProfiles: [...agentAssetProfiles],
          skillCopied,
          skillSkipped,
          agentProfileSelectionWritten,
        };

        if (json) {
          printJson(result);
          return;
        }

        process.stdout.write(pc.green(`scaffold-dapp skill installed to ${targetRoot}\n`));
        process.stdout.write(
          `  Agent asset profiles: ${pc.dim(agentAssetProfiles.join(', ') || 'none')}\n`
        );
        if (skillCopied.length > 0) {
          process.stdout.write(`  Skill files copied: ${skillCopied.length}\n`);
          for (const file of skillCopied) {
            process.stdout.write(`    ${pc.dim(file)}\n`);
          }
        }
        if (skillSkipped.length > 0) {
          process.stdout.write(`  Skill files skipped (already present): ${skillSkipped.length}\n`);
        }
        process.stdout.write(
          `  Profile selection written: ${pc.dim(agentProfileSelectionWritten)}\n`
        );

        process.stdout.write('\n' + pc.bold('Next steps:\n'));
        process.stdout.write(`  1. Restart your AI assistant so it picks up the new skill\n`);
        process.stdout.write(
          `  2. Ask it to "scaffold a dApp" — the skill will run discovery, ask about preset/wallet, and invoke ${pc.cyan(
            'oz-ui create'
          )} for you\n`
        );
      } catch (error) {
        printError(error, json);
      }
    });
}
