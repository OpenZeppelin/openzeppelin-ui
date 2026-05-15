import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('component-mappings.json', () => {
  const catalogPath = path.resolve(__dirname, 'component-mappings.json');

  it('exists on disk', () => {
    expect(fs.existsSync(catalogPath)).toBe(true);
  });

  it('is valid JSON with expected top-level structure', () => {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

    expect(catalog).toHaveProperty('catalogVersion');
    expect(catalog).toHaveProperty('generatedAt');
    expect(catalog).toHaveProperty('components');
    expect(catalog).toHaveProperty('capabilities');
    expect(typeof catalog.catalogVersion).toBe('string');
    expect(typeof catalog.components).toBe('object');
    expect(Array.isArray(catalog.capabilities)).toBe(true);
  });

  it('contains known OZ components', () => {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

    expect(catalog.components.Button).toBeDefined();
    expect(catalog.components.Button.package).toBe('@openzeppelin/ui-components');
    expect(catalog.components.AddressField).toBeDefined();
    expect(catalog.components.AddressField.category).toBe('field');
  });

  it('includes capability interfaces', () => {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

    expect(catalog.capabilities).toContain('AddressingCapability');
    expect(catalog.capabilities).toContain('WalletCapability');
    expect(catalog.capabilities).toContain('ExecutionCapability');
  });

  it('detects AddressingCapability on AddressField', () => {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

    expect(catalog.components.AddressField.capabilities).toContain('AddressingCapability');
  });
});

describe('source-libraries/', () => {
  const librariesDir = path.resolve(__dirname, 'source-libraries');

  it.each(['shadcn', 'radix', 'mui', 'chakra', 'antd', 'html-elements'])(
    '%s.json is valid',
    (libName) => {
      const libPath = path.join(librariesDir, `${libName}.json`);
      expect(fs.existsSync(libPath)).toBe(true);

      const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
      expect(lib).toHaveProperty('library');
      expect(lib).toHaveProperty('importPatterns');
      expect(lib).toHaveProperty('mappings');
      expect(Array.isArray(lib.importPatterns)).toBe(true);
      expect(Object.keys(lib.mappings).length).toBeGreaterThan(0);
    }
  );

  it('html-elements.json has htmlTags discriminant', () => {
    const libPath = path.join(librariesDir, 'html-elements.json');
    const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
    expect(lib.htmlTags).toBe(true);
    expect(lib.importPatterns).toEqual([]);
  });
});
