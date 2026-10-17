// Marcador de leitura (RN02 e RN04): guarda o `published_at` da publicação
// mais adiante já lida e só anda para a frente.
import { CHAVE_MARCADOR } from './config.js';

function armazenamentoPadrao() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/**
 * @param {Storage | null} armazenamento  localStorage no navegador; nos testes, um objeto falso.
 */
export function criarMarcador(armazenamento = armazenamentoPadrao()) {
  function ler() {
    try { return armazenamento?.getItem(CHAVE_MARCADOR) ?? null; } catch { return null; }
  }

  return {
    /** Valor guardado (ISO 8601) ou null. */
    iso: ler,

    /** Valor guardado em milissegundos, ou null se não houver (ou for inválido). */
    ms() {
      const v = ler();
      const n = v ? Date.parse(v) : NaN;
      return Number.isNaN(n) ? null : n;
    },

    /**
     * Avança o marcador para `publicadoEm` se for mais novo que o atual.
     * @returns {boolean} true se o marcador mudou.
     */
    avancar(publicadoEm) {
      const novo = Date.parse(publicadoEm);
      if (Number.isNaN(novo)) return false;
      const atual = this.ms();
      if (atual !== null && novo <= atual) return false;
      try {
        armazenamento?.setItem(CHAVE_MARCADOR, publicadoEm);
        return true;
      } catch {
        return false;
      }
    },

    zerar() {
      try { armazenamento?.removeItem(CHAVE_MARCADOR); } catch { /* sem armazenamento */ }
    },
  };
}
