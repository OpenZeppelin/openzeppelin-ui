/**
 * @vitest-environment jsdom
 *
 * SF-17 · Prop / state contract and stability — INV-9 (runtime surface), INV-11
 * (multi emits), INV-12 (single emits), INV-13 (disabled never emits), INV-14
 * (filter and identity), INV-15 (total rendering, no console), INV-16 (controlled,
 * stateless), INV-22 (adapter stability), INV-23 (unmount while open is clean).
 * Stage artifact: sf-17-network-selector-rebuild/03-invariants.md
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import * as Root from '../../index';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import * as UiBarrel from './index';
import { NetworkSelector } from './network-selector';
import {
  eco,
  FilterButton,
  icon,
  isOff,
  label,
  Multi,
  netId,
  NETS,
  netType,
  offLabel,
  pageResidue,
  q,
  setup,
  Single,
  type Net,
} from './network-selector.sf17.helpers';

let consoleSpies: Array<ReturnType<typeof vi.spyOn>> = [];
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element['scrollIntoView'];
  consoleSpies = [
    vi.spyOn(console, 'error').mockImplementation(() => {}),
    vi.spyOn(console, 'warn').mockImplementation(() => {}),
  ];
});
afterEach(() => {
  vi.restoreAllMocks();
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});
const consoleCalls = (): unknown[][] => consoleSpies.flatMap((s) => s.mock.calls);

const byId = (id: string): Net => NETS.find((n) => n.id === id) as Net;
const SOURCE = readFileSync(path.join(__dirname, 'network-selector.tsx'), 'utf8');

describe('INV-9: the runtime surface is unchanged and the core stays internal', () => {
  it('NetworkSelector is exported from the package root and the ui barrel', () => {
    expect(Root.NetworkSelector).toBe(NetworkSelector);
    expect(UiBarrel.NetworkSelector).toBe(NetworkSelector);
  });

  it('failure guard: no core value reaches the root or the barrel', () => {
    for (const name of ['SearchableSelectCore', 'buildListModel', 'toggleId']) {
      expect(Object.keys(Root), name).not.toContain(name);
      expect(Object.keys(UiBarrel), name).not.toContain(name);
    }
  });

  it('the changeset is a minor for the kit only and names the menu → listbox query change', () => {
    const file = path.join(
      __dirname,
      '../../../../../.changeset/network-selector-searchable-core.md'
    );
    const text = readFileSync(file, 'utf8');
    const front = text.split('---')[1] ?? '';
    expect(front.trim()).toBe("'@openzeppelin/ui-components': minor");
    expect(text).toMatch(/menuitem/);
    expect(text).toMatch(/listbox/);
  });
});

describe('INV-11: multi mode emits exactly the old id lists', () => {
  it('pick A, pick B, deselect A, re-pick A, Clear all → the toggle rule, one call each', async () => {
    const user = setup();
    const onChange = vi.fn();
    render(<Multi onChange={onChange} />);
    await user.click(q.trigger());
    await user.click(q.option('Ethereum'));
    await user.click(q.option('Stellar'));
    await user.click(q.option('Ethereum'));
    await user.click(q.option('Ethereum'));
    await user.click(q.clear() as HTMLButtonElement);
    expect(onChange.mock.calls).toEqual([
      [['eth']],
      [['eth', 'xlm']],
      [['xlm']],
      [['xlm', 'eth']],
      [[]],
    ]);
    // Stays open after every toggle.
    expect(q.dialog()).not.toBeNull();
  });

  it('boundary: stale ids keep their place; a duplicated id is removed in every copy', async () => {
    const user = setup();
    const onChange = vi.fn();
    render(<Multi initial={['gone', 'eth', 'x', 'eth']} onChange={onChange} />);
    await user.click(q.trigger());
    await user.click(q.option('Ethereum'));
    await user.click(q.option('Base Sepolia'));
    expect(onChange.mock.calls).toEqual([[['gone', 'x']], [['gone', 'x', 'base']]]);
  });

  it('boundary: Clear all emits [] with only stale ids, and with the selection hidden by the query', async () => {
    const user = setup();
    const onChange = vi.fn();
    const { unmount } = render(<Multi initial={['gone']} onChange={onChange} />);
    await user.click(q.trigger());
    await user.click(q.clear() as HTMLButtonElement);
    unmount();
    render(<Multi initial={['eth']} onChange={onChange} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'stell');
    await user.click(q.clear() as HTMLButtonElement);
    expect(onChange.mock.calls).toEqual([[[]], [[]]]);
  });

  it('failure guard: open, type, arrows, hover, Escape, rerender and unmount emit nothing', async () => {
    const user = setup();
    const onChange = vi.fn();
    const { rerender, unmount } = render(<Multi initial={['eth']} onChange={onChange} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'e');
    await user.keyboard('{ArrowDown}{ArrowUp}{ArrowDown}');
    await user.hover(q.option('Stellar'));
    await user.keyboard('{Escape}');
    rerender(<Multi initial={['eth']} onChange={onChange} networks={[...NETS]} />);
    unmount();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('never mutates the prop (the harness passes frozen arrays, which would throw)', async () => {
    const user = setup();
    const frozen = Object.freeze(['eth', 'sep']) as string[];
    const onChange = vi.fn();
    render(
      <NetworkSelector<Net>
        multiple
        networks={NETS as Net[]}
        selectedNetworkIds={frozen}
        onSelectionChange={onChange}
        getNetworkLabel={label}
        getNetworkId={netId}
      />
    );
    await user.click(q.trigger());
    await user.click(q.option('Ethereum'));
    await user.click(q.option('Stellar'));
    expect(frozen).toEqual(['eth', 'sep']);
    expect(onChange.mock.calls).toEqual([[['sep']], [['eth', 'sep', 'xlm']]]);
    expect(onChange.mock.calls[0]?.[0]).not.toBe(frozen);
  });
});

describe('INV-12: single mode emits the picked network object on every pick', () => {
  it('click and Enter each emit once, by reference; a re-pick emits again; the list closes', async () => {
    const user = setup();
    const onPick = vi.fn();
    render(<Single onPick={onPick} />);
    await user.click(q.trigger());
    await user.click(q.option('Stellar'));
    expect(q.dialog()).toBeNull();
    await user.click(q.trigger());
    await user.keyboard('{Enter}'); // the first enabled option is active on open
    await user.click(q.trigger());
    await user.click(q.option('Ethereum'));
    expect(onPick.mock.calls.map(([n]) => n)).toEqual([byId('xlm'), byId('eth'), byId('eth')]);
    for (const [n] of onPick.mock.calls) expect(NETS).toContain(n);
    expect(onPick.mock.calls[2]?.[0]).toBe(NETS[0]);
  });

  it('failure guard: open, close, typing and Escape never call onSelectNetwork', async () => {
    const user = setup();
    const onPick = vi.fn();
    render(<Single onPick={onPick} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'stel');
    await user.keyboard('{ArrowDown}{Escape}');
    await user.click(q.trigger());
    await user.click(q.trigger());
    expect(onPick).not.toHaveBeenCalled();
  });

  it('the selected option follows getNetworkId, not object identity', async () => {
    const user = setup();
    render(<Single initial={{ ...byId('xlm') }} />);
    await user.click(q.trigger());
    expect(q.option('Stellar').getAttribute('aria-selected')).toBe('true');
  });
});

describe('INV-13: disabled networks never emit', () => {
  const D: readonly Net[] = [
    { id: 'd1', name: 'Down One', eco: 'X', off: 'Off' },
    { id: 'e1', name: 'Up One', eco: 'X' },
    { id: 'd2', name: 'Down Two', eco: 'X', off: true },
    { id: 'e2', name: 'Up Two', eco: 'X' },
  ];

  it.each(['single', 'multi'] as const)(
    '%s: click on D emits nothing; arrows visit only E1, E2',
    async (mode) => {
      const user = setup();
      const spy = vi.fn();
      render(
        mode === 'single' ? (
          <Single networks={D} isNetworkDisabled={isOff} onPick={spy} />
        ) : (
          <Multi networks={D} isNetworkDisabled={isOff} onChange={spy} />
        )
      );
      await user.click(q.trigger());
      await user.click(q.option('Down One'));
      await user.click(q.option('Down Two'));
      expect(spy).not.toHaveBeenCalled();
      expect(q.dialog()).not.toBeNull();
      expect(q.option('Down One').getAttribute('aria-disabled')).toBe('true');
      expect(q.option('Down One').getAttribute('aria-selected')).toBe('false');
      const seen = [q.active()];
      for (let i = 0; i < 3; i += 1) {
        await user.keyboard('{ArrowDown}');
        seen.push(q.active());
      }
      expect(seen).toEqual(['Up One', 'Up Two', 'Up One', 'Up Two']);
    }
  );

  it('boundary: a selected disabled network still reports aria-selected="true"', async () => {
    const user = setup();
    render(<Multi networks={D} initial={['d1']} isNetworkDisabled={isOff} />);
    await user.click(q.trigger());
    expect(q.option('Down One').getAttribute('aria-selected')).toBe('true');
  });

  it('failure: every network disabled → nothing active and Enter emits nothing', async () => {
    const user = setup();
    const spy = vi.fn();
    render(<Single networks={D} isNetworkDisabled={() => true} onPick={spy} />);
    await user.click(q.trigger());
    expect(q.search().hasAttribute('aria-activedescendant')).toBe(false);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('INV-14: the filter rule and identity rule are the old ones', () => {
  it('default rule: case-insensitive substring of the label, query not trimmed', async () => {
    const user = setup();
    render(<Single />);
    await user.click(q.trigger());
    await user.type(q.search(), 'SEPOL');
    expect(q.labels()).toEqual(['Ethereum Sepolia', 'Base Sepolia']);
    await user.clear(q.search());
    await user.type(q.search(), ' eth');
    expect(q.labels()).toEqual([]);
    await user.clear(q.search());
    expect(q.labels()).toHaveLength(NETS.length);
  });

  it('a custom filterNetwork gets the raw query and is never called for an empty query', async () => {
    const user = setup();
    const filter = vi.fn((n: Net, query: string) => n.eco.toLowerCase() === query);
    render(<Single filterNetwork={filter} />);
    await user.click(q.trigger());
    expect(filter).not.toHaveBeenCalled();
    await user.type(q.search(), 'evm');
    expect(q.labels()).toEqual(['Ethereum', 'Ethereum Sepolia', 'Base Sepolia']);
    expect(filter.mock.calls.map(([, query]) => query)).toContain('evm');
    filter.mockClear();
    await user.clear(q.search());
    expect(filter).not.toHaveBeenCalled();
  });

  it('boundary: duplicate labels with distinct ids are independent options', async () => {
    const user = setup();
    const onChange = vi.fn();
    const twins: Net[] = [
      { id: 'sep-a', name: 'Sepolia', eco: 'A' },
      { id: 'sep-b', name: 'Sepolia', eco: 'B' },
    ];
    render(<Multi networks={twins} onChange={onChange} />);
    await user.click(q.trigger());
    await user.click(q.options()[1] as HTMLElement);
    expect(onChange).toHaveBeenLastCalledWith(['sep-b']);
    expect(q.options().map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true']);
  });

  it('boundary: two networks sharing an id show the same selected state', async () => {
    const user = setup();
    const shared: Net[] = [
      { id: 'same', name: 'First', eco: 'A' },
      { id: 'same', name: 'Second', eco: 'A' },
    ];
    render(<Multi networks={shared} initial={['same']} />);
    await user.click(q.trigger());
    expect(q.options().map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'true']);
  });

  it('filtering never changes the selection', async () => {
    const user = setup();
    render(<Multi initial={['eth']} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'stel');
    await user.clear(q.search());
    expect(q.option('Ethereum').getAttribute('aria-selected')).toBe('true');
    expect(q.trigger().textContent).toBe('1 network selected');
  });
});

describe('INV-15: total rendering — nothing the selector owns throws or logs', () => {
  const cases: Array<[string, () => React.ReactElement]> = [
    ['no networks, single', () => <Single networks={[]} />],
    [
      'no networks, multi grouped',
      () => <Multi networks={[]} groupByEcosystem getEcosystem={eco} />,
    ],
    [
      'selectedNetwork not in networks',
      () => <Single initial={{ id: 'gone', name: 'Gone', eco: 'X' }} getNetworkType={netType} />,
    ],
    ['stale and duplicated ids', () => <Multi initial={['eth', 'eth', 'gone']} />],
    [
      'duplicate network ids',
      () => (
        <Multi
          networks={[
            { id: 'dup', name: 'One', eco: 'A' },
            { id: 'dup', name: 'Two', eco: 'A' },
          ]}
        />
      ),
    ],
    [
      'every network disabled',
      () => <Single isNetworkDisabled={() => true} getNetworkDisabledLabel={offLabel} />,
    ],
    ['empty-string ecosystem', () => <Single groupByEcosystem getEcosystem={() => ''} />],
    [
      'type returns undefined',
      () => <Single initial={byId('base')} getNetworkType={netType} getNetworkIcon={icon} />,
    ],
    [
      'custom trigger',
      () => <Multi renderTrigger={({ selectedCount }) => <FilterButton count={selectedCount} />} />,
    ],
  ];

  it.each(cases)('%s: renders closed and open with no console output', async (_name, ui) => {
    const user = setup();
    render(ui());
    const trig = document.querySelector<HTMLElement>(
      '[data-slot="network-selector-trigger"], [data-testid="filter"]'
    ) as HTMLElement;
    await user.click(trig);
    expect(q.dialog()).not.toBeNull();
    await user.type(q.search(), 'o');
    await user.keyboard('{ArrowDown}{Escape}');
    expect(consoleCalls()).toEqual([]);
  });

  it('failure: an exception from a consumer callback propagates unchanged', () => {
    const boom = new Error('label failed');
    expect(() =>
      render(
        // Thrown from the trigger render, which calls getNetworkLabel for the selection.
        <NetworkSelector<Net>
          networks={NETS as Net[]}
          selectedNetwork={byId('eth')}
          onSelectNetwork={() => {}}
          getNetworkLabel={() => {
            throw boom;
          }}
          getNetworkId={netId}
        />
      )
    ).toThrow(boom);
  });

  it('static: the file has no throw, no console call and no diagnostics hook (D10)', () => {
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(/\bthrow\b/);
    expect(code).not.toMatch(/\bconsole\./);
    expect(code).not.toMatch(/useDevDiagnostics/);
  });
});

describe('INV-16: selection is controlled and NetworkSelector is stateless', () => {
  it('aria-selected follows a new selectedNetworkIds while open', async () => {
    const user = setup();
    const ui = (ids: string[]) => (
      <NetworkSelector<Net>
        multiple
        networks={NETS as Net[]}
        selectedNetworkIds={ids}
        onSelectionChange={() => {}}
        getNetworkLabel={label}
        getNetworkId={netId}
      />
    );
    const { rerender } = render(ui([]));
    await user.click(q.trigger());
    rerender(ui(['xlm', 'base']));
    expect(q.dialog()).not.toBeNull();
    expect(
      q
        .options()
        .filter((o) => o.getAttribute('aria-selected') === 'true')
        .map((o) => o.querySelector('span.truncate')?.textContent)
    ).toEqual(['Stellar', 'Base Sepolia']);
    expect(q.trigger().textContent).toBe('2 networks selected');
  });

  it('failure: a parent that ignores the emit keeps the visible selection unchanged', async () => {
    const user = setup();
    const onChange = vi.fn();
    const { unmount } = render(<Multi ignoreEmits onChange={onChange} />);
    await user.click(q.trigger());
    await user.click(q.option('Ethereum'));
    expect(onChange).toHaveBeenCalledWith(['eth']);
    expect(q.option('Ethereum').getAttribute('aria-selected')).toBe('false');
    expect(q.trigger().textContent).toBe('Select Network');
    unmount();

    const onPick = vi.fn();
    render(<Single ignoreEmits onPick={onPick} />);
    await user.click(q.trigger());
    await user.click(q.option('Stellar'));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(q.trigger().textContent).toBe('Select Network');
  });

  it('static: no useState, useReducer or useRef in the file', () => {
    expect(SOURCE).not.toMatch(/use(State|Reducer|Ref)\s*[<(]/);
  });
});

describe('INV-22: stable adapters, so navigation does not rebuild the list model', () => {
  it('a getEcosystem spy (called only by the model) does not grow on ArrowDown or hover', async () => {
    const user = setup();
    const getEco = vi.fn(eco);
    render(<Single groupByEcosystem getEcosystem={getEco} />);
    await user.click(q.trigger());
    const afterOpen = getEco.mock.calls.length;
    expect(afterOpen).toBeGreaterThan(0);
    for (let i = 0; i < 10; i += 1) await user.keyboard('{ArrowDown}');
    await user.hover(q.option('Stellar'));
    expect(getEco.mock.calls.length).toBe(afterOpen);
  });

  it('the same holds when the consumer re-renders on every key with stable props', async () => {
    // The core's own state changes never re-render NetworkSelector, so adapter identity
    // only matters when the parent re-renders. Force that on every key and pointer move.
    const user = setup();
    const getEco = vi.fn(eco);
    const renders = { n: 0 };
    function Parent(): React.ReactElement {
      const [, force] = React.useState(0);
      renders.n += 1;
      const bump = () => force((x) => x + 1);
      return (
        <div onKeyDown={bump} onPointerMove={bump}>
          <Single groupByEcosystem getEcosystem={getEco} isNetworkDisabled={isOff} />
        </div>
      );
    }
    render(<Parent />);
    await user.click(q.trigger());
    const afterOpen = getEco.mock.calls.length;
    const rendersAtOpen = renders.n;
    for (let i = 0; i < 10; i += 1) await user.keyboard('{ArrowDown}');
    await user.hover(q.option('Stellar'));
    expect(renders.n).toBeGreaterThan(rendersAtOpen + 9);
    expect(getEco.mock.calls.length).toBe(afterOpen);
  });

  it('a filterNetwork spy with a non-empty query does not grow on ArrowDown', async () => {
    const user = setup();
    const filter = vi.fn((n: Net, query: string) => n.name.toLowerCase().includes(query));
    render(<Multi filterNetwork={filter} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'e');
    const afterType = filter.mock.calls.length;
    for (let i = 0; i < 10; i += 1) await user.keyboard('{ArrowDown}');
    expect(filter.mock.calls.length).toBe(afterType);
  });

  it('failure control: an unstable getEcosystem (new each render) does rebuild on ArrowDown', async () => {
    const user = setup();
    const calls = { n: 0 };
    function Unstable(): React.ReactElement {
      const [, force] = React.useState(0);
      return (
        <div onKeyDown={() => force((x) => x + 1)}>
          <Single
            groupByEcosystem
            getEcosystem={(n) => {
              calls.n += 1;
              return n.eco;
            }}
          />
        </div>
      );
    }
    render(<Unstable />);
    await user.click(q.trigger());
    const afterOpen = calls.n;
    await user.keyboard('{ArrowDown}');
    expect(calls.n).toBeGreaterThan(afterOpen);
  });

  it('the multi selected Set is rebuilt only when selectedNetworkIds changes identity', async () => {
    const user = setup();
    const ids = ['eth'];
    const getId = vi.fn(netId);
    const ui = (selected: string[]) => (
      <NetworkSelector<Net>
        multiple
        networks={NETS as Net[]}
        selectedNetworkIds={selected}
        onSelectionChange={() => {}}
        getNetworkLabel={label}
        getNetworkId={getId}
      />
    );
    const { rerender } = render(ui(ids));
    await user.click(q.trigger());
    const before = getId.mock.calls.length;
    for (let i = 0; i < 5; i += 1) await user.keyboard('{ArrowDown}');
    rerender(ui(ids));
    expect(getId.mock.calls.length).toBe(before);
    rerender(ui(['eth']));
    expect(getId.mock.calls.length).toBeGreaterThan(before);
  });
});

describe('INV-23: unmounting while open leaves the page clean', () => {
  it('open, then unmount: no pointer-events lock, no aria-hidden left behind', async () => {
    const user = setup();
    const before = pageResidue();
    const { unmount } = render(<Multi initial={['eth']} />);
    const closed = pageResidue();
    await user.click(q.trigger());
    expect(pageResidue()).not.toEqual(closed); // the modal layer did lock the page
    unmount();
    expect(pageResidue()).toEqual(before);
  });

  it('inside a kit Dialog that closes while the list is open', async () => {
    const user = setup();
    function Host(): React.ReactElement {
      const [open, setOpen] = React.useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)} data-testid="outside-close">
            close
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogTitle>Add Alias</DialogTitle>
              <DialogDescription>d</DialogDescription>
              <Single groupByEcosystem getEcosystem={eco} />
            </DialogContent>
          </Dialog>
        </>
      );
    }
    const before = pageResidue();
    render(<Host />);
    await user.click(q.trigger());
    expect(q.dialog()).not.toBeNull();
    act(() => {
      (document.querySelector('[data-testid="outside-close"]') as HTMLButtonElement).click();
    });
    expect(q.dialog()).toBeNull();
    expect(pageResidue()).toEqual(before);
    expect(document.querySelectorAll('[data-radix-focus-guard]')).toHaveLength(0);
  });

  it('static: the file adds no effect of its own', () => {
    expect(SOURCE).not.toMatch(/use(Layout)?Effect\s*\(/);
  });
});
