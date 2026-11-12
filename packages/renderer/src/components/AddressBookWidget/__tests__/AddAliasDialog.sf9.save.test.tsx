/**
 * @vitest-environment jsdom
 *
 * SF-9 · `AddAliasDialog` — resolving a name and saving logs no render-phase warning, alias saved as before (AS-1).
 * One warning-asserting test per file: React logs each render-phase warning once per
 * process. See sf9.harness.tsx. Stage artifact: sf-9-add-alias-render-phase-update/05-tests.md
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addButton,
  addressInput,
  ALICE,
  fireEvent,
  flush,
  renderDialog,
  resolveName,
  settle,
  spyOnConsoleError,
} from './sf9.harness';

let warnings: ReturnType<typeof spyOnConsoleError>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  warnings = spyOnConsoleError();
  resolveName.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SF-9 AS-1: resolve and save', () => {
  it('happy: alias is saved with the resolved address and nothing is warned', async () => {
    const { onSave } = await renderDialog({ currentNetworkId: 'eip155:8453' });
    await flush();

    fireEvent.change(addressInput()!, { target: { value: 'alice.eth' } });
    await flush();
    await settle();
    expect(addButton().disabled).toBe(false);
    fireEvent.click(addButton());
    await flush();

    expect(onSave).toHaveBeenCalledWith({
      address: ALICE.address,
      alias: 'alice.eth',
      networkId: 'eip155:8453',
    });
    expect(warnings.renderPhaseWarnings()).toEqual([]);
  });
});
