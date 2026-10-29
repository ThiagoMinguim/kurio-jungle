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

O catálogo contém 24 registros com nove categorias, três redes e quatro edições por NFT após o enriquecimento aditivo. A edição limitada do primeiro NFT começa esgotada. A imagem de cada grupo é reutilizada entre obras fictícias.

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

Os resultados da revisão atual ficam em `reports/validation-summary.json`, `reports/playwright-results.json` e `reports/lighthouse/summary.json`. Os testes verificam os fluxos reais da interface contra MSW, incluindo consistência monetária, sessão expirada, idempotência, reconexão, dados legados, formulários e quatro larguras de tela. Baselines verificam estabilidade da aplicação; a comparação com o Figma é uma evidência separada.

A auditoria visual exportou todos os **15 frames** da referência: nove desktop e seis mobile. As capturas de 18 estados, com medidas e overflow, ficam em `reports/figma-audit/`; três estados mobile são adaptações sem frame correspondente. `reports/figma-review.json` registra a cobertura, as medidas, os hashes dos PNGs originais e as diferenças conhecidas. Para repetir as capturas em contextos isolados, com o preview ativo:

```sh
node scripts/capture-frames.mjs
# Opcional: FRAME_BASE_URL=https://seu-dominio.example node scripts/capture-frames.mjs
```

O desenho possui exemplos com conjuntos de obras, valores e estados diferentes entre frames. A aplicação mantém o mesmo catálogo e os mesmos cálculos entre dispositivos. As adaptações incluem dados autenticados, quantidade editável, validação, confirmação explícita, valores retornados pela API e transações fictícias. Aderência visual revisada não significa igualdade integral de pixels em todos os estados.

Lighthouse executa três medições por combinação de início/detalhe e mobile/desktop, sem testes concorrentes. As condições e medianas reais ficam no resumo JSON. Resultados de laboratório variam com ambiente; não são garantia de experiência em qualquer dispositivo. Rodadas anteriores e traces relevantes foram preservados. A auditoria de dependências está em `reports/npm-audit.json`.

## Publicação e validação na origem definitiva

O projeto é uma SPA estática. Vercel está configurado em `vercel.json`, e `_redirects` atende hosts compatíveis com a sintaxe Netlify. Selecione o diretório deste projeto como raiz, instale com `npm ci --ignore-scripts`, rode `npm run build` e publique **somente `dist/`**, com Node 22.19+, HTTPS e mocks ativos. Verifique `/nft/nft-1`, `/checkout` e refresh diretamente na URL publicada. O worker deve responder JavaScript em `/mockServiceWorker.js`, e os assets devem manter seus caminhos.

Antes de publicar, revise `git ls-files`, `git status --short`, execute `npm run audit:delivery` e inspecione o pacote final. O verificador rejeita nomes e marcadores reservados e links simbólicos no build; não substitui revisão humana de arquivos arbitrários.

