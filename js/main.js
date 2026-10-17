// Liga tudo: estado da sessão, carregamento, observadores de leitura e interações.
import { TEMPO_LIDO_MS, VISIVEL_MIN } from './config.js';
import { criarCliente, urlNoTabNews } from './api.js';
import { slideAviso, slideFim, slidePublicacao } from './feed.js';
import { calcularJanela, selecionarItens } from './janela.js';
import { criarMarcador } from './marcador.js';
import { criarPainel } from './painel.js';
import { dataCurta, publicadoMs } from './tempo.js';
import { esc, mdParaHtml, textoPuro } from './texto.js';

const $ = (s) => document.querySelector(s);
const feed = $('#feed');
const cliente = criarCliente();
const marcador = criarMarcador();

/* ---------- estado da sessão ---------- */
let janela = null;          // resultado de calcularJanela()
let itens = [];             // publicações exibidas, da mais antiga para a mais nova
let marcadorAoAbrir = null; // para a etiqueta "nova" (RN06)

/* ---------- avisos rápidos ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- estados de tela ---------- */
function estado(html) {
  feed.innerHTML = `<div class="state">${html}</div>`;
  $('#counter').hidden = true;
}
const carregando = (msg) => estado(`<div class="note-box"><div class="spinner" aria-hidden="true"></div><p>${esc(msg)}</p></div>`);
function erro(msg) {
  estado(`<div class="note-box"><h2>Não consegui carregar as publicações</h2><p>${esc(msg)}</p><button class="btn primary" id="retry">Tentar de novo</button></div>`);
  $('#retry').addEventListener('click', () => iniciar());
}

/* ---------- renderização ---------- */
function renderizar() {
  feed.innerHTML =
    (janela.haMaisAntigas ? slideAviso({ desdeMarcador: janela.desdeMarcador }) : '') +
    itens.map((p, i) => slidePublicacao(p, i, { nova: marcadorAoAbrir !== null && publicadoMs(p) > marcadorAoAbrir })).join('') +
    slideFim({ modo: janela.modo, quantidade: itens.length, marcadorMs: marcador.ms() });
  feed.scrollTop = 0;
  observar();
  ligarBotoes();
  atualizarContador(janela.haMaisAntigas || !itens.length ? -1 : 0);
}

function atualizarContador(i) {
  const el = $('#counter');
  if (!itens.length || i < 0) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = `${i + 1} / ${itens.length}`;
}

/* ---------- observadores: texto sob demanda, leitura (RN03) e contador ---------- */
let obsVisivel;
let obsPerto;
const timers = new Map();

function observar() {
  obsVisivel?.disconnect();
  obsPerto?.disconnect();
  timers.forEach(clearTimeout);
  timers.clear();

  obsPerto = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (e.isIntersecting) { carregarCorpo(e.target); obsPerto.unobserve(e.target); }
    }
  }, { root: feed, rootMargin: '200% 0px' });

  obsVisivel = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      const el = e.target;
      if (e.isIntersecting) {
        const i = el.dataset.i !== undefined ? Number(el.dataset.i) : -1;
        atualizarContador(i);
        if (i >= 0) timers.set(el, setTimeout(() => marcador.avancar(itens[i].published_at), TEMPO_LIDO_MS));
      } else {
        clearTimeout(timers.get(el));
        timers.delete(el);
        fecharTexto(el);
      }
    }
  }, { root: feed, threshold: VISIVEL_MIN });

  feed.querySelectorAll('.slide').forEach((s) => {
    obsVisivel.observe(s);
    if (s.classList.contains('post')) obsPerto.observe(s);
  });
}

async function carregarCorpo(slide) {
  const resumo = slide.querySelector('.summary');
  try {
    const md = await cliente.corpo(slide.dataset.slug);
    resumo.textContent = textoPuro(md).slice(0, 320);
    slide.querySelector('.body').innerHTML = mdParaHtml(md);
  } catch {
    resumo.textContent = 'Não consegui carregar o texto. Abra no TabNews pelo link do texto expandido.';
  }
}

/* ---------- interações ---------- */
function fecharTexto(slide) {
  slide.classList.remove('expanded');
  slide.querySelector('.toggle')?.setAttribute('aria-expanded', 'false');
}

