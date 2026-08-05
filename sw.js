const CACHE = 'jerry-taste-engine-v23-music-map';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './ranking.js',
  './app.js',
  './pwa-manifest.json',
  './icons/taste-engine-192.png',
  './icons/taste-engine-512.png',
  './icons/taste-engine-maskable-512.png',
  './data/recommendations.json',
  './data/work-connections.json',
  './data/actual-taste.json',
  './data/deepcuts.json',
  './data/music-review.json',
  './data/music-worlds.json',
];
const SCOPE = new URL(self.registration.scope);
const INDEX = new URL('./index.html', SCOPE).href;
const SCOPE_PATH = SCOPE.pathname.endsWith('/') ? SCOPE.pathname : `${SCOPE.pathname}/`;
const isWithinScope = url => url.origin === SCOPE.origin && (
  url.pathname === SCOPE.pathname.replace(/\/$/, '') || url.pathname.startsWith(SCOPE_PATH)
);
const isShellNavigation = request => {
  if (request.mode !== 'navigate') return false;
  const url = new URL(request.url);
  return url.pathname === SCOPE.pathname || url.pathname === new URL(INDEX).pathname;
};

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil((async()=>{
  const keys=await caches.keys();
  const prior=keys.filter(key=>key.startsWith('jerry-taste-engine-')&&key!==CACHE);
  await Promise.all(prior.map(key=>caches.delete(key)));
  await self.clients.claim();
  if (!prior.length) return;
  const clients=await self.clients.matchAll({type:'window'});
  clients.forEach(client=>client.postMessage({type:'APP_UPDATED',cache:CACHE}));
})()));
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'GET' || !isWithinScope(requestUrl)) return;
  event.respondWith((async()=>{
    const cacheKey=isShellNavigation(event.request) ? INDEX : event.request;
    let response;
    try {
      response=await fetch(event.request);
    } catch (_) {
      return (await caches.match(cacheKey)) || Response.error();
    }
    if (!response.ok) return (await caches.match(cacheKey)) || response;
    try {
      const cache=await caches.open(CACHE);
      await cache.put(cacheKey,response.clone());
    } catch (_) {}
    return response;
  })());
});
