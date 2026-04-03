/**
 * Pure plan-generation logic, extracted for reuse by the autoresearch evaluator
 * and the CLI command.
 */

import type { AnalysisReport } from '../analysis';
import type { MigrationPhase, MigrationTask, TaskType } from '../manifest';

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

  for (const comp of report.components) {
    if (!comp.ozTarget) continue;
    if (componentFilter && !componentFilter.includes(comp.name)) continue;

    const files = scopeDir ? comp.files.filter((f) => f.startsWith(scopeDir)) : comp.files;
    if (files.length === 0) continue;

    const phase: MigrationPhase = comp.category === 'field' ? 'form-fields' : 'ui-components';
    const type: TaskType =
      comp.category === 'field' ? 'form-field-replacement' : 'component-replacement';

    for (const file of files) {
      tasks.push({
        id: `${type}-${comp.name}-${file.replace(/[/\\]/g, '-')}`,
        phase,
        type,
        status: 'pending',
        description: `Replace ${comp.name} with OZ ${comp.ozTarget} in ${file}`,
        file,
        sourceComponent: comp.name,
        targetComponent: comp.ozTarget,
        capability: comp.capabilities[0],
      });
    }
  }

  return tasks;
}

/** @description Builds wallet-adapter replacement tasks from wallet patterns in the analysis report. */
export function generateWalletTasks(report: AnalysisReport): MigrationTask[] {
  const walletPatterns = report.patterns.filter((p) => p.category === 'wallet');
  if (walletPatterns.length === 0) return [];

  const tasks: MigrationTask[] = [];

  for (const pattern of walletPatterns) {
    for (const file of pattern.files) {
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
