const CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";

/**
 * Temporary password for a new hire.
 *
 * Uses the platform CSPRNG, not Math.random(): these passwords are emailed to
 * employees and are the only thing standing in front of their payroll record,
 * and Math.random() is a seeded PRNG whose output is predictable from prior
 * draws. Rejection sampling keeps the character distribution uniform — taking
 * a raw byte modulo 61 would bias the first few characters of the set.
 */
export function generateTempPassword(length = 12): string {
  const max = Math.floor(256 / CHARS.length) * CHARS.length;
  let password = "";

  while (password.length < length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= max) continue; // discard, would skew the distribution
      password += CHARS[byte % CHARS.length];
      if (password.length === length) break;
    }
  }

  return password;
}
