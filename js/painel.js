// Painel do calendário: marcador atual, ir para uma data, voltar, zerar.
import { DIA } from './config.js';
import { ATRIBUICAO } from './feed.js';
import { inicioDoDia, paraCampoData, quandoCurto } from './tempo.js';
import { esc } from './texto.js';

/**
 * @param {object} p
 * @param {ReturnType<import('./marcador.js').criarMarcador>} p.marcador
 * @param {() => string} p.modoAtual
 * @param {(inicioMs: number) => void} p.aoIrParaData
 * @param {() => void} p.aoVoltar
 * @param {() => void} p.aoZerar
 */
export function criarPainel({ marcador, modoAtual, aoIrParaData, aoVoltar, aoZerar }) {
  const $ = (s) => document.querySelector(s);
  const painel = $('#panel');
  $('#credito').innerHTML = ATRIBUICAO;

  function abrir() {
    const m = marcador.ms();
    $('#panelMark').innerHTML = m === null
      ? 'Ainda não há marcador. Ele é criado quando você passa uns segundos numa publicação.'
      : `Lido até <span class="mark">${esc(quandoCurto(m))}</span>.`;
    $('#backToMark').hidden = modoAtual() !== 'data';
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
  $('#resetMark').addEventListener('click', () => { $('#resetMark').hidden = true; $('#resetConfirm').hidden = false; });
  $('#resetNo').addEventListener('click', () => { $('#resetMark').hidden = false; $('#resetConfirm').hidden = true; });
  $('#resetYes').addEventListener('click', () => { painel.close(); aoZerar(); });

  return { abrir };
}
