// @vitest-environment node
/**
 * SF-2 · Cross-network fallback classifier helpers — triplet integrity tests.
 *
 * Verifies:
 *   - INV-F1 — strict `resolvedViaNetworkFallback === true` gate
 *   - INV-F2 — both network ids non-empty when flag is true
 *   - INV-F3 — Principle II: base fallback fields only; no ENS imports
 *   - INV-F4 — orthogonality: `scopedToNetworkId` does not affect classification
 *   - SC-002 — 100% true-positive / true-negative discrimination on triplet matrix
 */
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

import type { CrossNetworkFallbackProvenance } from './nameResolutionFallback';
import {
  crossNetworkFallbackMessageNames,
  getFallbackNetworks,
  isCrossNetworkFallback,
  nameResolutionCrossNetworkFallbackMessage,
  networkDisplayName,
} from './nameResolutionFallback';

const FALLBACK_SOURCE = readFileSync(
  new URL('./nameResolutionFallback.ts', import.meta.url),
  'utf-8'
);

/** Golden complete triplet — mirrors SF-1 design fixture (Sepolia miss → mainnet hit). */
const GOLDEN_COMPLETE_TRIPLET = {
  resolvedViaNetworkFallback: true,
  queriedOnNetworkId: 'ethereum-sepolia',
  resolvedOnNetworkId: 'ethereum-mainnet',
} as const satisfies CrossNetworkFallbackProvenance;

/**
 * Triplet integrity matrix rows (adapters SF-2 / SF-1 design).
 * SF-2 classifiers must reject every invalid row and accept only the canonical shape.
 */
const TRIPLET_MATRIX = [
  {
    label: 'canonical complete triplet',
    provenance: GOLDEN_COMPLETE_TRIPLET,
    expected: true,
  },
  {
    label: 'flag true, queried id absent',
    provenance: {
      resolvedViaNetworkFallback: true,
      resolvedOnNetworkId: 'ethereum-mainnet',
    },
    expected: false,
  },
  {
    label: 'flag true, resolved id absent',
    provenance: {
      resolvedViaNetworkFallback: true,
      queriedOnNetworkId: 'ethereum-sepolia',
    },
    expected: false,
  },
  {
    label: 'flag true, queried id empty string',
    provenance: {
      resolvedViaNetworkFallback: true,
      queriedOnNetworkId: '',
      resolvedOnNetworkId: 'ethereum-mainnet',
    },
    expected: false,
  },
  {
    label: 'flag true, resolved id empty string',
    provenance: {
      resolvedViaNetworkFallback: true,
      queriedOnNetworkId: 'ethereum-sepolia',
      resolvedOnNetworkId: '',
    },
    expected: false,
  },
  {
    label: 'flag false with both ids present (orphan ids)',
    provenance: {
      resolvedViaNetworkFallback: false,
      queriedOnNetworkId: 'ethereum-sepolia',
      resolvedOnNetworkId: 'ethereum-mainnet',
    },
    expected: false,
  },
  {
    label: 'flag absent with both ids present (orphan ids)',
    provenance: {
      queriedOnNetworkId: 'ethereum-sepolia',
      resolvedOnNetworkId: 'ethereum-mainnet',
    },
    expected: false,
  },
  {
    label: 'non-fallback: empty provenance slice',
    provenance: {},
    expected: false,
  },
  {
    label: 'non-fallback: flag explicitly false, ids absent',
    provenance: { resolvedViaNetworkFallback: false },
    expected: false,
  },
  {
    label: 'bound-local record without fallback flag',
    provenance: { scopedToNetworkId: 'ethereum-sepolia' } as CrossNetworkFallbackProvenance & {
      scopedToNetworkId: string;
    },
    expected: false,
  },
] as const satisfies ReadonlyArray<{
  label: string;
  provenance: CrossNetworkFallbackProvenance;
  expected: boolean;
}>;

describe('SC-002 / triplet matrix: isCrossNetworkFallback discrimination', () => {
  it.each(TRIPLET_MATRIX)('$label → $expected', ({ provenance, expected }) => {
    expect(
      isCrossNetworkFallback(provenance),
      `isCrossNetworkFallback must be ${expected} for "${provenance}"`
    ).toBe(expected);
  });
});

