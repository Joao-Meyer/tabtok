// Decide de onde o feed começa (RN05 a RN08) e quais publicações entram nele (RN01).
// Funções puras: não acessam rede, relógio nem armazenamento.
import { DIA, HORA, LIMITE_DIAS, PRIMEIRA_VISITA_H } from './config.js';
import { publicadoMs } from './tempo.js';

/**
 * @param {object} p
 * @param {number} p.agora           momento atual (ms)
 * @param {number|null} p.marcadorMs marcador de leitura (ms) ou null
 * @param {number} [p.data]          meia-noite do dia escolhido em "ir para uma data" (ms)
 * @returns {{modo: 'primeira'|'marcador'|'data', inicio: number, inclusivo: boolean,
 *            desdeMarcador: number|null, haMaisAntigas: boolean}}
 */
export function calcularJanela({ agora, marcadorMs, data }) {
  if (data !== undefined && data !== null) {
    // RN08: salto para uma data, desde o início daquele dia
    return { modo: 'data', inicio: data, inclusivo: true, desdeMarcador: marcadorMs, haMaisAntigas: false };
  }
  if (marcadorMs === null || marcadorMs === undefined) {
    // RN05: primeira visita
    return { modo: 'primeira', inicio: agora - PRIMEIRA_VISITA_H * HORA, inclusivo: false, desdeMarcador: null, haMaisAntigas: false };
  }
  // RN06 e RN07: retorno, com limite para ausências longas
  const limite = agora - LIMITE_DIAS * DIA;
  const haMaisAntigas = marcadorMs < limite;
  return {
    modo: 'marcador',
    inicio: haMaisAntigas ? limite : marcadorMs,
    inclusivo: false,
    desdeMarcador: marcadorMs,
    haMaisAntigas,
  };
}

/**
 * Publicações dentro da janela, da mais antiga para a mais nova (RN01).
 * @param {Array<{published_at: string}>} publicacoes
 * @param {{inicio: number, inclusivo: boolean}} janela
 */
export function selecionarItens(publicacoes, { inicio, inclusivo }) {
  return publicacoes
    .filter((p) => (inclusivo ? publicadoMs(p) >= inicio : publicadoMs(p) > inicio))
    .sort((a, b) => publicadoMs(a) - publicadoMs(b));
}

/**
 * RN05, complemento: na primeira visita, se não houver nada nas últimas 24 horas
 * (fim de semana, feriado), começa na meia-noite do dia da publicação mais recente.
 * @param {ReturnType<typeof calcularJanela>} janela
 * @param {Array<{published_at: string}>} publicacoes
 * @returns {ReturnType<typeof calcularJanela> & {ultimoDia: true} | null} null se não houver publicação nenhuma
 */
export function janelaDoUltimoDia(janela, publicacoes) {
  if (!publicacoes.length) return null;
  const dia = new Date(Math.max(...publicacoes.map(publicadoMs)));
  dia.setHours(0, 0, 0, 0);
  return { ...janela, inicio: dia.getTime(), inclusivo: true, ultimoDia: true };
}
