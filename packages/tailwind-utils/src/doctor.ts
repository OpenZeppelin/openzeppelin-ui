import path from 'node:path';

import {
  createManagedImportLine,
  hasManagedImport,
  hasRecognizedInlineSetup,
  readIfExists,
} from './managed';
import { resolveTailwindProject } from './project';
import { buildTailwindSourcePlan } from './resolver';
import type {
  PackageFamilyMap,
  TailwindBrandingOptions,
  TailwindDoctorIssue,
  TailwindDoctorResult,
} from './types';

function isBroadOpenZeppelinSource(content: string): boolean {
  return /@source\s+['"][^'"]*node_modules\/@openzeppelin['"]/.test(content);
}

function collectCoveredPackages(content: string, packages: string[]): Set<string> {
  if (isBroadOpenZeppelinSource(content)) {
    return new Set(packages);
  }

  const coveredPackages = new Set<string>();
  for (const packageName of packages) {
    if (content.includes(packageName)) {
      coveredPackages.add(packageName);
    }
  }

  return coveredPackages;
}

function createIssue(
  projectRoot: string,
  code: string,
  severity: TailwindDoctorIssue['severity'],
  message: string,
  branding: TailwindBrandingOptions,
  file?: string,
  fixable = true
): TailwindDoctorIssue {
  return {
    scope: 'tailwind',
    code,
    severity,
    message,
    file: file ? path.relative(projectRoot, file) : undefined,
    fixable,
    suggestedCommand: fixable ? branding.suggestedFixCommand : undefined,
  };
}

/**
 * Diagnoses a project's Tailwind wiring for OpenZeppelin packages.
 */
export function doctorTailwindProject(
  projectRootInput: string,
  families: PackageFamilyMap,
  branding: TailwindBrandingOptions,
  cssPathInput?: string
): TailwindDoctorResult {
  const project = resolveTailwindProject(projectRootInput, cssPathInput);
  if (!project) {
    return {
      ok: false,
      projectRoot: path.resolve(projectRootInput),
      appRoot: null,
      cssPath: null,
      generatedCssPath: null,
      sourcePlan: null,
      issues: [
        createIssue(
          path.resolve(projectRootInput),
          'missing-entry-stylesheet',
          'error',
          'Could not detect a Tailwind entry stylesheet. Re-run with --css to point at one.',
          branding,
          undefined,
          false
        ),
      ],
    };
  }

  const issues: TailwindDoctorIssue[] = [];
  const importLine = createManagedImportLine(project);
  const sourcePlan = buildTailwindSourcePlan(project, families);
  const cssContent = readIfExists(project.cssPath) ?? '';
  const generatedCssContent = readIfExists(project.generatedCssPath);
  const managedImportPresent = hasManagedImport(cssContent, importLine);
  const effectiveContent =
    managedImportPresent && generatedCssContent !== null ? generatedCssContent : cssContent;

  if (!managedImportPresent) {
    issues.push(
      createIssue(
        project.projectRoot,
        'missing-managed-import',
        'warning',
        'Entry stylesheet is not using the managed Tailwind import yet.',
        branding,
        project.cssPath
      )
    );
  }

  if (managedImportPresent && generatedCssContent === null) {
    issues.push(
      createIssue(
        project.projectRoot,
        'missing-generated-file',
        'error',
        'Managed Tailwind import is present, but the generated stylesheet is missing.',
        branding,
        project.generatedCssPath
      )
    );
  }

  if (hasRecognizedInlineSetup(cssContent)) {
    issues.push(
      createIssue(
        project.projectRoot,
        'legacy-inline-setup',
        'warning',
        'Legacy inline Tailwind directives were detected in the entry stylesheet. Normalize them into the managed generated file.',
        branding,
        project.cssPath
      )
    );
  }

  if (!effectiveContent.includes('@openzeppelin/ui-styles/global.css')) {
    issues.push(
      createIssue(
        project.projectRoot,
        'missing-global-styles-import',
        'error',
        'The effective Tailwind setup is missing @openzeppelin/ui-styles/global.css.',
        branding,
        managedImportPresent ? project.generatedCssPath : project.cssPath
      )
    );
  }

  if (isBroadOpenZeppelinSource(effectiveContent)) {
    issues.push(
      createIssue(
        project.projectRoot,
        'broad-openzeppelin-source',
        'warning',
        'Broad @openzeppelin node_modules scanning is configured. The managed generated file will switch this project to explicit sources.',
        branding,
        managedImportPresent ? project.generatedCssPath : project.cssPath
      )
    );
  }

  const coveredPackages = collectCoveredPackages(effectiveContent, sourcePlan.packages);
  for (const packageName of sourcePlan.packages) {
    if (!coveredPackages.has(packageName)) {
      issues.push(
        createIssue(
          project.projectRoot,
          'missing-package-source',
          'error',
          `Tailwind sources do not currently cover ${packageName}.`,
          branding,
          managedImportPresent ? project.generatedCssPath : project.cssPath
        )
      );
    }
  }

  return {
    ok: issues.every((issue) => issue.severity !== 'error'),
    projectRoot: project.projectRoot,
    appRoot: project.appRoot,
    cssPath: project.cssPath,
    generatedCssPath: project.generatedCssPath,
    sourcePlan,
    issues,
  };
}
