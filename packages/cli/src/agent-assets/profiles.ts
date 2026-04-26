/**
 * Assistant install targets: each profile maps to concrete paths for migration
 * SKILL and agent templates (shared `.agents` layout vs native `.claude` / legacy `.cursor` mirrors).
 */

import fs from 'node:fs';
import path from 'node:path';

import type { AgentAssetProfile, MigrationManifest } from '../manifest/schema';

const SKILL_ID = 'migrate-to-oz-uikit';
export const AGENT_PROFILE_SELECTION_FILENAME = '.oz-ui-migrate.json';

const AGENT_FILES = [
  'migration-analyzer.md',
  'migration-executor.md',
  'migration-verifier.md',
] as const;

interface AgentAssetProfileDefinition {
  id: AgentAssetProfile;
  skillDirectory: string;
  agentDirectory?: string;
}

export const AGENT_ASSET_PROFILE_REGISTRY = {
  standard: {
    id: 'standard',
    skillDirectory: `.agents/skills/${SKILL_ID}`,
    agentDirectory: '.cursor/agents',
  },
  claude: {
    id: 'claude',
    skillDirectory: `.claude/skills/${SKILL_ID}`,
    agentDirectory: '.claude/agents',
  },
  'legacy-cursor': {
    id: 'legacy-cursor',
    skillDirectory: `.cursor/skills/${SKILL_ID}`,
    agentDirectory: '.cursor/agents',
  },
} as const satisfies Record<AgentAssetProfile, AgentAssetProfileDefinition>;

export const AGENT_ASSET_PROFILE_IDS = Object.keys(
  AGENT_ASSET_PROFILE_REGISTRY
) as AgentAssetProfile[];

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

export function getAgentProfileSelectionPath(projectRoot: string): string {
  return path.join(projectRoot, AGENT_PROFILE_SELECTION_FILENAME);
}

export function writeAgentProfileSelection(
  projectRoot: string,
  profiles: readonly AgentAssetProfile[]
): string {
  const filePath = getAgentProfileSelectionPath(projectRoot);
  const payload: AgentProfileSelectionFile = {
    agentAssetProfiles: [...profiles],
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return AGENT_PROFILE_SELECTION_FILENAME;
}

export function readAgentProfileSelection(projectRoot: string): AgentAssetProfile[] {
  const filePath = getAgentProfileSelectionPath(projectRoot);
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
 * @description Expected SKILL.md paths for doctor / dry-run, relative to project root.
 */
export function expectedSkillPathsForProfiles(profiles: AgentAssetProfile[]): string[] {
  return skillDirectoriesForProfiles(profiles).map((directory) => `${directory}/SKILL.md`);
}

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

export function skillDirectoriesForProfiles(profiles: readonly AgentAssetProfile[]): string[] {
  return [
    ...new Set(profiles.map((profile) => AGENT_ASSET_PROFILE_REGISTRY[profile].skillDirectory)),
  ];
}
