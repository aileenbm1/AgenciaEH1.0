/* Service worker de Agencia EH (PWA).
   - Páginas: primero la red; sin conexión, la copia guardada o la página "Sin conexión".
   - Archivos estáticos (_next/static, íconos, fotos de ejemplo): se guardan en caché.
   - La API (/api/...) NUNCA se guarda en caché: datos personales y sesiones siempre frescos. */
const VERSION = 'eh-v1';
const OFFLINE = '/sin-conexion';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll([OFFLINE, '/icons/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') {
    // Solo se guardan páginas públicas (no paneles ni cuentas).
    const cacheable = !/^\/(panel|cuenta|acceso|restablecer|recuperar|verificar)/.test(url.pathname);
    e.respondWith(fetch(req).then(res => {
      if (cacheable && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match(OFFLINE))));
    return;
  }
  if (/^\/(_next\/static|icons|demo)\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
