self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    payload = {
      body: event.data.text(),
    };
  }

  const title = payload.title || 'SpireGO';
  const options = {
    body: payload.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.tag || undefined,
    data: {
      actionUrl: payload.actionUrl || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const actionUrl = event.notification?.data?.actionUrl || '/';

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of allClients) {
      if ('focus' in client) {
        if (actionUrl && client.url === actionUrl) {
          await client.focus();
          return;
        }
      }
    }

    if (clients.openWindow) {
      await clients.openWindow(actionUrl);
    }
  })());
});
