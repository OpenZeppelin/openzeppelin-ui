import type { ReactNode, Ref } from 'react';

/**
 * Logical inline alignment for a column’s header and cells.
 * Default when omitted: `'start'`. `'end'` is the numeric/amount edge (issue #236).
 * Physical `left` / `right` are not representable so RTL still puts numerics on the end edge.
 * `'center'` is not in v1.
 *
 * INV-3: the same value applies to header and body cells; omitted means start at the renderer.
 */
export type DataTableAlign = 'start' | 'end';

/**
 * Values SF-3 may compare for client-side sort.
 * Includes `bigint` because kit consumers commonly hold token amounts as bigint.
 * `null` / `undefined` mean “missing”; SF-3 owns empty-value ordering.
 * Server-sorted tables may omit `getSortValue` entirely.
 *
 * INV-12: this alias is the only comparable domain for `getSortValue`.
 */
export type DataTableSortValue = string | number | bigint | boolean | Date | null | undefined;

/**
 * Column-as-data declaration. Stateless. Does not render a table (INV-1).
 *
 * `Row` is unconstrained (INV-8). Identity is `id`, never `row[field]`,
 * so display / actions / checkbox columns are first-class (INV-6).
 *
 * Required: `id`, `header`, `cell`. Optional: `headerLabel`, `align`,
 * `sortable`, `getSortValue`, `headerClassName`, `cellClassName` (INV-7).
 * No selection / pin / resize / fetch / empty-state fields (INV-9, INV-18, INV-20, INV-23).
 */
export interface DataTableColumn<Row> {
  /**
   * Stable column identity. React key; association token if SF-2 uses id/headers.
   * Required; never inferred from header text (INV-6). Duplicate ids are an
   * integrator error, not an SF-1 throw (INV-13). Downstream keys by `id` (INV-22).
   */
  readonly id: string;

  /**
   * Visible header. String for ordinary labels; `ReactNode` for composed
   * headers (e.g. kit `Checkbox` master toggle). App owns selection state (INV-9).
   * SF-3 may compose sort chrome with this node; it must not replace it (INV-5).
   * Accessible column name: non-empty string `header`, else `headerLabel`, else `id` (INV-25).
   */
  readonly header: ReactNode;

  /**
   * Accessible column name when `header` is not a non-empty string
   * (checkbox-only, icon-only, or custom markup).
   * Names the column, not an interactive control inside `header` (INV-27).
   * Must not encode HTML `scope` / `headers` markup (INV-26).
   */
  readonly headerLabel?: string;

  /**
   * Applied to header and cells together. Default `'start'` (INV-3).
   */
  readonly align?: DataTableAlign;

  /**
   * Cell composition for one row. Called by the renderer only for mounted
   * rows (INV-16, INV-17). Must not assume every data row is mounted.
   * Return `null` / `undefined` / `''` → SF-2 paints an empty cell (INV-4, INV-24).
   * Do not throw for missing values. Not a cell-type enum (INV-2). Not a
   * prebuilt all-rows `ReactNode[]` (INV-19).
   */
  readonly cell: (row: Row) => ReactNode;

  /**
   * When true, `DataTable` offers a sort affordance (INV-11 / INV-61).
   * When omitted or false, the column must not look sortable.
   * Valid without `getSortValue` (server / app-owned order — INV-10 / INV-84).
   */
  readonly sortable?: boolean;

  /**
   * Extract a comparable value for client-side reorder of the provided rows.
   * Unused when the app owns order: set `sortable: true` and omit this (INV-10).
   * Present but inert unless `sortable === true` (INV-11 / INV-61).
   * Invoked only while deriving client-sorted display rows (INV-16 / INV-76).
   */
  readonly getSortValue?: (row: Row) => DataTableSortValue;

  /**
   * Optional class on the header cell (e.g. Role Manager `w-12`).
   * Layout only — not column resize (INV-14).
   */
  readonly headerClassName?: string;

  /**
   * Optional class on each body cell in this column.
   * Layout only — not column resize (INV-14).
   */
  readonly cellClassName?: string;
}

/**
 * The table’s accessible name. Exactly one branch may be supplied
 * (same exactly-one-of shape as `BottomSheetProps`’ AccessibleName).
 *
 * - `caption`: rendered as the `<table>`’s first child `<caption>`. HTML-native name;
 *   the one screen-reader “tables mode” users navigate by. Visually hidden by
 *   default so it does not become a title inside the bordered table wrapper.
 *   Pass `captionClassName="not-sr-only"` (plus visible type styles) to show it.
 * - `aria-label`: string name on `<table>` when no visible caption is wanted and no
 *   on-page heading exists (tokenization console escape hatch).
 * - `aria-labelledby`: id of an existing visible heading that names the table.
 *
 * INV-29, INV-38: two branches on one table is a type error; blank names diagnose, never throw.
 */
