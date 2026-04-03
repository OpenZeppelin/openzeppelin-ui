import type { PackageFamilyMap, TailwindBrandingOptions } from '@openzeppelin/ui-tailwind-utils';

import { STANDARD_FAMILIES } from '../families';

export const DEV_CLI_BRANDING: TailwindBrandingOptions = {
  managedComment: '/* Managed by oz-ui-dev tailwind fix */',
  suggestedFixCommand: 'oz-ui-dev tailwind fix --project "$PWD"',
};

export function getDevCliFamilies(): PackageFamilyMap {
  return STANDARD_FAMILIES;
}
