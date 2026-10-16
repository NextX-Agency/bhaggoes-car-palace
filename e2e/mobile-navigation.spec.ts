import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
];

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text()); });
  return errors;
}

const openMenu = async (page: Page) => {
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  return menu;
};

const documentScrolls = (page: Page) => page.evaluate(async () => {
  const before = window.scrollY;
  window.scrollTo(0, before > 0 ? 0 : 100);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const moved = window.scrollY !== before;
  window.scrollTo(0, before);
  return moved;
});

for (const viewport of viewports) {
  test(`mobile menu fills the screen below the header at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.setViewportSize(viewport);
    await page.goto("/contact");
    await page.evaluate(() => window.scrollTo(0, 400));
    const menu = await openMenu(page);

    // Regression: the panel used to be positioned inside the header (a backdrop-filter containing block)
    // and collapsed to a 32px sliver, hiding every link.
    const box = await menu.boundingBox();
    expect(box?.y).toBe(0);
    expect(box?.height).toBe(viewport.height);
    expect(box?.width).toBe(viewport.width);
    const links = menu.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link");
    for (const link of await links.all()) {
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeInViewport();
      const linkBox = await link.boundingBox();
      expect(linkBox?.height).toBeGreaterThanOrEqual(44);
    }
    const sizes = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(sizes.page).toBeLessThanOrEqual(sizes.viewport);
    expect(errors).toEqual([]);
  });
}

test("menu locks page scroll while open and restores the scroll position when closed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/contact");
  await page.evaluate(() => window.scrollTo(0, 300));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(0);
  await openMenu(page);
  await page.mouse.wheel(0, 600);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  expect(await documentScrolls(page)).toBe(true);
});

test("menu closes with Escape and returns focus to the menu button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // While the modal menu is open the rest of the page is hidden from assistive technology, so locate the toggle directly.
  const toggle = page.locator(".site-header .menu-toggle");
  await expect(toggle).toHaveAccessibleName("Open menu");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const controls = await toggle.getAttribute("aria-controls");
  expect(await menu.getAttribute("id")).toBe(controls);

  // Focus stays inside the menu while tabbing.
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    expect(await menu.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("every mobile menu link navigates, closes the menu, and marks the active page", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  const menu = await openMenu(page);
  const targets = await menu.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link").evaluateAll((links) => links
    .filter((link) => link.getAttribute("href")?.startsWith("/"))
    .map((link) => [link.textContent?.trim() ?? "", link.getAttribute("href") ?? ""]));
  expect(targets.length).toBeGreaterThanOrEqual(4);
  await page.keyboard.press("Escape");

  for (const [name, href] of targets) {
    const current = await openMenu(page);
    await current.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked", /.*/);
    const reopened = await openMenu(page);
    await expect(reopened.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
  }
});

test("browser back closes an open menu and leaves the page usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.goto("/contact");
  await openMenu(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  expect(await documentScrolls(page)).toBe(true);
  await page.goForward();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
});

test("opening and closing the menu repeatedly never leaves the page locked", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/contact");
  for (let index = 0; index < 6; index += 1) {
    await openMenu(page);
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  }
  expect(await documentScrolls(page)).toBe(true);
  expect(await page.evaluate(() => document.body.style.pointerEvents)).not.toBe("none");
});

test("resizing to desktop closes the menu and restores scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/contact");
  await openMenu(page);
  // Regression: the body stayed overflow:hidden on desktop when the menu was left open.
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  expect(await documentScrolls(page)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
  await openMenu(page);
});

test("desktop navigation works and hides the menu button", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("link", { name: "Contact" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(nav.getByRole("link", { name: "Contact" })).toHaveAttribute("aria-current", "page");
});

test("the sticky header never covers the start of the page content", async ({ page }) => {
  for (const route of ["/", "/cars", "/contact", "/faq"]) {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(route);
    const header = await page.locator(".site-header").boundingBox();
    const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(heading!.y, route).toBeGreaterThanOrEqual(header!.y + header!.height);
  }
});
