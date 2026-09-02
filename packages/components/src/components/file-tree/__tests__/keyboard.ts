/**
 * Pierre listens for keydown on document (capture). jsdom needs the focused row
 * established first and user-event to synthesize activation keys on buttons.
 */
import userEvent from '@testing-library/user-event';

/**
 *
 */
export async function focusRow(row: HTMLElement): Promise<void> {
  await userEvent.click(row);
}

/**
 *
 */
export async function pressTreeKey(key: string): Promise<void> {
  await userEvent.keyboard(key);
}

/**
 *
 */
export async function activateRowWithKeyboard(
  row: HTMLElement,
  key: '{Enter}' | ' '
): Promise<void> {
  row.focus();
  await userEvent.keyboard(key);
}
