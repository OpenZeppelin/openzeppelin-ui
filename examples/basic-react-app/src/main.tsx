import { ThemeProvider } from 'next-themes';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Toaster } from '@openzeppelin/ui-components';

import App from './App';

import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

// TODO: Implement dark theme styles in @openzeppelin/ui-styles package
// Once dark mode CSS variables are added, the ThemeProvider will automatically apply them
createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <App />
      <Toaster position="bottom-right" />
    </ThemeProvider>
  </StrictMode>
);
