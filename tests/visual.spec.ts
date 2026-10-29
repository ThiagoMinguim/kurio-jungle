import { test, expect } from "@playwright/test";
import { add, login, reset } from "./helpers";
test.beforeEach(async ({ page }) => {
  await reset(page);
});
test("visual início, detalhe, carrinho e pagamento", async ({ page }) => {
  await expect(page.locator("main")).toHaveAttribute(
    "data-connection-state",
    "connected",
  );
  await expect(page.locator(".nft-card")).toHaveCount(9);
  if ((page.viewportSize()?.width || 0) > 960)
    await expect(
      page.getByRole("slider", { name: "Preço mínimo em ETH" }),
    ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("inicio.png", {
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/nft/nft-1");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute(
    "data-connection-state",
    "connected",
  );
  await expect(page).toHaveScreenshot("detalhe.png", {
    fullPage: true,
    animations: "disabled",
  });
  await add(page);
  await page.goto("/cart");
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  await expect(page).toHaveScreenshot("carrinho.png", {
    fullPage: true,
    animations: "disabled",
  });
  await login(page);
  await page.goto("/checkout");
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  await expect(page.getByLabel("Carteira cadastrada")).toBeVisible();
  await expect(page).toHaveScreenshot("pagamento.png", {
    fullPage: true,
    animations: "disabled",
  });
});