**Aplicação:** [kurio-jungle-one.vercel.app](https://kurio-jungle-one.vercel.app/) — [repositório privado ThiagoMinguim/kurio-jungle](https://github.com/ThiagoMinguim/kurio-jungle). O projeto Vercel existente está conectado à branch `main`; commit → push dispara o build/deploy automaticamente. Não é necessário enviar ZIP manualmente.

`reports/deployment.json` identifica o commit da aplicação validada e o deploy automático. `reports/public-results.json` registra os testes repetidos na origem pública, e `reports/public-http-checks.json` verifica as rotas diretas, hashes dos assets e o worker. Os testes públicos repetem fluxos locais; não devem ser somados como novos casos. O commit dos relatórios também dispara deploy e preserva o mesmo código de aplicação. Nenhum formulário de submissão, e-mail ou inscrição foi enviado.

## Créditos e uso de IA

Componentes Button e Dialog adaptam o código MIT do registro oficial shadcn/ui, estilo New York, com primitivas Radix. A fonte Roboto Mono é distribuída por `@fontsource/roboto-mono`; consulte a licença do pacote. As quatro artes locais em `public/art/` foram exportadas do Figma do desafio com acesso autorizado e otimizadas para WebP de 640/900 px. A versão inicial usava substitutos gerados, substituídos nesta revisão. A família Roboto Mono foi confirmada exportando um texto do Figma em SVG sem contornos. O ícone de agradecimento também vem da referência original; medidas, cores e adaptações estão em `ARCHITECTURE.md`. Slider utiliza a primitiva Radix com dois controles acessíveis. Código, testes e documentação técnica foram produzidos com assistência de IA e validados pelos comandos e relatórios registrados.

## Tratamento de falhas e revisão de interações

Nomes pessoais não aceitam números. Quantidades mantêm rascunho editável, inclusive vazio, e só confirmam inteiros positivos dentro do estoque. O filtro de preço usa slider com teclado, dois controles e estado na URL. Carteiras exibem os cinco caracteres iniciais e finais antes do nome, validam formato por rede e recusam duplicidade. Os formulários associam erros aos campos e focam a primeira entrada inválida.

A tela padrão de exceção foi substituída por uma página com identidade visual, texto em português, foco acessível e ações de recuperação; há uma variante de 404. Catálogo e NFT têm validação manual de contrato em runtime. A integração MSW recupera a ativação do cliente após suspensão/reinício do worker; GET pode receber uma repetição limitada, enquanto mutations nunca são repetidas automaticamente pelo recuperador. A reprodução do incidente anterior está em `reports/incident-reproduction.json`; detalhes e limites do handshake MSW 2.15 estão em `ARCHITECTURE.md`.

## Ajustes de interação e gerenciamento de carteiras

O favorito tem o mesmo alinhamento para visitantes e contas autenticadas. O avatar mostra prévia imediata; salvar confirma a alteração. A página de carteiras exibe o endereço completo, cópia com feedback, edição por ícone e exclusão com confirmação. Quando a principal é removida, a restante assume esse papel; a última pode ser excluída, exigindo novo cadastro antes de comprar. Recibos guardam a carteira usada na transação. O retorno ao pagamento só aparece ao entrar pelo checkout.

Quantidades aceitam somente dígitos durante a edição, continuam apagáveis e mantêm a validação de inteiro positivo/estoque na interface e na API. A mensagem não estica os controles de edição nem forma uma coluna estreita no carrinho. Cupom inválido ou expirado produz erro associado ao campo e preserva o resumo e o último desconto confirmado. `tests/review.spec.ts` cobre os oito ajustes em desktop/mobile, incluindo exclusão entre contas, cancelamento, falha, recuperação de cupom legado e cópia sem acesso ao clipboard pessoal.

A expiração de sessão durante o bootstrap também é coberta: `cancelQueries` limita-se às chaves `private`/`cart`, mantendo consultas públicas em andamento. O teste novo abre detalhe e catálogo com sessão persistida vencida e latência; falhou antes da correção e passou em desktop/mobile, localmente e na origem pública.

## Revisão de todos os frames

O início inclui destaque navegável com alvos de toque de pelo menos 24 × 24 px, abas de ordenação, filtros com contagens reais, duas chamadas editoriais, quatro prévias de conteúdo e rodapé. A busca desktop abre no cabeçalho; no mobile ela permanece no topo, com navegação inferior. Login/cadastro usam modal com foco contido sobre o catálogo no desktop e formulário independente no mobile. Provedores sociais e recuperação de senha exibem a limitação da demonstração; não executam OAuth nem enviam mensagens.

Perfil e carteiras compartilham a navegação de conta e campos compactos em duas colunas. O perfil persiste usuário, ENS, apelido e avatar; a troca opcional de senha faz parte da mesma atualização atômica. Senha atual incorreta impede também alterações no nome/e-mail. Carteiras guardam os metadados auxiliares validados; o cadastro continua limitado a duas e o endereço continua verificado por rede. Dados opcionais não recebem asterisco de obrigatoriedade apenas para copiar o desenho.

O carrinho mostra preço unitário, quantidade e total de linha no desktop; no mobile o preço destacado é o total da linha. Os botões e o rascunho textual usam a mesma regra de estoque. Um item cuja edição deixou de existir pode ser removido por uma ação local, sem derrubar a página. O conjunto adicional `tests/frame-audit.spec.ts` verifica esses casos e ausência de overflow nas quatro larguras.

<!-- current-measurements -->

## Medições da revisão completa

**119 testes locais aprovados**, sem falhas, casos ignorados ou retries. A suíte final comparou as baselines sem atualizá-las. Foram revisados 15 frames originais e capturados 18 estados. `typecheck`, `lint` e `build` passaram.

Lighthouse 13.6.0, Node 22.23.4, macOS arm64 / Apple M1, preview do build, três medições por combinação sem testes concorrentes. Medianas da última rodada:

| Página / perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| inicio / mobile | 91 | 100 | 100 | 100 | 3364 ms | 0.00000 | 80 ms |
| inicio / desktop | 99 | 100 | 100 | 100 | 924 ms | 0.00839 | 0 ms |
| detalhe / mobile | 93 | 100 | 100 | 100 | 3224 ms | 0.00000 | 69 ms |
| detalhe / desktop | 100 | 100 | 100 | 100 | 751 ms | 0.00000 | 0 ms |

As medianas atingiram as metas de Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95 e SEO ≥ 90. A rodada inicial completa, com alvos de toque pequenos, foi preservada em `reports/lighthouse-complete-audit-initial/`. As medições são de laboratório e podem variar em outro ambiente.
