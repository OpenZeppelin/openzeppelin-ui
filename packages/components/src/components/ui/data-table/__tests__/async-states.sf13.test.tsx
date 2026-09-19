/**
 * SF-13 · Async / diagnostic — INV-352 … INV-354, INV-256*, INV-360.
 */
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import { captionTableProps } from './sf2-fixtures';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('INV-353 / INV-256*: omitted server total is silent at error level', () => {
  it('does not call logger.error for omitted totalCount', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { container } = render(
      <DataTable
        {...captionTableProps({
          pagination: {
            kind: 'server',
            pageIndex: 0,
            pageSize: 10,
            onPageChange: vi.fn(),
            placement: 'inside',
            hideStatus: true,
          },
        })}
      />
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="data-table-pagination"]')).not.toBeNull();
    });
    expect(container.querySelectorAll('[data-slot="data-table-pagination-page"]').length).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('still logs invalid totalCount once and never an omitted substitute', async () => {
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
});

describe('INV-354: omitted total does not throw', () => {
  it('mounts a cursor table without a kit throw', () => {
    expect(() => {
      render(
        <DataTable
          {...captionTableProps({
            pagination: { kind: 'server', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
          })}
        />
      );
    }).not.toThrow();
  });
});

describe('INV-352: composition adds no fetch and does not replace empty chrome', () => {
  it('leaves filters visible when the body is empty and never calls fetch', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: [],
          toolbar: <div>Search accounts</div>,
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table-toolbar"]')?.textContent).toBe(
      'Search accounts'
    );
    expect(container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    expect(
      container
        .querySelector('table')
        ?.contains(container.querySelector('[data-slot="data-table-empty"]'))
    ).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
