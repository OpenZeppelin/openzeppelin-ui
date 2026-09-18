import { defineConfig } from 'playwright/test';

const isCi = process.env.CI === 'true';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: isCi
      ? 'pnpm preview --host 127.0.0.1 --port 3100 --strictPort'
      : 'pnpm --filter @openzeppelin/ui-components build && pnpm dev --host 127.0.0.1 --port 3100 --strictPort',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
