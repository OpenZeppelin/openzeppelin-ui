/**
 * @vitest-environment node
 *
 * SF-2 · Package export — INV-3.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import * as DialogExports from '../../dialog';
import {
  BottomSheet,
  defaultBottomSheetHeight,
  type BottomSheetHeightPx,
  type BottomSheetProps,
} from '../../index';

describe('INV-3: the main export is additive', () => {
  it('exports BottomSheet API symbols from the UI barrel', () => {
    expect(BottomSheet).toBeTruthy();
    expect(BottomSheet.displayName).toBe('BottomSheet');
    expect(defaultBottomSheetHeight).toBeTypeOf('function');
    expectTypeOf<BottomSheetProps>().toMatchTypeOf<{ open: boolean }>();
    expectTypeOf<BottomSheetHeightPx>().toEqualTypeOf<number>();
  });

  it('does not remove or replace Dialog exports', () => {
    expect(DialogExports.Dialog).toBeDefined();
    expect(DialogExports.DialogContent).toBeDefined();
    expect(DialogExports.DialogOverlay).toBeDefined();
  });
});
