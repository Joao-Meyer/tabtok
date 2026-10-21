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

const pedidos = { capas: 0, textos: 0 }; // capas deve ficar em 0: o app não pede mais a imagem do TabNews

async function abrir({ viewport = { width: 390, height: 844 }, marcador, toque = false } = {}) {
  const ctx = await navegador.newContext(toque ? { viewport, hasTouch: true, isMobile: true } : { viewport });
  await ctx.route('https://www.tabnews.com.br/**', (route) => {
    const url = new URL(route.request().url());
    const partes = url.pathname.split('/').filter(Boolean); // api v1 contents NewsletterOficial [slug] [thumbnail]
    if (partes.length === 6) pedidos.capas++;
    if (partes.length === 5) pedidos.textos++;
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
  assert.equal(await page.getAttribute('#feed', 'data-total'), String(contarDepois(agora - DIA)));
  await page.waitForTimeout(2600);
  assert.ok(await page.evaluate(() => localStorage.getItem('tabtok.marcador')), 'marcador criado após 2 s');
  const primeiro = page.locator('.post').first();
  await primeiro.locator('.toggle').click();
  // Qual é o primeiro card depende da hora em que o teste roda. Por isso confere os dois
  // primeiros (ids vizinhos têm paridade diferente: ímpar = link direto, par = archive.today)
  // e calcula a fonte esperada a partir do id de cada card.
  for (const card of await page.locator('.post').all().then((l) => l.slice(0, 2))) {
    const id = Number((await card.getAttribute('data-slug')).replace('publicacao-', ''));
    const esperada = id % 2 ? 'Yahoo Finance' : 'The Verge';
    assert.equal(await card.locator('.links a').nth(1).textContent(), `Fonte: ${esperada}`);
  }
  await page.mouse.click(195, 120);
  assert.equal(await primeiro.evaluate((el) => el.classList.contains('expanded')), false);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('critério 3: marcador de 3 dias mostra só as seguintes, todas como "nova"', async () => {
  const m = ultimoAntes(agora - 3 * DIA);
  const { ctx, page, erros } = await abrir({ viewport: { width: 1280, height: 860 }, marcador: m });
  const esperado = contarDepois(Date.parse(m));
  assert.equal(await page.getAttribute('#feed', 'data-total'), String(esperado));
  assert.equal(await page.locator('.meta .new').count(), Math.min(esperado, 30), 'todos os cards montados são "nova"');
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
  assert.equal(await page.getAttribute('#feed', 'data-total'), String(contarDepois(agora - 7 * DIA)));
  await page.click('#loadOlder');
  await page.waitForSelector('[data-aviso]', { state: 'detached' });
  assert.equal(await page.getAttribute('#feed', 'data-total'), String(contarDepois(Date.parse(m))));
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
  assert.equal(await page.getAttribute('#feed', 'data-total'), String(contarDepois(d.getTime(), true)));
  await page.waitForTimeout(2600);
  assert.equal(await page.evaluate(() => localStorage.getItem('tabtok.marcador')), m);
  assert.match(await page.locator('[data-fim]').textContent(), /Newsletter do Filipe Deschamps/);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('carregamento em lotes: salto longo monta 30 cards e só pede textos perto da tela, nenhuma capa', async () => {
  const { ctx, page, erros } = await abrir({ marcador: desc[0].published_at });
  await page.click('#openPanel');
  const d = new Date(agora - 19 * DIA);
  await page.fill('#dateInput', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  pedidos.capas = 0;
  pedidos.textos = 0;
  await page.click('#goDate');
  await page.waitForSelector('.post');
  await page.waitForTimeout(1500);
  d.setHours(0, 0, 0, 0);
  const total = contarDepois(d.getTime(), true);
  assert.ok(total > 60, `há ${total} publicações no período`);
  assert.equal(await page.locator('.post').count(), 30, 'primeiro lote');
  assert.equal(await page.textContent('#counter'), `1 / ${total}`, 'o feed começa no primeiro card, não pula para o fim');
  assert.equal(pedidos.capas, 0, 'o app não pede a imagem de capa');
  assert.ok(pedidos.textos <= 6, `textos pedidos ao abrir: ${pedidos.textos}`);
  for (let i = 0; i < 27; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(500); }
  await page.waitForTimeout(1500);
  const onde = await page.textContent('#counter');
  assert.match(onde, /^2\d \//, `rolou até ${onde}`);
  assert.equal(await page.locator('.post').count(), 60, 'segundo lote montado perto do fim do primeiro');
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

test('RN11: lembra o ponto do salto de data e oferece continuar dali, sem mexer no marcador', async () => {
  const marcador = desc[0].published_at;
  const { ctx, page, erros } = await abrir({ marcador });

  // salto para 5 dias atrás; lê três cards (2 s em cada)
  const d = new Date(agora - 5 * DIA);
  await page.click('#openPanel');
  await page.fill('#dateInput', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  await page.click('#goDate');
  await page.waitForSelector('.post');
  d.setHours(0, 0, 0, 0);
  const doSalto = posts.filter((p) => Date.parse(p.published_at) >= d.getTime()); // ordem: antiga -> nova
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(2600);
    if (i < 2) await page.keyboard.press('ArrowDown');
  }
  const parou = doSalto[2];

  // reabre o app: o marcador segue onde estava e o app oferece continuar
  await page.reload();
  await page.waitForSelector('.slide'); // marcador na última publicação: o feed normal só tem o card de fim
  assert.equal(await page.evaluate(() => localStorage.getItem('tabtok.marcador')), marcador, 'o marcador não mudou');
  assert.equal(await page.isVisible('#retomar'), true);
  assert.match(await page.textContent('#retomarTexto'), /Você parou em .*, no salto desde /);

  // o painel também oferece
  await page.click('#openPanel');
  assert.match(await page.textContent('#resumeJump'), /^Continuar o salto de /);
  await page.click('#closePanel');

  // continuar: começa no card em que parou (aparece de novo como o primeiro)
  await page.click('#retomarSim');
  await page.waitForTimeout(800);
  assert.equal(await page.getAttribute('#feed', 'data-total'), String(doSalto.length - 2));
  assert.equal(await page.locator('.post').first().getAttribute('data-slug'), parou.slug);
  assert.equal(await page.isVisible('#retomar'), false);
  assert.equal(await page.evaluate(() => localStorage.getItem('tabtok.marcador')), marcador, 'continuar também não move o marcador');

  // dispensar: some agora e não volta
  await page.reload();
  await page.waitForSelector('.slide'); // marcador na última publicação: o feed normal só tem o card de fim
  assert.equal(await page.isVisible('#retomar'), true, 'o ponto continua guardado depois de continuar');
  await page.click('#retomarNao');
  await page.reload();
  await page.waitForSelector('.slide'); // marcador na última publicação: o feed normal só tem o card de fim
  assert.equal(await page.isVisible('#retomar'), false);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('celular: tocar no card fechado abre o texto; título e setinha seguem alternando', async () => {
  const { ctx, page, erros } = await abrir(); // 390 x 844
  const card = page.locator('.post').first();
  const aberto = () => card.evaluate((el) => el.classList.contains('expanded'));

  await card.locator('.summary').click();
  assert.equal(await aberto(), true, 'tocar no resumo abre');
  await page.mouse.click(195, 120);
  assert.equal(await aberto(), false, 'tocar fora do texto fecha');
  await page.mouse.click(195, 300);
  assert.equal(await aberto(), true, 'tocar no cartão do título abre');
  await card.locator('.title').click();
  assert.equal(await aberto(), false, 'o título fecha (sem reabrir pelo toque no card)');
  await card.locator('.capa-texto').click();
  assert.equal(await aberto(), true, 'o cartão do título abre');
  await card.locator('.title').click();
  assert.equal(await aberto(), false, 'o título fecha de novo');
  await card.locator('.toggle').click();
  assert.equal(await aberto(), true, 'a setinha abre');
  await card.locator('.title').click();
  assert.equal(await aberto(), false, 'o título fecha');
  await card.locator('.toggle').click();
  assert.equal(await aberto(), true, 'a setinha abre');
  await card.locator('.toggle').click();
  assert.equal(await aberto(), false, 'a setinha fecha');
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('desktop: tocar no resumo não abre o texto (só a setinha ou o título)', async () => {
  const { ctx, page, erros } = await abrir({ viewport: { width: 1280, height: 860 } });
  const card = page.locator('.post').first();
  await card.locator('.summary').click();
  assert.equal(await card.evaluate((el) => el.classList.contains('expanded')), false);
  await card.locator('.toggle').click();
  assert.equal(await card.evaluate((el) => el.classList.contains('expanded')), true);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('desktop: o cartão do título abre o texto', async () => {
  const { ctx, page, erros } = await abrir({ viewport: { width: 1280, height: 860 } });
  const card = page.locator('.post').first();
  await card.locator('.capa-texto').click();
  assert.equal(await card.evaluate((el) => el.classList.contains('expanded')), true);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('o título aparece uma vez só: no cartão (fechado) ou na área de texto (aberto)', async () => {
  const { ctx, page, erros } = await abrir();
  const card = page.locator('.post').first();
  const estado = () => card.evaluate((el) => {
    const visivel = (q) => { const e = el.querySelector(q); const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(e).opacity !== '0'; };
    return { cartao: visivel('.capa-texto'), texto: visivel('.title') };
  });
  assert.deepEqual(await estado(), { cartao: true, texto: false }, 'fechado');
  await card.locator('.toggle').click();
  await page.waitForTimeout(350); // o cartão some com uma transição
  assert.deepEqual(await estado(), { cartao: false, texto: true }, 'aberto');

  // TabCoins e comentários: números simples na linha da data, sem link, nos dois estados
  const meta = card.locator('.meta');
  assert.equal(await meta.locator('a').count(), 0);
  assert.equal(await meta.locator('.num').count(), 2);
  assert.match(await meta.textContent(), /\d/);
  assert.equal(await card.locator('.rail').count(), 0, 'sem coluna lateral');
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('título longo cabe inteiro no cartão, sem encostar no resumo', async () => {
  const { ctx, page, erros } = await abrir();
  const medidas = await page.evaluate(() => {
    const s = document.querySelector('.post');
    const cartao = s.querySelector('.capa-texto');
    const titulo = 'Título muito longo de uma notícia que ocupa várias linhas no cartão e precisa aparecer por completo '.repeat(2).trim().slice(0, 250);
    cartao.dataset.tam = 'p';
    s.querySelector('.capa-titulo').textContent = titulo;
    const c = cartao.getBoundingClientRect();
    const t = s.querySelector('.capa-titulo');
    return { fimDoCartao: c.bottom, inicioDoTexto: s.querySelector('.toggle').getBoundingClientRect().top, cortado: t.scrollHeight > t.clientHeight };
  });
  assert.equal(medidas.cortado, false);
  assert.ok(medidas.fimDoCartao < medidas.inicioDoTexto, `cartão termina em ${medidas.fimDoCartao}, texto começa em ${medidas.inicioDoTexto}`);
  assert.equal(await page.locator('.post img').count(), 0, 'sem imagem de capa');
  assert.deepEqual(erros, []);
  await ctx.close();
});

/** Arrasto de verdade com o dedo (eventos de toque do Chromium). dy negativo = dedo subindo. */
async function arrastar(page, x, y, dy) {
  const cdp = await page.context().newCDPSession(page);
  const toque = (type, yy) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: yy }] });
  await toque('touchStart', y);
  const passos = 12;
  for (let i = 1; i <= passos; i++) { await toque('touchMove', y + (dy * i) / passos); await page.waitForTimeout(16); }
  await toque('touchEnd', y + dy);
  await page.waitForTimeout(400);
}

test('celular, texto aberto: arrastar para cima rola o texto, para baixo volta e, no topo ou no fim, fecha', async () => {
  const { ctx, page, erros } = await abrir({ toque: true });
  const card = page.locator('.post').first();
  await page.waitForFunction(() => document.querySelector('.post').dataset.corpo === 'ok');
  const aberto = () => card.evaluate((el) => el.classList.contains('expanded'));
  const topo = () => card.locator('.rolagem').evaluate((el) => el.scrollTop);
  const indice = () => page.textContent('#counter');

  for (const [nome, ondeComeca] of [['pela parte de cima do card', 120], ['dentro do texto', 700]]) {
    await card.locator('.toggle').click();
    assert.equal(await aberto(), true, `${nome}: abre`);
    assert.equal(await topo(), 0);

    await arrastar(page, 195, ondeComeca, -220);
    const rolado = await topo();
    assert.ok(rolado > 100, `${nome}: arrastar para cima rolou o texto (${rolado})`);
    assert.equal(await aberto(), true, `${nome}: segue aberto`);
    assert.equal(await indice(), '1 / ' + (await page.getAttribute('#feed', 'data-total')), `${nome}: o feed não saiu do card`);
    const cab = await card.locator('.cabeca').boundingBox();
    assert.ok(cab && cab.y > 0 && cab.y + cab.height < 844, `${nome}: o cabeçalho (título e compartilhar) continua na tela`);
    assert.equal(await card.locator('[data-share]').isVisible(), true, `${nome}: compartilhar segue visível durante a rolagem`);

    await arrastar(page, 195, ondeComeca, 120);
    const voltou = await topo();
    assert.ok(voltou < rolado, `${nome}: arrastar para baixo voltou o texto (${rolado} -> ${voltou})`);
    assert.equal(await aberto(), true, `${nome}: ainda aberto, pois o texto não estava no topo`);

    await arrastar(page, 195, ondeComeca, 600); // até o topo
    assert.equal(await topo(), 0, `${nome}: chegou ao topo`);
    assert.equal(await aberto(), true, `${nome}: chegar ao topo não fecha`);

    await arrastar(page, 195, ondeComeca, 160);
    assert.equal(await aberto(), false, `${nome}: já no topo, arrastar para baixo fecha`);
    assert.equal(await indice(), '1 / ' + (await page.getAttribute('#feed', 'data-total')), `${nome}: o feed continuou no mesmo card`);

    // fim da rolagem: chegar lá não fecha, mas arrastar mais para cima fecha
    await card.locator('.toggle').click();
    await card.locator('.rolagem').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    assert.equal(await aberto(), true, `${nome}: chegar ao fim não fecha`);
    await arrastar(page, 195, ondeComeca, -160);
    assert.equal(await aberto(), false, `${nome}: já no fim, arrastar para cima fecha`);
    assert.equal(await indice(), '1 / ' + (await page.getAttribute('#feed', 'data-total')), `${nome}: o feed continuou no mesmo card depois de fechar pelo fim`);
  }

  // card fechado: arrastar continua trocando de notícia como antes
  await arrastar(page, 195, 600, -500);
  await page.waitForFunction(() => document.querySelector('#counter').textContent.startsWith('2 /'));
  assert.deepEqual(erros, []);
  await ctx.close();
});
