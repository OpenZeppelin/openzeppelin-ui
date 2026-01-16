import { ThemeProvider } from 'next-themes';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Toaster } from '@openzeppelin/ui-components';
import { appConfigService } from '@openzeppelin/ui-utils';

import { AppProviders } from './providers/AppProviders';

import App from './App';

import './index.css';

async function main() {
  // Initialize the AppConfigService before rendering the application
  // This loads API keys and other configuration from Vite environment variables
  // Note: vite.config.ts uses `dedupe` to ensure this singleton is shared with adapter packages
  await appConfigService.initialize([
    { type: 'viteEnv', env: import.meta.env },
    { type: 'json', path: '/app.config.json' },
  ]);

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Failed to find the root element');

  // TODO: Implement dark theme styles in @openzeppelin/ui-styles package
  // Once dark mode CSS variables are added, the ThemeProvider will automatically apply them
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
        <AppProviders>
          <App />
          <Toaster position="bottom-right" />
        </AppProviders>
      </ThemeProvider>
    </StrictMode>
  );
}

void main();
