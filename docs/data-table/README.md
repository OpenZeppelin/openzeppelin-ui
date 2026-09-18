# DataTable

> Declare a table's columns as data, pass the rows you already hold, and get a real HTML
> table: a required accessible name, headers tied to cells, a sticky header by default,
> logical alignment, composed cells, client or server-intent sorting, optional pagination
> with numbered page controls, optional infinite scroll, optional row virtualization,
> optional identity-keyed row selection, and an empty state that never unmounts the table.

## Overview

`DataTable<Row>` is the kit's presentational table. You give it an array of
`DataTableColumn<Row>` objects, an array of rows, a function that returns a stable key per
row, and exactly one accessible name. It renders a native `<table>`. It never fetches.
Sorting, pagination, infinite scroll, virtualization, and row selection are **optional,
additive props on this same component** — not a second table, not a mode enum, and not a
subpath import. Pagination and infinite scroll are not a merged window: if you pass both,
the pager wins and `infiniteScroll` is ignored. Selection is off unless you pass
`selection`; existing tables do not grow a checkbox column. Header cells stay in view
inside the table scroll wrapper unless you pass `stickyHeader={false}`.

The table is for anyone in an app built on `@openzeppelin/ui-components` who is about to
hand-write `<th>`/`<td>` for one more screen. The same column array works for a ten-row
form table and for a 10,000-row virtualized list. Default chrome matches Role Manager
Accounts / Role Changes: a rounded bordered card, muted header band, hairline row
dividers, `p-4` cells, and row hover. Search bars, filters, and page titles stay in your
app.

The single most important integration point is still the column's `cell` function,
`(row) => ReactNode`. That is where `Badge`, `AddressDisplay`, `Button`, `OverflowMenu`,
`Checkbox` and every other kit piece enter the table. The second is the accessible name:
`caption`, `aria-label`, or `aria-labelledby`. One of them is required at the type level,
and two at once is a compile error. A `caption` is visually hidden by default so it does
not become a title inside the card.

## Quick Start

```bash
pnpm add @openzeppelin/ui-components
```

`DataTable` ships on the package's main entry. Virtualization pulls
`@tanstack/react-virtual` as a regular dependency of the kit; you do not install it
yourself and you do not import a `./data-table` subpath.

```tsx
import {
  AddressDisplay,
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
} from '@openzeppelin/ui-components';

interface RequestRow {
  id: string;
  holder: string;
  amount: bigint;
  status: 'pending' | 'approved' | 'rejected';
}

const requestColumns = [
  {
    id: 'holder',
    header: 'Holder',
    cell: (row) => <AddressDisplay address={row.holder} />,
  },
  {
    id: 'amount',
    header: 'Amount',
    align: 'end',
    sortable: true,
    getSortValue: (row) => row.amount,
    cell: (row) => row.amount.toString(),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => (
      <Badge label={row.status} tone={row.status === 'approved' ? 'success' : 'neutral'} />
    ),
  },
  {
    id: 'actions',
    header: '',
    headerLabel: 'Actions',
    align: 'end',
    headerClassName: 'w-32',
    cell: () => (
      <Button type="button" variant="outline" size="sm">
        Review
      </Button>
    ),
  },
] satisfies readonly DataTableColumn<RequestRow>[];

export function RequestsTable({ rows }: { rows: readonly RequestRow[] }) {
  return (
    <DataTable
      caption="Tokenization requests"
      columns={requestColumns}
      rows={rows}
      getRowKey={(row) => row.id}
      emptyTitle="No requests"
      emptyDescription="New tokenization requests will appear here."
    />
  );
}
```

Five things that snippet does that every consumer should do:

- **Names the table.** `caption` still renders a native `<caption>` as the table's first
  child — that is the name screen readers list in "tables mode" — but it is **visually
  hidden by default** (`sr-only`). Prefer `aria-labelledby` when a page heading already
  names the table (Role Manager). To show the caption, pass
  `captionClassName="not-sr-only"` plus type styles. Omitting all three name branches is a
  type error. Do not use `hidden` / `display:none` on the caption: that drops the
  accessible name.
