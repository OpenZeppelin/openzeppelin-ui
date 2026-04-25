import {
  loadPatternCatalog,
  type PatternCategory,
  type PatternContentMatcher,
  type PatternImportMatcher,
  type PatternRule,
  type PatternRuleConfidence,
  type PatternRuleKind,
} from '../catalog';
import type { ScannedFile } from './scanner';

export interface PatternEvidence {
  kind: 'import-source' | 'content-match';
  matchedValue: string;
  snippet: string;
  line: number | null;
}

export interface PatternObservation {
  ruleId: string;
  pattern: string;
  canonicalPattern: string;
  variant: string;
  category: PatternCategory;
  kind: PatternRuleKind;
  confidence: PatternRuleConfidence;
  description: string;
  migrationRelevance: string | null;
  file: string;
  count: number;
  evidences: PatternEvidence[];
}

export interface PatternMatch {
  pattern: string;
  canonicalPattern: string;
  category: PatternCategory;
  files: string[];
  count: number;
  description: string;
  variants: string[];
  kinds: PatternRuleKind[];
  confidence: PatternRuleConfidence;
  migrationRelevance: string | null;
  evidences: PatternEvidence[];
  ruleIds: string[];
}

export interface CanonicalPatternMatch extends Omit<PatternMatch, 'pattern'> {
  pattern: string;
}

interface ExtractedImport {
  source: string;
  statement: string;
  line: number;
}

interface FilePatternFacts {
  file: ScannedFile;
  imports: ExtractedImport[];
}

