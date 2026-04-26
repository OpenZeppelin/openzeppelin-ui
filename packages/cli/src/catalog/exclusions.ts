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

function readExclusionListFile(filePath: string): ExclusionList {
  const data: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { excludedLibraries: [], excludedPatterns: [] };
  }
  const o = data as Record<string, unknown>;
  const excludedLibraries = Array.isArray(o.excludedLibraries)
    ? o.excludedLibraries.filter((e): e is string => typeof e === 'string')
    : [];
  const excludedPatterns = Array.isArray(o.excludedPatterns)
    ? o.excludedPatterns.filter((e): e is string => typeof e === 'string')
    : [];

  let walletPatternPathExclusions: ExclusionList['walletPatternPathExclusions'];
  if (
    o.walletPatternPathExclusions &&
    typeof o.walletPatternPathExclusions === 'object' &&
    o.walletPatternPathExclusions !== null
  ) {
    const w = o.walletPatternPathExclusions as Record<string, unknown>;
    const next: NonNullable<ExclusionList['walletPatternPathExclusions']> = {};
    for (const [key, val] of Object.entries(w)) {
      if (Array.isArray(val) && val.every((v): v is string => typeof v === 'string')) {
        next[key] = val;
      }
    }
    walletPatternPathExclusions = Object.keys(next).length > 0 ? next : undefined;
  }

  return { excludedLibraries, excludedPatterns, walletPatternPathExclusions };
}

/** @description Loads and caches catalog exclusion rules from exclusions.json. */
export function loadExclusions(): ExclusionList {
  if (cached) return cached;

  const filePath = path.join(getCatalogPath(), 'exclusions.json');
  if (!fs.existsSync(filePath)) {
    cached = { excludedLibraries: [], excludedPatterns: [] };
    return cached;
  }

  cached = readExclusionListFile(filePath);
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
