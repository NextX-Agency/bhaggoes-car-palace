import { describe, expect, it } from "vitest";
import { generateTemporaryPassword } from "./temp-password";

describe("generateTemporaryPassword", () => {
  it("makes four groups of four readable characters (19 characters with dashes)", () => {
    const password = generateTemporaryPassword();
    expect(password).toMatch(/^[a-zA-Z2-9]{4}(-[a-zA-Z2-9]{4}){3}$/);
    expect(password).toHaveLength(19);
  });
  it("never uses look-alike characters", () => {
    for (let i = 0; i < 200; i += 1) expect(generateTemporaryPassword()).not.toMatch(/[01oOlI]/);
  });
  it("meets the 12-character minimum of the dashboard", () => {
    expect(generateTemporaryPassword().length).toBeGreaterThanOrEqual(12);
  });
  it("is different every time", () => {
    expect(new Set(Array.from({ length: 50 }, () => generateTemporaryPassword())).size).toBe(50);
  });
});
