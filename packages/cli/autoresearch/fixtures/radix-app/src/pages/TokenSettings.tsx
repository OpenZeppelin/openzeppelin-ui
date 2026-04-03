import React from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as RadioGroup from '@radix-ui/react-radio-group';
import * as Select from '@radix-ui/react-select';
import * as Label from '@radix-ui/react-label';
import * as Popover from '@radix-ui/react-popover';

export function TokenSettings() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label.Root htmlFor="token-name">Token Standard</Label.Root>
        <Select.Root defaultValue="erc20">
          <Select.Trigger className="border p-2 rounded">
            <Select.Value placeholder="Choose standard" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="erc20">ERC-20</Select.Item>
            <Select.Item value="erc721">ERC-721</Select.Item>
            <Select.Item value="erc1155">ERC-1155</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>

      <div className="space-y-2">
        <Label.Root>Features</Label.Root>
        <div className="flex items-center gap-2">
          <Checkbox.Root id="mintable" className="w-5 h-5 border rounded">
            <Checkbox.Indicator>✓</Checkbox.Indicator>
          </Checkbox.Root>
          <Label.Root htmlFor="mintable">Mintable</Label.Root>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox.Root id="burnable" className="w-5 h-5 border rounded">
            <Checkbox.Indicator>✓</Checkbox.Indicator>
          </Checkbox.Root>
          <Label.Root htmlFor="burnable">Burnable</Label.Root>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox.Root id="pausable" className="w-5 h-5 border rounded" defaultChecked>
            <Checkbox.Indicator>✓</Checkbox.Indicator>
          </Checkbox.Root>
          <Label.Root htmlFor="pausable">Pausable</Label.Root>
        </div>
      </div>

      <div className="space-y-2">
        <Label.Root>Access Control</Label.Root>
        <RadioGroup.Root defaultValue="ownable">
          <div className="flex items-center gap-2">
            <RadioGroup.Item value="ownable" id="ownable" className="w-4 h-4 border rounded-full">
              <RadioGroup.Indicator className="block w-2 h-2 bg-blue-600 rounded-full m-auto" />
            </RadioGroup.Item>
            <Label.Root htmlFor="ownable">Ownable</Label.Root>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroup.Item value="roles" id="roles" className="w-4 h-4 border rounded-full">
              <RadioGroup.Indicator className="block w-2 h-2 bg-blue-600 rounded-full m-auto" />
            </RadioGroup.Item>
            <Label.Root htmlFor="roles">Role-Based</Label.Root>
          </div>
        </RadioGroup.Root>
      </div>

      <Popover.Root>
        <Popover.Trigger asChild>
          <button className="text-sm text-blue-600 underline">Advanced options</button>
        </Popover.Trigger>
        <Popover.Content className="bg-white border rounded-lg p-4 shadow-lg">
          <p className="text-sm">Configure gas limits and deployment parameters.</p>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
