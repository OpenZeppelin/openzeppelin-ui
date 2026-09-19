/**
 * SF-4 · Prop / state contract — INV-123 … INV-129.
 *
 * Negative arms use `@ts-expect-error` (two-way: unused directive is TS2578).
 * Package `tsc` excludes `*.test.ts`; two-way check is
 * `pnpm typecheck:data-table-tests` (`tsconfig.data-table-tests.json`).
 */
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createRef } from 'react';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import type {
  DataTableProps,
  DataTableScrollToAlign,
  DataTableVirtualization,
  DataTableVirtualizationHandle,
} from '../types';
import {
  DATA_TABLE_DEFAULT_ESTIMATE_SIZE,
  DATA_TABLE_DEFAULT_OVERSCAN,
  DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT,
} from '../types';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';
import { withZeroHeightScrollParent } from './sf4-jsdom-setup';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('INV-123: virtualized is optional and resolved with frozen defaults', () => {
  it('accepts omitted, false, true, and a partial options object', () => {
    const omitted = {
      caption: 'T',
      columns: tokenColumns(),
      rows: TOKEN_ROWS,
      getRowKey: getTokenRowKey,
    } satisfies DataTableProps<TokenRow>;
    const object = {
      estimateSize: 40,
      overscan: 4,
      maxHeight: 240,
    } satisfies DataTableVirtualization;
    expect('virtualized' in omitted).toBe(false);
    expect(object.maxHeight).toBe(240);
    expectTypeOf<DataTableVirtualization['estimateSize']>().toEqualTypeOf<
      number | ((index: number) => number) | undefined
    >();
  });

  it('rejects public TanStack leak-through fields', () => {
    const range = {
      estimateSize: 36,
      // @ts-expect-error INV-123: rangeExtractor is not public
      rangeExtractor: () => [],
    } satisfies DataTableVirtualization;
    const measure = {
      // @ts-expect-error INV-123: measureElement is not public
      measureElement: () => 0,
    } satisfies DataTableVirtualization;
    const enabled = {
      // @ts-expect-error INV-123: no enabled threshold field
      enabled: true,
    } satisfies DataTableVirtualization;
    const sticky = {
      // @ts-expect-error INV-123: no stickyHeader prop on options
      stickyHeader: true,
    } satisfies DataTableVirtualization;
    expect(range).toBeDefined();
    expect(measure).toBeDefined();
    expect(enabled).toBeDefined();
    expect(sticky).toBeDefined();
  });
});

describe('INV-124: column contract and P1 required props are unchanged', () => {
  it('paints the same column ids on virtualized and unvirtualized siblings', () => {
    const columns = tokenColumns();
    const a = render(
      <DataTable caption="A" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    const b = render(
      <DataTable
        caption="B"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        virtualized
      />
    );
    const ids = (container: HTMLElement) =>
      [...container.querySelectorAll('th[data-column-id]')].map((th) =>
        th.getAttribute('data-column-id')
      );
    expect(ids(a.container)).toEqual(ids(b.container));
    expect(ids(a.container)).toEqual(['label', 'amount', 'status']);
  });

  it('adds stickyHeader at table level while keeping unrelated aliases and ref out', () => {
    type Forbidden = Extract<
      keyof DataTableProps<TokenRow>,
      'rowHeight' | 'ref' | 'isLoading' | 'selectedIds' | 'onRowClick'
    >;
    expectTypeOf<Forbidden>().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<keyof DataTableProps<TokenRow>, 'stickyHeader'>
    >().toEqualTypeOf<'stickyHeader'>();

    const withRowHeight = {
      caption: 'T',
      columns: tokenColumns(),
      rows: TOKEN_ROWS,
      getRowKey: getTokenRowKey,
      // @ts-expect-error INV-124: rowHeight is not a top-level alias
      rowHeight: 36,
    } satisfies DataTableProps<TokenRow>;
    const withRef = {
      caption: 'T',
      columns: tokenColumns(),
      rows: TOKEN_ROWS,
      getRowKey: getTokenRowKey,
      // @ts-expect-error INV-124: DataTable is not forwardRef
      ref: { current: null },
    } satisfies DataTableProps<TokenRow>;
    const withStickyHeader = {
      caption: 'T',
      columns: tokenColumns(),
      rows: TOKEN_ROWS,
      getRowKey: getTokenRowKey,
      stickyHeader: false,
    } satisfies DataTableProps<TokenRow>;
    expect(withRowHeight).toBeDefined();
    expect(withRef).toBeDefined();
    expect(withStickyHeader.stickyHeader).toBe(false);
  });
});

describe('INV-125: invalid maxHeight diagnoses once in dev and still windows', () => {
  it('logs the default fallback once across rerenders', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const rows = numberedTokenRows(80);
    const { rerender, container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        virtualized={{ maxHeight: 0 }}
      />
    );
    for (let i = 0; i < 4; i += 1) {
      rerender(
        <DataTable
          caption="T"
          columns={tokenColumns()}
          rows={rows}
          getRowKey={getTokenRowKey}
          virtualized={{ maxHeight: 0 }}
        />
      );
    }
    await waitFor(() => {
      const virtLogs = errorSpy.mock.calls.filter(
        (call) =>
          call[0] === 'DataTable' && String(call[1]).includes('virtualized.maxHeight is invalid')
      );
      expect(virtLogs).toHaveLength(1);
      expect(String(virtLogs[0]?.[1])).toContain(String(DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT));
    });
    const wrap = container.querySelector('[data-slot="data-table"]') as HTMLElement;
    expect(wrap.style.maxHeight).toBe(`${String(DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT)}px`);
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBeLessThan(
      rows.length
    );
  });
});

