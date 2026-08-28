# DigPhy Deployment Guide

## ✅ Project Status
- **Build Status**: ✅ Successful (all TypeScript errors resolved)
- **Routes**: 12 pages compiled and ready
- **Backend**: None required — in-memory mock data (`lib/data/mock-store.ts`)
- **Components**: All UI components built with shadcn/ui + Tailwind
- **Features**: 100% of MVP+ specification implemented

---

## 🚀 Quick Start

```bash
npm install
npm run dev
# open http://localhost:3000 → choose Therapist or Patient
```

No Supabase project, migrations, or environment variables are needed.
All demo data (2 patients, 6 encounters, progress entries, documents, audit logs)
is seeded automatically at startup from `lib/data/mock-store.ts`.

---

## ☁️ Deploy to Vercel

### Before you start
- **No environment variables** are required. The app is fully self-contained.
- The repo has no `.env.local` in it (that file is git-ignored). Vercel will
  build with no secrets, which is what you want for this demo.

### Option A — Deploy from Git (recommended)
1. Push this project to a GitHub/GitLab repo:
   ```bash
   git init
   git add -A
   git commit -m "DigPhy demo"
   git branch -M main
   git remote add origin https://github.com/<you>/digphy.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → **New Project** → **Import** the repo.
3. Vercel auto-detects **Next.js**. Leave framework preset as default.
4. **No environment variables to add.** Click **Deploy**.
5. Done — your demo is live at `https://digphy-<hash>.vercel.app`.

### Option B — Deploy with Vercel CLI
```bash
npm i -g vercel
vercel        # preview deployment
vercel --prod # production deployment
```

### ⚠️ Important: demo data is in-memory
- Data lives in `lib/data/mock-store.ts` and is held in server memory only.
- On **serverless platforms like Vercel**, each cold start re-seeds the demo
  data, and any changes you make during a session are not persisted across
  invocations / are lost when the instance scales to zero.
- **Treat it as a read-only showcase.** For a demo, click "Therapist" or
  "Patient" and browse the pre-loaded data (SOAP notes, charts, documents,
  audit log, patient summary).

### Demo accounts (none — no login)
On open, the landing page shows two role cards. No credentials are needed:
- **"I'm a Therapist"** → `/dashboard` (patients, SOAP, progress, docs, audit)
- **"I'm a Patient"** → `/my-summary` (pain score, pain chart, home program, next appointment)

---

## 🧪 Local Development

### Start Dev Server
```bash
npm run dev
```

