const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('./auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { student_id, course_id } = req.query;
  let query = `SELECT r.*, s.name as student_name, s.roll_number, c.name as course_name FROM results r JOIN students s ON s.id = r.student_id JOIN courses c ON c.id = r.course_id WHERE 1=1`;
  const params = [];
  if (student_id) { query += ' AND r.student_id = ?'; params.push(student_id); }
  if (course_id) { query += ' AND r.course_id = ?'; params.push(course_id); }
  query += ' ORDER BY r.exam_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { student_id, course_id, subject, exam_type, marks_obtained, total_marks, exam_date } = req.body;
  const result = db.prepare('INSERT INTO results (student_id, course_id, subject, exam_type, marks_obtained, total_marks, exam_date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(student_id, course_id, subject, exam_type, marks_obtained, total_marks, exam_date);
  res.status(201).json({ id: result.lastInsertRowid });
});

module.exports = router;
