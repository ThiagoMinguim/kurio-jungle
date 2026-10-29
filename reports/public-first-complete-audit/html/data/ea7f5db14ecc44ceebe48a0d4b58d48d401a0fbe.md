# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows.spec.ts >> carrinho: persistência visitante, login, quantidade, cupom e remoção
- Location: tests/flows.spec.ts:154:1

# Error details

```
Test timeout of 35000ms exceeded.
```

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('alert')
Expected substring: "Cupom expirado"
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByRole('alert') with timeout 10000ms
  - waiting for getByRole('alert')

```

```yaml
- link "Pular para o conteúdo":
  - /url: "#main"
- banner:
  - link "Kurio, página inicial":
    - /url: /
    - text: KURIO
  - navigation "Principal":
    - link "Início":
      - /url: /
    - link "Mercado":
      - /url: /#catalogo
    - link "Criadores":
      - /url: /#criadores
    - link "Aprenda":
      - /url: /#diario
  - button "Abrir busca"
  - link "Carrinho, 2 itens":
    - /url: /cart
    - text: "2"
  - link "Alex":
    - /url: /profile
  - button "Sair"
- main:
  - navigation "Localização":
    - link "Início":
      - /url: /
    - text: /
    - link "Mercado":
      - /url: /#catalogo
    - text: / Carrinho
  - region "Itens do carrinho":
    - article:
      - 'link "Emerald Ape #042"':
        - /url: /nft/nft-1
        - 'img "Emerald Ape #042"'
      - 'link "Emerald Ape #042"':
        - /url: /nft/nft-1
        - 'heading "Emerald Ape #042" [level=2]'
      - paragraph: "ID do token: #042"
      - strong: 1.19 ETH
      - 'button "Diminuir quantidade de emerald ape #042"'
      - text: Quantidade
      - 'textbox "Quantidade de Emerald Ape #042"': "2"
      - 'button "Aumentar quantidade de emerald ape #042"'
      - strong: 2.38 ETH
      - 'button "Remover Emerald Ape #042"'
  - complementary:
    - heading "Resumo da carteira" [level=2]
    - text: Cupom de desconto
    - textbox "Cupom de desconto" [disabled]:
      - /placeholder: Experimente KURIO10
      - text: EXPIRED
    - button "Verificando…" [disabled]
    - term: Subtotal
    - definition: 2.38 ETH
    - term: Desconto
    - definition: − 0 ETH
    - term: Taxa de rede simulada
    - definition: 0.003 ETH
    - term: Total
    - definition: 2.383 ETH
    - text: Confira o carrinho
    - link "Continuar explorando":
      - /url: /
    - paragraph: Todos os valores e pagamentos são simulados.
  - region "Colecionadores também viram":
    - heading "Colecionadores também viram" [level=2]
    - 'link "Cosmic Bloom #118 Cosmic Bloom #118 1.29 ETH"':
      - /url: /nft/nft-4
      - 'img "Cosmic Bloom #118"'
      - 'heading "Cosmic Bloom #118" [level=3]'
      - strong: 1.29 ETH
    - 'link "Violet Nomad #314 Violet Nomad #314 1.39 ETH"':
      - /url: /nft/nft-5
      - 'img "Violet Nomad #314"'
      - 'heading "Violet Nomad #314" [level=3]'
      - strong: 1.39 ETH
    - 'link "Ivory Baron #088 Ivory Baron #088 1.79 ETH"':
      - /url: /nft/nft-6
      - 'img "Ivory Baron #088"'
      - 'heading "Ivory Baron #088" [level=3]'
      - strong: 1.79 ETH
    - 'link "Golden Beat #207 Golden Beat #207 0.99 ETH"':
      - /url: /nft/nft-7
      - 'img "Golden Beat #207"'
      - 'heading "Golden Beat #207" [level=3]'
      - strong: 0.99 ETH
    - 'link "Golden Signal #160 Golden Signal #160 0.39 ETH"':
      - /url: /nft/nft-9
      - 'img "Golden Signal #160"'
      - 'heading "Golden Signal #160" [level=3]'
      - strong: 0.39 ETH
    - navigation "Páginas da coleção":
      - button "Página 1 da coleção"
      - button "Página 2 da coleção"
      - button "Página 3 da coleção"
  - heading "Segurança da carteira" [level=2]
  - paragraph: Proteja sua carteira e colecione arte digital verificada com confiança.
  - heading "Criadores em destaque" [level=2]
  - paragraph: Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.
  - heading "Alertas de lançamentos" [level=2]
  - paragraph: Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.
  - heading "Antecipe-se ao próximo lançamento" [level=2]
  - text: E-mail para novidades
  - textbox "E-mail para novidades":
    - /placeholder: digite seu e-mail...
  - button "Enviar"
  - paragraph: Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
  - strong: KURIO
  - text: Feito para colecionadores, criadores e cultura contato@email.com +55 11 4002 8922
  - heading "Meu perfil" [level=2]
  - link "Meu perfil":
    - /url: /profile
  - link "Minha coleção":
    - /url: /favorites
  - text: Atividade Estúdio do criador
  - link "Lista de interesse":
    - /url: /favorites
  - heading "Central de ajuda" [level=2]
  - text: Central de ajuda Como comprar NFTs Carteira e segurança Política do mercado Denunciar item
  - heading "Coleções" [level=2]
  - link "Arte digital":
    - /url: /?category=Arte+digital
  - link "Fotografia":
    - /url: /?category=Fotografia
  - link "Música":
    - /url: /?category=M%C3%BAsica
  - link "Arte 3D":
    - /url: /?category=Arte+3D
  - link "Utilidade":
    - /url: /?category=Colecion%C3%A1veis
  - heading "Redes sociais" [level=2]
  - group "Redes sociais ilustrativas"
  - heading "Carteiras compatíveis" [level=2]
  - text: METAMASK · WALLETCONNECT · COINBASE
  - paragraph: © 2026 Kurio. Propriedade digital para todos.
  - button "Laboratório de cenários"
