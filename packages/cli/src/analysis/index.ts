import fs from 'node:fs';
import path from 'node:path';

import { doctorTailwindProject, type TailwindDoctorResult } from '@openzeppelin/ui-tailwind-utils';

import { CLI_BRANDING, CLI_FAMILIES } from '../branding';
import { loadCatalog, loadHtmlElementMappings, loadSourceLibraries } from '../catalog';
import { detectFramework, type Framework } from '../utils/framework';
import { analyzeComponents, analyzeHtmlElements, type ComponentMatch } from './component-matcher';
import {
  buildDesignSystemIndicators,
  collectKnownLibraryPatterns,
  discoverWorkspacePackages,
} from './import-resolver';
import { scanPatterns, type PatternMatch } from './pattern-scanner';
import { scanProjectFiles } from './scanner';

export interface ComponentPropDelta {
  compatibleProps: string[];
  missingProps: string[];
  customProps: string[];
  summary: string;
}

export interface MappableComponentCandidate extends ComponentMatch {
  confidenceLevel: ComponentMatch['confidence'];
  propDelta: ComponentPropDelta;
}

export interface UnmappableComponentCandidate extends ComponentMatch {
  reason: string;
}

export interface ProjectAnalysisSummary {
  root: string;
  framework: Framework;
  scope: string | null;
  router: string | null;
  stateManagement: string | null;
  stylingSystem: 'tailwind' | 'css' | 'unknown';
  existingOzPackages: string[];
  designSystemIndicators: string[];
  workspacePackages: string[];
}

export interface WalletAnalysisSummary {
  currentSetup: string | null;
  targetSetup: string;
  affectedFiles: string[];
  patterns: PatternMatch[];
  recommendedProfile: 'viewer' | 'transactor' | 'operator';
}

export interface StorageAnalysisSummary {
  currentPatterns: PatternMatch[];
  affectedFiles: string[];
  localStorageKeys: string[];
  rawIndexedDbDatabases: string[];
  migratableEntities: string[];
}

export interface AdapterAnalysisSummary {
  currentSetup: string | null;
  affectedFiles: string[];
  capabilityTargets: string[];
  patterns: PatternMatch[];
}

export interface TailwindAnalysisSummary {
  currentSetup: 'tailwind-v4' | 'tailwind-present' | 'missing';
  missingOzSources: string[];
  tokenConflicts: string[];
  doctor: TailwindDoctorResult;
}

export interface AnalysisReport {
  version: '1.0.0';
  project: string;
  framework: Framework;
  timestamp: string;
  summary: {
    totalFiles: number;
    componentMatches: number;
    mappableComponents: number;
    walletPatterns: number;
    storagePatterns: number;
    existingOzPackages: number;
    estimatedEffort: 'low' | 'medium' | 'high';
  };
  components: ComponentMatch[];
  patterns: PatternMatch[];
  tailwind: TailwindDoctorResult;
  sourceLibrary: string | null;
  projectInfo: ProjectAnalysisSummary;
  componentsByMigration: {
    mappable: MappableComponentCandidate[];
    unmappable: UnmappableComponentCandidate[];
  };
  wallet: WalletAnalysisSummary;
  storage: StorageAnalysisSummary;
  adapters: AdapterAnalysisSummary;
  tailwindAnalysis: TailwindAnalysisSummary;
}

function estimateEffort(
  components: ComponentMatch[],
  patterns: PatternMatch[]
): AnalysisReport['summary']['estimatedEffort'] {
  const highEffortComponents = components.filter((c) => c.effort === 'high').length;
  const walletPatterns = patterns.filter((p) => p.category === 'wallet').length;
  const storagePatterns = patterns.filter((p) => p.category === 'storage').length;

  if (highEffortComponents > 5 || walletPatterns > 2 || storagePatterns > 2) return 'high';
  if (highEffortComponents > 0 || walletPatterns > 0 || storagePatterns > 0) return 'medium';
  return 'low';
}

