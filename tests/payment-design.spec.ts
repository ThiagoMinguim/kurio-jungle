import { expect, test, type Page } from "@playwright/test";
import { add, confirm, login, reset } from "./helpers";

test.beforeEach(async ({ page }) => {
  await reset(page);
  await login(page);
});
async function collectorFields(page: Page) {
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeVisible();
  const disclosure = page.locator(".collector-disclosure");
  if (await disclosure.isVisible()) await disclosure.locator("summary").click();
}

test("Figma: pagamento desktop em colunas e mobile com carteiras, seleção e total", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  if (mobile) await page.setViewportSize({ width: 414, height: 896 });
  await page.evaluate(async () => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("kurio.session")}`,
    };
    for (const [nftId, quantity] of [
      ["nft-1", 2],
      ["nft-2", 3],
      ["nft-3", 3],
    ] as const) {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers,
        body: JSON.stringify({ nftId, editionId: "original", quantity }),
      });
      if (!response.ok) throw new Error("Fixture inválida");
    }
    const response = await fetch("/api/wallets", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Reserva",
        network: "Polygon",
        address: `0x${"3".repeat(40)}`,
        primary: false,
      }),
    });
    if (!response.ok) throw new Error("Carteira de fixture inválida");
  });
  await page.goto("/checkout");
  await expect(page.getByTestId("quote-total")).toHaveText("11.623 ETH");
  if (mobile) {
    await expect(
      page.getByRole("heading", { name: "Pagamento com carteira" }),
    ).toBeVisible();
    await expect(page.locator(".wallet-choice")).toHaveCount(2);
    await expect(page.locator(".provider-choice")).toHaveCount(3);
    await expect(page.locator(".site-header")).toBeHidden();
    const button = (await page
      .getByRole("button", { name: "Confirmar compra", exact: true })
      .boundingBox())!;
    expect(button.y + button.height).toBeLessThanOrEqual(865);
  } else {
    const form = (await page.locator(".collector-pane").boundingBox())!;
    const summary = (await page.locator(".payment-summary").boundingBox())!;
    expect(Math.abs(form.x - 120)).toBeLessThan(1);
    expect(Math.abs(summary.x - 915)).toBeLessThan(1);
    expect(Math.abs(form.y - summary.y)).toBeLessThan(1);
    await expect(page.locator(".nft-order-row")).toHaveCount(3);
  }
  await page.screenshot({
    path: `reports/payment-figma-${info.project.name}.png`,
    fullPage: true,
  });
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    page.viewportSize()!.width,
  );
});

test("revisão identifica cada dado e recibo conserva o snapshot completo", async ({
  page,
}, info) => {
  await add(page);
  await page.goto("/checkout");
  await collectorFields(page);
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Alex Colecionador");
  await page.getByLabel("Nome de usuário", { exact: true }).fill("alex_nfts");
  await page.getByLabel("Nome do perfil", { exact: true }).fill("Alex Arte");
  await page
    .getByLabel("ENS ou carteira secundária (opcional)", { exact: true })
    .fill("alex.eth");
  await page
    .getByLabel("Código de indicação (opcional)", { exact: true })
    .fill("AMIGO10");
  await page
    .getByLabel("Observação do colecionador (opcional)", { exact: true })
    .fill("Minha primeira obra.");
  await page.getByRole("radio", { name: "MetaMask", exact: true }).check();
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (const [label, value] of [
    ["Nome completo", "Alex Colecionador"],
    ["E-mail do recibo", "alex@demo.test"],
    ["Nome de usuário", "alex_nfts"],
    ["Nome do perfil", "Alex Arte"],
    ["Tipo de carteira", "MetaMask"],
    ["Carteira cadastrada", "Carteira principal"],
    ["Endereço da carteira", `0x${"1".repeat(40)}`],
    ["Rede para pagamento", "Ethereum"],
    ["Nome ENS", ".eth"],
    ["ENS ou carteira secundária", "alex.eth"],
    ["Código de indicação", "AMIGO10"],
    ["Observação do colecionador", "Minha primeira obra."],
  ]) {
    const row = dialog.locator(".review-data > div").filter({
      has: page.locator("dt").filter({ hasText: new RegExp(`^${label}$`) }),
    });
    await expect(row.locator("dd")).toHaveText(value);
  }
  await dialog.screenshot({
    path: `reports/review-labeled-${info.project.name}.png`,
  });
  await confirm(page);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await expect(page.locator(".order-metadata")).toContainText("MetaMask");
  await expect(page.locator(".site-header")).toHaveCount(0);
  await expect(page.locator(".order-confirmation")).toHaveScreenshot(
    "conclusao.png",
    {
      animations: "disabled",
      mask: [page.locator(".order-metadata > div:nth-child(-n+2) dd")],
    },
  );
  await page.screenshot({
    path: `reports/confirmation-figma-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Ver recibo", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".review-data")).toContainText(
    "Minha primeira obra.",
  );
  await expect(page.getByRole("dialog").locator(".review-data")).toContainText(
    "Alex Colecionador",
  );
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    page.viewportSize()!.width,
  );
});

test("valida novos campos antes da revisão e API rejeita conteúdo inválido", async ({
  page,
}) => {
  await add(page);
  await page.goto("/checkout");
  await collectorFields(page);
  await page
    .getByLabel("Nome de usuário", { exact: true })
    .fill("inválido espaço");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome de usuário", { exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Nome de usuário", { exact: true }).fill("alex_valid");
  await page.getByLabel("Nome do perfil", { exact: true }).fill("Alex123");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome do perfil", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  const response = await page.evaluate(async () => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("kurio.session")}`,
    };
    const quote = await (
      await fetch("/api/quote", { method: "POST", headers, body: "{}" })
    ).json();
    const wallets = await (await fetch("/api/wallets", { headers })).json();
    const key = crypto.randomUUID();
    const result = await fetch("/api/orders", {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": key },
      body: JSON.stringify({
        key,
        quoteId: quote.id,
        name: "Alex Demo",
        email: "alex@demo.test",
        walletId: wallets[0].id,
        network: "Ethereum",
        details: {
          username: "invalid space",
          profileName: "Alex123",
          ensSuffix: "bad",
          provider: "fake",
        },
      }),
    });
    return { status: result.status, body: await result.json() };
  });
  expect(response.status).toBe(422);
  expect(response.body.fields).toHaveProperty("username");
  expect(response.body.fields).toHaveProperty("provider");
});
