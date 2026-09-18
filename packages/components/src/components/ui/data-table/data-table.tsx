import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { cn, logger } from '@openzeppelin/ui-utils';

import { Checkbox } from '../checkbox';
import { EmptyState } from '../empty-state';
import {
  DATA_TABLE_HEADER_CELL_CHROME,
  DATA_TABLE_HEADER_CELL_STICKY_CHROME,
  DATA_TABLE_PAGINATION_ROOT_CHROME,
} from './chrome';
import { DataTableScroller } from './data-table-scroller';
import {
  alignClass,
  buildPageItems,
  defaultPaginationStatus,
  headerNamesItself,
  isNonblank,
  isTotalKnown,
  isUsablePageIndex,
  paginationStatusInfo,
  resolveAlign,
  resolveColumnName,
  resolvePageCount,
  resolvePageSize,
  sliceClientPage,
} from './helpers';
import { DataTablePaginationControls } from './pagination-controls';
import {
  applicableRowKeys,
  headerSelectionState,
  nextSetFromHeaderAction,
  nextSetWithRowKey,
} from './selection';
import { applyClientSort, isColumnSortable, nextSortState, resolveEffectiveSort } from './sort';
import {
  DATA_TABLE_SELECT_COLUMN_ID,
  type DataTableColumn,
  type DataTableProps,
  type DataTableSortDirection,
  type DataTableSortState,
} from './types';
import { resolveVirtualization } from './virtualization';

const IS_DEV = process.env.NODE_ENV !== 'production';

const DATA_TABLE_DIAGNOSTIC_SYSTEM = 'DataTable';

/** INV-55: the only kit-authored visible copy; both strings are overridable. */
const DEFAULT_EMPTY_TITLE = 'Nothing to show';
const DEFAULT_EMPTY_DESCRIPTION = 'There are no rows to display.';

/** Native sort control: muted, borderless, `inline-flex` on the button only (INV-87, INV-90). */
const SORT_BUTTON_CLASS =
  'inline-flex items-center gap-1 border-0 bg-transparent p-0 font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function emitDevError(message: string): void {
  logger.error(DATA_TABLE_DIAGNOSTIC_SYSTEM, message);
}

function isSortControlled<Row>(props: DataTableProps<Row>): boolean {
  return 'sort' in props && props.sort !== undefined;
}

function sortIconFor(direction: DataTableSortDirection | undefined): ReactElement {
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;
  return <Icon className="size-4 shrink-0" aria-hidden="true" />;
}

function siblingSortButtonName<Row>(
  column: DataTableColumn<Row>,
  active: DataTableSortState | null
): string {
  const base = `Sort by ${resolveColumnName(column)}`;
  if (active == null || active.columnId !== column.id) {
    return base;
  }
  return `${base}, ${active.direction === 'asc' ? 'ascending' : 'descending'}`;
}

function headerAriaSort(
  columnId: string,
  effectiveSort: DataTableSortState | null
): 'ascending' | 'descending' | undefined {
  if (effectiveSort == null || effectiveSort.columnId !== columnId) {
    return undefined;
  }
  return effectiveSort.direction === 'asc' ? 'ascending' : 'descending';
}

/**
 * Presentational, accessible data table.
 *
 * Additive sort (INV-61 … INV-93):
 * - Affordance iff `column.sortable === true` (INV-11 / INV-61).
 * - Client reorder iff that column also provides `getSortValue` (INV-10 / INV-68).
 * - Never fetches. Never mutates `rows` / `columns`.
 * - `getSortValue` is invoked only while deriving client-sorted display rows (INV-16 / INV-76).
 *
 * Additive pagination (INV-94 … INV-113, INV-232 … INV-261):
 * - Optional `pagination`; omitted DOM stays the SF-2 wrapper (INV-94).
 * - `kind: 'client'` slices sorted `displayRows`; `kind: 'server'` does not
 *   reorder a partial page (INV-97 / INV-102).
 * - Numbered page controls when total is known; unknown total omits numbers
 *   and does not invent a last page (INV-232).
 * - Never fetches. Never stores `pageIndex`. Never moves keyboard focus into a row.
 *
 * Additive virtualization (INV-114 … INV-148):
 * - Opt-in `virtualized`; windows `bodyRows` only (INV-119).
 * - `useVirtualizer` lives in `data-table-scroller.tsx`, not here (INV-132).
 *
 * Additive infinite scroll (INV-149 … INV-175):
 * - Optional `infiniteScroll`; pager-wins if `pagination` is also set (INV-112).
 * - Never fetches. Never writes scroll position on append. Never calls onLoadMore during render.
 *
 * A throwing `cell` or `getSortValue` propagates to the nearest app error boundary
 * (INV-51 / INV-80). Generic function component so `Row` infers from `columns` /
 * `rows` at the call site (INV-41).
 */
