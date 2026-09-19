# DataTable — Examples

Copy-paste modules that compile inside any Vite + React 19 app with the kit installed:

```bash
pnpm add @openzeppelin/ui-components
```

Each example is a single file whose only imports are React and the kit (or another
example in this list). Drop it into `src/`, import it from a page, and make sure your
Tailwind build scans the kit (see the package README's _Styling_ section).

Examples 1–3 produce column arrays. Examples 4–10 render them with `DataTable`. Example 5
is kit-owned selection (Role Manager Accounts).

## 1. Minimal — `minimalColumns.ts`

The smallest correct declaration: three required fields, one numeric column. No JSX, so
this is a `.ts` file.

```ts
import type { DataTableColumn } from '@openzeppelin/ui-components';

export interface BalanceRow {
  symbol: string;
  balance: bigint;
}

export const balanceColumns = [
  {
    id: 'symbol',
    header: 'Token',
    cell: (row) => row.symbol,
  },
  {
    id: 'balance',
    header: 'Balance',
    align: 'end',
    cell: (row) => row.balance.toString(),
  },
] satisfies readonly DataTableColumn<BalanceRow>[];
```

## 2. Composed cells and client sort — `requestColumns.tsx`

Kit pieces inside cells, `bigint` and `Date` sort getters, and a trailing actions column
with an empty visible header, `headerLabel: 'Actions'`, and an outline `Button`. Identical
to
[integration-guide § Pattern 1](../integration-guide.md#pattern-1-mixed-content-table-with-a-numeric-column-and-an-actions-column).

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

## 3. Server-sorted page — `serverSortedColumns.ts`

A page of rows whose order the server owns. `sortable: true` with no `getSortValue`
means "offer sort, report the intent, do not reorder this page". Pair with
`pagination={{ kind: 'server', … }}` and `onSortChange` as in
[integration-guide § Pattern 5](../integration-guide.md#pattern-5-controlled-sort-and-server-sorted-pages).

```ts
import type { DataTableColumn } from '@openzeppelin/ui-components';

export interface TransferRow {
  txHash: string;
  from: string;
  to: string;
  value: bigint;
  blockNumber: number;
}

export const transferColumns = [
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
    cell: (row) => row.from,
  },
  {
    id: 'to',
    header: 'To',
    cell: (row) => row.to,
  },
  {
    id: 'value',
    header: 'Value',
    align: 'end',
    sortable: true,
    cell: (row) => row.value.toString(),
  },
] satisfies readonly DataTableColumn<TransferRow>[];
```

## 4. Smallest render — `BalancesTable.tsx`

```tsx
import { DataTable } from '@openzeppelin/ui-components';

import { balanceColumns, type BalanceRow } from './minimalColumns';

export function BalancesTable({ rows }: { rows: readonly BalanceRow[] }) {
  return (
    <DataTable
      caption="Token balances"
      columns={balanceColumns}
      rows={rows}
      getRowKey={(row) => row.symbol}
      emptyTitle="No balances"
      emptyDescription="Connect a wallet to see token balances."
    />
  );
}
```

## 5. Kit-owned selection, named by a heading — `AccountsSection.tsx`

Identical to
[integration-guide § Pattern 2](../integration-guide.md#pattern-2-kit-owned-selection-named-by-a-page-heading-with-an-empty-state-action).

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

const accountColumns = [
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

## 6. Sortable requests page — `RequestsPage.tsx`

Example 2's columns with a heading-backed name, kit card chrome (no extra wrapper
classes), and an empty-state toggle. Amount and Submitted sort without extra props
(uncontrolled).

```tsx
import { useMemo, useState } from 'react';

import { Button, DataTable } from '@openzeppelin/ui-components';

import { buildRequestColumns, type RequestRow } from './requestColumns';

const sampleRows: readonly RequestRow[] = [
  {
    id: 'req-1',
    holder: '0x1234567890abcdef1234567890abcdef12345678',
    amount: 1_000_000_000_000_000_000n,
    status: 'pending',
    submittedAt: new Date('2026-09-01T10:00:00Z'),
  },
  {
    id: 'req-2',
    holder: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    amount: 250_000_000_000_000_000n,
    status: 'approved',
    submittedAt: new Date('2026-09-03T14:30:00Z'),
  },
];

export function RequestsPage() {
  const [rows, setRows] = useState<readonly RequestRow[]>(sampleRows);

  const columns = useMemo(
    () =>
      buildRequestColumns({
        review: (id) =>
          setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))),
      }),
    []
  );

  return (
    <div style={{ padding: 24, display: 'grid', gap: 12 }}>
      <h1 id="tokenization-requests-heading">Tokenization requests</h1>
      <div>
        <Button variant="outline" onClick={() => setRows(rows.length ? [] : sampleRows)}>
          {rows.length ? 'Clear rows' : 'Restore rows'}
        </Button>
      </div>
      <DataTable
        aria-labelledby="tokenization-requests-heading"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyTitle="No requests"
        emptyDescription="New tokenization requests will appear here."
      />
    </div>
  );
}
```

## 7. Client pagination — `BalancesPaged.tsx`

```tsx
import { useState } from 'react';

import { DataTable } from '@openzeppelin/ui-components';

import { balanceColumns, type BalanceRow } from './minimalColumns';

export function BalancesPaged({ rows }: { rows: readonly BalanceRow[] }) {
  const [pageIndex, setPageIndex] = useState(0);

  return (
    <DataTable
      caption="Token balances"
      columns={balanceColumns}
      rows={rows}
      getRowKey={(row) => row.symbol}
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

Numbered page buttons appear automatically when the total is known. Jump with those
buttons or with Previous/Next; the current page has `aria-current="page"`.

## 8. Virtualized list — `BalancesVirtualized.tsx`

```tsx
import { DataTable } from '@openzeppelin/ui-components';

import { balanceColumns, type BalanceRow } from './minimalColumns';

export function BalancesVirtualized({ rows }: { rows: readonly BalanceRow[] }) {
  return (
    <DataTable
      caption="Token balances"
      columns={balanceColumns}
      rows={rows}
      getRowKey={(row) => row.symbol}
      virtualized={{ maxHeight: 384 }}
    />
  );
}
```

## 9. Virtualized large page — `BalancesPagedVirtualized.tsx`

```tsx
import { useState } from 'react';

import { DataTable } from '@openzeppelin/ui-components';

import { balanceColumns, type BalanceRow } from './minimalColumns';

export function BalancesPagedVirtualized({ rows }: { rows: readonly BalanceRow[] }) {
  const [pageIndex, setPageIndex] = useState(0);

  return (
    <DataTable
      caption="Token balances"
      columns={balanceColumns}
      rows={rows}
      getRowKey={(row) => row.symbol}
      pagination={{
        kind: 'client',
        pageIndex,
        pageSize: 200,
        onPageChange: setPageIndex,
      }}
      virtualized={{ maxHeight: 480 }}
    />
  );
}
```

## 10. Virtualized infinite feed — `ActivityFeedTable.tsx`

Same columns as example 4. The app owns the cursor and the fetch; the table only reports
end-reached. Identical to
[integration-guide § Pattern 8](../integration-guide.md#pattern-8-infinite-scroll-alone-and-with-virtualization).

```tsx
import { useCallback, useState } from 'react';

import { DataTable } from '@openzeppelin/ui-components';

import { balanceColumns, type BalanceRow } from './minimalColumns';

interface ActivityFeedTableProps {
  initialRows: readonly BalanceRow[];
  fetchNext: (cursor: string | null) => Promise<{
    rows: readonly BalanceRow[];
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
      caption="Token balances"
      columns={balanceColumns}
      rows={rows}
      getRowKey={(row) => row.symbol}
      virtualized={{ maxHeight: 480 }}
      infiniteScroll={{ hasMore, busy, onLoadMore }}
    />
  );
}
```

## Running them

1. Scaffold a Vite React TypeScript app and install the kit.
2. Copy `requestColumns.tsx` and `RequestsPage.tsx` into `src/`.
3. Render `<RequestsPage />` from your root component.
4. Click **Clear rows** to see the empty state keep the caption and headers in place.
   Click Amount to cycle sort.

To verify accessible names, open the browser's accessibility inspector: the table is
named "Tokenization requests" even though there is no visible caption inside the card, the
last column is announced as "Actions", and a sorted Amount header exposes `aria-sort`. A
virtualized table additionally exposes `aria-rowcount` including the header row.

## Kit contributors: running the table's own tests

```bash
pnpm --filter @openzeppelin/ui-components test            # jsdom suites, including *.sf1–*.sf9
pnpm --filter @openzeppelin/ui-components test:browser    # Chromium: a11y tree, keyboard, RTL, axe, virtualization, infinite append
```

The browser suite needs Playwright's Chromium (`pnpm --filter @openzeppelin/ui-components
exec playwright install chromium`). GitHub CI runs both.
