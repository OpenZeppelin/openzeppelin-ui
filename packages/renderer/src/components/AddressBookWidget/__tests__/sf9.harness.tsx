/**
 * SF-9 shared harness: real `RuntimeProvider` + real resolver chain, stub runtime factory.
 * React logs a given render-phase warning once per process, so each warning-asserting
 * test lives in its own test file (its own worker module graph).
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { RuntimeProvider, WalletStateContext } from '@openzeppelin/ui-react';
import type { WalletStateContextValue } from '@openzeppelin/ui-react';
import type {
  EcosystemRuntime,
  NameResolutionCapability,
  NetworkConfig,
  ResolutionResult,
  ResolvedAddress,
} from '@openzeppelin/ui-types';

import { AddAliasDialog } from '../AddAliasDialog';

export { act, fireEvent, screen };

export const ALICE: ResolvedAddress = {
  name: 'alice.eth',
  address: `0x${'a'.repeat(40)}`,
  provenance: { label: 'ENS', external: false },
};

const addressing = { isValidAddress: (v: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(v) };
const isValidName = (n: string): boolean => n.trim().toLowerCase().endsWith('.eth');

export const NETWORKS = [
  { id: 'eip155:1', name: 'Ethereum', type: 'mainnet', ecosystem: 'evm' } as NetworkConfig,
  { id: 'eip155:8453', name: 'Base', type: 'mainnet', ecosystem: 'evm' } as NetworkConfig,
];
const resolveNetwork = (id: string): NetworkConfig | undefined => NETWORKS.find((n) => n.id === id);

export const resolveName = vi.fn(
  async (name: string): Promise<ResolutionResult<ResolvedAddress>> =>
    name === ALICE.name
      ? { ok: true, value: ALICE }
      : { ok: false, error: { code: 'NAME_NOT_FOUND', name } }
);

/**
 *
 */
export function makeRuntimeFactory() {
  return vi.fn(async (networkConfig: NetworkConfig): Promise<EcosystemRuntime> => {
    const nameResolution: NameResolutionCapability = {
      networkConfig,
      dispose: () => undefined,
      isValidName,
      resolveName,
    };
    return { nameResolution, networkConfig, dispose: () => undefined } as EcosystemRuntime;
  });
}

let walletSeq = 0;
function makeWallet(): WalletStateContextValue {
  return {
    activeNetworkId: `eip155:1:sf9-test-${++walletSeq}`, // unique: resolution cache is process-global
    setActiveNetworkId: () => undefined,
    activeNetworkConfig: { name: 'Ethereum' } as NetworkConfig,
    activeRuntime: {
      nameResolution: { networkConfig: {}, dispose: () => undefined, isValidName, resolveName },
    } as unknown as EcosystemRuntime,
    isRuntimeLoading: false,
    walletFacadeHooks: null,
    reconfigureActiveUiKit: () => undefined,
  };
}

const RENDER_PHASE_WARNING = /Cannot update a component .* while rendering a different component/;

/**
 *
 */
export function spyOnConsoleError(): { renderPhaseWarnings: () => unknown[][] } {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  return {
    renderPhaseWarnings: () =>
      spy.mock.calls.filter((args) => RENDER_PHASE_WARNING.test(args.map(String).join(' '))),
  };
}

/**
 *
 */
export async function renderDialog(opts: {
  enableNameResolution?: boolean;
  withRuntimeProvider?: boolean;
  currentNetworkId?: string;
  networks?: NetworkConfig[];
  resolveRuntime?: ReturnType<typeof makeRuntimeFactory>;
  onSave?: ReturnType<typeof vi.fn>;
}): Promise<{
  resolveRuntime: ReturnType<typeof makeRuntimeFactory>;
  onSave: ReturnType<typeof vi.fn>;
}> {
  const {
    enableNameResolution = true,
    withRuntimeProvider = true,
    currentNetworkId,
    networks = NETWORKS,
    resolveRuntime = makeRuntimeFactory(),
    onSave = vi.fn().mockResolvedValue('id-1'),
  } = opts;
  const dialogFor = (open: boolean) => (
    <AddAliasDialog
      open={open}
      onOpenChange={vi.fn()}
      onSave={onSave as never}
      addressing={addressing}
      networks={networks}
      currentNetworkId={currentNetworkId}
      resolveNetwork={resolveNetwork}
      enableNameResolution={enableNameResolution}
    />
  );
  const tree = (open: boolean) =>
    withRuntimeProvider ? (
      <RuntimeProvider resolveRuntime={resolveRuntime}>
        <WalletStateContext.Provider value={wallet}>{dialogFor(open)}</WalletStateContext.Provider>
      </RuntimeProvider>
    ) : (
      dialogFor(open)
    );
  // The app opens the dialog on a click, after the provider has settled; mounting the
  // dialog in the provider's own first commit is not a flow the app has.
  const wallet = makeWallet();
  const { rerender } = render(tree(false));
  await act(async () => {
    await Promise.resolve();
  });
  rerender(tree(true));
  return { resolveRuntime, onSave };
}

export const addressInput = (): HTMLInputElement | null =>
  document.getElementById('new-alias-address') as HTMLInputElement | null;
export const aliasInput = (): HTMLInputElement =>
  document.getElementById('new-alias-name') as HTMLInputElement;
export const addButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: /^Add/ }) as HTMLButtonElement;

/**
 *
 */
export async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}
/**
 *
 */
export async function settle(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(320);
  });
}
