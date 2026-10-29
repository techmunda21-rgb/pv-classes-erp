import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission } from '../middleware/auth'
import type { Env } from '../index'

const notifications = new Hono<{ Bindings: Env }>()

const notifySchema = z.object({
  title: z.string().min(3).max(100),
  body: z.string().min(10).max(1000),
  type: z.enum(['announcement', 'fee_reminder', 'result', 'holiday', 'exam', 'other']),
  target: z.enum(['all', 'batch', 'role']),
  target_id: z.number().int().positive().optional(), // batch_id when target=batch
  target_role: z.string().optional(),                // role name when target=role
  send_whatsapp: z.boolean().optional().default(true),
})

// GET /notifications — list recent notifications
notifications.get('/', async c => {
  const { limit = '20', offset = '0', type } = c.req.query()
  const user = c.get('user')

  let sql = `
    SELECT n.id, n.title, n.body, n.type, n.target, n.target_id,
           n.sent_count, n.created_at, u.name as sender_name
    FROM notifications n
    LEFT JOIN users u ON n.created_by = u.id
    WHERE 1=1
  `
  const binds: (string | number)[] = []

  // Parents/students only see their own notifications
  if (user.role === 'parent' || user.role === 'student') {
    sql += ` AND (n.target = 'all' OR (n.target = 'role' AND n.target_role = ?))`
    binds.push(user.role)
  }

  if (type) { sql += ` AND n.type = ?`; binds.push(type) }

  sql += ` ORDER BY n.created_at DESC LIMIT ? OFFSET ?`
  binds.push(Number(limit), Number(offset))

  const rows = await c.env.DB.prepare(sql).bind(...binds).all()
  return c.json(rows.results)
})

// GET /notifications/:id
notifications.get('/:id', async c => {
  const row = await c.env.DB.prepare(`
    SELECT n.*, u.name as sender_name
    FROM notifications n LEFT JOIN users u ON n.created_by = u.id
    WHERE n.id = ?
  `).bind(Number(c.req.param('id'))).first()
  if (!row) return c.json({ error: 'not_found' }, 404)
  return c.json(row)
})

// POST /notifications — send a notification
notifications.post('/', requirePermission('notifications.write'),
  zValidator('json', notifySchema), async c => {
    const body = c.req.valid('json')
    const user = c.get('user')

    // Save to D1
    const result = await c.env.DB.prepare(`
      INSERT INTO notifications(title, body, type, target, target_id, target_role, created_by)
      VALUES(?,?,?,?,?,?,?)
    `).bind(
      body.title, body.body, body.type,
      body.target, body.target_id ?? null,
      body.target_role ?? null, user.userId
    ).run()

    const notifId = result.meta.last_row_id

    // Fire WhatsApp delivery asynchronously
    if (body.send_whatsapp) {
      c.executionCtx?.waitUntil(
        deliverWhatsApp(c.env, notifId, body)
      )
    }

    return c.json({ id: notifId, ok: true }, 201)
  }
)

// DELETE /notifications/:id
notifications.delete('/:id', requirePermission('notifications.write'), async c => {
  await c.env.DB.prepare(`DELETE FROM notifications WHERE id = ?`)
    .bind(Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})

// --- WhatsApp delivery helper ---
async function deliverWhatsApp(env: Env, notifId: number, body: z.infer<typeof notifySchema>) {
  try {
    // Fetch target phone numbers
    let phoneSql = ''
    const binds: (string | number)[] = []

    if (body.target === 'all') {
      phoneSql = `SELECT DISTINCT guardian_phone FROM students WHERE is_active = 1`
    } else if (body.target === 'batch' && body.target_id) {
      phoneSql = `SELECT DISTINCT guardian_phone FROM students WHERE batch_id = ? AND is_active = 1`
      binds.push(body.target_id)
    } else if (body.target === 'role' && body.target_role) {
      phoneSql = `SELECT phone FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = ? AND u.is_active = 1`
      binds.push(body.target_role)
    }

    if (!phoneSql) return

    const phones = await env.DB.prepare(phoneSql).bind(...binds).all<{ guardian_phone?: string; phone?: string }>()
    const numbers = phones.results.map(r => r.guardian_phone ?? r.phone).filter(Boolean) as string[]

    let sent = 0
    for (const phone of numbers) {
      try {
        const res = await fetch('https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.WHATSAPP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone.startsWith('91') ? phone : `91${phone}`,
            type: 'template',
            template: {
              name: 'general_announcement',
              language: { code: 'en' },
              components: [{
                type: 'body',
                parameters: [
                  { type: 'text', text: body.title },
                  { type: 'text', text: body.body.substring(0, 300) },
                ]
              }]
            }
          })
        })
        if (res.ok) sent++
      } catch { /* ignore individual failures */ }
    }

    // Update sent count
    await env.DB.prepare(`UPDATE notifications SET sent_count = ? WHERE id = ?`)
      .bind(sent, notifId).run()
  } catch (err) {
    console.error('[PV-ERP] WhatsApp notification failed', err)
  }
}

export default notifications
