/**
 * @vitest-environment jsdom
 *
 * SF-9 · `AddAliasDialog` — a preselected network logs no render-phase warning (AS-1).
 * One warning-asserting test per file: React logs each render-phase warning once per
 * process. See sf9.harness.tsx. Stage artifact: sf-9-add-alias-render-phase-update/05-tests.md
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addressInput, flush, renderDialog, resolveName, spyOnConsoleError } from './sf9.harness';

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

describe('SF-9 AS-1: preselected network', () => {
  it('happy: mounts the field, requests only the selected network’s runtime, warns nothing', async () => {
    const { resolveRuntime } = await renderDialog({ currentNetworkId: 'eip155:8453' });
    await flush();

    expect(addressInput()).not.toBeNull();
    expect(resolveRuntime).toHaveBeenCalled();
    expect(new Set(resolveRuntime.mock.calls.map((c) => c[0].id))).toEqual(
      new Set(['eip155:8453'])
    );
    expect(warnings.renderPhaseWarnings()).toEqual([]);
  });
});
