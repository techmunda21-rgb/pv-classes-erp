import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission } from '../middleware/auth'
import type { Env } from '../index'

const timetable = new Hono<{ Bindings: Env }>()

const slotSchema = z.object({
  batch_id: z.number().int().positive(),
  subject_id: z.number().int().positive(),
  teacher_id: z.number().int().positive().optional(),
  day_of_week: z.number().int().min(0).max(6),  // 0=Sun, 1=Mon ... 6=Sat
  start_time: z.string().regex(/^\d{2}:\d{2}$/),  // HH:MM
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().max(50).optional(),
})

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// GET /timetable?batch_id=&day=
timetable.get('/', async c => {
  const { batch_id, day } = c.req.query()

  let sql = `
    SELECT t.id, t.day_of_week, t.start_time, t.end_time, t.room,
           s.id as subject_id, s.name as subject_name, s.code as subject_code,
           b.id as batch_id, b.name as batch_name,
           u.id as teacher_id, u.name as teacher_name
    FROM timetable t
    JOIN subjects s ON t.subject_id = s.id
    JOIN batches b ON t.batch_id = b.id
    LEFT JOIN users u ON t.teacher_id = u.id
    WHERE b.is_active = 1
  `
  const binds: (string | number)[] = []

  if (batch_id) { sql += ` AND t.batch_id = ?`; binds.push(Number(batch_id)) }
  if (day !== undefined) { sql += ` AND t.day_of_week = ?`; binds.push(Number(day)) }

  sql += ` ORDER BY t.day_of_week, t.start_time`

  const rows = await c.env.DB.prepare(sql).bind(...binds).all()

  // Group by day for convenience
  const byDay: Record<string, any[]> = {}
  for (const row of rows.results as any[]) {
    const dayName = DAY_NAMES[row.day_of_week]
    if (!byDay[dayName]) byDay[dayName] = []
    byDay[dayName].push(row)
  }

  return c.json(byDay)
})

// GET /timetable/today?batch_id=
timetable.get('/today', async c => {
  const { batch_id } = c.req.query()
  const dayOfWeek = new Date().getDay()

  let sql = `
    SELECT t.id, t.start_time, t.end_time, t.room,
           s.name as subject_name, s.code as subject_code,
           u.name as teacher_name
    FROM timetable t
    JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN users u ON t.teacher_id = u.id
    WHERE t.day_of_week = ?
  `
  const binds: (string | number)[] = [dayOfWeek]

  if (batch_id) { sql += ` AND t.batch_id = ?`; binds.push(Number(batch_id)) }
  sql += ` ORDER BY t.start_time`

  const rows = await c.env.DB.prepare(sql).bind(...binds).all()
  return c.json({ day: DAY_NAMES[dayOfWeek], slots: rows.results })
})

// POST /timetable — add a slot
timetable.post('/', requirePermission('timetable.write'),
  zValidator('json', slotSchema), async c => {
    const body = c.req.valid('json')

    // Check for teacher clash (same teacher, same day, overlapping time)
    if (body.teacher_id) {
      const clash = await c.env.DB.prepare(`
        SELECT id FROM timetable
        WHERE teacher_id = ? AND day_of_week = ?
          AND NOT (end_time <= ? OR start_time >= ?)
      `).bind(body.teacher_id, body.day_of_week, body.start_time, body.end_time).first()

      if (clash) return c.json({ error: 'teacher_clash', existing_slot_id: (clash as any).id }, 409)
    }

    // Check for batch clash (same batch, same day, overlapping time)
    const batchClash = await c.env.DB.prepare(`
      SELECT id FROM timetable
      WHERE batch_id = ? AND day_of_week = ?
        AND NOT (end_time <= ? OR start_time >= ?)
    `).bind(body.batch_id, body.day_of_week, body.start_time, body.end_time).first()

    if (batchClash) return c.json({ error: 'batch_clash', existing_slot_id: (batchClash as any).id }, 409)

    const result = await c.env.DB.prepare(`
      INSERT INTO timetable(batch_id, subject_id, teacher_id, day_of_week, start_time, end_time, room)
      VALUES(?,?,?,?,?,?,?)
    `).bind(
      body.batch_id, body.subject_id, body.teacher_id ?? null,
      body.day_of_week, body.start_time, body.end_time,
      body.room ?? null
    ).run()

    return c.json({ id: result.meta.last_row_id }, 201)
  }
)

// PATCH /timetable/:id
timetable.patch('/:id', requirePermission('timetable.write'), async c => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const allowed = ['start_time', 'end_time', 'room', 'teacher_id']
  const updates = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([k, v]) => ({ k, v }))

  if (!updates.length) return c.json({ error: 'no_valid_fields' }, 400)

  const sql = `UPDATE timetable SET ${updates.map(u => `${u.k} = ?`).join(', ')} WHERE id = ?`
  await c.env.DB.prepare(sql).bind(...updates.map(u => u.v), Number(id)).run()

  return c.json({ ok: true })
})

// DELETE /timetable/:id
timetable.delete('/:id', requirePermission('timetable.write'), async c => {
  await c.env.DB.prepare(`DELETE FROM timetable WHERE id = ?`)
    .bind(Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})

// GET /timetable/teacher/:userId — schedule for a specific teacher
timetable.get('/teacher/:userId', async c => {
  const rows = await c.env.DB.prepare(`
    SELECT t.day_of_week, t.start_time, t.end_time, t.room,
           s.name as subject_name, b.name as batch_name, b.code as batch_code
    FROM timetable t
    JOIN subjects s ON t.subject_id = s.id
    JOIN batches b ON t.batch_id = b.id
    WHERE t.teacher_id = ?
    ORDER BY t.day_of_week, t.start_time
  `).bind(Number(c.req.param('userId'))).all()

  const byDay: Record<string, any[]> = {}
  for (const row of rows.results as any[]) {
    const dayName = DAY_NAMES[row.day_of_week]
    if (!byDay[dayName]) byDay[dayName] = []
    byDay[dayName].push(row)
  }

  return c.json(byDay)
})

export default timetable
