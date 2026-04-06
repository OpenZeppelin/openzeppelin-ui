/**
 * Pure plan-generation logic, extracted for reuse by the autoresearch evaluator
 * and the CLI command.
 */

import type { AnalysisReport } from '../analysis';
import { loadSourceLibraries } from '../catalog';
import { loadExclusions } from '../catalog/exclusions';
import type { MigrationPhase, MigrationTask, TaskType } from '../manifest';

/** @description True when analysis tagged the component as sourced from an OZ catalog package (already migrated). */
function sourceLibraryIsOzCatalogFallback(sourceLibrary: string | null): boolean {
  if (!sourceLibrary) return false;
  const libs = loadSourceLibraries();
  return Boolean(libs[sourceLibrary]?.catalogFallback);
}

/**
 * @description Skip migration tasks for relative imports that are catalog-direct false positives (e.g. ./Sidebar).
 * Shadcn uses ./ui/...; workspace design-system files use library-mapping and stay in scope.
 */
function isAppLocalRelativeImport(comp: ReportComponent): boolean {
  const sourceImport = comp.sourceImport;
  const rel = sourceImport.startsWith('./') || sourceImport.startsWith('../');
  if (!rel) return false;
  if (sourceImport.includes('/ui/')) return false;
  if (/^\.\/ui\//.test(sourceImport) || /^\.\.\/ui\//.test(sourceImport)) return false;
  if (comp.detectorKinds?.includes('library-mapping')) return false;
  return comp.detectorKinds?.includes('catalog-direct') ?? false;
}

/**
 * @description Distinct imported primitive names to plan for (compound families share one catalog row).
 * Uses structural evidence from the report, not hardcoded component lists.
 */
type ReportComponent = AnalysisReport['components'][number];

/** @description Inherit OZ target from another row sharing the same design-system module (analysis may leave compound primitives unmapped). */
function resolveOzTargetForComponent(comp: ReportComponent, all: ReportComponent[]): string | null {
  if (comp.ozTarget) return comp.ozTarget;
  for (const s of all) {
    if (s.sourceImport === comp.sourceImport && s.ozTarget) {
      return s.ozTarget;
    }
  }
  return null;
}

function componentSourceNamesForPlan(comp: ReportComponent, scopedFiles: string[]): string[] {
  const rawNames = comp.rawNames ?? [];
  const raw = rawNames.length > 0 ? rawNames : [comp.name];
  const rawSet = new Set(raw);
  const fromEvidence = new Set<string>();
  for (const ev of comp.evidences ?? []) {
    if (!scopedFiles.includes(ev.file)) continue;
    if (ev.importedName && rawSet.has(ev.importedName)) {
      fromEvidence.add(ev.importedName);
    }
  }
  if (fromEvidence.size === 0) return raw;
  const planned = raw.filter((n) => fromEvidence.has(n));
  return planned.length > 0 ? planned : raw;
}

/** @description Returns the default setup-phase migration tasks. */
export function generateSetupTasks(): MigrationTask[] {
  return [
    {
      id: 'setup-install-packages',
      phase: 'setup',
      type: 'install-packages',
      status: 'pending',
      description: 'Install @openzeppelin/* packages',
    },
    {
      id: 'setup-wire-providers',
      phase: 'setup',
      type: 'wire-providers',
      status: 'pending',
      description: 'Wire RuntimeProvider + WalletStateProvider into app entry',
    },
    {
      id: 'setup-tailwind-normalize',
      phase: 'setup',
      type: 'tailwind-normalize',
      status: 'pending',
      description: 'Normalize Tailwind configuration for OZ packages',
    },
    {
      id: 'setup-copy-agents',
      phase: 'setup',
      type: 'copy-agents',
      status: 'pending',
      description: 'Copy migration agent files to project',
    },
    {
      id: 'setup-copy-skill',
      phase: 'setup',
      type: 'copy-skill',
      status: 'pending',
      description: 'Copy migration skill file to project',
    },
  ];
}

/** @description Builds component and form-field replacement tasks from an analysis report. */
export function generateComponentTasks(
  report: AnalysisReport,
  scopeDir?: string,
  componentFilter?: string[]
): MigrationTask[] {
  const tasks: MigrationTask[] = [];

  const allComponents = report.components;

  for (const comp of allComponents) {
    const ozTarget = resolveOzTargetForComponent(comp, allComponents);
    if (!ozTarget) continue;
    if (sourceLibraryIsOzCatalogFallback(comp.sourceLibrary)) continue;
    if (isAppLocalRelativeImport(comp)) continue;
    if (componentFilter && !componentFilter.includes(comp.name)) continue;

    const files = scopeDir ? comp.files.filter((f) => f.startsWith(scopeDir)) : comp.files;
    if (files.length === 0) continue;

    const phase: MigrationPhase = comp.category === 'field' ? 'form-fields' : 'ui-components';
    const type: TaskType =
      comp.category === 'field' ? 'form-field-replacement' : 'component-replacement';

    const sourceNames = componentSourceNamesForPlan(comp, files);

    for (const sourceName of sourceNames) {
      for (const file of files) {
        tasks.push({
          id: `${type}-${sourceName}-${file.replace(/[/\\]/g, '-')}`,
          phase,
          type,
          status: 'pending',
          description: `Replace ${sourceName} with OZ ${ozTarget} in ${file}`,
          file,
          sourceComponent: sourceName,
          targetComponent: ozTarget,
          capability: comp.capabilities[0],
        });
      }
    }
  }

  return tasks;
}

type ExclusionsWithWalletPaths = {
  walletPatternPathExclusions?: Record<string, string[]>;
};

/** @description Catalog rules: some wallet stacks appear in UI files only for types/helpers, not adapter migration. */
function isWalletTaskExcludedForPath(patternKey: string, file: string): boolean {
  const ex = loadExclusions() as ReturnType<typeof loadExclusions> & ExclusionsWithWalletPaths;
  const subs = ex.walletPatternPathExclusions?.[patternKey];
  if (!subs) return false;
  return subs.some((sub) => file.includes(sub));
}

/** @description Builds wallet-adapter replacement tasks from wallet patterns in the analysis report. */
export function generateWalletTasks(report: AnalysisReport): MigrationTask[] {
  const walletPatterns = report.patterns.filter((p) => p.category === 'wallet');
  if (walletPatterns.length === 0) return [];

  const tasks: MigrationTask[] = [];

  for (const pattern of walletPatterns) {
    for (const file of pattern.files) {
      if (isWalletTaskExcludedForPath(pattern.pattern, file)) continue;
      tasks.push({
        id: `wallet-replacement-${pattern.pattern}-${file.replace(/[/\\]/g, '-')}`,
        phase: 'wallet-adapter',
        type: 'wallet-replacement',
        status: 'pending',
        description: `Replace ${pattern.pattern} usage with OZ adapter in ${file}`,
        file,
      });
    }
  }

  return tasks;
}

/** @description Builds storage migration review tasks from storage patterns in the analysis report. */
export function generateStorageTasks(report: AnalysisReport): MigrationTask[] {
  const storagePatterns = report.patterns.filter((p) => p.category === 'storage');
  if (storagePatterns.length === 0) return [];

  const tasks: MigrationTask[] = [];

  for (const pattern of storagePatterns) {
    for (const file of pattern.files) {
      tasks.push({
        id: `storage-migration-${pattern.pattern}-${file.replace(/[/\\]/g, '-')}`,
        phase: 'storage',
        type: 'storage-migration',
        status: 'pending',
        description: `Flag ${pattern.pattern} usage in ${file} for manual review (data migration out of scope)`,
        file,
      });
    }
  }

  return tasks;
}

export interface GeneratePlanOptions {
  scopeDir?: string;
  componentFilter?: string[];
}

/** @description Combines setup, component, wallet, and storage tasks into a full migration plan. */
export function generatePlanTasks(
  report: AnalysisReport,
  options: GeneratePlanOptions = {}
): MigrationTask[] {
  const setupTasks = generateSetupTasks();
  const componentTasks = generateComponentTasks(report, options.scopeDir, options.componentFilter);
  const walletTasks = generateWalletTasks(report);
  const storageTasks = generateStorageTasks(report);

  return [...setupTasks, ...componentTasks, ...walletTasks, ...storageTasks];
}
