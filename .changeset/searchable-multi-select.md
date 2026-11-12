---
'@openzeppelin/ui-components': minor
---

Add `SearchableMultiSelect`, a searchable multi-select for any item type. You supply item id and label accessors, an optional filter and controlled `selectedIds`. Every user-facing string can be overridden: placeholder, search placeholder and label, empty text, selected-count and summary text, and Clear all. It uses combobox and listbox semantics with `aria-activedescendant`, so focus stays in the search box while the arrow keys move through the list. Enter toggles the highlighted item without submitting an enclosing form. New picks are appended to the emitted id list and deselected ids are removed in place. The trigger accepts `ref`, `id`, `disabled`, `onBlur` and the usual `aria-*` attributes for use in form fields, and `onOpenChange` reports when the list opens and closes. In the dark theme, unselected checkbox borders and the highlighted option meet WCAG AA non-text contrast.
