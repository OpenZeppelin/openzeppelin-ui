/**
 * @vitest-environment jsdom
 *
 * SF-17 · Public type surface — INV-9 (a strict superset: every old prop keeps its
 * name, type and optionality; six optional copy props; the multi-only ones and
 * `renderTrigger` are type errors in single mode; the in-repo call sites compile
 * unchanged).
 *
 * The package `tsc` excludes *.test.tsx, so the `@ts-expect-error` probes are
 * checked by `tsc -p tsconfig.network-selector-tests.json` (part of
 * `typecheck:suites`). A probe that stops erroring fails that check as an unused
 * directive.
 * Stage artifact: sf-17-network-selector-rebuild/03-invariants.md
 */
import { render } from '@testing-library/react';
import { Filter } from 'lucide-react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as React from 'react';

import type { NetworkConfig, NetworkType } from '@openzeppelin/ui-types';

import { Button, NetworkIcon, NetworkSelector, type NetworkSelectorProps } from '../../index';

type Props = NetworkSelectorProps<NetworkConfig>;
type SingleProps = Extract<Props, { multiple?: false }>;
type MultiProps = Extract<Props, { multiple: true }>;

const noop = (): void => {};
const networks: NetworkConfig[] = [];

describe('INV-9: the public type surface is a strict superset', () => {
  it('every pre-existing prop keeps its name, type and optionality', () => {
    expectTypeOf<Props['networks']>().toEqualTypeOf<NetworkConfig[]>();
    expectTypeOf<Props['getNetworkLabel']>().toEqualTypeOf<(network: NetworkConfig) => string>();
    expectTypeOf<Props['getNetworkId']>().toEqualTypeOf<(network: NetworkConfig) => string>();
    expectTypeOf<Props['getNetworkIcon']>().toEqualTypeOf<
      ((network: NetworkConfig) => React.ReactNode) | undefined
    >();
    expectTypeOf<Props['getNetworkType']>().toEqualTypeOf<
      ((network: NetworkConfig) => NetworkType | undefined) | undefined
    >();
    expectTypeOf<Props['groupByEcosystem']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Props['getEcosystem']>().toEqualTypeOf<
      ((network: NetworkConfig) => string) | undefined
    >();
    expectTypeOf<Props['filterNetwork']>().toEqualTypeOf<
      ((network: NetworkConfig, query: string) => boolean) | undefined
    >();
    expectTypeOf<Props['isNetworkDisabled']>().toEqualTypeOf<
      ((network: NetworkConfig) => boolean) | undefined
    >();
    expectTypeOf<Props['getNetworkDisabledLabel']>().toEqualTypeOf<
      ((network: NetworkConfig) => string | undefined) | undefined
    >();
    expectTypeOf<Props['className']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Props['placeholder']>().toEqualTypeOf<string | undefined>();

    expectTypeOf<SingleProps['selectedNetwork']>().toEqualTypeOf<NetworkConfig | null>();
    expectTypeOf<SingleProps['onSelectNetwork']>().toEqualTypeOf<
      (network: NetworkConfig) => void
    >();
    expectTypeOf<MultiProps['selectedNetworkIds']>().toEqualTypeOf<string[]>();
    expectTypeOf<MultiProps['onSelectionChange']>().toEqualTypeOf<(ids: string[]) => void>();
    expectTypeOf<MultiProps['renderTrigger']>().toEqualTypeOf<
      ((props: { selectedCount: number; open: boolean }) => React.ReactNode) | undefined
    >();
  });

  it('the six new copy props are optional, with the documented types', () => {
    expectTypeOf<Props['searchPlaceholder']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Props['searchLabel']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Props['emptyText']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<MultiProps['formatSelectedCount']>().toEqualTypeOf<
      ((count: number, total: number) => string) | undefined
    >();
    expectTypeOf<MultiProps['formatSelectionSummary']>().toEqualTypeOf<
      ((count: number, total: number) => string) | undefined
    >();
    expectTypeOf<MultiProps['clearAllLabel']>().toEqualTypeOf<string | undefined>();
  });

  it('failure: multi-only props and renderTrigger are type errors in single mode', () => {
    const base = {
      networks,
      selectedNetwork: null,
      onSelectNetwork: noop,
      getNetworkLabel: (n: NetworkConfig) => n.name,
      getNetworkId: (n: NetworkConfig) => n.id,
    };
    const probes = [
      // @ts-expect-error — multi only (D2)
      <NetworkSelector key="1" {...base} formatSelectedCount={() => ''} />,
      // @ts-expect-error — multi only (D2)
      <NetworkSelector key="2" {...base} formatSelectionSummary={() => ''} />,
      // @ts-expect-error — multi only (D2)
      <NetworkSelector key="3" {...base} clearAllLabel="Reset" />,
      // @ts-expect-error — multi only
      <NetworkSelector key="4" {...base} renderTrigger={() => null} />,
      // @ts-expect-error — the modes do not mix
      <NetworkSelector key="5" {...base} selectedNetworkIds={[]} />,
    ];
    expect(probes).toHaveLength(5);
  });

  it('failure: multi mode requires selectedNetworkIds and onSelectionChange', () => {
    const probes = [
      // @ts-expect-error — selectedNetworkIds is required in multi mode
      <NetworkSelector
        key="1"
        multiple
        networks={networks}
        onSelectionChange={noop}
        getNetworkLabel={(n) => n.name}
        getNetworkId={(n) => n.id}
      />,
      // @ts-expect-error — selectedNetwork is not a multi prop
      <NetworkSelector
        key="2"
        multiple
        networks={networks}
        selectedNetworkIds={[]}
        onSelectionChange={noop}
        selectedNetwork={null}
        getNetworkLabel={(n) => n.name}
        getNetworkId={(n) => n.id}
      />,
    ];
    expect(probes).toHaveLength(2);
  });

  it('the three in-repo call sites compile and render unchanged (copied verbatim)', () => {
    // examples/basic-react-app/src/components/NetworkDemo.tsx (basic and grouped selectors)
    const currentNetwork: NetworkConfig | null = null;
    const handleNetworkChange = (_network: NetworkConfig): void => {};
    // renderer AddressBookWidget.tsx
    const activeFilterIds: string[] = [];
    const onFilterNetworkIdsChange = (_ids: string[]): void => {};
    const selectedNetwork: NetworkConfig | null = null;

    const { container } = render(
      <>
        <NetworkSelector
          networks={networks}
          selectedNetwork={currentNetwork}
          onSelectNetwork={handleNetworkChange}
          getNetworkLabel={(n) => n.name}
          getNetworkId={(n) => n.id}
          getNetworkIcon={(n) => <NetworkIcon network={n} size={16} />}
          getNetworkType={(n) => n.type}
        />
        <NetworkSelector
          networks={networks}
          selectedNetwork={null}
          onSelectNetwork={() => {}}
          getNetworkLabel={(n) => n.name}
          getNetworkId={(n) => n.id}
          getNetworkIcon={(n) => <NetworkIcon network={n} size={16} />}
          getNetworkType={(n) => n.type}
          groupByEcosystem
          getEcosystem={(n) => (n.isTestnet ? 'Testnets' : 'Mainnets')}
          placeholder="Select a network..."
        />
        {/* renderer AddAliasDialog.tsx */}
        <NetworkSelector
          networks={networks}
          selectedNetwork={selectedNetwork}
          onSelectNetwork={handleNetworkChange}
          getNetworkLabel={(n) => n.name}
          getNetworkId={(n) => n.id}
          getNetworkIcon={(n) => <NetworkIcon network={n} />}
          getNetworkType={(n) => n.type}
          groupByEcosystem
          getEcosystem={(n) => n.ecosystem.toUpperCase()}
          placeholder="Select network…"
        />
        {/* renderer AddressBookWidget.tsx */}
        <NetworkSelector
          multiple
          networks={networks}
          selectedNetworkIds={activeFilterIds}
          onSelectionChange={onFilterNetworkIdsChange}
          getNetworkLabel={(n) => n.name}
          getNetworkId={(n) => n.id}
          getNetworkIcon={(n) => <NetworkIcon network={n} size={14} />}
          getNetworkType={(n) => n.type}
          groupByEcosystem
          getEcosystem={(n) => n.ecosystem.toUpperCase()}
          renderTrigger={({ selectedCount }) => (
            <Button variant="outline" size="icon" className="relative shrink-0">
              <Filter className="h-4 w-4" />
              {selectedCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {selectedCount}
                </span>
              )}
            </Button>
          )}
        />
      </>
    );
    expect(container.querySelectorAll('button')).toHaveLength(4);
  });
});
