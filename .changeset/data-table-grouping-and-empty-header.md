---
'@openzeppelin/ui-components': minor
---

`DataTable`: two new optional props.

- `hideHeaderWhenEmpty` hides the column header row while the empty state shows. The table keeps its accessible name, and the header, sort and selection state come back with the rows.
- `grouping` paints section rows under a single column header. Sorting, selection, pagination and virtualization still work per data row. Grouping is worked out again on every render, so a group key that changes shows straight away: `getGroupKey` runs once per row per render and should be a cheap field read. Section rows have a heavier fill and small semibold muted text, so they read as headings rather than data rows. `grouping.groupRowClassName` adds your classes to every section row, after the default ones, so a `bg-*` class replaces the default fill.
