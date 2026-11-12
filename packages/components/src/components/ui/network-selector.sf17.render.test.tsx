/**
 * @vitest-environment jsdom
 *
 * SF-17 · Render contract — INV-2 (default triggers), INV-3 (custom trigger keeps
 * its role and name), INV-4 (popup named by its trigger), INV-5 (option content),
 * INV-6 (grouping), INV-7 (selection row), INV-10 (copy defaults and overrides),
 * INV-26 (state not by color alone).
 * Stage artifact: sf-17-network-selector-rebuild/03-invariants.md
 */
import { render, screen } from '@testing-library/react';
import { computeAccessibleName } from 'dom-accessibility-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import {
  eco,
  FilterButton,
  icon,
  isOff,
  Multi,
  NETS,
  netType,
  offLabel,
  q,
  setup,
  Single,
  type Net,
} from './network-selector.sf17.helpers';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element['scrollIntoView'];
});
afterEach(() => {
  vi.restoreAllMocks();
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

const byId = (id: string): Net => NETS.find((n) => n.id === id) as Net;

describe('INV-2: default triggers keep the old markup, with SF-15 ARIA added', () => {
  it('single, nothing selected: one outline button, combobox ARIA, placeholder, chevron, no name', async () => {
    const user = setup();
    render(<Single className="extra" />);
    const t = q.trigger();
    expect(t.tagName).toBe('BUTTON');
    expect(t.getAttribute('type')).toBe('button');
    expect(t.id).not.toBe('');
    expect(t.className).toContain('w-full');
    expect(t.className).toContain('justify-between');
    expect(t.className).toContain('extra');
    expect(t.getAttribute('role')).toBe('combobox');
    expect(t.getAttribute('aria-haspopup')).toBe('listbox');
    expect(t.getAttribute('aria-expanded')).toBe('false');
    expect(t.hasAttribute('aria-controls')).toBe(false);
    expect(t.hasAttribute('aria-label')).toBe(false);
    expect(t.hasAttribute('aria-labelledby')).toBe(false);
    expect(t.lastElementChild?.classList.contains('lucide-chevron-down')).toBe(true);
    const placeholder = t.querySelector('span.text-muted-foreground');
    expect(placeholder?.textContent).toBe('Select Network');
    // Parity: a combobox takes no name from content, in both builds.
    expect(computeAccessibleName(t)).toBe('');

    await user.click(t);
    expect(t.getAttribute('aria-expanded')).toBe('true');
    expect(t.getAttribute('aria-controls')).toBe(q.listbox().id);
  });

  it('single, selected: icon, label, then the type chip; no chip without getNetworkType', () => {
    const { unmount } = render(
      <Single initial={byId('sep')} getNetworkIcon={icon} getNetworkType={netType} />
    );
    const inner = q.trigger().firstElementChild as HTMLElement;
    const kids = Array.from(inner.children);
    expect(kids[0]?.getAttribute('data-net-icon')).toBe('sep');
    expect(kids[1]?.textContent).toBe('Ethereum Sepolia');
    expect(kids[2]?.textContent).toBe('testnet');
    expect(kids).toHaveLength(3);
    unmount();

    render(<Single initial={byId('sep')} />);
    expect(Array.from((q.trigger().firstElementChild as HTMLElement).children)).toHaveLength(1);
  });

  it('boundary (D5): the chip renders, empty, when getNetworkType returns undefined', () => {
    render(<Single initial={byId('base')} getNetworkType={netType} />);
    const kids = Array.from((q.trigger().firstElementChild as HTMLElement).children);
    expect(kids).toHaveLength(2);
    expect(kids[1]?.textContent).toBe('');
  });

  it.each([
    [[], 'Select Network'],
    [['eth'], '1 network selected'],
    [['eth', 'xlm'], '2 networks selected'],
    [NETS.map((n) => n.id), '6 networks selected'],
  ] as const)('multi with %j shows "%s" in the always-muted span', (initial, text) => {
    render(<Multi initial={initial} />);
    const span = q.trigger().firstElementChild as HTMLElement;
    expect(span.className).toBe('truncate text-muted-foreground');
    expect(span.textContent).toBe(text);
    expect(computeAccessibleName(q.trigger())).toBe('');
  });
});

describe('INV-3: a custom renderTrigger keeps its own role and name (D4)', () => {
  it('receives id, listbox ARIA and type, never role, className or data-slot', async () => {
    const user = setup();
    const spy = vi.fn();
    render(
      <Multi
        className="never-applied"
        renderTrigger={(state) => {
          spy(state);
          return <FilterButton count={state.selectedCount} />;
        }}
      />
    );
    const f = q.filter();
    expect(f.hasAttribute('role')).toBe(false);
    expect(f.id).not.toBe('');
    expect(f.getAttribute('type')).toBe('button');
    expect(f.getAttribute('aria-haspopup')).toBe('listbox');
    expect(f.getAttribute('aria-expanded')).toBe('false');
    expect(f.hasAttribute('aria-controls')).toBe(false);
    expect(f.className).not.toContain('never-applied');
    expect(f.hasAttribute('data-slot')).toBe(false);
    expect(spy).toHaveBeenLastCalledWith({ selectedCount: 0, open: false });

    await user.click(f);
    expect(f.hasAttribute('role')).toBe(false);
    expect(f.getAttribute('aria-expanded')).toBe('true');
    expect(f.getAttribute('aria-controls')).toBe(q.listbox().id);
    expect(spy).toHaveBeenLastCalledWith({ selectedCount: 0, open: true });
  });

  it('its name is "" with nothing selected and the badge text otherwise (the baseline names)', () => {
    const { unmount } = render(
      <Multi renderTrigger={({ selectedCount }) => <FilterButton count={selectedCount} />} />
    );
    expect(computeAccessibleName(q.filter())).toBe('');
    unmount();
    render(
      <Multi
        initial={['eth', 'xlm']}
        renderTrigger={({ selectedCount }) => <FilterButton count={selectedCount} />}
      />
    );
    expect(computeAccessibleName(q.filter())).toBe('2');
    expect(screen.getByRole('button', { name: '2' })).toBe(q.filter());
  });

  it('failure guard: the consumer’s own props win the merge (role, aria-label, id; A1)', () => {
    render(
      <Multi
        renderTrigger={({ selectedCount }) => (
          <FilterButton count={selectedCount} role="button" aria-label="Filter" id="mine" />
        )}
      />
    );
    const f = q.filter();
    expect(f.getAttribute('role')).toBe('button');
    expect(f.id).toBe('mine');
    expect(computeAccessibleName(f)).toBe('Filter');
  });
});

describe('INV-4: the popup is named by its trigger (D3)', () => {
  const kinds: Array<[string, () => React.ReactElement, () => HTMLElement]> = [
    ['single default', () => <Single />, () => q.trigger()],
    ['multi default', () => <Multi initial={['eth']} />, () => q.trigger()],
    [
      'custom',
      () => (
        <Multi
          initial={['eth', 'sep']}
          renderTrigger={({ selectedCount }) => <FilterButton count={selectedCount} />}
        />
      ),
      () => q.filter(),
    ],
  ];

  it.each(kinds)('%s: dialog and listbox are aria-labelledby the trigger', async (_k, ui, trig) => {
    const user = setup();
    render(ui());
    await user.click(trig());
    const dialog = q.dialog() as HTMLElement;
    const listbox = q.listbox();
    expect(dialog.getAttribute('aria-labelledby')).toBe(trig().id);
    expect(listbox.getAttribute('aria-labelledby')).toBe(trig().id);
    expect(document.getElementById(trig().id)).toBe(trig());
    expect(dialog.hasAttribute('aria-label')).toBe(false);
    expect(computeAccessibleName(listbox)).toBe(computeAccessibleName(dialog));
  });

  it('the custom trigger case names the popup with the badge text', async () => {
    const user = setup();
    render(
      <Multi
        initial={['eth', 'sep']}
        renderTrigger={({ selectedCount }) => <FilterButton count={selectedCount} />}
      />
    );
    await user.click(q.filter());
    expect(computeAccessibleName(q.listbox())).toBe('2');
  });

  it('boundary: two instances get distinct trigger ids', () => {
    render(
      <>
        <Single />
        <Single />
      </>
    );
    const ids = Array.from(
      document.querySelectorAll('[data-slot="network-selector-trigger"]'),
      (t) => t.id
    );
    expect(new Set(ids).size).toBe(2);
  });
});

describe('INV-5: open structure and option content', () => {
  it('DOM order: dialog > search, selection row, listbox, status', async () => {
    const user = setup();
    render(<Multi initial={['eth']} />);
    await user.click(q.trigger());
    const dialog = q.dialog() as HTMLElement;
    const order = [q.search(), q.summary(), q.listbox(), q.status()].map((el) => {
      expect(dialog.contains(el)).toBe(true);
      return el as HTMLElement;
    });
    for (let i = 1; i < order.length; i += 1) {
      expect(
        (order[i - 1] as HTMLElement).compareDocumentPosition(order[i] as HTMLElement) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
    expect(computeAccessibleName(q.search())).toBe('Search networks');
    expect(q.search().placeholder).toBe('Search network...');
    expect(q.listbox().getAttribute('aria-multiselectable')).toBe('true');
  });

  it('multi option: aria-hidden checkbox, icon, label, chip, pill; names are label + type + pill', async () => {
    const user = setup();
    render(
      <Multi
        initial={['eth']}
        getNetworkIcon={icon}
        getNetworkType={netType}
        isNetworkDisabled={isOff}
        getNetworkDisabledLabel={offLabel}
      />
    );
    await user.click(q.trigger());
    const opt = q.option('Stellar Testnet');
    const kids = Array.from(opt.children);
    expect(kids[0]?.getAttribute('aria-hidden')).toBe('true');
    expect(kids[1]?.getAttribute('data-net-icon')).toBe('xlm-test');
    expect(Array.from(kids[2]?.children ?? [], (c) => c.textContent)).toEqual([
      'Stellar Testnet',
      'testnet',
      'Self-host required',
    ]);
    expect(kids).toHaveLength(3);
    expect(q.options().map((o) => computeAccessibleName(o))).toEqual([
      'Ethereum mainnet',
      'Ethereum Sepolia testnet',
      'Stellar mainnet',
      'Stellar Testnet testnet Self-host required',
      'Base Sepolia',
      'Midnight devnet',
    ]);
  });

  it('single option: no checkbox; a check icon last only on the selected option', async () => {
    const user = setup();
    render(<Single initial={byId('xlm')} getNetworkType={netType} />);
    await user.click(q.trigger());
    expect(q.listbox().hasAttribute('aria-multiselectable')).toBe(false);
    const selected = q.option('Stellar');
    expect(selected.lastElementChild?.classList.contains('lucide-check')).toBe(true);
    for (const o of q.options().filter((x) => x !== selected)) {
      expect(o.querySelector('.lucide-check')).toBeNull();
      expect(o.querySelector('[aria-hidden="true"].rounded-sm')).toBeNull();
    }
  });

  it('failure guard: no pill for an enabled network or an empty label', async () => {
    const user = setup();
    render(
      <Single
        isNetworkDisabled={(n) => n.id === 'mid'}
        getNetworkDisabledLabel={(n) => (n.id === 'mid' ? '' : 'Should not show')}
      />
    );
    await user.click(q.trigger());
    expect(document.body.textContent).not.toContain('Should not show');
    expect(q.option('Midnight').querySelectorAll('.rounded-full')).toHaveLength(0);
  });
});

describe('INV-6: grouping matches the old headers', () => {
  it('ungrouped (default): no group and no header (R-3)', async () => {
    const user = setup();
    render(<Single getEcosystem={eco} />);
    await user.click(q.trigger());
    expect(q.groups()).toHaveLength(0);
  });

  it('grouped: one labelled group per ecosystem, in first-survivor order (P-2), source order inside', async () => {
    const user = setup();
    render(<Single groupByEcosystem getEcosystem={eco} isNetworkDisabled={isOff} />);
    await user.click(q.trigger());
    const groups = q.groups();
    expect(q.headers().map((h) => h?.textContent)).toEqual(['EVM', 'STELLAR', 'MIDNIGHT']);
    for (const g of groups) {
      const header = g.querySelector(':scope > [role="presentation"]') as HTMLElement;
      expect(g.getAttribute('aria-labelledby')).toBe(header.id);
      expect(computeAccessibleName(g)).toBe(header.textContent);
    }
    expect(q.labels()).toEqual([
      'Ethereum',
      'Ethereum Sepolia',
      'Base Sepolia',
      'Stellar',
      'Stellar Testnet',
      'Midnight',
    ]);
    // Keyboard order is visual order, over enabled options, and headers are never active.
    const visited: Array<string | null> = [q.active()];
    for (let i = 0; i < 4; i += 1) {
      await user.keyboard('{ArrowDown}');
      visited.push(q.active());
    }
    expect(visited).toEqual([
      'Ethereum',
      'Ethereum Sepolia',
      'Base Sepolia',
      'Stellar',
      'Ethereum',
    ]);
  });

  it('grouped without getEcosystem: one "All" group', async () => {
    const user = setup();
    render(<Single groupByEcosystem />);
    await user.click(q.trigger());
    expect(q.headers().map((h) => h?.textContent)).toEqual(['All']);
    expect(q.options()).toHaveLength(NETS.length);
  });

  it('boundary (D7): an empty-string ecosystem is its own group with an empty header', async () => {
    const user = setup();
    render(<Single groupByEcosystem getEcosystem={(n) => (n.eco === 'STELLAR' ? '' : n.eco)} />);
    await user.click(q.trigger());
    expect(q.headers().map((h) => h?.textContent)).toEqual(['EVM', '', 'MIDNIGHT']);
    expect(
      Array.from(
        q.groups()[1]?.querySelectorAll('[role="option"]') ?? [],
        (o) => o.querySelector('span.truncate')?.textContent
      )
    ).toEqual(['Stellar', 'Stellar Testnet']);
  });
});

describe('INV-7: the selection row appears only in multi mode with a selection', () => {
  it.each([
    [[], null],
    [['eth'], '1 selected'],
    [['eth', 'xlm', 'gone'], '3 selected'],
  ] as const)('multi %j → %s', async (initial, text) => {
    const user = setup();
    render(<Multi initial={initial} />);
    await user.click(q.trigger());
    if (text === null) {
      expect(q.summary()).toBeNull();
      expect(q.clear()).toBeNull();
      return;
    }
    expect(q.summary()?.firstElementChild?.textContent).toBe(text);
    const clear = q.clear() as HTMLButtonElement;
    expect(clear.getAttribute('type')).toBe('button');
    expect(clear.textContent).toBe('Clear all');
    expect(q.summary()?.contains(clear)).toBe(true);
  });

  it("uses its own data-slot names, never SearchableMultiSelect's", async () => {
    const user = setup();
    render(<Multi initial={['eth']} />);
    await user.click(q.trigger());
    const slots = Array.from(document.querySelectorAll('[data-slot]')).map((el) =>
      el.getAttribute('data-slot')
    );
    expect(slots.filter((slot) => slot?.startsWith('searchable-multi-select'))).toEqual([]);
    for (const name of ['trigger', 'content', 'search', 'listbox', 'option', 'empty', 'summary']) {
      expect(slots, name).toContain(`network-selector-${name}`);
    }
  });

  it('never in single mode, even with a selection', async () => {
    const user = setup();
    render(<Single initial={byId('eth')} />);
    await user.click(q.trigger());
    expect(q.summary()).toBeNull();
    expect(q.clear()).toBeNull();
  });

  it('a custom formatSelectionSummary renders verbatim', async () => {
    const user = setup();
    render(<Multi initial={['eth', 'sep']} formatSelectionSummary={(n, t) => `${n}/${t}`} />);
    await user.click(q.trigger());
    expect(q.summary()?.firstElementChild?.textContent).toBe('2/6');
  });
});

describe('INV-10: copy comes from a prop or its exact default, per instance', () => {
  it('two instances: every override shows on one, every default on the other', async () => {
    const user = setup();
    const count = vi.fn((n: number, t: number) => `${n} of ${t} chains`);
    const summary = vi.fn((n: number, t: number) => `${n}/${t} picked`);
    render(
      <>
        <div data-testid="custom">
          <Multi
            initial={['eth']}
            placeholder="Pick chains"
            searchPlaceholder="Filter chains…"
            searchLabel="Filter chains"
            emptyText="No chain matches."
            formatSelectedCount={count}
            formatSelectionSummary={summary}
            clearAllLabel="Reset"
          />
        </div>
        <div data-testid="plain">
          <Multi initial={['eth']} />
        </div>
      </>
    );
    const [custom, plain] = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-slot="network-selector-trigger"]')
    ) as [HTMLButtonElement, HTMLButtonElement];
    expect(custom.textContent).toBe('1 of 6 chains');
    expect(plain.textContent).toBe('1 network selected');
    expect(count).toHaveBeenCalledWith(1, 6);

    await user.click(custom);
    expect(computeAccessibleName(q.search())).toBe('Filter chains');
    expect(q.search().placeholder).toBe('Filter chains…');
    expect(q.summary()?.firstElementChild?.textContent).toBe('1/6 picked');
    expect(summary).toHaveBeenCalledWith(1, 6);
    expect(q.clear()?.textContent).toBe('Reset');
    await user.type(q.search(), 'zzz');
    expect(q.status().textContent).toBe('No chain matches.');
    await user.keyboard('{Escape}');

    await user.click(plain);
    expect(computeAccessibleName(q.search())).toBe('Search networks');
    expect(q.search().placeholder).toBe('Search network...');
    expect(q.summary()?.firstElementChild?.textContent).toBe('1 selected');
    expect(q.clear()?.textContent).toBe('Clear all');
    await user.type(q.search(), 'zzz');
    expect(q.status().textContent).toBe('No network found.');
  });

  it('placeholder override in both modes; the default placeholder is "Select Network"', () => {
    render(
      <>
        <Single placeholder="Choose…" />
        <Multi placeholder="Pick chains" />
        <Single />
      </>
    );
    expect(
      Array.from(
        document.querySelectorAll('[data-slot="network-selector-trigger"]'),
        (t) => t.textContent
      )
    ).toEqual(['Choose…', 'Pick chains', 'Select Network']);
  });

  it('boundary: the default search placeholder uses three ASCII dots, not an ellipsis', async () => {
    const user = setup();
    render(<Single />);
    await user.click(q.trigger());
    expect(q.search().placeholder).toBe('Search network' + '.'.repeat(3));
    expect(q.search().placeholder).not.toContain('…');
  });

  it('failure guard: a formatter returning "" renders "" (no fallback, SF-15 A2)', () => {
    render(<Multi initial={['eth']} formatSelectedCount={() => ''} />);
    expect(q.trigger().textContent).toBe('');
  });
});

describe('INV-26: state is never conveyed by color alone', () => {
  it('selected, disabled and active each have an attribute and a non-color mark', async () => {
    const user = setup();
    render(
      <Multi initial={['sep']} isNetworkDisabled={isOff} getNetworkDisabledLabel={offLabel} />
    );
    await user.click(q.trigger());
    expect(q.options().map((o) => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
      'false',
      'false',
      'false',
    ]);
    expect(
      q.option('Ethereum Sepolia').firstElementChild?.querySelector('.lucide-check')
    ).not.toBeNull();
    expect(q.option('Ethereum').firstElementChild?.querySelector('.lucide-check')).toBeNull();
    expect(q.option('Stellar Testnet').getAttribute('aria-disabled')).toBe('true');
    expect(q.option('Stellar Testnet').textContent).toContain('Self-host required');
    expect(q.option('Ethereum').hasAttribute('aria-disabled')).toBe(false);
    expect(q.active()).toBe('Ethereum');
    expect(q.option('Ethereum').hasAttribute('data-active')).toBe(true);
  });
});
