import type { ReactNode, Ref } from 'react';

import type {
  DataTableColumn,
  DataTableInfiniteScroll,
  DataTableLoadStrategy,
  DataTablePagination,
  DataTableProps,
  DataTableSelection,
  DataTableSortButtonNameInfo,
  DataTableSortState,
  DataTableVirtualization,
  DataTableVirtualizationHandle,
} from '../types';

export type TokenRow = {
  id: string;
  label: string;
  amount: bigint;
  status: string;
};

export const TOKEN_ROWS: readonly TokenRow[] = [
  { id: 'a', label: 'Alpha', amount: 10n, status: 'Active' },
  { id: 'b', label: 'Beta', amount: 20n, status: 'Paused' },
  { id: 'c', label: 'Gamma', amount: 30n, status: 'Active' },
];

/** Stable row identity for SF-2 mounts (`getRowKey`). */
export function getTokenRowKey(row: TokenRow): string {
  return row.id;
}

/** Sequential in-memory rows for paging windows (INV-97 / INV-108). */
export function numberedTokenRows(count: number): TokenRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `r${String(index)}`,
    label: `R${String(index)}`,
    amount: BigInt(index),
    status: 'Active',
  }));
}

/** Mixed label / end-aligned amount / status columns used across SF-2 suites. */
export function tokenColumns(overrides?: {
  cell?: (row: TokenRow) => ReactNode;
  amountCell?: (row: TokenRow) => ReactNode;
}): DataTableColumn<TokenRow>[] {
  return [
    {
      id: 'label',
      header: 'Label',
      cell: overrides?.cell ?? ((row) => row.label),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'end',
      sortable: true,
      getSortValue: (row) => row.amount,
      cell: overrides?.amountCell ?? ((row) => String(row.amount)),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => row.status,
    },
  ];
}

type CaptionTableOverrides = {
  columns?: DataTableColumn<TokenRow>[];
  rows?: readonly TokenRow[];
  getRowKey?: (row: TokenRow) => string;
  emptyState?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  tableClassName?: string;
  caption?: ReactNode;
  captionClassName?: string;
  sort?: DataTableSortState | null;
  defaultSort?: DataTableSortState | null;
  onSortChange?: (next: DataTableSortState | null) => void;
  virtualized?: boolean | DataTableVirtualization;
  scrollRef?: Ref<HTMLDivElement | null>;
  virtualizationRef?: Ref<DataTableVirtualizationHandle | null>;
  selection?: DataTableSelection<TokenRow>;
  formatSortButtonName?: (info: DataTableSortButtonNameInfo) => string;
  stickyHeader?: boolean;
  toolbar?: ReactNode;
  getRowClassName?: (row: TokenRow) => string | undefined;
} & DataTableLoadStrategy;

/**
 * INV-307 hatch: both load strategies may be defined here so runtime pager-wins
 * tests can mount without widening `DataTable(props: DataTableProps)`.
 */
export type DualLoadTableProps<Row> = Omit<DataTableProps<Row>, 'pagination' | 'infiniteScroll'> & {
  readonly pagination?: DataTablePagination;
  readonly infiniteScroll?: DataTableInfiniteScroll;
};

/**
 * Assert dual load-strategy props onto `DataTableProps` for INV-112 runtime tests.
 * Typed `DataTable` stays XOR; this hatch is tests-only (INV-307).
 */
export function untypedDataTableProps<Row>(props: DualLoadTableProps<Row>): DataTableProps<Row> {
  return props as DataTableProps<Row>;
}

/** Caption-branch `DataTableProps` with optional overrides. Load extras are XOR (INV-307). */
export function captionTableProps(extra?: CaptionTableOverrides): DataTableProps<TokenRow> {
  // Union extras cannot be proven after spreads; the parameter stays XOR so
  // both-defined literals fail at the call site. Dual-prop tests use untypedDataTableProps.
  return {
    caption: extra?.caption ?? 'Tokenization requests',
    captionClassName: extra?.captionClassName,
    columns: extra?.columns ?? tokenColumns(),
    rows: extra?.rows ?? TOKEN_ROWS,
    getRowKey: extra?.getRowKey ?? getTokenRowKey,
    emptyState: extra?.emptyState,
    emptyTitle: extra?.emptyTitle,
    emptyDescription: extra?.emptyDescription,
    className: extra?.className,
    tableClassName: extra?.tableClassName,
    ...(extra && 'sort' in extra ? { sort: extra.sort } : {}),
    ...(extra && 'defaultSort' in extra ? { defaultSort: extra.defaultSort } : {}),
    ...(extra && 'onSortChange' in extra ? { onSortChange: extra.onSortChange } : {}),
    ...(extra && 'pagination' in extra ? { pagination: extra.pagination } : {}),
    ...(extra && 'infiniteScroll' in extra ? { infiniteScroll: extra.infiniteScroll } : {}),
    ...(extra && 'virtualized' in extra ? { virtualized: extra.virtualized } : {}),
    ...(extra && 'scrollRef' in extra ? { scrollRef: extra.scrollRef } : {}),
    ...(extra && 'virtualizationRef' in extra
      ? { virtualizationRef: extra.virtualizationRef }
      : {}),
    ...(extra && 'selection' in extra ? { selection: extra.selection } : {}),
    ...(extra && 'formatSortButtonName' in extra
      ? { formatSortButtonName: extra.formatSortButtonName }
      : {}),
    ...(extra && 'stickyHeader' in extra ? { stickyHeader: extra.stickyHeader } : {}),
    ...(extra && 'toolbar' in extra ? { toolbar: extra.toolbar } : {}),
    ...(extra && 'getRowClassName' in extra ? { getRowClassName: extra.getRowClassName } : {}),
  } as DataTableProps<TokenRow>;
}
