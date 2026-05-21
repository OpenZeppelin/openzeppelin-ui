import fs from 'node:fs';
import path from 'node:path';

import type { PackageFamilyMap, TailwindProjectContext, TailwindSourcePlan } from './types';

const UI_TAILWIND_PACKAGES = new Set([
  '@openzeppelin/ui-components',
  '@openzeppelin/ui-react',
  '@openzeppelin/ui-renderer',
  '@openzeppelin/ui-styles',
  '@openzeppelin/ui-utils',
]);

const ADAPTER_TAILWIND_PACKAGE_PATTERN = /^@openzeppelin\/adapter-/;
const CUSTOM_TAILWIND_PACKAGE_PATTERN = /^@openzeppelin\/ui-builder-adapter-/;

function toPosixPath(inputPath: string): string {
  return inputPath.split(path.sep).join('/');
}

function createRelativePath(fromPath: string, toPath: string): string {
  const relativePath = toPosixPath(path.relative(fromPath, toPath));
  if (relativePath === '') {
    return './';
  }

  if (relativePath.startsWith('.')) {
    return relativePath;
  }

  return `./${relativePath}`;
}

function isTailwindDependency(packageName: string): boolean {
  return (
    UI_TAILWIND_PACKAGES.has(packageName) ||
    ADAPTER_TAILWIND_PACKAGE_PATTERN.test(packageName) ||
    CUSTOM_TAILWIND_PACKAGE_PATTERN.test(packageName)
  );
}

function isAdapterPackage(packageName: string): boolean {
  return (
    ADAPTER_TAILWIND_PACKAGE_PATTERN.test(packageName) ||
    CUSTOM_TAILWIND_PACKAGE_PATTERN.test(packageName)
  );
}

function getTargetPackages(dependencies: string[], families: PackageFamilyMap): string[] {
  const knownFamilyPackages = new Set(
    Object.values(families)
      .flatMap((family) => Object.keys(family.packageMap))
      .filter(isTailwindDependency)
  );

  const targetPackages = dependencies.filter(
    (packageName) => knownFamilyPackages.has(packageName) || isTailwindDependency(packageName)
  );

  return [...new Set(targetPackages)].sort();
}

function resolveWorkspaceSources(context: TailwindProjectContext, cssDirectory: string): string[] {
  const workspaceSources = new Set<string>();

  for (const packageName of context.dependencies) {
    const workspacePackageRoot = context.workspacePackages[packageName];
    if (!workspacePackageRoot || workspacePackageRoot === context.appRoot) {
      continue;
    }

    const packageSourceRoot = path.join(workspacePackageRoot, 'src');
    const sourcePath = createRelativePath(
      cssDirectory,
      fs.existsSync(packageSourceRoot) ? packageSourceRoot : workspacePackageRoot
    );
    workspaceSources.add(sourcePath);
  }

  return [...workspaceSources].sort();
}

function getNodeModulesDirectories(context: TailwindProjectContext): string[] {
  const nodeModulesDirectories = new Set<string>([path.join(context.appRoot, 'node_modules')]);
  if (context.projectRoot !== context.appRoot) {
    nodeModulesDirectories.add(path.join(context.projectRoot, 'node_modules'));
  }

  return [...nodeModulesDirectories];
}

function resolvePackageSources(
  context: TailwindProjectContext,
  cssDirectory: string,
  families: PackageFamilyMap
): string[] {
  const packageSources = new Set<string>();

  for (const packageName of getTargetPackages(context.dependencies, families)) {
    for (const nodeModulesDirectory of getNodeModulesDirectories(context)) {
      packageSources.add(
        createRelativePath(cssDirectory, path.join(nodeModulesDirectory, packageName))
      );

      if (isAdapterPackage(packageName)) {
        packageSources.add(
          createRelativePath(cssDirectory, path.join(nodeModulesDirectory, packageName, 'src'))
        );
      }
    }
  }

  return [...packageSources].sort();
}

/**
 * Builds the normalized Tailwind scan plan for a consumer app.
 * Accepts a family map so both oz-ui-dev and oz-ui can provide their own package definitions.
 */
export function buildTailwindSourcePlan(
  context: TailwindProjectContext,
  families: PackageFamilyMap
): TailwindSourcePlan {
  const cssDirectory = path.dirname(context.generatedCssPath);
  const packages = getTargetPackages(context.dependencies, families);
  const appSources = ['./', '../'];
  const workspaceSources = resolveWorkspaceSources(context, cssDirectory);
  const packageSources = resolvePackageSources(context, cssDirectory, families);
  const imports = [
    "@import 'tailwindcss' source(none);",
    "@import '@openzeppelin/ui-styles/global.css';",
  ];
  const sources = [...appSources, ...workspaceSources, ...packageSources];

  return {
    packages,
    appSources,
    workspaceSources,
    packageSources,
    imports,
    sources,
  };
}
