# DataTable — API Reference

Everything the data table exports from the main entry of `@openzeppelin/ui-components`:
one component, four runtime constants, and the types below. Helpers (`applyClientSort`,
`sliceClientPage`, `resolveVirtualization`, `resolveAriaRowCount`, spacer math, sentinel
key, `applicableRowKeys` / other `selection.ts` functions), the internal scroller / pager,
and **`chrome.ts` class tokens** are **not** barrel-exported. There is no `./data-table`
subpath. Restyle with `className` / `tableClassName` / `captionClassName` / column class
props.

```ts
import {
  DATA_TABLE_DEFAULT_ESTIMATE_SIZE,
  DATA_TABLE_DEFAULT_OVERSCAN,
  DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT,
  DATA_TABLE_SELECT_COLUMN_ID,
  DataTable,
} from '@openzeppelin/ui-components';
import type {
  DataTableAlign,
  DataTableClientPagination,
  DataTableColumn,
  DataTableInfiniteScroll,
  DataTableName,
  DataTablePagination,
  DataTablePaginationStatusInfo,
  DataTableProps,
  DataTableScrollToAlign,
  DataTableSelection,
  DataTableServerPagination,
  DataTableSortDirection,
  DataTableSortState,
  DataTableSortValue,
  DataTableVirtualization,
  DataTableVirtualizationHandle,
} from '@openzeppelin/ui-components';
```

