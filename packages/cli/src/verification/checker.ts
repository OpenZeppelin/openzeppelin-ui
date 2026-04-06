import fs from 'node:fs';
import path from 'node:path';

import { doctorTailwindProject } from '@openzeppelin/ui-tailwind-utils';

import { CLI_BRANDING, CLI_FAMILIES } from '../branding';
import { loadCatalog, loadHtmlElementMappings } from '../catalog';
import type { MigrationTask } from '../manifest';

export interface TaskCheckResult {
  taskId: string;
  passed: boolean;
  severity: 'pass' | 'warning' | 'fail';
  diagnostics: string[];
  warnings?: string[];
}

function taskFiles(task: MigrationTask): string[] {
  if (task.files && task.files.length > 0) return task.files;
  return task.file ? [task.file] : [];
}

function firstExistingTaskFile(
  task: MigrationTask,
  projectRoot: string
): { file: string; content: string } | null {
  for (const file of taskFiles(task)) {
    const filePath = path.join(projectRoot, file);
    if (!fs.existsSync(filePath)) continue;
    return { file, content: fs.readFileSync(filePath, 'utf8') };
  }
  return null;
}

function checkInstallPackages(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const diagnostics: string[] = [];

  if (!fs.existsSync(packageJsonPath)) {
    return {
      taskId: task.id,
      passed: false,
      severity: 'fail',
      diagnostics: ['package.json not found'],
    };
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

  return {
    taskId: task.id,
    passed: allPresent,
    severity: allPresent ? 'pass' : 'fail',
    diagnostics,
  };
}

function checkWireProviders(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const diagnostics: string[] = [];
  let hasRuntimeProvider = false;
  let hasWalletStateProvider = false;

  const srcDir = path.join(projectRoot, 'src');
  if (!fs.existsSync(srcDir)) {
    return {
      taskId: task.id,
      passed: false,
      severity: 'fail',
      diagnostics: ['src/ directory not found'],
    };
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
    severity: hasRuntimeProvider && hasWalletStateProvider ? 'pass' : 'fail',
    diagnostics,
  };
}

function checkTailwindNormalize(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const result = doctorTailwindProject(projectRoot, CLI_FAMILIES, CLI_BRANDING);

  if (result.ok) {
    return {
      taskId: task.id,
      passed: true,
      severity: 'pass',
      diagnostics: ['Tailwind configuration is valid'],
    };
  }

  return {
    taskId: task.id,
    passed: false,
    severity: 'fail',
    diagnostics: result.issues.map(
      (issue) => `[${issue.severity}] ${issue.code}: ${issue.message}`
    ),
  };
}

const OZ_SCOPE = '@openzeppelin/';
/** Canonical package for UI primitives; `ui-react` hosts adapters/runtime, not primary component imports. */
const OZ_UI_COMPONENTS_PKG = '@openzeppelin/ui-components';
const OZ_UI_REACT_PKG = '@openzeppelin/ui-react';

interface ParsedImportBinding {
  module: string;
  exportName: string;
  localName: string;
}

/**
 * Extracts named import bindings from a source file (structural parse, not a full TS program).
 */
function parseNamedImportBindings(source: string): ParsedImportBinding[] {
  const out: ParsedImportBinding[] = [];
  const re = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const bindingList = m[1];
    const moduleSpecifier = m[2];
    for (const rawPart of bindingList.split(',')) {
      const part = rawPart.trim();
      if (!part) continue;
      const asSplit = part.split(/\s+as\s+/);
      if (asSplit.length === 2) {
        const exportName = asSplit[0].trim();
        const localName = asSplit[1].trim();
        if (/^\w+$/.test(exportName) && /^\w+$/.test(localName)) {
          out.push({ module: moduleSpecifier, exportName, localName });
        }
        continue;
      }
      if (/^\w+$/.test(part)) {
        out.push({ module: moduleSpecifier, exportName: part, localName: part });
      }
    }
  }
  return out;
}

function openZeppelinPackageRoot(moduleSpecifier: string): string | null {
  const match = moduleSpecifier.match(/^(@[^/]+\/[^/]+)(?:\/|$)/);
  return match ? match[1] : null;
}

function isOpenZeppelinModule(moduleSpecifier: string): boolean {
  return moduleSpecifier.startsWith(OZ_SCOPE);
}

/**
 * Returns a RegExp that matches a raw intrinsic HTML opening tag for catalog `source` (e.g. button).
 * PascalCase JSX is not matched.
 */
function rawHtmlOpenTagPattern(htmlSource: string): RegExp | null {
  const simple = htmlSource.match(/^([a-z][a-z0-9-]*)$/);
  if (!simple) return null;
  const tag = simple[1].toLowerCase();
  return new RegExp(`<${tag}(?=[\\s/>])`);
}

