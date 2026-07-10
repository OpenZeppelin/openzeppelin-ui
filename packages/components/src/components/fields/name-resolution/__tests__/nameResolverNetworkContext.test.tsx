/**
 * @vitest-environment jsdom
 *
 * SF-6 · NameResolverProvider network context — INV-141 / INV-142.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';

import type { NameResolverContextValue } from '../context';
import { NameResolverProvider } from '../name-resolver-context';
import { useNameResolver } from '../useNameResolver';

function Probe(): React.ReactElement {
  const ctx = useNameResolver();
  return (
    <output data-testid="probe">
      {JSON.stringify({
        hasResolveName: ctx?.resolveName != null,
        activeNetworkId: ctx?.activeNetworkId ?? null,
        activeNetworkName: ctx?.activeNetworkName ?? null,
      })}
    </output>
  );
}

describe('INV-141 / INV-142: NameResolverProvider network context is strictly additive', () => {
  it('passes activeNetworkId and activeNetworkName through context', () => {
    const resolver: NameResolverContextValue = {
      resolveName: async () => ({ ok: false, error: { code: 'ADAPTER_ERROR' } }),
      activeNetworkId: 'eip155:8453',
      activeNetworkName: 'Base',
    };

    render(
      <NameResolverProvider {...resolver}>
        <Probe />
      </NameResolverProvider>
    );

    expect(screen.getByTestId('probe').textContent).toContain('"activeNetworkId":"eip155:8453"');
    expect(screen.getByTestId('probe').textContent).toContain('"activeNetworkName":"Base"');
  });

  it('narrow destructuring of resolveName only is unaffected when network props are present', () => {
    function NarrowProbe(): React.ReactElement {
      const resolveName = useNameResolver()?.resolveName;
      return <output data-testid="narrow">{resolveName ? 'present' : 'absent'}</output>;
    }

    render(
      <NameResolverProvider
        resolveName={async () => ({ ok: false, error: { code: 'ADAPTER_ERROR' } })}
        activeNetworkId="eip155:1"
      >
        <NarrowProbe />
      </NameResolverProvider>
    );

    expect(screen.getByTestId('narrow').textContent).toBe('present');
  });
});
