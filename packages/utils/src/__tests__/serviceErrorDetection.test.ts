import { describe, expect, it } from 'vitest';

import {
  analyzeServiceError,
  detectServiceType,
  getServiceDisplayName,
  isServiceConnectionError,
  SERVICE_DISPLAY_NAMES,
  SERVICE_ERROR_PATTERNS,
  SERVICE_TYPE_HINTS,
} from '../serviceErrorDetection';

describe('serviceErrorDetection', () => {
  describe('SERVICE_ERROR_PATTERNS', () => {
    it('should contain common connection failure patterns', () => {
      expect(SERVICE_ERROR_PATTERNS).toContain('failed to fetch');
      expect(SERVICE_ERROR_PATTERNS).toContain('network error');
      expect(SERVICE_ERROR_PATTERNS).toContain('connection refused');
      expect(SERVICE_ERROR_PATTERNS).toContain('timeout');
    });

    it('should contain HTTP error code patterns', () => {
      expect(SERVICE_ERROR_PATTERNS).toContain('503');
      expect(SERVICE_ERROR_PATTERNS).toContain('502');
      expect(SERVICE_ERROR_PATTERNS).toContain('504');
    });

    it('should contain service-specific patterns', () => {
      expect(SERVICE_ERROR_PATTERNS).toContain('rpc error');
      expect(SERVICE_ERROR_PATTERNS).toContain('indexer');
      expect(SERVICE_ERROR_PATTERNS).toContain('explorer');
    });
  });

  describe('SERVICE_DISPLAY_NAMES', () => {
    it('should have display names for common service types', () => {
      expect(SERVICE_DISPLAY_NAMES['rpc']).toBe('RPC Provider');
      expect(SERVICE_DISPLAY_NAMES['explorer']).toBe('Block Explorer');
      expect(SERVICE_DISPLAY_NAMES['indexer']).toBe('Indexer');
    });
  });

  describe('SERVICE_TYPE_HINTS', () => {
    it('should have hints for detecting RPC errors', () => {
      const rpcHint = SERVICE_TYPE_HINTS.find((h) => h.serviceType === 'rpc');
      expect(rpcHint).toBeDefined();
      expect(rpcHint?.patterns).toContain('rpc');
    });

    it('should have hints for detecting indexer errors', () => {
      const indexerHint = SERVICE_TYPE_HINTS.find((h) => h.serviceType === 'indexer');
      expect(indexerHint).toBeDefined();
      expect(indexerHint?.patterns).toContain('indexer');
    });
  });

  describe('isServiceConnectionError', () => {
    it('should return true for common connection errors', () => {
      expect(isServiceConnectionError('Failed to fetch')).toBe(true);
      expect(isServiceConnectionError('Network error occurred')).toBe(true);
      expect(isServiceConnectionError('Connection refused')).toBe(true);
      expect(isServiceConnectionError('Request timeout')).toBe(true);
    });

    it('should return true for HTTP error codes', () => {
      expect(isServiceConnectionError('HTTP 503 Service Unavailable')).toBe(true);
      expect(isServiceConnectionError('Error 502 Bad Gateway')).toBe(true);
      expect(isServiceConnectionError('Gateway timeout 504')).toBe(true);
    });

    it('should return true for RPC-specific errors', () => {
      expect(isServiceConnectionError('RPC error: connection failed')).toBe(true);
      expect(isServiceConnectionError('Failed to connect to RPC endpoint')).toBe(true);
    });

    it('should return true for indexer errors', () => {
      expect(isServiceConnectionError('Indexer connection failed')).toBe(true);
      expect(isServiceConnectionError('Failed to query indexer')).toBe(true);
    });

    it('should return false for non-connection errors', () => {
      expect(isServiceConnectionError('Invalid contract address')).toBe(false);
      expect(isServiceConnectionError('Contract not verified')).toBe(false);
      expect(isServiceConnectionError('Insufficient balance')).toBe(false);
    });

    it('should return false for null/undefined/empty', () => {
      expect(isServiceConnectionError(null)).toBe(false);
      expect(isServiceConnectionError(undefined)).toBe(false);
      expect(isServiceConnectionError('')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isServiceConnectionError('FAILED TO FETCH')).toBe(true);
      expect(isServiceConnectionError('Network Error')).toBe(true);
      expect(isServiceConnectionError('CONNECTION REFUSED')).toBe(true);
    });
  });

  describe('detectServiceType', () => {
    it('should detect RPC service errors', () => {
      expect(detectServiceType('RPC error occurred')).toBe('rpc');
      expect(detectServiceType('Failed to connect to RPC endpoint')).toBe('rpc');
      expect(detectServiceType('eth_call failed')).toBe('rpc');
    });

    it('should detect indexer service errors', () => {
      expect(detectServiceType('Indexer connection failed')).toBe('indexer');
      expect(detectServiceType('GraphQL query failed')).toBe('indexer');
    });

    it('should detect explorer service errors', () => {
      expect(detectServiceType('Explorer API error')).toBe('explorer');
      expect(detectServiceType('Etherscan API rate limit')).toBe('explorer');
      expect(detectServiceType('Blockscout returned error')).toBe('explorer');
    });

    it('should detect horizon service errors', () => {
      expect(detectServiceType('Horizon API failed')).toBe('horizon');
    });

    it('should detect soroban service errors', () => {
      expect(detectServiceType('Soroban RPC error')).toBe('soroban');
    });

    it('should return "rpc" as default for unrecognized service errors', () => {
      expect(detectServiceType('Some unknown error')).toBe('rpc');
      expect(detectServiceType('Connection failed')).toBe('rpc');
    });

    it('should return "rpc" for null/undefined/empty', () => {
      expect(detectServiceType(null)).toBe('rpc');
      expect(detectServiceType(undefined)).toBe('rpc');
      expect(detectServiceType('')).toBe('rpc');
    });

    it('should be case insensitive', () => {
      expect(detectServiceType('INDEXER ERROR')).toBe('indexer');
      expect(detectServiceType('Explorer API')).toBe('explorer');
    });
  });

  describe('getServiceDisplayName', () => {
    it('should return correct display names for known services', () => {
      expect(getServiceDisplayName('rpc')).toBe('RPC Provider');
      expect(getServiceDisplayName('explorer')).toBe('Block Explorer');
      expect(getServiceDisplayName('indexer')).toBe('Indexer');
      expect(getServiceDisplayName('horizon')).toBe('Horizon API');
      expect(getServiceDisplayName('soroban')).toBe('Soroban RPC');
    });

    it('should return capitalized service type for unknown services', () => {
      expect(getServiceDisplayName('custom')).toBe('Custom');
      expect(getServiceDisplayName('myservice')).toBe('Myservice');
    });

    it('should handle empty string', () => {
      expect(getServiceDisplayName('')).toBe('');
    });
  });

  describe('analyzeServiceError', () => {
    it('should analyze RPC connection errors', () => {
      const result = analyzeServiceError('RPC endpoint timeout');
      expect(result.isServiceError).toBe(true);
      expect(result.serviceType).toBe('rpc');
      expect(result.serviceName).toBe('RPC Provider');
    });

    it('should analyze indexer connection errors', () => {
      const result = analyzeServiceError('Indexer GraphQL connection failed');
      expect(result.isServiceError).toBe(true);
      expect(result.serviceType).toBe('indexer');
      expect(result.serviceName).toBe('Indexer');
    });

    it('should analyze explorer connection errors', () => {
      const result = analyzeServiceError('Etherscan API rate limit exceeded');
      expect(result.isServiceError).toBe(true);
      expect(result.serviceType).toBe('explorer');
      expect(result.serviceName).toBe('Block Explorer');
    });

    it('should handle non-service errors', () => {
      const result = analyzeServiceError('Invalid contract address format');
      expect(result.isServiceError).toBe(false);
      expect(result.serviceType).toBe('rpc'); // Default
      expect(result.serviceName).toBe('RPC Provider');
    });

    it('should handle null/undefined', () => {
      const nullResult = analyzeServiceError(null);
      expect(nullResult.isServiceError).toBe(false);

      const undefinedResult = analyzeServiceError(undefined);
      expect(undefinedResult.isServiceError).toBe(false);
    });
  });
});
