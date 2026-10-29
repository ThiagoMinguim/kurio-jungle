// Capture isolated demonstration states at the source Figma widths. Run after npm run build.
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const root = process.cwd();
const { chromium, expect } = await import(
  pathToFileURL(root + "/node_modules/@playwright/test/index.mjs")
);
const { reset, login } = await import(
  pathToFileURL(root + "/tests/helpers.ts")
);
const browser = await chromium.launch();
const manifest = [];
const destination = process.env.FRAME_OUTPUT || "reports/figma-audit";
async function shot(page, group, name) {
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = "eager";
    await Promise.all(
      [...document.images].map((image) => image.decode().catch(() => {})),
    );
    await document.fonts.ready;
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${destination}/${group}/${name}.png`,
    fullPage: group === "Desktop",
  });
  manifest.push({
    group,
    name,
    url: page.url(),
    bounds: await page.evaluate(() => ({
      width: innerWidth,
      height: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth > innerWidth,
    })),
    metrics: await page.evaluate(() =>
      Object.fromEntries(
        [
          ".site-header",
          ".hero",
          ".catalog-section",
          ".nft-grid",
          ".account-grid",
          ".account-content",
          ".auth-card",
          ".cart-body",
          ".cart-summary",
          ".commerce-footer",
          ".payment-desktop",
          ".nft-focus-grid",
        ].map((selector) => {
          const element = document.querySelector(selector);
          if (!element) return [selector, null];
          const box = element.getBoundingClientRect();
          return [
            selector,
            {
              x: box.x,
              y: box.y + scrollY,
              width: box.width,
              height: box.height,
            },
          ];
        }),
      ),
    ),
  });
}
for (const group of ["Desktop", "Mobile"]) {
  await mkdir(`${destination}/${group}`, { recursive: true });
  const mobile = group === "Mobile";
  const ctx = await browser.newContext({
    baseURL: process.env.FRAME_BASE_URL || "http://127.0.0.1:4173",
    viewport: { width: mobile ? 414 : 1440, height: mobile ? 896 : 1000 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));
  await reset(page);
  await expect(page.locator(".nft-card")).toHaveCount(9);
  await shot(page, group, "Início");
  for (const [route, name] of [
    ["/login", "Login"],
    ["/register", "Cadastro"],
    ["/nft/nft-1", "Detalhes do NFT"],
  ]) {
    await page.goto(route);
    if (route.includes("nft")) {
      await expect(
        page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
      ).toBeVisible();
      if (!mobile)
        await expect(page.locator(".nft-related-grid>a")).toHaveCount(5);
    } else {
      await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
      if (!mobile) await expect(page.locator(".nft-card")).toHaveCount(9);
    }
    await shot(page, group, name);
  }
  const items = mobile
    ? [
        ["nft-1", 1],
        ["nft-5", 1],
        ["nft-6", 2],
        ["nft-7", 2],
      ]
    : [
        ["nft-1", 2],
        ["nft-5", 6],
        ["nft-6", 9],
      ];
  for (const [id, quantity] of items) {
    await page.goto(`/nft/${id}`);
    await page.getByLabel("Quantidade", { exact: true }).fill(String(quantity));
    await page
      .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Adicionado ao carrinho" }),
    ).toBeVisible();
  }
  await page.goto("/cart");
  await expect(page.getByTestId("quote-total")).toBeVisible();
  await expect(page.locator(".nft-related-grid>a")).toHaveCount(5);
  await shot(page, group, "Carrinho de NFTs");
  await login(page);
  for (const [route, name] of [
    ["/profile", "Perfil do Colecionador"],
    ["/wallets", "Carteiras"],
    ["/checkout", "Pagamento"],
  ]) {
    if (!mobile)
      await page.setViewportSize({
        width: 1440,
        height: route === "/checkout" ? 1657 : 1080,
      });
    await page.goto(route);
    if (route === "/checkout")
      await expect(page.getByTestId("quote-total")).toBeVisible();
    else await expect(page.locator(".account-content")).toBeVisible();
    await shot(page, group, name);
  }
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar compra simulada", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await shot(page, group, "Confirmação de Pedido");
  await ctx.close();
}
await writeFile(
  `${destination}/manifest.json`,
  JSON.stringify(manifest, null, 2),
);
await browser.close();
console.log("Captured", manifest.length, "states");
