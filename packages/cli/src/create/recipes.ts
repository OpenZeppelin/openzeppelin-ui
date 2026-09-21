import type {
  CreateAppSpec,
  CreateContent,
  CreateLayout,
  CreateNavigationSection,
  ResolvedCreateOptions,
} from './types';

function resolveContent(options: ResolvedCreateOptions): CreateContent {
  if (options.preset === 'wizard' || options.features.includes('wizard')) return 'wizard';
  if (options.preset === 'minimal') return 'landing';
  return 'dapp-dashboard';
}

function resolveLayout(options: ResolvedCreateOptions): CreateLayout {
  if (options.features.includes('sidebar')) return 'sidebar-shell';
  if (options.preset === 'minimal') return 'plain';
  return 'topbar';
}

function navigationFor(layout: CreateLayout, content: CreateContent): CreateNavigationSection[] {
  if (layout !== 'sidebar-shell') return [];

  if (content === 'wizard') {
    return [
      {
        title: 'Workflow',
        items: [
          { label: 'Wizard', path: '/', disabled: false },
          { label: 'Review', disabled: true, badge: 'Soon' },
        ],
      },
      {
        title: 'Resources',
        items: [{ label: 'Documentation', href: 'https://docs.openzeppelin.com/ui-builder' }],
      },
    ];
  }

  return [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/' },
        { label: 'Activity', path: '/activity' },
        { label: 'Deployments', path: '/deployments' },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { label: 'Contracts', path: '/contracts' },
        { label: 'Workflows', path: '/workflows' },
        { label: 'Team', path: '/team' },
        { label: 'Settings', path: '/settings' },
      ],
    },
    {
      title: 'Resources',
      items: [
        { label: 'Documentation', href: 'https://docs.openzeppelin.com/ui-builder' },
        { label: 'Templates', disabled: true, badge: 'Soon' },
      ],
    },
  ];
}

function titleFor(content: CreateContent): string {
  if (content === 'wizard') return 'OpenZeppelin UI wizard';
  return 'OpenZeppelin UI app';
}

function subtitleFor(content: CreateContent): string | null {
  if (content === 'wizard') return 'Guided workflow starter';
  if (content === 'dapp-dashboard') return 'Vite + React starter';
  return null;
}

/**
 * Converts validated CLI options into the normalized recipe used by file templates.
 */
export function resolveCreateAppSpec(options: ResolvedCreateOptions): CreateAppSpec {
  const layout = resolveLayout(options);
  const content = resolveContent(options);
  const hasSidebar = layout === 'sidebar-shell';
  const hasWizard = content === 'wizard';

  return {
    preset: options.preset,
    layout,
    content,
    title: titleFor(content),
    subtitle: subtitleFor(content),
    features: options.features,
    wallet: options.wallet,
    routing: options.routing,
    hasWallet: options.features.includes('wallet'),
    hasRouter: options.features.includes('router'),
    hasSidebar,
    hasTheme: options.features.includes('theme'),
    hasToasts: options.features.includes('toasts'),
    hasTooltips: options.features.includes('tooltips'),
    hasWizard,
    hasStatusPanel: options.features.includes('status-panel'),
    requiresLogoAsset: layout !== 'plain',
    navigation: navigationFor(layout, content),
  };
}
