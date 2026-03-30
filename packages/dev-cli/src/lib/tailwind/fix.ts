import fs from 'node:fs';
import path from 'node:path';

import { doctorTailwindProject } from './doctor';
import {
  createManagedImportLine,
  createManagedTailwindCss,
  normalizeEntryStylesheet,
} from './managed';
import { resolveTailwindProject } from './project';
import { buildTailwindSourcePlan } from './resolver';
import { TailwindFileChange, TailwindFixResult, TailwindPrintResult } from './types';

export interface TailwindFixOptions {
  cssPath?: string;
  dryRun?: boolean;
}

function buildChange(
  filePath: string,
  nextContent: string,
  currentContent: string | null
): TailwindFileChange | null {
  if (currentContent === nextContent) {
    return null;
  }

  return {
    path: filePath,
    action: currentContent === null ? 'create' : 'update',
    summary: currentContent === null ? 'Create managed Tailwind file.' : 'Update Tailwind file.',
  };
}

function writeFileIfChanged(filePath: string, content: string, dryRun: boolean): boolean {
  const currentContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (currentContent === content) {
    return false;
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return true;
}

/**
 * Returns the resolved Tailwind source plan without mutating files.
 */
export function printTailwindProject(
  projectRootInput: string,
  cssPathInput?: string
): TailwindPrintResult {
  const project = resolveTailwindProject(projectRootInput, cssPathInput);
  if (!project) {
    return {
      ok: false,
      projectRoot: path.resolve(projectRootInput),
      appRoot: null,
      cssPath: null,
      generatedCssPath: null,
      sourcePlan: null,
    };
  }

  return {
    ok: true,
    projectRoot: project.projectRoot,
    appRoot: project.appRoot,
    cssPath: project.cssPath,
    generatedCssPath: project.generatedCssPath,
    sourcePlan: buildTailwindSourcePlan(project),
  };
}

/**
 * Rewrites the Tailwind setup into a managed generated stylesheet plus a stable import.
 */
export function fixTailwindProject(
  projectRootInput: string,
  options: TailwindFixOptions = {}
): TailwindFixResult {
  const project = resolveTailwindProject(projectRootInput, options.cssPath);
  if (!project) {
    return {
      ok: false,
      projectRoot: path.resolve(projectRootInput),
      appRoot: null,
      cssPath: null,
      generatedCssPath: null,
      sourcePlan: null,
      issuesBefore: doctorTailwindProject(projectRootInput, options.cssPath).issues,
      changes: [],
      changed: false,
      wrote: false,
    };
  }

  const sourcePlan = buildTailwindSourcePlan(project);
  const importLine = createManagedImportLine(project);
  const generatedCssContent = createManagedTailwindCss(sourcePlan);
  const currentCssContent = fs.readFileSync(project.cssPath, 'utf8');
  const nextCssContent = normalizeEntryStylesheet(currentCssContent, importLine);
  const currentGeneratedCssContent = fs.existsSync(project.generatedCssPath)
    ? fs.readFileSync(project.generatedCssPath, 'utf8')
    : null;
  const issuesBefore = doctorTailwindProject(project.projectRoot, options.cssPath).issues;
  const changes: TailwindFileChange[] = [];

  const cssChange = buildChange(project.cssPath, nextCssContent, currentCssContent);
  if (cssChange) {
    changes.push({
      ...cssChange,
      summary: 'Normalize the entry stylesheet to import the managed Tailwind file.',
    });
  }

  const generatedCssChange = buildChange(
    project.generatedCssPath,
    generatedCssContent,
    currentGeneratedCssContent
  );
  if (generatedCssChange) {
    changes.push({
      ...generatedCssChange,
      summary:
        generatedCssChange.action === 'create'
          ? 'Create the managed Tailwind source file.'
          : 'Refresh the managed Tailwind source file.',
    });
  }

  const dryRun = Boolean(options.dryRun);
  const cssWritten = writeFileIfChanged(project.cssPath, nextCssContent, dryRun);
  const generatedWritten = writeFileIfChanged(
    project.generatedCssPath,
    generatedCssContent,
    dryRun
  );
  const changed = cssWritten || generatedWritten;

  return {
    ok: true,
    projectRoot: project.projectRoot,
    appRoot: project.appRoot,
    cssPath: project.cssPath,
    generatedCssPath: project.generatedCssPath,
    sourcePlan,
    issuesBefore,
    changes,
    changed,
    wrote: changed && !dryRun,
  };
}