export function DataTable<Row>(props: DataTableProps<Row>): ReactElement {
  const {
    columns,
    rows,
    getRowKey,
    selection,
    emptyState,
    emptyTitle,
    emptyDescription,
    className,
    tableClassName,
    defaultSort,
    onSortChange,
    pagination,
    infiniteScroll,
    stickyHeader,
    virtualized,
    scrollRef,
    virtualizationRef,
  } = props;

  const headerIsSticky = stickyHeader !== false;
  const caption = props.caption;
  const captionClassName = props.captionClassName;
  const ariaLabel = props['aria-label'];
  const ariaLabelledBy = props['aria-labelledby'];

  const hasCaption = caption !== undefined;
  const nameKind = hasCaption ? 'caption' : ariaLabelledBy !== undefined ? 'labelledby' : 'label';

  const infiniteIgnored = pagination != null && infiniteScroll != null;
  const infiniteActive = infiniteScroll != null && pagination == null;
  const infiniteHasMore = infiniteActive && infiniteScroll.hasMore === true;
  const infiniteBusy = infiniteActive && infiniteScroll.busy === true;

  const sortControlled = isSortControlled(props);
  const [uncontrolledSort, setUncontrolledSort] = useState<DataTableSortState | null>(
    () => defaultSort ?? null
  );
  const requestedSort = sortControlled ? (props.sort ?? null) : uncontrolledSort;
  const effectiveSort = resolveEffectiveSort(requestedSort, columns);
  // INV-97 / INV-155: server pages and active feeds skip applyClientSort.
  const skipClientSort = pagination?.kind === 'server' || infiniteActive;
  const displayRows: readonly Row[] = skipClientSort
    ? rows
    : applyClientSort(rows, columns, effectiveSort);

  const pageSizeResolved = pagination != null ? resolvePageSize(pagination.pageSize) : 1;
  const serverTotalCount = pagination?.kind === 'server' ? pagination.totalCount : undefined;
  const serverTotalOmitted = pagination?.kind === 'server' && serverTotalCount === undefined;
  const serverTotalInvalid =
    pagination?.kind === 'server' &&
    serverTotalCount !== undefined &&
    (!Number.isFinite(serverTotalCount) || serverTotalCount < 0);
  const totalKnown = pagination != null && isTotalKnown(pagination, rows.length);
  const knownTotalCount = totalKnown
    ? pagination.kind === 'client'
      ? rows.length
      : ((pagination.kind === 'server' ? pagination.totalCount : undefined) ?? 0)
    : null;

  const bodyRows: readonly Row[] =
    pagination?.kind === 'client'
      ? sliceClientPage(displayRows, pagination.pageIndex, pagination.pageSize)
      : displayRows;

  const applicableKeys = selection == null ? [] : applicableRowKeys(bodyRows, getRowKey);
  const selectionState =
    selection == null ? 'none' : headerSelectionState(selection.selectedKeys, applicableKeys);
  const selectionColumn: DataTableColumn<Row> | null =
    selection == null
      ? null
      : {
          id: DATA_TABLE_SELECT_COLUMN_ID,
          headerLabel: selection.columnHeaderLabel ?? 'Select',
          header: (
            <Checkbox
              aria-label={selection.selectAllLabel ?? 'Select all'}
              checked={selectionState === 'some' ? 'indeterminate' : selectionState === 'all'}
              disabled={applicableKeys.length === 0}
              onCheckedChange={() => {
                selection.onSelectionChange(
                  nextSetFromHeaderAction(selection.selectedKeys, applicableKeys, selectionState)
                );
              }}
            />
          ),
          cell: (row) => {
            const rowKey = getRowKey(row);
            const isSelected = selection.selectedKeys.has(rowKey);
            return (
              <Checkbox
                aria-label={selection.getCheckboxLabel?.(row) ?? `Select ${rowKey}`}
                checked={isSelected}
                onCheckedChange={() => {
                  selection.onSelectionChange(
                    nextSetWithRowKey(selection.selectedKeys, rowKey, !isSelected)
                  );
                }}
              />
            );
          },
        };
  const paintColumns: readonly DataTableColumn<Row>[] =
    selectionColumn == null ? columns : [selectionColumn, ...columns];

  const pageCount =
    pagination != null && knownTotalCount != null
      ? resolvePageCount(knownTotalCount, pagination.pageSize)
      : null;
  const pageItems =
    pagination != null && totalKnown && pageCount != null
      ? buildPageItems(pagination.pageIndex, pageCount)
      : [];
  const paginationBusy = pagination?.busy === true;
  const pageIndexUsable = pagination != null && isUsablePageIndex(pagination.pageIndex);
  const previousDisabled =
    pagination == null || paginationBusy || !pageIndexUsable || pagination.pageIndex <= 0;
  const nextDisabledByKnownLast =
    totalKnown && pageCount != null && pagination != null && pagination.pageIndex >= pageCount - 1;
  const nextDisabledByUnknownEnd =
    !totalKnown && pagination?.kind === 'server' && pagination.hasNextPage === false;
  const nextDisabled =
    pagination == null ||
    paginationBusy ||
    !pageIndexUsable ||
    nextDisabledByKnownLast ||
    nextDisabledByUnknownEnd;

  const statusInfo =
    pagination == null
      ? null
      : paginationStatusInfo({
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          totalCount: knownTotalCount,
          rowCountOnPage: pagination.kind === 'client' ? bodyRows.length : rows.length,
          totalKnown,
        });

  const statusText =
    statusInfo == null || pagination == null
      ? ''
      : pagination.formatStatus != null
        ? pagination.formatStatus(statusInfo)
        : defaultPaginationStatus(statusInfo);

  const loggedIssuesRef = useRef(new Set<string>());

  useEffect(() => {
    if (!IS_DEV) {
      return;
    }

    const logged = loggedIssuesRef.current;

    const logOnce = (key: string, message: string): void => {
      if (logged.has(key)) {
        return;
      }
      logged.add(key);
      emitDevError(message);
    };

    if (columns.length === 0) {
      logOnce('no-columns', 'DataTable: received no columns.');
    }

    if (selection != null && columns.some((column) => column.id === DATA_TABLE_SELECT_COLUMN_ID)) {
      logOnce(
        'selection:reserved-column-id',
        `DataTable: column id "${DATA_TABLE_SELECT_COLUMN_ID}" is reserved while selection is enabled.`
      );
    }

    const seenIds = new Set<string>();
    for (const column of columns) {
      if (seenIds.has(column.id)) {
        logOnce(`dup-id:${column.id}`, `DataTable: duplicate column id "${column.id}".`);
      } else {
        seenIds.add(column.id);
      }

      if (isColumnSortable(column) && column.getSortValue == null && onSortChange == null) {
        logOnce(
          `sort:intent:${column.id}`,
          `DataTable: column "${column.id}" is sortable without getSortValue and without onSortChange — sort will not change row order.`
        );
      }
    }

    if (requestedSort != null && effectiveSort == null) {
      logOnce(
        `sort:invalid:${requestedSort.columnId}`,
        `DataTable: sort refers to unknown or unsortable column "${requestedSort.columnId}".`
      );
    }

    if (nameKind === 'caption' && typeof caption === 'string' && !isNonblank(caption)) {
      logOnce(
        'name:blank',
        'DataTable: accessible name required — provide exactly one non-blank caption, aria-label or aria-labelledby.'
      );
    }

    if (nameKind === 'label' && !isNonblank(ariaLabel)) {
      logOnce(
        'name:blank',
        'DataTable: accessible name required — provide exactly one non-blank caption, aria-label or aria-labelledby.'
      );
    }

    if (nameKind === 'labelledby') {
      if (!isNonblank(ariaLabelledBy)) {
        logOnce(
          'name:blank',
          'DataTable: accessible name required — provide exactly one non-blank caption, aria-label or aria-labelledby.'
        );
      } else if (document.getElementById(ariaLabelledBy) == null) {
        logOnce(
          `labelledby:missing:${ariaLabelledBy}`,
          `DataTable: aria-labelledby="${ariaLabelledBy}" does not match any element in the document.`
        );
      }
    }

    if (pagination != null) {
      if (!Number.isFinite(pagination.pageSize) || pagination.pageSize <= 0) {
        logOnce('page:pageSize', 'DataTable: pagination.pageSize is invalid; using 1.');
      }

      if (serverTotalInvalid) {
        logOnce('page:totalCount', 'DataTable: pagination.totalCount is invalid.');
      } else if (serverTotalOmitted) {
        logOnce(
          'page:totalCount-omitted',
          'DataTable: pagination.totalCount is omitted; numbered pages are hidden.'
        );
      }

      if (pagination.kind === 'client') {
        const clientPageCount = resolvePageCount(rows.length, pagination.pageSize);
        const pageIndex = pagination.pageIndex;
        const outOfRange =
          !Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= clientPageCount;
        if (outOfRange) {
          logOnce(
            `page:oor:${String(pageIndex)}:${String(clientPageCount)}`,
            `DataTable: pagination.pageIndex ${String(pageIndex)} is out of range for pageCount ${String(clientPageCount)}.`
          );
        }
      }

      if (pagination.kind === 'server' && rows.length > pageSizeResolved) {
        logOnce(
          `page:server-overflow:${String(rows.length)}:${String(pageSizeResolved)}`,
          `DataTable: server pagination received ${String(rows.length)} rows for pageSize ${String(pageSizeResolved)}.`
        );
      }

      if (pagination.formatStatus != null && statusText === '') {
        logOnce(
          'page:empty-status',
          'DataTable: pagination.formatStatus returned an empty string.'
        );
      }
    }

    if (infiniteIgnored) {
      logOnce(
        'infinite:pager-wins',
        'DataTable: pagination and infiniteScroll cannot be combined; infiniteScroll is ignored.'
      );
    }

    if (infiniteActive) {
      const feedHasClientSort = columns.some(
        (column) => isColumnSortable(column) && column.getSortValue != null
      );
      if (feedHasClientSort) {
        logOnce(
          'infinite:client-sort',
          'DataTable: client sort is inert while infiniteScroll is active; row order stays as given.'
        );
      }
    }
  }, [
    ariaLabel,
    ariaLabelledBy,
    caption,
    columns,
    effectiveSort,
    nameKind,
    onSortChange,
    pageSizeResolved,
    pagination,
    serverTotalInvalid,
    serverTotalOmitted,
    requestedSort,
    rows.length,
    selection,
    statusText,
    infiniteActive,
    infiniteIgnored,
  ]);

  const isEmpty = bodyRows.length === 0;
  const suppressEmptyChrome = infiniteActive && isEmpty && (infiniteBusy || infiniteHasMore);
  const emptyColSpan = Math.max(paintColumns.length, 1);
  const virtualizationActive = resolveVirtualization(virtualized, bodyRows.length).active;

  const activateSort = (columnId: string): void => {
    const next = nextSortState(effectiveSort, columnId);
    onSortChange?.(next);
    if (!sortControlled) {
      setUncontrolledSort(next);
    }
  };

  const tableShell = (
    <DataTableScroller
      nameKind={nameKind}
      caption={caption}
      captionClassName={captionClassName}
      ariaLabel={ariaLabel}
      ariaLabelledBy={ariaLabelledBy}
      className={className}
      tableClassName={tableClassName}
      columns={paintColumns}
      bodyRows={bodyRows}
      getRowKey={getRowKey}
      selectedKeys={selection?.selectedKeys}
      isEmpty={isEmpty}
      emptyColSpan={emptyColSpan}
      emptyContent={
        emptyState ?? (
          <EmptyState
            size="small"
            title={emptyTitle ?? DEFAULT_EMPTY_TITLE}
            description={emptyDescription ?? DEFAULT_EMPTY_DESCRIPTION}
          />
        )
      }
      stickyHeader={headerIsSticky}
      virtualized={virtualized}
      scrollRef={scrollRef}
      virtualizationRef={virtualizationRef}
      infiniteHasMore={infiniteHasMore}
      infiniteBusy={infiniteBusy}
      suppressEmptyChrome={suppressEmptyChrome}
      onLoadMore={infiniteActive ? infiniteScroll.onLoadMore : undefined}
      headerRow={
        <tr aria-rowindex={virtualizationActive || infiniteHasMore ? 1 : undefined}>
          {paintColumns.map((column) => {
            const align = resolveAlign(column.align);
            const sortable = isColumnSortable(column);
            const wrapStringHeader = sortable && typeof column.header === 'string';
            const ariaSort = sortable ? headerAriaSort(column.id, effectiveSort) : undefined;
            const activeDirection =
              effectiveSort?.columnId === column.id ? effectiveSort.direction : undefined;
            const thAriaLabel =
              wrapStringHeader || headerNamesItself(column) ? undefined : resolveColumnName(column);

            return (
              <th
                key={column.id}
                scope="col"
                data-slot="data-table-header-cell"
                data-column-id={column.id}
                data-align={align}
                aria-label={thAriaLabel}
                aria-sort={ariaSort}
                className={cn(
                  DATA_TABLE_HEADER_CELL_CHROME,
                  headerIsSticky && DATA_TABLE_HEADER_CELL_STICKY_CHROME,
                  alignClass(align),
                  column.headerClassName
                )}
              >
                {sortable ? (
                  wrapStringHeader ? (
                    <button
                      type="button"
                      className={SORT_BUTTON_CLASS}
                      aria-label={siblingSortButtonName(column, effectiveSort)}
                      onClick={() => {
                        activateSort(column.id);
                      }}
                    >
                      {column.header}
                      {sortIconFor(activeDirection)}
                    </button>
                  ) : (
                    <>
                      {column.header}
                      <button
                        type="button"
                        className={SORT_BUTTON_CLASS}
                        aria-label={siblingSortButtonName(column, effectiveSort)}
                        onClick={() => {
                          activateSort(column.id);
                        }}
                      >
                        {sortIconFor(activeDirection)}
                      </button>
                    </>
                  )
                ) : (
                  column.header
                )}
              </th>
            );
          })}
        </tr>
      }
    />
  );

  if (pagination == null) {
    return tableShell;
  }

  return (
    <div data-slot="data-table-root" className={DATA_TABLE_PAGINATION_ROOT_CHROME}>
      {tableShell}
      <DataTablePaginationControls
        paginationLabel={pagination.paginationLabel ?? 'Pagination'}
        previousLabel={pagination.previousLabel ?? 'Previous'}
        nextLabel={pagination.nextLabel ?? 'Next'}
        statusText={statusText}
        busy={paginationBusy}
        previousDisabled={previousDisabled}
        nextDisabled={nextDisabled}
        currentPageIndex={pagination.pageIndex}
        pageItems={pageItems}
        onPrevious={() => {
          if (
            paginationBusy ||
            !isUsablePageIndex(pagination.pageIndex) ||
            pagination.pageIndex <= 0
          ) {
            return;
          }
          pagination.onPageChange(pagination.pageIndex - 1);
        }}
        onNext={() => {
          if (paginationBusy || !isUsablePageIndex(pagination.pageIndex)) {
            return;
          }
          if (totalKnown && pageCount != null && pagination.pageIndex >= pageCount - 1) {
            return;
          }
          if (!totalKnown && pagination.kind === 'server' && pagination.hasNextPage === false) {
            return;
          }
          pagination.onPageChange(pagination.pageIndex + 1);
        }}
        onPage={(nextIndex) => {
          if (paginationBusy) {
            return;
          }
          if (nextIndex === pagination.pageIndex) {
            return;
          }
          if (totalKnown && pageCount != null && (nextIndex < 0 || nextIndex >= pageCount)) {
            return;
          }
          pagination.onPageChange(nextIndex);
        }}
      />
    </div>
  );
}
