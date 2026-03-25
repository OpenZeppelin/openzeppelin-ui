import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CLI_PACKAGE_NAME = '@openzeppelin/ui-dev-cli';

interface PackageJsonShape {
  name?: unknown;
  version?: unknown;
}

function resolvePackageJsonPath(): string {
  let currentDirectory = path.dirname(fileURLToPath(import.meta.url));

  while (true) {
    const packageJsonPath = path.join(currentDirectory, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const rawPackageJson = fs.readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(rawPackageJson) as PackageJsonShape;
      if (packageJson.name === CLI_PACKAGE_NAME) {
        return packageJsonPath;
      }
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      throw new Error(`Could not locate ${CLI_PACKAGE_NAME} package.json from ${import.meta.url}.`);
    }

    currentDirectory = parentDirectory;
  }
}

/**
 * Reads the installed CLI package version from the package manifest.
 */
export function getCliPackageVersion(): string {
  const packageJsonPath = resolvePackageJsonPath();
  const rawPackageJson = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(rawPackageJson) as PackageJsonShape;

  if (typeof packageJson.version !== 'string' || packageJson.version.length === 0) {
    throw new Error(`Missing version in ${packageJsonPath}.`);
  }

  return packageJson.version;
}

/**
 * Returns the npm package specifier that consumers should execute.
 */
export function getPublishedCliSpecifier(): string {
  return `${CLI_PACKAGE_NAME}@${getCliPackageVersion()}`;
}

/**
 * Returns the semver range consumers should record in devDependencies.
 */
export function getCliDependencyRange(): string {
  return `^${getCliPackageVersion()}`;
}
