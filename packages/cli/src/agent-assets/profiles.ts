/**
 * Assistant install targets: each profile maps to base directories under
 * which skill and agent assets are copied. The skill ID is supplied by the
 * caller so a single registry can serve multiple skills (`migrate-to-oz-uikit`,
 * `scaffold-dapp`, …).
 */

import fs from 'node:fs';
import path from 'node:path';

import type { AgentAssetProfile, MigrationManifest } from '../manifest/schema';

/**
 * Skill identifiers shipped by `@openzeppelin/ui-cli`. Adding a new skill is
 * a matter of authoring `src/templates/skills/<id>/SKILL.md` and threading a
 * new constant here through the consumers that copy and verify it.
 */
export const MIGRATE_SKILL_ID = 'migrate-to-oz-uikit';
export const SCAFFOLD_DAPP_SKILL_ID = 'scaffold-dapp';

/** Profile-selection persistence filename written by `oz-ui migrate init`. */
export const AGENT_PROFILE_SELECTION_FILENAME = '.oz-ui-migrate.json';

/**
 * Profile-selection persistence filename written by `oz-ui create init`.
 * Same shape as `AGENT_PROFILE_SELECTION_FILENAME`; lives next to the workspace
 * where scaffold-dapp skill assets are installed.
 */
export const CREATE_PROFILE_SELECTION_FILENAME = '.oz-ui-create.json';

const AGENT_FILES = [
  'migration-analyzer.md',
  'migration-executor.md',
  'migration-verifier.md',
] as const;

interface AgentAssetProfileDefinition {
  id: AgentAssetProfile;
  /** Base directory under which `<skillId>/SKILL.md` is written. */
  skillBaseDirectory: string;
  /** Optional shared agent directory (subagent prompts). Some skills do not ship subagents. */
  agentDirectory?: string;
}

export const AGENT_ASSET_PROFILE_REGISTRY = {
  standard: {
    id: 'standard',
    skillBaseDirectory: '.agents/skills',
    agentDirectory: '.cursor/agents',
  },
  claude: {
    id: 'claude',
    skillBaseDirectory: '.claude/skills',
    agentDirectory: '.claude/agents',
  },
  'legacy-cursor': {
    id: 'legacy-cursor',
    skillBaseDirectory: '.cursor/skills',
    agentDirectory: '.cursor/agents',
  },
} as const satisfies Record<AgentAssetProfile, AgentAssetProfileDefinition>;

export const AGENT_ASSET_PROFILE_IDS = Object.keys(
  AGENT_ASSET_PROFILE_REGISTRY
) as AgentAssetProfile[];

/**
 * @description For `migrate init`: uses `--agent-profile` when set; when omitted, reuses profiles from `.oz-ui-migrate.json` after a previous init.
 * @returns Resolved profile list, or throws if the flag is missing and there is no stored selection.
 */
export function resolveAgentProfilesForInit(
  projectRoot: string,
  raw: string | undefined
): AgentAssetProfile[] {
  if (raw !== undefined && raw.trim() !== '') {
    return parseAgentProfileArg(raw);
  }
  try {
    return readAgentProfileSelection(projectRoot);
  } catch {
    throw new Error(
      `Missing required --agent-profile. Choose one of: ${AGENT_ASSET_PROFILE_IDS.join(
        ', '
      )}, all, none. (After the first run, you may omit it to reuse the stored selection in ${AGENT_PROFILE_SELECTION_FILENAME}.)`
    );
  }
}

/**
 * @description Comma- / repeated-flag friendly parser for `oz-ui migrate init --agent-profile`.
 * - `all` → every profile; `none` → empty; missing/blank values fail because the user must choose.
 */
export function parseAgentProfileArg(raw: string | undefined): AgentAssetProfile[] {
  if (raw === undefined || raw.trim() === '') {
    throw new Error(
      `Missing required --agent-profile. Choose one of: ${AGENT_ASSET_PROFILE_IDS.join(
        ', '
      )}, all, none.`
    );
  }

  const input = raw.trim();
  if (input === 'none') {
    return [];
  }
  if (input === 'all') {
    return [...AGENT_ASSET_PROFILE_IDS];
  }

  const parts = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new Error(
      `Missing required --agent-profile. Choose one of: ${AGENT_ASSET_PROFILE_IDS.join(
        ', '
      )}, all, none.`
    );
  }

  if (parts.includes('none') && parts.length > 1) {
    throw new Error('Invalid --agent-profile: "none" cannot be combined with other values.');
  }

  if (parts.includes('all') && parts.length > 1) {
    throw new Error('Invalid --agent-profile: "all" cannot be combined with other values.');
  }

  const out: AgentAssetProfile[] = [];
  const seen = new Set<AgentAssetProfile>();
  for (const p of parts) {
    if (p === 'all' || p === 'none') {
      throw new Error(
        'Invalid --agent-profile: use "all" or "none" alone, or list concrete profiles.'
      );
    }
    if (!isAgentAssetProfile(p)) {
      throw new Error(
        `Invalid agent profile "${p}". Valid: ${AGENT_ASSET_PROFILE_IDS.join(', ')}, all, none.`
      );
    }
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }

  return out;
}

