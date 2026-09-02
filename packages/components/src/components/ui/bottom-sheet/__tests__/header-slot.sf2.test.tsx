/**
 * @vitest-environment jsdom
 *
 * SF-2 · `header` slot — content beside the close button, outside the scroll body.
 * The absent-header case must render exactly the pre-slot chrome.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BottomSheet } from '../../bottom-sheet';
import {
  cleanupBottomSheetTests,
  DEFAULT_VIEWPORT_HEIGHT,
  getSheetCloseButton,
  getSheetRegion,
  getSheetSeparator,
  mockViewportHeight,
} from './helpers';

const CLOSE_ROW_CLASSES_WITHOUT_HEADER = 'flex shrink-0 justify-end px-2';

function renderSheet(props: { header?: React.ReactNode }): () => void {
  const restore = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
  render(
    <BottomSheet
      aria-label="Preview"
      open
      height={480}
      onOpenChange={() => {}}
      onHeightChange={() => {}}
      header={props.header}
    >
      <p>Body content</p>
    </BottomSheet>
  );
  return restore;
}

function getHeaderSlot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-slot="bottom-sheet-header"]');
}

afterEach(() => {
  cleanupBottomSheetTests();
});

describe('header slot: absent', () => {
  it('renders the close row exactly as before when header is omitted', () => {
    const restore = renderSheet({});
    expect(getHeaderSlot()).toBeNull();
    const closeRow = getSheetCloseButton()?.parentElement;
    expect(closeRow?.className).toBe(CLOSE_ROW_CLASSES_WITHOUT_HEADER);
    expect(closeRow?.children).toHaveLength(1);
    restore();
  });

  it.each([null, false, undefined])('treats %s as no header', (value) => {
    const restore = renderSheet({ header: value });
    expect(getHeaderSlot()).toBeNull();
    expect(getSheetCloseButton()?.parentElement?.className).toBe(CLOSE_ROW_CLASSES_WITHOUT_HEADER);
    restore();
  });
});

describe('header slot: present', () => {
  it('renders header content in the close-button row, before the scrolling body', () => {
    const restore = renderSheet({ header: <span>contracts/lib.rs</span> });
    const slot = getHeaderSlot();
    expect(slot).not.toBeNull();
    expect(screen.getByText('contracts/lib.rs')).not.toBeNull();

    const region = getSheetRegion();
    const regionChildren = Array.from(region?.children ?? []);
    const chrome = region?.querySelector('[data-slot="bottom-sheet-chrome"]');
    const chromeRows = Array.from(chrome?.children ?? []);
    const headerRow = slot?.parentElement;
    const bodyRow = screen.getByText('Body content').parentElement;
    expect(regionChildren.indexOf(getSheetSeparator() as Element)).toBe(0);
    expect(regionChildren.indexOf(chrome as Element)).toBe(1);
    expect(chromeRows.indexOf(headerRow as Element)).toBe(0);
    expect(chromeRows.indexOf(bodyRow as Element)).toBe(1);
    // The header lives outside the scroll container.
    expect(bodyRow?.contains(slot)).toBe(false);
    restore();
  });

  it('keeps the close control named, present, and in the same row as the header', () => {
    const restore = renderSheet({ header: <span>Header</span> });
    const close = getSheetCloseButton();
    expect(close).not.toBeNull();
    expect(close?.getAttribute('aria-label')).toBe('Close');
    expect(close?.parentElement).toBe(getHeaderSlot()?.parentElement);
    expect(close?.className).toContain('size-11');
    restore();
  });

  it('keeps the close control clickable with a header present', () => {
    const onOpenChange = vi.fn();
    const restore = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
    render(
      <BottomSheet
        aria-label="Preview"
        open
        height={480}
        onOpenChange={onOpenChange}
        onHeightChange={() => {}}
        header={<span>Header</span>}
      >
        <p>Body content</p>
      </BottomSheet>
    );
    fireEvent.click(getSheetCloseButton() as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    restore();
  });

  it('lets interactive header content receive events', () => {
    const onClick = vi.fn();
    const restore = renderSheet({
      header: (
        <button type="button" onClick={onClick}>
          Copy path
        </button>
      ),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy path' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    restore();
  });

  it('does not constrain the header row height or clip it', () => {
    const restore = renderSheet({ header: <span>Header</span> });
    const slot = getHeaderSlot();
    const row = slot?.parentElement;
    for (const className of [row?.className ?? '', slot?.className ?? '']) {
      expect(className).not.toMatch(/(^|\s)h-\d/);
      expect(className).not.toMatch(/max-h-/);
      expect(className).not.toContain('overflow-hidden');
    }
    expect(slot?.className).toContain('min-h-11');
    restore();
  });

  it('keeps the separator, region name, and body untouched', () => {
    const restore = renderSheet({ header: <span>Header</span> });
    expect(screen.getByRole('region', { name: 'Preview' })).not.toBeNull();
    expect(getSheetSeparator()?.className).toContain('min-h-11');
    expect(screen.getByText('Body content')).not.toBeNull();
    restore();
  });
});
