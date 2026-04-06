import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Progress from '@radix-ui/react-progress';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Label from '@radix-ui/react-label';

export function ContractPanel() {
  return (
    <div className="space-y-6">
      <div>
        <Label.Root htmlFor="contract-addr">Contract Address</Label.Root>
        <input id="contract-addr" className="border p-2 rounded w-full" />
      </div>

      <div>
        <Label.Root>Verification Progress</Label.Root>
        <Progress.Root value={45} className="h-2 bg-gray-200 rounded overflow-hidden">
          <Progress.Indicator className="bg-blue-500 h-full" style={{ width: '45%' }} />
        </Progress.Root>
      </div>

      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button className="px-4 py-2 bg-blue-600 text-white rounded">Verify</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Verify contract on explorer</Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>

      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button className="px-4 py-2 border rounded">View ABI</button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
            <Dialog.Title>Contract ABI</Dialog.Title>
            <Dialog.Description>Review the contract ABI below.</Dialog.Description>
            <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto max-h-64">
              {'[\n  { "type": "function", "name": "transfer" }\n]'}
            </pre>
            <Dialog.Close asChild>
              <button className="mt-4 px-4 py-2 bg-gray-200 rounded">Close</button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
