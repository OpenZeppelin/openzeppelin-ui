import { describe, expect, it } from 'vitest';

import type { ComponentCatalog, HtmlElementLibrary, SourceLibrary } from '../catalog';
import { analyzeComponents, analyzeHtmlElements } from './component-matcher';
import type { ScannedFile } from './scanner';

const MOCK_CATALOG: ComponentCatalog = {
  catalogVersion: '1.0.0',
  generatedAt: '2026-01-01T00:00:00.000Z',
  components: {
    Button: {
      package: '@openzeppelin/ui-components',
      importPath: 'ui/button',
      category: 'ui',
      capabilities: [],
    },
    Card: {
      package: '@openzeppelin/ui-components',
      importPath: 'ui/card',
      category: 'ui',
      capabilities: [],
    },
    Tabs: {
      package: '@openzeppelin/ui-components',
      importPath: 'ui/tabs',
      category: 'ui',
      capabilities: [],
    },
    AddressField: {
      package: '@openzeppelin/ui-components',
      importPath: 'fields',
      category: 'field',
      capabilities: ['AddressingCapability'],
    },
  },
  capabilities: ['AddressingCapability'],
};

const MOCK_SOURCE_LIBRARIES: Record<string, SourceLibrary> = {
  shadcn: {
    library: 'shadcn/ui',
    importPatterns: ['@/components/ui/'],
    mappings: {
      Button: { source: 'Button', effort: 'low', notes: 'Near 1:1 parity' },
      Card: { source: 'Card', effort: 'low', notes: 'Near 1:1 parity' },
      CardHeader: {
        source: 'Card',
        effort: 'low',
        notes: 'Compound maps to Card family',
        reportName: 'target',
      },
      CardTitle: {
        source: 'Card',
        effort: 'low',
        notes: 'Compound maps to Card family',
        reportName: 'target',
      },
    },
  },
  radix: {
    library: 'Radix Primitives',
    importPatterns: ['@radix-ui/react-'],
    namespaceImportStrategy: 'package-name',
    namespaceReportName: 'target',
    mappings: {
      Tabs: { source: 'Tabs', effort: 'low', notes: 'Wrap swap' },
      TabsPrimitive: {
        source: 'Tabs',
        effort: 'low',
        notes: 'Namespace import from @radix-ui/react-tabs',
        reportName: 'target',
      },
    },
  },
};

