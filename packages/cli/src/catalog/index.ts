import fs from 'node:fs';
import path from 'node:path';

import { getCatalogPath } from '../utils/paths';

export interface ComponentEntry {
  package: string;
  importPath: string;
  category: 'ui' | 'field';
  capabilities: string[];
}

export interface SourceLibraryMapping {
  source: string;
  effort: 'low' | 'medium' | 'high';
  notes: string;
  propMappings?: Record<string, string>;
  variantMap?: Record<string, string>;
  incompatible?: string[];
}

export interface SourceLibrary {
  library: string;
  importPatterns: string[];
  mappings: Record<string, SourceLibraryMapping>;
}

export interface HtmlElementLibrary extends SourceLibrary {
  htmlTags: true;
}

export interface ComponentCatalog {
  catalogVersion: string;
  generatedAt: string;
  components: Record<string, ComponentEntry>;
  capabilities: string[];
}

let cachedCatalog: ComponentCatalog | null = null;
let cachedSourceLibraries: Record<string, SourceLibrary> | null = null;
let cachedHtmlElements: HtmlElementLibrary | null | undefined = undefined;

/**
 *
 */
export function loadCatalog(): ComponentCatalog {
  if (cachedCatalog) return cachedCatalog;

  const catalogPath = path.join(getCatalogPath(), 'component-mappings.json');
  cachedCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as ComponentCatalog;
  return cachedCatalog;
}

/**
 *
 */
export function loadSourceLibraries(): Record<string, SourceLibrary> {
  if (cachedSourceLibraries) return cachedSourceLibraries;

  const librariesDir = path.join(getCatalogPath(), 'source-libraries');
  const libraries: Record<string, SourceLibrary> = {};

  if (!fs.existsSync(librariesDir)) return libraries;

  for (const file of fs.readdirSync(librariesDir)) {
    if (!file.endsWith('.json')) continue;
    const key = file.replace('.json', '');
    libraries[key] = JSON.parse(
      fs.readFileSync(path.join(librariesDir, file), 'utf8')
    ) as SourceLibrary;
  }

  cachedSourceLibraries = libraries;
  return libraries;
}

export function loadHtmlElementMappings(): HtmlElementLibrary | null {
  if (cachedHtmlElements !== undefined) return cachedHtmlElements;

  const filePath = path.join(getCatalogPath(), 'source-libraries', 'html-elements.json');
  if (!fs.existsSync(filePath)) {
    cachedHtmlElements = null;
    return null;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as HtmlElementLibrary;
  if (!raw.htmlTags) {
    cachedHtmlElements = null;
    return null;
  }

  cachedHtmlElements = raw;
  return cachedHtmlElements;
}

export function detectSourceLibrary(
  imports: string[]
): { key: string; library: SourceLibrary } | null {
  const libraries = loadSourceLibraries();

  for (const [key, library] of Object.entries(libraries)) {
    const matched = imports.some((imp) =>
      library.importPatterns.some((pattern) => imp.includes(pattern))
    );
    if (matched) return { key, library };
  }

  return null;
}
