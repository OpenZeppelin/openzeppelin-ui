# @openzeppelin/ui-cli

Consumer CLI for scaffolding, migrating, and managing OpenZeppelin UI applications.

## Installation

```bash
npm install -g @openzeppelin/ui-cli
```

## Commands

### `oz-ui migrate init`

Initialize a migration manifest for the current project. Detects framework, package manager, and existing dependencies.

### `oz-ui migrate analyze`

Scan the project for UI components from third-party libraries (shadcn/ui, Radix, MUI, Chakra, Ant Design) and raw HTML elements, then map them to OpenZeppelin UI Kit equivalents.

### `oz-ui migrate plan`

Generate a step-by-step migration plan based on the analysis report.

### `oz-ui migrate doctor`

Check Tailwind CSS configuration health and compatibility with the OZ UI Kit.

### `oz-ui migrate status`

Display the current state of the migration manifest.

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm --filter @openzeppelin/ui-cli build

# Run tests
pnpm --filter @openzeppelin/ui-cli test

# Run evaluation harness
pnpm --filter @openzeppelin/ui-cli evaluate

# Start autoresearch dashboard
pnpm --filter @openzeppelin/ui-cli dashboard
```

## Autoresearch

The CLI includes an autonomous experiment loop for improving component detection accuracy. An AI agent iteratively modifies detection logic, evaluates against benchmark fixtures, and keeps only changes that improve the F1 score — with a real-time dashboard for monitoring.

See [autoresearch/README.md](autoresearch/README.md) for the full workflow and documentation.
