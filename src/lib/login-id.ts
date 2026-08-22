const ALPHA_ONLY = /[^A-Za-z]/g;

function initials(value: string, length: number): string {
  const letters = value.replace(ALPHA_ONLY, "").toUpperCase();
  return letters.slice(0, length).padEnd(length, "X");
}

function companyInitials(companyName: string): string {
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return initials(words[0] ?? "", 2);
}

/**
 * [CompanyInitials 2][FirstName 2][LastName 2][JoiningYear 4][Serial 4]
 * e.g. Odoo India, John Doe, joined 2022, 1st joiner that year -> OIJODO20220001
 */
export function generateLoginId(params: {
  companyName: string;
  firstName: string;
  lastName: string;
  joiningYear: number;
  serial: number;
}): string {
  const { companyName, firstName, lastName, joiningYear, serial } = params;
  return [
    companyInitials(companyName),
    initials(firstName, 2),
    initials(lastName, 2),
    String(joiningYear).padStart(4, "0"),
    String(serial).padStart(4, "0"),
  ].join("");
}

export function nextSerial(
  existingLoginIds: string[],
  joiningYear: number,
): number {
  const yearSuffix = String(joiningYear).padStart(4, "0");
  const usedSerials = existingLoginIds
    .filter((id) => id.slice(-8, -4) === yearSuffix)
    .map((id) => Number.parseInt(id.slice(-4), 10));
  return (usedSerials.length ? Math.max(...usedSerials) : 0) + 1;
}
