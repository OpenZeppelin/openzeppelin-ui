---
"@openzeppelin/ui-cli": patch
---

Add a stable JSON output envelope to every `oz-ui --json` payload (success and error). Each payload now ships with `schemaVersion` and `cli: { name, version }` so agent consumers (e.g. the `scaffold-dapp` and `migrate-to-oz-uikit` skills) can detect contract drift the same way they do for `migration-manifest.json`. Existing payload fields are unchanged. Internally, `oz-ui create`'s template generator was split from a single 650-line module into a `templates/` directory (per-layout modules, shared helpers, embedded asset) so new layouts and contents can be added without churning a mega-file.
