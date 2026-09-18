/**
 * SF-8 · Error boundaries — INV-189, INV-205.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Component, type ReactNode } from 'react';

import { DataTable } from '../data-table';
import { captionTableProps, TOKEN_ROWS } from './sf2-fixtures';

class TestBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  public state: { error: Error | null } = { error: null };

  public static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  public render(): ReactNode {
    return this.state.error == null ? this.props.children : <div>{this.state.error.message}</div>;
  }
}

describe('INV-205: integrator errors remain observable', () => {
  it('lets a row-label render error reach the app error boundary', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <TestBoundary>
        <DataTable
          {...captionTableProps({
            rows: TOKEN_ROWS.slice(0, 1),
            selection: {
              selectedKeys: new Set(),
              onSelectionChange: vi.fn(),
              getCheckboxLabel: () => {
                throw new Error('selection-label-failed');
              },
            },
          })}
        />
      </TestBoundary>
    );
    expect(container.textContent).toContain('selection-label-failed');
  });

  it('does not swallow a throwing selection callback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const observed: Error[] = [];
    const observeError = (event: ErrorEvent): void => {
      event.preventDefault();
      if (event.error instanceof Error) {
        observed.push(event.error);
      }
    };
    window.addEventListener('error', observeError);
    const { getByRole } = render(
      <DataTable
        {...captionTableProps({
          rows: TOKEN_ROWS.slice(0, 1),
          selection: {
            selectedKeys: new Set(),
            onSelectionChange: () => {
              throw new Error('selection-change-failed');
            },
          },
        })}
      />
    );
    fireEvent.click(getByRole('checkbox', { name: 'Select a' }));
    window.removeEventListener('error', observeError);
    expect(observed.map((error) => error.message)).toContain('selection-change-failed');
  });
});
