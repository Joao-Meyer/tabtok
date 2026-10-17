// Service worker do TabTok: guarda só os arquivos do próprio app, para ele abrir rápido
// e poder ser instalado. As publicações vêm sempre da API (não são guardadas aqui).
// __VERSAO__ é trocado pelo commit na publicação (GitHub Actions), o que renova o cache a cada versão.
const CACHE = 'tabtok-__VERSAO__';

const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/estilo.css',
  './js/main.js',
  './js/config.js',
  './js/api.js',
  './js/feed.js',
  './js/fontes.js',
  './js/janela.js',
  './js/marcador.js',
  './js/painel.js',
  './js/tempo.js',
  './js/texto.js',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('tabtok-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Só o próprio app; API, fontes e bibliotecas externas seguem direto para a rede.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (e.request.mode === 'navigate') {
    // Página: tenta a rede primeiro (para pegar versões novas); sem rede, usa a guardada.
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }
  // Demais arquivos: responde do cache e atualiza em segundo plano.
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const guardado = await cache.match(e.request);
      const daRede = fetch(e.request)
        .then((r) => { if (r.ok) cache.put(e.request, r.clone()); return r; })
        .catch(() => guardado);
      return guardado || daRede;
    }),
  );
});
