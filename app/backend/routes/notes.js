const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('./auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { course_id } = req.query;
  let query = 'SELECT n.*, c.name as course_name FROM notes n LEFT JOIN courses c ON c.id = n.course_id WHERE 1=1';
  const params = [];
  if (course_id) { query += ' AND n.course_id = ?'; params.push(course_id); }
  query += ' ORDER BY n.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { title, subject, course_id, description } = req.body;
  const result = db.prepare('INSERT INTO notes (title, subject, course_id, description, uploaded_by) VALUES (?, ?, ?, ?, ?)').run(title, subject, course_id, description, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/:id', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
