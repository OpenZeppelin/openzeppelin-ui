import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import { analyzeProject } from '../../analysis';
import { printError, printJson } from '../../utils/logger';
import type { JsonCommandResult } from './json-results';

interface AnalyzeOptions {
  project: string;
  scope?: string;
  output?: string;
  json?: boolean;
}

interface AnalyzeResult extends JsonCommandResult<'migrate-analyze'> {
  project: string;
  scope?: string;
  output?: string;
  report: ReturnType<typeof analyzeProject>;
}

/**
 *
 */
export function registerAnalyzeCommand(parent: Command): void {
  parent
    .command('analyze')
    .description(
      'Analyze project for migration: scan components, wallet patterns, Tailwind config, and output a structured report.'
    )
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .option('-s, --scope <dir>', 'Limit analysis to a specific directory')
    .option('-o, --output <path>', 'Write report to a file (default: stdout)')
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: AnalyzeOptions) => {
      try {
        const projectRoot = path.resolve(options.project);

        if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
          throw new Error(`No package.json found in ${projectRoot}`);
        }

        const report = analyzeProject(projectRoot, options.scope);

        if (options.output) {
          const outputPath = path.resolve(options.output);
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');

          if (!options.json) {
            process.stdout.write(pc.green(`Analysis report written to ${outputPath}\n`));
          }
        }

        if (options.json) {
          const result: AnalyzeResult = {
            ok: true,
            action: 'migrate-analyze',
            project: projectRoot,
            scope: options.scope,
            output: options.output ? path.resolve(options.output) : undefined,
            report,
          };
          printJson(result);
          return;
        }

        if (!options.output) {
          printHumanReadable(report);
        }
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}

function printHumanReadable(report: ReturnType<typeof analyzeProject>): void {
  process.stdout.write(pc.bold(`\nMigration Analysis Report\n`));
  process.stdout.write(`${'─'.repeat(50)}\n`);
  process.stdout.write(`  Project:    ${report.project}\n`);
  process.stdout.write(`  Framework:  ${report.framework}\n`);
  process.stdout.write(`  Files:      ${report.summary.totalFiles}\n`);
  process.stdout.write(`  Effort:     ${pc.yellow(report.summary.estimatedEffort)}\n`);

  if (report.sourceLibrary) {
    process.stdout.write(`  Source lib: ${report.sourceLibrary}\n`);
  }

  process.stdout.write(
    `\n${pc.bold('Components')} (${report.summary.componentMatches} found, ${report.summary.mappableComponents} mappable)\n`
  );
  for (const comp of report.components.slice(0, 15)) {
    const target = comp.ozTarget ? pc.green(`→ ${comp.ozTarget}`) : pc.dim('(no mapping)');
    const effort = comp.effort !== 'unknown' ? ` [${comp.effort}]` : '';
    process.stdout.write(`  ${comp.name} (${comp.usageCount}x) ${target}${effort}\n`);
  }
  if (report.components.length > 15) {
    process.stdout.write(`  ... and ${report.components.length - 15} more\n`);
  }

  const walletPatterns = report.patterns.filter((p) => p.category === 'wallet');
  if (walletPatterns.length > 0) {
    process.stdout.write(`\n${pc.bold('Wallet Patterns')}\n`);
    for (const p of walletPatterns) {
      process.stdout.write(`  ${p.pattern}: ${p.count}x in ${p.files.length} files\n`);
    }
  }

  const storagePatterns = report.patterns.filter((p) => p.category === 'storage');
  if (storagePatterns.length > 0) {
    process.stdout.write(`\n${pc.bold('Storage Patterns')}\n`);
    for (const p of storagePatterns) {
      process.stdout.write(`  ${p.pattern}: ${p.count}x in ${p.files.length} files\n`);
    }
  }

  if (!report.tailwind.ok) {
    process.stdout.write(`\n${pc.bold('Tailwind Issues')}\n`);
    for (const issue of report.tailwind.issues) {
      const color = issue.severity === 'error' ? pc.red : pc.yellow;
      process.stdout.write(`  ${color(`[${issue.severity}]`)} ${issue.message}\n`);
    }
  }

  process.stdout.write('\n');
}
