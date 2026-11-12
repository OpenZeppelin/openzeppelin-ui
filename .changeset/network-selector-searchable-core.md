---
'@openzeppelin/ui-components': minor
---

Rebuild `NetworkSelector` on the searchable select core behind `SearchableMultiSelect`. The list now uses listbox semantics, and focus stays in the search box while the arrow keys move through the networks. Enter picks the highlighted network without submitting an enclosing form. Visible text, accessible names and emitted values are unchanged, and every existing prop works as before. "No network found." now also shows, and is announced, in ungrouped mode, where the list was blank. The popover width now follows the trigger.

New optional copy props: `searchPlaceholder`, `searchLabel` and `emptyText` in both modes, and `formatSelectedCount`, `formatSelectionSummary` and `clearAllLabel` in multiple mode.

If your tests query the open list by role, query `listbox` and `option` instead of `menu` and `menuitem`. Menu typeahead is gone: type in the search box instead.

Visual and DOM changes to check if you style or test the open list:

- The separators between ecosystem groups, and below the selection row, are gone. Group headers still label each group.
- In multiple mode the selection row ("2 selected", Clear all) sits between the search box and the list and stays in place while the list scrolls; it used to scroll with the list.
- Every element in the popover carries a `data-slot` named `network-selector-*` (`network-selector-content`, `-search`, `-listbox`, `-option`, `-empty`, `-summary`, `-clear`), next to the existing `network-selector-trigger`.
