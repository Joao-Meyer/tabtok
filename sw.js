// Service worker do TabTok: guarda só os arquivos do próprio app, para ele poder ser
// instalado e abrir mesmo sem internet. As publicações vêm sempre da API (não são guardadas aqui).
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
  './js/salto.js',
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

  // Rede primeiro, sempre conferindo com o servidor (cache: 'no-cache' revalida e
  // ignora o cache HTTP de 10 minutos do GitHub Pages). Assim, com internet, o app
  // sempre abre na versão publicada. Sem internet, usa a cópia guardada.
  const pedido = e.request.mode === 'navigate'
    ? new Request(url.href, { cache: 'no-cache' })
    : new Request(e.request, { cache: 'no-cache' });
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const resposta = await fetch(pedido);
        if (resposta.ok) cache.put(e.request.mode === 'navigate' ? './index.html' : e.request, resposta.clone());
        return resposta;
      } catch {
        return (await cache.match(e.request)) || (e.request.mode === 'navigate' ? cache.match('./index.html') : Response.error());
      }
    }),
  );
});
