/**
 * Cookie-based authenticated fetch.
 *
 * Background: the app historically kept the JWT in localStorage and sent it as
 * `Authorization: Bearer …`. Anything an XSS can run can read localStorage, so
 * a single injected script could exfiltrate a durable admin credential.
 *
 * The API now issues httpOnly/Secure/SameSite cookies on the OAuth callback and
 * rotates them on refresh, and `extractAccessToken()` on the server prefers the
 * cookie over the header. Page JavaScript cannot read an httpOnly cookie, so an
 * XSS can no longer steal the session — it can only ride it while the page is
 * open.
 *
 * `credentials: "include"` is required (not "same-origin") because the API is on
 * a different origin (Railway) to the frontend. The server's CORS config already
 * sets `credentials: true` with an explicit origin allow-list, which is what
 * makes this legal.
 *
 * MIGRATION: call sites still passing an Authorization header keep working —
 * the server accepts either transport. Once every caller uses this helper, drop
 * the token from localStorage (see lib/authPersistence.ts) and the tokens from
 * the OAuth redirect URL, and the localStorage exposure is gone.
 */

type FetchArgs = Parameters<typeof fetch>;

export async function authFetch(
  input: FetchArgs[0],
  init: FetchArgs[1] = {}
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * Same as authFetch but parses JSON and throws on a non-2xx, so callers don't
 * each re-implement `if (!res.ok)`.
 */
export async function authFetchJson<T = unknown>(
  input: FetchArgs[0],
  init: FetchArgs[1] = {}
): Promise<T> {
  const res = await authFetch(input, init);
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || body?.message || "";
    } catch {
      /* body wasn't JSON — the status alone is the best we can report */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
