---
"@openzeppelin/ui-dev-cli": patch
---

Fix `use local` to rebuild internal workspace dependencies before packing

The build step now uses pnpm's `<package>...` filter syntax to include
transitive workspace dependencies. This ensures internal packages like
`@openzeppelin/adapter-evm-core` are rebuilt before their consumers are
bundled and packed, so source changes are always reflected in local dev.
