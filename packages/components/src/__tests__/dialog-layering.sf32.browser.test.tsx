/**
 * SF-32 · Chromium: nested layers inside a kit Dialog share one layer stack.
 *
 * A popover, searchable multi-select, dropdown menu or select opened inside a
 * kit Dialog keeps focus (INV-11), closes one layer per Escape (INV-12) and per
 * outside press (INV-13), renders as one stack (INV-1), leaves no page residue
 * after any close order (INV-17), logs nothing (INV-18), hides the right
 * subtrees from assistive tech (INV-21) and keeps trigger IDREFs resolvable
 * (INV-22, U-1, U-7), and pins the open-trigger popper attributes (INV-4, U-11).
 * Each test names the invariant it checks.
 *
 * The kit CSS is not loaded in this runner, so a few layout rules are injected
 * to give the overlay and dialog real geometry for pointer tests.
 * Opt-in via `pnpm test:browser`. Not part of default jsdom `pnpm test`.
 * Invariants: SF-32 03-invariants.md (Dev3 artifacts for this initiative).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { SearchableMultiSelect } from '../components/ui/searchable-multi-select';
import {
  CoreHarness,
  COUNTRIES,
  countryId,
  countryLabel,
  pageSnapshot,
  q,
  type Country,
} from '../components/ui/searchable-multi-select/__tests__/helpers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

type Layer = 'sms' | 'popover' | 'modal-popover' | 'menu' | 'select' | 'single';

interface HarnessProps {
  readonly layer: Layer;
  readonly onDialog?: (open: boolean) => void;
  readonly onLayer?: (open: boolean) => void;
  /** Controls the Dialog from outside (close paths 3 and 4). */
  readonly dialogOpen?: boolean;
}

const NETS = [
  { id: 'alpha', name: 'Alpha' },
  { id: 'beta', name: 'Beta' },
  { id: 'gamma', name: 'Gamma' },
] as const;

