import { expect, type Page } from "@playwright/test";
export async function reset(page: Page, scenario = "success") {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /SEJA DONO/ })).toBeVisible();
  await page.evaluate(async (scenario) => {
    const result = await fetch("/api/debug/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
    if (!result.ok) throw new Error("reset failed");
    for (const key of Object.keys(localStorage))
      if (key.startsWith("kurio.") && !key.startsWith("kurio.mock."))
        localStorage.removeItem(key);
  }, scenario);
  await page.reload();
  await expect(page.getByRole("heading", { name: /SEJA DONO/ })).toBeVisible();
}
export async function scenario(page: Page, scenario: string) {
  await expect(page.locator("main")).toBeVisible();
  await page.evaluate(async (scenario) => {
    const response = await fetch("/api/debug/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
    if (!response.ok || !(await response.json()).ok)
      throw new Error("Scenario activation failed");
  }, scenario);
}
export async function action(page: Page, action: string, nftId = "nft-1") {
  await expect(page.locator("main")).toBeVisible();
  await page.evaluate(
    async (payload) => {
      const response = await fetch("/api/debug/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok || !(await response.json()).ok)
        throw new Error("Scenario action failed");
    },
    { action, nftId },
  );
}
export async function login(
  page: Page,
  email = "alex@demo.test",
  password = "Demo123!",
) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sair", exact: true }),
  ).toBeVisible();
}
export async function add(page: Page, nft = "nft-1") {
  await page.goto(`/nft/${nft}`);
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Adicionado ao carrinho" }),
  ).toBeVisible();
}
export async function review(page: Page) {
  await page.goto("/checkout");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
export async function confirm(page: Page) {
  await page
    .getByRole("button", { name: "Confirmar compra simulada", exact: true })
    .click();
}
export async function orderCount(page: Page) {
  return page.evaluate(async () => {
    const token = localStorage.getItem("kurio.session");
    const response = await fetch("/api/orders", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await response.json()).length as number;
  });
}
