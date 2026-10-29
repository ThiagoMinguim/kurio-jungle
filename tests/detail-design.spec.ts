import { test, expect } from "@playwright/test";
import { add, login, reset } from "./helpers";
test.beforeEach(async ({ page }) => reset(page));

test("Figma: galeria, edições e controles preservam identidade e estoque", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  if (mobile) await page.setViewportSize({ width: 414, height: 896 });
  await page.goto("/nft/nft-1");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("radiogroup", { name: "Edição" }).getByRole("radio"),
  ).toHaveCount(4);
  if (mobile) {
    await expect(page.locator(".site-header")).toBeHidden();
    const image = (await page.locator(".detail-art").boundingBox())!;
    expect(Math.abs(image.x - 28)).toBeLessThan(1);
    expect(Math.abs(image.y - 66)).toBeLessThan(1);
    await expect(
      page.getByRole("button", { name: "Comprar NFT", exact: true }),
    ).toBeVisible();
  } else {
    await expect(page.locator(".nft-thumbnails button")).toHaveCount(4);
    const image = (await page.locator(".detail-art").boundingBox())!;
    expect(Math.abs(image.x - 268)).toBeLessThan(1);
    expect(Math.abs(image.width - 404)).toBeLessThan(1);
    await expect(page.locator(".nft-related-grid > a")).toHaveCount(5);
  }
  await page.screenshot({
    path: `reports/detail-figma-${info.project.name}.png`,
    fullPage: true,
  });
  const selected = page.getByRole("radio", { name: /1\/50:/ });
  await selected.focus();
  await selected.press("ArrowRight");
  await expect(page.getByRole("radio", { name: /ABERTA:/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("radio", { name: /1\/1:/ }).click();
  await page.getByLabel("Quantidade", { exact: true }).fill("2");
  await expect(
    page.getByRole("button", { name: /^(COMPRAR|Comprar NFT)$/ }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: /1\/10:/ }).click();
  await expect(page.locator(".availability-note")).toBeVisible();
  await page.getByRole("radio", { name: /1\/50:/ }).click();
  await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(page.getByLabel("Quantidade", { exact: true })).toHaveValue("2");
  await page.getByRole("button", { name: "Diminuir quantidade" }).click();
  await expect(page.getByLabel("Quantidade", { exact: true })).toHaveValue("1");
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    page.viewportSize()!.width,
  );
});

test("galeria amplia a mesma obra; avaliações e coleção têm navegação funcional", async ({
  page,
}, info) => {
  await page.goto("/nft/nft-1");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  if (info.project.name === "desktop") {
    const originalCrop = await page.locator(".nft-art-crop").screenshot();
    await page.getByRole("button", { name: "Imagem 3", exact: true }).click();
    expect(
      (await page.locator(".nft-art-crop").screenshot()).equals(originalCrop),
    ).toBe(false);
    await expect(page.locator(".detail-art")).toHaveAttribute(
      "src",
      "/art/emerald.webp",
    );
    await page.getByRole("button", { name: "Ampliar imagem do NFT" }).click();
    await expect(page.getByRole("dialog").getByRole("img")).toHaveAttribute(
      "src",
      "/art/emerald.webp",
    );
    await page.keyboard.press("Escape");
    await page
      .getByRole("tab", { name: "Avaliações de colecionadores (19)" })
      .click();
    await expect(
      page
        .getByRole("tabpanel", { name: "Avaliações de colecionadores (19)" })
        .locator("article"),
    ).toHaveCount(19);
    await page
      .getByRole("tab", { name: "Detalhes do NFT", exact: true })
      .click();
    const first = await page
      .locator(".nft-related-grid h3")
      .first()
      .innerText();
    await page.getByRole("button", { name: "Página 2 da coleção" }).click();
    await expect(page.locator(".nft-related-grid h3").first()).not.toHaveText(
      first,
    );
    await page.locator(".nft-related-grid > a").first().click();
    await expect(page).not.toHaveURL(/\/nft\/nft-1(?:\?|$)/);
  } else {
    await page.getByRole("button", { name: /Ver 19 avaliações/ }).click();
    await expect(page.getByRole("dialog").locator("article")).toHaveCount(19);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});

test("migração do catálogo preserva sessão, carrinho e cotações antigas", async ({
  page,
}) => {
  await login(page);
  await add(page);
  const before = await page.evaluate(async () => {
    const token = localStorage.getItem("kurio.session"),
      headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    const quote = await (
      await fetch("/api/quote", { method: "POST", headers, body: "{}" })
    ).json();
    const database = JSON.parse(
      localStorage.getItem("kurio.mock.database.v1")!,
    );
    for (const nft of database.nfts) {
      delete nft.reviews;
      delete nft.collection;
      delete nft.attributes;
      nft.editions = nft.editions.filter((edition: { id: string }) =>
        ["original", "limited"].includes(edition.id),
      );
      for (const edition of nft.editions) delete edition.label;
    }
    localStorage.setItem("kurio.mock.database.v1", JSON.stringify(database));
    return { token, quote };
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  const after = await page.evaluate(async () => {
    const token = localStorage.getItem("kurio.session"),
      headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    const cart = await (await fetch("/api/cart", { headers })).json(),
      quote = await (
        await fetch("/api/quote", { method: "POST", headers, body: "{}" })
      ).json(),
      nft = await (await fetch("/api/nfts/nft-1")).json();
    return { token, cart, quote, nft };
  });
  expect(after.token).toBe(before.token);
  expect(after.cart.items).toHaveLength(1);
  expect(after.quote.fingerprint).toBe(before.quote.fingerprint);
  expect(after.nft.editions).toHaveLength(4);
  expect(after.nft.reviews).toHaveLength(19);
});