export type DataTableName =
  | {
      readonly caption: ReactNode;
      /** Classes merged onto `<caption>`. Use `'not-sr-only'` to show the default-hidden caption. */
      readonly captionClassName?: string;
      readonly 'aria-label'?: undefined;
      readonly 'aria-labelledby'?: undefined;
    }
  | {
      readonly 'aria-label': string;
      readonly caption?: undefined;
      readonly captionClassName?: undefined;
      readonly 'aria-labelledby'?: undefined;
    }
  | {
      readonly 'aria-labelledby': string;
      readonly caption?: undefined;
      readonly captionClassName?: undefined;
      readonly 'aria-label'?: undefined;
    };

/**
 * Sort direction for the active column. Cleared sort is `null` state, not a
 * third direction member (INV-69).
 */
export type DataTableSortDirection = 'asc' | 'desc';

/**
 * The table’s current sort. `columnId` is a `DataTableColumn.id`.
 * `null` means “rows order as given”.
 */
export interface DataTableSortState {
  readonly columnId: string;
  readonly direction: DataTableSortDirection;
}

/**
 * Numbers the status formatter and tests use. `from`/`to` are 1-based inclusive
 * display indexes into the dataset, or `0`/`0` when this page has no rows.
 * When the dataset size is unknown, `totalCount` / `pageCount` are `null` and
 * `from`/`to` stay `0` (INV-243).
 */
export interface DataTablePaginationStatusInfo {
  readonly pageIndex: number;
  readonly pageSize: number;
  /**
   * Dataset size when known. `null` when the app did not supply a usable
   * server `totalCount` (unknown total). Client kind always passes `rows.length`.
   */
  readonly totalCount: number | null;
  /**
   * `ceil(totalCount / pageSize)` when `totalKnown`; otherwise `null`.
   * Never a fabricated last page.
   */
  readonly pageCount: number | null;
  readonly from: number;
  readonly to: number;
  readonly rowCountOnPage: number;
  /** `true` iff numbered controls may be derived from `pageCount`. INV-239 */
  readonly totalKnown: boolean;
}

type DataTablePaginationChrome = {
  /**
   * 0-based index of the current page. Always controlled — the kit holds no
   * page React state. Display copy is 1-based (`pageIndex + 1`).
   */
  readonly pageIndex: number;

  /** Rows per page. Non-finite or `<= 0` is treated as `1` (dev diagnostic). */
  readonly pageSize: number;

  /**
   * Page-intent callback. Invoked with the requested 0-based index when the
   * user activates Previous, Next, or a page-number control. Never invoked
   * for an out-of-range target, for the already-current page, or while busy.
   * The kit does not fetch.
   */
  readonly onPageChange: (pageIndex: number) => void;

  /**
   * Integrator is applying a page change (typical server refetch). Disables
   * Previous, Next, and every page-number button, and sets `aria-busy` on the
   * nav. Does not clear `rows`, does not show a kit spinner, does not mean
   * `rows=[]`. INV-248
   */
  readonly busy?: boolean;

  /** Accessible name of the `<nav>`. Default `'Pagination'`. */
  readonly paginationLabel?: string;

  /** Previous button text. Default `'Previous'`. */
  readonly previousLabel?: string;

  /** Next button text. Default `'Next'`. */
  readonly nextLabel?: string;

  /** Override the visible + live status string. Default: see `defaultPaginationStatus`. */
  readonly formatStatus?: (info: DataTablePaginationStatusInfo) => string;
};

/**
 * Client-held: `rows` is the full in-memory list. The kit slices it for the
 * body loop. `totalCount` is `rows.length`.
 */
export type DataTableClientPagination = DataTablePaginationChrome & {
  readonly kind: 'client';
};

/**
 * Server-held: `rows` is already the current page. The kit does not slice.
 * `totalCount` is the dataset size the app knows (may exceed `rows.length`).
 * Omit it (or pass a non-finite / negative value) when the query cannot
 * supply a total — numbered buttons are then suppressed (INV-232 / INV-239).
 */
export type DataTableServerPagination = DataTablePaginationChrome & {
  readonly kind: 'server';
  /**
   * Dataset size the app knows. **Optional.** Omit (or pass non-finite / `< 0`)
   * when the query cannot supply a total — numbered buttons are then suppressed.
   * Finite `>= 0` is a known total (including `0` = empty dataset).
   */
  readonly totalCount?: number;
  /**
   * Whether a page after `pageIndex` exists. Consulted **only** when total is
   * unknown. Ignored when `totalKnown`. Omit → Next stays enabled (except busy /
   * unusable index) so cursor APIs can page until the app sets `false`. INV-244
   */
  readonly hasNextPage?: boolean;
};

export type DataTablePagination = DataTableClientPagination | DataTableServerPagination;

