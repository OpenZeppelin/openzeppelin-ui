/**
 * UI State Store (Zustand)
 *
 * Keeps simple UI state outside React component lifecycle so it survives
 * provider remounts during adapter/network transitions.
 */

import { create } from 'zustand';

export interface UiState {
  activeDemo: string;
  mobileOpen: boolean;
}

export interface UiActions {
  setActiveDemo: (demo: string) => void;
  setMobileOpen: (open: boolean) => void;
}

export type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>((set) => ({
  activeDemo: 'home',
  mobileOpen: false,
  setActiveDemo: (demo) => set({ activeDemo: demo }),
  setMobileOpen: (open) => set({ mobileOpen: open }),
}));
