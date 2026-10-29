import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission } from '../middleware/auth'
import type { Env } from '../index'

const results = new Hono<{ Bindings: Env }>()

const markSchema = z.object({
  exam_id: z.number().int().positive(),
  student_id: z.number().int().positive(),
  subject_id: z.number().int().positive(),
  marks_obtained: z.number().min(0),
  is_absent: z.boolean().optional().default(false),
  remarks: z.string().max(200).optional(),
})

// GET /results?exam_id=&student_id=&batch_id=
results.get('/', requirePermission('results.read'), async c => {
  const { exam_id, student_id, batch_id } = c.req.query()

  let sql = `
    SELECT r.id, r.marks_obtained, r.is_absent, r.remarks,
           r.created_at, r.updated_at,
           s.id as student_id, s.name as student_name, s.roll_no,
           sub.name as subject_name, sub.max_marks,
           e.name as exam_name, e.exam_date
    FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN subjects sub ON r.subject_id = sub.id
    JOIN exams e ON r.exam_id = e.id
    WHERE 1=1
  `
  const bindings: (string | number)[] = []

  if (exam_id) { sql += ` AND r.exam_id = ?`; bindings.push(Number(exam_id)) }
  if (student_id) { sql += ` AND r.student_id = ?`; bindings.push(Number(student_id)) }
  if (batch_id) { sql += ` AND s.batch_id = ?`; bindings.push(Number(batch_id)) }

  sql += ` ORDER BY s.roll_no, sub.name`

  const rows = await c.env.DB.prepare(sql).bind(...bindings).all()
  return c.json(rows.results)
})

// POST /results — enter or update single mark
results.post('/', requirePermission('results.write'),
  zValidator('json', markSchema), async c => {
    const body = c.req.valid('json')
    const user = c.get('user')

    // Verify exam exists and is for a valid batch
    const exam = await c.env.DB.prepare(`SELECT id, batch_id, name FROM exams WHERE id = ?`)
      .bind(body.exam_id).first<any>()
    if (!exam) return c.json({ error: 'exam_not_found' }, 404)

    const result = await c.env.DB.prepare(`
      INSERT INTO results(exam_id, student_id, subject_id, marks_obtained, is_absent, remarks, entered_by)
      VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(exam_id, student_id, subject_id) DO UPDATE SET
        marks_obtained = excluded.marks_obtained,
        is_absent = excluded.is_absent,
        remarks = excluded.remarks,
        entered_by = excluded.entered_by,
        updated_at = datetime('now')
    `).bind(
      body.exam_id, body.student_id, body.subject_id,
      body.marks_obtained, body.is_absent ? 1 : 0,
      body.remarks ?? null, user.userId
    ).run()

    return c.json({ ok: true, changes: result.meta.changes }, 201)
  }
)

// POST /results/bulk — enter many marks at once (same exam)
results.post('/bulk', requirePermission('results.write'), async c => {
  const { exam_id, entries } = await c.req.json() as {
    exam_id: number
    entries: Array<{ student_id: number; subject_id: number; marks_obtained: number; is_absent?: boolean; remarks?: string }>
  }
  const user = c.get('user')

  if (!Array.isArray(entries) || entries.length === 0) {
    return c.json({ error: 'entries_required' }, 400)
  }

  const stmts = entries.map(e =>
    c.env.DB.prepare(`
      INSERT INTO results(exam_id, student_id, subject_id, marks_obtained, is_absent, remarks, entered_by)
      VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(exam_id, student_id, subject_id) DO UPDATE SET
        marks_obtained = excluded.marks_obtained,
        is_absent = excluded.is_absent,
        remarks = excluded.remarks,
        entered_by = excluded.entered_by,
        updated_at = datetime('now')
    `).bind(exam_id, e.student_id, e.subject_id, e.marks_obtained, e.is_absent ? 1 : 0, e.remarks ?? null, user.userId)
  )

  const batchResult = await c.env.DB.batch(stmts)
  const totalChanges = batchResult.reduce((sum, r) => sum + r.meta.changes, 0)
  return c.json({ ok: true, records: totalChanges })
})

// GET /results/rank-list/:examId — sorted rank list with totals
results.get('/rank-list/:examId', requirePermission('results.read'), async c => {
  const examId = c.req.param('examId')

  const rows = await c.env.DB.prepare(`
    SELECT s.id, s.name, s.roll_no,
           SUM(CASE WHEN r.is_absent = 0 THEN r.marks_obtained ELSE 0 END) as total_marks,
           SUM(sub.max_marks) as max_total,
           COUNT(CASE WHEN r.is_absent = 1 THEN 1 END) as subjects_absent,
           ROUND(
             SUM(CASE WHEN r.is_absent = 0 THEN r.marks_obtained ELSE 0 END) * 100.0
             / NULLIF(SUM(sub.max_marks), 0), 2
           ) as percentage
    FROM students s
    LEFT JOIN results r ON r.student_id = s.id AND r.exam_id = ?
    LEFT JOIN subjects sub ON r.subject_id = sub.id
    WHERE s.is_active = 1
    GROUP BY s.id
    ORDER BY total_marks DESC
  `).bind(Number(examId)).all()

  // Assign ranks (handle ties)
  const ranked: any[] = []
  let rank = 1
  for (let i = 0; i < rows.results.length; i++) {
    const row = rows.results[i] as any
    if (i > 0 && row.total_marks < (rows.results[i - 1] as any).total_marks) {
      rank = i + 1
    }
    ranked.push({ ...row, rank })
  }

  return c.json(ranked)
})

// GET /results/exam-summary/:examId — pass/fail/absent counts
results.get('/exam-summary/:examId', requirePermission('results.read'), async c => {
  const examId = c.req.param('examId')

  const summary = await c.env.DB.prepare(`
    SELECT
      COUNT(DISTINCT r.student_id) as total_students,
      COUNT(CASE WHEN r.is_absent = 1 THEN 1 END) as absent_count,
      COUNT(CASE WHEN r.is_absent = 0 AND r.marks_obtained >= sub.pass_marks THEN 1 END) as passed,
      COUNT(CASE WHEN r.is_absent = 0 AND r.marks_obtained < sub.pass_marks THEN 1 END) as failed,
      ROUND(AVG(CASE WHEN r.is_absent = 0 THEN r.marks_obtained END), 2) as avg_marks,
      MAX(r.marks_obtained) as highest,
      MIN(CASE WHEN r.is_absent = 0 THEN r.marks_obtained END) as lowest
    FROM results r
    JOIN subjects sub ON r.subject_id = sub.id
    WHERE r.exam_id = ?
  `).bind(Number(examId)).first()

  return c.json(summary)
})

export default results
