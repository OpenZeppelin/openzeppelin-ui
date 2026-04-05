import { describe, expect, it } from 'vitest';

import { classifyImportSource, inferCompoundFamily, isLocalImport } from './import-classifier';

describe('classifyImportSource', () => {
  it('classifies relative imports', () => {
    expect(classifyImportSource('./Sidebar')).toBe('local-relative');
    expect(classifyImportSource('../ui/card')).toBe('local-relative');
    expect(classifyImportSource('./components/Button')).toBe('local-relative');
  });

  it('classifies alias imports', () => {
    expect(classifyImportSource('@/components/ui/button')).toBe('local-alias');
    expect(classifyImportSource('~/utils/helpers')).toBe('local-alias');
  });

  it('classifies scoped external packages', () => {
    expect(classifyImportSource('@radix-ui/react-tabs')).toBe('external-scoped');
    expect(classifyImportSource('@openzeppelin/ui-components')).toBe('external-scoped');
    expect(classifyImportSource('@acme/ui')).toBe('external-scoped');
  });

  it('classifies bare external packages', () => {
    expect(classifyImportSource('react')).toBe('external-bare');
    expect(classifyImportSource('lucide-react')).toBe('external-bare');
  });
});

describe('isLocalImport', () => {
  it('returns true for local kinds', () => {
    expect(isLocalImport('local-relative')).toBe(true);
    expect(isLocalImport('local-alias')).toBe(true);
  });

  it('returns false for external kinds', () => {
    expect(isLocalImport('external-scoped')).toBe(false);
    expect(isLocalImport('external-bare')).toBe(false);
  });
});

describe('inferCompoundFamily', () => {
  const families = new Set(['Card', 'Dialog', 'Sidebar', 'Tabs', 'Table', 'Select', 'Tooltip']);

  it('strips known suffixes to find a parent family', () => {
    expect(inferCompoundFamily('CardContent', families)).toBe('Card');
    expect(inferCompoundFamily('CardHeader', families)).toBe('Card');
    expect(inferCompoundFamily('CardTitle', families)).toBe('Card');
    expect(inferCompoundFamily('CardDescription', families)).toBe('Card');
    expect(inferCompoundFamily('DialogContent', families)).toBe('Dialog');
    expect(inferCompoundFamily('DialogFooter', families)).toBe('Dialog');
    expect(inferCompoundFamily('DialogTitle', families)).toBe('Dialog');
    expect(inferCompoundFamily('SidebarButton', families)).toBe('Sidebar');
    expect(inferCompoundFamily('SidebarLayout', families)).toBe('Sidebar');
    expect(inferCompoundFamily('SidebarSection', families)).toBe('Sidebar');
    expect(inferCompoundFamily('TabsList', families)).toBe('Tabs');
    expect(inferCompoundFamily('TabsContent', families)).toBe('Tabs');
    expect(inferCompoundFamily('TabsTrigger', families)).toBe('Tabs');
    expect(inferCompoundFamily('TableBody', families)).toBe('Table');
    expect(inferCompoundFamily('TableCell', families)).toBe('Table');
    expect(inferCompoundFamily('TableHead', families)).toBe('Table');
    expect(inferCompoundFamily('TableRow', families)).toBe('Table');
    expect(inferCompoundFamily('SelectContent', families)).toBe('Select');
    expect(inferCompoundFamily('SelectItem', families)).toBe('Select');
    expect(inferCompoundFamily('SelectTrigger', families)).toBe('Select');
    expect(inferCompoundFamily('SelectValue', families)).toBe('Select');
    expect(inferCompoundFamily('TooltipContent', families)).toBe('Tooltip');
    expect(inferCompoundFamily('TooltipProvider', families)).toBe('Tooltip');
    expect(inferCompoundFamily('TooltipTrigger', families)).toBe('Tooltip');
  });

  it('returns null for non-compound names', () => {
    expect(inferCompoundFamily('Button', families)).toBeNull();
    expect(inferCompoundFamily('Badge', families)).toBeNull();
    expect(inferCompoundFamily('Switch', families)).toBeNull();
  });

  it('returns null when the derived family is not in the known set', () => {
    expect(inferCompoundFamily('LoadingButton', families)).toBeNull();
    expect(inferCompoundFamily('AccountItem', families)).toBeNull();
    expect(inferCompoundFamily('RadioGroup', families)).toBeNull();
  });

  it('returns null for empty family after suffix stripping', () => {
    expect(inferCompoundFamily('Button', new Set(['']))).toBeNull();
    expect(inferCompoundFamily('Content', families)).toBeNull();
  });
});
