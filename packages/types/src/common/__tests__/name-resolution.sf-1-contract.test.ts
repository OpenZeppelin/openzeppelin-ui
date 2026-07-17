/**
 * SF-1 contract boundary probes — source-token and package-metadata gates that
 * complement the type-level suite in `name-resolution.types.test.ts`.
 *
 * Verifies: INV-165, INV-167 (JSDoc contract), INV-172, INV-174, INV-175 (source half).
 */
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const NAME_RESOLUTION_SOURCE = readFileSync(
  new URL('../name-resolution.ts', import.meta.url),
  'utf-8'
);
const PACKAGE_JSON = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf-8')
) as { dependencies?: Record<string, string> };

const LOCKED_FALLBACK_FIELD_NAMES = [
  'resolvedViaNetworkFallback',
  'resolvedOnNetworkId',
  'queriedOnNetworkId',
] as const;

const REJECTED_ALIASES = [
  'foundOnNetworkId',
  'fallbackNetwork',
  'missNetworkId',
  'boundNetworkId',
] as const;

const REJECTED_ECOSYSTEM_BASE_FIELDS = [
  'coinType',
  'ensVersion',
  'system',
  'mechanism',
  'gateway',
  'version',
] as const;

describe('INV-165: cross-repo field identifiers are verbatim — no aliases in ui-types', () => {
  it('declares exactly the three locked fallback property names on ResolutionProvenance', () => {
    for (const field of LOCKED_FALLBACK_FIELD_NAMES) {
      expect(
        NAME_RESOLUTION_SOURCE,
        `ResolutionProvenance must declare locked field "${field}"`
      ).toMatch(new RegExp(`readonly\\s+${field}\\??:`));
    }
  });

  it('does not introduce UI-ergonomic alias property names', () => {
    for (const alias of REJECTED_ALIASES) {
      expect(
        NAME_RESOLUTION_SOURCE,
        `alias "${alias}" must not appear as a ResolutionProvenance field`
      ).not.toMatch(new RegExp(`readonly\\s+${alias}\\??:`));
    }
  });
});

describe('INV-167: resolvedViaNetworkFallback === true is the sole chain-agnostic fallback discriminant', () => {
  it('documents that downstream MUST NOT infer fallback from label, external, or absent scopedToNetworkId', () => {
    expect(NAME_RESOLUTION_SOURCE).toMatch(
      /MUST NOT infer fallback from `label`, `external`, or absent `scopedToNetworkId`/
    );
  });
});

describe('INV-172: SF-1 adds zero runtime code from name-resolution.ts', () => {
  it('exports no runtime functions, classes, or const values from the module', () => {
    expect(NAME_RESOLUTION_SOURCE).not.toMatch(/\bexport\s+(function|class|const|enum)\b/);
    expect(NAME_RESOLUTION_SOURCE).not.toMatch(/\bexport\s+async\s+function\b/);
  });
});

describe('INV-174: @openzeppelin/ui-types remains dependency-free after SF-1', () => {
  it('has no runtime dependencies in package.json', () => {
    expect(PACKAGE_JSON.dependencies ?? {}).toEqual({});
  });

  it('does not import value symbols from ecosystem packages in name-resolution.ts', () => {
    expect(NAME_RESOLUTION_SOURCE).not.toMatch(
      /^import\s+(?!type\s)[^;]+from\s+['"]@ensdomains\//m
    );
    expect(NAME_RESOLUTION_SOURCE).not.toMatch(/^import\s+(?!type\s)[^;]+from\s+['"]viem/m);
  });
});

describe('INV-175: chain-agnostic base fields only — no ENS-specific surface in ui-types', () => {
  it('does not add ecosystem-specific fields to the ResolutionProvenance interface', () => {
    const provenanceBlock = NAME_RESOLUTION_SOURCE.slice(
      NAME_RESOLUTION_SOURCE.indexOf('export interface ResolutionProvenance'),
      NAME_RESOLUTION_SOURCE.indexOf('export interface ResolvedName')
    );
    for (const field of REJECTED_ECOSYSTEM_BASE_FIELDS) {
      expect(
        provenanceBlock,
        `ecosystem field "${field}" must not appear on base ResolutionProvenance`
      ).not.toMatch(new RegExp(`readonly\\s+${field}\\??:`));
    }
  });
});
