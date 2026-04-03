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
} from '../../manifest';
import { generatePlanTasks } from '../../planning/generate';
import { printError, printJson } from '../../utils/logger';

interface PlanOptions {
  report: string;
  output?: string;
  scope?: string;
  components?: string;
  profile?: string;
  json?: boolean;
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

        manifest.tasks = generatePlanTasks(report, {
          scopeDir: options.scope,
          componentFilter,
        });

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
