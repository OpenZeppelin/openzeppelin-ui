import { useState } from 'react';

import { AddressListField } from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';
import { DemoSection } from './DemoSection';
import { EcosystemIndicator } from './EcosystemIndicator';

/**
 * Demonstrates bulk address paste, validation, and list management via {@link AddressListField}.
 */
export function AddressListFieldDemo(): React.ReactElement {
  const { capabilities, sampleAddresses, metadata, isLoading } = useEcosystem();
  const [addresses, setAddresses] = useState<string[]>([]);

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
      description="Bulk-paste multiple blockchain addresses with delimiter parsing, live validation preview, and removable list rows. Pass chain-specific placeholder and format guidance from your app copy layer."
      codeExample={`import { useState } from 'react';
import { AddressListField } from '@openzeppelin/ui-components';
import { useEcosystem } from './context';

const { capabilities, sampleAddresses } = useEcosystem();
const [addresses, setAddresses] = useState<string[]>([]);

<AddressListField
  value={addresses}
  onChange={setAddresses}
  placeholder="Paste addresses (one per line or comma-separated)"
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
          placeholder="Paste addresses (one per line, or comma-separated)"
          formatHint="Enter one address per line, or separate multiple addresses with commas. Invalid entries are skipped when you add."
          helperText="Try pasting the sample wallet and contract addresses below."
          addressing={capabilities}
          getExplorerUrl={getExplorerUrl}
          maxItems={10}
        />

        <div className="text-muted-foreground space-y-1 text-sm">
          <p className="font-medium text-foreground">Sample addresses to paste</p>
          <p className="font-mono text-xs break-all">{sampleAddresses.wallet}</p>
          <p className="font-mono text-xs break-all">{sampleAddresses.contract}</p>
        </div>
      </div>
    </DemoSection>
  );
}