function checkComponentReplacement(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const diagnostics: string[] = [];
  if (taskFiles(task).length === 0 || !task.sourceComponent || !task.targetComponent) {
    return {
      taskId: task.id,
      passed: false,
      severity: 'fail',
      diagnostics: ['Task missing file or component info'],
    };
  }

  const resolvedFile = firstExistingTaskFile(task, projectRoot);
  if (!resolvedFile) {
    return {
      taskId: task.id,
      passed: false,
      severity: 'fail',
      diagnostics: taskFiles(task).map((file) => `File not found: ${file}`),
    };
  }

  const content = resolvedFile.content;
  const target = task.targetComponent;
  const bindings = parseNamedImportBindings(content);

  const catalog = loadCatalog();
  const catalogEntry = catalog.components[target];
  const expectedOzPackage = catalogEntry?.package;

  const ozBindingsForTarget = bindings.filter(
    (b) => b.exportName === target && isOpenZeppelinModule(b.module)
  );
  const wrongOzBindings = expectedOzPackage
    ? ozBindingsForTarget.filter((b) => openZeppelinPackageRoot(b.module) !== expectedOzPackage)
    : [];
  const correctOzBindings = expectedOzPackage
    ? ozBindingsForTarget.filter((b) => openZeppelinPackageRoot(b.module) === expectedOzPackage)
    : ozBindingsForTarget;

  if (wrongOzBindings.length > 0) {
    const found = wrongOzBindings[0].module;
    diagnostics.push(
      `Wrong package for ${target}: catalog expects ${expectedOzPackage} but found import from ${found}`
    );
  }

  if (!expectedOzPackage) {
    const reactOnly = ozBindingsForTarget.find(
      (b) => openZeppelinPackageRoot(b.module) === OZ_UI_REACT_PKG
    );
    if (reactOnly) {
      diagnostics.push(
        `Wrong package for ${target}: OpenZeppelin UI components should be imported from ${OZ_UI_COMPONENTS_PKG}, not from ${OZ_UI_REACT_PKG} (found import from ${reactOnly.module})`
      );
    }
  }

  const nonOzImportsOfTarget = bindings.filter(
    (b) => b.exportName === target && !isOpenZeppelinModule(b.module)
  );
  for (const b of nonOzImportsOfTarget) {
    const aliasNote =
      b.localName !== b.exportName
        ? ` (exported as ${b.exportName} under local alias ${b.localName})`
        : '';
    const shadcnHint =
      b.module.includes('components/ui') || b.module.startsWith('@/')
        ? ' Path matches a typical shadcn-style alias layout.'
        : '';
    diagnostics.push(
      `Old import of ${target} from non-OZ module ${b.module} still present${aliasNote}.${shadcnHint}`.trimEnd()
    );
  }

  const source = task.sourceComponent;
  if (source && source !== target) {
    const staleSourceImports = bindings.filter(
      (b) => b.exportName === source && !isOpenZeppelinModule(b.module)
    );
    for (const b of staleSourceImports) {
      const aliasNote =
        b.localName !== b.exportName
          ? ` (exported as ${b.exportName} under local alias ${b.localName})`
          : '';
      const shadcnHint =
        b.module.includes('components/ui') || b.module.startsWith('@/')
          ? ' Path matches a typical shadcn-style alias layout.'
          : '';
      diagnostics.push(
        `Old import of ${source} from non-OZ module ${b.module} still present${aliasNote}.${shadcnHint}`.trimEnd()
      );
    }
  }

  const htmlLib = loadHtmlElementMappings();
  const htmlMapping = htmlLib?.mappings[target];
  if (htmlMapping?.source) {
    const pattern = rawHtmlOpenTagPattern(htmlMapping.source);
    if (pattern?.test(content)) {
      diagnostics.push(
        `Raw HTML <${htmlMapping.source}> still present; ${target} is not migrated to the OZ component`
      );
    }
  }

  if (correctOzBindings.length === 0) {
    if (expectedOzPackage) {
      if (ozBindingsForTarget.length === 0) {
        diagnostics.push(
          `OZ import of ${target} not found — ${target} is not imported from ${expectedOzPackage}`
        );
      }
    } else if (ozBindingsForTarget.length === 0) {
      diagnostics.push(
        `OZ import of ${target} not found — ${target} is not imported from OpenZeppelin UI packages`
      );
    }
  }

  const passed = diagnostics.length === 0;

  if (passed) {
    diagnostics.push(`${target} is imported from OZ`);
  }

  return { taskId: task.id, passed, severity: passed ? 'pass' : 'fail', diagnostics };
}

