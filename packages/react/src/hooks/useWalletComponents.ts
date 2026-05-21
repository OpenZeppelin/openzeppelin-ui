import type { EcosystemWalletComponents } from '@openzeppelin/ui-types';

import { useWalletState } from './WalletStateContext';

/**
 * Hook that provides direct access to wallet UI components from the active runtime.
 *
 * Use this hook when you need full control over the layout and composition of
 * wallet components. For standard layouts, prefer using `WalletConnectionUI`
 * with its props forwarding capabilities.
 *
 * @returns The wallet components object, or null if no runtime is active or
 *          the runtime doesn't provide wallet components.
 *
 * @example
 * ```tsx
 * import { useWalletComponents } from '@openzeppelin/ui-react';
 *
 * function CustomWalletSection() {
 *   const walletComponents = useWalletComponents();
 *
 *   if (!walletComponents) {
 *     return <p>Loading wallet...</p>;
 *   }
 *
 *   const { ConnectButton, NetworkSwitcher, AccountDisplay } = walletComponents;
 *
 *   return (
 *     <div className="flex flex-col gap-4">
 *       {ConnectButton && (
 *         <ConnectButton
 *           size="xl"
 *           variant="outline"
 *           fullWidth
 *           className="font-semibold"
 *         />
 *       )}
 *       <div className="flex gap-2">
 *         {NetworkSwitcher && <NetworkSwitcher size="sm" />}
 *         {AccountDisplay && <AccountDisplay size="sm" />}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWalletComponents(): EcosystemWalletComponents | null {
  const { activeNetworkConfig, activeRuntime, isRuntimeLoading } = useWalletState();
  const activeUiKit = activeRuntime?.uiKit;
  const isCrossEcosystemTransition = !!(
    isRuntimeLoading &&
    activeRuntime?.networkConfig?.ecosystem &&
    activeNetworkConfig?.ecosystem &&
    activeRuntime.networkConfig.ecosystem !== activeNetworkConfig.ecosystem
  );

  if (
    isCrossEcosystemTransition ||
    !activeUiKit ||
    typeof activeUiKit.getEcosystemWalletComponents !== 'function'
  ) {
    return null;
  }

  try {
    return activeUiKit.getEcosystemWalletComponents() ?? null;
  } catch {
    return null;
  }
}
