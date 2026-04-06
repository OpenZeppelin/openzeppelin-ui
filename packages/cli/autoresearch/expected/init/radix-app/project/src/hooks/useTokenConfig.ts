import { useState } from 'react';

interface TokenConfig {
  standard: string;
  mintable: boolean;
  burnable: boolean;
  pausable: boolean;
  accessControl: 'ownable' | 'roles';
}

export function useTokenConfig(defaults?: Partial<TokenConfig>) {
  const [config, setConfig] = useState<TokenConfig>({
    standard: 'erc20',
    mintable: false,
    burnable: false,
    pausable: true,
    accessControl: 'ownable',
    ...defaults,
  });

  const update = <K extends keyof TokenConfig>(key: K, value: TokenConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return { config, update };
}
