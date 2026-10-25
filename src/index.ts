/**
 * PV Classes ERP - Cloudflare Worker
 * TypeScript · ES Modules · Hono · D1 · Workers Static Assets
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { sign, verify } from 'hono/jwt';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

interface JwtPayload {
  sub: number;
  email: string;
  role: 'admin' | 'student';
  name: string;
  iat: number;
  exp: number;
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JwtPayload } }>();

// CORS
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Auth Middleware ──────────────────────────────────────────────────────────

const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.slice(7);
  try {
    const payload = await verify(token, c.env.JWT_SECRET) as JwtPayload;
    c.set('jwtPayload', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

const requireAdmin = async (c: any, next: any) => {
  await requireAuth(c, async () => {
    const p = c.get('jwtPayload') as JwtPayload;
    if (p.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
    await next();
  });
};

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  const user = await c.env.DB.prepare(
    'SELECT id, email, password_hash, name, role FROM users WHERE email = ?'
  ).bind(email.trim().toLowerCase()).first<any>();

  if (!user || user.password_hash !== password) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: user.id, email: user.email, role: user.role, name: user.name,
    iat: now, exp: now + 86400 * 7, // 7 days
  };
  const token = await sign(payload, c.env.JWT_SECRET);

  // If student, get student record
  let studentData = null;
  if (user.role === 'student') {
    studentData = await c.env.DB.prepare(
      `SELECT s.*, c.name as course_name, c.code as course_code
       FROM students s LEFT JOIN courses c ON s.course_id = c.id
       WHERE s.user_id = ?`
    ).bind(user.id).first();
  }

  return c.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role }, studentData });
});

app.get('/api/auth/me', requireAuth, async (c) => {
  const p = c.get('jwtPayload') as JwtPayload;
  const user = await c.env.DB.prepare('SELECT id, email, name, role FROM users WHERE id = ?').bind(p.sub).first();
  return c.json(user);
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

app.get('/api/dashboard', requireAdmin, async (c) => {
  const [students, courses, fees, attendance] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM students WHERE status = "active"').first<any>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM courses').first<any>(),
    c.env.DB.prepare('SELECT SUM(amount) as total FROM fees').first<any>(),
    c.env.DB.prepare(`
      SELECT
        SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
        COUNT(*) as total
      FROM attendance WHERE date >= date('now', '-30 days')
    `).first<any>(),
  ]);

  const feeStats = await c.env.DB.prepare(
    'SELECT SUM(total_fee) as total, SUM(paid_fee) as paid FROM students'
  ).first<any>();

  const recentStudents = await c.env.DB.prepare(
    `SELECT s.name, s.enrollment_no, c.name as course, s.joined_at
     FROM students s LEFT JOIN courses c ON s.course_id = c.id
     ORDER BY s.id DESC LIMIT 5`
  ).all();

  const attPct = attendance?.total > 0
    ? Math.round((attendance.present / attendance.total) * 100)
    : 0;

  return c.json({
    stats: {
      totalStudents: students?.count || 0,
      totalCourses: courses?.count || 0,
      totalRevenue: fees?.total || 0,
      attendanceRate: attPct,
      totalFees: feeStats?.total || 0,
      collectedFees: feeStats?.paid || 0,
      pendingFees: (feeStats?.total || 0) - (feeStats?.paid || 0),
    },
    recentStudents: recentStudents.results,
  });
});

// ─── Students ────────────────────────────────────────────────────────────────

app.get('/api/students', requireAdmin, async (c) => {
  const q = c.req.query('q');
  const courseId = c.req.query('course');
  let sql = `SELECT s.*, c.name as course_name, c.code as course_code
             FROM students s LEFT JOIN courses c ON s.course_id = c.id`;
  const params: any[] = [];
  const where: string[] = [];
  if (q) { where.push('(s.name LIKE ? OR s.enrollment_no LIKE ? OR s.email LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (courseId) { where.push('s.course_id = ?'); params.push(courseId); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY s.id DESC';
  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(result.results);
});

app.post('/api/students', requireAdmin, async (c) => {
  const body = await c.req.json();
  const { name, email, phone, course_id, batch, total_fee } = body;
  if (!name || !email || !course_id) return c.json({ error: 'name, email, course_id required' }, 400);

  const year = new Date().getFullYear();
  const last = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM students').first<any>();
  const enrollment_no = `PV-${year}-${String((last?.cnt || 0) + 1).padStart(3, '0')}`;

  // Create user account
  let userId: number | null = null;
  try {
    const userRes = await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?) RETURNING id'
    ).bind(email.toLowerCase(), 'student123', name, 'student').first<any>();
    userId = userRes?.id || null;
  } catch { /* user might already exist */ }

  const res = await c.env.DB.prepare(
    `INSERT INTO students (user_id, enrollment_no, name, email, phone, course_id, batch, total_fee, paid_fee, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'active') RETURNING *`
  ).bind(userId, enrollment_no, name, email.toLowerCase(), phone || '', course_id, batch || 'Batch A', total_fee || 0).first();
  return c.json(res, 201);
});

