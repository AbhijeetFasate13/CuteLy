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
