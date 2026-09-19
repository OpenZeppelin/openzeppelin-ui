/**
 * SF-12 · Async / diagnostic — INV-319 … INV-322, INV-158*, INV-320, INV-321.
 */
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
  untypedDataTableProps,
} from './sf2-fixtures';

afterEach(() => {
  vi.restoreAllMocks();
});

const PAGER_WINS_MESSAGE =
  'DataTable: pagination and infiniteScroll cannot be combined; infiniteScroll is ignored.';
const EMPTY_NAME_MESSAGE = 'DataTable: formatSortButtonName returned an empty accessible name.';

describe('INV-320 / INV-319: infinite:pager-wins key and message are frozen', () => {
  it('logs the exact pager-wins message once for untyped both-props', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    render(
      <DataTable
        {...untypedDataTableProps({
          ...captionTableProps({ rows: numberedTokenRows(12) }),
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            onPageChange: vi.fn(),
          },
          infiniteScroll: { hasMore: true, onLoadMore: vi.fn() },
        })}
      />
    );
    await waitFor(() => {
      const messages = errorSpy.mock.calls.map((call) => String(call[1]));
      expect(messages.filter((message) => message === PAGER_WINS_MESSAGE)).toHaveLength(1);
    });
    expect(errorSpy).toHaveBeenCalledWith('DataTable', PAGER_WINS_MESSAGE);
  });
});

describe('INV-321: blank formatter output falls back and logs sort:empty-name', () => {
  it('falls back to English for blank, whitespace, and non-string returns', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { container, rerender } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        formatSortButtonName={() => ''}
      />
    );
    expect(
      container.querySelector('[data-column-id="amount"] button')?.getAttribute('aria-label')
    ).toBe('Sort by Amount');
    await waitFor(() => {
      const messages = errorSpy.mock.calls.map((call) => String(call[1]));
      expect(messages.filter((message) => message === EMPTY_NAME_MESSAGE)).toHaveLength(1);
    });
    expect(errorSpy).toHaveBeenCalledWith('DataTable', EMPTY_NAME_MESSAGE);

    rerender(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        formatSortButtonName={() => '   '}
      />
    );
    expect(
      container.querySelector('[data-column-id="amount"] button')?.getAttribute('aria-label')
    ).toBe('Sort by Amount');
    await waitFor(() => {
      const messages = errorSpy.mock.calls.map((call) => String(call[1]));
      expect(
        messages.filter((message) => message === EMPTY_NAME_MESSAGE),
        'INV-321: sort:empty-name is table-global; first blank wins'
      ).toHaveLength(1);
    });
  });

  it('does not log sort:empty-name when the formatter is omitted or returns a name', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    await waitFor(() => {
      expect(errorSpy.mock.calls.map((call) => String(call[1]))).not.toContain(EMPTY_NAME_MESSAGE);
    });
    rerender(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        formatSortButtonName={() => 'Nombre de Amount'}
      />
    );
    await waitFor(() => {
      expect(errorSpy.mock.calls.map((call) => String(call[1]))).not.toContain(EMPTY_NAME_MESSAGE);
    });
  });

  it('falls back when the formatter returns a non-string', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        formatSortButtonName={() => null as unknown as string}
      />
    );
    expect(
      container.querySelector('[data-column-id="amount"] button')?.getAttribute('aria-label')
    ).toBe('Sort by Amount');
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('DataTable', EMPTY_NAME_MESSAGE);
    });
  });
});

describe('INV-322: SF-12 adds no fetch and no body loading chrome', () => {
  it('does not call fetch when a formatter is present', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(
      <DataTable
        {...captionTableProps({
          formatSortButtonName: ({ columnName }) => `Sort ${columnName}`,
        })}
      />
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
