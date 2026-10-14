/**
 * Normalizes a URL to origin + pathname, stripping query params, hashes, and trailing slashes.
 * Throws if the URL is invalid or uses a non-http(s) protocol.
 */
export function normalizePath(rawUrl: string): string {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error('URL must be a non-empty string');
  }

  const parsed = new URL(rawUrl);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Invalid URL protocol: "${parsed.protocol}". Only http: and https: are allowed.`,
    );
  }

  const cleanPathname = parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${cleanPathname}`;
}
