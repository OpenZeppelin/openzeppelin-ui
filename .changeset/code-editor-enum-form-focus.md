---
'@openzeppelin/ui-components': patch
---

`CodeEditorField` and `EnumField`: they now pass the form's ref to their control (the code editor, the variant select, and the JSON fallback input), so a failed submit focuses the first invalid one. Behaviour change: focus now moves to an invalid `CodeEditorField` or `EnumField` on submit instead of staying on the submit button.
