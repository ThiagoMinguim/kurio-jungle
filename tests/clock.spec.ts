import { test, expect } from "@playwright/test";
import { login, reset } from "./helpers";

test("relógio controlado: sessão expira após trinta minutos", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-28T15:00:00.000Z") });
  await reset(page);
  await login(page);
  await page.clock.fastForward(31 * 60 * 1000);
  await page.goto("/profile");
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sair", exact: true }),
  ).toHaveCount(0);
});

test("sessão antiga no bootstrap não interrompe catálogo nem detalhe", async ({
  page,
}) => {
  await reset(page);
  for (const path of ["/nft/nft-1", "/"]) {
    await login(page);
    await page.evaluate(() => {
      const key = "kurio.mock.database.v1";
      const database = JSON.parse(localStorage.getItem(key)!);
      for (const session of database.sessions) session.expiresAt = 0;
      database.scenario = "slow";
      localStorage.setItem(key, JSON.stringify(database));
    });
    await page.goto(path);
    if (path === "/") {
      await expect(page.locator(".nft-card")).toHaveCount(9);
    } else {
      await expect(
        page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
      ).toBeVisible();
    }
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("kurio.session")))
      .toBeNull();
  }
});
