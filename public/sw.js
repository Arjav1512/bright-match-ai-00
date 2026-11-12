// Messaging only: deliberately no fetch handlers, caches or offline behavior.
function notificationUrl(value) {
  try {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/notifications';
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search + url.hash : '/notifications';
  } catch { return '/notifications'; }
}

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Safe generic notification. */ }
  if (!payload || typeof payload !== 'object') payload = {};
  event.waitUntil(self.registration.showNotification(
    typeof payload.title === 'string' && payload.title.trim() ? payload.title : 'Wroob',
    {
      body: typeof payload.body === 'string' ? payload.body : 'You have a new notification.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      ...(typeof payload.tag === 'string' && payload.tag ? { tag: payload.tag } : {}),
      data: { url: notificationUrl(payload.url) },
    },
  ));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(notificationUrl(event.notification.data?.url), self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      try {
        const navigated = await client.navigate(url);
        if (navigated) { await navigated.focus(); return; }
      } catch { /* Try another window, then open a new one. */ }
    }
    await self.clients.openWindow(url);
  })());
});
