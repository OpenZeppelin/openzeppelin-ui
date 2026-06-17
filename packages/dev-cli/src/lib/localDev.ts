import { spawnSync, type StdioOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { loadProjectConfig, ResolvedFamilyConfig, ResolvedProjectConfig } from './config';
import { FamilyKey } from './families';

const MAX_COMMAND_BUFFER = 50 * 1024 * 1024;
const STALE_DIST_THRESHOLD_MS = 30_000;

interface ResolvedPathInfo {
  envName: string | null;
  relativePath: string;
  absolutePath: string;
}

export interface FamilyStatus {
  key: FamilyKey;
  displayName: string;
  envFlag: string;
  repoRoot: string;
  repoExists: boolean;
  manifestPath: string;
  manifestExists: boolean;
  tarballCount: number;
}

export interface StatusResult {
  projectRoot: string;
  configPath: string;
  cacheDir: string;
  families: FamilyStatus[];
}

export interface DoctorIssue {
  family: FamilyKey;
  severity: 'error' | 'warning';
  message: string;
}

export interface DoctorResult extends StatusResult {
  ok: boolean;
  issues: DoctorIssue[];
}

export interface UseLocalResult {
  projectRoot: string;
  families: FamilyKey[];
  manifests: Array<{ family: FamilyKey; manifestPath: string; tarballCount: number }>;
}

export interface UseLocalOptions {
  quiet?: boolean;
}

export interface UseRemoteResult {
  projectRoot: string;
  removedPaths: string[];
}

function getSupportedFamilies(
  config: ResolvedProjectConfig
): Array<[FamilyKey, ResolvedFamilyConfig]> {
  return Object.entries(config.families) as Array<[FamilyKey, ResolvedFamilyConfig]>;
}

function getConfiguredPath(family: ResolvedFamilyConfig): ResolvedPathInfo {
  for (const envName of family.envNames) {
    const value = process.env[envName];
    if (value) {
      return {
        envName,
        relativePath: value,
        absolutePath: '',
      };
    }
  }

  return {
    envName: null,
    relativePath: family.defaultPath,
    absolutePath: '',
  };
}

function resolveRepoRoot(
  config: ResolvedProjectConfig,
  family: ResolvedFamilyConfig
): ResolvedPathInfo {
  const configuredPath = getConfiguredPath(family);
  const absolutePath = path.resolve(config.projectRoot, configuredPath.relativePath);

  return {
    ...configuredPath,
    absolutePath,
  };
}

function ensureRepoRoot(config: ResolvedProjectConfig, family: ResolvedFamilyConfig): string {
  const pathInfo = resolveRepoRoot(config, family);
  if (!fs.existsSync(pathInfo.absolutePath)) {
    const envHelp = family.envNames.join(' or ');
    const envSource = pathInfo.envName
      ? `${pathInfo.envName}=${pathInfo.relativePath}`
      : `default path ${family.defaultPath}`;
    throw new Error(
      `[local-dev] ${family.repoName} checkout not found at ${pathInfo.absolutePath} (${envSource}). Set ${envHelp} to a valid ${family.repoName} checkout.`
    );
  }

  return pathInfo.absolutePath;
}

function ensurePackageRoot(
  repoRoot: string,
  family: ResolvedFamilyConfig,
  packageName: string,
  packagePath: string
): string {
  const packageRoot = path.join(repoRoot, packagePath);
  if (!fs.existsSync(path.join(packageRoot, 'package.json'))) {
    throw new Error(
      `[local-dev] Expected ${packageName} at ${packageRoot}, but it was not found. Check that ${family.repoName} matches a compatible checkout.`
    );
  }

  return packageRoot;
}

function getManifestPath(config: ResolvedProjectConfig, familyKey: FamilyKey): string {
  return path.join(config.cacheDir, `${familyKey}.json`);
}

/**
 * Extracts and validates package paths from a packed-manifest JSON string.
 */
export function extractManifestPackages(manifestContents: string): Record<string, string> | null {
  const parsed = JSON.parse(manifestContents) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const packages = (parsed as { packages?: unknown }).packages;
  if (!packages || typeof packages !== 'object' || Array.isArray(packages)) {
    return null;
  }

  const validatedPackages: Record<string, string> = {};
  for (const [packageName, packagePath] of Object.entries(packages)) {
    if (typeof packagePath !== 'string') {
      return null;
    }

    validatedPackages[packageName] = packagePath;
  }

  return validatedPackages;
}

function readManifest(
  config: ResolvedProjectConfig,
  familyKey: FamilyKey
): Record<string, string> | null {
  const manifestPath = getManifestPath(config, familyKey);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return extractManifestPackages(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
}

interface RunCommandOptions {
  stdio?: StdioOptions;
  extraEnv?: NodeJS.ProcessEnv;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  options: RunCommandOptions = {}
): string {
  const { stdio = ['ignore', 'pipe', 'pipe'], extraEnv } = options;

  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
    stdio,
    maxBuffer: MAX_COMMAND_BUFFER,
  });

  if (result.status !== 0) {
    const baseMessage =
      result.stderr || result.stdout || `Command failed: ${command} ${args.join(' ')}`;
    const extraDetails: string[] = [];

    if (result.error?.message) {
      extraDetails.push(`error: ${result.error.message}`);
    }

    if (result.signal) {
      extraDetails.push(`signal: ${result.signal}`);
    }

    const message =
      extraDetails.length > 0 ? `${baseMessage}\n${extraDetails.join(', ')}` : baseMessage;
    throw new Error(message);
  }

  return typeof result.stdout === 'string' ? result.stdout.trim() : '';
}