- [`DataTable<Row>`](#datatablerow) — the component
- [`DataTableProps<Row>`](#datatablepropsrow) — its props
- [`DataTableName`](#datatablename) — the exactly-one-of accessible-name union
- [`DataTableColumn<Row>`](#datatablecolumnrow) — one column, declared as data
- [`DataTableAlign`](#datatablealign) — `'start' | 'end'`
- [`DataTableSortValue`](#datatablesortvalue) — what `getSortValue` may return
- [`DataTableSortDirection`](#datatablesortdirection) / [`DataTableSortState`](#datatablesortstate)
- [`DataTablePagination`](#datatablepagination) and related types
- [`DataTableInfiniteScroll`](#datatableinfinitescroll)
- [`DataTableVirtualization`](#datatablevirtualization) and handle / constants
- [`DataTableSelection<Row>`](#datatableselectionrow) and [`DATA_TABLE_SELECT_COLUMN_ID`](#data_table_select_column_id)
- [Rendered DOM contract](#rendered-dom-contract)
- [Accessible name resolution](#accessible-name-resolution)
- [Empty-state precedence](#empty-state-precedence)
- [Development diagnostics](#development-diagnostics)
- [Sort field combinations](#sort-field-combinations)
- [Paint pipeline](#paint-pipeline)

All types are exported with `export type`. A value import of any of them is a compile
error. The four `DATA_TABLE_*` constants are values.

---

## `DataTable<Row>`

```ts
function DataTable<Row>(props: DataTableProps<Row>): ReactElement;
```

A presentational, accessible data table. Renders `columns` against derived **body rows**
as a native `<table>` with a required accessible name, `<th scope="col">` headers, one
logical alignment per column, integrator-composed cells, optional sort chrome, optional
pagination chrome (Previous / Next, numbered buttons when the total is known), optional
append-intent (`infiniteScroll`), optional row windowing, optional kit-owned checkboxes
(`selection`), a sticky header unless opted out, and a single full-width empty row when
there are no body rows and empty chrome is shown.

It is a plain generic function component. `Row` is inferred from `columns` (declare them
with `satisfies readonly DataTableColumn<Row>[]`) and `rows` must be the same type. It is
not wrapped in `memo` and does not forward a `ref`.

Behaviour you can rely on:

- **Never throws for kit-owned paths.** Bad declarations render and log in development.
  A throwing `cell`, `getSortValue`, `estimateSize` function, `onSelectionChange`, or
  `getCheckboxLabel` propagates to your nearest error boundary.
- **Never fetches.** Page, sort, `onLoadMore`, and `onSelectionChange` callbacks are
  intents. `pagination.busy` and `infiniteScroll.busy` do not clear rows or the selected
  Set.
- **Never mutates `rows`, `columns`, or `selectedKeys`.** Client sort copies into
  `displayRows`. Client pagination slices that copy. Active infinite scroll skips client
  sort and does not slice. Virtualization indexes into `bodyRows`. Selection reports a
  **new** `Set`.
- **Uncontrolled sort is the only table-level React state.** Pagination and selection are
  always controlled. Virtualization scroll offset lives in the browser / virtualizer, not
  in your store.
- **Calls `cell` once per (mounted body row, column) per render.** Empty `bodyRows` →
  zero `cell` calls. `getSortValue` runs once per element of `rows` while deriving a
  client sort, even if the window later mounts fewer rows. The injected select column is
  extra paint, not a mutation of your `columns` array.
- **Attaches no handlers to table structure except sort buttons, the pager, and (when
  opted in) kit checkboxes.** It never calls `.focus()` on a data row. It never writes
  `scrollTop` on append. Clicks on other cells do not change the selected set. The pager
  may move focus inside the `<nav>` (current page button, Previous, Next, or the status
  node) when a control disables or a page-number button unmounts. It never focuses a
  row, cell, or header.
- **Is safe to server-render.** Firefox measurement policy is not applied during the
  parent render. A virtualized first paint may emit an `initialRect`-sized window.
- **Does not auto-virtualize** above any row count.
- **Does not auto-enable selection.** Omit `selection` → zero kit checkbox nodes.
- **Sticky header is on unless `stickyHeader={false}`.** Tokens land on header cells
  only. Unbounded wrappers do not pin to the document.

---

## `DataTableProps<Row>`

```ts
type DataTableProps<Row> = DataTableName & {
  readonly columns: readonly DataTableColumn<Row>[];
  readonly rows: readonly Row[];
  readonly getRowKey: (row: Row) => string;
  readonly selection?: DataTableSelection<Row>;
  readonly emptyState?: ReactNode;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly className?: string;
  readonly tableClassName?: string;
  readonly sort?: DataTableSortState | null;
  readonly defaultSort?: DataTableSortState | null;
  readonly onSortChange?: (next: DataTableSortState | null) => void;
  readonly pagination?: DataTablePagination;
  readonly infiniteScroll?: DataTableInfiniteScroll;
  readonly stickyHeader?: boolean;
  readonly virtualized?: boolean | DataTableVirtualization;
  readonly scrollRef?: Ref<HTMLDivElement | null>;
  readonly virtualizationRef?: Ref<DataTableVirtualizationHandle | null>;
};
```

### Fields

| Field               | Type                                         | Required | Description                                                                                                                                                                                                                                  |
| ------------------- | -------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `columns`           | `readonly DataTableColumn<Row>[]`            | yes      | Column declarations. Header and body cells are keyed by `column.id`.                                                                                                                                                                         |
| `rows`              | `readonly Row[]`                             | yes      | Rows the app holds. Client sort/page derive from this array; server pagination treats it as **already the current page**. `[]` means "no rows", never "loading". Empty chrome keys off derived `bodyRows`.                                   |
| `getRowKey`         | `(row: Row) => string`                       | yes      | Stable React key per row. Required; no index fallback. Must be unique within the mounted set. Virtualization item keys **and** `selection.selectedKeys` use this value.                                                                      |
| `selection`         | `DataTableSelection<Row>`                    | no       | Opt-in kit checkbox column. Omitted → today’s table. Always controlled. See [`DataTableSelection`](#datatableselectionrow).                                                                                                                  |
| `emptyState`        | `ReactNode`                                  | no       | Full replacement for the empty-row content. When set, `emptyTitle` / `emptyDescription` are ignored.                                                                                                                                         |
| `emptyTitle`        | `string`                                     | no       | Title for the default kit `EmptyState`. Default `'Nothing to show'`.                                                                                                                                                                         |
| `emptyDescription`  | `string`                                     | no       | Description for the default kit `EmptyState`. Default `'There are no rows to display.'`.                                                                                                                                                     |
| `className`         | `string`                                     | no       | Classes merged onto `div[data-slot="data-table"]`. The kit already paints `rounded-xl border bg-card`. Extra overflow / radius overrides win via `cn`. **Not** the first-frame height source when virtualized — use `virtualized.maxHeight`. |
| `tableClassName`    | `string`                                     | no       | Classes merged onto `<table>` (`table-fixed`). Not a density API.                                                                                                                                                                            |
| `sort`              | `DataTableSortState \| null`                 | no       | Controlled sort. **Presence of the key** (including `null`) means the app owns state. Omit the prop for uncontrolled kit state. `undefined` is treated as omitted.                                                                           |
| `defaultSort`       | `DataTableSortState \| null`                 | no       | Initial sort when `sort` is omitted. Ignored when `sort` is passed.                                                                                                                                                                          |
| `onSortChange`      | `(next: DataTableSortState \| null) => void` | no       | Fired after each sort activation with the next state (`null` on clear). Same event in controlled and uncontrolled mode. Not a fetch hook; you may refetch from it.                                                                           |
| `pagination`        | `DataTablePagination`                        | no       | When omitted, every `displayRows` element is a candidate to mount. When set, status + Previous / optional numbered pages / Next appear. Always controlled.                                                                                   |
| `infiniteScroll`    | `DataTableInfiniteScroll`                    | no       | When omitted, no end detection and no unknown-total ARIA. When set **without** `pagination`, append-intent is active. When set **with** `pagination`, ignored (pager-wins).                                                                  |
| `stickyHeader`      | `boolean`                                    | no       | Freeze header cells inside the kit scroll wrapper. **Default on:** omit or `true`. Pass `false` to restore a scrolling header. No-op when the wrapper is not a vertical scrollport. Does not pin body columns.                               |
| `virtualized`       | `boolean \| DataTableVirtualization`         | no       | Omitted / `false` → P1 path. `true` or `{}` → kit defaults. Object fields override individually. Does not change `DataTableColumn`. Does not auto-enable.                                                                                    |
| `scrollRef`         | `Ref<HTMLDivElement \| null>`                | no       | The kit scroll wrapper (`data-slot="data-table"`), the same node the virtualizer uses. Never the pagination root. `DataTable` itself is not `forwardRef`.                                                                                    |
| `virtualizationRef` | `Ref<DataTableVirtualizationHandle \| null>` | no       | `{ scrollToRowKey }` while virtualization is **active**; `null` when inactive (including empty).                                                                                                                                             |
| _name_              | `DataTableName`                              | yes      | Exactly one of `caption` (+ optional `captionClassName`), `aria-label`, or `aria-labelledby`.                                                                                                                                                |

There is no `isLoading`, `error`, top-level `page` / `pageSize` / `onPageChange`,
`onReachEnd` / `hasMore` / `infinite` (use `infiniteScroll`), `onRowClick`,
`rowClassName`, `rowHeight`, `multiSort`, `compare`, `onSort` (the callback is
`onSortChange`), top-level `selectedIds` / `onSelectionChange` (nest them under
`selection`; the callback is required **inside** that object), `density`, `variant`,
`chrome`, `rangeExtractor`, `measureElement`, `followOnAppend`, `siblingCount`, or
`ref` on `DataTable`. `stickyHeader` is a **table-level** prop, not a field of
`DataTableVirtualization`. Passing the absent names is a compile error.

---

## `DataTableName`

```ts
type DataTableName =
  | {
      readonly caption: ReactNode;
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
```

The table's accessible name. Exactly one branch may be supplied. Omitting all three, or
supplying two, is a type error. The same shape as `BottomSheetProps`' accessible name.

| Branch            | Renders                                                                                                                            | Use when                                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `caption`         | `<caption>` as the `<table>`'s first child. **Visually `sr-only` by default** (still the accessible name). No `mb-2` title spacer. | HTML-native name. Pass `captionClassName="not-sr-only mb-2 text-sm text-muted-foreground"` to show it. Do not use `hidden` / `display:none`. Prefer `aria-labelledby` when a heading already names the table. |
| `aria-labelledby` | `aria-labelledby` on `<table>`. No caption node.                                                                                   | **Preferred** when a visible heading already names the table (Role Manager). Pass that heading's `id`. The target must exist in the document.                                                                 |
| `aria-label`      | `aria-label` on `<table>`.                                                                                                         | No visible caption is wanted and no heading exists. Escape hatch.                                                                                                                                             |

Blank strings compile. They render an unnamed table and log once in development.

---

## `DataTableColumn<Row>`

```ts
interface DataTableColumn<Row> {
  readonly id: string;
  readonly header: ReactNode;
  readonly headerLabel?: string;
  readonly align?: DataTableAlign;
  readonly cell: (row: Row) => ReactNode;
  readonly sortable?: boolean;
  readonly getSortValue?: (row: Row) => DataTableSortValue;
  readonly headerClassName?: string;
  readonly cellClassName?: string;
}
```

A stateless declaration of one column. `Row` is unconstrained. Constructing a
`DataTableColumn` value mounts nothing.

Every field is `readonly` at the type level. Treat the array as immutable and replace it
rather than editing it in place.

### Fields

| Field             | Type                               | Required | Description                                                                                                                                                                                |
| ----------------- | ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`              | `string`                           | yes      | Stable column identity. React key on `<th>` / `<td>`. Never inferred from `header`. Must be unique within one array.                                                                       |
| `header`          | `ReactNode`                        | yes      | Visible header content. A string for ordinary labels, or an element such as a select-all `Checkbox`. Sort chrome **composes with** this node; it does not replace a non-string header.     |
| `headerLabel`     | `string`                           | no       | Accessible name of the column when `header` is not a non-blank string. Names the column, not a control inside `header`.                                                                    |
| `align`           | `DataTableAlign`                   | no       | Logical inline alignment of the header cell and every body cell together. Omitted means `'start'`. Sort chrome stays inside the same `<th>`.                                               |
| `cell`            | `(row: Row) => ReactNode`          | yes      | Composes the body cell for one **mounted** row. Returning `null`, `undefined`, or `''` paints an empty `<td>`.                                                                             |
| `sortable`        | `boolean`                          | no       | When `true`, the header offers a sort button. When omitted or `false`, the column must not look sortable. Valid without `getSortValue` (server / app-owned order).                         |
| `getSortValue`    | `(row: Row) => DataTableSortValue` | no       | Extracts a comparable value for client-side reorder. Inert unless `sortable` is `true`. Not called for unmounted rows' cells; called once per `rows` element while deriving a client sort. |
| `headerClassName` | `string`                           | no       | Class merged onto the `<th>`. Layout hint (`w-12`); not a resize API.                                                                                                                      |
| `cellClassName`   | `string`                           | no       | Class merged onto each `<td>` in this column.                                                                                                                                              |

There is no `accessorKey`, `field`, `width`, `selected`, `onSelect`, `pinned`,
`resizable`, grouped `columns`, `emptyCell`, `isLoading`, `error`, `scope`, `headers`,
`onSort`, or `ariaLabel` field. Identity is `id`, paint is `cell`. Kit-owned selection
lives on `DataTableProps.selection`, not on the column type. An app-owned `Checkbox`
column (including `id: 'select'`) remains valid when `selection` is omitted.

### Type inference

Declare arrays with `satisfies`, not a type annotation, so `row` is typed inside each
callback:

```ts
const columns = [
  { id: 'name', header: 'Name', cell: (row) => row.name },
] satisfies readonly DataTableColumn<{ name: string }>[];
```

---

## `DataTableAlign`

```ts
type DataTableAlign = 'start' | 'end';
```

Logical inline alignment. `'start'` is the default. `'end'` is the numeric and amount
edge. Physical `'left'` / `'right'` and `'center'` are not representable.

Emitted twice on every `<th>` and `<td>` of the column: class `text-start` or
`text-end`, and `data-align="start"` or `data-align="end"`. The attribute is the
contract; the class is guidance.

---

## `DataTableSortValue`

```ts
type DataTableSortValue = string | number | bigint | boolean | Date | null | undefined;
```

The only domain `getSortValue` may return. `null` and `undefined` mean "missing" and
**always sort last**, in both directions. Same runtime type: natural order (`localeCompare`
for strings, numeric `<`, bigint `<`, `false < true`, `Date` by `getTime()`). Differing
non-missing types use a deterministic tag order (`boolean < number < bigint < Date <
string`) and do not throw. A `ReactNode` is not a sort value.

---

## `DataTableSortDirection`

```ts
type DataTableSortDirection = 'asc' | 'desc';
```

Cleared sort is `null` **state**, not a third direction member.

---

## `DataTableSortState`

```ts
interface DataTableSortState {
  readonly columnId: string;
  readonly direction: DataTableSortDirection;
}
```

`columnId` is a `DataTableColumn.id`. `null` (the `sort` prop, or uncontrolled state
after the third click) means "rows order as given".

**Cycle** when the user activates a sortable column: other column or none →
`{ columnId, direction: 'asc' }` → `'desc'` → `null`.

If `sort` / `defaultSort` points at an unknown or unsortable `columnId`, the kit paints
rows as unsorted (no `aria-sort`) and logs once in development.

---

## `DataTablePagination`

```ts
type DataTablePagination = DataTableClientPagination | DataTableServerPagination;
```

`kind` is required so client vs server cannot be inferred from `rows.length` vs
`totalCount`.

Shared chrome (both kinds):

| Field             | Type                                              | Required | Description                                                                                                                                           |
| ----------------- | ------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pageIndex`       | `number`                                          | yes      | 0-based. Always controlled. Display copy is 1-based.                                                                                                  |
| `pageSize`        | `number`                                          | yes      | Rows per page. Non-finite or `<= 0` is treated as `1` (dev diagnostic).                                                                               |
| `onPageChange`    | `(pageIndex: number) => void`                     | yes      | Intent only. Fired from Previous, Next, or a page-number control. Never called for an out-of-range target, the already-current page, or while `busy`. |
| `busy`            | `boolean`                                         | no       | Disables Previous, Next, and every page-number button; sets `aria-busy` on the `<nav>`. Does not clear `rows`.                                        |
| `paginationLabel` | `string`                                          | no       | Accessible name of the `<nav>`. Default `'Pagination'`.                                                                                               |
| `previousLabel`   | `string`                                          | no       | Default `'Previous'`.                                                                                                                                 |
| `nextLabel`       | `string`                                          | no       | Default `'Next'`.                                                                                                                                     |
| `formatStatus`    | `(info: DataTablePaginationStatusInfo) => string` | no       | Override the visible + live status string. Empty return logs in development.                                                                          |

```ts
type DataTableClientPagination /* chrome */ = { readonly kind: 'client' };

type DataTableServerPagination /* chrome */ = {
  readonly kind: 'server';
  readonly totalCount?: number;
  readonly hasNextPage?: boolean;
};
```

- **`kind: 'client'`** — `rows` is the full in-memory list. The kit slices **sorted**
  `displayRows`. Status `totalCount` is `rows.length`. Total is always known, including
  an empty list (`pageCount` is `1`, one current page button `1`, Previous/Next
  disabled, status `'No rows'`).
- **`kind: 'server'`** — `rows` is already the current page. The kit does not slice and
  **does not client-reorder** that page. `totalCount` is optional. Finite `>= 0` is a
  known total (including `0` = empty dataset). Omit it, or pass a non-finite / negative
  value, when the query cannot supply a total: numbered buttons are suppressed, status
  uses the unknown path (`Page N`), and development logs once (`omitted` vs `invalid`).
  Extra rows beyond `pageSize` still render (dev log); missing rows are not invented.
- **`hasNextPage`** — server-only. Consulted **only** when the total is unknown. Omit →
  Next stays enabled (except `busy` / unusable `pageIndex`) so a cursor API can page
  until you pass `false`. Ignored when the total is known (a known last page still
  disables Next even if `hasNextPage` is `true`).

### Numbered page controls

When the total is known, the pager paints 1-based number buttons between Previous and
Next. Accessible name is the decimal string (`'11'`). `data-page-index` is 0-based. The
current page uses `aria-current="page"` and kit `Button` `variant="default"`; other
numbers are `outline`. That current button is **not** `disabled` (activation is a
no-op). Ellipsis is a non-button `span` (`aria-hidden`, not a tab stop).

Window (kit sibling count is `1`, not a public prop):

- `pageCount <= 7` → every page, no ellipsis (`1 2 3 4 5 6 7`).
- Otherwise always include first and last, the in-range current page, one neighbour on
  each side, and at most two ellipses. Examples at 20 pages: page 1 → `1 2 3 … 20`;
  page 11 → `1 … 10 11 12 … 20`; page 20 → `1 … 18 19 20`.
- Out-of-range `pageIndex` still clusters around a clamped display page so the list
  stays compact, but **no** button is added for the invalid index and **no**
  `aria-current` is set.

When the total is unknown, `data-table-pagination-pages` contains **only** Previous and
Next. The kit does not fabricate a last page.

There is no page-size `<select>`, dedicated first/last buttons (first and last numbers
are in the window when the total is known), exported `buildPageItems`, or uncontrolled
`pageIndex`.

### `DataTablePaginationStatusInfo`

```ts
interface DataTablePaginationStatusInfo {
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly totalCount: number | null;
  readonly pageCount: number | null;
  readonly from: number;
  readonly to: number;
  readonly rowCountOnPage: number;
  readonly totalKnown: boolean;
}
```

`totalKnown` is `true` iff numbered controls may be derived from `pageCount`. When the
dataset size is unknown, `totalCount` and `pageCount` are `null` and `from` / `to` stay
`0`. When known, `from` / `to` are 1-based inclusive indexes into the **dataset**, or
`0` / `0` when this page has no rows or `totalCount === 0`. `pageCount` is
`ceil(totalCount / pageSize)` (never a fabricated last page of an unknown set).

Default status copy (not a public function): `` `Page ${pageIndex + 1}` `` when
`totalKnown` is false; `'No rows'` when `totalCount === 0`; else
`` `Showing ${from}–${to} of ${totalCount}` `` (en dash).

---

## `DataTableInfiniteScroll`

```ts
interface DataTableInfiniteScroll {
  readonly hasMore: boolean;
  readonly onLoadMore: () => void;
  readonly busy?: boolean;
}
```

Always-controlled append-intent. The kit holds no feed, cursor, or query cache.

| Field        | Type         | Required | Description                                                                                                                                                                                               |
| ------------ | ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hasMore`    | `boolean`    | yes      | More rows exist beyond the current `rows` array. The kit does **not** infer this from array growth. While `true`, `aria-rowcount` is `-1`.                                                                |
| `onLoadMore` | `() => void` | yes      | Load-more intent. No cursor argument — the app already owns the next token. Called after paint / intersection / virtual last-index, never during render. A throwing callback reaches your error boundary. |
| `busy`       | `boolean`    | no       | Integrator is applying the previous intent. Suppresses re-entry, sets `aria-busy` on `div[data-slot="data-table"]`, does not clear `rows`, does not mount a kit spinner.                                  |

Deliberately absent: `totalCount`, `error`, `loadingLabel`, `rootMargin`, pixel
threshold, `enabled`, prepend / `followOutput`, `onLoadMore({ loadedCount })`.

**Pager-wins.** If `pagination` and `infiniteScroll` are both set, infinite is inert: no
sentinel, no `-1`, no `onLoadMore`, no infinite `aria-busy`. Development logs once:
`DataTable: pagination and infiniteScroll cannot be combined; infiniteScroll is ignored.`
The type still allows both keys so object spreads type-check; runtime does not throw.

**End detection** fires when infinite is active, `hasMore` is true, `busy` is false, this
`(hasMore, bodyRows.length)` generation has not already fired, and any of:

1. Virtualized: the last virtual item’s index is the last **data** index (or later).
2. IntersectionObserver on the hidden sentinel (`root` = kit wrapper if that node
   scrolls vertically, else the viewport).
3. Short first page: after paint, the wrapper does not overflow vertically (1px ε).

When `busy` falls and the table is still at the end (still short, or sentinel still
intersecting), another request is eligible so a viewport that never overflows can fill.
Scroll frames with the same length do not storm. Inline `onLoadMore` identity churn does
not reset the guard. `IntersectionObserver` disconnects on unmount.

In jsdom, a busy-clear on a still-short page can observe **two** `onLoadMore` calls for
the same length (generation reset plus the layout check). Treat `onLoadMore` as
idempotent; that is not a network storm.

---

## `DataTableVirtualization`

```ts
interface DataTableVirtualization {
  readonly estimateSize?: number | ((index: number) => number);
  readonly overscan?: number;
  readonly maxHeight?: number;
}
```

| Field          | Type                                    | Default | Description                                                                                                                                  |
| -------------- | --------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `estimateSize` | `number \| ((index: number) => number)` | `64`    | CSS pixels before (and on Firefox instead of) measuring the real `<tr>`. Matches `p-4` composed Role Manager rows.                           |
| `overscan`     | `number`                                | `8`     | Extra rows mounted above/below the viewport.                                                                                                 |
| `maxHeight`    | `number`                                | `384`   | Inline `style.maxHeight` on the kit wrapper and `initialRect.height`. `<= 0` / non-finite → `384`. Never applied as `height` or `minHeight`. |

`virtualized={true}` and `virtualized={{}}` are equivalent (all defaults). Virtualization
is **active** only when the prop opts in **and** `bodyRows.length > 0`.

There is no `enabled` threshold, public `rangeExtractor`, public `measureElement`,
`stickyHeader` on this object, or window-as-scroll-parent option. Sticky is
`DataTableProps.stickyHeader`.

### Constants

```ts
const DATA_TABLE_DEFAULT_ESTIMATE_SIZE = 64;
const DATA_TABLE_DEFAULT_OVERSCAN = 8;
const DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT = 384;
```

### `DataTableScrollToAlign`

```ts
type DataTableScrollToAlign = 'start' | 'center' | 'end' | 'auto';
```

### `DataTableVirtualizationHandle`

```ts
interface DataTableVirtualizationHandle {
  scrollToRowKey: (key: string, align?: DataTableScrollToAlign) => void;
}
```

Finds `key` in **`bodyRows`** via `getRowKey` and scrolls that index into view. Unknown
key: no-op (no throw). Omitted `align` uses `'auto'`. Scrolling does not fire
`onSortChange` or `onPageChange`.

---

## `DataTableSelection<Row>`

```ts
interface DataTableSelection<Row> {
  readonly selectedKeys: ReadonlySet<string>;
  readonly onSelectionChange: (next: ReadonlySet<string>) => void;
  readonly selectAllLabel?: string;
  readonly getCheckboxLabel?: (row: Row) => string;
  readonly columnHeaderLabel?: string;
}
```

Opt-in, always-controlled row selection. The kit holds no selected Set. Keys are
**only** `getRowKey(row)` taken from the row object at `bodyRows[index]` (the virtualizer
index is used solely to look that object up).

| Field               | Type                                  | Required | Description                                                                                                |
| ------------------- | ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `selectedKeys`      | `ReadonlySet<string>`                 | yes      | App-owned identities. Lookups are `.has(getRowKey(row))`.                                                  |
| `onSelectionChange` | `(next: ReadonlySet<string>) => void` | yes      | Next set after a row toggle or header action. Always a **new** `Set`. Not a fetch hook.                    |
| `selectAllLabel`    | `string`                              | no       | Accessible name of the **header control**. Default `'Select all'`.                                         |
| `getCheckboxLabel`  | `(row: Row) => string`                | no       | Accessible name of each **row** checkbox. Default `Select ${getRowKey(row)}`.                              |
| `columnHeaderLabel` | `string`                              | no       | Accessible **column** name (`aria-label` on the `th`). Visible header is the checkbox. Default `'Select'`. |

There is no `mode`, `isRowSelectable`, include/exclude union, `defaultSelectedKeys`, or
`keepNonExistentRowsSelected` flag (keep-non-existent is the default). English defaults
are kit-only; override for Role Manager (`'Select all accounts'`, address-based row
labels).

### `DATA_TABLE_SELECT_COLUMN_ID`

```ts
const DATA_TABLE_SELECT_COLUMN_ID = '__data-table-select';
```

`data-column-id` / React key of the injected column. Not a legal integrator
`DataTableColumn.id` **while `selection` is set**: collision logs once in development;
the kit column still paints first. Documented `id: 'select'` remains legal when kit
selection is off.

### Header tri-state

Applicable keys = unique `getRowKey` values of **`bodyRows`**, first-seen order
(duplicates collapse). Virtualized: still **all** `bodyRows`, not the mounted window.
Client page → that page; server page / infinite → the rows you passed. The kit cannot
select unseen backend rows.

| Applicable ∩ `selectedKeys`                     | Header `checked`  | `disabled` | Click                                                        |
| ----------------------------------------------- | ----------------- | ---------- | ------------------------------------------------------------ |
| `applicable.length === 0`                       | `false`           | `true`     | none                                                         |
| none of the applicable keys                     | `false`           | `false`    | union applicable into a copy of the Set                      |
| some but not all applicable keys                | `'indeterminate'` | `false`    | delete every applicable key; **keep** keys not in applicable |
| every applicable key (extra off-window keys OK) | `true`            | `false`    | same as mixed: subtract applicable                           |

Never use `selectedKeys.size === bodyRows.length` (equal-sized disjoint sets would
look like “all”). Extra off-window keys do **not** demote a fully selected current
window from checked to mixed.

The header handler ignores Radix’s boolean `checked` argument so mixed never “checks
all” as if it were unchecked. There is no third click that restores a previous
partial set.

### Kit `Checkbox` mixed glyph

When any `Checkbox` (table header or elsewhere) has `checked="indeterminate"`, the
indicator is `MinusIcon` (`data-slot="checkbox-indeterminate-icon"`), not `CheckIcon`.
The root uses selected tokens for indeterminate as well as checked. Unchecked has no
glyph. This is kit-wide.

---

## Paint pipeline

```ts
const skipClientSort = pagination?.kind === 'server' || infiniteActive;

const displayRows = skipClientSort ? rows : applyClientSort(rows, columns, effectiveSort);

const bodyRows =
  pagination?.kind === 'client'
    ? sliceClientPage(displayRows, pagination.pageIndex, pagination.pageSize)
    : displayRows;

// Virtualizer count === bodyRows.length when active and hasMore is false.
// Virtualizer count === bodyRows.length + 1 when infinite hasMore (sentinel index).
```

Sort, then page, then window. `infiniteActive` means `infiniteScroll` is set and
`pagination` is omitted. Combinations: virtualized + large client page; virtualized +
server page; virtualized + infinite. Pagination + infinite is **not** a combination —
pager-wins.

---

## Rendered DOM contract

Target parts by `data-slot`. Kit default chrome (Role Manager family) is a **closed**
class list on those slots: wrapper `rounded-xl border border-border bg-card`; caption
`sr-only`; `thead` `bg-muted/50 border-b`; header cells `p-4 font-medium
text-muted-foreground align-middle` plus, when sticky is on (the default),
`sticky top-0 z-20 bg-muted`; data cells `p-4 align-middle`; data rows `border-b
last:border-b-0 transition-colors hover:bg-accent/50` and a reserved
`data-[state=selected]:bg-accent/30` fill token. Other skeleton classes (`relative`,
`w-full`, `caption-top`, `text-sm`) are guidance. Alignment remains `text-start` /
`text-end`. The kit never adds `overflow-hidden` on the wrapper. `stickyHeader={false}`
emits **zero** sticky / inset / z tokens on header cells. Those sticky tokens are
internal (`chrome.ts`); they are not barrel-exported.

The scroll wrapper also sets `data-sticky-header="true"|"false"` (already-resolved:
omit/`true` → `"true"`). Header measurement for virtualization (`paddingStart`) is
independent of that flag.

When `selection` is set, header and body cell counts are `columns.length + 1`. Empty /
spacer / sentinel `colSpan` is `Math.max(paintColumns.length, 1)`. The injected column
is first (`data-column-id="__data-table-select"`). Integrator `columns` are not spliced.

Selected **data** rows (`data-slot="data-table-row"`) get `data-selected="true"` and
`data-state="selected"` iff `selectedKeys.has(getRowKey(row))`. Unselected data rows omit
both attributes (not `data-selected="false"`). Spacers, sentinel, and empty chrome never
receive them. There is no `aria-selected` on `<tr>` and no `role="grid"`.

### Unvirtualized, no pagination (P1)

```html
<div
  data-slot="data-table"
  data-sticky-header="true"
  class="{className} border-border bg-card relative w-full overflow-x-auto rounded-xl border"
>
  <table data-slot="data-table-table" class="{tableClassName} w-full caption-top text-sm">
    <caption data-slot="data-table-caption" class="{captionClassName} sr-only">
      …
    </caption>
    <!-- caption branch only; always first child; visually hidden unless not-sr-only -->
    <thead data-slot="data-table-head" class="bg-muted/50 border-b">
      <tr>
        <th
          scope="col"
          data-slot="data-table-header-cell"
          data-column-id="{column.id}"
          data-align="start|end"
          class="text-muted-foreground text-start|text-end bg-muted sticky top-0 z-20 p-4 align-middle font-medium"
          aria-label="{resolved column name, when needed}"
          aria-sort="ascending|descending"
        >
          <!-- sortable string header: <button type="button">{header}{icon}</button> -->
          <!-- sortable node header: {header}<button type="button" aria-label="Sort by …"> -->
          <!-- unsortable: {column.header} -->
          <!-- selection on: first th is checkbox-only, aria-label={columnHeaderLabel} -->
        </th>
      </tr>
    </thead>
    <tbody data-slot="data-table-body">
      <tr
        data-slot="data-table-row"
        data-row-key="{getRowKey(row)}"
        data-selected="true"
        data-state="selected"
        class="hover:bg-accent/50 border-b transition-colors last:border-b-0"
      >
        {/* one
        <td class="p-4 align-middle …">per paint column; leading select when opted in */}</td>
      </tr>
      <!-- or empty: -->
      <tr data-slot="data-table-empty">
        <td colspan="{max(paintColumns.length, 1)}" class="p-0">{empty chrome}</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Pagination on

```html
<div data-slot="data-table-root" class="flex flex-col gap-3">
  <!-- the wrapper + table above -->
  <nav data-slot="data-table-pagination" aria-label="Pagination" aria-busy="true">
    <p data-slot="data-table-pagination-status" tabindex="-1" aria-live="polite" aria-atomic="true">
      Showing 1–10 of 47
    </p>
    <div data-slot="data-table-pagination-pages">
      <button type="button" data-slot="data-table-pagination-previous">Previous</button>
      <button
        type="button"
        data-slot="data-table-pagination-page"
        data-page-index="0"
        aria-current="page"
      >
        1
      </button>
      <span data-slot="data-table-pagination-ellipsis" aria-hidden="true">…</span>
      <button type="button" data-slot="data-table-pagination-page" data-page-index="19">20</button>
      <button type="button" data-slot="data-table-pagination-next">Next</button>
    </div>
  </nav>
</div>
```

DOM order is status, then the pages group. `aria-busy` is set only when `busy` is true.
When the total is unknown, omit every `data-table-pagination-page` and ellipsis; keep
Previous, Next, and status (`Page N`). When `pagination` is omitted, **do not** wrap:
`data-slot="data-table"` remains the outermost kit node.

### Virtualization active (`bodyRows.length > 0` and `virtualized` opted in)

The wrapper uses `overflow-auto` (never `overflow-hidden`) and `style.maxHeight` equal to
the resolved pixel bound — never `height` or `minHeight`. `<table>` gets
`aria-rowcount="{1 + bodyRows.length}"`. The header `<tr>` gets `aria-rowindex="1"`.
Each real body row:

```html
<tr
  data-slot="data-table-row"
  data-row-key="{getRowKey(row)}"
  data-index="{indexInBodyRows}"
  aria-rowindex="{indexInBodyRows + 2}"
  data-selected="true"
  data-state="selected"
></tr>
```

Optional spacer rows (omitted at 0px height):

```html
<tr data-slot="data-table-spacer" data-spacer="top|bottom" aria-hidden="true">
  <td colspan="{max(paintColumns.length, 1)}" style="height: {n}px; padding: 0; border: 0"></td>
</tr>
```

Spacers have no `aria-rowindex` and no `data-row-key`. Height is on the `<td>`, never the
`<tr>`. Spacer / sentinel / empty rows **do not** receive data-row hover or hairline
chrome. No `translateY`, no `display:flex|grid` on table internals, no `role="grid"`, no
`aria-colcount`. When virtualization is **inactive** and infinite `hasMore` is false, all
of `aria-rowcount`, `aria-rowindex`, spacers, and kit `maxHeight` are omitted (APG:
partial indices are worse than none).

### Infinite scroll active (`pagination` omitted)

While `hasMore`:

- `<table aria-rowcount="-1">`. Header `<tr aria-rowindex="1">`. Every **real** body row
  has `aria-rowindex="{indexInBodyRows + 2}"` even when virtualization is off.
- Wrapper `aria-busy="true"` only while `infiniteScroll.busy` is true (never on a row or
  the sentinel).
- One sentinel as the last `<tbody>` child (or the only child when empty + `hasMore`):

```html
<tr
  data-slot="data-table-infinite-sentinel"
  data-row-key="__data-table-infinite-sentinel"
  aria-hidden="true"
>
  <td colspan="{max(paintColumns.length, 1)}" style="height: 1px; padding: 0; border: 0"></td>
</tr>
```

The sentinel is not `data-slot="data-table-row"`, has no `aria-rowindex`, no `tabIndex`,
no `column.cell`, and no visible "Loading more" text. When virtualized, TanStack `count`
is `bodyRows.length + 1`; the sentinel index uses estimate size `1`. Empty +
`virtualized` + `hasMore` still leaves the virtualizer inactive; the sentinel is a
normal tbody child.

When `hasMore` is false: sentinel unmounts. Unvirtualized tables return to omitted
rowcount/rowindex. Virtualized exhausted feeds use finite `aria-rowcount={1 + n}`.

No `aria-setsize` / `aria-posinset` on table rows.

Rules:

1. **Native semantics only.** No kit `role` on the skeleton. Never `role="grid"`.
2. **`aria-sort`** is `'ascending'` or `'descending'` only on the **active sortable**
   `<th>`. Cleared sort removes the attribute. Unsortable headers never get it.
3. **Header association is `scope="col"`.** Sort buttons live inside that `<th>`.
4. **One alignment token per column**, including while sorted.
5. **Empty keeps the table.** Only `<tbody>` children change. Empty + `virtualized` does
   not apply virtualized overflow / `maxHeight`.
6. **Keys.** Rows by `getRowKey(row)`, never the virtual index. Cells by `column.id`
   (select cells use `DATA_TABLE_SELECT_COLUMN_ID`). Selection lookups use the same key.
7. **The scroll parent is always `data-slot="data-table"`**, even inside
   `data-table-root`.

---

## Accessible name resolution

The table names each column by the first of these that applies:

1. `header`, if it is a non-blank string. The `<th>` gets no `aria-label` (the string,
   possibly inside the sort button, names the column).
2. `headerLabel`, if it is a non-blank string. Set as `aria-label` on the `<th>` unless
   the string header path already named it.
3. `id`. Set as `aria-label` on the `<th>`.

A sibling sort button (node headers) is named `Sort by {column name}` or
`Sort by {column name}, ascending|descending` while that column is active.

`headerLabel` names the **column**. Interactive nodes inside `header` or `cell` still
need their own names.

---

## Empty-state precedence

When `bodyRows.length === 0` **and** infinite is not suppressing chrome, the single empty
cell renders the first of:

1. `emptyState`, if provided.
2. Kit `EmptyState` with `size="small"`, `title={emptyTitle}`, `description={emptyDescription}`.
3. Defaults `'Nothing to show'` / `'There are no rows to display.'`.

While infinite is **active**, empty chrome follows this matrix:

| `bodyRows.length` | `busy`  | `hasMore` | Body chrome                                                    |
| ----------------- | ------- | --------- | -------------------------------------------------------------- |
| `> 0`             | any     | any       | Real data rows                                                 |
| `0`               | `true`  | any       | Suppress default and custom `emptyState`; empty `<td>` only    |
| `0`               | `false` | `true`    | Suppress empty chrome; sentinel mounted; `onLoadMore` eligible |
| `0`               | `false` | `false`   | Today’s empty row                                              |

Columns stay mounted. No kit spinner in `tbody`.

The kit `EmptyState` title is an `<h3>`.

---

## Development diagnostics

When `process.env.NODE_ENV !== 'production'`, `DataTable` logs through the kit logger
(`console.error` with a `DataTable` system tag) once per distinct issue per mounted
instance. Production builds log nothing. The table always renders; kit paths never throw.

| Condition                                                                | Message                                                                                                                |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `columns.length === 0`                                                   | `DataTable: received no columns.`                                                                                      |
| Two columns share an `id`                                                | `DataTable: duplicate column id "<id>".`                                                                               |
| Sortable column, no `getSortValue`, no `onSortChange`                    | `DataTable: column "<id>" is sortable without getSortValue and without onSortChange — sort will not change row order.` |
| `sort` / effective sort refers to unknown or unsortable id               | `DataTable: sort refers to unknown or unsortable column "<id>".`                                                       |
| Blank `caption` / `aria-label` / `aria-labelledby`                       | `DataTable: accessible name required — provide exactly one non-blank caption, aria-label or aria-labelledby.`          |
| `aria-labelledby` id missing from the document                           | `DataTable: aria-labelledby="<id>" does not match any element in the document.`                                        |
| Invalid `pagination.pageSize`                                            | `DataTable: pagination.pageSize is invalid; using 1.`                                                                  |
| Invalid server `totalCount`                                              | `DataTable: pagination.totalCount is invalid.`                                                                         |
| Server `totalCount` omitted                                              | `DataTable: pagination.totalCount is omitted; numbered pages are hidden.`                                              |
| Client `pageIndex` out of range                                          | `DataTable: pagination.pageIndex {n} is out of range for pageCount {n}.`                                               |
| Server `rows.length` > resolved `pageSize`                               | `DataTable: server pagination received {n} rows for pageSize {n}.`                                                     |
| `formatStatus` returned `''`                                             | `DataTable: pagination.formatStatus returned an empty string.`                                                         |
| Invalid `virtualized.maxHeight`                                          | `DataTable: virtualized.maxHeight is invalid; using 384.`                                                              |
| Active virtualization, wrapper `clientHeight === 0`                      | `DataTable: virtualized scroll parent has no height; set virtualized.maxHeight.`                                       |
| `pagination` and `infiniteScroll` both set                               | `DataTable: pagination and infiniteScroll cannot be combined; infiniteScroll is ignored.`                              |
| Infinite active and a column is `sortable` with `getSortValue`           | `DataTable: client sort is inert while infiniteScroll is active; row order stays as given.`                            |
| Integrator `column.id` is `__data-table-select` while `selection` is set | `DataTable: column id "__data-table-select" is reserved while selection is enabled.`                                   |

Not diagnosed: duplicate `getRowKey` (React's own warning), a throwing `cell` /
`getSortValue` / `onSelectionChange` / `getCheckboxLabel` (propagates). The
`aria-labelledby` check runs once after mount.

---

## Sort field combinations

| `sortable`        | `getSortValue` | Result                                                                                                                            |
| ----------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| omitted / `false` | omitted        | Not sortable.                                                                                                                     |
| omitted / `false` | present        | Not sortable. The getter is inert.                                                                                                |
| `true`            | present        | Sortable. Client reorder of the provided `rows` (skipped entirely when `pagination.kind === 'server'` **or** infinite is active). |
| `true`            | omitted        | Sortable by intent. Reports `onSortChange`; keeps rendering the rows you passed.                                                  |
