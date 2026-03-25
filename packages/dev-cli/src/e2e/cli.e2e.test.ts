import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

import { STANDARD_FAMILIES } from '../lib/families';
import { extractPackedFilename, resolvePackedFilename } from '../lib/localDev';
import { CLI_PACKAGE_NAME } from '../lib/packageInfo';

interface CommandResult {
  stdout: string;
  stderr: string;
  status: number;
}

interface InitCommandResult {
  ok: boolean;
  action: 'init';
  projectRoot: string;
  configPath: string;
  pnpmfilePath: string;
  updatedScripts: string[];
  keptScripts: string[];
  families: string[];
}

interface FamilyStatus {
  key: string;
  repoExists: boolean;
  manifestExists: boolean;
  tarballCount: number;
}

interface StatusCommandResult {
  ok: boolean;
  action: 'status';
  projectRoot: string;
  cacheDir: string;
  families: FamilyStatus[];
}

interface DoctorIssue {
  family: string;
  severity: 'warning' | 'error';
  message: string;
}

interface DoctorCommandResult extends StatusCommandResult {
  action: 'doctor';
  issues: DoctorIssue[];
}

interface UseLocalManifest {
  family: string;
  manifestPath: string;
  tarballCount: number;
}

interface UseLocalCommandResult {
  ok: boolean;
  action: 'use-local';
  projectRoot: string;
  families: string[];
  manifests: UseLocalManifest[];
}

interface UseRemoteCommandResult {
  ok: boolean;
  action: 'use-remote';
  projectRoot: string;
  removedPaths: string[];
}

interface ManifestFile {
  generatedAt: string;
  repoRoot: string;
  packages: Record<string, string>;
}

const temporaryDirectories: string[] = [];

function findPackageRoot(startDirectory: string, packageName: string): string {
  let currentDirectory = startDirectory;

  while (true) {
    const packageJsonPath = path.join(currentDirectory, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = readJsonFile<{ name?: string }>(packageJsonPath);
      if (packageJson.name === packageName) {
        return currentDirectory;
      }
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      throw new Error(`Could not find package root for ${packageName} from ${startDirectory}.`);
    }

    currentDirectory = parentDirectory;
  }
}

function findSiblingRepository(baseRepoRoot: string, siblingDirectoryName: string): string {
  const siblingPath = path.resolve(baseRepoRoot, '..', siblingDirectoryName);
  if (!fs.existsSync(siblingPath)) {
    throw new Error(`Could not find sibling repository at ${siblingPath}.`);
  }

  return siblingPath;
}

const PACKAGE_ROOT = findPackageRoot(
  path.dirname(fileURLToPath(import.meta.url)),
  CLI_PACKAGE_NAME
);
const UI_REPO_ROOT = findPackageRoot(PACKAGE_ROOT, 'openzeppelin-ui');
const ADAPTERS_REPO_ROOT = findSiblingRepository(UI_REPO_ROOT, 'openzeppelin-adapters');

function createTemporaryDirectory(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  options?: {
    env?: NodeJS.ProcessEnv;
    allowFailure?: boolean;
  }
): Promise<CommandResult> {
  const child = spawn(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options?.env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk: string | Buffer) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk: string | Buffer) => {
    stderr += chunk.toString();
  });

  const [exitCode] = await once(child, 'close');

  const commandResult: CommandResult = {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    status: exitCode ?? 1,
  };

  if (!options?.allowFailure && commandResult.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(' ')}`,
        `cwd: ${cwd}`,
        commandResult.stdout ? `stdout:\n${commandResult.stdout}` : '',
        commandResult.stderr ? `stderr:\n${commandResult.stderr}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
    );
  }

  return commandResult;
}

async function runJsonCommand<T>(cwd: string, args: string[], allowFailure = false): Promise<T> {
  const result = await runCommand('pnpm', ['exec', 'oz-dev', ...args], cwd, { allowFailure });

  if (!result.stdout) {
    throw new Error(`Expected JSON stdout for oz-dev ${args.join(' ')}, but received none.`);
  }

  return JSON.parse(result.stdout) as T;
}

