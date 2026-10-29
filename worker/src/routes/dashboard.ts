import { Hono } from 'hono'
import type { Env } from '../index'

const dashboard = new Hono<{ Bindings: Env }>()

// GET /dashboard/stats — main KPI panel
dashboard.get('/stats', async c => {
  const cacheKey = 'dashboard:stats'
  const cached = await c.env.CACHE.get(cacheKey, 'json')
  if (cached) return c.json(cached)

  const [students, fees, attendance, results] = await Promise.all([
    // Total active students
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM students WHERE is_active=1`).first<{n:number}>(),
    // Fee collection this month
    c.env.DB.prepare(`
      SELECT COALESCE(SUM(amount_paid-discount),0) AS collected,
             COALESCE(SUM(CASE WHEN strftime('%Y-%m',paid_at)=strftime('%Y-%m','now') THEN amount_paid-discount ELSE 0 END),0) AS this_month
      FROM fee_payments
    `).first<any>(),
    // Today's attendance
    c.env.DB.prepare(`
      SELECT
        SUM(CASE WHEN status='P' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN status='A' THEN 1 ELSE 0 END) AS absent,
        COUNT(DISTINCT student_id) AS total_marked,
        ROUND(SUM(CASE WHEN status='P' THEN 1.0 ELSE 0 END)*100.0/COUNT(*),1) AS pct
      FROM attendance WHERE date=date('now')
    `).first<any>(),
    // Pending results
    c.env.DB.prepare(`
      SELECT COUNT(*) AS pending_exams FROM exams
      WHERE exam_date <= date('now')
        AND id NOT IN (SELECT DISTINCT exam_id FROM results)
    `).first<{pending_exams:number}>()
  ])

  const stats = {
    students: students?.n ?? 0,
    fees: {
      total_collected: fees?.collected ?? 0,
      this_month: fees?.this_month ?? 0
    },
    attendance: {
      present: attendance?.present ?? 0,
      absent: attendance?.absent ?? 0,
      pct: attendance?.pct ?? 0
    },
    pending_results: results?.pending_exams ?? 0,
    as_of: new Date().toISOString()
  }

  await c.env.CACHE.put(cacheKey, JSON.stringify(stats), { expirationTtl: 60 })
  return c.json(stats)
})

// GET /dashboard/fee-chart?months=6
dashboard.get('/fee-chart', async c => {
  const months = parseInt(c.req.query('months') ?? '6')
  const rows = await c.env.DB.prepare(`
    SELECT strftime('%Y-%m', paid_at) AS month,
           ROUND(SUM(amount_paid - discount),2) AS collected
    FROM fee_payments
    WHERE paid_at >= date('now', '-' || ? || ' months')
    GROUP BY month ORDER BY month
  `).bind(months).all()
  return c.json(rows.results)
})

// GET /dashboard/batch-summary
dashboard.get('/batch-summary', async c => {
  const rows = await c.env.DB.prepare(`
    SELECT b.id, b.name, b.code,
           COUNT(DISTINCT s.id) AS student_count,
           ROUND(AVG(CASE WHEN a.status='P' THEN 100.0 ELSE 0 END),1) AS avg_attendance
    FROM batches b
    LEFT JOIN students s ON s.batch_id = b.id AND s.is_active = 1
    LEFT JOIN attendance a ON a.student_id = s.id
    WHERE b.is_active = 1
    GROUP BY b.id ORDER BY b.name
  `).all()
  return c.json(rows.results)
})

export default dashboard
