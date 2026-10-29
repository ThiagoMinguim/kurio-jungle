import { test, expect } from "@playwright/test";
import {
  action,
  add,
  confirm,
  login,
  orderCount,
  reset,
  review,
  scenario,
  logout,
  catalogSearch,
  chooseAvatar,
  assertAuthenticated,
} from "./helpers";
test.beforeEach(async ({ page }) => {
  await reset(page);
});
test("catálogo: filtros combinados, URL, paginação e histórico", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Paginação" })
    .getByRole("button", { name: "2", exact: true })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await (await catalogSearch(page)).fill("Emerald");
  await expect(page).toHaveURL(/page=1/);
  if (
    await page.getByRole("button", { name: "Filtros", exact: true }).isVisible()
  )
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByRole("button", { name: /^Arte digital/ }).click();
  if (await page.getByRole("dialog").isVisible())
    await page
      .getByRole("dialog")
      .getByLabel("Rede", { exact: true })
      .selectOption("Ethereum");
  else
    await page
      .getByRole("complementary", { name: "Filtros do catálogo" })
      .getByRole("button", { name: /^Ethereum/ })
      .click();
  if (await page.getByRole("dialog").isVisible())
    await page.keyboard.press("Escape");
  if ((page.viewportSize()?.width || 0) <= 680) {
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Ordenar por")
      .selectOption("price-asc");
    await page.keyboard.press("Escape");
  } else await page.getByLabel("Ordenar por").selectOption("price-asc");
  await expect(page.locator(".nft-card")).toHaveCount(1);
  await page.reload();
  await expect(await catalogSearch(page)).toHaveValue("Emerald");
  await (await catalogSearch(page)).fill("Sem resultado");
  await expect(
    page.getByRole("heading", { name: "Nenhuma obra encontrada" }),
  ).toBeVisible();
  await page.goBack();
  await expect(await catalogSearch(page)).toHaveValue("Emerald");
});
test("detalhe direto, galeria, edição esgotada e inexistente", async ({
  page,
}) => {
  await page.goto("/nft/nft-1");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  if ((page.viewportSize()?.width || 0) > 680) {
    await page.getByRole("button", { name: "Imagem 3", exact: true }).click();
    await expect(page.locator(".detail-art")).toHaveAttribute(
      "src",
      "/art/emerald.webp",
    );
    await expect(page.locator(".detail-art")).toHaveAttribute(
      "data-variant",
      "3",
    );
  }
  await page.getByRole("radio", { name: /1\/10:/ }).click();
  await expect(
    page.getByRole("button", { name: /^(COMPRAR|Comprar NFT)$/ }),
  ).toBeDisabled();
  await page.goto("/nft/inexistente");
  await expect(page.getByRole("alert")).toContainText("NFT não encontrado");
});
test("cadastro: conflito, validação e login persistente", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel(/^Nome(?: de exibição)?$/).fill("Novo Demo");
  await page.getByLabel("E-mail", { exact: true }).fill("alex@demo.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo123!");
  await page.getByLabel("Confirmar senha", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Criar conta fictícia" }).click();
  await expect(page.getByRole("alert")).toContainText("Já existe");
  await page.getByLabel("E-mail", { exact: true }).fill("novo@demo.test");
  await page.getByRole("button", { name: "Criar conta fictícia" }).click();
  await assertAuthenticated(page);
  await page.reload();
  await assertAuthenticated(page);
});
test("favorito otimista, rollback e isolamento entre usuários", async ({
  page,
}) => {
  await login(page);
  await page.goto("/nft/nft-1");
  await scenario(page, "favorite-failure");
  await page
    .getByRole("button", {
      name: /^(Adicionar aos favoritos|Favoritar): Emerald Ape #042$/,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("seleção foi restaurada");
  await expect(
    page.getByRole("button", {
      name: /^(Adicionar aos favoritos|Favoritar): Emerald Ape #042$/,
    }),
  ).toHaveAttribute("aria-pressed", "false");
  await scenario(page, "success");
  await page
    .getByRole("button", {
      name: /^(Adicionar aos favoritos|Favoritar): Emerald Ape #042$/,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: /^(Remover dos favoritos|Favoritado, remover dos favoritos): Emerald Ape #042$/,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", {
      name: /^(Remover dos favoritos|Favoritado, remover dos favoritos): Emerald Ape #042$/,
    }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: /^(Remover dos favoritos|Favoritado, remover dos favoritos): Emerald Ape #042$/,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/");
  await logout(page);
  await login(page, "bia@demo.test");
  await page.goto("/favorites");
  await expect(
    page.getByRole("heading", { name: "Salve o que inspira você" }),
  ).toBeVisible();
});
test("carrinho: persistência visitante, login, quantidade, cupom e remoção", async ({
  page,
}) => {
  await add(page);
  await page.reload();
  await page.goto("/cart");
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  await login(page);
  await page.goto("/cart");
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  const quantity = page.getByLabel("Quantidade de Emerald Ape #042", {
    exact: true,
  });
  await quantity.fill("2");
  await quantity.press("Tab");
  await expect(page.getByTestId("quote-total")).toHaveText("2.383 ETH");
  await page.getByLabel("Cupom de desconto").fill("EXPIRED");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(page.getByRole("alert")).toContainText("Cupom expirado");
  await page.getByLabel("Cupom de desconto").fill("INVALID");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(page.getByRole("alert")).toContainText("Cupom inválido");
  await page.getByLabel("Cupom de desconto").fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(page.getByTestId("quote-total")).toHaveText("2.145 ETH");
  await page.getByRole("button", { name: "Remover cupom" }).click();
  await expect(page.getByTestId("quote-total")).toHaveText("2.383 ETH");
  await page
    .getByRole("button", { name: "Remover Emerald Ape #042", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("compra completa: recibo imutável e carrinho consumido", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await review(page);
  await confirm(page);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  expect(await orderCount(page)).toBe(1);
  await action(page, "price");
  await page.reload();
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("recusa preserva carrinho", async ({ page }) => {
  await login(page);
  await add(page);
  await scenario(page, "payment-declined");
  await review(page);
  await confirm(page);
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado." }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
});
test("timeout após criação recupera o mesmo pedido", async ({ page }) => {
  await login(page);
  await add(page);
  await scenario(page, "order-timeout");
  await review(page);
  await confirm(page);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible({ timeout: 15000 });
  expect(await orderCount(page)).toBe(1);
});
test("cliques repetidos e conflito de chave com conteúdo diferente", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await scenario(page, "pending");
  await review(page);
  const button = page.getByRole("button", {
    name: "Confirmar compra simulada",
    exact: true,
  });
  await button.dblclick();
  await expect(
    page.getByRole("heading", { name: "Seu pedido está em processamento." }),
  ).toBeVisible();
  expect(await orderCount(page)).toBe(1);
  const result = await page.evaluate(async () => {
    const token = localStorage.getItem("kurio.session")!,
      key = Object.keys(localStorage).find((k) =>
        k.startsWith("kurio.attempt."),
      )!,
      attempt = JSON.parse(localStorage.getItem(key)!);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": attempt.key,
      },
      body: JSON.stringify({ ...attempt, name: "Outro Nome" }),
    });
    return response.status;
  });
  expect(result).toBe(409);
});
test("revalida preço na confirmação e exige segundo consentimento", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await scenario(page, "price-change");
  await review(page);
  await confirm(page);
  await expect(page.getByRole("dialog")).toContainText("mudaram");
  await expect(page.getByRole("dialog").getByTestId("quote-total")).toHaveText(
    "1.293 ETH",
  );
  expect(await orderCount(page)).toBe(0);
  await confirm(page);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  expect(await orderCount(page)).toBe(1);
});
test("Socket.IO: preço no carrinho, duplicatas e eventos antigos", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await page.goto("/cart");
  await expect(page.locator("main")).toHaveAttribute(
    "data-connection-state",
    "connected",
  );
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  await action(page, "price");
  await expect(page.getByTestId("quote-total")).toHaveText("1.293 ETH");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Preço ou disponibilidade atualizado" }),
  ).toBeVisible();
  await action(page, "duplicates");
  await expect(page.getByTestId("quote-total")).toHaveText("1.293 ETH");
  await page.reload();
  await expect(page.getByTestId("quote-total")).toHaveText("1.293 ETH");
  await page.goto("/");
  await expect(
    page.locator(".nft-card").filter({
      has: page.getByRole("heading", {
        name: "Emerald Ape #042",
        exact: true,
      }),
    }),
  ).toContainText("1.29 ETH");
});
test("reconexão e refresh recuperam pedido pendente", async ({ page }) => {
  await login(page);
  await add(page);
  await scenario(page, "pending");
  await review(page);
  await confirm(page);
  await expect(
    page.getByRole("heading", { name: "Seu pedido está em processamento." }),
  ).toBeVisible();
  const url = page.url();
  await action(page, "disconnect");
  await action(page, "settle");
  await expect(page.locator("main")).toHaveAttribute(
    "data-connection-state",
    "connected",
  );
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  expect(await orderCount(page)).toBe(1);
});
test("expiração no checkout retoma sessão e preserva carrinho", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await review(page);
  await action(page, "expire");
  await confirm(page);
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("alex@demo.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
});
test("perfil, avatar, senha e carteiras persistem com validação", async ({
  page,
}) => {
  await login(page);
  await page.goto("/profile");
  await page.getByLabel(/^Nome(?: de exibição)?$/).fill("Alex Atualizado");
  await chooseAvatar(page, "sage");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toContainText("Perfil atualizado");
  await page.reload();
  await expect(page.getByLabel(/^Nome(?: de exibição)?$/)).toHaveValue(
    "Alex Atualizado",
  );
  await page.getByLabel("Senha atual", { exact: true }).fill("Errada123");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaDemo123!");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("NovaDemo123!");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("alert")).toContainText("Senha atual incorreta");
  await page.getByLabel("Senha atual", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Perfil e senha atualizados",
  );
  await page.goto("/wallets");
  await page.getByLabel("Nome da carteira").fill("Secundária Demo");
  await page.getByLabel("Endereço fictício").fill("invalido");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByRole("alert")).toContainText("inválidos");
  await page.getByLabel("Endereço fictício").fill(`0x${"2".repeat(40)}`);
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(
    page.getByRole("heading", { name: "Secundária Demo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar Secundária Demo" }).click();
  await page.getByLabel("Nome da carteira").fill("Secundária Editada");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(
    page.getByRole("heading", { name: "Secundária Editada" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Secundária Editada" }),
  ).toBeVisible();
  await logout(page);
  await login(page, "alex@demo.test", "NovaDemo123!");
});
test("skeleton, erro HTTP, vazio e recuperação", async ({ page }) => {
  await scenario(page, "slow");
  await page.goto("/nft/nft-1");
  await expect(
    page.getByRole("status", { name: "Carregando conteúdo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await scenario(page, "http-500");
  await page.goto("/nft/nft-2");
  await expect(page.getByRole("alert")).toContainText("indisponível");
  await scenario(page, "success");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Sage Nomad #009" }),
  ).toBeVisible();
  await scenario(page, "empty");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Nenhuma obra encontrada" }),
  ).toBeVisible();
});
test("busca descarta respostas obsoletas", async ({ page }) => {
  await scenario(page, "out-of-order");
  const search = await catalogSearch(page);
  await search.fill("S");
  await search.fill("Emerald");
  await expect(page.locator(".nft-card")).toHaveCount(4);
  await expect(page.locator(".nft-card h3")).toHaveText([
    "Emerald Ape #042",
    "Emerald Ape #246",
    "Emerald Ape #314",
    "Emerald Ape #382",
  ]);
  await expect(page).toHaveURL(/q=Emerald/);
});
test("teclado, foco de diálogo e sem overflow", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /SEJA DONO/ })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Pular para o conteúdo" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  const trigger = page.getByRole("button", { name: "Laboratório de cenários" });
  await trigger.click();
  await expect(page.getByLabel("Cenário", { exact: true })).toBeFocused();
  for (let i = 0; i < 18; i++) await page.keyboard.press("Tab");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
