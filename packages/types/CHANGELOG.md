# @openzeppelin/ui-types

## 1.1.0

### Minor Changes

- [#14](https://github.com/OpenZeppelin/openzeppelin-ui/pull/14) [`779a5fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/779a5fb82ae2611fb571f8015dae7a29177c4100) Thanks [@pasevin](https://github.com/pasevin)! - Add `getTypeMappingInfo()` method to ContractAdapter interface for runtime type introspection

  New types:
  - `DynamicTypePattern`: describes pattern-based type mappings (arrays, generics, etc.)
  - `TypeMappingInfo`: contains primitives and dynamicPatterns

  This enables consuming applications to programmatically discover all adapter type capabilities at runtime.
