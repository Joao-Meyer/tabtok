// Monta o HTML dos cards do feed (seção 4 da especificação). Funções puras: recebem dados, devolvem texto.
import { LIMITE_DIAS, NEWSLETTER, TABNEWS } from './config.js';
import { urlNoTabNews, urlThumbnail } from './api.js';
import { nomeFonte } from './fontes.js';
import { diasAtras, publicadoMs, quando, quandoCurto } from './tempo.js';
import { esc } from './texto.js';

export const ICONES = {
  seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 15 7-7 7 7"/></svg>',
  compartilhar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M14 4v4C7 8.5 4 13 3.5 20c2.5-3.6 5.5-5.2 10.5-5.2V19l7-7.5Z"/></svg>',
  comentarios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 0 0-7.6 12.3L3.5 20.5l4.7-.9A8.5 8.5 0 1 0 12 3.5Z"/><path d="M8.5 10.5h7M8.5 13.5h4.5"/></svg>',
  tabcoins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><ellipse cx="12" cy="9" rx="8" ry="4"/><path d="M4 9v5c0 2.2 3.6 4 8 4s8-1.8 8-4V9"/></svg>',
};

/** Crédito ao conteúdo, mostrado no painel e no fim da fila (critério de aceite 9). */
export const ATRIBUICAO =
  `Conteúdo do <a href="${TABNEWS}" target="_blank" rel="noopener">TabNews</a> e da ` +
  `<a href="${NEWSLETTER}" target="_blank" rel="noopener">Newsletter do Filipe Deschamps</a>. ` +
  'O TabTok é um projeto independente, sem vínculo oficial.';

/**
 * Card de uma publicação.
 * @param {object} p      publicação da API
 * @param {number} i      posição no feed
 * @param {{nova: boolean}} opcoes
 */
export function slidePublicacao(p, i, { nova }) {
  const linkTabNews = urlNoTabNews(p.slug);
  const fonte = nomeFonte(p.source_url);
  return `
  <section class="slide post" data-i="${i}" data-slug="${esc(p.slug)}" aria-label="${esc(p.title)}">
    <div class="col">
      <div class="card">
        <img class="thumb" loading="lazy" alt="" src="${urlThumbnail(p.slug)}">
        <div class="info">
          <button class="toggle" aria-expanded="false" aria-label="Expandir texto">${ICONES.seta}</button>
          <div class="meta"><span>${esc(quando(publicadoMs(p)))}</span>${nova ? '<span class="new">nova</span>' : ''}</div>
          <h2 class="title">${esc(p.title)}</h2>
          <p class="summary">Carregando…</p>
          <div class="body"></div>
          <div class="links">
            <a href="${linkTabNews}" target="_blank" rel="noopener">Ver no TabNews</a>
            ${p.source_url ? `<a href="${esc(p.source_url)}" target="_blank" rel="noopener">Fonte: ${esc(fonte || 'original')}</a>` : ''}
          </div>
        </div>
      </div>
      <div class="rail">
        <button class="act" data-share aria-label="Compartilhar">${ICONES.compartilhar}<span>Comp…</span></button>
        <a class="act" href="${linkTabNews}" target="_blank" rel="noopener" aria-label="${Number(p.children_deep_count) || 0} comentários">${ICONES.comentarios}<span>${Number(p.children_deep_count) || 0}</span></a>
        <span class="act" aria-label="${Number(p.tabcoins) || 0} TabCoins">${ICONES.tabcoins}<span>${Number(p.tabcoins) || 0}</span></span>
      </div>
    </div>
  </section>`;
}

/** RN07: aviso de ausência longa. */
export function slideAviso({ desdeMarcador, agora = Date.now() }) {
  return `
  <section class="slide note" data-aviso>
    <div class="col"><div class="card"><div class="note-box">
      <h2>Você ficou ${diasAtras(desdeMarcador, agora)} dias sem abrir</h2>
      <p>Seu marcador está em <span class="mark">${esc(quandoCurto(desdeMarcador))}</span>. Para não pedir páginas demais à API, carreguei só os últimos ${LIMITE_DIAS} dias.</p>
      <div class="btn-row">
        <button class="btn primary" id="loadOlder">Carregar desde o marcador</button>
        <button class="btn" id="skipOlder">Começar pelos últimos ${LIMITE_DIAS} dias</button>
      </div>
    </div></div></div>
  </section>`;
}

/** RN09: fim da fila. */
export function slideFim({ modo, quantidade, marcadorMs }) {
  let titulo;
  let texto;
  if (!quantidade && modo === 'marcador') {
    titulo = 'Você está em dia';
    texto = `Nenhuma publicação nova desde <span class="mark">${esc(quandoCurto(marcadorMs))}</span>.`;
  } else if (!quantidade) {
    titulo = 'Nada por aqui';
    texto = 'Não há publicações nesse período.';
  } else {
    titulo = 'Fim da fila';
    texto = 'Você chegou às publicações mais recentes.';
  }
  const segundo = modo === 'data'
    ? '<button class="btn" data-back>Voltar ao ponto de leitura</button>'
    : '<button class="btn" data-panel>Ir para uma data</button>';
  return `
  <section class="slide note" data-fim>
    <div class="col"><div class="card"><div class="note-box">
      <h2>${titulo}</h2>
      <p>${texto}</p>
      <div class="btn-row">
        <button class="btn primary" data-reload>Buscar novidades</button>
        ${segundo}
      </div>
      <p class="credito">${ATRIBUICAO}</p>
    </div></div></div>
  </section>`;
}
