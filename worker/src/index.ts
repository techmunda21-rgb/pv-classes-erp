/**
 * PV Classes ERP — Cloudflare Worker API
 * Author: Techmunda | Sourabh Vyas, PV Classes, Jodhpur
 * Stack: Hono + D1 + KV + R2
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { rateLimiter } from './middleware/rateLimit'
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/error'

// Routes
import authRoutes from './routes/auth'
import studentRoutes from './routes/students'
import feeRoutes from './routes/fees'
import attendanceRoutes from './routes/attendance'
import resultRoutes from './routes/results'
import batchRoutes from './routes/batches'
import notifyRoutes from './routes/notifications'
import docsRoutes from './routes/documents'
import dashboardRoutes from './routes/dashboard'
import timetableRoutes from './routes/timetable'

export type Env = {
  DB: D1Database
  SESSIONS: KVNamespace
  CACHE: KVNamespace
  FILES: R2Bucket
  JWT_SECRET: string
  WHATSAPP_API_KEY: string
  RAZORPAY_KEY_ID: string
  RAZORPAY_KEY_SECRET: string
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Env }>()

// ── Global Middleware ──────────────────────────────────────
app.use('*', logger())
app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    connectSrc: ["'self'", 'https://pvclasses.in'],
  }
}))
app.use('*', cors({
  origin: [
    'https://pvclasses.in',
    'https://app.pvclasses.in',
    'https://admin.pvclasses.in',
    // Dev origins
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  allowMethods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization','X-Request-ID'],
  exposeHeaders: ['X-Request-ID','X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400,
}))

// Rate limiting (per IP, 100 req/min general; 10/min for auth)
app.use('/api/v1/auth/*', rateLimiter({ limit: 10, window: 60 }))
app.use('/api/v1/*',      rateLimiter({ limit: 100, window: 60 }))

// ── Health ─────────────────────────────────────────────────
app.get('/', c => c.json({ ok: true, service: 'PV Classes ERP API', version: '1.0.0' }))
app.get('/health', async c => {
  const db = c.env.DB
  try {
    await db.prepare('SELECT 1').first()
    return c.json({ status: 'healthy', db: 'ok', ts: new Date().toISOString() })
  } catch {
    return c.json({ status: 'degraded', db: 'error' }, 503)
  }
})

// ── Public Routes ──────────────────────────────────────────
app.route('/api/v1/auth', authRoutes)

// ── Protected Routes (JWT required) ───────────────────────
const api = new Hono<{ Bindings: Env }>()
api.use('*', authMiddleware)

api.route('/dashboard',    dashboardRoutes)
api.route('/students',     studentRoutes)
api.route('/fees',         feeRoutes)
api.route('/attendance',   attendanceRoutes)
api.route('/results',      resultRoutes)
api.route('/batches',      batchRoutes)
api.route('/notifications', notifyRoutes)
api.route('/documents',    docsRoutes)
api.route('/timetable',    timetableRoutes)

app.route('/api/v1', api)

// ── Error Handler ──────────────────────────────────────────
app.onError(errorHandler)
app.notFound(c => c.json({ error: 'not_found', message: 'Route not found' }, 404))

export default app
