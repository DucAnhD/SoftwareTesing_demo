const $ = (id) => document.getElementById(id);
const loginView = $('login-view'), appView = $('app-view');
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options });
  if (response.status === 401 && url !== '/api/login') { showLogin(); throw new Error('Session expired. Please sign in again.'); }
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || `Request failed (${response.status})`); }
  return response.status === 204 ? null : response.json();
}
function showLogin() { loginView.hidden = false; appView.hidden = true; $('login-form').reset(); }
function showApp(session) { loginView.hidden = true; appView.hidden = false; $('session-info').textContent = `Signed in as ${session.username} · Session expires after ${session.idleMinutes} minutes of inactivity`; }
async function loadItems() {
  const items = await api('/api/items');
  const list = $('items'); list.replaceChildren();
  $('count').textContent = `${items.filter(x => x.completed).length} / ${items.length} completed`;
  $('empty').hidden = items.length > 0;
  for (const item of items) {
    const li = document.createElement('li'); if (item.completed) li.className = 'done';
    const label = document.createElement('label');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = item.completed;
    checkbox.setAttribute('aria-label', `Mark ${item.text} completed`);
    checkbox.addEventListener('change', async () => {
      try { await api(`/api/items/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ completed: checkbox.checked }) }); await loadItems(); }
      catch (e) { $('app-error').textContent = e.message; checkbox.checked = !checkbox.checked; }
    });
    const text = document.createElement('span'); text.textContent = item.text;
    label.append(checkbox, text);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove ${item.text}`);
    remove.addEventListener('click', async () => {
      try { await api(`/api/items/${encodeURIComponent(item.id)}`, { method: 'DELETE' }); await loadItems(); }
      catch (e) { $('app-error').textContent = e.message; }
    });
    li.append(label, remove); list.append(li);
  }
}
$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); $('login-error').textContent = '';
  const form = new FormData(event.currentTarget);
  try { const session = await api('/api/login', { method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) }); showApp(session); await loadItems(); }
  catch (e) { $('login-error').textContent = e.message; }
});
$('add-form').addEventListener('submit', async (event) => {
  event.preventDefault(); $('app-error').textContent = '';
  try { await api('/api/items', { method: 'POST', body: JSON.stringify({ text: $('new-item').value }) }); $('new-item').value = ''; await loadItems(); $('new-item').focus(); }
  catch (e) { $('app-error').textContent = e.message; }
});
$('logout').addEventListener('click', async () => {
  try { await api('/api/logout', { method: 'POST' }); showLogin(); }
  catch (e) { $('app-error').textContent = e.message; }
});
(async () => {
  try { const session = await api('/api/session'); if (session.authenticated) { showApp(session); await loadItems(); } else showLogin(); }
  catch (e) { showLogin(); $('login-error').textContent = e.message; }
})();
