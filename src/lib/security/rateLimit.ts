/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a distributed rate limiter
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory storage for rate limit records
const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Rate limit configurations for different actions
 */
export const RATE_LIMITS = {
  // Authentication - strict limits to prevent brute force
  'login': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  'register': { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  'password-reset': { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  
  // Profile & data updates
  'update-profile': { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  'questionnaire-save': { maxRequests: 30, windowMs: 60 * 60 * 1000 }, // 30 per hour
  
  // Matching & discovery
  'compute-matches': { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  'search': { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour
  
  // Meetings & connections
  'schedule-meeting': { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  'send-message': { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
  
  // Moderation actions
  'report-user': { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 }, // 5 per day
  'block-user': { maxRequests: 20, windowMs: 24 * 60 * 60 * 1000 }, // 20 per day
  
  // Default fallback
  'api-default': { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

/**
 * Check if a request should be rate limited
 * Returns whether the request is allowed and remaining requests
 */
export async function checkRateLimit(
  userId: string,
  action: RateLimitAction | string,
  maxRequests?: number,
  windowMs?: number
): Promise<{ allowed: boolean; remaining: number; resetTime?: number }> {
  const config = RATE_LIMITS[action as RateLimitAction] ?? RATE_LIMITS['api-default'];
  const limit = maxRequests ?? config.maxRequests;
  const window = windowMs ?? config.windowMs;

  const key = `${userId}:${action}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // If no record or window expired, reset
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + window,
    });
    return { allowed: true, remaining: limit - 1 };
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
  };
}

/**
 * Reset rate limit for a specific user and action
 * Useful for testing or admin overrides
 */
export function resetRateLimit(userId: string, action: string): void {
  const key = `${userId}:${action}`;
  rateLimitMap.delete(key);
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  userId: string,
  action: RateLimitAction | string
): { count: number; remaining: number; resetTime?: number } {
  const config = RATE_LIMITS[action as RateLimitAction] ?? RATE_LIMITS['api-default'];
  const key = `${userId}:${action}`;
  const record = rateLimitMap.get(key);
  const now = Date.now();

  if (!record || now > record.resetTime) {
    return { count: 0, remaining: config.maxRequests };
  }

  return {
    count: record.count,
    remaining: Math.max(0, config.maxRequests - record.count),
    resetTime: record.resetTime,
  };
}

/**
 * Clean up expired rate limit records
 * Run periodically to prevent memory leaks
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Clean up expired records every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRecords, 60 * 1000);
}

/**
 * Middleware helper to apply rate limiting to API routes
 */
export async function withRateLimit(
  userId: string,
  action: RateLimitAction | string,
  handler: () => Promise<Response>
): Promise<Response> {
  const { allowed, remaining, resetTime } = await checkRateLimit(userId, action);

  if (!allowed) {
    const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 3600;
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const response = await handler();

  // Add rate limit headers to response
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Remaining', remaining.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

