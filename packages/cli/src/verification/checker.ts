import fs from 'node:fs';
import path from 'node:path';

import { doctorTailwindProject } from '@openzeppelin/ui-tailwind-utils';

import { CLI_BRANDING, CLI_FAMILIES } from '../branding';
import type { MigrationTask } from '../manifest';

export interface TaskCheckResult {
  taskId: string;
  passed: boolean;
  diagnostics: string[];
}

function checkInstallPackages(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const diagnostics: string[] = [];

  if (!fs.existsSync(packageJsonPath)) {
    return { taskId: task.id, passed: false, diagnostics: ['package.json not found'] };
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  const requiredPackages = [
    '@openzeppelin/ui-components',
    '@openzeppelin/ui-react',
    '@openzeppelin/ui-types',
  ];

  let allPresent = true;
  for (const pkgName of requiredPackages) {
    if (!deps[pkgName]) {
      diagnostics.push(`Missing package: ${pkgName}`);
      allPresent = false;
    }
  }

  if (allPresent) {
    diagnostics.push('All required OZ packages are installed');
  }

  return { taskId: task.id, passed: allPresent, diagnostics };
}

function checkWireProviders(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const diagnostics: string[] = [];
  let hasRuntimeProvider = false;
  let hasWalletStateProvider = false;

  const srcDir = path.join(projectRoot, 'src');
  if (!fs.existsSync(srcDir)) {
    return { taskId: task.id, passed: false, diagnostics: ['src/ directory not found'] };
  }

  function scan(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        scan(path.join(dir, entry.name));
        continue;
      }
      if (!entry.name.endsWith('.tsx') && !entry.name.endsWith('.jsx')) continue;

      const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
      if (content.includes('RuntimeProvider')) hasRuntimeProvider = true;
      if (content.includes('WalletStateProvider')) hasWalletStateProvider = true;
    }
  }

  scan(srcDir);

  if (hasRuntimeProvider) diagnostics.push('RuntimeProvider found');
  else diagnostics.push('RuntimeProvider not found in any .tsx/.jsx file');

  if (hasWalletStateProvider) diagnostics.push('WalletStateProvider found');
  else diagnostics.push('WalletStateProvider not found in any .tsx/.jsx file');

  return {
    taskId: task.id,
    passed: hasRuntimeProvider && hasWalletStateProvider,
    diagnostics,
  };
}

function checkTailwindNormalize(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const result = doctorTailwindProject(projectRoot, CLI_FAMILIES, CLI_BRANDING);

  if (result.ok) {
    return {
      taskId: task.id,
      passed: true,
      diagnostics: ['Tailwind configuration is valid'],
    };
  }

  return {
    taskId: task.id,
    passed: false,
    diagnostics: result.issues.map(
      (issue) => `[${issue.severity}] ${issue.code}: ${issue.message}`
    ),
  };
}

function checkComponentReplacement(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const diagnostics: string[] = [];
  if (!task.file || !task.sourceComponent || !task.targetComponent) {
    return { taskId: task.id, passed: false, diagnostics: ['Task missing file or component info'] };
  }

  const filePath = path.join(projectRoot, task.file);
  if (!fs.existsSync(filePath)) {
    return { taskId: task.id, passed: false, diagnostics: [`File not found: ${task.file}`] };
  }

  const content = fs.readFileSync(filePath, 'utf8');

  const hasOldImport =
    content.includes(task.sourceComponent) && !content.includes(`@openzeppelin/`);
  const hasNewImport = content.includes('@openzeppelin/') && content.includes(task.targetComponent);

  if (hasNewImport && !hasOldImport) {
    diagnostics.push(`${task.targetComponent} is imported from OZ`);
    return { taskId: task.id, passed: true, diagnostics };
  }

  if (hasOldImport) {
    diagnostics.push(`Old import of ${task.sourceComponent} still present`);
  }
  if (!hasNewImport) {
    diagnostics.push(`OZ import of ${task.targetComponent} not found`);
  }

  return { taskId: task.id, passed: false, diagnostics };
}

export function checkTask(task: MigrationTask, projectRoot: string): TaskCheckResult {
  switch (task.type) {
    case 'install-packages':
      return checkInstallPackages(task, projectRoot);
    case 'wire-providers':
      return checkWireProviders(task, projectRoot);
    case 'tailwind-normalize':
      return checkTailwindNormalize(task, projectRoot);
    case 'component-replacement':
    case 'form-field-replacement':
      return checkComponentReplacement(task, projectRoot);
    case 'wallet-replacement':
    case 'storage-migration':
    case 'schema-driven-form':
    case 'copy-agents':
    case 'copy-skill':
      return {
        taskId: task.id,
        passed: task.status === 'completed',
        diagnostics: [
          task.status === 'completed'
            ? 'Task marked as completed'
            : 'Task not yet completed (manual verification required)',
        ],
      };
  }
}
