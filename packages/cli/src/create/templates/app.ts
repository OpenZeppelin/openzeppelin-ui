import { appShellTsx } from './layouts/app-shell';
import { dappAppTsx } from './layouts/dapp';
import { wizardAppTsx } from './layouts/wizard';

import type { CreateAppSpec } from '../types';

/**
 * Selects the layout-specific `App.tsx` renderer for a given recipe. Content
 * wins over layout: a wizard recipe always renders wizard content, even when
 * `layout === 'sidebar-shell'`.
 */
export function appTsx(spec: CreateAppSpec): string {
  if (spec.content === 'wizard') return wizardAppTsx(spec);
  if (spec.layout === 'sidebar-shell') return appShellTsx(spec);
  return dappAppTsx(spec);
}