app.put('/api/students/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const { name, email, phone, course_id, batch, total_fee, status } = await c.req.json();
  const res = await c.env.DB.prepare(
    `UPDATE students SET name=?, email=?, phone=?, course_id=?, batch=?, total_fee=?, status=? WHERE id=? RETURNING *`
  ).bind(name, email, phone, course_id, batch, total_fee, status, id).first();
  return c.json(res);
});

app.delete('/api/students/:id', requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM students WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ─── Courses ──────────────────────────────────────────────────────────────────

app.get('/api/courses', requireAuth, async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM courses ORDER BY id').all();
  return c.json(result.results);
});

app.post('/api/courses', requireAdmin, async (c) => {
  const { name, code, duration, fee, seats, description } = await c.req.json();
  const res = await c.env.DB.prepare(
    'INSERT INTO courses (name, code, duration, fee, seats, enrolled, description) VALUES (?, ?, ?, ?, ?, 0, ?) RETURNING *'
  ).bind(name, code, duration, fee, seats || 50, description || '').first();
  return c.json(res, 201);
});

app.put('/api/courses/:id', requireAdmin, async (c) => {
  const { name, code, duration, fee, seats, description } = await c.req.json();
  const res = await c.env.DB.prepare(
    'UPDATE courses SET name=?, code=?, duration=?, fee=?, seats=?, description=? WHERE id=? RETURNING *'
  ).bind(name, code, duration, fee, seats, description, c.req.param('id')).first();
  return c.json(res);
});

app.delete('/api/courses/:id', requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ─── Faculty ──────────────────────────────────────────────────────────────────

app.get('/api/faculty', requireAuth, async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM faculty ORDER BY id').all();
  return c.json(result.results);
});

app.post('/api/faculty', requireAdmin, async (c) => {
  const { name, subject, email, phone, qualification } = await c.req.json();
  const res = await c.env.DB.prepare(
    'INSERT INTO faculty (name, subject, email, phone, qualification) VALUES (?, ?, ?, ?, ?) RETURNING *'
  ).bind(name, subject, email, phone, qualification).first();
  return c.json(res, 201);
});

app.put('/api/faculty/:id', requireAdmin, async (c) => {
  const { name, subject, email, phone, qualification } = await c.req.json();
  const res = await c.env.DB.prepare(
    'UPDATE faculty SET name=?, subject=?, email=?, phone=?, qualification=? WHERE id=? RETURNING *'
  ).bind(name, subject, email, phone, qualification, c.req.param('id')).first();
  return c.json(res);
});

