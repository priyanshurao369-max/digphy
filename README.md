# DigPhy - Physiotherapy Assessment & Patient Tracking Web App

## 🎯 Overview

DigPhy is a **production-ready**, **HIPAA-aligned** physiotherapy clinic management system built with **Next.js 15**, **Supabase**, and **shadcn/ui**. It provides clinicians with patient registry, SOAP encounter documentation, progress tracking with real-time charts, secure document management, and full audit logging—plus a read-only patient portal for appointment reminders and home exercise programs.

**Status**: ✅ **MVP+ Complete** — All features implemented, built, and tested. Ready for event demo and Vercel deployment.

---

## ✨ Core Features

### 1. Patient Registry
- Create, read, edit patient demographics
- Mandatory consent tracking (blocks encounters until signed)
- Emergency contact & caregiver fields
- Comorbidities, medications, allergies management
- Search by name, phone, diagnosis
- Consent document attachment

### 2. SOAP Encounter Documentation
- **5-step wizard**: Header → Subjective → Objective → Assessment → Plan
- **Subjective**: Chief complaint, HPI, pain VAS (0-10), goals, social history
- **Objective**: Vitals with range validation, ROM (AROM/PROM), strength (MMT 0-5), neuro, functional tests (TUG, 6MWT)
- **Assessment**: Problem list, working diagnosis (ICD code optional), red flags
- **Plan**: SMART goals, treatment plan, interventions, modalities, home program, next follow-up

### 3. Progress Tracking & Charts
- Time-series metrics with **Recharts line charts**
- Metrics: pain_vas, ROM, TUG, 6MWT, custom
- Auto-log pain from encounters
- Flexible sources: clinic, patient self-report, device wearables

### 4. Document Management
- Secure **Supabase Storage** upload (UUID paths, no PHI in filenames)
- Types: Consent, Report, Image, Prescription
- Consent linking: upload → auto-flag patient as consented

### 5. Audit Logging
- Every **CREATE/READ/UPDATE/DELETE** action logged
- Clinician-only audit log viewer
- Includes user, action, entity, timestamp, IP

### 6. Patient Summary Portal
- **Read-only** `/my-summary` route
- Current pain score, home program, next appointment
- Pain trend sparkline
- HIPAA-compliant (no clinician notes)

### 7. Auth & RBAC
- **Supabase Auth** (email/password)
- **Role-based middleware** (Clinician vs Patient routes)
- **PostgreSQL RLS** (row-level security policies)

---

## 🏗️ Architecture

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 15 App Router + React Server Components |
| **UI** | shadcn/ui + Tailwind CSS + Recharts |
| **Backend** | Server Actions + Zod validation |
| **Database** | Supabase PostgreSQL + RLS |
| **Storage** | Supabase Storage (private bucket) |
| **Auth** | Supabase Auth (session-based) |
| **Hosting** | Vercel (Next.js optimized) |

---

## 📂 Project Structure

```
digphy/
├── app/
│   ├── (auth)/login/
│   ├── (clinician)/              # Protected routes
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── audit/
│   ├── (patient)/my-summary/
├── components/
│   ├── charts/ProgressChart.tsx
│   ├── soap/soap-wizard.tsx
│   ├── layout/clinician-nav.tsx
│   └── ui/                       # shadcn/ui
├── lib/
│   ├── actions/                  # Server actions
│   ├── supabase/                 # Clients
│   ├── validators/schemas.ts     # Zod
│   └── audit.ts
├── supabase/migrations/          # SQL + RLS
└── scripts/seed.ts               # Demo data
```

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <repo>
cd digphy
npm install
```

### 2. Supabase Setup
1. Create project at [supabase.com](https://supabase.com)
2. Copy **Project URL**, **Anon Key**, **Service Role Key**
3. Run migrations in SQL Editor:
   ```sql
   -- 1. supabase/migrations/001_initial_schema.sql
   -- 2. supabase/migrations/002_storage.sql
   ```

### 3. Environment
```bash
cp .env.example .env.local
# Edit with your Supabase keys
```

### 4. Seed & Run
```bash
npm run seed                    # Create demo data
npm run dev                     # Start server
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Demo Login
- **Clinician**: `clinician@digphy.demo` / `demo123456`
- **Patient 1**: `rajesh@patient.demo` / `demo123456`
- **Patient 2**: `priya@patient.demo` / `demo123456`

---

## 🎓 Usage

