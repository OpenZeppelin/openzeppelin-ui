import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';

import { cn, logger } from '@openzeppelin/ui-utils';

import {
  DATA_TABLE_CAPTION_CHROME,
  DATA_TABLE_CELL_CHROME,
  DATA_TABLE_GROUP_HEADER_CELL_CHROME,
  DATA_TABLE_GROUP_ROW_CHROME,
  DATA_TABLE_HEAD_CHROME,
  DATA_TABLE_ROW_CHROME,
  DATA_TABLE_WRAPPER_CHROME,
} from './chrome';
import {
  DATA_TABLE_GROUP_ROW_ESTIMATE_SIZE,
  findPaintIndexByRowKey,
  type DataTableBodyItem,
} from './grouping';
import { alignClass, resolveAlign } from './helpers';
import {
  DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT,
  type DataTableColumn,
  type DataTableGroupHeaderInfo,
  type DataTableScrollToAlign,
  type DataTableVirtualization,
  type DataTableVirtualizationHandle,
} from './types';
import {
  ariaRowIndexForBodyRow,
  DATA_TABLE_INFINITE_SENTINEL_KEY,
  findBodyIndexByKey,
  isInvalidVirtualizedMaxHeight,
  isShortPage,
  isVerticalScrollport,
  resolveAriaRowCount,
  resolveVirtualization,
  shouldRequestMoreFromVirtualRange,
  spacerHeights,
} from './virtualization';

const IS_DEV = process.env.NODE_ENV !== 'production';

const DATA_TABLE_DIAGNOSTIC_SYSTEM = 'DataTable';

/** INV-138: Firefox `<tr>` border-box measurement is wrong; skip `measureElement`. */
const IS_FIREFOX = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);

function emitDevError(message: string): void {
  logger.error(DATA_TABLE_DIAGNOSTIC_SYSTEM, message);
}

function measureVirtualRow(element: Element): number {
  return element.getBoundingClientRect().height;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T): void {
  if (ref == null) {
    return;
  }
  if (typeof ref === 'function') {
    ref(value);
  } else {
    ref.current = value;
  }
}

function DataTableRowCells<Row>({
  row,
  columns,
}: {
  row: Row;
  columns: readonly DataTableColumn<Row>[];
}): ReactElement {
  return (
    <>
      {columns.map((column) => {
        const align = resolveAlign(column.align);
        return (
          <td
            key={column.id}
            data-slot="data-table-cell"
            data-column-id={column.id}
            data-align={align}
            className={cn(DATA_TABLE_CELL_CHROME, alignClass(align), column.cellClassName)}
          >
            {column.cell(row)}
          </td>
        );
      })}
    </>
  );
}

type RowMeasureRef = ((node: HTMLTableRowElement | null) => void) | undefined;

/**
 * Data row for both grouped body paths (SF-22 INV-3). Same attributes, order and
 * cells as the ungrouped rows below, which stay textually as shipped (SF-22 INV-5);
 * `undefined` props emit no attribute, so plain and virtualized markup match.
 */
function renderGroupedDataRow<Row>(args: {
  row: Row;
  rowKey: string;
  columns: readonly DataTableColumn<Row>[];
  getRowClassName: ((row: Row) => string | undefined) | undefined;
  selectedKeys: ReadonlySet<string> | undefined;
  measureRef: RowMeasureRef;
  dataIndex: number | undefined;
  ariaRowIndex: number | undefined;
}): ReactElement {
  const {
    row,
    rowKey,
    columns,
    getRowClassName,
    selectedKeys,
    measureRef,
    dataIndex,
    ariaRowIndex,
  } = args;
  const isSelected = selectedKeys?.has(rowKey) === true;
  return (
    <tr
      key={rowKey}
      ref={measureRef}
      data-slot="data-table-row"
      data-row-key={rowKey}
      data-index={dataIndex}
      data-selected={isSelected ? 'true' : undefined}
      data-state={isSelected ? 'selected' : undefined}
      aria-rowindex={ariaRowIndex}
      className={cn(DATA_TABLE_ROW_CHROME, getRowClassName?.(row))}
    >
      <DataTableRowCells row={row} columns={columns} />
    </tr>
  );
}

/**
 * The one section-row JSX site for both body paths (SF-22 INV-1). `<th scope="row">`
 * maps to `rowheader` and adds no `columnheader` (Design probe). No `role`, no row
 * key, no selection attributes, no `cell` call (SF-22 INV-1 / INV-21).
 */
