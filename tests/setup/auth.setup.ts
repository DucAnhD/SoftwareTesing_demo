import { test as setup, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { credentials } from '../../helpers/credentials';

setup('authenticate and save rolling session', async ({ page }) => {
  const { username, password } = credentials();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'My checklist' })).toBeVisible();
  const session = await page.request.get('/api/session');
  expect(session.ok()).toBeTruthy();
  expect((await session.json()).authenticated).toBe(true);
  await mkdir('.auth', { recursive: true });
  await page.context().storageState({ path: '.auth/user.json' });
});
