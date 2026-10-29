# Arquitetura da demonstração KURIO

## Organização e dependências

`main.tsx` instala MSW e só então importa `app/router.tsx`. Essa ordem é funcional: `engine.io-client` captura o construtor WebSocket na avaliação do módulo; importá-lo antes de MSW faz a conexão escapar da interceptação. Não antecipe o import do router sem preservar essa condição.

| Camada                 | Arquivos                                                            | Responsabilidade                                                      |
| ---------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Aplicação              | `src/app/router.tsx`, `session.tsx`, `realtime.ts`                  | Rotas, layout, acesso privado, sessão e ciclo do socket               |
| Domínio                | `src/domain/types.ts`, `money.ts`                                   | Contratos e aritmética decimal exata                                  |
| Infraestrutura cliente | `src/lib/api.ts`, `query.ts`                                        | Axios, identificação do visitante, erros, cache e retries             |
| Módulos                | `src/features/`                                                     | Catálogo, detalhe, carrinho, checkout, conta, favoritos e laboratório |
| Interface              | `src/components/shared.tsx`, `ui/`, `styles.css`                    | Campos, feedback, cards, componentes shadcn e identidade visual       |
| Simulador              | `src/mocks/database.ts`, `handlers.ts`, `realtime.ts`, `browser.ts` | Fixtures, persistência, REST, máquina de pedidos e Socket.IO          |
| Validação              | `tests/`, `playwright.config.ts`, `scripts/`                        | E2E, imagens de referência, Lighthouse e inspeção de entrega          |

React compõe a interface. TypeScript descreve dados entre módulos, mas não valida JSON automaticamente. Router mantém localização, busca e proteção do fluxo. Query cuida de dados remotos; Axios transporta REST com cancelamento. MSW intercepta a rede, inclusive no build. Socket.IO é usado pelo cliente com binding de protocolo no mock. Tailwind e shadcn/ui fornecem estilos e primitivas adaptadas. Vite gera uma SPA estática. Playwright observa fluxos reais no navegador; Lighthouse audita o build.

A arquitetura evita um segundo store global de catálogo/carrinho. Context contém sessão, estados locais contêm formulário/diálogo, e Query contém dados da API. A base de dados fictícia pertence exclusivamente aos mocks. Componentes não importam fixtures nem a base de dados.

## Fluxo REST e cache

```text
interação → Router/estado de formulário → query/mutation → Axios
          → MSW → base simulada persistente → resposta tipada
          → Query/invalidação → nova renderização
```

A busca, categoria, rede, ordenação, página e faixa de preço são validadas na URL. Mudar um filtro reinicia a página. O objeto de busca entra na query key `['catalog', search]`. Parâmetros diferentes não compartilham a mesma entrada. O `AbortSignal` da query segue até o Axios para cancelar requisições que perderam seus observadores.

Chaves públicas: `['catalog', search]` e `['nft', id]`. Carrinho: `['cart', tokenOuGuest]`. Dados privados: `['private', token, recurso, ...parâmetros]`. Usar o token também separa duas sessões da mesma conta. Cotações incluem versão do carrinho e cupom. Cache usa `staleTime` de 15 s, refetch ao foco e no máximo uma repetição para falhas transitórias selecionadas. Erros de autenticação/validação não recebem retries automáticos. Mutations não repetem automaticamente.

Favoritos aplicam atualização otimista: cancelam a consulta, guardam snapshot, alteram a seleção e restauram o snapshot em falha. A reconsulta final reconcilia com a API. A interface pode mostrar o coração antes da confirmação; o botão permanece desabilitado durante a mutation. Persistência após refresh é garantida depois da resposta confirmada, não para uma operação interrompida antes de o servidor simulado concluí-la.

## Contratos REST

Todas as rotas usam `/api`. A sessão vai em `Authorization: Bearer <token>`. `x-guest-id` identifica um carrinho de visitante. JSON contém ETH como strings e quantidade como inteiro.

