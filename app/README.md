# PV Classes — All-in-One ERP App

A full-stack mobile + web ERP built for PV Classes coaching institute.  
Developed by **Techmunda**.

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native + Expo (iOS, Android, Web) |
| Backend API | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (role-based: admin / student) |
| Navigation | Expo Router (file-based) |

## Modules (14)

1. Dashboard — live stats & recent activity
2. Students — enroll, search, profile
3. Courses — NEET / JEE / SSC / UPSC
4. Faculty — staff management
5. Attendance — daily mark & reports
6. Fees — collect, receipts, defaulters
7. Results — marks entry & grade cards
8. Notices — announcements
9. Study Notes — upload & download
10. Timetable — schedule per course
11. WhatsApp — message & broadcast
12. Reports — analytics & charts
13. Settings — institute config
14. Student Portal — personal dashboard

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | keshavpurohit@gmail.com | admin123 |
| Student | arjun@pvclasses.in | student123 |

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev          # runs on http://localhost:3000
```

### Mobile App
```bash
cd frontend
npm install
npx expo start       # scan QR with Expo Go app
```

## Project Structure

```
pv-classes-app/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server entry
│   │   └── database.js       # SQLite setup & seed
│   ├── routes/
│   │   ├── auth.js
│   │   ├── students.js
│   │   ├── courses.js
│   │   ├── faculty.js
│   │   ├── attendance.js
│   │   ├── fees.js
│   │   ├── results.js
│   │   ├── notices.js
│   │   ├── notes.js
│   │   ├── timetable.js
│   │   ├── whatsapp.js
│   │   └── reports.js
│   └── package.json
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   │   └── login.tsx
    │   ├── (admin)/
    │   │   ├── _layout.tsx
    │   │   ├── index.tsx         # Dashboard
    │   │   ├── students.tsx
    │   │   ├── courses.tsx
    │   │   ├── faculty.tsx
    │   │   ├── attendance.tsx
    │   │   ├── fees.tsx
    │   │   ├── results.tsx
    │   │   ├── notices.tsx
    │   │   ├── notes.tsx
    │   │   ├── timetable.tsx
    │   │   ├── whatsapp.tsx
    │   │   ├── reports.tsx
    │   │   └── settings.tsx
    │   ├── (student)/
    │   │   ├── _layout.tsx
    │   │   └── portal.tsx
    │   └── _layout.tsx
    ├── components/
    │   ├── StatCard.tsx
    │   ├── ModuleCard.tsx
    │   └── Header.tsx
    ├── constants/
    │   └── Colors.ts
    └── package.json
```

## Deploy

### Backend (Railway / Render / VPS)
```bash
npm start   # PORT env var sets port
```

### App (Expo EAS Build)
```bash
npx eas build --platform android
npx eas build --platform ios
```

---
Built by [Techmunda](https://techmunda.com)
