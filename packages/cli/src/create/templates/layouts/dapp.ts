import type { CreateAppSpec } from '../../types';
import {
  maybeTooltipWrapper,
  runtimeStatusImport,
  sharedAppImports,
  statusPanel,
  walletHeader,
  walletHeaderImport,
} from '../shared';

function minimalBody(): string {
  return `<div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>OpenZeppelin UI app</CardTitle>
            <CardDescription>Vite + React + TypeScript with OpenZeppelin UI styles.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Start building</Button>
          </CardContent>
        </Card>
      </main>
    </div>`;
}

function dappBody(spec: CreateAppSpec): string {
  return `<div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b bg-background">
        <div className="flex h-16 w-full items-center gap-4 px-3 sm:px-4 md:px-5">
          <img src="/OZ-Logo-BlackBG.svg" alt="OpenZeppelin" className="h-6 w-auto" />
          <div className="hidden h-6 border-l sm:block" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">${spec.title}</div>
            <div className="hidden text-xs text-muted-foreground sm:block">${spec.subtitle ?? ''}</div>
          </div>
          <div className="ml-auto">{${walletHeader(spec)}}</div>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-6 py-10 md:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Your dApp shell is ready</CardTitle>
            <CardDescription>
              This starter proves the selected OpenZeppelin UI wiring and gives you a clean place
              to add contract interactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Edit <code className="rounded bg-muted px-1 py-0.5">src/oz</code> to customize
              adapters, wallet config, networks, and runtime behavior.
            </p>
            <Button>Open next step</Button>
          </CardContent>
        </Card>
        ${statusPanel(spec)}
      </main>
      <Footer companyName="OpenZeppelin" />
    </div>`;
}

/**
 * Renders the generated `src/App.tsx` for the topbar layout, including both the
 * minimal landing variant (`content === 'landing'`) and the default dApp dashboard.
 * Sidebar and wizard layouts live in their own modules.
 */
export function dappAppTsx(spec: CreateAppSpec): string {
  const imports = sharedAppImports(spec);
  const body = spec.content === 'landing' ? minimalBody() : dappBody(spec);
  return `import { ${imports.join(', ')} } from '@openzeppelin/ui-components';
${walletHeaderImport(spec)}${runtimeStatusImport(spec)}
export default function App() {
  return (
    ${maybeTooltipWrapper(spec, body)}
  );
}
`;
}
