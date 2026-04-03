import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import type { AnalysisReport } from '../../analysis';
import { CLI_VERSION } from '../../branding';
import { loadCatalog } from '../../catalog';
import {
  createEmptyManifest,
  getManifestPath,
  writeManifest,
  type MigrationManifest,
  type MigrationPhase,
  type MigrationTask,
  type TaskType,
} from '../../manifest';
import { printError, printJson } from '../../utils/logger';

interface PlanOptions {
  report: string;
  output?: string;
  scope?: string;
  components?: string;
  profile?: string;
  json?: boolean;
}

function generateSetupTasks(): MigrationTask[] {
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

function generateComponentTasks(
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

function generateWalletTasks(report: AnalysisReport): MigrationTask[] {
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

function generateStorageTasks(report: AnalysisReport): MigrationTask[] {
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

function detectProfile(report: AnalysisReport, override?: string): MigrationManifest['profile'] {
  if (override) {
    if (['viewer', 'transactor', 'operator'].includes(override)) {
      return override as MigrationManifest['profile'];
    }
  }

  const hasWallet = report.patterns.some((p) => p.category === 'wallet');
  if (!hasWallet) return 'viewer';
  return 'transactor';
}

/**
 *
 */
export function registerPlanCommand(parent: Command): void {
  parent
    .command('plan')
    .description('Generate a phased migration task list from an analysis report.')
    .requiredOption('-r, --report <path>', 'Path to the analysis report JSON')
    .option('-o, --output <path>', 'Write manifest to a specific path')
    .option('-s, --scope <dir>', 'Limit migration scope to a directory')
    .option('-c, --components <list>', 'Filter by component names (comma-separated)')
    .option('--profile <profile>', 'Override profile selection (viewer/transactor/operator)')
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: PlanOptions) => {
      try {
        const reportPath = path.resolve(options.report);
        if (!fs.existsSync(reportPath)) {
          throw new Error(`Report file not found: ${reportPath}`);
        }

        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as AnalysisReport;

        const catalog = loadCatalog();
        const componentFilter = options.components
          ? options.components.split(',').map((c) => c.trim())
          : undefined;

        const manifest = createEmptyManifest(report.project, {
          catalogVersion: catalog.catalogVersion,
          targetOzVersion: CLI_VERSION,
          framework: report.framework,
          sourceLibrary: report.sourceLibrary,
        });

        manifest.profile = detectProfile(report, options.profile);
        manifest.scope = {
          directory: options.scope,
          componentFilter,
        };

        const setupTasks = generateSetupTasks();
        const componentTasks = generateComponentTasks(report, options.scope, componentFilter);
        const walletTasks = generateWalletTasks(report);
        const storageTasks = generateStorageTasks(report);

        manifest.tasks = [...setupTasks, ...componentTasks, ...walletTasks, ...storageTasks];

        const outputPath = options.output
          ? path.resolve(options.output)
          : getManifestPath(report.project);

        writeManifest(outputPath, manifest);

        if (options.json) {
          printJson(manifest);
          return;
        }

        process.stdout.write(pc.green(`Migration plan generated → ${outputPath}\n`));
        process.stdout.write(`  Profile: ${manifest.profile ?? 'auto-detect'}\n`);
        process.stdout.write(`  Total tasks: ${manifest.tasks.length}\n`);

        const phaseCounts = new Map<string, number>();
        for (const task of manifest.tasks) {
          phaseCounts.set(task.phase, (phaseCounts.get(task.phase) ?? 0) + 1);
        }
        for (const [phase, count] of phaseCounts) {
          process.stdout.write(`    ${phase}: ${count} tasks\n`);
        }

        process.stdout.write(
          `\nRun ${pc.cyan('oz-ui migrate status --manifest ' + path.relative(process.cwd(), outputPath))} to see progress.\n`
        );
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
