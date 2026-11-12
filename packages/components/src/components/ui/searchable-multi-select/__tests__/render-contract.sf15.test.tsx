/**
 * @vitest-environment jsdom
 *
 * SF-15 · Render contract — INV-1 (closed trigger: a button that opens a dialog), INV-2 (open structure),
 * INV-3 (IDREFs), INV-4 (options), INV-5 (summary row), INV-6 (copy),
 * INV-17 (naming).
 * artifacts/005-uikit-requests/sf-15-searchable-multi-select/03-invariants.md
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchableMultiSelect } from '../index';
import {
  activeOptionLabel,
  brokenIdRefs,
  Controlled,
  COUNTRIES,
  countryId,
  countryLabel,
  q,
  type Country,
} from './helpers';

afterEach(() => vi.restoreAllMocks());

const follows = (a: Node, b: Node): boolean =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('INV-1: closed trigger is a non-submitting button that opens a dialog', () => {
  it.each([
    { initial: [], text: 'Select items' },
    { initial: ['FR'], text: '1 selected' },
    { initial: COUNTRIES.map((c) => c.code), text: '6 selected' },
  ])('count=$initial.length → "$text"', ({ initial, text }) => {
    render(<Controlled initial={initial} />);
    // Named by the label, then its own text (label + value, like a select).
    const trigger = screen.getByRole('button', { name: `Countries ${text}` });
    expect(trigger).toBe(q.trigger());
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.hasAttribute('role')).toBe(false);
    expect(trigger.getAttribute('type')).toBe('button');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(trigger.textContent).toBe(text);
    expect(trigger.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[data-slot="searchable-multi-select-search"]')).toBeNull();
  });

  it('exactly one kit button is rendered while closed', () => {
    render(<Controlled />);
    expect(document.querySelectorAll('button')).toHaveLength(1);
  });
});

describe('INV-2: open structure is dialog → search → summary → listbox → status', () => {
  it('builds the role tree in DOM order; the trigger controls the dialog, the search box the listbox', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={['FR']} searchPlaceholder="Type a country" />);
    await user.click(q.trigger());

    const dialog = screen.getByRole('dialog', { name: 'Countries' });
    expect(dialog.getAttribute('data-slot')).toBe('searchable-multi-select-content');
    const search = within(dialog).getByRole('combobox', { name: 'Search' });
    const listbox = within(dialog).getByRole('listbox', { name: 'Countries' });
    const status = within(dialog).getByRole('status');
    const summary = q.summary();

    expect(search).toBe(q.search());
    expect(search.tagName).toBe('INPUT');
    expect(search.getAttribute('aria-autocomplete')).toBe('list');
    expect(search.getAttribute('aria-expanded')).toBe('true');
    expect(search.getAttribute('aria-controls')).toBe(listbox.id);
    expect(search.getAttribute('placeholder')).toBe('Type a country');
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(summary).not.toBeNull();
    expect(follows(search, summary as Node)).toBe(true);
    expect(follows(summary as Node, listbox)).toBe(true);
    expect(follows(listbox, status)).toBe(true);

    // One combobox only: the search box. The trigger is a dialog button.
    expect(screen.getAllByRole('combobox')).toEqual([search]);
    const trigger = q.trigger();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id);
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it("boundary: no selection → an empty, hidden band holds the row's place", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(q.trigger());
    expect(q.summary()).toBeNull();
    const band = q.band() as HTMLElement;
    expect(band).not.toBeNull();
    expect(band.getAttribute('aria-hidden')).toBe('true');
    expect(band.textContent).toBe('');
    expect(band.querySelector('button')).toBeNull();
    expect(follows(q.search(), band)).toBe(true);
    expect(follows(band, q.listbox())).toBe(true);
  });

  it('the band and the filled row share one box, so the first pick and Clear all never move the list', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(q.trigger());
    const bandClass = (q.band() as HTMLElement).className;
    const listboxPrev = q.listbox().previousElementSibling;
    expect(listboxPrev).toBe(q.band());

    await user.click(q.option('France'));
    expect(q.band()).toBeNull();
    const row = q.summary() as HTMLElement;
    expect(row.className).toBe(bandClass);
    expect(bandClass).toContain('h-7');
    expect(bandClass).not.toMatch(/\bpy-/);
    expect(q.listbox().previousElementSibling).toBe(row);

    await user.click(q.clear() as HTMLButtonElement);
    expect(q.summary()).toBeNull();
    expect((q.band() as HTMLElement).className).toBe(bandClass);
  });
});

describe('INV-3: every IDREF resolves; instances never collide', () => {
  it('resolves after open, after ArrowDown, and after filtering to empty', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(q.trigger());
    expect(brokenIdRefs()).toEqual([]);
    await user.keyboard('{ArrowDown}');
    expect(brokenIdRefs()).toEqual([]);
    await user.type(q.search(), 'zzz');
    expect(brokenIdRefs()).toEqual([]);
  });

  it('failure guard: closed → no aria-controls / aria-activedescendant anywhere', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    expect(document.querySelector('[aria-controls],[aria-activedescendant]')).toBeNull();
    await user.click(q.trigger());
    await user.keyboard('{Escape}');
    expect(document.querySelector('[aria-controls],[aria-activedescendant]')).toBeNull();
  });

  it('two instances: disjoint ids, independent query and active state', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SearchableMultiSelect
          aria-label="First"
          items={COUNTRIES}
          getItemId={countryId}
          getItemLabel={countryLabel}
          selectedIds={[]}
          onSelectionChange={() => undefined}
        />
        <SearchableMultiSelect
          aria-label="Second"
          items={COUNTRIES}
          getItemId={countryId}
          getItemLabel={countryLabel}
          selectedIds={[]}
          onSelectionChange={() => undefined}
        />
      </>
    );
    const first = screen.getByRole('button', { name: 'First Select items' });
    const second = screen.getByRole('button', { name: 'Second Select items' });

    await user.click(first);
    await user.type(q.search(), 'g');
    await user.keyboard('{ArrowDown}');
    const firstIds = q.options().map((o) => o.id);
    const firstListbox = q.listbox().id;
    expect(brokenIdRefs()).toEqual([]);
    await user.keyboard('{Escape}');

    await user.click(second);
    expect(q.search().value).toBe('');
    expect(q.labels()).toHaveLength(COUNTRIES.length);
    expect(activeOptionLabel()).toBe('France');
    expect(brokenIdRefs()).toEqual([]);
    const secondIds = q.options().map((o) => o.id);
    expect(q.listbox().id).not.toBe(firstListbox);
    expect(secondIds.filter((id) => firstIds.includes(id))).toEqual([]);
  });
});

describe('INV-4: one option per filtered item, explicit selected state, clean name', () => {
  const odd: readonly Country[] = [
    { code: 'a b', name: 'Space id' },
    { code: 'q"uote', name: 'Quote id' },
    { code: '#hash', name: 'Hash id' },
    { code: 'c:olon', name: 'Colon id' },
    { code: '🙂', name: 'Emoji id' },
    { code: '', name: 'Empty id' },
  ];

  it('ids come from the source index; aria-selected is always explicit; name = label', async () => {
    const user = userEvent.setup();
    render(<Controlled items={odd} initial={['q"uote', '']} />);
    await user.click(q.trigger());
    const listbox = q.listbox();
    const options = q.options();
    expect(options).toHaveLength(odd.length);
    const ids = options.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [i, option] of options.entries()) {
      expect(option.id).toBe(`${listbox.id}-opt-${i}`);
      expect(document.getElementById(option.id)).toBe(option);
      expect(option.getAttribute('role')).toBe('option');
      expect(option.getAttribute('data-slot')).toBe('searchable-multi-select-option');
    }
    expect(q.selectedFlags()).toEqual(['false', 'true', 'false', 'false', 'false', 'true']);
    for (const c of odd) {
      expect(within(listbox).getByRole('option', { name: c.name })).toBe(q.option(c.name));
    }
  });

  it('check icon renders iff selected, inside an aria-hidden indicator', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={['ES']} />);
    await user.click(q.trigger());
    for (const option of q.options()) {
      const indicator = option.querySelector('[aria-hidden="true"]');
      expect(indicator).not.toBeNull();
      const hasCheck = indicator?.querySelector('svg') !== null;
      expect(hasCheck).toBe(option.getAttribute('aria-selected') === 'true');
    }
    expect(q.option('Spain').querySelector('svg')).not.toBeNull();
  });

  it('filtered options keep their source-index DOM id', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(q.trigger());
    await user.type(q.search(), 'spa');
    const [spain] = q.options();
    expect(q.options()).toHaveLength(1);
    expect(spain?.id).toBe(`${q.listbox().id}-opt-1`);
  });
});

describe('INV-5: summary row exists only when something is selected', () => {
  it.each([
    { initial: [], present: false, text: '' },
    { initial: ['FR'], present: true, text: '1 selected' },
    { initial: ['FR', 'GONE', 'ES'], present: true, text: '3 selected' },
  ])('$initial → present=$present', async ({ initial, present, text }) => {
    const user = userEvent.setup();
    render(<Controlled initial={initial} />);
    await user.click(q.trigger());
    const summary = q.summary();
    expect(summary !== null).toBe(present);
    if (!summary) return;
    expect(summary.textContent).toBe(`${text}Clear all`);
    const clear = within(summary).getByRole('button', { name: 'Clear all' });
    expect(clear).toBe(q.clear());
    expect(clear.getAttribute('type')).toBe('button');
  });
});

describe('INV-6: every user-facing string comes from a prop or its documented default', () => {
  const DEFAULTS = [
    'Select items',
    'Search...',
    'Search',
    'No results found.',
    'selected',
    'Clear all',
  ];

  it('renders each documented default', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Controlled />);
    expect(q.trigger().textContent).toBe('Select items');
    await user.click(q.trigger());
    expect(q.search().getAttribute('placeholder')).toBe('Search...');
    expect(q.search().getAttribute('aria-label')).toBe('Search');
    await user.click(q.option('France'));
    expect(q.trigger().textContent).toBe('1 selected');
    expect(q.summary()?.textContent).toBe('1 selectedClear all');
    await user.type(q.search(), 'zzz');
    expect(q.status().textContent).toBe('No results found.');
    unmount();
  });

  it('with all seven overridden, no default string appears in text, names or attributes', async () => {
    const user = userEvent.setup();
    render(
      <Controlled
        aria-labelledby={undefined}
        aria-label="Allowed"
        placeholder="Pick countries"
        searchPlaceholder="Type to filter"
        searchLabel="Filter countries"
        emptyText="Nothing matches"
        formatSelectedCount={(n, t) => (n === t ? 'Every country' : `${n} of ${t} countries`)}
        formatSelectionSummary={(n) => `${n} allowed`}
        clearAllLabel="Reset"
        initial={['FR']}
      />
    );
    await user.click(q.trigger());
    await user.type(q.search(), 'zzz');

    const surface = [
      document.body.textContent ?? '',
      ...Array.from(document.querySelectorAll('*')).flatMap((el) =>
        ['aria-label', 'placeholder', 'title'].map((a) => el.getAttribute(a) ?? '')
      ),
    ].join('\n');
    for (const d of DEFAULTS) expect(surface).not.toContain(d);
    expect(q.trigger().textContent).toBe('1 of 6 countries');
    expect(q.summary()?.textContent).toBe('1 allowedReset');
    expect(q.status().textContent).toBe('Nothing matches');
    expect(q.search().getAttribute('placeholder')).toBe('Type to filter');
  });

  it('formatters get (selectedIds.length, items.length): filter active, all selected, stale ids', async () => {
    const user = userEvent.setup();
    const formatSelectedCount = vi.fn((n: number, t: number) => `${n}/${t}`);
    const formatSelectionSummary = vi.fn((n: number, t: number) => `sum ${n}/${t}`);
    const props = { formatSelectedCount, formatSelectionSummary };
    const { unmount } = render(<Controlled {...props} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'fr');
    await user.keyboard('{Enter}');
    expect(formatSelectedCount).toHaveBeenLastCalledWith(1, 6);
    expect(formatSelectionSummary).toHaveBeenLastCalledWith(1, 6);
    unmount();

    render(<Controlled {...props} initial={COUNTRIES.map((c) => c.code)} />);
    expect(formatSelectedCount).toHaveBeenLastCalledWith(6, 6);
    expect(q.trigger().textContent).toBe('6/6');
  });

  it('boundary: stale and duplicate ids count (count > total)', () => {
    const formatSelectedCount = vi.fn((n: number, t: number) => `${n}/${t}`);
    render(
      <Controlled
        formatSelectedCount={formatSelectedCount}
        initial={['FR', 'FR', 'X', 'Y', 'Z', 'W', 'V']}
      />
    );
    expect(formatSelectedCount).toHaveBeenLastCalledWith(7, 6);
  });

  it('formatter output is rendered verbatim, including "" and surrounding spaces (A2)', () => {
    const { rerender } = render(<Controlled initial={['FR']} formatSelectedCount={() => ''} />);
    expect(q.trigger().textContent).toBe('');
    rerender(<Controlled initial={['FR']} formatSelectedCount={() => '  padded  '} />);
    expect(q.trigger().textContent).toBe('  padded  ');
  });

  it('no network wording in the component sources (string content, comments excluded)', () => {
    // vitest runs from the package root.
    const dir = path.resolve(process.cwd(), 'src/components/ui/searchable-multi-select');
    const files = readdirSync(dir).filter((f) => /\.(ts|tsx)$/.test(f));
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const f of files) {
      const code = readFileSync(path.join(dir, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(code, f).not.toMatch(/network/i);
    }
  });
});

describe('INV-17: naming rule for trigger, listbox and dialog', () => {
  it('aria-labelledby names all three (and wins over aria-label)', async () => {
    const user = userEvent.setup();
    render(<Controlled aria-label="Ignored" />);
    expect(screen.getByRole('button', { name: 'Countries Select items' })).toBe(q.trigger());
    expect(q.trigger().getAttribute('aria-labelledby')?.startsWith('sms-label ')).toBe(true);
    expect(q.trigger().hasAttribute('aria-label')).toBe(false);
    await user.click(q.trigger());
    expect(screen.getByRole('dialog', { name: 'Countries' })).toBe(q.dialog());
    expect(screen.getByRole('listbox', { name: 'Countries' })).toBe(q.listbox());
    expect(screen.getByRole('button', { name: 'Countries Select items', hidden: true })).toBe(
      q.trigger()
    );
  });

  it('aria-label names all three', async () => {
    const user = userEvent.setup();
    render(<Controlled aria-labelledby={undefined} aria-label="Allowed countries" />);
    expect(screen.getByRole('button', { name: 'Allowed countries Select items' })).toBe(
      q.trigger()
    );
    // The label text lives in a hidden span the trigger points at; nothing visible is added.
    expect(q.trigger().hasAttribute('aria-label')).toBe(false);
    await user.click(q.trigger());
    expect(screen.getByRole('dialog', { name: 'Allowed countries' })).toBe(q.dialog());
    expect(screen.getByRole('listbox', { name: 'Allowed countries' })).toBe(q.listbox());
  });

  it('neither: trigger is named by its text; listbox and dialog use placeholder; one warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const { rerender } = render(
      <Controlled aria-labelledby={undefined} placeholder="Pick countries" />
    );
    for (let i = 0; i < 4; i += 1) {
      rerender(<Controlled aria-labelledby={undefined} placeholder="Pick countries" />);
    }
    expect(q.trigger().hasAttribute('aria-label')).toBe(false);
    expect(q.trigger().hasAttribute('aria-labelledby')).toBe(false);
    expect(screen.getByRole('button', { name: 'Pick countries' })).toBe(q.trigger());
    await user.click(q.trigger());
    expect(screen.getByRole('dialog', { name: 'Pick countries' })).toBe(q.dialog());
    expect(screen.getByRole('listbox', { name: 'Pick countries' })).toBe(q.listbox());
    const nameWarns = warn.mock.calls.filter((c) => String(c[0]).includes('No accessible name'));
    expect(nameWarns).toHaveLength(1);
    expect(String(nameWarns[0]?.[0])).toContain('SearchableMultiSelect');
  });

  it('id + <label for> alone: trigger named by the label only, list by the placeholder, one warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <>
        <label htmlFor="countries">Countries</label>
        <Controlled id="countries" aria-labelledby={undefined} />
      </>
    );
    // What the `id` docs warn about: the label replaces the selection text in the name.
    expect(screen.getByRole('button', { name: 'Countries' })).toBe(q.trigger());
    await user.click(q.trigger());
    expect(screen.getByRole('listbox', { name: 'Select items' })).toBe(q.listbox());
    const nameWarns = warn.mock.calls.filter((c) => String(c[0]).includes('No accessible name'));
    expect(nameWarns).toHaveLength(1);
  });

  it('the search box is always named by searchLabel', async () => {
    const user = userEvent.setup();
    render(<Controlled searchLabel="Find a country" />);
    await user.click(q.trigger());
    expect(screen.getByRole('combobox', { name: 'Find a country' })).toBe(q.search());
  });
});
