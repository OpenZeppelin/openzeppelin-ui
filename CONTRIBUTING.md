# Contributing to OpenZeppelin UI

Thank you for considering contributing to OpenZeppelin UI! This document outlines the process for contributing to the project.

## Development Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit your changes following our commit convention
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Pull Request Process

1. Ensure your code follows the style guidelines of the project
2. Update the README.md with details of changes if applicable
3. The PR should work for Node.js version 20.19.0 or higher
4. Include tests for new features or bug fixes
5. Link any relevant issues in the PR description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/openzeppelin-ui.git

# Navigate to the project directory
cd openzeppelin-ui

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Troubleshooting: example app typecheck (`Cannot find module '@openzeppelin/ui-builder-adapter-*'`)

`pnpm typecheck` runs every workspace package, including `examples/basic-react-app`. That example depends on **published** adapter packages (`@openzeppelin/ui-builder-adapter-evm`, `@openzeppelin/ui-builder-adapter-stellar`) pulled from npm per the root lockfile—not on local workspace source.

- Run **`pnpm install` from the repository root** so all workspaces (including `examples/*`) get their dependencies. Installing only a subset of packages can leave the example without those modules and TypeScript will report `TS2307`.
- If you enable **`LOCAL_ADAPTERS=true`** or **`LOCAL_UI=true`**, the root `.pnpmfile.cjs` expects a valid **`.openzeppelin-dev.json`** (see `pnpm dev:local` / `oz-dev init` in the main README). Without it, `pnpm install` can fail. For a normal clone using registry packages, leave those env vars unset.

## Scripts

- `pnpm build` - Build all packages
- `pnpm test` - Run tests
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Run TypeScript type checking

## Coding Standards

- Follow the existing code style
- Write tests for your changes
- Keep pull requests focused on a single topic
- Add proper documentation for new features
- Use the shared Prettier configuration at the root of the repository
  - Don't add package-specific `.prettierrc` files
  - Run `pnpm format` to format all code before committing

## Build System

All library packages in this monorepo use `tsdown` for building. Key points to remember:

- **tsdown Configuration**: Each package has its own `tsdown.config.ts` file.
- **Dual Format**: All packages output both ES modules and CommonJS formats.
- **TypeScript Declarations**: Type declarations are generated automatically.
- **Building Packages**: Run `pnpm build` at the root to build all packages.

When creating new packages:

1. Create a `tsdown.config.ts` file for the package.
2. Ensure your `package.json` has proper `exports` configuration for both ESM and CJS.
3. Set `"type": "module"` in your `package.json`.

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

Commit message format:
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Scopes: `types`, `utils`, `styles`, `components`, `renderer`, `react`, `storage`, `deps`, `config`, `ci`, `docs`, `tests`, `release`, `examples`, `common`

## License

By contributing, you agree that your contributions will be licensed under the project's AGPL-3.0 license.
