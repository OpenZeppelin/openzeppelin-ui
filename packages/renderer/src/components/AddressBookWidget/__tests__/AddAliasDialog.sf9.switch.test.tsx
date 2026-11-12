/**
 * @vitest-environment jsdom
 *
 * SF-9 · `AddAliasDialog` — choosing a different network logs no render-phase warning (AS-1).
 * One warning-asserting test per file: React logs each render-phase warning once per
 * process. See sf9.harness.tsx. Stage artifact: sf-9-add-alias-render-phase-update/05-tests.md
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addressInput,
  fireEvent,
  flush,
  renderDialog,
  resolveName,
  screen,
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

describe('SF-9 AS-1: switching network', () => {
  it('boundary: the second network’s runtime is requested, the field stays mounted, nothing is warned', async () => {
    const { resolveRuntime } = await renderDialog({ currentNetworkId: 'eip155:1' });
    await flush();

    fireEvent.click(screen.getByRole('combobox', { name: 'Network' }));
    await flush();
    fireEvent.click(screen.getByRole('option', { name: /Base/ }));
    await flush();

    expect(resolveRuntime.mock.calls.map((c) => c[0].id)).toContain('eip155:8453');
    expect(addressInput()).not.toBeNull();
    expect(warnings.renderPhaseWarnings()).toEqual([]);
  });
});
