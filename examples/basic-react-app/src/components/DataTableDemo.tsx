import { useMemo, useState, type ReactElement } from 'react';

import {
  AddressDisplay,
  Badge,
  Button,
  DataTable,
  Input,
  type BadgeTone,
  type DataTableColumn,
  type DataTableGrouping,
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

interface SelectableAccountsTableProps {
  readonly title: string;
  readonly description: string;
  readonly caption: string;
  /** Unique per instance so each table's search box has its own label target. */
  readonly searchInputId: string;
  readonly hideHeaderWhenEmpty?: boolean;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
}

function SelectableAccountsTable({
  title,
  description,
  caption,
  searchInputId,
  hideHeaderWhenEmpty,
  emptyTitle,
  emptyDescription,
}: SelectableAccountsTableProps): ReactElement {
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') {
      return SAMPLE_ROWS;
    }
    return SAMPLE_ROWS.filter(
      (row) =>
        row.token.toLowerCase().includes(normalizedQuery) ||
        row.holder.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {selectedKeys.size} of {SAMPLE_ROWS.length} accounts selected
        </p>
      </div>
      <DataTable
        caption={caption}
        columns={COLUMNS}
        rows={visibleRows}
        getRowKey={(row) => row.id}
        hideHeaderWhenEmpty={hideHeaderWhenEmpty}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        toolbar={
          <div className="flex flex-wrap items-center gap-3 p-4">
            <label htmlFor={searchInputId} className="text-sm font-medium">
              Filter accounts
            </label>
            <Input
              id={searchInputId}
              className="max-w-sm"
              value={query}
              placeholder="Token or holder address"
              onChange={(event) => {
                setQuery(event.target.value);
                setPageIndex(0);
              }}
            />
          </div>
        }
        selection={{
          selectedKeys,
          onSelectionChange: setSelectedKeys,
          selectAllLabel: 'Select all accounts',
          getCheckboxLabel: (row) => `Select ${row.token} account`,
          columnHeaderLabel: 'Select accounts',
          columnClassName: 'w-12',
        }}
        getRowClassName={(row) => (row.status === 'revoked' ? 'hover:bg-muted/30' : undefined)}
        pagination={{
          kind: 'client',
          pageIndex,
          pageSize: 2,
          onPageChange: setPageIndex,
          placement: 'inside',
          hideStatus: true,
          className: 'bg-muted/20',
          paginationLabel: 'Accounts pagination',
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

/** Access-control key row for the grouped-rows demo. `role` is optional on purpose. */
interface KeyRow {
  readonly id: string;
  readonly role?: 'Admin' | 'Minter' | 'Pauser';
  readonly account: string;
  readonly label: string;
  readonly addedAt: Date;
}

const KEY_ROLES = ['Admin', 'Minter', 'Pauser'] as const;
const KEY_EPOCH_MS = Date.UTC(2026, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Deterministic key rows (no `Math.random`), so the proof script can assert exact
 * counts and orders. Roles cycle through the input, so grouping has to gather them.
 */
function keyRows(count: number, withoutRole: readonly number[] = []): KeyRow[] {
  return Array.from({ length: count }, (_, n) => ({
    id: `key-${String(n)}`,
    role: withoutRole.includes(n) ? undefined : KEY_ROLES[n % KEY_ROLES.length],
    account: `0x${(n + 1).toString(16).padStart(4, '0')}${'ab'.repeat(18)}`,
    label: `Signer ${String(n + 1).padStart(3, '0')}`,
    addedAt: new Date(KEY_EPOCH_MS + ((n * 37) % 300) * DAY_MS),
  }));
}

/** No Role column: the section row carries the role. */
const KEY_COLUMNS: readonly DataTableColumn<KeyRow>[] = [
  {
    id: 'account',
    header: 'Account',
    cell: (row) => (
      <AddressDisplay address={row.account} showCopyButton startChars={6} endChars={4} />
    ),
  },
  {
    id: 'label',
    header: 'Label',
    sortable: true,
    getSortValue: (row) => row.label,
    cell: (row) => row.label,
  },
  {
    id: 'added',
    header: 'Added',
    sortable: true,
    getSortValue: (row) => row.addedAt,
    cell: (row) => row.addedAt.toISOString().slice(0, 10),
  },
];

const NO_ROLE_LABEL = 'No role';

function GroupedKeysTable(): ReactElement {
  // 120 role keys, 3 of them without a role (interleaved in the input).
  const rows = useMemo(() => keyRows(120, [10, 55, 100]), []);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const grouping: DataTableGrouping<KeyRow> = {
    getGroupKey: (row) => row.role,
    ungroupedLabel: NO_ROLE_LABEL,
    renderGroupHeader: ({ key, rows: groupRows }) => (
      <span className="flex items-center gap-2">
        {key ?? NO_ROLE_LABEL}
        <Badge label={`${String(groupRows.length)} keys`} tone="neutral" />
      </span>
    ),
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {selectedKeys.size} of {rows.length} keys selected
      </p>
      <DataTable
        caption="Keys by role"
        columns={KEY_COLUMNS}
        rows={rows}
        getRowKey={(row) => row.id}
        grouping={grouping}
        selection={{
          selectedKeys,
          onSelectionChange: setSelectedKeys,
          selectAllLabel: 'Select all keys',
          getCheckboxLabel: (row) => `Select ${row.label}`,
          columnHeaderLabel: 'Select keys',
        }}
        virtualized
      />
    </div>
  );
}

function PaginatedGroupedKeysTable(): ReactElement {
  // Admin 4, Minter 5, Pauser 3: pages of 5 split Minter and Pauser across pages.
  const rows = useMemo(
    () =>
      keyRows(12).map((row, n) => ({
        ...row,
        role: n < 4 ? ('Admin' as const) : n < 9 ? ('Minter' as const) : ('Pauser' as const),
      })),
    []
  );
  const [pageIndex, setPageIndex] = useState(0);

  return (
    <DataTable
      caption="Keys by role (paginated)"
      columns={KEY_COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      grouping={{
        getGroupKey: (row) => row.role,
        renderGroupHeader: ({ key, continued }) =>
          `${key ?? NO_ROLE_LABEL}${continued ? ' (continued)' : ''}`,
        // A consumer fill for the section rows; it replaces the kit default `bg-*`.
        groupRowClassName: 'bg-muted',
      }}
      pagination={{
        kind: 'client',
        pageIndex,
        pageSize: 5,
        onPageChange: setPageIndex,
        placement: 'inside',
      }}
    />
  );
}

function GroupedRowsDemo(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium">Grouped rows</h3>
        <p className="text-muted-foreground text-sm">
          `grouping` paints a section row before each group under one column header. Sorting by
          Label or Added reorders keys inside each role, and the roles stay in place. Select all
          picks every key and no section rows. Keys without a role go to a trailing section. The
          paginated table repeats a split role at the top of the next page, and its section rows
          take a consumer fill through `groupRowClassName`.
        </p>
      </div>
      <GroupedKeysTable />
      <PaginatedGroupedKeysTable />
    </div>
  );
}

/**
 * Example-app consumption of kit DataTable: column-as-data, composed cells,
 * end-aligned amounts, client sort, and a live empty-state path, plus controlled
 * selection, in-frame consumer chrome, virtualized, paginated, and infinite-scroll variants.
 */
export function DataTableDemo(): ReactElement {
  const [rows, setRows] = useState<readonly TokenHoldingsRow[]>(SAMPLE_ROWS);

  return (
    <DemoSection
      title="DataTable"
      description="A presentational table declared from column definitions. Import it from the kit barrel — mixed cell composition, end-aligned numerics, client-side sorting, controlled row selection, in-frame consumer chrome, and an empty state when the row source is empty. The same page also shows virtualized, paginated, and infinite-scroll variants. The table does not fetch."
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

      <SelectableAccountsTable
        title="Row selection"
        description="Role Manager-style controlled selection composed with sortable columns."
        caption="Accounts (selectable)"
        searchInputId="data-table-account-search"
      />
      <SelectableAccountsTable
        title="Empty results without a header"
        description="Same table with hideHeaderWhenEmpty: type a query with no match and the column header row gives way to the empty state; clear it and the header, sort and selection come back."
        caption="Accounts (header hides when empty)"
        searchInputId="data-table-account-search-hide-header"
        hideHeaderWhenEmpty
        emptyTitle="No matching accounts"
        emptyDescription="Try a different token or holder address."
      />
      <GroupedRowsDemo />
      <VirtualizedCatalogTable />
      <PaginatedCatalogTable />
      <InfiniteCatalogTable />
    </DemoSection>
  );
}
