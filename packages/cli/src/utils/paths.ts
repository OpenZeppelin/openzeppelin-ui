import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findPackageRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (pkg.name === '@openzeppelin/ui-cli') return dir;
      } catch {
        // corrupt package.json, keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return path.resolve(__dirname, '..', '..');
}

let cachedRoot: string | null = null;

export function getPackageRoot(): string {
  if (!cachedRoot) cachedRoot = findPackageRoot();
  return cachedRoot;
}

export function getCatalogPath(): string {
  return path.join(getPackageRoot(), 'src', 'catalog');
}

export function getTemplatesPath(): string {
  return path.join(getPackageRoot(), 'src', 'templates');
}