- **Gives every column a stable `id`.** It is the React key and the identity cells follow
  when your column set changes. It is never inferred from the header and does not have to
  match a row field.
- **Supplies `getRowKey`.** Row keys are required. Index keys are not offered because
  they break focus when rows are paged, virtualized, or later appended.
- **Aligns the numeric column with `align: 'end'`** and marks it sortable with
  `getSortValue`. Alignment is logical, so it stays on the numeric edge in right-to-left
  layouts. The first click on Amount reorders the rows you passed; the third click
  restores the original order.
- **Owns the empty copy.** `emptyTitle` and `emptyDescription` replace the kit's default
  English strings. When there are no **body** rows the caption and header stay mounted,
  and one full-width cell shows the kit `EmptyState`.

Opt into scale strategies without changing the column array:

```tsx
<DataTable
  caption="Events"
  columns={requestColumns}
  rows={manyEvents}
  getRowKey={(row) => row.id}
  virtualized
/>
```

```tsx
<DataTable
  caption="Activity"
  columns={requestColumns}
  rows={events}
  getRowKey={(row) => row.id}
  virtualized
  infiniteScroll={{ hasMore, busy, onLoadMore: () => void fetchNextPage() }}
/>
```

```tsx
<DataTable
  aria-labelledby={headingId}
  columns={accountColumns}
  rows={paginatedAccounts}
  getRowKey={(row) => row.id}
  selection={{
    selectedKeys,
    onSelectionChange: setSelectedKeys,
    selectAllLabel: 'Select all accounts',
    getCheckboxLabel: (row) => `Select account ${row.address}`,
  }}
/>
```

## Key Concepts

**A column is data, not a component.** `DataTableColumn` is a plain object with three
required fields (`id`, `header`, `cell`) and six optional ones. Declaring the array mounts
nothing. The table calls `cell` once per **mounted** body row per column per render, never
for a row it did not mount. That is why the same declaration works for a full mount, a
page, and a virtual window.

**Exactly one accessible name.** `DataTableProps` is a union: `{ caption }`,
`{ 'aria-label' }`, or `{ 'aria-labelledby' }`. Prefer `aria-labelledby` when a visible
heading already names the table. `caption` is still the HTML-native name and is **not** a
visible card title: kit default classes include `sr-only`. Use `aria-label` only when
neither a caption nor a heading fits. A blank name compiles but logs a development-only
error and renders an unnamed table.

**Default chrome is Role Manager family, not a density prop.** The kit paints a
`rounded-xl` bordered `bg-card` wrapper, a muted `thead` band, `p-4` header and body
cells, hairline dividers and hover on **data** rows only (not spacers, the sentinel, or
the empty row). Pagination sits **outside** that card. There is no `density` / `variant` /
`chrome` prop and no kit `Card` wrapper — nesting `Card` adds flex padding and fights the
scroll ancestor. Override with `className` / `tableClassName` / `captionClassName` /
column class props. Do not import internal `chrome.ts` tokens; they are not on the barrel.

**Headers are associated by `scope="col"`.** Every `<th>` carries `scope="col"`. A
string `header` names its column directly. A node `header` is named through `aria-label`
on the `<th>`, resolved from `headerLabel`, falling back to `id`. Sortable string headers
become the visible text of a native `<button>` inside that same `<th>`; the column name
does not move to a different cell.

**Paint pipeline.** Each render derives three arrays and never mutates `rows`:

1. `displayRows` — client-sorted copy when the active column has `sortable` and
   `getSortValue`. Identity (same reference as `rows`) when there is no client sort.
   **Server pagination and active infinite scroll skip this step** so a partial page or
   growing feed is never reordered as if it were the full set.
2. `bodyRows` — a client page slice of `displayRows`, or `displayRows` unchanged. When
   infinite scroll is active, `bodyRows` is `rows` as given.
3. The DOM — every `bodyRows` element when virtualization is off; only the viewport
   window (plus overscan) when `virtualized` is on and `bodyRows` is non-empty. Active
   infinite scroll may also mount one hidden sentinel row at the end of `<tbody>`.

