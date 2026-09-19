import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLayoutEffect, useRef, type ReactElement } from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { Button } from '../button';
import {
  DATA_TABLE_PAGINATION_CHROME,
  DATA_TABLE_PAGINATION_HIDDEN_STATUS_CHROME,
  DATA_TABLE_PAGINATION_NEIGHBOUR_CHROME,
  DATA_TABLE_PAGINATION_NEIGHBOUR_ICON_CHROME,
  DATA_TABLE_PAGINATION_PAGES_CHROME,
} from './chrome';
import type { DataTablePageListItem } from './helpers';

export interface DataTablePaginationControlsProps {
  readonly paginationLabel: string;
  readonly previousLabel: string;
  readonly nextLabel: string;
  readonly statusText: string;
  readonly className?: string;
  readonly hideStatus?: boolean;
  readonly busy: boolean;
  readonly previousDisabled: boolean;
  readonly nextDisabled: boolean;
  readonly currentPageIndex: number;
  readonly pageItems: readonly DataTablePageListItem[];
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onPage: (pageIndex: number) => void;
}

/**
 * Internal pager chrome (INV-95, INV-232–INV-238, INV-249). Not barrel-exported.
 */
export function DataTablePaginationControls({
  paginationLabel,
  previousLabel,
  nextLabel,
  statusText,
  className,
  hideStatus = false,
  busy,
  previousDisabled,
  nextDisabled,
  currentPageIndex,
  pageItems,
  onPrevious,
  onNext,
  onPage,
}: DataTablePaginationControlsProps): ReactElement {
  const navRef = useRef<HTMLElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const navHadFocusRef = useRef(false);

  // INV-249: Tab / .focus() must arm rescue without waiting for a pager commit.
  // INV-109: leaving the nav for a real target (row control) must disarm so a
  // later DataTable render cannot steal focus back onto a page button.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (nav == null) {
      return;
    }
    const onFocusIn = (): void => {
      navHadFocusRef.current = true;
    };
    const onFocusOut = (event: FocusEvent): void => {
      const next = event.relatedTarget;
      if (next instanceof Node && nav.contains(next)) {
        return;
      }
      if (next instanceof Node && next !== document.body) {
        navHadFocusRef.current = false;
      }
    };
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && !nav.contains(target)) {
        navHadFocusRef.current = false;
      }
    };
    nav.addEventListener('focusin', onFocusIn);
    nav.addEventListener('focusout', onFocusOut);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      nav.removeEventListener('focusin', onFocusIn);
      nav.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  // INV-249 / INV-106 / INV-109: rescue only after a pager commit, only inside this nav.
  // Do not depend on `pageItems` identity — `buildPageItems` allocates a new array
  // whenever DataTable renders (sort / selection / parent update).
  useLayoutEffect(() => {
    const nav = navRef.current;
    const previousButton = previousRef.current;
    const nextButton = nextRef.current;
    const status = statusRef.current;
    if (nav == null) {
      return;
    }

    const active = document.activeElement;
    const inside = active instanceof Node && nav.contains(active);
    const focusedDisabled = inside && active instanceof HTMLButtonElement && active.disabled;
    const needsRescue = focusedDisabled || (!inside && navHadFocusRef.current);

    if (needsRescue) {
      const currentPageButton = nav.querySelector<HTMLButtonElement>(
        '[data-slot="data-table-pagination-page"][aria-current="page"]'
      );
      if (currentPageButton != null && !currentPageButton.disabled) {
        currentPageButton.focus({ preventScroll: true });
      } else if (!previousDisabled) {
        previousButton?.focus({ preventScroll: true });
      } else if (!nextDisabled) {
        nextButton?.focus({ preventScroll: true });
      } else {
        status?.focus({ preventScroll: true });
      }
    }

    navHadFocusRef.current = nav.contains(document.activeElement);
  }, [previousDisabled, nextDisabled, busy, currentPageIndex]);

  return (
    <nav
      ref={navRef}
      data-slot="data-table-pagination"
      aria-label={paginationLabel}
      aria-busy={busy ? true : undefined}
      className={cn(
        DATA_TABLE_PAGINATION_CHROME,
        hideStatus && DATA_TABLE_PAGINATION_HIDDEN_STATUS_CHROME,
        className
      )}
    >
      <p
        ref={statusRef}
        data-slot="data-table-pagination-status"
        tabIndex={-1}
        aria-live="polite"
        aria-atomic="true"
        className={cn('m-0 text-sm text-muted-foreground', hideStatus && 'sr-only')}
      >
        {statusText}
      </p>
      <div data-slot="data-table-pagination-pages" className={DATA_TABLE_PAGINATION_PAGES_CHROME}>
        <Button
          ref={previousRef}
          type="button"
          variant="outline"
          size="sm"
          className={DATA_TABLE_PAGINATION_NEIGHBOUR_CHROME}
          data-slot="data-table-pagination-previous"
          disabled={previousDisabled}
          onClick={() => {
            if (previousDisabled) {
              return;
            }
            onPrevious();
          }}
        >
          <ChevronLeft aria-hidden="true" className={DATA_TABLE_PAGINATION_NEIGHBOUR_ICON_CHROME} />
          {previousLabel}
        </Button>
        {pageItems.map((item) => {
          if (item.kind === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${item.key}`}
                data-slot="data-table-pagination-ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            );
          }

          const isCurrent = item.pageIndex === currentPageIndex;
          const label = String(item.pageIndex + 1);
          return (
            <Button
              key={`page-${String(item.pageIndex)}`}
              type="button"
              variant={isCurrent ? 'default' : 'outline'}
              size="sm"
              data-slot="data-table-pagination-page"
              data-page-index={String(item.pageIndex)}
              aria-current={isCurrent ? 'page' : undefined}
              disabled={busy}
              onClick={() => {
                if (busy || isCurrent) {
                  return;
                }
                onPage(item.pageIndex);
              }}
            >
              {label}
            </Button>
          );
        })}
        <Button
          ref={nextRef}
          type="button"
          variant="outline"
          size="sm"
          className={DATA_TABLE_PAGINATION_NEIGHBOUR_CHROME}
          data-slot="data-table-pagination-next"
          disabled={nextDisabled}
          onClick={() => {
            if (nextDisabled) {
              return;
            }
            onNext();
          }}
        >
          {nextLabel}
          <ChevronRight
            aria-hidden="true"
            className={DATA_TABLE_PAGINATION_NEIGHBOUR_ICON_CHROME}
          />
        </Button>
      </div>
    </nav>
  );
}
