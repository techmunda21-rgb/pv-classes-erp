const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../pv-classes.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    seedData();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      duration TEXT,
      fee INTEGER DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      subject TEXT,
      qualification TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      roll_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      course_id INTEGER REFERENCES courses(id),
      batch TEXT,
      father_name TEXT,
      address TEXT,
      dob TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'present',
      course_id INTEGER REFERENCES courses(id),
      marked_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, date, course_id)
    );

    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      amount INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      receipt_number TEXT UNIQUE NOT NULL,
      payment_mode TEXT DEFAULT 'cash',
      remarks TEXT,
      collected_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      course_id INTEGER REFERENCES courses(id),
      subject TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      marks_obtained INTEGER,
      total_marks INTEGER,
      exam_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      priority TEXT DEFAULT 'normal',
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT,
      course_id INTEGER REFERENCES courses(id),
      file_name TEXT,
      file_url TEXT,
      description TEXT,
      uploaded_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id),
      day TEXT NOT NULL,
      subject TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      faculty_id INTEGER REFERENCES faculty(id),
      room TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      sent_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedData() {
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (adminExists) return;

  const adminPass = bcrypt.hashSync('admin123', 10);
  const studentPass = bcrypt.hashSync('student123', 10);

  // Admin user
  db.prepare('INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)').run(
    'Keshav Purohit', 'keshavpurohit@gmail.com', adminPass, 'admin', '9876543210'
  );

  // Courses
  const courses = [
    { name: 'NEET 2024', code: 'NEET-24', duration: '1 Year', fee: 85000, description: 'Medical entrance preparation' },
    { name: 'JEE 2024', code: 'JEE-24', duration: '1 Year', fee: 80000, description: 'Engineering entrance preparation' },
    { name: 'SSC 2024', code: 'SSC-24', duration: '6 Months', fee: 35000, description: 'SSC CGL/CHSL preparation' },
    { name: 'UPSC 2024', code: 'UPSC-24', duration: '18 Months', fee: 120000, description: 'Civil services preparation' },
  ];
  const insertCourse = db.prepare('INSERT INTO courses (name, code, duration, fee, description) VALUES (?, ?, ?, ?, ?)');
  courses.forEach(c => insertCourse.run(c.name, c.code, c.duration, c.fee, c.description));

  // Faculty
  const faculty = [
    { name: 'Dr. Ramesh Sharma', email: 'ramesh@pvclasses.in', phone: '9811111111', subject: 'Physics', qualification: 'Ph.D Physics' },
    { name: 'Prof. Sunita Verma', email: 'sunita@pvclasses.in', phone: '9822222222', subject: 'Chemistry', qualification: 'M.Sc Chemistry' },
    { name: 'Rajiv Gupta', email: 'rajiv@pvclasses.in', phone: '9833333333', subject: 'Mathematics', qualification: 'M.Tech' },
    { name: 'Priya Singh', email: 'priya@pvclasses.in', phone: '9844444444', subject: 'Biology', qualification: 'M.Sc Biology' },
  ];
  const insertFaculty = db.prepare('INSERT INTO faculty (name, email, phone, subject, qualification) VALUES (?, ?, ?, ?, ?)');
  faculty.forEach(f => insertFaculty.run(f.name, f.email, f.phone, f.subject, f.qualification));

  // Students + their user accounts
  const studentData = [
    { name: 'Arjun Kumar', email: 'arjun@pvclasses.in', roll: 'PV2024001', course_id: 1, batch: 'Morning', phone: '9800000001' },
    { name: 'Priya Sharma', email: 'priya.s@pvclasses.in', roll: 'PV2024002', course_id: 1, batch: 'Morning', phone: '9800000002' },
    { name: 'Rahul Singh', email: 'rahul@pvclasses.in', roll: 'PV2024003', course_id: 2, batch: 'Evening', phone: '9800000003' },
    { name: 'Sneha Patel', email: 'sneha@pvclasses.in', roll: 'PV2024004', course_id: 2, batch: 'Morning', phone: '9800000004' },
    { name: 'Amit Yadav', email: 'amit@pvclasses.in', roll: 'PV2024005', course_id: 3, batch: 'Morning', phone: '9800000005' },
    { name: 'Neha Gupta', email: 'neha@pvclasses.in', roll: 'PV2024006', course_id: 3, batch: 'Evening', phone: '9800000006' },
    { name: 'Vikash Mishra', email: 'vikash@pvclasses.in', roll: 'PV2024007', course_id: 4, batch: 'Morning', phone: '9800000007' },
    { name: 'Kavya Reddy', email: 'kavya@pvclasses.in', roll: 'PV2024008', course_id: 4, batch: 'Evening', phone: '9800000008' },
  ];

  const insertUser = db.prepare('INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)');
  const insertStudent = db.prepare('INSERT INTO students (user_id, roll_number, name, email, phone, course_id, batch) VALUES (?, ?, ?, ?, ?, ?, ?)');

  studentData.forEach((s, i) => {
    const user = insertUser.run(s.name, s.email, studentPass, 'student', s.phone);
    insertStudent.run(user.lastInsertRowid, s.roll, s.name, s.email, s.phone, s.course_id, s.batch);
    // Fee records
    db.prepare('INSERT INTO fees (student_id, amount, payment_date, receipt_number, payment_mode) VALUES (?, ?, ?, ?, ?)').run(
      i + 1, 42500, '2024-01-15', `RCP-00${i + 1}`, 'online'
    );
  });

  // Notices
  const insertNotice = db.prepare('INSERT INTO notices (title, content, category, priority, created_by) VALUES (?, ?, ?, ?, ?)');
  insertNotice.run('Welcome to PV Classes 2024 Batch!', 'We are delighted to welcome all new students to PV Classes. Classes begin January 15, 2024.', 'general', 'high', 1);
  insertNotice.run('NEET Mock Test Schedule', 'Monthly mock tests will be held every last Sunday. First test: January 28, 2024.', 'exam', 'normal', 1);
  insertNotice.run('Fee Payment Reminder', 'Second installment due by February 15. Late fee of ₹500 after due date.', 'fees', 'high', 1);

  // Timetable
  const insertTT = db.prepare('INSERT INTO timetable (course_id, day, subject, start_time, end_time, faculty_id, room) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertTT.run(1, 'Monday', 'Physics', '08:00', '10:00', 1, 'Room 101');
  insertTT.run(1, 'Monday', 'Chemistry', '10:00', '12:00', 2, 'Room 101');
  insertTT.run(1, 'Tuesday', 'Biology', '08:00', '10:00', 4, 'Room 101');
  insertTT.run(2, 'Monday', 'Physics', '14:00', '16:00', 1, 'Room 102');
  insertTT.run(2, 'Monday', 'Mathematics', '16:00', '18:00', 3, 'Room 102');

  // Notes
  db.prepare('INSERT INTO notes (title, subject, course_id, description, uploaded_by) VALUES (?, ?, ?, ?, ?)').run(
    'Physics Chapter 1 - Motion', 'Physics', 1, 'Complete notes on laws of motion with solved examples', 1
  );
  db.prepare('INSERT INTO notes (title, subject, course_id, description, uploaded_by) VALUES (?, ?, ?, ?, ?)').run(
    'Organic Chemistry Basics', 'Chemistry', 1, 'Nomenclature and reactions of organic compounds', 1
  );

  // Results
  db.prepare('INSERT INTO results (student_id, course_id, subject, exam_type, marks_obtained, total_marks, exam_date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(1, 1, 'Physics', 'Unit Test 1', 87, 100, '2024-02-10');
  db.prepare('INSERT INTO results (student_id, course_id, subject, exam_type, marks_obtained, total_marks, exam_date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(1, 1, 'Chemistry', 'Unit Test 1', 79, 100, '2024-02-10');

  console.log('✅ Database seeded successfully');
}

module.exports = { getDb };
