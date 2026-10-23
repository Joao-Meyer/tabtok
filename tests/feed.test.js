// Seção 4: conteúdo dos cards e atribuição (critério 9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATRIBUICAO, SEM_TITULO, slideAviso, slideFim, slidePublicacao, tamanhoTitulo } from '../js/feed.js';
import { DIA } from '../js/config.js';

const pub = {
  id: 'a1',
  slug: 'ubuntu-sudo-rust',
  title: 'Ubuntu 25.10 adotará <sudo> em Rust',
  published_at: '2026-10-16T15:00:00.000Z',
  source_url: 'https://finance.yahoo.com/x',
  tabcoins: 9,
  children_deep_count: 204,
};

test('card mostra título escapado, fonte, contadores e etiqueta "nova"', () => {
  const html = slidePublicacao(pub, 3, { nova: true });
  assert.match(html, /data-i="3"/);
  assert.match(html, /Ubuntu 25\.10 adotará &lt;sudo&gt; em Rust/);
  assert.match(html, /Fonte: Yahoo Finance/);
  assert.match(html, /class="new">nova/);
  // TabCoins e comentários são números simples na linha da data, sem link
  assert.match(html, /<span class="num" aria-label="9 TabCoins">.*<span>9<\/span><\/span>/);
  assert.match(html, /<span class="num" aria-label="204 comentários">.*<span>204<\/span><\/span>/);
  assert.doesNotMatch(html, /class="act"/);
  assert.match(html, /data-share/);
  // não pede mais a capa do TabNews
  assert.doesNotMatch(html, /thumbnail|<img|--capa/);
});

test('título inteiro no cartão (escondido dos leitores de tela) e uma vez só na área de texto', () => {
  const titulo = 'Título bem longo '.repeat(10).trim();
  const html = slidePublicacao({ ...pub, title: titulo }, 0, { nova: false });
  assert.match(html, new RegExp(`<p class="capa-titulo" aria-hidden="true">${titulo}</p>`));
  assert.match(html, new RegExp(`<h2 class="title">${titulo}</h2>`));
  assert.match(html, /data-tam="p"/);
});

test('publicação sem título (null, ausente ou só espaços) não derruba o card', () => {
  for (const title of [null, undefined, '', '   ']) {
    const html = slidePublicacao({ ...pub, title }, 0, { nova: false });
    assert.match(html, new RegExp(`<p class="capa-titulo" aria-hidden="true">${SEM_TITULO}</p>`), String(title));
    assert.match(html, new RegExp(`<h2 class="title">${SEM_TITULO}</h2>`));
    assert.match(html, /data-tam="g"/);
  }
  assert.equal(tamanhoTitulo(null), 'g');
  assert.equal(tamanhoTitulo(undefined), 'g');
});

test('tamanho do título: curto, médio e longo', () => {
  assert.equal(tamanhoTitulo('a'.repeat(60)), 'g');
  assert.equal(tamanhoTitulo('a'.repeat(61)), 'm');
  assert.equal(tamanhoTitulo('a'.repeat(110)), 'm');
  assert.equal(tamanhoTitulo('a'.repeat(111)), 'p');
});

test('card sem source_url não mostra o botão de fonte', () => {
  const html = slidePublicacao({ ...pub, source_url: null }, 0, { nova: false });
  assert.doesNotMatch(html, /Fonte:/);
  assert.doesNotMatch(html, /class="new"/);
});

test('aviso de ausência longa diz quantos dias e oferece carregar', () => {
  const agora = Date.parse('2026-10-16T21:00:00Z');
  const html = slideAviso({ desdeMarcador: agora - 14 * DIA, agora });
  assert.match(html, /ficou 14 dias sem abrir/);
  assert.match(html, /id="loadOlder"/);
});

test('fim da fila: mensagens e atribuição', () => {
  assert.match(slideFim({ modo: 'marcador', quantidade: 0, marcadorMs: Date.now() }), /Você está em dia/);
  assert.match(slideFim({ modo: 'primeira', quantidade: 5, marcadorMs: null }), /Fim da fila/);
  assert.match(slideFim({ modo: 'data', quantidade: 5, marcadorMs: null }), /data-back/);
  assert.ok(slideFim({ modo: 'primeira', quantidade: 5, marcadorMs: null }).includes(ATRIBUICAO));
  assert.match(ATRIBUICAO, /TabNews/);
  assert.match(ATRIBUICAO, /Newsletter do Filipe Deschamps/);
});
