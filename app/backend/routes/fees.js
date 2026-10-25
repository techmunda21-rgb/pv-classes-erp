const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('./auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const fees = db.prepare(`SELECT f.*, s.name as student_name, s.roll_number FROM fees f JOIN students s ON s.id = f.student_id ORDER BY f.created_at DESC`).all();
  res.json(fees);
});

router.get('/student/:student_id', authMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  res.json(db.prepare('SELECT * FROM fees WHERE student_id = ? ORDER BY payment_date DESC').all(req.params.student_id));
});

router.post('/', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { student_id, amount, payment_date, payment_mode, remarks } = req.body;
  const receipt = 'RCP-' + Date.now();
  const result = db.prepare('INSERT INTO fees (student_id, amount, payment_date, receipt_number, payment_mode, remarks, collected_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(student_id, amount, payment_date, receipt, payment_mode, remarks, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, receipt_number: receipt });
});

module.exports = router;
