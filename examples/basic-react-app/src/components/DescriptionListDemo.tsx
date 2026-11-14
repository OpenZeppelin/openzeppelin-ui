import { AddressDisplay, DescriptionList } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

const REVIEW_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

/** Demonstrates DescriptionList on a review screen, with a composed AddressDisplay value. */
export function DescriptionListDemo(): React.ReactElement {
  return (
    <DemoSection
      title="DescriptionList"
      description="Label/value pairs with term and definition semantics. Values stack under their labels on narrow widths."
      codeExample={`import { AddressDisplay, DescriptionList } from '@openzeppelin/ui-components';

<DescriptionList
  items={[
    { label: 'Network', value: 'Ethereum Mainnet' },
    { label: 'Recipient', value: <AddressDisplay address="0x742d…" showCopyButton /> },
    { label: 'Amount', value: '1,250.00 USDC' },
    { label: 'Memo', value: '' }, // shows the placeholder
  ]}
/>`}
    >
      <div className="rounded-lg border p-4" data-testid="description-list-review">
        <DescriptionList
          items={[
            { label: 'Network', value: 'Ethereum Mainnet' },
            {
              label: 'Recipient',
              value: <AddressDisplay address={REVIEW_ADDRESS} showCopyButton />,
            },
            { label: 'Amount', value: '1,250.00 USDC' },
            { label: 'Estimated fee', value: '0.0021 ETH' },
            { label: 'Memo', value: '' },
          ]}
        />
      </div>
    </DemoSection>
  );
}
