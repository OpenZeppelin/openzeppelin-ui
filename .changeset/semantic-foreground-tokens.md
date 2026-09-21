---
'@openzeppelin/ui-styles': minor
---

Add `--success-foreground`, `--warning-foreground`, and `--info-foreground` so semantic fills have theme-aware contrast pairs (matching `--destructive-foreground`). Declared in `:root` and `.dark`, exposed in `@theme` / `@theme inline` as `--color-success-foreground`, `--color-warning-foreground`, and `--color-info-foreground` for Tailwind (`text-success-foreground`, `text-warning-foreground`, `text-info-foreground`). Fill tokens `--success` / `--warning` / `--info` are unchanged.
