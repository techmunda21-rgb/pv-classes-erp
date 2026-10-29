-- ============================================================
-- PV Classes ERP — Super Admin Seed
-- Run AFTER 001_init.sql
-- ============================================================

-- Roles
INSERT OR IGNORE INTO roles (id, name, permissions) VALUES
  (1, 'admin',   '["*"]'),
  (2, 'teacher', '["students:read","attendance:write","results:write","timetable:read","notifications:write"]'),
  (3, 'staff',   '["students:read","fees:write","documents:write","notifications:read"]'),
  (4, 'parent',  '["students:read:own","fees:read:own","results:read:own","attendance:read:own","notifications:read"]'),
  (5, 'student', '["results:read:own","timetable:read","notifications:read"]');

-- Super Admin — Sourabh Vyas
-- Password: PVClasses@Admin2027!
-- Hash algorithm: PBKDF2-SHA256, 100,000 iterations, 16-byte salt
INSERT OR IGNORE INTO users (uid, role_id, name, email, phone, password_hash, is_active) VALUES (
  'usr_superadmin_001',
  1,
  'Sourabh Vyas',
  'sourabh@pvclasses.in',
  '9000000001',
  'c01f7fc36badca99b4f2391f18e6be1b:6761e3dac59e2cb98cbf7253afcb87cb9ce26bf7547c616027ef10bea97f56d3',
  1
);

-- Default academic year
INSERT OR IGNORE INTO academic_years (name, start_date, end_date, is_current) VALUES
  ('2026-27', '2026-04-01', '2027-03-31', 1);
