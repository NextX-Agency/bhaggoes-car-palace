import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComboField } from "./combo-field";

describe("ComboField", () => {
  it("renders a named combobox input with the default value, constraints and a chevron button", () => {
    const html = renderToStaticMarkup(<ComboField name="fuel_type" label="Fuel type" options={["Gasoline", "Diesel"]} defaultValue="Hybrid" required maxLength={50} />);
    expect(html).toContain('name="fuel_type"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('value="Hybrid"');
    expect(html).toContain("required");
    expect(html).toContain('maxLength="50"');
    expect(html).toContain('class="combo-toggle"');
    expect(html).not.toContain('role="listbox"');
  });
});
