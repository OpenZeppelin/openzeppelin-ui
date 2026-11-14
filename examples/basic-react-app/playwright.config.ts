import { defineConfig } from 'playwright/test';

const isCi = process.env.CI === 'true';
/** Set E2E_PORT to run e2e from several checkouts at once without colliding on 3100. */
const port = Number(process.env.E2E_PORT ?? 3100);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: origin,
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: isCi
      ? `pnpm preview --host 127.0.0.1 --port ${port} --strictPort`
      : `pnpm --filter @openzeppelin/ui-components build && pnpm dev --host 127.0.0.1 --port ${port} --strictPort`,
    url: origin,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
