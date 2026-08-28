# DigPhy Developer Quick Reference

## Project Structure
```
digphy/
├── app/
│   ├── layout.tsx              # Root layout with fonts & metadata
│   ├── page.tsx                # Redirect to /login or /dashboard
│   ├── login/page.tsx          # Auth login form
│   ├── (clinician)/
│   │   ├── layout.tsx          # Auth guard + nav sidebar
│   │   ├── dashboard/          # Patient overview, stats
│   │   ├── patients/           # List, search, create
│   │   │   ├── [id]/           # Detail page with tabs
│   │   │   │   ├── edit/       # Edit patient form
│   │   │   │   ├── encounters/ # SOAP wizard
│   │   │   │   └── progress/   # Progress charts
│   │   │   └── new/            # Create patient form
│   │   └── audit/              # Audit log table
│   └── (patient)/
│       └── my-summary/         # Read-only patient portal
│
├── components/
│   ├── charts/
│   │   └── ProgressChart.tsx   # Recharts line chart for metrics
│   ├── documents/
│   │   └── document-upload.tsx # Upload & link consent
│   ├── layout/
│   │   └── clinician-nav.tsx   # Header nav with logout
│   ├── patients/
│   │   └── patient-form.tsx    # Reusable create/edit form
│   ├── progress/
│   │   └── progress-form.tsx   # Add progress entry form
│   ├── soap/
│   │   └── soap-wizard.tsx     # 5-step SOAP encounter wizard
│   └── ui/                      # shadcn/ui components
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── tabs.tsx
│       └── textarea.tsx
│
├── lib/
│   ├── actions/
│   │   ├── patients.ts         # Crud patients, auth
│   │   ├── encounters.ts       # SOAP, progress entries
│   │   ├── documents.ts        # Upload, link consent
│   │   └── portal.ts           # Patient summary, audit logs
│   ├── supabase/
│   │   ├── server.ts           # Server-side Supabase client
│   │   ├── client.ts           # Client-side Supabase client
│   │   └── middleware.ts       # Auth middleware, route guards
│   ├── validators/
│   │   └── schemas.ts          # Zod schemas for all entities
│   ├── audit.ts                # logAudit helper
│   └── utils.ts                # formatDate, formatDateTime, cn
│
├── types/
│   └── index.ts                # TypeScript types (mirrors schema)
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # Tables, RLS, functions
│   │   └── 002_storage.sql         # Storage bucket & policies
│   └── README.md                   # SQL setup instructions
│
├── scripts/
│   └── seed.ts                 # Demo data script (2 patients, 3 encounters each)
│
├── public/                     # Static assets (favicon, etc)
├── .env.example                # Template for secrets
├── .eslintrc.json             # ESLint config
├── eslint.config.mjs          # ESLint flat config
├── next.config.ts             # Next.js config
├── tsconfig.json              # TypeScript config
├── tailwind.config.ts         # Tailwind CSS config
├── postcss.config.mjs         # PostCSS config
├── middleware.ts              # Next.js middleware entry point
└── package.json               # Dependencies & scripts
```

---

## Key Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:3000

# Build & Deploy
npm run build            # Production build (outputs to .next)
npm start                # Run production build

# Linting & Types
npm run lint             # ESLint check

# Database
npm run seed             # Run seed.ts (create demo data)
```

---

## Type Definitions

### Patient
```typescript
interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string; // YYYY-MM-DD
  sex: "Male" | "Female" | "Other";
  contact_phone: string; // +91-XXXXXXXXXX
  email?: string;
  address?: string;
  emergency_contact?: { name; phone; relationship };
  primary_diagnosis: string;
  comorbidities: string[];
  current_medications: string[];
  allergies: string[];
  mobility_aids: string[];
  caregiver?: { name; phone; relationship };
  consent_signed: boolean;
  consent_date?: string; // YYYY-MM-DD
  consent_document_id?: string; // UUID
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

