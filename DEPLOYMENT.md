# DigPhy Deployment Guide

## ✅ Project Status
- **Build Status**: ✅ Successful (all TypeScript errors resolved)
- **Routes**: 12 pages compiled and ready
- **Database**: Supabase schema ready (migrations provided)
- **Components**: All UI components built with shadcn/ui + Tailwind
- **Features**: 100% of MVP+ specification implemented

---

## 🚀 Quick Start: Supabase Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project name (e.g., "digphy-demo")
5. Set password for postgres user
6. Wait for project to be ready (~2 min)

### 2. Run Migrations
1. In Supabase dashboard, go to **SQL Editor**
2. Create new query
3. Copy contents of [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)
4. Paste and run (will create all tables, types, RLS policies, functions)
5. Repeat for [supabase/migrations/002_storage.sql](supabase/migrations/002_storage.sql)
   - This creates the storage bucket for documents

### 3. Get Connection Keys
From Supabase Project Settings → API:
- Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy **Anon Key** (Public) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **Service Role Key** (Secret - used only for seeding) → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Create .env.local
```bash
cp .env.example .env.local
```

Then edit `.env.local` with your keys:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...
```

---

## 🌱 Seed Demo Data

Run the seed script to create demo accounts and patient records:

```bash
npm run seed
```

This will create:
- **Clinician**: `clinician@digphy.demo` / `demo123456`
  - Email, role Physiotherapist, clinic name "DigPhy Clinic"
  
- **Patient 1**: `rajesh@patient.demo` / `demo123456`
  - Rajesh Kumar, lumbar disc herniation L4-L5
  - 3 encounters with SOAP notes
  - Pain progress data, goals, home program
  
- **Patient 2**: `priya@patient.demo` / `demo123456`
  - Priya Mehta, post-ACL reconstruction
  - 3 encounters with progressive rehab data
  - ROM, strength, functional test metrics

---

## 🧪 Local Development

### Start Dev Server
```bash
npm run dev
```

Server runs on [http://localhost:3000](http://localhost:3000)

### Test Clinician Workflow
1. Open [http://localhost:3000/login](http://localhost:3000/login)
2. Sign in as `clinician@digphy.demo` / `demo123456`
3. You'll land on `/dashboard` with:
   - Patient count & recent encounters
   - "All Patients" button → view patient list
   - "New Patient" button → create patient form

### Test Patient Workflow
1. Sign out
2. Sign in as `rajesh@patient.demo` / `demo123456`
3. You'll land on `/my-summary` with:
   - Current pain score (7/10 from latest encounter)
   - Home exercise program
   - Next appointment date
   - Pain trend chart

### Navigate Key Pages

| Route | Role | Purpose |
|-------|------|---------|
| `/login` | Any | Email/password login |
| `/dashboard` | Clinician | Overview, patient count, recent encounters |
| `/patients` | Clinician | Patient registry, search by name/phone/diagnosis |
| `/patients/new` | Clinician | Create new patient (requires consent) |
| `/patients/[id]` | Clinician | Patient detail: demographics, encounters, progress, documents |
| `/patients/[id]/edit` | Clinician | Edit patient information |
| `/patients/[id]/encounters/new` | Clinician | Multi-step SOAP wizard (5 steps) |
| `/patients/[id]/progress` | Clinician | Add progress entries, view metric charts |
| `/audit` | Clinician | View all data access & changes (READ/CREATE/UPDATE/DELETE) |
| `/my-summary` | Patient | Read-only summary: pain, home program, next appointment |

---

## 📊 Database Schema

### Tables Created
```sql
-- Core data
patients          -- demographics, consent, contact info
encounters        -- header + JSONB (subjective, objective, assessment, plan)
progress_entries  -- time-series metrics for charts
documents         -- uploaded files with storage references
audit_logs        -- all data access/changes

-- Auth & Access
profiles          -- extends auth.users with role & clinic
auth.users        -- managed by Supabase Auth

