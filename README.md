# OpenZeppelin UI

A modular React component library for building blockchain transaction interfaces.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

## Packages

This monorepo contains the following packages:

| Package                                              | Description                                 | npm                                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [@openzeppelin/ui-types](./packages/types)           | Shared TypeScript type definitions          | [![npm](https://img.shields.io/npm/v/@openzeppelin/ui-types.svg)](https://www.npmjs.com/package/@openzeppelin/ui-types)           |
| [@openzeppelin/ui-utils](./packages/utils)           | Framework-agnostic utility functions        | [![npm](https://img.shields.io/npm/v/@openzeppelin/ui-utils.svg)](https://www.npmjs.com/package/@openzeppelin/ui-utils)           |
| [@openzeppelin/ui-styles](./packages/styles)         | Centralized styling system (Tailwind CSS 4) | [![npm](https://img.shields.io/npm/v/@openzeppelin/ui-styles.svg)](https://www.npmjs.com/package/@openzeppelin/ui-styles)         |
| [@openzeppelin/ui-components](./packages/components) | React UI components (shadcn/ui based)       | [![npm](https://img.shields.io/npm/v/@openzeppelin/ui-components.svg)](https://www.npmjs.com/package/@openzeppelin/ui-components) |
| [@openzeppelin/ui-renderer](./packages/renderer)     | Transaction form rendering engine           | [![npm](https://img.shields.io/npm/v/@openzeppelin/ui-renderer.svg)](https://www.npmjs.com/package/@openzeppelin/ui-renderer)     |
| [@openzeppelin/ui-react](./packages/react)           | React context providers and hooks           | [![npm](https://img.shields.io/npm/v/@openzeppelin/ui-react.svg)](https://www.npmjs.com/package/@openzeppelin/ui-react)           |
| [@openzeppelin/ui-storage](./packages/storage)       | IndexedDB storage abstraction (Dexie.js)    | [![npm](https://img.shields.io/npm/v/@openzeppelin/ui-storage.svg)](https://www.npmjs.com/package/@openzeppelin/ui-storage)       |

## Installation

Install the packages you need:

```bash
# Core types and utilities
pnpm add @openzeppelin/ui-types @openzeppelin/ui-utils

# UI components
pnpm add @openzeppelin/ui-components @openzeppelin/ui-styles

# Form rendering
pnpm add @openzeppelin/ui-renderer

# React integration
pnpm add @openzeppelin/ui-react

# Storage (optional)
pnpm add @openzeppelin/ui-storage
```

## Quick Start

### 1. Setup Styles

Import the global styles and Tailwind CSS in your app's entry CSS:

```css
@import '@openzeppelin/ui-styles/global.css';
@import 'tailwindcss';
```

### 2. Use Components

```tsx
import { useForm } from 'react-hook-form';

import { Button, TextField } from '@openzeppelin/ui-components';

function MyForm() {
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TextField name="recipient" label="Recipient Address" control={control} placeholder="0x..." />
      <Button type="submit">Send Transaction</Button>
    </form>
  );
}
```

### 3. Render Transaction Forms

```tsx
import { TransactionForm } from '@openzeppelin/ui-renderer';
import type { RenderFormSchema } from '@openzeppelin/ui-types';

const schema: RenderFormSchema = {
  id: 'transfer-form',
  title: 'Transfer Tokens',
  fields: [
    { id: 'to', name: 'to', type: 'address', label: 'Recipient' },
    { id: 'amount', name: 'amount', type: 'amount', label: 'Amount' },
  ],
  layout: { columns: 1, spacing: 'normal', labelPosition: 'top' },
  submitButton: { text: 'Transfer', loadingText: 'Transferring...' },
};

function TransferPage() {
  return (
    <TransactionForm
      schema={schema}
      adapter={myAdapter}
      networkConfig={networkConfig}
      onSubmit={handleSubmit}
    />
  );
}
```

## Architecture

| Layer | Package                       | Purpose                      |
| ----- | ----------------------------- | ---------------------------- |
| App   | Your Application              | Consumer application         |
| 6     | `@openzeppelin/ui-react`      | Context providers & hooks    |
| 5     | `@openzeppelin/ui-renderer`   | Form & contract UI rendering |
| 4     | `@openzeppelin/ui-components` | UI primitives & form fields  |
| 3     | `@openzeppelin/ui-styles`     | Tailwind theme & variables   |
| 2     | `@openzeppelin/ui-utils`      | Shared utilities             |
| 1     | `@openzeppelin/ui-types`      | Type definitions             |

## Requirements

- Node.js >= 20.19.0
- React 19
- Tailwind CSS 4

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## Local Development (Consuming Projects)

If you're developing a project that uses `@openzeppelin/ui-*` packages and want to test changes against a local checkout of this repo, run the setup script:

```bash
# From your project directory (with openzeppelin-ui as a sibling):
node ../openzeppelin-ui/scripts/setup-local-dev.mjs

# Or with a custom path:
node /path/to/openzeppelin-ui/scripts/setup-local-dev.mjs --ui-path ../my-ui-fork
```

This creates a `.pnpmfile.cjs` hook and adds convenience scripts to your `package.json`:

```bash
pnpm dev:local   # Use local UI Kit packages
pnpm dev:npm     # Switch back to npm packages
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## Documentation

- [Migration Guide](./docs/MIGRATION.md) - Migrate from `@openzeppelin/ui-builder-*` packages
- [DevOps Setup Guide](./docs/DEVOPS_SETUP.md) - CI/CD secrets and GitHub App configuration
- [Operations Runbook](./docs/RUNBOOK.md) - Release management and incident procedures

## License

[AGPL-3.0](./LICENSE)
