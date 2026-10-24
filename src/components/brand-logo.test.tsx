import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./brand-logo";

describe("BrandLogo", () => {
  it("renders a known brand icon and a visible initials mark for an unfamiliar make", () => {
    expect(renderToStaticMarkup(<BrandLogo make="Toyota" />)).toContain("<svg");
    expect(renderToStaticMarkup(<BrandLogo make="Lexus" />)).toContain("/brands/lexus.svg");
    expect(renderToStaticMarkup(<BrandLogo make="Great Wall" />)).toContain("GW");
    expect(renderToStaticMarkup(<BrandLogo make="Unknown Motors" />)).toContain("UM");
  });
});
