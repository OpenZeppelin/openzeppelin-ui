import { Check, Copy, ExternalLink, Pencil } from 'lucide-react';
import * as React from 'react';

import { cn, truncateMiddle } from '@openzeppelin/ui-utils';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip';
import { AddressLabelContext } from './context';

/**
 * True when the primary input can hover (e.g. desktop with mouse).
 * Touch-first phones typically report false. SSR assumes hover-capable.
 */
function usePrefersHover(): boolean {
  return React.useSyncExternalStore(
    React.useCallback((onStoreChange) => {
      if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
        return (): void => {};
      }
      const mq = window.matchMedia('(hover: hover)');
      mq.addEventListener('change', onStoreChange);
      return (): void => mq.removeEventListener('change', onStoreChange);
    }, []),
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia !== 'undefined'
        ? window.matchMedia('(hover: hover)').matches
        : true,
    () => true
  );
}

/**
 * Visual style for the component container.
 *
 * - `"chip"` – rounded pill with a slate background (default).
 * - `"inline"` – no background, padding, or border-radius; just the text
 *    and optional action buttons. Use when dropping into existing layouts
 *    where the parent already provides styling (e.g. wallet display bars).
 */
export type AddressDisplayVariant = 'chip' | 'inline';

interface AddressDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The blockchain address to display
   */
  address: string;

  /**
   * Whether to truncate the address in the middle.
   * When omitted, defaults to `true` unless `truncateWhenLabeled` applies.
   */
  truncate?: boolean;

  /**
   * When `true` and `truncate` is **not** explicitly set, the address truncates
   * only when a label is shown (via the `label` prop or
   * `AddressLabelContext`). Use this when a long raw address should stay
   * fully visible unless an alias already identifies the row.
   * @default false
   */
  truncateWhenLabeled?: boolean;

  /**
   * When `truncate` is true, show the full address while the pointer is over
   * the component (on devices that support hover), or toggle on tap
   * (on touch-first / `(hover: none)` devices).
   * Has no effect when `truncate` is false.
   * @default false
   */
  untruncateOnHover?: boolean;

  /**
   * Number of characters to show at the beginning when truncating
   * @default 6
   */
  startChars?: number;

  /**
   * Number of characters to show at the end when truncating
   * @default 4
   */
  endChars?: number;

  /**
   * Whether to show a copy button
   * @default false
   */
  showCopyButton?: boolean;

  /**
   * Whether to show the copy button only on hover
   * @default false
   */
  showCopyButtonOnHover?: boolean;

  /**
   * Optional explorer URL to make the address clickable
   */
  explorerUrl?: string;

  /**
   * Human-readable label to display alongside the address.
   * Takes priority over any label resolved via `AddressLabelContext`.
   */
  label?: string;

  /**
   * Callback to trigger label editing for this address.
   * When provided, a pencil icon is rendered. Takes priority over
   * the `onEditLabel` from `AddressLabelContext`.
   */
  onLabelEdit?: () => void;

  /**
   * Optional network identifier used when resolving labels and triggering
   * edits via `AddressLabelContext`. Important for multi-network scenarios
   * where the same address may have different aliases per network.
   */
  networkId?: string;

  /**
   * When `true`, skip label resolution from `AddressLabelContext`.
   * Useful for rendering an address without alias decoration (e.g. in
   * a contract selector where the contract name is already shown).
   * @default false
   */
  disableLabel?: boolean;

  /**
   * When `true` and the address is truncated, a tooltip shows the full
   * address on hover. Has no visual effect when `truncate` is `false`.
   * Mutually exclusive with `untruncateOnHover` — if both are set,
   * `showTooltip` takes precedence.
   * @default false
   */
  showTooltip?: boolean;

  /**
   * Visual variant of the component container.
   * @default "chip"
   */
  variant?: AddressDisplayVariant;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Displays a blockchain address with optional truncation, copy button,
 * explorer link, tooltip, and human-readable label.
 *
 * Labels are resolved in priority order:
 * 1. Explicit `label` prop
 * 2. `AddressLabelContext` resolver (via `AddressLabelProvider`)
 * 3. No label (renders address only, identical to previous behavior)
 *
 * Pass `disableLabel` to suppress context-based resolution (e.g. when the
 * surrounding UI already shows a name, such as a contract selector).
 *
 * @example
 * ```tsx
 * // Basic usage (unchanged)
 * <AddressDisplay address="0x742d35Cc..." showCopyButton />
 *
 * // Explicit label
 * <AddressDisplay address="0x742d35Cc..." label="Treasury" />
 *
 * // Auto-resolved via context (no changes needed at call site)
 * <AddressLabelProvider resolveLabel={myResolver}>
 *   <AddressDisplay address="0x742d35Cc..." />
 * </AddressLabelProvider>
 *
 * // Suppress label resolution for a specific instance
 * <AddressDisplay address="0x742d35Cc..." disableLabel />
 *
 * // Reveal full address on hover (still truncated when idle)
 * <AddressDisplay address="0x742d35Cc..." untruncateOnHover />
 *
 * // Tooltip with full address on hover + copy icon on hover
 * <AddressDisplay address="0x742d35Cc..." showTooltip showCopyButton showCopyButtonOnHover />
 *
 * // Inline variant (no chip background) — useful inside wallet bars
 * <AddressDisplay address="0x742d35Cc..." variant="inline" showTooltip showCopyButton />
 *
 * // Truncate only when an alias/label is present (full address when unlabeled)
 * <AddressDisplay address="G..." truncateWhenLabeled />
 * ```
 */
