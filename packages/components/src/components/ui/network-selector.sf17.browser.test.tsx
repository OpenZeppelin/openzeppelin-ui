/**
 * SF-17 · Chromium verification — INV-27 (axe violations are a subset of the
 * baseline's, none inside the popover), Code OQ-3 (the chevron adds nothing to the
 * trigger name), INV-22 (correct at 1,000 networks; timings recorded, not gated,
 * as SF-15 INV-34).
 *
 * The INV-27 block is role-agnostic and also runs on the pre-SF-17 baseline
 * worktree (`fd8850a08`). Run there with `-t "INV-27"` and BASELINE_AXE emptied; each
 * state is written to `sf17-axe-record/` and pasted into BASELINE_AXE below (05-tests.md, Test Notes).
 * Opt-in via `pnpm test:browser`. Not part of the default jsdom `pnpm test`.
 * Stage artifact: sf-17-network-selector-rebuild/03-invariants.md
 */
import { fireEvent, render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import * as React from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { NetworkSelector } from './network-selector';

interface Net {
  readonly id: string;
  readonly name: string;
  readonly type?: 'mainnet' | 'testnet' | 'devnet';
  readonly eco: string;
  readonly off?: string;
}

const NETS: Net[] = [
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
];

const common = {
  networks: NETS,
  getNetworkLabel: (n: Net) => n.name,
  getNetworkId: (n: Net) => n.id,
  getNetworkType: (n: Net) => n.type,
  getNetworkIcon: (n: Net) => (
    <svg aria-hidden="true" data-net-icon={n.id} width="16" height="16" />
  ),
};

function SingleHost({
  initial = null,
  grouped = false,
}: {
  initial?: Net | null;
  grouped?: boolean;
}) {
  const [sel, setSel] = React.useState<Net | null>(initial);
  return (
    <NetworkSelector<Net>
      {...common}
      selectedNetwork={sel}
      onSelectNetwork={setSel}
      groupByEcosystem={grouped}
      getEcosystem={grouped ? (n) => n.eco : undefined}
      isNetworkDisabled={(n) => n.off !== undefined}
      getNetworkDisabledLabel={(n) => n.off}
    />
  );
}

function MultiHost({ initial = [], custom = false }: { initial?: string[]; custom?: boolean }) {
  const [ids, setIds] = React.useState<string[]>(initial);
  return (
    <NetworkSelector<Net>
      {...common}
      multiple
      selectedNetworkIds={ids}
      onSelectionChange={setIds}
      groupByEcosystem
      getEcosystem={(n) => n.eco}
      renderTrigger={
        custom
          ? ({ selectedCount }) => (
              <button className="filter">
                <svg aria-hidden="true" width="16" height="16" />
                {selectedCount > 0 && <span>{selectedCount}</span>}
              </button>
            )
          : undefined
      }
    />
  );
}

/** The AddAliasDialog shape, including its dangling `htmlFor` (Design OQ-4, parity-preserved). */
function InDialog() {
  return (
    <Dialog open>
      <DialogContent>
        <DialogTitle>Add Alias</DialogTitle>
        <DialogDescription>Create a human-readable name for an address.</DialogDescription>
        <form>
          <label htmlFor="alias-network">Network</label>
          <SingleHost grouped />
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Role-agnostic DOM access (works on the DropdownMenu baseline and on the rebuild). ──

const host = () => document.querySelector('[data-testid="host"]') as HTMLElement;
/** In the Dialog state the selector is portalled with the dialog, so look there too. */
const trigger = () =>
  (host().querySelector('button') ??
    document.querySelector('[role="dialog"] form button')) as HTMLButtonElement;
const wrapper = () => document.querySelector<HTMLElement>('[data-radix-popper-content-wrapper]');
const search = () => wrapper()?.querySelector('input') as HTMLInputElement;

function classify(el: Element | null): string {
  if (!el) return 'missing';
  const tag = el.getAttribute('role') ?? el.tagName.toLowerCase();
  if (el === trigger() || trigger().contains(el)) return 'trigger';
  if (wrapper()?.contains(el)) return `popup:${tag}`;
  if (el.closest('[role="dialog"]')) return `dialog:${tag}`;
  return `page:${tag}`;
}

async function axeKeys(): Promise<string[]> {
  const results = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });
  const keys = results.violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id}@${classify(document.querySelector(String(n.target[0])))}`)
  );
  return [...new Set(keys)].sort();
}

type State = { name: string; ui: () => React.ReactElement; act?: () => Promise<void> };

const open = async () => {
  await userEvent.click(trigger());
  await vi.waitFor(() => expect(wrapper()).not.toBeNull());
};

const STATES: State[] = [
  { name: 'closed single empty', ui: () => <SingleHost /> },
  { name: 'closed single selected', ui: () => <SingleHost initial={NETS[1] as Net} /> },
  { name: 'closed multi zero', ui: () => <MultiHost /> },
  { name: 'closed multi two', ui: () => <MultiHost initial={['eth', 'xlm']} /> },
  { name: 'closed custom no badge', ui: () => <MultiHost custom /> },
  { name: 'closed custom badge', ui: () => <MultiHost custom initial={['eth', 'xlm']} /> },
  { name: 'open single', ui: () => <SingleHost initial={NETS[0] as Net} />, act: open },
  {
    name: 'open after ArrowDown',
    ui: () => <SingleHost />,
    act: async () => {
      await open();
      await userEvent.click(search());
      await userEvent.keyboard('{ArrowDown}');
    },
  },
  {
    name: 'open empty result',
    ui: () => <SingleHost />,
    act: async () => {
      await open();
      await userEvent.fill(search(), 'zzz');
    },
  },
  { name: 'open grouped with disabled', ui: () => <SingleHost grouped />, act: open },
  { name: 'open multi with selection row', ui: () => <MultiHost initial={['sep']} />, act: open },
  { name: 'open inside the Add Alias dialog', ui: () => <InDialog />, act: open },
];

/**
 * Recorded on the baseline worktree at fd8850a08 (DropdownMenu build), same states,
 * same classifier. Shared finding: the unnamed default trigger (parity-preserved
 * naming gap, Design OQ-4).
 */
const BASELINE_AXE: Record<string, string[]> = {
  'closed custom badge': [],
  'closed custom no badge': ['button-name@trigger'],
  'closed multi two': ['button-name@trigger'],
  'closed multi zero': ['button-name@trigger'],
  'closed single empty': ['button-name@trigger'],
  'closed single selected': ['button-name@trigger'],
  'open after ArrowDown': ['aria-hidden-focus@page:div', 'aria-required-children@popup:menu'],
  'open empty result': ['aria-hidden-focus@page:div', 'aria-required-children@popup:menu'],
  'open grouped with disabled': ['aria-hidden-focus@page:div', 'aria-required-children@popup:menu'],
  'open inside the Add Alias dialog': ['aria-required-children@popup:menu'],
  'open multi with selection row': [
    'aria-hidden-focus@page:div',
    'aria-required-children@popup:menu',
  ],
  'open single': ['aria-hidden-focus@page:div', 'aria-required-children@popup:menu'],
};

describe('INV-27: axe violations are a subset of the baseline’s; none inside the popover', () => {
  for (const state of STATES) {
    it(state.name, async () => {
      render(<div data-testid="host">{state.ui()}</div>);
      await state.act?.();
      const keys = await axeKeys();
      const baseline = BASELINE_AXE[state.name];
      if (baseline === undefined) {
        // Recording run on the baseline worktree: one file per state, next to this test.
        await commands.writeFile(`./sf17-axe-record/${state.name}.json`, JSON.stringify(keys));
        return;
      }
      expect(keys.filter((k) => !baseline.includes(k))).toEqual([]);
      expect(keys.filter((k) => k.includes('@popup:'))).toEqual([]);
    });
  }

  it('Code OQ-3: the trigger chevron is aria-hidden, so it adds nothing to the name', () => {
    render(
      <div data-testid="host">
        <SingleHost />
      </div>
    );
    const chevron = trigger().querySelector('svg.lucide-chevron-down');
    expect(chevron?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('INV-22: correct at 1,000 networks (timings recorded, not gated)', () => {
  const MANY: Net[] = Array.from({ length: 1000 }, (_, i) => ({
    id: `n${i}`,
    name: `Network ${String(i).padStart(4, '0')}`,
    eco: i % 2 === 0 ? 'EVEN' : 'ODD',
  }));

  it.for([250, 1000])('%i networks: open, filter, wrap and Enter', async (n, { annotate }) => {
    const nets = MANY.slice(0, n);
    const filter = vi.fn((net: Net, query: string) => net.name.includes(query));
    const onChange = vi.fn();
    render(
      <div data-testid="host">
        <NetworkSelector<Net>
          multiple
          networks={nets}
          selectedNetworkIds={[]}
          onSelectionChange={onChange}
          getNetworkLabel={(x) => x.name}
          getNetworkId={(x) => x.id}
          filterNetwork={filter}
          groupByEcosystem
          getEcosystem={(x) => x.eco}
        />
      </div>
    );
    const t0 = performance.now();
    await open();
    const openMs = performance.now() - t0;
    const input = search();
    expect(document.activeElement).toBe(input);
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(n);

    // Grouped: EVEN first, then ODD. ArrowUp from the first wraps to the last DOM option.
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const last = `Network ${String(n - 1).padStart(4, '0')}`;
    const activeId = input.getAttribute('aria-activedescendant') as string;
    expect(document.getElementById(activeId)?.textContent).toContain(last);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith([`n${n - 1}`]);

    filter.mockClear();
    const k0 = performance.now();
    fireEvent.change(input, { target: { value: 'Network 0' } });
    const keyMs = performance.now() - k0;
    expect(filter.mock.calls.length).toBeLessThanOrEqual(n);
    const a0 = performance.now();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const arrowMs = performance.now() - a0;
    expect(filter.mock.calls.length).toBeLessThanOrEqual(n); // no rebuild on navigation
    await annotate(
      `n=${n} open=${openMs.toFixed(1)}ms keystroke=${keyMs.toFixed(1)}ms arrow=${arrowMs.toFixed(1)}ms`
    );
    // Absolute wall-clock is local Node-only; browser/CI runners are too noisy for ms budgets.
    if (n === 250 && typeof process !== 'undefined' && !process.env.CI) {
      expect(keyMs, 'SF-15 INV-34 flag threshold').toBeLessThan(100);
    }
  });
});
