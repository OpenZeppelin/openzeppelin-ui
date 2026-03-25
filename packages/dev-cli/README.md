# @openzeppelin/ui-dev-cli

Shared local-development CLI for OpenZeppelin consumer applications.

## Install

```bash
pnpm add -D @openzeppelin/ui-dev-cli
```

## Commands

```bash
pnpm exec oz-dev init --project /path/to/app --family ui --family adapters
pnpm exec oz-dev use local --project /path/to/app --family ui --family adapters
pnpm exec oz-dev use remote --project /path/to/app
pnpm exec oz-dev status --project /path/to/app --json
pnpm exec oz-dev doctor --project /path/to/app
```

Consumer apps pair this CLI with a checked-in `.openzeppelin-dev.json` file and a small `.pnpmfile.cjs` hook so local package switching stays deterministic for both humans and AI agents.
