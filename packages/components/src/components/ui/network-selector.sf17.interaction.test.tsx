/**
 * @vitest-environment jsdom
 *
 * SF-17 · Interaction, empty state and focus — INV-17 (nothing submits an
 * enclosing form), INV-18 (Escape inside a kit Dialog closes only the list),
 * INV-19 (open / navigate / activate for every trigger), INV-20 (query survives
 * close), INV-21 (Clear all keeps the user in the popover), INV-24 (empty result
 * shown and announced in every mode, P-1), INV-25 (focus in on open, back on close).
 * Stage artifact: sf-17-network-selector-rebuild/03-invariants.md
 */
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import {
  eco,
  FilterButton,
  isOff,
  Multi,
  NETS,
  q,
  seeded,
  setup,
  Single,
} from './network-selector.sf17.helpers';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element['scrollIntoView'];
});
afterEach(() => {
  vi.restoreAllMocks();
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

const custom = ({ selectedCount }: { selectedCount: number }) => (
  <FilterButton count={selectedCount} />
);

function InForm({
  onSubmit,
  children,
}: {
  readonly onSubmit: () => void;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input aria-label="Alias name" defaultValue="Treasury" />
      {children}
    </form>
  );
}

describe('INV-17: nothing in the selector submits an enclosing form', () => {
  it('single: Enter / Space on the trigger, Enter on an option, Enter with no match', async () => {
    const user = setup();
    const submit = vi.fn();
    render(
      <InForm onSubmit={submit}>
        <Single groupByEcosystem getEcosystem={eco} />
      </InForm>
    );
    q.trigger().focus();
    await user.keyboard('{Enter}');
    expect(q.dialog()).not.toBeNull();
    await user.keyboard('{Enter}'); // picks Ethereum, closes
    expect(q.dialog()).toBeNull();
    q.trigger().focus();
    await user.keyboard(' ');
    expect(q.dialog()).not.toBeNull();
    await user.type(q.search(), 'zzz');
    await user.keyboard('{Enter}');
    expect(submit).not.toHaveBeenCalled();
  });

  it('multi: Clear all by click and by keyboard never submits', async () => {
    const user = setup();
    const submit = vi.fn();
    render(
      <InForm onSubmit={submit}>
        <Multi initial={['eth', 'sep']} />
      </InForm>
    );
    await user.click(q.trigger());
    await user.click(q.clear() as HTMLButtonElement);
    await user.keyboard('{Enter}'); // toggles the active option on
    await user.tab(); // to Clear all
    expect(document.activeElement).toBe(q.clear());
    await user.keyboard('{Enter}');
    expect(submit).not.toHaveBeenCalled();
  });

  it('custom trigger without its own type gets type="button" (A2); Enter on it opens, never submits', async () => {
    const user = setup();
    const submit = vi.fn();
    render(
      <InForm onSubmit={submit}>
        <Multi renderTrigger={custom} />
      </InForm>
    );
    expect(q.filter().getAttribute('type')).toBe('button');
    q.filter().focus();
    await user.keyboard('{Enter}');
    expect(q.dialog()).not.toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });

  it('control: the same form does submit from its own text input', async () => {
    const user = setup();
    const submit = vi.fn();
    render(
      <InForm onSubmit={submit}>
        <Single />
      </InForm>
    );
    await user.type(
      document.querySelector('input[aria-label="Alias name"]') as HTMLElement,
      '{Enter}'
    );
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

/** The AddAliasDialog shape: a kit Dialog holding a form with a name field and the selector. */
function AliasDialog({ onSubmit }: { readonly onSubmit: () => void }): React.ReactElement {
  const [open, setOpen] = React.useState(true);
  const [network, setNetwork] = React.useState<string>('none');
  return (
    <>
      <output data-testid="dialog-open">{String(open)}</output>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Add Alias</DialogTitle>
          <DialogDescription>Create a human-readable name for an address.</DialogDescription>
          <InForm onSubmit={onSubmit}>
            <Single
              groupByEcosystem
              getEcosystem={eco}
              placeholder="Select network…"
              onPick={(n) => setNetwork(n.id)}
            />
          </InForm>
          <output data-testid="form-network">{network}</output>
        </DialogContent>
      </Dialog>
    </>
  );
}

const dialogOpen = () => document.querySelector('[data-testid="dialog-open"]')?.textContent;
const aliasName = () =>
  document.querySelector<HTMLInputElement>('input[aria-label="Alias name"]')?.value;

describe('INV-18: inside the Add Alias dialog, Escape closes only the list', () => {
  it('open → focus in search; Escape #1 closes the list only; Escape #2 closes the dialog', async () => {
    const user = setup();
    const submit = vi.fn();
    render(<AliasDialog onSubmit={submit} />);
    await user.click(q.trigger());
    expect(document.activeElement).toBe(q.search());
    await user.keyboard('{Escape}');
    expect(q.dialog()).toBeNull();
    expect(dialogOpen()).toBe('true');
    expect(aliasName()).toBe('Treasury');
    expect(document.activeElement).toBe(q.trigger());
    await user.keyboard('{Escape}');
    expect(dialogOpen()).toBe('false');
    expect(submit).not.toHaveBeenCalled();
  });

  it('a single pick closes the list, keeps the dialog and updates the form network', async () => {
    const user = setup();
    render(<AliasDialog onSubmit={() => {}} />);
    await user.click(q.trigger());
    await user.click(q.option('Stellar'));
    expect(q.dialog()).toBeNull();
    expect(dialogOpen()).toBe('true');
    expect(document.querySelector('[data-testid="form-network"]')?.textContent).toBe('xlm');
    expect(document.activeElement).toBe(q.trigger());
  });
});

describe('INV-19: open, navigate and activate follow SF-15 for every trigger', () => {
  const triggers = [
    ['default single', () => <Single isNetworkDisabled={isOff} />, () => q.trigger()],
    ['default multi', () => <Multi isNetworkDisabled={isOff} />, () => q.trigger()],
    ['custom', () => <Multi isNetworkDisabled={isOff} renderTrigger={custom} />, () => q.filter()],
  ] as const;

  for (const [kind, ui, trig] of triggers) {
    it.each(['click', '{Enter}', ' ', '{ArrowDown}', '{ArrowUp}'])(
      `${kind}: %s on the trigger opens with focus in the search box and the first match active`,
      async (input) => {
        const user = setup();
        render(ui());
        if (input === 'click') await user.click(trig());
        else {
          trig().focus();
          await user.keyboard(input);
        }
        expect(q.dialog()).not.toBeNull();
        expect(document.activeElement).toBe(q.search());
        expect(q.active()).toBe('Ethereum');
      }
    );
  }

  it('arrows wrap over enabled options; Space types a space (K-1); Enter activates the highlight', async () => {
    const user = setup();
    const onChange = vi.fn();
    render(<Multi isNetworkDisabled={isOff} onChange={onChange} />);
    await user.click(q.trigger());
    await user.keyboard('{ArrowUp}');
    expect(q.active()).toBe('Base Sepolia');
    await user.keyboard('{ArrowDown}');
    expect(q.active()).toBe('Ethereum');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(q.active()).toBe('Stellar');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(['xlm']);
    expect(q.dialog()).not.toBeNull(); // multi stays open
    await user.keyboard(' ');
    expect(q.search().value).toBe(' ');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('a query change re-highlights the first enabled match', async () => {
    const user = setup();
    render(<Single isNetworkDisabled={isOff} />);
    await user.click(q.trigger());
    await user.keyboard('{ArrowDown}{ArrowDown}');
    await user.type(q.search(), 'stellar');
    expect(q.active()).toBe('Stellar');
    await user.type(q.search(), ' t');
    expect(q.active()).toBeNull(); // only the disabled "Stellar Testnet" matches
  });

  it('single closes after activation; multi stays open', async () => {
    const user = setup();
    const { unmount } = render(<Single />);
    await user.click(q.trigger());
    await user.keyboard('{Enter}');
    expect(q.dialog()).toBeNull();
    unmount();
    render(<Multi />);
    await user.click(q.trigger());
    await user.keyboard('{Enter}');
    expect(q.dialog()).not.toBeNull();
  });

  it('seeded event sequences never reach open-with-focus-outside or closed-with-search-mounted', async () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const user = setup();
      const rand = seeded(seed);
      const { unmount } = render(
        <>
          <button type="button" data-testid="outside">
            outside
          </button>
          {seed % 2 === 0 ? (
            <Multi isNetworkDisabled={isOff} renderTrigger={seed % 3 === 0 ? custom : undefined} />
          ) : (
            <Single isNetworkDisabled={isOff} groupByEcosystem getEcosystem={eco} />
          )}
        </>
      );
      const trig = () =>
        document.querySelector<HTMLElement>(
          '[data-slot="network-selector-trigger"], [data-testid="filter"]'
        ) as HTMLElement;
      const steps: Array<() => Promise<void>> = [
        () => user.click(trig()),
        async () => {
          if (q.dialog()) await user.type(q.search(), 'e');
        },
        () => user.keyboard('{ArrowDown}'),
        () => user.keyboard('{Enter}'),
        () => user.keyboard('{Escape}'),
        () => user.click(document.querySelector('[data-testid="outside"]') as HTMLElement),
      ];
      for (let i = 0; i < 25; i += 1) {
        const step = steps[Math.floor(rand() * steps.length)] as () => Promise<void>;
        await step();
        const dialog = q.dialog();
        const expanded = trig().getAttribute('aria-expanded') === 'true';
        const searchMounted =
          document.querySelector('[data-slot="searchable-multi-select-search"]') !== null;
        expect({ seed, i, open: dialog !== null }).toEqual({ seed, i, open: expanded });
        expect(searchMounted).toBe(dialog !== null);
        if (dialog) expect(dialog.contains(document.activeElement)).toBe(true);
      }
      unmount();
    }
  });
});

describe('INV-20: the query survives close and reopen', () => {
  it('type "sep", pick (single closes), reopen: the query and the filtered list are kept', async () => {
    const user = setup();
    render(<Single />);
    await user.click(q.trigger());
    await user.type(q.search(), 'sep');
    await user.click(q.option('Base Sepolia'));
    expect(q.dialog()).toBeNull();
    await user.click(q.trigger());
    expect(q.search().value).toBe('sep');
    expect(q.labels()).toEqual(['Ethereum Sepolia', 'Base Sepolia']);
  });

  it('boundary: kept across Escape and outside close; cleared only by editing or unmount', async () => {
    const user = setup();
    const { unmount } = render(
      <>
        <button type="button" data-testid="outside">
          outside
        </button>
        <Multi />
      </>
    );
    await user.click(q.trigger());
    await user.type(q.search(), 'stel');
    await user.keyboard('{Escape}');
    await user.click(q.trigger());
    expect(q.search().value).toBe('stel');
    await user.click(document.querySelector('[data-testid="outside"]') as HTMLElement);
    await user.click(q.trigger());
    expect(q.search().value).toBe('stel');
    unmount();
    render(<Multi />);
    await user.click(q.trigger());
    expect(q.search().value).toBe('');
  });
});

describe('INV-21: Clear all keeps the user in the popover', () => {
  it('Tab to Clear all, Enter: focus in the search box, still open, row gone, [] emitted', async () => {
    const user = setup();
    const onChange = vi.fn();
    render(<Multi initial={['eth', 'xlm']} onChange={onChange} />);
    await user.click(q.trigger());
    await user.tab();
    expect(document.activeElement).toBe(q.clear());
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(q.search());
    expect(q.dialog()).not.toBeNull();
    expect(q.summary()).toBeNull();
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('failure guard: focus never lands on <body>, also by click', async () => {
    const user = setup();
    render(<Multi initial={['eth']} />);
    await user.click(q.trigger());
    await user.click(q.clear() as HTMLButtonElement);
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(q.search());
  });
});

describe('INV-24: the empty result is shown and announced in every mode (P-1)', () => {
  const modes = [
    ['single ungrouped', () => <Single />],
    ['single grouped', () => <Single groupByEcosystem getEcosystem={eco} />],
    ['multi ungrouped', () => <Multi initial={['eth']} />],
    ['multi grouped, no getEcosystem', () => <Multi groupByEcosystem />],
  ] as const;

  it.each(modes)(
    '%s: "zzz" → the same status node holds the text; clearing empties it',
    async (_m, ui) => {
      const user = setup();
      const spy = vi.fn();
      render(ui());
      await user.click(q.trigger());
      const status = q.status();
      expect(status.getAttribute('role')).toBe('status');
      expect(status.getAttribute('aria-live')).toBe('polite');
      expect(status.textContent).toBe('');
      expect(q.listbox().hidden).toBe(false);
      await user.type(q.search(), 'zzz');
      expect(q.status()).toBe(status);
      expect(status.textContent).toBe('No network found.');
      expect(q.listbox().hidden).toBe(true);
      expect(q.groups()).toHaveLength(0);
      expect(q.search().hasAttribute('aria-activedescendant')).toBe(false);
      expect(document.activeElement).toBe(q.search());
      document.addEventListener('submit', spy);
      await user.keyboard('{Enter}');
      expect(q.options()).toHaveLength(0);
      await user.clear(q.search());
      expect(q.status()).toBe(status);
      expect(status.textContent).toBe('');
      expect(q.options().length).toBe(NETS.length);
      document.removeEventListener('submit', spy);
    }
  );

  it('boundary: networks = [] ungrouped shows the empty text from the first open frame', async () => {
    const user = setup();
    render(<Single networks={[]} />);
    await user.click(q.trigger());
    expect(q.status().textContent).toBe('No network found.');
    expect(q.listbox().hidden).toBe(true);
  });

  it('failure guard: Enter on an empty result emits nothing in either mode', async () => {
    const user = setup();
    const pick = vi.fn();
    const change = vi.fn();
    const { unmount } = render(<Single onPick={pick} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'zzz{Enter}');
    unmount();
    render(<Multi onChange={change} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'zzz{Enter}');
    expect(pick).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });
});

describe('INV-25: focus moves in on open and returns to the trigger on close', () => {
  const kinds = [
    ['default single', () => <Single />, () => q.trigger()],
    ['default multi', () => <Multi />, () => q.trigger()],
    ['custom (ref-forwarding)', () => <Multi renderTrigger={custom} />, () => q.filter()],
  ] as const;

  for (const [kind, ui, trig] of kinds) {
    it(`${kind}: Escape and outside click return focus to the trigger`, async () => {
      const user = setup();
      render(
        <>
          {ui()}
          <div data-testid="outside">outside</div>
        </>
      );
      await user.click(trig());
      expect(document.activeElement).toBe(q.search());
      await user.keyboard('{Escape}');
      expect(document.activeElement).toBe(trig());
      await user.click(trig());
      await user.click(document.querySelector('[data-testid="outside"]') as HTMLElement);
      expect(q.dialog()).toBeNull();
      expect(document.activeElement).toBe(trig());
    });
  }

  it('single pick returns focus to the trigger', async () => {
    const user = setup();
    render(<Single />);
    await user.click(q.trigger());
    await user.click(q.option('Stellar'));
    expect(document.activeElement).toBe(q.trigger());
  });

  it('Tab cycles only within the popover (search ↔ Clear all)', async () => {
    const user = setup();
    render(
      <>
        <button type="button">before</button>
        <Multi initial={['eth']} />
        <button type="button">after</button>
      </>
    );
    await user.click(q.trigger());
    const seen = new Set<Element | null>();
    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      seen.add(document.activeElement);
    }
    for (const el of seen) expect(q.dialog()?.contains(el as Node)).toBe(true);
  });
});