-- Storage
storage.buckets   -- patient-documents bucket for files
```

### Key Constraints
- **Consent Required**: Can't create encounter without `patient.consent_signed = true`
- **RLS Policies**: Clinicians see all their clinic patients; patients see only their own records
- **Audit Logging**: All CREATE/READ/UPDATE on patient data is logged
- **Auto Progress**: Pain VAS from encounter automatically creates progress_entry

---

## 🎨 Architecture

### Frontend (Next.js 15)
- **App Router** with route groups: `(clinician)` / `(patient)` / `(auth)`
- **Server Components** for data fetching (redirect on auth fail)
- **Client Components** for forms (useState, useRouter, useCallback)
- **shadcn/ui** components (Input, Select, Card, Tabs, Dialog, etc.)
- **Tailwind CSS** for styling

### Backend (Server Actions)
- `lib/actions/patients.ts` — CRUD patients, login/logout
- `lib/actions/encounters.ts` — Create encounters, track progress
- `lib/actions/documents.ts` — Upload, link consent
- `lib/actions/portal.ts` — Patient summary, audit logs
- **Validation**: Zod schemas with domain-specific constraints
- **Audit Trail**: `logAudit()` called on every mutation

### Database (Supabase PostgreSQL)
- **RLS**: Row-level security policies enforce role-based access
- **JSONB**: SOAP notes stored as structured JSON for flexibility
- **Triggers**: Auto-update `updated_at`, auto-create profile on signup
- **Functions**: `is_clinician()`, `get_patient_id_for_user()` for RLS checks

### Storage (Supabase)
- **Bucket**: `patient-documents` (non-public, private access)
- **Paths**: `{patient_id}/{uuid}` (no PHI in filenames)
- **RLS**: Only clinicians can upload/read/delete
- **Signed URLs**: 1-hour expiry for secure downloads

---

## 🔐 Security Features

✅ **Authentication**: Supabase Auth with email/password  
✅ **RLS**: PostgreSQL row-level security (enforce per role)  
✅ **Consent Enforcement**: DB constraint + app-level guard  
✅ **Audit Logging**: Every data access logged with user ID, action, timestamp, IP  
✅ **PHI Minimization**: No names in file paths; only UUID + document_id  
✅ **HTTPS Ready**: Vercel deployment enforces HTTPS  
✅ **No Sensitive Logs**: Passwords, keys never logged  

---

## 📦 Deployment to Vercel

### 1. Push Code to GitHub
```bash
git init
git add .
git commit -m "DigPhy: MVP+ physiotherapy assessment webapp"
git remote add origin https://github.com/YOUR_USERNAME/digphy.git
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Select `digphy` repository
5. Framework preset: "Next.js"
6. **Environment Variables**: Add from `.env.local`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional, only for seed via API)
7. Click "Deploy"

Vercel will:
- Install dependencies
- Run `npm run build`
- Deploy to global CDN
- Provide URL: `https://digphy-xxxxx.vercel.app`

### 3. Verify Deployment
- Open deployed URL
- Login as `clinician@digphy.demo`
- Test patient search, encounter creation
- Check audit log

---

## 🐛 Troubleshooting

### Build Fails with "next: not found"
Run `npm install` to ensure all dependencies are installed.

### Login Fails
1. Check `.env.local` has correct Supabase URL and keys
2. Verify user exists in Supabase Auth dashboard
3. Check browser console for error messages

### Patient Consent Error
Patients require `consent_signed: true` before encounters. Edit patient and check consent checkbox.

### Documents Don't Upload
1. Verify storage bucket `patient-documents` exists in Supabase
2. Check RLS policies on storage.objects allow clinician INSERT/SELECT
3. Check file size < 10MB and MIME type is PDF/image/Word

### Charts Don't Show
Progress entries require `metric_key` in `["pain_vas", "rom_knee_flexion_deg", "tug_sec", "six_mwt_m"]` or custom string.

---

## 📝 Event Demo Checklist

Before going live for event:
- [ ] Supabase project created and migrations run
- [ ] `.env.local` configured with Supabase keys
- [ ] `npm run seed` executed successfully
- [ ] Test clinician login works
- [ ] Test patient login works (rajesh patient)
- [ ] Create a new encounter (SOAP wizard all 5 steps)
- [ ] Upload a test document
- [ ] Verify patient portal shows home program
- [ ] Check audit log has entries
- [ ] Deployed to Vercel (optional) or running `npm run dev` locally

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
3. Check Supabase: SQL Editor for migration status, Logs panel for API errors
4. Review schema: [supabase/migrations/](supabase/migrations/)

---

## 📄 License
Built as demo for physiotherapy clinic event. Follow your clinic's data governance policies.
