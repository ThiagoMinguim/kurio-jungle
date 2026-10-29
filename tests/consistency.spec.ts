import { test, expect } from "@playwright/test";
import { toWei, fromWei } from "../src/domain/money";
import {
  action,
  add,
  confirm,
  login,
  orderCount,
  reset,
  review,
  scenario,
} from "./helpers";
test.beforeEach(async ({ page }) => {
  await reset(page);
});
test("aritmética monetária preserva 18 casas e rejeita entradas ambíguas", () => {
  expect(fromWei(toWei("0.1") + toWei("0.2"))).toBe("0.3");
  expect(fromWei(toWei("1.000000000000000001") * 3n)).toBe(
    "3.000000000000000003",
  );
  expect(() => toWei("1e-8")).toThrow();
  expect(() => toWei("0.0000000000000000001")).toThrow();
  expect(() => toWei("-1")).toThrow();
});
test("estoque em tempo real impede compra sem criar pedido", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await review(page);
  await expect(page.locator("main")).toHaveAttribute(
    "data-connection-state",
    "connected",
  );
  await action(page, "stock");
  await confirm(page);
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Quantidade indisponível",
  );
  expect(await orderCount(page)).toBe(0);
});
test("carteira recusada e desconectada permitem recuperação deliberada", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await review(page);
  await scenario(page, "wallet-refused");
  await confirm(page);
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "recusada",
  );
  expect(await orderCount(page)).toBe(0);
  await scenario(page, "wallet-disconnected");
  await confirm(page);
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "desconectada",
  );
  await scenario(page, "success");
  await confirm(page);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
});
test("pedido alheio e carrinho privado não aparecem em outra conta", async ({
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
  const orderUrl = page.url();
  await add(page, "nft-2");
  await page.goto("/");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "bia@demo.test");
  await page.goto(orderUrl);
  await expect(page.getByRole("alert")).toContainText("Pedido não encontrado");
  await expect(
    page.getByRole("heading", { name: "Recibo confirmado" }),
  ).toHaveCount(0);
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("confirmação remove só a quantidade comprada e refresh mantém pendência", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await scenario(page, "pending");
  await review(page);
  await confirm(page);
  await expect(
    page.getByRole("heading", { name: "Seu pedido está em processamento." }),
  ).toBeVisible();
  const url = page.url();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Seu pedido está em processamento." }),
  ).toBeVisible();
  expect(await orderCount(page)).toBe(1);
  await add(page);
  await action(page, "settle");
  await page.goto(url);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByLabel("Quantidade de Emerald Ape #042")).toHaveValue(
    "1",
  );
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
});
test("falha de conexão e validação de perfil exibem recuperação", async ({
  page,
}) => {
  await scenario(page, "offline");
  await page.goto("/nft/nft-1");
  await expect(page.getByRole("alert")).toContainText("Sem conexão");
  await scenario(page, "success");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await login(page);
  await page.goto("/profile");
  await scenario(page, "validation");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("alert")).toContainText("cenário de validação");
  await expect(page.getByLabel("Nome", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await scenario(page, "success");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toContainText("Perfil atualizado");
});
