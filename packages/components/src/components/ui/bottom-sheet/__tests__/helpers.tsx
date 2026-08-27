/* eslint-disable react-refresh/only-export-components -- test-only harness; Fast Refresh does not apply */
import { cleanup, render, type RenderOptions } from '@testing-library/react';
import { useState, type ReactElement, type ReactNode } from 'react';

import { BottomSheet } from '../../bottom-sheet';
import { defaultBottomSheetHeight } from '../../bottom-sheet-height';

export const DEFAULT_VIEWPORT_HEIGHT = 800;

/**
 *
 */
export function mockViewportHeight(height: number): () => void {
  const original = window.innerHeight;
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
    writable: true,
  });
  return () => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: original,
      writable: true,
    });
  };
}

type AccessibleName =
  | { 'aria-label': string; 'aria-labelledby'?: undefined }
  | { 'aria-labelledby': string; 'aria-label'?: undefined };

type BottomSheetHostControlledOverrides = {
  initialOpen?: boolean;
  initialHeight?: number;
  viewportHeight?: number;
  open?: boolean;
  height?: number;
  onOpenChange?: (open: boolean) => void;
  onHeightChange?: (height: number) => void;
};

export type BottomSheetHostProps = AccessibleName &
  BottomSheetHostControlledOverrides & {
    children?: ReactNode;
    className?: string;
    id?: string;
    closeLabel?: string;
  };

/**
 *
 */
export function BottomSheetHost(props: BottomSheetHostProps): ReactElement {
  const {
    initialOpen = true,
    initialHeight,
    viewportHeight = DEFAULT_VIEWPORT_HEIGHT,
    open: controlledOpen,
    height: controlledHeight,
    onOpenChange: onOpenChangeProp,
    onHeightChange: onHeightChangeProp,
    children = null,
    className,
    id,
    closeLabel,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
  } = props;

  const [open, setOpen] = useState(initialOpen);
  const [height, setHeight] = useState(initialHeight ?? defaultBottomSheetHeight(viewportHeight));

  const resolvedOpen = controlledOpen ?? open;
  const resolvedHeight = controlledHeight ?? height;
  const sheetCommon = {
    open: resolvedOpen,
    onOpenChange: onOpenChangeProp ?? setOpen,
    height: resolvedHeight,
    onHeightChange: onHeightChangeProp ?? setHeight,
    children,
    className,
    id,
    closeLabel,
  };

  if (ariaLabel !== undefined) {
    return <BottomSheet {...sheetCommon} aria-label={ariaLabel} />;
  }

  return <BottomSheet {...sheetCommon} aria-labelledby={ariaLabelledBy} />;
}

const DEFAULT_HOST_PROPS = {
  'aria-label': 'Preview',
} as const satisfies BottomSheetHostProps;

/**
 *
 */
export function renderBottomSheet(
  props: BottomSheetHostProps = DEFAULT_HOST_PROPS,
  options?: Omit<RenderOptions, 'queries'>
): ReturnType<typeof render> {
  const restoreViewport = mockViewportHeight(props.viewportHeight ?? DEFAULT_VIEWPORT_HEIGHT);
  const result = render(<BottomSheetHost {...props} />, options);
  const originalUnmount = result.unmount.bind(result);
  result.unmount = () => {
    originalUnmount();
    restoreViewport();
  };
  return result;
}

/**
 *
 */
export function cleanupBottomSheetTests(): void {
  cleanup();
  document.body.innerHTML = '';
}

/**
 *
 */
export function getSheetLayer(): HTMLElement | null {
  return document.querySelector('[data-slot="bottom-sheet-layer"]');
}

/**
 *
 */
export function getSheetRegion(): HTMLElement | null {
  return document.querySelector('[data-slot="bottom-sheet"]');
}

/**
 *
 */
export function getSheetSeparator(): HTMLElement | null {
  return document.querySelector('[data-slot="bottom-sheet-separator"]');
}

/**
 *
 */
export function getSheetCloseButton(): HTMLButtonElement | null {
  return document.querySelector('[data-slot="bottom-sheet-close"]');
}

/**
 *
 */
export function dispatchViewportResize(height: number): void {
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
    writable: true,
  });
  window.dispatchEvent(new Event('resize'));
}
