import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { doctorTailwindProject } from './doctor';
import { fixTailwindProject, printTailwindProject } from './fix';
import { resolveTailwindProject } from './project';

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

function writeJson(filePath: string, contents: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(contents, null, 2)}\n`);
}

function createTailwindApp(
  projectRoot: string,
  options?: { monorepo?: boolean; withSecondApp?: boolean }
): string {
  const appRoot = options?.monorepo ? path.join(projectRoot, 'apps', 'example-app') : projectRoot;
  const appPackageJsonPath = path.join(appRoot, 'package.json');

  if (options?.monorepo) {
    writeJson(path.join(projectRoot, 'package.json'), {
      name: 'example-monorepo',
      private: true,
      workspaces: ['apps/*'],
    });
  }

  writeJson(appPackageJsonPath, {
    name: options?.monorepo ? '@example/app' : 'example-app',
    private: true,
    version: '0.0.0',
    type: 'module',
    dependencies: {
      '@openzeppelin/adapter-evm': '^1.0.0',
      '@openzeppelin/ui-components': '^1.0.0',
      '@openzeppelin/ui-renderer': '^1.0.0',
      '@openzeppelin/ui-styles': '^1.0.0',
      react: '^19.2.1',
      'react-dom': '^19.2.1',
    },
    devDependencies: {
      '@tailwindcss/vite': '^4.1.0',
      tailwindcss: '^4.1.0',
    },
  });

  fs.mkdirSync(path.join(appRoot, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(appRoot, 'src', 'main.tsx'),
    ["import './index.css';", '', 'export function main(): void {}', ''].join('\n')
  );
  fs.writeFileSync(
    path.join(appRoot, 'src', 'index.css'),
    [
      '/* Tailwind setup */',
      '@layer base, components, utilities;',
      "@import 'tailwindcss' source('../../../');",
      "@source '../../../node_modules/@openzeppelin';",
      "@import '@openzeppelin/ui-styles/global.css';",
      '',
      '@layer components {',
      '  .app-shell {',
      '    display: flex;',
      '  }',
      '}',
      '',
    ].join('\n')
  );

  if (options?.withSecondApp) {
    const secondAppRoot = path.join(projectRoot, 'apps', 'second-app');
    writeJson(path.join(secondAppRoot, 'package.json'), {
      name: '@example/second-app',
      private: true,
      version: '0.0.0',
      type: 'module',
      devDependencies: {
        '@tailwindcss/vite': '^4.1.0',
        tailwindcss: '^4.1.0',
      },
    });
    fs.mkdirSync(path.join(secondAppRoot, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(secondAppRoot, 'src', 'main.tsx'),
      ["import './index.css';", '', 'export function second(): void {}', ''].join('\n')
    );
    fs.writeFileSync(path.join(secondAppRoot, 'src', 'index.css'), "@import 'tailwindcss';\n");
  }

  return appRoot;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('resolveTailwindProject', () => {
  it('detects the single Tailwind entry stylesheet in a monorepo app', () => {
    const projectRoot = createTemporaryDirectory('oz-ui-dev-tailwind-project-');
    const appRoot = createTailwindApp(projectRoot, { monorepo: true });

    const result = resolveTailwindProject(projectRoot);

    expect(result).toEqual(
      expect.objectContaining({
        projectRoot,
        appRoot,
        cssPath: path.join(appRoot, 'src', 'index.css'),
        generatedCssPath: path.join(appRoot, 'src', 'oz-tailwind.generated.css'),
      })
    );
  });

  it('requires --css when multiple Tailwind entry stylesheets exist', () => {
    const projectRoot = createTemporaryDirectory('oz-ui-dev-tailwind-multi-');
    createTailwindApp(projectRoot, { monorepo: true, withSecondApp: true });

    expect(() => resolveTailwindProject(projectRoot)).toThrow(
      /multiple tailwind entry stylesheets/i
    );
  });
});

describe('doctorTailwindProject', () => {
  it('warns on legacy inline setup and broad OpenZeppelin scanning', () => {
    const projectRoot = createTemporaryDirectory('oz-ui-dev-tailwind-doctor-');
    createTailwindApp(projectRoot);

    const result = doctorTailwindProject(projectRoot);

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing-managed-import', severity: 'warning' }),
        expect.objectContaining({ code: 'legacy-inline-setup', severity: 'warning' }),
        expect.objectContaining({ code: 'broad-openzeppelin-source', severity: 'warning' }),
      ])
    );
  });
});

describe('fixTailwindProject', () => {
  it('reports planned changes during dry runs without writing files', () => {
    const projectRoot = createTemporaryDirectory('oz-ui-dev-tailwind-dry-run-');
    const appRoot = createTailwindApp(projectRoot, { monorepo: true });

    const result = fixTailwindProject(projectRoot, { dryRun: true });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.wrote).toBe(false);
    expect(result.changes).toEqual([
      expect.objectContaining({
        action: 'update',
        path: path.join(appRoot, 'src', 'index.css'),
      }),
      expect.objectContaining({
        action: 'create',
        path: path.join(appRoot, 'src', 'oz-tailwind.generated.css'),
      }),
    ]);
    expect(fs.existsSync(path.join(appRoot, 'src', 'oz-tailwind.generated.css'))).toBe(false);
  });

  it('writes the managed import and generated stylesheet while preserving app CSS', () => {
    const projectRoot = createTemporaryDirectory('oz-ui-dev-tailwind-fix-');
    const appRoot = createTailwindApp(projectRoot, { monorepo: true });

    const result = fixTailwindProject(projectRoot);
    const stylesheetContent = fs.readFileSync(path.join(appRoot, 'src', 'index.css'), 'utf8');
    const generatedCssContent = fs.readFileSync(
      path.join(appRoot, 'src', 'oz-tailwind.generated.css'),
      'utf8'
    );

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.wrote).toBe(true);
    expect(stylesheetContent).toContain("@import './oz-tailwind.generated.css';");
    expect(stylesheetContent).toContain('@layer components {');
    expect(stylesheetContent).not.toContain("@import 'tailwindcss' source('../../../');");
    expect(generatedCssContent).toContain('Managed by oz-ui-dev tailwind fix');
    expect(generatedCssContent).toContain('@source "./";');
    expect(generatedCssContent).toContain('@source "../";');
    expect(generatedCssContent).toContain('@openzeppelin/ui-components');
    expect(generatedCssContent).toContain('@openzeppelin/adapter-evm');
    expect(doctorTailwindProject(projectRoot).issues).toEqual([]);
  });

  it('can self-heal a partially normalized stylesheet on repeated runs', () => {
    const projectRoot = createTemporaryDirectory('oz-ui-dev-tailwind-heal-');
    const appRoot = createTailwindApp(projectRoot, { monorepo: true });
    const cssPath = path.join(appRoot, 'src', 'index.css');

    fs.writeFileSync(
      cssPath,
      [
        "@import './oz-tailwind.generated.css';",
        '',
        'Import Tailwind directives.',
        '  Tailwind v4 uses automatic content detection for the local project.',
        '*/',
        "@import 'tailwindcss' source('../../../');",
        "@source '../../../node_modules/@openzeppelin';",
        "@import '@openzeppelin/ui-styles/global.css';",
        '',
        '@layer components {',
        '  .app-shell {',
        '    display: flex;',
        '  }',
        '}',
        '',
      ].join('\n')
    );

    const result = fixTailwindProject(projectRoot);
    const normalizedCss = fs.readFileSync(cssPath, 'utf8');

    expect(result.changed).toBe(true);
    expect(normalizedCss).toBe(
      [
        "@import './oz-tailwind.generated.css';",
        '',
        '@layer components {',
        '  .app-shell {',
        '    display: flex;',
        '  }',
        '}',
        '',
      ].join('\n')
    );
  });
});

describe('printTailwindProject', () => {
  it('returns explicit sources for both project-local and hoisted node_modules', () => {
    const projectRoot = createTemporaryDirectory('oz-ui-dev-tailwind-print-');
    const appRoot = createTailwindApp(projectRoot, { monorepo: true });

    const result = printTailwindProject(projectRoot);

    expect(result.ok).toBe(true);
    expect(result.sourcePlan?.sources).toEqual(
      expect.arrayContaining([
        './',
        '../',
        '../../../node_modules/@openzeppelin/ui-components',
        '../node_modules/@openzeppelin/ui-components',
        '../../../node_modules/@openzeppelin/adapter-evm/src',
        '../node_modules/@openzeppelin/adapter-evm/src',
      ])
    );
    expect(result.cssPath).toBe(path.join(appRoot, 'src', 'index.css'));
  });
});
