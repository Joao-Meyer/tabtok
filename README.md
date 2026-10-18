# TabTok

[![código: gerado com IA · Claude](https://img.shields.io/badge/c%C3%B3digo-gerado%20com%20IA%20%C2%B7%20Claude-d97757)](#como-este-projeto-foi-feito)
[![Testar e publicar](https://github.com/Joao-Meyer/tabtok/actions/workflows/publicar.yml/badge.svg)](https://github.com/Joao-Meyer/tabtok/actions/workflows/publicar.yml)

> [!NOTE]
> Este projeto foi escrito pelo Claude, uma IA da Anthropic, sob orientação e revisão de [@Joao-Meyer](https://github.com/Joao-Meyer). Veja [Como este projeto foi feito](#como-este-projeto-foi-feito).

Leitor da [Newsletter do Filipe Deschamps](https://filipedeschamps.com.br/newsletter) fora do email: uma publicação por tela, com rolagem vertical, retomando sempre de onde você parou. Sem login, sem servidor próprio.

**Acesse:** https://joao-meyer.github.io/tabtok/

## O que ele faz

- **Feed vertical**, uma publicação por tela, com a capa gerada pelo TabNews ao fundo.
- **Marcador de leitura automático.** Uma publicação conta como lida depois de 2 segundos na tela. Ao voltar, o feed começa na primeira não lida, e as novas ganham a etiqueta "nova".
- **Primeira visita:** mostra as últimas 24 horas. Se não houver nada nelas (a newsletter não publica no fim de semana), mostra o último dia com publicações.
- **Muito tempo sem abrir:** carrega os últimos 7 dias e oferece carregar o restante desde o marcador.
- **Ir para uma data:** lê desde um dia qualquer até hoje, sem mexer no marcador. O app lembra onde você parou no salto e, ao reabrir, oferece "Continuar" dali (aviso na tela e botão no painel).
- **Texto completo** com links para o TabNews e para a fonte ("Fonte: Yahoo Finance").
- **Instalável no celular** (PWA).
- **Desktop:** setas na tela e no teclado (↑/↓ ou j/k).

O marcador e o ponto do salto ficam só no seu navegador (`localStorage`). Nada é enviado a lugar nenhum além das chamadas à API pública do TabNews.

## Como funciona

As publicações vêm da [API pública do TabNews](https://www.tabnews.com.br), usuário `NewsletterOficial`:

| Uso | Endpoint |
|---|---|
| Lista | `GET /api/v1/contents/NewsletterOficial?page=N&per_page=100&strategy=new` |
| Texto | `GET /api/v1/contents/NewsletterOficial/{slug}` |
| Capa | `GET /api/v1/contents/NewsletterOficial/{slug}/thumbnail` |

A API não filtra por data. O app pagina do mais novo para o mais antigo até passar do ponto de partida, remove repetições e inverte a ordem.

Para não sobrecarregar o TabNews quando o período é longo (um salto de meses pode trazer centenas de publicações):

- o feed monta **30 cards por vez** e acrescenta o próximo lote quando a leitura chega perto do fim do atual;
- a **capa e o texto** de cada publicação só são pedidos quando o card está a até uma tela de distância;
- os textos passam por uma **fila** com no máximo 2 pedidos ao mesmo tempo, que atende primeiro o card que está na tela;
- se o TabNews recusar um pedido (limite de requisições), o app **espera e tenta de novo**, com intervalos crescentes. Se ainda assim falhar, busca outra vez quando você volta àquele card.

## Estrutura

HTML, CSS e JavaScript puro, com módulos ES. Não há dependências nem etapa de build: o que está no repositório é o que vai para o ar.

```
index.html              página única
css/estilo.css          estilos
js/
  config.js             constantes (limites, endereços)
  api.js                chamadas à API, paginação, deduplicação
  janela.js             de onde o feed começa e o que entra nele (funções puras)
  marcador.js           marcador de leitura, que só anda para a frente
  salto.js              ponto do salto de data, guardado à parte do marcador
  fontes.js             nome do site a partir do link da fonte
  texto.js              Markdown -> resumo e HTML sanitizado
  tempo.js              datas no formato brasileiro
  feed.js               HTML dos cards
  painel.js             painel do calendário
  main.js               liga tudo
sw.js                   service worker (guarda só os arquivos do app)
manifest.webmanifest    instalação no celular
icons/                  ícones
tests/                  testes unitários (node --test)
tests/e2e/              testes no navegador e servidor local
```

O Markdown vira HTML com [marked](https://marked.js.org) e é limpo com [DOMPurify](https://github.com/cure53/DOMPurify), ambos carregados de CDN. Sem eles, o texto aparece como parágrafos simples.

## Rodando localmente

Precisa do [Node.js](https://nodejs.org) 22 ou mais novo.

```bash
npm start        # servidor local em http://localhost:4173
npm test         # testes unitários
```

Qualquer servidor estático também serve (por exemplo, a extensão Live Server do VS Code). Abrir o `index.html` direto com dois cliques não funciona, porque os navegadores bloqueiam módulos ES em `file://`.

Os testes no navegador usam o [Playwright](https://playwright.dev), que fica fora do projeto para mantê-lo sem dependências:

```bash
npm install --no-save playwright
npx playwright install chromium
npm run test:e2e
```

## Publicação

O workflow [`.github/workflows/publicar.yml`](.github/workflows/publicar.yml) roda os testes em todo push e pull request. Em push na `main`, se os testes passarem, publica no GitHub Pages. Se um teste falhar, o site não é atualizado.

Para funcionar, o GitHub Pages precisa estar configurado uma vez: **Settings → Pages → Source: GitHub Actions**.

## Como este projeto foi feito

O código deste repositório foi escrito pelo **Claude**, uma IA da Anthropic, numa conversa com [@Joao-Meyer](https://github.com/Joao-Meyer). As ideias, as decisões e a revisão foram dele. A implementação, os testes e esta documentação foram da IA. Os commits feitos pela IA aparecem com o Claude como autor ou coautor.

O projeto também foi um caso de teste de um fluxo de trabalho em etapas, cada uma com um resultado concreto:

1. **Ideia e mockups**, desenhados à mão por @Joao-Meyer.
2. **Investigação técnica** da API do TabNews: endpoints, campos, CORS e limites.
3. **Decisões de comportamento:** sentido da leitura, primeira visita, limite de dias, salto de data.
4. **Protótipo funcional** em um único arquivo HTML, usado por alguns dias para validar as decisões.
5. **Especificação enxuta**, com regras de negócio e critérios de aceite.
6. **Projeto real** (este repositório). Os critérios de aceite da especificação viraram os testes em `tests/`.

## Créditos

- Conteúdo: [TabNews](https://www.tabnews.com.br) e [Newsletter do Filipe Deschamps](https://filipedeschamps.com.br/newsletter). O TabTok é um projeto independente, sem vínculo oficial.
- O painel do calendário usa a paleta do [curso.dev](https://curso.dev), também do Filipe, como homenagem.

## Licença

[MIT](LICENSE). O código pode ser usado, copiado e modificado livremente, desde que o aviso de licença acompanhe as cópias. O conteúdo exibido pelo app pertence ao TabNews e aos seus autores.
