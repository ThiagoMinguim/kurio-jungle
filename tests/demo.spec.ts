import { test, expect } from "@playwright/test";
import { add, reset, orderCount } from "./helpers";

test("demo entry uses normal login and preserves guest cart without creating orders", async ({
  page,
}) => {
  await reset(page);
  await add(page);
  await page.goto("/demo");
  await page
    .getByRole("button", { name: "Entrar na conta de exemplo" })
    .click();
  await expect(page.getByRole("status")).toContainText("Conectado como Alex");
  expect(await orderCount(page)).toBe(0);
  await page.getByRole("link", { name: "Revisar carrinho" }).click();
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
});

test("demo reset requires explicit confirmation and can be cancelled", async ({
  page,
}) => {
  await reset(page);
  await add(page);
  await page.goto("/demo");
  await page.getByRole("button", { name: "Laboratório de cenários" }).click();
  await page
    .getByRole("button", { name: "Reset completo e aplicar cenário" })
    .click();
  await expect(page.getByRole("alert")).toContainText("apaga contas");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.goto("/cart");
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  await page.goto("/demo");
  await page.getByRole("button", { name: "Laboratório de cenários" }).click();
  await page
    .getByRole("button", { name: "Reset completo e aplicar cenário" })
    .click();
  await page
    .getByRole("button", { name: "Confirmar reset", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Conheça a Kurio em dois minutos." }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: /carrinho está vazio/i }),
  ).toBeVisible();
});

test("demo is reachable from login and fits small screens", async ({
  page,
}) => {
  await reset(page);
  await page.goto("/login");
  await page
    .getByRole("link", { name: "Testar com uma conta de exemplo" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Conheça a Kurio em dois minutos." }),
  ).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
});
