import { useMainnetL1FallbackOptIn } from '../context/mainnetL1FallbackOptInContext';
import { networkLabel } from './networkOptions';

/**
 * Reference integrator pattern for runtime opt-in. Toggling recreates runtimes
 * via RuntimeProvider registry flush; when enabled, cross-network fallback
 * provenance drives disclaimer copy on forward (AddressField) and reverse
 * (AddressDisplay) surfaces.
 *
 * The opt-in is app-wide shared state, so this control stays in sync wherever it
 * is mounted (the Name Resolution demo and the AddressField/AddressDisplay
 * gallery pages). Rendering it next to the {@link NameResolutionNetworkHint}
 * banner keeps the "toggle above" copy accurate on every page.
 */
export function MainnetL1FallbackOptInToggle(): React.ReactElement {
  const { enabled, setEnabled } = useMainnetL1FallbackOptIn();
  const checkboxId = 'ens-mainnet-l1-miss-fallback-opt-in';

  return (
    <div className="bg-muted/30 mb-4 space-y-2 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="mt-1 size-4 shrink-0"
          aria-describedby={`${checkboxId}-helper`}
        />
        <div className="space-y-1">
          <label htmlFor={checkboxId} className="text-sm font-medium leading-none">
            Allow mainnet fallback when name not found on connected network
          </label>
          <p id={`${checkboxId}-helper`} className="text-muted-foreground text-xs">
            Opt in to cross-network ENS lookup when a record is missing on the bound network (e.g.
            resolving <code className="bg-muted rounded px-1">vitalik.eth</code> on{' '}
            <span className="font-medium">{networkLabel('ethereum-sepolia')}</span>). When results
            include fallback provenance, AddressField shows a muted note (unless suppressed) and
            AddressDisplay shows an amber triangle-alert with tooltip. Toggling re-resolves forward
            and reverse results immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
