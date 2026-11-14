/**
 * Switch `readOnly` in Chromium: real keyboard-to-click activation, label activation and Tab
 * order. Repeats the jsdom input guard in a real browser, where Space and Enter on a button are
 * turned into a click by the browser itself.
 *
 * Dependency guard: the read-only switch relies on `@radix-ui/react-switch` composing the
 * consumer onClick before its toggle with `@radix-ui/primitive` `composeEventHandlers`, which
 * skips the toggle when the event is default-prevented. If the guard tests fail after a Radix
 * bump, the read-only guard broke, not the test.
 *
 * Playwright refuses to click a disabled element (or its label), so pointer clicks on the
 * read-only + disabled switch pass `force: true`. The click is still a real mouse press.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import * as React from 'react';

import { Switch } from './switch';

type SwitchProps = React.ComponentProps<typeof Switch>;
type InputPath = 'click' | 'label click' | 'Space' | 'Enter' | 'element.click()';
const INPUT_PATHS: readonly InputPath[] = [
  'click',
  'label click',
  'Space',
  'Enter',
  'element.click()',
];

async function drive(path: InputPath, options: { force?: boolean } = {}): Promise<void> {
  const sw = screen.getByRole('switch', { name: 'Auto-renew' });
  switch (path) {
    case 'click':
      await userEvent.click(sw, options);
      return;
    case 'label click':
      await userEvent.click(screen.getByText('Auto-renew'), options);
      return;
    case 'Space':
      sw.focus();
      await userEvent.keyboard(' ');
      return;
    case 'Enter':
      sw.focus();
      await userEvent.keyboard('{Enter}');
      return;
    case 'element.click()':
      sw.click();
      return;
  }
}

function Labelled({
  controlled,
  initial,
  onCheckedChange,
  ...props
}: SwitchProps & { controlled: boolean; initial: boolean }): React.ReactElement {
  const [checked, setChecked] = React.useState(initial);
  const stateProps: SwitchProps = controlled
    ? {
        checked,
        onCheckedChange: (next) => {
          setChecked(next);
          onCheckedChange?.(next);
        },
      }
    : { defaultChecked: initial, onCheckedChange };
  return (
    <div>
      <label htmlFor="renew">Auto-renew</label>
      <Switch id="renew" {...props} {...stateProps} />
    </div>
  );
}

describe('Switch readOnly input guard in Chromium (dependency guard on @radix-ui/react-switch composeEventHandlers)', () => {
  describe.each([
    ['controlled', true],
    ['uncontrolled', false],
  ] as const)('%s', (_mode, controlled) => {
    it.each([true, false])(
      'initially checked=%s: click, label click, Space, Enter and element.click() change nothing',
      async (initial) => {
        const onCheckedChange = vi.fn();
        const onClick = vi.fn();
        render(
          <Labelled
            controlled={controlled}
            initial={initial}
            readOnly
            onClick={onClick}
            onCheckedChange={onCheckedChange}
          />
        );
        for (const path of INPUT_PATHS) await drive(path);

        const sw = screen.getByRole('switch', { name: 'Auto-renew' });
        expect(onCheckedChange).not.toHaveBeenCalled();
        expect(sw.getAttribute('aria-checked')).toBe(String(initial));
        // Every path reached the switch as one click, and the consumer saw each of them.
        expect(onClick).toHaveBeenCalledTimes(INPUT_PATHS.length);
        expect(document.activeElement).toBe(sw);
      }
    );
  });

  it('control: each of the five paths toggles an editable switch, so zero calls above is the guard', async () => {
    const onCheckedChange = vi.fn();
    render(<Labelled controlled={false} initial={false} onCheckedChange={onCheckedChange} />);
    for (const path of INPUT_PATHS) await drive(path);
    expect(onCheckedChange.mock.calls).toEqual([[true], [false], [true], [false], [true]]);
  });
});

describe('Switch readOnly focus and disabled precedence in Chromium', () => {
  it('Tab reaches a read-only switch and skips a read-only + disabled one', async () => {
    render(
      <div>
        <button type="button">Before</button>
        <Switch aria-label="Read-only on" defaultChecked readOnly />
        <Switch aria-label="Read-only and disabled" defaultChecked readOnly disabled />
        <button type="button">After</button>
      </div>
    );
    screen.getByRole('button', { name: 'Before' }).focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('switch', { name: 'Read-only on' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
  });

  it('read-only + disabled: pointer click, label click and Space change nothing', async () => {
    const onCheckedChange = vi.fn();
    render(
      <Labelled controlled={false} initial readOnly disabled onCheckedChange={onCheckedChange} />
    );
    const sw = screen.getByRole('switch', { name: 'Auto-renew' });
    expect(sw).toBeDisabled();
    expect(sw.hasAttribute('aria-readonly')).toBe(false);

    await drive('click', { force: true });
    // Playwright retargets a label click to its disabled control, so it needs force too.
    await drive('label click', { force: true });
    await drive('Space');

    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).not.toBe(sw);
  });
});

describe('Switch readOnly accessibility', () => {
  it('is exposed as a named read-only switch with its state, and axe finds no violation', async () => {
    const { container } = render(
      <main>
        <div>
          <label htmlFor="ro-on">Read-only (on)</label>
          <Switch id="ro-on" defaultChecked readOnly />
        </div>
        <div>
          <label htmlFor="ro-off">Read-only (off)</label>
          <Switch id="ro-off" readOnly />
        </div>
        <div>
          <label htmlFor="ro-disabled">Read-only and disabled</label>
          <Switch id="ro-disabled" defaultChecked readOnly disabled />
        </div>
        <div>
          <label htmlFor="ro-required">Accept terms</label>
          <Switch id="ro-required" readOnly required />
        </div>
      </main>
    );

    const on = screen.getByRole('switch', { name: 'Read-only (on)', checked: true });
    expect(on.getAttribute('aria-readonly')).toBe('true');
    expect(screen.getByRole('switch', { name: 'Read-only (off)', checked: false })).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: 'Read-only and disabled' }).hasAttribute('aria-readonly')
    ).toBe(false);

    const results = await axe.run(container, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
