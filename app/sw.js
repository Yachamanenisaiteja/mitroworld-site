// MITRO service worker: installable app + push notifications (messages, calls, reminders)
const VERSION = 'mitro-v13';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // network only (always the latest app)

self.addEventListener('push', (event) => {
  let n = {};
  try { n = event.data ? event.data.json() : {}; } catch { n = { title: 'MITRO', body: event.data ? event.data.text() : '' }; }
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const focused = wins.some((w) => w.focused && w.visibilityState === 'visible');
    // The open app already shows new messages and its own ringing screen
    if (focused && n.type !== 'reminder') { wins.forEach((w) => w.postMessage({ mitroPush: n })); return; }
    const opts = {
      body: n.body || '',
      icon: n.icon || '/app/icon-192.png',
      badge: '/app/icon-192.png',
      tag: n.tag || 'mitro',
      renotify: !!n.renotify,
      data: { url: n.url || '/app/', type: n.type },
      vibrate: n.type === 'call' ? [400, 200, 400, 200, 400, 200, 400] : [120, 60, 120],
      requireInteraction: n.type === 'call',
    };
    if (n.type === 'call') opts.actions = [{ action: 'answer', title: '✅ Answer' }, { action: 'decline', title: '❌ Decline' }];
    await self.registration.showNotification(n.title || 'MITRO', opts);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  let url = d.url || '/app/';
  if (d.type === 'call' && event.action === 'decline') url += '&decline=1';
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).pathname.startsWith('/app')) {
        w.postMessage({ mitroOpen: url });
        return w.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
