import fs from 'node:fs';
import path from 'node:path';

const SCANNABLE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.turbo',
  '.cursor',
  '.claude',
  'coverage',
  'dist',
  'build',
  'node_modules',
  '__tests__',
  '__mocks__',
]);

export interface ScannedFile {
  absolutePath: string;
  relativePath: string;
  content: string;
}

/**
 *
 */
export function scanProjectFiles(projectRoot: string, scope?: string): ScannedFile[] {
  const root = scope ? path.resolve(projectRoot, scope) : projectRoot;
  if (!fs.existsSync(root)) return [];

  const files: ScannedFile[] = [];

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
        continue;
      }

      const ext = path.extname(entry.name);
      if (!SCANNABLE_EXTENSIONS.has(ext)) continue;

      if (
        entry.name.endsWith('.test.ts') ||
        entry.name.endsWith('.test.tsx') ||
        entry.name.endsWith('.spec.ts') ||
        entry.name.endsWith('.spec.tsx') ||
        entry.name.endsWith('.d.ts')
      ) {
        continue;
      }

      const absolutePath = path.join(dir, entry.name);
      files.push({
        absolutePath,
        relativePath: path.relative(projectRoot, absolutePath),
        content: fs.readFileSync(absolutePath, 'utf8'),
      });
    }
  }

  walk(root);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
