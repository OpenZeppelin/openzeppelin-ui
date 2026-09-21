import type { CreateAppSpec } from '../types';

/**
 * Renders the generated `src/main.tsx` entry point. Imports, async bootstrap
 * (when wallet wiring requires `initializeAppConfig`), provider tree, and the
 * top-level `<Toaster />` mount are all driven from the recipe.
 */
export function mainTsx(spec: CreateAppSpec): string {
  const imports = [
    "import React from 'react';",
    "import { createRoot } from 'react-dom/client';",
    spec.hasTheme ? "import { ThemeProvider } from 'next-themes';" : '',
    spec.hasToasts ? "import { Toaster } from '@openzeppelin/ui-components';" : '',
    spec.hasWallet ? "import { initializeAppConfig } from './oz/config';" : '',
    spec.hasWallet ? "import { OzProviders } from './oz/OzProviders';" : '',
    "import App from './App';",
    "import './index.css';",
  ].filter(Boolean);
  const appTree = spec.hasWallet ? '<OzProviders><App /></OzProviders>' : '<App />';
  const themedTree = spec.hasTheme
    ? `<ThemeProvider attribute="class" defaultTheme="light" enableSystem>${appTree}</ThemeProvider>`
    : appTree;
  const toaster = spec.hasToasts ? '\n  <Toaster />' : '';

  return `${imports.join('\n')}

async function bootstrap() {
${spec.hasWallet ? '  await initializeAppConfig();\n' : ''}  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      ${themedTree}${toaster}
    </React.StrictMode>
  );
}

void bootstrap();
`;
}