function newestFileTimestamp(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestFileTimestamp(entryPath));
    } else {
      newest = Math.max(newest, fs.statSync(entryPath).mtimeMs);
    }
  }
  return newest;
}

function newestSourceTimestamp(packageRoot: string): number {
  const srcDir = path.join(packageRoot, 'src');
  const pkgJson = path.join(packageRoot, 'package.json');
  let newest = newestFileTimestamp(srcDir);
  if (fs.existsSync(pkgJson)) {
    newest = Math.max(newest, fs.statSync(pkgJson).mtimeMs);
  }
  return newest;
}

function collectWorkspaceDeps(packageRoot: string, repoRoot: string): string[] {
  const pkgPath = path.join(packageRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return [];

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
    const roots: string[] = [];
    for (const depSection of ['dependencies', 'devDependencies'] as const) {
      const deps = pkg[depSection];
      if (!deps || typeof deps !== 'object') continue;
      for (const [depName, version] of Object.entries(deps as Record<string, string>)) {
        if (typeof version === 'string' && version.startsWith('workspace:')) {
          const depPkg = findWorkspacePackage(repoRoot, depName);
          if (depPkg) roots.push(depPkg);
        }
      }
    }
    return roots;
  } catch {
    return [];
  }
}

function findWorkspacePackage(repoRoot: string, packageName: string): string | null {
  const packagesDir = path.join(repoRoot, 'packages');
  if (!fs.existsSync(packagesDir)) return null;

  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgJsonPath = path.join(packagesDir, entry.name, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')) as { name?: string };
      if (pkg.name === packageName) return path.join(packagesDir, entry.name);
    } catch {
      continue;
    }
  }
  return null;
}

