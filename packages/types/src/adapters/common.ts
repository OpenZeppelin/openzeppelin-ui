import { type FieldType } from '../forms';
import type { FormFieldType } from '../forms/form-field';

/**
 * Shared adapter primitives (connectors, network service forms, type-mapping metadata).
 *
 * Capability interfaces compose these types; the monolithic `ContractAdapter` has been removed
 * in favor of composable capability interfaces under `adapters/capabilities/`.
 */

/**
 * Base-unit decimal token/share quantity, expressed as a string.
 *
 * Chain-agnostic capability interfaces never expose native numeric types (e.g. `bigint`);
 * every amount crosses the boundary as a non-negative, base-unit decimal `string`
 * (no decimal point, no sign, no scientific notation). Adapters convert to/from the
 * native representation internally and reject malformed input with `InvalidAmount`.
 *
 * @example '1000000000000000000' // 1 token at 18 decimals
 */
export type Amount = string;

/**
 * Information about a dynamic type pattern supported by an adapter.
 * Dynamic patterns are types that require pattern matching rather than exact lookup,
 * such as arrays, generics, and composite types.
 */
export interface DynamicTypePattern {
  /**
   * Pattern identifier/name (e.g., 'array', 'option', 'tuple', 'map')
   */
  name: string;

  /**
   * Human-readable syntax example (e.g., 'T[]', 'Option<T>', 'Map<K,V>')
   */
  syntax: string;

  /**
   * The FieldType this pattern maps to.
   * - A specific FieldType string if the pattern always maps to that type
   * - 'unwrap' if the pattern resolves to its inner type (e.g., Option<T> → T's field type)
   * - null if the mapping depends on the inner type (e.g., Vec<Primitive> → array, Vec<Complex> → array-object)
   */
  mapsTo: FieldType | 'unwrap' | null;

  /**
   * Brief description of how this pattern is handled
   */
  description: string;
}

/**
 * Complete type mapping information for an adapter.
 * This provides full visibility into both primitive and dynamic type support.
 */
export interface TypeMappingInfo {
  /**
   * Primitive types with direct mappings to field types.
   * Keys are blockchain type names (e.g., 'address', 'uint256', 'U128'),
   * values are the default FieldType for each.
   */
  primitives: Record<string, FieldType>;

  /**
   * Dynamic type patterns that the adapter recognizes.
   * These patterns are handled through pattern matching rather than exact lookup.
   */
  dynamicPatterns: DynamicTypePattern[];
}

export type ExecutionMethodType = 'eoa' | 'relayer' | 'multisig';

export interface ExecutionMethodDetail {
  type: ExecutionMethodType;
  name: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Represents a wallet connector option available for connection.
 */
export type Connector = {
  id: string;
  name: string;
};

/**
 * Base wallet connection status interface with universal properties.
 * Chain-specific adapters should extend this interface with their specific fields.
 */
export interface WalletConnectionStatus {
  /** Core connection state - always present for backward compatibility */
  isConnected: boolean;
  /** Wallet address - always present when connected */
  address?: string;
  /** Chain/network ID - format may vary by chain (number for EVM, string for others) */
  chainId?: string | number;

  /** Enhanced connection states for better UX */
  isConnecting?: boolean;
  isDisconnected?: boolean;
  isReconnecting?: boolean;
  /** Detailed status string */
  status?: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

  /** Connector/wallet information - universal across all chains */
  connector?: {
    id: string;
    name?: string;
    type?: string;
  };
}

/**
 * Adapter-declared networking configuration form.
 * Rendered by the application using DynamicFormField components.
 */
export interface NetworkServiceForm {
  /** Stable identifier for the service (e.g., 'rpc', 'explorer', 'indexer') */
  id: string;
  /** User-facing label for tabs/sections */
  label: string;
  /** Optional description shown above the form */
  description?: string;
  /** Whether this service supports connection testing via testNetworkServiceConnection */
  supportsConnectionTest?: boolean;
  /** Form schema fields using the standard FormFieldType */
  fields: FormFieldType[];
  /** When set, this form is only visible if the named feature flag is enabled via AppConfigService. */
  requiredFeature?: string;
}

/**
 * Configuration for an adapter-driven dynamic property input in the Customize step.
 * When provided via getRuntimeFieldBinding().propertyNameInput, the builder renders
 * a TextField control and persists the value under field.adapterBinding.metadata[metadataKey].
 */
export interface RuntimeSecretPropertyInput {
  /** Metadata key to persist the value under field.adapterBinding.metadata */
  metadataKey: string;
  /** Optional label override for the input */
  label?: string;
  /** Optional helper text to display below the input */
  helperText?: string;
  /** Optional placeholder text */
  placeholder?: string;
  /**
   * Optional default value to seed when the field is auto-added.
   * If metadata[metadataKey] already has a value, that value takes precedence.
   */
  defaultValue?: string;
  /** Whether to render the control (default: true when metadataKey provided) */
  visible?: boolean;
}
