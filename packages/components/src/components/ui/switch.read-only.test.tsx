/**
 * @vitest-environment jsdom
 *
 * Switch `readOnly`: render contract, the unchanged default markup, the derived
 * `aria-readonly`, `disabled` winning, the input guard, the consumer `onClick`, runtime
 * toggling and native form behaviour (submission, change events, constraint validation).
 * Tab order and real keyboard-to-click activation are proven again in Chromium
 * (`switch.read-only.browser.test.tsx`).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { priorRender } from './badge-switch.prior-render.fixture';
import { Switch } from './switch';

type SwitchProps = React.ComponentProps<typeof Switch>;

const noop = (): void => undefined;

function markup(element: React.ReactElement): string {
  const { container } = render(element);
  const html = container.innerHTML;
  cleanup();
  return html;
}

// Radix's bubble input (rendered inside a form) measures the switch with ResizeObserver.
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

type InputPath = 'click' | 'label click' | 'Space' | 'Enter' | 'element.click()';
const INPUT_PATHS: readonly InputPath[] = [
  'click',
  'label click',
  'Space',
  'Enter',
  'element.click()',
];

async function drive(path: InputPath, user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const sw = screen.getByRole('switch');
  switch (path) {
    case 'click':
      await user.click(sw);
      return;
    case 'label click':
      await user.click(screen.getByText('Auto-renew'));
      return;
    case 'Space':
      sw.focus();
      await user.keyboard(' ');
      return;
    case 'Enter':
      sw.focus();
      await user.keyboard('{Enter}');
      return;
    case 'element.click()':
      sw.click();
      return;
  }
}

/** A labelled switch, controlled (with an owner that applies changes) or uncontrolled. */
function Labelled({
  controlled,
  initial,
  ...props
}: SwitchProps & { controlled: boolean; initial: boolean }): React.ReactElement {
  const [checked, setChecked] = React.useState(initial);
  const { onCheckedChange } = props;
  const stateProps: SwitchProps = controlled
    ? {
        checked,
        onCheckedChange: (next) => {
          setChecked(next);
          onCheckedChange?.(next);
        },
      }
    : { defaultChecked: initial };
  return (
    <>
      <label htmlFor="renew">Auto-renew</label>
      <Switch id="renew" {...props} {...stateProps} />
    </>
  );
}

describe('Switch readOnly: renders as an enabled switch with unchanged styling', () => {
  it.each([true, false])(
    'checked=%s exposes role, state and aria-readonly, and is not disabled',
    (checked) => {
      render(<Switch aria-label="Auto-renew" checked={checked} onCheckedChange={noop} readOnly />);
      const sw = screen.getByRole('switch', { name: 'Auto-renew' }) as HTMLButtonElement;

      expect(sw.getAttribute('aria-checked')).toBe(String(checked));
      expect(sw.getAttribute('data-state')).toBe(checked ? 'checked' : 'unchecked');
      expect(sw.getAttribute('aria-readonly')).toBe('true');
      expect(sw.disabled).toBe(false);
      expect(sw.hasAttribute('data-disabled')).toBe(false);
      expect(sw.hasAttribute('readonly')).toBe(false);
    }
  );

  it.each([true, false])('checked=%s keeps the class string of the prior release', (checked) => {
    const prior = document.createElement('div');
    prior.innerHTML = priorRender[`switch checked=${checked}`];
    render(<Switch aria-label="Auto-renew" checked={checked} onCheckedChange={noop} readOnly />);
    expect(screen.getByRole('switch').className).toBe(prior.firstElementChild?.className);
  });

  it('a consumer className still merges', () => {
    render(<Switch aria-label="Auto-renew" className="extra" readOnly />);
    expect(screen.getByRole('switch').className.split(' ')).toContain('extra');
  });
});

