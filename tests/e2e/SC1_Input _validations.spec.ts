import { test, expect } from '@playwright/test';

// Uses the saved browser cookie from the setup project; no login in the test itself.
test('authenticated user can add, complete, uncomplete and remove an item', async ({ page }) => {
  const label = `E2E item ${Date.now()}`;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My checklist' })).toBeVisible();
  await page.getByRole('textbox', { name: 'New checklist item' }).fill(label);
  await page.getByRole('button', { name: 'Add item' }).click();
  const checkbox = page.getByRole('checkbox', { name: `Mark ${label} completed` });
  await expect(checkbox).toBeVisible();
  try {
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  } finally {
    await page.getByRole('button', { name: `Remove ${label}` }).click();
    await expect(checkbox).toHaveCount(0);
  }
});

test('unauthenticated browser is shown login', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  } finally { await context.close(); }
});