function writeSmokeAppPackageJson(projectRoot: string): void {
  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'oz-dev-e2e-app',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'node -e "console.log(\'smoke app placeholder\')"',
        },
        dependencies: {
          '@openzeppelin/adapter-evm': '^1.0.0',
          '@openzeppelin/ui-components': '^1.4.0',
          react: '^19.2.1',
          'react-dom': '^19.2.1',
          'react-hook-form': '^7.62.0',
          viem: '^2.44.4',
          wagmi: '^2.16.1',
        },
      },
      null,
      2
    ) + '\n'
  );
}

async function packCliTarball(destinationDir: string): Promise<string> {
  const result = await runCommand(
    'pnpm',
    ['pack', '--pack-destination', destinationDir, '--json'],
    PACKAGE_ROOT
  );
  const packedFilename = extractPackedFilename(result.stdout);

  if (!packedFilename) {
    throw new Error(`Unexpected pack output: ${result.stdout}`);
  }

  return resolvePackedFilename(destinationDir, packedFilename);
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

afterAll(() => {
  for (const directory of temporaryDirectories) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('oz-dev CLI end-to-end', () => {
  it('bootstraps a scratch app and runs the full local/remote workflow', async () => {
    expect(fs.existsSync(UI_REPO_ROOT)).toBe(true);
    expect(fs.existsSync(ADAPTERS_REPO_ROOT)).toBe(true);

    const workspaceRoot = createTemporaryDirectory('oz-dev-e2e-');
    const appRoot = path.join(workspaceRoot, 'app');
    fs.mkdirSync(appRoot, { recursive: true });

    writeSmokeAppPackageJson(appRoot);

    const tarballPath = await packCliTarball(workspaceRoot);
    await runCommand('pnpm', ['add', '-D', tarballPath], appRoot);

    const initResult = await runJsonCommand<InitCommandResult>(appRoot, [
      'init',
      '--project',
      appRoot,
      '--family',
      'ui',
      '--family',
      'adapters',
      '--ui-path',
      UI_REPO_ROOT,
      '--adapters-path',
      ADAPTERS_REPO_ROOT,
      '--json',
    ]);

    expect(initResult.ok).toBe(true);
    expect(initResult.updatedScripts).toEqual([
      'dev:local',
      'dev:uikit:local',
      'dev:adapters:local',
      'dev:npm',
    ]);

    const initializedPackageJson = readJsonFile<{
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    }>(path.join(appRoot, 'package.json'));

    expect(initializedPackageJson.devDependencies[CLI_PACKAGE_NAME]).toBe(`file:${tarballPath}`);
    expect(initializedPackageJson.scripts['dev:local']).toContain('oz-dev use local');
    expect(initializedPackageJson.scripts['dev:npm']).toBe('oz-dev use remote --project "$PWD"');

    const statusBefore = await runJsonCommand<StatusCommandResult>(appRoot, [
      'status',
      '--project',
      appRoot,
      '--json',
    ]);

    expect(statusBefore.ok).toBe(true);
    expect(statusBefore.families).toEqual([
      expect.objectContaining({
        key: 'ui',
        repoExists: true,
        manifestExists: false,
        tarballCount: 0,
      }),
      expect.objectContaining({
        key: 'adapters',
        repoExists: true,
        manifestExists: false,
        tarballCount: 0,
      }),
    ]);

    const doctorBefore = await runJsonCommand<DoctorCommandResult>(appRoot, [
      'doctor',
      '--project',
      appRoot,
      '--json',
    ]);

    expect(doctorBefore.ok).toBe(true);
    expect(doctorBefore.issues).toEqual([
      expect.objectContaining({
        family: 'ui',
        severity: 'warning',
      }),
      expect.objectContaining({
        family: 'adapters',
        severity: 'warning',
      }),
    ]);

    const useLocalResult = await runJsonCommand<UseLocalCommandResult>(appRoot, [
      'use',
      'local',
      '--project',
      appRoot,
      '--family',
      'ui',
      '--family',
      'adapters',
      '--json',
    ]);

    expect(useLocalResult.ok).toBe(true);
    expect(useLocalResult.manifests).toEqual([
      expect.objectContaining({
        family: 'ui',
        tarballCount: Object.keys(STANDARD_FAMILIES.ui.packageMap).length,
      }),
      expect.objectContaining({
        family: 'adapters',
        tarballCount: Object.keys(STANDARD_FAMILIES.adapters.packageMap).length,
      }),
    ]);

    const uiManifest = readJsonFile<ManifestFile>(
      path.join(appRoot, '.packed-packages/local-dev/ui.json')
    );
    const adaptersManifest = readJsonFile<ManifestFile>(
      path.join(appRoot, '.packed-packages/local-dev/adapters.json')
    );

    expect(Object.keys(uiManifest.packages)).toHaveLength(
      Object.keys(STANDARD_FAMILIES.ui.packageMap).length
    );
    expect(Object.keys(adaptersManifest.packages)).toHaveLength(
      Object.keys(STANDARD_FAMILIES.adapters.packageMap).length
    );

    for (const tarballPath of Object.values({
      ...uiManifest.packages,
      ...adaptersManifest.packages,
    })) {
      expect(fs.existsSync(tarballPath)).toBe(true);
    }

    const doctorAfterLocal = await runJsonCommand<DoctorCommandResult>(appRoot, [
      'doctor',
      '--project',
      appRoot,
      '--json',
    ]);

    expect(doctorAfterLocal.ok).toBe(true);
    expect(doctorAfterLocal.issues).toEqual([]);

    const useRemoteResult = await runJsonCommand<UseRemoteCommandResult>(appRoot, [
      'use',
      'remote',
      '--project',
      appRoot,
      '--json',
    ]);

    expect(useRemoteResult.ok).toBe(true);
    expect(useRemoteResult.removedPaths.length).toBeGreaterThan(0);

    const devNpmOutput = await runCommand('pnpm', ['dev:npm'], appRoot);
    expect(devNpmOutput.stdout).toContain('Using published packages for');

    const devUiOutput = await runCommand('pnpm', ['dev:uikit:local'], appRoot);
    expect(devUiOutput.stdout).toContain('Using local packages for');
    expect(devUiOutput.stdout).toContain(
      `ui: ${Object.keys(STANDARD_FAMILIES.ui.packageMap).length} tarballs`
    );

    const devAdaptersOutput = await runCommand('pnpm', ['dev:adapters:local'], appRoot);
    expect(devAdaptersOutput.stdout).toContain('Using local packages for');
    expect(devAdaptersOutput.stdout).toContain(
      `adapters: ${Object.keys(STANDARD_FAMILIES.adapters.packageMap).length} tarballs`
    );

    const devLocalOutput = await runCommand('pnpm', ['dev:local'], appRoot);
    expect(devLocalOutput.stdout).toContain('Using local packages for');
    expect(devLocalOutput.stdout).toContain(
      `ui: ${Object.keys(STANDARD_FAMILIES.ui.packageMap).length} tarballs`
    );
    expect(devLocalOutput.stdout).toContain(
      `adapters: ${Object.keys(STANDARD_FAMILIES.adapters.packageMap).length} tarballs`
    );

    const finalDevNpmOutput = await runCommand('pnpm', ['dev:npm'], appRoot);
    expect(finalDevNpmOutput.stdout).toContain('Using published packages for');

    const finalStatus = await runJsonCommand<StatusCommandResult>(appRoot, [
      'status',
      '--project',
      appRoot,
      '--json',
    ]);

    expect(finalStatus.families).toEqual([
      expect.objectContaining({
        key: 'ui',
        manifestExists: false,
        tarballCount: 0,
      }),
      expect.objectContaining({
        key: 'adapters',
        manifestExists: false,
        tarballCount: 0,
      }),
    ]);
  });
});
