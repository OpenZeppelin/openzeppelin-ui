/**
 * Config loading utilities for wallet kit configurations.
 * Uses Vite's import.meta.glob for dynamic loading.
 */

export const kitConfigSourceImporters = import.meta.glob('../../config/wallet/*.config.ts', {
  as: 'raw',
});

export const kitConfigModuleImporters = import.meta.glob('../../config/wallet/*.config.ts');

export async function loadKitConfigSource(kitName: string): Promise<string | null> {
  const importer = kitConfigSourceImporters[`../../config/wallet/${kitName}.config.ts`];
  if (!importer) return null;
  try {
    return (await importer()) as string;
  } catch {
    return null;
  }
}

export async function loadKitConfigModule(
  kitName: string
): Promise<Record<string, unknown> | null> {
  const importer = kitConfigModuleImporters[`../../config/wallet/${kitName}.config.ts`];
  if (!importer) return null;
  try {
    const mod = (await importer()) as { default?: Record<string, unknown> } & Record<
      string,
      unknown
    >;
    return mod.default || mod;
  } catch {
    return null;
  }
}

export function buildAppliedConfigSnippet(kitName: string): string {
  return `import type { UiKitConfiguration } from '@openzeppelin/ui-types';
import { useWalletState } from '@openzeppelin/ui-react';

export function KitSwitcher() {
  const { reconfigureActiveAdapterUiKit } = useWalletState();

  const config: Partial<UiKitConfiguration> = {
    kitName: '${kitName}',
  };

  return (
    <button onClick={() => reconfigureActiveAdapterUiKit(config)}>
      Switch kit
    </button>
  );
}`;
}
