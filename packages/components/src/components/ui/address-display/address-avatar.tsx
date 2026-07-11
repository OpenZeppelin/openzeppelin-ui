import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

/**
 * Visual treatment for {@link AddressAvatar}.
 *
 * - `'fill'` – a square avatar that stretches to the parent slot's full
 *   height and sits flush against its edges (default). Intended for a chip
 *   whose container clips it with `overflow-hidden` + a border radius.
 * - `'circle'` – small round avatar sitting inline with the text (the
 *   original look, kept as an opt-in).
 */
export type AddressAvatarVariant = 'circle' | 'fill';

/**
 * Props for {@link AddressAvatar}.
 *
 * The design sketched a required `name` used as the `alt` source. It is
 * replaced by an optional `alt` defaulting to `''` (decorative): the
 * forward-verified name renders as adjacent visible label text and already
 * carries the accessible identity, so announcing it again via the avatar
 * would be redundant (INV-67, locked decorative-alt decision 2026-07-04).
 * A future descriptive convention (e.g. SF-6) can pass `alt` explicitly.
 */
export interface AddressAvatarProps {
  /** Avatar URL from `ResolvedName.avatarUrl`. */
  readonly src: string;
  /**
   * Accessible text for the image. Defaults to `''` (decorative), because the
   * visible name already carries the identity (INV-67). Never omitted from
   * the rendered `<img>`.
   */
  readonly alt?: string;
  /**
   * Visual treatment. Defaults to `'fill'` (a square avatar stretched to the
   * slot's full height); `'circle'` opts into the original inline round avatar.
   */
  readonly variant?: AddressAvatarVariant;
  /**
   * Escape-hatch Tailwind size/shape classes. When provided, overrides the
   * `variant`-derived classes entirely. Left for advanced call-sites; the
   * `variant` prop covers the standard looks.
   */
  readonly sizeClassName?: string;
}

/**
 * Allowlist for name-owner-controlled avatar URLs at the render site.
 * Only `https:` and `data:image/*` pass; `http:` (mixed content), `javascript:`,
 * and other schemes are dropped. Does not rely on adapter sanitization.
 */
function isAllowedAvatarSrc(src: string): boolean {
  try {
    const url = new URL(src);
    if (url.protocol === 'https:') return true;
    // `data:image/png;base64,...` — reject non-image data URLs (e.g. data:text/html).
    if (url.protocol === 'data:') return /^data:image\/[a-z0-9.+-]+/i.test(src);
    return false;
  } catch {
    return false;
  }
}

/**
 * @internal Avatar image for a resolved name, hiding itself on load error
 * (never a broken-image icon) — the name renders as a complete, avatar-less
 * row. Purely presentational; its only state is the per-instance load-error
 * flag (INV-121).
 *
 * The error state is keyed to the current `src` rather than a bare boolean,
 * so it resets automatically when `src` changes — a virtualized/reused list
 * row that scrolls to a new address re-attempts its avatar instead of staying
 * permanently hidden by a prior URL's failure (INV-59).
 *
 * @param props - {@link AddressAvatarProps}.
 * @returns The avatar `<img>`, or `null` when the load failed for this `src`.
 */
export function AddressAvatar({
  src,
  alt = '',
  variant = 'fill',
  sizeClassName,
}: AddressAvatarProps): React.ReactElement | null {
  // INV-59: track the src that failed, not a plain flag — `failed` is derived
  // as `failedSrc === src`, so a new src is never suppressed by an old failure.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);

  // Drop disallowed schemes before render (http / javascript / arbitrary hosts
  // via non-https). Fail closed — no <img>, same as a load error (INV-55).
  if (!isAllowedAvatarSrc(src)) return null;

  // INV-55: hidden on load error — the name displays with no avatar, no glyph,
  // no reserved box.
  if (failedSrc === src) return null;

  // `'fill'` positions the image absolutely so its intrinsic dimensions never
  // drive layout — the square, self-stretched parent slot (in AddressDisplay)
  // sizes it to the text block's height. `'circle'` is the original inline
  // round avatar sized by its own box.
  const variantClassName =
    variant === 'fill'
      ? 'absolute inset-0 h-full w-full rounded-none'
      : 'h-4 w-4 shrink-0 rounded-full';

  return (
    <img
      src={src}
      // INV-67: decorative — never omitted, and non-redundant with the visible name.
      alt={alt}
      className={cn('object-cover', sizeClassName ?? variantClassName)}
      // Name-owner-controlled URL: never leak the document referrer to the avatar host.
      referrerPolicy="no-referrer"
      // INV-55: 404 / network failure / non-image payload → hide (no broken icon).
      onError={() => setFailedSrc(src)}
    />
  );
}
