/**
 * SF-2 · Browser verification — AS-1/2/3, Abandon-on-close, INV-16 stacking.
 * Opt-in via `pnpm test:browser`. Not part of default jsdom `pnpm test`.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { useState } from 'react';

import { BottomSheet } from '../../bottom-sheet';
import { defaultBottomSheetHeight } from '../../bottom-sheet-height';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../dialog';

const VIEWPORT_HEIGHT = 800;

async function dragSeparatorUp(
  separator: ReturnType<ReturnType<typeof page.elementLocator>['getByRole']>,
  deltaY: number
): Promise<void> {
  const element = await separator.element();
  const rect = element.getBoundingClientRect();
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  element.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      button: 0,
      isPrimary: true,
      pointerType: 'mouse',
    })
  );
  element.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      clientX: x,
      clientY: y - deltaY,
      pointerId: 1,
      isPrimary: true,
      pointerType: 'mouse',
    })
  );
  element.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      pointerId: 1,
      isPrimary: true,
      pointerType: 'mouse',
    })
  );
}

function FocusRetentionPage(): JSX.Element {
  const [height, setHeight] = useState(defaultBottomSheetHeight(VIEWPORT_HEIGHT));

  return (
    <>
      <input aria-label="Token name" />
      <BottomSheet
        id="code-preview"
        aria-label="Generated project preview"
        open
        onOpenChange={() => {}}
        height={height}
        onHeightChange={setHeight}
      >
        <button type="button">Inside sheet</button>
      </BottomSheet>
    </>
  );
}

function HitTestPage({ onPageClick }: { onPageClick: () => void }): JSX.Element {
  const [height, setHeight] = useState(defaultBottomSheetHeight(VIEWPORT_HEIGHT));

  return (
    <div className="relative min-h-screen p-8">
      <button type="button" data-testid="page-target" onClick={onPageClick}>
        Page behind
      </button>
      <BottomSheet
        aria-label="Generated project preview"
        open
        onOpenChange={() => {}}
        height={height}
        onHeightChange={setHeight}
      >
        <p>Sheet content</p>
      </BottomSheet>
    </div>
  );
}

function TabCyclePage(): JSX.Element {
  const [height, setHeight] = useState(defaultBottomSheetHeight(VIEWPORT_HEIGHT));

  return (
    <>
      <input aria-label="Token name" />
      <BottomSheet
        aria-label="Generated project preview"
        open
        onOpenChange={() => {}}
        height={height}
        onHeightChange={setHeight}
      >
        <button type="button">Inside sheet</button>
      </BottomSheet>
    </>
  );
}

function DraggableHost({
  open,
  onOpenChange,
  height,
  onHeightChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  height: number;
  onHeightChange: (height: number) => void;
}): JSX.Element {
  return (
    <BottomSheet
      aria-label="Preview"
      open={open}
      onOpenChange={onOpenChange}
      height={height}
      onHeightChange={onHeightChange}
    >
      <p>Content</p>
    </BottomSheet>
  );
}

describe('AS-1 (browser): focus retained and sheet visible', () => {
  it('keeps the page field focused while the sheet is already open', async () => {
    const { baseElement } = render(<FocusRetentionPage />);
    const screen = page.elementLocator(baseElement);
    const field = screen.getByLabelText('Token name');
    await field.click();
    await expect
      .element(screen.getByRole('region', { name: 'Generated project preview' }))
      .toBeVisible();
    await expect.element(field).toHaveFocus();
  });
});

describe('AS-2 (browser): pointer capture and drag resize', () => {
  it('follows pointer movement through a captured drag session', async () => {
    const onHeightChange = vi.fn();
    const { baseElement } = render(
      <DraggableHost open onOpenChange={() => {}} height={400} onHeightChange={onHeightChange} />
    );
    const screen = page.elementLocator(baseElement);
    const separator = screen.getByRole('separator', { name: 'Resize' });
    await dragSeparatorUp(separator, 50);

    expect(onHeightChange.mock.calls.length).toBeGreaterThan(0);
    const lastHeight = onHeightChange.mock.calls.at(-1)?.[0];
    expect(lastHeight).toBeGreaterThan(400);
    expect(lastHeight).toBeLessThanOrEqual(VIEWPORT_HEIGHT);
  });
});

describe('AS-3 (browser): page behind stays reachable', () => {
  it('delivers clicks through the portal layer to the page behind', async () => {
    let clicked = false;
    const { baseElement } = render(
      <HitTestPage
        onPageClick={() => {
          clicked = true;
        }}
      />
    );
    const screen = page.elementLocator(baseElement);
    await screen.getByTestId('page-target').click();
    expect(clicked).toBe(true);
  });

  it('tabs from the page field into the sheet and back out with Shift+Tab', async () => {
    const { baseElement } = render(<TabCyclePage />);
    const screen = page.elementLocator(baseElement);
    const field = screen.getByLabelText('Token name');
    await field.click();
    await userEvent.keyboard('{Tab}');
    await expect.element(screen.getByRole('separator', { name: 'Resize' })).toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.element(field).toHaveFocus();
  });
});

describe('Abandon-on-close (browser): mid-drag close releases capture', () => {
  it('does not emit further height changes after open becomes false during drag', async () => {
    const onHeightChange = vi.fn();
    function Host(): JSX.Element {
      const [open, setOpen] = useState(true);
      const [height, setHeight] = useState(400);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)}>
            Force close
          </button>
          <DraggableHost
            open={open}
            onOpenChange={setOpen}
            height={height}
            onHeightChange={(next) => {
              onHeightChange(next);
              setHeight(next);
            }}
          />
        </>
      );
    }

    const { baseElement } = render(<Host />);
    const screen = page.elementLocator(baseElement);
    const separator = screen.getByRole('separator', { name: 'Resize' });
    const separatorEl = await separator.element();
    const rect = separatorEl.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    separatorEl.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: x,
        clientY: y,
        pointerId: 1,
        button: 0,
        isPrimary: true,
        pointerType: 'mouse',
      })
    );
    separatorEl.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: x,
        clientY: y - 30,
        pointerId: 1,
        isPrimary: true,
        pointerType: 'mouse',
      })
    );
    onHeightChange.mockClear();

    await screen.getByRole('button', { name: 'Force close' }).click();
    separatorEl.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: x,
        clientY: y - 80,
        pointerId: 1,
        isPrimary: true,
        pointerType: 'mouse',
      })
    );
    separatorEl.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        isPrimary: true,
        pointerType: 'mouse',
      })
    );

    expect(onHeightChange).not.toHaveBeenCalled();
  });
});

describe('INV-16 (browser): dialog stacks above the sheet', () => {
  it('keeps dialog content above the open bottom sheet', async () => {
    const { baseElement } = render(
      <>
        <BottomSheet
          aria-label="Preview"
          open
          height={defaultBottomSheetHeight(VIEWPORT_HEIGHT)}
          onOpenChange={() => {}}
          onHeightChange={() => {}}
        >
          <p>Sheet body</p>
        </BottomSheet>
        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm deploy</DialogTitle>
              <DialogDescription>Are you sure?</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </>
    );
    const screen = page.elementLocator(baseElement);
    await expect.element(screen.getByRole('dialog', { name: 'Confirm deploy' })).toBeVisible();
    const dialogEl = await screen.getByRole('dialog', { name: 'Confirm deploy' }).element();
    const sheetEl = document.querySelector('[data-slot="bottom-sheet"]');
    expect(sheetEl).not.toBeNull();
    expect(dialogEl.className).toContain('z-50');
    expect((sheetEl as Element).className).toContain('z-40');

    const titleEl = await screen.getByRole('heading', { name: 'Confirm deploy' }).element();
    const rect = titleEl.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    expect(hit).not.toBeNull();
    expect(dialogEl.contains(hit)).toBe(true);
  });
});