Empty chrome keys off `bodyRows.length === 0`, not unsliced `rows.length`. An empty
client page shows the empty state even if the full list is not empty.

**Empty means empty, not loading — except the first infinite chunk.** There is no
`isLoading` or `error` prop. While a one-shot request is unknown, render a skeleton or
an `Alert` instead of the table. Pagination `busy` only disables the pager. Infinite
`busy` sets `aria-busy` on the scroll wrapper, keeps the rows you passed, and does not
mount a kit spinner. While infinite is active and there are zero body rows with
`busy` or `hasMore`, the default empty copy is suppressed so the table does not claim
the feed is empty during the first chunk.

**Sorting is opt-in per column.** `sortable: true` plus `getSortValue` reorders the rows
you passed. `sortable: true` without a getter paints the affordance and fires
`onSortChange` so you can refetch; the table does not shuffle a server page or a growing
feed. Unsortable columns never show a sort button. Cycle: ascending → descending →
clear. One column at a time. Uncontrolled by default (`defaultSort`); pass `sort`
(including `null`) to own the state.

**Pagination is always controlled.** Pass `pagination={{ kind: 'client', pageIndex,
pageSize, onPageChange }}` to slice an in-memory list, or `kind: 'server'` when `rows` is
already the current page. The kit never stores `pageIndex` and never fetches. The pager
sits **outside** the scroll wrapper so overflow cannot clip it. It always has Previous,
Next, and a live status. When the dataset size is known (client kind, or server with a
finite `totalCount >= 0`), it also paints numbered page buttons: a compact list when
there are few pages, otherwise first / last / current ± one neighbour with ellipsis
gaps. The current number has `aria-current="page"`. Clicking it does not fire
`onPageChange`. Omit server `totalCount` (or pass a non-finite / negative value) when
the query cannot supply a total: **no numbered buttons**, status is `Page N`, and Next
is gated by optional `hasNextPage` (omit → Next stays enabled except busy or an unusable
index). The kit never invents a last page. Use pagination when the user must jump to a
stable page.

**Sticky header is on by default.** Every `th[data-slot="data-table-header-cell"]`
(including the selection select-all) gets kit tokens `sticky top-0 z-20 bg-muted` so the
header stays visible while the **wrapper** is a vertical scrollport. Pass
`stickyHeader={false}` to restore a header that scrolls away. Do not put `stickyHeader`
on `virtualized={{ … }}` — that object has no such field. Unbounded P1 tables
(`overflow-x-auto` only, content not taller than the wrapper) do not pin the header to
the **page**; that is a documented no-op, not a bug. Do not add a default `maxHeight` on
P1 just to make sticky visible. A visible `caption` (`not-sr-only`) stays in flow above
`thead` and scrolls away; header cells use `top-0`, not caption height.

**Infinite scroll is always controlled append-intent.** Pass
`infiniteScroll={{ hasMore, onLoadMore, busy }}`. The kit never fetches and never
stores a cursor — `onLoadMore` is `() => void` so your app already knows the next
token. Orthogonal to `virtualized`. Do not pass `pagination` and `infiniteScroll`
together: the pager wins, infinite is inert, and development logs once. While
`hasMore` is true, `aria-rowcount` is `-1` (unknown total) even on a small
unvirtualized table. There is no kit "Load more" button: a hidden sentinel plus
wrapper `aria-busy` is the loading signal. Put a visible spinner **outside** the
table if you want one. Unbounded append is your leak; pagination is the jump-to-page
tool.

**Virtualization is opt-in, never automatic.** `virtualized` or `virtualized={{ maxHeight:
480 }}` windows `bodyRows`. There is no N-row threshold. The kit sets `max-height` on the
scroll wrapper (default 384px) so the first frame has a known viewport; do not rely on
`className="max-h-96"` alone for that first window. Default `estimateSize` is **64** CSS
pixels (`DATA_TABLE_DEFAULT_ESTIMATE_SIZE`) to match `p-4` composed rows; overscan stays 8. Short virtualized lists shrink-wrap (`maxHeight` only — never a hollow 384px well).
When virtualization is off, the wrapper is still `overflow-x-auto` only, as in the
small-table path. Empty + `virtualized` is a no-op: same empty chrome as a small table, no
`aria-rowcount`, no spacers.

