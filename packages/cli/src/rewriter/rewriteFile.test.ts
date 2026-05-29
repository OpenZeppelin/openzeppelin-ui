import { describe, expect, it } from 'vitest';

import type { MigrationTask } from '../manifest/schema';
import { rewriteFile, type RewriteContext } from './rewriteFile';

/**
 * Characterization / contract tests for the deterministic component rewriter.
 *
 * These assert the *semantic guarantees* the rewriter must preserve (imports
 * swapped/merged, JSX tags renamed, props remapped, namespace members handled)
 * rather than exact whitespace, so they hold across an implementation change
 * from regex to AST. They are driven by the real on-disk catalog.
 */

function replacementTask(overrides: Partial<MigrationTask> = {}): MigrationTask {
  return {
    id: 'component-replacement-test',
    phase: 'component-migration',
    type: 'component-replacement',
    status: 'pending',
    description: 'test',
    file: 'src/App.tsx',
    ...overrides,
  };
}

const OZ = '@openzeppelin/ui-components';

function importLineFor(content: string, pkg: string): string | null {
  return content.split('\n').find((line) => line.includes(`from '${pkg}'`)) ?? null;
}

describe('rewriteFile — named import swaps', () => {
  it('swaps a single named import to the OZ package and remaps props on the target tag', () => {
    const input = [
      "import { Button } from '@/components/ui/button';",
      '',
      'export function App() {',
      '  return <Button size="lg" variant="default">Go</Button>;',
      '}',
      '',
    ].join('\n');

    const out = rewriteFile(
      replacementTask({ sourceComponent: 'Button', targetComponent: 'Button' }),
      input,
      { propMappings: { size: 'scale' } }
    );

    expect(out).toContain(`from '${OZ}'`);
    expect(out).not.toContain("from '@/components/ui/button'");
    expect(importLineFor(out, OZ)).toContain('Button');
    expect(out).toContain('scale="lg"');
    expect(out).not.toContain('size="lg"');
    expect(out).toContain('variant="default"');
  });

  it('renames the JSX tag when source and target component names differ', () => {
    const input = [
      "import { TextField } from '@mui/material';",
      '',
      'export function App() {',
      '  return <TextField label="Name" />;',
      '}',
      '',
    ].join('\n');

    const out = rewriteFile(
      replacementTask({ sourceComponent: 'TextField', targetComponent: 'Input' }),
      input
    );

    expect(out).toContain('<Input');
    expect(out).not.toContain('<TextField');
    expect(importLineFor(out, OZ)).toContain('Input');
    expect(out).not.toContain("from '@mui/material'");
  });

  it('keeps sibling specifiers and only removes the migrated one', () => {
    const input = [
      "import { Button, Spinner } from '@/components/ui/button';",
      '',
      'export function App() {',
      '  return <Button>{<Spinner />}</Button>;',
      '}',
      '',
    ].join('\n');

    const out = rewriteFile(
      replacementTask({ sourceComponent: 'Button', targetComponent: 'Button' }),
      input
    );

    const legacy = importLineFor(out, '@/components/ui/button');
    expect(legacy).not.toBeNull();
    expect(legacy).toContain('Spinner');
    expect(legacy).not.toMatch(/\bButton\b/);
    expect(importLineFor(out, OZ)).toContain('Button');
  });

  it('merges into an existing OZ import instead of adding a duplicate', () => {
    const input = [
      "import { Card } from '@openzeppelin/ui-components';",
      "import { Button } from '@/components/ui/button';",
      '',
      'export function App() {',
      '  return (',
      '    <Card>',
      '      <Button>Go</Button>',
      '    </Card>',
      '  );',
      '}',
      '',
    ].join('\n');

    const out = rewriteFile(
      replacementTask({ sourceComponent: 'Button', targetComponent: 'Button' }),
      input
    );

    const ozLines = out.split('\n').filter((line) => line.includes(`from '${OZ}'`));
    expect(ozLines).toHaveLength(1);
    expect(ozLines[0]).toContain('Button');
    expect(ozLines[0]).toContain('Card');
  });

  it('current behavior: injects an OZ import even when the source component is absent (wart)', () => {
    // The executor only runs the rewriter on files analysis has flagged as
    // containing the component, so this path is not hit in practice. The
    // current regex implementation unconditionally adds the OZ import; the
    // AST rewrite should treat an absent source as a no-op instead.
    const input = ["import { Something } from 'some-lib';", 'export const x = 1;', ''].join('\n');

    const out = rewriteFile(
      replacementTask({ sourceComponent: 'Button', targetComponent: 'Button' }),
      input
    );

    expect(out).toContain(`import { Button } from '${OZ}'`);
  });

  it('returns content unchanged when the task lacks source/target', () => {
    const input = "import { Button } from '@/components/ui/button';\n";
    expect(rewriteFile(replacementTask({}), input)).toBe(input);
  });
});

