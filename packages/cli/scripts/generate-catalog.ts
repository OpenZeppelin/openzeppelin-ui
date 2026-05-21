/**
 * Generates component-mappings.json by reading barrel exports from
 * packages/components and packages/types.
 *
 * Run: npx tsx scripts/generate-catalog.ts
 * Output: src/catalog/component-mappings.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'src', 'catalog', 'component-mappings.json');

interface ComponentEntry {
  package: string;
  importPath: string;
  category: 'ui' | 'field';
  capabilities: string[];
}

interface CatalogOutput {
  catalogVersion: string;
  generatedAt: string;
  components: Record<string, ComponentEntry>;
  capabilities: string[];
}

function extractReExports(indexPath: string): string[] {
  if (!fs.existsSync(indexPath)) {
    return [];
  }
  const content = fs.readFileSync(indexPath, 'utf8');
  const modules: string[] = [];
  for (const match of content.matchAll(/export\s+\*\s+from\s+['"]\.\/([^'"]+)['"]/g)) {
    modules.push(match[1]);
  }
  return modules;
}

function moduleToComponentName(moduleName: string): string {
  return moduleName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function scanForCapabilityProps(componentDir: string, componentName: string): string[] {
  const capabilities: string[] = [];
  const candidates = [
    path.join(componentDir, `${componentName}.tsx`),
    path.join(componentDir, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const content = fs.readFileSync(candidate, 'utf8');

    const capabilityPattern = /(\w+Capability)\s*[?]?\s*[;:,)]/g;
    for (const match of content.matchAll(capabilityPattern)) {
      const capName = match[1];
      if (!capabilities.includes(capName)) {
        capabilities.push(capName);
      }
    }
  }

  return capabilities;
}

function collectUiComponents(): Record<string, ComponentEntry> {
  const indexPath = path.join(
    MONOREPO_ROOT,
    'packages/components/src/components/ui/index.ts'
  );
  const modules = extractReExports(indexPath);
  const components: Record<string, ComponentEntry> = {};

  for (const moduleName of modules) {
    const componentName = moduleToComponentName(moduleName);
    const componentDir = path.join(
      MONOREPO_ROOT,
      'packages/components/src/components/ui',
      moduleName
    );

    components[componentName] = {
      package: '@openzeppelin/ui-components',
      importPath: `ui/${moduleName}`,
      category: 'ui',
      capabilities: scanForCapabilityProps(componentDir, componentName),
    };
  }

  return components;
}

function collectFieldComponents(): Record<string, ComponentEntry> {
  const indexPath = path.join(
    MONOREPO_ROOT,
    'packages/components/src/components/fields/index.ts'
  );
  const modules = extractReExports(indexPath);
  const components: Record<string, ComponentEntry> = {};

  for (const moduleName of modules) {
    if (moduleName === 'utils' || moduleName === 'address-suggestion') continue;

    const componentName = moduleToComponentName(moduleName);
    const componentDir = path.join(
      MONOREPO_ROOT,
      'packages/components/src/components/fields'
    );

    components[componentName] = {
      package: '@openzeppelin/ui-components',
      importPath: 'fields',
      category: 'field',
      capabilities: scanForCapabilityProps(componentDir, componentName),
    };
  }

  return components;
}

function collectCapabilities(): string[] {
  const indexPath = path.join(
    MONOREPO_ROOT,
    'packages/types/src/adapters/capabilities/index.ts'
  );
  if (!fs.existsSync(indexPath)) return [];

  const content = fs.readFileSync(indexPath, 'utf8');
  const capabilities: string[] = [];
  for (const match of content.matchAll(/export\s+type\s+\{\s*(\w+Capability)\s*\}/g)) {
    capabilities.push(match[1]);
  }
  return capabilities.sort();
}

function generate(): void {
  const uiComponents = collectUiComponents();
  const fieldComponents = collectFieldComponents();
  const capabilities = collectCapabilities();

  const catalog: CatalogOutput = {
    catalogVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    components: { ...uiComponents, ...fieldComponents },
    capabilities,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2) + '\n');

  const componentCount = Object.keys(catalog.components).length;
  const capabilityCount = catalog.capabilities.length;
  process.stdout.write(
    `Generated ${OUTPUT_PATH} — ${componentCount} components, ${capabilityCount} capabilities\n`
  );
}

generate();
