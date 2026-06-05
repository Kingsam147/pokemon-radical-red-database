/**
 * Cloudflare WAF Security Worker
 *
 * Sits in front of the Vercel origin and provides:
 *   - Rate limiting per IP (100 requests / 60s window)
 *   - Known bad-actor user-agent blocking
 *   - Security response headers on every reply
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 100;

const BLOCKED_USER_AGENTS = [
  'masscan',
  'nikto',
  'sqlmap',
  'nmap',
  'zgrab',
  'python-requests/2.1',
  'go-http-client/1.1',
  'curl/7.2',
];

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
};

// In-memory rate limit store — resets on Worker restart (expected behavior for edge)
const rateLimitStore = new Map();

function isRateLimited(clientIp) {
  const now = Date.now();
  const record = rateLimitStore.get(clientIp);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(clientIp, { windowStart: now, count: 1 });
    return false;
  }

  record.count += 1;
  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  return false;
}

function isBlockedUserAgent(userAgent) {
  if (!userAgent) return false;
  const lower = userAgent.toLowerCase();
  return BLOCKED_USER_AGENTS.some((blocked) => lower.includes(blocked));
}

function addSecurityHeaders(response) {
  const modified = new Response(response.body, response);
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    modified.headers.set(header, value);
  });
  return modified;
}

export default {
  async fetch(request, env) {
    const clientIp = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const userAgent = request.headers.get('User-Agent') || '';

    if (isBlockedUserAgent(userAgent)) {
      return new Response('Forbidden', {
        status: 403,
        headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' },
      });
    }

    if (isRateLimited(clientIp)) {
      return new Response('Too Many Requests', {
        status: 429,
        headers: {
          ...SECURITY_HEADERS,
          'Content-Type': 'text/plain',
          'Retry-After': '60',
        },
      });
    }

    const originUrl = env.ORIGIN_URL || 'https://pokemon-radical-red-database.vercel.app';
    const targetUrl = new URL(request.url);
    targetUrl.hostname = new URL(originUrl).hostname;

    const originRequest = new Request(targetUrl.toString(), request);
    const response = await fetch(originRequest);

    return addSecurityHeaders(response);
  },
};
