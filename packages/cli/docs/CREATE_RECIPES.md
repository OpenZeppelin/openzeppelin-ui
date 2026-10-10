# `oz-ui create` Recipes

For the user-facing preset and generated-output reference, see [Create matrix](./CREATE_MATRIX.md).

The `create` command resolves user input in two stages:

1. `resolveCreateOptions` validates CLI flags and expands feature implications.
2. `resolveCreateAppSpec` turns the resolved options into a normalized app recipe.

This keeps preset behavior predictable while avoiding one-off branching for every preset and feature combination.

## Core Model

The generated app is described by `CreateAppSpec`:

- `layout`: the outer application frame. Current values are `plain`, `topbar`, and `sidebar-shell`.
- `content`: the primary generated experience. Current values are `landing`, `dapp-dashboard`, and `wizard`.
- feature booleans: `hasWallet`, `hasRouter`, `hasTooltips`, `hasStatusPanel`, and related flags derived once from resolved features.
- assets and navigation: `requiresLogoAsset` and sidebar navigation metadata.

Templates should render from this spec instead of re-checking raw CLI flags. For example, `--preset wizard --with sidebar` becomes:

```ts
{
  layout: 'sidebar-shell',
  content: 'wizard',
  hasSidebar: true,
  hasWizard: true,
  hasRouter: true
}
```

That means the wizard remains the primary content, and the sidebar is only the navigation frame.

## Preset Mapping


| Preset      | Default Layout  | Default Content  | Notes                                             |
| ----------- | --------------- | ---------------- | ------------------------------------------------- |
| `minimal`   | `plain`         | `landing`        | No wallet wiring and no logo asset by default.    |
| `dapp`      | `topbar`        | `dapp-dashboard` | Wallet-enabled starter with runtime status.       |
| `app-shell` | `sidebar-shell` | `dapp-dashboard` | Route-aware shell with richer sidebar navigation. |
| `wizard`    | `topbar`        | `wizard`         | Guided workflow starter.                          |


Feature flags can change the layout without changing the content. The important rule is that content wins over layout: a wizard with a sidebar is still a wizard app.

## Adding A Layout

Add a new layout when the outer frame changes substantially, such as split panes, command palette shell, or embedded mode.

1. Extend `CreateLayout` in `src/create/types.ts`.
2. Update `resolveLayout` in `src/create/recipes.ts`.
3. Add or update the renderer selection in `src/create/templates.ts`.
4. Add tests that assert the normalized recipe and generated `App.tsx` shape.

Keep layout renderers responsible for frame concerns: header, sidebar, footer, route containers, and scroll boundaries.

## Adding Content

Add a new content type when the primary app experience changes, such as a table workspace, contract explorer, or dashboard variant.

1. Extend `CreateContent` in `src/create/types.ts`.
2. Update `resolveContent` in `src/create/recipes.ts`.
3. Add the content renderer or compose it into an existing layout renderer.
4. Add tests for at least one standalone layout and one combined layout if the content supports both.

Keep content renderers responsible for product placeholders, cards, wizard steps, forms, and domain examples.

## Template Rules

- Prefer reading `CreateAppSpec` booleans over repeating `options.features.includes(...)`.
- Keep CLI validation and feature implication in `options.ts`.
- Keep app-shape decisions in `recipes.ts`.
- Keep generated file contents in `templates.ts`.
- Add direct dependencies whenever generated code or upstream packages require them under pnpm strict resolution.
- Preserve Tailwind `@source` coverage for OpenZeppelin packages when generated UI imports package-provided components or wallet UI.

## Test Strategy

For each new recipe combination, test both layers:

- recipe tests: assert `layout`, `content`, and relevant feature booleans.
- scaffold tests: assert generated files and key code markers.

This catches both decision bugs, such as choosing the wrong layout, and template bugs, such as omitting imports or assets.