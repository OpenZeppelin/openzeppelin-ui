/**
 * Deterministic code rewriter for the migrate-to-oz-uikit system.
 *
 * Handles the 80% case: import swaps and prop renames.
 * Complex scenarios (layout restructuring, logic migration) are deferred
 * to AI-assisted editing via the orchestration skill.
 */

import type { MigrationTask } from '../manifest/schema.js';

export interface RewriteContext {
  propMappings?: Record<string, string>;
  variantMap?: Record<string, string>;
  targetPackage?: string;
  targetImportPath?: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewriteImports(
  content: string,
  sourceComponent: string,
  targetComponent: string,
  targetPackage: string
): string {
  let result = content;

  const importRegex = new RegExp(
    `import\\s*\\{([^}]*\\b${escapeRegex(sourceComponent)}\\b[^}]*)\\}\\s*from\\s*['"][^'"]+['"]`,
    'g'
  );

  const matches = [...result.matchAll(importRegex)];

  for (const match of matches) {
    const fullImport = match[0];
    const importList = match[1];

    if (fullImport.includes('@openzeppelin/')) continue;

    const specifiers = importList
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const remaining = specifiers.filter((s) => {
      const name = s.includes(' as ') ? s.split(' as ')[0].trim() : s;
      return name !== sourceComponent;
    });

    if (remaining.length > 0) {
      const newImport = fullImport.replace(importList, ` ${remaining.join(', ')} `);
      result = result.replace(fullImport, newImport);
    } else {
      result = result.replace(fullImport, '');
    }
  }

  const ozImportRegex = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegex(targetPackage)}['"]`
  );
  const ozMatch = result.match(ozImportRegex);

  if (ozMatch) {
    const existingSpecifiers = ozMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!existingSpecifiers.includes(targetComponent)) {
      existingSpecifiers.push(targetComponent);
      const newImportList = existingSpecifiers.join(', ');
      result = result.replace(ozMatch[0], `import { ${newImportList} } from '${targetPackage}'`);
    }
  } else {
    const lastImportIdx = result.lastIndexOf('import ');
    if (lastImportIdx >= 0) {
      const lineEnd = result.indexOf('\n', lastImportIdx);
      const insertAt = lineEnd >= 0 ? lineEnd + 1 : result.length;
      const ozImport = `import { ${targetComponent} } from '${targetPackage}';\n`;
      result = result.slice(0, insertAt) + ozImport + result.slice(insertAt);
    } else {
      result = `import { ${targetComponent} } from '${targetPackage}';\n${result}`;
    }
  }

  result = result.replace(/^\s*\n{2,}/gm, '\n');

  return result;
}

function rewriteJsx(content: string, sourceComponent: string, targetComponent: string): string {
  if (sourceComponent === targetComponent) return content;

  const tagRegex = new RegExp(`(<\\/?)${escapeRegex(sourceComponent)}(\\s|>|\\/)`, 'g');

  return content.replace(tagRegex, `$1${targetComponent}$2`);
}

function applyPropMappings(
  content: string,
  targetComponent: string,
  propMappings: Record<string, string>
): string {
  let result = content;

  for (const [oldProp, newProp] of Object.entries(propMappings)) {
    const propRegex = new RegExp(
      `(<${escapeRegex(targetComponent)}[^>]*?)\\b${escapeRegex(oldProp)}(\\s*=)`,
      'g'
    );
    result = result.replace(propRegex, `$1${newProp}$2`);
  }

  return result;
}

/** @description Rewrites file content for a migration task: imports, JSX tags, and optional prop mappings. */
export function rewriteFile(
  task: MigrationTask,
  content: string,
  context: RewriteContext = {}
): string {
  const source = task.sourceComponent;
  const target = task.targetComponent;

  if (!source || !target) return content;

  const targetPackage = context.targetPackage ?? '@openzeppelin/ui-components';

  let result = rewriteImports(content, source, target, targetPackage);
  result = rewriteJsx(result, source, target);

  if (context.propMappings && Object.keys(context.propMappings).length > 0) {
    result = applyPropMappings(result, target, context.propMappings);
  }

  return result;
}
