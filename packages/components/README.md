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

### Optional: file tree subpath

`@openzeppelin/ui-components/file-tree` wraps `@pierre/trees` behind a kit-owned API. The tree library is an **optional peer** — main-entry consumers do not install it. File-tree consumers must pin the exact version:

```bash
pnpm add @openzeppelin/ui-components
pnpm add @pierre/trees@1.0.0-beta.6
```

```tsx
import { FileTree } from '@openzeppelin/ui-components/file-tree';
```

Importing the file-tree subpath without `@pierre/trees` installed fails at module resolution with a diagnostic that names the missing package. The component also fills its host rather than setting its own height, so mount it under a sized parent.

Full documentation: [docs/file-tree](../../docs/file-tree/README.md).

### Optional: code view subpath

`@openzeppelin/ui-components/code-view` renders read-only, syntax-highlighted source. It is a **subpath-only** export: the main entry does not include it, so applications that never display code never bundle the highlighter. `lowlight` and `highlight.js` are direct dependencies of this package; nothing extra to install.

```tsx
import { CodeView } from '@openzeppelin/ui-components/code-view';

<CodeView source={cargoToml} language="toml" aria-label="Cargo.toml source code" />;
```

`language` is a closed union: `'rust' | 'toml' | 'shell' | 'json' | 'markdown' | 'plaintext'`. Anything else renders as plain text via `'plaintext'`. Token spans use standard `hljs-*` class names, colored by kit tokens by default. Full docs: [`docs/code-view/`](../../docs/code-view/README.md).

### Bottom sheet (main entry)

`BottomSheet` is a **non-modal**, resizable panel anchored to the bottom of the viewport, exported from the main entry. It is not a dialog: it does not move focus, trap Tab, lock scrolling, or close on outside click, so the page behind it stays fully usable. Use `Dialog` for modal work.

```tsx
import { BottomSheet, defaultBottomSheetHeight } from '@openzeppelin/ui-components';

const [open, setOpen] = useState(false);
const [height, setHeight] = useState(() => defaultBottomSheetHeight(window.innerHeight));

<BottomSheet
  aria-label="Generated project preview"
  open={open}
  onOpenChange={setOpen}
  height={height}
  onHeightChange={setHeight}
>
  {preview}
</BottomSheet>;
```

All four state props are required (controlled-only), and exactly one of `aria-label` / `aria-labelledby`. The sheet clamps `height` to `[160px, viewport]` and reports the clamped value through `onHeightChange`; store what it reports. Full docs: [`docs/bottom-sheet/`](../../docs/bottom-sheet/README.md).

### Data table (main entry)

`DataTable<Row>` renders columns declared as data plus the rows your app already holds as a native, accessible `<table>`: a required accessible name (`caption`, `aria-label`, or `aria-labelledby`), `<th scope="col">` headers that stay sticky inside the table scroll wrapper by default (`stickyHeader={false}` to opt out), logical `'start' | 'end'` alignment per column, cells composed from kit pieces such as `Badge`, `AddressDisplay`, or `Button`, and a kit `EmptyState` when there are no body rows. Default chrome matches Role Manager tables (rounded bordered card, muted header band, compact cells, row hover). A `caption` is visually hidden by default. It never fetches. Optional additive props on the same component cover sorting (`sortable` / `getSortValue`, `sort` / `onSortChange`, table-wide `formatSortButtonName` for the sort-control accessible name), controlled pagination (`kind: 'client' | 'server'`, numbered page buttons when the total is known, `hasNextPage` when it is not, `placement: 'inside'` to put the pager in the card), an optional `toolbar` slot inside the kit frame, `getRowClassName`, controlled infinite scroll (`infiniteScroll`), opt-in row virtualization (`virtualized`, default `estimateSize` 64), and kit-owned row selection (`selection.selectedKeys` / `onSelectionChange`, keyed by `getRowKey`, injected column default `w-12`). Pagination and infinite scroll are exactly-one-of at the type level (`DataTableLoadStrategy`); untyped both-props still pager-win. Virtualization is a regular main-entry dependency (`@tanstack/react-virtual`), not a subpath.

```tsx
import { DataTable, type DataTableColumn } from '@openzeppelin/ui-components';

interface BalanceRow {
  symbol: string;
  balance: bigint;
}

const columns = [
  { id: 'symbol', header: 'Token', cell: (row) => row.symbol },
  { id: 'balance', header: 'Balance', align: 'end', cell: (row) => row.balance.toString() },
] satisfies readonly DataTableColumn<BalanceRow>[];

export function BalancesTable({ rows }: { rows: readonly BalanceRow[] }) {
  return (
    <DataTable
      caption="Token balances"
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.symbol}
    />
  );
}
```

Exactly one accessible name is required at the type level, and `getRowKey` is required (no index keys). Pinning and resizing are not column fields. Sticky does not pin body columns and is a no-op on unbounded tables. Omit `selection` to keep today’s column count; pass it for a leading checkbox column that survives sort, page, virtualization, and append. Full docs: [`docs/data-table/`](../../docs/data-table/README.md).

### Badge (main entry)