describe('analyzeComponents', () => {
  it('matches a shadcn Button import with JSX usage', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/App.tsx',
        relativePath: 'src/App.tsx',
        content: [
          "import { Button } from '@/components/ui/button';",
          '',
          'export function App() {',
          '  return <Button variant="default">Click</Button>;',
          '}',
        ].join('\n'),
      },
    ];

    const matches = analyzeComponents(files, MOCK_CATALOG, MOCK_SOURCE_LIBRARIES);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual(
      expect.objectContaining({
        name: 'Button',
        sourceLibrary: 'shadcn',
        ozTarget: 'Button',
        effort: 'low',
        usageCount: 1,
        files: ['src/App.tsx'],
      })
    );
  });

  it('counts usage across multiple files', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/A.tsx',
        relativePath: 'src/A.tsx',
        content: "import { Button } from '@/components/ui/button';\n<Button />\n<Button />",
      },
      {
        absolutePath: '/project/src/B.tsx',
        relativePath: 'src/B.tsx',
        content: "import { Button } from '@/components/ui/button';\n<Button />",
      },
    ];

    const matches = analyzeComponents(files, MOCK_CATALOG, MOCK_SOURCE_LIBRARIES);

    expect(matches[0].usageCount).toBe(3);
    expect(matches[0].files).toEqual(['src/A.tsx', 'src/B.tsx']);
  });

  it('skips components imported but never used in JSX', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/A.tsx',
        relativePath: 'src/A.tsx',
        content: "import { Card } from '@/components/ui/card';\nexport const x = 1;",
      },
    ];

    const matches = analyzeComponents(files, MOCK_CATALOG, MOCK_SOURCE_LIBRARIES);
    expect(matches).toHaveLength(0);
  });

  it('skips @openzeppelin imports (already migrated)', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/A.tsx',
        relativePath: 'src/A.tsx',
        content:
          "import { Button } from '@openzeppelin/ui-components';\nexport function A() { return <Button />; }",
      },
    ];

    const matches = analyzeComponents(files, MOCK_CATALOG, MOCK_SOURCE_LIBRARIES);
    expect(matches).toHaveLength(0);
  });

  it('rolls shadcn compound imports up to their parent OZ target', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/Card.tsx',
        relativePath: 'src/Card.tsx',
        content: [
          "import { CardHeader, CardTitle } from '@/components/ui/card';",
          '',
          'export function CardView() {',
          '  return (',
          '    <>',
          '      <CardHeader />',
          '      <CardTitle>Summary</CardTitle>',
          '    </>',
          '  );',
          '}',
        ].join('\n'),
      },
    ];

    const matches = analyzeComponents(files, MOCK_CATALOG, MOCK_SOURCE_LIBRARIES);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual(
      expect.objectContaining({
        name: 'Card',
        sourceLibrary: 'shadcn',
        ozTarget: 'Card',
        usageCount: 2,
        files: ['src/Card.tsx'],
      })
    );
  });

  it('tracks aliased named imports using the imported component name', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/App.tsx',
        relativePath: 'src/App.tsx',
        content: [
          "import { Button as PrimaryButton } from '@/components/ui/button';",
          '',
          'export function App() {',
          '  return <PrimaryButton />;',
          '}',
        ].join('\n'),
      },
    ];

    const matches = analyzeComponents(files, MOCK_CATALOG, MOCK_SOURCE_LIBRARIES);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual(
      expect.objectContaining({
        name: 'Button',
        ozTarget: 'Button',
        usageCount: 1,
      })
    );
  });

  it('maps Radix namespace imports from the package path instead of the alias text', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/Tabs.tsx',
        relativePath: 'src/Tabs.tsx',
        content: [
          "import * as Tabs from '@radix-ui/react-tabs';",
          '',
          'export function TabView() {',
          '  return (',
          '    <Tabs.Root>',
          '      <Tabs.List />',
          '      <Tabs.Trigger />',
          '    </Tabs.Root>',
          '  );',
          '}',
        ].join('\n'),
      },
    ];

    const matches = analyzeComponents(files, MOCK_CATALOG, MOCK_SOURCE_LIBRARIES);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual(
      expect.objectContaining({
        name: 'Tabs',
        sourceLibrary: 'radix',
        ozTarget: 'Tabs',
        usageCount: 3,
      })
    );
  });
});

const MOCK_HTML_LIB: HtmlElementLibrary = {
  library: 'HTML Elements',
  importPatterns: [],
  htmlTags: true,
  mappings: {
    Button: { source: 'button', effort: 'low', notes: 'Map onClick' },
    Input: { source: 'input[type=text]', effort: 'low', notes: 'type=text' },
    Checkbox: { source: 'input[type=checkbox]', effort: 'low', notes: 'Map checked' },
    RadioGroup: { source: 'input[type=radio]', effort: 'medium', notes: 'Group by name' },
    Select: { source: 'select', effort: 'medium', notes: 'Map options' },
    Textarea: { source: 'textarea', effort: 'low', notes: 'Direct swap' },
    Label: { source: 'label', effort: 'low', notes: 'Map htmlFor' },
    Progress: { source: 'progress', effort: 'low', notes: 'Map value/max' },
    Dialog: { source: 'dialog', effort: 'medium', notes: 'Map open attr' },
  },
};

