/**
 * @vitest-environment jsdom
 *
 * SF-17 · Before/after parity record — INV-1 (parity outside the ledger), with
 * the emitted values of INV-11 / INV-12 / INV-13 and the copy of INV-10 pinned
 * against the pre-rebuild build.
 *
 * This file is self-contained and role-agnostic, so the same file runs on both
 * builds:
 * - On the baseline worktree (`fd8850a08`, Radix DropdownMenu), run with
 *   `SF17_RECORD=<path>` to write the frozen fixture.
 * - On the rebuilt component, the record must equal the frozen baseline after
 *   the ledger patches below. Any other difference fails.
 *
 * The normaliser keeps the Kept surfaces: visible text, accessible names
 * (dom-accessibility-api), visible check marks, disabled state, emitted values,
 * form submits and focus after close. Roles and focus-on-open go into `rk`,
 * which is recorded for evidence but not compared (R-1..R-3, K-1, K-2).
 * Stage artifact: sf-17-network-selector-rebuild/03-invariants.md
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { computeAccessibleName } from 'dom-accessibility-api';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { NetworkSelector } from './network-selector';

// ── Fixture networks: interleaved ecosystems, a disabled one with and without a label,
// one whose type is undefined, two "Sepolia" labels with distinct ids. ──

type Kind = 'mainnet' | 'testnet' | 'devnet';
interface Net {
  readonly id: string;
  readonly name: string;
  readonly type?: Kind;
  readonly eco: string;
  readonly off?: string | true;
}

const NETS: readonly Net[] = Object.freeze([
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

const label = (n: Net): string => n.name;
const id = (n: Net): string => n.id;
const type = (n: Net): Kind | undefined => n.type;
const eco = (n: Net): string => n.eco;
const icon = (n: Net): React.ReactNode => <span aria-hidden="true" data-net-icon={n.id} />;
const isOff = (n: Net): boolean => n.off !== undefined;
const offLabel = (n: Net): string | undefined => (typeof n.off === 'string' ? n.off : undefined);

// ── Harnesses: stateful consumers, as the in-repo call sites are. ──

type Emit = string;
let emits: Emit[] = [];
let submits = 0;

function SingleHost({
  networks = NETS,
  grouped,
  placeholder,
  inForm = false,
}: {
  readonly networks?: readonly Net[];
  readonly grouped?: 'eco' | 'all';
  readonly placeholder?: string;
  readonly inForm?: boolean;
}): React.ReactElement {
  const [selected, setSelected] = React.useState<Net | null>(null);
  const selector = (
    <NetworkSelector<Net>
      networks={networks as Net[]}
      selectedNetwork={selected}
      onSelectNetwork={(n) => {
        // INV-12: the object from `networks`, by reference.
        emits.push(`${n.id}${networks.includes(n) ? '' : ' (copy)'}`);
        setSelected(n);
      }}
      getNetworkLabel={label}
      getNetworkId={id}
      getNetworkIcon={icon}
      getNetworkType={type}
      isNetworkDisabled={isOff}
      getNetworkDisabledLabel={offLabel}
      groupByEcosystem={grouped !== undefined}
      getEcosystem={grouped === 'eco' ? eco : undefined}
      placeholder={placeholder}
    />
  );
  const host = <div data-testid="host">{selector}</div>;
  return inForm ? (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submits += 1;
      }}
    >
      {host}
    </form>
  ) : (
    host
  );
}

function MultiHost({
  initial = [],
  grouped,
  custom = false,
}: {
  readonly initial?: readonly string[];
  readonly grouped?: 'eco';
  readonly custom?: boolean;
}): React.ReactElement {
  const [ids, setIds] = React.useState<string[]>(() => Object.freeze([...initial]) as string[]);
  return (
    <div data-testid="host">
      <NetworkSelector<Net>
        multiple
        networks={NETS as Net[]}
        selectedNetworkIds={ids}
        onSelectionChange={(next) => {
          emits.push(JSON.stringify(next));
          // Frozen, so a mutation of the prop by the component would throw (INV-11).
          setIds(Object.freeze([...next]) as string[]);
        }}
        getNetworkLabel={label}
        getNetworkId={id}
        getNetworkIcon={icon}
        getNetworkType={type}
        isNetworkDisabled={isOff}
        getNetworkDisabledLabel={offLabel}
        groupByEcosystem={grouped !== undefined}
        getEcosystem={grouped === 'eco' ? eco : undefined}
        renderTrigger={
          custom
            ? ({ selectedCount }) => (
                <button className="filter">
                  <svg aria-hidden="true" />
                  {selectedCount > 0 && <span className="badge">{selectedCount}</span>}
                </button>
              )
            : undefined
        }
      />
    </div>
  );
}

// ── Normalised record. ──

const norm = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

interface Row {
  readonly kind: 'header' | 'item';
  readonly text: string;
  readonly name?: string;
  readonly disabled?: boolean;
  readonly checked?: boolean;
}

interface Snap {
  step: string;
  open: boolean;
  triggerText: string;
  triggerName: string;
  emits: string[];
  submits: number;
  focusAfterClose?: string;
  popupName?: string;
  searchName?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  rows?: Row[];
  selectionRow?: string | null;
  clearAllName?: string | null;
  popupText?: string;
  /** Roles and keys: recorded, never compared (R-1..R-3, K-1, K-2). */
  rk?: Record<string, unknown>;
}

