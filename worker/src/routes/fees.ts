import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission } from '../middleware/auth'
import type { Env } from '../index'

const fees = new Hono<{ Bindings: Env }>()

const paymentSchema = z.object({
  student_id: z.number().int().positive(),
  installment_id: z.number().int().positive().optional(),
  amount_paid: z.number().positive(),
  discount: z.number().min(0).default(0),
  mode: z.enum(['cash','upi','bank','cheque','online']),
  upi_ref: z.string().optional(),
  cheque_no: z.string().optional(),
  notes: z.string().optional(),
})

// Generate receipt number
async function genReceiptNo(db: D1Database): Promise<string> {
  const count = await db.prepare('SELECT COUNT(*)+1 AS n FROM fee_payments').first<{n:number}>()
  const year = new Date().getFullYear().toString().slice(-2)
  return `PV${year}${String(count?.n ?? 1).padStart(5,'0')}`
}

// GET /fees/dues?batch=&student=
fees.get('/dues', requirePermission('fees.read'), async c => {
  const { batch, student } = c.req.query()
  let where = 'WHERE 1=1'
  const params: any[] = []
  if (batch)   { where += ' AND b.id = ?'; params.push(batch) }
  if (student) { where += ' AND s.id = ?'; params.push(student) }

  const rows = await c.env.DB.prepare(`
    SELECT s.id AS student_id, s.name, s.roll_no,
           fi.id AS installment_id, fi.label, fi.amount, fi.due_date,
           COALESCE(SUM(fp.amount_paid - fp.discount),0) AS paid,
           fi.amount - COALESCE(SUM(fp.amount_paid - fp.discount),0) AS due
    FROM fee_installments fi
    JOIN batches b ON fi.batch_id = b.id
    JOIN students s ON s.batch_id = b.id AND s.is_active = 1
    LEFT JOIN fee_payments fp ON fp.student_id = s.id AND fp.installment_id = fi.id
    ${where}
    GROUP BY s.id, fi.id
    HAVING due > 0
    ORDER BY fi.due_date, s.name
  `).bind(...params).all()
  return c.json(rows.results)
})

// GET /fees/payments?student=&from=&to=
fees.get('/payments', requirePermission('fees.read'), async c => {
  const { student, from, to, page = '1' } = c.req.query()
  const limit = 20
  const offset = (parseInt(page) - 1) * limit
  let where = 'WHERE 1=1'
  const params: any[] = []
  if (student) { where += ' AND fp.student_id = ?'; params.push(student) }
  if (from)    { where += ' AND fp.paid_at >= ?'; params.push(from) }
  if (to)      { where += ' AND fp.paid_at <= ?'; params.push(to) }

  const rows = await c.env.DB.prepare(`
    SELECT fp.*, s.name AS student_name, s.roll_no, fi.label AS installment_label
    FROM fee_payments fp
    JOIN students s ON fp.student_id = s.id
    LEFT JOIN fee_installments fi ON fp.installment_id = fi.id
    ${where}
    ORDER BY fp.paid_at DESC LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all()
  return c.json(rows.results)
})

// POST /fees/pay
fees.post('/pay', requirePermission('fees.write'), zValidator('json', paymentSchema), async c => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const receipt_no = await genReceiptNo(c.env.DB)
  const txn_id = crypto.randomUUID()

  await c.env.DB.prepare(`
    INSERT INTO fee_payments
      (txn_id, student_id, installment_id, amount_paid, discount, mode, upi_ref, cheque_no, receipt_no, collected_by, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    txn_id, data.student_id, data.installment_id??null,
    data.amount_paid, data.discount, data.mode,
    data.upi_ref??null, data.cheque_no??null,
    receipt_no, user.userId, data.notes??null
  ).run()

  // Cache-bust student summary
  await c.env.CACHE.delete(`fee_summary:${data.student_id}`)

  // TODO: trigger WhatsApp receipt notification
  // await sendWhatsAppReceipt(c.env.WHATSAPP_API_KEY, studentPhone, receipt_no, data.amount_paid)

  await c.env.DB.prepare(`INSERT INTO audit_log(user_id,action,table_name,new_data) VALUES(?,?,?,?)`)
    .bind(user.userId,'fee_payment','fee_payments',JSON.stringify({ txn_id, receipt_no, ...data })).run()

  return c.json({ ok: true, txn_id, receipt_no }, 201)
})

// GET /fees/summary/:studentId
fees.get('/summary/:studentId', async c => {
  const cacheKey = `fee_summary:${c.req.param('studentId')}`
  const cached = await c.env.CACHE.get(cacheKey, 'json')
  if (cached) return c.json(cached)

  const summary = await c.env.DB.prepare(`
    SELECT
      (SELECT COALESCE(SUM(fi.amount),0) FROM fee_installments fi
       JOIN students s ON s.batch_id = fi.batch_id WHERE s.id = ?) AS total_fee,
      COALESCE(SUM(fp.amount_paid - fp.discount),0) AS total_paid,
      COUNT(*) AS payment_count
    FROM fee_payments fp WHERE fp.student_id = ?
  `).bind(c.req.param('studentId'), c.req.param('studentId')).first()

  await c.env.CACHE.put(cacheKey, JSON.stringify(summary), { expirationTtl: 300 })
  return c.json(summary)
})

export default fees
