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

Import the shared styles from `@openzeppelin/ui-styles`:

```css
@import '@openzeppelin/ui-styles/global.css';
@import 'tailwindcss';
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
