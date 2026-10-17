// Datas e horários exibidos na interface (sempre no fuso do navegador).
import { DIA } from './config.js';

const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

const semPonto = (s) => s.replace('.', '');

/** Momento de publicação em milissegundos. */
export const publicadoMs = (p) => Date.parse(p.published_at);

/** "qua, 14 de out · 15:00" */
export function quando(ms) {
  const d = new Date(ms);
  return `${semPonto(fmtDia.format(d))}, ${semPonto(fmtData.format(d))} · ${fmtHora.format(d)}`;
}

/** "14 de out, 15:00" */
export function quandoCurto(ms) {
  const d = new Date(ms);
  return `${semPonto(fmtData.format(d))}, ${fmtHora.format(d)}`;
}

/** "14 de out" */
export function dataCurta(ms) {
  return semPonto(fmtData.format(new Date(ms)));
}

/** "sex, 16 de out" */
export function quandoDia(ms) {
  const d = new Date(ms);
  return `${semPonto(fmtDia.format(d))}, ${semPonto(fmtData.format(d))}`;
}

/** Dias inteiros desde `ms` (mínimo 1). */
export function diasAtras(ms, agora = Date.now()) {
  return Math.max(1, Math.round((agora - ms) / DIA));
}

/** "2026-10-14" a partir de uma data local, para o campo <input type="date">. */
export function paraCampoData(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Meia-noite local do dia escrito como "2026-10-14". */
export function inicioDoDia(valorCampo) {
  const [a, m, d] = valorCampo.split('-').map(Number);
  return new Date(a, m - 1, d).getTime();
}