**Two class props, two elements — plus an optional root.** `className` lands on
`div[data-slot="data-table"]`, the scroll parent (already the card). `tableClassName`
lands on `<table>`. When `pagination` is set, those two sit inside
`div[data-slot="data-table-root"]` with the pager as a sibling. Style parts by
`data-slot`. Demo `className="rounded-lg border"` is redundant.

**Kit-owned selection is opt-in and always controlled.** Pass `selection={{ selectedKeys,
onSelectionChange }}`. The app owns a `ReadonlySet<string>` of `getRowKey(row)` values;
the kit never stores a selected Set and never keys selection by painted or virtualizer
index. Header select-all is tri-state over the **unique keys of current `bodyRows`**
(this client page, this server page, or the full in-memory / infinite buffer — including
virtualized rows that are not mounted). Mixed means some of those applicable keys are
selected, not `selectedKeys.size === rows.length`. A mixed header click **clears this
window** and keeps off-window keys. Do not put `selectedKeys` in the `columns` `useMemo`
deps: the kit injects the checkbox column so your column array can stay stable. Clicks on
Address copy or Edit Roles do not toggle selection. Checkboxes carry accessibility state;
rows get `data-selected` / `data-state="selected"` for chrome, not `aria-selected`. The
kit `Checkbox` paints a **minus** (not a check) when `checked="indeterminate"`.

## Sorting

| You declare                         | What happens                                                                                                                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| neither                             | Not sortable. Header is your `header` node. No `aria-sort`.                                                                                                                                                                      |
| `sortable: true` and `getSortValue` | Sortable. The table copies and reorders `rows` (then pages/windows that copy). Missing values (`null` / `undefined`) sort last in both directions.                                                                               |
| `sortable: true` only               | Sortable intent. Chrome and `onSortChange` fire; row order stays what you passed. Use this for server-sorted pages **and** growing feeds. Without `onSortChange`, a development log warns that clicks will not change row order. |
| `getSortValue` only                 | Not sortable. The getter is inert without `sortable: true`.                                                                                                                                                                      |

`getSortValue` returns a `DataTableSortValue`: `string`, `number`, `bigint`, `boolean`,
`Date`, `null`, or `undefined`. Mixed non-missing types compare in a fixed tag order
rather than throwing.

## API Reference

See [api-reference.md](./api-reference.md) for every public type, the rendered DOM
contract (including spacers and the pager), and development diagnostics.

## Integration Guide

See [integration-guide.md](./integration-guide.md) for mixed-content tables, Role Manager
chrome and action columns, kit-owned row selection, loading chrome, hand-written table
migration, client/server sort, numbered pagination (known and unknown totals), sticky
headers, virtualization, and infinite scroll (alone and with virtualization).

## Safety

- **Main entry.** `DataTable`, its types, `DATA_TABLE_SELECT_COLUMN_ID`, and the three
  virtualization default constants ship on `@openzeppelin/ui-components`. There is no
  `./data-table` subpath. Internal `chrome.ts` tokens and `selection.ts` helpers are
  **not** exported. Types are `export type`; a value import of `DataTableColumn` is a
  compile error. The kit depends on `@tanstack/react-virtual` for index math; that type is
  not re-exported. Do not wrap `DataTable` in `forwardRef` — use `scrollRef` for the
  wrapper and `virtualizationRef` for `scrollToRowKey`.
- **Do not nest the table in kit `Card` as the default frame.** Radius and border already
  live on the overflow wrapper. A `Card` ancestor adds flex layout and content padding.
  If you must nest, use `p-0` and do not add a second `overflow-hidden` (it tailwind-merges
  over `overflow-auto` and kills virtualized scroll).
- **The name is required, and blank names are silent in production.** Fix the development
  log; production emits nothing.
- **`getRowKey` must be unique and stable.** Never derive it from the array index.
  Virtualization and selection key rows by this value, not by the window index. Duplicate
  keys share one selected identity (both rows look selected).
