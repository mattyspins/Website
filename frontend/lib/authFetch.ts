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
 * a different origin to the frontend. The server's CORS config sets
 * `credentials: true` with an explicit origin allow-list — but note that CORS
 * only makes the request legal, it does NOT make the browser attach the cookie.
 * SameSite governs that, independently:
 *
 *   DEPLOYMENT PREREQUISITE — the API must be same-SITE with the frontend
 *   (e.g. mattyspins.com -> api.mattyspins.com). The cookies are SameSite=lax,
 *   which browsers do not send on cross-site subrequests, so pointing this at a
 *   foreign domain (*.up.railway.app) means every call below is unauthenticated
 *   no matter what CORS says. See baseCookieOptions in backend middleware/auth.ts.
 *
 * MIGRATION COMPLETE. Every call site goes through this helper, `storeAuthData()`
 * no longer writes the JWTs (only non-sensitive user info + a refresh deadline),
 * and the OAuth callback no longer carries tokens in its URL. The tokens now
 * exist only as httpOnly cookies, so page JavaScript cannot read them at all.
 *
 * Don't reintroduce a token getter or an `Authorization: Bearer` header on the
 * frontend — it can only ever send null now, and it would re-open the exact
 * exposure this removed. The server still accepts Bearer for non-browser
 * clients; browsers authenticate by cookie.
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
