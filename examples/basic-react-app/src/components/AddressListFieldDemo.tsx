import { useState } from 'react';

import { AddressListField } from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';
import { DemoSection } from './DemoSection';
import { EcosystemIndicator } from './EcosystemIndicator';

/**
 * Demonstrates single/bulk address entry, validation, list management, and the
 * `defaultEntryMode` / `allowModeToggle` props via {@link AddressListField}.
 */
export function AddressListFieldDemo(): React.ReactElement {
  const { capabilities, sampleAddresses, metadata, isLoading } = useEcosystem();
  const [addresses, setAddresses] = useState<string[]>([]);
  const [lockedAddresses, setLockedAddresses] = useState<string[]>([]);

  if (isLoading || !capabilities || !metadata) {
    return (
      <DemoSection title="AddressListField" description="Loading...">
        <div className="text-muted-foreground">Loading runtime...</div>
      </DemoSection>
    );
  }

  const getExplorerUrl = (address: string): string | undefined => {
    try {
      return capabilities.getExplorerUrl(address) ?? undefined;
    } catch {
      return undefined;
    }
  };

  return (
    <DemoSection
      title="AddressListField"
      description="Add addresses one at a time (with address-book suggestions) or toggle bulk paste for delimiter-aware multi-add. Only one entry mode is active at a time."
      codeExample={`import { useState } from 'react';
import { AddressListField } from '@openzeppelin/ui-components';
import { useEcosystem } from './context';

const { capabilities, sampleAddresses } = useEcosystem();
const [addresses, setAddresses] = useState<string[]>([]);

<AddressListField
  value={addresses}
  onChange={setAddresses}
  placeholder="Enter an account address"
  bulkPlaceholder="Paste addresses (one per line or comma-separated)"
  formatHint="Each entry is validated before it is added."
  addressing={capabilities}
  getExplorerUrl={(addr) => capabilities.getExplorerUrl(addr) ?? undefined}
  maxItems={10}
/>`}
    >
      <EcosystemIndicator
        description="Address validation uses the active ecosystem addressing capability."
        className="mb-6"
      />

      <div className="max-w-2xl space-y-4">
        <AddressListField
          value={addresses}
          onChange={setAddresses}
          label="Allowed addresses"
          placeholder="Enter an account address"
          bulkPlaceholder="Paste addresses (one per line, or comma-separated)"
          formatHint="Enter one address per line, or separate multiple addresses with commas. Invalid entries are skipped when you add."
          helperText="Start with single-address entry, or use “Bulk paste” for bulk import."
          addressing={capabilities}
          getExplorerUrl={getExplorerUrl}
          maxItems={10}
        />

        <div className="text-muted-foreground space-y-1 text-sm">
          <p className="font-medium text-foreground">Sample addresses to paste</p>
          <p className="font-mono text-xs break-all">{sampleAddresses.wallet}</p>
          <p className="font-mono text-xs break-all">{sampleAddresses.contract}</p>
        </div>

        <div className="space-y-2 border-t border-border/60 pt-6">
          <p className="text-sm font-medium text-foreground">
            Locked to bulk paste (no mode toggle)
          </p>
          <p className="text-muted-foreground text-sm">
            Use <code className="font-mono text-xs">defaultEntryMode</code> to pick the view on
            mount and <code className="font-mono text-xs">allowModeToggle={'{false}'}</code> to hide
            the toggle entirely.
          </p>
          <AddressListField
            value={lockedAddresses}
            onChange={setLockedAddresses}
            placeholder="Paste addresses (one per line, or comma-separated)"
            formatHint="Bulk-only field — the single-entry toggle is hidden."
            addressing={capabilities}
            getExplorerUrl={getExplorerUrl}
            defaultEntryMode="bulk"
            allowModeToggle={false}
            maxItems={10}
          />
        </div>
      </div>
    </DemoSection>
  );
}
