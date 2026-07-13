---
"@openzeppelin/ui-cli": major
"@openzeppelin/ui-dev-cli": major
"@openzeppelin/ui-tailwind-utils": major
---

Raise the minimum supported Node.js to `>=22.13.0`.

The monorepo toolchain moved to pnpm 11, which requires Node 22+. Consumers
running these packages on Node 20 must upgrade to Node 22.13.0 or later.
