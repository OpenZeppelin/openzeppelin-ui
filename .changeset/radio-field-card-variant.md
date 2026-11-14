---
'@openzeppelin/ui-components': minor
---

`RadioField`: options accept an optional `description`, shown under the option label and used as the radio's accessible description (the label alone is its name). A new `variant="card"` renders them as selectable cards (the `RadioGroup` card variant). With `layout="horizontal"`, cards sit side by side in equal-width columns and stack as the container narrows.

A new `variant="segmented"` renders the options as a segmented control (the `RadioGroup` segmented variant), for two or three short options. It shows each option's `label`; descriptions are not shown.

`RadioField` also accepts `readOnlyMode="readonly"`. With `readOnly` set as well, in every variant, the options stay focusable and in full colour, no click or key changes the value, the value is still submitted, and the field is announced as read-only. Without `readOnlyMode="readonly"`, `readOnly` is ignored as before.

Validation, required state and the submitted value are the same for every variant. The card and segmented variants render no native `required` input, so an empty submit always shows the field's own required message, with or without `noValidate` on the form. Existing options render as before.
