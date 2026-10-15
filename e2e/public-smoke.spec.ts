import { expect, test } from "@playwright/test";

test("homepage and inventory show a complete empty state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find a car that feels right.");
  await expect(page.getByRole("link", { name: /explore our cars/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Our next arrivals are on the way" })).toBeVisible();
  await page.getByRole("link", { name: /explore our cars/i }).click();
  await expect(page).toHaveURL(/\/cars$/);
  await expect(page.getByRole("heading", { name: "Find your next car." })).toBeVisible();
});

test("inventory filters persist in the URL and show a useful empty state", async ({ page }) => {
  await page.goto("/cars");
  await page.getByLabel("Search").fill("Toyota");
  await page.getByRole("button", { name: /apply filters/i }).click();
  await expect(page).toHaveURL(/search=Toyota/);
  await expect(page.getByRole("heading", { name: "No cars match those filters" })).toBeVisible();
});

test("admin sends an unconfigured project to setup guidance", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\?setup=1/);
  await expect(page.getByText(/Supabase is not connected yet/i)).toBeVisible();
});

test("mobile navigation opens and inventory fits the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Inventory" }).click();
  await expect(page).toHaveURL(/\/cars$/);
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
});
