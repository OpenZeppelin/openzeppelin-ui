# Cross-Network Fallback — Examples

Runnable reference for initiative `003` opt-in wiring and disclaimer UX.

## Example app (`examples/basic-react-app`)

The first-party demo is the canonical integrator reference — not a separate `examples/`
package.

| File | What it shows |
|------|----------------|
| `src/providers/AppProviders.tsx` | `enableMainnetL1MissFallback` state → `CreateRuntimeOptions` → `getRuntime` → `RuntimeProvider` |
| `src/context/mainnetL1FallbackOptInContext.tsx` | App-level context seam for the demo toggle |
| `src/components/ENSResolutionDemo.tsx` | Checkbox UI + helper copy linking opt-in to SF-3 disclaimer |
| `src/core/ecosystemManager.ts` | `getRuntime(networkConfig, options?)` forwards options to `createRuntime` |

### Run locally

From the repo root:

```bash
pnpm install
pnpm --filter basic-react-app dev
```

Open the ENS Resolution demo, connect on a testnet (e.g. Sepolia), and toggle
**"Allow mainnet fallback when name not found on connected network"**. With adapter `003`
linked and opt-in ON, resolving a mainnet-only name shows the cross-network disclaimer.

### Minimal extract (static opt-in ON)

```tsx
import { RuntimeProvider, useResolveRuntime } from '@openzeppelin/ui-react';

const resolveRuntime = useResolveRuntime(evmDefinition, {
  profile: 'composer',
  options: {
    nameResolution: { enableMainnetL1MissFallback: true },
  },
});

export function Root({ children }) {
  return <RuntimeProvider resolveRuntime={resolveRuntime}>{children}</RuntimeProvider>;
}
```

See [integration-guide.md](../integration-guide.md) for dynamic toggle and label wiring patterns.