### Encounter (with SOAP)
```typescript
interface Encounter {
  id: string;
  patient_id: string;
  clinician_id: string;
  date_time: string; // ISO 8601
  encounter_type: "Initial" | "Follow-up" | "Telehealth" | "HomeVisit" | "Discharge";
  location: string;
  confidentiality_level: "Standard" | "Sensitive";
  notes?: string;
  
  // SOAP as JSONB
  subjective: {
    chief_complaint: string;
    history_of_present_illness: {
      onset_date: string;
      mechanism: string;
      mode_of_onset: "Sudden" | "Gradual" | "Insidious" | "Periodic";
      duration_category: "Acute" | "Subacute" | "Chronic";
    };
    pain: {
      site: string;
      type: "Muscle" | "Joint" | "Nerve" | "Bone" | "Vascular";
      descriptors: string[];
      intensity_vas: number; // 0-10
      aggravating_factors: string;
      relieving_factors: string;
    };
    past_medical_history: string;
    surgical_history: string;
    medications: string[];
    social_history: {
      occupation: string;
      tobacco: string;
      alcohol: string;
      living_situation: string;
    };
    patient_goals: string;
    consent_for_treatment_and_data_sharing: boolean;
  };
  
  objective: {
    vitals: {
      heart_rate_bpm?: number; // 40-200
      blood_pressure_mmHg: string; // "120/80"
      respiratory_rate_bpm?: number; // 8-40
      spo2_percent?: number; // 70-100
      temperature_c?: number; // 35-42
    };
    general_condition: "Good" | "Fair" | "Poor";
    ambulatory_status: "Independent" | "WithAid" | "Wheelchair" | "Bedridden";
    observation: {
      posture: { anterior; posterior; lateral };
      gait: { barefoot; with_aids };
    };
    palpation: {
      tenderness_grade: number; // 0-4
      tone: string;
      crepitus: string;
    };
    rom: {
      arom: { [key: string]: string }; // e.g., lumbar_flexion: "40 deg"
      prom: { [key: string]: string };
      end_feel: string;
    };
    strength: {
      mmt: { [key: string]: number }; // 0-5 grade
    };
    neuro: {
      sensation: string;
      reflexes: { [key: string]: string };
    };
    functional_tests: {
      tug_sec?: number; // Timed Up and Go
      six_mwt_m?: number; // 6-Minute Walk Test
      other: string;
    };
    measurements: {
      limb_length_true_cm?: number;
      girth_cm: { [key: string]: number };
    };
    attachments: string[]; // document IDs
  };
  
  assessment: {
    problem_list: string[];
    working_diagnosis: string;
    red_flags_present: boolean;
    clinical_impression: string;
  };
  
  plan: {
    short_term_goals: Array<{
      goal_id: string;
      description: string;
      baseline_value: string;
      target_value: string;
      target_date: string; // YYYY-MM-DD
      owner_clinician_id: string;
    }>;
    long_term_goals: Array<...>;
    treatment_plan: {
      treatment_id: string;
      title: string;
      start_date: string;
      end_date: string;
      frequency_per_week: number; // 1-7
      duration_minutes: number; // 15-180
      interventions: Array<{
        exercise_id: string;
        name: string;
        reps: number;
        sets: number;
        hold_seconds: number;
        progression_rule: string;
        resource_ref: string;
      }>;
      modalities: string[]; // e.g., ["heat", "TENS"]
      education: string[];
      home_program: string;
    };
    monitoring: {
      metrics_to_track: string[]; // e.g., ["pain_vas", "tug_sec"]
      review_interval_days: number;
    };
    next_follow_up: string; // YYYY-MM-DD
  };
  
  created_at: string;
  updated_at: string;
}
```

### Progress Entry
```typescript
interface ProgressEntry {
  id: string;
  patient_id: string;
  date_time: string; // ISO 8601
  metric_key: string; // "pain_vas", "tug_sec", etc.
  value: number;
  unit: string; // "score", "sec", "deg", "m"
  source: "clinic" | "patient_report" | "device";
  clinician_id?: string;
  notes?: string;
  created_at: string;
}
```

---

## Server Actions (Usage)

### Patients
```typescript
// lib/actions/patients.ts
signIn(formData: FormData) → { error?: string }
signOut() → redirect("/login")
getPatients(search?: string) → Patient[]
getPatient(id: string) → Patient
createPatient(formData: PatientFormData) → { data?: Patient; error?: string }
updatePatient(id: string, formData: PatientFormData) → { data?: Patient; error?: string }
```

### Encounters
```typescript
// lib/actions/encounters.ts
getEncounters(patientId: string) → Encounter[]
getEncounter(id: string) → Encounter
createEncounter(formData: EncounterFormData) → { data?: Encounter; error?: string }
getProgressEntries(patientId: string, metricKey?: string) → ProgressEntry[]
createProgressEntry(formData: ProgressEntryFormData) → { data?: ProgressEntry; error?: string }
getRecentEncounters(limit = 5) → Encounter[]
```

### Documents
```typescript
// lib/actions/documents.ts
getDocuments(patientId: string) → Document[]
uploadDocument(formData: FormData) → { data?: Document; error?: string }
getDocumentUrl(storageReference: string) → string | null
```

