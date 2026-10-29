import { test, expect, type Page } from "@playwright/test";
import { reset, login, add, scenario, review, confirm } from "./helpers";
import type { Wallet, Order } from "../src/domain/types";

test.beforeEach(async ({ page }) => reset(page));

async function wallets(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/wallets", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("kurio.session")}`,
      },
    });
    return (await response.json()) as Wallet[];
  });
}

test("coração centralizado para visitante e autenticado; tooltip por teclado", async ({
  page,
}) => {
  for (const authenticated of [false, true]) {
    if (authenticated) await login(page);
    await page.goto("/");
    const heart = page.locator(".nft-card .favorite").first();
    await expect(heart).toBeVisible();
    const offset = await heart.evaluate((element) => {
      const button = element.getBoundingClientRect();
      const svg = element.querySelector("svg")!.getBoundingClientRect();
      return {
        x: svg.x + svg.width / 2 - button.x - button.width / 2,
        y: svg.y + svg.height / 2 - button.y - button.height / 2,
      };
    });
    expect(Math.abs(offset.x)).toBeLessThan(1);
    expect(Math.abs(offset.y)).toBeLessThan(1);
    await heart.focus();
    await expect(page.getByRole("tooltip")).toHaveText(
      "Adicionar aos favoritos",
    );
    await heart.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    if (!authenticated) {
      await heart.click();
      await expect(page).toHaveURL(/\/login/);
    }
  }
});

test("avatar tem prévia imediata, só persiste ao salvar", async ({ page }) => {
  await login(page);
  await page.goto("/profile");
  const avatar = page.getByRole("img", { name: "Prévia do avatar" });
  await expect(avatar).toHaveAttribute("src", "/art/emerald.webp");
  const changes: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/profile") && request.method() === "PATCH")
      changes.push(request.url());
  });
  await page
    .getByLabel("Avatar", { exact: true })
    .selectOption("/art/ivory.webp");
  await expect(avatar).toHaveAttribute("src", "/art/ivory.webp");
  expect(changes).toHaveLength(0);
  await page.reload();
  await expect(avatar).toHaveAttribute("src", "/art/emerald.webp");
  await page
    .getByLabel("Avatar", { exact: true })
    .selectOption("/art/sage.webp");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toContainText("Perfil atualizado");
  expect(changes).toHaveLength(1);
  await page.reload();
  await expect(avatar).toHaveAttribute("src", "/art/sage.webp");
});

test("carteiras: endereço completo, cópia com feedback e navegação com contexto", async ({
  page,
}) => {
  await login(page);
  await page.goto("/wallets");
  await expect(
    page.getByRole("link", { name: "Voltar para pagamento →" }),
  ).toHaveCount(0);
  await expect(page.locator(".wallet-address")).toHaveText(
    `0x${"1".repeat(40)}`,
  );
  await expect(page.locator(".wallet-card details")).toHaveCount(0);
  await page.locator("main").screenshot({
    path: `reports/wallets-${page.viewportSize()!.width < 600 ? "mobile" : "desktop"}.png`,
  });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) =>
          sessionStorage.setItem("test-copied", value),
      },
    });
  });
  const copy = page.getByRole("button", {
    name: "Copiar endereço de Carteira principal",
  });
  await copy.focus();
  await expect(page.getByRole("tooltip")).toHaveText(
    "Copiar endereço de Carteira principal",
  );
  await copy.click();
  await expect(page.getByRole("status")).toHaveText("Endereço copiado.");
  expect(await page.evaluate(() => sessionStorage.getItem("test-copied"))).toBe(
    `0x${"1".repeat(40)}`,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard denied");
        },
      },
    }),
  );
  await copy.click();
  await expect(page.getByRole("status")).toContainText(
    "Selecione o endereço para copiar",
  );
  await add(page);
  await page.goto("/checkout");
  await page
    .getByRole("link", { name: /Trocar carteira|Usar outra carteira/ })
    .click();
  await expect(
    page.getByRole("link", { name: "Voltar para pagamento →" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Voltar para pagamento →" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Conta", exact: true })
    .getByRole("link", { name: "Dados pessoais" })
    .click();
  await page
    .getByRole("navigation", { name: "Conta", exact: true })
    .getByRole("link", { name: "Carteiras", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Voltar para pagamento →" }),
  ).toHaveCount(0);
});

