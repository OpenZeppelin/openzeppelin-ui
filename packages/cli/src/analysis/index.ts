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
  const ctx = { designSystemIndicators, workspacePackages };

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
  };
}