function trigger(): HTMLElement {
  const el = screen.getByTestId('host').querySelector('button');
  if (!el) throw new Error('no trigger button');
  return el;
}

function popupWrapper(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-radix-popper-content-wrapper]');
}

function search(): HTMLInputElement {
  const el = popupWrapper()?.querySelector('input');
  if (!el) throw new Error('no search box');
  return el;
}

function items(): HTMLElement[] {
  return Array.from(
    popupWrapper()?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="option"]') ?? []
  );
}

function item(text: string): HTMLElement {
  const found = items().filter((el) => norm(el.textContent).startsWith(text));
  const exact = found.filter((el) => {
    const span = el.querySelector('span.truncate');
    return norm(span?.textContent) === text;
  });
  if (exact.length !== 1) throw new Error(`expected one item "${text}", got ${exact.length}`);
  return exact[0] as HTMLElement;
}

/** Group headers: the rebuilt group's presentation child, or the baseline label before a group. */
function headers(wrapper: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const group of Array.from(wrapper.querySelectorAll<HTMLElement>('[role="group"]'))) {
    const inner = group.querySelector<HTMLElement>(':scope > [role="presentation"]');
    if (inner) {
      out.push(inner);
      continue;
    }
    const prev = group.previousElementSibling as HTMLElement | null;
    if (prev && !prev.hasAttribute('role') && prev.querySelector('button') === null) out.push(prev);
  }
  return out;
}

function clearAll(): HTMLButtonElement | null {
  return (
    Array.from(popupWrapper()?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
      (b) => norm(b.textContent) === 'Clear all'
    ) ?? null
  );
}

function focusKind(trig: HTMLElement, wrapper: HTMLElement | null): string {
  const a = document.activeElement;
  if (a === trig) return 'trigger';
  if (a === document.body || a === null) return 'body';
  if (wrapper?.querySelector('input') === a) return 'search';
  if (wrapper?.contains(a)) return 'popup';
  return 'other';
}

function capture(step: string): Snap {
  const trig = trigger();
  const wrapper = popupWrapper();
  const snap: Snap = {
    step,
    open: wrapper !== null,
    triggerText: norm(trig.textContent),
    triggerName: computeAccessibleName(trig),
    emits: [...emits],
    submits,
  };
  if (!wrapper) {
    snap.focusAfterClose = focusKind(trig, null);
    return snap;
  }
  const popup = wrapper.querySelector<HTMLElement>('[role="menu"], [role="listbox"]');
  const box = search();
  const heads = headers(wrapper);
  const rowEls = [...heads, ...items()].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  const clear = clearAll();
  snap.popupName = popup ? computeAccessibleName(popup) : '(none)';
  snap.searchName = computeAccessibleName(box);
  snap.searchPlaceholder = box.placeholder;
  snap.searchValue = box.value;
  snap.rows = rowEls.map((el) =>
    heads.includes(el)
      ? { kind: 'header', text: norm(el.textContent) }
      : {
          kind: 'item',
          text: norm(el.textContent),
          name: computeAccessibleName(el),
          disabled: el.getAttribute('aria-disabled') === 'true',
          checked: el.querySelector('.lucide-check') !== null,
        }
  );
  snap.selectionRow = clear ? norm(clear.parentElement?.textContent) : null;
  snap.clearAllName = clear ? computeAccessibleName(clear) : null;
  snap.popupText = norm(wrapper.textContent);
  snap.rk = {
    popupRole: popup?.getAttribute('role') ?? null,
    itemRoles: [...new Set(items().map((el) => el.getAttribute('role')))],
    groups: wrapper.querySelectorAll('[role="group"]').length,
    focusOnOpen: focusKind(trig, wrapper),
  };
  return snap;
}

// ── Scripts: the scenario 3 steps (select, search, multi-select, Clear all, reopen), by click. ──

