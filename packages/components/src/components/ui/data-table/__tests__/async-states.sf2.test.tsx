/**
 * SF-2 · Async / loading / error / empty — INV-54, INV-55.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../../button';
import { DataTable } from '../data-table';
import { getTokenRowKey, TOKEN_ROWS, tokenColumns } from './sf2-fixtures';

const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'data-table.tsx'),
  'utf8'
);

describe('INV-54: exactly two body states; rows=[] is empty', () => {
  it('treats non-empty rows as data and empty rows as empty regardless of empty slot', () => {
    const columns = tokenColumns();
    const filled = render(
      <DataTable caption="T" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    expect(filled.container.querySelector('[data-slot="data-table-row"]')).not.toBeNull();
    expect(filled.container.querySelector('[data-slot="data-table-empty"]')).toBeNull();
    filled.unmount();

    const empty = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={[]}
        getRowKey={getTokenRowKey}
        emptyState={<Button type="button">Add</Button>}
      />
    );
    expect(empty.container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    expect(empty.container.querySelector('[data-slot="data-table-row"]')).toBeNull();
  });

  it('does not import skeleton, spinner, alert, or loading chrome', () => {
    expect(SOURCE).not.toMatch(/\bSkeleton\b/);
    expect(SOURCE).not.toMatch(/\bSpinner\b/);
    expect(SOURCE).not.toMatch(/\bAlert\b/);
    expect(SOURCE).not.toMatch(/\bLoading\b/);
  });
});

describe('INV-55: empty content precedence', () => {
  it('renders kit EmptyState defaults when no slot or copy is provided', () => {
    const { getByRole, getByText } = render(
      <DataTable caption="T" columns={tokenColumns()} rows={[]} getRowKey={getTokenRowKey} />
    );
    expect(getByRole('heading', { level: 3, name: 'Nothing to show' })).toBeTruthy();
    expect(getByText('There are no rows to display.')).toBeTruthy();
  });

  it('overrides title and description on the kit EmptyState', () => {
    const { getByRole, getByText, queryByText } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={getTokenRowKey}
        emptyTitle="No accounts"
        emptyDescription="Add one to get started."
      />
    );
    expect(getByRole('heading', { level: 3, name: 'No accounts' })).toBeTruthy();
    expect(getByText('Add one to get started.')).toBeTruthy();
    expect(queryByText('Nothing to show')).toBeNull();
  });

  it('uses the slot and ignores copy props (no kit EmptyState heading)', () => {
    const { getByRole, queryByRole, queryByText } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={getTokenRowKey}
        emptyTitle="Nothing to show"
        emptyState={<Button type="button">Add account</Button>}
      />
    );
    expect(getByRole('button', { name: 'Add account' })).toBeTruthy();
    expect(queryByRole('heading', { level: 3 })).toBeNull();
    expect(queryByText('Nothing to show')).toBeNull();
  });
});
