# PV Classes ERP — System Design Document
**Version:** 1.0 | **Launch:** January 2027
**Founder:** Sourabh Vyas, PV Classes, Jodhpur, Rajasthan
**Built by:** Techmunda

---

## 1. Architecture Overview

```
                        ┌──────────────────────────────────┐
                        │        CLOUDFLARE EDGE           │
                        │                                  │
  Students / Parents    │  ┌─────────┐   ┌─────────────┐  │
  ──────────────────►   │  │  Pages  │   │  Workers AI │  │
  Teachers / Staff      │  │(React)  │   │  (optional) │  │
  ──────────────────►   │  └────┬────┘   └─────────────┘  │
  Mobile Apps (RN)      │       │                          │
  ──────────────────►   │  ┌────▼──────────────────────┐  │
                        │  │     Workers API (Hono)    │  │
                        │  │  api.pvclasses.in/*       │  │
                        │  └───┬──────┬────────┬───────┘  │
                        │      │      │        │           │
                        │  ┌───▼──┐ ┌─▼──┐ ┌──▼───┐      │
                        │  │  D1  │ │ KV │ │  R2  │      │
                        │  │ (DB) │ │sess│ │files │      │
                        │  └──────┘ └────┘ └──────┘      │
                        └──────────────────────────────────┘
```

---

## 2. Cloudflare Services Used

| Service | Purpose | Binding |
|---|---|---|
| **Workers** | REST API (Hono framework) | — |
| **D1** | Primary relational database (SQLite) | `DB` |
| **KV** | Sessions + response cache | `SESSIONS`, `CACHE` |
| **R2** | Documents, photos, receipts | `FILES` |
| **Pages** | Web frontend (React/Vite) | — |
| **Turnstile** | Bot protection on login | — |
| **Email Workers** | Transactional emails | — |

---

## 3. API Endpoints

### Auth
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | Login with phone + password |
| POST | `/api/v1/auth/logout` | Auth | Revoke session |
| POST | `/api/v1/auth/refresh` | Auth | Refresh JWT |

### Dashboard
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/v1/dashboard/stats` | Auth | KPI summary (cached 60s) |
| GET | `/api/v1/dashboard/fee-chart` | Auth | Monthly fee trend |
| GET | `/api/v1/dashboard/batch-summary` | Auth | Per-batch breakdown |

### Students
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/students` | List with pagination + search |
| POST | `/api/v1/students` | Enroll new student |
| GET | `/api/v1/students/:id` | Student profile |
| PATCH | `/api/v1/students/:id` | Update details |
| DELETE | `/api/v1/students/:id` | Soft-delete |
| GET | `/api/v1/students/:id/attendance-summary` | Attendance % |

### Fees
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/fees/dues` | Pending dues by batch/student |
| GET | `/api/v1/fees/payments` | Payment history |
| POST | `/api/v1/fees/pay` | Record payment + auto receipt |
| GET | `/api/v1/fees/summary/:studentId` | Fee summary (cached 5m) |

### Attendance
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/attendance/mark` | Bulk mark (all students) |
| GET | `/api/v1/attendance` | Query with filters |
| GET | `/api/v1/attendance/daily-report` | Batch daily summary |

### Results
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/results` | Query by exam/student |
| POST | `/api/v1/results` | Enter marks |
| GET | `/api/v1/results/rank-list/:examId` | Rank list |

### Documents
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/documents/:studentId` | List docs |
| POST | `/api/v1/documents/presign` | Get R2 upload URL |
| POST | `/api/v1/documents/confirm` | Save after upload |
| GET | `/api/v1/documents/download/:id` | Download file |
| DELETE | `/api/v1/documents/:id` | Delete doc + R2 object |

---

## 4. Security Architecture

### 4.1 Authentication
- **JWT** (HMAC-SHA256) with 8h TTL signed with `JWT_SECRET` (Wrangler secret)
- **Session store** in KV: key = `sess:{uid}:{token_suffix}`, TTL = 8h
- **Logout**: deletes KV session → token immediately invalid
- **Refresh**: new token replaces old session key

### 4.2 Authorization (RBAC)
```
admin   → all permissions ("*")
teacher → attendance.write, results.write, students.read, timetable.read
staff   → fees.write, students.write, notifications.write
parent  → *.read.own (own child only)
student → *.read.own
```

### 4.3 Network Security
- **CORS**: strict allowlist (pvclasses.in, app.pvclasses.in, admin.pvclasses.in)
- **Rate limiting**: 10 req/min auth routes; 100 req/min API (KV-based)
- **Secure headers**: HSTS, X-Frame-Options: DENY, CSP, X-Content-Type-Options
- **Cloudflare WAF**: DDoS protection, bot fight mode enabled
- **TLS 1.3** enforced at Cloudflare edge

### 4.4 Password Security
- **PBKDF2** (SHA-256, 100,000 iterations) via SubtleCrypto
- 16-byte random salt stored with hash
- No plaintext passwords ever stored or logged

### 4.5 Data Security
- **R2 files**: never publicly accessible; served through Worker with auth check
- **Audit log**: every write operation logged with user + old/new data
- **PII masking** in logs (Aadhaar last 4, phone masked in non-prod)

---

## 5. Database Design

