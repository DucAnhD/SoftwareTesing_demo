export function credentials() {
  const username = process.env.APP_USERNAME;
  const password = process.env.APP_PASSWORD;
  if (!username || !password) throw new Error('Set APP_USERNAME and APP_PASSWORD in checklist-playwright/.env');
  return { username, password };
}
