# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows.spec.ts >> timeout após criação recupera o mesmo pedido
- Location: tests/flows.spec.ts:222:1

# Error details

```
Test timeout of 35000ms exceeded.
```

```
Error: page.goto: net::ERR_NETWORK_CHANGED at https://kurio-jungle-one.vercel.app/checkout
Call log:
  - navigating to "https://kurio-jungle-one.vercel.app/checkout", waiting until "load"

```

# Test source

```ts
  1   | import { expect, type Page } from "@playwright/test";
  2   | export async function reset(page: Page, scenario = "success") {
  3   |   await page.goto("/");
  4   |   await expect(page.getByRole("heading", { name: /SEJA DONO/ })).toBeVisible();
  5   |   await page.evaluate(async (scenario) => {
  6   |     const result = await fetch("/api/debug/reset", {
  7   |       method: "POST",
  8   |       headers: { "Content-Type": "application/json" },
  9   |       body: JSON.stringify({ scenario }),
  10  |     });
  11  |     if (!result.ok) throw new Error("reset failed");
  12  |     for (const key of Object.keys(localStorage))
  13  |       if (key.startsWith("kurio.") && !key.startsWith("kurio.mock."))
  14  |         localStorage.removeItem(key);
  15  |   }, scenario);
  16  |   await page.reload();
  17  |   await expect(page.getByRole("heading", { name: /SEJA DONO/ })).toBeVisible();
  18  | }
  19  | export async function scenario(page: Page, scenario: string) {
  20  |   await expect(page.locator("main")).toBeVisible();
  21  |   await page.evaluate(async (scenario) => {
  22  |     const response = await fetch("/api/debug/scenario", {
  23  |       method: "POST",
  24  |       headers: { "Content-Type": "application/json" },
  25  |       body: JSON.stringify({ scenario }),
  26  |     });
  27  |     if (!response.ok || !(await response.json()).ok)
  28  |       throw new Error("Scenario activation failed");
  29  |   }, scenario);
  30  | }
  31  | export async function action(page: Page, action: string, nftId = "nft-1") {
  32  |   await expect(page.locator("main")).toBeVisible();
  33  |   await page.evaluate(
  34  |     async (payload) => {
  35  |       const response = await fetch("/api/debug/action", {
  36  |         method: "POST",
  37  |         headers: { "Content-Type": "application/json" },
  38  |         body: JSON.stringify(payload),
  39  |       });
  40  |       if (!response.ok || !(await response.json()).ok)
  41  |         throw new Error("Scenario action failed");
  42  |     },
  43  |     { action, nftId },
  44  |   );
  45  | }
  46  | export async function login(
  47  |   page: Page,
  48  |   email = "alex@demo.test",
  49  |   password = "Demo123!",
  50  | ) {
  51  |   await page.goto("/login");
  52  |   await page.getByLabel("E-mail", { exact: true }).fill(email);
  53  |   await page.getByLabel("Senha", { exact: true }).fill(password);
  54  |   await page.getByRole("button", { name: "Entrar", exact: true }).click();
  55  |   await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  56  |   await assertAuthenticated(page);
  57  | }
  58  | export async function add(page: Page, nft = "nft-1") {
  59  |   await page.goto(`/nft/${nft}`);
  60  |   await page
  61  |     .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
  62  |     .click();
  63  |   await expect(
  64  |     page.getByRole("status").filter({ hasText: "Adicionado ao carrinho" }),
  65  |   ).toBeVisible();
  66  | }
  67  | export async function review(page: Page) {
> 68  |   await page.goto("/checkout");
      |              ^ Error: page.goto: net::ERR_NETWORK_CHANGED at https://kurio-jungle-one.vercel.app/checkout
  69  |   await page
  70  |     .getByRole("button", { name: "Confirmar compra", exact: true })
  71  |     .click();
  72  |   await expect(page.getByRole("dialog")).toBeVisible();
  73  | }
  74  | export async function confirm(page: Page) {
  75  |   await page
  76  |     .getByRole("button", { name: "Confirmar compra simulada", exact: true })
  77  |     .click();
  78  | }
  79  | export async function orderCount(page: Page) {
  80  |   return page.evaluate(async () => {
  81  |     const token = localStorage.getItem("kurio.session");
  82  |     const response = await fetch("/api/orders", {
  83  |       headers: { Authorization: `Bearer ${token}` },
  84  |     });
  85  |     return (await response.json()).length as number;
  86  |   });
  87  | }
  88  | 
  89  | export async function assertAuthenticated(page: Page) {
  90  |   await expect
  91  |     .poll(() =>
  92  |       page.evaluate(async () => {
  93  |         const token = localStorage.getItem("kurio.session");
  94  |         return token
  95  |           ? (
  96  |               await fetch("/api/session", {
  97  |                 headers: { Authorization: `Bearer ${token}` },
  98  |               })
  99  |             ).status
  100 |           : 401;
  101 |       }),
  102 |     )
  103 |     .toBe(200);
  104 | }
  105 | export async function logout(page: Page) {
  106 |   await page.goto("/profile");
  107 |   await page
  108 |     .locator(".account-nav")
  109 |     .getByRole("button", { name: "Sair", exact: true })
  110 |     .click();
  111 |   await expect
  112 |     .poll(() => page.evaluate(() => localStorage.getItem("kurio.session")))
  113 |     .toBeNull();
  114 | }
  115 | export async function catalogSearch(page: Page) {
  116 |   const input = page.getByLabel("Buscar NFTs", { exact: true });
  117 |   if (!(await input.isVisible()))
  118 |     await page
  119 |       .getByRole("button", { name: "Abrir busca", exact: true })
  120 |       .click();
  121 |   return input;
  122 | }
  123 | export async function chooseAvatar(page: Page, name: string) {
  124 |   await page.getByRole("button", { name: "Alterar", exact: true }).click();
  125 |   await page
  126 |     .getByRole("dialog")
  127 |     .getByRole("button", { name: `Usar avatar ${name}`, exact: true })
  128 |     .click();
  129 | }
  130 | 
```