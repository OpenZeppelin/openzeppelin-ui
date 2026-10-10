---
'@openzeppelin/ui-cli': patch
---

Fix a false-positive in the component-replacement verifier where a legitimately
remaining intrinsic tag (e.g. a `<button>` produced by a Radix `asChild`
conversion) was reported as an unmigrated component. The raw-HTML check is now
AST-based and only fails when the OZ target component is not adopted in the file,
so it ignores `<button>` occurrences inside comments/strings and no longer
confuses sibling tags like `<ButtonGroup>` with `<Button>`.
