-- ============================================================
-- PV Classes ERP — D1 Database Schema v1.0
-- Cloudflare D1 (SQLite-compatible)
-- Author: Techmunda | Founder: Sourabh Vyas, PV Classes, Jodhpur
-- ============================================================

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ─── ROLES & PERMISSIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,          -- admin | teacher | staff | parent | student
  permissions TEXT NOT NULL DEFAULT '[]',   -- JSON array of permission keys
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uid          TEXT NOT NULL UNIQUE,         -- UUID
  role_id      INTEGER NOT NULL REFERENCES roles(id),
  name         TEXT NOT NULL,
  email        TEXT UNIQUE,
  phone        TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_key   TEXT,                         -- R2 object key
  is_active    INTEGER NOT NULL DEFAULT 1,
  last_login   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_uid   ON users(uid);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);

-- ─── SESSIONS (KV-backed but audit trail in D1) ─────────────
CREATE TABLE IF NOT EXISTS sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  device     TEXT,
  ip         TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── ACADEMIC YEARS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_years (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  label      TEXT NOT NULL UNIQUE,  -- e.g. "2026-27"
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── BATCHES / COURSES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS batches (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  name            TEXT NOT NULL,    -- "JEE Mains 2027", "NEET Dropper"
  code            TEXT NOT NULL UNIQUE,
  stream          TEXT,             -- Science | Commerce | Arts
  max_students    INTEGER DEFAULT 60,
  fee_total       REAL NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── STUDENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER UNIQUE REFERENCES users(id),
  roll_no         TEXT NOT NULL UNIQUE,
  batch_id        INTEGER NOT NULL REFERENCES batches(id),
  name            TEXT NOT NULL,
  dob             TEXT,
  gender          TEXT CHECK(gender IN ('M','F','O')),
  father_name     TEXT,
  mother_name     TEXT,
  guardian_phone  TEXT NOT NULL,
  address         TEXT,
  city            TEXT DEFAULT 'Jodhpur',
  state           TEXT DEFAULT 'Rajasthan',
  aadhaar_last4   TEXT,
  school_name     TEXT,
  board           TEXT,             -- CBSE | RBSE | ICSE
  photo_key       TEXT,             -- R2 object key
  docs_folder_key TEXT,             -- R2 prefix for documents
  enroll_date     TEXT NOT NULL DEFAULT (date('now')),
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_students_roll    ON students(roll_no);
CREATE INDEX idx_students_batch   ON students(batch_id);
CREATE INDEX idx_students_phone   ON students(guardian_phone);

-- ─── SUBJECTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  name     TEXT NOT NULL,
  code     TEXT NOT NULL,
  teacher_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── ATTENDANCE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id  INTEGER NOT NULL REFERENCES students(id),
  subject_id  INTEGER NOT NULL REFERENCES subjects(id),
  date        TEXT NOT NULL,        -- ISO date YYYY-MM-DD
  status      TEXT NOT NULL CHECK(status IN ('P','A','L','H')),  -- Present|Absent|Late|Holiday
  marked_by   INTEGER REFERENCES users(id),
  remark      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, subject_id, date)
);
CREATE INDEX idx_att_student ON attendance(student_id, date);
CREATE INDEX idx_att_subject ON attendance(subject_id, date);

-- ─── FEE STRUCTURE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_installments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id    INTEGER NOT NULL REFERENCES batches(id),
  label       TEXT NOT NULL,        -- "Admission Fee", "1st Installment"
  amount      REAL NOT NULL,
  due_date    TEXT NOT NULL,
  is_optional INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── FEE PAYMENTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_payments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  txn_id         TEXT NOT NULL UNIQUE,   -- UUID
  student_id     INTEGER NOT NULL REFERENCES students(id),
  installment_id INTEGER REFERENCES fee_installments(id),
  amount_paid    REAL NOT NULL,
  discount       REAL NOT NULL DEFAULT 0,
  mode           TEXT NOT NULL CHECK(mode IN ('cash','upi','bank','cheque','online')),
  upi_ref        TEXT,
  cheque_no      TEXT,
  receipt_no     TEXT NOT NULL UNIQUE,
  paid_at        TEXT NOT NULL DEFAULT (datetime('now')),
  collected_by   INTEGER REFERENCES users(id),
  receipt_key    TEXT,              -- R2 key for generated PDF receipt
  notes          TEXT
);
CREATE INDEX idx_fee_student ON fee_payments(student_id);
CREATE INDEX idx_fee_txn     ON fee_payments(txn_id);

