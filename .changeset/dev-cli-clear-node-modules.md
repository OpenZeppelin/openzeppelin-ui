---
'@openzeppelin/ui-dev-cli': patch
---

Clear root and workspace `node_modules` before `use local` / `use remote` reinstalls so pnpm always re-applies `.pnpmfile.cjs` tarball rewrites instead of short-circuiting on an existing registry lockfile.