| Método e recurso                                        | Entrada                                      | Retorno / regra                                                    |
| ------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `POST /accounts`                                        | `name, email, password`                      | Cria conta e sessão; conflito de e-mail é 409                      |
| `POST /session`                                         | `email, password`                            | `Session {user, token, expiresAt}`                                 |
| `GET /session`                                          | token                                        | Recupera sessão ou 401                                             |
| `DELETE /session`                                       | token                                        | Revoga sessão atual                                                |
| `GET /nfts`                                             | `q, category, network, sort, page, min, max` | `{items, total, pages, page}`; 9 itens por página                  |
| `GET /nfts/:id`                                         | identificador                                | `Nft` versionado ou 404                                            |
| `GET /favorites`                                        | sessão                                       | Lista de IDs do usuário                                            |
| `POST /favorites`                                       | `nftId, favorite`                            | Lista atualizada                                                   |
| `GET /cart`                                             | sessão ou visitante                          | `Cart {items, version}`                                            |
| `POST /cart`                                            | `nftId, editionId, quantity`                 | Soma quantidade, validando disponibilidade                         |
| `PUT /cart`                                             | mesma forma                                  | Define quantidade absoluta                                         |
| `DELETE /cart`                                          | query `nftId, editionId`                     | Remove somente a combinação indicada                               |
| `POST /quote`                                           | `coupon`                                     | `Quote` com linhas, totais, prazo e fingerprint                    |
| `POST /orders`                                          | `Attempt`; header `Idempotency-Key`          | Pedido existente ou criação atômica no simulador                   |
| `GET /orders/attempt`                                   | query `key`, sessão                          | Recupera pedido da mesma tentativa                                 |
| `GET /orders`, `GET /orders/:id`                        | sessão                                       | Somente pedidos da conta; recurso alheio é 404                     |
| `GET /profile`, `PATCH /profile`                        | nome/e-mail/avatar na alteração              | `User` público, sem hash/salt                                      |
| `POST /password`                                        | `currentPassword, newPassword`               | Confirmação; senha atual validada                                  |
| `GET /wallets`, `POST /wallets`                         | cadastro/edição de `Wallet`                  | Até duas carteiras; uma principal quando houver carteiras          |
| `DELETE /wallets/:id`                                   | sessão e ID da carteira                      | Remove somente carteira da conta; promove a restante se necessário |
| `POST /debug/reset`, `/debug/scenario`, `/debug/action` | cenário ou ação                              | Controles explícitos da demonstração                               |

Erro: `{message, code, fields?, quote?}`. Códigos HTTP incluem 401, 404, 409, 422, 500 e 503; falha de conexão usa `HttpResponse.error()`. Erros de campo são associados aos inputs quando disponíveis. `QUOTE_CHANGED` traz a nova cotação e exige confirmação explícita.

## Sessão e isolamento

Sessões duram 30 minutos no simulador. Refresh consulta `/session`; o token local sozinho não constitui validação. Rotas privadas aguardam a recuperação antes de redirecionar. O destino de retorno é fixado na entrada do guard, evitando um ciclo de redirecionamentos durante uma transição. O código rejeita destinos externos e `//`.

Um 401 `SESSION_EXPIRED` comunica a identidade da requisição que falhou. Só a sessão ainda correspondente é limpa; uma resposta tardia de outra sessão não deve encerrar a nova. Logout limpa imediatamente o token, cancela queries, remove caches privados/carrinho e descarta a tentativa local da conta. O efeito do socket remove callbacks e desconecta quando o token muda. A API também verifica o dono dos recursos.

O carrinho visitante é unido ao da conta durante login/cadastro, por NFT e edição, limitado pelo estoque. O carrinho visitante é esvaziado após essa transferência; sair da conta não transfere itens privados de volta ao visitante. Favoritos, carteira, perfil e pedidos continuam separados na base simulada.

Hashes PBKDF2-SHA256 usam salt e 100 mil iterações. Credenciais de fixture são públicas e fictícias. A base inteira fica em localStorage para sustentar refresh; portanto isso não modela uma fronteira de segurança real. Uma versão de produção precisaria de backend com autorização, sessões seguras, proteção contra ataques e armazenamento adequado.

## Valores e checkout

`money.ts` converte decimal string para inteiro em wei usando `BigInt`. Aceita até 18 casas, rejeita notação científica, sinal e excesso de casas. Não há `Number(price)` nem arredondamento binário monetário. JSON recebe strings novamente. O desconto é divisão inteira por 10 e a taxa padrão é `0.003`.