test("exclusão: cancelar, erro recuperável, promoção da principal e exclusão da última", async ({
  page,
}) => {
  await login(page);
  await page.goto("/wallets");
  await page.getByLabel("Nome da carteira").fill("Reserva");
  await page.getByLabel("Endereço fictício").fill(`0x${"3".repeat(40)}`);
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.locator(".wallet-card")).toHaveCount(2);
  const trigger = page.getByRole("button", {
    name: "Excluir Carteira principal",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("restante será definida como principal");
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(await wallets(page)).toHaveLength(2);
  await scenario(page, "validation");
  await trigger.click();
  await dialog
    .getByRole("button", { name: "Excluir carteira", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Não foi possível excluir",
  );
  expect(await wallets(page)).toHaveLength(2);
  await scenario(page, "success");
  await dialog
    .getByRole("button", { name: "Excluir carteira", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Minhas carteiras." }),
  ).toBeFocused();
  expect(
    (await wallets(page)).map((w) => ({ name: w.name, primary: w.primary })),
  ).toEqual([{ name: "Reserva", primary: true }]);
  await page
    .getByRole("button", { name: "Excluir Reserva", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Excluir carteira", exact: true })
    .click();
  await expect(page.locator(".wallet-card")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Adicionar carteira" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Adicionar carteira" }),
  ).toBeVisible();
  expect(await wallets(page)).toHaveLength(0);
  await add(page);
  await page.goto("/checkout");
  await expect(
    page.getByRole("button", { name: "Confirmar compra" }),
  ).toBeDisabled();
});

test("API de exclusão isola contas e preserva a carteira no recibo confirmado", async ({
  page,
}) => {
  await login(page);
  const wallet = (await wallets(page))[0];
  await add(page);
  await review(page);
  await confirm(page);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "bia@demo.test");
  const forbidden = await page.evaluate(
    async (id) =>
      (
        await fetch(`/api/wallets/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("kurio.session")}`,
          },
        })
      ).status,
    wallet.id,
  );
  expect(forbidden).toBe(404);
  expect(await wallets(page)).toHaveLength(1);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page);
  const result = await page.evaluate(async (id) => {
    const headers = {
      Authorization: `Bearer ${localStorage.getItem("kurio.session")}`,
    };
    const deletion = await fetch(`/api/wallets/${id}`, {
      method: "DELETE",
      headers,
    });
    const orders = (await (
      await fetch("/api/orders", { headers })
    ).json()) as Order[];
    return {
      status: deletion.status,
      receipt: orders[0].wallet,
      orderStatus: orders[0].status,
    };
  }, wallet.id);
  expect(result.status).toBe(200);
  expect(result.orderStatus).toBe("confirmed");
  expect(result.receipt).toEqual(wallet);
  expect(await wallets(page)).toHaveLength(0);
});

test("edição mantém tamanho e alinhamento com erro na quantidade ou estoque esgotado", async ({
  page,
}) => {
  await page.goto("/nft/nft-1");
  const select = page.getByRole("radiogroup", { name: "Edição", exact: true });
  const quantity = page.getByLabel("Quantidade", { exact: true });
  await expect(select).toBeVisible();
  const bounds = () =>
    select.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        y: box.y + window.scrollY,
      };
    });
  const original = await bounds();
  await quantity.fill("9");
  await expect(quantity).toHaveAttribute("aria-invalid", "true");
  const withError = await bounds();
  for (const key of ["width", "height", "y"] as const)
    expect(Math.abs(original[key] - withError[key])).toBeLessThan(1);
  await page.getByRole("radio", { name: /1\/10:/ }).click();
  const soldOut = await bounds();
  for (const key of ["width", "height", "y"] as const)
    expect(Math.abs(original[key] - soldOut[key])).toBeLessThan(1);
  expect(soldOut.height).toBeGreaterThanOrEqual(26);
  await expect(quantity).toBeDisabled();
  await expect(quantity).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(".availability-note")).toHaveText(
    "Esta edição está esgotada. Escolha outra edição.",
  );
  await page.getByRole("radio", { name: /1\/50:/ }).click();
  await expect(quantity).toHaveValue("1");
  await expect(quantity).toBeEnabled();
});

test("cupom inválido preserva itens, valores e último desconto confirmado", async ({
  page,
}) => {
  await add(page);
  await page.goto("/cart");
  const coupon = page.getByLabel("Cupom de desconto"),
    total = page.getByTestId("quote-total");
  await expect(total).toHaveText("1.193 ETH");
  for (const code of ["INVALID", "EXPIRED"]) {
    await coupon.fill(code);
    await page.getByRole("button", { name: "Aplicar cupom" }).click();
    await expect(coupon).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#coupon-error")).toContainText(
      code === "EXPIRED" ? "expirado" : "inválido",
    );
    await expect(total).toHaveText("1.193 ETH");
    await expect(page.locator(".cart-line")).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: "Ir para pagamento" }),
    ).toBeVisible();
  }
  await coupon.fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(total).toHaveText("1.074 ETH");
  await coupon.fill("INVALID");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(page.locator("#coupon-error")).toContainText("inválido");
  await expect(total).toHaveText("1.074 ETH");
  await expect(page.locator(".summary-lines")).toContainText(
    "Desconto (KURIO10)",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("kurio.coupon.guest")),
  ).toBe("KURIO10");
  await page.reload();
  await expect(total).toHaveText("1.074 ETH");
  await expect(coupon).toHaveValue("KURIO10");
});

test("cupom inválido legado é recuperado; quantidades rejeitam letras e continuam apagáveis", async ({
  page,
}) => {
  await add(page);
  await page.evaluate(() =>
    localStorage.setItem("kurio.coupon.guest", "INVALID"),
  );
  await page.goto("/cart");
  await expect(page.locator("#coupon-error")).toContainText("inválido");
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  expect(
    await page.evaluate(() => localStorage.getItem("kurio.coupon.guest")),
  ).toBeNull();
  const input = page.getByLabel("Quantidade de Emerald Ape #042");
  await input.fill("2");
  await input.pressSequentially("abc.e-+");
  await expect(input).toHaveValue("2");
  await input.fill("6fff");
  await expect(input).toHaveValue("2");
  await input.fill("");
  await input.blur();
  await expect(input).toHaveValue("");
  const error = page.locator("#qty-nft-1-original-error");
  await expect(error).toBeVisible();
  const bounds = (await error.boundingBox())!;
  expect(bounds.width).toBeGreaterThanOrEqual(120);
  expect(bounds.height).toBeLessThan(70);
  await expect(page.getByTestId("quote-total")).toHaveText("1.193 ETH");
  await input.fill("2");
  await input.blur();
  await expect(page.getByTestId("quote-total")).toHaveText("2.383 ETH");
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    page.viewportSize()!.width,
  );
});
