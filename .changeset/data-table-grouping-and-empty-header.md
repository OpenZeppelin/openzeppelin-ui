---
'@openzeppelin/ui-components': minor
---

`DataTable`: two new optional props.

- `hideHeaderWhenEmpty` hides the column header row while the empty state shows. The table keeps its accessible name, and the header, sort and selection state come back with the rows.
- `grouping` paints section rows under a single column header. Sorting, selection, pagination and virtualization still work per data row.
