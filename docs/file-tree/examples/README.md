# FileTree — Examples

Copy-paste components that run inside any Vite + React 19 app with the two packages
installed:

```bash
pnpm add @openzeppelin/ui-components @pierre/trees@1.0.0-beta.6
```

Each example is a single file with no other imports than React and the kit. Drop it into
`src/`, render it from your root, and give the root a height if the example does not
supply one.

## 1. Minimal — `MinimalTree.tsx`

The smallest correct use: sized host, accessible name, controlled selection.

```tsx
import { useState } from 'react';
import { FileTree } from '@openzeppelin/ui-components/file-tree';

const PATHS = [
  'Cargo.toml',
  'README.md',
  'src/lib.rs',
  'src/contract.rs',
  'src/test.rs',
  'scripts/deploy.sh',
];

export function MinimalTree() {
  const [selected, setSelected] = useState<string | null>('src/lib.rs');

  return (
    <div style={{ height: 320, width: 280 }}>
      <FileTree
        aria-label="Example project files"
        className="h-full min-h-0"
        paths={PATHS}
        selectedPath={selected}
        onSelectedPathChange={setSelected}
      />
      <p>Selected: {selected ?? 'none'}</p>
    </div>
  );
}
```

## 2. Change marks that clear — `ToggleMarks.tsx`

Shows that a mark is removed by leaving the path out of the next `changedPaths` array.

```tsx
import { useState } from 'react';
import { FileTree } from '@openzeppelin/ui-components/file-tree';

const PATHS = ['Cargo.toml', 'src/lib.rs', 'src/contract.rs', 'src/compliance.rs'];

export function ToggleMarks() {
  const [selected, setSelected] = useState<string | null>(null);
  const [marked, setMarked] = useState<string[]>(['src/compliance.rs']);

  const toggle = (path: string) =>
    setMarked((m) => (m.includes(path) ? m.filter((p) => p !== path) : [...m, path]));

  return (
    <div style={{ display: 'flex', gap: 16, height: 320 }}>
      <FileTree
        aria-label="Project files with change marks"
        className="h-full min-h-0"
        paths={PATHS}
        selectedPath={selected}
        onSelectedPathChange={setSelected}
        changedPaths={marked}
      />
      <div>
        {PATHS.map((p) => (
          <label key={p} style={{ display: 'block' }}>
            <input type="checkbox" checked={marked.includes(p)} onChange={() => toggle(p)} />{' '}
            {p}
          </label>
        ))}
      </div>
    </div>
  );
}
```

## 3. Regenerate on every keystroke — `LiveRegenerate.tsx`

Demonstrates the content-comparison guarantee: typing produces a new `paths` array on
every render, and the tree's expansion state survives because the set is unchanged.
Collapse `src/` first, then type — it stays collapsed until the typed name adds a new
file.

```tsx
import { useMemo, useState } from 'react';
import { FileTree } from '@openzeppelin/ui-components/file-tree';

function generate(tokenName: string): Record<string, string> {
  const files: Record<string, string> = {
    'Cargo.toml': `[package]\nname = "${tokenName || 'token'}"`,
    'src/lib.rs': `pub mod contract;`,
    'src/contract.rs': `// ${tokenName}`,
  };
  if (tokenName.length > 5) {
    files['src/extra.rs'] = '// long names get an extra module';
  }
  return files;
}

export function LiveRegenerate() {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const files = generate(name);                 // new object every render, on purpose
  const paths = useMemo(() => Object.keys(files), [files]);

  return (
    <div style={{ height: 360 }}>
      <input
        aria-label="Token name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Type a token name"
      />
      <div style={{ height: 300, marginTop: 8 }}>
        <FileTree
          aria-label="Regenerated project files"
          className="h-full min-h-0"
          paths={paths}
          selectedPath={selected}
          onSelectedPathChange={setSelected}
        />
      </div>
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
confirm `@pierre/trees` is `1.0.0-beta.6` in the demo's lockfile entry. Outside the
monorepo, any Vite React template plus the install line at the top of this page works.