function renderGroupRow<Row>(args: {
  itemKey: string;
  info: DataTableGroupHeaderInfo<Row>;
  colSpan: number;
  content: ReactNode;
  measureRef: RowMeasureRef;
  dataIndex: number | undefined;
  ariaRowIndex: number | undefined;
}): ReactElement {
  const { itemKey, info, colSpan, content, measureRef, dataIndex, ariaRowIndex } = args;
  return (
    <tr
      key={itemKey}
      ref={measureRef}
      data-slot="data-table-group-row"
      data-group-key={info.key ?? undefined}
      data-index={dataIndex}
      aria-rowindex={ariaRowIndex}
      className={DATA_TABLE_GROUP_ROW_CHROME}
    >
      <th
        scope="row"
        colSpan={colSpan}
        data-slot="data-table-group-header"
        className={DATA_TABLE_GROUP_HEADER_CELL_CHROME}
      >
        {content}
      </th>
    </tr>
  );
}

/** Paints one `bodyItems` entry: a section row or a data row (SF-22). */
function renderBodyItem<Row>(args: {
  item: DataTableBodyItem<Row>;
  columns: readonly DataTableColumn<Row>[];
  getRowClassName: ((row: Row) => string | undefined) | undefined;
  selectedKeys: ReadonlySet<string> | undefined;
  colSpan: number;
  renderGroupHeaderContent: (info: DataTableGroupHeaderInfo<Row>) => ReactNode;
  measureRef: RowMeasureRef;
  dataIndex: number | undefined;
  ariaRowIndex: number | undefined;
}): ReactElement {
  const { item, measureRef, dataIndex, ariaRowIndex } = args;
  if (item.kind === 'group') {
    return renderGroupRow({
      itemKey: item.itemKey,
      info: item.info,
      colSpan: args.colSpan,
      content: args.renderGroupHeaderContent(item.info),
      measureRef,
      dataIndex,
      ariaRowIndex,
    });
  }
  return renderGroupedDataRow({
    row: item.row,
    rowKey: item.itemKey,
    columns: args.columns,
    getRowClassName: args.getRowClassName,
    selectedKeys: args.selectedKeys,
    measureRef,
    dataIndex,
    ariaRowIndex,
  });
}

function SpacerRow({
  side,
  height,
  colSpan,
}: {
  side: 'top' | 'bottom';
  height: number;
  colSpan: number;
}): ReactElement | null {
  if (height <= 0) {
    return null;
  }
  return (
    <tr data-slot="data-table-spacer" data-spacer={side} aria-hidden="true">
      <td colSpan={colSpan} style={{ height: `${String(height)}px`, padding: 0, border: 0 }} />
    </tr>
  );
}

function InfiniteSentinelRow({
  colSpan,
  sentinelRef,
}: {
  colSpan: number;
  sentinelRef: Ref<HTMLTableRowElement | null>;
}): ReactElement {
  return (
    <tr
      ref={sentinelRef}
      data-slot="data-table-infinite-sentinel"
      data-row-key={DATA_TABLE_INFINITE_SENTINEL_KEY}
      aria-hidden="true"
    >
      <td colSpan={colSpan} style={{ height: '1px', padding: 0, border: 0 }} />
    </tr>
  );
}

interface VirtualizedBodyRowsProps<Row> {
  bodyRows: readonly Row[];
  /** SF-22: non-null → the virtualizer windows these paint items instead of `bodyRows`. */
  bodyItems: readonly DataTableBodyItem<Row>[] | null;
  renderGroupHeaderContent: ((info: DataTableGroupHeaderInfo<Row>) => ReactNode) | undefined;
  columns: readonly DataTableColumn<Row>[];
  getRowKey: (row: Row) => string;
  getRowClassName: ((row: Row) => string | undefined) | undefined;
  selectedKeys: ReadonlySet<string> | undefined;
  spacerColSpan: number;
  getScrollElement: () => HTMLDivElement | null;
  estimateSize: number | ((index: number) => number);
  overscan: number;
  maxHeight: number;
  paddingStart: number;
  virtualizationRef: Ref<DataTableVirtualizationHandle | null> | undefined;
  infiniteHasMore: boolean;
  sentinelRef: Ref<HTMLTableRowElement | null>;
  onVirtualEndEligible: () => void;
}

