/** Internal default chrome contract for the DataTable skeleton (INV-28, INV-213). */
export const DATA_TABLE_WRAPPER_CHROME = 'rounded-xl border border-border bg-card';

/** Bordered card owner when toolbar or in-frame pagination is enabled. */
export const DATA_TABLE_FRAME_CHROME = 'overflow-hidden rounded-xl border border-border bg-card';

export const DATA_TABLE_CAPTION_CHROME = 'sr-only';

export const DATA_TABLE_HEAD_CHROME = 'bg-muted/50 border-b';

export const DATA_TABLE_HEADER_CELL_CHROME = 'p-4 font-medium text-muted-foreground align-middle';

/**
 * Narrow INV-36 exception for default-on sticky header cells (INV-262, INV-266).
 * Opaque `color-mix` matches thead `bg-muted/50` over the card so virtualized rows
 * cannot show through and the band is not darker than Role Manager’s original.
 */
export const DATA_TABLE_HEADER_CELL_STICKY_CHROME =
  'sticky top-0 z-20 bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]';

export const DATA_TABLE_CELL_CHROME = 'p-4 align-middle';

export const DATA_TABLE_ROW_CHROME =
  'border-b last:border-b-0 transition-colors hover:bg-accent/50 data-[state=selected]:bg-accent/30';

/** Outer wrap when pagination is on (`data-slot="data-table-root"`). INV-238 / INV-214 */
export const DATA_TABLE_PAGINATION_ROOT_CHROME = 'flex flex-col gap-3';

/**
 * Pagination `<nav>` layout. `relative` contains the absolute `sr-only` status so a
 * controls-only pager cannot extend document scroll height. Must not include sticky or
 * header-band tokens. INV-238 / INV-342 / INV-356
 */
export const DATA_TABLE_PAGINATION_CHROME =
  'relative flex flex-wrap items-center justify-between gap-3';

/** Footer treatment when pagination is hosted inside the bordered frame. */
export const DATA_TABLE_PAGINATION_INSIDE_CHROME = 'border-t px-4 py-3';

/** Controls-only pagination aligns its visible controls to the end. */
export const DATA_TABLE_PAGINATION_HIDDEN_STATUS_CHROME = 'justify-end';

/** Previous + optional numbers/ellipsis + Next. INV-237 */
export const DATA_TABLE_PAGINATION_PAGES_CHROME = 'flex flex-wrap items-center gap-1';

/** Gap between lucide chevron and Previous/Next label (Role Manager pager parity). */
export const DATA_TABLE_PAGINATION_NEIGHBOUR_CHROME = 'gap-1';

/** Decorative chevron on Previous/Next. Size matches lucide `h-4 w-4`. */
export const DATA_TABLE_PAGINATION_NEIGHBOUR_ICON_CHROME = 'size-4 shrink-0';
