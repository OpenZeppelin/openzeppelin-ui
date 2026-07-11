import { Check, Copy, ExternalLink, Pencil } from 'lucide-react';
import * as React from 'react';

import type { ResolvedName } from '@openzeppelin/ui-types';
import { cn, truncateMiddle } from '@openzeppelin/ui-utils';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip';
import { AddressAvatar, type AddressAvatarVariant } from './address-avatar';
import { AddressLabelContext, AddressNameContext } from './context';

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
 * Strip C0/C1 controls, bidi embeds/isolates, and zero-width characters from a
 * verified name at the display seam. ENSIP-15 normalization remains the
 * adapter's job; this only removes invisible directionality/control glyphs so
 * a raw render cannot spoof adjacent UI (homoglyph confusables are out of scope).
 */
function sanitizeVerifiedNameForDisplay(name: string): string {
  return name.replace(
    // eslint-disable-next-line no-control-regex -- intentional strip of C0/C1 + bidi/zw
    /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g,
    ''
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

export interface AddressDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
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
   * When `true`, render the instance fully raw: skip label resolution from
   * `AddressLabelContext` AND suppress any injected resolved name
   * (`resolvedName` prop / `AddressNameContext`). Useful for rendering an
   * address without any decoration (e.g. in a contract selector where the
   * contract name is already shown) — existing `disableLabel` call-sites
   * must not sprout a name once a resolver is wired app-wide.
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
   * Optional presentational leading element (e.g. an avatar or icon), rendered
   * before the label/address block and vertically centered against it. Purely
   * visual — a `React.ReactNode`, not a capability, so this component stays
   * chain-agnostic. When omitted (the default at every existing call-site), the
   * rendered DOM and layout are byte-for-byte identical to the pre-avatar
   * component: no wrapper element, no reserved slot, in both render branches.
   */
  avatar?: React.ReactNode;

  /**
   * Visual treatment for the leading avatar (both the record-constructed ENS
   * avatar and an explicit `avatar` node):
   *
   * - `'fill'` – a square avatar that stretches to the chip's full height and
   *   sits flush against its top, bottom, and left edges (default; the chip
   *   clips its outer corners). No effect when no avatar is shown.
   * - `'circle'` – small round avatar sitting inline with the text (the
   *   original look, kept as an opt-in).
   *
   * @default "fill"
   */
  avatarVariant?: AddressAvatarVariant;

  /**
   * An already-resolved reverse name record for this address (value type).
   * Highest precedence for the name channel — shadows the
   * `AddressNameContext` resolver, exactly as `label` shadows
   * `AddressLabelContext` (INV-120). The record's name renders only when
   * `forwardVerified === true` (INV-52, LOCKED): a mismatched record is
   * suppressed to hex — never name-alone, never name+warning. `undefined`
   * falls back to the context (if any), then to hex.
   */
  resolvedName?: ResolvedName;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Displays a blockchain address with optional truncation, copy button,
 * explorer link, tooltip, human-readable label, and (when an already-resolved
 * record is injected) a forward-verified name + avatar.
 *
 * Labels are resolved in priority order (INV-56):
 * 1. Explicit `label` prop
 * 2. `AddressLabelContext` resolver (via `AddressLabelProvider`)
 * 3. Forward-verified resolved name (`resolvedName` prop, else
 *    `AddressNameContext` via `AddressNameProvider`) — a record with
 *    `forwardVerified: false` is suppressed to hex (INV-52, LOCKED)
 * 4. No label (renders address only, identical to previous behavior)
 *
 * The component is synchronous and capability-free (INV-121): it never
 * resolves anything itself — it reads injected values. Hex renders on first
 * commit; the name+avatar swap in when the react layer feeds an updated
 * record (progressive enhancement, INV-61). With no `resolvedName` and no
 * `AddressNameProvider`, output is byte-identical to the pre-enhancement
 * component (INV-54, LOCKED).
 *
 * Pass `disableLabel` to render fully raw — it suppresses both the context
 * alias and any injected resolved name (e.g. when the surrounding UI already
 * shows a name, such as a contract selector).
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
 * // Reverse-resolved name + avatar via an injected value (react layer owns the async)
 * <AddressDisplay address="0x742d35Cc..." resolvedName={record} showCopyButton />
 *
 * // Or subtree-wide via context (rows stay plain <AddressDisplay/>)
 * <AddressNameProvider resolveAddressName={readFromResolutionCache}>
 *   <AddressDisplay address="0x742d35Cc..." />
 * </AddressNameProvider>
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
  avatar,
  avatarVariant = 'fill',
  resolvedName,
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

  // INV-60: both context reads are unconditional (stable hook order); the
  // record is derived by plain synchronous expressions — no resolution hook,
  // no async, ever (INV-121).
  const resolver = React.useContext(AddressLabelContext);
  const nameResolver = React.useContext(AddressNameContext);

  const resolvedLabel = disableLabel
    ? undefined
    : (labelProp ?? resolver?.resolveLabel(address, networkId));

  // INV-120: record source — the `resolvedName` prop shadows the context
  // resolver (mirrors the label channel's prop-shadows-context convention).
  // `disableLabel` renders the instance fully raw, so it gates this channel
  // too (dev-pinned 2026-07-06; deviation from the invariants-doc's
  // only-alias recommendation — existing disableLabel call-sites must not
  // sprout a name once a resolver is wired app-wide).
  const record = disableLabel
    ? undefined
    : (resolvedName ?? nameResolver?.resolveAddressName(address, networkId));

  // INV-52 (LOCKED, suppress-to-hex): the ONLY expression that can yield a
  // displayable resolved name. A record with `forwardVerified: false`
  // (forward-mismatch) and an undefined record (idle/loading/no-record/error,
  // collapsed upstream) both fall through to `undefined` → hex. No name-alone,
  // no name+warning. Control/bidi/zw stripped at this seam; confusables stay
  // with adapter ENSIP-15 normalization.
  const ensName =
    record?.forwardVerified === true ? sanitizeVerifiedNameForDisplay(record.name) : undefined;

  // INV-56: precedence — explicit `label` > alias > verified name > hex.
  // Collapses to the pre-enhancement `resolvedLabel` when nothing is injected
  // (INV-54: zero-injection byte-identical).
  const effectiveLabel = resolvedLabel ?? ensName;

  const effectiveTruncate =
    truncateProp !== undefined
      ? truncateProp
      : truncateWhenLabeled
        ? Boolean(effectiveLabel)
        : true;

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

  // INV-58: a constructed avatar exists ONLY when the verified name WON the
  // precedence (no explicit label, no alias) and the record carries a URL —
  // never next to an alias, explicit label, or bare hex. An explicit `avatar`
  // prop is highest precedence and always wins (preserves the D2 slot).
  const ensAvatarUrl =
    ensName !== undefined && resolvedLabel === undefined ? record?.avatarUrl : undefined;
  const effectiveAvatar =
    avatar ??
    (ensAvatarUrl ? <AddressAvatar src={ensAvatarUrl} variant={avatarVariant} /> : undefined);

  // A `'fill'` avatar stretches to the chip's full height flush to its edges;
  // it only changes layout when an avatar is actually shown.
  const isFillAvatar = avatarVariant === 'fill' && Boolean(effectiveAvatar);

  // On a chip, the `'fill'` avatar must break out of the container's padding to
  // sit flush against the top/bottom/left edges, and the container clips the
  // avatar's square outer corners to the chip radius.
  const fillAvatarChipClassName = isFillAvatar && isChip ? 'overflow-hidden' : undefined;

  // Leading avatar slot. Only materialized when an avatar exists, so an
  // undefined avatar leaves the rendered tree byte-for-byte identical (INV-54:
  // no wrapper element, no reserved space). `shrink-0` keeps it from
  // compressing. `'circle'`: the container's `items-center` vertically centers
  // a small round avatar. `'fill'`: a square, `self-stretch` box sized to the
  // text block's height (so the image, positioned absolutely inside, never
  // drives layout); negative margins cancel the chip padding on three edges and
  // `overflow-hidden` clips the image to the square.
  const avatarSlot = effectiveAvatar ? (
    <span
      className={cn(
        'flex shrink-0',
        isFillAvatar
          ? // `self-stretch` fills the text block's height (edge-to-edge vertically);
            // `w-9` gives a definite width so the absolutely positioned image is
            // visible (a stretch-resolved height can't feed `aspect-square`).
            // Negative margins cancel the chip padding to sit flush to the edges.
            cn('relative w-9 self-stretch overflow-hidden mr-2', isChip && '-my-1 -ml-2')
          : 'mr-1.5 items-center'
      )}
    >
      {effectiveAvatar}
    </span>
  ) : null;

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

  if (effectiveLabel) {
    // The label-over-mono-hex column. Its internal structure is invariant across
    // the avatar / no-avatar paths (INV-54): with an avatar it is wrapped in a
    // leading-slot row; without one it is the container's direct children, so
    // the tree matches the pre-avatar component exactly. The verified name
    // flows through the SAME labeled branch an alias uses, so the mono hex
    // secondary line, copy button, explorer link, and edit pencil all keep
    // their existing a11y surface (INV-68).
    const labelColumn = (
      <>
        <span className="truncate font-sans font-medium text-slate-900 leading-snug">
          {effectiveLabel}
        </span>
        <div className="flex min-w-0 items-center font-mono text-[10px] text-slate-400 leading-snug">
          <span className={addressTextClassName}>{displayAddress}</span>
          {actionButtons}
        </div>
      </>
    );

    return wrapWithTooltip(
      <div
        className={cn(
          'group inline-flex max-w-full min-w-0',
          // Row when an avatar leads the block; the original flex-col otherwise.
          effectiveAvatar ? 'items-center' : 'flex-col',
          isChip && 'rounded-md bg-slate-100 px-2 py-1',
          fillAvatarChipClassName,
          'text-xs text-slate-700',
          expandInteractionClassName,
          className
        )}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={handleUntruncateClick}
        {...props}
      >
        {effectiveAvatar ? (
          <>
            {avatarSlot}
            <div className="inline-flex min-w-0 flex-col">{labelColumn}</div>
          </>
        ) : (
          labelColumn
        )}
      </div>
    );
  }

  return wrapWithTooltip(
    <div
      className={cn(
        'group inline-flex max-w-full min-w-0 items-center',
        isChip && 'rounded-md bg-slate-100 px-2 py-1',
        fillAvatarChipClassName,
        'text-xs font-mono text-slate-700',
        expandInteractionClassName,
        className
      )}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleUntruncateClick}
      {...props}
    >
      {avatarSlot}
      <span className={addressTextClassName}>{displayAddress}</span>
      {actionButtons}
    </div>
  );
}
