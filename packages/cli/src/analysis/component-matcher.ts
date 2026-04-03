import type { ComponentCatalog, HtmlElementLibrary, SourceLibrary } from '../catalog';
import type { ScannedFile } from './scanner';

export interface ComponentMatch {
  name: string;
  sourceLibrary: string | null;
  sourceImport: string;
  ozTarget: string | null;
  effort: 'low' | 'medium' | 'high' | 'unknown';
  category: 'ui' | 'field' | 'unknown';
  capabilities: string[];
  usageCount: number;
  files: string[];
  notes: string;
}

interface ImportInfo {
  source: string;
  specifiers: string[];
}

function extractImports(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const importRegex = /import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/g;

  for (const match of content.matchAll(importRegex)) {
    const namedImports = match[1];
    const namespaceImport = match[2];
    const defaultImport = match[3];
    const source = match[4];

    const specifiers: string[] = [];
    if (namedImports) {
      for (const spec of namedImports.split(',')) {
        const name = spec
          .trim()
          .split(/\s+as\s+/)[0]
          .trim();
        if (name) specifiers.push(name);
      }
    }
    if (namespaceImport) {
      specifiers.push(namespaceImport);
    }
    if (defaultImport) {
      specifiers.push(defaultImport);
    }

    imports.push({ source, specifiers });
  }

  return imports;
}

function countJsxUsage(content: string, componentName: string): number {
  const openTagRegex = new RegExp(`<${componentName}[\\s/.>]`, 'g');
  return [...content.matchAll(openTagRegex)].length;
}

/**
 *
 */
export function analyzeComponents(
  files: ScannedFile[],
  catalog: ComponentCatalog,
  sourceLibraries: Record<string, SourceLibrary>
): ComponentMatch[] {
  const matchMap = new Map<string, ComponentMatch>();

  for (const file of files) {
    const imports = extractImports(file.content);

    for (const imp of imports) {
      // Skip OZ imports (already migrated)
      if (imp.source.startsWith('@openzeppelin/')) continue;

      for (const specifier of imp.specifiers) {
        const usageCount = countJsxUsage(file.content, specifier);
        if (usageCount === 0) continue;

        const existing = matchMap.get(specifier);

        if (existing) {
          existing.usageCount += usageCount;
          if (!existing.files.includes(file.relativePath)) {
            existing.files.push(file.relativePath);
          }
          continue;
        }

        let ozTarget: string | null = null;
        let effort: ComponentMatch['effort'] = 'unknown';
        let category: ComponentMatch['category'] = 'unknown';
        let capabilities: string[] = [];
        let notes = '';
        let sourceLibrary: string | null = null;

        // Check against OZ catalog
        if (catalog.components[specifier]) {
          const ozComp = catalog.components[specifier];
          ozTarget = specifier;
          category = ozComp.category;
          capabilities = ozComp.capabilities;
          effort = 'low';
          notes = 'Direct name match in OZ catalog';
        }

        // Check source library mappings
        for (const [libKey, library] of Object.entries(sourceLibraries)) {
          const isFromLibrary = library.importPatterns.some((p) => imp.source.includes(p));
          if (!isFromLibrary) continue;

          sourceLibrary = libKey;
          const mapping = library.mappings[specifier];
          if (mapping) {
            ozTarget = specifier;
            effort = mapping.effort;
            notes = mapping.notes;
          }
          break;
        }

        matchMap.set(specifier, {
          name: specifier,
          sourceLibrary,
          sourceImport: imp.source,
          ozTarget,
          effort,
          category,
          capabilities,
          usageCount,
          files: [file.relativePath],
          notes,
        });
      }
    }
  }

  return [...matchMap.values()].sort((a, b) => b.usageCount - a.usageCount);
}

const HTML_TAG_PATTERNS: Record<string, RegExp> = {
  button: /<button[\s>]/g,
  select: /<select[\s>]/g,
  textarea: /<textarea[\s>/]/g,
  label: /<label[\s>]/g,
  progress: /<progress[\s>]/g,
  dialog: /<dialog[\s>]/g,
};

const INPUT_TYPE_REGEX = /<input\b([^>]*)>/g;

function parseInputType(attrs: string): string {
  const typeMatch = attrs.match(/type\s*=\s*["']([^"']+)["']/);
  if (!typeMatch) return 'text';
  return typeMatch[1].toLowerCase();
}

function resolveInputOzTarget(inputType: string): string | null {
  switch (inputType) {
    case 'text':
    case 'password':
    case 'email':
    case 'url':
    case 'tel':
    case 'search':
    case 'number':
      return 'Input';
    case 'checkbox':
      return 'Checkbox';
    case 'radio':
      return 'RadioGroup';
    default:
      return null;
  }
}

export function analyzeHtmlElements(
  files: ScannedFile[],
  htmlLib: HtmlElementLibrary
): ComponentMatch[] {
  const matchMap = new Map<string, ComponentMatch>();

  function getOrCreate(ozTarget: string): ComponentMatch {
    let match = matchMap.get(ozTarget);
    if (!match) {
      const mapping = htmlLib.mappings[ozTarget];
      match = {
        name: ozTarget,
        sourceLibrary: 'html-elements',
        sourceImport: '',
        ozTarget,
        effort: mapping?.effort ?? 'unknown',
        category: 'unknown',
        capabilities: [],
        usageCount: 0,
        files: [],
        notes: mapping?.notes ?? '',
      };
      matchMap.set(ozTarget, match);
    }
    return match;
  }

  for (const file of files) {
    for (const [, regex] of Object.entries(HTML_TAG_PATTERNS)) {
      const tagName = regex.source.match(/<(\w+)/)?.[1];
      if (!tagName) continue;

      const ozTarget = Object.entries(htmlLib.mappings).find(([, m]) => m.source === tagName)?.[0];
      if (!ozTarget) continue;

      const freshRegex = new RegExp(regex.source, regex.flags);
      const matches = [...file.content.matchAll(freshRegex)];
      if (matches.length === 0) continue;

      const entry = getOrCreate(ozTarget);
      entry.usageCount += matches.length;
      if (!entry.files.includes(file.relativePath)) {
        entry.files.push(file.relativePath);
      }
    }

    const freshInputRegex = new RegExp(INPUT_TYPE_REGEX.source, INPUT_TYPE_REGEX.flags);
    for (const inputMatch of file.content.matchAll(freshInputRegex)) {
      const attrs = inputMatch[1];
      const inputType = parseInputType(attrs);
      const ozTarget = resolveInputOzTarget(inputType);
      if (!ozTarget) continue;

      const entry = getOrCreate(ozTarget);
      entry.usageCount += 1;
      if (!entry.files.includes(file.relativePath)) {
        entry.files.push(file.relativePath);
      }
    }
  }

  return [...matchMap.values()].sort((a, b) => b.usageCount - a.usageCount);
}