function ligarBotoes() {
  feed.querySelectorAll('.post').forEach((s) => {
    const alternar = () => {
      const aberto = s.classList.toggle('expanded');
      s.querySelector('.toggle').setAttribute('aria-expanded', String(aberto));
      if (aberto) s.querySelector('.info').scrollTop = 0;
    };
    s.querySelector('.toggle').addEventListener('click', alternar);
    s.querySelector('.title').addEventListener('click', alternar);
    // Com o texto aberto, um toque fora dele (na parte de cima do card) volta ao resumo.
    s.querySelector('.card').addEventListener('click', (e) => {
      if (s.classList.contains('expanded') && !e.target.closest('.info')) alternar();
    });
    s.querySelector('[data-share]').addEventListener('click', () => compartilhar(itens[Number(s.dataset.i)]));
  });
  $('#loadOlder')?.addEventListener('click', carregarAntigas);
  $('#skipOlder')?.addEventListener('click', () => irPara(1));
  feed.querySelectorAll('[data-reload]').forEach((b) => b.addEventListener('click', () => iniciar(janela.modo === 'data' ? { data: janela.inicio } : {})));
  feed.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => iniciar()));
  feed.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => painel.abrir()));
}

async function compartilhar(p) {
  const url = urlNoTabNews(p.slug);
  if (navigator.share) {
    try { await navigator.share({ title: p.title, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copiado');
  } catch {
    toast('Não consegui copiar o link');
  }
}

const reduzirMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function irPara(i) {
  const slides = feed.querySelectorAll('.slide');
  slides[Math.max(0, Math.min(i, slides.length - 1))]?.scrollIntoView({ behavior: reduzirMovimento() ? 'auto' : 'smooth' });
}
const indiceAtual = () => Math.round(feed.scrollTop / feed.clientHeight);

$('#prev').addEventListener('click', () => irPara(indiceAtual() - 1));
$('#next').addEventListener('click', () => irPara(indiceAtual() + 1));
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, dialog')) return;
  if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); irPara(indiceAtual() + 1); }
  if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); irPara(indiceAtual() - 1); }
});

/* ---------- carregamento ---------- */
async function carregarAntigas() {
  const btn = $('#loadOlder');
  btn.disabled = true;
  btn.textContent = 'Carregando…';
  try {
    await cliente.buscarAte(janela.desdeMarcador, (n) => { btn.textContent = `Carregando página ${n}…`; });
    janela = { ...janela, inicio: janela.desdeMarcador, haMaisAntigas: false };
    itens = selecionarItens(cliente.publicacoes(), janela);
    renderizar();
    toast(`${itens.length} publicações desde o marcador`);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Tentar de novo';
    toast(e.message);
  }
}

async function iniciar(opcoes = {}) {
  cliente.reiniciar();
  marcadorAoAbrir = marcador.ms();
  janela = calcularJanela({ agora: Date.now(), marcadorMs: marcadorAoAbrir, data: opcoes.data });
  try {
    carregando('Buscando publicações…');
    await cliente.buscarAte(janela.inicio, (n) => { if (n > 1) carregando(`Buscando publicações… página ${n}`); });
    itens = selecionarItens(cliente.publicacoes(), janela);
    renderizar();
    if (janela.modo === 'marcador' && itens.length) {
      toast(`${itens.length} ${itens.length === 1 ? 'publicação nova' : 'publicações novas'}`);
    }
    if (janela.modo === 'data') toast(`Desde ${dataCurta(janela.inicio)}: ${itens.length} publicações`);
  } catch (e) {
    erro(e.message || 'Verifique sua conexão com a internet.');
  }
}

/* ---------- painel ---------- */
const painel = criarPainel({
  marcador,
  modoAtual: () => janela?.modo,
  aoIrParaData: (inicio) => iniciar({ data: inicio }),
  aoVoltar: () => iniciar(),
  aoZerar: () => { marcador.zerar(); toast('Marcador zerado'); iniciar(); },
});
$('#openPanel').addEventListener('click', () => painel.abrir());

/* ---------- PWA: em HTTPS (o GitHub Pages) ou no servidor local ---------- */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  // Quando uma versão nova do app assume o controle, recarrega uma vez para usá-la.
  // Na primeira instalação não há versão anterior, então não recarrega.
  const haviaVersao = Boolean(navigator.serviceWorker.controller);
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!haviaVersao || recarregou) return;
    recarregou = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js')
    .then((registro) => {
      // Ao voltar para o app (ex.: reabrir pela tela inicial), procura versão nova.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registro.update().catch(() => {});
      });
    })
    .catch(() => { /* o app funciona sem */ });
}

iniciar();
