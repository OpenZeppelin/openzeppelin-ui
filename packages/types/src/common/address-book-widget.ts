/**
 * Address Book Widget Types
 *
 * Shared contract between `AddressBookWidget` (ui-renderer, L6) and
 * `useAddressBookWidgetProps` (ui-storage, L7). Both packages import
 * these types from ui-types (L1) so neither depends on the other.
 *
 * This follows the same shared-type pattern used by `AddressLabelResolver`.
 */

import type { AddressingCapability } from '../adapters/capabilities/addressing';
import type { NetworkConfig } from '../networks/config';

/**
 * A single alias record as consumed by the Address Book widget.
 *
 * Intentionally a plain data shape (no storage-specific fields) so the
 * widget stays storage-agnostic.
 */
export interface AddressBookAlias {
  id: string;
  address: string;
  alias: string;
  networkId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Props accepted by `AddressBookWidget` in `@openzeppelin/ui-renderer`.
 *
 * All data and mutations are provided via props (dependency injection),
 * keeping the widget free of storage dependencies. The bridge hook
 * `useAddressBookWidgetProps` in `@openzeppelin/ui-storage` returns this
 * exact shape, ready to spread:
 *
 * @example
 * ```tsx
 * const widgetProps = useAddressBookWidgetProps(db, { networkId });
 * <AddressBookWidget {...widgetProps} />
 * ```
 */
export interface AddressBookWidgetProps {
  /** All alias records — `undefined` while the initial load is in progress */
  aliases: AddressBookAlias[] | undefined;

  /** `true` during the initial data load */
  isLoading: boolean;

  /** Create or update an alias. Returns the record ID. */
  onSave: (input: { address: string; alias: string; networkId?: string }) => Promise<string>;

  /** Remove an alias by ID */
  onRemove: (id: string) => Promise<void>;

  /** Clear all aliases */
  onClear: () => Promise<void>;

  /** Export aliases as a downloadable JSON file */
  onExport: (ids?: string[]) => Promise<void>;

  /** Import aliases from a user-selected File */
  onImport: (file: File) => Promise<string[]>;

  /** Current network ID for scoping display */
  currentNetworkId?: string;

  /** Resolve a network ID to its full config (for network badge display) */
  resolveNetwork?: (networkId: string) => NetworkConfig | undefined;

  /** Resolve a full explorer URL for an address (ecosystem-aware) */
  resolveExplorerUrl?: (address: string, networkId?: string) => string | undefined;

  /** Addressing capability for chain-specific validation (used as default when no network selected) */
  addressing?: AddressingCapability;

  /** Resolve addressing capability for a given network (enables validation when user changes network) */
  resolveAddressing?: (network: NetworkConfig) => Promise<AddressingCapability | undefined>;

  /** Ecosystem-aware address placeholder (used as default when no network selected) */
  addressPlaceholder?: string;

  /** Resolve an address placeholder for a given network (e.g. "0x..." for EVM, "G..." for Stellar) */
  resolveAddressPlaceholder?: (network: NetworkConfig) => string | undefined;

  /** All available networks (enables network selection and filtering) */
  networks?: NetworkConfig[];

  /** Currently active network filter (multi-select) — empty means show all */
  filterNetworkIds?: string[];

  /** Callback when the user changes the network filter selection */
  onFilterNetworkIdsChange?: (networkIds: string[]) => void;

  /** Custom title displayed in the card header (defaults to "Address Book") */
  title?: string;

  /** Additional CSS classes */
  className?: string;

  /**
   * Opt into ENS (name) resolution in the Add-Alias dialog. Default `false`.
   *
   * When `true`, the dialog's address input becomes ENS-aware (the base
   * `AddressField` with a name-resolution seam injected): a typed name resolves
   * inline to its hex, submit is gated until resolved, and the resolved name
   * auto-suggests the alias.
   *
   * Wire an ambient `WalletStateProvider` so the seam can resolve; without one the
   * input degrades to a visible unsupported-network gate (submit stays blocked)
   * rather than resolving. Left `false`, the widget behaves exactly as today (base
   * `AddressField`, no resolution, no provider needed) — a strictly
   * backward-compatible default.
   */
  readonly enableNameResolution?: boolean;
}
