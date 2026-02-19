import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import type { NetworkServiceForm } from '@openzeppelin/ui-types';

import { appConfigService } from '../AppConfigService';
import { filterEnabledServiceForms } from '../networkServiceFilter';

let mockIsFeatureEnabled: MockInstance<(flagName: string) => boolean>;

beforeEach(() => {
  mockIsFeatureEnabled = vi.spyOn(appConfigService, 'isFeatureEnabled');
  mockIsFeatureEnabled.mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeForm(overrides: Partial<NetworkServiceForm> = {}): NetworkServiceForm {
  return {
    id: 'test-service',
    label: 'Test Service',
    fields: [],
    ...overrides,
  };
}

describe('filterEnabledServiceForms', () => {
  it('should pass through forms without requiredFeature', () => {
    const forms = [makeForm({ id: 'rpc' }), makeForm({ id: 'explorer' })];

    const result = filterEnabledServiceForms(forms);

    expect(result).toHaveLength(2);
    expect(mockIsFeatureEnabled).not.toHaveBeenCalled();
  });

  it('should include a gated form when the feature flag is enabled', () => {
    mockIsFeatureEnabled.mockReturnValue(true);

    const forms = [makeForm({ id: 'indexer', requiredFeature: 'access_control_indexer' })];

    const result = filterEnabledServiceForms(forms);

    expect(result).toHaveLength(1);
    expect(mockIsFeatureEnabled).toHaveBeenCalledWith('access_control_indexer');
  });

  it('should exclude a gated form when the feature flag is disabled', () => {
    mockIsFeatureEnabled.mockReturnValue(false);

    const forms = [makeForm({ id: 'indexer', requiredFeature: 'access_control_indexer' })];

    const result = filterEnabledServiceForms(forms);

    expect(result).toHaveLength(0);
    expect(mockIsFeatureEnabled).toHaveBeenCalledWith('access_control_indexer');
  });

  it('should correctly filter a mixed array of gated and ungated forms', () => {
    mockIsFeatureEnabled.mockImplementation((flag: string) => flag === 'enabled_feature');

    const forms = [
      makeForm({ id: 'rpc' }),
      makeForm({ id: 'indexer', requiredFeature: 'disabled_feature' }),
      makeForm({ id: 'explorer' }),
      makeForm({ id: 'monitor', requiredFeature: 'enabled_feature' }),
    ];

    const result = filterEnabledServiceForms(forms);

    expect(result).toHaveLength(3);
    expect(result.map((f) => f.id)).toEqual(['rpc', 'explorer', 'monitor']);
  });

  it('should return an empty array when given an empty array', () => {
    const result = filterEnabledServiceForms([]);

    expect(result).toHaveLength(0);
  });
});
