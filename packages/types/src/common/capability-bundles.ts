import type { AddressingCapability } from '../adapters/capabilities/addressing';
import type { ExecutionCapability } from '../adapters/capabilities/execution';
import type { ExplorerCapability } from '../adapters/capabilities/explorer';
import type { QueryCapability } from '../adapters/capabilities/query';
import type { RelayerCapability } from '../adapters/capabilities/relayer';
import type { SchemaCapability } from '../adapters/capabilities/schema';
import type { TypeMappingCapability } from '../adapters/capabilities/type-mapping';
import type { ContractSchema } from '../contracts/schema';

/**
 * Shared capability bundles for common UI seams.
 * These aliases keep capability-driven composition explicit without forcing consumers
 * to repeat the same intersections and prop fragments across components.
 */

/**
 * Capability bundle required for dynamic form field rendering.
 */
export type DynamicFormCapabilities = AddressingCapability & TypeMappingCapability;

/**
 * Shared prop fragment for dynamic form rendering surfaces.
 * `contractSchema` travels alongside the capabilities because nested field generation
 * needs schema context in addition to addressing and type-mapping behavior.
 */
export interface DynamicFormContextProps {
  addressing?: AddressingCapability;
  typeMapping?: TypeMappingCapability;
  contractSchema?: ContractSchema;
}

/**
 * Capability bundle required for contract state querying and view-function filtering.
 */
export type ContractStateCapabilities = QueryCapability & SchemaCapability;

/**
 * Shared prop fragment for components that need contract state capabilities.
 */
export interface ContractStateCapabilityProps {
  query: QueryCapability;
  schema: SchemaCapability;
}

/**
 * Capability bundle required to format transaction results and resolve explorer links.
 */
export type TransactionStatusCapabilities = QueryCapability & ExplorerCapability;

/**
 * Shared prop fragment for transaction status surfaces.
 */
export interface TransactionStatusCapabilityProps {
  query?: QueryCapability;
  explorer?: ExplorerCapability;
}

/**
 * Capability bundle required for execution-config validation and relayer metadata.
 */
export type ExecutionConfigCapabilities = ExecutionCapability & RelayerCapability;

/**
 * Shared prop fragment for execution-config surfaces.
 */
export interface ExecutionConfigCapabilityProps {
  execution?: ExecutionCapability;
  relayer?: RelayerCapability;
}
