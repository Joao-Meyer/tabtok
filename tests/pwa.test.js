// Critério 8 (parte estática): o manifesto e o service worker apontam para arquivos que existem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;

test('manifesto: ícones de 192 e 512 px existem, incluindo o maskable', () => {
  const m = JSON.parse(readFileSync(join(raiz, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.start_url, './');
  assert.equal(m.display, 'standalone');
  const tamanhos = m.icons.map((i) => i.sizes);
  assert.ok(tamanhos.includes('192x192'));
  assert.ok(tamanhos.includes('512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(existsSync(join(raiz, i.src)), i.src);
});

test('service worker: guarda todos os módulos do app e só arquivos que existem', () => {
  const sw = readFileSync(join(raiz, 'sw.js'), 'utf8');
  const lista = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);
  for (const arq of lista) assert.ok(existsSync(join(raiz, arq)), `sw.js lista ${arq}, que não existe`);
  for (const js of readdirSync(join(raiz, 'js'))) assert.ok(lista.includes(`js/${js}`), `sw.js não guarda js/${js}`);
});

test('index.html liga manifesto, ícone e módulo principal', () => {
  const html = readFileSync(join(raiz, 'index.html'), 'utf8');
  assert.match(html, /rel="manifest" href="manifest.webmanifest"/);
  assert.match(html, /rel="icon"[^>]*href="icons\/favicon.svg"/);
  assert.match(html, /type="module" src="js\/main.js"/);
});