describe('rewriteFile — compound families', () => {
  it('collapses a Card-family import group into one OZ import and leaves JSX tags intact', () => {
    const input = [
      "import { Card, CardHeader, CardContent } from '@/components/ui/card';",
      '',
      'export function App() {',
      '  return (',
      '    <Card>',
      '      <CardHeader>Title</CardHeader>',
      '      <CardContent>Body</CardContent>',
      '    </Card>',
      '  );',
      '}',
      '',
    ].join('\n');

    const out = rewriteFile(
      replacementTask({ sourceComponent: 'Card', targetComponent: 'Card' }),
      input
    );

    expect(out).not.toContain("from '@/components/ui/card'");
    const ozLine = importLineFor(out, OZ);
    expect(ozLine).toContain('Card');
    expect(ozLine).toContain('CardHeader');
    expect(ozLine).toContain('CardContent');
    // Compound family JSX tags are preserved (only imports move).
    expect(out).toContain('<CardHeader>');
    expect(out).toContain('<CardContent>');
  });
});

describe('rewriteFile — namespace imports (radix)', () => {
  const input = [
    "import * as Dialog from '@radix-ui/react-dialog';",
    '',
    'export function Modal() {',
    '  const [open, setOpen] = useState(false);',
    '  return (',
    '    <Dialog.Root open={open}>',
    '      <Dialog.Trigger>Open</Dialog.Trigger>',
    '      <Dialog.Portal>',
    '        <Dialog.Overlay className="overlay" />',
    '        <Dialog.Content>',
    '          <Dialog.Title>Title</Dialog.Title>',
    '          <Dialog.Description>Desc</Dialog.Description>',
    '          <Dialog.Close asChild>',
    '            <button>Close</button>',
    '          </Dialog.Close>',
    '        </Dialog.Content>',
    '      </Dialog.Portal>',
    '    </Dialog.Root>',
    '  );',
    '}',
    '',
  ].join('\n');

  const out = rewriteFile(
    replacementTask({ sourceComponent: 'Dialog', targetComponent: 'Dialog' }),
    input
  );

  it('removes the namespace import and adds an OZ named import', () => {
    expect(out).not.toContain('import * as Dialog');
    expect(importLineFor(out, OZ)).not.toBeNull();
  });

  it('renames members to their OZ targets', () => {
    expect(out).toContain('<Dialog open={open}>');
    expect(out).toContain('<DialogTrigger>');
    expect(out).toContain('<DialogContent>');
    expect(out).toContain('<DialogTitle>');
    expect(out).toContain('<DialogDescription>');
    expect(out).not.toContain('Dialog.Root');
    expect(out).not.toContain('Dialog.Trigger');
  });

  it('unwraps Portal, omits Overlay, and converts Close asChild to an onClick handler', () => {
    expect(out).not.toContain('Dialog.Portal');
    expect(out).not.toContain('Dialog.Overlay');
    expect(out).not.toContain('Dialog.Close');
    expect(out).toContain('onClick={() => setOpen(false)}');
  });

  it('does not duplicate onClick when the child already has one', () => {
    const withHandler = input.replace(
      '<button>Close</button>',
      '<button onClick={foo}>Close</button>'
    );
    const result = rewriteFile(
      replacementTask({ sourceComponent: 'Dialog', targetComponent: 'Dialog' }),
      withHandler
    );
    const matches = result.match(/onClick=/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(result).toContain('onClick={foo}');
  });
});

describe('rewriteFile — prop mapping scope', () => {
  it('only remaps props on the target component tag', () => {
    const input = [
      "import { Button } from '@/components/ui/button';",
      '',
      'export function App() {',
      '  return (',
      '    <div>',
      '      <Button size="lg">A</Button>',
      '      <input size="lg" />',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');

    const out = rewriteFile(
      replacementTask({ sourceComponent: 'Button', targetComponent: 'Button' }),
      input,
      { propMappings: { size: 'scale' } } satisfies RewriteContext
    );

    expect(out).toContain('<Button scale="lg">');
    expect(out).toContain('<input size="lg" />');
  });
});
