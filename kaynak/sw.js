// Hizmet çalışanı: site dosyalarını cihaza kaydeder, internetsiz kullanım sağlar.
// Bu dosya derleme sırasında üretilir; elle düzenlemeyin.
const SURUM = 'ram-__SURUM__';
const DOSYALAR = __DOSYALAR__;

self.addEventListener('install', (olay) => {
  olay.waitUntil(
    caches
      .open(SURUM)
      .then((c) => c.addAll(DOSYALAR.map((d) => new Request(d, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (olay) => {
  olay.waitUntil(
    caches
      .keys()
      .then((adlar) => Promise.all(adlar.filter((a) => a.startsWith('ram-') && a !== SURUM).map((a) => caches.delete(a))))
      .then(() => self.clients.claim())
  );
});

async function onbellekte(istek) {
  const c = await caches.open(SURUM);
  let y = await c.match(istek, { ignoreSearch: true });
  if (y) return y;
  const url = new URL(istek.url);
  if (url.pathname.endsWith('/index.html')) {
    y = await c.match(url.pathname.slice(0, -10), { ignoreSearch: true });
  } else if (!url.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(url.pathname)) {
    y = await c.match(url.pathname + '/', { ignoreSearch: true });
  }
  return y;
}

self.addEventListener('fetch', (olay) => {
  const istek = olay.request;
  if (istek.method !== 'GET' || new URL(istek.url).origin !== self.location.origin) return;
  olay.respondWith(
    onbellekte(istek).then(
      (y) =>
        y ||
        fetch(istek).catch(async () => {
          if (istek.mode === 'navigate') {
            const c = await caches.open(SURUM);
            return (await c.match('./cevrimdisi/')) || Response.error();
          }
          return Response.error();
        })
    )
  );
});
