import { test, expect, SUGGESTED } from "./fixtures";

const find = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Encontrar conteúdo" }).first();

test("finds a suggestion and shows its details", async ({ page }) => {
  await page.goto("./");
  await find(page).click();

  await expect(page.getByRole("heading", { name: SUGGESTED.title, level: 3 })).toBeVisible();
  await expect(page.getByText("Jane Doe")).toBeVisible();
  await expect(page.getByRole("link", { name: "Abrir no IMDb" })).toHaveAttribute(
    "href",
    "https://www.imdb.com/title/tt0000100/"
  );
});

test("opens a trending poster, then goes back with the button and the browser", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Trending One" }).click();
  await expect(page.getByRole("heading", { name: "Trending One", level: 3 })).toBeVisible();

  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("heading", { name: /Pronto para descobrir/ })).toBeVisible();

  await page.getByRole("button", { name: "Trending Two" }).click();
  await expect(page.getByRole("heading", { name: "Trending Two", level: 3 })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: /Pronto para descobrir/ })).toBeVisible();
});

test("saves a title and finds it in the watchlist after a reload", async ({ page }) => {
  await page.goto("./");
  await find(page).click();
  await page.getByRole("button", { name: "Guardar na lista" }).click();

  await page.reload();
  await page.getByRole("button", { name: /A minha lista/ }).click();
  await expect(page.getByRole("button", { name: SUGGESTED.title, exact: true })).toBeVisible();
});

test("opens a shared link and plays the trailer inline", async ({ page }) => {
  await page.goto("./?id=300&t=movie");
  await expect(page.getByRole("heading", { name: "Shared Film", level: 3 })).toBeVisible();

  await page.getByRole("button", { name: "Ver Trailer" }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/abc123"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("shows more like this and opens a recommendation", async ({ page }) => {
  await page.goto("./");
  await find(page).click();
  await page.getByRole("button", { name: "Trending One" }).last().click();
  await expect(page.getByRole("heading", { name: "Trending One", level: 3 })).toBeVisible();
});
