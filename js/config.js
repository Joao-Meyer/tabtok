// Configurações do TabTok. Valores decididos na especificação (seção 3, regras de negócio).

export const API = 'https://www.tabnews.com.br/api/v1/contents/NewsletterOficial';
export const SITE = 'https://www.tabnews.com.br/NewsletterOficial';
export const TABNEWS = 'https://www.tabnews.com.br';
export const NEWSLETTER = 'https://filipedeschamps.com.br/newsletter';
export const REPOSITORIO = 'https://github.com/Joao-Meyer/tabtok';

export const POR_PAGINA = 100;        // máximo aceito pela API
export const MAX_PAGINAS = 40;        // trava de segurança por carregamento
export const LIMITE_DIAS = 7;         // RN07: ausência longa carrega só os últimos N dias
export const PRIMEIRA_VISITA_H = 24;  // RN05: primeira visita mostra as últimas N horas
export const TEMPO_LIDO_MS = 2000;    // RN03: tempo visível para contar como lida
export const VISIVEL_MIN = 0.6;       // RN03: fração do card que precisa estar na tela

export const CHAVE_MARCADOR = 'tabtok.marcador';

export const HORA = 3600000;
export const DIA = 24 * HORA;
