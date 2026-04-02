---
"@openzeppelin/ui-dev-cli": patch
"@openzeppelin/ui-react": patch
"@openzeppelin/ui-types": patch
---

Fix local adapter development installs by resolving first-party workspace packages that are
outside the public family package map. Derive pnpmfile family data from the canonical
`STANDARD_FAMILIES` definition instead of maintaining a hardcoded duplicate. Also formalize
partial `UiKitConfiguration` overrides in the public types and ensure wallet state initializes
adapter-managed UI kits consistently.
