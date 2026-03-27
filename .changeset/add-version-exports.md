---
'@openzeppelin/ui-components': minor
'@openzeppelin/ui-react': minor
'@openzeppelin/ui-types': minor
'@openzeppelin/ui-utils': minor
---

Add VERSION export to all public packages for runtime peer compatibility validation. Each package now exports a `VERSION` constant that reflects the package version at build time, enabling consuming libraries (such as adapters) to verify compatible versions are installed and throw actionable errors on mismatch.