function Harness({ layer, onDialog, onLayer, dialogOpen }: HarnessProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [ids, setIds] = React.useState<string[]>([]);
  const [fruit, setFruit] = React.useState('apple');
  return (
    <div data-testid="page">
      <button type="button">Outside</button>
      <Dialog
        open={dialogOpen ?? open}
        onOpenChange={(next) => {
          onDialog?.(next);
          setOpen(next);
        }}
      >
        <DialogTrigger asChild>
          <button type="button">Open dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Edit items</DialogTitle>
          <DialogDescription>A layer opens on top of this dialog.</DialogDescription>
          <button type="button">Before</button>
          {layer === 'sms' && (
            <SearchableMultiSelect<Country>
              aria-label="Countries"
              items={COUNTRIES}
              getItemId={countryId}
              getItemLabel={countryLabel}
              selectedIds={ids}
              onSelectionChange={setIds}
              onOpenChange={onLayer}
            />
          )}
          {layer === 'single' && (
            <CoreHarness items={[...NETS]} multiple={false} onOpenChange={onLayer} />
          )}
          {(layer === 'popover' || layer === 'modal-popover') && (
            <Popover modal={layer === 'modal-popover'} onOpenChange={onLayer}>
              <PopoverTrigger asChild>
                <button type="button">Details</button>
              </PopoverTrigger>
              <PopoverContent aria-label="Details">
                <button type="button">Inside popover</button>
              </PopoverContent>
            </Popover>
          )}
          {layer === 'menu' && (
            <DropdownMenu onOpenChange={onLayer}>
              <DropdownMenuTrigger asChild>
                <button type="button">Network</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Alpha</DropdownMenuItem>
                <DropdownMenuItem>Beta</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Gamma</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {layer === 'select' && (
            <Select value={fruit} onValueChange={setFruit} onOpenChange={onLayer}>
              <SelectTrigger aria-label="Fruit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
              </SelectContent>
            </Select>
          )}
          <output data-testid="readout">{ids.join(',')}</output>
          <button type="button">After</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Real geometry for the overlay and dialog (the kit CSS is not loaded here). */
function layoutStyle(): () => void {
  const style = document.createElement('style');
  style.textContent = [
    '.fixed.inset-0{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.5)}',
    '[role="dialog"]{position:fixed;top:120px;left:120px;width:420px;z-index:51;background:#fff;padding:16px}',
    '[data-radix-popper-content-wrapper]{z-index:60!important}',
    '[role="menu"],[role="listbox"],[data-slot="searchable-multi-select-content"]{background:#fff}',
  ].join('\n');
  document.head.appendChild(style);
  return () => style.remove();
}

/** The kit Dialog, found by its title (its accessible name is not computed while a nested layer aria-hides it). */
const queryDialog = (): HTMLElement | null =>
  screen.queryByText('Edit items')?.closest<HTMLElement>('[role="dialog"]') ?? null;
const dialogEl = (): HTMLElement => {
  const el = queryDialog();
  if (!el) throw new Error('the dialog is not open');
  return el;
};
const guards = (): number => document.querySelectorAll('[data-radix-focus-guard]').length;
const pe = (el: Element): string => getComputedStyle(el).pointerEvents;
const btn = (name: string): HTMLElement => screen.getByRole('button', { name, hidden: true });
/** The open nested layer's content element (the dismissable layer). */
function layerContent(layer: Layer): HTMLElement {
  const selector: Record<Layer, string> = {
    sms: '[data-slot="searchable-multi-select-content"]',
    single: '[data-slot="searchable-multi-select-content"]',
    popover: '[data-radix-popper-content-wrapper] > [data-state="open"]',
    'modal-popover': '[data-radix-popper-content-wrapper] > [data-state="open"]',
    menu: '[role="menu"]',
    select: '[role="listbox"]',
  };
  const el = document.querySelector<HTMLElement>(selector[layer]);
  if (!el) throw new Error(`no open ${layer} content`);
  return el;
}
const layerTriggerName: Record<Exclude<Layer, 'sms' | 'single'>, string> = {
  popover: 'Details',
  'modal-popover': 'Details',
  menu: 'Network',
  select: 'Fruit',
};

async function openDialog(): Promise<void> {
  await userEvent.click(btn('Open dialog'));
  await expect.poll(() => queryDialog()).not.toBeNull();
}

async function openLayer(layer: Layer): Promise<void> {
  if (layer === 'sms') await userEvent.click(q.trigger());
  else if (layer === 'single') await userEvent.click(screen.getByTestId('custom-trigger'));
  else if (layer === 'select')
    await userEvent.click(screen.getByRole('combobox', { name: 'Fruit', hidden: true }));
  else await userEvent.click(btn(layerTriggerName[layer]));
  await expect.poll(() => layerContent(layer)).toBeTruthy();
}

const layerOpen = (layer: Layer): boolean => {
  try {
    layerContent(layer);
    return true;
  } catch {
    return false;
  }
};

/** The element with this accessible name, inside an `aria-hidden="true"` subtree or not. */
const isHidden = (el: Element): boolean => el.closest('[aria-hidden="true"]') !== null;

async function axeViolations(): Promise<string[]> {
  const results = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
  );
}

let cleanupStyle: (() => void) | undefined;
beforeEach(() => {
  cleanupStyle = layoutStyle();
});
afterEach(() => {
  cleanupStyle?.();
  // A leaked `pointer-events: none` would make every later click time out.
  document.body.style.pointerEvents = '';
});

describe('INV-1: a nested layer renders as one stack', () => {
  it.each(['sms', 'modal-popover', 'menu', 'select'] as const)(
    'modal %s inside the dialog: one guard pair, layer takes pointer events, dialog and body do not',
    async (layer) => {
      render(<Harness layer={layer} />);
      await openDialog();
      expect(guards()).toBe(2);
      await openLayer(layer);

      expect(guards()).toBe(2); // baseline: 4 (two stacks, two guard pairs)
      expect(dialogEl().getAttribute('data-state')).toBe('open');
      expect(layerContent(layer).getAttribute('data-state')).toBe('open');
      expect(pe(layerContent(layer))).toBe('auto');
      expect(pe(dialogEl())).toBe('none');
      expect(pe(document.body)).toBe('none');
    }
  );

  it('non-modal popover (kit default) leaves the dialog content interactive', async () => {
    render(<Harness layer="popover" />);
    await openDialog();
    await openLayer('popover');

    expect(guards()).toBe(2);
    expect(pe(layerContent('popover'))).toBe('auto');
    expect(pe(dialogEl())).toBe('auto');
    expect(pe(document.body)).toBe('none');
  });
});

describe('INV-11: focus stays in the nested layer', () => {
  it('fast typing lands every character in the search box; focus never leaves it', async () => {
    render(<Harness layer="sms" />);
    await openDialog();
    await openLayer('sms');
    expect(document.activeElement).toBe(q.search());

    const seen: Array<Element | null> = [];
    const onFocusIn = (): void => {
      seen.push(document.activeElement);
    };
    document.addEventListener('focusin', onFocusIn);
    await userEvent.keyboard('germany');
    document.removeEventListener('focusin', onFocusIn);

    expect(q.search().value).toBe('germany');
    expect(document.activeElement).toBe(q.search());
    expect(seen.filter((el) => el !== q.search())).toEqual([]); // no ping-pong to the dialog
  });

  it('Tab and Shift+Tab cycle inside the popover only, never to dialog content', async () => {
    render(<Harness layer="sms" />);
    await openDialog();
    await openLayer('sms');
    await userEvent.keyboard('{ArrowDown}{Enter}'); // a selection makes Clear all appear
    const clear = q.clear();
    expect(clear).not.toBeNull();

    const visited: Array<Element | null> = [];
    for (let i = 0; i < 4; i += 1) {
      await userEvent.keyboard('{Tab}');
      visited.push(document.activeElement);
    }
    for (let i = 0; i < 4; i += 1) {
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      visited.push(document.activeElement);
    }
    for (const el of visited) expect([q.search(), clear]).toContain(el);
  });

  it('non-modal popover: focus moved into it is not pulled back by the dialog trap', async () => {
    render(<Harness layer="popover" />);
    await openDialog();
    await openLayer('popover');
    await userEvent.click(btn('Inside popover'));
    // Give a stray focusin handler a chance to pull focus back.
    await new Promise((r) => setTimeout(r, 50));
    expect(document.activeElement).toBe(btn('Inside popover'));
  });
});

describe('INV-12: one Escape closes exactly the top layer', () => {
  it.each(['sms', 'modal-popover', 'menu', 'select'] as const)(
    '%s: Escape #1 closes the layer only and returns focus to its trigger; Escape #2 closes the dialog',
    async (layer) => {
      const onDialog = vi.fn();
      const onLayer = vi.fn();
      render(<Harness layer={layer} onDialog={onDialog} onLayer={onLayer} />);
      await openDialog();
      onDialog.mockClear();
      await openLayer(layer);
      onLayer.mockClear();
      const trigger =
        layer === 'sms'
          ? q.trigger()
          : layer === 'select'
            ? screen.getByRole('combobox', { name: 'Fruit', hidden: true })
            : btn(layerTriggerName[layer]);

      await userEvent.keyboard('{Escape}');
      await expect.poll(() => layerOpen(layer)).toBe(false);
      expect(onLayer.mock.calls).toEqual([[false]]);
      expect(onDialog).not.toHaveBeenCalled();
      expect(queryDialog()).not.toBeNull();
      await expect.poll(() => document.activeElement).toBe(trigger);

      await userEvent.keyboard('{Escape}');
      await expect.poll(() => queryDialog()).toBeNull();
      expect(onDialog.mock.calls).toEqual([[false]]);
      expect(onLayer.mock.calls).toEqual([[false]]);
      await expect.poll(() => document.activeElement).toBe(btn('Open dialog'));
    }
  );

  it('auto-repeat Escape closes one layer per keydown, never two on one event', async () => {
    const onDialog = vi.fn();
    render(<Harness layer="sms" onDialog={onDialog} />);
    await openDialog();
    onDialog.mockClear();
    await openLayer('sms');

    fireEvent.keyDown(q.search(), { key: 'Escape', code: 'Escape', repeat: true });
    await expect.poll(() => q.dialog()).toBeNull();
    expect(queryDialog()).not.toBeNull();
    expect(onDialog).not.toHaveBeenCalled();

    await expect.poll(() => document.activeElement).toBe(q.trigger());
    fireEvent.keyDown(q.trigger(), { key: 'Escape', code: 'Escape', repeat: true });
    await expect.poll(() => queryDialog()).toBeNull();
    expect(onDialog.mock.calls).toEqual([[false]]);
  });

  it('Escape on the popover keeps the selection made inside the dialog', async () => {
    render(<Harness layer="sms" />);
    await openDialog();
    await openLayer('sms');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    const picked = screen.getByTestId('readout').textContent;
    expect(picked).not.toBe('');

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => q.dialog()).toBeNull();
    expect(screen.getByTestId('readout').textContent).toBe(picked);
  });
});

describe('INV-13: an outside press closes at most the top layer (modal popover)', () => {
  it('press in the dialog body → popover only; overlay → popover only; overlay again → dialog', async () => {
    const onDialog = vi.fn();
    const onLayer = vi.fn();
    render(<Harness layer="sms" onDialog={onDialog} onLayer={onLayer} />);
    await openDialog();
    onDialog.mockClear();
    const overlay = document.querySelector<HTMLElement>('.fixed.inset-0');
    expect(overlay).not.toBeNull();

    // 1. Inside the dialog, outside the popover. The dialog content takes no pointer
    // events under a modal popover, so this lands where a real user's click lands.
    await openLayer('sms');
    onLayer.mockClear();
    await userEvent.click(screen.getByText('A layer opens on top of this dialog.'), {
      force: true,
    });
    await expect.poll(() => q.dialog()).toBeNull();
    expect(onLayer.mock.calls).toEqual([[false]]);
    expect(onDialog).not.toHaveBeenCalled();
    expect(queryDialog()).not.toBeNull();

    // 2. Clicks inside the popover never close either layer.
    await openLayer('sms');
    onLayer.mockClear();
    await userEvent.click(q.search());
    await userEvent.click(q.options()[0] as HTMLElement);
    expect(q.dialog()).not.toBeNull();
    expect(onLayer).not.toHaveBeenCalled();
    expect(onDialog).not.toHaveBeenCalled();

    // 3. Overlay (outside both) closes only the popover.
    await userEvent.click(overlay as HTMLElement, { position: { x: 8, y: 8 } });
    await expect.poll(() => q.dialog()).toBeNull();
    expect(onLayer.mock.calls).toEqual([[false]]);
    expect(onDialog).not.toHaveBeenCalled();
    expect(queryDialog()).not.toBeNull();

    // 4. Overlay again closes the dialog, exactly once.
    await userEvent.click(overlay as HTMLElement, { position: { x: 8, y: 8 } });
    await expect.poll(() => queryDialog()).toBeNull();
    expect(onDialog.mock.calls).toEqual([[false]]);
  });
});

describe('INV-15 / U-7: existing nested menu users', () => {
  it('window blur closes an open menu and leaves focus in the dialog', async () => {
    render(<Harness layer="menu" />);
    await openDialog();
    await openLayer('menu');

    window.dispatchEvent(new Event('blur'));
    await expect.poll(() => layerOpen('menu')).toBe(false);
    expect(queryDialog()).not.toBeNull();
    await expect.poll(() => dialogEl().contains(document.activeElement)).toBe(true);
  });

  it('arrow + Enter selects a menu item, the dialog stays open, focus returns to the trigger', async () => {
    const onDialog = vi.fn();
    render(<Harness layer="menu" onDialog={onDialog} />);
    await openDialog();
    onDialog.mockClear();
    await openLayer('menu');
    await userEvent.keyboard('{ArrowDown}{Enter}');

    await expect.poll(() => layerOpen('menu')).toBe(false);
    expect(onDialog).not.toHaveBeenCalled();
    await expect.poll(() => document.activeElement).toBe(btn('Network'));
  });

  it('select: pick by keyboard inside the dialog; the dialog stays open', async () => {
    const onDialog = vi.fn();
    render(<Harness layer="select" onDialog={onDialog} />);
    await openDialog();
    onDialog.mockClear();
    await openLayer('select');
    // Radix focuses the selected item after open; send each key as its own step.
    await expect.poll(() => document.activeElement?.getAttribute('role')).toBe('option');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    await expect.poll(() => layerOpen('select')).toBe(false);
    expect(screen.getByRole('combobox', { name: 'Fruit', hidden: true }).textContent).toBe(
      'Banana'
    );
    expect(onDialog).not.toHaveBeenCalled();
    expect(queryDialog()).not.toBeNull();
  });
});

describe('INV-17: no page residue after any close order', () => {
  /** Page state with the app's own `pointer-events: auto` set before anything opens. */
  function residue(): ReturnType<typeof pageSnapshot> & { guards: number; locked: boolean } {
    return {
      ...pageSnapshot(),
      guards: guards(),
      locked: document.body.hasAttribute('data-scroll-locked'),
    };
  }

  async function setUp(layer: Layer, ui?: React.ReactElement) {
    document.body.style.pointerEvents = 'auto';
    const view = render(ui ?? <Harness layer={layer} />);
    const before = residue();
    await openDialog();
    const dialogAlone = { ...residue(), dialogPe: pe(dialogEl()) };
    await openLayer(layer);
    return { view, before, dialogAlone };
  }

  const dialogState = () => ({ ...residue(), dialogPe: pe(dialogEl()) });

  it.each(['sms', 'menu', 'select'] as const)(
    'path 1 (%s): Escape on the layer, then on the dialog',
    async (layer) => {
      const { before, dialogAlone } = await setUp(layer);
      expect(dialogAlone.bodyStyle).toBe('pointer-events: none;');
      expect(dialogAlone.dialogPe).toBe('auto');

      await userEvent.keyboard('{Escape}');
      await expect.poll(() => layerOpen(layer)).toBe(false);
      await expect.poll(dialogState).toEqual(dialogAlone); // same as the dialog open alone

      await userEvent.keyboard('{Escape}');
      await expect.poll(() => queryDialog()).toBeNull();
      await expect.poll(residue).toEqual(before);
      expect(document.body.style.pointerEvents).toBe('auto'); // baseline: 'none' (defect c)
    }
  );

  it('path 2: outside click for the popover, then the dialog close button', async () => {
    const { before, dialogAlone } = await setUp('sms');
    const overlay = document.querySelector<HTMLElement>('.fixed.inset-0') as HTMLElement;
    await userEvent.click(overlay, { position: { x: 8, y: 8 } });
    await expect.poll(() => q.dialog()).toBeNull();
    await expect.poll(dialogState).toEqual(dialogAlone);

    await userEvent.click(btn('Close'));
    await expect.poll(() => queryDialog()).toBeNull();
    await expect.poll(residue).toEqual(before);
  });

  it.each(['sms', 'menu', 'select'] as const)(
    'path 3 (%s): the dialog closed programmatically while the layer is open',
    async (layer) => {
      document.body.style.pointerEvents = 'auto';
      const view = render(<Harness layer={layer} dialogOpen={false} />);
      const before = residue();
      view.rerender(<Harness layer={layer} dialogOpen />);
      await expect.poll(() => queryDialog()).not.toBeNull();
      await openLayer(layer);

      view.rerender(<Harness layer={layer} dialogOpen={false} />);
      await expect.poll(() => queryDialog()).toBeNull();
      await expect.poll(() => layerOpen(layer)).toBe(false);
      await expect.poll(residue).toEqual(before);
    }
  );

  it.each(['sms', 'menu', 'select'] as const)(
    'path 4 (%s): the subtree unmounts while both are open',
    async (layer) => {
      const { view } = await setUp(layer);
      view.unmount();
      expect(document.body.style.pointerEvents).toBe('auto');
      expect(guards()).toBe(0);
      expect(document.querySelectorAll('[data-aria-hidden]')).toHaveLength(0);
      expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
      expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
    }
  );

  it('path 5: a single pick closes the popover (single mode), then Escape closes the dialog', async () => {
    const { before, dialogAlone } = await setUp('single');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect.poll(() => q.dialog()).toBeNull();
    expect(queryDialog()).not.toBeNull();
    await expect.poll(dialogState).toEqual(dialogAlone);

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => queryDialog()).toBeNull();
    await expect.poll(residue).toEqual(before);
  });

  it('50 open/close cycles of path 1 leave no residue and no net document listeners', async () => {
    document.body.style.pointerEvents = 'auto';
    render(<Harness layer="sms" />);
    const before = residue();

    const live = new Map<string, number>();
    const key = (type: string, fn: unknown, opts?: boolean | AddEventListenerOptions): string =>
      `${type}|${typeof opts === 'boolean' ? opts : Boolean(opts?.capture)}|${String(
        (fn as { name?: string } | null)?.name
      )}`;
    const listeners = new WeakMap<object, Set<string>>();
    const add = document.addEventListener.bind(document);
    const remove = document.removeEventListener.bind(document);
    let net = 0;
    const tracked = (fn: unknown): object | null =>
      typeof fn === 'function' || (typeof fn === 'object' && fn !== null) ? (fn as object) : null;
    const spyAdd = vi.spyOn(document, 'addEventListener').mockImplementation((type, fn, opts) => {
      const obj = tracked(fn);
      const k = key(type, fn, opts);
      if (obj && !(listeners.get(obj)?.has(k) ?? false)) {
        listeners.set(obj, new Set([...(listeners.get(obj) ?? []), k]));
        net += 1;
        live.set(type, (live.get(type) ?? 0) + 1);
      }
      add(type, fn as EventListener, opts);
    });
    const spyRemove = vi
      .spyOn(document, 'removeEventListener')
      .mockImplementation((type, fn, opts) => {
        const obj = tracked(fn);
        const k = key(type, fn, opts);
        if (obj && (listeners.get(obj)?.has(k) ?? false)) {
          listeners.get(obj)?.delete(k);
          net -= 1;
          live.set(type, (live.get(type) ?? 0) - 1);
        }
        remove(type, fn as EventListener, opts);
      });

    try {
      for (let i = 0; i < 50; i += 1) {
        await openDialog();
        await openLayer('sms');
        await userEvent.keyboard('{Escape}');
        await expect.poll(() => q.dialog()).toBeNull();
        await userEvent.keyboard('{Escape}');
        await expect.poll(() => queryDialog()).toBeNull();
      }
      // Radix registers some listeners on a timer after mount; let the last ones settle.
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      spyAdd.mockRestore();
      spyRemove.mockRestore();
    }

    await expect.poll(residue).toEqual(before);
    expect(document.body.style.pointerEvents).toBe('auto');
    const leaked = [...live].filter(([, n]) => n !== 0);
    expect(leaked, `net listeners by type: ${JSON.stringify(leaked)}`).toEqual([]);
    expect(net).toBe(0);
  }, 120_000);
});

describe('INV-18: no console noise while using a nested popover', () => {
  it('open, type, pick, Escape twice: no console.error / console.warn, nothing thrown', async () => {
    // A real page has no act() environment; without this, React's test-only act()
    // warnings would drown out what INV-18 is about (kit and Radix output).
    const g = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const actEnv = g.IS_REACT_ACT_ENVIRONMENT;
    g.IS_REACT_ACT_ENVIRONMENT = false;
    const error = vi.spyOn(console, 'error');
    const warn = vi.spyOn(console, 'warn');
    try {
      render(<Harness layer="sms" />);
      await openDialog();
      await openLayer('sms');
      await userEvent.keyboard('ger{ArrowDown}{Enter}');
      await userEvent.keyboard('{Escape}');
      await expect.poll(() => q.dialog()).toBeNull();
      await userEvent.keyboard('{Escape}');
      await expect.poll(() => queryDialog()).toBeNull();
      expect(error.mock.calls).toEqual([]);
      expect(warn.mock.calls).toEqual([]);
    } finally {
      error.mockRestore();
      warn.mockRestore();
      g.IS_REACT_ACT_ENVIRONMENT = actEnv;
    }
  });
});

describe('INV-20 / U-3: the exit-animation window is consistent', () => {
  /** A real exit animation, so Radix Presence keeps closing content mounted (the example app has none). */
  function exitAnimation(): () => void {
    const style = document.createElement('style');
    style.textContent =
      '@keyframes sf32-out{from{opacity:1}to{opacity:0}}' +
      '[role="dialog"][data-state="closed"],.fixed.inset-0[data-state="closed"]{animation:sf32-out 400ms linear forwards}';
    document.head.appendChild(style);
    return () => style.remove();
  }
  const closing = (): number =>
    document.querySelectorAll('[role="dialog"][data-state="closed"]').length;
  const openDialogs = (): number =>
    document.querySelectorAll('[role="dialog"][data-state="open"]:not([data-slot])').length;
  const snapshot = () => ({ ...pageSnapshot(), guards: guards() });

  let cleanupAnimation: (() => void) | undefined;
  beforeEach(() => {
    cleanupAnimation = exitAnimation();
  });
  afterEach(() => {
    cleanupAnimation?.();
  });

  it('U-3: body pointer events are restored at the start of close, while the exit runs', async () => {
    document.body.style.pointerEvents = 'auto';
    render(<Harness layer="sms" />);
    const before = snapshot();
    await openDialog();

    await userEvent.keyboard('{Escape}');
    expect(closing()).toBe(1); // still mounted: the exit animation is running
    expect(document.body.style.pointerEvents).toBe('auto'); // baseline: 'none' until unmount

    await expect.poll(() => closing(), { timeout: 2000 }).toBe(0);
    await expect.poll(snapshot).toEqual(before);
  });

  it('reopening during the exit leaves one open dialog, one guard pair and the lock re-applied', async () => {
    document.body.style.pointerEvents = 'auto';
    render(<Harness layer="sms" />);
    const before = snapshot();
    await openDialog();

    await userEvent.keyboard('{Escape}');
    expect(closing()).toBe(1);
    btn('Open dialog').click(); // within the exit window
    await expect.poll(() => openDialogs()).toBe(1);
    expect(closing()).toBe(0);
    expect(guards()).toBe(2);
    expect(document.body.style.pointerEvents).toBe('none');

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => closing(), { timeout: 2000 }).toBe(0);
    await expect.poll(snapshot).toEqual(before);
    expect(document.body.style.pointerEvents).toBe('auto');
  });

  it('closing the nested popover while the dialog exit runs leaves no residue', async () => {
    document.body.style.pointerEvents = 'auto';
    const view = render(<Harness layer="sms" dialogOpen={false} />);
    const before = snapshot();
    view.rerender(<Harness layer="sms" dialogOpen />);
    await expect.poll(() => queryDialog()).not.toBeNull();
    await openLayer('sms');

    view.rerender(<Harness layer="sms" dialogOpen={false} />); // dialog starts its exit
    await userEvent.keyboard('{Escape}'); // popover closed during the exit
    await expect.poll(() => q.dialog()).toBeNull();
    await expect.poll(() => closing(), { timeout: 2000 }).toBe(0);
    await expect.poll(snapshot).toEqual(before);
  });
});

