import { MoreHorizontal } from 'lucide-react';
import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '.';

/** Single action item within an OverflowMenu dropdown. */
export interface OverflowMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

/** Props for the OverflowMenu component. */
export interface OverflowMenuProps {
  items: OverflowMenuItem[];
  /** Align dropdown relative to trigger. @default "end" */
  align?: 'start' | 'center' | 'end';
  /** Additional classes on the trigger button. */
  className?: string;
  /** Accessible label for the trigger button. @default "More actions" */
  'aria-label'?: string;
}

/** Compact "..." dropdown menu for secondary actions. */
export function OverflowMenu({
  items,
  align = 'end',
  className,
  'aria-label': ariaLabel = 'More actions',
}: OverflowMenuProps) {
  if (items.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', className)}
          aria-label={ariaLabel}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[140px]">
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {item.destructive && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={item.onSelect}
              disabled={item.disabled}
              className={cn(item.destructive && 'text-destructive focus:text-destructive')}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
