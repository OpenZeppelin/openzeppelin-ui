/**
 * Wallet Component Sizing Utilities
 *
 * These utilities provide consistent size mappings for wallet UI components
 * across all ecosystem adapters (EVM, Stellar, Midnight, etc.).
 *
 * The mappings translate the generic WalletComponentSize ('sm' | 'default' | 'lg' | 'xl')
 * to specific Tailwind CSS classes and component props.
 */

import type { WalletComponentSize, WalletComponentVariant } from '@openzeppelin/ui-types';

// ============================================================
// Type Definitions
// ============================================================

/**
 * Size properties for wallet connect button components
 */
export interface WalletButtonSizeProps {
  /** Button component size prop */
  size: 'sm' | 'default' | 'lg';
  /** Additional Tailwind classes for fine-tuned sizing */
  className: string;
  /** Icon size class (e.g., 'size-4') */
  iconSize: string;
}

/**
 * Size properties for wallet account display components
 */
export interface WalletAccountDisplaySizeProps {
  /** Primary text size class */
  textSize: string;
  /** Secondary/subtitle text size class */
  subTextSize: string;
  /** Icon button container size class */
  iconButtonSize: string;
  /** Icon size class */
  iconSize: string;
}

/**
 * Size properties for wallet network switcher components
 */
export interface WalletNetworkSwitcherSizeProps {
  /** Select trigger className */
  triggerClassName: string;
  /** Select item className */
  itemClassName: string;
  /** Loader icon size class */
  loaderSize: string;
}

// ============================================================
// Size Mapping Functions
// ============================================================

/**
 * Maps WalletComponentSize to Button component props and styling.
 * Used for ConnectButton and similar button-based wallet components.
 *
 * @param walletSize - The wallet component size ('sm' | 'default' | 'lg' | 'xl')
 * @returns Button size props including component size, className overrides, and icon size
 *
 * @example
 * ```tsx
 * const sizeProps = getWalletButtonSizeProps(size);
 * <Button size={sizeProps.size} className={sizeProps.className}>
 *   <Icon className={sizeProps.iconSize} />
 * </Button>
 * ```
 */
export function getWalletButtonSizeProps(
  walletSize: WalletComponentSize | undefined
): WalletButtonSizeProps {
  switch (walletSize) {
    case 'sm':
      return { size: 'sm', className: 'h-7 px-2 text-[11px]', iconSize: 'size-3' };
    case 'lg':
      return { size: 'lg', className: 'h-11 px-5', iconSize: 'size-5' };
    case 'xl':
      return { size: 'lg', className: 'h-12 px-6 text-base', iconSize: 'size-5' };
    case 'default':
    default:
      return { size: 'default', className: 'h-9 px-4 text-sm', iconSize: 'size-4' };
  }
}

/**
 * Maps WalletComponentSize to AccountDisplay component styling.
 * Provides text sizes and icon button dimensions for account info display.
 *
 * @param walletSize - The wallet component size ('sm' | 'default' | 'lg' | 'xl')
 * @returns Account display size props for text, subtitle, and disconnect button
 *
 * @example
 * ```tsx
 * const sizeProps = getWalletAccountDisplaySizeProps(size);
 * <span className={sizeProps.textSize}>{address}</span>
 * <Button className={sizeProps.iconButtonSize}>
 *   <LogOut className={sizeProps.iconSize} />
 * </Button>
 * ```
 */
export function getWalletAccountDisplaySizeProps(
  walletSize: WalletComponentSize | undefined
): WalletAccountDisplaySizeProps {
  switch (walletSize) {
    case 'sm':
      return {
        textSize: 'text-[11px]',
        subTextSize: 'text-[8px]',
        iconButtonSize: 'size-5',
        iconSize: 'size-3',
      };
    case 'lg':
      return {
        textSize: 'text-base',
        subTextSize: 'text-xs',
        iconButtonSize: 'size-8',
        iconSize: 'size-4',
      };
    case 'xl':
      return {
        textSize: 'text-lg',
        subTextSize: 'text-sm',
        iconButtonSize: 'size-10',
        iconSize: 'size-5',
      };
    case 'default':
    default:
      return {
        textSize: 'text-xs',
        subTextSize: 'text-[9px]',
        iconButtonSize: 'size-6',
        iconSize: 'size-3.5',
      };
  }
}

/**
 * Maps WalletComponentSize to NetworkSwitcher component styling.
 * Provides sizing for select trigger, items, and loading indicator.
 *
 * @param walletSize - The wallet component size ('sm' | 'default' | 'lg' | 'xl')
 * @returns Network switcher size props for select components
 *
 * @example
 * ```tsx
 * const sizeProps = getWalletNetworkSwitcherSizeProps(size);
 * <SelectTrigger className={sizeProps.triggerClassName}>
 *   ...
 * </SelectTrigger>
 * <Loader2 className={sizeProps.loaderSize} />
 * ```
 */
export function getWalletNetworkSwitcherSizeProps(
  walletSize: WalletComponentSize | undefined
): WalletNetworkSwitcherSizeProps {
  switch (walletSize) {
    case 'sm':
      return {
        triggerClassName: 'h-8 text-xs px-2 min-w-[90px] max-w-[120px]',
        itemClassName: 'text-xs py-1.5',
        loaderSize: 'h-3 w-3',
      };
    case 'lg':
      return {
        triggerClassName: 'h-10 text-sm px-3 min-w-[120px] max-w-[180px]',
        itemClassName: 'text-sm py-2',
        loaderSize: 'h-4 w-4',
      };
    case 'xl':
      return {
        triggerClassName: 'h-12 text-base px-4 min-w-[140px] max-w-[200px]',
        itemClassName: 'text-base py-2.5',
        loaderSize: 'h-5 w-5',
      };
    case 'default':
    default:
      return {
        triggerClassName: 'h-9 text-sm px-3 min-w-[100px] max-w-[150px]',
        itemClassName: 'text-sm py-1.5',
        loaderSize: 'h-3.5 w-3.5',
      };
  }
}

/**
 * Maps WalletComponentVariant to NetworkSwitcher SelectTrigger styling.
 * Since Select components don't have a native variant prop like Button,
 * this maps variants to appropriate Tailwind CSS classes.
 *
 * @param variant - The wallet component variant ('default' | 'outline' | 'ghost' | 'secondary')
 * @returns CSS class string for the SelectTrigger
 *
 * @example
 * ```tsx
 * const variantClassName = getWalletNetworkSwitcherVariantClassName(variant);
 * <SelectTrigger className={cn(sizeProps.triggerClassName, variantClassName)}>
 *   ...
 * </SelectTrigger>
 * ```
 */
export function getWalletNetworkSwitcherVariantClassName(
  variant: WalletComponentVariant | undefined
): string {
  switch (variant) {
    case 'ghost':
      return 'border-transparent bg-transparent hover:bg-accent';
    case 'secondary':
      return 'border-secondary bg-secondary/10 hover:bg-secondary/20';
    case 'outline':
      return 'border-input bg-transparent hover:bg-accent';
    case 'default':
    default:
      return ''; // Use default SelectTrigger styling
  }
}
