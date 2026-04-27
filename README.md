# OpenZeppelin UI

A modular React component library for building blockchain transaction interfaces.

[OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/OpenZeppelin/openzeppelin-ui)
[Scorecard supply-chain security](https://github.com/OpenZeppelin/openzeppelin-ui/actions/workflows/scorecard.yml)
[OpenSSF Best Practices](https://www.bestpractices.dev/projects/11780)
[CLA Assistant](https://github.com/OpenZeppelin/openzeppelin-ui/actions/workflows/cla.yml)
[License: AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0)

## Packages

This monorepo contains the following packages:


| Package                                              | Description                                           | npm                                                              |
| ---------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| [@openzeppelin/ui-types](./packages/types)           | Shared TypeScript type definitions                    | [npm](https://www.npmjs.com/package/@openzeppelin/ui-types)      |
| [@openzeppelin/ui-utils](./packages/utils)           | Framework-agnostic utility functions                  | [npm](https://www.npmjs.com/package/@openzeppelin/ui-utils)      |
| [@openzeppelin/ui-styles](./packages/styles)         | Centralized styling system (Tailwind CSS 4)           | [npm](https://www.npmjs.com/package/@openzeppelin/ui-styles)     |
| [@openzeppelin/ui-components](./packages/components) | React UI components (shadcn/ui based)                 | [npm](https://www.npmjs.com/package/@openzeppelin/ui-components) |
| [@openzeppelin/ui-renderer](./packages/renderer)     | Transaction form rendering engine                     | [npm](https://www.npmjs.com/package/@openzeppelin/ui-renderer)   |
| [@openzeppelin/ui-react](./packages/react)           | React context providers and hooks                     | [npm](https://www.npmjs.com/package/@openzeppelin/ui-react)      |
| [@openzeppelin/ui-storage](./packages/storage)       | IndexedDB storage abstraction (Dexie.js)              | [npm](https://www.npmjs.com/package/@openzeppelin/ui-storage)    |
| [@openzeppelin/ui-cli](./packages/cli)               | CLI for new and existing OpenZeppelin UI applications | [npm](https://www.npmjs.com/package/@openzeppelin/ui-cli)        |


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

Import the generated Tailwind wiring in your app's entry CSS. For new or existing consumer apps, the recommended path is to let `oz-ui-dev tailwind fix` create and maintain the managed file for you:

```bash
pnpm add -D @openzeppelin/ui-dev-cli
pnpm exec oz-ui-dev tailwind doctor --project "$PWD"
pnpm exec oz-ui-dev tailwind fix --project "$PWD"
```

That command normalizes your entry stylesheet to import `oz-tailwind.generated.css`, which contains the required Tailwind v4 `@source` directives for OpenZeppelin UI and adapter packages.

If you need to wire it manually, your entry CSS must explicitly register the OpenZeppelin sources:

```css
@layer base, components, utilities;

@import 'tailwindcss' source(none);
@source "./";
@source "../";
@source "../node_modules/@openzeppelin/ui-components";
@source "../node_modules/@openzeppelin/ui-react";
@source "../node_modules/@openzeppelin/ui-renderer";
@source "../node_modules/@openzeppelin/ui-styles";
@source "../node_modules/@openzeppelin/ui-utils";
@import '@openzeppelin/ui-styles/global.css';
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
| 7     | `@openzeppelin/ui-storage`    | IndexedDB storage            |
| 6     | `@openzeppelin/ui-renderer`   | Form & contract UI rendering |
| 5     | `@openzeppelin/ui-react`      | Context providers & hooks    |
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

This repo now ships the shared `oz-ui-dev` local-development CLI for OpenZeppelin consumer apps.

Existing first-party consumers such as `ui-builder`, `role-manager`, and `rwa-wizard` already check in the required `.openzeppelin-dev.json`, `.pnpmfile.cjs`, and `dev:local` / `dev:npm` scripts.

For a new consumer project, install the CLI once like a normal dev tool and then bootstrap the repo:

```bash
pnpm add -D @openzeppelin/ui-dev-cli
pnpm exec oz-ui-dev init --project "$PWD" --family ui
```

That creates a config-driven `.pnpmfile.cjs`, writes `.openzeppelin-dev.json`, records `@openzeppelin/ui-dev-cli` in `devDependencies`, and adds `dev:local` / `dev:npm` scripts that call `oz-ui-dev` directly. Developers only need local `openzeppelin-ui` or `openzeppelin-adapters` checkouts when they want to test package changes from source.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

This project uses [GitHub Speckit](https://github.com/github/spec-kit) for spec-driven development. Feature specifications, implementation plans, and task breakdowns are managed in the `.specify/` directory.

> **Note**: Even if you're not using Speckit, please read the [project constitution](/.specify/memory/constitution.md) before contributing. It defines the architectural principles and quality standards that all contributions must follow.

## Documentation

- [Migration Guide](./docs/MIGRATION.md) - Migrate from `@openzeppelin/ui-builder-`* packages
- [LLM-led migration reference](./packages/cli/docs/LLM_MIGRATION_REFERENCE.md) - AI-assisted workflow for `@openzeppelin/ui-cli` (optional)
- [CLI create matrix](./packages/cli/docs/CREATE_MATRIX.md) - Presets, options, features, generated files, and supported combinations for `oz-ui create`
- [CLI create recipes](./packages/cli/docs/CREATE_RECIPES.md) - Architecture for `oz-ui create` presets, layouts, and feature combinations
- [DevOps Setup Guide](./docs/DEVOPS_SETUP.md) - CI/CD secrets and GitHub App configuration
- [Operations Runbook](./docs/RUNBOOK.md) - Release management and incident procedures

## License

[AGPL-3.0](./LICENSE)