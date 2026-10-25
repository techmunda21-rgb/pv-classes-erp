const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('./auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const courses = db.prepare(`SELECT c.*, COUNT(s.id) as student_count FROM courses c LEFT JOIN students s ON s.course_id = c.id AND s.status = 'active' GROUP BY c.id ORDER BY c.name`).all();
  res.json(courses);
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  res.json(db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id));
});

router.post('/', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { name, code, duration, fee, description } = req.body;
  const result = db.prepare('INSERT INTO courses (name, code, duration, fee, description) VALUES (?, ?, ?, ?, ?)').run(name, code, duration, fee, description);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { name, code, duration, fee, description } = req.body;
  db.prepare('UPDATE courses SET name=?, code=?, duration=?, fee=?, description=? WHERE id=?').run(name, code, duration, fee, description, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
