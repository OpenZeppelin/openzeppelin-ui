# @openzeppelin/ui-styles

Centralized styling system for the OpenZeppelin UI ecosystem.

[![npm version](https://img.shields.io/npm/v/@openzeppelin/ui-styles.svg)](https://www.npmjs.com/package/@openzeppelin/ui-styles)

## Installation

```bash
# Using npm
npm install @openzeppelin/ui-styles

# Using yarn
yarn add @openzeppelin/ui-styles

# Using pnpm
pnpm add @openzeppelin/ui-styles
```

## Overview

This package contains the centralized styling system for the OpenZeppelin UI monorepo. It uses Tailwind CSS 4.0 with OKLCH colors and follows the new-york style from shadcn/ui.

## Package Structure

```text
styles/
├── src/                        # Source stylesheets and utilities
├── global.css                  # Main CSS file with theme variables and base styles
├── variables.css               # CSS custom properties
├── base.css                    # Base styles
├── package.json
├── tsconfig.json
└── README.md
```

## Key Files

- `global.css` - Main CSS file with theme variables and base styles that's shared across all packages.
- `src/utils/` - Utility CSS files and styling functions (if any).

## Styling Approach

This monorepo utilizes a consistent styling approach driven by the consuming application:

1. **Centralized Theme:** This `@openzeppelin/ui-styles` package provides the single source of truth for theme variables (colors, spacing, radius) and base styles in `global.css`.
2. **Consumer-Driven Build:** The main application or exported applications are responsible for the Tailwind CSS build process.
3. **Automatic Content Scanning:** Tailwind v4 automatically scans the source code of the application _and its dependencies_ (like `@openzeppelin/ui-components` and `@openzeppelin/ui-renderer`) for utility class usage.
4. **CSS Generation:** The consumer app's build generates the final CSS file, including base styles from `global.css`, theme variables, and all necessary utility classes.

**Key Point:** Library packages like `ui-renderer` and `ui-components` do **not** build or ship their own CSS. Styling is entirely managed by the final application build.

## Features

- **Tailwind CSS 4.0**: Using the latest Tailwind features including native cascade layers and OKLCH colors
- **Direct OKLCH color values**: Variables use OKLCH values directly without nested references for simplicity
- **Unified theming**: Consistent design tokens across all packages
- **Dark mode support**: Built-in dark mode with proper variable handling
- **Shadcn/ui integration**: Configured for the new-york style

## CSS Variables

The system uses CSS variables for all theme colors and properties. These variables are defined directly with OKLCH values:

```css
:root {
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  /* ... other variables */
}
```

## Usage

Import the global styles in your application's entry CSS file:

```css
@import '@openzeppelin/ui-styles/global.css';
@import 'tailwindcss';
```

## Form Component Spacing

Form components follow our design system with consistent spacing:

- `flex flex-col gap-2` - Used for form fields to create proper spacing between label and input
- `space-y-4` - Used for spacing between form fields in a group
- `space-y-6` - Used for spacing between form sections

## Development

```bash
# Format CSS files
pnpm format

# Check formatting
pnpm format:check
```

## License

[AGPL-3.0](https://github.com/OpenZeppelin/openzeppelin-ui/blob/main/LICENSE)
