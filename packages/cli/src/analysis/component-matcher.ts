import type { ComponentCatalog, SourceLibrary } from '../catalog';
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
  const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;

  for (const match of content.matchAll(importRegex)) {
    const namedImports = match[1];
    const defaultImport = match[2];
    const source = match[3];

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
    if (defaultImport) {
      specifiers.push(defaultImport);
    }

    imports.push({ source, specifiers });
  }

  return imports;
}

function countJsxUsage(content: string, componentName: string): number {
  const openTagRegex = new RegExp(`<${componentName}[\\s/>]`, 'g');
  return [...content.matchAll(openTagRegex)].length;
}

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
