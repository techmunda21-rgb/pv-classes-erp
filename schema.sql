-- PV Classes ERP - D1 Database Schema
-- Run: wrangler d1 execute pv-classes-db --file=schema.sql

PRAGMA foreign_keys = ON;

-- Users table (admin + students login)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','student')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  duration TEXT NOT NULL,
  fee REAL NOT NULL,
  seats INTEGER DEFAULT 50,
  enrolled INTEGER DEFAULT 0,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Faculty
CREATE TABLE IF NOT EXISTS faculty (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  qualification TEXT,
  joined_at TEXT DEFAULT (datetime('now'))
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  enrollment_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  course_id INTEGER REFERENCES courses(id),
  batch TEXT NOT NULL,
  total_fee REAL NOT NULL,
  paid_fee REAL DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','passed')),
  joined_at TEXT DEFAULT (datetime('now'))
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER REFERENCES students(id),
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('present','absent','late')),
  subject TEXT,
  marked_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(student_id, date, subject)
);

-- Fees / Payments
CREATE TABLE IF NOT EXISTS fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER REFERENCES students(id),
  amount REAL NOT NULL,
  mode TEXT DEFAULT 'cash' CHECK(mode IN ('cash','upi','bank','card')),
  receipt_no TEXT UNIQUE,
  note TEXT,
  paid_at TEXT DEFAULT (datetime('now'))
);

-- Results / Marks
CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER REFERENCES students(id),
  subject TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  marks REAL NOT NULL,
  max_marks REAL NOT NULL,
  exam_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Notices
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK(type IN ('general','urgent','exam','holiday')),
  posted_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Study Notes
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  course_id INTEGER REFERENCES courses(id),
  file_url TEXT,
  description TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Timetable
CREATE TABLE IF NOT EXISTS timetable (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER REFERENCES courses(id),
  day TEXT NOT NULL,
  time_start TEXT NOT NULL,
  time_end TEXT NOT NULL,
  subject TEXT NOT NULL,
  faculty_id INTEGER REFERENCES faculty(id),
  room TEXT
);

-- WhatsApp logs
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- Seed Data
-- ============================================================

-- Admin user (password: admin123 → bcrypt would be used in prod; using sha256 placeholder)
INSERT OR IGNORE INTO users (email, password_hash, name, role) VALUES
  ('keshavpurohit@gmail.com', 'admin123', 'Keshav Purohit', 'admin');

-- Student users
INSERT OR IGNORE INTO users (email, password_hash, name, role) VALUES
  ('arjun@pvclasses.in',  'student123', 'Arjun Sharma',  'student'),
  ('priya@pvclasses.in',  'student123', 'Priya Patel',   'student'),
  ('rahul@pvclasses.in',  'student123', 'Rahul Verma',   'student'),
  ('neha@pvclasses.in',   'student123', 'Neha Singh',    'student'),
  ('amit@pvclasses.in',   'student123', 'Amit Kumar',    'student'),
  ('sunita@pvclasses.in', 'student123', 'Sunita Yadav',  'student'),
  ('vikram@pvclasses.in', 'student123', 'Vikram Joshi',  'student'),
  ('meera@pvclasses.in',  'student123', 'Meera Gupta',   'student');

-- Courses
INSERT OR IGNORE INTO courses (name, code, duration, fee, seats, enrolled) VALUES
  ('NEET Preparation 2024', 'NEET-24', '12 months', 45000, 60, 38),
  ('JEE Advanced 2024',     'JEE-24',  '12 months', 50000, 60, 28),
  ('SSC CGL 2024',          'SSC-24',  '6 months',  18000, 80, 24),
  ('UPSC Foundation',       'UPSC-24', '18 months', 65000, 40, 18);

-- Faculty
INSERT OR IGNORE INTO faculty (name, subject, email, phone, qualification) VALUES
  ('Dr. Ramesh Sharma',  'Physics & Chemistry', 'ramesh@pvclasses.in',  '9876543210', 'PhD Physics'),
  ('Prof. Anita Gupta',  'Mathematics',         'anita@pvclasses.in',   '9876543211', 'M.Sc Mathematics'),
  ('Mr. Suresh Verma',   'Biology',             'suresh@pvclasses.in',  '9876543212', 'M.Sc Biology'),
  ('Ms. Kavita Joshi',   'General Studies',     'kavita@pvclasses.in',  '9876543213', 'MA Political Science');

-- Students
INSERT OR IGNORE INTO students (user_id, enrollment_no, name, email, phone, course_id, batch, total_fee, paid_fee, status) VALUES
  (2, 'PV-2024-001', 'Arjun Sharma',  'arjun@pvclasses.in',  '9111111111', 1, 'Batch A', 45000, 45000, 'active'),
  (3, 'PV-2024-002', 'Priya Patel',   'priya@pvclasses.in',  '9111111112', 1, 'Batch A', 45000, 30000, 'active'),
  (4, 'PV-2024-003', 'Rahul Verma',   'rahul@pvclasses.in',  '9111111113', 2, 'Batch B', 50000, 50000, 'active'),
  (5, 'PV-2024-004', 'Neha Singh',    'neha@pvclasses.in',   '9111111114', 2, 'Batch B', 50000, 25000, 'active'),
  (6, 'PV-2024-005', 'Amit Kumar',    'amit@pvclasses.in',   '9111111115', 3, 'Batch C', 18000, 18000, 'active'),
  (7, 'PV-2024-006', 'Sunita Yadav',  'sunita@pvclasses.in', '9111111116', 3, 'Batch C', 18000, 12000, 'active'),
  (8, 'PV-2024-007', 'Vikram Joshi',  'vikram@pvclasses.in', '9111111117', 4, 'Batch D', 65000, 65000, 'active'),
  (9, 'PV-2024-008', 'Meera Gupta',   'meera@pvclasses.in',  '9111111118', 4, 'Batch D', 65000, 32500, 'active');