function checkWalletReplacement(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const diagnostics: string[] = [];
  const warnings: string[] = [];
  const resolvedFile = firstExistingTaskFile(task, projectRoot);
  if (!resolvedFile) {
    return {
      taskId: task.id,
      passed: false,
      severity: 'fail',
      diagnostics: taskFiles(task).length
        ? taskFiles(task).map((file) => `File not found: ${file}`)
        : ['Task missing file info'],
    };
  }

  const { content, file } = resolvedFile;
  const legacyWalletSignals = [
    /\bfrom\s+['"]wagmi(?:\/[^'"]*)?['"]/,
    /\bfrom\s+['"]ethers(?:\/[^'"]*)?['"]/,
    /\bfrom\s+['"]viem(?:\/[^'"]*)?['"]/,
  ];
  const lingering = legacyWalletSignals.filter((pattern) => pattern.test(content)).length;
  if (lingering > 0) {
    diagnostics.push(`Legacy wallet imports still present in ${file}`);
  }

  if (!content.includes('useRuntimeContext') && !content.includes('useWalletState')) {
    diagnostics.push(`No OZ wallet/runtime hooks detected in ${file}`);
  }

  if (!content.includes('RuntimeProvider') && !content.includes('WalletStateProvider')) {
    warnings.push(
      `Provider ancestry is not verifiable from ${file}; confirm runtime providers are wired at the app root`
    );
  }

  const passed = diagnostics.length === 0;
  if (passed) diagnostics.push(`Wallet replacement signals look correct in ${file}`);
  return {
    taskId: task.id,
    passed,
    severity: passed ? (warnings.length > 0 ? 'warning' : 'pass') : 'fail',
    diagnostics,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function checkStorageMigration(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const diagnostics: string[] = [];
  const warnings: string[] = [];
  const resolvedFile = firstExistingTaskFile(task, projectRoot);
  if (!resolvedFile) {
    return {
      taskId: task.id,
      passed: false,
      severity: 'fail',
      diagnostics: taskFiles(task).length
        ? taskFiles(task).map((file) => `File not found: ${file}`)
        : ['Task missing file info'],
    };
  }

  const { content, file } = resolvedFile;
  const hasStorageMarker =
    content.includes('EntityStorage') ||
    content.includes('createDexieDatabase') ||
    content.includes('TODO') ||
    content.includes('manual review');

  if (!hasStorageMarker) {
    diagnostics.push(`No storage migration marker found in ${file}`);
  }

  if (task.manualReview) {
    warnings.push('Storage data migration remains out of scope and still requires manual review');
  }

  const passed = diagnostics.length === 0;
  if (passed) diagnostics.push(`Storage migration marker found in ${file}`);
  return {
    taskId: task.id,
    passed,
    severity: passed ? (warnings.length > 0 ? 'warning' : 'pass') : 'fail',
    diagnostics,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function checkSchemaDrivenForm(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const diagnostics: string[] = [];
  const warnings: string[] = [];
  const resolvedFile = firstExistingTaskFile(task, projectRoot);
  if (!resolvedFile) {
    return {
      taskId: task.id,
      passed: false,
      severity: 'fail',
      diagnostics: taskFiles(task).length
        ? taskFiles(task).map((file) => `File not found: ${file}`)
        : ['Task missing file info'],
    };
  }

  const { content, file } = resolvedFile;
  const hasSchemaRenderer =
    content.includes('RenderFormSchema') ||
    content.includes('TransactionForm') ||
    content.includes('DynamicFormField');
  if (!hasSchemaRenderer) diagnostics.push(`No schema-driven form usage detected in ${file}`);
  warnings.push('Schema-driven form migration should still be manually validated in the UI');

  const passed = diagnostics.length === 0;
  if (passed) diagnostics.push(`Schema-driven form usage detected in ${file}`);
  return {
    taskId: task.id,
    passed,
    severity: passed ? 'warning' : 'fail',
    diagnostics,
    warnings,
  };
}

function checkCopiedArtifacts(
  task: MigrationTask,
  projectRoot: string,
  requiredArtifacts: string[],
  optionalArtifacts: string[],
  label: string
): TaskCheckResult {
  const missingRequired = requiredArtifacts.filter(
    (artifactPath) => !fs.existsSync(path.join(projectRoot, artifactPath))
  );

  if (missingRequired.length > 0) {
    return {
      taskId: task.id,
      passed: false,
      severity: 'fail',
      diagnostics: missingRequired.map((artifactPath) => `Missing ${label}: ${artifactPath}`),
    };
  }

  const warnings = optionalArtifacts
    .filter((artifactPath) => !fs.existsSync(path.join(projectRoot, artifactPath)))
    .map((artifactPath) => `Missing optional ${label} mirror: ${artifactPath}`);

  return {
    taskId: task.id,
    passed: true,
    severity: warnings.length > 0 ? 'warning' : 'pass',
    diagnostics: requiredArtifacts.map((artifactPath) => `${label} present at ${artifactPath}`),
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 *
 */
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
      return checkWalletReplacement(task, projectRoot);
    case 'storage-migration':
      return checkStorageMigration(task, projectRoot);
    case 'schema-driven-form':
      return checkSchemaDrivenForm(task, projectRoot);
    case 'copy-agents':
      return checkCopiedArtifacts(
        task,
        projectRoot,
        [
          '.cursor/agents/migration-analyzer.md',
          '.cursor/agents/migration-executor.md',
          '.cursor/agents/migration-verifier.md',
        ],
        [
          '.claude/agents/migration-analyzer.md',
          '.claude/agents/migration-executor.md',
          '.claude/agents/migration-verifier.md',
        ],
        'agent file'
      );
    case 'copy-skill':
      return checkCopiedArtifacts(
        task,
        projectRoot,
        ['.cursor/skills/migrate-to-oz-uikit/SKILL.md'],
        ['.claude/skills/migrate-to-oz-uikit/SKILL.md'],
        'skill file'
      );
  }
}
