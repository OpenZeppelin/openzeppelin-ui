/**
 * @vitest-environment jsdom
 *
 * Badge `disabled`: render contract, the static-badge no-op, the unchanged default markup,
 * strict-boolean handling and runtime toggling. Keyboard and pointer blocking on a disabled
 * badge are proven in Chromium (`badge.disabled.browser.test.tsx`): user-event skips disabled
 * elements in jsdom, so a jsdom keyboard test would pass whatever the component did.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { createRef } from 'react';

import { Badge, type BadgeProps, type BadgeVariant } from './badge';
import { priorRender } from './badge-switch.prior-render.fixture';

const variants: readonly BadgeVariant[] = ['filled', 'outline', 'solid'];
const pressedStates = [true, false, undefined] as const;
const DISABLED_TOKENS = ['disabled:pointer-events-none', 'disabled:opacity-50'];

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

describe('Badge disabled: an interactive badge becomes a disabled native toggle button', () => {
  describe.each(variants)('variant %s', (variant) => {
    it.each(pressedStates)('pressed=%s keeps aria-pressed, type and ref', (pressed) => {
      const ref = createRef<HTMLSpanElement | HTMLButtonElement>();
      render(
        <Badge
          ref={ref}
          label="Open"
          variant={variant}
          pressed={pressed}
          onActivate={() => undefined}
          disabled
        />
      );
      const button = screen.getByRole('button', { name: 'Open' });

      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect((button as HTMLButtonElement).disabled).toBe(true);
      expect(button.getAttribute('type')).toBe('button');
      expect(ref.current).toBe(button);
      if (pressed === undefined) {
        expect(button.hasAttribute('aria-pressed')).toBe(false);
      } else {
        expect(button.getAttribute('aria-pressed')).toBe(String(pressed));
      }
      // Disabled is native only: no aria-disabled duplicate.
      expect(button.hasAttribute('aria-disabled')).toBe(false);
    });

    it.each(pressedStates)(
      'pressed=%s adds exactly the two disabled tokens to the enabled class list',
      (pressed) => {
        const props = { label: 'Open', variant, pressed, onActivate: () => undefined };
        const { rerender } = render(<Badge {...props} />);
        const button = screen.getByRole('button');
        const enabled = tokens(button);
        rerender(<Badge {...props} disabled />);
        const disabled = tokens(button);

        expect(disabled.filter((t) => !enabled.includes(t)).sort()).toEqual(
          [...DISABLED_TOKENS].sort()
        );
        expect(enabled.filter((t) => !disabled.includes(t))).toEqual([]);
      }
    );
  });

  it('a disabled pressed chip keeps its selected look under the dimming', () => {
    render(
      <>
        <Badge label="Filled" pressed onActivate={() => undefined} disabled />
        <Badge label="Solid" variant="solid" pressed onActivate={() => undefined} disabled />
      </>
    );
    expect(tokens(screen.getByRole('button', { name: 'Filled' }))).toEqual(
      expect.arrayContaining(['bg-primary', 'text-primary-foreground', 'disabled:opacity-50'])
    );
    expect(tokens(screen.getByRole('button', { name: 'Solid' }))).toEqual(
      expect.arrayContaining(['inset-ring-2', 'inset-ring-foreground', 'disabled:opacity-50'])
    );
  });

  it.each<[string, Partial<BadgeProps>, string]>([
    ['visible label', {}, 'Open'],
    ['aria-label', { 'aria-label': 'Open issues filter' }, 'Open issues filter'],
    ['iconLabel', { icon: <svg />, iconLabel: 'Locked' }, 'Locked Open'],
  ])('the accessible name from the %s is the same as when enabled', (_source, extra, name) => {
    const props = { label: 'Open', onActivate: () => undefined, ...extra };
    const { rerender } = render(<Badge {...props} />);
    expect(screen.getByRole('button', { name })).toBeTruthy();
    rerender(<Badge {...props} disabled />);
    expect(screen.getByRole('button', { name })).toBeTruthy();
  });

  it('failure path: React drops a click dispatched at a disabled badge, and onActivate never runs', () => {
    const onActivate = vi.fn();
    render(<Badge label="Open" pressed onActivate={onActivate} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(onActivate).not.toHaveBeenCalled();
  });
});

describe('Badge disabled: a static badge ignores it', () => {
  describe.each(variants)('variant %s', (variant) => {
    it.each([true, false])('disabled=%s renders the same span as no disabled', (disabled) => {
      const without = markup(<Badge label="Status" variant={variant} tone="info" />);
      const withProp = markup(
        <Badge label="Status" variant={variant} tone="info" disabled={disabled} />
      );
      expect(withProp).toBe(without);
    });
  });

  it('never writes disabled or aria-disabled onto the span, and never makes it focusable', () => {
    render(<Badge label="Status" pressed disabled />);
    const span = screen.getByText('Status');
    expect(span.tagName).toBe('SPAN');
    expect(span.hasAttribute('disabled')).toBe(false);
    expect(span.hasAttribute('aria-disabled')).toBe(false);
    expect(span.hasAttribute('tabindex')).toBe(false);
    expect(span.hasAttribute('aria-pressed')).toBe(false);
    expect(DISABLED_TOKENS.some((t) => tokens(span).includes(t))).toBe(false);
  });

  it('boundary: an untyped string disabled does not leak to the span either', () => {
    const untyped = { disabled: 'true' } as unknown as Pick<BadgeProps, 'disabled'>;
    render(<Badge label="Status" {...untyped} />);
    expect(screen.getByText('Status').hasAttribute('disabled')).toBe(false);
  });
});

describe('Badge disabled: without it, markup matches the prior release byte for byte', () => {
  const noop = (): void => undefined;
  const cases: [string, (extra: Pick<BadgeProps, 'disabled'>) => React.ReactElement][] = [];
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

  it.each(cases)('%s, disabled omitted and disabled={false}', (key, build) => {
    expect(markup(build({}))).toBe(priorRender[key]);
    expect(markup(build({ disabled: false }))).toBe(priorRender[key]);
  });
});

describe('Badge disabled: only a strict true disables', () => {
  it.each<[string, unknown]>([
    ['"true"', 'true'],
    ['1', 1],
    ['{}', {}],
  ])('boundary: disabled=%s leaves the badge enabled and activating', (_label, value) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onActivate = vi.fn();
    const untyped = { disabled: value } as unknown as Pick<BadgeProps, 'disabled'>;
    render(<Badge label="Open" pressed onActivate={onActivate} {...untyped} />);
    const button = screen.getByRole('button') as HTMLButtonElement;

    expect(button.disabled).toBe(false);
    expect(DISABLED_TOKENS.some((t) => tokens(button).includes(t))).toBe(false);
    fireEvent.click(button);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('Badge disabled: toggling at runtime takes effect on the next input', () => {
  it('disabled → enabled: same node, back in the tab order, activates on the next click', () => {
    const onActivate = vi.fn();
    const { rerender } = render(<Badge label="Open" pressed onActivate={onActivate} disabled />);
    const node = screen.getByRole('button') as HTMLButtonElement;
    fireEvent.click(node);
    expect(onActivate).not.toHaveBeenCalled();

    rerender(<Badge label="Open" pressed={false} onActivate={onActivate} />);
    expect(screen.getByRole('button')).toBe(node);
    expect(node.disabled).toBe(false);
    expect(node.tabIndex).toBe(0);
    expect(node.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(node);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('enabled → disabled: same node, the next click is blocked, aria-pressed keeps following pressed', () => {
    const onActivate = vi.fn();
    const { rerender } = render(<Badge label="Open" pressed={false} onActivate={onActivate} />);
    const node = screen.getByRole('button') as HTMLButtonElement;
    fireEvent.click(node);
    expect(onActivate).toHaveBeenCalledTimes(1);

    rerender(<Badge label="Open" pressed onActivate={onActivate} disabled />);
    expect(screen.getByRole('button')).toBe(node);
    expect(node.disabled).toBe(true);
    expect(node.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(node);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
