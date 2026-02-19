import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';

import type { Ecosystem } from '@openzeppelin/ui-types';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '.';

export interface EcosystemDropdownOption {
  value: Ecosystem;
  label: string;
  enabled: boolean;
  disabledLabel?: string;
}

export interface EcosystemDropdownProps {
  options: EcosystemDropdownOption[];
  value: Ecosystem | null;
  onValueChange: (ecosystem: Ecosystem) => void;
  getEcosystemIcon?: (ecosystem: Ecosystem) => React.ReactNode;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  'aria-labelledby'?: string;
}

/** Simple dropdown selector for choosing a blockchain ecosystem. */
export function EcosystemDropdown({
  options,
  value,
  onValueChange,
  getEcosystemIcon,
  disabled = false,
  className,
  placeholder = 'Select blockchain...',
  'aria-labelledby': ariaLabelledby,
}: EcosystemDropdownProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-labelledby={ariaLabelledby}
          disabled={disabled}
          className={className ?? 'w-full justify-between'}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption ? (
              <>
                {getEcosystemIcon?.(selectedOption.value)}
                <span className="truncate">{selectedOption.label}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px]"
        align="start"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            disabled={!option.enabled}
            onSelect={() => {
              onValueChange(option.value);
              setOpen(false);
            }}
            className="gap-2"
          >
            {getEcosystemIcon?.(option.value)}
            <span className="flex-1 truncate">{option.label}</span>
            {!option.enabled && option.disabledLabel && (
              <span className="shrink-0 text-xs text-muted-foreground">{option.disabledLabel}</span>
            )}
            {value === option.value && <Check className="h-4 w-4 shrink-0 opacity-100" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
