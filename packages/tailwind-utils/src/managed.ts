import fs from 'node:fs';

import type { TailwindBrandingOptions, TailwindProjectContext, TailwindSourcePlan } from './types';

function isIdentLikeSelectorOpenBlock(trimmedLine: string): boolean {
  const openBrace = trimmedLine.indexOf('{');
  if (openBrace === -1) {
    return false;
  }
  const beforeBrace = trimmedLine.slice(0, openBrace);
  const idPart = beforeBrace.trimEnd();
  if (idPart.length === 0) {
    return false;
  }
  if (!/^[a-zA-Z_-]$/u.test(idPart[0]!)) {
    return false;
  }
  for (let i = 1; i < idPart.length; i += 1) {
    if (!/[\w-]/u.test(idPart[i]!)) {
      return false;
    }
  }
  for (let j = idPart.length; j < beforeBrace.length; j += 1) {
    const w = beforeBrace[j]!;
    if (w !== ' ' && w !== '\t' && w !== '\n' && w !== '\r') {
      return false;
    }
  }
  return true;
}

function isAppSpecificStart(line: string): boolean {
  const trimmedLine = line.trim();
  if (trimmedLine === '') {
    return false;
  }

  // Avoid unbounded regex backtracking on adversarial CSS lines (CodeQL ReDoS).
  if (trimmedLine.length > 20_000) {
    return false;
  }

  const isLayerBlock =
    trimmedLine.startsWith('@layer ') &&
    trimmedLine.endsWith('{') &&
    !trimmedLine.endsWith(';') &&
    trimmedLine.slice('@layer '.length, -1).trim().length > 0;

  if (isLayerBlock && trimmedLine !== '@layer base, components, utilities;') {
    return true;
  }
  if (trimmedLine.startsWith('@keyframes ')) {
    return true;
  }

  const c0 = trimmedLine[0]!;
  if (c0 === '.' || c0 === '#' || c0 === '[' || c0 === ':') {
    return true;
  }

  return isIdentLikeSelectorOpenBlock(trimmedLine);
}

function isRecognizedSetupDirective(line: string): boolean {
  const trimmedLine = line.trim();

  return (
    trimmedLine === '@layer base, components, utilities;' ||
    trimmedLine.startsWith("@import 'tailwindcss'") ||
    trimmedLine.startsWith('@import "tailwindcss"') ||
    trimmedLine.startsWith('@source ') ||
    trimmedLine === "@import '@openzeppelin/ui-styles/global.css';" ||
    trimmedLine === '@import "@openzeppelin/ui-styles/global.css";'
  );
}

/**
 *
 */
export function createManagedImportLine(context: TailwindProjectContext): string {
  return `@import '${context.managedImportPath}';`;
}

/**
 *
 */
export function createManagedTailwindCss(
  plan: TailwindSourcePlan,
  branding: TailwindBrandingOptions
): string {
  const lines = [
    branding.managedComment,
    '@layer base, components, utilities;',
    '',
    plan.imports[0],
    '',
    ...plan.sources.map((source) => `@source "${source}";`),
    '',
    plan.imports[1],
  ];

  return `${lines.join('\n')}\n`;
}

/**
 *
 */
export function hasManagedImport(content: string, importLine: string): boolean {
  return content.includes(importLine);
}

/**
 *
 */
export function hasRecognizedInlineSetup(content: string): boolean {
  return content.split('\n').some((line) => isRecognizedSetupDirective(line));
}

/**
 *
 */
export function normalizeEntryStylesheet(content: string, importLine: string): string {
  const escapedImportLine = importLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const contentWithoutManagedImport = content.replace(
    new RegExp(`^${escapedImportLine}\\s*(?:\\r?\\n){0,2}`),
    ''
  );
  const lines = contentWithoutManagedImport.split('\n');
  let index = 0;
  let foundRecognizedSetup = false;
  let inBlockComment = false;

  while (index < lines.length) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (inBlockComment) {
      index += 1;
      if (trimmedLine.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmedLine === '') {
      index += 1;
      continue;
    }

    if (trimmedLine.startsWith('/*')) {
      inBlockComment = !trimmedLine.includes('*/');
      index += 1;
      continue;
    }

    if (trimmedLine.startsWith('*') || trimmedLine.startsWith('*/')) {
      index += 1;
      continue;
    }

    if (isRecognizedSetupDirective(line)) {
      foundRecognizedSetup = true;
      index += 1;
      continue;
    }

    break;
  }

  let remainingContent = (
    foundRecognizedSetup ? lines.slice(index).join('\n') : contentWithoutManagedImport
  ).trimStart();

  if (!foundRecognizedSetup && hasRecognizedInlineSetup(contentWithoutManagedImport)) {
    const fallbackIndex = lines.findIndex((line) => isAppSpecificStart(line));
    if (fallbackIndex !== -1) {
      remainingContent = lines.slice(fallbackIndex).join('\n').trimStart();
    }
  }

  const normalizedBody = `${importLine}${remainingContent.length > 0 ? `\n\n${remainingContent}` : ''}`;

  return normalizedBody.endsWith('\n') ? normalizedBody : `${normalizedBody}\n`;
}

/**
 *
 */
export function readIfExists(filePath: string): string | null {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}
