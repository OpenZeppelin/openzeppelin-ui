# BottomSheet — Examples

Copy-paste components that run inside any Vite + React 19 app with the kit installed:

```bash
pnpm add @openzeppelin/ui-components
```

Each example is a single file with no imports other than React and the kit. Drop it into
`src/`, render it from your root, and make sure your Tailwind build scans the kit (see
the package README's *Styling* section) — otherwise the page behind the sheet will not
receive clicks.

## 1. Minimal — `MinimalSheet.tsx`

The smallest correct use: a trigger, controlled `open`, controlled `height` seeded from
the viewport, one accessible name.

```tsx
import { useState } from 'react';
import { BottomSheet, Button, defaultBottomSheetHeight } from '@openzeppelin/ui-components';

export function MinimalSheet() {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(() => defaultBottomSheetHeight(window.innerHeight));

  return (
    <div style={{ padding: 24 }}>
      <Button
        aria-expanded={open}
        aria-controls={open ? 'minimal-sheet' : undefined}
        onClick={() => setOpen(true)}
      >
        Open sheet
      </Button>

      <BottomSheet
        id="minimal-sheet"
        aria-label="Example sheet"
        open={open}
        onOpenChange={setOpen}
        height={height}
        onHeightChange={setHeight}
      >
        <p style={{ padding: 16 }}>Rendered height: {height}px. Drag the top edge.</p>
      </BottomSheet>
    </div>
  );
}
```

## 2. Focus stays in the form — `TypeWhileOpen.tsx`

Demonstrates the non-modal contract. Click into the field, press the button (or Tab to
it and press Enter), and keep typing: the field never loses focus and the sheet mirrors
the text live. Tab from the field reaches the sheet's resize handle and close button;
Shift+Tab comes back.

```tsx
import { useState } from 'react';
import { BottomSheet, Button, defaultBottomSheetHeight } from '@openzeppelin/ui-components';

export function TypeWhileOpen() {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(() => defaultBottomSheetHeight(window.innerHeight));

  return (
    <div style={{ padding: 24, display: 'grid', gap: 12, maxWidth: 400 }}>
      <label>
        Token name
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ display: 'block', width: '100%' }}
        />
      </label>

      <Button
        variant="outline"
        aria-expanded={open}
        aria-controls={open ? 'live-preview' : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Hide preview' : 'Show preview'}
      </Button>

      <BottomSheet
        id="live-preview"
        aria-label="Live preview"
        open={open}
        onOpenChange={setOpen}
        height={height}
        onHeightChange={setHeight}
      >
        <pre style={{ padding: 16 }}>{`[package]\nname = "${text || 'token'}"\n`}</pre>
      </BottomSheet>
    </div>
  );
}
```

## 3. Clamp-and-report — `ClampLog.tsx`

Shows the height contract in action. The buttons feed deliberately bad values into
`height`; the sheet renders a clamped or substituted value and reports it back, and the
log shows both what was requested and what was stored. Resize the window while the sheet
is open to see the viewport rule fire too.

```tsx
import { useState } from 'react';
import { BottomSheet, Button, defaultBottomSheetHeight } from '@openzeppelin/ui-components';

export function ClampLog() {
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(() => defaultBottomSheetHeight(window.innerHeight));
  const [log, setLog] = useState<string[]>([]);

  const request = (label: string, value: number) => {
    setLog((l) => [...l, `requested ${label}`]);
    setHeight(value);
  };

  const onHeightChange = (reported: number) => {
    setLog((l) => [...l, `sheet reported ${reported}`]);
    setHeight(reported); // store exactly what the sheet reports
  };

  return (
    <div style={{ padding: 24, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button size="sm" onClick={() => request('40', 40)}>40 (below floor)</Button>
        <Button size="sm" onClick={() => request('5000', 5000)}>5000 (above viewport)</Button>
        <Button size="sm" onClick={() => request('NaN', Number.NaN)}>NaN (non-finite)</Button>
        <Button size="sm" onClick={() => request('default', defaultBottomSheetHeight(window.innerHeight))}>
          default
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Open'}
        </Button>
      </div>

      <p>Stored height: {String(height)}</p>
      <ol style={{ fontFamily: 'monospace', fontSize: 12 }}>
        {log.map((line, i) => <li key={i}>{line}</li>)}
      </ol>

      <BottomSheet
        aria-label="Clamp demo"
        open={open}
        onOpenChange={setOpen}
        height={height}
        onHeightChange={onHeightChange}
      >
        <p style={{ padding: 16 }}>Rendered at {Number.isFinite(height) ? height : '…'}px</p>
      </BottomSheet>
    </div>
  );
}
```

## 4. Sheet plus Dialog — `SheetWithDialog.tsx`

Shows the two components doing their separate jobs. The sheet stays non-modal; a
`Dialog` opened from inside it paints above, traps focus, and returns focus into the
sheet on close.

```tsx
import { useState } from 'react';
import {
  BottomSheet,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  defaultBottomSheetHeight,
} from '@openzeppelin/ui-components';

export function SheetWithDialog() {
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(() => defaultBottomSheetHeight(window.innerHeight));

  return (
    <div style={{ padding: 24 }}>
      <Button variant="outline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide sheet' : 'Show sheet'}
      </Button>

      <BottomSheet
        aria-label="Sheet with a confirm step"
        open={open}
        onOpenChange={setOpen}
        height={height}
        onHeightChange={setHeight}
      >
        <div style={{ padding: 16 }}>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Confirm something</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This dialog is modal. The sheet beneath it is not.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </BottomSheet>
    </div>
  );
}
```

## Running them

Inside this monorepo the quickest host is the first-party demo:

```bash
pnpm install
pnpm --filter basic-react-app dev
```

Add one of the components above to the demo's `src/`, render it from any page, and
confirm the demo's Tailwind config scans `@openzeppelin/ui-components`. Outside the
monorepo, any Vite React template plus the install line at the top of this page works.
