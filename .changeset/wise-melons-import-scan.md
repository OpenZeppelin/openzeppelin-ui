---
"@openzeppelin/ui-cli": patch
---

Consolidate migration import detection onto a single AST-based extractor shared by the component matcher and the pattern scanner. The pattern scanner previously parsed imports with regexes, which could match `import` text inside comments or strings (false positives) and maintained a second import-parsing implementation. Both analyzers now use the TypeScript compiler, so `oz-ui migrate analyze` and `doctor` detect static, side-effect, re-export (`export … from`), and dynamic (`import()`) module references consistently and no longer flag commented-out or quoted import text.
