# DigPhy - Physiotherapy Assessment & Patient Tracking Web App

## 🎯 Overview

DigPhy is a **physiotherapy clinic management demo app** built with **Next.js 15**, **shadcn/ui**, and **TypeScript**. It provides clinicians with patient registry, SOAP encounter documentation, progress tracking with real-time charts, secure document management, and full audit logging—plus a read-only patient portal for appointment reminders and home exercise programs.

**Status**: ✅ **Demo Mode** — No backend required. The app runs entirely on **in-memory mock data** (`lib/data/mock-store.ts`). On open, pick a role (**Therapist** or **Patient**) and the suitable workspace loads with pre-populated demo data. No Supabase, no login, no env vars.

### 🚀 Quick Start

```bash
npm install
npm run dev
# open http://localhost:3000 → choose Therapist or Patient
```

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
│   ├── ✓ page.tsx                  # Landing — choose Therapist or Patient
│   ├── login/                      # Redirects to "/"
│   ├── (clinician)/                # Therapist workspace
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── audit/
│   ├── (patient)/my-summary/       # Read-only patient portal
├── components/
│   ├── charts/ProgressChart.tsx
│   ├── soap/soap-wizard.tsx
│   ├── layout/clinician-nav.tsx
│   └── ui/                         # shadcn/ui
├── lib/
│   ├── actions/                    # Server actions
│   ├── data/mock-store.ts          # In-memory demo data (no DB)
│   ├── validators/schemas.ts       # Zod
│   └── audit.ts
```

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <repo>
cd digphy
npm install
```

### 2. Run (no setup needed)
No database, env vars, or Supabase required — the app runs entirely on
in-memory mock data.

```bash
npm run dev   # Start server
```

### 3. Open the app
Open [http://localhost:3000](http://localhost:3000)

Choose **"I'm a Therapist"** or **"I'm a Patient"** on the landing page.

> **Deploy**: See [DEPLOYMENT.md](DEPLOYMENT.md) for pushing to Vercel.

### Role-based views (no login)
- **Therapist** → `/dashboard` — patients, SOAP encounters, progress, documents, audit log
- **Patient** → `/my-summary` — pain score, pain trend, home program, next appointment

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

## 🔐 Security (demo)

✅ **Role Selector** — Landing page partitions Therapist vs Patient views  \
✅ **Consent Enforcement** — App-level guard blocks encounters until signed  \
✅ **Audit Trail** — Every data access logged (user, action, timestamp, IP)  \
✅ **PHI Protection** — Files stored as base64 in memory, no names in paths  \
✅ **Encryption** — HTTPS (Vercel) enforced  \

---

## 📊 Data (in-memory)

All data is held in `lib/data/mock-store.ts` (no database):
- `profiles` — fixed clinician + 2 patient profiles
- `patients` — demographics, consent
- `encounters` — SOAP header + Subjective/Objective/Assessment/Plan
- `progress_entries` — time-series metrics for charts
- `documents` — file metadata + base64 references
- `audit_logs` — action trails

**Access model**:
- Therapist: full access to all patients (via role card)
- Patient: read-only `/my-summary` (via role card)

---

## 📖 Docs

- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Local run + Vercel deploy
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** — API reference, types, queries
- **[doc_id.txt](doc_id.txt)** — Data model spec
- **[core_behavious.txt](core_behavious.txt)** — Validation rules

---

## 🧪 Build & Test

```bash
npm run build        # Production build
npm run dev          # Dev server with hot reload
npm run lint         # ESLint check
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
Next.js • shadcn/ui • TypeScript

```bash
npm run dev   # Start server → http://localhost:3000
```

No login — pick a role on the landing page.

## Deploy to Vercel

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Build with no env vars (fully self-contained)
4. Deploy — demo data re-seeds per serverless cold start

## Project Structure

```
app/
  ✓ page.tsx           # Landing — choose Therapist or Patient
  (clinician)/         # Dashboard, patients, audit (therapist)
  my-summary/          # Patient portal
components/            # UI, SOAP wizard, charts, forms
lib/
  actions/             # Server actions
  data/mock-store.ts   # In-memory demo data (no DB)
  validators/          # Zod schemas
```

## Validation Rules

From `core_behavious.txt`:
- Mandatory: patient consent, working diagnosis, clinician ID, date/time
- ISO 8601 dates, numeric ranges for vitals/scales
- Consent required before creating encounters
- Audit log on every record access

## License

Private — for clinic/event demo use.
