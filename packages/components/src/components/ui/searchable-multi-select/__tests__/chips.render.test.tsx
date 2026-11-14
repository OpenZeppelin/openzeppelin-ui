/**
 * Chips mode render contract (jsdom): where the chips sit, which picks get a chip and in what
 * order, what each mode renders, the list's name, the remove buttons' names and the status
 * region. Geometry (wrapping, 24px targets, focus ring) is measured in the Chromium suite.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SearchableMultiSelect } from '../index';
import { resolveSelectedItems } from '../list-model';
import { CHIP_SLOT, chips, LIST_SLOT, REMOVE_SLOT, STATUS_SLOT } from './chips.harness';
import { Controlled, COUNTRIES, countryId, countryLabel, seeded, type Country } from './helpers';

afterEach(() => {
  cleanup();
});

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]';

describe('chips sit below the trigger, never inside it', () => {
  it('the root holds the trigger, then the list, then the status region, in that order', () => {
    render(<Controlled showSelected="chips" initial={['ES', 'FR', 'DE']} />);
    const root = chips.root();
    const kids = Array.from(root.children);
    expect(kids.map((el) => el.getAttribute('data-slot'))).toEqual([
      'searchable-multi-select-trigger',
      'searchable-multi-select-chips',
      'searchable-multi-select-chips-status',
    ]);
  });

  it('nothing interactive or list-like is inside the trigger, in any mode', () => {
    for (const props of [{}, { readOnly: true }, { disabled: true }]) {
      render(<Controlled showSelected="chips" initial={['ES', 'FR', 'DE']} {...props} />);
      const trigger = chips.trigger();
      expect(trigger.querySelector('button, a, [tabindex], ul, li, [role="status"]')).toBeNull();
      expect(trigger.querySelector(REMOVE_SLOT)).toBeNull();
      cleanup();
    }
  });

  it.each([
    ['required', { 'aria-required': true }, ['Required']],
    ['read-only', { readOnly: true }, ['Read-only']],
  ] as const)(
    "the trigger's name and description are the same as in count mode (%s)",
    (_name, props, description) => {
      const read = (mode: 'count' | 'chips') => {
        render(<Controlled showSelected={mode} {...props} initial={['ES', 'FR', 'DE']} />);
        const trigger = screen.getByRole('button', { name: 'Countries 3 selected' });
        const describedBy = (trigger.getAttribute('aria-describedby') ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .map((id) => document.getElementById(id)?.textContent);
        const out = { text: trigger.textContent, describedBy };
        cleanup();
        return out;
      };
      const count = read('count');
      expect(count.describedBy).toEqual(description);
      expect(read('chips')).toEqual(count);
    }
  );

  it('with no selection the trigger shows the placeholder and the list is not rendered', () => {
    render(<Controlled showSelected="chips" placeholder="Pick some" />);
    expect(chips.trigger().textContent).toBe('Pick some');
    expect(chips.list()).toBeNull();
    expect(chips.status().textContent).toBe('');
  });
});

describe('the chips are the resolved selection, in selection order', () => {
  it('one chip per resolved id, in pick order, not list order', () => {
    render(<Controlled showSelected="chips" initial={['IT', 'FR', 'ES']} />);
    expect(chips.labels()).toEqual(['Italy', 'France', 'Spain']);
  });

  it('boundary: stale ids get no chip and a repeated id gets one, but the count keeps them all', () => {
    render(<Controlled showSelected="chips" initial={['ES', 'XX', 'FR', 'ES']} />);
    expect(chips.labels()).toEqual(['Spain', 'France']);
    expect(chips.trigger().textContent).toBe('4 selected');
  });

  it('boundary: only stale ids render no list, and the count still shows', () => {
    render(<Controlled showSelected="chips" initial={['XX']} />);
    expect(chips.list()).toBeNull();
    expect(chips.trigger().textContent).toBe('1 selected');
    expect(chips.status()).not.toBeNull();
  });

  it('boundary: two items with the same label get two chips, each under its own id', () => {
    render(<Controlled showSelected="chips" initial={['US-GA', 'GE']} />);
    expect(chips.labels()).toEqual(['Georgia', 'Georgia']);
    expect(chips.removes()).toHaveLength(2);
  });

  it('boundary: when items share an id, the chip shows the first of them', () => {
    const items: Country[] = [...COUNTRIES, { code: 'FR', name: 'Other France' }];
    render(<Controlled showSelected="chips" items={items} initial={['FR']} />);
    expect(chips.labels()).toEqual(['France']);
  });

  it('property: over random items and selections, the chips equal the resolved labels', () => {
    const rand = seeded(11);
    const pool = Array.from({ length: 30 }, (_, i) => `id${i}`);
    for (let run = 0; run < 150; run += 1) {
      const items: Country[] = pool
        .filter(() => rand() < 0.6)
        .map((code) => ({ code, name: `Name ${code}` }));
      // Duplicate item ids sometimes, to exercise "first item wins".
      if (items.length > 0 && rand() < 0.3) {
        items.push({ code: (items[0] as Country).code, name: 'Shadow' });
      }
      const selected = Array.from({ length: Math.floor(rand() * 12) }, () => {
        const pick = pool[Math.floor(rand() * pool.length)] as string;
        return rand() < 0.1 ? 'stale' : pick;
      });
      render(
        <SearchableMultiSelect
          aria-label="Things"
          showSelected="chips"
          items={items}
          getItemId={countryId}
          getItemLabel={countryLabel}
          selectedIds={selected}
          onSelectionChange={() => {}}
        />
      );
      const expected = resolveSelectedItems(items, selected, countryId).map(countryLabel);
      if (expected.length === 0) {
        expect(document.querySelector(LIST_SLOT), `run ${run}`).toBeNull();
      } else {
        expect(chips.labels(), `run ${run}: ${selected.join(',')}`).toEqual(expected);
      }
      expect(chips.trigger().textContent, `run ${run}`).toBe(
        selected.length > 0 ? `${selected.length} selected` : 'Select items'
      );
      cleanup();
    }
  });
});

describe('what each mode renders', () => {
  it('interactive: one remove button per chip, and the chips carry no other button', () => {
    render(<Controlled showSelected="chips" initial={['ES', 'FR', 'DE']} />);
    const items = Array.from(document.querySelectorAll<HTMLElement>(CHIP_SLOT));
    expect(items).toHaveLength(3);
    for (const li of items) {
      const buttons = li.querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]?.getAttribute('type')).toBe('button');
      expect(buttons[0]?.getAttribute('data-slot')).toBe('searchable-multi-select-chip-remove');
    }
    expect(chips.list()?.className).not.toMatch(/opacity-50/);
  });

  it('read-only: the same chips, no buttons, no disabled look, nothing focusable but the trigger', () => {
    render(<Controlled showSelected="chips" readOnly initial={['ES', 'FR', 'DE']} />);
    const root = chips.root();
    expect(chips.labels()).toEqual(['Spain', 'France', 'Germany']);
    expect(chips.removes()).toHaveLength(0);
    expect(chips.list()?.className).not.toMatch(/opacity-50/);
    expect(Array.from(root.querySelectorAll(FOCUSABLE))).toEqual([chips.trigger()]);
  });

  it('disabled: the same chips, no buttons, the disabled look', () => {
    render(<Controlled showSelected="chips" disabled initial={['ES', 'FR', 'DE']} />);
    const root = chips.root();
    expect(chips.labels()).toEqual(['Spain', 'France', 'Germany']);
    expect(chips.removes()).toHaveLength(0);
    expect(chips.list()?.className).toMatch(/\bopacity-50\b/);
    expect(Array.from(root.querySelectorAll(FOCUSABLE))).toEqual([chips.trigger()]);
    expect(chips.trigger().disabled).toBe(true);
  });

  it('disabled wins over read-only', () => {
    render(<Controlled showSelected="chips" disabled readOnly initial={['ES', 'FR']} />);
    expect(chips.removes()).toHaveLength(0);
    expect(chips.list()?.className).toMatch(/\bopacity-50\b/);
  });

  it('the chip fill is the same in every mode', () => {
    const fills = (props: object) => {
      render(<Controlled showSelected="chips" initial={['ES']} {...props} />);
      const li = document.querySelector<HTMLElement>(CHIP_SLOT) as HTMLElement;
      const out = li.className.split(/\s+/).filter((c) => /^(bg-|text-|rounded|min-h)/.test(c));
      cleanup();
      return out;
    };
    const interactive = fills({});
    expect(interactive).toContain('bg-background');
    expect(fills({ readOnly: true })).toEqual(interactive);
    expect(fills({ disabled: true })).toEqual(interactive);
  });

  it('each chip has a bordered background fill and a full-contrast remove icon', () => {
    render(<Controlled showSelected="chips" initial={['ES', 'FR']} />);
    const items = Array.from(document.querySelectorAll<HTMLElement>(CHIP_SLOT));
    expect(items).toHaveLength(2);
    for (const li of items) {
      const cls = li.className.split(/\s+/);
      expect(cls).toEqual(
        expect.arrayContaining(['border', 'border-border', 'bg-background', 'text-foreground'])
      );
      const remove = li.querySelector(REMOVE_SLOT) as HTMLButtonElement;
      expect(remove.className.split(/\s+/)).toContain('text-foreground');
      expect(remove.className).not.toMatch(/\btext-muted-foreground\b/);
    }
  });

  it('read-only and disabled chips keep the same bordered fill without a remove icon', () => {
    for (const props of [{ readOnly: true }, { disabled: true }]) {
      render(<Controlled showSelected="chips" initial={['ES']} {...props} />);
      const li = document.querySelector<HTMLElement>(CHIP_SLOT) as HTMLElement;
      expect(li.className.split(/\s+/)).toEqual(
        expect.arrayContaining(['border', 'border-border', 'bg-background'])
      );
      expect(li.querySelector(REMOVE_SLOT)).toBeNull();
      cleanup();
    }
  });
});

describe('chips fit the field (structure; geometry is measured in Chromium)', () => {
  const LONG = `The ${'Very '.repeat(14)}Long Republic`;

  it('a long label keeps its full text in the chip and in the remove button name', () => {
    const items: Country[] = [...COUNTRIES, { code: 'LR', name: LONG }];
    render(<Controlled showSelected="chips" items={items} initial={['FR', 'LR']} />);
    expect(chips.labels()).toEqual(['France', LONG]);
    expect(screen.getByRole('button', { name: `Remove ${LONG}` })).toBeTruthy();
  });

  it('the list wraps, a chip never grows past the field, and the label truncates visually', () => {
    render(<Controlled showSelected="chips" initial={['FR']} />);
    expect(chips.list()?.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['flex', 'flex-wrap'])
    );
    const li = document.querySelector<HTMLElement>(CHIP_SLOT) as HTMLElement;
    expect(li.className.split(/\s+/)).toContain('max-w-full');
    const label = li.querySelector('span') as HTMLElement;
    expect(label.className.split(/\s+/)).toEqual(expect.arrayContaining(['min-w-0', 'truncate']));
  });
});

describe('the chips read as a named list', () => {
  it('named by the aria-labelledby the trigger uses', () => {
    render(<Controlled showSelected="chips" initial={['ES', 'FR']} />);
    const list = screen.getByRole('list', { name: 'Countries' });
    expect(list.getAttribute('aria-labelledby')).toBe('sms-label');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('named through the hidden name text when only aria-label is given', () => {
    render(
      <SearchableMultiSelect
        aria-label="Shipping countries"
        showSelected="chips"
        items={COUNTRIES}
        getItemId={countryId}
        getItemLabel={countryLabel}
        selectedIds={['ES']}
        onSelectionChange={() => {}}
      />
    );
    const list = screen.getByRole('list', { name: 'Shipping countries' });
    const ref = list.getAttribute('aria-labelledby') as string;
    expect(ref).toBeTruthy();
    // The same node names the trigger.
    expect(chips.trigger().getAttribute('aria-labelledby')?.split(/\s+/)).toContain(ref);
  });

  it('failure: with neither, the list has no name and no dangling reference', () => {
    render(
      <SearchableMultiSelect
        showSelected="chips"
        items={COUNTRIES}
        getItemId={countryId}
        getItemLabel={countryLabel}
        selectedIds={['ES']}
        onSelectionChange={() => {}}
      />
    );
    const list = chips.list() as HTMLUListElement;
    expect(list.hasAttribute('aria-labelledby')).toBe(false);
    expect(list.hasAttribute('role')).toBe(false);
  });

  it('chips are plain list items in every mode, with their full text', () => {
    for (const props of [{}, { readOnly: true }, { disabled: true }]) {
      render(<Controlled showSelected="chips" initial={['ES', 'FR', 'DE']} {...props} />);
      const list = screen.getByRole('list', { name: 'Countries' });
      const items = within(list).getAllByRole('listitem');
      expect(items.map((li) => li.textContent)).toEqual(['Spain', 'France', 'Germany']);
      for (const li of items) expect(li.hasAttribute('role')).toBe(false);
      cleanup();
    }
  });
});

describe('remove buttons are named', () => {
  it('by default "Remove {label}", with the icon hidden', () => {
    render(<Controlled showSelected="chips" initial={['ES', 'FR']} />);
    for (const name of ['Remove Spain', 'Remove France']) {
      const button = screen.getByRole('button', { name });
      const svg = button.querySelector('svg');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(button.textContent).toBe('');
    }
  });

  it('carry a visible focus ring and a 24px box (class contract; measured in Chromium)', () => {
    render(<Controlled showSelected="chips" initial={['ES']} />);
    const cls = (chips.removes()[0] as HTMLButtonElement).className.split(/\s+/);
    expect(cls).toEqual(
      expect.arrayContaining(['size-6', 'focus-visible:ring-2', 'focus-visible:ring-ring'])
    );
  });
});

describe('the status region', () => {
  it('is mounted, empty and polite from the first render, once per instance', () => {
    render(<Controlled showSelected="chips" initial={['ES']} />);
    const root = chips.root();
    const statuses = within(root).getAllByRole('status');
    expect(statuses).toHaveLength(1);
    const status = statuses[0] as HTMLElement;
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('data-slot')).toBe('searchable-multi-select-chips-status');
    expect(status.textContent).toBe('');
    expect(status.className.split(/\s+/)).toContain('sr-only');
  });

  it('is mounted even with no chips, read-only or disabled', () => {
    for (const props of [{}, { readOnly: true }, { disabled: true }]) {
      render(<Controlled showSelected="chips" {...props} />);
      expect(document.querySelectorAll(STATUS_SLOT)).toHaveLength(1);
      cleanup();
    }
  });

  it('failure guard: count mode has no root, list or status region', () => {
    render(<Controlled initial={['ES', 'FR']} />);
    expect(document.querySelector('[data-slot="searchable-multi-select"]')).toBeNull();
    expect(document.querySelector(LIST_SLOT)).toBeNull();
    expect(document.querySelector(STATUS_SLOT)).toBeNull();
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(0);
    render(<Controlled showSelected="count" initial={['ES', 'FR']} />);
    expect(document.querySelector(LIST_SLOT)).toBeNull();
  });
});
