/**
 * Resolves the effective client IP for rate-limiting purposes.
 *
 * Default (TRUST_PROXY not set): uses the raw socket address only.
 * X-Forwarded-For is ignored entirely, preventing spoofing by any client.
 *
 * Trusted-proxy mode (TRUST_PROXY=true):
 *   Reads TRUST_PROXY_DEPTH (default 1) — the number of trusted reverse
 *   proxies in front of the app.  The trusted proxies each append the IP
 *   they received the connection from to X-Forwarded-For, so the real
 *   client IP sits at index (parts.length - depth) in the header.
 *
 *   Example with TRUST_PROXY_DEPTH=1 and one nginx in front:
 *     X-Forwarded-For: <real-client>          → resolves to <real-client>
 *     X-Forwarded-For: <spoofed>, <attacker>  → resolves to <attacker>
 *       (spoofed prefix is discarded; only the nginx-appended IP is used)
 *
 * IPv6-mapped IPv4 addresses (::ffff:x.x.x.x) are normalised to x.x.x.x.
 */
export function resolveClientIp(request: any): string {
  const normalize = (ip: string): string => ip.replace(/^::ffff:/, '');

  const trustProxy = process.env.TRUST_PROXY === 'true';

  if (trustProxy) {
    const depth = Math.max(
      1,
      parseInt(process.env.TRUST_PROXY_DEPTH ?? '1', 10) || 1,
    );
    const forwardedFor = request.headers?.['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      const parts = forwardedFor
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);

      if (parts.length > 0) {
        const candidate = parts[Math.max(0, parts.length - depth)];
        if (candidate) {
          return normalize(candidate);
        }
      }
    }
  }

  // Fallback: socket address cannot be forged by the client.
  const socketIp =
    request.socket?.remoteAddress ??
    request.connection?.remoteAddress ??
    'unknown';

  return normalize(socketIp);
}
