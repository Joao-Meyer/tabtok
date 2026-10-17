// Seção 4: conteúdo dos cards e atribuição (critério 9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATRIBUICAO, slideAviso, slideFim, slidePublicacao } from '../js/feed.js';
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
  assert.match(html, /<span>204<\/span>/);
  assert.match(html, /<span>9<\/span>/);
  assert.match(html, /class="new">nova/);
  // a capa só é pedida quando o card chega perto da tela: vem em data-src, sem src
  assert.match(html, /<img class="thumb"[^>]*data-src="[^"]*NewsletterOficial\/ubuntu-sudo-rust\/thumbnail"/);
  assert.doesNotMatch(html, /<img class="thumb"[^>]* src=/);
  assert.doesNotMatch(html, /--capa/);
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
