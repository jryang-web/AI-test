'use strict';
// 變更靜態檔案時更新版本。快取名稱限定目前 scope，避免影響同網域的其他專案。
const PREFIX = `repair-shell-${self.registration.scope}-`;
const CACHE = `${PREFIX}v1`;
const FILES = ['./', './index.html', './style.css', './app.js', './config.js', './pwa.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png'];
const URLS = FILES.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)));
  // 不強制取代使用中的版本，避免中斷尚未送出的表單。
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // 不快取 Supabase 回應、報修紀錄或任何 POST；僅處理本專案靜態檔案。
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  url.search = '';
  if (!URLS.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(url.href)) || fetch(request);
  })());

});
