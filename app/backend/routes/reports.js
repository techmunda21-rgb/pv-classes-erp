const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('./auth');

router.get('/overview', adminMiddleware, (req, res) => {
  const db = req.app.locals.getDb();
  res.json({
    students: {
      total: db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get().c,
      byBatch: db.prepare("SELECT batch, COUNT(*) as count FROM students WHERE status='active' GROUP BY batch").all(),
      byCourse: db.prepare("SELECT c.name as course, COUNT(s.id) as count FROM courses c LEFT JOIN students s ON s.course_id=c.id AND s.status='active' GROUP BY c.id").all(),
    },
    fees: {
      totalCollected: db.prepare('SELECT COALESCE(SUM(amount),0) as s FROM fees').get().s,
      thisMonth: db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM fees WHERE strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')").get().s,
      byMode: db.prepare('SELECT payment_mode, SUM(amount) as total FROM fees GROUP BY payment_mode').all(),
    },
    attendance: {
      avgPercentage: db.prepare(`SELECT ROUND(AVG(pct),1) as avg FROM (SELECT student_id, ROUND(100.0*SUM(CASE WHEN status='present' THEN 1 ELSE 0 END)/COUNT(*),1) as pct FROM attendance GROUP BY student_id)`).get()?.avg || 0,
      today: db.prepare("SELECT COUNT(*) as c FROM attendance WHERE date=date('now') AND status='present'").get().c,
    },
    results: {
      avgMarks: db.prepare('SELECT ROUND(AVG(100.0*marks_obtained/total_marks),1) as avg FROM results WHERE total_marks > 0').get()?.avg || 0,
    },
  });
});

module.exports = router;
