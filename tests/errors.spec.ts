import { test, expect } from "@playwright/test";
import { reset, add, catalogSearch } from "./helpers";
test.beforeEach(async ({ page }) => reset(page));

test("página inexistente tem identidade visual, foco e retorno ao catálogo", async ({
  page,
}) => {
  await page.goto("/pagina-inexistente");
  await expect(
    page.getByRole("heading", { name: "Esse caminho não existe." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Esse caminho não existe." }),
  ).toBeFocused();
  await expect(page.getByText("PÁGINA NÃO ENCONTRADA · 404")).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar ao início", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: /SEJA DONO/ })).toBeVisible();
});

test("falha inesperada recebe tela amigável, esconde detalhes e permite recarregar sem perder carrinho", async ({
  page,
}) => {
  await add(page);
  await page.goto("/");
  await expect(page.locator(".nft-card")).toHaveCount(9);
  // Inject only a DOM-rendering fault, without affecting arrays used by the API mocks.
  await page.evaluate(() => {
    const original = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name: string, value: string) {
      if (name === "aria-label" && value === "Ver Golden Beat #229")
        throw new Error("INTERNAL_RENDER_FAILURE");
      return original.call(this, name, value);
    };
  });
  await (await catalogSearch(page)).fill("Golden");
  await expect(
    page.getByRole("heading", { name: "Esta página não carregou." }),
  ).toBeVisible();
  await expect(
    page.getByText("Something went wrong!", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("INTERNAL_RENDER_FAILURE", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tentar novamente", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `reports/error-page-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: /SEJA DONO/ })).toBeVisible();
  await expect(page.locator(".nft-card")).toHaveCount(7);
  await page.goto("/cart");
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
});

test("resposta NFT sem edições vira erro de contrato, preserva dados e não quebra a interface", async ({
  page,
}) => {
  await page.evaluate(() => {
    const key = "kurio.mock.database.v1",
      database = JSON.parse(localStorage.getItem(key)!);
    delete database.nfts[0].editions;
    localStorage.setItem(key, JSON.stringify(database));
  });
  await page.reload();
  await expect(
    page.getByRole("alert").filter({ hasText: "a resposta veio incompleta" }),
  ).toHaveCount(2);
  await expect(page.getByRole("heading", { name: /SEJA DONO/ })).toBeVisible();
  await expect(
    page.getByText("Something went wrong!", { exact: true }),
  ).toHaveCount(0);
  const editionsStillAbsent = await page.evaluate(
    () =>
      !JSON.parse(localStorage.getItem("kurio.mock.database.v1")!).nfts[0]
        .editions,
  );
  expect(editionsStillAbsent).toBe(true);
});
