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
  reportName?: 'imported' | 'target';
  propMappings?: Record<string, string>;
  variantMap?: Record<string, string>;
  incompatible?: string[];
}

export interface SourceLibrary {
  library: string;
  packages?: string[];
  importPatterns: string[];
  namespaceImportStrategy?: 'binding' | 'package-name';
  namespaceReportName?: 'imported' | 'target';
  catalogFallback?: boolean;
  mappings: Record<string, SourceLibraryMapping>;
}

export interface HtmlElementLibrary extends SourceLibrary {
  htmlTags: true;
}

export type PatternCategory =
  | 'wallet'
  | 'storage'
  | 'tailwind'
  | 'oz-existing'
  | 'data-fetching'
  | 'form'
  | 'utility';

export type PatternRuleKind = 'import' | 'content';

export type PatternRuleConfidence = 'high' | 'medium' | 'low';

export interface PatternImportMatcher {
  packages: string[];
  matchMode?: 'exact' | 'package-or-subpath';
}

export interface PatternContentMatcher {
  regex: string;
  flags?: string;
}

export interface PatternRule {
  id: string;
  displayName: string;
  canonicalPattern: string;
  category: PatternCategory;
  kind: PatternRuleKind;
  description: string;
  confidence?: PatternRuleConfidence;
  migrationRelevance?: string;
  matcher: PatternImportMatcher | PatternContentMatcher;
}

export interface PatternCatalog {
  catalogVersion: string;
  generatedAt: string;
  rules: PatternRule[];
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
let cachedPatternCatalog: PatternCatalog | null = null;

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

/** @description Loads migration-relevant pattern scanning rules from the catalog. */
export function loadPatternCatalog(): PatternCatalog {
  if (cachedPatternCatalog) return cachedPatternCatalog;

  const catalogPath = path.join(getCatalogPath(), 'patterns.json');
  cachedPatternCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as PatternCatalog;
  return cachedPatternCatalog;
}

/** @description Loads native HTML element to OZ component mappings from the catalog. */
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

/** @description Identifies which cataloged source library matches the given import paths. */
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