-- Notices
INSERT OR IGNORE INTO notices (title, body, type) VALUES
  ('NEET Mock Test Schedule', 'Next mock test on Nov 5th. Syllabus: Physics Ch 1-8, Chemistry Org Ch 1-5.', 'exam'),
  ('Holiday Notice - Diwali', 'Institute closed Oct 31 - Nov 3. Classes resume Nov 4 at 7 AM.', 'holiday'),
  ('Fee Reminder', 'Last date to pay pending fees: Oct 30. Contact admin to avoid late charges.', 'urgent'),
  ('New Study Material', 'JEE Advanced 2024 practice sets uploaded. Check Study Notes section.', 'general');

-- Timetable
INSERT OR IGNORE INTO timetable (course_id, day, time_start, time_end, subject, faculty_id, room) VALUES
  (1, 'Monday',    '07:00', '08:30', 'Physics',   1, 'Room 1'),
  (1, 'Monday',    '08:30', '10:00', 'Chemistry', 1, 'Room 1'),
  (1, 'Monday',    '10:30', '12:00', 'Biology',   3, 'Room 2'),
  (2, 'Monday',    '07:00', '09:00', 'Maths',     2, 'Room 3'),
  (2, 'Monday',    '09:00', '11:00', 'Physics',   1, 'Room 3'),
  (1, 'Tuesday',   '07:00', '08:30', 'Biology',   3, 'Room 1'),
  (1, 'Tuesday',   '08:30', '10:00', 'Physics',   1, 'Room 1'),
  (2, 'Tuesday',   '07:00', '09:00', 'Chemistry', 1, 'Room 3'),
  (3, 'Wednesday', '09:00', '11:00', 'Gen Studies',4,'Room 4'),
  (4, 'Wednesday', '07:00', '09:00', 'History',   4, 'Room 2');

-- Study Notes
INSERT OR IGNORE INTO notes (title, subject, course_id, description) VALUES
  ('Physics Mechanics Complete Notes', 'Physics',   1, 'Comprehensive notes covering Newton Laws, Kinematics, Energy'),
  ('Organic Chemistry Reactions',      'Chemistry', 1, 'All named reactions with mechanisms for NEET/JEE'),
  ('Maths Calculus Shortcuts',         'Maths',     2, 'JEE-focused calculus tricks and shortcuts'),
  ('Current Affairs Oct 2024',         'GS',        3, 'Monthly current affairs digest for SSC/UPSC');

-- Sample attendance (for student 1)
INSERT OR IGNORE INTO attendance (student_id, date, status, subject) VALUES
  (1, '2024-10-01', 'present', 'Physics'),
  (1, '2024-10-01', 'present', 'Chemistry'),
  (1, '2024-10-02', 'present', 'Biology'),
  (1, '2024-10-03', 'absent',  'Physics'),
  (1, '2024-10-04', 'present', 'Chemistry'),
  (1, '2024-10-07', 'late',    'Biology'),
  (1, '2024-10-08', 'present', 'Physics'),
  (2, '2024-10-01', 'present', 'Physics'),
  (2, '2024-10-02', 'absent',  'Biology'),
  (2, '2024-10-03', 'present', 'Chemistry');

-- Sample results
INSERT OR IGNORE INTO results (student_id, subject, exam_type, marks, max_marks, exam_date) VALUES
  (1, 'Physics',   'Unit Test 1', 87, 100, '2024-09-15'),
  (1, 'Chemistry', 'Unit Test 1', 92, 100, '2024-09-16'),
  (1, 'Biology',   'Unit Test 1', 78, 100, '2024-09-17'),
  (1, 'Physics',   'Mock Test 1', 145, 180, '2024-10-01'),
  (2, 'Physics',   'Unit Test 1', 72, 100, '2024-09-15'),
  (2, 'Chemistry', 'Unit Test 1', 68, 100, '2024-09-16'),
  (3, 'Maths',     'Unit Test 1', 95, 100, '2024-09-15'),
  (3, 'Physics',   'Unit Test 1', 88, 100, '2024-09-16');

-- Sample fee payments
INSERT OR IGNORE INTO fees (student_id, amount, mode, receipt_no, note) VALUES
  (1, 45000, 'upi',  'RCP-001', 'Full payment'),
  (2, 30000, 'bank', 'RCP-002', 'Partial payment'),
  (3, 50000, 'cash', 'RCP-003', 'Full payment'),
  (4, 25000, 'upi',  'RCP-004', 'Installment 1'),
  (5, 18000, 'card', 'RCP-005', 'Full payment'),
  (6, 12000, 'cash', 'RCP-006', 'Partial payment'),
  (7, 65000, 'bank', 'RCP-007', 'Full payment'),
  (8, 32500, 'upi',  'RCP-008', 'Installment 1');
