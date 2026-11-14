/**
 * Badge `readOnly` in Chromium: real pointer / Enter / Space never activate, Tab reaches the
 * chip, `disabled` wins for focus order, and axe finds no violation. jsdom can't prove browser
 * keyboard-to-click activation for a native button.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import * as React from 'react';

import { Badge } from './badge';

const READ_ONLY_TEXT = 'Read-only';

async function axeViolations(container: HTMLElement): Promise<axe.Result[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
    rules: { region: { enabled: false } },
  });
  return results.violations;
}

describe('Badge readOnly never activates', () => {
  it.each([true, false, undefined])(
    'pressed=%s: pointer click, Enter, Space and element.click() call onActivate 0 times',
    async (pressed) => {
      const onActivate = vi.fn();
      render(
        <Badge label="Open" variant="outline" pressed={pressed} onActivate={onActivate} readOnly />
      );
      const badge = screen.getByRole('button', {
        name: 'Open',
        description: READ_ONLY_TEXT,
      });

      await userEvent.click(badge);
      badge.focus();
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(' ');
      badge.click();

      expect(onActivate).not.toHaveBeenCalled();
      expect(badge.hasAttribute('aria-readonly')).toBe(false);
      expect(badge.hasAttribute('aria-disabled')).toBe(false);
      if (pressed !== undefined) expect(badge.getAttribute('aria-pressed')).toBe(String(pressed));
    }
  );

  it('control: the same inputs activate an editable badge, so the zero count above is the guard', async () => {
    const onActivate = vi.fn();
    render(<Badge label="Open" variant="outline" pressed onActivate={onActivate} />);
    const badge = screen.getByRole('button', { name: 'Open' });

    await userEvent.click(badge);
    badge.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    badge.click();

    expect(onActivate).toHaveBeenCalledTimes(4);
  });

  it('a badge that becomes read-only while focused ignores the following Enter and Space', async () => {
    const onActivate = vi.fn();
    const { rerender } = render(<Badge label="Open" pressed onActivate={onActivate} />);
    const badge = screen.getByRole('button', { name: 'Open' });
    badge.focus();
    expect(document.activeElement).toBe(badge);

    rerender(<Badge label="Open" pressed onActivate={onActivate} readOnly />);
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onActivate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open', description: READ_ONLY_TEXT })).toBe(badge);
  });
});

function TabFixture({
  readOnly,
  disabled,
}: {
  readOnly: boolean;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <>
      <button type="button">Before</button>
      <Badge
        label="Open"
        pressed
        onActivate={() => undefined}
        readOnly={readOnly}
        disabled={disabled}
      />
      <button type="button">After</button>
    </>
  );
}

describe('Badge readOnly accessibility', () => {
  it('Tab reaches a read-only badge and skips it once disabled wins', async () => {
    const { rerender } = render(<TabFixture readOnly />);
    const before = screen.getByRole('button', { name: 'Before' });
    before.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Open', description: READ_ONLY_TEXT })
    );

    rerender(<TabFixture readOnly disabled />);
    before.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
  });

  it('axe finds no violation on read-only pressed, unpressed, disabled-wins and static badges', async () => {
    const { container } = render(
      <main>
        <Badge label="Open" variant="outline" pressed onActivate={() => undefined} readOnly />
        <Badge
          label="Closed"
          variant="solid"
          tone="neutral"
          pressed={false}
          onActivate={() => undefined}
          readOnly
        />
        <Badge
          label="Held disabled"
          variant="outline"
          pressed
          onActivate={() => undefined}
          readOnly
          disabled
        />
        <Badge
          label="Locked"
          icon={<svg />}
          iconLabel="Locked filter"
          onActivate={() => undefined}
          readOnly
        />
        <Badge label="Static" variant="outline" readOnly />
      </main>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
