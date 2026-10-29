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
    page.getByRole("heading", { name: "Que bom ter você de volta." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sair", exact: true }),
  ).toHaveCount(0);
});
