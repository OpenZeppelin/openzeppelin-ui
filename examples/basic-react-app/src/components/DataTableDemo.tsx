import { useMemo, useState, type ReactElement } from 'react';

import {
  AddressDisplay,
  Badge,
  Button,
  DataTable,
  type BadgeTone,
  type DataTableColumn,
} from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Sample row shape an integrator would own. The kit table is generic over `Row`;
 * it never fetches and never infers columns from field names.
 */
interface TokenHoldingsRow {
  readonly id: string;
  readonly token: string;
  readonly holder: string;
  readonly status: 'active' | 'paused' | 'revoked';
  readonly amount: bigint;
}

const SAMPLE_ROWS: readonly TokenHoldingsRow[] = [
  {
    id: 'row-usdc-alice',
    token: 'USDC',
    holder: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    status: 'active',
    amount: 1_250_000n,
  },
  {
    id: 'row-weth-bob',
    token: 'WETH',
    holder: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5',
    status: 'paused',
    amount: 42n,
  },
  {
    id: 'row-dai-carol',
    token: 'DAI',
    holder: '0x220866B1A2219f40e72fD305F75c044FAE8A27D0',
    status: 'active',
    amount: 8_400n,
  },
  {
    id: 'row-usdt-dave',
    token: 'USDT',
    holder: '0x388C818CA8B9251b393131C08a736A67ccB19297',
    status: 'revoked',
    amount: 500n,
  },
];

const STATUS_LABEL: Record<TokenHoldingsRow['status'], string> = {
  active: 'Active',
  paused: 'Paused',
  revoked: 'Revoked',
};

const STATUS_TONE: Record<TokenHoldingsRow['status'], BadgeTone> = {
  active: 'success',
  paused: 'warning',
  revoked: 'danger',
};

function formatAmount(amount: bigint): string {
  return amount.toLocaleString();
}

/**
 * Column declarations as data: mixed composition (AddressDisplay, Badge, Button),
 * one end-aligned numeric column, sortable vs unsortable columns.
 */
const COLUMNS: readonly DataTableColumn<TokenHoldingsRow>[] = [
  {
    id: 'token',
    header: 'Token',
    sortable: true,
    getSortValue: (row) => row.token,
    cell: (row) => row.token,
  },
  {
    id: 'holder',
    header: 'Holder',
    cell: (row) => (
      <AddressDisplay address={row.holder} showCopyButton startChars={6} endChars={4} />
    ),
  },
  {
    id: 'status',
    header: 'Status',
    sortable: true,
    getSortValue: (row) => row.status,
    cell: (row) => <Badge label={STATUS_LABEL[row.status]} tone={STATUS_TONE[row.status]} />,
  },
  {
    id: 'amount',
    header: 'Amount',
    align: 'end',
    sortable: true,
    getSortValue: (row) => row.amount,
    cell: (row) => formatAmount(row.amount),
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
];

const USAGE_EXAMPLE = `import {
  AddressDisplay,
  Badge,
  DataTable,
  type DataTableColumn,
} from '@openzeppelin/ui-components';

interface TokenHoldingsRow {
  id: string;
  token: string;
  holder: string;
  status: 'active' | 'paused' | 'revoked';
  amount: bigint;
}

const columns: DataTableColumn<TokenHoldingsRow>[] = [
  {
    id: 'token',
    header: 'Token',
    sortable: true,
    getSortValue: (row) => row.token,
    cell: (row) => row.token,
  },
  {
    id: 'holder',
    header: 'Holder',
    cell: (row) => <AddressDisplay address={row.holder} showCopyButton />,
  },
  {
    id: 'status',
    header: 'Status',
    sortable: true,
    getSortValue: (row) => row.status,
    cell: (row) => <Badge label={row.status} />,
  },
  {
    id: 'amount',
    header: 'Amount',
    align: 'end',
    sortable: true,
    getSortValue: (row) => row.amount,
    cell: (row) => row.amount.toLocaleString(),
  },
];

<DataTable
  caption="Token holdings"
  columns={columns}
  rows={rows}
  getRowKey={(row) => row.id}
  emptyTitle="No holdings"
  emptyDescription="There are no token holdings to display."
/>`;

interface CatalogRow {
  readonly id: string;
  readonly token: string;
  readonly holder: string;
  readonly status: TokenHoldingsRow['status'];
  readonly amount: bigint;
}

const CATALOG_HOLDERS = SAMPLE_ROWS.map((row) => row.holder);
const CATALOG_STATUSES: readonly TokenHoldingsRow['status'][] = ['active', 'paused', 'revoked'];

function catalogRows(count: number, offset = 0): CatalogRow[] {
  return Array.from({ length: count }, (_, index) => {
    const n = offset + index;
    const holder = CATALOG_HOLDERS[n % CATALOG_HOLDERS.length];
    const status = CATALOG_STATUSES[n % CATALOG_STATUSES.length];
    return {
      id: `catalog-${String(n)}`,
      token: `Asset ${String(n + 1)}`,
      holder: holder ?? '',
      status: status ?? 'active',
      amount: BigInt(n + 1),
    };
  });
}

function catalogColumns(sortable: boolean): readonly DataTableColumn<CatalogRow>[] {
  const sortByToken = sortable
    ? { sortable: true as const, getSortValue: (row: CatalogRow) => row.token }
    : {};
  const sortByStatus = sortable
    ? { sortable: true as const, getSortValue: (row: CatalogRow) => row.status }
    : {};
  const sortByAmount = sortable
    ? { sortable: true as const, getSortValue: (row: CatalogRow) => row.amount }
    : {};

  return [
    {
      id: 'token',
      header: 'Token',
      ...sortByToken,
      cell: (row) => row.token,
    },
    {
      id: 'holder',
      header: 'Holder',
      cell: (row) => (
        <AddressDisplay address={row.holder} showCopyButton startChars={6} endChars={4} />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      ...sortByStatus,
      cell: (row) => <Badge label={STATUS_LABEL[row.status]} tone={STATUS_TONE[row.status]} />,
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'end',
      ...sortByAmount,
      cell: (row) => row.amount.toLocaleString(),
    },
    {
      id: 'actions',
      header: '',
      headerLabel: 'Actions',
      align: 'end',
      headerClassName: 'w-32',
      cell: () => (
        <Button type="button" variant="outline" size="sm">
          View
        </Button>
      ),
    },
  ];
}

const CATALOG_COLUMNS = catalogColumns(false);
const CATALOG_COLUMNS_SORTABLE = catalogColumns(true);

function SelectableAccountsTable(): ReactElement {
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Row selection</h3>
          <p className="text-muted-foreground text-sm">
            Role Manager-style controlled selection composed with sortable columns.
          </p>
        </div>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {selectedKeys.size} of {SAMPLE_ROWS.length} accounts selected
        </p>
      </div>
      <DataTable
        caption="Accounts (selectable)"
        columns={COLUMNS}
        rows={SAMPLE_ROWS}
        getRowKey={(row) => row.id}
        selection={{
          selectedKeys,
          onSelectionChange: setSelectedKeys,
          selectAllLabel: 'Select all accounts',
          getCheckboxLabel: (row) => `Select ${row.token} account`,
          columnHeaderLabel: 'Select accounts',
        }}
      />
    </div>
  );
}

function VirtualizedCatalogTable(): ReactElement {
  const rows = useMemo(() => catalogRows(200), []);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Virtualized</h3>
      <p className="text-muted-foreground text-sm">
        Same column contract with `virtualized` so only the visible window mounts.
      </p>
      <DataTable
        caption="Large catalog (virtualized)"
        columns={CATALOG_COLUMNS_SORTABLE}
        rows={rows}
        getRowKey={(row) => row.id}
        virtualized
      />
    </div>
  );
}

