import { X } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@openzeppelin/ui-components';

export function ConfirmModal({ title, message, onConfirm }: {
  title: string;
  message: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-red-500">Delete</button>
      </DialogTrigger>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
        <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
        <DialogDescription className="text-sm text-gray-500 mt-2">{message}</DialogDescription>
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-1 border rounded" onClick={() => setOpen(false)}>Cancel</button>
          <button onClick={() => { onConfirm(); setOpen(false); }} className="px-3 py-1 bg-red-500 text-white rounded">
            Confirm
          </button>
        </div>
        <button className="absolute top-2 right-2" aria-label="Close" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