function VirtualizedBodyRows<Row>({
  bodyRows,
  bodyItems,
  renderGroupHeaderContent,
  columns,
  getRowKey,
  getRowClassName,
  selectedKeys,
  spacerColSpan,
  getScrollElement,
  estimateSize,
  overscan,
  maxHeight,
  paddingStart,
  virtualizationRef,
  infiniteHasMore,
  sentinelRef,
  onVirtualEndEligible,
}: VirtualizedBodyRowsProps<Row>): ReactElement {
  // SF-22 INV-28 / INV-32: grouped → virtual indices are paint indices over `bodyItems`.
  const paintCount = bodyItems?.length ?? bodyRows.length;
  const sentinelIndex = paintCount;
  const count = infiniteHasMore ? paintCount + 1 : paintCount;
  const estimateSizeRef = useRef(estimateSize);
  estimateSizeRef.current = estimateSize;
  const bodyItemsRef = useRef(bodyItems);
  bodyItemsRef.current = bodyItems;
  const infiniteHasMoreRef = useRef(infiniteHasMore);
  infiniteHasMoreRef.current = infiniteHasMore;
  const sentinelIndexRef = useRef(sentinelIndex);
  sentinelIndexRef.current = sentinelIndex;
  const getScrollElementRef = useRef(getScrollElement);
  getScrollElementRef.current = getScrollElement;

  const stableGetScrollElement = useCallback(
    (): HTMLDivElement | null => getScrollElementRef.current(),
    []
  );
  const stableEstimateSize = useCallback((index: number): number => {
    if (infiniteHasMoreRef.current && index === sentinelIndexRef.current) {
      return 1;
    }
    const estimate = estimateSizeRef.current;
    const items = bodyItemsRef.current;
    if (items == null) {
      return typeof estimate === 'function' ? estimate(index) : estimate;
    }
    // SF-22 INV-28: sections use the kit estimate; the integrator's function only ever
    // receives data-row (`bodyRows`) indices.
    const item = items[index];
    if (item === undefined || item.kind === 'group') {
      return DATA_TABLE_GROUP_ROW_ESTIMATE_SIZE;
    }
    return typeof estimate === 'function' ? estimate(item.bodyIndex) : estimate;
  }, []);
  const getItemKey = useCallback(
    (index: number): string => {
      if (infiniteHasMore && index === bodyRows.length) {
        return DATA_TABLE_INFINITE_SENTINEL_KEY;
      }
      const row = bodyRows[index];
      return row === undefined ? `__missing:${String(index)}` : getRowKey(row);
    },
    [bodyRows, getRowKey, infiniteHasMore]
  );
  // SF-22 INV-16 / INV-28: grouped item keys come from `bodyItems` (sections use reserved keys).
  const getGroupedItemKey = useCallback(
    (index: number): string => {
      if (bodyItems == null) {
        return `__missing:${String(index)}`;
      }
      if (infiniteHasMore && index === bodyItems.length) {
        return DATA_TABLE_INFINITE_SENTINEL_KEY;
      }
      return bodyItems[index]?.itemKey ?? `__missing:${String(index)}`;
    },
    [bodyItems, infiniteHasMore]
  );
  const initialRect = useMemo(
    () => ({
      width: stableGetScrollElement()?.clientWidth || 1,
      height: maxHeight,
    }),
    [maxHeight, stableGetScrollElement]
  );

  const onVirtualEndEligibleRef = useRef(onVirtualEndEligible);
  onVirtualEndEligibleRef.current = onVirtualEndEligible;

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: stableGetScrollElement,
    estimateSize: stableEstimateSize,
    overscan,
    enabled: true,
    getItemKey: bodyItems == null ? getItemKey : getGroupedItemKey,
    paddingStart,
    scrollPaddingStart: paddingStart,
    initialRect,
    measureElement: IS_FIREFOX ? undefined : measureVirtualRow,
  });

  useLayoutEffect(() => {
    const handle: DataTableVirtualizationHandle = {
      scrollToRowKey: (key: string, align?: DataTableScrollToAlign) => {
        const index =
          bodyItems == null
            ? findBodyIndexByKey(bodyRows, getRowKey, key)
            : findPaintIndexByRowKey(bodyItems, key);
        if (index == null) {
          return;
        }
        virtualizer.scrollToIndex(index, { align: align ?? 'auto' });
      },
    };
    assignRef(virtualizationRef, handle);
    return () => {
      assignRef(virtualizationRef, null);
    };
  }, [bodyItems, bodyRows, getRowKey, virtualizationRef, virtualizer]);

  const items = virtualizer.getVirtualItems();
  const first = items[0];
  const last = items[items.length - 1];
  const { paddingTop, paddingBottom } = spacerHeights({
    paddingStart,
    totalSize: virtualizer.getTotalSize(),
    firstStart: first?.start,
    lastEnd: last?.end,
  });

  useEffect(() => {
    if (
      shouldRequestMoreFromVirtualRange({
        lastVirtualIndex: last?.index,
        bodyRowCount: paintCount,
      })
    ) {
      onVirtualEndEligibleRef.current();
    }
  }, [last?.index, paintCount]);

  return (
    <>
      <SpacerRow side="top" height={paddingTop} colSpan={spacerColSpan} />
      {items.map((item) => {
        if (infiniteHasMore && item.index === sentinelIndex) {
          return (
            <InfiniteSentinelRow
              key={DATA_TABLE_INFINITE_SENTINEL_KEY}
              colSpan={spacerColSpan}
              sentinelRef={sentinelRef}
            />
          );
        }
        if (bodyItems != null && renderGroupHeaderContent != null) {
          const bodyItem = bodyItems[item.index];
          if (bodyItem === undefined) {
            return null;
          }
          // SF-22 INV-35: every painted item, sections included, is indexed by paint position.
          return renderBodyItem({
            item: bodyItem,
            columns,
            getRowClassName,
            selectedKeys,
            colSpan: spacerColSpan,
            renderGroupHeaderContent,
            measureRef: IS_FIREFOX ? undefined : virtualizer.measureElement,
            dataIndex: item.index,
            ariaRowIndex: ariaRowIndexForBodyRow(item.index),
          });
        }
        const row = bodyRows[item.index];
        if (row === undefined) {
          return null;
        }
        const rowKey = getRowKey(row);
        const isSelected = selectedKeys?.has(rowKey) === true;
        return (
          <tr
            key={rowKey}
            ref={IS_FIREFOX ? undefined : virtualizer.measureElement}
            data-slot="data-table-row"
            data-row-key={rowKey}
            data-index={item.index}
            data-selected={isSelected ? 'true' : undefined}
            data-state={isSelected ? 'selected' : undefined}
            aria-rowindex={ariaRowIndexForBodyRow(item.index)}
            className={cn(DATA_TABLE_ROW_CHROME, getRowClassName?.(row))}
          >
            <DataTableRowCells row={row} columns={columns} />
          </tr>
        );
      })}
      <SpacerRow side="bottom" height={paddingBottom} colSpan={spacerColSpan} />
    </>
  );
}