describe('Switch readOnly: without it, markup matches the prior release byte for byte', () => {
  const cases: [string, (extra: Pick<SwitchProps, 'readOnly'>) => React.ReactElement][] = [];
  for (const checked of [true, false]) {
    cases.push([
      `switch checked=${checked}`,
      (extra) => (
        <Switch aria-label="Auto-renew" checked={checked} onCheckedChange={noop} {...extra} />
      ),
    ]);
    cases.push([
      `switch default=${checked} className`,
      (extra) => (
        <Switch
          aria-label="Auto-renew"
          defaultChecked={checked}
          className="extra"
          required
          {...extra}
        />
      ),
    ]);
    cases.push([
      `switch disabled checked=${checked}`,
      (extra) => <Switch aria-label="Auto-renew" checked={checked} disabled {...extra} />,
    ]);
  }

  it('covers every recorded switch case', () => {
    const recorded = Object.keys(priorRender).filter((k) => k.startsWith('switch '));
    expect(cases.map(([key]) => key).sort()).toEqual(recorded.sort());
  });

  it.each(cases)('%s, readOnly omitted and readOnly={false}', (key, build) => {
    expect(markup(build({}))).toBe(priorRender[key]);
    expect(markup(build({ readOnly: false }))).toBe(priorRender[key]);
  });

  it('an editable switch still toggles, and a consumer onClick runs once per click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Auto-renew" onClick={onClick} onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByRole('switch'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(screen.getByRole('switch').hasAttribute('aria-readonly')).toBe(false);
  });
});

describe('Switch readOnly: only a strict true makes it read-only, and it never reaches the DOM raw', () => {
  it.each<[string, unknown]>([
    ['"true"', 'true'],
    ['1', 1],
    ['{}', {}],
  ])('boundary: readOnly=%s leaves the switch editable', async (_label, value) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const untyped = { readOnly: value } as unknown as Pick<SwitchProps, 'readOnly'>;
    render(<Switch aria-label="Auto-renew" onCheckedChange={onCheckedChange} {...untyped} />);
    const sw = screen.getByRole('switch');

    expect(sw.hasAttribute('aria-readonly')).toBe(false);
    await user.click(sw);
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each<[string, Pick<SwitchProps, 'readOnly' | 'disabled'>]>([
    ['readOnly', { readOnly: true }],
    ['readOnly={false}', { readOnly: false }],
    ['readOnly + disabled', { readOnly: true, disabled: true }],
    ['no readOnly', {}],
  ])('%s: the button never gets a readonly attribute', (_label, props) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<Switch aria-label="Auto-renew" {...props} />);
    expect(screen.getByRole('switch').hasAttribute('readonly')).toBe(false);
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('Switch readOnly: aria-readonly is derived from readOnly alone', () => {
  const rows: [Partial<Record<'readOnly' | 'disabled' | 'aria-readonly', boolean>>, boolean][] = [];
  for (const readOnly of [true, false, undefined]) {
    for (const disabled of [true, undefined]) {
      for (const ariaReadonly of [true, undefined]) {
        rows.push([
          { readOnly, disabled, 'aria-readonly': ariaReadonly },
          readOnly === true && disabled !== true,
        ]);
      }
    }
  }

  it.each(rows)('%o → aria-readonly present: %s', (props, expected) => {
    render(<Switch aria-label="Auto-renew" {...props} />);
    const sw = screen.getByRole('switch');
    expect(sw.hasAttribute('aria-readonly')).toBe(expected);
    if (expected) expect(sw.getAttribute('aria-readonly')).toBe('true');
  });

  it('failure path: a consumer aria-readonly="true" on an editable switch is dropped, and the switch still toggles', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Switch
        aria-label="Auto-renew"
        readOnly={false}
        aria-readonly="true"
        onCheckedChange={onCheckedChange}
      />
    );
    const sw = screen.getByRole('switch');
    expect(sw.hasAttribute('aria-readonly')).toBe(false);
    await user.click(sw);
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });
});

describe('Switch readOnly: disabled wins', () => {
  it.each([true, false])(
    'checked=%s: readOnly + disabled renders exactly a disabled switch',
    (checked) => {
      expect(markup(<Switch aria-label="Auto-renew" checked={checked} readOnly disabled />)).toBe(
        markup(<Switch aria-label="Auto-renew" checked={checked} disabled />)
      );
    }
  );

  it('is natively disabled, reports data-disabled, keeps the disabled look and drops aria-readonly', () => {
    render(<Switch aria-label="Auto-renew" defaultChecked readOnly disabled />);
    const sw = screen.getByRole('switch') as HTMLButtonElement;
    expect(sw.disabled).toBe(true);
    expect(sw.hasAttribute('data-disabled')).toBe(true);
    expect(sw.hasAttribute('aria-readonly')).toBe(false);
    expect(sw.className.split(' ')).toContain('disabled:opacity-50');
  });

  it('inside a form, its value is not submitted (the bubble input is disabled)', () => {
    const { container } = render(
      <form>
        <Switch aria-label="Auto-renew" name="renew" defaultChecked readOnly disabled />
      </form>
    );
    const form = container.querySelector('form') as HTMLFormElement;
    expect([...new FormData(form).entries()]).toEqual([]);
    expect((form.querySelector('input[type="checkbox"]') as HTMLInputElement).disabled).toBe(true);
  });
});

describe(
  'Switch readOnly input guard — dependency guard on @radix-ui/react-switch and ' +
    '@radix-ui/primitive composeEventHandlers (skips the toggle when the consumer handler ' +
    'calls preventDefault). If this fails after a Radix bump, the read-only guard broke, not the test',
  () => {
    describe.each([
      ['controlled', true],
      ['uncontrolled', false],
    ] as const)('%s', (_mode, controlled) => {
      describe.each([true, false])('initially checked=%s', (initial) => {
        it.each(INPUT_PATHS)('%s leaves the value and calls no onCheckedChange', async (path) => {
          const user = userEvent.setup();
          const onCheckedChange = vi.fn();
          render(
            <Labelled
              controlled={controlled}
              initial={initial}
              readOnly
              onCheckedChange={onCheckedChange}
            />
          );
          await drive(path, user);
          const sw = screen.getByRole('switch');
          expect(onCheckedChange).not.toHaveBeenCalled();
          expect(sw.getAttribute('aria-checked')).toBe(String(initial));
          expect(sw.getAttribute('data-state')).toBe(initial ? 'checked' : 'unchecked');
        });
      });
    });

    // Sensitivity control: the same five paths do reach the toggle on an editable switch, so a
    // zero count above is the guard working, not a path that never fires.
    it.each(INPUT_PATHS)('control: %s toggles an editable switch once', async (path) => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Labelled controlled={false} initial={false} onCheckedChange={onCheckedChange} />);
      await drive(path, user);
      expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
      expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    });
  }
);

