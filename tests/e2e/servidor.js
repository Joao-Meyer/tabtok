// Servidor estático mínimo (sem dependências) para rodar o TabTok localmente.
// Uso: npm start  ->  http://localhost:4173
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

export function iniciarServidor(porta = Number(process.env.PORTA) || 4173) {
  const servidor = createServer(async (req, res) => {
    const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const relativo = normalize(caminho.endsWith('/') ? `${caminho}index.html` : caminho).replace(/^([/\\])+/, '');
    if (relativo.startsWith('..')) { res.writeHead(403).end(); return; }
    try {
      const dados = await readFile(join(RAIZ, relativo));
      res.writeHead(200, { 'content-type': TIPOS[extname(relativo)] ?? 'application/octet-stream' }).end(dados);
    } catch {
      res.writeHead(404).end('não encontrado');
    }
  });
  return new Promise((ok) => servidor.listen(porta, () => ok(servidor)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await iniciarServidor();
  console.log(`TabTok em http://localhost:${s.address().port}`);
}
