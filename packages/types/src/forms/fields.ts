import type { ContractAdapter } from '../adapters/base';
import type { EnumValue, MapEntry } from '../common';
import type { Ecosystem } from '../common/ecosystem';
import type { ContractSchema } from '../contracts/schema';
import type { ExecutionConfig } from '../execution';
import type { NetworkConfig } from '../networks/config';
import type { RenderFormSchema } from './schema';

/**
 * Type representing form values in a submission or form state
 */
export type FormValues = Record<string, unknown>;

/**
 * Field types supported by the renderer
 */
export type FieldType =
  | 'text'
  | 'number'
  | 'bigint' // Large integer field for values beyond JavaScript Number precision
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'textarea'
  | 'bytes' // Byte data with hex/base64 validation
  | 'code-editor' // Code editor with syntax highlighting
  | 'date'
  | 'email'
  | 'password'
  | 'blockchain-address' // Blockchain address with validation
  | 'amount' // Token amount with decimals handling
  | 'array' // Array inputs with add/remove functionality
  | 'object' // Composite/nested object inputs
  | 'array-object' // Arrays of objects
  | 'map' // Map/dictionary inputs with dynamic key-value pairs
  | 'url'
  | 'select-grouped'
  | 'enum' // Enum field with variant picker and conditional payload inputs
  | 'hidden'
  | 'file-upload' // File upload field with optional base64 conversion
  | 'runtimeSecret'; // Runtime-only secret field not sent as contract argument

/**
 * Maps field types to their expected value types
 */
export type FieldValue<T extends FieldType> = T extends
  | 'text'
  | 'email'
  | 'password'
  | 'textarea'
  | 'bytes'
  | 'code-editor'
  | 'blockchain-address'
  | 'bigint' // BigInt field stores value as string
  ? string
  : T extends 'number' | 'amount'
    ? number
    : T extends 'checkbox'
      ? boolean
      : T extends 'date'
        ? Date
        : T extends 'select' | 'radio'
          ? string
          : T extends 'enum'
            ? EnumValue
            : T extends 'array'
              ? unknown[]
              : T extends 'object'
                ? Record<string, unknown>
                : T extends 'array-object'
                  ? Record<string, unknown>[]
                  : T extends 'map'
                    ? MapEntry[]
                    : T extends 'runtimeSecret'
                      ? string // Runtime secrets are always strings (hex or similar)
                      : unknown;

/**
 * Shared condition interface for both validation and visibility rules
 */
export interface FieldCondition {
  /**
   * The field ID this condition depends on
   */
  field: string;

  /**
   * The value to compare against
   */
  value?: unknown;

  /**
   * The comparison operator to use
   */
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'matches';

  /**
   * Error message to display when validation fails
   */
  message?: string;
}

/**
 * Transform function interface for converting between UI and blockchain data formats
 */
export interface FieldTransforms<T = unknown> {
  /**
   * Function to transform data from blockchain format to UI format
   * Used when displaying values in the form
   */
  input?: (value: T) => unknown;

  /**
   * Function to transform data from UI format to blockchain format
   * Used when submitting the form
   */
  output?: (value: unknown) => T;
}

/**
 * Type for React Hook Form error objects
 */
export type FormError =
  | string
  | {
      message?: string;
      type?: string;
      [key: string]: unknown;
    };

/**
 * Props for the top-level TransactionForm component
 */
export interface TransactionFormProps {
  /**
   * The form schema to render
   */
  schema: RenderFormSchema;

  /**
   * The full contract schema containing function definitions and details
   * for the target contract on the specific blockchain.
   * Required by the adapter to format transaction data correctly.
   */
  contractSchema: ContractSchema;

  /**
   * The chain-specific adapter instance, pre-configured for a specific network.
   * It should contain the networkConfig internally.
   */
  adapter: ContractAdapter;

  /**
   * Optional flag indicating if a wallet is currently connected.
   * Used to control UI elements like the submit button.
   * If not provided, components might assume not connected or use other means if available.
   */
  isWalletConnected?: boolean;

  /**
   * Execution configuration for the transaction
   */
  executionConfig?: ExecutionConfig;

  /**
   * Optional callback when a transaction completes successfully (local `pure` execution,
   * confirmed on-chain transaction, or immediate success when the adapter has no confirmation helper).
   *
   * @param payload - Metadata for the successful execution
   * @param payload.network_id - Active network id from the adapter
   * @param payload.ecosystem - Active ecosystem from the adapter (e.g. `evm`, `stellar`)
   * @param payload.execution_method - Execution path from `executionConfig.method`, or `eoa` when unset
   * @param payload.transaction_hash - On-chain tx id or relayer job id from the adapter when available;
   *   omitted for local-only runs with no id (e.g. some `pure` paths)
   *
   * @example
   * ```tsx
   * <TransactionForm
   *   {...props}
   *   onTransactionSuccess={({ network_id, ecosystem, execution_method, transaction_hash }) => {
   *     analytics.track('tx_ok', { network_id, ecosystem, execution_method });
   *     if (transaction_hash) showToast(`Submitted: ${transaction_hash}`);
   *   }}
   * />
   * ```
   *
   * May be `async`; rejections are caught and logged by the renderer so they do not become
   * unhandled promise rejections.
   */
  onTransactionSuccess?: (payload: {
    network_id: NetworkConfig['id'];
    ecosystem: Ecosystem;
    execution_method: ExecutionConfig['method'];
    transaction_hash?: string;
  }) => void | Promise<void>;
}
