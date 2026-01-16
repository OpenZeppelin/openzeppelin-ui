import type { ContractSchema } from '@openzeppelin/ui-types';

/**
 * Contract loading state
 */
export interface ContractLoadState {
  status: 'idle' | 'loading' | 'success' | 'error';
  schema: ContractSchema | null;
  error: string | null;
  metadata?: {
    fetchedFrom?: string;
    contractName?: string;
    verificationStatus?: string;
  };
}

/**
 * Demo tab options
 */
export type DemoTab = 'try-it' | 'learn';
