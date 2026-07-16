// Single source of truth for the in-memory auth token. auth-context.tsx sets/
// removes it on login/logout; api.ts reads it to build the Authorization
// header. Kept as its own module so neither file owns the other's concern.
let token: string | null = null;

export function getToken(): string | null {
  return token;
}

export function setToken(newToken: string | null): void {
  token = newToken;
}

export function removeToken(): void {
  token = null;
}
