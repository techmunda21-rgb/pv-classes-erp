# PV Classes ERP

**Production-grade ERP for PV Classes, Jodhpur, Rajasthan**
Built by [Techmunda](https://techmunda.com) · Founder: Sourabh Vyas · Launch: January 2027

---

## Stack

| Layer | Technology |
|---|---|
| API | Cloudflare Workers + Hono + TypeScript |
| Database | Cloudflare D1 (SQLite) |
| Sessions | Cloudflare KV |
| Files | Cloudflare R2 |
| Frontend | React 18 + Vite + TailwindCSS |
| Mobile | React Native + Expo SDK 52 |

## Project Structure

```
pv-erp/
├── schema/          # D1 database migrations
├── worker/          # Cloudflare Workers API (Hono)
├── frontend/        # React web app (Cloudflare Pages)
└── docs/            # System design documentation
```

## Quick Deploy

```bash
# 1. Install Wrangler
npm install -g wrangler && wrangler login

# 2. Create D1 database
wrangler d1 create pv-erp-db
# Copy database_id → worker/wrangler.toml

# 3. Run migrations
wrangler d1 execute pv-erp-db --file=schema/001_init.sql

# 4. Create KV namespaces
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create CACHE

# 5. Create R2 bucket
wrangler r2 bucket create pv-erp-files

# 6. Set secrets
wrangler secret put JWT_SECRET
wrangler secret put WHATSAPP_API_KEY
wrangler secret put RAZORPAY_KEY_ID
wrangler secret put RAZORPAY_KEY_SECRET

# 7. Deploy Worker
cd worker && npm install && wrangler deploy

# 8. Deploy Frontend
cd frontend && npm install && npm run build
wrangler pages deploy dist --project-name=pv-erp-web
```

## API Endpoints

Base URL: `https://api.pvclasses.in/api/v1`

- `POST /auth/login` — Login
- `GET /dashboard/stats` — KPI summary
- `GET /students` — List students
- `POST /fees/pay` — Record fee payment
- `POST /attendance/mark` — Bulk mark attendance
- `GET /results/rank-list/:examId` — Rank list
- Full API reference in `docs/SYSTEM_DESIGN.md`

## Security

- JWT (HMAC-SHA256) + KV session store
- PBKDF2 password hashing (100k iterations)
- RBAC: admin / teacher / staff / parent / student
- Rate limiting via KV (10/min auth, 100/min API)
- All R2 files served through authenticated Worker
- Audit log on every write

## License

Private — PV Classes, Jodhpur. All rights reserved.
