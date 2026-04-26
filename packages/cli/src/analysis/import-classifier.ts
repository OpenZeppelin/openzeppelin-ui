export type ImportSourceKind =
  | 'local-relative'
  | 'local-alias'
  | 'external-scoped'
  | 'external-bare';

/**
 *
 */
export function classifyImportSource(source: string): ImportSourceKind {
  if (source.startsWith('./') || source.startsWith('../')) return 'local-relative';
  if (source.startsWith('@/') || source.startsWith('~/')) return 'local-alias';
  if (source.startsWith('@') && source.includes('/')) return 'external-scoped';
  return 'external-bare';
}

/**
 *
 */
export function isLocalImport(kind: ImportSourceKind): boolean {
  return kind === 'local-relative' || kind === 'local-alias';
}

const COMPOUND_SUFFIXES = [
  'Description',
  'Content',
  'Header',
  'Footer',
  'Trigger',
  'Separator',
  'Provider',
  'Section',
  'Layout',
  'Title',
  'Label',
  'Group',
  'Value',
  'Item',
  'List',
  'Body',
  'Cell',
  'Head',
  'Row',
  'Button',
] as const;

/**
 * Infers a compound component's parent family from naming conventions.
 * E.g. `CardContent` → `Card`, `TabsList` → `Tabs`, `SidebarButton` → `Sidebar`.
 * Returns null if no known family is found.
 */
export function inferCompoundFamily(
  componentName: string,
  knownFamilies: ReadonlySet<string>
): string | null {
  for (const suffix of COMPOUND_SUFFIXES) {
    if (!componentName.endsWith(suffix)) continue;
    const family = componentName.slice(0, -suffix.length);
    if (family && knownFamilies.has(family)) return family;
  }
  return null;
}
