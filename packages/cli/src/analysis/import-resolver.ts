import fs from 'node:fs';
import path from 'node:path';

import type { ScannedFile } from './scanner';

export interface WorkspacePackageInfo {
  name: string;
  rootDir: string;
  isDesignSystem: boolean;
}

function normalizeToForwardSlash(p: string): string {
  return p.replace(/\\/g, '/');
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
]);

function findPackageJsonFiles(dir: string, maxDepth: number): string[] {
  const results: string[] = [];

  function walk(current: string, depth: number) {
    if (depth > maxDepth) return;

    const pkgPath = path.join(current, 'package.json');
    try {
      if (fs.existsSync(pkgPath)) results.push(pkgPath);
    } catch {
      /* permission errors */
    }

    try {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        if (!entry.isDirectory() || IGNORED_DIRS.has(entry.name)) continue;
        walk(path.join(current, entry.name), depth + 1);
      }
    } catch {
      /* permission errors */
    }
  }

  walk(dir, 0);
  return results;
}

/**
 * Discovers workspace sub-packages by scanning for package.json files under
 * the project root (skipping the root package itself). Each package is flagged
 * as a design system if any of its scanned source files import from a known
 * UI library pattern (e.g. `@radix-ui/react-`).
 */
export function discoverWorkspacePackages(
  projectRoot: string,
  files: ScannedFile[],
  knownLibraryPatterns: string[]
): WorkspacePackageInfo[] {
  const packages: WorkspacePackageInfo[] = [];
  const packageJsonPaths = findPackageJsonFiles(projectRoot, 4);

  for (const pkgJsonPath of packageJsonPaths) {
    try {
      const content = fs.readFileSync(pkgJsonPath, 'utf8');
      const pkg = JSON.parse(content) as { name?: string };
      if (!pkg.name) continue;

      const rootDir = normalizeToForwardSlash(
        path.relative(projectRoot, path.dirname(pkgJsonPath))
      );

      if (rootDir === '' || rootDir === '.') continue;

      const packageFiles = files.filter((f) =>
        normalizeToForwardSlash(f.relativePath).startsWith(rootDir + '/')
      );

      const isDesignSystem = packageFiles.some((f) =>
        knownLibraryPatterns.some((pattern) => f.content.includes(pattern))
      );

      packages.push({ name: pkg.name, rootDir, isDesignSystem });
    } catch {
      continue;
    }
  }

  return packages;
}

/**
 *
 */
export function findWorkspacePackageForImport(
  source: string,
  packages: WorkspacePackageInfo[]
): WorkspacePackageInfo | null {
  return packages.find((pkg) => pkg.name === source) ?? null;
}

/**
 *
 */
export function isFileInDesignSystemPackage(
  file: ScannedFile,
  packages: WorkspacePackageInfo[]
): boolean {
  const norm = normalizeToForwardSlash(file.relativePath);
  return packages.some((pkg) => pkg.isDesignSystem && norm.startsWith(pkg.rootDir + '/'));
}

/**
 * Checks whether a source file imports from any known design system indicator.
 * Indicators include external library patterns (e.g. `@radix-ui/react-`) and
 * names of workspace packages already flagged as design systems.
 */
export function moduleImportsDesignSystem(
  file: ScannedFile,
  designSystemIndicators: string[]
): boolean {
  return designSystemIndicators.some((indicator) => file.content.includes(indicator));
}

const MODULE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

/**
 * Resolves a local import (relative or alias) to a scanned file.
 * Tries exact match, then extension fallbacks, then index files.
 */
export function resolveLocalImportToFile(
  importerRelativePath: string,
  source: string,
  files: ScannedFile[]
): ScannedFile | null {
  const resolved = resolveModulePath(importerRelativePath, source);
  if (!resolved) return null;
  return findFileByLogicalPath(files, resolved);
}

function resolveModulePath(importerPath: string, source: string): string | null {
  const norm = normalizeToForwardSlash(importerPath);

  if (source.startsWith('./') || source.startsWith('../')) {
    const dir = path.posix.dirname(norm);
    return path.posix.normalize(`${dir}/${source}`);
  }

  if (source.startsWith('@/') || source.startsWith('~/')) {
    const tail = source.slice(2);
    const srcRoot = findSrcRoot(norm);
    if (!srcRoot) return null;
    return `${srcRoot}/${tail}`;
  }

  return null;
}

function findSrcRoot(filePath: string): string | null {
  if (filePath.startsWith('src/')) return 'src';
  const idx = filePath.lastIndexOf('/src/');
  if (idx < 0) return null;
  return filePath.slice(0, idx + '/src'.length);
}

function findFileByLogicalPath(files: ScannedFile[], logicalPath: string): ScannedFile | null {
  const norm = normalizeToForwardSlash(logicalPath);

  const exact = files.find((f) => normalizeToForwardSlash(f.relativePath) === norm);
  if (exact) return exact;

  for (const ext of MODULE_EXTENSIONS) {
    const withExt = `${norm}${ext}`;
    const found = files.find((f) => normalizeToForwardSlash(f.relativePath) === withExt);
    if (found) return found;
  }

  for (const ext of MODULE_EXTENSIONS) {
    const indexPath = `${norm}/index${ext}`;
    const found = files.find((f) => normalizeToForwardSlash(f.relativePath) === indexPath);
    if (found) return found;
  }

  return null;
}

/** Collects all unique import pattern strings from loaded source libraries. */
export function collectKnownLibraryPatterns(
  sourceLibraries: Record<string, { importPatterns: string[] }>
): string[] {
  const patterns: string[] = [];
  for (const library of Object.values(sourceLibraries)) {
    patterns.push(...library.importPatterns);
  }
  return [...new Set(patterns)];
}

/**
 * Builds a comprehensive set of design-system indicators for
 * module-wraps-design-system checks. Includes external library patterns
 * and workspace design system package names. No hardcoded package names —
 * OZ packages are covered by their source library import patterns.
 */
export function buildDesignSystemIndicators(
  knownLibraryPatterns: string[],
  workspacePackages: WorkspacePackageInfo[]
): string[] {
  const indicators = new Set<string>(knownLibraryPatterns);
  for (const pkg of workspacePackages) {
    if (pkg.isDesignSystem) indicators.add(pkg.name);
  }
  return [...indicators];
}
