# Changelog — DataTable

When the held `@openzeppelin/ui-components` changeset lands, copy this into that minor
and replace the heading with the version. Do not add a second changeset from docs. This
Unreleased block is the full first `DataTable` minor: SF-1 through SF-13, including
kit-owned selection, Role Manager chrome, sticky headers, numbered pagination, typed
load-strategy XOR, a table-wide sort-control name formatter, and consumer composition
hooks (`toolbar`, in-frame pager, row/select class merges).

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
  `DataTableProps` also intersects exported `DataTableLoadStrategy` (neither / pagination /
  infinite — typed callers cannot pass both).
- Column-declaration types `DataTableColumn<Row>`, `DataTableAlign` (`'start' | 'end'`),
  and `DataTableSortValue`. Columns are plain objects: `id`, `header`, optional
  `headerLabel`, `align`, `cell`, `headerClassName`, `cellClassName`, `sortable`, and
  `getSortValue`.
- **Sorting:** `DataTableSortState` / `DataTableSortDirection`, props `sort`,
  `defaultSort`, and `onSortChange`. Cycle `asc → desc → clear`. Client reorder when the
  active column has `getSortValue`; intent-only when it does not. Client reorder is
  skipped for server pages and for active infinite feeds. `aria-sort` on the active
  header. Uncontrolled by default. Optional table-wide `formatSortButtonName`
  (`DataTableSortButtonNameInfo`: `{ columnName, direction: 'asc' | 'desc' | 'none' }`)
  overrides each sortable button’s `aria-label`. Omitted → English `Sort by {name}` /
  `Sort by {name}, ascending|descending`. Blank or non-string return is fail-closed to
  that default and logs `sort:empty-name` once. The English helper is not exported.
- **Pagination:** `DataTablePagination` (`kind: 'client' | 'server'`),
  `DataTableClientPagination`, `DataTableServerPagination`, `DataTablePaginationStatusInfo`
  (`totalCount` / `pageCount` are `number | null`; `totalKnown`). Always-controlled
  `pageIndex`. Status + Previous / optional numbered page buttons / Next outside the
  scroll wrapper by default (`placement?: DataTablePaginationPlacement`, `'outside' |
'inside'`; omitted = `'outside'`). `'inside'` puts the nav in `data-table-frame`
  (`border-t px-4 py-3`) and omits `data-table-root`. Optional `pagination.className`
  and `hideStatus` (status stays a polite `sr-only` live region; nav `justify-end`).
  Numbered window uses first/last/current ± one neighbour and ellipsis when
  `pageCount > 7`; current has `aria-current="page"`. Previous/Next include decorative
  lucide chevrons (`aria-hidden`; labels unchanged).
  Server `totalCount` is optional; omit or pass invalid → no numbered buttons, status
  `Page N`, optional `hasNextPage` gates Next. Omitting a usable server total is
  **silent**; invalid totals still diagnose. Optional `busy` disables the whole pager.
  The table does not fetch.
- **Infinite scroll:** type `DataTableInfiniteScroll` and prop `infiniteScroll`
  (`hasMore`, `onLoadMore: () => void`, optional `busy`). Orthogonal to `virtualized`.
  Hidden sentinel row (not a data row); wrapper `aria-busy` while busy; `aria-rowcount="-1"`
  while `hasMore`. Typed `pagination` ∩ `infiniteScroll` is a compile error
  (`DataTableLoadStrategy`). Untyped both-props still pager-win (infinite inert, one
  `infinite:pager-wins` diagnostic). No kit loader, error slot, cursor argument, or
  `totalCount` on the infinite object. Append does not write `scrollTop` or move focus.
- **Virtualization:** opt-in `virtualized` (`boolean` or `DataTableVirtualization`),
  `scrollRef`, `virtualizationRef` (`DataTableVirtualizationHandle.scrollToRowKey`), and
  constants `DATA_TABLE_DEFAULT_ESTIMATE_SIZE` (64), `DATA_TABLE_DEFAULT_OVERSCAN` (8),
  `DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT` (384). Native `<table>` plus spacer `<td>`
  heights; APG `aria-rowcount` / `aria-rowindex` while virtualized **or** infinite
  `hasMore`. Window is over **body rows** (sorted, then client-page-sliced, unless a feed
  skips sort). `@tanstack/react-virtual` `^3.13.13` is a regular main-barrel dependency;
  there is no `./data-table` subpath. Internal `chrome.ts` tokens are not exported.
- **Sticky header:** table-level `stickyHeader?: boolean` default **on** (`undefined` /
  `true`). Header cells get internal tokens `sticky top-0 z-20` plus an opaque
  `color-mix` of `--muted` 50% over `--card` (matches thead `bg-muted/50`, hides
  virtualized rows). Pass `false` to opt out. Unbounded P1 (`overflow-x-auto`, no
  vertical scrollport) is a no-op. Not a
  field of `DataTableVirtualization`. Does not pin body columns.