`makeQuote` lê carrinho e catálogo atuais, verifica edição, estoque e cupom e produz snapshot com linhas, versões, preços, subtotal, desconto, taxa e total. O fingerprint serializa o conteúdo econômico; prazo é 60 s. A compra revalida no cliente e novamente no handler de criação. Mudança exige revisão; o backend simulado permanece autoridade mesmo se o cliente tentar enviar uma cotação antiga.

A chave e o payload da tentativa são persistidos por usuário antes do POST. Um bloqueio síncrono de `useRef`, além do botão desabilitado, evita envios simultâneos na interface. No simulador, a chave é indexada por conta, associada ao conteúdo e ao pedido. Reenvio idêntico retorna o mesmo pedido. Conteúdo diferente retorna 409. Timeout é ambíguo: antes de criar outra compra, o cliente consulta a tentativa existente.

Pedidos passam de `pending` para `confirmed` ou `declined`, ambos terminais. Um timer atualiza a simulação; após reload, as consultas também concluem pedidos cujo prazo venceu. Pedidos pendentes reservam quantidades durante novas validações. Na confirmação, somente quantidades compradas são subtraídas do carrinho. Na recusa, os itens ficam intactos.

O recibo lê `order.quote`, uma cópia independente. Não recalcula totais a partir do catálogo. A referência `sim-*` não corresponde a uma transação real. Uma nova tentativa com a mesma chave é recuperada após timeout/refresh; se o logout removeu a referência local, `/orders` permite reencontrar pedidos pendentes da própria conta.

## Socket.IO e reconciliação

Eventos usam `{type, eventId, resourceId, version, sessionToken}`. `nft.updated` é público, mas recebe a identidade da subscription atual. `order.updated` só é enviado a conexões cuja sessão válida pertence ao usuário do pedido. O token é validado contra a mesma base das rotas REST; não basta enviar um userId arbitrário.

O cliente mantém até 500 IDs vistos e a maior versão de cada recurso no ciclo da sessão. IDs repetidos e versões menores/iguais são descartados. Eventos apenas anunciam mudança: o cliente cancela snapshots em voo e reconsulta REST. Isso evita aplicar um payload antigo e mantém cálculos na API. Recursos ativos são invalidados no `connect`, inclusive reconexão; não se presume replay dos eventos perdidos. Pedidos também fazem polling de 2 s enquanto pendentes como recuperação adicional.

`@mswjs/socket.io-binding@0.2.0` usa `toSocketIo(connection)` com MSW 2.15. O cliente usa `transports: ['websocket']` e `forceNew`. MSW normaliza o caminho `/socket.io/`; o handler liga-se à raiz da origem WebSocket. O simulador envia heartbeat Engine.IO a cada 20 s e limpa o timer ao fechar. O laboratório fecha o transporte com 1012 para exercitar a reconexão automática.

