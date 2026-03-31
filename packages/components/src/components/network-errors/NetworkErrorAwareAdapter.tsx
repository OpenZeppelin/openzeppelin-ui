'use client';

import { useEffect, useRef } from 'react';

import type { RuntimeCapability } from '@openzeppelin/ui-types';

import { useNetworkErrors } from './useNetworkErrors';

/**
 * Creates an adapter proxy that intercepts and reports network errors
 */
export function useNetworkErrorAwareAdapter<T extends RuntimeCapability>(
  capability: T | null
): T | null {
  const { reportNetworkError } = useNetworkErrors();
  const wrappedCapabilityRef = useRef<T | null>(null);

  useEffect(() => {
    if (!capability) {
      wrappedCapabilityRef.current = null;
      return;
    }

    // Create a proxy that wraps the runtime capability to intercept errors
    const wrappedCapability = new Proxy(capability, {
      get(target, prop, receiver): unknown {
        const value = Reflect.get(target, prop, receiver);

        // Wrap async methods that might throw network errors
        if (
          typeof value === 'function' &&
          (prop === 'queryViewFunction' || prop === 'loadContract')
        ) {
          return async (...args: unknown[]) => {
            try {
              return await value.apply(target, args);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              // Check if it's an RPC error
              if (
                errorMessage.toLowerCase().includes('rpc') ||
                errorMessage.toLowerCase().includes('network') ||
                errorMessage.toLowerCase().includes('timeout') ||
                errorMessage.toLowerCase().includes('fetch') ||
                errorMessage.toLowerCase().includes('connection')
              ) {
                reportNetworkError(
                  'rpc',
                  target.networkConfig.id,
                  target.networkConfig.name,
                  errorMessage
                );
              }

              // Check if it's an explorer error
              if (
                errorMessage.toLowerCase().includes('explorer') ||
                errorMessage.toLowerCase().includes('etherscan') ||
                errorMessage.toLowerCase().includes('api key') ||
                errorMessage.toLowerCase().includes('abi') ||
                errorMessage.toLowerCase().includes('verified')
              ) {
                reportNetworkError(
                  'explorer',
                  target.networkConfig.id,
                  target.networkConfig.name,
                  errorMessage
                );
              }

              // Re-throw the error to maintain normal error handling
              throw error;
            }
          };
        }

        return value;
      },
    }) as T;

    wrappedCapabilityRef.current = wrappedCapability;
  }, [capability, reportNetworkError]);

  return wrappedCapabilityRef.current;
}
