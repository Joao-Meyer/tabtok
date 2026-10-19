// Acesso à API pública do TabNews (seção 5 da especificação).
// A lista vem do mais novo para o mais antigo; paginamos até passar do ponto de partida.
import { API, ESPERA_BASE_MS, MAX_PAGINAS, POR_PAGINA, SITE, TENTATIVAS, TEXTOS_SIMULTANEOS } from './config.js';
import { publicadoMs } from './tempo.js';

export class ErroApi extends Error {
  constructor(mensagem, status = null) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
  }
}

export const urlPagina = (n) => `${API}?page=${n}&per_page=${POR_PAGINA}&strategy=new`;
export const urlPublicacao = (slug) => `${API}/${encodeURIComponent(slug)}`;
export const urlNoTabNews = (slug) => `${SITE}/${encodeURIComponent(slug)}`;

const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Fila com limite de tarefas ao mesmo tempo. A próxima a sair é a pedida por último
 * (pilha): no feed, é o card que a pessoa está vendo agora, não os que ela já passou.
 * @param {number} limite
 * @returns {(tarefa: () => Promise<any>) => Promise<any>}
 */
export function criarFila(limite) {
  let ativas = 0;
  const pendentes = [];
  function proxima() {
    if (ativas >= limite || !pendentes.length) return;
    const { tarefa, ok, erro } = pendentes.pop();
    ativas++;
    Promise.resolve()
      .then(tarefa)
      .then(ok, erro)
      .finally(() => { ativas--; proxima(); });
  }
  return (tarefa) => new Promise((ok, erro) => { pendentes.push({ tarefa, ok, erro }); proxima(); });
}

/** Vale a pena tentar de novo? Sim para limite (429), erro do servidor (5xx) e falta de rede. */
const temporario = (e) => e instanceof ErroApi && (e.status === null || e.status === 429 || e.status >= 500);

/**
 * @param {object} [opcoes]
 * @param {typeof fetch} [opcoes.fetch]  permite trocar a rede por dados falsos nos testes
 * @param {(ms: number) => Promise<void>} [opcoes.esperar]  pausa entre tentativas (nos testes, imediata)
 */
export function criarCliente({ fetch: buscar = (...a) => globalThis.fetch(...a), esperar = dormir } = {}) {
  const fila = criarFila(TEXTOS_SIMULTANEOS);
  const brutos = new Map();   // id -> publicação (deduplica: a paginação "anda" quando sai post novo)
  const corpos = new Map();   // slug -> Promise<string>
  let proximaPagina = 1;
  let esgotado = false;

  async function pedir(url) {
    let resposta;
    try {
      resposta = await buscar(url);
    } catch {
      throw new ErroApi('Sem conexão com o TabNews. Verifique sua internet e tente de novo.');
    }
    if (resposta.status === 429) {
      throw new ErroApi('O TabNews limitou as requisições por enquanto. Espere alguns minutos e tente de novo.', 429);
    }
    if (!resposta.ok) {
      throw new ErroApi(`A API do TabNews respondeu com erro ${resposta.status}. Tente de novo em instantes.`, resposta.status);
    }
    return resposta.json();
  }

  return {
    /** Esquece tudo o que já foi buscado. */
    reiniciar() {
      brutos.clear();
      proximaPagina = 1;
      esgotado = false;
    },

    /**
     * Busca páginas até a mais antiga passar de `ateMs` (ou acabar a lista, ou bater na trava).
     * @param {number} ateMs
     * @param {(pagina: number) => void} [aoProgredir]
     * @returns {Promise<number>} quantas páginas foram buscadas
     */
    async buscarAte(ateMs, aoProgredir) {
      let paginas = 0;
      while (!esgotado && paginas < MAX_PAGINAS) {
        aoProgredir?.(proximaPagina);
        const lista = await pedir(urlPagina(proximaPagina));
        proximaPagina++;
        paginas++;
        for (const p of lista) brutos.set(p.id, p);
        if (lista.length < POR_PAGINA) {
          esgotado = true;
          break;
        }
        if (Math.min(...lista.map(publicadoMs)) <= ateMs) break;
      }
      return paginas;
    },

    /** Todas as publicações já buscadas, sem repetição. */
    publicacoes() {
      return [...brutos.values()];
    },

    get esgotado() {
      return esgotado;
    },

    /**
     * Texto (Markdown) de uma publicação, buscado uma vez por sessão.
     * Passa pela fila (poucos pedidos ao mesmo tempo) e tenta de novo se o TabNews recusar.
     */
    corpo(slug) {
      if (!corpos.has(slug)) {
        const tentar = async () => {
          for (let n = 1; ; n++) {
            try {
              return await pedir(urlPublicacao(slug));
            } catch (e) {
              if (n >= TENTATIVAS || !temporario(e)) throw e;
              await esperar(ESPERA_BASE_MS * 2 ** (n - 1));
            }
          }
        };
        const promessa = fila(tentar)
          .then((j) => j.body || '')
          .catch((e) => {
            corpos.delete(slug);
            throw e;
          });
        corpos.set(slug, promessa);
      }
      return corpos.get(slug);
    },
  };
}
