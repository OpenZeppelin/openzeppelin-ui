import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AdapterPeerIssue, AdapterPeerResult } from '../lib/adapterPeers';
import { printAdapterPeerResult } from './logger';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Captures what `printAdapterPeerResult` writes, stripped of colour. */
function capture(result: AdapterPeerResult): string {
  const lines: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    lines.push(String(chunk));
    return true;
  });

  printAdapterPeerResult(result);

  // Strips the ANSI colour picocolors adds. Built from a char code so the escape is not a
  // control character inside a regex literal, which `no-control-regex` rejects.
  const ansi = new RegExp(`${String.fromCharCode(27)}\\[\\d+m`, 'g');
  return lines.join('').replace(ansi, '');
}

function resultWith(overrides: Partial<AdapterPeerResult> = {}): AdapterPeerResult {
  return {
    ok: true,
    projectRoot: '/app',
    scopeDirs: ['node_modules/@openzeppelin'],
    declaringManifests: [],
    overriddenPeers: [],
    pairs: [],
    issues: [],
    remediation: [],
    ...overrides,
  };
}

const outdatedRange: AdapterPeerIssue = {
  severity: 'warning',
  code: 'outdated-range',
  message: '@openzeppelin/adapter-evm declares @openzeppelin/ui-components ^2.0.0, ...',
};

describe('printAdapterPeerResult', () => {
  it('prints warnings on the passing path, where they would otherwise be invisible', () => {
    const output = capture(
      resultWith({ ok: true, issues: [outdatedRange], remediation: ['Fix: raise the range.'] })
    );

    expect(output).toContain('Adapter peer check passed');
    expect(output).toContain('[warning] outdated-range:');
    expect(output).toContain('Fix: raise the range.');
  });

  it('says nothing beyond the summary when there is nothing to report', () => {
    const output = capture(resultWith({ ok: true }));

    expect(output.trim()).toBe('Adapter peer check passed for /app (0 adapter/peer pairs)');
  });

  it('still reports an error as a failure', () => {
    const output = capture(
      resultWith({
        ok: false,
        issues: [{ severity: 'error', code: 'stale-peer', message: 'ui-types 3.3.0 installed.' }],
      })
    );

    expect(output).toContain('Adapter peer check failed');
    expect(output).toContain('[error] stale-peer: ui-types 3.3.0 installed.');
  });
});
