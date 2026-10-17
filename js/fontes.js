// Nome do site da fonte (RN10), como no email da newsletter:
// "As informações são do site Yahoo Finance". A API só traz o link (`source_url`).

export const SITES = {
  'finance.yahoo.com': 'Yahoo Finance', 'yahoo.com': 'Yahoo', 'theverge.com': 'The Verge', 'tecnoblog.net': 'Tecnoblog',
  'arstechnica.com': 'Ars Technica', 'reuters.com': 'Reuters', 'techcrunch.com': 'TechCrunch', 'theregister.com': 'The Register',
  'bleepingcomputer.com': 'BleepingComputer', 'bbc.com': 'BBC', 'bbc.co.uk': 'BBC', 'cnbc.com': 'CNBC', 'gartner.com': 'Gartner',
  'theguardian.com': 'The Guardian', 'securityweek.com': 'SecurityWeek', 'androidauthority.com': 'Android Authority',
  'slashdot.org': 'Slashdot', 'about.fb.com': 'Meta', 'anthropic.com': 'Anthropic', 'openai.com': 'OpenAI',
  'stackoverflow.co': 'Stack Overflow', 'stackoverflow.blog': 'Stack Overflow', 'github.blog': 'GitHub Blog', 'github.com': 'GitHub',
  'blog.google': 'Google', 'gov.br': 'gov.br', 'convergenciadigital.com.br': 'Convergência Digital', 'respawnfirst.com': 'RespawnFirst',
  'g1.globo.com': 'g1', 'folha.uol.com.br': 'Folha de S.Paulo', 'estadao.com.br': 'Estadão', 'olhardigital.com.br': 'Olhar Digital',
  'canaltech.com.br': 'Canaltech', 'tecmundo.com.br': 'TecMundo', 'wired.com': 'Wired', 'engadget.com': 'Engadget',
  'zdnet.com': 'ZDNET', 'bloomberg.com': 'Bloomberg', 'wsj.com': 'The Wall Street Journal', 'nytimes.com': 'The New York Times',
  'ft.com': 'Financial Times', '9to5mac.com': '9to5Mac', '9to5google.com': '9to5Google', 'macrumors.com': 'MacRumors',
  'tomshardware.com': "Tom's Hardware", 'phoronix.com': 'Phoronix', 'omgubuntu.co.uk': 'OMG! Ubuntu', 'neowin.net': 'Neowin',
  'theinformation.com': 'The Information', 'axios.com': 'Axios', 'cnn.com': 'CNN', 'infomoney.com.br': 'InfoMoney',
};

// archive.today / archive.ph / archive.is / archive.org guardam a URL original no caminho
const ARQUIVO = /^https?:\/\/(?:web\.)?archive\.(?:today|ph|is|org)\/.*?(https?:\/\/.+)$/;

/**
 * @param {string | null | undefined} url
 * @returns {string | null} nome do site, o domínio (se for desconhecido) ou null (sem link)
 */
export function nomeFonte(url) {
  if (!url) return null;
  try {
    const dentro = url.match(ARQUIVO);
    const host = new URL(dentro ? dentro[1] : url).hostname.replace(/^www\./, '');
    // procura do mais específico para o mais geral: tech.slashdot.org -> slashdot.org
    for (let h = host; h.includes('.'); h = h.slice(h.indexOf('.') + 1)) {
      if (SITES[h]) return SITES[h];
    }
    return host;
  } catch {
    return null;
  }
}
