import { describe, expect, it } from 'vitest';

import type { AnalysisReport } from '../analysis';
import { generatePlanTasks, generateSchemaFormTasks } from './generate';

function createReport(): AnalysisReport {
  return {
    version: '1.0.0',
    project: '/tmp/project',
    framework: 'vite',
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: 2,
      componentMatches: 1,
      mappableComponents: 1,
      walletPatterns: 1,
      storagePatterns: 1,
      existingOzPackages: 0,
      estimatedEffort: 'medium',
    },
    components: [
      {
        name: 'Button',
        reportName: 'Button',
        canonicalFamily: 'Button',
        rawNames: ['Button'],
        sourceLibrary: 'shadcn',
        sourceImport: '@/components/ui/button',
        ozTarget: 'Button',
        effort: 'low',
        category: 'ui',
        capabilities: [],
        usageCount: 1,
        files: ['src/App.tsx'],
        notes: 'Near 1:1 API parity',
        detectorKinds: ['library-mapping'],
        confidence: 'high',
        evidences: [
          {
            kind: 'named-import',
            file: 'src/App.tsx',
            usageCount: 1,
            sourceImport: '@/components/ui/button',
            importedName: 'Button',
            localName: 'Button',
            intrinsicTag: null,
            inputType: null,
          },
        ],
      },
    ],
    patterns: [
      {
        pattern: 'wagmi',
        canonicalPattern: 'wagmi',
        category: 'wallet',
        files: ['src/wallet.ts'],
        count: 1,
        description: 'wagmi wallet library',
        variants: ['wagmi'],
        kinds: ['import'],
        confidence: 'high',
        migrationRelevance: 'Wallet stack imports usually require provider migration.',
        evidences: [],
        ruleIds: ['wagmi-import'],
      },
      {
        pattern: 'localStorage',
        canonicalPattern: 'localStorage',
        category: 'storage',
        files: ['src/storage.ts'],
        count: 1,
        description: 'Browser localStorage usage',
        variants: ['localStorage'],
        kinds: ['content'],
        confidence: 'high',
        migrationRelevance: 'Persistent browser storage can affect migration safety.',
        evidences: [],
        ruleIds: ['local-storage-usage'],
      },
    ],
    tailwind: {
      ok: true,
      projectRoot: '/tmp/project',
      appRoot: null,
      cssPath: null,
      generatedCssPath: null,
      sourcePlan: null,
      issues: [],
    },
    sourceLibrary: 'shadcn',
    projectInfo: {
      root: '/tmp/project',
      framework: 'vite',
      scope: null,
      router: null,
      stateManagement: null,
      stylingSystem: 'tailwind',
      existingOzPackages: [],
      designSystemIndicators: [],
      workspacePackages: [],
    },
    componentsByMigration: {
      mappable: [],
      unmappable: [],
    },
    wallet: {
      currentSetup: 'wagmi',
      targetSetup: 'RuntimeProvider + WalletStateProvider + EcosystemRuntime capabilities',
      affectedFiles: ['src/wallet.ts'],
      patterns: [],
      recommendedProfile: 'transactor',
    },
    storage: {
      currentPatterns: [],
      affectedFiles: ['src/storage.ts'],
      localStorageKeys: [],
      rawIndexedDbDatabases: [],
      migratableEntities: [],
    },
    adapters: {
      currentSetup: null,
      affectedFiles: [],
      capabilityTargets: ['ExecutionCapability'],
      patterns: [],
    },
    tailwindAnalysis: {
      currentSetup: 'tailwind-v4',
      missingOzSources: [],
      tokenConflicts: [],
      doctor: {
        ok: true,
        projectRoot: '/tmp/project',
        appRoot: null,
        cssPath: null,
        generatedCssPath: null,
        sourcePlan: null,
        issues: [],
      },
    },
  };
}

describe('generatePlanTasks', () => {
  it('adds validation and dependency metadata to setup tasks', () => {
    const tasks = generatePlanTasks(createReport());
    const setupInstall = tasks.find((task) => task.id === 'setup-install-packages');
    const setupWire = tasks.find((task) => task.id === 'setup-wire-providers');

    expect(setupInstall?.phaseDetail).toBe('foundation');
    expect(setupInstall?.validation?.doctorCheck).toBe('setup-install-packages');
    expect(setupWire?.dependsOn).toEqual(['setup-install-packages']);
  });

  it('adds file lists, dependencies, and manual review markers to generated tasks', () => {
    const tasks = generatePlanTasks(createReport());
    const componentTask = tasks.find((task) => task.type === 'component-replacement');
    const walletTask = tasks.find((task) => task.type === 'wallet-replacement');
    const storageTask = tasks.find((task) => task.type === 'storage-migration');

    expect(componentTask?.files).toEqual(['src/App.tsx']);
    expect(componentTask?.phaseDetail).toBe('ui-primitives');
    expect(componentTask?.dependsOn).toContain('setup-install-packages');
    expect(walletTask?.validation?.command).toContain('wallet-replacement-wagmi-src-wallet.ts');
    expect(walletTask?.phaseDetail).toBe('wallet-and-adapters');
    expect(storageTask?.manualReview).toBe(true);
  });

  it('creates optional schema-form tasks when form and wallet signals overlap', () => {
    const report = createReport();
    report.components.push({
      name: 'Form',
      reportName: 'Form',
      canonicalFamily: 'Form',
      rawNames: ['Form'],
      sourceLibrary: 'shadcn',
      sourceImport: '@/components/ui/form',
      ozTarget: 'Form',
      effort: 'medium',
      category: 'ui',
      capabilities: [],
      usageCount: 1,
      files: ['src/wallet.ts'],
      notes: 'OZ Form uses RenderFormSchema pattern',
      detectorKinds: ['library-mapping'],
      confidence: 'high',
      evidences: [
        {
          kind: 'named-import',
          file: 'src/wallet.ts',
          usageCount: 1,
          sourceImport: '@/components/ui/form',
          importedName: 'Form',
          localName: 'Form',
          intrinsicTag: null,
          inputType: null,
        },
      ],
    });
    report.wallet.affectedFiles = ['src/wallet.ts'];

    const tasks = generateSchemaFormTasks(report);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.phase).toBe('schema-forms');
    expect(tasks[0]?.phaseDetail).toBe('schema-driven-forms');
    expect(tasks[0]?.manualReview).toBe(true);
  });

  it('generates setup-activate-providers task that wallet tasks depend on', () => {
    const report = createReport();
    const tasks = generatePlanTasks(report);

    const activateTask = tasks.find((t) => t.id === 'setup-activate-providers');
    expect(activateTask).toBeDefined();
    expect(activateTask?.type).toBe('activate-providers');
    expect(activateTask?.phase).toBe('setup');
    expect(activateTask?.dependsOn).toContain('setup-wire-providers');

    const walletTasks = tasks.filter((t) => t.type === 'wallet-replacement');
    expect(walletTasks.length).toBeGreaterThan(0);
    for (const wt of walletTasks) {
      expect(wt.dependsOn).toContain('setup-activate-providers');
    }
  });
});
