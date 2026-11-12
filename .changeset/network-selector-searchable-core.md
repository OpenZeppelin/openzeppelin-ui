---
'@openzeppelin/ui-components': minor
---

Rebuild `NetworkSelector` on the searchable select core behind `SearchableMultiSelect`. The list now uses listbox semantics, and focus stays in the search box while the arrow keys move through the networks. Enter picks the highlighted network without submitting an enclosing form. Visible text, accessible names and emitted values are unchanged, and every existing prop works as before. "No network found." now also shows, and is announced, in ungrouped mode, where the list was blank. The popover width now follows the trigger.

New optional copy props: `searchPlaceholder`, `searchLabel` and `emptyText` in both modes, and `formatSelectedCount`, `formatSelectionSummary` and `clearAllLabel` in multiple mode.

If your tests query the open list by role, query `listbox` and `option` instead of `menu` and `menuitem`. Menu typeahead is gone: type in the search box instead.
