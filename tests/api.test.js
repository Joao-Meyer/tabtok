// Seção 5: paginação, deduplicação e erros da API, com a rede trocada por dados falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarCliente, ErroApi } from '../js/api.js';
import { MAX_PAGINAS, POR_PAGINA } from '../js/config.js';

// N publicações, uma a cada 10 minutos, da mais nova para a mais antiga (como a API devolve)
function publicacoes(n, ultima = Date.parse('2026-10-16T18:00:00Z')) {
  return Array.from({ length: n }, (_, i) => ({
    id: `id${i}`,
    slug: `pub-${i}`,
    published_at: new Date(ultima - i * 10 * 60000).toISOString(),
  }));
}

function apiFalsa(todas) {
  const pedidos = [];
  const fetch = async (url) => {
    pedidos.push(url);
    const u = new URL(url);
    const pagina = Number(u.searchParams.get('page'));
    const porPagina = Number(u.searchParams.get('per_page'));
    const corpo = todas.slice((pagina - 1) * porPagina, pagina * porPagina);
    return { ok: true, status: 200, json: async () => corpo };
  };
  return { fetch, pedidos };
}

test('pede 100 por página, do mais novo para o mais antigo', async () => {
  const { fetch, pedidos } = apiFalsa(publicacoes(50));
  await criarCliente({ fetch }).buscarAte(0);
  assert.match(pedidos[0], /page=1&per_page=100&strategy=new/);
});

test('para de paginar ao passar do ponto de partida', async () => {
  const todas = publicacoes(350);
  const { fetch, pedidos } = apiFalsa(todas);
  const cliente = criarCliente({ fetch });
  const ate = Date.parse(todas[150].published_at); // está na página 2
  const paginas = await cliente.buscarAte(ate);
  assert.equal(paginas, 2);
  assert.equal(pedidos.length, 2);
  assert.equal(cliente.publicacoes().length, 200);
  assert.equal(cliente.esgotado, false);
});

test('continua de onde parou (carregar desde o marcador)', async () => {
  const todas = publicacoes(350);
  const { fetch, pedidos } = apiFalsa(todas);
  const cliente = criarCliente({ fetch });
  await cliente.buscarAte(Date.parse(todas[150].published_at));
  await cliente.buscarAte(Date.parse(todas[320].published_at));
  assert.match(pedidos.at(-1), /page=4/);
  assert.equal(cliente.publicacoes().length, 350);
  assert.equal(cliente.esgotado, true);
});

test('deduplica quando a paginação anda', async () => {
  const todas = publicacoes(150);
  let chamada = 0;
  const fetch = async (url) => {
    chamada++;
    const pagina = Number(new URL(url).searchParams.get('page'));
    // na página 2, simula uma publicação nova empurrando tudo uma posição
    const desloc = pagina === 2 ? -1 : 0;
    const corpo = todas.slice((pagina - 1) * POR_PAGINA + desloc, pagina * POR_PAGINA + desloc);
    return { ok: true, status: 200, json: async () => corpo };
  };
  const cliente = criarCliente({ fetch });
  await cliente.buscarAte(0);
  assert.equal(chamada, 2);
  assert.equal(cliente.publicacoes().length, 150);
});

test('respeita a trava de páginas', async () => {
  const { fetch, pedidos } = apiFalsa(publicacoes(POR_PAGINA * (MAX_PAGINAS + 5)));
  await criarCliente({ fetch }).buscarAte(0);
  assert.equal(pedidos.length, MAX_PAGINAS);
});

test('429 vira mensagem clara', async () => {
  const fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
  await assert.rejects(criarCliente({ fetch }).buscarAte(0), (e) => e instanceof ErroApi && e.status === 429 && /limitou/.test(e.message));
});

test('sem rede vira mensagem clara', async () => {
  const fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(criarCliente({ fetch }).buscarAte(0), /Sem conexão/);
});

test('corpo: busca uma vez e tenta de novo depois de erro', async () => {
  let chamadas = 0;
  let falhar = true;
  const fetch = async () => {
    chamadas++;
    if (falhar) return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ body: 'texto **md**' }) };
  };
  const cliente = criarCliente({ fetch });
  await assert.rejects(cliente.corpo('x'));
  falhar = false;
  assert.equal(await cliente.corpo('x'), 'texto **md**');
  assert.equal(await cliente.corpo('x'), 'texto **md**');
  assert.equal(chamadas, 2);
});

test('reiniciar esquece o que foi buscado', async () => {
  const { fetch } = apiFalsa(publicacoes(30));
  const cliente = criarCliente({ fetch });
  await cliente.buscarAte(0);
  cliente.reiniciar();
  assert.equal(cliente.publicacoes().length, 0);
  assert.equal(cliente.esgotado, false);
});
