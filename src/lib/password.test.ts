import { describe, expect, it } from "vitest";
import { generateTempPassword } from "./password";

const CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";

describe("generateTempPassword", () => {
  it("returns the requested length", () => {
    expect(generateTempPassword()).toHaveLength(12);
    expect(generateTempPassword(20)).toHaveLength(20);
    expect(generateTempPassword(1)).toHaveLength(1);
  });

  it("only uses the allowed alphabet", () => {
    for (let i = 0; i < 50; i++) {
      for (const ch of generateTempPassword(32)) {
        expect(CHARS).toContain(ch);
      }
    }
  });

  it("excludes the visually ambiguous characters", () => {
    const generated = Array.from({ length: 200 }, () => generateTempPassword(32)).join("");
    for (const ambiguous of ["I", "O", "l", "0", "1"]) {
      expect(generated).not.toContain(ambiguous);
    }
  });

  it("does not repeat across draws", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateTempPassword()));
    expect(seen.size).toBe(500);
  });
});
