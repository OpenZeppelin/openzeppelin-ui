---
'@openzeppelin/ui-cli': patch
'@openzeppelin/ui-components': patch
'@openzeppelin/ui-dev-cli': patch
'@openzeppelin/ui-react': patch
'@openzeppelin/ui-renderer': patch
'@openzeppelin/ui-storage': patch
'@openzeppelin/ui-styles': patch
'@openzeppelin/ui-tailwind-utils': patch
'@openzeppelin/ui-types': patch
'@openzeppelin/ui-utils': patch
---

Ship the AGPL-3.0 licence text inside each published package.

The repository has a root `LICENSE`, but npm does not walk up to the repository root
when packing, and these packages declare narrow `files` arrays (`dist`,
`README.md`). So every published tarball carried an AGPL-3.0 declaration in its
`package.json` with no accompanying licence text — confirmed with
`npm pack --dry-run`, which listed no `LICENSE` entry.

Each published package now has its own copy, which npm includes automatically.