export function AddressDisplay({
  address,
  truncate: truncateProp,
  truncateWhenLabeled = false,
  untruncateOnHover = false,
  startChars = 6,
  endChars = 4,
  showCopyButton = false,
  showCopyButtonOnHover = false,
  explorerUrl,
  label: labelProp,
  onLabelEdit: onLabelEditProp,
  networkId,
  disableLabel = false,
  showTooltip = false,
  variant = 'chip',
  className,
  onPointerEnter,
  onPointerLeave,
  onMouseEnter,
  onMouseLeave,
  onClick,
  ...props
}: AddressDisplayProps): React.ReactElement {
  const [copied, setCopied] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const copyTimeoutRef = React.useRef<number | null>(null);
  const prefersHover = usePrefersHover();

  const resolver = React.useContext(AddressLabelContext);

  const resolvedLabel = disableLabel
    ? undefined
    : (labelProp ?? resolver?.resolveLabel(address, networkId));

  const effectiveTruncate =
    truncateProp !== undefined ? truncateProp : truncateWhenLabeled ? Boolean(resolvedLabel) : true;

  const contextEditHandler = React.useCallback(() => {
    resolver?.onEditLabel?.(address, networkId);
  }, [resolver, address, networkId]);

  const editHandler = disableLabel
    ? undefined
    : (onLabelEditProp ?? (resolver?.onEditLabel ? contextEditHandler : undefined));

  const canUntruncate = untruncateOnHover && effectiveTruncate && !showTooltip;
  const showFullAddress = !effectiveTruncate || (canUntruncate && isHovered);
  const displayAddress = showFullAddress ? address : truncateMiddle(address, startChars, endChars);

  const addressTextClassName = cn(
    !showFullAddress && 'truncate',
    (showFullAddress || !effectiveTruncate) && 'break-all'
  );

  const expandInteractionClassName = canUntruncate && !prefersHover ? 'cursor-pointer' : undefined;

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (canUntruncate && prefersHover) {
      setIsHovered(true);
    }
    onPointerEnter?.(e);
    onMouseEnter?.(e as unknown as React.MouseEvent<HTMLDivElement>);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (canUntruncate && prefersHover) {
      setIsHovered(false);
    }
    onPointerLeave?.(e);
    onMouseLeave?.(e as unknown as React.MouseEvent<HTMLDivElement>);
  };

  const handleUntruncateClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (canUntruncate && !prefersHover) {
      setIsHovered((open) => !open);
    }
    onClick?.(e);
  };

  const handleCopy = (e: React.MouseEvent): void => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);

    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => {
      setCopied(false);
      copyTimeoutRef.current = null;
    }, 2000);
  };

  React.useEffect(() => {
    return (): void => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const isChip = variant === 'chip';

  const actionButtons = (
    <>
      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'shrink-0 text-slate-500',
            !copied && 'hover:text-slate-700',
            showCopyButtonOnHover
              ? 'ml-0 w-0 overflow-hidden opacity-0 transition-all duration-150 group-hover:ml-1.5 group-hover:w-3.5 group-hover:opacity-100 focus:ml-1.5 focus:w-3.5 focus:opacity-100'
              : 'ml-1.5 transition-colors'
          )}
          aria-label={copied ? 'Copied' : 'Copy address'}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="ml-1.5 shrink-0 text-slate-500 transition-colors hover:text-slate-700"
          aria-label="View in explorer"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {editHandler && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            editHandler();
          }}
          className="ml-0 w-0 shrink-0 overflow-hidden text-slate-500 opacity-0 transition-all duration-150 hover:text-slate-700 group-hover:ml-1.5 group-hover:w-3.5 group-hover:opacity-100 focus:ml-1.5 focus:w-3.5 focus:opacity-100"
          aria-label="Edit label"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </>
  );

  const shouldShowTooltip = showTooltip && effectiveTruncate;

  const wrapWithTooltip = (content: React.ReactElement): React.ReactElement => {
    if (!shouldShowTooltip) return content;
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent className="font-mono text-xs">{address}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (resolvedLabel) {
    return wrapWithTooltip(
      <div
        className={cn(
          'group inline-flex max-w-full min-w-0 flex-col',
          isChip && 'rounded-md bg-slate-100 px-2 py-1',
          'text-xs text-slate-700',
          expandInteractionClassName,
          className
        )}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={handleUntruncateClick}
        {...props}
      >
        <span className="truncate font-sans font-medium text-slate-900 leading-snug">
          {resolvedLabel}
        </span>
        <div className="flex min-w-0 items-center font-mono text-[10px] text-slate-400 leading-snug">
          <span className={addressTextClassName}>{displayAddress}</span>
          {actionButtons}
        </div>
      </div>
    );
  }

  return wrapWithTooltip(
    <div
      className={cn(
        'group inline-flex max-w-full min-w-0 items-center',
        isChip && 'rounded-md bg-slate-100 px-2 py-1',
        'text-xs font-mono text-slate-700',
        expandInteractionClassName,
        className
      )}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleUntruncateClick}
      {...props}
    >
      <span className={addressTextClassName}>{displayAddress}</span>
      {actionButtons}
    </div>
  );
}
