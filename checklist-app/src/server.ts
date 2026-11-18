import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import FileStoreFactory from 'session-file-store';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID, timingSafeEqual } from 'node:crypto';

declare module 'express-session' { interface SessionData { username?: string } }

type Item = { id: string; text: string; completed: boolean; createdAt: string };
const app = express();
const port = Number(process.env.PORT || 3000);
const username = process.env.APP_USERNAME || 'demo';
const password = process.env.APP_PASSWORD;
const secret = process.env.SESSION_SECRET;
if (!password || !secret || secret.length < 32) {
  throw new Error('Set APP_PASSWORD and SESSION_SECRET (at least 32 characters) in .env');
}
const idleMinutes = Number(process.env.SESSION_IDLE_MINUTES || 15);
if (!Number.isFinite(idleMinutes) || idleMinutes <= 0) throw new Error('SESSION_IDLE_MINUTES must be positive');
const idleMs = idleMinutes * 60_000;
const dataDir = path.resolve(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'items.json');
const publicDir = path.resolve(process.cwd(), 'public');
const FileStore = FileStoreFactory(session);
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(session({
  name: 'checklist.sid', secret, resave: false, saveUninitialized: false, rolling: true,
  store: new FileStore({ path: path.resolve(process.cwd(), 'sessions'), retries: 0, ttl: Math.ceil(idleMs / 1000), reapInterval: 60 }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: idleMs }
}));

// Local demo: reject cross-origin state-changing browser requests.
function checkOrigin(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  const expected = `${req.protocol}://${req.get('host')}`;
  if (origin && origin !== expected) return res.status(403).json({ error: 'Invalid origin' });
  next();
}
app.use('/api', checkOrigin);
function authenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.session.username) return res.status(401).json({ error: 'Not authenticated' });
  next();
}
function equal(a: string, b: string) {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
async function readItems(): Promise<Item[]> {
  try { return JSON.parse(await fs.readFile(dataFile, 'utf8')) as Item[]; }
  catch (e: any) { if (e.code === 'ENOENT') return []; throw e; }
}
async function writeItems(items: Item[]) {
  await fs.mkdir(dataDir, { recursive: true });
  const temp = `${dataFile}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(items, null, 2), 'utf8');
  await fs.rename(temp, dataFile);
}
// Serializes checklist modifications to avoid lost updates during concurrent requests.
let pending: Promise<unknown> = Promise.resolve();
function modify<T>(fn: (items: Item[]) => Promise<T> | T): Promise<T> {
  const operation = pending.then(async () => {
    const items = await readItems();
    const result = await fn(items);
    await writeItems(items);
    return result;
  });
  pending = operation.catch(() => {});
  return operation;
}
app.get('/api/session', (req, res) => res.json({ authenticated: Boolean(req.session.username), username: req.session.username || null, idleMinutes }));
app.post('/api/login', (req, res, next) => {
  const { username: suppliedUser, password: suppliedPassword } = req.body || {};
  if (typeof suppliedUser !== 'string' || typeof suppliedPassword !== 'string' || !equal(suppliedUser, username) || !equal(suppliedPassword, password!)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.regenerate(err => {
    if (err) return next(err);
    req.session.username = username;
    req.session.save(err2 => err2 ? next(err2) : res.json({ username, idleMinutes }));
  });
});
app.post('/api/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('checklist.sid');
    res.json({ ok: true });
  });
});
app.get('/api/items', authenticated, async (_req, res, next) => {
  try { res.json(await readItems()); } catch (e) { next(e); }
});
app.post('/api/items', authenticated, async (req, res, next) => {
  const value = req.body?.text;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) return res.status(400).json({ error: 'Item must be 1–200 characters' });
  try {
    const item = await modify(items => {
      const item: Item = { id: randomUUID(), text: value.trim(), completed: false, createdAt: new Date().toISOString() };
      items.push(item); return item;
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});
app.patch('/api/items/:id', authenticated, async (req, res, next) => {
  if (typeof req.body?.completed !== 'boolean') return res.status(400).json({ error: 'completed must be boolean' });
  try {
    const item = await modify(items => {
      const item = items.find(x => x.id === req.params.id);
      if (item) item.completed = req.body.completed;
      return item;
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (e) { next(e); }
});
app.delete('/api/items/:id', authenticated, async (req, res, next) => {
  try {
    const removed = await modify(items => {
      const index = items.findIndex(x => x.id === req.params.id);
      if (index === -1) return false;
      items.splice(index, 1); return true;
    });
    if (!removed) return res.status(404).json({ error: 'Item not found' });
    res.status(204).end();
  } catch (e) { next(e); }
});
app.use(express.static(publicDir));
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
app.listen(port, () => console.log(`Checklist app running at http://localhost:${port}`));
