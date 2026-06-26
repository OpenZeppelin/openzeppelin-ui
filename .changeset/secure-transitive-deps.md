---
"@openzeppelin/ui-components": patch
"@openzeppelin/ui-react": patch
"@openzeppelin/ui-renderer": patch
"@openzeppelin/ui-storage": patch
"@openzeppelin/ui-utils": patch
"@openzeppelin/ui-cli": patch
"@openzeppelin/ui-dev-cli": patch
---

chore(deps): resolve Dependabot security alerts for transitive dependencies

Update the workspace `pnpm` overrides so vulnerable transitive dependencies resolve to patched versions:

- `protobufjs` &rarr; `^7.6.3` (was pinned to `^7.5.5`, still allowed `7.6.x` advisories)
- `ws` &rarr; `^8.21.0` for the v8 line and `^7.5.11` for the v7 line (was `^8.20.1`)
- `hono` &rarr; `^4.12.25`
- `form-data` &rarr; `^4.0.6` (CRLF injection)
- `ua-parser-js` &rarr; `^2.0.10` (ReDoS)
- `js-yaml` (v4) &rarr; `^4.2.0` (quadratic-complexity DoS)
- `uuid` &rarr; `^11.1.1` (missing buffer bounds check)
- `esbuild` &rarr; `^0.28.1` (dev-server arbitrary file read)
- `@babel/core` &rarr; `^7.29.6` (arbitrary file read via `sourceMappingURL`)

`elliptic` (`<= 6.6.1`) has no published fix and remains; it is a low-severity advisory with no upstream patch available.

These overrides only affect dependency resolution within this monorepo's lockfile and do not change the published packages' declared dependency ranges.
