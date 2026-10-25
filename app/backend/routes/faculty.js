const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('./auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  res.json(db.prepare('SELECT * FROM faculty ORDER BY name').all());
});

router.post('/', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { name, email, phone, subject, qualification } = req.body;
  const result = db.prepare('INSERT INTO faculty (name, email, phone, subject, qualification) VALUES (?, ?, ?, ?, ?)').run(name, email, phone, subject, qualification);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { name, email, phone, subject, qualification } = req.body;
  db.prepare('UPDATE faculty SET name=?, email=?, phone=?, subject=?, qualification=? WHERE id=?').run(name, email, phone, subject, qualification, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  db.prepare('DELETE FROM faculty WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
