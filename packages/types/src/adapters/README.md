# Adapter Capabilities & Runtime Types

This directory defines the capability-based adapter contract used by the OpenZeppelin UI ecosystem.
Adapter packages stay chain-specific, while applications and shared UI packages consume the chain-agnostic
types declared here.

## Architecture

The legacy monolithic `ContractAdapter` surface has been replaced by three layers:

1. **Capabilities**: Small interfaces for focused behavior such as addressing, query, execution, wallet, or access control.
2. **Profile runtimes**: Pre-composed bundles of capabilities returned by `createRuntime(profile, networkConfig, options)`.
3. **Ecosystem exports**: Self-describing adapter entry points that publish metadata, networks, capability factories, and runtime factories.

## Capability Tiers

### Tier 1: Declarative / lightweight

- `AddressingCapability`
- `ExplorerCapability`
- `NetworkCatalogCapability`
- `UiLabelsCapability`

These are intended to be side-effect free and safe to import independently.

### Tier 2: Network-aware, no wallet required

- `ContractLoadingCapability`
- `SchemaCapability`
- `TypeMappingCapability`
- `QueryCapability`

These extend `RuntimeCapability`, which provides `readonly networkConfig` and a `dispose()` lifecycle hook.

### Tier 3: Stateful / runtime-bound

- `ExecutionCapability`
- `WalletCapability`
- `UiKitCapability`
- `RelayerCapability`
- `AccessControlCapability`

These also extend `RuntimeCapability` and participate in runtime lifecycle management.

## Runtimes & Profiles

Adapters expose five standard profile names:

- `declarative`
- `viewer`
- `transactor`
- `composer`
- `operator`

Calling `ecosystemDefinition.createRuntime(profile, networkConfig, options)` returns an `EcosystemRuntime`.
Capabilities created inside the same runtime share runtime-scoped state; standalone capability factories remain isolated.

## EcosystemExport

`EcosystemExport` is the public adapter module contract. It includes:

- Ecosystem metadata
- Supported network definitions
- `capabilities: CapabilityFactoryMap`
- `createRuntime(...)`
- Optional build-time hooks such as `getExportBootstrapFiles(...)`

Adapters with partial capability support may leave unsupported capabilities as `undefined` in the factory map.

## Adapter Author Guidance

When implementing a new adapter package:

1. Define capability factories under `src/capabilities/`.
2. Expose profile factories and `createRuntime(...)` under `src/profiles/`.
3. Export an `ecosystemDefinition` object that satisfies `EcosystemExport`.
4. Keep chain-specific logic inside the adapter package; shared UI packages should only see these interfaces.

For the concrete package/layout conventions, see the adapter repo's
`docs/ADAPTER_ARCHITECTURE.md`.