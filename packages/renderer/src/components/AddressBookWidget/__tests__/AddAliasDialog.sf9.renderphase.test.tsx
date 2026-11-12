/**
 * @vitest-environment jsdom
 *
 * SF-9 · `AddAliasDialog` — the runtime-request gate must not change the dialog's
 * other behaviour (AS-2 and the edges around AS-1). The render-phase warning itself is
 * asserted in the sibling `.preselected` / `.save` / `.switch` files.
 * Stage artifact: sf-9-add-alias-render-phase-update/05-tests.md
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addButton,
  addressInput,
  aliasInput,
  ALICE,
  fireEvent,
  flush,
  renderDialog,
  resolveName,
  settle,
} from './sf9.harness';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  resolveName.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SF-9 AS-2: resolution feedback and edge paths are unchanged', () => {
  it('failure: an unresolvable name keeps Add disabled and saves nothing', async () => {
    const { onSave } = await renderDialog({ currentNetworkId: 'eip155:8453' });
    await flush();

    fireEvent.change(addressInput()!, { target: { value: 'nobody.eth' } });
    await flush();
    await settle();

    expect(addButton().disabled).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('boundary: no networks — the field mounts immediately and no runtime is requested', async () => {
    const { resolveRuntime } = await renderDialog({ networks: [] });
    await flush();

    expect(addressInput()).not.toBeNull();
    expect(resolveRuntime).not.toHaveBeenCalled();
  });

  it('failure: without a RuntimeProvider the field still mounts (the gate cannot deadlock)', async () => {
    await renderDialog({ withRuntimeProvider: false, currentNetworkId: 'eip155:8453' });
    await flush();

    expect(addressInput()).not.toBeNull();
  });

  it('boundary: flag off — plain field, no runtime request, manual alias saves unchanged', async () => {
    const { resolveRuntime, onSave } = await renderDialog({
      enableNameResolution: false,
      currentNetworkId: 'eip155:8453',
    });
    await flush();

    fireEvent.change(addressInput()!, { target: { value: ALICE.address } });
    fireEvent.change(aliasInput(), { target: { value: 'mine' } });
    await flush();
    fireEvent.click(addButton());
    await flush();

    expect(resolveRuntime).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith({
      address: ALICE.address,
      alias: 'mine',
      networkId: 'eip155:8453',
    });
  });
});
