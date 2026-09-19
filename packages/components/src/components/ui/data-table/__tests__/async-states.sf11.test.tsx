/**
 * SF-11 · Async / loading / error / empty — INV-254, INV-256, INV-257.
 */
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import { captionTableProps, numberedTokenRows } from './sf2-fixtures';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('INV-254: default status copy distinguishes unknown, known-empty, known-nonempty', () => {
  it('announces Page N when totalCount is omitted', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          pagination: { kind: 'server', pageIndex: 2, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table-pagination-status"]')?.textContent).toBe(
      'Page 3'
    );
  });

  it('does not say No rows for an OOR empty page with a known total', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(47),
          pagination: { kind: 'client', pageIndex: 9, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expect(
      container.querySelector('[data-slot="data-table-pagination-status"]')?.textContent,
      'INV-254: empty page of a nonempty set is Showing 0–0, not No rows'
    ).toBe('Showing 0–0 of 47');
  });
});

describe('INV-256: omitted vs invalid total diagnostics', () => {
  it('does not log omitted totalCount and does not throw (INV-353 / INV-256*)', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    expect(() => {
      render(
        <DataTable
          {...captionTableProps({
            pagination: { kind: 'server', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
          })}
        />
      );
    }).not.toThrow();
    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-slot="data-table-pagination-page"]').length,
        'INV-239: omitted total still hides numbered pages'
      ).toBe(0);
    });
    expect(
      errorSpy.mock.calls.some((call) => String(call[1]).includes('omitted')),
      'INV-353: valid cursor omit must not log at error level'
    ).toBe(false);
    expect(errorSpy).not.toHaveBeenCalledWith(
      'DataTable',
      'DataTable: pagination.totalCount is omitted; numbered pages are hidden.'
    );
  });

  it('logs invalid totalCount once and not the omitted diagnostic', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    render(
      <DataTable
        {...captionTableProps({
          pagination: {
            kind: 'server',
            pageIndex: 0,
            pageSize: 10,
            totalCount: Number.NaN,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'DataTable',
        'DataTable: pagination.totalCount is invalid.'
      );
    });
    expect(errorSpy.mock.calls.some((call) => String(call[1]).includes('omitted'))).toBe(false);
  });

  it('does not log omitted or invalid for totalCount 0', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: [],
          pagination: {
            kind: 'server',
            pageIndex: 0,
            pageSize: 10,
            totalCount: 0,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    });
    expect(
      errorSpy.mock.calls.some((call) => String(call[1]).includes('totalCount')),
      'INV-256: known empty must not look like omit/invalid'
    ).toBe(false);
  });
});

describe('INV-257 / SC-006: number clicks do not fetch; unknown Next to empty rows stays fail-closed', () => {
  it('does not call fetch when a page number is activated', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    fireEvent.click(
      container.querySelector(
        '[data-slot="data-table-pagination-page"][data-page-index="2"]'
      ) as HTMLButtonElement
    );
    expect(fetchSpy, 'INV-257: onPageChange is the only intent seam').not.toHaveBeenCalled();
  });

  it('keeps numbers hidden and shows the empty row when unknown Next lands on rows=[]', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: [],
          pagination: { kind: 'server', pageIndex: 3, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="data-table-pagination-page"]').length).toBe(0);
    expect(container.querySelector('[data-slot="data-table-pagination"]')).not.toBeNull();
  });
});