app.delete('/api/faculty/:id', requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM faculty WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ─── Attendance ───────────────────────────────────────────────────────────────

app.get('/api/attendance', requireAuth, async (c) => {
  const studentId = c.req.query('student_id');
  const date = c.req.query('date');
  const p = c.get('jwtPayload') as JwtPayload;

  let sql = `SELECT a.*, s.name as student_name, s.enrollment_no
             FROM attendance a LEFT JOIN students s ON a.student_id = s.id`;
  const params: any[] = [];
  const where: string[] = [];

  if (p.role === 'student') {
    const stu = await c.env.DB.prepare('SELECT id FROM students WHERE user_id = ?').bind(p.sub).first<any>();
    if (stu) { where.push('a.student_id = ?'); params.push(stu.id); }
  } else if (studentId) {
    where.push('a.student_id = ?'); params.push(studentId);
  }
  if (date) { where.push('a.date = ?'); params.push(date); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY a.date DESC, a.id DESC LIMIT 200';

  const result = await c.env.DB.prepare(sql).bind(...params).all();

  // Summary stats per student
  const summary = await c.env.DB.prepare(
    `SELECT student_id,
       COUNT(*) as total,
       SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
       SUM(CASE WHEN status='absent'  THEN 1 ELSE 0 END) as absent,
       SUM(CASE WHEN status='late'    THEN 1 ELSE 0 END) as late
     FROM attendance ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     GROUP BY student_id`
  ).bind(...params).all();

  return c.json({ records: result.results, summary: summary.results });
});

app.post('/api/attendance', requireAdmin, async (c) => {
  const { records } = await c.req.json<{ records: Array<{ student_id: number; date: string; status: string; subject?: string }> }>();
  if (!records?.length) return c.json({ error: 'records array required' }, 400);

  const stmt = c.env.DB.prepare(
    'INSERT OR REPLACE INTO attendance (student_id, date, status, subject) VALUES (?, ?, ?, ?)'
  );
  const batch = records.map(r => stmt.bind(r.student_id, r.date, r.status, r.subject || ''));
  await c.env.DB.batch(batch);
  return c.json({ ok: true, count: records.length });
});

// ─── Fees ─────────────────────────────────────────────────────────────────────

app.get('/api/fees', requireAuth, async (c) => {
  const studentId = c.req.query('student_id');
  const p = c.get('jwtPayload') as JwtPayload;

  // Full fee list
  let sql = `SELECT f.*, s.name as student_name, s.enrollment_no, c.name as course_name
             FROM fees f
             LEFT JOIN students s ON f.student_id = s.id
             LEFT JOIN courses c ON s.course_id = c.id`;
  const params: any[] = [];

  if (p.role === 'student') {
    const stu = await c.env.DB.prepare('SELECT id FROM students WHERE user_id = ?').bind(p.sub).first<any>();
    sql += ' WHERE f.student_id = ?'; params.push(stu?.id);
  } else if (studentId) {
    sql += ' WHERE f.student_id = ?'; params.push(studentId);
  }
  sql += ' ORDER BY f.paid_at DESC LIMIT 200';
  const payments = await c.env.DB.prepare(sql).bind(...params).all();

  // Per-student summary
  const summary = await c.env.DB.prepare(
    `SELECT s.id, s.name, s.enrollment_no, c.name as course_name,
       s.total_fee, s.paid_fee, (s.total_fee - s.paid_fee) as pending
     FROM students s LEFT JOIN courses c ON s.course_id = c.id
     ORDER BY pending DESC`
  ).all();

  return c.json({ payments: payments.results, summary: summary.results });
});

app.post('/api/fees', requireAdmin, async (c) => {
  const { student_id, amount, mode, note } = await c.req.json();
  const count = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM fees').first<any>();
  const receipt_no = `RCP-${String((count?.cnt || 0) + 1).padStart(4, '0')}`;

  const [payment] = await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO fees (student_id, amount, mode, receipt_no, note) VALUES (?, ?, ?, ?, ?) RETURNING *'
    ).bind(student_id, amount, mode || 'cash', receipt_no, note || ''),
    c.env.DB.prepare(
      'UPDATE students SET paid_fee = paid_fee + ? WHERE id = ?'
    ).bind(amount, student_id),
  ]);
  return c.json(payment.results[0], 201);
});

// ─── Results ──────────────────────────────────────────────────────────────────

app.get('/api/results', requireAuth, async (c) => {
  const studentId = c.req.query('student_id');
  const p = c.get('jwtPayload') as JwtPayload;

  let sql = `SELECT r.*, s.name as student_name, s.enrollment_no
             FROM results r LEFT JOIN students s ON r.student_id = s.id`;
  const params: any[] = [];

  if (p.role === 'student') {
    const stu = await c.env.DB.prepare('SELECT id FROM students WHERE user_id = ?').bind(p.sub).first<any>();
    sql += ' WHERE r.student_id = ?'; params.push(stu?.id);
  } else if (studentId) {
    sql += ' WHERE r.student_id = ?'; params.push(studentId);
  }
  sql += ' ORDER BY r.created_at DESC';
  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(result.results);
});

