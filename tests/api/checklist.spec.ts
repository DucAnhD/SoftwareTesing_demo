import { test, expect } from '@playwright/test';

// The request fixture inherits the setup project's session cookie.
test('authenticated API CRUD', async ({ request }) => {
  const session = await request.get('/api/session');
  expect(session.status()).toBe(200);
  expect((await session.json()).authenticated).toBe(true);
  const create = await request.post('/api/items', { data: { text: `API item ${Date.now()}` } });
  expect(create.status()).toBe(201);
  const item = await create.json() as { id: string; text: string; completed: boolean };
  expect(item.completed).toBe(false);
  try {
    const list = await request.get('/api/items');
    expect(list.status()).toBe(200);
    expect((await list.json()).some((x: { id: string }) => x.id === item.id)).toBe(true);
    const update = await request.patch(`/api/items/${item.id}`, { data: { completed: true } });
    expect(update.status()).toBe(200);
    expect((await update.json()).completed).toBe(true);
  } finally {
    const remove = await request.delete(`/api/items/${item.id}`);
    expect(remove.status()).toBe(204);
  }
});

test('unauthenticated API requests are rejected', async ({ playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL });
  try {
    const response = await anonymous.get('/api/items');
    expect(response.status()).toBe(401);
  } finally { await anonymous.dispose(); }
});

test('invalid checklist payload is rejected', async ({ request }) => {
  const response = await request.post('/api/items', { data: { text: '' } });
  expect(response.status()).toBe(400);
});

test('authenticated requests refresh the rolling cookie expiry', async ({ request }) => {
  const first = await request.get('/api/session');
  expect(first.status()).toBe(200);
  const firstCookie = first.headers()['set-cookie'] || '';
  expect(firstCookie).toContain('checklist.sid=');
  expect(firstCookie).toMatch(/Expires=|Max-Age=/i);
  const next = await request.get('/api/session');
  expect(next.status()).toBe(200);
  expect(next.headers()['set-cookie']).toContain('checklist.sid=');
});
