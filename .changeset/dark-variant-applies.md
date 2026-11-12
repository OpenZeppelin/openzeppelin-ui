---
'@openzeppelin/ui-styles': patch
'@openzeppelin/ui-components': patch
---

`dark:` classes now apply in dark mode. Before, the dark variant in `global.css` never matched, so no `dark:` class took effect.

Behaviour change: in dark mode, `dark:` utilities now apply on an element with the `dark` class and on everything inside it. This includes the `dark:` classes in your own app if its Tailwind build imports `@openzeppelin/ui-styles/global.css`. In the kit, `NetworkServiceErrorBanner` now has a dark red surface with lighter text and icon instead of a light pink box, the `destructive` and `success` `Alert` borders and the `Progress` track use their dark colours, and invalid `Checkbox`, `Switch` and `Textarea` fields show a stronger red focus ring. The `NetworkServiceErrorBanner` settings button keeps the same red fill in both themes. If you upgrade `@openzeppelin/ui-styles`, upgrade `@openzeppelin/ui-components` too: in `@openzeppelin/ui-components` 3.13.0 and earlier, that button turns a lighter red in dark mode and its white label falls below WCAG AA contrast. If you pass a `className` that sets a property the component also sets with a `dark:` class, such as a border colour on a `destructive` `Alert`, the component's dark value now wins in dark mode, so add a matching `dark:` class to your override. Light mode is unchanged.
