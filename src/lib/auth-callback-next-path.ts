/** Default post-auth redirect when `next` is missing or unsafe. */
export const AUTH_CALLBACK_DEFAULT_NEXT_PATH = "/dashboard";

/**
 * Validates `next` for use in a same-origin redirect after OAuth/magic-link callback.
 * `URLSearchParams.get` already applies one round of percent-decoding.
 */
export function sanitizeAuthCallbackNextPath(raw: string | null): string {
  if (raw === null || raw === "") {
    return AUTH_CALLBACK_DEFAULT_NEXT_PATH;
  }

  if (!raw.startsWith("/")) {
    return AUTH_CALLBACK_DEFAULT_NEXT_PATH;
  }

  // Protocol-relative URLs, e.g. //evil.com
  if (raw.startsWith("//")) {
    return AUTH_CALLBACK_DEFAULT_NEXT_PATH;
  }

  if (raw.includes("\\")) {
    return AUTH_CALLBACK_DEFAULT_NEXT_PATH;
  }

  if (raw.includes("://")) {
    return AUTH_CALLBACK_DEFAULT_NEXT_PATH;
  }

  if (raw.includes("\0")) {
    return AUTH_CALLBACK_DEFAULT_NEXT_PATH;
  }

  return raw;
}
