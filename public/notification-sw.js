const INBOX = '/app/inbox';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function notificationPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return INBOX;
  const url = new URL(value, self.location.origin);
  if (['/inbox', '/app/inbox', '/my-workspace'].includes(url.pathname)) return INBOX;
  const workspace = url.pathname.match(/^\/workspace\/([^/]+)\/page\/([^/]+)\/?$/);
  const page = url.pathname.match(/^\/(?:my-workspace|page|app\/page|workspace\/page)\/([^/]+)\/?$/);
  const id = workspace?.[2] || page?.[1];
  if (!UUID.test(id || '') || (workspace && !UUID.test(workspace[1]))) return INBOX;
  if ([...url.searchParams.keys()].some(key => !['block', 'blockId', 'comment', 'commentId'].includes(key))) return INBOX;
  for (const [key, value] of url.searchParams) {
    if (key.startsWith('comment') ? !UUID.test(value) : !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) return INBOX;
  }
  if (url.hash && !/^#block-[a-zA-Z0-9_-]{1,128}$/.test(url.hash)) return INBOX;
  return `/app/page/${id}${url.search}${url.hash}`;
}
self.addEventListener('push', event => {
  let data;
  try { data = event.data?.json(); } catch { return; }
  if (!UUID.test(data?.notification_id || '')) return;
  event.waitUntil(self.registration.showNotification('Noska', {
    body: 'You have a new notification.',
    tag: `noska:${data.notification_id}`,
    data: { notificationId: data.notification_id, url: notificationPath(data.url) },
    badge: '/logo.png', icon: '/logo.png',
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = notificationPath(event.notification.data?.url);
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const target = clients.find(client => {
      const current = new URL(client.url);
      return current.origin === self.location.origin && /^\/(?:app\/|my-workspace(?:\/|$)|dashboard(?:\/|$))/.test(current.pathname);
    });
    if (target) {
      try {
        const navigated = await target.navigate(url);
        if (navigated) return navigated.focus();
      } catch {}
    }
    return self.clients.openWindow(url);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'noska:notification-user' && !event.data.userId) {
    event.waitUntil(self.registration.getNotifications().then(notices => notices.forEach(notice => notice.close())));
  }
});
