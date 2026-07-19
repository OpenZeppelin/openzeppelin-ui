/**
 * Components Exports
 */

// Main form component
export { TransactionForm } from './TransactionForm';

// Form fields
export { DynamicFormField } from './DynamicFormField';

// Transaction components
export { TransactionExecuteButton } from './transaction/TransactionExecuteButton';

// Reverse-name value feed for the base AddressDisplay (SF-4 async→sync bridge)
export {
  AddressNameResolutionProvider,
  type AddressNameResolutionProviderProps,
} from './AddressNameResolutionProvider';
export { ResolvedAddressFieldPreviewWithNameResolution } from './ResolvedAddressFieldPreviewWithNameResolution';
export type { ResolvedAddressFieldPreviewWithNameResolutionProps } from './ResolvedAddressFieldPreviewWithNameResolution';

// Address Book
export { AddressBookWidget } from './AddressBookWidget';
export {
  AliasEditPopover,
  type AliasEditPopoverProps,
  type AliasEditLookupResult,
} from './AddressBookWidget';
export { useAliasEditState, type UseAliasEditStateReturn } from './AddressBookWidget';

// Contract components
export { ContractStateWidget } from './ContractStateWidget';
export { ContractActionBar } from './ContractActionBar';

// Execution config display
export { ExecutionConfigDisplay } from './ExecutionConfigDisplay/ExecutionConfigDisplay';

// Network settings
export { NetworkSettingsDialog } from './network/NetworkSettingsDialog';

// Wallet connection with settings (composed component)
export { WalletConnectionWithSettings } from './WalletConnectionWithSettings';
