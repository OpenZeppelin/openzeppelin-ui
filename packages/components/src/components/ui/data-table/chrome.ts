/** Internal default chrome contract for the DataTable skeleton (INV-28, INV-213). */
export const DATA_TABLE_WRAPPER_CHROME = 'rounded-xl border border-border bg-card';

export const DATA_TABLE_CAPTION_CHROME = 'sr-only';

export const DATA_TABLE_HEAD_CHROME = 'bg-muted/50 border-b';

export const DATA_TABLE_HEADER_CELL_CHROME = 'p-4 font-medium text-muted-foreground align-middle';

/** Narrow INV-36 exception for default-on sticky header cells (INV-262, INV-266). */
export const DATA_TABLE_HEADER_CELL_STICKY_CHROME = 'sticky top-0 z-20 bg-muted';

export const DATA_TABLE_CELL_CHROME = 'p-4 align-middle';

export const DATA_TABLE_ROW_CHROME =
  'border-b last:border-b-0 transition-colors hover:bg-accent/50 data-[state=selected]:bg-accent/30';

/** Outer wrap when pagination is on (`data-slot="data-table-root"`). INV-238 / INV-214 */
export const DATA_TABLE_PAGINATION_ROOT_CHROME = 'flex flex-col gap-3';

/** Pagination `<nav>` layout. Must not include sticky or header-band tokens. INV-238 */
export const DATA_TABLE_PAGINATION_CHROME = 'flex flex-wrap items-center justify-between gap-3';

/** Previous + optional numbers/ellipsis + Next. INV-237 */
export const DATA_TABLE_PAGINATION_PAGES_CHROME = 'flex flex-wrap items-center gap-1';
