export type CreatePreset = 'minimal' | 'dapp' | 'app-shell' | 'wizard';
export type CreateEcosystem = 'evm';
export type CreateWallet = 'none' | 'custom' | 'rainbowkit';
export type CreateRouting = 'none' | 'react-router';
export type CreateLayout = 'plain' | 'topbar' | 'sidebar-shell';
export type CreateContent = 'landing' | 'dapp-dashboard' | 'wizard';
export type CreateFeature =
  | 'wallet'
  | 'router'
  | 'sidebar'
  | 'theme'
  | 'toasts'
  | 'tooltips'
  | 'wizard'
  | 'status-panel';

export interface CreateUserOptions {
  projectName: string;
  targetDirectory?: string;
  preset?: CreatePreset;
  ecosystem?: CreateEcosystem;
  wallet?: CreateWallet;
  routing?: CreateRouting;
  withFeatures?: CreateFeature[];
  withoutFeatures?: CreateFeature[];
  packageManager?: 'npm' | 'pnpm' | 'yarn';
  skipInstall?: boolean;
  force?: boolean;
}

export interface ResolvedCreateOptions {
  projectName: string;
  projectRoot: string;
  preset: CreatePreset;
  ecosystem: CreateEcosystem;
  wallet: CreateWallet;
  routing: CreateRouting;
  features: CreateFeature[];
  packageManager: 'npm' | 'pnpm' | 'yarn';
  skipInstall: boolean;
  force: boolean;
  impliedFeatures: Record<CreateFeature, string>;
}

export interface CreateFile {
  path: string;
  content: string;
}

export interface CreateNavigationItem {
  label: string;
  path?: string;
  disabled?: boolean;
  badge?: string;
  href?: string;
}

export interface CreateNavigationSection {
  title: string;
  items: CreateNavigationItem[];
}

export interface CreateAppSpec {
  preset: CreatePreset;
  layout: CreateLayout;
  content: CreateContent;
  title: string;
  subtitle: string | null;
  features: CreateFeature[];
  wallet: CreateWallet;
  routing: CreateRouting;
  hasWallet: boolean;
  hasRouter: boolean;
  hasSidebar: boolean;
  hasTheme: boolean;
  hasToasts: boolean;
  hasTooltips: boolean;
  hasWizard: boolean;
  hasStatusPanel: boolean;
  requiresLogoAsset: boolean;
  navigation: CreateNavigationSection[];
}

export interface CreateScaffoldResult {
  projectName: string;
  projectRoot: string;
  preset: CreatePreset;
  ecosystem: CreateEcosystem;
  wallet: CreateWallet;
  routing: CreateRouting;
  features: CreateFeature[];
  impliedFeatures: Record<CreateFeature, string>;
  filesWritten: string[];
  filesSkipped: string[];
  packageManager: 'npm' | 'pnpm' | 'yarn';
  installCommand: string | null;
  installRan: boolean;
  nextSteps: string[];
}
