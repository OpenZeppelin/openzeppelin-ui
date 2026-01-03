---
"@openzeppelin/ui-renderer": patch
---

Export `rendererConfig` from the renderer package

The `rendererConfig` object defines core and field-specific dependencies used by the export system to determine which packages to include in exported forms. This was previously only available internally but is now exported for use by the UI Builder export pipeline.
