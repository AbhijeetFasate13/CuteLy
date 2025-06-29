const base62Chars =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function toBase62(n: number): string {
  let code = "";
  while (n > 0) {
    code = base62Chars[n % 62] + code;
    n = Math.floor(n / 62);
  }
  while (code.length < 6) {
    code = "0" + code;
  }
  return code;
}

export function toBase10(code: string): number {
  let id = 0;
  for (const c of code) {
    id = id * 62 + base62Chars.indexOf(c);
  }
  return id;
}

/**
 * Generate a random slug for URL shortening
 * Creates a 6-character random string using base62 characters
 * @returns Random slug string
 */
export function generateSlug(): string {
  let slug = "";

  // Generate 6 random characters from our base62 set
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * base62Chars.length);
    slug += base62Chars[randomIndex];
  }

  return slug;
}
