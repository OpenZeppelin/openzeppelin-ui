# @openzeppelin/ui-components

Shared React UI components for the OpenZeppelin UI ecosystem.

[![npm version](https://img.shields.io/npm/v/@openzeppelin/ui-components.svg)](https://www.npmjs.com/package/@openzeppelin/ui-components)

## Installation

```bash
# Using npm
npm install @openzeppelin/ui-components

# Using yarn
yarn add @openzeppelin/ui-components

# Using pnpm
pnpm add @openzeppelin/ui-components
```

## Peer Dependencies

This package requires React 19:

```bash
pnpm add react react-dom
```

## Overview

This package provides a comprehensive set of shared React UI components. It serves as the central library for all common UI elements, including basic primitives, form field components, and their associated utilities.

All components are built with React, TypeScript, and styled with Tailwind CSS, following the shadcn/ui patterns and design principles.

## Key Component Categories

### Basic UI Primitives

- `Button`, `LoadingButton` - Action buttons with variants
- `Input`, `Textarea` - Text input components
- `Label` - Form labels
- `Card` (and its parts) - Container components
- `Dialog` (and its parts) - Modal dialogs
- `Alert` (and its parts) - Alert messages
- `Checkbox`, `RadioGroup` - Selection inputs
- `Select` (and its parts) - Dropdown selects
- `Progress` - Progress indicators
- `Tabs` - Tab navigation
- `Tooltip` - Hover tooltips

### Field Components

Specialized components designed for use within `react-hook-form`:

- `AddressField` - Blockchain address input with validation
- `AmountField` - Token amount input
- `BaseField` - Foundational component for creating new field types
- `BooleanField` - Checkbox/toggle inputs
- `NumberField` - Numeric inputs
- `RadioField` - Radio button groups
- `SelectField` - Dropdown selections
- `SelectGroupedField` - Grouped dropdown selections
- `TextAreaField` - Multi-line text inputs
- `TextField` - Single-line text inputs

### Field Utilities

Helper functions for validation, accessibility, and layout within field components.

### ENS Name Resolution

See the [ENS address input integration guide](../../docs/ens-address-input/README.md) for wiring `NameResolverProvider`, inline name resolution in `AddressField`, reverse-ENS display via `AddressNameProvider`, and the shared suggestion dropdown primitives.

### Address Label & Suggestion Contexts

Context providers for automatic address label resolution and autocomplete suggestions:

- `AddressLabelProvider` / `AddressLabelContext` — When mounted, all `AddressDisplay` instances in the subtree auto-resolve human-readable labels via a `resolveLabel` function
- `AddressSuggestionProvider` / `AddressSuggestionContext` — When mounted, all `AddressField` instances in the subtree show autocomplete suggestions via a `resolveSuggestions` function
- `useAddressLabel(address, networkId?)` — Convenience hook to resolve a label from the nearest `AddressLabelProvider`

### Additional UI Components

- `OverflowMenu` — Compact "..." dropdown for secondary actions with support for icons, destructive styling, and disabled state
- `NetworkSelector` — Searchable network dropdown with optional multi-select mode (`multiple={true}`)
- `AddressDisplay` — Enhanced with optional `label`, `onLabelEdit`, and `disableLabel` props for context-driven alias display

### Styling Utilities

Such as `buttonVariants` for `class-variance-authority`.

## Usage

Components and utilities can be imported directly from this package:

```tsx
import { Control, useForm } from 'react-hook-form';

import { Button, TextField, type TextFieldProps } from '@openzeppelin/ui-components';

interface MyFormData {
  name: string;
}

function MyCustomForm() {
  const { control } = useForm<MyFormData>();

  return (
    <form className="space-y-4">
      <TextField
        id="name"
        name="name"
        label="Full Name"
        control={control as Control<FieldValues>}
        placeholder="Enter your full name"
      />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

## Package Structure

```text
components/
├── src/
│   ├── components/
│   │   ├── ui/                # Basic UI primitives
│   │   └── fields/            # Specialized form field components
│   ├── hooks/                 # Shared UI hooks
│   ├── lib/                   # Utility functions and configurations
│   └── index.ts               # Main package exports
├── package.json
├── tsconfig.json
├── tsdown.config.ts
├── vitest.config.ts
└── README.md
```

## Styling

Components are styled using Tailwind CSS. The necessary Tailwind configuration is expected to be present in the consuming application. The UI package itself does not bundle CSS but provides the class names and structure.

Important: a bare Tailwind import is not enough for OpenZeppelin packages. Tailwind v4 must be told to scan the relevant `@openzeppelin/*` sources, or some component classes will be omitted from the final CSS.

For consumer apps that use `@openzeppelin/ui-dev-cli`, the recommended workflow is:

```bash
pnpm exec oz-ui-dev tailwind doctor --project "$PWD"
pnpm exec oz-ui-dev tailwind fix --project "$PWD"
```

That creates a managed `oz-tailwind.generated.css` file and keeps the `@source` wiring in sync with your installed dependencies.

If you need to configure Tailwind manually, import the shared styles and register the OpenZeppelin package sources explicitly:

```css
@layer base, components, utilities;

@import 'tailwindcss' source(none);
@source "../node_modules/@openzeppelin/ui-components";
@source "../node_modules/@openzeppelin/ui-react";
@source "../node_modules/@openzeppelin/ui-renderer";
@source "../node_modules/@openzeppelin/ui-styles";
@source "../node_modules/@openzeppelin/ui-utils";
@import '@openzeppelin/ui-styles/global.css';
```

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

## License

[AGPL-3.0](https://github.com/OpenZeppelin/openzeppelin-ui/blob/main/LICENSE)
