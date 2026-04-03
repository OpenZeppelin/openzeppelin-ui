import fs from 'node:fs';
import path from 'node:path';

export type Framework = 'vite' | 'next' | 'cra' | 'unknown';

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

function readPackageJson(projectRoot: string): PackageJsonLike | null {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJsonLike;
  } catch {
    return null;
  }
}

function hasDependency(pkg: PackageJsonLike, name: string): boolean {
  return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
}

export function detectFramework(projectRoot: string): Framework {
  const pkg = readPackageJson(projectRoot);
  if (!pkg) return 'unknown';

  if (
    fs.existsSync(path.join(projectRoot, 'vite.config.ts')) ||
    fs.existsSync(path.join(projectRoot, 'vite.config.js')) ||
    fs.existsSync(path.join(projectRoot, 'vite.config.mts')) ||
    hasDependency(pkg, 'vite')
  ) {
    return 'vite';
  }

  if (
    fs.existsSync(path.join(projectRoot, 'next.config.js')) ||
    fs.existsSync(path.join(projectRoot, 'next.config.mjs')) ||
    fs.existsSync(path.join(projectRoot, 'next.config.ts')) ||
    hasDependency(pkg, 'next')
  ) {
    return 'next';
  }

  if (hasDependency(pkg, 'react-scripts')) {
    return 'cra';
  }

  return 'unknown';
}

export type PackageManager = 'pnpm' | 'npm' | 'yarn';

export function detectPackageManager(projectRoot: string): PackageManager {
  if (
    fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml')) ||
    fs.existsSync(path.join(projectRoot, 'pnpm-workspace.yaml'))
  ) {
    return 'pnpm';
  }

  if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
    return 'yarn';
  }

  return 'npm';
}

export function buildInstallCommand(packageManager: PackageManager, packages: string[]): string {
  const pkgList = packages.join(' ');
  switch (packageManager) {
    case 'pnpm':
      return `pnpm add ${pkgList}`;
    case 'yarn':
      return `yarn add ${pkgList}`;
    case 'npm':
      return `npm install ${pkgList}`;
  }
}