describe('INV-21: the accessibility tree follows the top layer', () => {
  it('popover open → only the popover is exposed; closed → dialog exposed; dialog closed → nothing hidden; axe clean in each', async () => {
    render(<Harness layer="sms" />);
    await openDialog();
    await openLayer('sms');

    // State 1: modal popover open inside the dialog.
    expect(isHidden(q.search())).toBe(false);
    expect(isHidden(dialogEl())).toBe(true);
    expect(isHidden(btn('Before'))).toBe(true);
    expect(isHidden(screen.getByText('Outside'))).toBe(true);
    expect(await axeViolations()).toEqual([]);

    // State 2: popover closed, dialog still open.
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => q.dialog()).toBeNull();
    await expect.poll(() => isHidden(dialogEl())).toBe(false);
    expect(isHidden(btn('Before'))).toBe(false);
    expect(isHidden(screen.getByText('Outside'))).toBe(true);
    expect(await axeViolations()).toEqual([]);

    // State 3: dialog closed.
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => queryDialog()).toBeNull();
    expect(isHidden(screen.getByText('Outside'))).toBe(false);
    expect(document.querySelectorAll('[data-aria-hidden]')).toHaveLength(0);
    expect(await axeViolations()).toEqual([]);
  });
});

describe('INV-22 / U-1 / U-7 / U-10: trigger IDREFs always resolve', () => {
  const controls = (el: Element): string | null => el.getAttribute('aria-controls');
  const resolves = (el: Element): boolean =>
    (controls(el) ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .every((id) => document.getElementById(id) !== null);

  it('U-1: a closed DialogTrigger has no aria-controls; open, it points at the dialog content', async () => {
    render(<Harness layer="popover" />);
    const trigger = btn('Open dialog');
    expect(controls(trigger)).toBeNull(); // baseline: a dangling id
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');

    await openDialog();
    expect(controls(trigger)).toBe(dialogEl().id);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('U-10: a closed Select trigger has no aria-controls; open, it points at the open content', async () => {
    render(<Harness layer="select" />);
    await openDialog();
    const trigger = screen.getByRole('combobox', { name: 'Fruit', hidden: true });
    expect(controls(trigger)).toBeNull(); // baseline (select 2.2.6): a dangling id
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    await openLayer('select');
    const id = controls(trigger);
    expect(id).not.toBeNull();
    const content = document.getElementById(id ?? '');
    expect(content).not.toBeNull();
    expect(content?.contains(layerContent('select')) || content === layerContent('select')).toBe(
      true
    );
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('PopoverTrigger: every aria-controls resolves, closed and open', async () => {
    render(<Harness layer="popover" />);
    await openDialog();
    const trigger = btn('Details');
    expect(resolves(trigger)).toBe(true);
    await openLayer('popover');
    expect(controls(trigger)).toBe(layerContent('popover').id);
    expect(resolves(trigger)).toBe(true);
  });

  it('U-7: a closed DropdownMenu sub-trigger has no aria-controls; open, it resolves', async () => {
    render(<Harness layer="menu" />);
    await openDialog();
    await openLayer('menu');
    const sub = screen.getByRole('menuitem', { name: 'More' });
    expect(controls(sub)).toBeNull(); // baseline: a dangling id

    await userEvent.hover(sub);
    await expect.poll(() => controls(sub)).not.toBeNull();
    expect(resolves(sub)).toBe(true);
    expect(sub.getAttribute('aria-expanded')).toBe('true');
    expect(sub.getAttribute('aria-haspopup')).toBe('menu');
  });
});

describe('INV-4 / U-11: open menu and select triggers carry the popper side/align attributes', () => {
  const SIDE = 'data-radix-popper-side';
  const ALIGN = 'data-radix-popper-align';
  const sides = ['top', 'right', 'bottom', 'left'];
  const aligns = ['start', 'center', 'end'];
  const popperAttrs = (el: Element): [string | null, string | null] => [
    el.getAttribute(SIDE),
    el.getAttribute(ALIGN),
  ];

  it('U-11: a closed DropdownMenu trigger carries neither; open, it has a valid side and align', async () => {
    render(<Harness layer="menu" />);
    await openDialog();
    const trigger = btn('Network');
    expect(popperAttrs(trigger)).toEqual([null, null]); // baseline: neither, open or closed

    await openLayer('menu');
    const [side, align] = popperAttrs(trigger);
    expect(sides).toContain(side);
    expect(aligns).toContain(align);
    // Boundary: not a11y surface (no ARIA name, no role change) and gone again once closed.
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.hasAttribute('role')).toBe(false);

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => layerOpen('menu')).toBe(false);
    expect(popperAttrs(btn('Network'))).toEqual([null, null]);
  });

  it('U-11: a closed Select trigger carries neither; open, it has a valid side and align', async () => {
    render(<Harness layer="select" />);
    await openDialog();
    const trigger = screen.getByRole('combobox', { name: 'Fruit', hidden: true });
    expect(popperAttrs(trigger)).toEqual([null, null]); // baseline: neither, open or closed

    await openLayer('select');
    const [side, align] = popperAttrs(trigger);
    expect(sides).toContain(side);
    expect(aligns).toContain(align);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => layerOpen('select')).toBe(false);
    expect(popperAttrs(trigger)).toEqual([null, null]);
  });

  it('U-11 scope: a Popover trigger is unchanged (already carried them on the baseline) and a DialogTrigger never does', async () => {
    render(<Harness layer="popover" />);
    const dialogTrigger = btn('Open dialog');
    expect(popperAttrs(dialogTrigger)).toEqual([null, null]);
    await openDialog();
    expect(popperAttrs(btn('Open dialog'))).toEqual([null, null]);
    const trigger = btn('Details');
    expect(popperAttrs(trigger)).toEqual([null, null]);
    await openLayer('popover');
    const [side, align] = popperAttrs(trigger);
    expect(sides).toContain(side);
    expect(aligns).toContain(align);
  });
});