`Badge` is a compact, domain-neutral status or category chip on the main entry (`label` is required; there is no children API). Default `variant` is `'filled'` (tinted) and default `tone` is `'neutral'`. `'outline'` is unchanged. `'solid'` is an opaque pill using kit token pairs (`bg-success` / `text-success-foreground`, and the same pattern for info, warning, danger; solid+neutral is `bg-foreground` / `text-background`). The host is a `<span>` unless `onActivate` is passed, in which case it is `<button type="button">`. The component always `forwardRef`s the host and spreads extra span-safe props so `TooltipTrigger asChild` can wrap it. Decorative `icon` stays `aria-hidden`; pass non-empty `iconLabel` for visually hidden text beside the graphic. Do not pass `onClick` as a Badge prop — activation is `onActivate` (Radix may still merge `onClick` onto the rendered host).

```tsx
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@openzeppelin/ui-components';

<Badge label="Completed" variant="solid" tone="success" />

<Badge label="Owner" variant="outline" onActivate={() => openRole()} />

<Tooltip>
  <TooltipTrigger asChild>
    <Badge label="Feature" tone="info" />
  </TooltipTrigger>
  <TooltipContent>Details</TooltipContent>
</Tooltip>

<Badge label="Owner" variant="outline" icon={<Crown />} iconLabel="Owner role" />
```

Solid fills consume `--success-foreground` / `--warning-foreground` / `--info-foreground` from `@openzeppelin/ui-styles` (danger reuses `--destructive-foreground`).

## Overview

This package provides a comprehensive set of shared React UI components. It serves as the central library for all common UI elements, including basic primitives, form field components, and their associated utilities.

All components are built with React, TypeScript, and styled with Tailwind CSS, following the shadcn/ui patterns and design principles.

## Key Component Categories

### Basic UI Primitives

- `Button`, `LoadingButton` - Action buttons with variants
- `Badge` - Compact status/category chip (`filled` / `outline` / `solid`, semantic tones, optional `onActivate` / `icon` / `iconLabel`)
- `Input`, `Textarea` - Text input components
- `Label` - Form labels
- `Card` (and its parts) - Container components
- `Dialog` (and its parts) - Modal dialogs
- `Alert` (and its parts) - Alert messages
- `Checkbox`, `RadioGroup` - Selection inputs (`Checkbox` paints a minus glyph when `checked="indeterminate"`, not a check)
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

### ENS Name Resolution

See the [ENS address input integration guide](../../docs/ens-address-input/README.md) for wiring `NameResolverProvider`, inline name resolution in `AddressField`, reverse-ENS display via `AddressNameProvider`, and the shared suggestion dropdown primitives.

### Address Label & Suggestion Contexts

Context providers for automatic address label resolution and autocomplete suggestions:

- `AddressLabelProvider` / `AddressLabelContext` — When mounted, all `AddressDisplay` instances in the subtree auto-resolve human-readable labels via a `resolveLabel` function
- `AddressSuggestionProvider` / `AddressSuggestionContext` — When mounted, all `AddressField` instances in the subtree show autocomplete suggestions via a `resolveSuggestions` function
- `useAddressLabel(address, networkId?)` — Convenience hook to resolve a label from the nearest `AddressLabelProvider`

### Additional UI Components

- `OverflowMenu` — Compact "..." dropdown for secondary actions with support for icons, destructive styling, and disabled state
- `NetworkSelector` — Searchable network dropdown with optional multi-select mode (`multiple={true}`)
- `AddressDisplay` — Enhanced with optional `label`, `onLabelEdit`, and `disableLabel` props for context-driven alias display

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

Important: a bare Tailwind import is not enough for OpenZeppelin packages. Tailwind v4 must be told to scan the relevant `@openzeppelin/*` sources, or some component classes will be omitted from the final CSS.

For consumer apps that use `@openzeppelin/ui-dev-cli`, the recommended workflow is:

```bash
pnpm exec oz-ui-dev tailwind doctor --project "$PWD"
pnpm exec oz-ui-dev tailwind fix --project "$PWD"
```

That creates a managed `oz-tailwind.generated.css` file and keeps the `@source` wiring in sync with your installed dependencies.

If you need to configure Tailwind manually, import the shared styles and register the OpenZeppelin package sources explicitly:

```css
@layer base, components, utilities;

@import 'tailwindcss' source(none);
@source "../node_modules/@openzeppelin/ui-components";
@source "../node_modules/@openzeppelin/ui-react";
@source "../node_modules/@openzeppelin/ui-renderer";
@source "../node_modules/@openzeppelin/ui-styles";
@source "../node_modules/@openzeppelin/ui-utils";
@import '@openzeppelin/ui-styles/global.css';
```

## Development

```bash
# Build the package
pnpm build

# Run tests (jsdom)
pnpm test

# Chromium suite (Playwright). GitHub CI runs this after jsdom.
pnpm test:browser

# Typecheck DataTable tests (`@ts-expect-error` two-way arms)
pnpm typecheck:data-table-tests

# Lint
pnpm lint
```

## License

[AGPL-3.0](https://github.com/OpenZeppelin/openzeppelin-ui/blob/main/LICENSE)
