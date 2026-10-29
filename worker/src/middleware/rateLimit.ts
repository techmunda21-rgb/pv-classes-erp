import { Context, Next } from 'hono'
import type { Env } from '../index'

interface RateLimitOptions {
  limit: number    // max requests
  window: number   // seconds
}

export function rateLimiter({ limit, window }: RateLimitOptions) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Real-IP') ?? 'unknown'
    const key = `rl:${ip}:${Math.floor(Date.now() / (window * 1000))}`

    try {
      const current = await c.env.SESSIONS.get(key)
      const count = current ? parseInt(current) : 0

      if (count >= limit) {
        c.res.headers.set('Retry-After', String(window))
        c.res.headers.set('X-RateLimit-Limit', String(limit))
        c.res.headers.set('X-RateLimit-Remaining', '0')
        return c.json({ error: 'rate_limited', retry_after: window }, 429)
      }

      await c.env.SESSIONS.put(key, String(count + 1), { expirationTtl: window })
      c.res.headers.set('X-RateLimit-Limit', String(limit))
      c.res.headers.set('X-RateLimit-Remaining', String(limit - count - 1))
    } catch {
      // KV unavailable — fail open (don't block legitimate requests)
    }

    await next()
  }
}
