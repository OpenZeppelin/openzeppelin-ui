import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function DropdownActions() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="px-3 py-1 border rounded">Actions</button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="bg-white border rounded-md shadow-lg p-1">
        <DropdownMenu.Item className="px-3 py-2 hover:bg-gray-100 rounded cursor-pointer">
          Deploy
        </DropdownMenu.Item>
        <DropdownMenu.Item className="px-3 py-2 hover:bg-gray-100 rounded cursor-pointer">
          Upgrade
        </DropdownMenu.Item>
        <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
        <DropdownMenu.Item className="px-3 py-2 hover:bg-red-100 text-red-600 rounded cursor-pointer">
          Pause
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
