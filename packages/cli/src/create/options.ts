import path from 'node:path';

import { detectPackageManager } from '../utils/framework';
import type {
  CreateFeature,
  CreatePreset,
  CreateUserOptions,
  ResolvedCreateOptions,
} from './types';

const PRESETS = ['minimal', 'dapp', 'app-shell', 'wizard'] as const;
const ECOSYSTEMS = ['evm'] as const;
const WALLETS = ['none', 'custom', 'rainbowkit'] as const;
const ROUTING = ['none', 'react-router'] as const;
const FEATURES = [
  'wallet',
  'router',
  'sidebar',
  'theme',
  'toasts',
  'tooltips',
  'wizard',
  'status-panel',
] as const;

const PRESET_FEATURES: Record<CreatePreset, CreateFeature[]> = {
  minimal: ['theme', 'toasts', 'tooltips'],
  dapp: ['wallet', 'theme', 'toasts', 'tooltips', 'status-panel'],
  'app-shell': ['wallet', 'router', 'sidebar', 'theme', 'toasts', 'tooltips', 'status-panel'],
  wizard: ['wallet', 'theme', 'toasts', 'tooltips', 'wizard', 'status-panel'],
};

function assertOneOf<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (allowed.includes(value as T)) return value as T;
  throw new Error(`Unsupported ${label} "${value}". Expected one of: ${allowed.join(', ')}`);
}

/**
 *
 */
export function parseFeatureList(value: string | string[] | undefined): CreateFeature[] {
  if (!value) return [];
  const rawValues = Array.isArray(value) ? value : [value];
  return rawValues.flatMap((entry) =>
    entry
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => assertOneOf(item, FEATURES, 'feature'))
  );
}

function normalizeProjectName(projectName: string): string {
  const trimmed = projectName.trim();
  if (!trimmed) {
    throw new Error('Project name is required.');
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Project name must be a directory name, not a path.');
  }
  return trimmed;
}

function uniqueFeatures(features: Iterable<CreateFeature>): CreateFeature[] {
  return [...new Set(features)];
}

/**
 *
 */
export function resolveCreateOptions(options: CreateUserOptions): ResolvedCreateOptions {
  const projectName = normalizeProjectName(options.projectName);
  const preset = options.preset ?? 'dapp';
  const ecosystem = options.ecosystem ?? 'evm';
  const requestedWallet = options.wallet ?? (preset === 'minimal' ? 'none' : 'custom');
  const targetDirectory = path.resolve(options.targetDirectory ?? process.cwd());
  const projectRoot = path.join(targetDirectory, projectName);
  const presetValue = assertOneOf(preset, PRESETS, 'preset');
  const ecosystemValue = assertOneOf(ecosystem, ECOSYSTEMS, 'ecosystem');
  const walletValue = assertOneOf(requestedWallet, WALLETS, 'wallet');
  const withFeatures = uniqueFeatures(options.withFeatures ?? []);
  const withoutFeatures = uniqueFeatures(options.withoutFeatures ?? []);

  for (const feature of withFeatures) {
    if (withoutFeatures.includes(feature)) {
      throw new Error(`Feature "${feature}" cannot be both included and excluded.`);
    }
  }

  if (withoutFeatures.includes('wallet') && walletValue !== 'none') {
    throw new Error(`Cannot use --without wallet with --wallet ${walletValue}.`);
  }

  const impliedFeatures: Record<CreateFeature, string> = {} as Record<CreateFeature, string>;
  const featureSet = new Set<CreateFeature>(PRESET_FEATURES[presetValue]);

  for (const feature of withFeatures) featureSet.add(feature);
  for (const feature of withoutFeatures) featureSet.delete(feature);

  if (walletValue !== 'none') {
    featureSet.add('wallet');
  } else {
    featureSet.delete('wallet');
  }

  if (featureSet.has('sidebar') && !featureSet.has('router')) {
    featureSet.add('router');
    impliedFeatures.router = 'sidebar requires route-aware navigation';
  }

  if (presetValue === 'app-shell' && !featureSet.has('router')) {
    featureSet.add('router');
    impliedFeatures.router = 'app-shell uses sidebar navigation';
  }

  if (presetValue === 'wizard') {
    featureSet.add('wizard');
  }

  const requestedRouting = options.routing ?? (featureSet.has('router') ? 'react-router' : 'none');
  const routingValue = assertOneOf(requestedRouting, ROUTING, 'routing');

  if (routingValue === 'react-router') {
    featureSet.add('router');
  }

  if (routingValue === 'none' && featureSet.has('router')) {
    throw new Error('Cannot disable routing while the resolved scaffold includes router/sidebar.');
  }

  return {
    projectName,
    projectRoot,
    preset: presetValue,
    ecosystem: ecosystemValue,
    wallet: featureSet.has('wallet') ? walletValue : 'none',
    routing: featureSet.has('router') ? 'react-router' : routingValue,
    features: uniqueFeatures(featureSet).sort(),
    packageManager: options.packageManager ?? detectPackageManager(targetDirectory),
    skipInstall: Boolean(options.skipInstall),
    force: Boolean(options.force),
    impliedFeatures,
  };
}