-- ─── FEE DUES VIEW ──────────────────────────────────────────
CREATE VIEW IF NOT EXISTS fee_dues AS
SELECT
  s.id           AS student_id,
  s.name         AS student_name,
  s.roll_no,
  fi.id          AS installment_id,
  fi.label,
  fi.amount,
  fi.due_date,
  COALESCE(SUM(fp.amount_paid - fp.discount), 0) AS paid,
  fi.amount - COALESCE(SUM(fp.amount_paid - fp.discount), 0) AS due
FROM fee_installments fi
JOIN batches b ON fi.batch_id = b.id
JOIN students s ON s.batch_id = b.id
LEFT JOIN fee_payments fp ON fp.student_id = s.id AND fp.installment_id = fi.id
GROUP BY s.id, fi.id;

-- ─── EXAMS & RESULTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id    INTEGER NOT NULL REFERENCES batches(id),
  name        TEXT NOT NULL,
  exam_date   TEXT NOT NULL,
  total_marks INTEGER NOT NULL DEFAULT 100,
  pass_marks  INTEGER NOT NULL DEFAULT 35,
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS results (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id     INTEGER NOT NULL REFERENCES exams(id),
  student_id  INTEGER NOT NULL REFERENCES students(id),
  subject_id  INTEGER NOT NULL REFERENCES subjects(id),
  marks       REAL NOT NULL DEFAULT 0,
  grade       TEXT,                 -- A+ A B C D F
  rank        INTEGER,
  entered_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(exam_id, student_id, subject_id)
);
CREATE INDEX idx_results_exam    ON results(exam_id);
CREATE INDEX idx_results_student ON results(student_id);

-- ─── TIMETABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timetable (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id    INTEGER NOT NULL REFERENCES batches(id),
  subject_id  INTEGER NOT NULL REFERENCES subjects(id),
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  room        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── NOTIFICATIONS / ANNOUNCEMENTS ──────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,        -- announcement|fee_reminder|attendance|result
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  target      TEXT NOT NULL DEFAULT 'all',  -- all|batch:<id>|student:<id>
  channel     TEXT NOT NULL DEFAULT 'whatsapp,push',
  sent_at     TEXT,
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── DOCUMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id  INTEGER NOT NULL REFERENCES students(id),
  type        TEXT NOT NULL,        -- aadhar|tc|marksheet|photo|other
  label       TEXT NOT NULL,
  r2_key      TEXT NOT NULL UNIQUE,
  size_bytes  INTEGER,
  mime        TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── AUDIT LOG ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id),
  action     TEXT NOT NULL,
  table_name TEXT,
  record_id  INTEGER,
  old_data   TEXT,                  -- JSON
  new_data   TEXT,                  -- JSON
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_user   ON audit_log(user_id);
CREATE INDEX idx_audit_table  ON audit_log(table_name, record_id);

-- ─── SEED: DEFAULT ROLES ─────────────────────────────────────
INSERT OR IGNORE INTO roles(name, permissions) VALUES
('admin',   '["*"]'),
('teacher', '["attendance.write","results.write","students.read","timetable.read"]'),
('staff',   '["fees.write","students.write","notifications.write"]'),
('parent',  '["attendance.read.own","fees.read.own","results.read.own"]'),
('student', '["attendance.read.own","results.read.own","timetable.read"]');

-- ─── SEED: ACADEMIC YEAR ─────────────────────────────────────
INSERT OR IGNORE INTO academic_years(label, start_date, end_date, is_current) VALUES
('2026-27', '2026-04-01', '2027-03-31', 1);
