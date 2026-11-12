/* eslint-disable react-refresh/only-export-components -- test-only harness; Fast Refresh does not apply */
/**
 * SF-17 · Shared fixtures, harnesses and DOM lookups for the NetworkSelector suites.
 * Stage artifact: sf-17-network-selector-rebuild/03-invariants.md
 */
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import * as React from 'react';

import type { NetworkType } from '@openzeppelin/ui-types';

import { NetworkSelector, type NetworkSelectorProps } from './network-selector';

export interface Net {
  readonly id: string;
  readonly name: string;
  readonly type?: NetworkType;
  readonly eco: string;
  /** A string is the disabled pill text; `true` is disabled with no pill. */
  readonly off?: string | true;
}

/** Interleaved ecosystems (EVM, EVM, STELLAR, STELLAR, EVM, MIDNIGHT), two disabled. */
export const NETS: readonly Net[] = Object.freeze([
  { id: 'eth', name: 'Ethereum', type: 'mainnet', eco: 'EVM' },
  { id: 'sep', name: 'Ethereum Sepolia', type: 'testnet', eco: 'EVM' },
  { id: 'xlm', name: 'Stellar', type: 'mainnet', eco: 'STELLAR' },
  {
    id: 'xlm-test',
    name: 'Stellar Testnet',
    type: 'testnet',
    eco: 'STELLAR',
    off: 'Self-host required',
  },
  { id: 'base', name: 'Base Sepolia', eco: 'EVM' },
  { id: 'mid', name: 'Midnight', type: 'devnet', eco: 'MIDNIGHT', off: true },
]);

// Module-level accessors, so they are referentially stable across renders (INV-22).
export const label = (n: Net): string => n.name;
export const netId = (n: Net): string => n.id;
export const netType = (n: Net): NetworkType | undefined => n.type;
export const eco = (n: Net): string => n.eco;
export const icon = (n: Net): React.ReactNode => <span aria-hidden="true" data-net-icon={n.id} />;
export const isOff = (n: Net): boolean => n.off !== undefined;
export const offLabel = (n: Net): string | undefined =>
  typeof n.off === 'string' ? n.off : undefined;

type Base = Omit<
  NetworkSelectorProps<Net>,
  | 'multiple'
  | 'selectedNetwork'
  | 'onSelectNetwork'
  | 'selectedNetworkIds'
  | 'onSelectionChange'
  | 'renderTrigger'
  | 'formatSelectedCount'
  | 'formatSelectionSummary'
  | 'clearAllLabel'
  | 'networks'
  | 'getNetworkLabel'
  | 'getNetworkId'
> & {
  readonly networks?: readonly Net[];
};

/** Stateful single-mode consumer. `onPick` sees every emit before the state update. */
export function Single({
  networks = NETS,
  initial = null,
  onPick,
  ignoreEmits = false,
  ...rest
}: Base & {
  readonly initial?: Net | null;
  readonly onPick?: (n: Net) => void;
  readonly ignoreEmits?: boolean;
}): React.ReactElement {
  const [selected, setSelected] = React.useState<Net | null>(initial);
  return (
    <NetworkSelector<Net>
      networks={networks as Net[]}
      selectedNetwork={selected}
      onSelectNetwork={(n) => {
        onPick?.(n);
        if (!ignoreEmits) setSelected(n);
      }}
      getNetworkLabel={label}
      getNetworkId={netId}
      {...rest}
    />
  );
}

export type MultiExtra = Pick<
  Extract<NetworkSelectorProps<Net>, { multiple: true }>,
  'renderTrigger' | 'formatSelectedCount' | 'formatSelectionSummary' | 'clearAllLabel'
>;

/** Stateful multi-mode consumer. Every list it passes is frozen, so a mutation throws (INV-11). */
export function Multi({
  networks = NETS,
  initial = [],
  onChange,
  ignoreEmits = false,
  ...rest
}: Base &
  MultiExtra & {
    readonly initial?: readonly string[];
    readonly onChange?: (ids: string[]) => void;
    readonly ignoreEmits?: boolean;
  }): React.ReactElement {
  const [ids, setIds] = React.useState<string[]>(() => Object.freeze([...initial]) as string[]);
  return (
    <>
      <NetworkSelector<Net>
        multiple
        networks={networks as Net[]}
        selectedNetworkIds={ids}
        onSelectionChange={(next) => {
          onChange?.(next);
          if (!ignoreEmits) setIds(Object.freeze([...next]) as string[]);
        }}
        getNetworkLabel={label}
        getNetworkId={netId}
        {...rest}
      />
      <output data-testid="readout">{ids.join(',') || 'None'}</output>
    </>
  );
}

/** The renderer's filter button shape: icon only, with a count badge. Forwards ref and props. */
export function FilterButton({
  ref,
  count,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly ref?: React.Ref<HTMLButtonElement>;
  readonly count: number;
}): React.ReactElement {
  return (
    <button ref={ref} data-testid="filter" {...props}>
      <svg aria-hidden="true" />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

export const setup = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

// ── DOM lookups. The trigger is aria-hidden by Radix while open, so use data-slot / testid. ──

function must<E>(el: E | null | undefined, what: string): E {
  if (el === null || el === undefined) throw new Error(`expected ${what} in the DOM`);
  return el;
}

const slot = <E extends Element>(name: string): E | null =>
  document.querySelector<E>(`[data-slot="${name}"]`);

export const q = {
  trigger: () => must(slot<HTMLButtonElement>('network-selector-trigger'), 'default trigger'),
  filter: () =>
    must(document.querySelector<HTMLButtonElement>('[data-testid="filter"]'), 'custom trigger'),
  dialog: () => slot<HTMLElement>('network-selector-content'),
  search: () => must(slot<HTMLInputElement>('network-selector-search'), 'search box'),
  listbox: () => must(slot<HTMLElement>('network-selector-listbox'), 'listbox'),
  status: () => must(slot<HTMLElement>('network-selector-empty'), 'status region'),
  summary: () => slot<HTMLElement>('network-selector-summary'),
  clear: () => slot<HTMLButtonElement>('network-selector-clear'),
  options: () =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-slot="network-selector-option"]')),
  /** The option whose label span is exactly `text`. */
  option: (text: string) => {
    const found = q.options().filter((o) => o.querySelector('span.truncate')?.textContent === text);
    if (found.length !== 1) throw new Error(`expected one option "${text}", got ${found.length}`);
    return found[0] as HTMLElement;
  },
  labels: () => q.options().map((o) => o.querySelector('span.truncate')?.textContent ?? ''),
  groups: () => Array.from(document.querySelectorAll<HTMLElement>('[role="group"]')),
  headers: () => q.groups().map((g) => g.querySelector(':scope > [role="presentation"]')),
  active: () => {
    const ad = q.search().getAttribute('aria-activedescendant');
    return ad === null
      ? null
      : (document.getElementById(ad)?.querySelector('span.truncate')?.textContent ?? '?');
  },
};

/** INV-23: what a modal layer may leave on the page. */
export function pageResidue(): { bodyStyle: string; ariaHidden: number; dataAriaHidden: number } {
  return {
    bodyStyle: document.body.style.cssText,
    ariaHidden: document.querySelectorAll('[aria-hidden="true"]:not(svg):not([data-net-icon])')
      .length,
    dataAriaHidden: document.querySelectorAll('[data-aria-hidden]').length,
  };
}

/** Deterministic PRNG (mulberry32) for the seeded event-sequence test (INV-19). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
