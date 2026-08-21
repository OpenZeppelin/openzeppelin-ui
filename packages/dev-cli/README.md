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
pnpm exec oz-ui-dev check-peers --project /path/to/app --json
pnpm exec oz-ui-dev tailwind doctor --project /path/to/app
pnpm exec oz-ui-dev tailwind fix --project /path/to/app --dry-run
pnpm exec oz-ui-dev tailwind fix --project /path/to/app
pnpm exec oz-ui-dev tailwind print --project /path/to/app --json
```

Consumer apps pair this CLI with a checked-in `.openzeppelin-dev.json` file and a small `.pnpmfile.cjs` hook so local package switching stays deterministic for both humans and AI agents.

## Adapter peer check

`@openzeppelin/adapter-*` packages declare peerDependencies on `@openzeppelin/ui-*` and
enforce them only at runtime, inside `validatePeerVersions()`. When a repository bumps the
adapters to a new major without moving its `ui-*` pins, typecheck, tests, build and lint all
pass and the app then fails in the browser with the network runtime stuck in a failed state.

`check-peers` catches that statically:

```bash
pnpm exec oz-ui-dev check-peers --project "$PWD"
```

It scans `node_modules/@openzeppelin` at the repository root and next to every workspace
package declared in `pnpm-workspace.yaml`, so it works whether dependencies are hoisted to
the root or installed under an app. For each installed adapter it compares the *minimum* of
each declared `@openzeppelin/ui-*` range against the `ui-*` version actually installed,
matching `validatePeerVersions` semantics — a peer newer than the range is fine, because the
adapter only requires `>=` the minimum.

Exit code is `1` when a peer is stale, and also when nothing could be checked (no
`@openzeppelin` packages, no adapters installed, or no peers resolved). Those are treated as
failures on purpose: in CI they mean the install did not run or `--project` points at the
wrong root, and passing would be a false green.

Run it after install in CI:

```yaml
- name: Check adapter peer versions
  run: pnpm exec oz-ui-dev check-peers --project "$PWD"
```

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
