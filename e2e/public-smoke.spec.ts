import { expect, test } from "@playwright/test";

test("responses include baseline security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("homepage and inventory show a complete empty state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bhaggoes Car Palace");
  await expect(page.getByText("Welcome to", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No cars are listed right now" })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Inventory" }).click();
  await expect(page).toHaveURL(/\/cars$/);
  await expect(page.getByRole("heading", { name: "Browse cars" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Inventory" }).first()).toHaveAttribute("aria-current", "page");
});

test("homepage vehicle search sends all selected filters to inventory", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("search", { name: "Search cars" });
  await search.getByText("Any listed model", { exact: true }).click();
  await search.getByRole("button", { name: "Type another model" }).click();
  await search.getByRole("textbox", { name: "Type another model" }).fill("Corolla");
  await search.getByLabel("Year").fill("2022");
  await search.getByLabel("Max price").fill("25000");
  await search.getByRole("button", { name: /search cars/i }).click();
  await expect(page).toHaveURL(/\/cars\?.*model=Corolla/);
  await expect(page).toHaveURL(/year=2022/);
  await expect(page).toHaveURL(/maxPrice=25000/);
  await expect(page.getByRole("heading", { name: "Browse cars" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Remove filter Corolla" })).toBeVisible();
});

test("inventory filters persist in the URL and show a useful empty state", async ({ page }) => {
  await page.goto("/cars");
  await page.getByLabel("Search", { exact: true }).fill("Toyota");
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
  await drawer.getByLabel("Search", { exact: true }).fill("Toyota");
  await drawer.getByRole("button", { name: /apply filters/i }).click();
  await expect(page).toHaveURL(/search=Toyota/);
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
});

test("mobile model picker opens without typing and still accepts any model", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cars?make=Isuzu");
  await page.getByRole("button", { name: /filters/i }).click();
  const drawer = page.getByRole("dialog", { name: "Filter cars" });
  await drawer.getByText("Any listed model", { exact: true }).click();
  await expect(drawer.getByRole("button", { name: "Type another model" })).toBeVisible();
  await drawer.getByRole("button", { name: "Type another model" }).click();
  await drawer.getByRole("textbox", { name: "Type another model" }).fill("Elf");
  await drawer.getByRole("button", { name: /apply filters/i }).click();
  await expect(page).toHaveURL(/make=Isuzu/);
  await expect(page).toHaveURL(/model=Elf/);
});

test("supporting public pages render on direct visits", async ({ page }) => {
  for (const route of ["/contact", "/financing", "/faq", "/privacy", "/terms", "/favorites"]) {
    const response = await page.goto(route);
    expect(response?.status(), `${route} should respond successfully`).toBe(200);
    await expect(page.locator("main")).toBeVisible();
  }
});

test("old About links lead to the location-focused contact page", async ({ page }) => {
  await page.goto("/about");
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { name: "Find us on the map" })).toBeVisible();
});

test("comparison is hidden from the public offer", async ({ page }) => {
  await page.goto("/cars");
  await expect(page.getByRole("link", { name: /compare cars/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /compare/i })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: /compare/i })).toHaveCount(0);
  await page.goto("/compare");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("contact is WhatsApp-first without a customer inquiry form", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.locator("main form")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Message on WhatsApp" })).toHaveAttribute("href", /wa\.me\/5978668777/);
  await expect(page.getByRole("link", { name: "Facebook" }).first()).toHaveAttribute("href", "https://www.facebook.com/100057843361600/");
  await expect(page.getByText("Kwattaweg-Tomaatstraat 495, Suriname").first()).toBeVisible();
  await expect(page.locator('iframe[title^="Google Maps:"]')).toHaveCount(2);
});

test("published financing details are reachable from the navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Financing" })).toBeVisible();
  await page.goto("/financing");
  await expect(page.getByRole("heading", { name: "In-house financing" })).toBeVisible();
  await expect(page.getByText("70%")).toBeVisible();
  await expect(page.getByText("down payment · up to 6 months")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estimate your monthly payment" })).toHaveCount(0);
});

test("FAQ offers contact when no dashboard questions are published", async ({ page }) => {
  await page.goto("/faq");
  await expect(page.getByRole("heading", { name: "Questions? We’re here to help." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Contact the team" }).first()).toHaveAttribute("href", "/contact");
});

test("financing and FAQ fit a narrow phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const route of ["/financing", "/faq"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
});

test("admin sends an unconfigured project to setup guidance", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\?setup=1/);
  await expect(page.getByText(/Supabase is nog niet gekoppeld/i)).toBeVisible();
  // The dashboard is Dutch while the document root says English, so the staff pages carry their own language.
  expect(await page.locator(".admin-login-wrap").evaluate((node) => node.closest("[lang]")?.getAttribute("lang"))).toBe("nl");
  await page.goto("/admin/inventory/00000000-0000-4000-8000-000000000000/preview");
  await expect(page).toHaveURL(/\/admin\/login\?setup=1/);
});

test("mobile navigation opens and inventory fits the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const search = page.getByRole("search", { name: "Search cars" });
  await expect(search).toBeVisible();
  await expect(search.locator(".make-select-trigger")).toBeVisible();
  await expect(search.getByLabel("Model")).toBeVisible();
  await expect(search.getByLabel("Max price")).toBeHidden();
  await expect(search.getByLabel("Year")).toBeHidden();
  await expect(search.getByRole("link", { name: "More filters on the cars page" })).toHaveAttribute("href", "/cars");
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

test("unknown pages and removed cars lead back to the inventory", async ({ page }) => {
  for (const route of ["/this-page-does-not-exist", "/cars/a-car-that-was-sold"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" }).or(page.getByRole("navigation", { name: "Main navigation" }))).toBeVisible();
    await page.getByRole("link", { name: "Browse cars" }).click();
    await expect(page).toHaveURL(/\/cars$/);
  }
});
