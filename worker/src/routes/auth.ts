import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Env } from '../index'

const auth = new Hono<{ Bindings: Env }>()

const loginSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  password: z.string().min(6),
})

const TOKEN_TTL = 60 * 60 * 8       // 8 hours
const SESSION_TTL = 60 * 60 * 8

auth.post('/login', zValidator('json', loginSchema), async c => {
  const { phone, password } = c.req.valid('json')

  // Fetch user + role
  const user = await c.env.DB.prepare(`
    SELECT u.id, u.uid, u.name, u.phone, u.email, u.password_hash, u.is_active,
           r.name AS role, r.permissions
    FROM users u JOIN roles r ON u.role_id = r.id
    WHERE u.phone = ?
  `).bind(phone).first<any>()

  if (!user || !user.is_active) {
    return c.json({ error: 'invalid_credentials' }, 401)
  }

  // Verify password (bcrypt compatible via SubtleCrypto)
  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return c.json({ error: 'invalid_credentials' }, 401)

  const permissions: string[] = JSON.parse(user.permissions)
  const now = Math.floor(Date.now() / 1000)

  const token = await sign({
    sub: user.uid,
    userId: user.id,
    role: user.role,
    permissions,
    iat: now,
    exp: now + TOKEN_TTL,
  }, c.env.JWT_SECRET)

  // Store session in KV
  const sessionKey = `sess:${user.uid}:${token.slice(-8)}`
  await c.env.SESSIONS.put(sessionKey, JSON.stringify({
    userId: user.id, role: user.role
  }), { expirationTtl: SESSION_TTL })

  // Audit
  await c.env.DB.prepare(
    `INSERT INTO audit_log(user_id,action,ip) VALUES(?,?,?)`
  ).bind(user.id, 'login', c.req.header('CF-Connecting-IP') ?? '').run()

  return c.json({
    token,
    user: { id: user.uid, name: user.name, role: user.role, phone: user.phone }
  })
})

auth.post('/logout', async c => {
  const token = c.req.header('Authorization')?.slice(7)
  if (token) {
    // Attempt KV delete — best effort
    try {
      const { verify } = await import('hono/jwt')
      const payload: any = await verify(token, c.env.JWT_SECRET)
      await c.env.SESSIONS.delete(`sess:${payload.sub}:${token.slice(-8)}`)
    } catch { /* expired token — already gone */ }
  }
  return c.json({ ok: true })
})

auth.post('/refresh', async c => {
  // Client sends current (not yet expired) token; get a fresh one
  const token = c.req.header('Authorization')?.slice(7)
  if (!token) return c.json({ error: 'unauthorized' }, 401)
  try {
    const { verify } = await import('hono/jwt')
    const payload: any = await verify(token, c.env.JWT_SECRET)
    const now = Math.floor(Date.now() / 1000)
    const newToken = await sign({ ...payload, iat: now, exp: now + TOKEN_TTL }, c.env.JWT_SECRET)
    const sessionKey = `sess:${payload.sub}:${newToken.slice(-8)}`
    await c.env.SESSIONS.put(sessionKey, JSON.stringify({ userId: payload.userId, role: payload.role }), {
      expirationTtl: SESSION_TTL
    })
    return c.json({ token: newToken })
  } catch {
    return c.json({ error: 'unauthorized' }, 401)
  }
})

// ── Password hashing (PBKDF2 via SubtleCrypto) ─────────────
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256
  )
  const hash = new Uint8Array(bits)
  return btoa(String.fromCharCode(...salt)) + '.' + btoa(String.fromCharCode(...hash))
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltB64, hashB64] = stored.split('.')
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256
    )
    const hash = btoa(String.fromCharCode(...new Uint8Array(bits)))
    return hash === hashB64
  } catch { return false }
}

export { hashPassword }
export default auth
