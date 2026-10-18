// Painel do calendário: marcador atual, ir para uma data, voltar, zerar.
import { DIA, REPOSITORIO, VERSAO } from './config.js';
import { ATRIBUICAO } from './feed.js';
import { dataCurta, inicioDoDia, paraCampoData, quandoCurto } from './tempo.js';
import { esc } from './texto.js';

/**
 * @param {object} p
 * @param {ReturnType<import('./marcador.js').criarMarcador>} p.marcador
 * @param {ReturnType<import('./salto.js').criarSalto>} p.salto
 * @param {() => void} p.aoRetomar
 * @param {() => string} p.modoAtual
 * @param {(inicioMs: number) => void} p.aoIrParaData
 * @param {() => void} p.aoVoltar
 * @param {() => void} p.aoZerar
 */
export function criarPainel({ marcador, salto, aoRetomar, modoAtual, aoIrParaData, aoVoltar, aoZerar }) {
  const $ = (s) => document.querySelector(s);
  const painel = $('#panel');
  $('#credito').innerHTML = ATRIBUICAO;
  // Versão publicada (commit), para conferir se o app instalado já atualizou.
  $('#versao').innerHTML = VERSAO === 'dev'
    ? 'Versão de desenvolvimento.'
    : `Versão <a href="${REPOSITORIO}/commit/${VERSAO}" target="_blank" rel="noopener">${VERSAO}</a>.`;

  function abrir() {
    const m = marcador.ms();
    $('#panelMark').innerHTML = m === null
      ? 'Ainda não há marcador. Ele é criado quando você passa uns segundos numa publicação.'
      : `Lido até <span class="mark">${esc(quandoCurto(m))}</span>.`;
    $('#backToMark').hidden = modoAtual() !== 'data';
    const s = salto.pendente(m);
    $('#resumeJump').hidden = !s || modoAtual() === 'data';
    if (s) $('#resumeJump').textContent = `Continuar o salto de ${dataCurta(s.inicio)} (parou em ${quandoCurto(Date.parse(s.ponto))})`;
    const hoje = new Date();
    $('#dateInput').max = paraCampoData(hoje);
    if (!$('#dateInput').value) $('#dateInput').value = paraCampoData(new Date(hoje.getTime() - DIA));
    $('#resetConfirm').hidden = true;
    $('#resetMark').hidden = false;
    painel.showModal();
  }

  $('#closePanel').addEventListener('click', () => painel.close());
  painel.addEventListener('click', (e) => { if (e.target === painel) painel.close(); });
  $('#goDate').addEventListener('click', () => {
    const v = $('#dateInput').value;
    if (!v) return;
    painel.close();
    aoIrParaData(inicioDoDia(v));
  });
  $('#backToMark').addEventListener('click', () => { painel.close(); aoVoltar(); });
  $('#resumeJump').addEventListener('click', () => { painel.close(); aoRetomar(); });
  $('#resetMark').addEventListener('click', () => { $('#resetMark').hidden = true; $('#resetConfirm').hidden = false; });
  $('#resetNo').addEventListener('click', () => { $('#resetMark').hidden = false; $('#resetConfirm').hidden = true; });
  $('#resetYes').addEventListener('click', () => { painel.close(); aoZerar(); });

  return { abrir };
}