### Portal & Audit
```typescript
// lib/actions/portal.ts
getPatientSummary() → { patient; painHistory; latestPain; homeProgram; nextFollowUp }
getAuditLogs(limit = 50) → AuditLog[]
getCurrentProfile() → Profile | null
```

---

## Validation (Zod Schemas)

### Patient Schema
```typescript
// lib/validators/schemas.ts
patientSchema: z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  sex: z.enum(["Male", "Female", "Other"]),
  contact_phone: z.string().regex(/^\+91-\d{10}$/), // +91-XXXXXXXXXX
  email: z.string().email().optional(),
  address: z.string().optional(),
  primary_diagnosis: z.string().min(1),
  comorbidities: z.array(z.string()).default([]),
  current_medications: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  mobility_aids: z.array(z.string()).default([]),
  emergency_contact: emergencyContactSchema.optional(),
  caregiver: caregiverSchema.optional(),
  consent_signed: z.boolean(),
  consent_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

encounterSchema: z.object({
  patient_id: z.string().uuid(),
  clinician_id: z.string().uuid(),
  date_time: z.string().datetime(),
  encounter_type: z.enum([...]),
  location: z.string().min(1),
  confidentiality_level: z.enum(["Standard", "Sensitive"]),
  notes: z.string().optional(),
  subjective: subjectiveSchema,
  objective: objectiveSchema,
  assessment: assessmentSchema,
  plan: planSchema,
});

progressEntrySchema: z.object({
  patient_id: z.string().uuid(),
  date_time: z.string().datetime(),
  metric_key: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  source: z.enum(["clinic", "patient_report", "device"]),
  clinician_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});
```

---

## Database: Common Queries

### Get All Patients (Clinician View)
```sql
SELECT * FROM patients ORDER BY last_name, first_name;
```

### Get Patient with Recent Encounters
```sql
SELECT p.*, e.id, e.date_time, e.encounter_type
FROM patients p
LEFT JOIN encounters e ON e.patient_id = p.id
WHERE p.id = $1
ORDER BY e.date_time DESC;
```

### Get Progress for Chart
```sql
SELECT date_time, value, unit
FROM progress_entries
WHERE patient_id = $1 AND metric_key = $2
ORDER BY date_time ASC;
```

### Get Audit Trail for Entity
```sql
SELECT * FROM audit_logs
WHERE entity = $1 AND entity_id = $2
ORDER BY timestamp DESC;
```

---

## RLS Policies (PostgreSQL)

All tables have Row Level Security. Examples:

```sql
-- Clinicians can read all patients
CREATE POLICY "Clinicians full access to patients"
  ON patients FOR ALL
  USING (is_clinician(auth.uid()));

-- Patients can only read their own record
CREATE POLICY "Patients read own record"
  ON patients FOR SELECT
  USING (id = get_patient_id_for_user(auth.uid()));

-- All clinician data access is logged
CREATE POLICY "Authenticated users insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Utility Functions

```typescript
// lib/utils.ts
formatDate(date: string | Date): string;
  // "2026-01-15" → "Jan 15, 2026"

formatDateTime(date: string | Date): string;
  // "2026-01-15T14:30:00Z" → "Jan 15, 2026 at 2:30 PM"

cn(...classes: string[]): string;
  // Merge Tailwind class strings (with shadcn/ui cva support)

// lib/audit.ts
logAudit({
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void>;
  // Call from server actions to log all mutations
```

---

## Environment Variables

```bash
# .env.local (NEVER commit to git)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...  # Only used for seed script
```

---

## Testing Tips

1. **Browser DevTools → Console** for client errors
2. **Browser DevTools → Network** to see API calls to Supabase
3. **Supabase Dashboard → Logs** to see query performance
4. **Supabase Dashboard → SQL Editor** to manually check data
5. **Vercel Dashboard → Logs** for production errors

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| TypeScript errors on build | Run `npm run build` to see full errors |
| Page shows 403/auth error | Check user has role in profiles table |
| Encounter form won't submit | Check all mandatory fields, especially consent |
| Progress chart empty | Ensure metric_key matches preset values |
| Document upload fails | Check patient exists and storage bucket is public RLS-enabled |
| Audit log empty | Logs only appear after mutations; READ logs on patient list |

---

## Next Steps for Post-Demo

1. **Data Retention Policy** — Define how long to keep audit logs (GDPR, HIPAA)
2. **Backup Strategy** — Set up Supabase automatic backups
3. **Scaling** — For >1000 patients, optimize DB indexes & implement pagination
4. **Localization** — Add Hindi UI & date formats (post-V1)
5. **Testing** — Add Jest unit tests + Playwright E2E tests
6. **Analytics** — Log patient outcomes (retention, goals met %)

Enjoy! 🚀