function readPackageJson(projectRoot: string): Record<string, unknown> | null {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function collectDependencyNames(pkg: Record<string, unknown> | null): string[] {
  if (!pkg) return [];
  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
  return [...new Set([...Object.keys(deps), ...Object.keys(devDeps)])].sort((a, b) =>
    a.localeCompare(b)
  );
}

function detectRouter(dependencies: string[]): string | null {
  if (dependencies.includes('react-router-dom')) return 'react-router-dom';
  if (dependencies.includes('next')) return 'next/router';
  if (dependencies.includes('@tanstack/react-router')) return '@tanstack/react-router';
  if (dependencies.includes('wouter')) return 'wouter';
  return null;
}

function detectStateManagement(dependencies: string[]): string | null {
  if (dependencies.includes('@reduxjs/toolkit')) return 'redux-toolkit';
  if (dependencies.includes('redux')) return 'redux';
  if (dependencies.includes('zustand')) return 'zustand';
  if (dependencies.includes('jotai')) return 'jotai';
  if (dependencies.includes('mobx')) return 'mobx';
  return null;
}

function detectStylingSystem(
  projectRoot: string,
  dependencies: string[]
): ProjectAnalysisSummary['stylingSystem'] {
  if (
    dependencies.includes('tailwindcss') ||
    fs.existsSync(path.join(projectRoot, 'tailwind.config.ts')) ||
    fs.existsSync(path.join(projectRoot, 'tailwind.config.js')) ||
    fs.existsSync(path.join(projectRoot, 'tailwind.config.mjs')) ||
    fs.existsSync(path.join(projectRoot, 'tailwind.config.cjs'))
  ) {
    return 'tailwind';
  }
  if (fs.existsSync(path.join(projectRoot, 'src', 'index.css'))) return 'css';
  return 'unknown';
}

function summarizeExistingOzPackages(patterns: PatternMatch[]): string[] {
  return patterns
    .filter((pattern) => pattern.category === 'oz-existing')
    .flatMap((pattern) => pattern.evidences.map((evidence) => evidence.matchedValue))
    .filter((pkg, index, all) => pkg.startsWith('@openzeppelin/') && all.indexOf(pkg) === index)
    .sort((a, b) => a.localeCompare(b));
}

function summarizeWalletSetup(walletPatterns: PatternMatch[]): string | null {
  if (walletPatterns.length === 0) return null;
  return walletPatterns
    .map((pattern) => pattern.canonicalPattern || pattern.pattern)
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort((a, b) => a.localeCompare(b))
    .join('+');
}

function recommendedProfileFromPatterns(
  walletPatterns: PatternMatch[]
): WalletAnalysisSummary['recommendedProfile'] {
  if (walletPatterns.length === 0) return 'viewer';
  const names = walletPatterns.map((pattern) => pattern.canonicalPattern || pattern.pattern);
  if (names.includes('ethers') || names.includes('viem')) return 'operator';
  return 'transactor';
}

function collectAffectedFiles(patterns: PatternMatch[]): string[] {
  return patterns
    .flatMap((pattern) => pattern.files)
    .filter((file, index, all) => all.indexOf(file) === index)
    .sort((a, b) => a.localeCompare(b));
}

function createPropDelta(component: ComponentMatch): ComponentPropDelta {
  if (component.ozTarget && component.effort === 'low') {
    return {
      compatibleProps: [],
      missingProps: [],
      customProps: [],
      summary: 'Near 1:1 mapping based on the source-library catalog.',
    };
  }

  if (component.ozTarget) {
    return {
      compatibleProps: [],
      missingProps: [],
      customProps: [],
      summary: component.notes || 'Mapped component likely needs manual prop review.',
    };
  }

  return {
    compatibleProps: [],
    missingProps: [],
    customProps: [],
    summary: 'No deterministic OZ prop mapping is available yet.',
  };
}

function createProjectInfo(
  projectRoot: string,
  scope: string | undefined,
  framework: Framework,
  patterns: PatternMatch[],
  designSystemIndicators: string[],
  workspacePackages: { name: string }[]
): ProjectAnalysisSummary {
  const pkg = readPackageJson(projectRoot);
  const dependencies = collectDependencyNames(pkg);

  return {
    root: projectRoot,
    framework,
    scope: scope ?? null,
    router: detectRouter(dependencies),
    stateManagement: detectStateManagement(dependencies),
    stylingSystem: detectStylingSystem(projectRoot, dependencies),
    existingOzPackages: summarizeExistingOzPackages(patterns),
    designSystemIndicators,
    workspacePackages: workspacePackages
      .map((pkgInfo) => pkgInfo.name)
      .sort((a, b) => a.localeCompare(b)),
  };
}

function createWalletSummary(patterns: PatternMatch[]): WalletAnalysisSummary {
  const walletPatterns = patterns.filter((pattern) => pattern.category === 'wallet');
  return {
    currentSetup: summarizeWalletSetup(walletPatterns),
    targetSetup: 'RuntimeProvider + WalletStateProvider + EcosystemRuntime capabilities',
    affectedFiles: collectAffectedFiles(walletPatterns),
    patterns: walletPatterns,
    recommendedProfile: recommendedProfileFromPatterns(walletPatterns),
  };
}

function createStorageSummary(patterns: PatternMatch[]): StorageAnalysisSummary {
  const storagePatterns = patterns.filter((pattern) => pattern.category === 'storage');
  const localStorageKeys = storagePatterns
    .filter((pattern) => pattern.canonicalPattern === 'localStorage')
    .flatMap((pattern) => pattern.evidences.map((evidence) => evidence.matchedValue))
    .filter((value, index, all) => all.indexOf(value) === index);
  const indexedDbDatabases = storagePatterns
    .filter((pattern) => pattern.canonicalPattern === 'indexedDB')
    .flatMap((pattern) => pattern.evidences.map((evidence) => evidence.matchedValue))
    .filter((value, index, all) => all.indexOf(value) === index);

  return {
    currentPatterns: storagePatterns,
    affectedFiles: collectAffectedFiles(storagePatterns),
    localStorageKeys,
    rawIndexedDbDatabases: indexedDbDatabases,
    migratableEntities: [],
  };
}

function createAdapterSummary(patterns: PatternMatch[]): AdapterAnalysisSummary {
  const adapterPatterns = patterns.filter((pattern) =>
    ['viem', 'ethers'].includes(pattern.canonicalPattern)
  );

  return {
    currentSetup: summarizeWalletSetup(adapterPatterns),
    affectedFiles: collectAffectedFiles(adapterPatterns),
    capabilityTargets: ['QueryCapability', 'ExecutionCapability', 'WalletCapability'],
    patterns: adapterPatterns,
  };
}

function createTailwindSummary(
  projectRoot: string,
  dependencies: string[],
  tailwind: TailwindDoctorResult
): TailwindAnalysisSummary {
  const currentSetup: TailwindAnalysisSummary['currentSetup'] = dependencies.includes('tailwindcss')
    ? dependencies.includes('@tailwindcss/vite')
      ? 'tailwind-v4'
      : 'tailwind-present'
    : fs.existsSync(path.join(projectRoot, 'tailwind.config.ts')) ||
        fs.existsSync(path.join(projectRoot, 'tailwind.config.js'))
      ? 'tailwind-present'
      : 'missing';

  const missingOzSources = tailwind.issues
    .filter((issue) => issue.code.includes('source') || issue.code.includes('stylesheet'))
    .map((issue) => issue.message);
  const tokenConflicts = tailwind.issues
    .filter((issue) => issue.code.includes('token') || issue.code.includes('theme'))
    .map((issue) => issue.message);

  return {
    currentSetup,
    missingOzSources,
    tokenConflicts,
    doctor: tailwind,
  };
}

/**
 * @param tailwindCssPath - Optional path to the Tailwind entry stylesheet, relative to `projectRoot`.
 *   Use when multiple workspace packages expose Tailwind (monorepos); forwarded to `doctorTailwindProject`.
 */
export function analyzeProject(
  projectRoot: string,
  scope?: string,
  tailwindCssPath?: string
): AnalysisReport {
  const framework = detectFramework(projectRoot);
  const catalog = loadCatalog();
  const sourceLibraries = loadSourceLibraries();
  const htmlLib = loadHtmlElementMappings();
  const files = scanProjectFiles(projectRoot, scope);

  const knownLibraryPatterns = collectKnownLibraryPatterns(sourceLibraries);
  const workspacePackages = discoverWorkspacePackages(projectRoot, files, knownLibraryPatterns);
  const designSystemIndicators = buildDesignSystemIndicators(
    knownLibraryPatterns,
    workspacePackages
  );
  const ctx = {
    designSystemIndicators,
    workspacePackages,
    externalLibraryPatterns: knownLibraryPatterns,
  };

  const importComponents = analyzeComponents(files, catalog, sourceLibraries, ctx);
  const htmlComponents = htmlLib ? analyzeHtmlElements(files, htmlLib, ctx) : [];

  const mergedMap = new Map<string, ComponentMatch>();
  for (const c of importComponents) mergedMap.set(c.name, c);
  for (const c of htmlComponents) {
    if (!mergedMap.has(c.name)) mergedMap.set(c.name, c);
  }
  const components = [...mergedMap.values()].sort((a, b) => b.usageCount - a.usageCount);

  const patterns = scanPatterns(files);
  const tailwind = doctorTailwindProject(projectRoot, CLI_FAMILIES, CLI_BRANDING, tailwindCssPath);

  const detectedLibrary = components.find((c) => c.sourceLibrary)?.sourceLibrary ?? null;
  const mappableComponents = components.filter((c) => c.ozTarget !== null).length;
  const walletPatterns = patterns.filter((p) => p.category === 'wallet').length;
  const storagePatterns = patterns.filter((p) => p.category === 'storage').length;
  const existingOzPackages = patterns.filter((p) => p.category === 'oz-existing').length;
  const pkg = readPackageJson(projectRoot);
  const dependencies = collectDependencyNames(pkg);
  const projectInfo = createProjectInfo(
    projectRoot,
    scope,
    framework,
    patterns,
    designSystemIndicators,
    workspacePackages
  );
  const componentsByMigration = {
    mappable: components
      .filter((component) => component.ozTarget !== null)
      .map((component) => ({
        ...component,
        confidenceLevel: component.confidence,
        propDelta: createPropDelta(component),
      })),
    unmappable: components
      .filter((component) => component.ozTarget === null)
      .map((component) => ({
        ...component,
        reason: component.notes || 'No built-in OZ equivalent was detected for this component.',
      })),
  };
  const wallet = createWalletSummary(patterns);
  const storage = createStorageSummary(patterns);
  const adapters = createAdapterSummary(patterns);
  const tailwindAnalysis = createTailwindSummary(projectRoot, dependencies, tailwind);

  return {
    version: '1.0.0',
    project: projectRoot,
    framework,
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: files.length,
      componentMatches: components.length,
      mappableComponents,
      walletPatterns,
      storagePatterns,
      existingOzPackages,
      estimatedEffort: estimateEffort(components, patterns),
    },
    components,
    patterns,
    tailwind,
    sourceLibrary: detectedLibrary,
    projectInfo,
    componentsByMigration,
    wallet,
    storage,
    adapters,
    tailwindAnalysis,
  };
}
