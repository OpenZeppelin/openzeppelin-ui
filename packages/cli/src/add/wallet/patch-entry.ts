import { transformEntryFile, type EntryTransformReason } from '../../codemod/entry-transform';

const OZ_PROVIDERS_IMPORT = "import { OzProviders } from './oz/OzProviders';";
const APP_CONFIG_IMPORT = "import { initializeAppConfig } from './oz/config';";

export interface PatchEntryResult {
  /** Project-relative path of the entry file, or null if no candidate was found. */
  entryFile: string | null;
  /** True if any change was written to disk. */
  patched: boolean;
  /** Sub-edits applied to the entry file, useful for the CLI summary output. */
  changes: {
    addedProvidersImport: boolean;
    addedConfigImport: boolean;
    wrappedRenderTree: boolean;
    wrappedAsyncBootstrap: boolean;
  };
  /** Reason why no patch was applied (idempotent skip vs no entry file vs unrecognized shape). */
  reason: EntryTransformReason;
}

/**
 * Patches the project's React entry file (`src/main.tsx` and friends) to wrap
 * the render tree with `<OzProviders>` and run `initializeAppConfig()` before
 * the React render.
 *
 * Delegates to the shared AST-based entry transformer, which is idempotent
 * (skips when `OzProviders`/`RuntimeProvider`/`initializeAppConfig` is already
 * present) and bails without writing on unsupported entry shapes.
 */
export function patchEntryFileForWallet(projectRoot: string): PatchEntryResult {
  const result = transformEntryFile(projectRoot, {
    wrap: {
      importLine: OZ_PROVIDERS_IMPORT,
      components: ['OzProviders'],
      skipIfPresent: ['OzProviders', 'RuntimeProvider'],
    },
    asyncInit: {
      importLine: APP_CONFIG_IMPORT,
      initStatement: 'await initializeAppConfig();',
      bootstrapName: 'bootstrap',
      skipIfPresent: ['initializeAppConfig', 'appConfigService'],
    },
  });

  return {
    entryFile: result.entryFile,
    patched: result.patched,
    changes: {
      addedProvidersImport: result.changes.addedWrapImport,
      addedConfigImport: result.changes.addedInitImport,
      wrappedRenderTree: result.changes.wrappedRenderTree,
      wrappedAsyncBootstrap: result.changes.injectedInit || result.changes.createdBootstrap,
    },
    reason: result.reason,
  };
}