/**
 * Opt-in append-intent. Always controlled — the kit holds no feed, cursor, or
 * query cache. Omitted → today’s table. Orthogonal to `virtualized`.
 * Not combinable with `pagination` in v1 (pager wins at runtime). INV-154
 */
export interface DataTableInfiniteScroll {
  /**
   * More rows exist beyond the current `rows` array. While true, AT is told
   * the table size is unknown (`aria-rowcount="-1"`). INV-171
   */
  readonly hasMore: boolean;

  /**
   * Load-more intent. The kit does not fetch and does not pass a cursor —
   * the app already knows its next page token. Invoked at most once per
   * `(hasMore, bodyRows.length)` generation while `busy` is false. INV-160
   */
  readonly onLoadMore: () => void;

  /**
   * Integrator is applying the previous intent (typical refetch). Suppresses
   * re-entry, sets `aria-busy` on the scroll wrapper, does not clear `rows`,
   * does not mount a kit spinner, does not mean `rows=[]`. INV-168
   */
  readonly busy?: boolean;
}

/** Stable identity of the kit-injected row-selection column (INV-182). */
export const DATA_TABLE_SELECT_COLUMN_ID = '__data-table-select';

/**
 * Opt-in controlled row selection. The app owns the selected identities; the
 * table paints checkboxes and reports immutable set transitions (INV-183).
 */
export interface DataTableSelection<Row> {
  /** Selected identities, keyed exclusively by `getRowKey(row)` (INV-184). */
  readonly selectedKeys: ReadonlySet<string>;

  /** Receives a new set after a row or header checkbox transition (INV-188). */
  readonly onSelectionChange: (next: ReadonlySet<string>) => void;

  /** Accessible name for the header checkbox. Default: `'Select all'`. */
  readonly selectAllLabel?: string;

  /** Accessible name for a row checkbox. Default: `Select ${getRowKey(row)}`. */
  readonly getCheckboxLabel?: (row: Row) => string;

  /** Accessible name for the injected column. Default: `'Select'`. */
  readonly columnHeaderLabel?: string;
}

/** Kit default estimate: SF-9 `p-4` composed rows are approximately 64px. INV-140 */
export const DATA_TABLE_DEFAULT_ESTIMATE_SIZE = 64;

/** Overscan in row units. Mid of Research’s 5–10 band. INV-140 */
export const DATA_TABLE_DEFAULT_OVERSCAN = 8;

/**
 * Wrapper `max-height` (CSS px) when virtualization is on and the integrator
 * does not pass `maxHeight`. Gives `initialRect` a known height on frame one.
 * INV-123 / INV-140
 */
export const DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT = 384;

export type DataTableScrollToAlign = 'start' | 'center' | 'end' | 'auto';

/**
 * Kit-owned imperative surface. Does not re-export TanStack’s `Virtualizer` type.
 * INV-127
 */
export interface DataTableVirtualizationHandle {
  /** Scroll so the row with this `getRowKey` is in view. No-op if the key is not in `bodyRows`. */
  scrollToRowKey: (key: string, align?: DataTableScrollToAlign) => void;
}

/**
 * Opt-in window configuration. Omitted fields take the kit defaults above.
 * INV-123: no `enabled` threshold, public `rangeExtractor`, `measureElement`,
 * or `stickyHeader`; sticky is a table-level prop.
 */
export interface DataTableVirtualization {
  /**
   * Estimated row height in CSS pixels, or per-index. Used before (and on Firefox
   * instead of) `measureElement`.
   */
  readonly estimateSize?: number | ((index: number) => number);

  /** Extra rows mounted above/below the viewport. */
  readonly overscan?: number;

  /**
   * Bounded height of the kit scroll wrapper, in CSS pixels.
   * Applied as `style.maxHeight` on `data-slot="data-table"` and as
   * `initialRect.height`. Integrators who need a different bound pass this;
   * they must not rely on `className` alone for the first-frame window.
   */
  readonly maxHeight?: number;
}

/**
 * Props for the presentational kit table. The table does not fetch or own the
 * selected Set. It may paint and report controlled selection, and never mutates
 * the integrator’s `rows` array; it may derive
 * a display order when the active column is sortable and has `getSortValue`,
 * and a page window when `pagination.kind === 'client'`.
 * `Row` is unconstrained (INV-8, INV-41).
 *
 * INV-39 / INV-66 / INV-99 / INV-124 / INV-154: `sort`, `defaultSort`,
 * `onSortChange`, `pagination`, `infiniteScroll`, `stickyHeader`, `virtualized`,
 * `scrollRef`, `virtualizationRef`, and `selection` are legal. Pagination ∩ infinite
 * is pager-wins (INV-112), not a type XOR. Top-level `page` / `pageSize` /
 * `onPageChange`, plus `isLoading`, top-level selection aliases, `ref` on `DataTable`
 * itself, `onSort`, `multiSort`, `compare`, `rowHeight`, remain excess-property errors.
 */
