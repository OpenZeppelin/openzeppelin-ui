import fs from 'node:fs';
import path from 'node:path';

import type { TailwindProjectContext } from './types';

const PACKAGE_JSON = 'package.json';
const MAIN_FILE_CANDIDATES = ['src/main.tsx', 'src/main.ts', 'src/main.jsx', 'src/main.js'];
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.idea',
  '.next',
  '.turbo',
  '.yarn',
  'coverage',
  'dist',
  'node_modules',
]);
const STYLESHEET_IMPORT_PATTERN = /import\s+['"](\.\/[^'"]+\.css)['"];?/;

interface PackageJsonLike {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface PackageCandidate {
  packageRoot: string;
  packageJsonPath: string;
  packageJson: PackageJsonLike;
  cssPath: string;
}

type WorkspaceDefinition = string[] | { packages?: string[] };

function readPackageJson(packageJsonPath: string): PackageJsonLike | null {
  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJsonLike;
  } catch {
    return null;
  }
}

function getDependencyEntries(packageJson: PackageJsonLike): Array<[string, string]> {
  const mergedDependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };

  return Object.entries(mergedDependencies);
}

function hasTailwindSignals(packageJson: PackageJsonLike): boolean {
  return getDependencyEntries(packageJson).some(([packageName]) =>
    ['@tailwindcss/vite', 'tailwindcss'].includes(packageName)
  );
}

function resolveMainCssPath(packageRoot: string): string | null {
  for (const mainFileCandidate of MAIN_FILE_CANDIDATES) {
    const mainFilePath = path.join(packageRoot, mainFileCandidate);
    if (!fs.existsSync(mainFilePath)) {
      continue;
    }

    const mainFileContent = fs.readFileSync(mainFilePath, 'utf8');
    const importMatch = mainFileContent.match(STYLESHEET_IMPORT_PATTERN);
    if (!importMatch) {
      continue;
    }

    const cssPath = path.resolve(path.dirname(mainFilePath), importMatch[1]);
    if (fs.existsSync(cssPath)) {
      return cssPath;
    }
  }

  return null;
}

function collectPackageJsonPaths(rootDirectory: string): string[] {
  const discoveredPaths: string[] = [];

  function walk(currentDirectory: string): void {
    for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        walk(path.join(currentDirectory, entry.name));
        continue;
      }

      if (entry.name === PACKAGE_JSON) {
        discoveredPaths.push(path.join(currentDirectory, entry.name));
      }
    }
  }

  walk(rootDirectory);
  return discoveredPaths.sort();
}

function getRootWorkspacePatterns(projectRoot: string): string[] {
  const patterns = new Set<string>();
  const rootPackageJson = readPackageJson(path.join(projectRoot, PACKAGE_JSON)) as
    | (PackageJsonLike & { workspaces?: WorkspaceDefinition })
    | null;
  const workspaceConfig = rootPackageJson?.workspaces;

  if (Array.isArray(workspaceConfig)) {
    for (const entry of workspaceConfig) {
      patterns.add(entry);
    }
  } else if (workspaceConfig?.packages) {
    for (const entry of workspaceConfig.packages) {
      patterns.add(entry);
    }
  }

  const pnpmWorkspacePath = path.join(projectRoot, 'pnpm-workspace.yaml');
  if (fs.existsSync(pnpmWorkspacePath)) {
    const workspaceYaml = fs.readFileSync(pnpmWorkspacePath, 'utf8');
    for (const line of workspaceYaml.split('\n')) {
      const match = line.match(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/);
      if (!match) {
        continue;
      }

      patterns.add(match[1]);
    }
  }

  return [...patterns].filter((pattern) => !pattern.startsWith('!'));
}

function expandWorkspacePattern(projectRoot: string, pattern: string): string[] {
  if (pattern.endsWith('/*')) {
    const baseDirectory = path.join(projectRoot, pattern.slice(0, -2));
    if (!fs.existsSync(baseDirectory)) {
      return [];
    }

    return fs
      .readdirSync(baseDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(baseDirectory, entry.name));
  }

  return [path.join(projectRoot, pattern)];
}

