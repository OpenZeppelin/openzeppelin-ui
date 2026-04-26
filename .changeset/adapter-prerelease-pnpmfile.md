---
"@openzeppelin/ui-dev-cli": minor
---

Add `allowAdapterPrereleases` hook to the generated `.pnpmfile.cjs` so consumer
apps can resolve pre-release adapter versions (e.g. `2.0.0-rc.1`) without manual
pnpmfile edits. Uses correct caret semantics for `0.x` upper bounds.