app.post('/api/results', requireAdmin, async (c) => {
  const { student_id, subject, exam_type, marks, max_marks, exam_date } = await c.req.json();
  const res = await c.env.DB.prepare(
    'INSERT INTO results (student_id, subject, exam_type, marks, max_marks, exam_date) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
  ).bind(student_id, subject, exam_type, marks, max_marks, exam_date || null).first();
  return c.json(res, 201);
});

// ─── Notices ──────────────────────────────────────────────────────────────────

app.get('/api/notices', requireAuth, async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM notices ORDER BY created_at DESC').all();
  return c.json(result.results);
});

app.post('/api/notices', requireAdmin, async (c) => {
  const { title, body, type } = await c.req.json();
  const p = c.get('jwtPayload') as JwtPayload;
  const res = await c.env.DB.prepare(
    'INSERT INTO notices (title, body, type, posted_by) VALUES (?, ?, ?, ?) RETURNING *'
  ).bind(title, body, type || 'general', p.sub).first();
  return c.json(res, 201);
});

app.delete('/api/notices/:id', requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM notices WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ─── Notes ────────────────────────────────────────────────────────────────────

app.get('/api/notes', requireAuth, async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT n.*, c.name as course_name FROM notes n LEFT JOIN courses c ON n.course_id = c.id ORDER BY n.created_at DESC'
  ).all();
  return c.json(result.results);
});

app.post('/api/notes', requireAdmin, async (c) => {
  const { title, subject, course_id, description, file_url } = await c.req.json();
  const p = c.get('jwtPayload') as JwtPayload;
  const res = await c.env.DB.prepare(
    'INSERT INTO notes (title, subject, course_id, description, file_url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
  ).bind(title, subject, course_id || null, description || '', file_url || '', p.sub).first();
  return c.json(res, 201);
});

app.delete('/api/notes/:id', requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ─── Timetable ────────────────────────────────────────────────────────────────

app.get('/api/timetable', requireAuth, async (c) => {
  const courseId = c.req.query('course_id');
  let sql = `SELECT t.*, c.name as course_name, f.name as faculty_name
             FROM timetable t
             LEFT JOIN courses c ON t.course_id = c.id
             LEFT JOIN faculty f ON t.faculty_id = f.id`;
  const params: any[] = [];
  if (courseId) { sql += ' WHERE t.course_id = ?'; params.push(courseId); }
  sql += ' ORDER BY t.day, t.time_start';
  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(result.results);
});

app.post('/api/timetable', requireAdmin, async (c) => {
  const { course_id, day, time_start, time_end, subject, faculty_id, room } = await c.req.json();
  const res = await c.env.DB.prepare(
    'INSERT INTO timetable (course_id, day, time_start, time_end, subject, faculty_id, room) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *'
  ).bind(course_id, day, time_start, time_end, subject, faculty_id || null, room || '').first();
  return c.json(res, 201);
});

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

app.get('/api/whatsapp', requireAdmin, async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM whatsapp_logs ORDER BY sent_at DESC LIMIT 100'
  ).all();
  return c.json(result.results);
});

app.post('/api/whatsapp/send', requireAdmin, async (c) => {
  const { recipient, mobile, message } = await c.req.json();
  const to = recipient || mobile;
  if (!to || !message) return c.json({ error: 'recipient and message required' }, 400);

  // In production, integrate with WhatsApp Business API
  const res = await c.env.DB.prepare(
    'INSERT INTO whatsapp_logs (recipient, message, status) VALUES (?, ?, "sent") RETURNING *'
  ).bind(to, message).first();
  return c.json({ ok: true, log: res });
});

