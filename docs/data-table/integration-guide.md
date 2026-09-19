# DataTable — Integration Guide

Patterns cover what the audited consumers do: a Role Manager–shaped mixed-content table
(dense columns, outline action button, hidden or heading-backed name), kit-owned row
selection, composing app chrome inside the kit frame (filter row in `toolbar`, pager
inside, narrow selection column), loading and error handling around the table, replacing
a hand-written table, client and server sort, localized sort-control names, numbered
pagination (including unknown totals), sticky headers, virtualization, and infinite
scroll (including with virtualization). Common mistakes follow.

Every snippet type-checks against the current package. The row types are illustrative;
substitute your own.

## Prerequisites

```bash
pnpm add @openzeppelin/ui-components
```

React 19 is a peer dependency. `DataTable` ships on the main entry. Virtualization uses
`@tanstack/react-virtual` inside the kit; you do not import it. Make sure your Tailwind
build scans the kit (see the package README's _Styling_ section) so `Badge`,
`AddressDisplay`, `EmptyState`, `Button`, and the `text-start` / `text-end` alignment
utilities are styled.

## Default chrome

You do not wrap the table in `Card` or pass `className="rounded-lg border"`. The kit
already paints a rounded bordered card, muted header band, `p-4` cells, and data-row
hover. Pagination chrome stays a sibling under `data-table-root`, outside that card,
unless you pass `pagination.placement: 'inside'`. Virtualized and infinite instances use
the same defaults; spacer and sentinel rows are unpainted. Search / filter bars belong in
your app: either above the table on the page, or as `toolbar` so they sit **inside the
frame** and **outside** `data-slot="data-table"` (never in `<caption>`, a header row, or
the scrollport).

Header cells stick inside that card while the wrapper scrolls vertically (virtualized
`maxHeight`, a tall page in that well, or your own class that actually overflows). They
do **not** freeze to the document. Short unbounded tables look unchanged. Pass
`stickyHeader={false}` for print, tests that assert the pre-sticky scroll-away, or a
header that must travel with the body.

Name the table with `aria-labelledby` pointing at a page heading when you have one.
`caption` remains valid and is `sr-only` unless you opt out:

```tsx
<DataTable
  caption="Token holdings"
  captionClassName="not-sr-only mb-2 text-sm text-muted-foreground"
  columns={columns}
  rows={rows}
  getRowKey={(row) => row.id}
/>
```

## Pattern 1: Mixed-content table with a numeric column and an actions column

Role Manager–shaped holdings: token, address + copy, status badge, end-aligned amount,
trailing outline button. Amount is client-sortable. The table is named by a heading.

```tsx
import {
  AddressDisplay,
  Badge,
  Button,
  type BadgeTone,
  type DataTableColumn,
} from '@openzeppelin/ui-components';

export interface RequestRow {
  id: string;
  holder: string;
  amount: bigint;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
}

const statusTone: Record<RequestRow['status'], BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export function buildRequestColumns(actions: { review: (id: string) => void }) {
  return [
    {
      id: 'holder',
      header: 'Holder',
      cell: (row) => (
        <span className="inline-flex items-center gap-2">
          <AddressDisplay address={row.holder} truncate showCopyButton />
        </span>
      ),
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
      id: 'submitted',
      header: 'Submitted',
      sortable: true,
      getSortValue: (row) => row.submittedAt,
      cell: (row) => row.submittedAt.toLocaleDateString(),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <Badge label={row.status} tone={statusTone[row.status]} />,
    },
    {
      id: 'actions',
      header: '',
      headerLabel: 'Actions',
      align: 'end',
      headerClassName: 'w-32',
      cell: (row) => (
        <Button type="button" variant="outline" size="sm" onClick={() => actions.review(row.id)}>
          Edit Roles
        </Button>
      ),
    },
  ] satisfies readonly DataTableColumn<RequestRow>[];
}
```

```tsx
import { useMemo } from 'react';

import { DataTable } from '@openzeppelin/ui-components';

import { buildRequestColumns, type RequestRow } from './requestColumns';

interface RequestsTableProps {
  rows: readonly RequestRow[];
  onReview: (id: string) => void;
}

export function RequestsTable({ rows, onReview }: RequestsTableProps) {
  const headingId = 'tokenization-requests-heading';
  const columns = useMemo(() => buildRequestColumns({ review: onReview }), [onReview]);

  return (
    <section>
      <h2 id={headingId}>Tokenization requests</h2>
      <DataTable
        aria-labelledby={headingId}
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyTitle="No requests"
        emptyDescription="New tokenization requests will appear here."
      />
    </section>
  );
}
```

What to notice:

- **The heading names the table.** `aria-labelledby` is the Role Manager pattern. A
  `caption` would also work and would be visually hidden unless you pass
  `captionClassName="not-sr-only"`.
- **`amount` is `align: 'end'` and client-sortable.** Header and cells share alignment.
  Clicks cycle ascending → descending → original `rows` order. Sort state is uncontrolled
  here; see Pattern 5 to put it in the URL.
- **`actions` has an empty visible header, `headerLabel: 'Actions'`, and an outline
  `Button size="sm"`.** That is the default trailing-column recipe. `OverflowMenu` is
  still valid composition for overflow actions; it is not the chrome proof.
- **Tight composed cells are your `cell()`.** The kit does not wrap cell children in a
  density layout node.
- **The builder takes callbacks, not state.** `cell` must not fetch or call hooks.

## Pattern 2: Kit-owned selection, named by a page heading, with an empty-state action

Role Manager Accounts: pass `selection` and keep **no** select column in `columns`. The
app owns `selectedKeys`. Header select-all is scoped to the rows you passed (`bodyRows`);
compose with `pagination.kind: 'server'` by passing the current page as `rows`. The page
already has an "Accounts" heading, so the table is named with `aria-labelledby`.

```tsx
import { useId, useState } from 'react';

import {
  AddressDisplay,
  Button,
  DataTable,
  EmptyState,
  type DataTableColumn,
} from '@openzeppelin/ui-components';

export interface AccountRow {
  id: string;
  address: string;
  role: string;
}

export const accountColumns = [
  {
    id: 'address',
    header: 'Account',
    cell: (row) => <AddressDisplay address={row.address} truncate showCopyButton />,
  },
  {
    id: 'role',
    header: 'Role',
    cell: (row) => row.role,
  },
  {
    id: 'actions',
    header: '',
    headerLabel: 'Actions',
    align: 'end',
    headerClassName: 'w-32',
    cell: () => (
      <Button type="button" variant="outline" size="sm">
        Edit Roles
      </Button>
    ),
  },
] satisfies readonly DataTableColumn<AccountRow>[];

interface AccountsSectionProps {
  accounts: readonly AccountRow[];
  onAddAccount: () => void;
}

export function AccountsSection({ accounts, onAddAccount }: AccountsSectionProps) {
  const headingId = useId();
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());

  return (
    <section>
      <h2 id={headingId}>Accounts</h2>
      <DataTable
        aria-labelledby={headingId}
        columns={accountColumns}
        rows={accounts}
        getRowKey={(row) => row.id}
        selection={{
          selectedKeys,
          onSelectionChange: setSelectedKeys,
          selectAllLabel: 'Select all accounts',
          getCheckboxLabel: (row) => `Select account ${row.address}`,
        }}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-6">
            <EmptyState
              size="small"
              title="No accounts"
              description="Add an account to grant it a role."
            />
            <Button onClick={onAddAccount}>Add account</Button>
          </div>
        }
      />
    </section>
  );
}
```

What to notice:

- **`columns` does not depend on `selectedKeys`.** Kit cells read table props. Putting
  the Set in the column memo is the TanStack stale-checkbox bug under virtualization.
- **Keys are `row.id`, labels can use `row.address`.** `getRowKey` is identity;
  `getCheckboxLabel` is announcement.
- **Header mixed is a minus, not a check.** Clicking mixed clears this window and keeps
  keys that are not in the current `rows` (other pages). Do not clone
  `selectedKeys.size === accounts.length` as “all selected.”
- **Clicks on Edit Roles / copy do not toggle the row.** There is no `onRowClick`.
- **Bulk action bars stay in the app.** The table only paints and reports the Set. Filter
  chrome can still be hosted in `toolbar` (Pattern 2b) without the kit owning filter
  state.
- **Custom `Checkbox` columns remain an escape hatch** when you omit `selection` (do not
  use `id: '__data-table-select'`). That is not the Role Manager path.

Server page + selection (same columns, current page as `rows`):

```tsx
<DataTable
  aria-labelledby={headingId}
  columns={accountColumns}
  rows={pageRows}
  getRowKey={(row) => row.id}
  pagination={{
    kind: 'server',
    pageIndex,
    pageSize,
    totalCount,
    onPageChange: setPageIndex,
  }}
  selection={{ selectedKeys, onSelectionChange: setSelectedKeys }}
/>
```

Select-all on that instance unions or subtracts **this page’s keys**. Page 1 keys stay
selected when you open page 2. Newly appended infinite-scroll rows start unchecked
unless their key was already in the Set. Sorting does not move selection to a visual
slot. A virtualized 10k-row table’s header still selects all 10k loaded keys, not the
~20 mounted checkboxes.

## Pattern 2b: Compose app chrome inside the frame

Role Manager Authorized Accounts: one card wrapping a filter row, the table, and the
pager. The kit does not own search or role filters — pass your existing bar as
`toolbar`. `placement: 'inside'` puts the pager in that same frame. The injected select
column is already `w-12`; `columnClassName` is how you override it.

```tsx
import { useId, useState } from 'react';

import { DataTable, Input } from '@openzeppelin/ui-components';

import { accountColumns, type AccountRow } from './AccountsSection';

interface AccountsFilterBarProps {
  query: string;
  onQueryChange: (next: string) => void;
}

function AccountsFilterBar({ query, onQueryChange }: AccountsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <label htmlFor="authorized-accounts-filter" className="text-sm font-medium">
        Filter accounts
      </label>
      <Input
        id="authorized-accounts-filter"
        className="max-w-sm"
        value={query}
        placeholder="Address or role"
        onChange={(event) => {
          onQueryChange(event.target.value);
        }}
      />
    </div>
  );
}

interface AuthorizedAccountsTableProps {
  pageRows: readonly AccountRow[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  selectedKeys: ReadonlySet<string>;
  onSelectionChange: (next: ReadonlySet<string>) => void;
  onPageChange: (pageIndex: number) => void;
}

export function AuthorizedAccountsTable({
  pageRows,
  pageIndex,
  pageSize,
  totalCount,
  selectedKeys,
  onSelectionChange,
  onPageChange,
}: AuthorizedAccountsTableProps) {
  const headingId = useId();
  const [query, setQuery] = useState('');

  return (
    <section>
      <h2 id={headingId}>Authorized accounts</h2>
      <DataTable
        aria-labelledby={headingId}
        columns={accountColumns}
        rows={pageRows}
        getRowKey={(row) => row.id}
        toolbar={
          <AccountsFilterBar
            query={query}
            onQueryChange={(next) => {
              setQuery(next);
              onPageChange(0);
            }}
          />
        }
        selection={{
          selectedKeys,
          onSelectionChange,
          selectAllLabel: 'Select all accounts',
          getCheckboxLabel: (row) => `Select account ${row.address}`,
          columnClassName: 'w-12',
        }}
        pagination={{
          kind: 'server',
          pageIndex,
          pageSize,
          totalCount,
          onPageChange,
          placement: 'inside',
          paginationLabel: 'Authorized accounts pagination',
        }}
      />
    </section>
  );
}
```

What to notice:

- **`toolbar` is opaque.** The kit does not search `rows`. Reset `pageIndex` in the app
  when the filter changes.
- **`placement: 'inside'` omits `data-table-root`.** The nav is the last child of
  `data-table-frame` (`border-t px-4 py-3`), never a `<tfoot>` and never a virtualized
  row.
- **`columnClassName: 'w-12'` is redundant with the kit default.** Pass `'w-10'` (or
  similar) only when you need a different width. The kit does not auto-set
  `tableClassName="table-fixed"`.
- **Cursor / controls-only pager:** omit `totalCount`, pass `hasNextPage`, and set
  `hideStatus: true` so Previous/Next sit at the end while `Page N` stays a polite live
  region. Kit already applies `justify-end` when status is hidden.
- **Lighter row hover** (Role Identifiers): `getRowClassName={() => 'hover:bg-muted/30'}`
  merges after kit row chrome so `hover:bg-accent/50` can lose. Omit SF-13 props on a
  nested compact table (`className="rounded-none border-0"`) so it stays unframed.

## Pattern 3: Loading and errors around the table

`DataTable` has no `isLoading` or `error` prop, and `rows={[]}` always means "there is
nothing" **unless** infinite scroll is active and the first chunk is in flight or
`hasMore` (empty chrome is then suppressed). While a one-shot request is in flight, or
has failed, render something else in the table's place — or keep the last good `rows`
and set `pagination.busy` / `infiniteScroll.busy` so chrome freezes without blanking
the body.

```tsx
import {
  Alert,
  AlertDescription,
  AlertTitle,
  DataTable,
  type DataTableColumn,
} from '@openzeppelin/ui-components';

import type { RequestRow } from './requestColumns';

const requestColumns = [
  { id: 'holder', header: 'Holder', cell: (row) => row.holder },
  { id: 'amount', header: 'Amount', align: 'end', cell: (row) => row.amount.toString() },
] satisfies readonly DataTableColumn<RequestRow>[];

type RequestsQuery =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: readonly RequestRow[] };

export function RequestsPanel({ query }: { query: RequestsQuery }) {
  if (query.status === 'loading') {
    return <p aria-busy="true">Loading requests…</p>;
  }

  if (query.status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load requests</AlertTitle>
        <AlertDescription>{query.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <DataTable
      caption="Tokenization requests"
      columns={requestColumns}
      rows={query.rows}
      getRowKey={(row) => row.id}
      emptyTitle="No requests"
      emptyDescription="New tokenization requests will appear here."
    />
  );
}
```

What to notice:

- **Three states, three renders.** The table only ever sees a real array. `caption` is
  already visually hidden; you do not need `captionClassName="sr-only"`. The wrapper is
  already a card; you do not need `className="rounded-md border"`.
- **For a virtualized table,** put the height bound on `virtualized={{ maxHeight: 384 }}`
  rather than `className="max-h-96 overflow-y-auto"` alone.

## Pattern 4: Replacing a hand-written table

Lift each `<th>`/`<td>` pair into a column object, give the table a name and a row key,
and delete the markup.

Before, a typical hand-written table with the alignment bug issue #236 named:

```tsx
import type { HolderRow } from './HoldersTable';

export function HoldersTableBefore({ holders }: { holders: readonly HolderRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2">Address</th>
            <th className="px-3 py-2">Balance</th>
          </tr>
        </thead>
        <tbody>
          {holders.map((holder) => (
            <tr key={holder.address}>
              <td className="px-3 py-2">{holder.address}</td>
              <td className="px-3 py-2 text-right">{holder.balance.toString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

After:

```tsx
import { AddressDisplay, DataTable, type DataTableColumn } from '@openzeppelin/ui-components';

export interface HolderRow {
  address: string;
  balance: bigint;
}

export const holderColumns = [
  {
    id: 'address',
    header: 'Address',
    cell: (row) => <AddressDisplay address={row.address} truncate />,
  },
  {
    id: 'balance',
    header: 'Balance',
    align: 'end',
    sortable: true,
    getSortValue: (row) => row.balance,
    cell: (row) => row.balance.toString(),
  },
] satisfies readonly DataTableColumn<HolderRow>[];

export function HoldersTable({ holders }: { holders: readonly HolderRow[] }) {
  return (
    <DataTable
      caption="Token holders"
      columns={holderColumns}
      rows={holders}
      getRowKey={(row) => row.address}
      emptyTitle="No holders yet"
      emptyDescription="Holders appear once the first transfer settles."
    />
  );
}
```

If you adopted the earlier `BridgeTable` renderer from these docs while the component was
types-only, replace `<BridgeTable …/>` with `<DataTable …/>` using the same core prop
names, then delete `BridgeTable.tsx`.

## Pattern 5: Controlled sort and server-sorted pages

**Client, controlled** (URL or shared state):

```tsx
import { useState } from 'react';

import { DataTable, type DataTableSortState } from '@openzeppelin/ui-components';

import { holderColumns, type HolderRow } from './HoldersTable';

export function HoldersSorted({ holders }: { holders: readonly HolderRow[] }) {
  const [sort, setSort] = useState<DataTableSortState | null>(null);

  return (
    <DataTable
      caption="Token holders"
      columns={holderColumns}
      rows={holders}
      getRowKey={(row) => row.address}
      sort={sort}
      onSortChange={setSort}
    />
  );
}
```

Passing `sort={null}` is still controlled (cleared). Omitting `sort` entirely is
uncontrolled.

**Server page** — offer sort, do not reorder the slice you were given:

```tsx
import {
  AddressDisplay,
  DataTable,
  type DataTableColumn,
  type DataTableSortState,
} from '@openzeppelin/ui-components';

export interface TransferRow {
  txHash: string;
  from: string;
  to: string;
  value: bigint;
  blockNumber: number;
}

const transferColumns = [
  {
    id: 'block',
    header: 'Block',
    align: 'end',
    sortable: true,
    cell: (row) => String(row.blockNumber),
  },
  {
    id: 'from',
    header: 'From',
    cell: (row) => <AddressDisplay address={row.from} truncate />,
  },
  {
    id: 'to',
    header: 'To',
    cell: (row) => <AddressDisplay address={row.to} truncate />,
  },
  {
    id: 'value',
    header: 'Value',
    align: 'end',
    sortable: true,
    cell: (row) => row.value.toString(),
  },
] satisfies readonly DataTableColumn<TransferRow>[];

interface TransfersPageTableProps {
  pageRows: readonly TransferRow[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  busy: boolean;
  onPageChange: (pageIndex: number) => void;
  onSortChange: (sort: DataTableSortState | null) => void;
}

export function TransfersPageTable({
  pageRows,
  pageIndex,
  pageSize,
  totalCount,
  busy,
  onPageChange,
  onSortChange,
}: TransfersPageTableProps) {
  return (
    <DataTable
      caption="Transfers"
      columns={transferColumns}
      rows={pageRows}
      getRowKey={(row) => row.txHash}
      onSortChange={onSortChange}
      pagination={{
        kind: 'server',
        pageIndex,
        pageSize,
        totalCount,
        busy,
        onPageChange,
      }}
    />
  );
}
```

What to notice:

- **No `getSortValue`.** Clicks still show `aria-sort` and call `onSortChange`. You
  refetch the page. The table will not pretend this page is a globally sorted set.
- **`kind: 'server'` skips client reorder** even if a getter slipped onto a column.
- **`busy`** disables Previous, Next, and every page-number button while the new page
  loads; keep `pageRows` as the last good page until it arrives. Numbered buttons appear
  because `totalCount` is known.

## Pattern 5b: Localize sort-control names

`formatSortButtonName` is table-wide. It receives `DataTableSortButtonNameInfo`
(`columnName` from string `header` / `headerLabel` / `id`; `direction` `'none'` |
`'asc'` | `'desc'`). Omit it for English `Sort by Amount` / `Sort by Amount, ascending`.
A blank or non-string return is fail-closed: the English default is used and development
logs `sort:empty-name` once. The English builder is not exported.

```tsx
import { DataTable, type DataTableSortButtonNameInfo } from '@openzeppelin/ui-components';

import { holderColumns, type HolderRow } from './HoldersTable';

function formatSortButtonName({ columnName, direction }: DataTableSortButtonNameInfo): string {
  if (direction === 'none') {
    return `Ordenar por ${columnName}`;
  }
  if (direction === 'asc') {
    return `Ordenar por ${columnName}, ascendente`;
  }
  return `Ordenar por ${columnName}, descendente`;
}

export function HoldersSortedEs({ holders }: { holders: readonly HolderRow[] }) {
  return (
    <DataTable
      caption="Titulares"
      columns={holderColumns}
      rows={holders}
      getRowKey={(row) => row.address}
      formatSortButtonName={formatSortButtonName}
    />
  );
}
```

This names the **sort button**, not `aria-sort`. Pair it with `pagination.formatStatus`
and `previousLabel` / `nextLabel` when the rest of the pager must match the locale.

## Pattern 6: Client-held pagination

```tsx
import { useState } from 'react';

import { DataTable } from '@openzeppelin/ui-components';

import { holderColumns, type HolderRow } from './HoldersTable';

export function HoldersPaged({ holders }: { holders: readonly HolderRow[] }) {
  const [pageIndex, setPageIndex] = useState(0);

  return (
    <DataTable
      caption="Token holders"
      columns={holderColumns}
      rows={holders}
      getRowKey={(row) => row.address}
      pagination={{
        kind: 'client',
        pageIndex,
        pageSize: 10,
        onPageChange: setPageIndex,
      }}
    />
  );
}
```

The kit slices **after** client sort. Status reads `Showing 1–10 of {holders.length}`
(or `No rows` when the list is empty). Numbered buttons are always present for client
kind: one current `1` on an empty list; a compact `1 … 20` window when there are many
pages. An empty page (out-of-range `pageIndex`) still shows the empty row; that is a lie
you should avoid by clamping `pageIndex` when the list shrinks.

## Pattern 6b: Server pagination when total count is unknown

Cursor APIs often cannot give `COUNT(*)`. Omit `totalCount`. The kit keeps Previous/Next
and `Page N` status, and does not paint numbered last pages. Set `hasNextPage={false}`
when the last chunk arrives; omit it while more pages might exist (Next stays enabled
except while `busy`).

```tsx
import { DataTable } from '@openzeppelin/ui-components';

import { holderColumns, type HolderRow } from './HoldersTable';

interface HoldersCursorPageProps {
  pageRows: readonly HolderRow[];
  pageIndex: number;
  pageSize: number;
  hasNextPage: boolean;
  busy: boolean;
  onPageChange: (pageIndex: number) => void;
}

export function HoldersCursorPage({
  pageRows,
  pageIndex,
  pageSize,
  hasNextPage,
  busy,
  onPageChange,
}: HoldersCursorPageProps) {
  return (
    <DataTable
      caption="Token holders"
      columns={holderColumns}
      rows={pageRows}
      getRowKey={(row) => row.address}
      pagination={{
        kind: 'server',
        pageIndex,
        pageSize,
        hasNextPage,
        busy,
        onPageChange,
      }}
    />
  );
}
```

Passing `totalCount: Number.NaN` or a negative number is the same chrome as omit
(unknown), plus an `invalid` diagnostic — do not coerce it to `0` in the app “to get
numbers”; that would paint a fake last page.

## Pattern 6c: Opt out of the sticky header

Sticky is the default. Restore a scrolling header without changing columns:

```tsx
<DataTable
  caption="Holdings"
  columns={holderColumns}
  rows={holders}
  getRowKey={(row) => row.address}
  stickyHeader={false}
/>
```

## Pattern 7: Virtualization, alone and with a large page

Same columns as the small table. Opt in with a boolean, or pass a height bound:

```tsx
import { useRef } from 'react';

import { DataTable, type DataTableVirtualizationHandle } from '@openzeppelin/ui-components';

import { holderColumns, type HolderRow } from './HoldersTable';

export function HoldersVirtualized({ holders }: { holders: readonly HolderRow[] }) {
  const virtRef = useRef<DataTableVirtualizationHandle>(null);

  return (
    <>
      <button type="button" onClick={() => virtRef.current?.scrollToRowKey('0xabc', 'center')}>
        Jump to 0xabc
      </button>
      <DataTable
        caption="Token holders"
        columns={holderColumns}
        rows={holders}
        getRowKey={(row) => row.address}
        virtualized={{ maxHeight: 480, overscan: 10 }}
        virtualizationRef={virtRef}
      />
    </>
  );
}
```

**Large client page + virtualization** (the combination Specify requires):

```tsx
<DataTable
  caption="Members"
  columns={holderColumns}
  rows={allMembers}
  getRowKey={(row) => row.address}
  pagination={{ kind: 'client', pageIndex, pageSize: 200, onPageChange: setPageIndex }}
  virtualized={{ maxHeight: 480 }}
/>
```

The virtualizer's `count` is at most 200, not `allMembers.length`. `aria-rowcount` is
`1 + bodyRows.length` (for example 201), not the dataset total. Pagination status still
says "Showing 1–200 of 10000."

A sibling instance **without** `virtualized` keeps the P1 DOM: no rowcount, no spacers,
wrapper `overflow-x-auto` only. Toggling the prop does not require a different column
shape.

`scrollToRowKey` is a no-op for keys not in the current `bodyRows` (wrong page, or
unknown id). `virtualizationRef.current` is `null` when the table is empty or not
virtualized.

## Pattern 8: Infinite scroll, alone and with virtualization

The kit calls `onLoadMore` when the user reaches the end. You append to `rows` and
flip `hasMore` / `busy`. React Query, SWR, or a hand-rolled cursor all live in the app.

**Virtualized feed** (the combination that naive tables get wrong):

```tsx
import { useCallback, useState } from 'react';

import { DataTable } from '@openzeppelin/ui-components';

import { holderColumns, type HolderRow } from './HoldersTable';

interface ActivityFeedTableProps {
  initialRows: readonly HolderRow[];
  fetchNext: (cursor: string | null) => Promise<{
    rows: readonly HolderRow[];
    nextCursor: string | null;
  }>;
}

export function ActivityFeedTable({ initialRows, fetchNext }: ActivityFeedTableProps) {
  const [rows, setRows] = useState(initialRows);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [busy, setBusy] = useState(false);

  const onLoadMore = useCallback(() => {
    if (busy || !hasMore) return;
    setBusy(true);
    void fetchNext(cursor)
      .then((page) => {
        setRows((prev) => [...prev, ...page.rows]);
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor != null);
      })
      .finally(() => {
        setBusy(false);
      });
  }, [busy, hasMore, cursor, fetchNext]);

  return (
    <DataTable
      caption="Activity"
      columns={holderColumns}
      rows={rows}
      getRowKey={(row) => row.address}
      virtualized={{ maxHeight: 480 }}
      infiniteScroll={{ hasMore, busy, onLoadMore }}
    />
  );
}
```

**Unvirtualized short feed** — omit `virtualized`. A P1 `overflow-x-auto` wrapper still
loads when the user scrolls the **page**: the sentinel's observer uses the viewport
unless you made the wrapper a tall vertical scrollport.

**Sort intent on a feed** — keep `sortable: true`, omit `getSortValue`, replace `rows`
from `onSortChange`. The kit will not reorder the growing buffer (that would jump rows
out from under the cursor). Development logs once if a getter is present.

**Failed append** — set `busy` false, leave `rows` and `hasMore` as they were. The
sentinel stays. The next time the user is at the end, `onLoadMore` can fire again.
There is no `infiniteScroll.error` slot; put retry chrome outside the table.

**Do not also pass `pagination`.** Jump-to-page and append-forever are different
products. Typed `DataTableProps` (`DataTableLoadStrategy`) rejects both. If an untyped
caller still passes both, the pager (Previous / numbers / Next) still works and infinite
is ignored.

## Common Mistakes

- **No accessible name / two names / `aria-labelledby` pointing at nothing.** Same as
  any named kit overlay: exactly one real name, heading in the document.
- **`rows={[]}` while loading.** Shows the empty state (except the first infinite
  chunk, where empty chrome is suppressed). Use a loading render, or keep last rows and
  `pagination.busy` / `infiniteScroll.busy`.
- **Index keys.** `getRowKey` from the array index recycles focused widgets while
  scrolling or paging.
- **Deriving `id` from the header / reusing an `id`.** Fixed slug; unique in the array.
- **A `ReactNode` header with no `headerLabel`.** Column announced as its `id`.
- **Per-cell `text-right` instead of `align: 'end'`.** Header stays on the other edge.
- **Throwing from `cell` or `getSortValue`.** Takes down the table.
- **Prebuilding every cell / fetching inside `cell`.** Virtualization will not save you
  if you already mapped 10k nodes.
- **Clipping the `<table>` instead of the wrapper.** Size and overflow belong on
  `className` / `virtualized.maxHeight`.
- **Restyling table parts as flex or grid, or translating rows.** Drops table semantics.
  The kit already uses spacer `<td>` heights; do not add `translateY` in `cellClassName`.
- **Expecting `isLoading`, `onRowClick`, `width`, `pinned`, `resizable`, or
  `density`.** None exist in v1. Selection is nested `selection`, not row click.
  `stickyHeader` **does** exist: omit/`true` is on; `false` opts out. It is not a field
  of `virtualized={{ }}`.
- **Expecting the sticky header to pin to the page.** It only sticks inside
  `data-slot="data-table"`. Unbounded P1 tables are a no-op.
- **Passing `siblingCount` or importing `buildPageItems`.** Window math is internal.
- **Inventing numbered pages when `totalCount` is omitted.** The kit hides numbers.
  Use `hasNextPage`; do not pass `totalCount: 0` to mean “unknown.” Omitting the field is
  not a development error; invalid (`NaN` / negative) values still log.
- **Putting numbers in `<tfoot>`.** The pager is a sibling of the overflow wrapper
  (outside the card by default, or last child of `data-table-frame` when `'inside'`).
- **Putting filters in `<caption>`, a header `<tr>`, or `data-slot="data-table"`.** Use
  `toolbar`.
- **Expecting `rowClassName` or a `rowVariant` enum.** The hook is `getRowClassName`.
- **Expecting `chromeMode` or importing `DATA_TABLE_FRAME_CHROME`.** Internal.
- **Passing top-level `selectedIds` / `onSelectionChange`.** Type error / no-op. Nest
  `selectedKeys` and `onSelectionChange` under `selection`.
- **`selectedKeys` in the `columns` `useMemo` deps.** Kit selection does not need it;
  rebuilding columns on every toggle stale-paints virtualized checkboxes.
- **`selectedKeys.size === rows.length` as “select all.”** Equal-sized disjoint sets
  (page 2 vs leftover page 1 keys) are not “all.” Use the kit header, or intersect keys.
- **Mutating `selectedKeys` in place.** The kit always passes a new `Set`; so should you.
- **Treating mixed as all-selected.** Sighted mixed is a minus; AT hears `aria-checked=
"mixed"`. One click clears this window.
- **Adding `aria-selected` or `role="grid"`** because rows have `data-state="selected"`.
  Checkboxes are the a11y story.
- **Using `id: '__data-table-select'` on an integrator column** while kit selection is
  on. Reserved; the kit column still leads and development logs.
- **Wrapping `DataTable` in kit `Card` (or `className="rounded-lg border"`) as the
  frame.** The kit already paints the card. `overflow-hidden` on the **scroller** kills
  virtualized scroll; the kit frame may clip with `overflow-hidden` so the toolbar and
  in-frame pager share one radius.
- **Leaving a visible caption as the card title.** Default is `sr-only`. Show it with
  `not-sr-only`, or name the table with `aria-labelledby`.
- **Importing `DATA_TABLE_*_CHROME` or `./chrome`.** Not a public export.
- **Two-column virtualized catalogs.** Leftover `w-full` width becomes a white desert.
  Reuse dense five-column recipes (token, address, badge, numeric, action).
- **Treating `OverflowMenu` as the only actions proof.** Default trailing column is
  outline `Button size="sm"` with `headerLabel: 'Actions'`.
- **`captionClassName="sr-only"`.** Redundant; that is already the default.
- **`captionClassName="hidden"`.** Drops the accessible name. Use `sr-only` (default) or
  `not-sr-only`.
- **`getSortValue` without `sortable: true`.** Inert.
- **Client-sorting a server page or a growing feed** by adding `getSortValue`. Omit the
  getter; refetch or replace `rows` from `onSortChange`.
- **Uncontrolled `pageIndex`.** The kit never stores it. If you do not pass
  `pagination`, there is no pager.
- **`className="max-h-96"` as the only virtualized height.** First-frame windowing uses
  `maxHeight` (default 384). Prefer `virtualized={{ maxHeight: 384 }}` (or your px).
- **Reading `aria-rowcount` as dataset size.** Finite virtualized tables use
  `1 +` this instance's `bodyRows`. Open feeds use `-1`. Totals belong in the pager
  status, not on the table and not as `infiniteScroll.totalCount`.
- **Combining `pagination` and `infiniteScroll`.** Typed callers cannot. Untyped both
  still pager-win; your `onLoadMore` never runs. Pick one.
- **Returning `''` from `formatSortButtonName`.** Fail-closed to English `Sort by {name}`
  plus one `sort:empty-name` diagnostic. Return a real localized string.
- **A visible "Load more" you put in `tbody`.** Steals focus. Hidden sentinel + wrapper
  `aria-busy` is the kit signal; compose a spinner outside the table.
- **Expecting the kit to fetch or to pass a cursor into `onLoadMore`.** The callback is
  `() => void`. Make it idempotent: a short page after `busy` clears can fire twice.
- **Chat stick-to-end.** The table never writes `scrollTop` on append and never enables
  TanStack `followOnAppend`. Prepend is out of v1.
- **`ref={}` on `DataTable`.** Use `scrollRef`. Importing TanStack's `Virtualizer` from
  the kit will not compile; use `DataTableVirtualizationHandle`.
- **Importing from `@openzeppelin/ui-types`.** Types live in `@openzeppelin/ui-components`.
- **Importing a `./data-table` subpath.** There isn't one.