describe('Switch readOnly: stays focusable and keeps running the consumer onClick', () => {
  it('is focusable with tabIndex 0', () => {
    render(<Switch aria-label="Auto-renew" readOnly />);
    const sw = screen.getByRole('switch');
    expect(sw.tabIndex).toBe(0);
    sw.focus();
    expect(document.activeElement).toBe(sw);
  });

  it.each(INPUT_PATHS)('%s runs the consumer onClick once, before the guard', async (path) => {
    const user = userEvent.setup();
    const seen: boolean[] = [];
    const onClick = vi.fn((event: React.MouseEvent<HTMLButtonElement>) => {
      seen.push(event.defaultPrevented);
    });
    render(<Labelled controlled initial readOnly onClick={onClick} />);
    await drive(path, user);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].type).toBe('click');
    // The consumer sees the event before the read-only guard prevents it.
    expect(seen).toEqual([false]);
  });

  it('on an editable switch, a consumer onClick that calls preventDefault still blocks the toggle', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Switch
        aria-label="Auto-renew"
        onClick={(event) => event.preventDefault()}
        onCheckedChange={onCheckedChange}
      />
    );
    await user.click(screen.getByRole('switch'));
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
  });
});

describe('Switch readOnly: toggling at runtime takes effect on the next input', () => {
  function Owner({
    readOnly,
    checked,
  }: {
    readOnly: boolean;
    checked: boolean;
  }): React.ReactElement {
    return (
      <Switch
        aria-label="Auto-renew"
        checked={checked}
        onCheckedChange={onCheckedChange}
        readOnly={readOnly}
      />
    );
  }
  const onCheckedChange = vi.fn();
  afterEach(() => onCheckedChange.mockReset());

  it('read-only → editable: same node, aria-readonly gone, the next click toggles once', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Owner readOnly checked={false} />);
    const node = screen.getByRole('switch');
    node.focus();
    await user.click(node);
    expect(onCheckedChange).not.toHaveBeenCalled();

    rerender(<Owner readOnly={false} checked={false} />);
    expect(screen.getByRole('switch')).toBe(node);
    expect(document.activeElement).toBe(node);
    expect(node.hasAttribute('aria-readonly')).toBe(false);
    await user.click(node);
    expect(onCheckedChange.mock.calls).toEqual([[true]]);
  });

  it('editable → read-only: same node, the next click is blocked', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Owner readOnly={false} checked={false} />);
    const node = screen.getByRole('switch');
    rerender(<Owner readOnly checked={false} />);
    expect(screen.getByRole('switch')).toBe(node);
    expect(node.getAttribute('aria-readonly')).toBe('true');
    await user.click(node);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('while read-only, a new checked prop from the owner renders at once', () => {
    const { rerender } = render(<Owner readOnly checked={false} />);
    rerender(<Owner readOnly checked />);
    const sw = screen.getByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(sw.getAttribute('data-state')).toBe('checked');
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe('Switch readOnly in a native form', () => {
  function inForm(element: React.ReactElement): {
    form: HTMLFormElement;
    bubble: HTMLInputElement;
  } {
    const { container } = render(<form>{element}</form>);
    const form = container.querySelector('form') as HTMLFormElement;
    return { form, bubble: form.querySelector('input[type="checkbox"]') as HTMLInputElement };
  }

  it.each([
    [true, [['renew', 'on']]],
    [false, []],
  ] as const)('checked=%s submits like an editable switch: %j', (checked, entries) => {
    const { form, bubble } = inForm(
      <Switch aria-label="Auto-renew" name="renew" defaultChecked={checked} readOnly />
    );
    expect(bubble.disabled).toBe(false);
    expect([...new FormData(form).entries()]).toEqual(entries);
  });

  it('a custom value is submitted', () => {
    const { form } = inForm(
      <Switch aria-label="Auto-renew" name="renew" value="yes" defaultChecked readOnly />
    );
    expect([...new FormData(form).entries()]).toEqual([['renew', 'yes']]);
  });

  it.each([
    ['read-only', true, 0],
    ['editable (control)', false, 1],
  ] as const)(
    '%s: a click and Space each reach a form onChange the expected number of times',
    async (_label, readOnly, perInput) => {
      const user = userEvent.setup();
      // Radix reports a user toggle to the form by dispatching a bubbling click on its hidden
      // checkbox, which React surfaces as the form's onChange (how a form marks itself dirty).
      const onFormChange = vi.fn();
      render(
        <form onChange={onFormChange}>
          <Switch aria-label="Auto-renew" name="renew" readOnly={readOnly} />
        </form>
      );
      const sw = screen.getByRole('switch');

      await user.click(sw);
      expect(onFormChange).toHaveBeenCalledTimes(perInput);
      sw.focus();
      await user.keyboard(' ');
      expect(onFormChange).toHaveBeenCalledTimes(perInput * 2);
    }
  );

  it('a form reset keeps the mount-time value and calls no onCheckedChange', () => {
    const onCheckedChange = vi.fn();
    const { form } = inForm(
      <Switch
        aria-label="Auto-renew"
        name="renew"
        defaultChecked
        readOnly
        onCheckedChange={onCheckedChange}
      />
    );
    fireEvent.click(screen.getByRole('switch'));
    form.reset();
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe('Switch readOnly never blocks native form submission', () => {
  function formFor(element: React.ReactElement): HTMLFormElement {
    const { container } = render(<form>{element}</form>);
    return container.querySelector('form') as HTMLFormElement;
  }

  it('an unchecked read-only required switch passes validation and drops aria-required', () => {
    const form = formFor(<Switch aria-label="Accept terms" name="terms" required readOnly />);
    expect(form.checkValidity()).toBe(true);
    expect(screen.getByRole('switch').hasAttribute('aria-required')).toBe(false);
  });

  it('control: an unchecked editable required switch still fails validation and reports aria-required', () => {
    const form = formFor(<Switch aria-label="Accept terms" name="terms" required />);
    expect(form.checkValidity()).toBe(false);
    expect(screen.getByRole('switch').getAttribute('aria-required')).toBe('true');
  });

  it('a checked read-only required switch still submits its value', () => {
    const form = formFor(
      <Switch aria-label="Accept terms" name="terms" required defaultChecked readOnly />
    );
    expect(form.checkValidity()).toBe(true);
    expect([...new FormData(form).entries()]).toEqual([['terms', 'on']]);
  });

  it('readOnly + disabled + required keeps required as a disabled switch does, and does not block', () => {
    const form = formFor(
      <Switch aria-label="Accept terms" name="terms" required readOnly disabled />
    );
    expect(screen.getByRole('switch').getAttribute('aria-required')).toBe('true');
    expect(form.checkValidity()).toBe(true);
  });

  it('read-only → editable restores required on the next render', () => {
    const { container, rerender } = render(
      <form>
        <Switch aria-label="Accept terms" name="terms" required readOnly />
      </form>
    );
    const form = container.querySelector('form') as HTMLFormElement;
    expect(form.checkValidity()).toBe(true);
    rerender(
      <form>
        <Switch aria-label="Accept terms" name="terms" required readOnly={false} />
      </form>
    );
    expect(form.checkValidity()).toBe(false);
  });
});
