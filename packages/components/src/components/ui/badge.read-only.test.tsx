/**
 * @vitest-environment jsdom
 *
 * Badge `readOnly`: render contract, description announcement, static no-op, disabled
 * precedence, strict-boolean handling, unchanged default markup, and runtime toggling.
 * Pointer / Enter / Space blocking and Tab order are proven in Chromium
 * (`badge.read-only.browser.test.tsx`).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { createRef } from 'react';

import { Badge, type BadgeProps, type BadgeVariant } from './badge';
import { priorRender } from './badge-switch.prior-render.fixture';

const variants: readonly BadgeVariant[] = ['filled', 'outline', 'solid'];
const pressedStates = [true, false, undefined] as const;
const DISABLED_TOKENS = ['disabled:pointer-events-none', 'disabled:opacity-50'];
const READ_ONLY_TEXT = 'Read-only';

const tokens = (el: Element): string[] => el.className.split(/\s+/).filter(Boolean);

function markup(element: React.ReactElement): string {
  const { container } = render(element);
  const html = container.innerHTML;
  cleanup();
  return html;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Badge readOnly: an interactive badge stays focusable and announces read-only', () => {
  describe.each(variants)('variant %s', (variant) => {
    it.each(pressedStates)(
      'pressed=%s keeps aria-pressed, type, ref, full colour and the Read-only description',
      (pressed) => {
        const ref = createRef<HTMLSpanElement | HTMLButtonElement>();
        render(
          <Badge
            ref={ref}
            label="Open"
            variant={variant}
            pressed={pressed}
            onActivate={() => undefined}
            readOnly
          />
        );
        const button = screen.getByRole('button', {
          name: 'Open',
          description: READ_ONLY_TEXT,
        });

        expect(button).toBeInstanceOf(HTMLButtonElement);
        expect((button as HTMLButtonElement).disabled).toBe(false);
        expect(button.tabIndex).toBe(0);
        expect(button.getAttribute('type')).toBe('button');
        expect(ref.current).toBe(button);
        expect(button.hasAttribute('aria-readonly')).toBe(false);
        expect(button.hasAttribute('aria-disabled')).toBe(false);
        expect(DISABLED_TOKENS.some((t) => tokens(button).includes(t))).toBe(false);
        if (pressed === undefined) {
          expect(button.hasAttribute('aria-pressed')).toBe(false);
        } else {
          expect(button.getAttribute('aria-pressed')).toBe(String(pressed));
        }

        const describedBy = button.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        const description = document.getElementById(describedBy as string);
        expect(description?.textContent).toBe(READ_ONLY_TEXT);
        expect(description?.hasAttribute('hidden')).toBe(true);
        expect(button.contains(description)).toBe(true);
      }
    );
  });

  it('merges a consumer aria-describedby ahead of the Read-only id', () => {
    render(
      <>
        <span id="hint">Extra hint</span>
        <Badge label="Open" pressed onActivate={() => undefined} readOnly aria-describedby="hint" />
      </>
    );
    const button = screen.getByRole('button', {
      name: 'Open',
      description: 'Extra hint Read-only',
    });
    const ids = (button.getAttribute('aria-describedby') ?? '').split(/\s+/);
    expect(ids[0]).toBe('hint');
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[1] as string)?.textContent).toBe(READ_ONLY_TEXT);
  });

  it('jsdom smoke: click does not call onActivate when read-only', () => {
    const onActivate = vi.fn();
    render(<Badge label="Open" pressed onActivate={onActivate} readOnly />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('overlay slot onClick still runs before the read-only return', () => {
    const onActivate = vi.fn();
    const slotOnClick = vi.fn();
    render(
      <Badge
        label="Open"
        pressed
        onActivate={onActivate}
        readOnly
        {...({ onClick: slotOnClick } as object)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(slotOnClick).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });
});

describe('Badge readOnly: a static badge ignores it', () => {
  describe.each(variants)('variant %s', (variant) => {
    it.each([true, false])('readOnly=%s renders the same span as no readOnly', (readOnly) => {
      const without = markup(<Badge label="Status" variant={variant} tone="info" />);
      const withProp = markup(
        <Badge label="Status" variant={variant} tone="info" readOnly={readOnly} />
      );
      expect(withProp).toBe(without);
    });
  });

  it('never writes aria-readonly, aria-disabled or Read-only onto the span', () => {
    render(<Badge label="Status" pressed readOnly />);
    const span = screen.getByText('Status');
    expect(span.tagName).toBe('SPAN');
    expect(span.hasAttribute('aria-readonly')).toBe(false);
    expect(span.hasAttribute('aria-disabled')).toBe(false);
    expect(span.hasAttribute('aria-describedby')).toBe(false);
    expect(span.hasAttribute('aria-pressed')).toBe(false);
    expect(span.textContent).toBe('Status');
  });
});

describe('Badge readOnly: disabled wins', () => {
  it.each(pressedStates)(
    'pressed=%s: readOnly + disabled matches disabled alone (no Read-only description)',
    (pressed) => {
      const disabledOnly = markup(
        <Badge label="Open" pressed={pressed} onActivate={() => undefined} disabled />
      );
      const both = markup(
        <Badge label="Open" pressed={pressed} onActivate={() => undefined} readOnly disabled />
      );
      expect(both).toBe(disabledOnly);
    }
  );

  it('exposes native disabled, dims, and never announces Read-only', () => {
    render(<Badge label="Open" pressed onActivate={() => undefined} readOnly disabled />);
    const button = screen.getByRole('button', { name: 'Open' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.hasAttribute('aria-readonly')).toBe(false);
    expect(button.hasAttribute('aria-disabled')).toBe(false);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(DISABLED_TOKENS.every((t) => tokens(button).includes(t))).toBe(true);
    expect(screen.queryByText(READ_ONLY_TEXT)).toBeNull();
  });
});

describe('Badge readOnly: without it, markup matches the prior release byte for byte', () => {
  const noop = (): void => undefined;
  const cases: [string, (extra: Pick<BadgeProps, 'readOnly'>) => React.ReactElement][] = [];
  for (const variant of variants) {
    for (const pressed of pressedStates) {
      cases.push([
        `badge interactive ${variant} pressed=${pressed}`,
        (extra) => (
          <Badge label="Open" variant={variant} pressed={pressed} onActivate={noop} {...extra} />
        ),
      ]);
    }
    cases.push([
      `badge static ${variant}`,
      (extra) => <Badge label="Status" variant={variant} tone="info" {...extra} />,
    ]);
    cases.push([
      `badge interactive icon ${variant}`,
      (extra) => (
        <Badge
          label="Role"
          variant={variant}
          icon={<svg />}
          iconLabel="Owner"
          onActivate={noop}
          {...extra}
        />
      ),
    ]);
  }

  it('covers every recorded badge case', () => {
    const recorded = Object.keys(priorRender).filter((k) => k.startsWith('badge '));
    expect(cases.map(([key]) => key).sort()).toEqual(recorded.sort());
  });

  it.each(cases)('%s, readOnly omitted and readOnly={false}', (key, build) => {
    expect(markup(build({}))).toBe(priorRender[key]);
    expect(markup(build({ readOnly: false }))).toBe(priorRender[key]);
  });
});

describe('Badge readOnly: only a strict true makes it read-only', () => {
  it.each<[string, unknown]>([
    ['"true"', 'true'],
    ['1', 1],
    ['{}', {}],
  ])('boundary: readOnly=%s leaves the badge activating with no description', (_label, value) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onActivate = vi.fn();
    const untyped = { readOnly: value } as unknown as Pick<BadgeProps, 'readOnly'>;
    render(<Badge label="Open" pressed onActivate={onActivate} {...untyped} />);
    const button = screen.getByRole('button', { name: 'Open' });

    expect(button.hasAttribute('aria-describedby')).toBe(false);
    expect(screen.queryByText(READ_ONLY_TEXT)).toBeNull();
    fireEvent.click(button);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('Badge readOnly: toggling at runtime takes effect on the next input', () => {
  it('read-only → editable: same node, description dropped, next click activates', () => {
    const onActivate = vi.fn();
    const { rerender } = render(<Badge label="Open" pressed onActivate={onActivate} readOnly />);
    const node = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(node);
    expect(onActivate).not.toHaveBeenCalled();

    rerender(<Badge label="Open" pressed={false} onActivate={onActivate} />);
    expect(screen.getByRole('button', { name: 'Open' })).toBe(node);
    expect(node.hasAttribute('aria-describedby')).toBe(false);
    expect(screen.queryByText(READ_ONLY_TEXT)).toBeNull();
    fireEvent.click(node);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('editable → read-only: same node, description appears, next click is blocked', () => {
    const onActivate = vi.fn();
    const { rerender } = render(<Badge label="Open" pressed={false} onActivate={onActivate} />);
    const node = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(node);
    expect(onActivate).toHaveBeenCalledTimes(1);

    rerender(<Badge label="Open" pressed onActivate={onActivate} readOnly />);
    expect(screen.getByRole('button', { name: 'Open', description: READ_ONLY_TEXT })).toBe(node);
    expect(node.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(node);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
