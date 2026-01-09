---
"@openzeppelin/ui-types": minor
---

Add `getTypeMappingInfo()` method to ContractAdapter interface for runtime type introspection

New types:
- `DynamicTypePattern`: describes pattern-based type mappings (arrays, generics, etc.)
- `TypeMappingInfo`: contains primitives and dynamicPatterns

This enables consuming applications to programmatically discover all adapter type capabilities at runtime.