const setup = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

type Script = () => Promise<Snap[]>;

const SCRIPTS: Record<string, Script> = {
  /** NetworkDemo "basic" shape: single, ungrouped, icons and types. */
  'single-ungrouped': async () => {
    const user = setup();
    render(<SingleHost />);
    const out = [capture('closed, nothing selected')];
    await user.click(trigger());
    out.push(capture('open'));
    await user.type(search(), 'sep');
    out.push(capture('query "sep"'));
    await user.click(item('Ethereum Sepolia'));
    out.push(capture('picked Ethereum Sepolia'));
    await user.click(trigger());
    out.push(capture('reopen keeps query'));
    await user.clear(search());
    out.push(capture('query cleared, selection checked'));
    await user.click(item('Stellar Testnet'));
    out.push(capture('click disabled network'));
    await user.type(search(), 'zzz');
    out.push(capture('query "zzz" (no match)'));
    await user.keyboard('{Escape}');
    out.push(capture('Escape'));
    await user.click(trigger());
    await user.clear(search());
    await user.click(item('Ethereum Sepolia'));
    out.push(capture('re-pick Ethereum Sepolia'));
    return out;
  },

  /** AddAliasDialog shape: single, grouped by ecosystem, custom placeholder, in a form. */
  'single-grouped-in-form': async () => {
    const user = setup();
    render(<SingleHost grouped="eco" placeholder="Select network…" inForm />);
    const out = [capture('closed')];
    await user.click(trigger());
    out.push(capture('open'));
    await user.click(item('Base Sepolia'));
    out.push(capture('picked Base Sepolia (type undefined)'));
    await user.click(trigger());
    await user.click(item('Stellar'));
    out.push(capture('picked Stellar'));
    await user.click(trigger());
    await user.type(search(), 'zzz');
    out.push(capture('query "zzz" (no match)'));
    await user.clear(search());
    await user.type(search(), 'sepolia');
    out.push(capture('query "sepolia"'));
    await user.keyboard('{Escape}');
    out.push(capture('Escape'));
    return out;
  },

  /** Grouping on without getEcosystem: the "All" header. */
  'single-grouped-all': async () => {
    const user = setup();
    render(<SingleHost grouped="all" />);
    await user.click(trigger());
    const out = [capture('open')];
    await user.type(search(), 'zzz');
    out.push(capture('query "zzz" (no match)'));
    await user.keyboard('{Escape}');
    out.push(capture('Escape'));
    return out;
  },

  'single-no-networks': async () => {
    const user = setup();
    render(<SingleHost networks={[]} />);
    const out = [capture('closed')];
    await user.click(trigger());
    out.push(capture('open'));
    return out;
  },

  /** Multi, default trigger, ungrouped. */
  'multi-default': async () => {
    const user = setup();
    render(<MultiHost />);
    const out = [capture('closed, zero')];
    await user.click(trigger());
    out.push(capture('open'));
    await user.click(item('Ethereum'));
    out.push(capture('pick Ethereum'));
    await user.click(item('Base Sepolia'));
    out.push(capture('pick Base Sepolia'));
    await user.click(item('Midnight'));
    out.push(capture('click disabled Midnight'));
    await user.click(item('Ethereum'));
    out.push(capture('deselect Ethereum'));
    await user.click(item('Ethereum'));
    out.push(capture('re-pick Ethereum'));
    await user.type(search(), 'zzz');
    out.push(capture('query "zzz" (no match)'));
    await user.clear(search());
    await user.type(search(), 'stell');
    out.push(capture('query "stell" hides selected'));
    const clear = clearAll();
    if (!clear) throw new Error('no Clear all');
    await user.click(clear);
    out.push(capture('Clear all with hidden selection'));
    await user.keyboard('{Escape}');
    out.push(capture('Escape'));
    return out;
  },

  /** Stale and duplicated ids: the count is raw, a toggle removes every copy. */
  'multi-stale-duplicate': async () => {
    const user = setup();
    render(<MultiHost initial={['eth', 'eth', 'gone']} />);
    const out = [capture('closed, three raw ids')];
    await user.click(trigger());
    out.push(capture('open'));
    await user.click(item('Ethereum'));
    out.push(capture('toggle Ethereum removes both copies'));
    const clear = clearAll();
    if (!clear) throw new Error('no Clear all');
    await user.click(clear);
    out.push(capture('Clear all with only a stale id'));
    return out;
  },

  /** AddressBookWidget shape: multi, grouped, icon button trigger with a badge. */
  'multi-custom-grouped': async () => {
    const user = setup();
    render(<MultiHost grouped="eco" custom />);
    const out = [capture('closed, zero')];
    await user.click(trigger());
    out.push(capture('open'));
    await user.click(item('Stellar'));
    await user.click(item('Ethereum Sepolia'));
    out.push(capture('two picked'));
    await user.keyboard('{Escape}');
    out.push(capture('Escape'));
    await user.click(trigger());
    await user.type(search(), 'eth');
    out.push(capture('reopen, query "eth"'));
    return out;
  },

  'multi-all-selected': async () => {
    render(<MultiHost initial={NETS.map(id)} />);
    return [capture('closed, every network selected')];
  },
};

