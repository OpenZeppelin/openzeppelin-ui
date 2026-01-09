# Quickstart: Extend Example Apps

**Feature**: 001-extend-example-apps  
**Date**: 2026-01-06

## Prerequisites

- Node.js 20.x or later
- pnpm 9.x or later
- A code editor (VS Code recommended)
- A browser with a wallet extension (MetaMask, Rainbow, etc.) for wallet demo

## Setup

### 1. Clone and Install

```bash
# From the openzeppelin-ui repository root
pnpm install
```

### 2. Build Dependencies

```bash
# Build all workspace packages
pnpm build
```

### 3. Run the Example App

```bash
# Navigate to the example app
cd examples/basic-react-app

# Start development server
pnpm dev
```

The app will be available at `http://localhost:5173`

## Development Workflow

### Adding a New Demo Component

1. **Create the demo file** in `src/components/`:

```typescript
// src/components/MyComponentDemo.tsx
import { MyComponent } from '@openzeppelin/ui-components';

export function MyComponentDemo(): React.ReactElement {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">MyComponent</h2>
        <p className="text-muted-foreground mb-6">
          Description of what this component does.
        </p>
      </div>

      {/* Demo sections */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Usage</h3>
        <div className="flex flex-wrap items-center gap-3">
          <MyComponent>Example</MyComponent>
        </div>
      </div>

      {/* Code example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Usage</h3>
        <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
          <code>{`import { MyComponent } from '@openzeppelin/ui-components';

<MyComponent>Example</MyComponent>`}</code>
        </pre>
      </div>
    </section>
  );
}
```

2. **Export from index** in `src/components/index.ts`:

```typescript
export { MyComponentDemo } from './MyComponentDemo';
```

3. **Add to navigation** in `src/App.tsx`:

```typescript
// Add to navItems array
{ key: 'my-component', label: 'MyComponent', icon: <SomeIcon className="size-4" /> },

// Add to demoComponents record
'my-component': MyComponentDemo,
```

### Demo Section Pattern

Use this consistent structure for all demos:

```typescript
{/* Section with variants */}
<div className="space-y-4">
  <h3 className="text-lg font-medium">Variants</h3>
  <div className="flex flex-wrap items-center gap-3">
    {/* Live examples */}
  </div>
</div>

{/* Section with states */}
<div className="space-y-4">
  <h3 className="text-lg font-medium">States</h3>
  <div className="flex flex-wrap items-center gap-3">
    {/* State examples */}
  </div>
</div>

{/* Code example */}
<div className="space-y-4">
  <h3 className="text-lg font-medium">Usage</h3>
  <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
    <code>{`// Import and usage example`}</code>
  </pre>
</div>
```

## Testing Changes

### Visual Verification

1. Run `pnpm dev` in the example app
2. Navigate to the component demo in the sidebar
3. Verify all variants display correctly
4. Test interactive components (clicks, hovers, keyboard)
5. Check responsive behavior by resizing the browser

### Type Checking

```bash
# From example app directory
pnpm typecheck
```

### Linting

```bash
# From example app directory
pnpm lint
```

## Wallet Integration

### Testing Wallet Connection

1. Install a browser wallet (MetaMask recommended)
2. Navigate to "Integration > Wallet" in the example app
3. Click "Connect Wallet"
4. Select your wallet and approve connection
5. Verify wallet state displays correctly

### Network Switching

The wallet demo supports:
- Ethereum Mainnet (chainId: 1)
- Sepolia Testnet (chainId: 11155111)

Use the network selector in the wallet demo to switch between networks.

## Troubleshooting

### Build Errors

If you see import errors from `@openzeppelin/ui-*` packages:

```bash
# Rebuild all packages from repo root
cd ../..
pnpm build
```

### HMR Not Working

Vite HMR should work automatically. If changes aren't reflecting:

1. Check the terminal for errors
2. Try a hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Restart the dev server

### Wallet Connection Issues

- Ensure your wallet extension is unlocked
- Check that you're on a supported network
- Try disconnecting and reconnecting

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app with navigation and routing |
| `src/main.tsx` | Entry point with providers |
| `src/components/index.ts` | Demo component exports |
| `src/components/*Demo.tsx` | Individual component demos |
| `package.json` | Dependencies and scripts |

## Contributing

1. Create demos for any missing components
2. Follow the established demo structure pattern
3. Include code examples for each component
4. Test on both desktop and mobile viewports
5. Ensure TypeScript types are correct
