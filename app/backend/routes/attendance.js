const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('./auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { date, course_id, student_id } = req.query;
  let query = `SELECT a.*, s.name as student_name, s.roll_number, c.name as course_name FROM attendance a JOIN students s ON s.id = a.student_id LEFT JOIN courses c ON c.id = a.course_id WHERE 1=1`;
  const params = [];
  if (date) { query += ' AND a.date = ?'; params.push(date); }
  if (course_id) { query += ' AND a.course_id = ?'; params.push(course_id); }
  if (student_id) { query += ' AND a.student_id = ?'; params.push(student_id); }
  query += ' ORDER BY a.date DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/summary/:student_id', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM attendance WHERE student_id = ?').get(req.params.student_id).c;
  const present = db.prepare("SELECT COUNT(*) as c FROM attendance WHERE student_id = ? AND status = 'present'").get(req.params.student_id).c;
  res.json({ total, present, absent: total - present, percentage: total ? Math.round((present / total) * 100) : 0 });
});

router.post('/batch', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { records, date, course_id } = req.body;
  const insert = db.prepare('INSERT OR REPLACE INTO attendance (student_id, date, status, course_id, marked_by) VALUES (?, ?, ?, ?, ?)');
  const insertMany = db.transaction((recs) => {
    for (const r of recs) insert.run(r.student_id, date, r.status, course_id, req.user.id);
  });
  insertMany(records);
  res.json({ message: `Attendance marked for ${records.length} students` });
});

module.exports = router;
