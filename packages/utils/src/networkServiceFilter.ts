import type { NetworkServiceForm } from '@openzeppelin/ui-types';

import { appConfigService } from './AppConfigService';

/**
 * Filters network service forms based on feature flags.
 *
 * Forms without `requiredFeature` are always included (backward compatible).
 * Forms with `requiredFeature` are only included when the corresponding
 * feature flag is enabled in AppConfigService.
 */
export function filterEnabledServiceForms(forms: NetworkServiceForm[]): NetworkServiceForm[] {
  return forms.filter(
    (form) => !form.requiredFeature || appConfigService.isFeatureEnabled(form.requiredFeature)
  );
}