describe('analyzeHtmlElements', () => {
  it('detects <button> as Button', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/A.tsx',
        relativePath: 'src/A.tsx',
        content: '<button onClick={go}>Click</button>',
      },
    ];

    const matches = analyzeHtmlElements(files, MOCK_HTML_LIB);
    const btn = matches.find((m) => m.name === 'Button');
    expect(btn).toBeDefined();
    expect(btn!.usageCount).toBe(1);
    expect(btn!.sourceLibrary).toBe('html-elements');
  });

  it('differentiates input types into distinct OZ targets', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/Form.tsx',
        relativePath: 'src/Form.tsx',
        content: [
          '<input type="text" />',
          '<input type="checkbox" checked />',
          '<input type="radio" name="opt" />',
          '<input type="email" />',
        ].join('\n'),
      },
    ];

    const matches = analyzeHtmlElements(files, MOCK_HTML_LIB);
    const names = matches.map((m) => m.name).sort();
    expect(names).toEqual(['Checkbox', 'Input', 'RadioGroup']);

    const input = matches.find((m) => m.name === 'Input');
    expect(input!.usageCount).toBe(2);
  });

  it('defaults to Input when <input> has no type attribute', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/A.tsx',
        relativePath: 'src/A.tsx',
        content: '<input value="" onChange={fn} />',
      },
    ];

    const matches = analyzeHtmlElements(files, MOCK_HTML_LIB);
    const input = matches.find((m) => m.name === 'Input');
    expect(input).toBeDefined();
    expect(input!.usageCount).toBe(1);
  });

  it('detects <select>, <textarea>, <label>, <progress>, <dialog>', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/A.tsx',
        relativePath: 'src/A.tsx',
        content: [
          '<select><option>A</option></select>',
          '<textarea rows={3} />',
          '<label htmlFor="x">Name</label>',
          '<progress value={50} max={100} />',
          '<dialog open>Hi</dialog>',
        ].join('\n'),
      },
    ];

    const matches = analyzeHtmlElements(files, MOCK_HTML_LIB);
    const names = matches.map((m) => m.name).sort();
    expect(names).toEqual(['Dialog', 'Label', 'Progress', 'Select', 'Textarea']);
  });

  it('counts usages across multiple files', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/A.tsx',
        relativePath: 'src/A.tsx',
        content: '<button>A</button>\n<button>B</button>',
      },
      {
        absolutePath: '/project/src/B.tsx',
        relativePath: 'src/B.tsx',
        content: '<button>C</button>',
      },
    ];

    const matches = analyzeHtmlElements(files, MOCK_HTML_LIB);
    const btn = matches.find((m) => m.name === 'Button');
    expect(btn!.usageCount).toBe(3);
    expect(btn!.files).toEqual(['src/A.tsx', 'src/B.tsx']);
  });

  it('only suppresses native inputs in files that already import OZ UI components', () => {
    const files: ScannedFile[] = [
      {
        absolutePath: '/project/src/Migrated.tsx',
        relativePath: 'src/Migrated.tsx',
        content: [
          "import { Button } from '@openzeppelin/ui-components';",
          'export function Migrated() {',
          '  return (',
          '    <>',
          '      <input type="text" />',
          '      <button>Keep counting button</button>',
          '      <Button />',
          '    </>',
          '  );',
          '}',
        ].join('\n'),
      },
      {
        absolutePath: '/project/src/Legacy.tsx',
        relativePath: 'src/Legacy.tsx',
        content: 'export function Legacy() { return <input type="text" />; }',
      },
    ];

    const matches = analyzeHtmlElements(files, MOCK_HTML_LIB);
    const input = matches.find((m) => m.name === 'Input');
    const button = matches.find((m) => m.name === 'Button');

    expect(input).toBeDefined();
    expect(input!.usageCount).toBe(1);
    expect(input!.files).toEqual(['src/Legacy.tsx']);
    expect(button).toBeDefined();
    expect(button!.usageCount).toBe(1);
    expect(button!.files).toEqual(['src/Migrated.tsx']);
  });
});
