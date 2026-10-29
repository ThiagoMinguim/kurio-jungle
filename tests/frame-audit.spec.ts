import { test, expect } from "@playwright/test";
import { reset, login, add, logout } from "./helpers";
test.beforeEach(async ({ page }) => reset(page));

test("carrinho recupera edição removida sem tela global de erro", async ({
  page,
}) => {
  await add(page);
  await page.evaluate(() => {
    const key = "kurio.mock.database.v1";
    const database = JSON.parse(localStorage.getItem(key)!);
    database.nfts[0].editions = database.nfts[0].editions.filter(
      (edition: { id: string }) => edition.id !== "original",
    );
    localStorage.setItem(key, JSON.stringify(database));
  });
  await page.goto("/cart");
  await expect(
    page.getByText("Esta página não carregou.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Remover item indisponível" }).click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});

test("quantidade por botões respeita limites e mantém o rascunho apagável", async ({
  page,
}) => {
  await add(page);
  await page.goto("/cart");
  const input = page.getByRole("textbox", {
    name: "Quantidade de Emerald Ape #042",
    exact: true,
  });
  const less = page.getByRole("button", { name: /^Diminuir quantidade de/ });
  const more = page.getByRole("button", { name: /^Aumentar quantidade de/ });
  await expect(less).toBeDisabled();
  await more.click();
  await expect(page.getByTestId("quote-total")).toHaveText("2.383 ETH");
  await input.fill("8");
  await input.press("Tab");
  await expect(more).toBeDisabled();
  await input.fill("");
  await expect(input).toHaveValue("");
  await input.press("Tab");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await input.fill("3");
  await input.press("Tab");
  await expect(page.getByTestId("quote-total")).toHaveText("3.573 ETH");
});

test("perfil salva metadados e rejeita alteração parcial quando a senha atual está errada", async ({
  page,
}) => {
  await login(page);
  await page.goto("/profile");
  await page.getByLabel("Nome de usuário", { exact: true }).fill("alex.kurio");
  await page.getByLabel("Nome ENS", { exact: true }).fill("alex");
  await page.getByLabel("Apelido da carteira", { exact: true }).fill("Reserva");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toContainText("Perfil atualizado");
  await page.reload();
  await expect(page.getByLabel("Nome de usuário", { exact: true })).toHaveValue(
    "alex.kurio",
  );
  const result = await page.evaluate(async () => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("kurio.session")}`,
    };
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        name: "Outro Nome",
        email: "novo@demo.test",
        currentPassword: "Errada123!",
        newPassword: "Outra123!",
        confirmNewPassword: "Outra123!",
      }),
    });
    const current = await fetch("/api/profile", { headers }).then((r) =>
      r.json(),
    );
    return { status: response.status, current };
  });
  expect(result.status).toBe(422);
  expect(result.current.name).toBe("Alex Demo");
  expect(result.current.email).toBe("alex@demo.test");
  expect(result.current.username).toBe("alex.kurio");
  await logout(page);
  await login(page);
});

test("carteira valida metadados e tipo de principal no contrato da API", async ({
  page,
}) => {
  await login(page);
  const results = await page.evaluate(async () => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("kurio.session")}`,
    };
    const payload = {
      name: "Reserva",
      address: `0x${"2".repeat(40)}`,
      network: "Ethereum",
      primary: false,
      displayName: "Alex Demo",
      profileName: "Colecionador",
      email: "alex@demo.test",
      provider: "MetaMask",
      ensName: "reserva",
      ensSuffix: ".eth",
    };
    const invalid = await fetch("/api/wallets", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...payload, email: "invalido" }),
    });
    const wrongType = await fetch("/api/wallets", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...payload, primary: "false" }),
    });
    const valid = await fetch("/api/wallets", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return {
      invalid: invalid.status,
      wrongType: wrongType.status,
      valid: valid.status,
      wallets: await valid.json(),
    };
  });
  expect(results.invalid).toBe(422);
  expect(results.wrongType).toBe(422);
  expect(results.valid).toBe(200);
  expect(results.wallets).toHaveLength(2);
  expect(results.wallets[1]).toMatchObject({
    name: "Reserva",
    primary: false,
    ensName: "reserva",
    provider: "MetaMask",
  });
});

test("rotas principais não provocam rolagem horizontal nas quatro larguras", async ({
  page,
}) => {
  await login(page);
  await add(page);
  for (const width of [390, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 896 });
    for (const path of [
      "/",
      "/nft/nft-1",
      "/cart",
      "/checkout",
      "/profile",
      "/wallets",
    ]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator(".skeleton")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} em ${width}px`,
      ).toBe(true);
    }
  }
});

test("acesso permite revelar senha e informa limites das integrações ilustrativas", async ({
  page,
}) => {
  await page.goto("/login");
  const password = page.getByLabel("Senha", { exact: true });
  await password.fill("Demo123!");
  await page
    .getByRole("button", { name: "Mostrar senha", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Ocultar senha", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.getByRole("button", { name: "Continuar com Google" }).click();
    await expect(page.getByRole("dialog").last()).toContainText(
      /simulad|demonstra|OAuth/,
    );
    await page.keyboard.press("Escape");
    await expect(password).toBeVisible();
    await expect(password).toHaveValue("Demo123!");
    await expect(
      page.getByRole("button", { name: "Continuar com Google" }),
    ).toBeFocused();
    await expect(page).toHaveURL(/\/login/);
  }
});

test("destaques têm alvos de toque suficientes e navegam por NFTs reais", async ({
  page,
}) => {
  const first = page.getByRole("button", { name: "Destaque 1", exact: true });
  const second = page.getByRole("button", { name: "Destaque 2", exact: true });
  const bounds = await first.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(24);
  expect(bounds!.height).toBeGreaterThanOrEqual(24);
  await second.click();
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".hero-art")).toHaveAttribute(
    "href",
    /\/nft\/nft-2/,
  );
  await expect(page.locator(".hero-art img")).toHaveAttribute(
    "src",
    "/art/sage.webp",
  );
});
