import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import { appConfigService } from '../AppConfigService';
import {
  getDefaultSelectableNetwork,
  getDisabledNetworkRejectionToast,
  getHostedNetworkAvailabilityNoticeCopy,
  getNetworkAvailability,
  getSelectableNetworks,
  isNetworkAvailabilityPolicyActive,
  isNetworkSelectable,
  resolveSelectableNetwork,
} from '../networkAvailability';

const ethereumMainnet = {
  id: 'ethereum-mainnet',
  name: 'Ethereum Mainnet',
  ecosystem: 'evm',
  network: 'ethereum',
  type: 'mainnet',
  isTestnet: false,
} as NetworkConfig;

const ethereumSepolia = {
  id: 'ethereum-sepolia',
  name: 'Sepolia',
  ecosystem: 'evm',
  network: 'ethereum',
  type: 'testnet',
  isTestnet: true,
} as NetworkConfig;

const polygonMainnet = {
  id: 'polygon-mainnet',
  name: 'Polygon Mainnet',
  ecosystem: 'evm',
  network: 'polygon',
  type: 'mainnet',
  isTestnet: false,
} as NetworkConfig;

let mockIsFeatureEnabled: MockInstance<(flagName: string) => boolean>;
let mockGetDisabledNetworkIds: MockInstance<() => string[]>;

beforeEach(() => {
  mockIsFeatureEnabled = vi.spyOn(appConfigService, 'isFeatureEnabled');
  mockGetDisabledNetworkIds = vi.spyOn(appConfigService, 'getDisabledNetworkIds');
  mockIsFeatureEnabled.mockReturnValue(false);
  mockGetDisabledNetworkIds.mockReturnValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('networkAvailability', () => {
  describe('isNetworkAvailabilityPolicyActive', () => {
    it('returns false when no policy is configured', () => {
      expect(isNetworkAvailabilityPolicyActive()).toBe(false);
    });

    it('returns true when mainnet flag is enabled', () => {
      mockIsFeatureEnabled.mockImplementation((flag) => flag === 'mainnet_networks_disabled');
      expect(isNetworkAvailabilityPolicyActive()).toBe(true);
    });

    it('returns true when disabledNetworkIds is non-empty', () => {
      mockGetDisabledNetworkIds.mockReturnValue(['ethereum-sepolia']);
      expect(isNetworkAvailabilityPolicyActive()).toBe(true);
    });
  });

  describe('getNetworkAvailability', () => {
    it('marks mainnets non-selectable when mainnet flag is enabled', () => {
      mockIsFeatureEnabled.mockImplementation((flag) => flag === 'mainnet_networks_disabled');

      const availability = getNetworkAvailability(ethereumMainnet);

      expect(availability.selectable).toBe(false);
      expect(availability.visible).toBe(true);
      expect(availability.disabledLabel).toBe('Self-host required');
    });

    it('leaves testnets selectable when mainnet flag is enabled', () => {
      mockIsFeatureEnabled.mockImplementation((flag) => flag === 'mainnet_networks_disabled');

      expect(getNetworkAvailability(ethereumSepolia).selectable).toBe(true);
    });

    it('marks explicitly disabled network IDs as non-selectable', () => {
      mockGetDisabledNetworkIds.mockReturnValue(['ethereum-sepolia']);

      const availability = getNetworkAvailability(ethereumSepolia);

      expect(availability.selectable).toBe(false);
      expect(availability.visible).toBe(true);
    });

    it('prefers explicit disabledNetworkIds over mainnet policy', () => {
      mockIsFeatureEnabled.mockImplementation((flag) => flag === 'mainnet_networks_disabled');
      mockGetDisabledNetworkIds.mockReturnValue(['ethereum-sepolia']);

      expect(getNetworkAvailability(ethereumSepolia).disabledLabel).toBe('Unavailable');
      expect(getNetworkAvailability(ethereumMainnet).disabledLabel).toBe('Self-host required');
    });
  });

  describe('getSelectableNetworks', () => {
    it('filters out disabled networks', () => {
      mockIsFeatureEnabled.mockImplementation((flag) => flag === 'mainnet_networks_disabled');

      const selectable = getSelectableNetworks([ethereumMainnet, ethereumSepolia, polygonMainnet]);

      expect(selectable).toEqual([ethereumSepolia]);
    });
  });

  describe('getDefaultSelectableNetwork', () => {
    it('returns the first selectable network', () => {
      mockIsFeatureEnabled.mockImplementation((flag) => flag === 'mainnet_networks_disabled');

      expect(getDefaultSelectableNetwork([ethereumMainnet, ethereumSepolia])).toEqual(
        ethereumSepolia
      );
    });

    it('returns null when every network is disabled', () => {
      mockIsFeatureEnabled.mockImplementation((flag) => flag === 'mainnet_networks_disabled');

      expect(getDefaultSelectableNetwork([ethereumMainnet])).toBeNull();
    });
  });

  describe('resolveSelectableNetwork', () => {
    it('returns the network when it is selectable', () => {
      expect(
        resolveSelectableNetwork('ethereum-sepolia', [ethereumMainnet, ethereumSepolia])
      ).toEqual(ethereumSepolia);
    });

    it('returns null when the network is disabled by policy', () => {
      mockIsFeatureEnabled.mockImplementation((flag) => flag === 'mainnet_networks_disabled');

      expect(
        resolveSelectableNetwork('ethereum-mainnet', [ethereumMainnet, ethereumSepolia])
      ).toBeNull();
    });
  });

  describe('isNetworkSelectable', () => {
    it('returns true by default', () => {
      expect(isNetworkSelectable(ethereumMainnet)).toBe(true);
    });
  });

  describe('getHostedNetworkAvailabilityNoticeCopy', () => {
    it('returns shared banner copy for the hosting app', () => {
      expect(getHostedNetworkAvailabilityNoticeCopy('UI Builder')).toEqual({
        title: 'Mainnet networks are disabled on this hosted UI Builder',
        descriptionBeforeLink:
          'Testnet and devnet networks remain available here. To use mainnet, deploy UI Builder yourself from ',
        descriptionLinkLabel: 'the source repository',
      });
    });
  });

  describe('getDisabledNetworkRejectionToast', () => {
    it('returns plain-text toast copy matching the banner message', () => {
      expect(getDisabledNetworkRejectionToast('UI Builder')).toEqual({
        title: 'Mainnet networks are disabled on this hosted UI Builder',
        description:
          'Testnet and devnet networks remain available here. To use mainnet, deploy UI Builder yourself from the source repository.',
      });
    });
  });
});
