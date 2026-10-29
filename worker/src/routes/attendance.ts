import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission } from '../middleware/auth'
import type { Env } from '../index'

const attendance = new Hono<{ Bindings: Env }>()

const markSchema = z.object({
  subject_id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(z.object({
    student_id: z.number().int().positive(),
    status: z.enum(['P','A','L','H']),
    remark: z.string().optional()
  })).min(1)
})

// POST /attendance/mark — bulk mark attendance
attendance.post('/mark', requirePermission('attendance.write'), zValidator('json', markSchema), async c => {
  const { subject_id, date, records } = c.req.valid('json')
  const user = c.get('user')

  // Upsert all records in one batch
  const stmts = records.map(r =>
    c.env.DB.prepare(`
      INSERT INTO attendance (student_id, subject_id, date, status, marked_by, remark)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(student_id, subject_id, date) DO UPDATE
        SET status=excluded.status, marked_by=excluded.marked_by, remark=excluded.remark
    `).bind(r.student_id, subject_id, date, r.status, user.userId, r.remark??null)
  )
  await c.env.DB.batch(stmts)

  // Send WhatsApp alerts for absent students
  const absentIds = records.filter(r => r.status === 'A').map(r => r.student_id)
  if (absentIds.length > 0) {
    // Fire-and-forget notify (don't await — keep response fast)
    c.executionCtx?.waitUntil(notifyAbsents(c.env, absentIds, date))
  }

  return c.json({ ok: true, marked: records.length })
})

// GET /attendance?subject=&date=&student=&from=&to=
attendance.get('/', requirePermission('attendance.read'), async c => {
  const { subject, date, student, from, to, page = '1' } = c.req.query()
  const limit = 50
  const offset = (parseInt(page) - 1) * limit

  let where = 'WHERE 1=1'
  const params: any[] = []
  if (subject) { where += ' AND a.subject_id = ?'; params.push(subject) }
  if (date)    { where += ' AND a.date = ?'; params.push(date) }
  if (student) { where += ' AND a.student_id = ?'; params.push(student) }
  if (from)    { where += ' AND a.date >= ?'; params.push(from) }
  if (to)      { where += ' AND a.date <= ?'; params.push(to) }

  const rows = await c.env.DB.prepare(`
    SELECT a.*, s.name AS student_name, s.roll_no, sub.name AS subject_name
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN subjects sub ON a.subject_id = sub.id
    ${where} ORDER BY a.date DESC, s.name LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all()

  return c.json(rows.results)
})

// GET /attendance/daily-report?batch=&date=
attendance.get('/daily-report', async c => {
  const { batch, date = new Date().toISOString().slice(0,10) } = c.req.query()
  if (!batch) return c.json({ error: 'batch required' }, 400)

  const report = await c.env.DB.prepare(`
    SELECT
      s.id, s.name, s.roll_no,
      COUNT(DISTINCT a.subject_id) AS subjects_total,
      SUM(CASE WHEN a.status='P' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN a.status='A' THEN 1 ELSE 0 END) AS absent
    FROM students s
    LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
    LEFT JOIN subjects sub ON a.subject_id = sub.id AND sub.batch_id = s.batch_id
    WHERE s.batch_id = ? AND s.is_active = 1
    GROUP BY s.id ORDER BY s.name
  `).bind(date, batch).all()

  return c.json({ date, batch, students: report.results })
})

async function notifyAbsents(env: any, studentIds: number[], date: string) {
  // Fetch guardian phones
  const placeholders = studentIds.map(() => '?').join(',')
  const students = await env.DB.prepare(
    `SELECT name, guardian_phone FROM students WHERE id IN (${placeholders})`
  ).bind(...studentIds).all()

  for (const s of students.results as any[]) {
    try {
      await fetch('https://api.whatsapp.business/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: `91${s.guardian_phone}`,
          type: 'template',
          template: {
            name: 'attendance_absent',
            language: { code: 'en_IN' },
            components: [{
              type: 'body',
              parameters: [
                { type: 'text', text: s.name },
                { type: 'text', text: date }
              ]
            }]
          }
        })
      })
    } catch { /* non-critical */ }
  }
}

export default attendance