- **Selection is nested `selection.selectedKeys`, never top-level `selectedIds`.** Both
  `selectedKeys` and `onSelectionChange` are required when `selection` is set. Pass a
  **new** `Set` from the parent (the kit already does). Off-window keys stay until you
  prune them (filters, a new contract) or the header subtracts the current applicable
  set. Header “select all” cannot select unseen server rows.
- **Do not treat mixed as “all selected.”** Header `'some'` is `aria-checked="mixed"` and
  a visible minus on the kit `Checkbox`. Clicking mixed deselects this window.
- **Do not add `aria-selected` to match `data-state="selected"`.** That attribute is a
  fill hook (`data-[state=selected]:bg-accent/30`). Checkboxes are the a11y story; the
  table is not an APG grid.
- **`id` must be unique within one column array.** Duplicates log once in development.
- **`cell` and `getSortValue` must not throw.** The table does not wrap them in
  `try`/`catch`. Empty `cell` returns paint an empty `<td>`.
- **`cell` runs only for mounted rows.** Do not register every data row in a module map
  on first paint. A virtualized 10k table will not call `cell` 10k times.
- **Do not pass `rows={[]}` to mean "loading"** except the first infinite chunk, where
  empty chrome is suppressed while `busy` or `hasMore`. Use `pagination.busy` only to
  disable the pager; use `infiniteScroll.busy` to suppress another `onLoadMore` and set
  wrapper `aria-busy`. Keep showing the current rows until the new page or append
  arrives.
- **Do not fetch, subscribe, or call hooks inside `cell`.** Resolve data in the app.
- **Do not client-sort a server page or a growing feed.** Omit `getSortValue` (keep
  `sortable: true`) and refetch or replace `rows` from `onSortChange`. Server pagination
  and active infinite scroll skip the client reorder step even if a getter is present.
- **Size a virtualized table with `virtualized.maxHeight`, not `className` alone.** The
  virtualizer's first frame uses that pixel bound. Invalid or missing height does **not**
  fall back to mounting every row.
- **`aria-rowcount` is page-local when the universe is finite.** Virtualized, infinite
  off: `1 + bodyRows.length` (header plus this page or window). While infinite `hasMore`
  is true: `-1` (unknown total), virtualized or not. Dataset totals belong in pagination
  status ("Showing 1–100 of 50000"), never in `aria-rowcount`, and never as
  `infiniteScroll.totalCount` (that field does not exist).
- **Keep table internals as table internals.** Do not set `display`, extra `position:
sticky` / `absolute`, or `transform` on `table`, `thead`, `tbody`, `tr`, `th`, or `td`.
  The kit already freezes **header cells** (`sticky top-0 z-20 bg-muted`) inside the
  wrapper unless `stickyHeader={false}`. The muted band stays on `thead`
  (`bg-muted/50`); opaque fill is on the `th` so virtualized rows do not show through.
  Sticky does not pin body columns. Spacer height lives on a hidden spacer `<td>` only.
  Clip and scroll on the wrapper. Unbounded tables are a sticky no-op for vertical
  pinning to the page.
- **Focused cells can unmount if you jump the window far enough.** A small scroll keeps
  the focused row mounted; a huge jump can still drop focus to `body`. Append never
  writes `scrollTop` and never focuses a loader: after rows are added **below** the
  focused key, that row's data stays under the cursor. Do not prepend in v1. Make
  `onLoadMore` safe to call twice in a row (a still-short page after `busy` clears can
  fire again so the viewport can fill).
- **Do not combine `pagination` and `infiniteScroll`.** Types allow both (spreads); at
  runtime the pager wins. Pick one strategy per instance.
- **Do not invent a last page when `totalCount` is missing.** Numbered buttons are
  hidden; use `hasNextPage={false}` to disable Next on a cursor API. `hasNextPage` is
  ignored when the total is known. There is no public `siblingCount`.
- **`EmptyState` renders an `<h3>`.** Keep `emptyTitle` to status copy.
- **Not in `@openzeppelin/ui-types`.**

## License

Same as the repository: see [LICENSE](../../LICENSE).
