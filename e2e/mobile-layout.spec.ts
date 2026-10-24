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

test.describe("touch devices (iPad / phone)", () => {
  test.use({ hasTouch: true, isMobile: true });
  for (const width of [375, 768]) {
    test(`links and buttons have a 44px touch target at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/", "/cars", "/contact", "/faq", "/financing"]) {
        await page.goto(route);
        const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("a, button, select, summary")].filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== "hidden" && !element.classList.contains("skip-link") && !element.closest(".sr-only") && box.height < 43.5;
        }).map((element) => `${element.getAttribute("aria-label") || element.textContent?.trim()} (${Math.round(element.getBoundingClientRect().height)}px)`));
        expect(small, `${route} at ${width}px has undersized touch targets`).toEqual([]);
      }
    });
  }
});
