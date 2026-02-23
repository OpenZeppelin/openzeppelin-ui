import { Download, Upload } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';

import { OverflowMenu, type OverflowMenuItem } from '@openzeppelin/ui-components';

interface ImportExportBarProps {
  onExport: (ids?: string[]) => Promise<void>;
  onImport: (file: File) => Promise<string[]>;
  exportDisabled?: boolean;
}

/** Bar for importing and exporting address book aliases. */
export function ImportExportBar({ onExport, onImport, exportDisabled }: ImportExportBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await onImport(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [onImport]
  );

  const handleExport = useCallback(async () => {
    await onExport();
  }, [onExport]);

  const items = useMemo<OverflowMenuItem[]>(
    () => [
      {
        id: 'export',
        label: 'Export',
        icon: <Download className="mr-2 h-4 w-4" />,
        disabled: exportDisabled,
        onSelect: handleExport,
      },
      {
        id: 'import',
        label: 'Import',
        icon: <Upload className="mr-2 h-4 w-4" />,
        onSelect: handleImportClick,
      },
    ],
    [exportDisabled, handleExport, handleImportClick]
  );

  return (
    <>
      <OverflowMenu items={items} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
