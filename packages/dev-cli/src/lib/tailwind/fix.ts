import {
  fixTailwindProject as fixTailwindProjectShared,
  printTailwindProject as printTailwindProjectShared,
  type TailwindFixOptions,
  type TailwindFixResult,
  type TailwindPrintResult,
} from '@openzeppelin/ui-tailwind-utils';

import { DEV_CLI_BRANDING, getDevCliFamilies } from './branding';

export type { TailwindFixOptions };

/**
 * Returns the resolved Tailwind source plan without mutating files.
 * Thin wrapper that supplies dev-cli family definitions.
 */
export function printTailwindProject(
  projectRootInput: string,
  cssPathInput?: string
): TailwindPrintResult {
  return printTailwindProjectShared(projectRootInput, getDevCliFamilies(), cssPathInput);
}

/**
 * Rewrites the Tailwind setup into a managed generated stylesheet plus a stable import.
 * Thin wrapper that supplies dev-cli branding and family definitions.
 */
export function fixTailwindProject(
  projectRootInput: string,
  options: TailwindFixOptions = {}
): TailwindFixResult {
  return fixTailwindProjectShared(projectRootInput, getDevCliFamilies(), DEV_CLI_BRANDING, options);
}