- **Selection:** nested `selection?: DataTableSelection<Row>` (`selectedKeys:
ReadonlySet<string>`, `onSelectionChange`, optional `selectAllLabel` /
  `getCheckboxLabel` / `columnHeaderLabel` / `columnClassName`) and runtime constant
  `DATA_TABLE_SELECT_COLUMN_ID` (`'__data-table-select'`). Opt-in leading checkbox
  column (injected cells default to `w-12`, then `columnClassName`); header tri-state over unique `getRowKey` values of current **body rows**
  (intersection, never `selectedKeys.size === rows.length`). Off-window keys are kept.
  Identity survives sort, pagination, virtualization, and infinite append. Mixed header
  click subtracts the current window. No row-click-to-select, no kit-owned Set, no
  `aria-selected` on `<tr>`. Internal `selection.ts` helpers are not exported.
- **Consumer composition:** optional `toolbar?: ReactNode` (opaque slot above the table
  inside `data-slot="data-table-frame"`), `getRowClassName` on painted data rows only, and
  the pagination/selection class hooks above. Framed iff `toolbar != null` or
  `placement === 'inside'`. Unconfigured tables keep today’s unframed wrapper + outside
  pager. `className` follows the visible card. Frame may `overflow-hidden`; the scroller
  never does. No kit filter-bar component.
- Kit `Checkbox`: `checked="indeterminate"` paints `MinusIcon` (`data-slot=
"checkbox-indeterminate-icon"`) with selected-token classes, not `CheckIcon`.
- Empty state: kit `EmptyState size="small"` by default, with `emptyTitle` /
  `emptyDescription` copy overrides and an `emptyState` node slot.
- Development-only diagnostics (once per issue per instance, silent in production): no
  columns, duplicate column `id`, blank accessible name, missing `aria-labelledby`
  target, sort without a way to change order, unknown sort column, invalid page size /
  invalid total / page index / `formatStatus`, server row-count vs page size,
  invalid `maxHeight`, zero-height virtualized scroll parent, pagination ∩ infinite
  (untyped pager-wins), client sort inert on an infinite feed, reserved
  `__data-table-select` column id while selection is on, `formatSortButtonName` empty
  name. **Not** diagnosed: omitted server `totalCount` (valid cursor / unknown-total).
- `data-slot`, `data-column-id`, `data-align`, wrapper `data-sticky-header`, pager
  `data-table-pagination-page` / `data-table-pagination-ellipsis` / `data-page-index`,
  framed `data-table-frame` / `data-table-toolbar`,
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
  infinite / virtualization / selection / `toolbar` / inside placement keep the original
  small-table DOM (no frame, no pager root, no sentinel, no `aria-rowcount`, wrapper
  `overflow-x-auto` only) and now inherit Role
  Manager card / header-band / density classes plus a default sticky header inside the
  wrapper (no-op until the wrapper is a vertical scrollport). Paged call sites that
  already passed `totalCount` gain numbered page buttons without a prop change.
- **Load strategy:** typed callers now get an exactly-one-of `pagination` /
  `infiniteScroll` (or neither). Untyped both-props still pager-win. This is additive
  for existing typed call sites that passed only one arm or neither.
- **Caption visual default:** a `caption` is `sr-only` (still names the table). Earlier
  unreleased docs described a visible caption. Pass `not-sr-only` to show it; prefer
  `aria-labelledby` when a heading already names the table.
- **Virtualization estimate:** `DATA_TABLE_DEFAULT_ESTIMATE_SIZE` is 64 (was 36 in earlier
  unreleased docs) so the first virtual window matches `p-4` composed rows.
- **Omitted server `totalCount`:** earlier unreleased docs and the SF-11 diagnostic treated
  omit as an error-level log. It is now silent (invalid totals still error). Chrome is
  unchanged (no numbered last page).
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
  with `virtualized`. You own the cursor and the fetch. Combining with pagination is a
  type error; untyped both-props are ignored (pager wins) — pick one. `onLoadMore`
  should be idempotent.
- **Sort button i18n:** `formatSortButtonName={({ columnName, direction }) => … }`.
  Return a non-blank string; empty falls back to English.
- **Server sort:** `sortable: true` without `getSortValue`, plus `onSortChange`. Do not
  client-reorder a partial page or a growing feed.
- **Row selection:** `selection={{ selectedKeys, onSelectionChange }}` with
  `getRowKey`. Do not pass top-level `selectedIds`. Do not put `selectedKeys` in the
  `columns` memo. Header mixed ≠ all selected. Compose-your-own `Checkbox` columns remain
  valid when `selection` is omitted. Injected select cells are `w-12` unless you pass
  `columnClassName`.
- **In-frame chrome (Role Manager Authorized Accounts):** pass app filters as `toolbar`,
  `pagination.placement: 'inside'`, and optional `hideStatus` / `getRowClassName`. See
  [integration-guide § Pattern 2b](./integration-guide.md#pattern-2b-compose-app-chrome-inside-the-frame).
- **Apps with a hand-written table:** see
  [integration-guide § Pattern 4](./integration-guide.md#pattern-4-replacing-a-hand-written-table).
