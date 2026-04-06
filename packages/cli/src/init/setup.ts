/**
 * Pure init/setup logic extracted for reuse by the autoresearch evaluator
 * and the CLI command.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  fixTailwindProject,
  printTailwindProject,
  type PackageFamilyMap,
  type TailwindBrandingOptions,
} from '@openzeppelin/ui-tailwind-utils';

import { CLI_BRANDING, CLI_FAMILIES, OZ_CORE_PACKAGES } from '../branding';
import { copyTemplateDirectory, writeTemplate } from '../templates';
import { buildInstallCommand, detectPackageManager } from '../utils/framework';

export interface SetupOptions {
  projectRoot: string;
  skipInstall?: boolean;
}

export interface SetupResult {
  packagesInstalled: string[];
  templatesWritten: string[];
  agentsCopied: string[];
  skillCopied: string[];
  tailwindFixed: boolean;
}

function installPackages(projectRoot: string, packages: string[], skipInstall: boolean): string[] {
  if (skipInstall || packages.length === 0) return [];

  const pm = detectPackageManager(projectRoot);
  const cmd = buildInstallCommand(pm, packages);

  try {
    execSync(cmd, { cwd: projectRoot, stdio: 'pipe' });
    return packages;
  } catch {
    return [];
  }
}

function writeProviderTemplates(projectRoot: string): string[] {
  const written: string[] = [];
  const srcDir = path.join(projectRoot, 'src', 'oz');

  if (writeTemplate(path.join(srcDir, 'OzProviders.tsx'), 'runtime-provider-setup.tsx.template')) {
    written.push('src/oz/OzProviders.tsx');
  }

  if (writeTemplate(path.join(srcDir, 'resolve-runtime.ts'), 'resolve-runtime.ts.template')) {
    written.push('src/oz/resolve-runtime.ts');
  }

  return written;
}

function copyAgentFiles(projectRoot: string): string[] {
  const copied: string[] = [];

  const cursorResult = copyTemplateDirectory('agents', path.join(projectRoot, '.cursor', 'agents'));
  copied.push(...cursorResult.copied.map((f) => `.cursor/agents/${f}`));

  const claudeResult = copyTemplateDirectory('agents', path.join(projectRoot, '.claude', 'agents'));
  copied.push(...claudeResult.copied.map((f) => `.claude/agents/${f}`));

  return copied;
}

function copySkillFiles(projectRoot: string): string[] {
  const copied: string[] = [];

  try {
    const result = copyTemplateDirectory(
      'skills/migrate-to-oz-uikit',
      path.join(projectRoot, '.cursor', 'skills', 'migrate-to-oz-uikit')
    );
    copied.push(...result.copied.map((f) => `.cursor/skills/migrate-to-oz-uikit/${f}`));
  } catch {
    // Skill templates may not exist yet
  }

  return copied;
}

function normalizeTailwind(
  projectRoot: string,
  families: PackageFamilyMap,
  branding: TailwindBrandingOptions
): boolean {
  try {
    const result = fixTailwindProject(projectRoot, families, branding);
    return result.ok && result.changed;
  } catch {
    return false;
  }
}

const ROOT_TAILWIND_CONFIG_NAMES = [
  'tailwind.config.ts',
  'tailwind.config.mts',
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
] as const;

/** When the project has no Tailwind-enabled package, emit a root config stub with OZ content paths. */
export function ensureTailwindConfigStubIfNeeded(
  projectRoot: string,
  families: PackageFamilyMap
): void {
  if (ROOT_TAILWIND_CONFIG_NAMES.some((name) => fs.existsSync(path.join(projectRoot, name)))) {
    return;
  }

  const resolved = printTailwindProject(projectRoot, families);
  if (resolved.ok) {
    return;
  }

  writeTemplate(path.join(projectRoot, 'tailwind.config.ts'), 'tailwind.config.ts.template');
}

/** @description Runs OZ UI kit project setup: packages, provider templates, agents, skill, and Tailwind fixes. */
export function runSetup(options: SetupOptions): SetupResult {
  const { projectRoot, skipInstall = false } = options;

  if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
    throw new Error(`No package.json found in ${projectRoot}. Is this a Node.js project?`);
  }

  const packagesInstalled = installPackages(projectRoot, OZ_CORE_PACKAGES, skipInstall);
  const templatesWritten = writeProviderTemplates(projectRoot);
  const agentsCopied = copyAgentFiles(projectRoot);
  const skillCopied = copySkillFiles(projectRoot);
  const tailwindFixed = normalizeTailwind(projectRoot, CLI_FAMILIES, CLI_BRANDING);
  ensureTailwindConfigStubIfNeeded(projectRoot, CLI_FAMILIES);

  return { packagesInstalled, templatesWritten, agentsCopied, skillCopied, tailwindFixed };
}
