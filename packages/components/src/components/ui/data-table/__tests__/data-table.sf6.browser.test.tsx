/**
 * SF-6 · Browser verification — INV-163, INV-164, INV-166, INV-174, SC-003, SC-004.
 * Opt-in via `pnpm test:browser`. GitHub CI runs that script after jsdom `pnpm test`.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { StrictMode, useState, type ReactElement } from 'react';

import { Checkbox } from '../../checkbox';
import { DataTable } from '../data-table';
import { numberedTokenRows, tokenColumns, type TokenRow } from './sf2-fixtures';

function injectContractStyles(): void {
  if (document.getElementById('sf6-contract-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sf6-contract-styles';
  style.textContent = `
    .text-start { text-align: start; }
    .text-end { text-align: end; }
    .overflow-x-auto { overflow-x: auto; }
    .overflow-auto { overflow: auto; }
    .caption-top { caption-side: top; }
  `;
  document.head.appendChild(style);
}

async function axeViolations(
  container: HTMLElement,
  options?: { disableHeadingOrder?: boolean }
): Promise<axe.Result[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    rules: options?.disableHeadingOrder ? { 'heading-order': { enabled: false } } : undefined,
  });
  return results.violations;
}

const mixedColumns = [
  {
    id: 'select',
    header: <Checkbox aria-label="Select all" />,
    headerLabel: 'Select',
    cell: (row: TokenRow) => <Checkbox aria-label={`Select ${row.label}`} />,
  },
  ...tokenColumns(),
];

function ScrollAppendFeed(): ReactElement {
  const [rows, setRows] = useState(() => numberedTokenRows(12));
  return (
    <DataTable
      caption="Scroll feed"
      columns={tokenColumns()}
      rows={rows}
      getRowKey={(row) => row.id}
      virtualized={{ maxHeight: 200 }}
      infiniteScroll={{
        hasMore: rows.length < 24,
        onLoadMore: () => {
          setRows(numberedTokenRows(24));
        },
      }}
    />
  );
}

async function afterBrowserLayout(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

describe('INV-160 (browser): Strict Mode keeps initial end detection live', () => {
  it('requests a short first page once after effect replay', async () => {
    injectContractStyles();
    let calls = 0;
    render(
      <StrictMode>
        <DataTable
          caption="Strict feed"
          columns={tokenColumns()}
          rows={numberedTokenRows(3)}
          getRowKey={(row) => row.id}
          infiniteScroll={{
            hasMore: true,
            onLoadMore: () => {
              calls += 1;
            },
          }}
        />
      </StrictMode>
    );
    await expect.poll(() => calls).toBe(1);
  });

  it('appends when a bounded virtualized feed scrolls to the end', async () => {
    injectContractStyles();
    const { container } = render(
      <StrictMode>
        <ScrollAppendFeed />
      </StrictMode>
    );
    const wrap = container.querySelector('[data-slot="data-table"]') as HTMLElement;
    expect(wrap.clientHeight).toBeLessThan(wrap.scrollHeight);
    wrap.scrollTop = wrap.scrollHeight;
    wrap.dispatchEvent(new Event('scroll'));
    await expect.poll(() => wrap.getAttribute('aria-busy')).toBeNull();
    await expect
      .poll(() => container.querySelector('table')?.getAttribute('aria-rowcount'))
      .toBe('25');
    await expect
      .poll(() =>
        [...container.querySelectorAll('[data-slot="data-table-row"]')].some(
          (row) => row.getAttribute('data-row-key') === 'r23'
        )
      )
      .toBe(true);
  });

  it('leaves an unbounded feed to its off-screen viewport sentinel', async () => {
    injectContractStyles();
    let calls = 0;
    const infiniteScroll = {
      hasMore: true,
      onLoadMore: () => {
        calls += 1;
      },
    };
    const { container, rerender } = render(
      <DataTable
        caption="Unbounded feed"
        columns={tokenColumns()}
        rows={numberedTokenRows(50)}
        getRowKey={(row) => row.id}
        infiniteScroll={infiniteScroll}
      />
    );
    const wrapper = container.querySelector('[data-slot="data-table"]') as HTMLElement;
    const sentinel = container.querySelector(
      '[data-slot="data-table-infinite-sentinel"]'
    ) as HTMLElement;
    expect(wrapper.scrollHeight).toBe(wrapper.clientHeight);
    expect(sentinel.getBoundingClientRect().top).toBeGreaterThan(window.innerHeight);
    await afterBrowserLayout();
    expect(calls).toBe(0);

    rerender(
      <DataTable
        caption="Unbounded feed"
        columns={tokenColumns()}
        rows={numberedTokenRows(60)}
        getRowKey={(row) => row.id}
        infiniteScroll={infiniteScroll}
      />
    );
    expect(
      (
        container.querySelector('[data-slot="data-table-infinite-sentinel"]') as HTMLElement
      ).getBoundingClientRect().top
    ).toBeGreaterThan(window.innerHeight);
    await afterBrowserLayout();
    expect(calls).toBe(0);
  });
});

describe('INV-163 / SC-004 (browser): append does not move focus or the focused row’s data', () => {
  it.each([
    { name: 'unvirtualized', virtualized: false as boolean | undefined },
    { name: 'virtualized', virtualized: true as boolean | undefined },
  ])(
    '$name: focused control stays in the same data-row-key after append',
    async ({ virtualized }) => {
      injectContractStyles();
      const columns = [
        {
          id: 'act',
          header: 'Act',
          cell: (row: TokenRow) => (
            <button type="button" data-testid={`open-${row.id}`}>
              Open {row.label}
            </button>
          ),
        },
        ...tokenColumns(),
      ];
      const infiniteScroll = { hasMore: true, busy: true, onLoadMore: () => undefined };
      const { container, rerender } = render(
        <DataTable
          caption="Activity"
          columns={columns}
          rows={numberedTokenRows(8)}
          getRowKey={(row) => row.id}
          virtualized={virtualized}
          infiniteScroll={infiniteScroll}
        />
      );
      const open = container.querySelector('[data-testid="open-r0"]') as HTMLButtonElement;
      open.focus();
      expect(document.activeElement).toBe(open);
      const labelBefore = container.querySelector(
        '[data-row-key="r0"] [data-column-id="label"]'
      )?.textContent;

      rerender(
        <DataTable
          caption="Activity"
          columns={columns}
          rows={numberedTokenRows(20)}
          getRowKey={(row) => row.id}
          virtualized={virtualized}
          infiniteScroll={infiniteScroll}
        />
      );

      await expect
        .poll(() => container.querySelectorAll('[data-slot="data-table-row"]').length)
        .toBeGreaterThan(8);
      const focusedRow = document.activeElement?.closest('[data-slot="data-table-row"]');
      expect(
        focusedRow?.getAttribute('data-row-key'),
        'INV-163: keyboard focus must stay on row K after append below K'
      ).toBe('r0');
      expect(
        container.querySelector('[data-row-key="r0"] [data-column-id="label"]')?.textContent
      ).toBe(labelBefore);
    }
  );
});

describe('INV-164 / INV-166 (browser): 10k infinite+virtualized stays windowed with table-* display', () => {
  it('mounts < 80 data rows and keeps native table display', () => {
    injectContractStyles();
    const { container } = render(
      <DataTable
        caption="Scale feed"
        columns={tokenColumns()}
        rows={numberedTokenRows(10_000)}
        getRowKey={(row) => row.id}
        virtualized
        infiniteScroll={{ hasMore: true, busy: true, onLoadMore: () => undefined }}
      />
    );
    const mounted = container.querySelectorAll('[data-slot="data-table-row"]').length;
    expect(mounted).toBeLessThan(80);
    expect(mounted).toBeGreaterThan(0);
    expect(
      container.querySelectorAll('[data-slot="data-table-infinite-sentinel"]').length
    ).toBeLessThanOrEqual(1);
    const table = container.querySelector('table');
    const row = container.querySelector('[data-slot="data-table-row"]');
    const cell = container.querySelector('[data-slot="data-table-cell"]');
    expect(table && getComputedStyle(table).display).toBe('table');
    expect(row && getComputedStyle(row).display).toBe('table-row');
    expect(cell && getComputedStyle(cell).display).toBe('table-cell');
    expect(row && getComputedStyle(row).transform).toBe('none');
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).toBe('-1');
  });
});

describe('INV-174 (browser): named table + axe on representative infinite trees', () => {
  it('keeps table semantics on a virtualized infinite feed with composed cells', async () => {
    injectContractStyles();
    const { container } = render(
      <DataTable
        caption="Composed feed"
        columns={mixedColumns}
        rows={numberedTokenRows(40)}
        getRowKey={(row) => row.id}
        virtualized
        infiniteScroll={{ hasMore: true, busy: true, onLoadMore: () => undefined }}
      />
    );
    expect(screen.getByRole('table', { name: 'Composed feed' })).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    const violations = await axeViolations(container);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it('axe-cleans unvirtualized hasMore, empty+busy, and exhausted empty', async () => {
    injectContractStyles();
    const unvirtualized = render(
      <DataTable
        caption="Live feed"
        columns={tokenColumns()}
        rows={numberedTokenRows(8)}
        getRowKey={(row) => row.id}
        infiniteScroll={{ hasMore: true, busy: true, onLoadMore: () => undefined }}
      />
    );
    expect(await axeViolations(unvirtualized.container)).toEqual([]);
    unvirtualized.unmount();

    const emptyBusy = render(
      <DataTable
        caption="Loading feed"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={(row) => row.id}
        infiniteScroll={{ hasMore: true, busy: true, onLoadMore: () => undefined }}
      />
    );
    expect(await axeViolations(emptyBusy.container, { disableHeadingOrder: true })).toEqual([]);
    emptyBusy.unmount();

    const exhausted = render(
      <DataTable
        caption="Empty feed"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={(row) => row.id}
        infiniteScroll={{ hasMore: false, onLoadMore: () => undefined }}
      />
    );
    expect(await axeViolations(exhausted.container, { disableHeadingOrder: true })).toEqual([]);
  });
});
