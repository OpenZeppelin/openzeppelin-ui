---
'@openzeppelin/ui-components': minor
---

Add `Switch`, a toggle built on Radix Switch and themed like `Checkbox`. It exposes `role="switch"` with `aria-checked`, toggles on click and Space, and ignores input when `disabled`. Name it with a `<Label htmlFor>` or `aria-label`. Pass `readOnly` to keep it focusable and in full colour, report `aria-readonly="true"`, and ignore click, Space and Enter; its value still submits with a form, and a `required` read-only switch never blocks submission. `disabled` wins when both are set. Adds the `@radix-ui/react-switch` dependency.
