# `oz-ui create` Matrix

This document describes what `oz-ui create` can generate today. For the implementation model behind these combinations, see [Create recipes architecture](./CREATE_RECIPES.md).

## Help

Use the command help to see the current flag surface:

```bash
oz-ui create --help
```

## Presets

| Preset | Default Wallet | Routing | Default Features | Generated Shape |
| --- | --- | --- | --- | --- |
| `minimal` | `none` | `none` | `theme`, `toasts`, `tooltips` | Plain centered starter page with OpenZeppelin UI styles and components. |
| `dapp` | `custom` | `none` | `wallet`, `theme`, `toasts`, `tooltips`, `status-panel` | Top-bar dApp starter with wallet runtime wiring and status panel. |
| `app-shell` | `custom` | `react-router` | `wallet`, `router`, `sidebar`, `theme`, `toasts`, `tooltips`, `status-panel` | Sidebar/header/footer app shell with placeholder routes. |
| `wizard` | `custom` | `none` | `wallet`, `theme`, `toasts`, `tooltips`, `wizard`, `status-panel` | Top-bar guided workflow starter using `WizardLayout`. |

The default preset is `dapp`.

## Options

| Option | Values | Effect |
| --- | --- | --- |
| `--preset <preset>` | `minimal`, `dapp`, `app-shell`, `wizard` | Selects the default feature set and primary generated content. |
| `--ecosystem <ecosystem>` | `evm` | Selects adapter ecosystem support. V1 supports EVM only. |
| `--wallet <wallet>` | `none`, `custom`, `rainbowkit` | Selects wallet UI/runtime wiring. Non-`none` values enable `wallet`. |
| `--routing <routing>` | `none`, `react-router` | Selects route support. `sidebar` and `app-shell` require `react-router`. |
| `--with <features>` | comma-separated feature list | Adds features on top of the preset defaults. |
| `--without <features>` | comma-separated feature list | Removes features from preset defaults. Contradictions are rejected. |
| `--package-manager <pm>` | `npm`, `pnpm`, `yarn` | Selects dependency install command and next-step output. |
| `--skip-install` | boolean flag | Writes files without installing dependencies. |
| `--force` | boolean flag | Allows generated files to be overwritten in a non-empty target directory. |
| `--yes` | boolean flag | Uses defaults and skips interactive prompts. |
| `--json` | boolean flag | Emits machine-readable command output. |

## Features

| Feature | Adds |
| --- | --- |
| `wallet` | `src/oz` runtime/provider files, `public/app.config.json`, wallet dependencies, wallet UI in generated app chrome. |
| `router` | `react-router-dom` dependency and route-aware app wiring where a router layout is selected. |
| `sidebar` | `SidebarLayout`, sidebar navigation, logo asset, and route-aware shell layout. Also implies `router`. |
| `theme` | `next-themes` dependency and `ThemeProvider` with light theme as the default. |
| `toasts` | `Toaster` from `@openzeppelin/ui-components`. |
| `tooltips` | `TooltipProvider` wrapping the generated app. |
| `wizard` | Wizard content using `WizardLayout`. The `wizard` preset always keeps this enabled. |
| `status-panel` | `src/components/RuntimeStatus.tsx` and runtime status placeholder UI. |

## Generated Files

| Condition | Additional Files |
| --- | --- |
| Always | `package.json`, `index.html`, `tsconfig.json`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts` |
| `wallet` | `public/app.config.json`, `src/oz/config.ts`, `src/oz/runtime.ts`, `src/oz/OzProviders.tsx` |
| logo asset required | `public/OZ-Logo-BlackBG.svg` |
| `status-panel` | `src/components/RuntimeStatus.tsx` |
| `--wallet rainbowkit` | `src/oz/wallet/rainbowkit.config.ts` |

The logo asset is generated for top-bar and sidebar layouts. The `minimal` preset does not include it by default.

## Layout And Content Matrix

| Command Shape | Layout | Content | Notes |
| --- | --- | --- | --- |
| `--preset minimal` | `plain` | `landing` | Small starter page without wallet/runtime files. |
| `--preset dapp` | `topbar` | `dapp-dashboard` | Default generated app. |
| `--preset app-shell` | `sidebar-shell` | `dapp-dashboard` | Full app shell with multiple placeholder routes. |
| `--preset wizard` | `topbar` | `wizard` | Wizard is the primary content. |
| `--preset dapp --with sidebar` | `sidebar-shell` | `dapp-dashboard` | Sidebar changes the shell and implies routing. |
| `--preset wizard --with sidebar` | `sidebar-shell` | `wizard` | Sidebar wraps the wizard; it does not replace wizard content with the shell dashboard. |
| `--preset minimal --with wallet` | `plain` | `landing` | Keeps the minimal page but adds wallet/runtime wiring. |
| `--preset minimal --with sidebar` | `sidebar-shell` | `landing` | Sidebar implies router; use this only when a routed frame is desired around minimal content. |

## Validation Rules

- A feature cannot appear in both `--with` and `--without`.
- `--without wallet` cannot be combined with `--wallet custom` or `--wallet rainbowkit`.
- `sidebar` implies `router`.
- `app-shell` implies `router`.
- `wizard` preset always includes `wizard`.
- `--routing none` is rejected if the resolved scaffold includes `router` or `sidebar`.