function verifyDistFreshness(repoRoot: string, family: ResolvedFamilyConfig): string[] {
  const warnings: string[] = [];

  for (const [packageName, packagePath] of Object.entries(family.packageMap)) {
    const packageRoot = path.join(repoRoot, packagePath);
    const distDir = path.join(packageRoot, 'dist');

    if (!fs.existsSync(distDir)) {
      warnings.push(`${packageName}: dist/ directory is missing after build`);
      continue;
    }

    const distTime = newestFileTimestamp(distDir);
    let srcTime = newestSourceTimestamp(packageRoot);

    for (const depRoot of collectWorkspaceDeps(packageRoot, repoRoot)) {
      srcTime = Math.max(srcTime, newestSourceTimestamp(depRoot));
    }

    if (srcTime > 0 && distTime > 0 && srcTime - distTime > STALE_DIST_THRESHOLD_MS) {
      const staleBy = Math.round((srcTime - distTime) / 1000);
      warnings.push(`${packageName}: dist/ appears stale (source is ~${staleBy}s newer than dist)`);
    }
  }

  return warnings;
}

function buildFamily(
  config: ResolvedProjectConfig,
  family: ResolvedFamilyConfig,
  options: UseLocalOptions = {}
): string {
  const repoRoot = ensureRepoRoot(config, family);
  runCommand(config.packageManager, family.buildArgs, repoRoot, {
    // Keep human-friendly build logs for interactive use, but preserve clean stdout for JSON mode.
    stdio: options.quiet ? ['ignore', 'pipe', 'inherit'] : ['ignore', 'inherit', 'inherit'],
  });

  const warnings = verifyDistFreshness(repoRoot, family);
  if (warnings.length > 0) {
    const header = `[local-dev] dist freshness warnings for ${family.displayName}:`;
    const details = warnings.map((w) => `  - ${w}`).join('\n');
    process.stderr.write(`${header}\n${details}\n`);
  }

  return repoRoot;
}

/**
 * Normalizes `pnpm pack --json` output to an absolute tarball path.
 */
export function resolvePackedFilename(destinationDir: string, packedFilename: string): string {
  return path.isAbsolute(packedFilename)
    ? packedFilename
    : path.join(destinationDir, packedFilename);
}

/**
 * Extracts the packed tarball filename from `pnpm pack --json` output.
 */
export function extractPackedFilename(stdout: string): string | null {
  const payload = JSON.parse(stdout) as unknown;

  if (Array.isArray(payload)) {
    const firstEntry = payload[0] as { filename?: unknown } | undefined;
    return typeof firstEntry?.filename === 'string' ? firstEntry.filename : null;
  }

  if (payload && typeof payload === 'object') {
    const entry = payload as { filename?: unknown };
    return typeof entry.filename === 'string' ? entry.filename : null;
  }

  return null;
}

function packPackage(
  packageManager: ResolvedProjectConfig['packageManager'],
  packageRoot: string,
  destinationDir: string
): string {
  const stdout = runCommand(
    packageManager,
    ['pack', '--pack-destination', destinationDir, '--json'],
    packageRoot
  );
  const packedFilename = extractPackedFilename(stdout);

  if (!packedFilename) {
    throw new Error(`Unexpected pack output for ${packageRoot}: ${stdout}`);
  }

  return resolvePackedFilename(destinationDir, packedFilename);
}

function packFamily(
  config: ResolvedProjectConfig,
  familyKey: FamilyKey,
  family: ResolvedFamilyConfig
) {
  const repoRoot = ensureRepoRoot(config, family);
  const familyDir = path.join(config.cacheDir, familyKey);
  const manifestPath = getManifestPath(config, familyKey);

  fs.rmSync(familyDir, { recursive: true, force: true });
  fs.mkdirSync(familyDir, { recursive: true });
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

  const manifest: Record<string, string> = {};

  for (const [packageName, packagePath] of Object.entries(family.packageMap)) {
    const packageRoot = ensurePackageRoot(repoRoot, family, packageName, packagePath);
    manifest[packageName] = packPackage(config.packageManager, packageRoot, familyDir);
  }

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        repoRoot,
        packages: manifest,
      },
      null,
      2
    ) + '\n'
  );

  return {
    family: familyKey,
    manifestPath,
    tarballCount: Object.keys(manifest).length,
  };
}

