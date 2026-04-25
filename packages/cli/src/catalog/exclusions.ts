import fs from 'node:fs';
import path from 'node:path';

import { getCatalogPath } from '../utils/paths';

export interface ExclusionList {
  excludedLibraries: string[];
  excludedPatterns: string[];
  /** When set, skip wallet-adapter tasks for a pattern when the file path includes any of these substrings. */
  walletPatternPathExclusions?: Record<string, string[]>;
}

let cached: ExclusionList | null = null;

/** @description Loads and caches catalog exclusion rules from exclusions.json. */
export function loadExclusions(): ExclusionList {
  if (cached) return cached;

  const filePath = path.join(getCatalogPath(), 'exclusions.json');
  if (!fs.existsSync(filePath)) {
    cached = { excludedLibraries: [], excludedPatterns: [] };
    return cached;
  }

  cached = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ExclusionList;
  return cached;
}

/** @description Returns whether an import path matches an excluded third-party library. */
export function isExcludedLibrary(importPath: string): boolean {
  const exclusions = loadExclusions();
  return exclusions.excludedLibraries.some((lib) => importPath.includes(lib));
}

/** @description Returns whether an import path matches an excluded pattern substring. */
export function isExcludedPattern(importPath: string): boolean {
  const exclusions = loadExclusions();
  return exclusions.excludedPatterns.some((pat) => importPath.includes(pat));
}
