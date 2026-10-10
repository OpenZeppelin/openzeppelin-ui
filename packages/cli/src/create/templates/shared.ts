import type { CreateAppSpec } from '../types';

/**
 * Imports from `@openzeppelin/ui-components` shared by every generated `App.tsx`,
 * regardless of layout. Layout modules append their own imports on top of this list.
 */
export function sharedAppImports(spec: CreateAppSpec): string[] {
  return [
    spec.hasTooltips ? 'TooltipProvider' : '',
    'Button',
    'Card',
    'CardContent',
    'CardDescription',
    'CardHeader',
    'CardTitle',
    'Footer',
    spec.layout === 'sidebar-shell' ? 'Header' : '',
  ].filter(Boolean);
}

/**
 * Adds the `WalletConnectionUI` import to a generated `App.tsx` when wallet
 * wiring is enabled. Returns an empty string otherwise so the `@openzeppelin/ui-react`
 * dependency is not implied by the generated source.
 */
export function walletHeaderImport(spec: CreateAppSpec): string {
  return spec.hasWallet ? "import { WalletConnectionUI } from '@openzeppelin/ui-react';\n" : '';
}

/**
 * Adds the local `RuntimeStatus` import to a generated `App.tsx` when the
 * status panel feature is enabled.
 */
export function runtimeStatusImport(spec: CreateAppSpec): string {
  return spec.hasStatusPanel ? "import { RuntimeStatus } from './components/RuntimeStatus';\n" : '';
}

/**
 * Renders the JSX expression placed in the header's wallet slot. Yields the
 * literal `null` placeholder for the no-wallet recipe so the template's
 * `{...}` interpolation stays valid.
 */
export function walletHeader(spec: CreateAppSpec): string {
  return spec.hasWallet ? '<WalletConnectionUI />' : 'null';
}

/**
 * Renders the JSX node placed in the status-panel slot, or an empty string
 * when the feature is disabled (callers concatenate the result directly).
 */
export function statusPanel(spec: CreateAppSpec): string {
  return spec.hasStatusPanel ? '<RuntimeStatus />' : '';
}

/**
 * Wraps body JSX in a `TooltipProvider` when the recipe enables tooltips, and
 * preserves the indentation contract callers rely on.
 */
export function maybeTooltipWrapper(spec: CreateAppSpec, body: string): string {
  return spec.hasTooltips ? `<TooltipProvider>\n${body}\n    </TooltipProvider>` : body.trimStart();
}
