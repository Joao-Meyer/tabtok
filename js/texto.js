// Tratamento do texto das publicações (Markdown vindo de terceiros).

/** Escapa texto para inserir em HTML. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Markdown -> texto corrido, para o resumo de 4 linhas. */
export function textoPuro(md) {
  return String(md ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Markdown -> HTML sanitizado. Usa marked + DOMPurify (carregados no index.html);
 * se não estiverem disponíveis, cai para parágrafos de texto puro.
 */
export function mdParaHtml(md, { marked = globalThis.marked, DOMPurify = globalThis.DOMPurify } = {}) {
  if (marked && DOMPurify && globalThis.document) {
    const tmp = document.createElement('div');
    tmp.innerHTML = DOMPurify.sanitize(marked.parse(String(md ?? '')));
    tmp.querySelectorAll('a').forEach((a) => {
      a.target = '_blank';
      a.rel = 'noopener';
    });
    return tmp.innerHTML;
  }
  return String(md ?? '')
    .split(/\n{2,}/)
    .map((p) => textoPuro(p))
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');
}
