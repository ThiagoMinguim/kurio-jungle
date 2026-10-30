# KURIO · NFT Marketplace

[![Quality](https://github.com/ThiagoMinguim/kurio-jungle/actions/workflows/quality.yml/badge.svg)](https://github.com/ThiagoMinguim/kurio-jungle/actions/workflows/quality.yml)

**[Abrir aplicação](https://kurio-jungle-one.vercel.app/) · [Experimentar a demonstração](https://kurio-jungle-one.vercel.app/demo) · [Arquitetura](ARCHITECTURE.md) · [CI e relatórios](https://github.com/ThiagoMinguim/kurio-jungle/actions)**

Desafio de Frontend Developer da Jungle Gaming: um marketplace de arte digital com catálogo, conta, carrinho e compra completa. Implementado com React e TypeScript sobre uma API REST simulada com MSW e eventos que passam pelo cliente Socket.IO. **Nenhum pagamento, carteira externa, blockchain ou envio de e-mail é real.**

| Desktop                                            | Mobile                                            |
| -------------------------------------------------- | ------------------------------------------------- |
| ![Catálogo no desktop](assets/readme/desktop.webp) | ![Catálogo no celular](assets/readme/mobile.webp) |

## Avalie em dois minutos

1. Abra o [guia da demonstração](https://kurio-jungle-one.vercel.app/demo) e clique em **Entrar na conta de exemplo**. Não é necessário cadastrar dados ou instalar extensões.
2. No catálogo, combine busca, categoria e preço. Recarregue a página: a URL preserva os filtros.
3. Abra **Emerald Ape #042**, escolha **Original** e adicione uma unidade ao carrinho. Experimente o cupom **`KURIO10`**.
4. Prossiga para pagamento. A conta já possui uma carteira fictícia; revise os dados e confirme. Acompanhe o processamento até o recibo.
5. Abra **Meu perfil → Atividade** e **Arquivos baixados** para consultar o pedido e baixar o recibo.

Credenciais iniciais: **`alex@demo.test` / `Demo123!`**. A segunda conta, **`bia@demo.test` / `Demo123!`**, permite verificar isolamento. Cada navegador mantém seus próprios dados; alterações de senha e cadastros persistem até o reset explícito.

## O que vale observar

| Decisão                         | Comportamento verificável                                                                   | Código / teste                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Consistência de valores         | ETH em strings; cálculos em wei com `BigInt`, inclusive desconto e taxa                     | [money.ts](src/domain/money.ts), [consistency.spec.ts](tests/consistency.spec.ts)                        |
| Compra idempotente              | Clique repetido e timeout não criam pedidos duplicados                                      | [checkout.tsx](src/features/checkout.tsx), [flows.spec.ts](tests/flows.spec.ts)                          |
| Cotação revalidada              | Preço/estoque alterado exige nova revisão antes de comprar                                  | [handlers.ts](src/mocks/handlers.ts), [flows.spec.ts](tests/flows.spec.ts)                               |
| Dados privados isolados         | Carrinho, perfil e cache não aparecem em outra conta                                        | [session.tsx](src/app/session.tsx), [data.ts](src/features/data.ts)                                      |
| Tempo real reconciliado         | Eventos duplicados/antigos são descartados; reconexão reconsulta REST                       | [realtime.ts](src/app/realtime.ts), [flows.spec.ts](tests/flows.spec.ts)                                 |
| Recuperação de erros            | Cupom inválido preserva resumo; erro não apaga carrinho; worker suspenso pode recuperar GET | [review.spec.ts](tests/review.spec.ts), [mock-recovery.spec.ts](tests/mock-recovery.spec.ts)             |
| Acessibilidade e responsividade | Teclado, foco de diálogo, erros associados, movimento reduzido e testes de geometria        | [frame-audit.spec.ts](tests/frame-audit.spec.ts), [account-extras.spec.ts](tests/account-extras.spec.ts) |

## Execute a partir de um checkout limpo

Node **22.23.4**, definido em `.nvmrc`, e npm. Não é necessário backend, banco de dados, chave de API ou serviço privado.

```sh
nvm install
nvm use
npm ci --ignore-scripts
npm run dev
```

Abra `http://127.0.0.1:5173`. O lockfile fixa as dependências; os binários de esbuild/Tailwind vêm dos pacotes de plataforma, sem scripts de instalação.

| Comando                  | Resultado                                                                |
| ------------------------ | ------------------------------------------------------------------------ |
| `npm run typecheck`      | Verifica TypeScript                                                      |
| `npm run lint`           | Verifica ESLint                                                          |
| `npm run build`          | Verifica tipos e gera `dist/`                                            |
| `npm run preview`        | Serve o build em `http://127.0.0.1:4173`                                 |
| `npm test`               | E2E e comparações visuais locais                                         |
| `npm run test:ci`        | E2E e geometria, sem comparar pixels de sistemas operacionais diferentes |
| `npm run test:visual`    | Baselines de início, detalhe, carrinho e pagamento                       |
| `npm run lighthouse`     | 12 medições: três por página/perfil, com medianas                        |
| `npm run audit:delivery` | Inspeciona arquivos rastreados e build antes da entrega                  |

Antes dos testes, execute `npx playwright install chromium` e `npm run build`. O Playwright inicia o preview. Em Linux, use `npx playwright install --with-deps chromium`.

## Teste os caminhos de falha

No [guia](https://kurio-jungle-one.vercel.app/demo) ou no rodapé, abra **Laboratório de cenários**. Escolha o cenário e use **Ativar cenário sem reset**. Refaça a operação ou recarregue a página. Ao terminar, volte a **Sucesso**. O reset completo exige confirmação e apaga somente os dados fictícios deste navegador.

| Cenário                                     | Roteiro / resultado esperado                                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Preço muda ao confirmar                     | Adicione NFT 1, ative o cenário e confirme o checkout; revise o novo valor antes de uma segunda confirmação    |
| Pagamento recusado                          | Faça uma compra; o pedido fica recusado e o carrinho é preservado                                              |
| Timeout após criar pedido                   | Confirme; após o timeout, a recuperação encontra o mesmo identificador, sem duplicar a compra                  |
| Pedido pendente                             | Crie um pedido; use “Interromper conexão” e “Concluir pedidos pendentes”; reconectar/refresh recupera o estado |
| Falha ao favoritar                          | Favorite autenticado; observe rollback e mensagem de erro                                                      |
| Rede lenta / Catálogo vazio / Erro HTTP 503 | Reabra o catálogo; observe skeleton, vazio ou recuperação por “Tentar novamente”                               |
| Respostas fora de ordem                     | Busque `S` e logo `Emerald`; a resposta antiga não substitui a busca atual                                     |
| Sessão expirada                             | Abra recurso privado; reative Sucesso e entre novamente para retomar o fluxo                                   |

O laboratório também permite alterar preço/estoque de um NFT escolhido e enviar eventos duplicados/antigos. Essas operações atravessam MSW e Socket.IO, não setters de UI. Cupom válido: `KURIO10` (10%, arredondado para baixo em wei); `EXPIRED` é expirado; outros códigos são inválidos. Taxa padrão: `0.003 ETH`.

## CI, evidências e performance

O workflow [Quality](.github/workflows/quality.yml) executa instalação limpa, TypeScript, lint, build, auditoria de entrega e testes Chromium em desktop/mobile a cada push e pull request para `main`. Publica relatório HTML, JSON, capturas e traces de falhas como **artefatos da execução** por 14 dias. O build também fica disponível como artefato após sucesso. Actions usa permissões somente de leitura e versões de actions fixadas por SHA.

As baselines locais em `tests/baselines/` foram revisadas em macOS arm64; o CI Linux executa os testes funcionais e de geometria e gera capturas para inspeção. Não regenera imagens automaticamente nem trata diferenças de renderização entre sistemas como bugs da aplicação. Para alterações visuais deliberadas, revise as diferenças antes de usar `npm run test:visual -- --update-snapshots` e rode novamente sem esse parâmetro.

O workflow [Lighthouse](.github/workflows/lighthouse.yml), iniciado manualmente em Actions, audita início/detalhe em desktop/mobile, três vezes por combinação, e publica HTML/JSON/medianas por 30 dias. Para reproduzir localmente, mantenha `npm run preview` ativo e execute `npm run lighthouse` em outro terminal, sem testes concorrentes.

As medições do código de aplicação `449f506` foram realizadas tanto no Mac local quanto no runner Linux do GitHub. Cada linha usa a mediana de três execuções, sem testes concorrentes no mesmo ambiente:

| Página / perfil   | Performance macOS | Performance CI Linux | Acessibilidade / Boas práticas / SEO |
| ----------------- | ----------------: | -------------------: | ------------------------------------ |
| Início / mobile   |                89 |                   79 | 100 / 100 / 100                      |
| Início / desktop  |                99 |                   97 | 100 / 100 / 100                      |
| Detalhe / mobile  |                92 |                   83 | 100 / 100 / 100                      |
| Detalhe / desktop |               100 |                  100 | 100 / 100 / 100                      |

**Limitação medida:** a meta de Performance ≥ 90 não foi atingida no início mobile local nem nas duas páginas mobile do CI. No runner, a auditoria atribui a maior parte do trabalho à avaliação de JavaScript; o TBT mediano ficou em 441 ms no início e 392 ms no detalhe, com LCP de 3,62 s e 3,23 s. O bootstrap precisa ativar a simulação MSW antes de carregar o cliente Socket.IO. A execução de React/Router e da infraestrutura de mocks no cliente contribui para esse custo; não foi removida para melhorar a nota. Reduzir e distribuir o trabalho de inicialização é a próxima prioridade de performance. Não basta ter nota alta no desktop.

[Resumo macOS](evidence/lighthouse-macos-449f506.json), [resumo Linux](evidence/lighthouse-linux-449f506.json) e [relatórios completos do CI](https://github.com/ThiagoMinguim/kurio-jungle/actions/runs/40986417585) incluem LCP, CLS, TBT, versões e condições. A medição [histórica anterior](evidence/lighthouse-macos-8b28581.json) permanece identificada por commit, sem substituir os resultados atuais.

Relatórios gerados ficam em `reports/`, `playwright-report/` e `test-results/`, fora do Git; o código mantém apenas baselines, imagens de apresentação e resumos pequenos. O histórico anterior foi preservado no commit `d9a27e3`, sem reescrever o Git.

## Configuração e publicação

| Variável            | Padrão                      | Finalidade                        |
| ------------------- | --------------------------- | --------------------------------- |
| `VITE_ENABLE_MOCKS` | ativo, exceto valor `false` | Inicializa MSW antes de Socket.IO |
| `TEST_BASE_URL`     | `http://127.0.0.1:4173`     | Destino dos testes                |
| `AUDIT_BASE_URL`    | `http://127.0.0.1:4173`     | Destino do Lighthouse             |
| `CHROME_PATH`       | Chromium do Playwright      | Chrome da auditoria               |

Veja `.env.example`. Desativar mocks exige implementar um backend; não há servidor remoto fornecido. Service Workers precisam de loopback ou HTTPS: não abra `index.html` por `file://`.

A Vercel acompanha `main`: push dispara deploy usando `npm ci --ignore-scripts`, `npm run build` e **somente `dist/`**. [vercel.json](vercel.json) configura refresh/acesso direto às rotas e cache do worker. A publicação é independente do workflow de testes; confira o resultado de Quality antes de entregar. Não é necessário upload manual de ZIP.

## Escopo, referência e créditos

Referências: [enunciado](https://github.com/junglegaming/frontend-challenge) e [Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1). Foram revisados 15 frames; a [matriz de revisão](evidence/figma-review.json) registra referências e adaptações. Comparação com a própria baseline não equivale a certificar igualdade integral de pixels com o Figma.

Os fluxos centrais são funcionais com mocks: catálogo, detalhe, autenticação, perfil, carteiras, carrinho, checkout e recibo. Atividade/downloads usam pedidos da conta. Ofertas e suporte são extensões locais simples; não existem frames específicos para elas. Login social, e-mail, negociação e blockchain não são integrados. Não há compartilhamento de dados entre dispositivos.

Stack: React, TypeScript, TanStack Router/Query, Axios, MSW, Socket.IO, Tailwind, shadcn/ui/Radix, Vite, Playwright e Lighthouse. As quatro artes e o ícone de agradecimento vêm do Figma autorizado; imagens foram otimizadas para WebP. Roboto Mono é distribuída por `@fontsource/roboto-mono`. Button/Dialog adaptam componentes MIT do shadcn/ui. Contratos REST/eventos, decisões, limites e alternativas estão em [ARCHITECTURE.md](ARCHITECTURE.md).

**Uso de IA:** implementação, testes e documentação tiveram assistência de IA. As decisões e limitações estão documentadas; a validação é reproduzível pelos comandos e evidências indicados.
