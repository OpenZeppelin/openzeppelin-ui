/**
 * @vitest-environment node
 *
 * SF-7 · Package / source boundary — DEMO-INV-1, DEMO-INV-6, DEMO-INV-7.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const DIR = dirname(fileURLToPath(import.meta.url));
const DEMO_SOURCE = readFileSync(join(DIR, '../DataTableDemo.tsx'), 'utf8');
const BARREL_SOURCE = readFileSync(join(DIR, '../index.ts'), 'utf8');
const APP_SOURCE = readFileSync(join(DIR, '../../App.tsx'), 'utf8');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('DEMO-INV-1: demo consumes kit DataTable, not a local table', () => {
  it('imports DataTable, AddressDisplay, Badge, and Button from the kit barrel', () => {
    const source = stripComments(DEMO_SOURCE);
    expect(
      source,
      'DEMO-INV-1: DataTableDemo must import from @openzeppelin/ui-components'
    ).toMatch(/from\s+['"]@openzeppelin\/ui-components['"]/);
    expect(source).toMatch(/\bDataTable\b/);
    expect(source).toMatch(/\bAddressDisplay\b/);
    expect(source).toMatch(/\bBadge\b/);
    expect(source).toMatch(/\bButton\b/);
    expect(source).toMatch(/\bDataTableColumn\b/);
    expect(
      source,
      'DEMO-INV-1: demo must not author a native <table> — that would be a local one-off'
    ).not.toMatch(/<table[\s>]/);
  });

  it('usage snippet also imports DataTable from the kit barrel', () => {
    expect(DEMO_SOURCE).toContain("from '@openzeppelin/ui-components'");
    expect(DEMO_SOURCE).toMatch(/<DataTable[\s\S]*caption="Token holdings"/);
  });
});

describe('DEMO-INV-6: gallery route is wired', () => {
  it('exports DataTableDemo from the demo barrel', () => {
    expect(BARREL_SOURCE).toMatch(
      /export\s+\{\s*DataTableDemo\s*\}\s+from\s+['"]\.\/DataTableDemo['"]/
    );
  });

  it('registers data-table in DemoKey, Data Display nav, and the component map', () => {
    expect(APP_SOURCE, 'DEMO-INV-6: DemoKey must include data-table').toMatch(/\|\s*'data-table'/);
    expect(APP_SOURCE, 'DEMO-INV-6: Data Display gallery must list DataTable').toMatch(
      /key:\s*'data-table',\s*label:\s*'DataTable'/
    );
    expect(APP_SOURCE, 'DEMO-INV-6: registry must mount DataTableDemo').toMatch(
      /'data-table':\s*DataTableDemo/
    );
  });
});

describe('DEMO-INV-7: demo does not fetch', () => {
  it('keeps the row source in-memory with no query or fetch client', () => {
    const source = stripComments(DEMO_SOURCE);
    expect(source).toMatch(/SAMPLE_ROWS/);
    expect(source, 'DEMO-INV-7: no fetch()').not.toMatch(/\bfetch\s*\(/);
    expect(source, 'DEMO-INV-7: no react-query').not.toMatch(/useQuery|QueryClient/);
    expect(source, 'DEMO-INV-7: no axios/graphql').not.toMatch(/\baxios\b|\bgql`|\bgraphql\b/);
  });
});
