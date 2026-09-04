import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { doctorTailwindProject } from '@openzeppelin/ui-tailwind-utils';

import {
  expectedAgentPathsForProfiles,
  expectedSkillPathsForProfiles,
  MIGRATE_SKILL_ID,
  type AgentAssetProfile,
} from '../agent-assets';
import { createAnalysisSourceFile } from '../analysis/import-extract';
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

/** @description Copy-skill / copy-agents checks require explicit manifest-selected profiles. */
export interface CheckTaskOptions {
  agentAssetProfiles?: AgentAssetProfile[];
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

const ENTRY_FILE_CANDIDATES = ['src/main.tsx', 'src/main.jsx', 'src/index.tsx', 'src/index.jsx'];

/**
 * Checks whether the app entry file imports providers from the local stub
 * rather than from `@openzeppelin/ui-react`. When the stub is used, OZ hooks
 * like `useWalletState()` will throw at runtime because they read from a
 * different React context than the one the stub provides.
 */
export function checkEntryFileProviderSource(projectRoot: string): {
  fromStub: boolean;
  fromOz: boolean;
  entryFile: string | null;
} {
  for (const candidate of ENTRY_FILE_CANDIDATES) {
    const filePath = path.join(projectRoot, candidate);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const bindings = parseNamedImportBindings(content);
    const providerBindings = bindings.filter(
      (b) => b.exportName === 'RuntimeProvider' || b.exportName === 'WalletStateProvider'
    );

    const fromStub = providerBindings.some((b) => !b.module.startsWith('@openzeppelin/'));
    const fromOz = providerBindings.some((b) => b.module.startsWith('@openzeppelin/'));

    return { fromStub, fromOz, entryFile: candidate };
  }

  return { fromStub: false, fromOz: false, entryFile: null };
}

function checkWireProviders(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const diagnostics: string[] = [];
  const warnings: string[] = [];
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

  const providerSource = checkEntryFileProviderSource(projectRoot);
  if (providerSource.entryFile && providerSource.fromStub && !providerSource.fromOz) {
    warnings.push(
      `Entry file ${providerSource.entryFile} imports providers from a local stub, not from @openzeppelin/ui-react. ` +
        'OZ hooks like useWalletState() will throw at runtime. ' +
        'Switch to OzProviders or import directly from @openzeppelin/ui-react.'
    );
  }

  const passed = hasRuntimeProvider && hasWalletStateProvider;
  return {
    taskId: task.id,
    passed,
    severity: passed ? (warnings.length > 0 ? 'warning' : 'pass') : 'fail',
    diagnostics,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function checkActivateProviders(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const providerSource = checkEntryFileProviderSource(projectRoot);

  if (!providerSource.entryFile) {
    return {
      taskId: task.id,
      passed: false,
      severity: 'fail',
      diagnostics: [
        'No entry file found (checked src/main.tsx, src/main.jsx, src/index.tsx, src/index.jsx).',
      ],
    };
  }

  if (providerSource.fromStub && !providerSource.fromOz) {
    return {
      taskId: task.id,
      passed: false,
      severity: 'fail',
      diagnostics: [
        `${providerSource.entryFile} imports providers from a local stub, not @openzeppelin/ui-react.`,
        'Switch to OzProviders or import directly from @openzeppelin/ui-react before starting wallet-adapter tasks.',
      ],
    };
  }

  if (!providerSource.fromOz && !providerSource.fromStub) {
    return {
      taskId: task.id,
      passed: true,
      severity: 'warning',
      diagnostics: [`No provider imports found in ${providerSource.entryFile}.`],
      warnings: [
        'Entry file has no RuntimeProvider/WalletStateProvider imports. Providers may be wired in a separate wrapper component.',
      ],
    };
  }

  return {
    taskId: task.id,
    passed: true,
    severity: 'pass',
    diagnostics: [`${providerSource.entryFile} imports providers from @openzeppelin/ui-react.`],
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

interface JsxTagUsage {
  /** Number of intrinsic (lowercase) JSX elements matching the html source tag (e.g. `<button>`). */
  intrinsic: number;
  /** Number of JSX elements using the OZ target component as a tag (e.g. `<Button>`). */
  component: number;
}

/**
 * Returns the leading intrinsic tag for an html-elements catalog `source` when it is a plain
 * lowercase tag (e.g. `button`). Selector-style sources such as `input[type=text]` have no
 * single intrinsic tag we can verify structurally, so they return null.
 */
function intrinsicTagForHtmlSource(htmlSource: string): string | null {
  const simple = htmlSource.match(/^([a-z][a-z0-9-]*)$/);
  return simple ? simple[1].toLowerCase() : null;
}

function jsxTagIdentifier(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): string | null {
  return ts.isIdentifier(node.tagName) ? node.tagName.text : null;
}

/**
 * Counts JSX usages of an intrinsic tag (e.g. `button`) versus the OZ target component
 * (e.g. `Button`) via the TypeScript AST. Unlike a text scan, this ignores `<button` inside
 * comments or string literals and never confuses `<ButtonGroup` with `<Button`.
 */
function countJsxTagUsage(
  content: string,
  filePath: string,
  intrinsicTag: string,
  componentName: string
): JsxTagUsage {
  const sourceFile = createAnalysisSourceFile(filePath, content);
  const usage: JsxTagUsage = { intrinsic: 0, component: 0 };

  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = jsxTagIdentifier(node);
      if (tag === intrinsicTag) usage.intrinsic += 1;
      else if (tag === componentName) usage.component += 1;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return usage;
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
    const intrinsicTag = intrinsicTagForHtmlSource(htmlMapping.source);
    if (intrinsicTag) {
      const usage = countJsxTagUsage(content, resolvedFile.file, intrinsicTag, target);
      // A leftover raw `<button>` only signals an incomplete migration when the OZ component
      // is not adopted in the file. Once `<Button>` is in use, a remaining intrinsic tag (e.g. a
      // dialog close button produced by an `asChild` conversion) is intentional, not a regression.
      if (usage.intrinsic > 0 && usage.component === 0) {
        diagnostics.push(
          `Raw HTML <${intrinsicTag}> still present; ${target} is not migrated to the OZ component`
        );
      }
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

  const providerSource = checkEntryFileProviderSource(projectRoot);
  if (providerSource.entryFile && providerSource.fromStub && !providerSource.fromOz) {
    diagnostics.push(
      `Entry file providers come from a local stub, not @openzeppelin/ui-react. ` +
        `OZ hooks in ${file} will throw "useWalletState must be used within a WalletStateProvider" at runtime.`
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

function checkProfileAwareArtifacts(
  task: MigrationTask,
  projectRoot: string,
  artifactPaths: string[],
  label: string
): TaskCheckResult {
  if (artifactPaths.length === 0) {
    return {
      taskId: task.id,
      passed: true,
      severity: 'pass',
      diagnostics: [`No ${label} locations selected; nothing to verify.`],
    };
  }

  const missing = artifactPaths.filter(
    (artifactPath) => !fs.existsSync(path.join(projectRoot, artifactPath))
  );

  if (missing.length > 0) {
    return {
      taskId: task.id,
      passed: false,
      severity: 'fail',
      diagnostics: missing.map((artifactPath) => `Missing ${label}: ${artifactPath}`),
    };
  }

  return {
    taskId: task.id,
    passed: true,
    severity: 'pass',
    diagnostics: artifactPaths.map((artifactPath) => `${label} present at ${artifactPath}`),
  };
}

function checkRemoveStaleDeps(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const diagnostics: string[] = [];
  const warnings: string[] = [];
  const packageJsonPath = path.join(projectRoot, 'package.json');

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

  const stalePackageHints = (task.notes ?? [])
    .join(' ')
    .match(/Packages to consider removing:\s*(.+)/)?.[1];
  if (stalePackageHints) {
    const candidates = stalePackageHints.split(',').map((s) => s.trim());
    const stillPresent = candidates.filter((c) => deps[c]);
    if (stillPresent.length > 0) {
      warnings.push(`Source-library packages still installed: ${stillPresent.join(', ')}`);
    } else {
      diagnostics.push('All flagged source-library packages have been removed.');
    }
  }

  const passed = diagnostics.length > 0 || warnings.length > 0;
  if (diagnostics.length === 0 && warnings.length === 0) {
    diagnostics.push('No stale-dependency guidance available; manual verification recommended.');
  }

  return {
    taskId: task.id,
    passed,
    severity: passed ? (warnings.length > 0 ? 'warning' : 'pass') : 'fail',
    diagnostics,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function checkCleanupScaffolding(task: MigrationTask, projectRoot: string): TaskCheckResult {
  const diagnostics: string[] = [];
  const warnings: string[] = [];

  const stubPath = path.join(projectRoot, 'src', 'oz', 'runtime-providers.tsx');
  if (fs.existsSync(stubPath)) {
    warnings.push(
      'Runtime provider stub (src/oz/runtime-providers.tsx) still present; remove after switching to OzProviders.tsx.'
    );
  } else {
    diagnostics.push('Runtime provider stub removed.');
  }

  if (!fs.existsSync(path.join(projectRoot, 'migration-manifest.json'))) {
    warnings.push('migration-manifest.json not found in project root (it should be committed).');
  }

  const passed = true;
  return {
    taskId: task.id,
    passed,
    severity: warnings.length > 0 ? 'warning' : 'pass',
    diagnostics: diagnostics.length > 0 ? diagnostics : ['Cleanup scaffolding check passed.'],
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function effectiveCopyProfiles(options?: CheckTaskOptions): AgentAssetProfile[] {
  if (options?.agentAssetProfiles !== undefined) {
    return [...options.agentAssetProfiles];
  }
  throw new Error(
    'Missing agentAssetProfiles for assistant asset validation. Re-run `oz-ui migrate init --agent-profile <profiles>`, regenerate the migration plan, and retry.'
  );
}

/**
 *
 */
export function checkTask(
  task: MigrationTask,
  projectRoot: string,
  checkOptions?: CheckTaskOptions
): TaskCheckResult {
  switch (task.type) {
    case 'install-packages':
      return checkInstallPackages(task, projectRoot);
    case 'wire-providers':
      return checkWireProviders(task, projectRoot);
    case 'activate-providers':
      return checkActivateProviders(task, projectRoot);
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
    case 'copy-agents': {
      const agentExpected = expectedAgentPathsForProfiles(effectiveCopyProfiles(checkOptions));
      return checkProfileAwareArtifacts(task, projectRoot, agentExpected, 'agent file');
    }
    case 'copy-skill': {
      const skillExpected = expectedSkillPathsForProfiles(
        effectiveCopyProfiles(checkOptions),
        MIGRATE_SKILL_ID
      );
      return checkProfileAwareArtifacts(task, projectRoot, skillExpected, 'skill file');
    }
    case 'remove-stale-deps':
      return checkRemoveStaleDeps(task, projectRoot);
    case 'cleanup-scaffolding':
      return checkCleanupScaffolding(task, projectRoot);
    default: {
      const _exhaustive: never = task.type;
      return {
        taskId: task.id,
        passed: false,
        severity: 'fail',
        diagnostics: [`Unhandled task type: ${_exhaustive}`],
      };
    }
  }
}