const IMPORT_PATTERNS = [
  /\bimport\s+[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g,
  /\bexport\s+[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
];

/** Dynamic `import('specifier')` — structural; wallet/OZ packages are often loaded lazily. */
const DYNAMIC_IMPORT_PATTERN = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function countLineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

function readLineAt(content: string, index: number): string {
  const lineStart = content.lastIndexOf('\n', index - 1) + 1;
  const lineEnd = content.indexOf('\n', index);
  return content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
}

function extractImports(file: ScannedFile): ExtractedImport[] {
  const imports: ExtractedImport[] = [];
  const seen = new Set<string>();

  const pushMatch = (source: string, index: number) => {
    if (!source) return;
    const line = countLineNumber(file.content, index);
    const key = `${source}\0${line}`;
    if (seen.has(key)) return;
    seen.add(key);
    imports.push({
      source,
      statement: readLineAt(file.content, index),
      line,
    });
  };

  for (const pattern of IMPORT_PATTERNS) {
    for (const match of file.content.matchAll(pattern)) {
      if (match[1] === undefined || match.index === undefined) continue;
      pushMatch(match[1], match.index);
    }
  }

  for (const match of file.content.matchAll(DYNAMIC_IMPORT_PATTERN)) {
    if (match[1] === undefined || match.index === undefined) continue;
    pushMatch(match[1], match.index);
  }

  return imports;
}

function isImportMatcher(matcher: PatternRule['matcher']): matcher is PatternImportMatcher {
  return 'packages' in matcher;
}

function isContentMatcher(matcher: PatternRule['matcher']): matcher is PatternContentMatcher {
  return 'regex' in matcher;
}

function matchesPackage(source: string, matcher: PatternImportMatcher): boolean {
  const mode = matcher.matchMode ?? 'exact';

  return matcher.packages.some((pkg) => {
    if (mode === 'exact') return source === pkg;

    if (source === pkg || source.startsWith(`${pkg}/`)) {
      return true;
    }

    return pkg.endsWith('-') && source.startsWith(pkg);
  });
}

function mergeConfidence(
  current: PatternRuleConfidence,
  next: PatternRuleConfidence
): PatternRuleConfidence {
  const rank: Record<PatternRuleConfidence, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };

  return rank[next] < rank[current] ? next : current;
}

function createImportObservation(
  file: ScannedFile,
  rule: PatternRule,
  matches: ExtractedImport[]
): PatternObservation {
  return {
    ruleId: rule.id,
    pattern: rule.displayName,
    canonicalPattern: rule.canonicalPattern,
    variant: rule.displayName,
    category: rule.category,
    kind: rule.kind,
    confidence: rule.confidence ?? 'medium',
    description: rule.description,
    migrationRelevance: rule.migrationRelevance ?? null,
    file: file.relativePath,
    count: matches.length,
    evidences: matches.map((match) => ({
      kind: 'import-source',
      matchedValue: match.source,
      snippet: match.statement,
      line: match.line,
    })),
  };
}

function createContentObservation(
  file: ScannedFile,
  rule: PatternRule,
  matches: RegExpMatchArray[]
): PatternObservation {
  return {
    ruleId: rule.id,
    pattern: rule.displayName,
    canonicalPattern: rule.canonicalPattern,
    variant: rule.displayName,
    category: rule.category,
    kind: rule.kind,
    confidence: rule.confidence ?? 'medium',
    description: rule.description,
    migrationRelevance: rule.migrationRelevance ?? null,
    file: file.relativePath,
    count: matches.length,
    evidences: matches.map((match) => ({
      kind: 'content-match',
      matchedValue: match[0],
      snippet: readLineAt(file.content, match.index ?? 0),
      line: match.index === undefined ? null : countLineNumber(file.content, match.index),
    })),
  };
}

function createFilePatternFacts(files: ScannedFile[]): FilePatternFacts[] {
  return files.map((file) => ({
    file,
    imports: extractImports(file),
  }));
}

function scanFileWithRule(
  fileFacts: FilePatternFacts,
  rule: PatternRule
): PatternObservation | null {
  const { file, imports } = fileFacts;

  if (rule.kind === 'import' && isImportMatcher(rule.matcher)) {
    const matcher = rule.matcher;
    const matches = imports.filter((entry) => matchesPackage(entry.source, matcher));
    return matches.length > 0 ? createImportObservation(file, rule, matches) : null;
  }

  if (rule.kind === 'content' && isContentMatcher(rule.matcher)) {
    const matcher = new RegExp(rule.matcher.regex, rule.matcher.flags ?? 'g');
    const matches = [...file.content.matchAll(matcher)];
    return matches.length > 0 ? createContentObservation(file, rule, matches) : null;
  }

  return null;
}

/**
 *
 */
export function scanPatternObservations(files: ScannedFile[]): PatternObservation[] {
  const { rules } = loadPatternCatalog();
  const fileFacts = createFilePatternFacts(files);
  const observations: PatternObservation[] = [];

  for (const facts of fileFacts) {
    for (const rule of rules) {
      const observation = scanFileWithRule(facts, rule);
      if (observation) observations.push(observation);
    }
  }

  return observations.sort((a, b) => {
    if (a.pattern === b.pattern) {
      return a.file.localeCompare(b.file);
    }

    return a.pattern.localeCompare(b.pattern);
  });
}

/** @description Aggregates raw pattern observations by detected pattern variant. */
export function scanPatterns(files: ScannedFile[]): PatternMatch[] {
  const observations = scanPatternObservations(files);
  const results = new Map<string, PatternMatch>();

  for (const observation of observations) {
    const existing = results.get(observation.variant);
    if (!existing) {
      results.set(observation.variant, {
        pattern: observation.variant,
        canonicalPattern: observation.canonicalPattern,
        category: observation.category,
        files: [observation.file],
        count: observation.count,
        description: observation.description,
        variants: [observation.variant],
        kinds: [observation.kind],
        confidence: observation.confidence,
        migrationRelevance: observation.migrationRelevance,
        evidences: [...observation.evidences],
        ruleIds: [observation.ruleId],
      });
      continue;
    }

    existing.count += observation.count;
    if (!existing.files.includes(observation.file)) {
      existing.files.push(observation.file);
    }
    if (!existing.variants.includes(observation.variant)) {
      existing.variants.push(observation.variant);
    }
    if (!existing.kinds.includes(observation.kind)) {
      existing.kinds.push(observation.kind);
    }
    if (!existing.ruleIds.includes(observation.ruleId)) {
      existing.ruleIds.push(observation.ruleId);
    }
    existing.confidence = mergeConfidence(existing.confidence, observation.confidence);
    existing.evidences.push(...observation.evidences);
    existing.migrationRelevance ??= observation.migrationRelevance;
  }

  return [...results.values()].sort((a, b) => a.pattern.localeCompare(b.pattern));
}

/** @description Aggregates raw pattern observations into canonical pattern families. */
export function scanCanonicalPatterns(files: ScannedFile[]): CanonicalPatternMatch[] {
  const observations = scanPatternObservations(files);
  const results = new Map<string, CanonicalPatternMatch>();

  for (const observation of observations) {
    const existing = results.get(observation.canonicalPattern);
    if (!existing) {
      results.set(observation.canonicalPattern, {
        pattern: observation.canonicalPattern,
        canonicalPattern: observation.canonicalPattern,
        category: observation.category,
        files: [observation.file],
        count: observation.count,
        description: observation.description,
        variants: [observation.variant],
        kinds: [observation.kind],
        confidence: observation.confidence,
        migrationRelevance: observation.migrationRelevance,
        evidences: [...observation.evidences],
        ruleIds: [observation.ruleId],
      });
      continue;
    }

    existing.count += observation.count;
    if (!existing.files.includes(observation.file)) {
      existing.files.push(observation.file);
    }
    if (!existing.variants.includes(observation.variant)) {
      existing.variants.push(observation.variant);
    }
    if (!existing.kinds.includes(observation.kind)) {
      existing.kinds.push(observation.kind);
    }
    if (!existing.ruleIds.includes(observation.ruleId)) {
      existing.ruleIds.push(observation.ruleId);
    }
    existing.confidence = mergeConfidence(existing.confidence, observation.confidence);
    existing.evidences.push(...observation.evidences);
    existing.migrationRelevance ??= observation.migrationRelevance;
  }

  return [...results.values()].sort((a, b) => a.pattern.localeCompare(b.pattern));
}
