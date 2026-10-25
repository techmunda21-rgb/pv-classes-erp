const express = require('express');
const cors = require('cors');
const { getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pv-classes-secret-2024';

app.use(cors());
app.use(express.json());

// Make db & JWT_SECRET available to routes
app.locals.JWT_SECRET = JWT_SECRET;
app.locals.getDb = getDb;

// Initialize DB on startup
getDb();

// Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/students', require('../routes/students'));
app.use('/api/courses', require('../routes/courses'));
app.use('/api/faculty', require('../routes/faculty'));
app.use('/api/attendance', require('../routes/attendance'));
app.use('/api/fees', require('../routes/fees'));
app.use('/api/results', require('../routes/results'));
app.use('/api/notices', require('../routes/notices'));
app.use('/api/notes', require('../routes/notes'));
app.use('/api/timetable', require('../routes/timetable'));
app.use('/api/whatsapp', require('../routes/whatsapp'));
app.use('/api/reports', require('../routes/reports'));

// Dashboard stats
app.get('/api/dashboard', require('../routes/auth').authMiddleware, (req, res) => {
  const db = getDb();
  const stats = {
    totalStudents: db.prepare('SELECT COUNT(*) as c FROM students WHERE status = ?').get('active').c,
    totalCourses: db.prepare('SELECT COUNT(*) as c FROM courses').get().c,
    totalFaculty: db.prepare('SELECT COUNT(*) as c FROM faculty').get().c,
    totalRevenue: db.prepare('SELECT COALESCE(SUM(amount), 0) as s FROM fees').get().s,
    recentNotices: db.prepare('SELECT * FROM notices ORDER BY created_at DESC LIMIT 5').all(),
    recentFees: db.prepare(`
      SELECT f.*, s.name as student_name FROM fees f
      JOIN students s ON s.id = f.student_id
      ORDER BY f.created_at DESC LIMIT 5
    `).all(),
    attendanceToday: db.prepare("SELECT COUNT(*) as c FROM attendance WHERE date = date('now') AND status = 'present'").get().c,
  };
  res.json(stats);
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'PV Classes ERP', version: '1.0.0' }));

app.listen(PORT, () => {
  console.log(`🚀 PV Classes API running on http://localhost:${PORT}`);
});

module.exports = app;
