import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false, 
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'setup', testMatch: '**/setup/*.setup.ts', timeout: 10_000, retries: 2, use: { ...devices['Desktop Chrome'] } },
    { name: 'e2e', testMatch: '**/e2e/*.spec.ts', dependencies: ['setup'], timeout: 60_000, retries: 1, use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' } },
    { name: 'api', testMatch: '**/api/*.spec.ts', dependencies: ['setup'], timeout: 30_000, retries: 1, use: { storageState: '.auth/user.json' } },
  ],
});
