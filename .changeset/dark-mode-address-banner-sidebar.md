---
'@openzeppelin/ui-components': patch
---

`AddressDisplay` chip, `Banner` colour variants, and `SidebarLayout` / `SidebarSection` defaults now use theme tokens so they stay readable in dark mode. Behaviour change: the AddressDisplay chip fill and text follow muted/foreground tokens instead of fixed slate greys; Banner info, success, warning and error surfaces use dark-aware container, border and text colours; SidebarLayout's default background is `bg-sidebar` (including the mobile slide-over), and SidebarSection titles use `text-muted-foreground` instead of a fixed mid-grey. Light mode shifts slightly for the AddressDisplay chip and sidebar section titles. Neutral Banner and a consumer-supplied `background` / `titleClassName` are unchanged in meaning.
