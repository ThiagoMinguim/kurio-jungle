import { test, expect } from "@playwright/test";
import { add, confirm, review, login, reset } from "./helpers";

test("account destinations, offer cancellation, download and local help work", async ({
  page,
}) => {
  await reset(page);
  await login(page);
  await page.goto("/profile");
  await page
    .getByRole("navigation", { name: "Conta", exact: true })
    .getByRole("link", { name: "Atividade", exact: true })
    .click();
  await expect(
    page.getByText("Você ainda não fez pedidos nesta conta.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Conta", exact: true })
    .getByRole("link", { name: "Ofertas", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelar oferta" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Oferta de exemplo cancelada",
  );
  await page.getByRole("button", { name: "Restaurar exemplo" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Aguardando resposta do criador",
  );
  await page
    .getByRole("navigation", { name: "Conta", exact: true })
    .getByRole("link", { name: "Arquivos baixados" })
    .click();
  const file = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar exemplo" }).click();
  expect((await file).suggestedFilename()).toBe("kurio-exemplo.txt");
  await page
    .getByRole("navigation", { name: "Conta", exact: true })
    .getByRole("link", { name: "Suporte" })
    .click();
  await page
    .getByText("Preciso de uma carteira real?", { exact: true })
    .click();
  await expect(
    page.getByText("Não. Cadastre um endereço fictício", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Como podemos ajudar?", { exact: true })
    .fill("Minha dúvida de demonstração");
  await page.getByRole("button", { name: "Simular atendimento" }).click();
  await expect(page.getByRole("status")).toContainText(
    "não foi enviada nem armazenada",
  );
});

test("search does not overlap navigation and login preserves catalog position", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "desktop");
  await reset(page);
  for (const width of [768, 1024, 1200, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole("button", { name: "Abrir busca" }).click();
    const field = await page
      .getByLabel("Buscar NFTs", { exact: true })
      .boundingBox();
    const header = await page.locator(".site-header").boundingBox();
    expect(field!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    await page.keyboard.press("Escape");
  }
  const before = await page.locator("#catalogo").boundingBox();
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Entrar" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const after = await page.locator("#catalogo").boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
});

test("account and commerce layouts fit narrow phones and tablet", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "desktop");
  test.setTimeout(90000);
  await reset(page);
  await login(page);
  for (const width of [320, 375, 414, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [
      "/",
      "/nft/nft-1",
      "/cart",
      "/profile",
      "/wallets",
      "/activity",
      "/offers",
      "/downloads",
      "/support",
    ]) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator(".skeleton")).toHaveCount(0);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      expect(overflow, `${route} at ${width}`).toBeLessThanOrEqual(1);
    }
  }
});

test("confirmed orders appear in activity and produce a receipt download", async ({
  page,
}) => {
  await reset(page);
  await login(page);
  await add(page);
  await review(page);
  await confirm(page);
  await expect(page).toHaveURL(/\/order\//);
  await page.goto("/activity");
  await expect(page.locator(".account-order-list")).toContainText(
    "Emerald Ape #042",
  );
  await expect(page.locator(".account-order-list")).toContainText("Confirmado");
  await page.goto("/downloads");
  const file = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Baixar recibo", exact: true })
    .click();
  expect((await file).suggestedFilename()).toMatch(/^kurio-recibo-.+\.txt$/);
});
