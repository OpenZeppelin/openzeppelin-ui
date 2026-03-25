import * as p from '@clack/prompts';

import { FamilyKey } from '../lib/families';
import { isInteractiveTerminal } from '../utils/logger';

/**
 * Resolves which package families should be targeted, optionally prompting in a TTY.
 */
export async function resolveSelectedFamilies(
  requestedFamilies: FamilyKey[],
  supportedFamilies: FamilyKey[],
  json: boolean
): Promise<FamilyKey[]> {
  if (requestedFamilies.length > 0) {
    return requestedFamilies;
  }

  if (supportedFamilies.length <= 1 || json || !isInteractiveTerminal()) {
    return supportedFamilies;
  }

  const selected = await p.multiselect({
    message: 'Select the local package families to enable',
    options: supportedFamilies.map((familyKey) => ({
      value: familyKey,
      label: familyKey,
    })),
    initialValues: supportedFamilies,
  });

  if (p.isCancel(selected)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  const selectedFamilies = selected as FamilyKey[];
  return selectedFamilies.length > 0 ? selectedFamilies : supportedFamilies;
}
