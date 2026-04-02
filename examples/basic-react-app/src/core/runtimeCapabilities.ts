import type {
  AddressingCapability,
  ComposerEcosystemRuntime,
  ContractLoadingCapability,
  ExecutionCapability,
  ExplorerCapability,
  QueryCapability,
  RelayerCapability,
  SchemaCapability,
  TransactionFormCapabilities,
  TypeMappingCapability,
} from '@openzeppelin/ui-types';

export type DemoRuntime = ComposerEcosystemRuntime;

export interface DemoCapabilities
  extends AddressingCapability,
    ExplorerCapability,
    ContractLoadingCapability,
    SchemaCapability,
    TypeMappingCapability,
    QueryCapability,
    ExecutionCapability,
    RelayerCapability {
  runtime: DemoRuntime;
}

function bindRequired<TObject extends object, TKey extends keyof TObject>(
  target: TObject,
  key: TKey
): TObject[TKey] {
  const value = target[key];
  if (typeof value !== 'function') {
    throw new TypeError(`Expected "${String(key)}" to be a function.`);
  }
  return value.bind(target) as TObject[TKey];
}

function bindOptional<TObject extends object, TKey extends keyof TObject>(
  target: TObject,
  key: TKey
): TObject[TKey] | undefined {
  const value = target[key];
  if (typeof value !== 'function') {
    return undefined;
  }
  return value.bind(target) as TObject[TKey];
}

export function toDemoCapabilities(runtime: DemoRuntime | null): DemoCapabilities | null {
  if (!runtime) {
    return null;
  }

  const { addressing, explorer, contractLoading, schema, typeMapping, query, execution, relayer } =
    runtime;

  return {
    runtime,
    networkConfig: runtime.networkConfig,
    dispose: runtime.dispose.bind(runtime),
    isValidAddress: bindRequired(addressing, 'isValidAddress'),
    getExplorerUrl: bindRequired(explorer, 'getExplorerUrl'),
    getExplorerTxUrl: bindOptional(explorer, 'getExplorerTxUrl'),
    loadContract: bindRequired(contractLoading, 'loadContract'),
    loadContractWithMetadata: bindOptional(contractLoading, 'loadContractWithMetadata'),
    getContractDefinitionInputs: bindRequired(contractLoading, 'getContractDefinitionInputs'),
    getWritableFunctions: bindRequired(schema, 'getWritableFunctions'),
    isViewFunction: bindRequired(schema, 'isViewFunction'),
    filterAutoQueryableFunctions: bindOptional(schema, 'filterAutoQueryableFunctions'),
    getFunctionDecorations: bindOptional(schema, 'getFunctionDecorations'),
    mapParameterTypeToFieldType: bindRequired(typeMapping, 'mapParameterTypeToFieldType'),
    getCompatibleFieldTypes: bindRequired(typeMapping, 'getCompatibleFieldTypes'),
    generateDefaultField: bindRequired(typeMapping, 'generateDefaultField'),
    getTypeMappingInfo: bindRequired(typeMapping, 'getTypeMappingInfo'),
    getRuntimeFieldBinding: bindOptional(typeMapping, 'getRuntimeFieldBinding'),
    queryViewFunction: bindRequired(query, 'queryViewFunction'),
    formatFunctionResult: bindRequired(query, 'formatFunctionResult'),
    getCurrentBlock: bindRequired(query, 'getCurrentBlock'),
    formatTransactionData: bindRequired(execution, 'formatTransactionData'),
    signAndBroadcast: bindRequired(execution, 'signAndBroadcast'),
    getSupportedExecutionMethods: bindRequired(execution, 'getSupportedExecutionMethods'),
    validateExecutionConfig: bindRequired(execution, 'validateExecutionConfig'),
    waitForTransactionConfirmation: bindOptional(execution, 'waitForTransactionConfirmation'),
    getRelayers: bindRequired(relayer, 'getRelayers'),
    getRelayer: bindRequired(relayer, 'getRelayer'),
    getNetworkServiceForms: bindRequired(relayer, 'getNetworkServiceForms'),
    validateNetworkServiceConfig: bindOptional(relayer, 'validateNetworkServiceConfig'),
    testNetworkServiceConnection: bindOptional(relayer, 'testNetworkServiceConnection'),
    validateRpcEndpoint: bindOptional(relayer, 'validateRpcEndpoint'),
    testRpcConnection: bindOptional(relayer, 'testRpcConnection'),
    validateExplorerConfig: bindOptional(relayer, 'validateExplorerConfig'),
    testExplorerConnection: bindOptional(relayer, 'testExplorerConnection'),
    getDefaultServiceConfig: bindRequired(relayer, 'getDefaultServiceConfig'),
  };
}

export function toTransactionFormCapabilities(
  runtime: DemoRuntime | null
): TransactionFormCapabilities | null {
  const capabilities = toDemoCapabilities(runtime);
  if (!capabilities) {
    return null;
  }

  return capabilities as TransactionFormCapabilities;
}