/**
 * @description Type guard for manifest and stored profile id strings.
 */
export function isAgentAssetProfile(value: string): value is AgentAssetProfile {
  return (AGENT_ASSET_PROFILE_IDS as readonly string[]).includes(value);
}

/**
 * @description Resolves which profiles apply for doctor/execute when reading a manifest.
 */
export function resolveManifestAgentProfiles(manifest: MigrationManifest): AgentAssetProfile[] {
  if (manifest.agentAssetProfiles === undefined) {
    throw new Error(
      'Manifest is missing agentAssetProfiles. Re-run `oz-ui migrate init --agent-profile <profiles>`, then regenerate the migration plan with `oz-ui migrate plan`.'
    );
  }
  return manifest.agentAssetProfiles;
}

interface AgentProfileSelectionFile {
  agentAssetProfiles: AgentAssetProfile[];
  updatedAt: string;
}

function validateAgentProfiles(profiles: unknown): AgentAssetProfile[] {
  if (!Array.isArray(profiles)) {
    throw new Error('Stored agentAssetProfiles must be an array.');
  }

  for (const entry of profiles) {
    if (typeof entry !== 'string' || !isAgentAssetProfile(entry)) {
      throw new Error(
        `Invalid stored agentAssetProfiles entry: ${String(entry)}. ` +
          `Expected one of: ${AGENT_ASSET_PROFILE_IDS.join(', ')}.`
      );
    }
  }

  return profiles;
}

/**
 * @description Absolute path to a profile-selection persistence file relative to the given filename.
 *
 * `migrate init` writes `.oz-ui-migrate.json`; `create init` writes `.oz-ui-create.json`. The shape
 * is identical so the same read/write helpers can serve both.
 */
export function getAgentProfileSelectionPath(
  projectRoot: string,
  filename: string = AGENT_PROFILE_SELECTION_FILENAME
): string {
  return path.join(projectRoot, filename);
}

/**
 * @description Writes the chosen profiles to disk so later commands can load them without repeating flags.
 * @returns Relative path of the written file (for CLI output).
 */
export function writeAgentProfileSelection(
  projectRoot: string,
  profiles: readonly AgentAssetProfile[],
  filename: string = AGENT_PROFILE_SELECTION_FILENAME
): string {
  const filePath = getAgentProfileSelectionPath(projectRoot, filename);
  const payload: AgentProfileSelectionFile = {
    agentAssetProfiles: [...profiles],
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return filename;
}

/**
 * @description Reads profiles written by `writeAgentProfileSelection`; used when generating the migration manifest.
 */
export function readAgentProfileSelection(
  projectRoot: string,
  filename: string = AGENT_PROFILE_SELECTION_FILENAME
): AgentAssetProfile[] {
  const filePath = getAgentProfileSelectionPath(projectRoot, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Agent profile selection not found. Run \`oz-ui migrate init --agent-profile <profiles> --project ${projectRoot}\` before generating a plan.`
    );
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as Partial<AgentProfileSelectionFile>;
  return validateAgentProfiles(parsed.agentAssetProfiles);
}

/**
 * @description Expected agent markdown paths for doctor / dry-run, relative to project root.
 */
export function expectedAgentPathsForProfiles(profiles: AgentAssetProfile[]): string[] {
  const paths: string[] = [];
  for (const directory of agentDirectoriesForProfiles(profiles)) {
    paths.push(...AGENT_FILES.map((file) => `${directory}/${file}`));
  }
  return paths.sort();
}

/**
 * @description Expected SKILL.md paths for doctor / dry-run, relative to project root, for the given skill id.
 */
export function expectedSkillPathsForProfiles(
  profiles: AgentAssetProfile[],
  skillId: string
): string[] {
  return skillDirectoriesForProfiles(profiles, skillId).map((directory) => `${directory}/SKILL.md`);
}

/**
 * @description Unique agent template destination roots (e.g. `.cursor/agents`) for the given profiles.
 */
export function agentDirectoriesForProfiles(profiles: readonly AgentAssetProfile[]): string[] {
  const directories = new Set<string>();
  for (const profile of profiles) {
    const directory = AGENT_ASSET_PROFILE_REGISTRY[profile].agentDirectory;
    if (directory) {
      directories.add(directory);
    }
  }
  return [...directories].sort();
}

/**
 * @description Skill install directory per profile for the given skill id (e.g. `.agents/skills/scaffold-dapp`), de-duplicated.
 */
export function skillDirectoriesForProfiles(
  profiles: readonly AgentAssetProfile[],
  skillId: string
): string[] {
  return [
    ...new Set(
      profiles.map(
        (profile) => `${AGENT_ASSET_PROFILE_REGISTRY[profile].skillBaseDirectory}/${skillId}`
      )
    ),
  ];
}
