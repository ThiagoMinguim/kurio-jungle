# KURIO — Jungle Gaming Frontend Challenge

Marketplace fictício de arte digital, desenvolvido com React e TypeScript. Catálogo, conta, carrinho, cotação, pedidos e tempo real funcionam sobre uma API simulada no navegador. Não há blockchain, carteira externa, pagamento, envio de e-mail ou transação real.

Referências: [enunciado oficial](https://github.com/junglegaming/frontend-challenge) e [Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1). Veja decisões, contratos e desvios visuais em [ARCHITECTURE.md](ARCHITECTURE.md).

## Executar

Requer Node **22.19 ou superior**; a versão utilizada está em `.nvmrc`. Instale pelo distribuidor oficial do Node ou use um gerenciador de versões. Não execute com Node 16: algumas instalações locais podem selecioná-lo automaticamente ao mudar de pasta.

```sh
nvm install
nvm use
npm ci --ignore-scripts
npm run dev
```

Abra `http://127.0.0.1:5173`. Os pacotes e versões estão fixados em `package-lock.json`. Scripts de instalação foram desabilitados; os binários opcionais oficiais de esbuild e Tailwind são distribuídos como dependências de plataforma.

```sh
npm run typecheck
npm run lint
npm run build
npm run preview
```

O preview atende em `http://127.0.0.1:4173`. Os mocks também estão no build otimizado. Service Workers exigem `localhost`/loopback ou HTTPS. Evite abrir `index.html` com `file://`.

## Configuração

| Variável            | Padrão                             | Função                                               |
| ------------------- | ---------------------------------- | ---------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | ativo, exceto valor `false`        | Inicializa MSW antes de carregar o cliente Socket.IO |
| `TEST_BASE_URL`     | `http://127.0.0.1:4173`            | Destino dos testes Playwright                        |
| `AUDIT_BASE_URL`    | `http://127.0.0.1:4173`            | Destino da auditoria Lighthouse                      |
| `CHROME_PATH`       | Chromium instalado pelo Playwright | Binário do Chrome usado pelo Lighthouse              |

`.env.example` mostra a configuração de demonstração. Não configure chaves ou contas reais. Desativar os mocks exige implementar um backend com os contratos documentados; não existe backend remoto fornecido.

## Contas fictícias

| E-mail           | Senha inicial |
| ---------------- | ------------- |
| `alex@demo.test` | `Demo123!`    |
| `bia@demo.test`  | `Demo123!`    |

Ambos começam com uma carteira Ethereum fictícia. O cadastro aceita novos dados fictícios. Senhas passam por PBKDF2 com salt e não são persistidas em texto puro. Isso é uma simulação local, sem garantias de segurança de um servidor. O usuário pode alterar o armazenamento pelo DevTools.

O catálogo contém 24 registros com seis categorias, três redes e duas edições por NFT. A edição limitada do primeiro NFT começa esgotada. A imagem de cada grupo é reutilizada entre obras fictícias.

## Navegação

| Caminho                              | Comportamento                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `/`                                  | Destaque, catálogo, busca, filtros combinados, faixa de preço, ordenação e paginação na URL |
| `/nft/nft-1`                         | Exemplo de detalhe, galeria, edição, quantidade e favoritos                                 |
| `/cart`                              | Carrinho de visitante ou autenticado, cupom e resumo retornado pela API                     |
| `/checkout`                          | Protegido; coleta dados, escolhe carteira/rede e pede revisão explícita                     |
| `/order/:orderId`                    | Protegido; mostra estado e snapshot do pedido autorizado                                    |
| `/login`, `/register`                | Sessão, validação, conflito e retorno ao fluxo anterior                                     |
| `/profile`, `/wallets`, `/favorites` | Recursos privados persistidos e isolados por conta                                          |

Cupom válido: `KURIO10`, desconto de 10% com arredondamento para baixo em wei. `EXPIRED` retorna cupom expirado; outros códigos retornam inválido. A taxa simulada padrão é `0.003 ETH`.

## Cenários e reset

Abra **Laboratório de cenários**, no rodapé. “Ativar cenário sem reset” preserva os dados; “Reset completo e aplicar cenário” restaura catálogo, contas, sessões, carrinhos, favoritos, perfil, carteiras, cotações e pedidos, limpa o estado do cliente e volta ao início. Uma recarga pode ser necessária para reconsultar dados já em cache depois da simples troca de cenário.

| Cenário                                 | Como reproduzir                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `success`, `empty`                      | Explorar catálogo normal ou vazio                                                                                                    |
| `slow`                                  | Abrir detalhe/carrinho e observar skeleton e shimmer                                                                                 |
| `out-of-order`                          | Buscar `S` e imediatamente `Emerald`; a busca curta recebe maior latência                                                            |
| `offline`, `http-500`                   | Abrir um recurso; voltar a `success` e usar “Tentar novamente”                                                                       |
| `expired-session`                       | Acessar um recurso privado; reativar `success` antes do novo login                                                                   |
| `favorite-failure`                      | Favoritar autenticado e observar rollback e mensagem                                                                                 |
| `validation`                            | Salvar perfil/carteira para receber erro da API                                                                                      |
| `price-change`, `sold-out`              | Adicionar obra, entrar, revisar checkout e confirmar                                                                                 |
| `order-timeout`                         | Confirmar; a API cria o pedido mas demora 12 s, superando o timeout de 8 s do Axios; a consulta da tentativa recupera o mesmo pedido |
| `pending`                               | Criar pedido; usar “Concluir pedidos pendentes” para avançar sem espera arbitrária                                                   |
| `payment-declined`                      | Confirmar e observar recusa com carrinho preservado                                                                                  |
| `wallet-refused`, `wallet-disconnected` | Enviar compra e observar erro de conexão fictícia da carteira                                                                        |

O laboratório também permite mudar preço/estoque de um NFT escolhido, enviar eventos repetidos/antigos, interromper a conexão e expirar sessões. Essas ações passam pelos handlers MSW; eventos atravessam a integração Socket.IO. Não há setters de demonstração nos componentes.

Para demonstrar reconexão: ative `pending`, crie um pedido, interrompa a conexão e conclua o pedido pelo laboratório. Após reconectar ou recarregar, observe o mesmo identificador e o estado terminal. Para alteração de preço: coloque NFT 1 no carrinho e execute “Alterar preço via Socket.IO”. O resumo deve mudar e o checkout deve exigir confirmação do novo valor.

## Testes e relatórios

```sh
npx playwright install chromium
npm run build
npm test
npm run test:ui
npm run test:visual
npx playwright show-report
```

O Playwright inicia o preview automaticamente. Cada teste cria um contexto isolado e restaura o cenário pela rede MSW. Os fluxos são executados em Chromium a 1440 e 390 px. A regressão visual cobre início, detalhe, carrinho e pagamento também a 768 px. Baselines estão em `tests/baselines/`; relatórios HTML em `playwright-report/`, resultado JSON em `reports/playwright-results.json` e traces de falha em `test-results/`.

Para uma alteração visual intencional: execute `npm run test:visual -- --update-snapshots`, revise as imagens e rode novamente sem atualizar baselines. Não aceite alterações automaticamente para encobrir um defeito. Renderização de fonte e pixels pode variar por sistema operacional; gere e compare baselines no mesmo ambiente.

```sh
# Em um terminal:
npm run preview
# Em outro:
npm run lighthouse
```

O Lighthouse executa três medições por combinação de início/detalhe e mobile/desktop. Salva HTML, JSON, medições e medianas em `reports/lighthouse/`. A configuração versionada está em `scripts/lighthouse.config.mjs`. Rode sem testes concorrentes para reduzir interferência de CPU. Resultados reais e condições estão no resumo JSON; não substitua os valores por metas.

## Resultados medidos

Validação funcional: **103 testes aprovados** em uma execução completa de `npm test`, com dois workers, sem falhas, testes ignorados ou retries. Inclui os fluxos de consistência, sessão e tempo real, recuperação do Service Worker, os oito ajustes de interação e as revisões de detalhe/pagamento/conclusão. HTML em `reports/playwright/` e dados em `reports/playwright-results.json`.

`typecheck`, `lint` e `build` concluíram com sucesso. As 14 imagens de referência (12 das quatro telas em três larguras e duas de conclusão) foram comparadas sem atualizar baselines na execução final. Traces das falhas anteriores foram preservados em `reports/failure-traces/`. Os recortes da galeria e o espaço entre alvos da paginação mudaram intencionalmente; as diferenças desktop/tablet foram inspecionadas antes de aceitar as novas referências. A primeira auditoria Figma identificou três problemas de acessibilidade no detalhe; a rodada foi preservada em `reports/lighthouse-figma-initial/`.

Lighthouse 13.6.0, Node 22.23.4, macOS arm64 / Apple M1, preview do build, cenário padrão: três execuções por combinação, sem testes concorrentes, em 29/10/2026. Resultados completos em `reports/lighthouse/`.

| Página / perfil   | Performance | Acessibilidade | Boas práticas | SEO | LCP     | CLS     | TBT   |
| ----------------- | ----------- | -------------- | ------------- | --- | ------- | ------- | ----- |
| inicio / mobile   | 92          | 100            | 100           | 100 | 3327 ms | 0.00054 | 34 ms |
| inicio / desktop  | 100         | 100            | 100           | 100 | 809 ms  | 0.01318 | 0 ms  |
| detalhe / mobile  | 93          | 100            | 100           | 100 | 3210 ms | 0.00000 | 47 ms |
| detalhe / desktop | 100         | 100            | 100           | 100 | 752 ms  | 0.00000 | 0 ms  |

As medianas de Performance atingiram a meta de 90 nesta execução. Medições de laboratório em máquina compartilhada não garantem o mesmo resultado em outro ambiente nem isolam a causa de uma variação. As rodadas anteriores estão preservadas; não foram selecionadas apenas execuções favoráveis. A auditoria de dependências registrou zero vulnerabilidades conhecidas em `reports/npm-audit.json`.

## Publicação e validação na origem definitiva

O projeto é uma SPA estática. Vercel está configurado em `vercel.json`, e `_redirects` atende hosts compatíveis com a sintaxe Netlify. Selecione o diretório deste projeto como raiz, instale com `npm ci --ignore-scripts`, rode `npm run build` e publique **somente `dist/`**, com Node 22.19+, HTTPS e mocks ativos. Verifique `/nft/nft-1`, `/checkout` e refresh diretamente na URL publicada. O worker deve responder JavaScript em `/mockServiceWorker.js`, e os assets devem manter seus caminhos.

Antes de publicar, revise `git ls-files`, `git status --short`, execute `npm run audit:delivery` e inspecione o pacote final. O verificador rejeita nomes e marcadores reservados e links simbólicos no build; não substitui revisão humana de arquivos arbitrários.

**Publicado e validado:** [kurio-jungle-one.vercel.app](https://kurio-jungle-one.vercel.app/) — [repositório privado ThiagoMinguim/kurio-jungle](https://github.com/ThiagoMinguim/kurio-jungle). O projeto Vercel está conectado à branch `main`. O push `5291fb6` disparou automaticamente o [deploy Git verificado](https://vercel.com/thiagominguims-projects/kurio-jungle/EAxQxTJdvHxY3vTNQaQgZ5rFqxZK), que ficou Ready e assumiu o domínio de produção. Futuras atualizações seguem commit → push → build/deploy da Vercel. Nenhum novo ZIP foi enviado.

Na revisão publicada, **58 testes públicos passaram** em desktop/mobile, incluindo detalhe, pagamento, confirmação, validações, oito ajustes de interação, erros, interrupção do worker, compra, Socket.IO e reconexão. As **39 verificações HTTP** passaram: oito rotas diretas e os 31 arquivos públicos do build, com comparação SHA-256 e worker JavaScript sem cache. Evidências em `reports/deployment.json`, `reports/public-results.json`, `reports/public-html/` e `reports/public-http-checks.json`. As 58 verificações repetem fluxos na origem publicada e não são novos casos a somar aos 103 locais.

Os relatórios foram registrados depois da validação do commit indicado; seu push também dispara deploy, preservando o mesmo código de aplicação. Evidências da versão antiga por upload estão em `reports/previous-deployment/`. Nenhum formulário de submissão, e-mail ou inscrição foi enviado.

## Créditos e uso de IA

Componentes Button e Dialog adaptam o código MIT do registro oficial shadcn/ui, estilo New York, com primitivas Radix. A fonte Roboto Mono é distribuída por `@fontsource/roboto-mono`; consulte a licença do pacote. As quatro artes locais em `public/art/` foram exportadas do Figma do desafio com acesso autorizado e otimizadas para WebP de 640/900 px. A versão inicial usava substitutos gerados, substituídos nesta revisão. A família Roboto Mono foi confirmada exportando um texto do Figma em SVG sem contornos. O ícone de agradecimento também vem da referência original; medidas, cores e adaptações estão em `ARCHITECTURE.md`. Slider utiliza a primitiva Radix com dois controles acessíveis. Código, testes e documentação técnica foram produzidos com assistência de IA e validados pelos comandos e relatórios registrados.

## Tratamento de falhas e revisão de interações

Nomes pessoais não aceitam números. Quantidades mantêm rascunho editável, inclusive vazio, e só confirmam inteiros positivos dentro do estoque. O filtro de preço usa slider com teclado, dois controles e estado na URL. Carteiras exibem os cinco caracteres iniciais e finais antes do nome, validam formato por rede e recusam duplicidade. Os formulários associam erros aos campos e focam a primeira entrada inválida.

A tela padrão de exceção foi substituída por uma página com identidade visual, texto em português, foco acessível e ações de recuperação; há uma variante de 404. Catálogo e NFT têm validação manual de contrato em runtime. A integração MSW recupera a ativação do cliente após suspensão/reinício do worker; GET pode receber uma repetição limitada, enquanto mutations nunca são repetidas automaticamente pelo recuperador. A reprodução do incidente anterior está em `reports/incident-reproduction.json`; detalhes e limites do handshake MSW 2.15 estão em `ARCHITECTURE.md`.

## Ajustes de interação e gerenciamento de carteiras

O favorito tem o mesmo alinhamento para visitantes e contas autenticadas. O avatar mostra prévia imediata; salvar confirma a alteração. A página de carteiras exibe o endereço completo, cópia com feedback, edição por ícone e exclusão com confirmação. Quando a principal é removida, a restante assume esse papel; a última pode ser excluída, exigindo novo cadastro antes de comprar. Recibos guardam a carteira usada na transação. O retorno ao pagamento só aparece ao entrar pelo checkout.

Quantidades aceitam somente dígitos durante a edição, continuam apagáveis e mantêm a validação de inteiro positivo/estoque na interface e na API. A mensagem não estica os controles de edição nem forma uma coluna estreita no carrinho. Cupom inválido ou expirado produz erro associado ao campo e preserva o resumo e o último desconto confirmado. `tests/review.spec.ts` cobre os oito ajustes em desktop/mobile, incluindo exclusão entre contas, cancelamento, falha, recuperação de cupom legado e cópia sem acesso ao clipboard pessoal.
