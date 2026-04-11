/**
 * Pure plan-generation logic, extracted for reuse by the autoresearch evaluator
 * and the CLI command.
 */

import type { AnalysisReport } from '../analysis';
import { loadSourceLibraries } from '../catalog';
import { loadExclusions } from '../catalog/exclusions';
import type { MigrationPhase, MigrationTask, TaskType } from '../manifest';

const FOUNDATION_DEPENDENCIES = [
  'setup-install-packages',
  'setup-wire-providers',
  'setup-tailwind-normalize',
] as const;

function buildValidation(taskId: string): MigrationTask['validation'] {
  return {
    command: `oz-ui migrate doctor --manifest migration-manifest.json --check ${taskId} --json`,
    doctorCheck: taskId,
  };
}

function isCompositeComponent(sourceName: string, targetComponent: string): boolean {
  if (sourceName !== targetComponent) return true;
  return /(Content|Header|Footer|Title|Description|Trigger|Item|List|Value|Provider)$/u.test(
    sourceName
  );
}

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

/**
 * @description Per-export OZ target: co-exported sub-primitives (CardContent from card.tsx) map to same-named OZ
 * components; rows whose catalog target is the family root but the symbol name is a longer prefix extension
 * (CardContent + Card) map to the concrete symbol; unmappable rows inherit the sibling root as before.
 */
function resolveTargetComponentForSourceName(
  comp: ReportComponent,
  sourceName: string,
  baseOz: string | null
): string | null {
  if (sourceName !== comp.name) {
    return sourceName;
  }
  const explicitOz = comp.ozTarget;
  if (explicitOz && explicitOz !== comp.name && comp.name.startsWith(explicitOz)) {
    return comp.name;
  }
  if (explicitOz) {
    return explicitOz;
  }
  if (baseOz && baseOz !== comp.name) {
    return comp.name;
  }
  return baseOz;
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
      phaseDetail: 'foundation',
      type: 'install-packages',
      status: 'pending',
      description: 'Install @openzeppelin/* packages',
      validation: buildValidation('setup-install-packages'),
    },
    {
      id: 'setup-wire-providers',
      phase: 'setup',
      phaseDetail: 'foundation',
      type: 'wire-providers',
      status: 'pending',
      description: 'Wire RuntimeProvider + WalletStateProvider into app entry',
      dependsOn: ['setup-install-packages'],
      validation: buildValidation('setup-wire-providers'),
    },
    {
      id: 'setup-tailwind-normalize',
      phase: 'setup',
      phaseDetail: 'foundation',
      type: 'tailwind-normalize',
      status: 'pending',
      description: 'Normalize Tailwind configuration for OZ packages',
      dependsOn: ['setup-install-packages'],
      validation: buildValidation('setup-tailwind-normalize'),
    },
    {
      id: 'setup-copy-agents',
      phase: 'setup',
      phaseDetail: 'foundation',
      type: 'copy-agents',
      status: 'pending',
      description: 'Copy migration agent files to project',
      dependsOn: ['setup-install-packages'],
      validation: buildValidation('setup-copy-agents'),
    },
    {
      id: 'setup-copy-skill',
      phase: 'setup',
      phaseDetail: 'foundation',
      type: 'copy-skill',
      status: 'pending',
      description: 'Copy migration skill file to project',
      dependsOn: ['setup-install-packages'],
      validation: buildValidation('setup-copy-skill'),
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
    const baseOz = resolveOzTargetForComponent(comp, allComponents);
    if (!baseOz && !comp.ozTarget) continue;
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
      const targetComponent = resolveTargetComponentForSourceName(comp, sourceName, baseOz);
      if (!targetComponent) continue;
      for (const file of files) {
        tasks.push({
          id: `${type}-${sourceName}-${file.replace(/[/\\]/g, '-')}`,
          phase,
          phaseDetail:
            phase === 'form-fields'
              ? 'form-fields'
              : isCompositeComponent(sourceName, targetComponent)
                ? 'composite-components'
                : 'ui-primitives',
          type,
          status: 'pending',
          description: `Replace ${sourceName} with OZ ${targetComponent} in ${file}`,
          file,
          files: [file],
          sourceComponent: sourceName,
          targetComponent,
          capability: comp.capabilities[0],
          dependsOn: [...FOUNDATION_DEPENDENCIES],
          validation: buildValidation(`${type}-${sourceName}-${file.replace(/[/\\]/g, '-')}`),
          notes: comp.notes ? [comp.notes] : undefined,
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
        phaseDetail: 'wallet-and-adapters',
        type: 'wallet-replacement',
        status: 'pending',
        description: `Replace ${pattern.pattern} usage with OZ adapter in ${file}`,
        file,
        files: [file],
        dependsOn: [...FOUNDATION_DEPENDENCIES],
        validation: buildValidation(
          `wallet-replacement-${pattern.pattern}-${file.replace(/[/\\]/g, '-')}`
        ),
        notes: pattern.migrationRelevance ? [pattern.migrationRelevance] : undefined,
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
        phaseDetail: 'storage',
        type: 'storage-migration',
        status: 'pending',
        description: `Flag ${pattern.pattern} usage in ${file} for manual review (data migration out of scope)`,
        file,
        files: [file],
        dependsOn: [...FOUNDATION_DEPENDENCIES],
        validation: buildValidation(
          `storage-migration-${pattern.pattern}-${file.replace(/[/\\]/g, '-')}`
        ),
        notes: pattern.migrationRelevance ? [pattern.migrationRelevance] : undefined,
        manualReview: true,
      });
    }
  }

  return tasks;
}