```

# Test source

```ts
  72  |   await expect(
  73  |     page.getByRole("heading", { name: "Emerald Ape #042" }),
  74  |   ).toBeVisible();
  75  |   if ((page.viewportSize()?.width || 0) > 680) {
  76  |     await page.getByRole("button", { name: "Imagem 3", exact: true }).click();
  77  |     await expect(page.locator(".detail-art")).toHaveAttribute(
  78  |       "src",
  79  |       "/art/emerald.webp",
  80  |     );
  81  |     await expect(page.locator(".detail-art")).toHaveAttribute(
  82  |       "data-variant",
  83  |       "3",
  84  |     );
  85  |   }
  86  |   await page.getByRole("radio", { name: /1\/10:/ }).click();
  87  |   await expect(
  88  |     page.getByRole("button", { name: /^(COMPRAR|Comprar NFT)$/ }),
  89  |   ).toBeDisabled();
  90  |   await page.goto("/nft/inexistente");
  91  |   await expect(page.getByRole("alert")).toContainText("NFT não encontrado");
  92  | });
  93  | test("cadastro: conflito, validação e login persistente", async ({ page }) => {
  94  |   await page.goto("/register");
  95  |   await page.getByLabel(/^Nome(?: de exibição)?$/).fill("Novo Demo");
  96  |   await page.getByLabel("E-mail", { exact: true }).fill("alex@demo.test");
  97  |   await page.getByLabel("Senha", { exact: true }).fill("Demo123!");
  98  |   await page.getByLabel("Confirmar senha", { exact: true }).fill("Demo123!");
  99  |   await page.getByRole("button", { name: "Criar conta fictícia" }).click();
  100 |   await expect(page.getByRole("alert")).toContainText("Já existe");
  101 |   await page.getByLabel("E-mail", { exact: true }).fill("novo@demo.test");
  102 |   await page.getByRole("button", { name: "Criar conta fictícia" }).click();
  103 |   await assertAuthenticated(page);
  104 |   await page.reload();
  105 |   await assertAuthenticated(page);
  106 | });
  107 | test("favorito otimista, rollback e isolamento entre usuários", async ({
  108 |   page,
  109 | }) => {
  110 |   await login(page);
  111 |   await page.goto("/nft/nft-1");
  112 |   await scenario(page, "favorite-failure");
  113 |   await page
  114 |     .getByRole("button", {
  115 |       name: /^(Adicionar aos favoritos|Favoritar): Emerald Ape #042$/,
  116 |     })
  117 |     .click();
  118 |   await expect(page.getByRole("alert")).toContainText("seleção foi restaurada");
  119 |   await expect(
  120 |     page.getByRole("button", {
  121 |       name: /^(Adicionar aos favoritos|Favoritar): Emerald Ape #042$/,
  122 |     }),
  123 |   ).toHaveAttribute("aria-pressed", "false");
  124 |   await scenario(page, "success");
  125 |   await page
  126 |     .getByRole("button", {
  127 |       name: /^(Adicionar aos favoritos|Favoritar): Emerald Ape #042$/,
  128 |     })
  129 |     .click();
  130 |   await expect(
  131 |     page.getByRole("button", {
  132 |       name: /^(Remover dos favoritos|Favoritado, remover dos favoritos): Emerald Ape #042$/,
  133 |     }),
  134 |   ).toHaveAttribute("aria-pressed", "true");
  135 |   await expect(
  136 |     page.getByRole("button", {
  137 |       name: /^(Remover dos favoritos|Favoritado, remover dos favoritos): Emerald Ape #042$/,
  138 |     }),
  139 |   ).toBeEnabled();
  140 |   await page.reload();
  141 |   await expect(
  142 |     page.getByRole("button", {
  143 |       name: /^(Remover dos favoritos|Favoritado, remover dos favoritos): Emerald Ape #042$/,
  144 |     }),
  145 |   ).toHaveAttribute("aria-pressed", "true");
  146 |   await page.goto("/");
  147 |   await logout(page);
  148 |   await login(page, "bia@demo.test");
  149 |   await page.goto("/favorites");
  150 |   await expect(
  151 |     page.getByRole("heading", { name: "Salve o que inspira você" }),
  152 |   ).toBeVisible();
  153 | });
  154 | test("carrinho: persistência visitante, login, quantidade, cupom e remoção", async ({
  155 |   page,
  156 | }) => {
  157 |   await add(page);
  158 |   await page.reload();
  159 |   await page.goto("/cart");
  160 |   await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  161 |   await login(page);
  162 |   await page.goto("/cart");
  163 |   await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  164 |   const quantity = page.getByLabel("Quantidade de Emerald Ape #042", {
  165 |     exact: true,
  166 |   });
  167 |   await quantity.fill("2");
  168 |   await quantity.press("Tab");
  169 |   await expect(page.getByTestId("quote-total")).toHaveText("2.383 ETH");
  170 |   await page.getByLabel("Cupom de desconto").fill("EXPIRED");
  171 |   await page.getByRole("button", { name: "Aplicar cupom" }).click();
> 172 |   await expect(page.getByRole("alert")).toContainText("Cupom expirado");
      |                                         ^ Error: expect(locator).toContainText(expected) failed
  173 |   await page.getByLabel("Cupom de desconto").fill("INVALID");
  174 |   await page.getByRole("button", { name: "Aplicar cupom" }).click();
  175 |   await expect(page.getByRole("alert")).toContainText("Cupom inválido");
  176 |   await page.getByLabel("Cupom de desconto").fill("KURIO10");
  177 |   await page.getByRole("button", { name: "Aplicar cupom" }).click();
  178 |   await expect(page.getByTestId("quote-total")).toHaveText("2.145 ETH");
  179 |   await page.getByRole("button", { name: "Remover cupom" }).click();
  180 |   await expect(page.getByTestId("quote-total")).toHaveText("2.383 ETH");
  181 |   await page
  182 |     .getByRole("button", { name: "Remover Emerald Ape #042", exact: true })
  183 |     .click();
  184 |   await expect(
  185 |     page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  186 |   ).toBeVisible();
  187 | });
  188 | test("compra completa: recibo imutável e carrinho consumido", async ({
  189 |   page,
  190 | }) => {
  191 |   await login(page);
  192 |   await add(page);
  193 |   await review(page);
  194 |   await confirm(page);
  195 |   await expect(
  196 |     page.getByRole("heading", {
  197 |       name: "Seus NFTs agora estão na sua carteira",
  198 |     }),
  199 |   ).toBeVisible();
  200 |   await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  201 |   expect(await orderCount(page)).toBe(1);
  202 |   await action(page, "price");
  203 |   await page.reload();
  204 |   await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  205 |   await page.goto("/cart");
  206 |   await expect(
  207 |     page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  208 |   ).toBeVisible();
  209 | });
  210 | test("recusa preserva carrinho", async ({ page }) => {
  211 |   await login(page);
  212 |   await add(page);
  213 |   await scenario(page, "payment-declined");
  214 |   await review(page);
  215 |   await confirm(page);
  216 |   await expect(
  217 |     page.getByRole("heading", { name: "Pagamento recusado." }),
  218 |   ).toBeVisible();
  219 |   await page.goto("/cart");
  220 |   await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  221 | });
  222 | test("timeout após criação recupera o mesmo pedido", async ({ page }) => {
  223 |   await login(page);
  224 |   await add(page);
  225 |   await scenario(page, "order-timeout");
  226 |   await review(page);
  227 |   await confirm(page);
  228 |   await expect(
  229 |     page.getByRole("heading", {
  230 |       name: "Seus NFTs agora estão na sua carteira",
  231 |     }),
  232 |   ).toBeVisible({ timeout: 15000 });
  233 |   expect(await orderCount(page)).toBe(1);
  234 | });
  235 | test("cliques repetidos e conflito de chave com conteúdo diferente", async ({
  236 |   page,
  237 | }) => {
  238 |   await login(page);
  239 |   await add(page);
  240 |   await scenario(page, "pending");
  241 |   await review(page);
  242 |   const button = page.getByRole("button", {
  243 |     name: "Confirmar compra simulada",
  244 |     exact: true,
  245 |   });
  246 |   await button.dblclick();
  247 |   await expect(
  248 |     page.getByRole("heading", { name: "Seu pedido está em processamento." }),
  249 |   ).toBeVisible();
  250 |   expect(await orderCount(page)).toBe(1);
  251 |   const result = await page.evaluate(async () => {
  252 |     const token = localStorage.getItem("kurio.session")!,
  253 |       key = Object.keys(localStorage).find((k) =>
  254 |         k.startsWith("kurio.attempt."),
  255 |       )!,
  256 |       attempt = JSON.parse(localStorage.getItem(key)!);
  257 |     const response = await fetch("/api/orders", {
  258 |       method: "POST",
  259 |       headers: {
  260 |         "Content-Type": "application/json",
  261 |         Authorization: `Bearer ${token}`,
  262 |         "Idempotency-Key": attempt.key,
  263 |       },
  264 |       body: JSON.stringify({ ...attempt, name: "Outro Nome" }),
  265 |     });
  266 |     return response.status;
  267 |   });
  268 |   expect(result).toBe(409);
  269 | });
  270 | test("revalida preço na confirmação e exige segundo consentimento", async ({
  271 |   page,
  272 | }) => {
```