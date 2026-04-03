import { doctorTailwindProject, type TailwindDoctorResult } from '@openzeppelin/ui-tailwind-utils';

import { CLI_BRANDING, CLI_FAMILIES } from '../branding';
import { loadCatalog, loadSourceLibraries } from '../catalog';
import { detectFramework, type Framework } from '../utils/framework';
import { analyzeComponents, type ComponentMatch } from './component-matcher';
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

export function analyzeProject(projectRoot: string, scope?: string): AnalysisReport {
  const framework = detectFramework(projectRoot);
  const catalog = loadCatalog();
  const sourceLibraries = loadSourceLibraries();
  const files = scanProjectFiles(projectRoot, scope);
  const components = analyzeComponents(files, catalog, sourceLibraries);
  const patterns = scanPatterns(files);
  const tailwind = doctorTailwindProject(projectRoot, CLI_FAMILIES, CLI_BRANDING);

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
