const CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";

export function generateTempPassword(length = 12): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return password;
}
