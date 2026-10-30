import { test, expect } from "@playwright/test";
import { reset, catalogSearch } from "./helpers";

test("home and legacy default URLs normalize without empty parameters", async ({
  page,
}) => {
  await reset(page);
  await expect(page).toHaveURL(/\/$/);
  await page.goto(
    "/?q=&category=&network=&sort=featured&page=1&min=&max=&returnTo=&next=%2F",
  );
  await expect(page.getByRole("heading", { name: /SEJA DONO/ })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/demo?next=%2Fcheckout&returnTo=%2Fcheckout");
  await expect(
    page.getByRole("heading", { name: "Conheça a Kurio em dois minutos." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/demo$/);
});

test("active filters remain shareable across refresh, pagination and history", async ({
  page,
}) => {
  await reset(page);
  await page
    .getByRole("navigation", { name: "Paginação", exact: true })
    .getByRole("button", { name: "2", exact: true })
    .click();
  await expect(page).toHaveURL(/\/?page=2$/);
  await (await catalogSearch(page)).fill("Emerald");
  await expect(page).toHaveURL(/\/?q=Emerald$/);
  await expect(page.locator(".nft-card")).toHaveCount(4);
  await page.reload();
  await expect(await catalogSearch(page)).toHaveValue("Emerald");
  await page.goBack();
  await expect(page).toHaveURL(/\/?page=2$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/?q=Emerald$/);
  await page.goto(
    "/?category=Arte%20digital&network=Ethereum&sort=price-asc&min=0.5&max=2&q=Emerald",
  );
  await expect(page.locator(".nft-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".nft-card")).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get("sort")).toBe("price-asc");
});

test("favorite login keeps catalog context and clears flow parameters after success", async ({
  page,
}) => {
  await reset(page);
  await page.goto("/?q=Emerald#catalogo");
  await page
    .locator(".nft-card")
    .first()
    .getByRole("link", { name: /Adicionar aos favoritos/ })
    .click();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("next")).toBe(
    "/?q=Emerald#catalogo",
  );
  await page.getByLabel("E-mail", { exact: true }).fill("thiago@demo.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/?q=Emerald#catalogo$/);
  await expect(page.locator(".nft-card")).toHaveCount(4);
});

test("wallet return survives protected login and stays out of other routes", async ({
  page,
}) => {
  await reset(page);
  await page.goto("/wallets?returnTo=%2Fcheckout");
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("next")).toBe(
    "/wallets?returnTo=%2Fcheckout",
  );
  expect(new URL(page.url()).searchParams.has("returnTo")).toBe(false);
  await page.getByLabel("E-mail", { exact: true }).fill("thiago@demo.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/wallets\?returnTo=%2Fcheckout$/);
  await expect(
    page.getByRole("link", { name: "Voltar para pagamento →" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Conta", exact: true })
    .getByRole("link", { name: "Dados do perfil" })
    .click();
  await expect(page).toHaveURL(/\/profile$/);
});

test("unsafe and recursive destinations are rejected or reduced to internal context", async ({
  page,
}) => {
  await reset(page);
  for (const next of [
    "//example.com",
    "/\\example.com",
    "/%5cexample.com",
    "/login?next=/checkout",
    "/LOGIN",
    "/register//",
    "/a/..//example.com",
    "/%2e%2e//example.com",
    "javascript:alert(1)",
  ]) {
    await page.goto("/login?next=" + encodeURIComponent(next));
    await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.has("next"), next).toBe(false);
  }
  await page.goto(
    "/login?next=" +
      encodeURIComponent(
        "/?q=Emerald&page=1&next=/checkout&returnTo=/checkout",
      ),
  );
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("next")).toBe("/?q=Emerald");
});

test("login dismissal restores the public detail without nesting next", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "desktop");
  await reset(page);
  await page.goto("/nft/nft-1");
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Entrar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("next")).toBe("/nft/nft-1");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page).toHaveURL(/\/nft\/nft-1$/);
});
