import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveCreateOptions } from '../create/options';
import { resolveCreateAppSpec } from '../create/recipes';
import { scaffoldProject } from '../create/scaffold';
import { registerCreateCommand } from './create';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ui-create-'));
  temporaryDirectories.push(dir);
  return dir;
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
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

describe('create command', () => {
  it('creates the default dapp scaffold with JSON output', async () => {
    const dir = createTempDir();
    const stdout = await runCreate([
      'demo-app',
      '--directory',
      dir,
      '--skip-install',
      '--yes',
      '--json',
    ]);
    const payload = JSON.parse(stdout);
    const projectRoot = path.join(dir, 'demo-app');

    expect(payload.action).toBe('create');
    expect(payload.ok).toBe(true);
    expect(payload.preset).toBe('dapp');
    expect(payload.wallet).toBe('custom');
    expect(payload.routing).toBe('none');
    expect(payload.features).toContain('wallet');
    expect(payload.filesWritten).toContain('src/oz/OzProviders.tsx');
    expect(fs.existsSync(path.join(projectRoot, 'src', 'oz', 'runtime.ts'))).toBe(true);
    expect(readFile(path.join(projectRoot, 'package.json'))).toContain('@wagmi/core');
    expect(readFile(path.join(projectRoot, 'package.json'))).toContain('@openzeppelin/ui-cli');
    expect(readFile(path.join(projectRoot, 'package.json'))).toContain('"oz-ui": "oz-ui"');
    expect(readFile(path.join(projectRoot, 'src', 'index.css'))).toContain(
      "@source '../node_modules/@openzeppelin';"
    );
    expect(readFile(path.join(projectRoot, 'src', 'App.tsx'))).toContain('RuntimeStatus');
  });

  it('creates each preset with the expected shape', async () => {
    const dir = createTempDir();

    await runCreate([
      'minimal-app',
      '--directory',
      dir,
      '--preset',
      'minimal',
      '--skip-install',
      '--yes',
      '--json',
    ]);
    await runCreate([
      'shell-app',
      '--directory',
      dir,
      '--preset',
      'app-shell',
      '--skip-install',
      '--yes',
      '--json',
    ]);
    await runCreate([
      'wizard-app',
      '--directory',
      dir,
      '--preset',
      'wizard',
      '--skip-install',
      '--yes',
      '--json',
    ]);

    expect(fs.existsSync(path.join(dir, 'minimal-app', 'src', 'oz'))).toBe(false);
    expect(readFile(path.join(dir, 'shell-app', 'src', 'App.tsx'))).toContain('BrowserRouter');
    expect(readFile(path.join(dir, 'shell-app', 'src', 'App.tsx'))).toContain(
      'OZ-Logo-BlackBG.svg'
    );
    expect(readFile(path.join(dir, 'shell-app', 'src', 'App.tsx'))).toContain(
      '<SidebarGroup title="Build"'
    );
    expect(readFile(path.join(dir, 'shell-app', 'src', 'App.tsx'))).toContain(
      'background="bg-sidebar"'
    );
    expect(readFile(path.join(dir, 'shell-app', 'src', 'App.tsx'))).toContain(
      '<div className="flex min-h-0 flex-1 flex-col overflow-hidden">'
    );
    expect(readFile(path.join(dir, 'shell-app', 'src', 'App.tsx'))).toContain(
      '<main className="flex-1 overflow-y-auto">'
    );
    expect(fs.existsSync(path.join(dir, 'shell-app', 'public', 'OZ-Logo-BlackBG.svg'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'minimal-app', 'public', 'OZ-Logo-BlackBG.svg'))).toBe(
      false
    );
    expect(readFile(path.join(dir, 'wizard-app', 'src', 'App.tsx'))).toContain('WizardLayout');
    expect(readFile(path.join(dir, 'wizard-app', 'src', 'App.tsx'))).toContain("title: 'Intro'");
    expect(readFile(path.join(dir, 'minimal-app', 'src', 'App.tsx'))).not.toContain('<Footer');
    expect(readFile(path.join(dir, 'shell-app', 'src', 'App.tsx'))).toContain(
      '<Footer companyName="OpenZeppelin" />'
    );
    expect(readFile(path.join(dir, 'wizard-app', 'src', 'App.tsx'))).toContain(
      'variant="vertical"'
    );
    expect(readFile(path.join(dir, 'wizard-app', 'src', 'App.tsx'))).toContain(
      'className="flex h-16 w-full items-center gap-4 px-3 sm:px-4 md:px-5"'
    );
    expect(fs.existsSync(path.join(dir, 'wizard-app', 'public', 'OZ-Logo-BlackBG.svg'))).toBe(true);
  });

  it('auto-adds router when sidebar is requested', async () => {
    const dir = createTempDir();
    const stdout = await runCreate([
      'sidebar-app',
      '--directory',
      dir,
      '--preset',
      'dapp',
      '--with',
      'sidebar',
      '--skip-install',
      '--yes',
      '--json',
    ]);
    const payload = JSON.parse(stdout);

    expect(payload.routing).toBe('react-router');
    expect(payload.features).toContain('router');
    expect(payload.impliedFeatures.router).toContain('sidebar');
  });

  it('normalizes presets and feature combinations into app recipes', () => {
    const dapp = resolveCreateAppSpec(
      resolveCreateOptions({ projectName: 'dapp-recipe', targetDirectory: createTempDir() })
    );
    const shell = resolveCreateAppSpec(
      resolveCreateOptions({
        projectName: 'shell-recipe',
        targetDirectory: createTempDir(),
        preset: 'app-shell',
      })
    );
    const wizardSidebar = resolveCreateAppSpec(
      resolveCreateOptions({
        projectName: 'wizard-sidebar-recipe',
        targetDirectory: createTempDir(),
        preset: 'wizard',
        withFeatures: ['sidebar'],
      })
    );

    expect(dapp.layout).toBe('topbar');
    expect(dapp.content).toBe('dapp-dashboard');
    expect(dapp.hasWallet).toBe(true);
    expect(shell.layout).toBe('sidebar-shell');
    expect(shell.content).toBe('dapp-dashboard');
    expect(shell.hasRouter).toBe(true);
    expect(wizardSidebar.layout).toBe('sidebar-shell');
    expect(wizardSidebar.content).toBe('wizard');
    expect(wizardSidebar.hasWizard).toBe(true);
    expect(wizardSidebar.requiresLogoAsset).toBe(true);
  });

  it('keeps wizard content when sidebar is added to the wizard preset', async () => {
    const dir = createTempDir();
    const stdout = await runCreate([
      'wizard-sidebar-app',
      '--directory',
      dir,
      '--preset',
      'wizard',
      '--with',
      'sidebar',
      '--skip-install',
      '--yes',
      '--json',
    ]);
    const payload = JSON.parse(stdout);
    const app = readFile(path.join(dir, 'wizard-sidebar-app', 'src', 'App.tsx'));

    expect(payload.preset).toBe('wizard');
    expect(payload.features).toContain('wizard');
    expect(payload.features).toContain('sidebar');
    expect(payload.routing).toBe('react-router');
    expect(app).toContain('SidebarLayout');
    expect(app).toContain('WizardLayout');
    expect(app).toContain('function WizardContent()');
    expect(app).not.toContain('Your route-aware app shell is ready');
  });

  it('generates different wallet files for custom and rainbowkit', async () => {
    const dir = createTempDir();

    await runCreate([
      'custom-app',
      '--directory',
      dir,
      '--wallet',
      'custom',
      '--skip-install',
      '--yes',
      '--json',
    ]);
    await runCreate([
      'rainbow-app',
      '--directory',
      dir,
      '--wallet',
      'rainbowkit',
      '--skip-install',
      '--yes',
      '--json',
    ]);

    expect(fs.existsSync(path.join(dir, 'custom-app', 'src', 'oz', 'wallet'))).toBe(false);
    expect(
      fs.existsSync(path.join(dir, 'rainbow-app', 'src', 'oz', 'wallet', 'rainbowkit.config.ts'))
    ).toBe(true);
    expect(readFile(path.join(dir, 'rainbow-app', 'package.json'))).toContain(
      '@rainbow-me/rainbowkit'
    );
  });

  it('rejects contradictory wallet options', async () => {
    const dir = createTempDir();

    expect(() =>
      resolveCreateOptions({
        projectName: 'bad-app',
        targetDirectory: dir,
        withoutFeatures: ['wallet'],
        wallet: 'custom',
        skipInstall: true,
      })
    ).toThrow('Cannot use --without wallet');
  });

  it('does not overwrite a non-empty directory without --force', async () => {
    const dir = createTempDir();
    const projectRoot = path.join(dir, 'existing-app');
    fs.mkdirSync(projectRoot);
    fs.writeFileSync(path.join(projectRoot, 'README.md'), 'keep me');

    const options = resolveCreateOptions({
      projectName: 'existing-app',
      targetDirectory: dir,
      skipInstall: true,
    });

    expect(() => scaffoldProject(options)).toThrow('not empty');
  });

  it('prints selected components and src/oz edit points in human output', async () => {
    const dir = createTempDir();
    const stdout = await runCreate(['human-app', '--directory', dir, '--skip-install', '--yes']);

    expect(stdout).toContain('Components:');
    expect(stdout).toContain('src/oz/runtime.ts');
    expect(stdout).toContain('Next steps');
  });
});
