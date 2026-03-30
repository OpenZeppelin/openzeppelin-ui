# @openzeppelin/ui-dev-cli

Shared local-development CLI for OpenZeppelin consumer applications.

## Install

```bash
pnpm add -D @openzeppelin/ui-dev-cli
```

## Commands

```bash
pnpm exec oz-ui-dev init --project /path/to/app --family ui --family adapters
pnpm exec oz-ui-dev use local --project /path/to/app --family ui --family adapters
pnpm exec oz-ui-dev use remote --project /path/to/app
pnpm exec oz-ui-dev status --project /path/to/app --json
pnpm exec oz-ui-dev doctor --project /path/to/app
pnpm exec oz-ui-dev tailwind doctor --project /path/to/app
pnpm exec oz-ui-dev tailwind fix --project /path/to/app --dry-run
pnpm exec oz-ui-dev tailwind fix --project /path/to/app
pnpm exec oz-ui-dev tailwind print --project /path/to/app --json
```

Consumer apps pair this CLI with a checked-in `.openzeppelin-dev.json` file and a small `.pnpmfile.cjs` hook so local package switching stays deterministic for both humans and AI agents.

## Tailwind workflow

The `tailwind` command group helps consumer repos normalize the Tailwind v4 `@source` wiring required by `@openzeppelin/ui-*` and `@openzeppelin/adapter-*` packages.

Recommended workflow:

```bash
pnpm exec oz-ui-dev tailwind doctor --project "$PWD"
pnpm exec oz-ui-dev tailwind fix --project "$PWD" --dry-run
pnpm exec oz-ui-dev tailwind fix --project "$PWD"
pnpm exec oz-ui-dev tailwind doctor --project "$PWD"
```

The fixer uses a managed generated stylesheet named `oz-tailwind.generated.css` and rewrites the primary entry stylesheet to import it. This keeps app-specific CSS in the entry stylesheet while centralizing the fragile `@source` plumbing in one deterministic file.

Use `--css <path>` when a repo contains more than one Tailwind entry stylesheet and you want to target a specific one explicitly.
