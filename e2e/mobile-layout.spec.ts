import { expect, test } from "@playwright/test";

const routes = ["/", "/cars", "/contact", "/faq", "/financing", "/favorites", "/admin/login?setup=1", "/admin/setup"];

test("key pages fit a narrow phone and keep primary controls touchable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const route of routes) {
    await page.goto(route);
    const layout = await page.evaluate(() => {
      const smallControls = [...document.querySelectorAll<HTMLElement>(
        'main button, main input:not([type="checkbox"]), main select, main a.button, .site-header button, .site-header a',
      )].filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && (box.width < 40 || box.height < 40);
      }).map((element) => element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName);
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, smallControls };
    });
    expect(layout.overflow, `${route} should not overflow horizontally`).toBeLessThanOrEqual(0);
    expect(layout.smallControls, `${route} has undersized primary controls`).toEqual([]);
  }
});
