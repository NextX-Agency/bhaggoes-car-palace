import { expect, test } from "@playwright/test";

test("homepage and inventory show a complete empty state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Browse Our Cars");
  await expect(page.getByRole("heading", { name: "No cars are listed right now" })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Inventory" }).click();
  await expect(page).toHaveURL(/\/cars$/);
  await expect(page.getByRole("heading", { name: "Cars for sale" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Inventory" }).first()).toHaveAttribute("aria-current", "page");
});

test("homepage vehicle search sends all selected filters to inventory", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("search", { name: "Search cars" });
  await search.getByLabel("Model").fill("Corolla");
  await search.getByLabel("Year").fill("2022");
  await search.getByLabel("Max price").fill("25000");
  await search.getByRole("button", { name: /search cars/i }).click();
  await expect(page).toHaveURL(/\/cars\?.*model=Corolla/);
  await expect(page).toHaveURL(/year=2022/);
  await expect(page).toHaveURL(/maxPrice=25000/);
  await expect(page.getByRole("heading", { name: "Cars for sale" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Remove filter Corolla" })).toBeVisible();
});

test("inventory filters persist in the URL and show a useful empty state", async ({ page }) => {
  await page.goto("/cars");
  await page.getByLabel("Search").fill("Toyota");
  await page.getByRole("button", { name: /apply filters/i }).click();
  await expect(page).toHaveURL(/search=Toyota/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Sort by").selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page).toHaveURL(/search=Toyota/);
  await expect(page.getByRole("heading", { name: "No cars match your filters" })).toBeVisible();
  await page.getByRole("link", { name: /Remove filter/ }).click();
  await expect(page).not.toHaveURL(/search=Toyota/);
  await expect(page).toHaveURL(/sort=price-asc/);
});

test("mobile inventory filters open in an accessible drawer and apply to the URL", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cars");
  const filterButton = page.getByRole("button", { name: /filters/i });
  await expect(filterButton).toBeVisible();
  await filterButton.click();
  const drawer = page.getByRole("dialog", { name: "Filter cars" });
  await expect(drawer).toBeVisible();
  await drawer.getByLabel("Search").fill("Toyota");
  await drawer.getByRole("button", { name: /apply filters/i }).click();
  await expect(page).toHaveURL(/search=Toyota/);
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
});

test("supporting public pages render on direct visits", async ({ page }) => {
  for (const route of ["/about", "/contact", "/financing", "/faq", "/privacy", "/terms", "/compare", "/favorites"]) {
    const response = await page.goto(route);
    expect(response?.status(), `${route} should respond successfully`).toBe(200);
    await expect(page.locator("main")).toBeVisible();
  }
});

test("contact form requires a return address and reports unavailable delivery", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Your name").fill("Test Customer");
  await page.getByLabel("Message", { exact: true }).fill("Is this car available?");
  await page.getByRole("button", { name: /send inquiry/i }).click();
  await expect(page.getByRole("status")).toHaveText("Enter an email address or phone number.");
  await page.getByLabel(/Email/).fill("test@example.com");
  await page.getByRole("button", { name: /send inquiry/i }).click();
  await expect(page.getByRole("status")).toHaveText("Messages are unavailable right now. Please try again later.");
});

test("financing stays unpublished until the dealership enables it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Financing" })).toHaveCount(0);
  await page.goto("/financing");
  await expect(page.getByText(/financing details are not published/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estimate your monthly payment" })).toHaveCount(0);
});

test("admin sends an unconfigured project to setup guidance", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\?setup=1/);
  await expect(page.getByText(/Supabase is not connected yet/i)).toBeVisible();
  await page.goto("/admin/inventory/00000000-0000-4000-8000-000000000000/preview");
  await expect(page).toHaveURL(/\/admin\/login\?setup=1/);
});

test("mobile navigation opens and inventory fits the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("search", { name: "Search cars" })).toBeVisible();
  const homeWidths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(homeWidths.page).toBeLessThanOrEqual(homeWidths.viewport);
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Inventory" }).click();
  await expect(page).toHaveURL(/\/cars$/);
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  await page.goto("/admin/login?setup=1");
  const adminWidths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(adminWidths.page).toBeLessThanOrEqual(adminWidths.viewport);
});
