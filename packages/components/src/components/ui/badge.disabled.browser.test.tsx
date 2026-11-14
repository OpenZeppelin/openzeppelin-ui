/**
 * Badge `disabled` in Chromium: no input path activates a disabled badge, an overlay it
 * triggers stays closed, it leaves the tab order, and it is axe-clean. These need a real
 * browser: user-event in jsdom skips disabled elements itself, so it proves nothing about what
 * the browser does.
 *
 * Playwright refuses to click a disabled element, so pointer clicks pass `force: true`. The
 * click is still a real mouse press at the badge's centre.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import * as React from 'react';

import { Badge } from './badge';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

/** The browser config does not load the kit stylesheet; inject the disabled utilities Badge uses. */
beforeAll(() => {
  if (document.getElementById('badge-disabled-styles')) return;
  const style = document.createElement('style');
  style.id = 'badge-disabled-styles';
  style.textContent = `
    .disabled\\:pointer-events-none:disabled { pointer-events: none; }
    .disabled\\:opacity-50:disabled { opacity: 0.5; }
    button { min-width: 64px; min-height: 24px; }
  `;
  document.head.appendChild(style);
});

async function axeViolations(container: HTMLElement): Promise<axe.Result[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
    // A fixture is a fragment, not a page.
    rules: { region: { enabled: false } },
  });
  return results.violations;
}

describe('Badge disabled never activates', () => {
  it.each([true, false, undefined])(
    'pressed=%s: pointer click, Enter, Space and element.click() call onActivate 0 times',
    async (pressed) => {
      const onActivate = vi.fn();
      render(
        <Badge label="Open" variant="outline" pressed={pressed} onActivate={onActivate} disabled />
      );
      const badge = screen.getByRole('button', { name: 'Open' });

      await userEvent.click(badge, { force: true });
      badge.focus();
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(' ');
      badge.click();

      expect(onActivate).not.toHaveBeenCalled();
      if (pressed !== undefined) expect(badge.getAttribute('aria-pressed')).toBe(String(pressed));
    }
  );

  it('control: the same inputs activate an enabled badge, so the zero count above is the attribute working', async () => {
    const onActivate = vi.fn();
    render(<Badge label="Open" variant="outline" pressed onActivate={onActivate} />);
    const badge = screen.getByRole('button', { name: 'Open' });

    await userEvent.click(badge, { force: true });
    badge.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    badge.click();

    expect(onActivate).toHaveBeenCalledTimes(4);
  });

  it('a badge that becomes disabled while focused ignores the following Enter and Space', async () => {
    const onActivate = vi.fn();
    const { rerender } = render(<Badge label="Open" pressed onActivate={onActivate} />);
    const badge = screen.getByRole('button', { name: 'Open' });
    badge.focus();
    expect(document.activeElement).toBe(badge);

    rerender(<Badge label="Open" pressed onActivate={onActivate} disabled />);
    // Where focus goes is the browser's call; only activation is asserted.
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onActivate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open' })).toBe(badge);
  });

  it.each([
    ['disabled', true, false],
    ['enabled (control)', false, true],
  ] as const)(
    'a %s badge as PopoverTrigger asChild: pointer and programmatic clicks leave the popover open=%s',
    async (_label, disabled, opens) => {
      const onActivate = vi.fn();
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Badge label="Filters" onActivate={onActivate} disabled={disabled} />
          </PopoverTrigger>
          <PopoverContent>Filter details</PopoverContent>
        </Popover>
      );
      const badge = screen.getByRole('button', { name: 'Filters' });

      await userEvent.click(badge, { force: true });
      if (disabled) badge.click();

      await expect
        .poll(() => document.body.textContent?.includes('Filter details') ?? false)
        .toBe(opens);
      expect(badge.getAttribute('aria-expanded')).toBe(String(opens));
      expect(onActivate).toHaveBeenCalledTimes(opens ? 1 : 0);
    }
  );
});

function TabFixture({ disabled }: { disabled: boolean }): React.ReactElement {
  return (
    <>
      <button type="button">Before</button>
      <Badge label="Open" pressed onActivate={() => undefined} disabled={disabled} />
      <button type="button">After</button>
    </>
  );
}

describe('Badge disabled accessibility', () => {
  it('is reported disabled, keeps its pressed state and name, and dims', () => {
    render(<Badge label="Open" variant="outline" pressed onActivate={() => undefined} disabled />);
    const badge = screen.getByRole('button', { name: 'Open', pressed: true });
    expect(badge).toBeDisabled();
    expect(getComputedStyle(badge).opacity).toBe('0.5');
    expect(getComputedStyle(badge).pointerEvents).toBe('none');
  });

  it('Tab skips a disabled badge and reaches it again once enabled', async () => {
    const { rerender } = render(<TabFixture disabled />);
    const before = screen.getByRole('button', { name: 'Before' });
    const after = screen.getByRole('button', { name: 'After' });
    before.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(after);

    rerender(<TabFixture disabled={false} />);
    before.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open' }));
  });

  it('axe finds no violation on disabled pressed, unpressed and solid badges', async () => {
    const { container } = render(
      <main>
        <Badge label="Open" variant="outline" pressed onActivate={() => undefined} disabled />
        <Badge
          label="Closed"
          variant="outline"
          pressed={false}
          onActivate={() => undefined}
          disabled
        />
        <Badge label="Mine" variant="solid" pressed onActivate={() => undefined} disabled />
        <Badge
          label="Locked"
          icon={<svg />}
          iconLabel="Locked filter"
          onActivate={() => undefined}
          disabled
        />
        <Badge label="Static" variant="outline" disabled />
      </main>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
