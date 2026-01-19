import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { ChevronRight } from 'lucide-react';
import React, { ReactNode, useState } from 'react';

import { cn } from '@openzeppelin/ui-utils';

export interface SidebarGroupProps {
  /** Title displayed in the collapsible trigger */
  title: string;
  /** Optional icon displayed before the title */
  icon?: ReactNode;
  /** Content to render when expanded */
  children: ReactNode;
  /** Whether the group is open by default */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the trigger */
  triggerClassName?: string;
  /** Additional CSS classes for the content wrapper */
  contentClassName?: string;
}

/**
 * A collapsible group component for organizing sidebar navigation items.
 * Supports both controlled and uncontrolled modes.
 */
export function SidebarGroup({
  title,
  icon,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className,
  triggerClassName,
  contentClassName,
}: SidebarGroupProps): React.ReactElement {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <CollapsiblePrimitive.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn('w-full', className)}
    >
      <CollapsiblePrimitive.Trigger
        className={cn(
          'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold',
          'text-muted-foreground transition-colors hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          triggerClassName
        )}
      >
        <ChevronRight
          className={cn('size-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-90')}
        />
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="flex-1 text-left">{title}</span>
      </CollapsiblePrimitive.Trigger>

      <CollapsiblePrimitive.Content
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
          contentClassName
        )}
      >
        <div className="py-1 pl-4">{children}</div>
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
