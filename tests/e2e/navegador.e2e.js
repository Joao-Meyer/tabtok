// Testes de ponta a ponta: abre o app num Chromium de verdade, com a API do TabNews simulada.
// Precisa do Playwright, que não faz parte do projeto (zero dependências):
//   npm install --no-save playwright && npx playwright install chromium
//   npm run test:e2e
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { iniciarServidor } from './servidor.js';

const DIA = 86400000;
const agora = Date.now();

// ~25 publicações por dia nos últimos 20 dias, das 8h às 18h (horário local)
const posts = [];
for (let d = 20, id = 0; d >= 0; d--) {
  const base = new Date(agora - d * DIA);
  base.setHours(8, 0, 0, 0);
  for (let k = 0; k < 25; k++) {
    const ms = base.getTime() + k * 24 * 60000;
    if (ms > agora - 60000) continue;
    id++;
    posts.push({
      id: `id${id}`,
      slug: `publicacao-${id}`,
      title: `Publicação ${id}: Ubuntu adotará por padrão versão do sudo escrita em Rust`,
      published_at: new Date(ms).toISOString(),
      tabcoins: id % 13,
      children_deep_count: id % 7,
      source_url: id % 2 ? `https://finance.yahoo.com/a/${id}` : `http://archive.today/2026.10.13-1/https://www.theverge.com/x/${id}`,
    });
  }
}
const desc = [...posts].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
const contarDepois = (ms, inclusivo = false) => posts.filter((p) => (inclusivo ? Date.parse(p.published_at) >= ms : Date.parse(p.published_at) > ms)).length;
const ultimoAntes = (ms) => posts.filter((p) => Date.parse(p.published_at) < ms).at(-1).published_at;
const THUMB = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#ddd"/><text x="40" y="330" font-size="110" font-family="sans-serif" font-weight="700" fill="#222">sudo em Rust</text></svg>';

let servidor;
let navegador;
let base;

before(async () => {
  servidor = await iniciarServidor(0);
  base = `http://localhost:${servidor.address().port}/`;
  // CHROMIUM_PATH permite usar um Chromium já instalado em vez do baixado pelo Playwright
  navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(async () => {
  await navegador?.close();
  servidor?.close();
});

async function abrir({ viewport = { width: 390, height: 844 }, marcador } = {}) {
  const ctx = await navegador.newContext({ viewport });
  await ctx.route('https://www.tabnews.com.br/**', (route) => {
    const url = new URL(route.request().url());
    const partes = url.pathname.split('/').filter(Boolean); // api v1 contents NewsletterOficial [slug] [thumbnail]
    const cabecalhos = { 'access-control-allow-origin': '*' };
    if (partes.length === 4) {
      const pagina = Number(url.searchParams.get('page'));
      const porPagina = Number(url.searchParams.get('per_page'));
      return route.fulfill({ contentType: 'application/json', headers: cabecalhos, body: JSON.stringify(desc.slice((pagina - 1) * porPagina, pagina * porPagina)) });
    }
    if (partes.length === 6) return route.fulfill({ contentType: 'image/svg+xml', headers: cabecalhos, body: THUMB });
    const p = posts.find((x) => x.slug === partes[4]);
    return route.fulfill({ contentType: 'application/json', headers: cabecalhos, body: JSON.stringify({ ...p, body: `O **sudo-rs** é uma reimplementação do comando sudo.\n\n${'Texto longo de exemplo. '.repeat(40)}` }) });
  });
  // fontes e bibliotecas externas ficam de fora: o app precisa funcionar sem elas
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  if (marcador) await page.addInitScript((m) => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('tabtok.marcador', m); } }, marcador);
  await page.goto(base);
  await page.waitForSelector('.slide');
  return { ctx, page, erros };
}

