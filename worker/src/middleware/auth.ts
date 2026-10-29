import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import type { Env } from '../index'

export interface JWTPayload {
  sub: string        // user uid
  userId: number
  role: string
  permissions: string[]
  iat: number
  exp: number
}

declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'unauthorized', message: 'Missing token' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    // 1. Verify JWT signature + expiry
    const payload = await verify(token, c.env.JWT_SECRET) as JWTPayload

    // 2. Check session not revoked in KV
    const sessionKey = `sess:${payload.sub}:${token.slice(-8)}`
    const session = await c.env.SESSIONS.get(sessionKey)
    if (!session) {
      return c.json({ error: 'unauthorized', message: 'Session expired or revoked' }, 401)
    }

    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'unauthorized', message: 'Invalid token' }, 401)
  }
}

/** Role-based access control decorator */
export function requireRole(...roles: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user')
    if (!roles.includes(user.role) && !user.permissions.includes('*')) {
      return c.json({ error: 'forbidden', message: 'Insufficient permissions' }, 403)
    }
    await next()
  }
}

/** Permission-based access control */
export function requirePermission(permission: string) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user')
    if (
      !user.permissions.includes('*') &&
      !user.permissions.includes(permission)
    ) {
      return c.json({ error: 'forbidden', message: `Missing permission: ${permission}` }, 403)
    }
    await next()
  }
}