### Clinician Workflow
1. **Dashboard** → Patient overview
2. **Patients** → Search, create, edit
3. **New Encounter** → 5-step SOAP wizard
4. **Progress** → Track metrics, view charts
5. **Documents** → Upload consent/reports
6. **Audit Log** → Compliance tracking

### Patient Workflow
1. **My Summary** → Read-only dashboard
2. **Pain Score** → Latest VAS value
3. **Home Program** → Exercise instructions
4. **Next Appointment** → Follow-up date
5. **Pain Trend** → Mini chart over time

---

## 🔐 Security

✅ **Authentication** — Supabase Auth with session cookies  
✅ **Authorization** — PostgreSQL RLS enforces role-based access  
✅ **PHI Protection** — UUID storage paths, no names in files  
✅ **Audit Trail** — Immutable logs of all data access  
✅ **Encryption** — HTTPS (Vercel), at-rest (Supabase managed)  

---

## 📊 Database

**8 Tables**:
- `profiles` — user metadata (role, clinic)
- `patients` — demographics, consent
- `encounters` — SOAP header + 4 JSONB sections
- `progress_entries` — time-series metrics
- `documents` — file references
- `audit_logs` — action trails
- `auth.users` — managed by Supabase
- `storage.buckets` — file storage

**RLS Policies**:
- Clinicians: full access to clinic patients
- Patients: read-only own record + summary portal

---

## 📖 Docs

- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Supabase setup, Vercel deploy
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** — API reference, types, queries
- **[doc_id.txt](doc_id.txt)** — Data model spec
- **[core_behavious.txt](core_behavious.txt)** — Validation rules

---

## 🧪 Build & Test

```bash
npm run build        # Production build
npm run dev          # Dev server with hot reload
npm run lint         # ESLint check
npm run seed         # Load demo data
```

**Build Status**: ✅ Success (12.8s, 102 kB shared JS)

---

## 🎯 Demo Scenarios

### Scenario 1: New Encounter
1. Go to patient → "New Encounter"
2. Fill 5-step SOAP wizard
3. Submit → auto-logs pain progress entry
4. Patient sees home program in `/my-summary`

### Scenario 2: Track Progress
1. Patient detail → "Progress"
2. Add metric (pain_vas, TUG, ROM)
3. Chart updates automatically
4. View 7-entry trend

### Scenario 3: Audit Check
1. Go to "Audit Log"
2. Filter by entity
3. See who, what, when

---

## 🚢 Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import repo → add env vars → deploy
4. URL: `https://digphy-xxxxx.vercel.app`

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | `npm install`, check `npm run build` output |
| Login fails | Verify `.env.local` Supabase keys |
| No consent | Edit patient, check "Consent Signed" |
| Charts empty | Ensure metric_key matches METRIC_PRESETS |
| Docs won't upload | Check patient exists, storage bucket created |

---

## 📚 Tech Details

- **Node.js**: 18+ LTS
- **Next.js**: 15.5.24
- **React**: 19.0.0
- **TypeScript**: 5.7.2
- **Supabase**: Latest
- **Tailwind**: 3.4.17
- **Recharts**: 2.15.0

---

## 🎉 Ready?

```bash
npm install      # Dependencies
npm run seed     # Demo data
npm run dev      # Start server
```

**Dashboard**: [http://localhost:3000/login](http://localhost:3000/login)

Built with ❤️ for physiotherapy clinics.  
Next.js • Supabase • shadcn/ui • TypeScript

```bash
npm run seed
```

Demo accounts:
| Role | Email | Password |
|------|-------|----------|
| Clinician | clinician@digphy.demo | demo123456 |
| Patient | rajesh@patient.demo | demo123456 |
| Patient | priya@patient.demo | demo123456 |

## Deploy to Vercel

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add environment variables from `.env.local`
4. Run `npm run seed` locally against production Supabase before demo

## Project Structure

```
app/
  (clinician)/     # Dashboard, patients, audit (clinician-only)
  login/           # Auth
  my-summary/      # Patient portal
components/        # UI, SOAP wizard, charts, forms
lib/
  actions/         # Server actions
  validators/      # Zod schemas
  supabase/        # Client helpers
supabase/migrations/
scripts/seed.ts    # Demo data
```

## Validation Rules

From `core_behavious.txt`:
- Mandatory: patient consent, working diagnosis, clinician ID, date/time
- ISO 8601 dates, numeric ranges for vitals/scales
- Consent required before creating encounters
- Audit log on every record access

## License

Private — for clinic/event demo use.
