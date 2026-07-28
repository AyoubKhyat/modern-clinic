# Modern Clinic OS

A full-featured clinic management system — patient records, appointments, inventory, payroll, analytics, and an AI assistant — built with Next.js 16 and a containerized Express + SQLite backend.

Reference implementation of a modern medical practice admin panel. Designed as a portfolio piece and a starting point for real clinic deployments.

## What it does

- **Patients** — create, search, edit patient records with full history
- **Appointments** — calendar view, quick scheduling, status tracking
- **Inventory** — stock levels, supplies, low-stock alerts
- **Payroll** — staff pay tracking
- **Analytics** — dashboard with clinic KPIs and charts
- **AI assistant** — in-app helper for admin queries
- **Command palette** — keyboard-first navigation (⌘K)
- **Onboarding flow** — guided setup for new deployments
- **Role-based auth** — doctor, staff, admin roles with JWT

## Tech stack

**Frontend** — Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) · Framer Motion · Recharts · Zustand · Axios

**Backend** — Node.js · Express · SQLite (via `sql.js` WASM) · JWT auth · bcryptjs

**Deployment** — Docker Compose (frontend + backend + persistent volume)

## Getting started

```bash
docker compose up --build
```

Then open http://localhost:3000 — backend runs on http://localhost:8000

### Local dev without Docker

```bash
# terminal 1 — backend
cd backend && npm install && npm start

# terminal 2 — frontend
npm install && npm run dev
```

## Environment variables

Copy `.env.example` to `.env` and set:

- `JWT_SECRET` — 32+ char random string for token signing
- `NEXT_PUBLIC_API_URL` — backend URL (default `http://localhost:8000/api`)
- `DB_PATH` — SQLite file location (default `./data/clinic.db`)
- `CORS_ORIGIN` — allowed frontend origin

## Project structure

```
modern-clinic/
├── src/
│   ├── app/
│   │   ├── (auth)/          # sign-in flow
│   │   ├── (dashboard)/     # main app pages
│   │   └── portal/          # patient portal
│   ├── components/
│   │   ├── ai-assistant/
│   │   ├── analytics/
│   │   ├── appointments/
│   │   ├── command-palette/
│   │   ├── dashboard/
│   │   ├── inventory/
│   │   ├── onboarding/
│   │   ├── patients/
│   │   ├── payroll/
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   ├── stores/              # zustand state
│   └── types/
├── backend/
│   ├── server.js            # Express + sql.js
│   └── Dockerfile
├── docker-compose.yml
└── Dockerfile               # frontend
```

## About

Built by [Ayoub Khyat](https://github.com/AyoubKhyat) — full-stack developer, Marrakech.

Available for freelance work — custom dashboards, admin panels, and AI integrations — at [Ibda3 Digital](https://ibda3-digital.vercel.app/) and on [Fiverr](https://www.fiverr.com/ayoubkhyat).
