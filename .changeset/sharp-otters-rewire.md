---
"@openzeppelin/ui-cli": patch
---

Harden React entry-file patching with an AST-based transformer shared by `oz-ui add wallet` and `oz-ui migrate init`. The previous regex/brace-counting approach could corrupt entry files containing parentheses inside JSX strings, legacy `ReactDOM.render`, sync/arrow `bootstrap` functions, or `createRoot` stored in a variable. The new transformer parses the source with the TypeScript compiler, wraps only the JSX render argument (preserving any container argument), injects config initialization into an existing bootstrap (or creates one) without duplicating declarations, and bails safely without writing on unsupported shapes. `oz-ui add wallet` now reports an `entryFilePatchReason` and emits manual-wiring next steps when the entry file cannot be patched automatically.