export interface DataTableScrollerProps<Row> {
  nameKind: 'caption' | 'label' | 'labelledby';
  caption: ReactNode | undefined;
  captionClassName: string | undefined;
  ariaLabel: string | undefined;
  ariaLabelledBy: string | undefined;
  className: string | undefined;
  chromeMode: 'card' | 'plain';
  tableClassName: string | undefined;
  columns: readonly DataTableColumn<Row>[];
  bodyRows: readonly Row[];
  /**
   * SF-22 paint list (section + data rows), built by DataTable. `null` selects the
   * ungrouped path verbatim (SF-22 INV-5). Never used for selection, counts or
   * empty decisions, which stay on `bodyRows` (SF-22 INV-15).
   */
  bodyItems: readonly DataTableBodyItem<Row>[] | null;
  /** Resolves a section's header content (SF-22 INV-4). Set iff `bodyItems` is. */
  renderGroupHeaderContent: ((info: DataTableGroupHeaderInfo<Row>) => ReactNode) | undefined;
  getRowKey: (row: Row) => string;
  getRowClassName: ((row: Row) => string | undefined) | undefined;
  selectedKeys: ReadonlySet<string> | undefined;
  isEmpty: boolean;
  emptyColSpan: number;
  emptyContent: ReactNode;
  headerRow: ReactNode;
  stickyHeader: boolean;
  virtualized: boolean | DataTableVirtualization | undefined;
  scrollRef: Ref<HTMLDivElement | null> | undefined;
  virtualizationRef: Ref<DataTableVirtualizationHandle | null> | undefined;
  infiniteHasMore: boolean;
  infiniteBusy: boolean;
  suppressEmptyChrome: boolean;
  /** Resolved by DataTable (`isEmpty && !suppressEmptyChrome`). Never recomputed here (SF-7 INV-2). */
  showEmptyChrome: boolean;
  /** Resolved by DataTable. `true` → `<thead hidden>`. Never decided here (SF-7 INV-9). */
  headerHidden: boolean;
  onLoadMore: (() => void) | undefined;
}

