/**
 * SF-10 · Prop/state contract — INV-272 … INV-276, INV-123.
 */
import './sf4-jsdom-setup';

import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import type { DataTableProps, DataTableVirtualization } from '../types';
import { captionTableProps, type TokenRow } from './sf2-fixtures';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('INV-272 / INV-123: stickyHeader belongs to DataTableProps only', () => {
  it('is an optional boolean and remains excess on virtualization options', () => {
    expectTypeOf<DataTableProps<TokenRow>['stickyHeader']>().toEqualTypeOf<boolean | undefined>();
    const tableProps = {
      ...captionTableProps(),
      stickyHeader: false,
    } satisfies DataTableProps<TokenRow>;
    const invalidVirtualization = {
      // @ts-expect-error INV-123: sticky is table-level, not a virtualization option.
      stickyHeader: false,
    } satisfies DataTableVirtualization;
    expect(tableProps.stickyHeader).toBe(false);
    expect(invalidVirtualization.stickyHeader).toBe(false);
  });
});

describe('INV-273: sticky has no runtime failure or no-op diagnostic', () => {
  it.each([
    { name: 'default P1', stickyHeader: undefined },
    { name: 'explicit sticky', stickyHeader: true },
    { name: 'opt-out', stickyHeader: false },
  ])('$name renders without a sticky-specific logger error', async ({ stickyHeader }) => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const props =
      stickyHeader === undefined ? captionTableProps() : { ...captionTableProps(), stickyHeader };
    render(<DataTable {...props} />);
    await waitFor(() => {
      expect(
        errorSpy.mock.calls.filter((call) => /sticky/i.test(String(call[1]))),
        'INV-273: unbounded sticky no-op must stay silent'
      ).toEqual([]);
    });
  });
});
