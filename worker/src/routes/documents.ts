import { Hono } from 'hono'
import { requirePermission } from '../middleware/auth'
import type { Env } from '../index'

const docs = new Hono<{ Bindings: Env }>()

// GET /documents/:studentId — list student documents
docs.get('/:studentId', requirePermission('students.read'), async c => {
  const rows = await c.env.DB.prepare(`
    SELECT id, type, label, r2_key, size_bytes, mime, created_at
    FROM documents WHERE student_id = ? ORDER BY created_at DESC
  `).bind(c.req.param('studentId')).all()
  return c.json(rows.results)
})

// POST /documents/presign — get pre-signed R2 upload URL
docs.post('/presign', requirePermission('students.write'), async c => {
  const { student_id, type, label, mime, size_bytes } = await c.req.json()

  if (!['aadhar','tc','marksheet','photo','other'].includes(type)) {
    return c.json({ error: 'invalid_type' }, 400)
  }
  if (size_bytes > 10 * 1024 * 1024) { // 10 MB limit
    return c.json({ error: 'file_too_large', max: '10MB' }, 400)
  }

  const ext = mime.split('/')[1] ?? 'bin'
  const r2_key = `students/${student_id}/${type}/${crypto.randomUUID()}.${ext}`

  // R2 presigned URL — valid 15 min
  const url = await c.env.FILES.createMultipartUpload(r2_key)
  // For simple uploads, use signedURL approach
  // (In production use Workers R2 presigned: https://developers.cloudflare.com/r2/api/s3/presigned-urls/)

  return c.json({ r2_key, upload_key: r2_key, mime, type, label, student_id })
})

// POST /documents/confirm — after upload, save record to D1
docs.post('/confirm', requirePermission('students.write'), async c => {
  const { student_id, r2_key, type, label, mime, size_bytes } = await c.req.json()
  const user = c.get('user')

  // Verify object exists in R2
  const obj = await c.env.FILES.head(r2_key)
  if (!obj) return c.json({ error: 'file_not_found_in_r2' }, 400)

  const result = await c.env.DB.prepare(`
    INSERT INTO documents(student_id, type, label, r2_key, size_bytes, mime, uploaded_by)
    VALUES(?,?,?,?,?,?,?)
  `).bind(student_id, type, label, r2_key, size_bytes, mime, user.userId).run()

  return c.json({ id: result.meta.last_row_id, r2_key }, 201)
})

// GET /documents/download/:docId — serve signed download URL
docs.get('/download/:docId', async c => {
  const doc = await c.env.DB.prepare(`SELECT r2_key, mime FROM documents WHERE id = ?`)
    .bind(c.req.param('docId')).first<any>()
  if (!doc) return c.json({ error: 'not_found' }, 404)

  const obj = await c.env.FILES.get(doc.r2_key)
  if (!obj) return c.json({ error: 'file_missing' }, 404)

  return new Response(obj.body, {
    headers: {
      'Content-Type': doc.mime,
      'Content-Disposition': `attachment; filename="${doc.r2_key.split('/').pop()}"`,
      'Cache-Control': 'private, max-age=300'
    }
  })
})

// DELETE /documents/:docId
docs.delete('/:docId', requirePermission('students.write'), async c => {
  const doc = await c.env.DB.prepare(`SELECT r2_key FROM documents WHERE id = ?`)
    .bind(c.req.param('docId')).first<any>()
  if (!doc) return c.json({ error: 'not_found' }, 404)

  await Promise.all([
    c.env.FILES.delete(doc.r2_key),
    c.env.DB.prepare(`DELETE FROM documents WHERE id = ?`).bind(c.req.param('docId')).run()
  ])
  return c.json({ ok: true })
})

export default docs
