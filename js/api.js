// Acesso à API pública do TabNews (seção 5 da especificação).
// A lista vem do mais novo para o mais antigo; paginamos até passar do ponto de partida.
import { API, MAX_PAGINAS, POR_PAGINA, SITE } from './config.js';
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
export const urlThumbnail = (slug) => `${API}/${encodeURIComponent(slug)}/thumbnail`;
export const urlNoTabNews = (slug) => `${SITE}/${encodeURIComponent(slug)}`;

/**
 * @param {object} [opcoes]
 * @param {typeof fetch} [opcoes.fetch]  permite trocar a rede por dados falsos nos testes
 */
export function criarCliente({ fetch: buscar = (...a) => globalThis.fetch(...a) } = {}) {
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

    /** Texto (Markdown) de uma publicação, buscado uma vez por sessão. */
    corpo(slug) {
      if (!corpos.has(slug)) {
        const promessa = pedir(urlPublicacao(slug))
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
