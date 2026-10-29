import { test, expect } from "@playwright/test";
import { reset, login, add, assertAuthenticated } from "./helpers";
test.beforeEach(async ({ page }) => reset(page));

test("nomes: números bloqueados, acentos e apóstrofo aceitos, erros associados e foco", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel(/^Nome(?: de exibição)?$/).fill("Ana123");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@demo.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo123!");
  await page
    .getByLabel("Confirmar senha", { exact: true })
    .fill("Diferente123");
  await page.getByRole("button", { name: "Criar conta fictícia" }).click();
  const name = page.getByLabel(/^Nome(?: de exibição)?$/);
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#name-error")).toContainText(
    "Números não são permitidos",
  );
  await expect(page.locator("#confirmPassword-error")).toHaveText(
    "As senhas não conferem.",
  );
  await name.fill("Ana D’Ávila");
  await page.getByLabel("Confirmar senha", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Criar conta fictícia" }).click();
  await assertAuthenticated(page);
});

test("quantidade: rascunho vazio, decimais e estoque; aviso separado dos botões", async ({
  page,
}) => {
  await page.goto("/nft/nft-1");
  const input = page.getByLabel("Quantidade", { exact: true });
  const buy = page.getByRole("button", { name: /^(COMPRAR|Comprar NFT)$/ });
  await input.fill("");
  await expect(input).toHaveValue("");
  await expect(buy).toBeDisabled();
  for (const invalid of ["0", "9"]) {
    await input.fill(invalid);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(buy).toBeDisabled();
  }
  await input.fill("2");
  for (const rejected of ["-1", "1.5", "1e2", "abc", "2abc"]) {
    await input.fill(rejected);
    await expect(input).toHaveValue("2");
    await expect(buy).toBeEnabled();
  }
  await expect(buy).toBeEnabled();
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  const notice = page
    .getByRole("status")
    .filter({ hasText: "Adicionado ao carrinho" });
  await expect(notice).toBeVisible();
  const gap = await page.locator(".nft-purchase").evaluate((panel) => {
    const notice = panel.querySelector(".success")!.getBoundingClientRect();
    const actions = panel
      .querySelector(".nft-actions")!
      .getBoundingClientRect();
    return notice.top - actions.bottom;
  });
  expect(gap).toBeGreaterThanOrEqual(20);
  await page.goto("/cart");
  await expect(page.getByTestId("quote-total")).toHaveText("2.383 ETH");
});

test("carrinho: campo vazio não altera o pedido; quantidade válida confirma ao sair", async ({
  page,
}) => {
  await add(page);
  await page.goto("/cart");
  const input = page.getByLabel("Quantidade de Emerald Ape #042", {
    exact: true,
  });
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  let changes = 0;
  page.on("request", (request) => {
    if (request.method() === "PUT" && request.url().includes("/api/cart"))
      changes++;
  });
  await input.fill("");
  await input.blur();
  await expect(input).toHaveValue("");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  expect(changes).toBe(0);
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  await input.fill("2");
  await input.blur();
  await expect(page.getByTestId("quote-total")).toHaveText("2.383 ETH");
  await page.reload();
  await expect(input).toHaveValue("2");
});

test("checkout: endereço abreviado, nome válido e rede compatível antes da revisão", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await page.goto("/checkout");
  await expect(page.getByLabel("Carteira cadastrada")).toContainText(
    "0x111…11111",
  );
  if ((page.viewportSize()?.width || 0) <= 680)
    await page.locator(".collector-disclosure > summary").click();
  await page.getByLabel("Nome completo").fill("Alex432");
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Nome completo")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Nome completo").fill("Alex Demo");
  await page.getByLabel("Rede para pagamento").selectOption("Solana");
  await expect(
    page.getByRole("button", { name: "Confirmar compra" }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("mesma rede cadastrada");
  await page.getByLabel("Rede para pagamento").selectOption("Ethereum");
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("API aplica validações mesmo sem formulário: nome, e-mail e carteira por rede", async ({
  page,
}) => {
  await login(page);
  await add(page);
  const results = await page.evaluate(async () => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("kurio.session")}`,
    };
    const send = async (path: string, body: unknown, method = "POST") => {
      const response = await fetch(`/api${path}`, {
        method,
        headers,
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    const register = await send("/accounts", {
      name: "Ana123",
      email: "ana@demo.test",
      password: "Demo123!",
    });
    const profile = await send(
      "/profile",
      { name: "Alex123", email: "alex@demo.test" },
      "PATCH",
    );
    const wallet = await send("/wallets", {
      name: "Solana",
      network: "Solana",
      address: `0x${"2".repeat(40)}`,
    });
    const duplicate = await send("/wallets", {
      name: "Duplicada",
      network: "Ethereum",
      address: `0x${"1".repeat(40)}`,
    });
    const quote = (await send("/quote", {})).body;
    const wallets = await (await fetch("/api/wallets", { headers })).json();
    const key = crypto.randomUUID();
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": key },
      body: JSON.stringify({
        key,
        quoteId: quote.id,
        name: "Alex123",
        email: "alex@demo.test",
        walletId: wallets[0].id,
        network: "Ethereum",
      }),
    });
    const order = { status: response.status, body: await response.json() };
    return { register, profile, wallet, duplicate, order };
  });
  for (const key of ["register", "profile", "order"] as const) {
    expect(results[key].status).toBe(422);
    expect(results[key].body.fields.name).toContain("Números");
  }
  expect(results.wallet.status).toBe(422);
  expect(results.wallet.body.fields.address).toContain("rede");
  expect(results.duplicate.status).toBe(409);
});

test("slider: dois controles, teclado, URL e persistência após refresh", async ({
  page,
}) => {
  if (
    await page.getByRole("button", { name: "Filtros", exact: true }).isVisible()
  ) {
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  }
  const scope = (await page.getByRole("dialog").isVisible())
    ? page.getByRole("dialog")
    : page.getByRole("complementary", { name: "Filtros do catálogo" });
  const min = scope.getByRole("slider", { name: "Preço mínimo em ETH" }),
    max = scope.getByRole("slider", { name: "Preço máximo em ETH" });
  await min.focus();
  await min.press("Home");
  await min.press("ArrowRight");
  await expect(min).toHaveAttribute("aria-valuetext", "0.01 ETH");
  await max.focus();
  await max.press("End");
  await max.press("ArrowLeft");
  await expect(max).toHaveAttribute("aria-valuetext", "12.49 ETH");
  await scope.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page).toHaveURL(
    (url) => JSON.parse(url.searchParams.get("min") || "null") === "0.01",
  );
  await expect(page).toHaveURL(
    (url) => JSON.parse(url.searchParams.get("max") || "null") === "12.49",
  );
  if (await page.getByRole("dialog").isVisible())
    await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("heading", { name: /SEJA DONO/ })).toBeVisible();
  if (
    await page.getByRole("button", { name: "Filtros", exact: true }).isVisible()
  ) {
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  }
  await expect(min).toHaveAttribute("aria-valuetext", "0.01 ETH");
  await expect(max).toHaveAttribute("aria-valuetext", "12.49 ETH");
  await expect(page.getByText("AO VIVO", { exact: true })).toHaveCount(0);
});
