// Ponto do salto de data (RN11): onde a pessoa parou ao ler a partir de uma data antiga.
// É guardado À PARTE do marcador (RN02): o marcador continua sendo a publicação mais nova
// já lida e nunca volta; o salto lembra só "comecei em tal dia e parei em tal publicação".
import { CHAVE_SALTO } from './config.js';

function armazenamentoPadrao() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/**
 * @param {Storage | null} armazenamento  localStorage no navegador; nos testes, um objeto falso.
 */
export function criarSalto(armazenamento = armazenamentoPadrao()) {
  /** @returns {{inicio: number, ponto: string | null} | null} */
  function ler() {
    try {
      const bruto = armazenamento?.getItem(CHAVE_SALTO);
      if (!bruto) return null;
      const { inicio, ponto } = JSON.parse(bruto);
      if (!Number.isFinite(inicio)) return null;
      return { inicio, ponto: typeof ponto === 'string' && !Number.isNaN(Date.parse(ponto)) ? ponto : null };
    } catch {
      return null;
    }
  }

  function gravar(salto) {
    try { armazenamento?.setItem(CHAVE_SALTO, JSON.stringify(salto)); } catch { /* sem armazenamento */ }
  }

  return {
    ler,

    /** Começa um salto novo a partir de `inicioMs`. Substitui o anterior (só um fica guardado). */
    comecar(inicioMs) {
      gravar({ inicio: inicioMs, ponto: null });
    },

    /**
     * Anda o ponto para `publicadoEm` se for mais novo que o atual (dentro do mesmo salto).
     * Sem salto em andamento, não faz nada.
     * @returns {boolean} true se o ponto mudou.
     */
    avancar(publicadoEm) {
      const novo = Date.parse(publicadoEm);
      const atual = ler();
      if (!atual || Number.isNaN(novo)) return false;
      if (atual.ponto !== null && novo <= Date.parse(atual.ponto)) return false;
      gravar({ ...atual, ponto: publicadoEm });
      return true;
    },

    /**
     * O salto que vale a pena oferecer para continuar, ou null.
     * Só vale se já houve leitura nele e se o ponto ainda está ANTES do marcador: quando o ponto
     * alcança o marcador, o salto acabou e o feed normal já continua dali.
     * @param {number | null} marcadorMs
     */
    pendente(marcadorMs) {
      const s = ler();
      if (!s || s.ponto === null || marcadorMs === null) return null;
      return Date.parse(s.ponto) < marcadorMs ? s : null;
    },

    limpar() {
      try { armazenamento?.removeItem(CHAVE_SALTO); } catch { /* sem armazenamento */ }
    },
  };
}