describe('INV-126: missing wrapper height still windows', () => {
  it('does not full-mount 10k rows when the scroll parent reports no height', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const rows = numberedTokenRows(10_000);
    withZeroHeightScrollParent(() => {
      const { container } = render(
        <DataTable
          caption="Zero height"
          columns={tokenColumns()}
          rows={rows}
          getRowKey={getTokenRowKey}
          virtualized
        />
      );
      const mounted = container.querySelectorAll('[data-slot="data-table-row"]').length;
      expect(mounted, 'INV-126: never fall back to P1 full mount').toBeLessThan(80);
      const heightLogs = errorSpy.mock.calls.filter(
        (call) => call[0] === 'DataTable' && String(call[1]).includes('scroll parent has no height')
      );
      expect(heightLogs.length).toBeGreaterThan(0);
    });
  });
});

describe('INV-127: public virtualization types hide TanStack', () => {
  it('types the handle as scrollToRowKey only', () => {
    expectTypeOf<DataTableVirtualizationHandle>().toEqualTypeOf<{
      scrollToRowKey: (key: string, align?: DataTableScrollToAlign) => void;
    }>();
    expectTypeOf<DataTableScrollToAlign>().toEqualTypeOf<'start' | 'center' | 'end' | 'auto'>();
    expect(DATA_TABLE_DEFAULT_ESTIMATE_SIZE).toBe(64);
    expect(DATA_TABLE_DEFAULT_OVERSCAN).toBe(8);
    expect(DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT).toBe(384);
  });
});

describe('INV-128: virtualizationRef is null when inactive; unknown keys are a no-op', () => {
  it('exposes null while empty even if virtualized is on', async () => {
    const ref = createRef<DataTableVirtualizationHandle | null>();
    render(
      <DataTable {...captionTableProps({ rows: [], virtualized: true, virtualizationRef: ref })} />
    );
    await waitFor(() => {
      expect(ref.current, 'INV-128: inactive handle is null').toBeNull();
    });
  });

  it('no-ops an unknown key without throwing', async () => {
    const ref = createRef<DataTableVirtualizationHandle | null>();
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(80),
          virtualized: true,
          virtualizationRef: ref,
        })}
      />
    );
    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });
    const wrap = container.querySelector('[data-slot="data-table"]') as HTMLElement;
    const before = wrap.scrollTop;
    expect(() => ref.current?.scrollToRowKey('missing', 'start')).not.toThrow();
    expect(wrap.scrollTop).toBe(before);
  });
});

describe('INV-129: scrollRef is the kit wrapper', () => {
  it('attaches to data-slot=data-table, not the pagination root', async () => {
    const scrollRef = createRef<HTMLDivElement | null>();
    const { container } = render(
      <DataTable
        caption="Paged"
        columns={tokenColumns()}
        rows={numberedTokenRows(40)}
        getRowKey={getTokenRowKey}
        pagination={{
          kind: 'client',
          pageIndex: 0,
          pageSize: 20,
          onPageChange: vi.fn(),
        }}
        virtualized
        scrollRef={scrollRef}
      />
    );
    await waitFor(() => {
      expect(scrollRef.current).not.toBeNull();
    });
    expect(scrollRef.current?.getAttribute('data-slot')).toBe('data-table');
    expect(container.querySelector('[data-slot="data-table-root"]')).not.toBe(scrollRef.current);
    expect(scrollRef.current).toBe(container.querySelector('[data-slot="data-table"]'));
  });
});
