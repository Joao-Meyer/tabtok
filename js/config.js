// Configurações do TabTok. Valores decididos na especificação (seção 3, regras de negócio).

export const API = 'https://www.tabnews.com.br/api/v1/contents/NewsletterOficial';
export const SITE = 'https://www.tabnews.com.br/NewsletterOficial';
export const TABNEWS = 'https://www.tabnews.com.br';
export const NEWSLETTER = 'https://filipedeschamps.com.br/newsletter';
export const REPOSITORIO = 'https://github.com/Joao-Meyer/tabtok';

// Trocado pelo commit publicado no GitHub Actions; localmente fica "dev".
export const VERSAO = '__VERSAO__'.startsWith('__') ? 'dev' : '__VERSAO__';

export const POR_PAGINA = 100;        // máximo aceito pela API
export const MAX_PAGINAS = 40;        // trava de segurança por carregamento
export const LIMITE_DIAS = 7;         // RN07: ausência longa carrega só os últimos N dias
export const PRIMEIRA_VISITA_H = 24;  // RN05: primeira visita mostra as últimas N horas
export const TEMPO_LIDO_MS = 2000;    // RN03: tempo visível para contar como lida
export const VISIVEL_MIN = 0.6;       // RN03: fração do card que precisa estar na tela

// Carregamento em lotes (evita pedir centenas de capas e textos de uma vez)
export const LOTE_CARDS = 30;         // cards montados por vez no feed
export const ANTECEDENCIA_LOTE = 5;   // monta o próximo lote a 5 cards do fim
export const TEXTOS_SIMULTANEOS = 2;  // pedidos de texto ao mesmo tempo
export const TENTATIVAS = 3;          // tentativas por texto quando o TabNews recusa
export const ESPERA_BASE_MS = 1500;   // espera antes de tentar de novo (dobra a cada vez)

export const CHAVE_MARCADOR = 'tabtok.marcador';
export const CHAVE_SALTO = 'tabtok.salto';

export const HORA = 3600000;
export const DIA = 24 * HORA;
