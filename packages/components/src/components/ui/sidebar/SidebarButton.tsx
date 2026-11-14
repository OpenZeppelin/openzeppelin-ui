import React, { ReactNode } from 'react';

import { cn } from '@openzeppelin/ui-utils';

export interface SidebarButtonProps {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  size?: 'default' | 'small';
  badge?: string;
  /**
   * Arbitrary element (status dot, small chip) rendered at the end of the row, after the badge.
   * It contributes to the accessible name only through its own text or label.
   */
  trailing?: ReactNode;
  disabled?: boolean;
  isSelected?: boolean;
  /** When provided, renders as an anchor element instead of a button */
  href?: string;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
  className?: string;
}

/**
 * A styled button component for sidebar actions with consistent styling.
 * Can render as a button or anchor element depending on whether href is provided.
 * The label area shrinks so a long label never pushes the badge or trailing slot onto a second
 * line. A string label truncates with an ellipsis; any other node shrinks but is not clipped for
 * you, so apply `truncate` or `min-w-0` inside it if it should. A string `badge` stays on one
 * line (`shrink-0 whitespace-nowrap`) and may overflow a narrow sidebar rather than wrap.
 */
export function SidebarButton({
  icon,
  children,
  onClick,
  size = 'default',
  badge,
  trailing,
  disabled = false,
  isSelected = false,
  href,
  target,
  rel,
  className,
}: SidebarButtonProps): React.ReactElement {
  const minHeight = size === 'small' ? 'min-h-10' : 'min-h-11';

  const commonClass = cn(
    'group relative flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-colors',
    badge || trailing ? 'justify-between' : 'justify-start',
    disabled
      ? 'text-muted-foreground/60 cursor-not-allowed'
      : isSelected
        ? 'text-selected bg-selected/10'
        : 'text-muted-foreground hover:text-foreground cursor-pointer hover:before:content-[""] hover:before:absolute hover:before:inset-x-0 hover:before:top-1 hover:before:bottom-1 hover:before:bg-muted/80 hover:before:rounded-lg hover:before:-z-10',
    minHeight,
    className
  );

  // Only the selected, enabled item is the current page; omitted otherwise.
  const currentPage = isSelected && !disabled ? 'page' : undefined;

  const hasTrailing = trailing != null && trailing !== false;
  // shrink-0 + nowrap keep short codes (e.g. DEMO-CHK) on one line; the label truncates first.
  // A badge longer than the sidebar may overflow rather than wrap.
  const badgeElement = badge ? (
    <span className="shrink-0 whitespace-nowrap text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-medium">
      {badge}
    </span>
  ) : null;

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        {typeof children === 'string' ? <span className="truncate">{children}</span> : children}
      </div>
      {badge && hasTrailing ? (
        // One end group: an auto margin on the trailing slot alone would take the free space
        // and leave the badge right after the label.
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {badgeElement}
          <span className="flex shrink-0 items-center">{trailing}</span>
        </span>
      ) : (
        <>
          {badgeElement}
          {hasTrailing && <span className="ml-auto flex shrink-0 items-center">{trailing}</span>}
        </>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={commonClass}
        onClick={onClick}
        aria-current={currentPage}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={commonClass}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-current={currentPage}
    >
      {content}
    </button>
  );
}