test('critérios 1, 2, 6 e 7: primeira visita, marcador, fonte e toque fora', async () => {
  const { ctx, page, erros } = await abrir();
  assert.equal(await page.locator('.post').count(), contarDepois(agora - DIA));
  await page.waitForTimeout(2600);
  assert.ok(await page.evaluate(() => localStorage.getItem('tabtok.marcador')), 'marcador criado após 2 s');
  const primeiro = page.locator('.post').first();
  await primeiro.locator('.toggle').click();
  assert.equal(await primeiro.locator('.links a').nth(1).textContent(), 'Fonte: Yahoo Finance');
  await page.mouse.click(195, 120);
  assert.equal(await primeiro.evaluate((el) => el.classList.contains('expanded')), false);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('critério 3: marcador de 3 dias mostra só as seguintes, todas como "nova"', async () => {
  const m = ultimoAntes(agora - 3 * DIA);
  const { ctx, page, erros } = await abrir({ viewport: { width: 1280, height: 860 }, marcador: m });
  const esperado = contarDepois(Date.parse(m));
  assert.equal(await page.locator('.post').count(), esperado);
  assert.equal(await page.locator('.meta .new').count(), esperado);
  await page.click('#next');
  await page.waitForTimeout(800);
  assert.equal(await page.textContent('#counter'), `2 / ${esperado}`);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('critério 4: 14 dias fora mostra aviso e carrega o restante', async () => {
  const m = ultimoAntes(agora - 14 * DIA);
  const { ctx, page, erros } = await abrir({ marcador: m });
  assert.equal(await page.locator('[data-aviso]').count(), 1);
  assert.equal(await page.locator('.post').count(), contarDepois(agora - 7 * DIA));
  await page.click('#loadOlder');
  await page.waitForSelector('[data-aviso]', { state: 'detached' });
  assert.equal(await page.locator('.post').count(), contarDepois(Date.parse(m)));
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('critério 5 e 9: salto de data não move o marcador; painel tem a atribuição', async () => {
  const m = desc[3].published_at;
  const { ctx, page, erros } = await abrir({ marcador: m });
  await page.click('#openPanel');
  assert.match(await page.textContent('#credito'), /TabNews/);
  const d = new Date(agora - 5 * DIA);
  const campo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await page.fill('#dateInput', campo);
  await page.click('#goDate');
  await page.waitForTimeout(800);
  d.setHours(0, 0, 0, 0);
  assert.equal(await page.locator('.post').count(), contarDepois(d.getTime(), true));
  await page.waitForTimeout(2600);
  assert.equal(await page.evaluate(() => localStorage.getItem('tabtok.marcador')), m);
  assert.match(await page.locator('[data-fim]').textContent(), /Newsletter do Filipe Deschamps/);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('critério 8 (parcial): manifesto e ícones são servidos', async () => {
  const { ctx, page } = await abrir();
  const manifesto = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
  for (const i of manifesto.icons) {
    const ok = await page.evaluate(async (src) => (await fetch(src)).ok, i.src);
    assert.ok(ok, i.src);
  }
  await ctx.close();
});

test('primeira visita num fim de semana: mostra o último dia com publicações', async () => {
  // a última publicação foi há 2 dias; nada nas últimas 24 h
  const limite = agora - 2 * DIA;
  const antigas = desc.filter((p) => Date.parse(p.published_at) <= limite);
  const ultimoDia = new Date(Date.parse(antigas[0].published_at));
  ultimoDia.setHours(0, 0, 0, 0);
  const doUltimoDia = antigas.filter((p) => Date.parse(p.published_at) >= ultimoDia.getTime()).length;

  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://www.tabnews.com.br/**', (route) => {
    const url = new URL(route.request().url());
    const partes = url.pathname.split('/').filter(Boolean);
    if (partes.length === 4) {
      const pagina = Number(url.searchParams.get('page'));
      const porPagina = Number(url.searchParams.get('per_page'));
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(antigas.slice((pagina - 1) * porPagina, pagina * porPagina)) });
    }
    if (partes.length === 6) return route.fulfill({ contentType: 'image/svg+xml', body: THUMB });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ body: 'texto' }) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto(base);
  await page.waitForSelector('.post');
  assert.equal(await page.textContent('#counter'), `1 / ${doUltimoDia}`);
  assert.match(await page.textContent('#toast'), /Nada nas últimas 24 h\. Mostrando/);
  assert.deepEqual(erros, []);
  await ctx.close();
});
