---
"@openzeppelin/ui-components": major
"@openzeppelin/ui-react": major
"@openzeppelin/ui-renderer": major
"@openzeppelin/ui-types": major
"@openzeppelin/ui-utils": major
---

Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

BREAKING CHANGE: shared component props, helper types, and React context exports now use
narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
`FullContractAdapter` surfaces.