app.post('/api/whatsapp/broadcast', requireAdmin, async (c) => {
  const { message, course_id } = await c.req.json();
  if (!message) return c.json({ error: 'message required' }, 400);

  let students: any;
  if (course_id) {
    students = await c.env.DB.prepare('SELECT phone, name FROM students WHERE course_id = ? AND status="active"').bind(course_id).all();
  } else {
    students = await c.env.DB.prepare('SELECT phone, name FROM students WHERE status="active"').all();
  }

  const logs = students.results.filter((s: any) => s.phone).map((s: any) =>
    c.env.DB.prepare('INSERT INTO whatsapp_logs (recipient, message, status) VALUES (?, ?, "sent")').bind(s.phone, message)
  );
  if (logs.length) await c.env.DB.batch(logs);
  return c.json({ ok: true, sent: logs.length });
});

// ─── Reports ──────────────────────────────────────────────────────────────────

app.get('/api/reports', requireAdmin, async (c) => {
  const [feeReport, attReport, resultReport, courseReport] = await Promise.all([
    c.env.DB.prepare(`
      SELECT c.name as course, SUM(s.total_fee) as total, SUM(s.paid_fee) as collected,
             SUM(s.total_fee - s.paid_fee) as pending
      FROM students s LEFT JOIN courses c ON s.course_id = c.id
      GROUP BY s.course_id
    `).all(),
    c.env.DB.prepare(`
      SELECT s.name, s.enrollment_no,
        COUNT(*) as total,
        SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present,
        ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/COUNT(*), 1) as pct
      FROM attendance a LEFT JOIN students s ON a.student_id = s.id
      GROUP BY a.student_id ORDER BY pct
    `).all(),
    c.env.DB.prepare(`
      SELECT s.name, s.enrollment_no, r.subject, r.exam_type,
             r.marks, r.max_marks, ROUND(100.0*r.marks/r.max_marks, 1) as pct
      FROM results r LEFT JOIN students s ON r.student_id = s.id
      ORDER BY pct DESC
    `).all(),
    c.env.DB.prepare(`
      SELECT c.name, c.code, c.enrolled, c.seats,
             ROUND(100.0*c.enrolled/c.seats, 0) as fill_pct, c.fee
      FROM courses c ORDER BY fill_pct DESC
    `).all(),
  ]);

  return c.json({
    fees: feeReport.results,
    attendance: attReport.results,
    results: resultReport.results,
    courses: courseReport.results,
  });
});

// ─── Student Portal ───────────────────────────────────────────────────────────

app.get('/api/student/portal', requireAuth, async (c) => {
  const p = c.get('jwtPayload') as JwtPayload;

  const student = await c.env.DB.prepare(
    `SELECT s.*, c.name as course_name, c.code as course_code
     FROM students s LEFT JOIN courses c ON s.course_id = c.id
     WHERE s.user_id = ?`
  ).bind(p.sub).first<any>();

  if (!student) return c.json({ error: 'Student record not found' }, 404);

  const [attendance, results, notices, fees] = await Promise.all([
    c.env.DB.prepare(
      `SELECT status, COUNT(*) as cnt FROM attendance WHERE student_id = ? GROUP BY status`
    ).bind(student.id).all(),
    c.env.DB.prepare(
      'SELECT * FROM results WHERE student_id = ? ORDER BY created_at DESC LIMIT 10'
    ).bind(student.id).all(),
    c.env.DB.prepare('SELECT * FROM notices ORDER BY created_at DESC LIMIT 5').all(),
    c.env.DB.prepare('SELECT * FROM fees WHERE student_id = ? ORDER BY paid_at DESC').bind(student.id).all(),
  ]);

  const attMap: Record<string, number> = {};
  for (const a of attendance.results as any[]) attMap[a.status] = a.cnt;
  const totalAtt = Object.values(attMap).reduce((s: number, v: any) => s + v, 0);
  const attPct = totalAtt > 0 ? Math.round(((attMap.present || 0) / totalAtt) * 100) : 0;

  return c.json({
    student,
    attendance: { records: attMap, total: totalAtt, percentage: attPct },
    results: results.results,
    notices: notices.results,
    fees: fees.results,
  });
});

// ─── Static Assets Fallback ───────────────────────────────────────────────────

app.get('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

// ─── Export ───────────────────────────────────────────────────────────────────

export default {
  fetch: app.fetch,
};
