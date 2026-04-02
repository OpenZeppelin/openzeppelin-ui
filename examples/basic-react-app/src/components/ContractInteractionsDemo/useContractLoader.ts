import { useCallback, useEffect, useState } from 'react';

import type { ContractLoadingCapability } from '@openzeppelin/ui-types';

import type { ContractLoadState } from './types';

interface UseContractLoaderOptions {
  contractLoading: ContractLoadingCapability | null;
  contractAddress: string;
  isDeployed: boolean;
}

interface UseContractLoaderResult {
  contractState: ContractLoadState;
  loadContract: () => Promise<void>;
}

/**
 * Hook to handle contract loading logic
 */
export function useContractLoader({
  contractLoading,
  contractAddress,
  isDeployed,
}: UseContractLoaderOptions): UseContractLoaderResult {
  const [contractState, setContractState] = useState<ContractLoadState>({
    status: 'idle',
    schema: null,
    error: null,
  });

  const loadContract = useCallback(async () => {
    if (!contractLoading || !isDeployed) {
      setContractState({
        status: 'idle',
        schema: null,
        error: isDeployed ? null : 'Contract not deployed yet',
      });
      return;
    }

    setContractState({
      status: 'loading',
      schema: null,
      error: null,
    });

    try {
      // Use loadContractWithMetadata if available for richer information
      if (contractLoading.loadContractWithMetadata) {
        const result = await contractLoading.loadContractWithMetadata(contractAddress);
        setContractState({
          status: 'success',
          schema: result.schema,
          error: null,
          metadata: {
            fetchedFrom: result.metadata?.fetchedFrom,
            contractName: result.metadata?.contractName,
            verificationStatus: result.metadata?.verificationStatus,
          },
        });
      } else {
        // Fallback to basic loadContract
        const schema = await contractLoading.loadContract(contractAddress);
        setContractState({
          status: 'success',
          schema,
          error: null,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load contract';
      setContractState({
        status: 'error',
        schema: null,
        error: message,
      });
    }
  }, [contractLoading, contractAddress, isDeployed]);

  // Load contract on mount and when dependencies change
  useEffect(() => {
    void loadContract();
  }, [loadContract]);

  return { contractState, loadContract };
}