### 5.1 Core Tables
```
roles ←── users ←── students ──→ batches ←── academic_years
                               └──→ attendance ──→ subjects
                               └──→ fee_payments ──→ fee_installments
                               └──→ results ──→ exams
                               └──→ documents
```

### 5.2 Performance Indexes
```sql
idx_students_roll     (roll_no)
idx_students_batch    (batch_id)
idx_students_phone    (guardian_phone)
idx_att_student       (student_id, date)
idx_att_subject       (subject_id, date)
idx_fee_student       (student_id)
idx_results_exam      (exam_id)
idx_results_student   (student_id)
idx_audit_user        (user_id)
```

### 5.3 Caching Strategy
| Data | Cache Key | TTL |
|---|---|---|
| Dashboard stats | `dashboard:stats` | 60s |
| Fee summary | `fee_summary:{studentId}` | 5m |
| Batch list | `batches:all` | 10m |
| User session | `sess:{uid}:{suffix}` | 8h |
| Rate limit | `rl:{ip}:{window}` | 60s |

---

## 6. File Storage (R2)

### Folder Structure
```
pv-erp-files/
├── students/
│   └── {studentId}/
│       ├── photo/         ← Profile photo
│       ├── aadhar/        ← Aadhaar card
│       ├── tc/            ← Transfer certificate
│       ├── marksheet/     ← Previous marksheets
│       └── other/
├── receipts/
│   └── {year}/
│       └── {receiptNo}.pdf
├── results/
│   └── {batchId}/{examId}/
│       └── rank-list.pdf
└── notices/
    └── {noticeId}/
```

### Upload Flow
```
Client → POST /documents/presign → Worker validates → returns {r2_key}
Client → PUT file bytes → R2 via pre-signed URL
Client → POST /documents/confirm → Worker checks R2.head(key) → saves to D1
```

---

## 7. Notification System

### WhatsApp (Meta Cloud API)
- **Attendance absent alert**: auto-triggered on `POST /attendance/mark` for absent students
- **Fee reminder**: cron job (Workers Cron Trigger) every Monday 9 AM
- **Receipt**: sent instantly on fee payment
- **Result published**: batch broadcast when exam results entered

### Cron Triggers (wrangler.toml)
```toml
[triggers]
crons = [
  "0 9 * * 1",      # Monday 9 AM — fee reminder
  "0 18 * * *",     # Daily 6 PM — attendance summary to admin
  "0 8 * * 6",      # Saturday 8 AM — weekly report
]
```

---

## 8. Frontend (Pages)

### Tech Stack
- **React 18** + **Vite** + **TypeScript**
- **TanStack Query** — API state management + caching
- **React Router v6** — SPA routing
- **shadcn/ui + Tailwind** — UI components
- **React Hook Form + Zod** — forms + validation

### Pages
```
/login
/dashboard          ← KPI cards, charts, quick actions
/students           ← List, search, filter
/students/new       ← Enrollment form
/students/:id       ← Profile, docs, attendance, fee
/attendance         ← Mark daily attendance
/fees               ← Dues list, collect payment
/fees/receipt/:id   ← Print receipt
/results            ← Enter/view marks, rank list
/batches            ← Manage batches/courses
/timetable          ← Weekly schedule
/notifications      ← Send announcements
/documents          ← Document vault
/settings           ← Profile, roles, year config
```

---

## 9. Mobile App (React Native)

### Targets
- Android (Play Store) + iOS (App Store)
- **Expo SDK 52** + **Expo Router**

### Features by Role
| Feature | Admin | Teacher | Staff | Parent | Student |
|---|---|---|---|---|---|
| Dashboard | ✅ Full | ✅ | ✅ | ✅ Own | ✅ Own |
| Attendance | ✅ | ✅ Mark | View | View own | View own |
| Fees | ✅ | — | ✅ Collect | View own | View own |
| Results | ✅ | ✅ Enter | — | View own | View own |
| Notifications | ✅ Send | — | ✅ Send | Receive | Receive |
| Documents | ✅ | — | ✅ Upload | Download | Download |

---

## 10. Deployment Checklist

```bash
# 1. Install Wrangler
npm install -g wrangler
wrangler login

# 2. Create D1 database
wrangler d1 create pv-erp-db
# → copy database_id into wrangler.toml

# 3. Run migrations
wrangler d1 execute pv-erp-db --file=schema/001_init.sql

# 4. Create KV namespaces
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create CACHE
# → copy ids into wrangler.toml

# 5. Create R2 bucket
wrangler r2 bucket create pv-erp-files

# 6. Set secrets
wrangler secret put JWT_SECRET
wrangler secret put WHATSAPP_API_KEY
wrangler secret put RAZORPAY_KEY_ID
wrangler secret put RAZORPAY_KEY_SECRET

# 7. Deploy Worker
cd worker && npm install && wrangler deploy

# 8. Deploy Pages (frontend)
cd frontend && npm run build
wrangler pages deploy dist --project-name=pv-erp-web

# 9. Configure DNS
# api.pvclasses.in → Worker
# pvclasses.in     → Pages
# app.pvclasses.in → Pages (mobile PWA)
```

---

*PV Classes ERP | Crafted by Techmunda | Jodhpur, Rajasthan*
