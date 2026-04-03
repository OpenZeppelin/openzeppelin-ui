import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';

export function ConfirmModal({ title, message, onConfirm }: {
  title: string;
  message: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="text-sm text-red-500">Delete</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
          <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
          <Dialog.Description className="text-sm text-gray-500 mt-2">{message}</Dialog.Description>
          <div className="flex justify-end gap-2 mt-4">
            <Dialog.Close asChild>
              <button className="px-3 py-1 border rounded">Cancel</button>
            </Dialog.Close>
            <button onClick={() => { onConfirm(); setOpen(false); }} className="px-3 py-1 bg-red-500 text-white rounded">
              Confirm
            </button>
          </div>
          <Dialog.Close asChild>
            <button className="absolute top-2 right-2" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