Server runs on [http://localhost:3000](http://localhost:3000)

### Test Clinician Workflow
1. Open [http://localhost:3000](http://localhost:3000)
2. Click **"I'm a Therapist"** — no login needed in demo mode
3. You'll land on `/dashboard` with:
   - Patient count & recent encounters
   - "All Patients" button → view patient list
   - "New Patient" button → create patient form

### Test Patient Workflow
1. Go back to [http://localhost:3000](http://localhost:3000)
2. Click **"I'm a Patient"**
3. You'll land on `/my-summary` with:
   - Current pain score (3/10 from latest encounter)
   - Home exercise program
   - Next appointment date
   - Pain trend chart

### Navigate Key Pages

| Route | Role | Purpose |
|-------|------|---------|
| `/` | Any | Landing page — choose Therapist or Patient |
| `/dashboard` | Therapist | Overview, patient count, recent encounters |
| `/patients` | Therapist | Patient registry, search by name/phone/diagnosis |
| `/patients/new` | Therapist | Create new patient (requires consent) |
| `/patients/[id]` | Therapist | Patient detail: demographics, encounters, progress, documents |
| `/patients/[id]/edit` | Therapist | Edit patient information |
| `/patients/[id]/encounters/new` | Therapist | Multi-step SOAP wizard (5 steps) |
| `/patients/[id]/progress` | Therapist | Add progress entries, view metric charts |
| `/audit` | Therapist | View all data access & changes (READ/CREATE/UPDATE/DELETE) |
| `/my-summary` | Patient | Read-only summary: pain, home program, next appointment |

---

## 📊 Database Schema

### Tables Created
> The app no longer uses a database. This list documents the equivalent
> in-memory collections in `lib/data/mock-store.ts`:
```ts
profiles         -- fixed clinician + 2 patient profiles
patients         -- demographics, consent, contact info
encounters       -- header + SOAP (subjective, objective, assessment, plan)
progress_entries -- time-series metrics for charts
documents        -- file metadata + base64 data-URL references
audit_logs       -- all data access/changes
```

### Key Constraints
- **Consent Required**: Can't create encounter without `patient.consent_signed = true`
- **Audit Logging**: All CREATE/READ/UPDATE on patient data is logged
- **Auto Progress**: Pain VAS from encounter automatically creates progress_entry

---

## 🎨 Architecture

### Frontend (Next.js 15)
- **App Router** with route groups: `(clinician)` / `(patient)`
- **Server Components** for data fetching (using the mock store)
- **Client Components** for forms (useState, useRouter)
- **shadcn/ui** components (Input, Select, Card, Tabs, Dialog, etc.)
- **Tailwind CSS** for styling

### Backend (Server Actions)
- `lib/actions/patients.ts` — CRUD patients + redirects
- `lib/actions/encounters.ts` — Create encounters, track progress
- `lib/actions/documents.ts` — Upload (as data URLs), link consent
- `lib/actions/portal.ts` — Patient summary, audit logs
- **Validation**: Zod schemas with domain-specific constraints
- **Audit Trail**: `logAudit()` called on every mutation

### Data Layer (In-memory)
- **No database** — `lib/data/mock-store.ts` holds all data per process
- **globalThis cache** so dev hot-reload and warm serverless instances keep data
- **force-dynamic** on data pages so they render per-request, not at build time

---

## 🔐 Security Features (demo)

✅ **Role Selector**: Landing page partitions Therapist vs Patient views \
✅ **Consent Enforcement**: App-level guard blocks encounters until signed \
✅ **Audit Logging**: Every data access logged with user, action, timestamp, IP \
✅ **PHI Minimization**: Files stored as base64 in memory; only metadata persisted \
✅ **HTTPS Ready**: Vercel deployment enforces HTTPS \
✅ **No Supabase / no secrets**: No env vars or external services required

---

## 🐛 Troubleshooting

### Build Fails with "next: not found"
Run `npm install` to ensure all dependencies are installed.

### Landing Page Role Cards Don't Navigate
Directly open the target route (e.g. `/dashboard` or `/my-summary`). The
buttons are plain `<Link>`s; if they fail, check the browser console.

### Patient Consent Error
Patients require `consent_signed: true` before encounters. Both seeded demo
patients have consent already signed.

### Charts Don't Show
Progress entries require `metric_key` in `["pain_vas", "rom_knee_flexion_deg", "tug_sec", "six_mwt_m"]` or a custom string.

### Data Resets on Vercel
Expected — data is in-memory. See the "Deploy to Vercel" section above.

---

## 📝 Event Demo Checklist

Before going live for event:
- [ ] `npm install` done, `npm run dev` starts locally
- [ ] Landing page shows both role cards ("I'm a Therapist" / "I'm a Patient")
- [ ] Therapist: dashboard, patient list/search, patient detail with charts
- [ ] Create a new encounter (SOAP wizard all 5 steps)
- [ ] Add a progress entry and see the chart update
- [ ] Upload a test document
- [ ] Patient portal shows pain score + home program
- [ ] Audit log has entries
- [ ] Deployed to Vercel and all routes return 200

---

## 📚 Features Deep Dive

### SOAP Encounter Wizard
5-step form spanning all SOAP sections:
1. **Header** — date, type, location, confidentiality
2. **Subjective** — chief complaint, pain VAS, goals, consent
3. **Objective** — vitals, ROM, strength, functional tests
4. **Assessment** — problem list, working diagnosis
5. **Plan** — goals, treatment plan, home program, next follow-up

Validation enforces all mandatory fields per `core_behavious.txt`.

### Progress Chart
Displays time-series for selected metric:
- X-axis: date
- Y-axis: value
- Tooltip on hover with exact value & date
- Auto-scales based on data range

### Audit Log
Table of all actions (READ/CREATE/UPDATE/DELETE):
- Timestamp
- User (clinician name)
- Action
- Entity type (Patient/Encounter/Document/ProgressEntry)
- Entity ID (first 8 chars shown)

### Patient Summary Portal
Read-only page for patients:
- Current pain score (latest VAS entry)
- Home exercise program (from latest encounter plan)
- Next appointment date (from latest encounter plan.next_follow_up)
- Pain trend sparkline (7 most recent pain entries)

---

## 🎯 Post-MVP Roadmap (Future)

These are **not** in V1 but suggested for future:
- [ ] Multi-clinic/tenant isolation
- [ ] Hindi & regional language support (i18n)
- [ ] Telehealth video integration (Jitsi/Zoom API)
- [ ] Device API integrations (wearables, sensors for progress.source)
- [ ] Full patient access to clinician notes (consent-controlled)
- [ ] PDF export/print of encounters & reports
- [ ] PWA/offline mode
- [ ] Mobile app (React Native)
- [ ] Two-factor authentication
- [ ] SMS reminders for appointments
- [ ] Video-assisted assessment recording
- [ ] Predictive analytics (pain trends, recovery timeline)

---

## 📞 Support

For issues or questions:
1. Check TypeScript errors: `npm run build`
2. Check runtime logs: Browser DevTools → Console
3. Verify mock data via the app UI (dashboard, patients, audit)
4. Review `lib/data/mock-store.ts` for all seeded demo data

---

## 📄 License
Built as demo for physiotherapy clinic event. Follow your clinic's data governance policies.
