---
'@openzeppelin/ui-components': minor
---

Add `SearchableMultiSelect`, a searchable multi-select for any item type. You supply item id and label accessors, an optional filter and controlled `selectedIds`. Every user-facing string can be overridden: placeholder, search placeholder and label, empty text, selected-count and summary text, and Clear all. The trigger is a button that opens a dialog. Inside it, the search box is a combobox driving a multiselectable listbox through `aria-activedescendant`, so focus stays in the search box while the arrow keys move through the list. Enter toggles the highlighted item without submitting an enclosing form. New picks are appended to the emitted id list and deselected ids are removed in place. The trigger accepts `ref`, `id`, `disabled`, `readOnly`, `onBlur` and the usual `aria-*` attributes for use in form fields, and `onOpenChange` reports when the list opens and closes. In the dark theme, unselected checkbox borders and the highlighted option meet WCAG AA non-text contrast.

- Naming: `aria-labelledby` or `aria-label` names the trigger, the dialog and the listbox. The trigger reads the label followed by its own text, for example "Countries 2 selected". Without either, the trigger is named by its text and the dialog and listbox by the placeholder.
- `aria-required`: a button cannot carry it, so the trigger gets a hidden "Required" text in its description instead.
- `readOnly`: the trigger stays enabled and focusable, the dialog does not open (an open one closes), and the trigger gets the kit's read-only look and a hidden "Read-only" text in its description.
