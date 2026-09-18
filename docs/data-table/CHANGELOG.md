# Changelog — DataTable

When the held `@openzeppelin/ui-components` changeset lands, copy this into that minor
and replace the heading with the version. Do not add a second changeset from docs. This
Unreleased block is the full first `DataTable` minor: SF-1 through SF-11, including
kit-owned selection, Role Manager chrome, sticky headers, and numbered pagination.

## Unreleased (targets the next `@openzeppelin/ui-components` minor)

### Added

- `DataTable<Row>` on the main entry `@openzeppelin/ui-components`: a presentational
  table that renders `DataTableColumn<Row>[]` plus the rows the app holds as a native
  `<table>` with a required accessible name, `<th scope="col">` headers, one logical
  alignment per column, integrator-composed cells, and a single full-width empty row when
  there are no body rows (empty chrome suppressed during the first infinite chunk). It
  never fetches. Default chrome is Role Manager family (rounded bordered card, muted
  header band, `p-4` cells, data-row hairlines and hover).
- Types `DataTableProps<Row>` and `DataTableName`. `DataTableName` is an exactly-one-of
  union over `caption` (+ `captionClassName`), `aria-label`, and `aria-labelledby`.
  `caption` is visually `sr-only` by default; show it with `captionClassName="not-sr-only"`.
- Column-declaration types `DataTableColumn<Row>`, `DataTableAlign` (`'start' | 'end'`),
  and `DataTableSortValue`. Columns are plain objects: `id`, `header`, optional
  `headerLabel`, `align`, `cell`, `headerClassName`, `cellClassName`, `sortable`, and
  `getSortValue`.
- **Sorting:** `DataTableSortState` / `DataTableSortDirection`, props `sort`,
  `defaultSort`, and `onSortChange`. Cycle `asc → desc → clear`. Client reorder when the
  active column has `getSortValue`; intent-only when it does not. Client reorder is
  skipped for server pages and for active infinite feeds. `aria-sort` on the active
  header. Uncontrolled by default.
- **Pagination:** `DataTablePagination` (`kind: 'client' | 'server'`),
  `DataTableClientPagination`, `DataTableServerPagination`, `DataTablePaginationStatusInfo`
  (`totalCount` / `pageCount` are `number | null`; `totalKnown`). Always-controlled
  `pageIndex`. Status + Previous / optional numbered page buttons / Next outside the
  scroll wrapper (outside the bordered card). Numbered window uses first/last/current ±
  one neighbour and ellipsis when `pageCount > 7`; current has `aria-current="page"`.
  Server `totalCount` is optional; omit or pass invalid → no numbered buttons, status
  `Page N`, optional `hasNextPage` gates Next. Optional `busy` disables the whole pager.
  The table does not fetch.
- **Infinite scroll:** type `DataTableInfiniteScroll` and prop `infiniteScroll`
  (`hasMore`, `onLoadMore: () => void`, optional `busy`). Orthogonal to `virtualized`.
  Hidden sentinel row (not a data row); wrapper `aria-busy` while busy; `aria-rowcount="-1"`
  while `hasMore`. Pagination ∩ infinite is pager-wins (infinite inert, one dev
  diagnostic). No kit loader, error slot, cursor argument, or `totalCount` on the infinite
  object. Append does not write `scrollTop` or move focus.
- **Virtualization:** opt-in `virtualized` (`boolean` or `DataTableVirtualization`),
  `scrollRef`, `virtualizationRef` (`DataTableVirtualizationHandle.scrollToRowKey`), and
  constants `DATA_TABLE_DEFAULT_ESTIMATE_SIZE` (64), `DATA_TABLE_DEFAULT_OVERSCAN` (8),
  `DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT` (384). Native `<table>` plus spacer `<td>`
  heights; APG `aria-rowcount` / `aria-rowindex` while virtualized **or** infinite
  `hasMore`. Window is over **body rows** (sorted, then client-page-sliced, unless a feed
  skips sort). `@tanstack/react-virtual` `^3.13.13` is a regular main-barrel dependency;
  there is no `./data-table` subpath. Internal `chrome.ts` tokens are not exported.
- **Sticky header:** table-level `stickyHeader?: boolean` default **on** (`undefined` /
  `true`). Header cells get internal tokens `sticky top-0 z-20 bg-muted`. Pass `false` to
  opt out. Unbounded P1 (`overflow-x-auto`, no vertical scrollport) is a no-op. Not a
  field of `DataTableVirtualization`. Does not pin body columns.
- **Selection:** nested `selection?: DataTableSelection<Row>` (`selectedKeys:
ReadonlySet<string>`, `onSelectionChange`, optional `selectAllLabel` /
  `getCheckboxLabel` / `columnHeaderLabel`) and runtime constant
  `DATA_TABLE_SELECT_COLUMN_ID` (`'__data-table-select'`). Opt-in leading checkbox
  column; header tri-state over unique `getRowKey` values of current **body rows**
  (intersection, never `selectedKeys.size === rows.length`). Off-window keys are kept.
  Identity survives sort, pagination, virtualization, and infinite append. Mixed header
  click subtracts the current window. No row-click-to-select, no kit-owned Set, no
  `aria-selected` on `<tr>`. Internal `selection.ts` helpers are not exported.