// ── The ledger: the only differences the rebuild may show (INV-1). Applied to the baseline. ──

const EMPTY = 'No network found.';
type Patch = (s: Snap) => void;

const LEDGER: Record<string, { id: string; patch: Patch }> = {
  // P-1: the empty text now shows in ungrouped mode too.
  'single-ungrouped/query "zzz" (no match)': {
    id: 'P-1',
    patch: (s) => {
      s.popupText = EMPTY;
    },
  },
  'multi-default/query "zzz" (no match)': {
    id: 'P-1',
    patch: (s) => {
      // The selection row stays; the empty text follows it.
      s.popupText = `${s.popupText}${EMPTY}`;
    },
  },
  // P-1 detail: grouping without getEcosystem showed "All" over nothing.
  'single-grouped-all/query "zzz" (no match)': {
    id: 'P-1 detail',
    patch: (s) => {
      s.rows = [];
      s.popupText = EMPTY;
    },
  },
  // P-1 detail: `networks = []` ungrouped showed a blank panel.
  'single-no-networks/open': {
    id: 'P-1 detail',
    patch: (s) => {
      s.popupText = EMPTY;
    },
  },
};

const FIXTURE = path.join(__dirname, 'network-selector.sf17-baseline.fd8850a08.json');
type Records = Record<string, Snap[]>;
const recorded: Records = {};

beforeEach(() => {
  emits = [];
  submits = 0;
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element['scrollIntoView'];
});
afterEach(() => {
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});
afterAll(() => {
  const out = process.env.SF17_RECORD;
  if (out) writeFileSync(out, `${JSON.stringify(recorded, null, 2)}\n`);
});

function expected(script: string, baseline: Snap[]): Snap[] {
  return baseline.map((snap) => {
    const copy = structuredClone(snap);
    LEDGER[`${script}/${snap.step}`]?.patch(copy);
    delete copy.rk;
    return copy;
  });
}

const strip = (snaps: Snap[]): Snap[] =>
  snaps.map((s) => {
    const { rk: _rk, ...rest } = s;
    return rest;
  });

describe('INV-1: before/after parity holds except for the ledger', () => {
  for (const [script, run] of Object.entries(SCRIPTS)) {
    it(`${script}: text, names, check marks, emits and focus equal the baseline`, async () => {
      const snaps = await run();
      recorded[script] = snaps;
      if (process.env.SF17_RECORD) return;
      const baseline = (JSON.parse(readFileSync(FIXTURE, 'utf8')) as Records)[script];
      expect(baseline, `fixture has no "${script}"`).toBeDefined();
      expect(strip(snaps)).toEqual(expected(script, baseline as Snap[]));
    });
  }

  it.skipIf(Boolean(process.env.SF17_RECORD))(
    'every ledger patch changes the baseline it applies to (no vacuous rows)',
    () => {
      expect(existsSync(FIXTURE)).toBe(true);
      const baseline = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Records;
      for (const key of Object.keys(LEDGER)) {
        const [script, step] = key.split('/') as [string, string];
        const snap = baseline[script]?.find((s) => s.step === step);
        expect(snap, key).toBeDefined();
        const patched = structuredClone(snap as Snap);
        LEDGER[key]?.patch(patched);
        expect(patched, `${key} (${LEDGER[key]?.id})`).not.toEqual(snap);
      }
    }
  );

  it.skipIf(Boolean(process.env.SF17_RECORD))(
    'R-1..R-3 are the only role changes: menu/menuitem → listbox/option, one unnamed group gone',
    async () => {
      const baseline = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Records;
      const open = baseline['multi-default']?.find((s) => s.step === 'open');
      expect(open?.rk).toMatchObject({ popupRole: 'menu', itemRoles: ['menuitem'], groups: 1 });
      const now = (await SCRIPTS['multi-default']?.())?.find((s) => s.step === 'open');
      expect(now?.rk).toMatchObject({ popupRole: 'listbox', itemRoles: ['option'], groups: 0 });
    }
  );
});
