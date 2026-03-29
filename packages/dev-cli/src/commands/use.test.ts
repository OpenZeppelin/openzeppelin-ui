import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseFamilyValues } from '../lib/parseFamilyValues';

const loadProjectConfigMock = vi.fn();
const resolveSelectedFamiliesMock = vi.fn();
const useLocalMock = vi.fn();
const useRemoteMock = vi.fn();
const printJsonMock = vi.fn();
const printErrorMock = vi.fn();
const printUseLocalResultMock = vi.fn();
const printUseRemoteResultMock = vi.fn();

vi.mock('../lib/config', () => ({
  loadProjectConfig: loadProjectConfigMock,
}));

vi.mock('../interactive/familySelection', () => ({
  resolveSelectedFamilies: resolveSelectedFamiliesMock,
}));

vi.mock('../lib/localDev', () => ({
  useLocal: useLocalMock,
  useRemote: useRemoteMock,
}));

vi.mock('../utils/logger', () => ({
  printJson: printJsonMock,
  printError: printErrorMock,
  printUseLocalResult: printUseLocalResultMock,
  printUseRemoteResult: printUseRemoteResultMock,
}));

describe('parseFamilyValues', () => {
  it('deduplicates repeated family flags while preserving order', () => {
    expect(parseFamilyValues(['ui', 'adapters', 'ui', 'adapters'])).toEqual(['ui', 'adapters']);
  });

  it('rejects unsupported family values', () => {
    expect(() => parseFamilyValues(['unknown'])).toThrow(/unsupported family/i);
  });

  it('rejects inherited object keys that are not real family names', () => {
    expect(() => parseFamilyValues(['toString'])).toThrow(/unsupported family/i);
    expect(() => parseFamilyValues(['__proto__'])).toThrow(/unsupported family/i);
  });
});

describe('registerUseCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    loadProjectConfigMock.mockReturnValue({
      families: {
        adapters: {},
      },
    });
    resolveSelectedFamiliesMock.mockResolvedValue(['adapters']);
    useLocalMock.mockReturnValue({
      projectRoot: '/tmp/app',
      families: ['adapters'],
      manifests: [],
    });
  });

  it('passes quiet mode to useLocal when json output is requested', async () => {
    const { registerUseCommand } = await import('./use');
    const program = new Command();

    registerUseCommand(program);
    await program.parseAsync(
      ['node', 'oz-dev', 'use', 'local', '--project', '/tmp/app', '--family', 'adapters', '--json'],
      { from: 'node' }
    );

    expect(useLocalMock).toHaveBeenCalledWith('/tmp/app', ['adapters'], {
      quiet: true,
    });
    expect(printJsonMock).toHaveBeenCalledWith({
      ok: true,
      action: 'use-local',
      projectRoot: '/tmp/app',
      families: ['adapters'],
      manifests: [],
    });
    expect(printUseLocalResultMock).not.toHaveBeenCalled();
    expect(printErrorMock).not.toHaveBeenCalled();
  });
});
