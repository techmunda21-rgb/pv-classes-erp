const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('./auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { course_id, search } = req.query;
  let query = `SELECT s.*, c.name as course_name, c.code as course_code FROM students s LEFT JOIN courses c ON c.id = s.course_id WHERE s.status = 'active'`;
  const params = [];
  if (course_id) { query += ' AND s.course_id = ?'; params.push(course_id); }
  if (search) { query += ' AND (s.name LIKE ? OR s.roll_number LIKE ? OR s.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  query += ' ORDER BY s.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const student = db.prepare(`SELECT s.*, c.name as course_name FROM students s LEFT JOIN courses c ON c.id = s.course_id WHERE s.id = ?`).get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

router.post('/', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { name, email, phone, course_id, batch, roll_number, father_name, address, dob } = req.body;
  if (!name || !roll_number) return res.status(400).json({ error: 'Name and roll number required' });
  const result = db.prepare(`INSERT INTO students (name, email, phone, course_id, batch, roll_number, father_name, address, dob) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, email, phone, course_id, batch, roll_number, father_name, address, dob);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Student added' });
});

router.put('/:id', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { name, email, phone, course_id, batch, father_name, address, status } = req.body;
  db.prepare(`UPDATE students SET name=?, email=?, phone=?, course_id=?, batch=?, father_name=?, address=?, status=? WHERE id=?`).run(name, email, phone, course_id, batch, father_name, address, status, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  db.prepare("UPDATE students SET status = 'inactive' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
