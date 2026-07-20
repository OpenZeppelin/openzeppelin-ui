---
'@openzeppelin/ui-components': patch
---

fix(components): keep the AddressListField entry-mode toggle flush to the input in both single and bulk modes

The toggle now sits as an attached tab on the input/textarea bottom-right corner (inset from the rounded corner) and no longer shifts when the resolution announcer or bulk preview text appears, nor overlaps the action button when the field is empty. Adds `announcerEndSlot` to `AddressField` and `helperEndSlot` to `TextAreaField` to pin trailing content beside the announcer/helper row, and lifts the input above the toggle so the focus ring is not covered.