function collectWorkspacePackageRoots(projectRoot: string): string[] {
  const workspaceRoots = new Set<string>();

  for (const pattern of getRootWorkspacePatterns(projectRoot)) {
    for (const packageRoot of expandWorkspacePattern(projectRoot, pattern)) {
      if (fs.existsSync(path.join(packageRoot, PACKAGE_JSON))) {
        workspaceRoots.add(packageRoot);
      }
    }
  }

  if (workspaceRoots.size === 0 && fs.existsSync(path.join(projectRoot, PACKAGE_JSON))) {
    workspaceRoots.add(projectRoot);
  }

  return [...workspaceRoots].sort();
}

function buildWorkspacePackageMap(projectRoot: string): Record<string, string> {
  const workspacePackages: Record<string, string> = {};

  for (const packageJsonPath of collectPackageJsonPaths(projectRoot)) {
    const packageJson = readPackageJson(packageJsonPath);
    const packageName = packageJson?.name;
    if (!packageName) {
      continue;
    }

    workspacePackages[packageName] = path.dirname(packageJsonPath);
  }

  return workspacePackages;
}

function resolveCandidateFromCssPath(
  projectRoot: string,
  cssPathInput: string
): TailwindProjectContext {
  const cssPath = path.resolve(projectRoot, cssPathInput);
  if (!fs.existsSync(cssPath)) {
    throw new Error(`Tailwind stylesheet not found at ${cssPath}.`);
  }

  let currentDirectory = path.dirname(cssPath);
  let packageRoot: string | null = null;
  while (currentDirectory.startsWith(projectRoot)) {
    const packageJsonPath = path.join(currentDirectory, PACKAGE_JSON);
    if (fs.existsSync(packageJsonPath)) {
      packageRoot = currentDirectory;
      break;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      break;
    }
    currentDirectory = parentDirectory;
  }

  if (!packageRoot) {
    throw new Error(`Could not locate a package.json for ${cssPath}.`);
  }

  const packageJsonPath = path.join(packageRoot, PACKAGE_JSON);
  const packageJson = readPackageJson(packageJsonPath);
  if (!packageJson) {
    throw new Error(`Could not read ${packageJsonPath}.`);
  }

  return {
    projectRoot,
    appRoot: packageRoot,
    appPackagePath: packageJsonPath,
    cssPath,
    generatedCssPath: path.join(path.dirname(cssPath), 'oz-tailwind.generated.css'),
    managedImportPath: './oz-tailwind.generated.css',
    dependencies: getDependencyEntries(packageJson).map(([packageName]) => packageName),
    workspacePackages: buildWorkspacePackageMap(projectRoot),
  };
}

function collectPackageCandidates(projectRoot: string): PackageCandidate[] {
  const candidates: PackageCandidate[] = [];

  for (const packageRoot of collectWorkspacePackageRoots(projectRoot)) {
    const packageJsonPath = path.join(packageRoot, PACKAGE_JSON);
    const packageJson = readPackageJson(packageJsonPath);
    if (!packageJson || !hasTailwindSignals(packageJson)) {
      continue;
    }

    const cssPath = resolveMainCssPath(packageRoot);
    if (!cssPath) {
      continue;
    }

    candidates.push({
      packageRoot,
      packageJsonPath,
      packageJson,
      cssPath,
    });
  }

  return candidates.sort((left, right) => left.packageRoot.localeCompare(right.packageRoot));
}

/**
 * Resolves the single Tailwind-enabled app package within a project.
 */
export function resolveTailwindProject(
  projectRootInput: string,
  cssPathInput?: string
): TailwindProjectContext | null {
  const projectRoot = path.resolve(projectRootInput);

  if (cssPathInput) {
    return resolveCandidateFromCssPath(projectRoot, cssPathInput);
  }

  const candidates = collectPackageCandidates(projectRoot);
  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length > 1) {
    const candidatePaths = candidates.map((candidate) =>
      path.relative(projectRoot, candidate.cssPath)
    );
    throw new Error(
      `Multiple Tailwind entry stylesheets were detected (${candidatePaths.join(', ')}). Re-run with --css to choose one.`
    );
  }

  const [candidate] = candidates;
  return {
    projectRoot,
    appRoot: candidate.packageRoot,
    appPackagePath: candidate.packageJsonPath,
    cssPath: candidate.cssPath,
    generatedCssPath: path.join(path.dirname(candidate.cssPath), 'oz-tailwind.generated.css'),
    managedImportPath: './oz-tailwind.generated.css',
    dependencies: getDependencyEntries(candidate.packageJson).map(([packageName]) => packageName),
    workspacePackages: buildWorkspacePackageMap(projectRoot),
  };
}