- Kit `Checkbox`: `checked="indeterminate"` paints `MinusIcon` (`data-slot=
"checkbox-indeterminate-icon"`) with selected-token classes, not `CheckIcon`.
- Empty state: kit `EmptyState size="small"` by default, with `emptyTitle` /
  `emptyDescription` copy overrides and an `emptyState` node slot.
- Development-only diagnostics (once per issue per instance, silent in production): no
  columns, duplicate column `id`, blank accessible name, missing `aria-labelledby`
  target, sort without a way to change order, unknown sort column, invalid page size /
  total / omitted total / page index / `formatStatus`, server row-count vs page size,
  invalid `maxHeight`, zero-height virtualized scroll parent, pagination ∩ infinite,
  client sort inert on an infinite feed, reserved `__data-table-select` column id while
  selection is on.
- `data-slot`, `data-column-id`, `data-align`, wrapper `data-sticky-header`, pager
  `data-table-pagination-page` / `data-table-pagination-ellipsis` / `data-page-index`,
  and when virtualized or infinite `data-row-key` / `data-index` / `data-table-spacer` /
  `data-table-infinite-sentinel`, as the styling and testing contract (unvirtualized
  `data-row-key` also when selection or infinite is on). Selected data rows also emit
  `data-selected` and `data-state="selected"` (fill via `data-[state=selected]:bg-accent/30`).
- A Chromium browser test suite (accessibility tree, keyboard, RTL, axe WCAG 2.1 A/AA,
  virtualized mount count, scroll identity, append focus, selection identity). GitHub CI
  runs `test:browser` after jsdom. `axe-core` and `playwright` are devDependencies of the
  components package.

### Changed

- Nothing required for consumers of other kit components except **`Checkbox` mixed
  state:** indeterminate now shows a minus instead of a check (or an empty box). Tables
  that omit `selection` keep the original column count. `DataTable` itself grew additive
  props plus default chrome: existing call sites that omitted sort / pagination /
  infinite / virtualization / selection keep the original small-table DOM (no pager root,
  no sentinel, no `aria-rowcount`, wrapper `overflow-x-auto` only) and now inherit Role
  Manager card / header-band / density classes plus a default sticky header inside the
  wrapper (no-op until the wrapper is a vertical scrollport). Paged call sites that
  already passed `totalCount` gain numbered page buttons without a prop change.
- **Caption visual default:** a `caption` is `sr-only` (still names the table). Earlier
  unreleased docs described a visible caption. Pass `not-sr-only` to show it; prefer
  `aria-labelledby` when a heading already names the table.
- **Virtualization estimate:** `DATA_TABLE_DEFAULT_ESTIMATE_SIZE` is 64 (was 36 in earlier
  unreleased docs) so the first virtual window matches `p-4` composed rows.
- Docs only (historical): the `BridgeTable` stop-gap renderer was removed from these
  docs. Replace `<BridgeTable …/>` with `<DataTable …/>`.

### Migration Guide

- **Existing consumers of other exports:** no action.
- **New `DataTable` consumers:** declare columns with `satisfies readonly
DataTableColumn<Row>[]`, pass `columns`, `rows`, `getRowKey`, and exactly one of
  `caption` / `aria-label` / `aria-labelledby`. Loading chrome stays in your app.
  `rows={[]}` means "no rows" except the first infinite chunk. See the
  [README](./README.md). Do not wrap the table in kit `Card` or `className="rounded-lg
border"` as the frame. Do not import `chrome.ts`.
- **Visible caption:** `captionClassName="not-sr-only"` plus type styles. `captionClassName="sr-only"` is redundant.
- **Long lists:** add `virtualized` or `virtualized={{ maxHeight: yourPx }}`. Do not rely
  on `className` height alone for the first frame. Same column array as the small table.
  Default row estimate is 64px.
- **Paged data:** `pagination={{ kind: 'client', pageIndex, pageSize, onPageChange }}` or
  `kind: 'server'` plus `totalCount` when you know the dataset size. You own `pageIndex`.
  Combine with `virtualized` for a large page; `aria-rowcount` stays page-local. Omit
  server `totalCount` for cursor APIs; set `hasNextPage={false}` at the end. Pass
  `stickyHeader={false}` only if the header must scroll away.
- **Feeds / activity logs:** `infiniteScroll={{ hasMore, onLoadMore, busy }}`, optionally
  with `virtualized`. You own the cursor and the fetch. Combine with pagination is
  ignored (pager wins) — pick one. `onLoadMore` should be idempotent.
- **Server sort:** `sortable: true` without `getSortValue`, plus `onSortChange`. Do not
  client-reorder a partial page or a growing feed.
- **Row selection:** `selection={{ selectedKeys, onSelectionChange }}` with
  `getRowKey`. Do not pass top-level `selectedIds`. Do not put `selectedKeys` in the
  `columns` memo. Header mixed ≠ all selected. Compose-your-own `Checkbox` columns remain
  valid when `selection` is omitted.
- **Apps with a hand-written table:** see
  [integration-guide § Pattern 4](./integration-guide.md#pattern-4-replacing-a-hand-written-table).