function PaginatedCatalogTable(): ReactElement {
  const rows = useMemo(() => catalogRows(100), []);
  const [pageIndex, setPageIndex] = useState(0);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Paginated</h3>
      <p className="text-muted-foreground text-sm">
        Client pagination with numbered page controls. The app owns `pageIndex`; the table slices
        the in-memory list and shows a bounded page window with ellipsis when there are many pages.
      </p>
      <DataTable
        caption="Catalog (paginated)"
        columns={CATALOG_COLUMNS_SORTABLE}
        rows={rows}
        getRowKey={(row) => row.id}
        pagination={{
          kind: 'client',
          pageIndex,
          pageSize: 5,
          onPageChange: setPageIndex,
        }}
      />
    </div>
  );
}

function InfiniteCatalogTable(): ReactElement {
  const [rows, setRows] = useState<readonly CatalogRow[]>(() => catalogRows(12));
  const [hasMore, setHasMore] = useState(true);

  const onLoadMore = (): void => {
    if (!hasMore) {
      return;
    }
    const next = [...rows, ...catalogRows(12, rows.length)];
    setRows(next);
    if (next.length >= 48) {
      setHasMore(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Infinite scroll</h3>
      <p className="text-muted-foreground text-sm">
        In-memory appends on `onLoadMore`. No fetch client — the kit only signals intent.
      </p>
      <DataTable
        caption="Catalog (infinite)"
        columns={CATALOG_COLUMNS}
        rows={rows}
        getRowKey={(row) => row.id}
        virtualized
        infiniteScroll={{ hasMore, onLoadMore }}
      />
    </div>
  );
}

/**
 * Example-app consumption of kit DataTable: column-as-data, composed cells,
 * end-aligned amounts, client sort, and a live empty-state path, plus controlled
 * selection, virtualized, paginated, and infinite-scroll variants.
 */
export function DataTableDemo(): ReactElement {
  const [rows, setRows] = useState<readonly TokenHoldingsRow[]>(SAMPLE_ROWS);

  return (
    <DemoSection
      title="DataTable"
      description="A presentational table declared from column definitions. Import it from the kit barrel — mixed cell composition, end-aligned numerics, client-side sorting, controlled row selection, and an empty state when the row source is empty. The same page also shows virtualized, paginated, and infinite-scroll variants. The table does not fetch."
      codeExample={USAGE_EXAMPLE}
    >
      <div className="flex flex-wrap items-center gap-3">
        {rows.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setRows([])}>
            Clear rows
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setRows(SAMPLE_ROWS)}>
            Restore sample rows
          </Button>
        )}
        <p className="text-muted-foreground text-sm">
          {rows.length === 0
            ? 'Empty-state path: the section stays mounted with zero rows.'
            : 'Click a sortable header (Token, Status, Amount) to cycle asc → desc → unsorted. Holder and Actions are not sortable.'}
        </p>
      </div>

      <DataTable
        caption="Token holdings"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-muted-foreground text-sm">
              Row source is empty. The table stays mounted; restore sample holdings to continue.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setRows(SAMPLE_ROWS)}>
              Restore sample rows
            </Button>
          </div>
        }
      />

      <SelectableAccountsTable />
      <VirtualizedCatalogTable />
      <PaginatedCatalogTable />
      <InfiniteCatalogTable />
    </DemoSection>
  );
}
