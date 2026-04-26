import {
  doctorTailwindProject as doctorTailwindProjectShared,
  type TailwindDoctorResult,
} from '@openzeppelin/ui-tailwind-utils';

import { DEV_CLI_BRANDING, getDevCliFamilies } from './branding';

/**
 * Diagnoses a project's Tailwind wiring for OpenZeppelin packages.
 * Thin wrapper that supplies dev-cli branding and family definitions.
 */
export function doctorTailwindProject(
  projectRootInput: string,
  cssPathInput?: string
): TailwindDoctorResult {
  return doctorTailwindProjectShared(
    projectRootInput,
    getDevCliFamilies(),
    DEV_CLI_BRANDING,
    cssPathInput
  );
}