describe('INV-F1: resolvedViaNetworkFallback === true is the sole activation gate', () => {
  it('returns true only for strict boolean true, not truthy coercion', () => {
    expect(isCrossNetworkFallback(GOLDEN_COMPLETE_TRIPLET)).toBe(true);
    expect(
      isCrossNetworkFallback({
        resolvedViaNetworkFallback: false,
        queriedOnNetworkId: 'ethereum-sepolia',
        resolvedOnNetworkId: 'ethereum-mainnet',
      })
    ).toBe(false);
    expect(
      isCrossNetworkFallback({
        queriedOnNetworkId: 'ethereum-sepolia',
        resolvedOnNetworkId: 'ethereum-mainnet',
      })
    ).toBe(false);
  });
});

describe('INV-F2: both network ids must be non-empty when flag is true', () => {
  it('returns false when flag is true but either id is missing or empty', () => {
    expect(
      isCrossNetworkFallback({
        resolvedViaNetworkFallback: true,
      })
    ).toBe(false);
    expect(
      isCrossNetworkFallback({
        resolvedViaNetworkFallback: true,
        queriedOnNetworkId: 'ethereum-sepolia',
      })
    ).toBe(false);
    expect(
      isCrossNetworkFallback({
        resolvedViaNetworkFallback: true,
        resolvedOnNetworkId: 'ethereum-mainnet',
      })
    ).toBe(false);
    expect(
      isCrossNetworkFallback({
        resolvedViaNetworkFallback: true,
        queriedOnNetworkId: '',
        resolvedOnNetworkId: 'ethereum-mainnet',
      })
    ).toBe(false);
    expect(
      isCrossNetworkFallback({
        resolvedViaNetworkFallback: true,
        queriedOnNetworkId: 'ethereum-sepolia',
        resolvedOnNetworkId: '',
      })
    ).toBe(false);
  });
});

describe('getFallbackNetworks — structured extractor', () => {
  it('yields both ids for the golden complete triplet', () => {
    expect(getFallbackNetworks(GOLDEN_COMPLETE_TRIPLET)).toEqual({
      queriedOnNetworkId: 'ethereum-sepolia',
      resolvedOnNetworkId: 'ethereum-mainnet',
    });
  });

  it.each(TRIPLET_MATRIX.filter((row) => !row.expected))(
    'yields undefined for invalid row: $label',
    ({ provenance }) => {
      expect(
        getFallbackNetworks(provenance),
        'getFallbackNetworks must not false-positive on incomplete/orphan provenance'
      ).toBeUndefined();
    }
  );

  it('agrees with isCrossNetworkFallback on every matrix row', () => {
    for (const { provenance, expected } of TRIPLET_MATRIX) {
      const networks = getFallbackNetworks(provenance);
      expect(isCrossNetworkFallback(provenance)).toBe(expected);
      expect(networks !== undefined).toBe(expected);
      if (expected) {
        expect(networks).toEqual({
          queriedOnNetworkId: provenance.queriedOnNetworkId,
          resolvedOnNetworkId: provenance.resolvedOnNetworkId,
        });
      }
    }
  });
});

describe('INV-F4: scopedToNetworkId orthogonality — scope gate field does not affect fallback classification', () => {
  it('classifies complete triplet true even when scopedToNetworkId is present on the wider provenance object', () => {
    const withScope = {
      ...GOLDEN_COMPLETE_TRIPLET,
      scopedToNetworkId: 'ethereum-sepolia',
    } as CrossNetworkFallbackProvenance & { scopedToNetworkId: string };

    expect(isCrossNetworkFallback(withScope)).toBe(true);
    expect(getFallbackNetworks(withScope)).toEqual({
      queriedOnNetworkId: 'ethereum-sepolia',
      resolvedOnNetworkId: 'ethereum-mainnet',
    });
  });

  it('does not infer fallback from scopedToNetworkId alone', () => {
    const boundLocalOnly = {
      scopedToNetworkId: 'ethereum-sepolia',
    } as CrossNetworkFallbackProvenance & {
      scopedToNetworkId: string;
    };
    expect(isCrossNetworkFallback(boundLocalOnly)).toBe(false);
    expect(getFallbackNetworks(boundLocalOnly)).toBeUndefined();
  });
});

