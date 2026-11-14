import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  AddressField,
  AmountField,
  Button,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
  type ReadOnlyMode,
} from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';

interface ReadOnlySaveValues {
  name: string;
  notes: string;
  threshold: number | string;
  cap: string | null;
  owner: string;
  role: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
];

const MODES: ReadonlyArray<{ value: ReadOnlyMode; label: string }> = [
  { value: 'readonly', label: 'readonly' },
  { value: 'disabled', label: 'disabled (today)' },
];

/**
 * ReadOnlySaveDemo - the focusable read-only mode (`readOnlyMode="readonly"`) during a save.
 *
 * "Simulate save" (or Enter in a single-line field) flips the form read-only, then reads the
 * payload through `handleSubmit` while the fields are read-only, the way an app's save does.
 * The save stays on until "Finish save" so scripted checks and screenshots don't race a timer.
 * The mode switch shows today's `disabled` behaviour next to it: focus leaves the text-like
 * fields and their read-only values drop out of the payload. SelectField ignores `readOnly` in
 * that mode, as it always has, so it stays editable and its value stays in the payload.
 *
 * The `data-testid`s are stable hooks for browser checks against the running app.
 */
export function ReadOnlySaveDemo(): React.ReactElement {
  const { capabilities, sampleAddresses, ecosystem } = useEcosystem();
  const symbol = ecosystem === 'evm' ? 'ETH' : 'XLM';
  const ownerAddress = sampleAddresses.wallet ?? '';

  const [mode, setMode] = useState<ReadOnlyMode>('readonly');
  const [saving, setSaving] = useState(false);
  const [saveRequested, setSaveRequested] = useState(false);
  const [payload, setPayload] = useState<ReadOnlySaveValues | null>(null);

  const form = useForm<ReadOnlySaveValues>({
    defaultValues: {
      name: 'Treasury',
      notes: 'Multisig for protocol fees.',
      threshold: 3,
      cap: '1.50',
      owner: ownerAddress,
      role: 'operator',
    },
  });

  // Re-seed the owner when the ecosystem (and so the sample address) changes.
  useEffect(() => {
    form.setValue('owner', ownerAddress);
  }, [form, ownerAddress]);

  // Read the payload after the read-only render has committed. Child effects (the fields'
  // RHF registration) run first, so in `disabled` mode the names are already in RHF's
  // disabled set here, exactly as in an app that submits while its form is locked.
  useEffect(() => {
    if (!saveRequested) return;
    setSaveRequested(false);
    void form.handleSubmit((values) => setPayload(values))();
  }, [saveRequested, form]);

  const onSave = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // The kit doesn't block a second implicit Enter submit during a save; the app does.
    if (saving) return;
    setPayload(null);
    setSaving(true);
    setSaveRequested(true);
  };

  const common = { control: form.control, readOnly: saving, readOnlyMode: mode };

  return (
    <section
      className="mt-8 space-y-4"
      aria-labelledby="readonly-save-heading"
      data-testid="readonly-save-demo"
    >
      <div className="space-y-1">
        <h3 id="readonly-save-heading" className="text-lg font-medium">
          Read-only while saving
        </h3>
        <p className="text-muted-foreground text-sm">
          With <code>readOnlyMode=&quot;readonly&quot;</code>, <code>readOnly</code> keeps a field
          focusable and selectable, blocks edits, and keeps its value in the submitted data. Focus a
          field and press Enter, or click Simulate save, then try typing, Escape or the arrow keys.
        </p>
      </div>

      <div
        role="group"
        aria-label="Read-only mode"
        className="flex items-center gap-2"
        data-testid="readonly-save-mode"
      >
        <span className="text-muted-foreground text-sm">readOnlyMode:</span>
        {MODES.map((m) => (
          <Button
            key={m.value}
            type="button"
            size="sm"
            variant={mode === m.value ? 'default' : 'outline'}
            aria-pressed={mode === m.value}
            disabled={saving}
            onClick={() => setMode(m.value)}
            data-testid={`readonly-save-mode-${m.value}`}
          >
            {m.label}
          </Button>
        ))}
      </div>

      <form onSubmit={onSave} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <TextField id="roName" name="name" label="Name" {...common} />
          <NumberField
            id="roThreshold"
            name="threshold"
            label="Threshold"
            helperText="Arrow keys step by 1 when editable"
            min={1}
            max={10}
            {...common}
          />
          <AmountField
            id="roCap"
            name="cap"
            label="Cap"
            helperText="Formats to 2 decimals on blur when editable"
            symbol={symbol}
            {...common}
          />
          <AddressField
            id="roOwner"
            name="owner"
            label="Owner"
            addressing={capabilities ?? undefined}
            suggestions={[{ label: 'Sample wallet', value: ownerAddress }]}
            {...common}
          />
          <SelectField id="roRole" name="role" label="Role" options={ROLE_OPTIONS} {...common} />
        </div>
        <TextAreaField id="roNotes" name="notes" label="Notes" rows={2} {...common} />

        <div className="flex items-center justify-end gap-4">
          <p className="text-muted-foreground text-sm" data-testid="readonly-save-status">
            {saving ? 'Saving…' : 'Idle'}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={!saving}
            onClick={() => setSaving(false)}
            data-testid="readonly-save-finish"
          >
            Finish save
          </Button>
          <Button type="submit" disabled={saving} data-testid="readonly-save-submit">
            Simulate save
          </Button>
        </div>
      </form>

      {payload && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Payload read during the save</h4>
          <pre
            className="bg-muted overflow-x-auto rounded-md p-4 text-xs"
            data-testid="readonly-save-payload"
          >
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
