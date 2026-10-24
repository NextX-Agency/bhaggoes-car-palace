import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./brand-logo";
import { vehicleMakes } from "../lib/vehicle-catalog";

describe("BrandLogo", () => {
  it("renders a known brand icon and a visible initials mark for an unfamiliar make", () => {
    expect(renderToStaticMarkup(<BrandLogo make="Toyota" />)).toContain("<svg");
    expect(renderToStaticMarkup(<BrandLogo make="Lexus" />)).toContain("/brands/lexus.svg");
    expect(renderToStaticMarkup(<BrandLogo make="Great Wall" />)).toContain("/brands/vs-great-wall-logo.png");
    expect(renderToStaticMarkup(<BrandLogo make="Unknown Motors" />)).toContain("UM");
  });

  it("shows a real mark for every catalog make", () => {
    for (const make of vehicleMakes) {
      expect(renderToStaticMarkup(<BrandLogo make={make} />), make).not.toContain("brand-logo-fallback");
    }
  });
});