function installProject(config: ResolvedProjectConfig, familyKeys: FamilyKey[]): void {
  const clearedPaths = clearProjectNodeModules(config.projectRoot);
  if (clearedPaths.length > 0) {
    process.stderr.write(
      `[local-dev] Cleared ${clearedPaths.length} node_modules director${clearedPaths.length === 1 ? 'y' : 'ies'} before reinstall.\n`
    );
  }

  const env = Object.fromEntries(
    getSupportedFamilies(config).map(([key, family]) => [
      family.envFlag,
      familyKeys.includes(key) ? 'true' : 'false',
    ])
  );

  runCommand(config.packageManager, config.installArgs, config.projectRoot, { extraEnv: env });
}

/**
 * Expands simple pnpm-workspace.yaml package globs (e.g. `packages/*`) to package roots.
 */
export function collectWorkspacePackageDirs(projectRoot: string): string[] {
  const workspacePath = path.join(projectRoot, 'pnpm-workspace.yaml');
  if (!fs.existsSync(workspacePath)) {
    return [];
  }

  const packageDirs: string[] = [];
  const content = fs.readFileSync(workspacePath, 'utf8');

  for (const line of content.split('\n')) {
    const match = line.match(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/);
    if (!match) {
      continue;
    }

    appendWorkspacePatternDirs(projectRoot, match[1].trim(), packageDirs);
  }

  return packageDirs;
}

function isPathWithinProjectRoot(projectRoot: string, targetPath: string): boolean {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const resolved = path.resolve(targetPath);
  const relative = path.relative(resolvedProjectRoot, resolved);

  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

function resolvePathWithinProjectRoot(projectRoot: string, relativePath: string): string | null {
  if (path.isAbsolute(relativePath)) {
    return null;
  }

  const resolvedProjectRoot = path.resolve(projectRoot);
  const resolved = path.resolve(resolvedProjectRoot, relativePath);

  if (!isPathWithinProjectRoot(resolvedProjectRoot, resolved)) {
    return null;
  }

  return resolved;
}

function appendWorkspacePatternDirs(
  projectRoot: string,
  pattern: string,
  packageDirs: string[]
): void {
  if (pattern.endsWith('/*')) {
    const baseDir = resolvePathWithinProjectRoot(projectRoot, pattern.slice(0, -2));
    if (!baseDir || !fs.existsSync(baseDir)) {
      return;
    }

    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packageRoot = path.join(baseDir, entry.name);
      if (
        isPathWithinProjectRoot(projectRoot, packageRoot) &&
        fs.existsSync(path.join(packageRoot, 'package.json'))
      ) {
        packageDirs.push(packageRoot);
      }
    }
    return;
  }

  const packageRoot = resolvePathWithinProjectRoot(projectRoot, pattern);
  if (packageRoot && fs.existsSync(path.join(packageRoot, 'package.json'))) {
    packageDirs.push(packageRoot);
  }
}

/**
 * Removes root and workspace package node_modules trees so pnpm re-applies .pnpmfile.cjs
 * rewrites instead of short-circuiting on an existing registry lockfile.
 */
export function clearProjectNodeModules(projectRoot: string): string[] {
  const removedPaths: string[] = [];
  const nodeModulesCandidates = [
    path.join(projectRoot, 'node_modules'),
    ...collectWorkspacePackageDirs(projectRoot).map((packageDir) =>
      path.join(packageDir, 'node_modules')
    ),
  ];

  for (const nodeModulesPath of nodeModulesCandidates) {
    removePath(nodeModulesPath, removedPaths);
  }

  return removedPaths;
}

function removePath(targetPath: string, removedPaths: string[]): void {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
  removedPaths.push(targetPath);
}

/**
 * Collects the current local-development status for a consumer repository.
 */
