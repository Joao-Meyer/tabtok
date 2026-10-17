// RN10 (nome da fonte, critério 6) e tratamento do texto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nomeFonte } from '../js/fontes.js';
import { esc, mdParaHtml, textoPuro } from '../js/texto.js';

test('nomeFonte: sites conhecidos, archive.today e desconhecidos', () => {
  const casos = {
    'https://finance.yahoo.com/technology/article/x.html': 'Yahoo Finance',
    'http://archive.today/2026.10.13-112915/https://www.theverge.com/ai/1009802/x': 'The Verge',
    'https://archive.ph/abc/https://tecnoblog.net/noticias/x/': 'Tecnoblog',
    'https://tech.slashdot.org/story/26/10/15/x': 'Slashdot',
    'https://about.fb.com/news/x': 'Meta',
    'https://www.gov.br/transportes/x': 'gov.br',
    'https://survey.stackoverflow.co/2026': 'Stack Overflow',
    'https://www.bbc.com/news/articles/x': 'BBC',
    'https://convergenciadigital.com.br/mercado/x': 'Convergência Digital',
    'https://desconhecido.example.net/a': 'desconhecido.example.net',
  };
  for (const [url, esperado] of Object.entries(casos)) assert.equal(nomeFonte(url), esperado, url);
});

test('nomeFonte: sem link ou link inválido', () => {
  assert.equal(nomeFonte(null), null);
  assert.equal(nomeFonte(''), null);
  assert.equal(nomeFonte('não é url'), null);
});

test('textoPuro remove a marcação do Markdown', () => {
  const md = '# Título\n\nO **sudo-rs** é [uma reimplementação](https://x.y) do `sudo`.\n\n![img](a.png)\n\n```js\ncodigo()\n```';
  assert.equal(textoPuro(md), 'Título O sudo-rs é uma reimplementação do sudo.');
  assert.equal(textoPuro('> citação\n\nse a > b'), 'citação se a > b');
});

test('esc escapa HTML', () => {
  assert.equal(esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(esc(null), '');
});

test('mdParaHtml sem as bibliotecas: parágrafos de texto escapado', () => {
  const html = mdParaHtml('Primeiro **parágrafo** <script>alert(1)</script>\n\nSegundo [link](https://x.y)', { marked: null, DOMPurify: null });
  assert.equal(html, '<p>Primeiro parágrafo &lt;script&gt;alert(1)&lt;/script&gt;</p><p>Segundo link</p>');
});
