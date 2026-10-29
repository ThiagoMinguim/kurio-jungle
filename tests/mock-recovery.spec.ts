import { test, expect, type Page } from "@playwright/test";
import {
  reset,
  login,
  add,
  action,
  review,
  confirm,
  orderCount,
  catalogSearch,
  assertAuthenticated,
} from "./helpers";
async function stopWorker(page: Page) {
  const session = await page.context().newCDPSession(page);
  let timeout: ReturnType<typeof setTimeout>;
  const stopped = new Promise<void>((resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error("Service Worker não parou no teste")),
      8000,
    );
    session.on("ServiceWorker.workerVersionUpdated", (event) => {
      if (event.versions.some((version) => version.runningStatus === "stopped"))
        resolve();
    });
  });
  try {
    await session.send("ServiceWorker.enable");
    await session.send("ServiceWorker.stopAllWorkers");
    await stopped;
  } finally {
    clearTimeout(timeout!);
    await session.detach();
  }
}
test.beforeEach(async ({ page }) => reset(page));

test("worker interrompido: recupera GET em ciclos sem perder carrinho, sessão ou Socket.IO", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await page.goto("/");
  await expect(page.locator(".nft-card")).toHaveCount(9);
  for (const [search, count] of [
    ["Emerald", 4],
    ["Sage", 5],
    ["Golden", 7],
  ] as const) {
    await stopWorker(page);
    // The activation listener may heal before the first request; the helper verifies the actual stopped state.
    await (await catalogSearch(page)).fill(search);
    await expect(page.locator(".nft-card")).toHaveCount(count);
    await assertAuthenticated(page);
    await expect(
      page.getByText("Esta página não carregou.", { exact: true }),
    ).toHaveCount(0);
  }
  await (await catalogSearch(page)).fill("Emerald");
  await expect(page.locator(".nft-card")).toHaveCount(4);
  await action(page, "price");
  await expect(
    page.locator(".nft-card").filter({
      has: page.getByRole("heading", {
        name: "Emerald Ape #042",
        exact: true,
      }),
    }),
  ).toContainText("1.29 ETH");
  await page.goto("/cart");
  await expect(page.getByTestId("quote-total")).toHaveText("1.293 ETH");
});

test("retorno à aba reativa mocks antes das consultas da interface", async ({
  page,
}) => {
  await stopWorker(page);
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await (await catalogSearch(page)).fill("Emerald");
  await expect(page.locator(".nft-card")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: /SEJA DONO/ })).toBeVisible();
});

test("worker interrompido não repete cotação POST nem envia pedido sem nova confirmação", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await review(page);
  await stopWorker(page);
  let posts = 0,
    quotes = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/quote"
    )
      quotes++;
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/orders"
    )
      posts++;
  });
  await confirm(page);
  await expect(page.getByRole("alert")).toContainText(
    /conexão com a demonstração foi restabelecida|Sem conexão/,
  );
  expect(quotes).toBe(1);
  expect(posts).toBe(0);
  expect(await orderCount(page)).toBe(0);
  await confirm(page);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  expect(quotes).toBe(2);
  expect(posts).toBe(1);
  expect(await orderCount(page)).toBe(1);
});