describe('INV-F3: Principle II — base fallback fields only, no ENS-specific imports', () => {
  it('does not import adapter ENS packages or provenance guards', () => {
    expect(FALLBACK_SOURCE).not.toMatch(/^import\s+[^;]+from\s+['"]@ensdomains\//m);
    expect(FALLBACK_SOURCE).not.toMatch(/\bisEnsProvenance\b/);
    expect(FALLBACK_SOURCE).not.toMatch(/\bcoinType\b/);
  });

  it('does not read scopedToNetworkId at runtime (orthogonality with 002 scope gate)', () => {
    expect(FALLBACK_SOURCE).not.toMatch(/provenance\.scopedToNetworkId\b/);
  });

  it('does not branch on label or external fields', () => {
    expect(FALLBACK_SOURCE).not.toMatch(/provenance\.label\b/);
    expect(FALLBACK_SOURCE).not.toMatch(/provenance\.external\b/);
  });
});

describe('INV-182: nameResolutionCrossNetworkFallbackMessage locked templates', () => {
  const networks = {
    queriedOnNetworkId: 'ethereum-sepolia',
    resolvedOnNetworkId: 'ethereum-mainnet',
  };

  it('interpolates when both human names are non-empty', () => {
    expect(
      nameResolutionCrossNetworkFallbackMessage(networks, {
        queriedNetworkName: 'Ethereum Sepolia',
        resolvedNetworkName: 'Ethereum Mainnet',
      })
    ).toBe('Name not found on Ethereum Sepolia, but found on Ethereum Mainnet.');
  });

  it('uses generic template when either name is missing', () => {
    expect(
      nameResolutionCrossNetworkFallbackMessage(networks, {
        queriedNetworkName: 'Ethereum Sepolia',
      })
    ).toBe('Name not found on the connected network, but found on another network.');
  });

  it('omits mechanism words from both template arms', () => {
    const interpolated = nameResolutionCrossNetworkFallbackMessage(networks, {
      queriedNetworkName: 'Ethereum Sepolia',
      resolvedNetworkName: 'Ethereum Mainnet',
    });
    const generic = nameResolutionCrossNetworkFallbackMessage(networks);
    for (const msg of [interpolated, generic]) {
      expect(msg).not.toMatch(/gateway|CCIP|v2|L1|ENS v2/i);
    }
  });
});

describe('INV-199: generic fallback template never embeds raw slugs', () => {
  it('generic arm contains no ethereum- substring', () => {
    const msg = nameResolutionCrossNetworkFallbackMessage({
      queriedOnNetworkId: 'ethereum-sepolia',
      resolvedOnNetworkId: 'ethereum-mainnet',
    });
    expect(msg).toBe('Name not found on the connected network, but found on another network.');
    expect(msg).not.toContain('ethereum-');
  });
});

describe('INV-196: networkDisplayName never throws', () => {
  it('returns raw id when resolver is absent', () => {
    expect(networkDisplayName('ethereum-sepolia')).toBe('ethereum-sepolia');
  });

  it('returns raw id when resolver returns undefined or empty', () => {
    expect(networkDisplayName('ethereum-sepolia', () => undefined)).toBe('ethereum-sepolia');
    expect(networkDisplayName('ethereum-sepolia', () => '   ')).toBe('ethereum-sepolia');
  });
});

describe('INV-198: crossNetworkFallbackMessageNames interpolation discipline', () => {
  const networks = {
    queriedOnNetworkId: 'ethereum-sepolia',
    resolvedOnNetworkId: 'ethereum-mainnet',
  };

  it('passes repo slugs when no resolver is wired', () => {
    expect(crossNetworkFallbackMessageNames(networks)).toEqual({
      queriedNetworkName: 'ethereum-sepolia',
      resolvedNetworkName: 'ethereum-mainnet',
    });
  });

  it('returns trimmed resolver labels when both resolve', () => {
    const resolveLabel = (id: string): string | undefined =>
      id === 'ethereum-sepolia' ? '  Ethereum Sepolia  ' : 'Ethereum Mainnet';

    expect(crossNetworkFallbackMessageNames(networks, resolveLabel)).toEqual({
      queriedNetworkName: 'Ethereum Sepolia',
      resolvedNetworkName: 'Ethereum Mainnet',
    });
  });

  it('yields partial names when resolver returns undefined for one id', () => {
    expect(
      crossNetworkFallbackMessageNames(networks, (id) =>
        id === 'ethereum-sepolia' ? 'Ethereum Sepolia' : undefined
      )
    ).toEqual({
      queriedNetworkName: 'Ethereum Sepolia',
      resolvedNetworkName: undefined,
    });
  });
});
