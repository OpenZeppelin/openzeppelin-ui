---
'@openzeppelin/ui-components': minor
---

`AddressField`: new optional `inputEnd` renders an element inside the end of the input, such as a paste or address-book button. The input reserves end padding equal to the element's width, so typed text never runs under it. It is separate from `announcerEndSlot`, which sits below the input. Without `inputEnd` the field renders as before.
