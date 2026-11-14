/**
 * @vitest-environment jsdom
 *
 * SF-7 · NetworkSelector trigger naming — AS-1 (a label that points at the trigger names it),
 * AS-2 (no new props → the SF-17 trigger markup, byte for byte), INV-4 (one id: the trigger's,
 * and the popup is labelled by it), plus the custom-trigger and precedence edges.
 * The SF-17 parity suite pins the unchanged surface; this file pins only what SF-7 adds.
 * Stage artifact: sf-7-networkselector-name/05-tests.md
 */
import { render, screen } from '@testing-library/react';
import { computeAccessibleName } from 'dom-accessibility-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import {
  FilterButton,
  Multi,
  NETS,
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

const trigger = (): HTMLButtonElement => q.trigger();
const eth = NETS.find((n) => n.id === 'eth') as Net;

describe('AS-1: an id plus a label that points at it names the trigger', () => {
  it('happy: <label htmlFor> gives the trigger the label text as its accessible name', () => {
    render(
      <>
        <label htmlFor="net-field">Network</label>
        <Single id="net-field" />
      </>
    );
    expect(trigger().id).toBe('net-field');
    expect(computeAccessibleName(trigger())).toBe('Network');
    expect(screen.getByRole('combobox', { name: 'Network' })).toBe(trigger());
  });

  it('keeps naming the trigger by the label once a network is selected', () => {
    render(
      <>
        <label htmlFor="net-field">Network</label>
        <Single id="net-field" initial={eth} />
      </>
    );
    expect(computeAccessibleName(trigger())).toBe('Network');
    expect(trigger().textContent).toContain('Ethereum');
  });

  it('aria-label names the trigger', () => {
    render(<Single aria-label="Target network" />);
    expect(computeAccessibleName(trigger())).toBe('Target network');
  });

  it('aria-labelledby names the trigger from the element it points at', () => {
    render(
      <>
        <span id="net-heading">Deploy to</span>
        <Single aria-labelledby="net-heading" />
      </>
    );
    expect(computeAccessibleName(trigger())).toBe('Deploy to');
  });

  it('boundary: aria-label wins over a <label htmlFor> (ARIA name precedence)', () => {
    render(
      <>
        <label htmlFor="net-field">Network</label>
        <Single id="net-field" aria-label="Chain" />
      </>
    );
    expect(computeAccessibleName(trigger())).toBe('Chain');
  });

  it('failure: a label pointing at an id nothing carries leaves the trigger on its text name', () => {
    render(
      <>
        <label htmlFor="not-here">Network</label>
        <Single />
      </>
    );
    expect(computeAccessibleName(trigger())).not.toBe('Network');
  });
});

describe('INV-4: one id for the trigger, and the popup stays labelled by it', () => {
  it('the consumer id replaces the generated one on the trigger and in the popup label', async () => {
    const user = setup();
    render(
      <>
        <label htmlFor="net-field">Network</label>
        <Single id="net-field" />
      </>
    );
    await user.click(trigger());
    expect(q.listbox().getAttribute('aria-labelledby')).toBe('net-field');
    expect(document.querySelectorAll('#net-field')).toHaveLength(1);
  });

  it('without an id, the popup is labelled by a generated trigger id', async () => {
    const user = setup();
    render(<Single />);
    const generated = trigger().id;
    expect(generated).not.toBe('');
    await user.click(trigger());
    expect(q.listbox().getAttribute('aria-labelledby')).toBe(generated);
  });

  it('an empty id counts as no id: the trigger and the popup label use a generated one', async () => {
    const user = setup();
    render(<Single id="" />);
    const generated = trigger().id;
    expect(generated).not.toBe('');
    await user.click(trigger());
    expect(q.listbox().getAttribute('aria-labelledby')).toBe(generated);
  });

  it('two selectors without ids keep distinct ids', () => {
    render(
      <>
        <Single />
        <Single />
      </>
    );
    const ids = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="network-selector-trigger"]')
    ).map((el) => el.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('AS-2: without the new props the trigger carries no name attributes', () => {
  it('no aria-label and no aria-labelledby is rendered, single mode', () => {
    render(<Single />);
    expect(trigger().hasAttribute('aria-label')).toBe(false);
    expect(trigger().hasAttribute('aria-labelledby')).toBe(false);
  });

  it('no aria-label and no aria-labelledby is rendered, multi mode', () => {
    render(<Multi />);
    expect(trigger().hasAttribute('aria-label')).toBe(false);
    expect(trigger().hasAttribute('aria-labelledby')).toBe(false);
  });

  it('the new props change nothing but the name attributes and the id', () => {
    const bare = render(<Single />);
    const bareHtml = trigger().outerHTML.replace(/ id="[^"]*"/, '');
    bare.unmount();
    render(<Single id="x" aria-label="Chain" />);
    const named = trigger()
      .outerHTML.replace(/ id="[^"]*"/, '')
      .replace(' aria-label="Chain"', '');
    expect(named).toBe(bareHtml);
  });
});

describe('custom trigger (multi mode): the name props reach the consumer element', () => {
  it('id and aria-label land on the custom trigger', () => {
    render(
      <Multi
        id="filter-net"
        aria-label="Filter networks"
        renderTrigger={({ selectedCount }) => <FilterButton count={selectedCount} />}
      />
    );
    expect(q.filter().id).toBe('filter-net');
    expect(computeAccessibleName(q.filter())).toBe('Filter networks');
  });

  it("the consumer's own aria-label on the custom trigger wins over the selector's", () => {
    render(
      <Multi
        aria-label="From selector"
        renderTrigger={() => <FilterButton count={0} aria-label="From consumer" />}
      />
    );
    expect(computeAccessibleName(q.filter())).toBe('From consumer');
  });
});

describe('type surface: the new props are optional strings', () => {
  it('accepts id, aria-label and aria-labelledby; rejects non-strings', () => {
    const ok = (<Single id="a" aria-label="b" aria-labelledby="c" />) satisfies React.ReactElement;
    expect(ok).toBeDefined();
    // @ts-expect-error id must be a string
    const bad = <Single id={1} />;
    expect(bad).toBeDefined();
  });
});
