import { AddressDisplay, DescriptionList } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

const REVIEW_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

/**
 * Demonstrates DescriptionList on a review screen, with a composed AddressDisplay value,
 * and its stacked, multi-column, span, divider and end-aligned layouts.
 */
export function DescriptionListDemo(): React.ReactElement {
  return (
    <DemoSection
      title="DescriptionList"
      description="Label/value pairs with term and definition semantics. By default values stack under their labels on narrow widths; layout, columns, valueAlign, dividers and per-item span suit review and summary screens."
      codeExample={`import { AddressDisplay, DescriptionList } from '@openzeppelin/ui-components';

<DescriptionList
  items={[
    { label: 'Network', value: 'Ethereum Mainnet' },
    { label: 'Recipient', value: <AddressDisplay address="0x742d…" showCopyButton /> },
    { label: 'Amount', value: '1,250.00 USDC' },
    { label: 'Memo', value: '' }, // shows the placeholder
  ]}
/>

// Label above value, two columns from the sm breakpoint, values at the end
<DescriptionList layout="stacked" columns={2} valueAlign="end" items={items} />

// Receipt rows: label at the start, value at the end
<DescriptionList valueAlign="end" items={items} />

// Five columns with a full-row span and vertical rules between columns
<DescriptionList
  layout="stacked"
  columns={5}
  items={[
    ...pairs,
    { label: 'Notes', value: 'Spans the full row', span: true },
  ]}
/>

// Single column without horizontal rules
<DescriptionList dividers={false} items={items} />`}
    >
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Default layout</h3>
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
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Inline label width in a narrow card</h3>
        <div className="max-w-xs rounded-lg border p-4" data-testid="description-list-label-width">
          <DescriptionList
            items={[
              {
                label: 'Settlement destination network',
                value: 'Eth',
              },
              { label: 'Amount', value: '1,250.00 USDC' },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Stacked, two columns, values at the end</h3>
        <div className="rounded-lg border p-4" data-testid="description-list-stacked-columns">
          <DescriptionList
            layout="stacked"
            columns={2}
            valueAlign="end"
            items={[
              { label: 'Network', value: 'Ethereum Mainnet' },
              {
                label: 'Recipient',
                value: <AddressDisplay address={REVIEW_ADDRESS} showCopyButton />,
              },
              { label: 'Amount', value: '1,250.00 USDC' },
              { label: 'Estimated fee', value: '0.0021 ETH' },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Values at the end</h3>
        <div className="rounded-lg border p-4" data-testid="description-list-end-aligned">
          <DescriptionList
            valueAlign="end"
            items={[
              { label: 'Subtotal', value: '1,250.00 USDC' },
              { label: 'Estimated fee', value: '0.0021 ETH' },
              { label: 'Total', value: <strong>1,250.00 USDC + 0.0021 ETH</strong> },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Stacked, three columns</h3>
        <div className="rounded-lg border p-4" data-testid="description-list-three-columns">
          <DescriptionList
            layout="stacked"
            columns={3}
            items={[
              { label: 'Status', value: 'Active' },
              { label: 'Created', value: '2026-11-13' },
              { label: 'Owner', value: <AddressDisplay address={REVIEW_ADDRESS} /> },
              { label: 'Threshold', value: '2 of 3' },
              { label: 'Members', value: '3' },
              { label: 'Notes', value: '' },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Five columns with a full-row span</h3>
        <div className="rounded-lg border p-4" data-testid="description-list-five-columns-span">
          <DescriptionList
            layout="stacked"
            columns={5}
            items={[
              { label: 'A', value: '1' },
              { label: 'B', value: '2' },
              { label: 'C', value: '3' },
              { label: 'D', value: '4' },
              { label: 'E', value: '5' },
              {
                label: 'Settlement note',
                value: 'This pair spans the full row under the five columns.',
                span: true,
              },
              { label: 'F', value: '6' },
              { label: 'G', value: '7' },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Single column without dividers</h3>
        <div className="rounded-lg border p-4" data-testid="description-list-no-dividers">
          <DescriptionList
            dividers={false}
            items={[
              { label: 'Network', value: 'Ethereum Mainnet' },
              { label: 'Amount', value: '1,250.00 USDC' },
              { label: 'Memo', value: 'No horizontal rules between these pairs' },
            ]}
          />
        </div>
      </div>
    </DemoSection>
  );
}
