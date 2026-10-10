import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

import { CREATE_PROFILE_SELECTION_FILENAME } from '../../agent-assets';
import { registerCreateCommand } from '../create';
import { CLI_PACKAGE_NAME, JSON_SCHEMA_VERSION } from '../migrate/json-results';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ui-create-init-'));
  temporaryDirectories.push(dir);
  return dir;
}

async function captureStdout(fn: () => Promise<void> | void): Promise<string> {
  const chunks: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
    return true;
  }) as typeof process.stdout.write;

  try {
    await fn();
  } finally {
    process.stdout.write = originalWrite;
  }

  return chunks.join('');
}

async function runCreate(args: string[]): Promise<string> {
  const root = new Command();
  registerCreateCommand(root);
  return captureStdout(async () => {
    await root.parseAsync(['create', ...args], { from: 'user' });
  });
}

afterEach(() => {
  process.exitCode = 0;
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('create init command', () => {
  it('emits a JSON envelope and copies the scaffold-dapp skill into each selected profile', async () => {
    const dir = createTempDir();

    const stdout = await runCreate([
      'init',
      '--target',
      dir,
      '--agent-profile',
      'claude,standard',
      '--json',
    ]);
    const payload = JSON.parse(stdout);

    expect(payload.action).toBe('create-init');
    expect(payload.ok).toBe(true);
    expect(payload.schemaVersion).toBe(JSON_SCHEMA_VERSION);
    expect(payload.cli).toEqual({ name: CLI_PACKAGE_NAME, version: expect.any(String) });
    expect(payload.target).toBe(path.resolve(dir));
    expect(payload.agentAssetProfiles).toEqual(['claude', 'standard']);
    expect(payload.agentProfileSelectionWritten).toBe(CREATE_PROFILE_SELECTION_FILENAME);

    expect(payload.skillCopied).toEqual(
      expect.arrayContaining([
        '.claude/skills/scaffold-dapp/SKILL.md',
        '.agents/skills/scaffold-dapp/SKILL.md',
      ])
    );

    expect(fs.existsSync(path.join(dir, '.claude/skills/scaffold-dapp/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, '.agents/skills/scaffold-dapp/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, CREATE_PROFILE_SELECTION_FILENAME))).toBe(true);
  });

  it('reports skipped files when SKILL.md already exists', async () => {
    const dir = createTempDir();

    await runCreate(['init', '--target', dir, '--agent-profile', 'claude', '--json']);
    const stdout = await runCreate([
      'init',
      '--target',
      dir,
      '--agent-profile',
      'claude',
      '--json',
    ]);
    const payload = JSON.parse(stdout);

    expect(payload.skillCopied).toEqual([]);
    expect(payload.skillSkipped).toEqual(
      expect.arrayContaining(['.claude/skills/scaffold-dapp/SKILL.md'])
    );
  });

  it('reuses the stored agent profile when --agent-profile is omitted on a follow-up run', async () => {
    const dir = createTempDir();

    await runCreate(['init', '--target', dir, '--agent-profile', 'legacy-cursor', '--json']);
    const stdout = await runCreate(['init', '--target', dir, '--json']);
    const payload = JSON.parse(stdout);

    expect(payload.ok).toBe(true);
    expect(payload.agentAssetProfiles).toEqual(['legacy-cursor']);
  });

  it('writes nothing when --agent-profile=none', async () => {
    const dir = createTempDir();

    const stdout = await runCreate(['init', '--target', dir, '--agent-profile', 'none', '--json']);
    const payload = JSON.parse(stdout);

    expect(payload.ok).toBe(true);
    expect(payload.agentAssetProfiles).toEqual([]);
    expect(payload.skillCopied).toEqual([]);
    expect(fs.existsSync(path.join(dir, CREATE_PROFILE_SELECTION_FILENAME))).toBe(true);
  });
});