/** @description Builds optional schema-driven form migration tasks when contract-like form surfaces are detected. */
export function generateSchemaFormTasks(report: AnalysisReport): MigrationTask[] {
  const relevantComponents = report.components.filter(
    (component) =>
      component.name === 'Form' ||
      component.rawNames?.includes('Form') ||
      component.notes.includes('RenderFormSchema')
  );
  const adapterFiles = new Set([
    ...(report.wallet?.affectedFiles ?? []),
    ...(report.adapters?.affectedFiles ?? []),
    ...report.patterns
      .filter((pattern) => pattern.category === 'wallet')
      .flatMap((pattern) => pattern.files),
  ]);
  if (relevantComponents.length === 0 || adapterFiles.size === 0) return [];

  const tasks: MigrationTask[] = [];
  for (const component of relevantComponents) {
    for (const file of component.files) {
      tasks.push({
        id: `schema-driven-form-${file.replace(/[/\\]/g, '-')}`,
        phase: 'schema-forms',
        phaseDetail: 'schema-driven-forms',
        type: 'schema-driven-form',
        status: 'pending',
        description: `Review ${file} for RenderFormSchema/TransactionForm migration`,
        file,
        files: [file],
        sourceComponent: component.name,
        targetComponent: 'RenderFormSchema',
        dependsOn: [...FOUNDATION_DEPENDENCIES],
        validation: buildValidation(`schema-driven-form-${file.replace(/[/\\]/g, '-')}`),
        notes: [
          'Optional phase 4b migration for schema-driven or contract-oriented forms.',
          ...(component.notes ? [component.notes] : []),
        ],
        manualReview: true,
      });
    }
  }

  const deduped = new Map<string, MigrationTask>();
  for (const task of tasks) {
    const adapterRelated = task.file ? adapterFiles.has(task.file) : false;
    if (!adapterRelated) continue;
    deduped.set(task.id, task);
  }
  return [...deduped.values()];
}

/** @description Builds cleanup-phase tasks for removing stale source-library deps and migration scaffolding. */
export function generateCleanupTasks(report: AnalysisReport): MigrationTask[] {
  const tasks: MigrationTask[] = [];

  const sourceLib = report.sourceLibrary;
  if (sourceLib) {
    const libs = loadSourceLibraries();
    const lib = libs[sourceLib];
    if (lib?.packages && lib.packages.length > 0) {
      tasks.push({
        id: 'cleanup-remove-stale-deps',
        phase: 'cleanup',
        phaseDetail: 'cleanup',
        type: 'remove-stale-deps',
        status: 'pending',
        description: `Remove stale ${sourceLib} packages after migration: ${lib.packages.join(', ')}`,
        dependsOn: [...FOUNDATION_DEPENDENCIES],
        validation: buildValidation('cleanup-remove-stale-deps'),
        notes: [
          'Verify all component/form/wallet tasks are complete before removing source-library dependencies.',
          `Packages to consider removing: ${lib.packages.join(', ')}`,
        ],
        manualReview: true,
      });
    }
  }

  tasks.push({
    id: 'cleanup-scaffolding',
    phase: 'cleanup',
    phaseDetail: 'cleanup',
    type: 'cleanup-scaffolding',
    status: 'pending',
    description:
      'Remove migration scaffolding: runtime-providers stub, stale wrappers, and commit the manifest.',
    dependsOn: [...FOUNDATION_DEPENDENCIES],
    validation: buildValidation('cleanup-scaffolding'),
    notes: [
      'Remove src/oz/runtime-providers.tsx stub if OzProviders.tsx uses @openzeppelin/ui-react directly.',
      'Ensure the entry file import was switched from the stub to OzProviders.',
      'Commit migration-manifest.json as a git artifact.',
    ],
    manualReview: true,
  });

  return tasks;
}

export interface GeneratePlanOptions {
  scopeDir?: string;
  componentFilter?: string[];
}

/** @description Combines all phase task generators into a complete migration plan. */
export function generatePlanTasks(
  report: AnalysisReport,
  options: GeneratePlanOptions = {}
): MigrationTask[] {
  const setupTasks = generateSetupTasks();
  const componentTasks = generateComponentTasks(report, options.scopeDir, options.componentFilter);
  const schemaFormTasks = generateSchemaFormTasks(report);
  const walletTasks = generateWalletTasks(report);
  const storageTasks = generateStorageTasks(report);
  const cleanupTasks = generateCleanupTasks(report);

  return [
    ...setupTasks,
    ...componentTasks,
    ...schemaFormTasks,
    ...walletTasks,
    ...storageTasks,
    ...cleanupTasks,
  ];
}
