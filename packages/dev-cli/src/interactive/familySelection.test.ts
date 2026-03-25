import { beforeEach, describe, expect, it, vi } from 'vitest';

const multiselectMock = vi.fn();
const isCancelMock = vi.fn();
const cancelMock = vi.fn();
const isInteractiveTerminalMock = vi.fn();

vi.mock('@clack/prompts', () => ({
  multiselect: multiselectMock,
  isCancel: isCancelMock,
  cancel: cancelMock,
}));

vi.mock('../utils/logger', () => ({
  isInteractiveTerminal: isInteractiveTerminalMock,
}));

describe('resolveSelectedFamilies', () => {
  beforeEach(() => {
    vi.resetModules();
    multiselectMock.mockReset();
    isCancelMock.mockReset();
    cancelMock.mockReset();
    isInteractiveTerminalMock.mockReset();
  });

  it('falls back to supported families when interactive selection is empty', async () => {
    isInteractiveTerminalMock.mockReturnValue(true);
    multiselectMock.mockResolvedValue([]);
    isCancelMock.mockReturnValue(false);

    const { resolveSelectedFamilies } = await import('./familySelection');

    await expect(resolveSelectedFamilies([], ['ui', 'adapters'], false)).resolves.toEqual([
      'ui',
      'adapters',
    ]);
  });
});