Limites do binding: namespace padrão, mensagens JSON e transporte WebSocket. Não são validados long-polling, upgrade, binários, rooms distribuídas ou entrega exatamente uma vez. A ordem de entrega de Socket.IO não elimina perda de mensagens durante desconexão; a reconciliação REST continua necessária. [Garantias documentadas pelo Socket.IO](https://socket.io/docs/v4/delivery-guarantees/).

## Visual, acessibilidade e performance

A revisão com acesso autorizado ao Figma permitiu baixar as quatro artes originais e ler propriedades: desktop de 1440 px com conteúdo de 1200 px e margens de 120 px, hero de 450 px, imagem com raio de 24 px, fundo `#140D0A`, cor primária `#D28A4C` e título do hero de 43 px com entrelinha de 70 px. Esses parâmetros orientam a composição atual. A faixa decorativa de conexão foi removida; o transporte e a reconciliação permanecem ativos.

Os assets de `public/art/` foram exportados do arquivo de referência e convertidos para WebP: Emerald com 900 px e as demais artes com 640 px. A variável `font/family` foi resolvida exportando o título da confirmação em SVG com texto preservado: a família declarada é Roboto Mono. A aplicação usa essa fonte localmente, com licença em `public/licenses/roboto-mono.txt`. Textos pequenos foram ampliados para legibilidade e campos mobile usam 16 px. Galeria, formulários, quantidade/cotação e laboratório têm adaptações funcionais. Blocos editoriais permanecem fora do escopo. As baselines verificam regressão; não certificam igualdade pixel a pixel com todos os frames.

Há semântica de landmarks, hierarquia de headings, labels, mensagens de erro e status, `aria-pressed`, foco visível, skip link e restauração de foco em diálogos Radix. Mudanças de rota focam o conteúdo após navegação, sem capturar o foco inicial da página. Os IDs de filtros desktop/mobile são distintos. Shimmer respeita `prefers-reduced-motion`; imagens têm dimensões e arquivos locais. Teclado e dimensões são verificados nos testes, mas não substituem avaliação com leitores de tela reais.

O build divide o router e a infraestrutura de mocks em chunks. Imagens WebP de 640/900 px com `srcset` no destaque, detalhe e cards, lazy loading em cards secundários e fonte local reduzem dependências externas. O custo de inicialização de React/Router/Query/MSW e de recuperação do estado ainda precisa aparecer nas auditorias. Metas de Lighthouse não são presumidas; consulte os relatórios reais.

## Matriz de requisitos e evidências

| Assunto                               | Implementação                                                              | Verificação                                                     |
| ------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Stack obrigatória efetiva             | `main`, `app`, `lib`, `mocks`, `components/ui`, configuração Vite/Tailwind | Build, typecheck, lint, fluxos e auditorias                     |
| Busca/filtros/ordem/página/URL        | `features/catalog`, `app/router`                                           | Teste catálogo e respostas obsoletas                            |
| Detalhe, galeria, edição e estoque    | `features/detail`                                                          | Teste detalhe direto/inexistente/esgotado                       |
| Sessão, cadastro, retorno e expiração | `app/session`, `account`, `Protected`                                      | Cadastro, refresh, expiração no checkout                        |
| Favoritos e rollback                  | `features/data`                                                            | Falha de mutation, persistência e troca de conta                |
| Carrinho e merge                      | `handlers`, `features/cart`                                                | Visitante/login, quantidade, cupom e remoção                    |
| Precisão e cotação                    | `domain/money`, `makeQuote`                                                | Totais observados e revalidação de preço                        |
| Pedido idempotente                    | `checkout`, `/orders`                                                      | Clique repetido, conteúdo diferente e timeout                   |
| Recibo e consumo do carrinho          | `settleOrders`, `OrderPage`                                                | Compra completa e snapshot após alteração                       |
| Falha de pagamento                    | `handlers`, `OrderPage`                                                    | Recusa mantém itens                                             |
| Perfil/avatar/senha/carteiras         | `features/account`                                                         | Edição, persistência e erros API                                |
| Eventos, versões e reconexão          | `app/realtime`, `mocks/realtime`                                           | Preço via socket, duplicatas, desconexão e retomada             |
| Falhas e carregamento                 | `mocks/database`, `handlers`, `shared`                                     | Skeleton, HTTP, vazio e recuperação                             |
| Mobile/tablet/desktop                 | `styles.css`                                                               | Baselines de 390/768/1440 px                                    |
| Teclado/foco/movimento                | `shared`, shadcn/Radix e CSS                                               | Teste de teclado e inspeção visual                              |
| Performance e qualidade               | `scripts/lighthouse*`                                                      | 12 medições HTML/JSON, medianas                                 |
| Rotas diretas e build                 | Vite, `vercel.json`, `_redirects`                                          | E2E no preview; validação externa depende de deploy             |
| Figma e assets                        | Artes originais, paleta e medidas conferidas; adaptações declaradas        | Inspeção visual e baselines; igualdade integral não certificada |
| Deploy público                        | GitHub privado → Vercel, branch main                                       | 58 testes públicos e 39 verificações de rotas/worker/assets     |

## Alternativas e evolução

O teste `tests/clock.spec.ts` instala um relógio virtual e avança 31 minutos para verificar a expiração real da política de sessão sem uma espera equivalente. Cenários de pedidos pendentes também podem ser concluídos pelo endpoint de controle, mantendo os testes reproduzíveis. A configuração de fontes do Tailwind limita a varredura a `src/`; relatórios gerados não alimentam a geração do CSS.

Foram preferidos Router/Query da stack requerida a um store remoto manual e Vite a SSR, pois o alvo é uma demonstração estática. Valores poderiam usar uma biblioteca decimal; BigInt reduz dependências e torna a escala explícita. Eventos poderiam carregar snapshots completos; a invalidação REST simplifica a autoridade dos cálculos ao custo de mais consultas. Um backend Socket.IO real daria maior fidelidade de transporte, mas exigiria serviço adicional no deploy.

Limitações: persistência por navegador/origem, sem coordenação transacional entre abas; simulador manipulável pelo usuário; sem backend seguro, schemas completos para todos os recursos, gateway, upload livre de avatar ou recuperação de senha por e-mail. Avatares são selecionados entre quatro imagens locais. A rede da carteira é validada, mas não representa compatibilidade real de NFTs ou blockchain. Cotações e pedidos antigos permanecem no armazenamento até o reset; faltam expiração/coleta e limites de volume. O handler REST central pode ser dividido por recurso à medida que o domínio crescer. Query invalida mais recursos que o necessário durante eventos: é uma decisão simples e segura para 24 itens, com espaço para granularidade.

Próximos passos: revisão completa dos frames/assets autorizados, schemas de entrada/saída, testes multiaba, maior cobertura de condições concorrentes, leitores de tela, CI com ambiente fixo para baselines, política de retenção e backend real com sessão segura e idempotência persistente/transacional. A publicação foi validada na origem definitiva com HTTPS, worker, rotas diretas, compra simulada, Socket.IO e reconexão. O repositório privado foi criado; a conexão Git está concluída e o push em main gerou um deploy Ready validado. CI com checks de branch continua uma evolução.

## Validação de formulários e estados de edição

`domain/validation.ts` concentra as regras compartilhadas pelo cliente e pelos handlers REST. Nomes pessoais aceitam letras Unicode, acentos, espaços, apóstrofos e hífens (2–80 caracteres), sem números; são normalizados em NFC e têm espaços duplicados removidos ao persistir. E-mail tem validação básica de formato e tamanho. Senhas novas exigem 8–128 caracteres, letras e números; confirmação é uma prevenção de digitação no cliente. O login preserva a compatibilidade das credenciais existentes.

`ValidatedForm` valida no envio e foca o primeiro campo inválido. Erros já apresentados são reavaliados durante a digitação, sem deslocar o botão no blur imediatamente anterior ao clique. `Field` associa a explicação por `aria-describedby` e informa `aria-invalid`. Erros do servidor continuam visíveis, incluindo conflitos de e-mail e cenários de falha.

Quantidade é mantida como rascunho string: `''` não vira zero. Detalhe bloqueia a inclusão enquanto o rascunho não for inteiro positivo dentro do estoque. `CartQuantity` só confirma um valor válido no blur; uma entrada vazia ou inválida não altera o carrinho persistido. A API continua revalidando quantidade e disponibilidade.

Carteiras Ethereum/Polygon exigem formato hexadecimal EVM não nulo; Solana exige formato Base58 de 32–44 caracteres. Essa verificação de formato não valida assinatura, checksum, saldo ou propriedade. Endereços repetidos na mesma rede são recusados, ignorando maiúsculas em EVM. `shortenAddress` exibe cinco caracteres iniciais e cinco finais somente para um formato válido; o valor completo fica armazenado e pode ser consultado na tela de carteiras. Checkout bloqueia revisão com rede incompatível. Dados antigos não são reescritos automaticamente.

`PriceRange` usa Slider Radix com dois controles acessíveis e resolução de 0,01 ETH entre 0 e 12,50 ETH. Posições inteiras são convertidas via BigInt em strings decimais, mantendo os cálculos do domínio em wei. A aplicação do filtro atualiza a URL e reinicia a página. O intervalo visual é fixo; filtros manuais mais precisos continuam na URL/API até nova aplicação do slider. Em evolução, limites podem vir do catálogo. TanStack Router preserva strings numéricas com serialização JSON, por isso aspas codificadas podem aparecer na URL.

Transições de cards/botões e entrada/saída de diálogos usam 150–240 ms e respeitam movimento reduzido. Avisos de sucesso têm espaço explícito antes das ações. `tests/improvements.spec.ts` cobre os erros relatados, validações na API sem formulário, acessibilidade do slider e persistência.

O slider fica em um chunk próprio de aproximadamente 21 kB (7,66 kB gzip). Filtros desktop só são montados no viewport correspondente; no mobile a primitiva é carregada ao abrir o diálogo. Isso mantém a interação completa sem inicializar controles invisíveis. `useSyncExternalStore` acompanha mudanças de largura sem duplicar o estado dos filtros na URL. O preload do destaque usa `imagesrcset`/`imagesizes` para selecionar a mesma variante da imagem renderizada.

## Falhas de renderização e recuperação do Service Worker

`ErrorPage` substitui o fallback técnico do Router por uma página em português, com foco no título, identidade KURIO e ações para recarregar ou voltar ao catálogo. Há uma variante de 404. Falhas no bootstrap também renderizam essa página. Ela não exibe stack, payload ou mensagem interna. Erros de consultas e formulários continuam sendo tratados nos respectivos componentes; uma error boundary não captura automaticamente qualquer callback assíncrono.

O incidente reproduzido em `reports/incident-reproduction.json` ocorreu na versão publicada anterior: depois de encerrar o Service Worker via CDP, `GET /api/nfts/nft-1` passou de JSON válido para HTML com HTTP 200. O fallback da SPA na Vercel atendia a requisição que escapou dos mocks. A interface confiava no tipo TypeScript e acessava `editions[0]` ou `items.length`. O teste reproduziu a quebra sem corromper dados da aplicação. O encerramento/reinício de workers é compatível com o ciclo de vida do navegador; a ação exata que disparou o relato do usuário não foi identificada. [Ciclo de vida documentado pelo Chromium](https://chromium.googlesource.com/chromium/src/+/main/docs/security/service-worker-security-faq.md).

No worker gerado de MSW 2.15, `activeClientIds` vive na memória do processo e inicia vazio após uma interrupção. `mocks/browser.ts` repete o handshake `MOCK_ACTIVATE`/`MOCKING_ENABLED`, com timeout de 2 s, ao retornar à aba, restaurar uma página ou mudar o controller. `lib/mock-connection.ts` compartilha uma recuperação em andamento; o interceptor de requisições aguarda esse trabalho antes de enviar chamadas. Não é necessário apagar dados nem trocar o interceptor WebSocket capturado pelo Engine.IO.

O Axios rejeita respostas que não sejam JSON e valida em runtime o contrato de NFT e catálogo (`domain/contracts.ts`). Uma resposta HTML ou falha de transporte pode iniciar a reativação. Somente GET recebe uma repetição automática, no máximo uma por chamada e respeitando cancelamento. POST/PUT/PATCH/DELETE não são repetidos pelo recuperador; o usuário tenta novamente de forma deliberada. O checkout conserva sua própria chave de idempotência e consulta a tentativa quando apropriado. Erros Axios com corpo HTML, vazio ou inesperado recebem mensagem controlada em vez de serem tratados como `ApiError` válido.

Esse handshake depende do protocolo do worker MSW 2.15 fixado no lockfile; o arquivo gerado `public/mockServiceWorker.js` permanece sem alterações. Não é uma API pública estável de MSW e deve ser revalidado ao atualizar a dependência. `worker.stop()/start()` não foi usado para reativar HTTP porque reiniciaria também interceptores que participam do transporte Socket.IO. Os testes interrompem o processo real do worker com CDP e verificam busca, sessão, carrinho, eventos de preço e ausência de replay de POST durante checkout.

A validação de JSON em runtime cobre NFT, catálogo, tipo de conteúdo HTTP e formato básico de mensagens de erro. Os demais contratos continuam apoiados nos tipos e nas regras dos handlers; uma biblioteca de schemas para todas as respostas ainda é uma evolução possível.

Conta, carrinho, checkout e favoritos usam chunks de rota sob demanda. O catálogo e o detalhe continuam disponíveis no caminho de entrada. Visitantes recebem o link para autenticar ao favoritar, sem criar observadores privados de Query antes do login.

## Revisão de estado de edição e gerenciamento de carteiras

`QuantityField` (`components/quantity.tsx`) preserva um rascunho string apagável e rejeita alterações que contenham caracteres além de dígitos ASCII. A validação de inteiro positivo e estoque continua em `domain/validation.ts` e nos handlers. No carrinho, somente blur com valor válido confirma a alteração; digitar letras ou deixar vazio não envia quantidade à API. Os erros têm largura própria para não formar uma coluna estreita. O detalhe usa um grupo de botões de edição e controles de quantidade independentes: uma mensagem de erro não estica os botões de edição. Estoque zero é um aviso de disponibilidade, sem atribuir erro de digitação ao usuário.

O cupom em `features/cart.tsx` tem estados distintos para texto digitado e código confirmado. A mutation valida o candidato com `POST /quote`; somente sucesso troca o cupom persistido e alimenta o cache da cotação. Um candidato inválido ou expirado exibe erro associado ao campo e conserva itens, valores e o último desconto confirmado. O cache inclui dono, versão do carrinho e código. Um cupom inválido persistido por uma versão anterior é removido da persistência e a cotação sem desconto é recuperada. O checkout sempre obtém e revalida sua própria cotação antes da criação do pedido.

`AvatarPicker` mantém a prévia no estado local. Selecionar uma arte atualiza imediatamente a imagem; salvar confirma a mudança na API e atualiza perfil/sessão. Recarregar antes de salvar restaura o avatar confirmado.

`features/account.tsx` mostra o endereço completo nas carteiras, com quebra de linha, seleção de texto e botão de cópia. Falha de clipboard oferece instrução para cópia manual. A seleção de carteira no checkout continua abreviada para identificação rápida. Os ícones de copiar, editar e excluir têm nomes acessíveis e tooltips por ponteiro/foco, dispensáveis com Escape. Excluir exige confirmação em diálogo, comunica erros sem remover o card e restaura foco ao cancelar ou ao título após remoção. A API aceita excluir a última carteira; o checkout exige novo cadastro. O handler confere o dono, define outra principal quando necessário e não altera snapshots de carteiras em pedidos já criados.

O atalho de retorno ao pagamento só aparece com `returnTo=/checkout`, definido pelos links do checkout e limitado a esse destino pelo validador de busca do Router. A navegação normal para carteiras não introduz esse contexto. `tests/review.spec.ts` verifica os oito ajustes, incluindo isolamento na API, recibo imutável, recuperação de cupom legado e medidas dos controles em desktop/mobile. O alinhamento do favorito usa a mesma composição de ícone para link de visitante e botão autenticado.

## Referências de pagamento e confirmação

A revisão consultou e exportou os frames originais: `Desktop / Pagamento` (`11:2862`, 1440 × 1657), `Mobile / Pagamento` (`16:748`, 414 × 896) e `Desktop / Confirmação de Pedido` (`11:4385`, 1440 × 1657). A grade desktop usa 763/405 px e intervalo de 32 px dentro dos 1200 px úteis. Mobile prioriza carteiras, provedores, total e confirmação; os dados do colecionador ficam em um disclosure editável. O cartão de conclusão usa largura máxima de 578 px, margem superior desktop de 166 px e cabeçalho de 156 px. Os valores e itens exibidos vêm da API, portanto variam conforme o pedido.

O título `11:5149`, exportado como SVG com Outline text desativado, declara `font-family="Roboto Mono"`, tamanho 16 e peso bold. Isso resolveu a variável de fonte que a inspeção mostrava apenas como `font/family`. A fonte passou a ser usada em toda a aplicação. `public/art/thank-you.svg` é o asset original de 80 × 80 do nó `11:5150`. O CSS de pagamento e confirmação fica em `features/checkout.css` e é carregado com a rota; componentes visuais, dados rotulados e tabela estão em `features/checkout-presentation.tsx`.

O formulário inclui nome, e-mail, usuário, nome do perfil, rede, carteira, provedor, domínio, indicação e observação. Campos auxiliares opcionais têm limites e validações compartilhadas. `CollectorDetails` é opcional no contrato para compatibilidade com pedidos e tentativas já armazenados, mas a interface atual sempre envia seus campos. A assinatura de idempotência inclui esses detalhes e o pedido conserva um snapshot imutável. A revisão mostra cada valor em `dt/dd`, inclusive endereço completo; itens também identificam edição e quantidade.

As adaptações funcionais incluem navegação de conta autenticada, seleção de carteira cadastrada, indicação opcional, dados editáveis no mobile e botão de recibo da simulação. Não há link para transação real no Etherscan. O rodapé reproduz os blocos visuais; itens editoriais fora do escopo são texto, e a prévia de newsletter valida o e-mail e informa que não enviará mensagens. A confirmação não recebe o aviso de atualização de catálogo disparado pela própria compra. Estados pendentes, recusados, retomada e cotação alterada continuam com o mesmo domínio.

`tests/payment-design.spec.ts` verifica a composição responsiva, coordenadas da grade, labels da revisão, snapshot dos dados, validação na UI/API e ausência de overflow. As referências visuais de conclusão mascaram somente data e ID aleatórios. Comparações contra baselines continuam verificando estabilidade; a inspeção dos três frames originais é evidência separada de aderência visual.

## Detalhe do NFT e atualização do catálogo

Os frames `Desktop / Detalhes do NFT` (`10:244`, 1440 × 2246) e `Mobile / Detalhes do NFT` (`15:5536`, 414 × 896) foram inspecionados e exportados. `features/detail.tsx` organiza galeria, zoom, grupo acessível de edições, quantidade, favoritos, compra, avaliações e navegação de coleção. `features/detail.css` define a composição desktop (galeria de 572 px e conteúdo ao lado) e o mobile com imagem, ficha sobreposta e ações na base. O rodapé visual compartilhado foi extraído para `components/commerce-footer.tsx` e seu CSS.

As quatro miniaturas mantêm a identidade da mesma obra. A referência reutiliza a mesma imagem com recortes; o SVG exportado do frame contém os quatro assets-base já presentes no projeto. O zoom abre a arte selecionada em Dialog. As edições são radios com foco único e navegação por setas/Home/End. Os controles −/+ respeitam o estoque, e a entrada textual continua apagável e limitada a dígitos. Ações auxiliares de adicionar ao carrinho e cópia foram preservadas.

O simulador acrescenta rótulos 1/1, 1/10, 1/50 e ABERTA, coleção, atributos e 19 avaliações fictícias por obra. `enrichNft` faz uma migração aditiva: mantém preços/estoques das edições existentes, sessões, carrinhos, cotações e snapshots de pedidos. Edições única e aberta possuem estoques de demonstração de 1 e 100. Catálogo omite o texto das avaliações para reduzir payload; o detalhe inclui a lista. Contratos em runtime validam os novos campos opcionais. Nenhum desses dados representa propriedade ou avaliação real de blockchain.

A seção da coleção consulta o catálogo via REST/Query e abre os recursos correspondentes, com paginação local de três grupos. As abas usam estados ARIA e teclado. Avaliações abrem em diálogo no mobile. `tests/detail-design.spec.ts` verifica medidas, estoque, teclado, zoom, navegação, migração e preservação do fingerprint de cotações existentes. Preços, avaliações, itens de coleção e estado autenticado são dados dinâmicos e podem diferir dos exemplos estáticos do desenho.

## Validação desta revisão e publicação

A execução final aprovou 103 testes, incluindo os cenários adicionados de composição, revisão rotulada e migração. `enrichNft` preserva registros inválidos e só enriquece NFTs aceitos pelo guard; a fronteira HTTP apresenta o erro recuperável sem interromper a inicialização. No detalhe mobile, o aviso de falha de favorito ocupa uma linha própria e mantém a ação disponível para nova tentativa. As diferenças intencionais dos recortes e dos alvos de paginação foram revisadas antes de atualizar as baselines desktop/tablet. A auditoria também corrigiu a semântica do rodapé e o ícone de compartilhamento.

O fluxo de publicação usa `main` no repositório privado `ThiagoMinguim/kurio-jungle` e o projeto Vercel existente. O commit `5291fb6` gerou automaticamente o deploy Git `EAxQxTJdvHxY3vTNQaQgZ5rFqxZK`, Ready, com o domínio de produção. Foram aprovados 58 testes públicos e 39 verificações HTTP/rotas/hashes. Relatórios públicos de versões antigas estão em `reports/previous-deployment/`. A atualização dos relatórios não muda o código de aplicação, mas gera outro deploy pelo mesmo fluxo Git. O relatório registra o commit efetivamente validado antes de seu próprio commit.

## Sessão expirada durante a inicialização

Na conferência com um token antigo, catálogo e detalhe podiam permanecer em skeleton. A limpeza da sessão chamava `cancelQueries()` sem filtro, cancelando também GETs públicos iniciados simultaneamente à recuperação de `/session`. O cancelamento agora se limita às chaves `private` e `cart`, tanto na limpeza quanto na entrada de outra conta. Queries públicas continuam em andamento; dados privados ainda são cancelados e removidos. `tests/clock.spec.ts` reproduz uma sessão persistida vencida, com API lenta, abrindo diretamente detalhe e catálogo. O caso falhou no build anterior e passou após a correção em desktop/mobile; traces estão em `reports/failure-traces/expired-bootstrap-*`.