export function collectStatus(projectRootInput: string): StatusResult {
  const config = loadProjectConfig(projectRootInput);
  const families = getSupportedFamilies(config).map(([familyKey, family]) => {
    const pathInfo = resolveRepoRoot(config, family);
    const manifestPath = getManifestPath(config, familyKey);
    const manifest = readManifest(config, familyKey);

    return {
      key: familyKey,
      displayName: family.displayName,
      envFlag: family.envFlag,
      repoRoot: pathInfo.absolutePath,
      repoExists: fs.existsSync(pathInfo.absolutePath),
      manifestPath,
      manifestExists: fs.existsSync(manifestPath),
      tarballCount: manifest ? Object.keys(manifest).length : 0,
    };
  });

  return {
    projectRoot: config.projectRoot,
    configPath: config.configPath,
    cacheDir: config.cacheDir,
    families,
  };
}

/**
 * Validates the configured repositories, package roots, and packed manifests.
 */
export function doctorProject(projectRootInput: string): DoctorResult {
  const config = loadProjectConfig(projectRootInput);
  const status = collectStatus(projectRootInput);
  const issues: DoctorIssue[] = [];

  for (const [familyKey, family] of getSupportedFamilies(config)) {
    const repoRoot = resolveRepoRoot(config, family).absolutePath;

    if (!fs.existsSync(repoRoot)) {
      issues.push({
        family: familyKey,
        severity: 'error',
        message: `Repo root is missing at ${repoRoot}.`,
      });
      continue;
    }

    for (const [packageName, packagePath] of Object.entries(family.packageMap)) {
      const packageRoot = path.join(repoRoot, packagePath, 'package.json');
      if (!fs.existsSync(packageRoot)) {
        issues.push({
          family: familyKey,
          severity: 'error',
          message: `Expected ${packageName} at ${packageRoot}.`,
        });
      }
    }

    const manifest = readManifest(config, familyKey);
    if (!manifest) {
      issues.push({
        family: familyKey,
        severity: 'warning',
        message: `Packed manifest has not been generated yet for ${familyKey}.`,
      });
      continue;
    }

    for (const tarballPath of Object.values(manifest)) {
      if (!fs.existsSync(tarballPath)) {
        issues.push({
          family: familyKey,
          severity: 'error',
          message: `Packed tarball is missing at ${tarballPath}.`,
        });
      }
    }
  }

  return {
    ...status,
    ok: issues.every((issue) => issue.severity !== 'error'),
    issues,
  };
}

/**
 * Builds, packs, and installs the selected local package families for a consumer repository.
 */
export function useLocal(
  projectRootInput: string,
  familyKeys: FamilyKey[],
  options: UseLocalOptions = {}
): UseLocalResult {
  const config = loadProjectConfig(projectRootInput);
  const manifests = familyKeys.map((familyKey) => {
    const family = config.families[familyKey];
    if (!family) {
      throw new Error(`Family "${familyKey}" is not configured for ${config.projectRoot}.`);
    }

    buildFamily(config, family, options);
    return packFamily(config, familyKey, family);
  });

  installProject(config, familyKeys);

  return {
    projectRoot: config.projectRoot,
    families: familyKeys,
    manifests,
  };
}

/**
 * Removes local manifests and reinstalls a consumer repository against published packages.
 */
export function useRemote(projectRootInput: string): UseRemoteResult {
  const config = loadProjectConfig(projectRootInput);
  const removedPaths: string[] = [];

  for (const [familyKey] of getSupportedFamilies(config)) {
    removePath(getManifestPath(config, familyKey), removedPaths);
    removePath(path.join(config.cacheDir, familyKey), removedPaths);
  }

  const cacheEntries = fs.existsSync(config.cacheDir) ? fs.readdirSync(config.cacheDir) : [];
  if (cacheEntries.length === 0) {
    removePath(config.cacheDir, removedPaths);
  }

  installProject(config, []);

  return {
    projectRoot: config.projectRoot,
    removedPaths,
  };
}
