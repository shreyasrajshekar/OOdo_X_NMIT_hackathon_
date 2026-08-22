import { describe, expect, it } from "vitest";
import { companyInitials, generateLoginId, nextSerial } from "./login-id";

describe("companyInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(companyInitials("Odoo India")).toBe("OI");
  });

  it("falls back to the first two letters of a single word", () => {
    expect(companyInitials("Dayflow")).toBe("DA");
  });

  it("pads a one-letter company with X", () => {
    expect(companyInitials("D")).toBe("DX");
  });
});

describe("generateLoginId", () => {
  const base = {
    companyName: "Odoo India",
    firstName: "John",
    lastName: "Doe",
    joiningYear: 2022,
  };

  it("builds the documented 14-character shape", () => {
    const id = generateLoginId({ ...base, serial: 1 });
    expect(id).toBe("OIJODO20220001");
    expect(id).toHaveLength(14);
  });

  it("pads short names with X", () => {
    expect(generateLoginId({ ...base, firstName: "A", lastName: "B", serial: 7 }))
      .toBe("OIAXBX20220007");
  });

  it("ignores non-letters in names", () => {
    expect(generateLoginId({ ...base, firstName: "J'on", lastName: "O'Doe", serial: 2 }))
      .toBe("OIJOOD20220002");
  });

  it("honours an explicit company prefix", () => {
    expect(generateLoginId({ ...base, serial: 3, companyPrefix: "ZZ" }))
      .toBe("ZZJODO20220003");
  });
});

describe("nextSerial", () => {
  it("starts at 1 when nobody joined that year", () => {
    expect(nextSerial([], 2022)).toBe(1);
  });

  it("continues from the highest serial for that year", () => {
    const ids = ["OIJODO20220001", "OIABCD20220004", "OIEFGH20220002"];
    expect(nextSerial(ids, 2022)).toBe(5);
  });

  it("ignores IDs from other joining years", () => {
    const ids = ["OIJODO20210009", "OIABCD20230007"];
    expect(nextSerial(ids, 2022)).toBe(1);
  });
});
