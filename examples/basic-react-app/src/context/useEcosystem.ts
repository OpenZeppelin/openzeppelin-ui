/**
 * Hook to access the ecosystem context.
 */

import { useContext } from 'react';

import { EcosystemContext, type EcosystemContextValue } from './ecosystemContextDef';

/**
 * Hook to access the ecosystem context.
 * Must be used within an EcosystemProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { capabilities, ecosystem, network } = useEcosystem();
 *
 *   const isValid = capabilities?.isValidAddress(userInput);
 *   const fieldType = capabilities?.mapParameterTypeToFieldType('uint256');
 * }
 * ```
 */
export function useEcosystem(): EcosystemContextValue {
  const context = useContext(EcosystemContext);

  if (!context) {
    throw new Error('useEcosystem must be used within an EcosystemProvider');
  }

  return context;
}
