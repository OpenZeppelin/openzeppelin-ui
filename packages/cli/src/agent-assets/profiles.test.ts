import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AGENT_PROFILE_SELECTION_FILENAME,
  parseAgentProfileArg,
  readAgentProfileSelection,
  resolveAgentProfilesForInit,
  writeAgentProfileSelection,
} from './profiles';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-cli-agent-assets-'));
  temporaryDirectories.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('parseAgentProfileArg', () => {
  it('requires the caller to choose profiles explicitly', () => {
    expect(() => parseAgentProfileArg(undefined)).toThrow(/Missing required --agent-profile/);
    expect(() => parseAgentProfileArg('')).toThrow(/Missing required --agent-profile/);
  });

  it('expands all and none', () => {
    expect(parseAgentProfileArg('all')).toEqual(['standard', 'claude', 'legacy-cursor']);
    expect(parseAgentProfileArg('none')).toEqual([]);
  });

  it('parses comma-separated lists and de-dupes', () => {
    expect(parseAgentProfileArg('claude, standard')).toEqual(['claude', 'standard']);
    expect(parseAgentProfileArg('legacy-cursor,legacy-cursor')).toEqual(['legacy-cursor']);
  });

  it('rejects invalid tokens', () => {
    expect(() => parseAgentProfileArg('nope')).toThrow(/Invalid agent profile/);
  });

  it('rejects mixing none with other values', () => {
    expect(() => parseAgentProfileArg('none,standard')).toThrow(/none/);
  });

  it('rejects mixing all with other values', () => {
    expect(() => parseAgentProfileArg('all,standard')).toThrow(/all/);
  });
});

describe('agent profile selection persistence', () => {
  it('round-trips the init-selected profiles', () => {
    const dir = createTempDir();
    const written = writeAgentProfileSelection(dir, ['standard', 'claude']);

    expect(written).toBe(AGENT_PROFILE_SELECTION_FILENAME);
    expect(readAgentProfileSelection(dir)).toEqual(['standard', 'claude']);
  });

  it('fails when plan runs before init stores a profile selection', () => {
    const dir = createTempDir();

    expect(() => readAgentProfileSelection(dir)).toThrow(/Agent profile selection not found/);
  });
});

describe('resolveAgentProfilesForInit', () => {
  it('reuses a stored selection when --agent-profile is omitted', () => {
    const dir = createTempDir();
    writeAgentProfileSelection(dir, ['claude', 'standard']);
    expect(resolveAgentProfilesForInit(dir, undefined)).toEqual(['claude', 'standard']);
  });

  it('uses explicit --agent-profile when set', () => {
    const dir = createTempDir();
    expect(resolveAgentProfilesForInit(dir, 'none')).toEqual([]);
  });

  it('throws if profile is omitted and there is no stored file', () => {
    const dir = createTempDir();
    expect(() => resolveAgentProfilesForInit(dir, undefined)).toThrow(
      /Missing required --agent-profile/
    );
  });
});
