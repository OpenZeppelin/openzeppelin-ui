---
"@openzeppelin/ui-cli": patch
---

Migrate the deterministic component rewriter (`oz-ui migrate execute`) from regex/brace-counting to an AST-based implementation built on the TypeScript compiler. Import swaps, JSX tag renames, prop renames, and the radix namespace-member transforms (unwrap / omit / close-as-child / rename) now operate on the parsed syntax tree and edit via offset splices, so they no longer corrupt files with aliased or multiline imports, JSX attribute values containing `>` or parentheses, or tags whose names are prefixes of one another. The rewriter is also now a no-op when no legacy import references the source component, instead of injecting an unused OpenZeppelin import.
