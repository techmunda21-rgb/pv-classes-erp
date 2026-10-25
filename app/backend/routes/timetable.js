const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('./auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { course_id } = req.query;
  let query = `SELECT t.*, c.name as course_name, f.name as faculty_name FROM timetable t LEFT JOIN courses c ON c.id = t.course_id LEFT JOIN faculty f ON f.id = t.faculty_id WHERE 1=1`;
  const params = [];
  if (course_id) { query += ' AND t.course_id = ?'; params.push(course_id); }
  query += ' ORDER BY CASE t.day WHEN "Monday" THEN 1 WHEN "Tuesday" THEN 2 WHEN "Wednesday" THEN 3 WHEN "Thursday" THEN 4 WHEN "Friday" THEN 5 WHEN "Saturday" THEN 6 ELSE 7 END, t.start_time';
  res.json(db.prepare(query).all(...params));
});

router.post('/', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { course_id, day, subject, start_time, end_time, faculty_id, room } = req.body;
  const result = db.prepare('INSERT INTO timetable (course_id, day, subject, start_time, end_time, faculty_id, room) VALUES (?, ?, ?, ?, ?, ?, ?)').run(course_id, day, subject, start_time, end_time, faculty_id, room);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/:id', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  db.prepare('DELETE FROM timetable WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
