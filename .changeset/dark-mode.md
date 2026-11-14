---
'@openzeppelin/ui-styles': patch
'@openzeppelin/ui-components': patch
---

Dark mode: `dark:` classes now apply, and destructive and success text meet WCAG AA contrast. Before, the dark variant in `global.css` never matched, so no `dark:` class took effect.

Behaviour change: in dark mode, `dark:` utilities now apply on an element with the `dark` class and on everything inside it. This includes the `dark:` classes in your own app if its Tailwind build imports `@openzeppelin/ui-styles/global.css`.

- Kit components now show their dark styles. `NetworkServiceErrorBanner` has a dark red surface with lighter text and icon instead of a light pink box, the `destructive` and `success` `Alert` borders and the `Progress` track use their dark colours, and invalid `Checkbox`, `Switch` and `Textarea` fields show a stronger red focus ring.
- `--destructive` is a lighter red in dark (`oklch(0.704 0.191 22.216)`), so destructive text, error messages, required-field asterisks, invalid input borders and destructive `Alert` borders are bright red and readable. This includes your own elements that use this colour. If your own components put white text on `bg-destructive`, add `dark:bg-red-900` (and `dark:hover:bg-red-900/90` for a hover fill) to keep their contrast in dark.
- The success `Alert` uses a lighter green for its text and icon in dark.
- The destructive `Button` and the solid danger `Badge` keep their dark red fill. The `NetworkServiceErrorBanner` settings button keeps the same red fill in both themes.
- If you pass a `className` that sets something the component also sets with a `dark:` class, the component's dark value now wins in dark mode. Examples: a border colour on a `destructive` `Alert`, the background of a destructive `Button` or solid danger `Badge`, or the text colour of a success `Alert`. Add a matching `dark:` class to your override.
- Upgrade `@openzeppelin/ui-styles` and `@openzeppelin/ui-components` together. With `@openzeppelin/ui-components` 3.13.0 and earlier, the destructive `Button`, the solid danger `Badge` and the `NetworkServiceErrorBanner` settings button turn a lighter red in dark mode, and their white text falls below WCAG AA contrast.

Light mode is unchanged.
