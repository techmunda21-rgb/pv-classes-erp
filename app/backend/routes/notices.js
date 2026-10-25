const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('./auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  res.json(db.prepare('SELECT * FROM notices ORDER BY created_at DESC').all());
});

router.post('/', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { title, content, category, priority } = req.body;
  const result = db.prepare('INSERT INTO notices (title, content, category, priority, created_by) VALUES (?, ?, ?, ?, ?)').run(title, content, category || 'general', priority || 'normal', req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/:id', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  db.prepare('DELETE FROM notices WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
