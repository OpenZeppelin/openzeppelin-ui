import type { ReactElement } from 'react';
import { useState } from 'react';

import { EcosystemDropdown, type EcosystemDropdownOption } from '@openzeppelin/ui-components';
import type { Ecosystem } from '@openzeppelin/ui-types';

import { DemoSection } from './DemoSection';

const options: EcosystemDropdownOption[] = [
  { value: 'evm', label: 'EVM', enabled: true },
  { value: 'stellar', label: 'Stellar', enabled: true },
  { value: 'solana', label: 'Solana', enabled: false, disabledLabel: 'Coming soon' },
];

/**
 * Demonstrates EcosystemDropdown: the menu is as wide as its trigger, never narrower than 200px.
 */
export function EcosystemDropdownDemo(): ReactElement {
  const [wide, setWide] = useState<Ecosystem | null>(null);
  const [narrow, setNarrow] = useState<Ecosystem | null>('evm');

  return (
    <DemoSection
      title="EcosystemDropdown"
      description="A simple selector for choosing a blockchain ecosystem. The menu matches the trigger's width and keeps a 200px minimum, so a narrow trigger still gets a readable menu."
      codeExample={`import { EcosystemDropdown } from '@openzeppelin/ui-components';

<EcosystemDropdown
  options={[
    { value: 'evm', label: 'EVM', enabled: true },
    { value: 'solana', label: 'Solana', enabled: false, disabledLabel: 'Coming soon' },
  ]}
  value={ecosystem}
  onValueChange={setEcosystem}
/>`}
    >
      <div className="space-y-6">
        <div className="space-y-2" data-testid="ecosystem-dropdown-wide">
          <h3 className="text-lg font-medium">Wide trigger</h3>
          <div className="w-[420px] max-w-full">
            <EcosystemDropdown options={options} value={wide} onValueChange={setWide} />
          </div>
        </div>
        <div className="space-y-2" data-testid="ecosystem-dropdown-narrow">
          <h3 className="text-lg font-medium">Narrow trigger</h3>
          <div className="w-[120px]">
            <EcosystemDropdown options={options} value={narrow} onValueChange={setNarrow} />
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
