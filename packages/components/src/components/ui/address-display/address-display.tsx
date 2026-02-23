import { Check, Copy, ExternalLink, Pencil } from 'lucide-react';
import * as React from 'react';

import { cn, truncateMiddle } from '@openzeppelin/ui-utils';

import { AddressLabelContext } from './context';

interface AddressDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The blockchain address to display
   */
  address: string;

  /**
   * Whether to truncate the address in the middle
   * @default true
   */
  truncate?: boolean;

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
   * When `true`, skip label resolution from `AddressLabelContext`.
   * Useful for rendering an address without alias decoration (e.g. in
   * a contract selector where the contract name is already shown).
   * @default false
   */
  disableLabel?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Displays a blockchain address with optional truncation, copy button,
 * explorer link, and human-readable label.
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
 * ```
 */
export function AddressDisplay({
  address,
  truncate = true,
  startChars = 6,
  endChars = 4,
  showCopyButton = false,
  showCopyButtonOnHover = false,
  explorerUrl,
  label: labelProp,
  onLabelEdit: onLabelEditProp,
  disableLabel = false,
  className,
  ...props
}: AddressDisplayProps): React.ReactElement {
  const [copied, setCopied] = React.useState(false);
  const copyTimeoutRef = React.useRef<number | null>(null);

  const resolver = React.useContext(AddressLabelContext);

  const resolvedLabel = disableLabel ? undefined : (labelProp ?? resolver?.resolveLabel(address));
  const editHandler = disableLabel
    ? undefined
    : (onLabelEditProp ??
      (resolver?.onEditLabel ? () => resolver.onEditLabel!(address) : undefined));

  const displayAddress = truncate ? truncateMiddle(address, startChars, endChars) : address;

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

  if (resolvedLabel) {
    return (
      <div
        className={cn(
          'group inline-flex max-w-full flex-col rounded-md bg-slate-100 px-2 py-1',
          'text-xs text-slate-700',
          className
        )}
        {...props}
      >
        <span className="truncate font-sans font-medium text-slate-900 leading-snug">
          {resolvedLabel}
        </span>
        <div className="flex items-center font-mono text-[10px] text-slate-400 leading-snug">
          <span className={cn('truncate', truncate ? '' : 'break-all')}>{displayAddress}</span>
          {actionButtons}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group inline-flex max-w-full items-center rounded-md bg-slate-100 px-2 py-1',
        'text-xs font-mono text-slate-700',
        className
      )}
      {...props}
    >
      <span className={cn('truncate', truncate ? '' : 'break-all')}>{displayAddress}</span>
      {actionButtons}
    </div>
  );
}
