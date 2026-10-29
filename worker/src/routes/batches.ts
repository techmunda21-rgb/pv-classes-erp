import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission } from '../middleware/auth'
import type { Env } from '../index'

const batches = new Hono<{ Bindings: Env }>()

const batchSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).toUpperCase(),
  academic_year_id: z.number().int().positive(),
  subject_ids: z.array(z.number().int().positive()).optional(),
  monthly_fee: z.number().min(0).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

// GET /batches — list all active batches with student count
batches.get('/', async c => {
  const cacheKey = 'batches:all'
  const cached = await c.env.CACHE.get(cacheKey)
  if (cached) return c.json(JSON.parse(cached))

  const rows = await c.env.DB.prepare(`
    SELECT b.id, b.name, b.code, b.monthly_fee, b.start_date, b.end_date,
           b.is_active, ay.name as academic_year,
           COUNT(s.id) as student_count
    FROM batches b
    LEFT JOIN academic_years ay ON b.academic_year_id = ay.id
    LEFT JOIN students s ON s.batch_id = b.id AND s.is_active = 1
    WHERE b.is_active = 1
    GROUP BY b.id
    ORDER BY b.name
  `).all()

  await c.env.CACHE.put(cacheKey, JSON.stringify(rows.results), { expirationTtl: 600 })
  return c.json(rows.results)
})

// GET /batches/:id — batch detail with subjects
batches.get('/:id', async c => {
  const id = c.req.param('id')

  const [batch, subjects] = await Promise.all([
    c.env.DB.prepare(`
      SELECT b.*, ay.name as academic_year_name
      FROM batches b
      LEFT JOIN academic_years ay ON b.academic_year_id = ay.id
      WHERE b.id = ?
    `).bind(Number(id)).first<any>(),
    c.env.DB.prepare(`
      SELECT s.id, s.name, s.code, s.max_marks, s.pass_marks, s.hours_per_week
      FROM subjects s
      JOIN batch_subjects bs ON bs.subject_id = s.id
      WHERE bs.batch_id = ?
      ORDER BY s.name
    `).bind(Number(id)).all(),
  ])

  if (!batch) return c.json({ error: 'not_found' }, 404)

  return c.json({ ...batch, subjects: subjects.results })
})

// POST /batches — create batch
batches.post('/', requirePermission('students.write'),
  zValidator('json', batchSchema), async c => {
    const body = c.req.valid('json')
    const user = c.get('user')

    const result = await c.env.DB.prepare(`
      INSERT INTO batches(name, code, academic_year_id, monthly_fee, start_date, end_date)
      VALUES(?,?,?,?,?,?)
    `).bind(
      body.name, body.code, body.academic_year_id,
      body.monthly_fee ?? 0,
      body.start_date ?? null, body.end_date ?? null
    ).run()

    const batchId = result.meta.last_row_id

    // Link subjects if provided
    if (body.subject_ids?.length) {
      const stmts = body.subject_ids.map(sid =>
        c.env.DB.prepare(`INSERT OR IGNORE INTO batch_subjects(batch_id, subject_id) VALUES(?,?)`)
          .bind(batchId, sid)
      )
      await c.env.DB.batch(stmts)
    }

    // Invalidate cache
    await c.env.CACHE.delete('batches:all')

    await c.env.DB.prepare(`
      INSERT INTO audit_log(user_id, action, entity, entity_id, new_data)
      VALUES(?,?,?,?,?)
    `).bind(user.userId, 'create', 'batch', batchId, JSON.stringify(body)).run()

    return c.json({ id: batchId, name: body.name, code: body.code }, 201)
  }
)

// PATCH /batches/:id
batches.patch('/:id', requirePermission('students.write'), async c => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const allowed = ['name', 'monthly_fee', 'start_date', 'end_date']
  const updates = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([k, v]) => ({ k, v }))

  if (!updates.length) return c.json({ error: 'no_valid_fields' }, 400)

  const sql = `UPDATE batches SET ${updates.map(u => `${u.k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`
  await c.env.DB.prepare(sql).bind(...updates.map(u => u.v), Number(id)).run()
  await c.env.CACHE.delete('batches:all')

  return c.json({ ok: true })
})

// DELETE /batches/:id — soft delete (only if no active students)
batches.delete('/:id', requirePermission('students.write'), async c => {
  const id = c.req.param('id')

  const activeStudents = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM students WHERE batch_id = ? AND is_active = 1`
  ).bind(Number(id)).first<{ cnt: number }>()

  if (activeStudents && activeStudents.cnt > 0) {
    return c.json({ error: 'has_active_students', count: activeStudents.cnt }, 409)
  }

  await c.env.DB.prepare(`UPDATE batches SET is_active = 0 WHERE id = ?`).bind(Number(id)).run()
  await c.env.CACHE.delete('batches:all')

  return c.json({ ok: true })
})

// GET /batches/:id/timetable
batches.get('/:id/timetable', async c => {
  const rows = await c.env.DB.prepare(`
    SELECT t.id, t.day_of_week, t.start_time, t.end_time,
           s.name as subject_name, s.code as subject_code,
           u.name as teacher_name
    FROM timetable t
    JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN users u ON t.teacher_id = u.id
    WHERE t.batch_id = ?
    ORDER BY t.day_of_week, t.start_time
  `).bind(Number(c.req.param('id'))).all()

  return c.json(rows.results)
})

export default batches
