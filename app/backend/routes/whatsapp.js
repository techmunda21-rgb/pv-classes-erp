const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('./auth');

router.get('/logs', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  res.json(db.prepare('SELECT * FROM whatsapp_logs ORDER BY created_at DESC LIMIT 50').all());
});

router.post('/send', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { recipient, message } = req.body;
  // Simulate WhatsApp send (integrate with Twilio/WhatsApp Business API in production)
  const result = db.prepare('INSERT INTO whatsapp_logs (recipient, message, status, sent_by) VALUES (?, ?, ?, ?)').run(recipient, message, 'sent', req.user.id);
  res.json({ id: result.lastInsertRowid, status: 'sent', message: 'Message logged (connect WhatsApp Business API for live delivery)' });
});

router.post('/broadcast', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  const { message, course_id } = req.body;
  let students;
  if (course_id) {
    students = db.prepare('SELECT phone, name FROM students WHERE course_id = ? AND status = ? AND phone IS NOT NULL').all(course_id, 'active');
  } else {
    students = db.prepare("SELECT phone, name FROM students WHERE status = 'active' AND phone IS NOT NULL").all();
  }
  const insert = db.prepare('INSERT INTO whatsapp_logs (recipient, message, status, sent_by) VALUES (?, ?, ?, ?)');
  const insertMany = db.transaction((list) => {
    for (const s of list) insert.run(s.phone, message, 'sent', req.user.id);
  });
  insertMany(students);
  res.json({ sent: students.length, message: `Broadcast queued to ${students.length} recipients` });
});

module.exports = router;
