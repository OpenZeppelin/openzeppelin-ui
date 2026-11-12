/**
 * 006 SF-5 · LoadingButton keeps focus while loading — Chromium tests.
 *
 * INV-6 (every activation is blocked while loading), INV-7 (idle activation as in 005, the
 * sensitivity control), INV-8 (asChild default action), INV-9 (focus stays on the same node)
 * and INV-12 (Tab order, axe). These need a real browser: jsdom has no implicit form
 * submission and does not move focus off a disabled button.
 *
 * Playwright treats `aria-disabled="true"` as not actionable, so pointer clicks on a loading
 * button pass `force: true`. The click is still a real mouse press at the button's centre.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import * as React from 'react';

import { LoadingButton } from './loading-button';
import { BaselineLoadingButton } from './loading-button.sf5-baseline';

/**
 * The browser config does not load the kit stylesheet; inject the utilities this suite depends
 * on. `pointer-events-none` is defined so that a regression adding it to the loading look would
 * make a mouse click fall through to the padded container and drop focus here (INV-9).
 */
beforeAll(() => {
  if (document.getElementById('sf5-006-styles')) return;
  const style = document.createElement('style');
  style.id = 'sf5-006-styles';
  style.textContent = `
    .opacity-50 { opacity: 0.5; }
    .pointer-events-none { pointer-events: none; }
    .disabled\\:pointer-events-none:disabled { pointer-events: none; }
    .sf5-pad { padding: 16px; }
    button { min-width: 80px; min-height: 32px; }
  `;
  document.head.appendChild(style);
});

type ButtonType = 'submit' | 'reset' | 'button' | undefined;

interface HarnessProps {
  loading: boolean;
  type?: ButtonType;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onSubmit: () => void;
}

/** A real `<form noValidate>` with a text field and one LoadingButton as its default button. */
function Harness({ loading, type, onClick, onSubmit }: HarnessProps): React.ReactElement {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="sf5-amount">Amount</label>
      <input id="sf5-amount" type="text" defaultValue="1.5" />
      <div className="sf5-pad">
        <LoadingButton type={type} loading={loading} onClick={onClick}>
          Send
        </LoadingButton>
      </div>
    </form>
  );
}

type Activation =
  | 'mouse click'
  | 'Enter on button'
  | 'Space on button'
  | 'Enter in field'
  | '.click()';
const ACTIVATIONS: Activation[] = [
  'mouse click',
  'Enter on button',
  'Space on button',
  'Enter in field',
  '.click()',
];

async function activate(how: Activation, button: HTMLElement, field: HTMLElement): Promise<void> {
  switch (how) {
    case 'mouse click':
      await userEvent.click(button, { force: true });
      return;
    case 'Enter on button':
      button.focus();
      await userEvent.keyboard('{Enter}');
      return;
    case 'Space on button':
      button.focus();
      await userEvent.keyboard(' ');
      return;
    case 'Enter in field':
      field.focus();
      await userEvent.keyboard('{Enter}');
      return;
    case '.click()':
      button.click();
      return;
  }
}

/** Records `defaultPrevented` for every click, after React's root listener has run. */
function recordClicks(): { prevented: boolean[]; stop: () => void } {
  const prevented: boolean[] = [];
  const listener = (e: Event): void => void prevented.push(e.defaultPrevented);
  window.addEventListener('click', listener);
  return { prevented, stop: () => window.removeEventListener('click', listener) };
}

function parts(): { button: HTMLButtonElement; field: HTMLInputElement } {
  return {
    button: screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement,
    field: screen.getByLabelText('Amount') as HTMLInputElement,
  };
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 50));