/**
 * Internal scroll host. Paints the card only in `card` mode; framed tables use
 * `plain` mode so this node remains the sole overflow and virtualization host.
 * `useVirtualizer` lives in a child so header chrome does not subscribe to every
 * scroll frame (INV-132). Not barrel-exported (INV-127).
 */
export function DataTableScroller<Row>(props: DataTableScrollerProps<Row>): ReactElement {
  const {
    nameKind,
    caption,
    captionClassName,
    ariaLabel,
    ariaLabelledBy,
    className,
    chromeMode,
    tableClassName,
    columns,
    bodyRows,
    bodyItems,
    renderGroupHeaderContent,
    getRowKey,
    getRowClassName,
    selectedKeys,
    isEmpty,
    emptyColSpan,
    emptyContent,
    headerRow,
    stickyHeader,
    virtualized,
    scrollRef,
    virtualizationRef,
    infiniteHasMore,
    infiniteBusy,
    suppressEmptyChrome,
    showEmptyChrome,
    headerHidden,
    onLoadMore,
  } = props;

  const resolved = resolveVirtualization(virtualized, bodyRows.length);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Ref attachment does not render; this state guarantees TanStack observes the first laid-out node.
  const [, setAttachedScrollElement] = useState<HTMLDivElement | null>(null);
  const captionRef = useRef<HTMLTableCaptionElement | null>(null);
  const theadRef = useRef<HTMLTableSectionElement | null>(null);
  const loggedIssuesRef = useRef(new Set<string>());
  const [paddingStart, setPaddingStart] = useState(0);
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const infiniteHasMoreRef = useRef(infiniteHasMore);
  infiniteHasMoreRef.current = infiniteHasMore;
  const infiniteBusyRef = useRef(infiniteBusy);
  infiniteBusyRef.current = infiniteBusy;
  const bodyRowCountRef = useRef(bodyRows.length);
  bodyRowCountRef.current = bodyRows.length;
  const firedGenerationRef = useRef<string | null>(null);
  const prevBusyRef = useRef(infiniteBusy);
  const mountedRef = useRef(true);
  const bindSentinelRef = useRef<(node: HTMLTableRowElement | null) => void>(() => undefined);

  const setWrapperNode = useCallback(
    (node: HTMLDivElement | null): void => {
      wrapperRef.current = node;
      if (resolved.active && node != null) {
        setAttachedScrollElement(node);
      }
      assignRef(scrollRef, node);
    },
    [resolved.active, scrollRef]
  );

  const getScrollElement = useCallback((): HTMLDivElement | null => wrapperRef.current, []);

  const tryRequestMore = useCallback((): void => {
    if (!mountedRef.current) {
      return;
    }
    if (!infiniteHasMoreRef.current || infiniteBusyRef.current) {
      return;
    }
    const onLoad = onLoadMoreRef.current;
    if (onLoad == null) {
      return;
    }
    const generation = `${String(infiniteHasMoreRef.current)}:${String(bodyRowCountRef.current)}`;
    if (firedGenerationRef.current === generation) {
      return;
    }
    firedGenerationRef.current = generation;
    onLoad();
  }, []);

  bindSentinelRef.current = (node: HTMLTableRowElement | null): void => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    sentinelRef.current = node;
    if (node == null || !infiniteHasMoreRef.current) {
      return;
    }
    const wrapper = wrapperRef.current;
    if (wrapper == null || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const root = isVerticalScrollport(wrapper.scrollHeight, wrapper.clientHeight) ? wrapper : null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          tryRequestMore();
        } else {
          firedGenerationRef.current = null;
        }
      },
      { root }
    );
    observer.observe(node);
    observerRef.current = observer;
  };

  const setSentinelNode = useCallback((node: HTMLTableRowElement | null): void => {
    bindSentinelRef.current(node);
  }, []);

  const isStillAtEnd = useCallback((): boolean => {
    const wrapper = wrapperRef.current;
    if (
      wrapper != null &&
      resolved.active &&
      isShortPage(wrapper.scrollHeight, wrapper.clientHeight)
    ) {
      return true;
    }
    const sentinel = sentinelRef.current;
    if (sentinel == null || wrapper == null) {
      return false;
    }
    const sentinelRect = sentinel.getBoundingClientRect();
    if (isVerticalScrollport(wrapper.scrollHeight, wrapper.clientHeight)) {
      const rootRect = wrapper.getBoundingClientRect();
      return sentinelRect.top < rootRect.bottom && sentinelRect.bottom > rootRect.top;
    }
    return (
      sentinelRect.bottom > 0 &&
      sentinelRect.top < (typeof window === 'undefined' ? 0 : window.innerHeight)
    );
  }, [resolved.active]);

  useEffect(() => {
    return () => {
      assignRef(scrollRef, null);
      assignRef(virtualizationRef, null);
    };
  }, [scrollRef, virtualizationRef]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!infiniteHasMore) {
      firedGenerationRef.current = null;
    }
  }, [infiniteHasMore, bodyRows.length]);

  useLayoutEffect(() => {
    const wasBusy = prevBusyRef.current;
    prevBusyRef.current = infiniteBusy;
    if (wasBusy && !infiniteBusy) {
      firedGenerationRef.current = null;
      if (infiniteHasMore && isStillAtEnd()) {
        tryRequestMore();
      }
    }
  }, [infiniteBusy, infiniteHasMore, bodyRows.length, isStillAtEnd, tryRequestMore]);

  useLayoutEffect(() => {
    if (!infiniteHasMore || infiniteBusy) {
      return;
    }
    const wrapper = wrapperRef.current;
    if (wrapper == null) {
      return;
    }
    if (resolved.active && isShortPage(wrapper.scrollHeight, wrapper.clientHeight)) {
      tryRequestMore();
    }
  }, [infiniteHasMore, infiniteBusy, bodyRows.length, resolved.active, tryRequestMore]);

  useEffect(() => {
    bindSentinelRef.current(sentinelRef.current);
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [infiniteHasMore, infiniteBusy, bodyRows.length, resolved.active]);

  useEffect(() => {
    if (!resolved.active) {
      assignRef(virtualizationRef, null);
    }
  }, [resolved.active, virtualizationRef]);

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

    if (typeof virtualized === 'object' && virtualized !== null) {
      if (isInvalidVirtualizedMaxHeight(virtualized.maxHeight)) {
        logOnce(
          'virt:maxHeight',
          `DataTable: virtualized.maxHeight is invalid; using ${String(DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT)}.`
        );
      }
    }
  }, [virtualized]);

  useLayoutEffect(() => {
    if (!resolved.active) {
      setPaddingStart(0);
      return;
    }

    const measure = (): void => {
      const captionHeight = captionRef.current?.offsetHeight ?? 0;
      const headHeight = theadRef.current?.offsetHeight ?? 0;
      setPaddingStart(captionHeight + headHeight);
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (captionRef.current) {
      observer.observe(captionRef.current);
    }
    if (theadRef.current) {
      observer.observe(theadRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [resolved.active, nameKind]);

  useLayoutEffect(() => {
    if (!IS_DEV || !resolved.active) {
      return;
    }
    const el = wrapperRef.current;
    if (el != null && el.clientHeight === 0) {
      const logged = loggedIssuesRef.current;
      if (!logged.has('virt:no-height')) {
        logged.add('virt:no-height');
        emitDevError(
          'DataTable: virtualized scroll parent has no height; set virtualized.maxHeight.'
        );
      }
    }
  }, [resolved.active, resolved.maxHeight, bodyRows.length]);

  const wrapperClassName = cn(
    chromeMode === 'card' && DATA_TABLE_WRAPPER_CHROME,
    resolved.active ? 'relative w-full overflow-auto' : 'relative w-full overflow-x-auto',
    className
  );

  const wrapperStyle = resolved.active
    ? { maxHeight: `${String(resolved.maxHeight)}px` }
    : undefined;

  // SF-22 INV-35: section rows are real rows, so the grouped count covers `bodyItems`.
  const tableAriaRowCount = resolveAriaRowCount({
    virtualizedActive: resolved.active,
    infiniteHasMore,
    bodyRowCount: bodyItems?.length ?? bodyRows.length,
  });

  const showEmptyPlaceholder = isEmpty && suppressEmptyChrome;
  const unvirtualizedSentinel = infiniteHasMore && !resolved.active;

  return (
    <div
      ref={setWrapperNode}
      data-slot="data-table"
      data-sticky-header={stickyHeader ? 'true' : 'false'}
      className={wrapperClassName}
      style={wrapperStyle}
      aria-busy={infiniteBusy ? true : undefined}
    >
      <table
        data-slot="data-table-table"
        className={cn('w-full caption-top text-sm', tableClassName)}
        aria-label={nameKind === 'label' ? ariaLabel : undefined}
        aria-labelledby={nameKind === 'labelledby' ? ariaLabelledBy : undefined}
        aria-rowcount={tableAriaRowCount}
      >
        {nameKind === 'caption' ? (
          <caption
            ref={captionRef}
            data-slot="data-table-caption"
            className={cn(DATA_TABLE_CAPTION_CHROME, captionClassName)}
          >
            {caption}
          </caption>
        ) : null}
        {/* Same mounted <thead> in every state (004 INV-35/279); the `hidden` attribute alone
            removes it from layout, the a11y tree and tab order. `|| undefined` keeps the
            attribute absent on the default path (SF-7 INV-3/5/10). */}
        <thead
          ref={theadRef}
          data-slot="data-table-head"
          className={DATA_TABLE_HEAD_CHROME}
          hidden={headerHidden || undefined}
        >
          {headerRow}
        </thead>
        <tbody data-slot="data-table-body">
          {showEmptyChrome ? (
            <tr data-slot="data-table-empty">
              <td colSpan={emptyColSpan} className="p-0">
                {emptyContent}
              </td>
            </tr>
          ) : resolved.active ? (
            <VirtualizedBodyRows
              bodyRows={bodyRows}
              bodyItems={bodyItems}
              renderGroupHeaderContent={renderGroupHeaderContent}
              columns={columns}
              getRowKey={getRowKey}
              getRowClassName={getRowClassName}
              selectedKeys={selectedKeys}
              spacerColSpan={emptyColSpan}
              getScrollElement={getScrollElement}
              estimateSize={resolved.estimateSize}
              overscan={resolved.overscan}
              maxHeight={resolved.maxHeight}
              paddingStart={paddingStart}
              virtualizationRef={virtualizationRef}
              infiniteHasMore={infiniteHasMore}
              sentinelRef={setSentinelNode}
              onVirtualEndEligible={tryRequestMore}
            />
          ) : (
            <>
              {showEmptyPlaceholder ? (
                <tr data-slot="data-table-empty">
                  <td colSpan={emptyColSpan} className="p-0" />
                </tr>
              ) : null}
              {bodyItems != null && renderGroupHeaderContent != null
                ? bodyItems.map((item, paintIndex) =>
                    renderBodyItem({
                      item,
                      columns,
                      getRowClassName,
                      selectedKeys,
                      colSpan: emptyColSpan,
                      renderGroupHeaderContent,
                      measureRef: undefined,
                      dataIndex: undefined,
                      ariaRowIndex: infiniteHasMore
                        ? ariaRowIndexForBodyRow(paintIndex)
                        : undefined,
                    })
                  )
                : bodyRows.map((row, index) => {
                    const rowKey = getRowKey(row);
                    const isSelected = selectedKeys?.has(rowKey) === true;
                    return (
                      <tr
                        key={rowKey}
                        data-slot="data-table-row"
                        data-row-key={rowKey}
                        data-selected={isSelected ? 'true' : undefined}
                        data-state={isSelected ? 'selected' : undefined}
                        aria-rowindex={infiniteHasMore ? ariaRowIndexForBodyRow(index) : undefined}
                        className={cn(DATA_TABLE_ROW_CHROME, getRowClassName?.(row))}
                      >
                        <DataTableRowCells row={row} columns={columns} />
                      </tr>
                    );
                  })}
              {unvirtualizedSentinel ? (
                <InfiniteSentinelRow colSpan={emptyColSpan} sentinelRef={setSentinelNode} />
              ) : null}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
