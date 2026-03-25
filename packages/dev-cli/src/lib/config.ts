import fs from 'node:fs';
import path from 'node:path';

import {
  FamilyDefinition,
  FamilyKey,
  getFamilyKeys,
  isFamilyKey,
  STANDARD_FAMILIES,
} from './families';

export const PROJECT_CONFIG_FILE = '.openzeppelin-dev.json';
const DEFAULT_CACHE_DIR = '.packed-packages/local-dev';
const DEFAULT_INSTALL_ARGS = ['install', '--force'];
const SUPPORTED_PACKAGE_MANAGER = 'pnpm';

export interface ResolvedFamilyConfig extends FamilyDefinition {
  defaultPath: string;
  envNames: string[];
}

export interface ResolvedProjectConfig {
  projectRoot: string;
  configPath: string;
  cacheDir: string;
  packageManager: string;
  installArgs: string[];
  families: Partial<Record<FamilyKey, ResolvedFamilyConfig>>;
}

function assertObject(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
}

/**
 * Loads and validates a consumer repository's `.openzeppelin-dev.json` file.
 */
export function loadProjectConfig(projectRootInput: string): ResolvedProjectConfig {
  const projectRoot = path.resolve(projectRootInput);
  const configPath = path.join(projectRoot, PROJECT_CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing ${PROJECT_CONFIG_FILE} in ${projectRoot}.`);
  }

  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as unknown;
  assertObject(parsed, `${PROJECT_CONFIG_FILE} must contain a JSON object.`);

  if (parsed.version !== 1) {
    throw new Error(`${PROJECT_CONFIG_FILE} must declare "version": 1.`);
  }

  assertObject(parsed.families, `${PROJECT_CONFIG_FILE} must contain a "families" object.`);

  const resolvedFamilies: Partial<Record<FamilyKey, ResolvedFamilyConfig>> = {};

  for (const [familyKey, overrides] of Object.entries(parsed.families)) {
    if (!isFamilyKey(familyKey)) {
      throw new Error(
        `${PROJECT_CONFIG_FILE} contains unsupported family "${familyKey}". Expected one of: ${getFamilyKeys().join(', ')}.`
      );
    }

    const familyOverrides = overrides ?? {};
    assertObject(
      familyOverrides,
      `${PROJECT_CONFIG_FILE} family "${familyKey}" must be configured with a JSON object.`
    );

    const baseDefinition = STANDARD_FAMILIES[familyKey];
    const filteredEnvNames =
      Array.isArray(familyOverrides.envNames) && familyOverrides.envNames.length > 0
        ? familyOverrides.envNames.filter(
            (value): value is string => typeof value === 'string' && value.length > 0
          )
        : null;
    resolvedFamilies[familyKey] = {
      ...baseDefinition,
      defaultPath:
        typeof familyOverrides.defaultPath === 'string' &&
        familyOverrides.defaultPath.trim().length > 0
          ? familyOverrides.defaultPath
          : baseDefinition.defaultPath,
      envNames:
        filteredEnvNames && filteredEnvNames.length > 0
          ? filteredEnvNames
          : [...baseDefinition.envNames],
    };
  }

  if (Object.keys(resolvedFamilies).length === 0) {
    throw new Error(`${PROJECT_CONFIG_FILE} must configure at least one family.`);
  }

  const packageManager =
    typeof parsed.packageManager === 'string' && parsed.packageManager.trim().length > 0
      ? parsed.packageManager
      : SUPPORTED_PACKAGE_MANAGER;

  if (packageManager !== SUPPORTED_PACKAGE_MANAGER) {
    throw new Error(
      `${PROJECT_CONFIG_FILE} currently supports only "${SUPPORTED_PACKAGE_MANAGER}" as "packageManager".`
    );
  }

  const installArgs =
    Array.isArray(parsed.installArgs) && parsed.installArgs.length > 0
      ? parsed.installArgs.filter(
          (value): value is string => typeof value === 'string' && value.length > 0
        )
      : DEFAULT_INSTALL_ARGS;
  const cacheDir =
    typeof parsed.cacheDir === 'string' && parsed.cacheDir.trim().length > 0
      ? parsed.cacheDir
      : DEFAULT_CACHE_DIR;

  return {
    projectRoot,
    configPath,
    cacheDir: path.join(projectRoot, cacheDir),
    packageManager,
    installArgs,
    families: resolvedFamilies,
  };
}