describe('SF-5 INV-6: while loading, no activation reaches onClick or the default action', () => {
  for (const type of ['submit', undefined] as const) {
    for (const how of ACTIVATIONS) {
      it(`${how} on a loading ${type ?? 'typeless'} button: onClick 0, submit 0, click prevented`, async () => {
        const onClick = vi.fn();
        const onSubmit = vi.fn();
        render(<Harness loading type={type} onClick={onClick} onSubmit={onSubmit} />);
        const { button, field } = parts();
        const clicks = recordClicks();
        try {
          await activate(how, button, field);
          await settle();
        } finally {
          clicks.stop();
        }
        expect(onClick).not.toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
        // Every activation that reached the button did so as a click, and each was cancelled.
        expect(clicks.prevented.length).toBeGreaterThanOrEqual(1);
        expect(clicks.prevented.every(Boolean)).toBe(true);
      });
    }
  }

  it('repeated activations during one loading period stay blocked', async () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn();
    render(<Harness loading type="submit" onClick={onClick} onSubmit={onSubmit} />);
    const { button, field } = parts();
    for (let round = 0; round < 3; round += 1) {
      for (const how of ACTIVATIONS) await activate(how, button, field);
    }
    await settle();
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('a loading type="reset" button does not reset the form', async () => {
    render(
      <form noValidate>
        <label htmlFor="sf5-reset-field">Note</label>
        <input id="sf5-reset-field" type="text" defaultValue="initial" />
        <LoadingButton type="reset" loading>
          Clear
        </LoadingButton>
      </form>
    );
    const field = screen.getByLabelText('Note') as HTMLInputElement;
    field.focus();
    await userEvent.fill(field, 'typed');
    const button = screen.getByRole('button', { name: 'Clear' });
    await userEvent.click(button, { force: true });
    button.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(field.value).toBe('typed');
  });

  it('sensitivity: the same idle type="reset" button does reset the form', async () => {
    render(
      <form noValidate>
        <label htmlFor="sf5-reset-field-idle">Note</label>
        <input id="sf5-reset-field-idle" type="text" defaultValue="initial" />
        <LoadingButton type="reset">Clear</LoadingButton>
      </form>
    );
    const field = screen.getByLabelText('Note') as HTMLInputElement;
    await userEvent.fill(field, 'typed');
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(field.value).toBe('initial');
  });

  describe('asChild <a href>', () => {
    beforeEach(() => history.replaceState(null, '', location.pathname + location.search));
    afterEach(() => history.replaceState(null, '', location.pathname + location.search));

    it('loading: no navigation on click or Enter', async () => {
      const onClick = vi.fn();
      render(
        <LoadingButton asChild loading onClick={onClick}>
          <a href="#sf5">Open</a>
        </LoadingButton>
      );
      const link = screen.getByRole('link', { name: 'Open' });
      await userEvent.click(link, { force: true });
      link.focus();
      await userEvent.keyboard('{Enter}');
      await settle();
      expect(location.hash).toBe('');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('sensitivity: idle, the same link navigates and calls onClick', async () => {
      const onClick = vi.fn();
      render(
        <LoadingButton asChild onClick={onClick}>
          <a href="#sf5">Open</a>
        </LoadingButton>
      );
      await userEvent.click(screen.getByRole('link', { name: 'Open' }));
      await settle();
      expect(location.hash).toBe('#sf5');
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});

describe('SF-5 INV-7: while idle, every activation behaves as in 005 (sensitivity control)', () => {
  for (const how of ACTIVATIONS) {
    it(`${how} on an idle submit button: onClick 1, submit 1, not prevented`, async () => {
      const onClick = vi.fn();
      const onSubmit = vi.fn();
      render(<Harness loading={false} type="submit" onClick={onClick} onSubmit={onSubmit} />);
      const { button, field } = parts();
      const clicks = recordClicks();
      try {
        await activate(how, button, field);
        await settle();
      } finally {
        clicks.stop();
      }
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(clicks.prevented).toEqual([false]);
    });
  }

  it('an idle submit button with no onClick still submits on Enter in the field', async () => {
    const onSubmit = vi.fn();
    render(<Harness loading={false} type="submit" onSubmit={onSubmit} />);
    const { field } = parts();
    field.focus();
    await userEvent.keyboard('{Enter}');
    await settle();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('after a loading period ends, Enter in the field submits again', async () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<Harness loading type="submit" onSubmit={onSubmit} />);
    const { field } = parts();
    field.focus();
    await userEvent.keyboard('{Enter}');
    await settle();
    expect(onSubmit).toHaveBeenCalledTimes(0);

    rerender(<Harness loading={false} type="submit" onSubmit={onSubmit} />);
    field.focus();
    await userEvent.keyboard('{Enter}');
    await settle();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('SF-5 INV-9: focus stays on the same node through every loading transition', () => {
  it('a focused button keeps focus when loading turns on and off', async () => {
    const onSubmit = vi.fn();
    const ref = React.createRef<HTMLButtonElement>();
    function RefHarness({ loading }: { loading: boolean }): React.ReactElement {
      return (
        <LoadingButton ref={ref} loading={loading}>
          Send
        </LoadingButton>
      );
    }
    const { rerender } = render(<RefHarness loading={false} />);
    const before = ref.current;
    before?.focus();
    expect(document.activeElement).toBe(before);

    rerender(<RefHarness loading />);
    await settle();
    expect(document.activeElement).toBe(before);
    expect(ref.current).toBe(before);

    rerender(<RefHarness loading={false} />);
    await settle();
    expect(document.activeElement).toBe(before);

    rerender(<RefHarness loading />);
    rerender(<RefHarness loading={false} />);
    rerender(<RefHarness loading />);
    await settle();
    expect(document.activeElement).toBe(before);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sensitivity: the 005 button (native disabled while loading) loses focus in Chromium', async () => {
    const { rerender } = render(
      <BaselineLoadingButton loading={false}>Send</BaselineLoadingButton>
    );
    const button = screen.getByRole('button', { name: 'Send' });
    button.focus();
    expect(document.activeElement).toBe(button);
    rerender(<BaselineLoadingButton loading>Send</BaselineLoadingButton>);
    await settle();
    expect(document.activeElement).not.toBe(button);
  });

  for (const how of ['mouse click', 'Enter on button', 'Space on button'] as const) {
    it(`${how} on a loading button leaves focus on it`, async () => {
      render(<Harness loading type="submit" onSubmit={vi.fn()} />);
      const { button, field } = parts();
      button.focus();
      await activate(how, button, field);
      await settle();
      expect(document.activeElement).toBe(button);
    });
  }

  it('Enter in the field while loading leaves focus in the field', async () => {
    render(<Harness loading type="submit" onSubmit={vi.fn()} />);
    const { button, field } = parts();
    await activate('Enter in field', button, field);
    await settle();
    expect(document.activeElement).toBe(field);
  });

  it('a loading button still takes pointer events (no pointer-events: none in the look)', () => {
    render(<Harness loading type="submit" onSubmit={vi.fn()} />);
    const { button } = parts();
    expect(getComputedStyle(button).pointerEvents).not.toBe('none');
    expect(getComputedStyle(button).opacity).toBe('0.5');
  });

  it('a mouse click on an unfocused loading button focuses it, like an idle button', async () => {
    render(<Harness loading type="submit" onSubmit={vi.fn()} />);
    const { button, field } = parts();
    field.focus();
    await userEvent.click(button, { force: true });
    await settle();
    expect(document.activeElement).toBe(button);
  });
});

describe('SF-5 INV-12: a loading button stays in the Tab order and passes axe', () => {
  it('Tab from the field reaches the loading button', async () => {
    render(<Harness loading type="submit" onSubmit={vi.fn()} />);
    const { button, field } = parts();
    field.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(button);
  });

  it('Shift+Tab from the loading button goes back to the field', async () => {
    render(<Harness loading type="submit" onSubmit={vi.fn()} />);
    const { button, field } = parts();
    button.focus();
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(field);
  });

  it('axe (wcag2a, wcag2aa) reports no violation for idle, loading, disabled and both', async () => {
    const { container } = render(
      <main>
        <LoadingButton>Idle</LoadingButton>
        <LoadingButton loading>Loading</LoadingButton>
        <LoadingButton disabled>Disabled</LoadingButton>
        <LoadingButton disabled loading>
          Both
        </LoadingButton>
        <LoadingButton asChild loading>
          <a href="#sf5">Link</a>
        </LoadingButton>
      </main>
    );
    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
