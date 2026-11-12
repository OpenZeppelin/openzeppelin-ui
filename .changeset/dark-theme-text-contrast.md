---
'@openzeppelin/ui-styles': patch
'@openzeppelin/ui-components': patch
---

The dark theme now meets WCAG AA contrast for destructive and success text.

Behaviour change: in the dark theme, `--destructive` is a lighter red (`oklch(0.704 0.191 22.216)`), so destructive text, error messages, required-field asterisks, invalid input borders and destructive `Alert` borders are bright red and readable. This includes your own elements that use this colour. The success `Alert` uses a lighter green for its text and icon in dark. The destructive `Button` and the solid danger `Badge` keep their dark red fill. If your own components put white text on `bg-destructive`, add `dark:bg-red-900` (and `dark:hover:bg-red-900/90` for a hover fill) to keep their contrast in dark. If you pass a `className` that changes the background of a destructive `Button` or solid danger `Badge`, or the text colour of a success `Alert`, add a matching `dark:` class too, or the component's dark colour wins in dark mode. Upgrade `@openzeppelin/ui-styles` and `@openzeppelin/ui-components` together: with `@openzeppelin/ui-components` 3.13.0 and earlier, the destructive `Button` and solid danger `Badge` take the lighter red in dark and their white text falls below WCAG AA contrast. Light theme colours are unchanged.
