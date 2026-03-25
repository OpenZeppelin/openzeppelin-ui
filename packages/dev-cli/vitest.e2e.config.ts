import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/e2e/**/*.test.ts'],
    testTimeout: 15 * 60_000,
    hookTimeout: 15 * 60_000,
  },
});
