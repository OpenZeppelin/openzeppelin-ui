/**
 * UI State Store (Zustand)
 *
 * Keeps simple UI state outside React component lifecycle so it survives
 * provider remounts during adapter/network transitions.
 */

import { create } from 'zustand';

/** Valid tab values for the WalletDemo component */
export type WalletDemoTab = 'learn' | 'customize' | 'config' | 'status';

export interface UiState {
  activeDemo: string;
  mobileOpen: boolean;
  /** Currently selected tab in WalletDemo - persists across kit switches */
  walletDemoTab: WalletDemoTab;
}

export interface UiActions {
  setActiveDemo: (demo: string) => void;
  setMobileOpen: (open: boolean) => void;
  setWalletDemoTab: (tab: WalletDemoTab) => void;
}

export type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>((set) => ({
  activeDemo: 'home',
  mobileOpen: false,
  walletDemoTab: 'learn',
  setActiveDemo: (demo) => set({ activeDemo: demo }),
  setMobileOpen: (open) => set({ mobileOpen: open }),
  setWalletDemoTab: (tab) => set({ walletDemoTab: tab }),
}));

/** Selector hook for wallet demo tab */
export const useWalletDemoTab = () => useUiStore((s) => s.walletDemoTab);

/** Selector hook for setting wallet demo tab */
export const useSetWalletDemoTab = () => useUiStore((s) => s.setWalletDemoTab);