export type DataTableProps<Row> = DataTableName & {
  /** SF-1 column declarations. Keyed by `column.id` (INV-22). */
  readonly columns: readonly DataTableColumn<Row>[];

  /**
   * The rows the integrator provided. Paint pipeline: `rows` → `displayRows`
   * (`applyClientSort`, skipped for `pagination.kind === 'server'` **or**
   * active infinite — INV-155) → `bodyRows` (client `sliceClientPage`,
   * otherwise `displayRows`). When infinite is active, `bodyRows === rows`
   * (INV-156). SF-4 windows `bodyRows`.
   * `cell` is called once per mounted body row (INV-16, INV-48, INV-78, INV-97).
   * An empty `rows` array means “no rows”, not “loading” (INV-54) unless
   * infinite is active and the first chunk is in flight or `hasMore` (INV-152).
   * Empty-state keys off `bodyRows.length === 0` when empty chrome is shown
   * (INV-65 / INV-98).
   */
  readonly rows: readonly Row[];

  /** Stable React key per row. Required: index keys break SF-5/SF-6 focus survival (INV-41). */
  readonly getRowKey: (row: Row) => string;

  /** Optional kit-owned checkbox chrome backed by app-controlled identities (INV-176). */
  readonly selection?: DataTableSelection<Row>;

  /**
   * Full replacement for the empty-row content (e.g. Role Manager’s “Add account”
   * action). When set, `emptyTitle` / `emptyDescription` are ignored (INV-55).
   * Rendered inside the single `colSpan` cell; the table, caption and header row stay mounted.
   */
  readonly emptyState?: ReactNode;

  /** Title for the default kit `EmptyState`. Default `'Nothing to show'`. */
  readonly emptyTitle?: string;

  /** Description for the default kit `EmptyState`. Default `'There are no rows to display.'`. */
  readonly emptyDescription?: string;

  /** Classes merged onto the scroll wrapper `<div>` (width, max-height, borders). INV-37. */
  readonly className?: string;

  /** Classes merged onto `<table>` (e.g. `table-fixed`, density tweaks). INV-37. */
  readonly tableClassName?: string;

  /**
   * Controlled sort. Presence of the key (including `null`) means the app owns
   * state (INV-66). Omit the prop for uncontrolled kit state.
   * `undefined` is treated as omitted.
   */
  readonly sort?: DataTableSortState | null;

  /** Initial sort when `sort` is omitted. Ignored when `sort` is passed (INV-66). */
  readonly defaultSort?: DataTableSortState | null;

  /**
   * Fired after each sort activation with the next state (`null` on clear).
   * Same event in controlled and uncontrolled mode (INV-71). Not a fetch hook (INV-83).
   */
  readonly onSortChange?: (next: DataTableSortState | null) => void;

  /**
   * When omitted, every element of `displayRows` is mounted (SF-2/SF-3).
   * When set, a pager appears (status + Previous / optional page numbers / Next);
   * `kind` chooses slice vs pass-through. Always controlled — the kit never
   * stores `pageIndex` (INV-99). Numbered buttons exist only when the total is known.
   */
  readonly pagination?: DataTablePagination;

  /**
   * When omitted, no end detection and no unknown-total ARIA.
   * When set and `pagination` is omitted, append-intent is active.
   * When set **and** `pagination` is set, infinite is ignored (pager-wins, INV-112 / INV-149).
   */
  readonly infiniteScroll?: DataTableInfiniteScroll;

  /**
   * Freeze header cells inside the table scroll wrapper when it has vertical overflow.
   * Omitted or `true` enables sticky headers; `false` restores a scrolling header.
   * This does not pin body columns or make an unbounded table sticky to the page.
   * INV-272
   */
  readonly stickyHeader?: boolean;

  /**
   * Opt-in row virtualization. Omitted / `false` → P1 path (no rowcount, no spacers,
   * wrapper stays `overflow-x-auto` only). `true` → kit defaults. Object → defaults
   * with overrides. Does not change `DataTableColumn`. Does not auto-enable above N rows.
   * INV-114 / INV-115 / INV-123
   */
  readonly virtualized?: boolean | DataTableVirtualization;

  /**
   * Ref to the kit scroll wrapper (`data-slot="data-table"`). Same node
   * `getScrollElement` uses. Additive; `DataTable` is not `forwardRef`. INV-129
   */
  readonly scrollRef?: Ref<HTMLDivElement | null>;

  /** Imperative `scrollToRowKey`. Null when virtualization is inactive. INV-128 */
  readonly virtualizationRef?: Ref<DataTableVirtualizationHandle | null>;
};
