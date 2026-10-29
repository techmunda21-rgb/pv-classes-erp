import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission } from '../middleware/auth'
import type { Env } from '../index'

const students = new Hono<{ Bindings: Env }>()

const studentSchema = z.object({
  name: z.string().min(2),
  dob: z.string().optional(),
  gender: z.enum(['M','F','O']).optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  guardian_phone: z.string().regex(/^[6-9]\d{9}$/),
  address: z.string().optional(),
  batch_id: z.number().int().positive(),
  school_name: z.string().optional(),
  board: z.enum(['CBSE','RBSE','ICSE']).optional(),
})

// GET /students?batch=&page=&q=
students.get('/', requirePermission('students.read'), async c => {
  const { batch, page = '1', q } = c.req.query()
  const limit = 20
  const offset = (parseInt(page) - 1) * limit

  let where = 'WHERE s.is_active = 1'
  const params: any[] = []

  if (batch) { where += ' AND s.batch_id = ?'; params.push(batch) }
  if (q)     { where += ' AND (s.name LIKE ? OR s.roll_no LIKE ?)'; params.push(`%${q}%`,`%${q}%`) }

  const [rows, count] = await Promise.all([
    c.env.DB.prepare(`
      SELECT s.id, s.roll_no, s.name, s.guardian_phone, s.gender, s.enroll_date,
             b.name AS batch_name, b.code AS batch_code
      FROM students s JOIN batches b ON s.batch_id = b.id
      ${where} ORDER BY s.name LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM students s ${where}`).bind(...params).first<{n:number}>()
  ])

  return c.json({
    data: rows.results,
    meta: { total: count?.n ?? 0, page: parseInt(page), limit }
  })
})

// GET /students/:id
students.get('/:id', requirePermission('students.read'), async c => {
  const student = await c.env.DB.prepare(`
    SELECT s.*, b.name AS batch_name, b.code AS batch_code,
           b.fee_total,
           (SELECT COALESCE(SUM(fp.amount_paid - fp.discount),0)
            FROM fee_payments fp WHERE fp.student_id = s.id) AS total_paid
    FROM students s JOIN batches b ON s.batch_id = b.id
    WHERE s.id = ? AND s.is_active = 1
  `).bind(c.req.param('id')).first()
  if (!student) return c.json({ error: 'not_found' }, 404)
  return c.json(student)
})

// POST /students
students.post('/', requirePermission('students.write'), zValidator('json', studentSchema), async c => {
  const data = c.req.valid('json')
  const user = c.get('user')

  // Generate roll number: BATCH_CODE + YEAR + SEQ
  const batch = await c.env.DB.prepare('SELECT code, academic_year_id FROM batches WHERE id = ?').bind(data.batch_id).first<any>()
  if (!batch) return c.json({ error: 'batch_not_found' }, 400)

  const seq = await c.env.DB.prepare('SELECT COUNT(*)+1 AS n FROM students WHERE batch_id = ?').bind(data.batch_id).first<{n:number}>()
  const roll_no = `${batch.code}-${String(seq?.n ?? 1).padStart(3,'0')}`

  const result = await c.env.DB.prepare(`
    INSERT INTO students (roll_no, batch_id, name, dob, gender, father_name, mother_name,
      guardian_phone, address, school_name, board, enroll_date)
    VALUES (?,?,?,?,?,?,?,?,?,?,?, date('now'))
  `).bind(roll_no, data.batch_id, data.name, data.dob??null, data.gender??null,
    data.father_name??null, data.mother_name??null, data.guardian_phone,
    data.address??null, data.school_name??null, data.board??null).run()

  // Audit
  await c.env.DB.prepare(`INSERT INTO audit_log(user_id,action,table_name,record_id,new_data) VALUES(?,?,?,?,?)`)
    .bind(user.userId,'create','students',result.meta.last_row_id, JSON.stringify(data)).run()

  return c.json({ id: result.meta.last_row_id, roll_no }, 201)
})

// PATCH /students/:id
students.patch('/:id', requirePermission('students.write'), async c => {
  const body = await c.req.json()
  const allowed = ['name','dob','gender','father_name','mother_name','guardian_phone','address','school_name','board','batch_id']
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  if (!Object.keys(updates).length) return c.json({ error: 'no_fields' }, 400)

  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE students SET ${sets}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...Object.values(updates), c.req.param('id')).run()

  return c.json({ ok: true })
})

// DELETE /students/:id (soft delete)
students.delete('/:id', requirePermission('students.write'), async c => {
  await c.env.DB.prepare(`UPDATE students SET is_active = 0, updated_at = datetime('now') WHERE id = ?`)
    .bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// GET /students/:id/attendance-summary
students.get('/:id/attendance-summary', async c => {
  const summary = await c.env.DB.prepare(`
    SELECT
      COUNT(*) AS total_classes,
      SUM(CASE WHEN status='P' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN status='A' THEN 1 ELSE 0 END) AS absent,
      ROUND(SUM(CASE WHEN status='P' THEN 1.0 ELSE 0 END)*100.0/COUNT(*),1) AS pct
    FROM attendance WHERE student_id = ?
  `).bind(c.req.param('id')).first()
  return c.json(summary)
})

export default students
