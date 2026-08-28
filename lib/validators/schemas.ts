import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");
const isoDateTime = z.string().datetime({ offset: true }).or(
  z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/, "Use ISO 8601 datetime")
);
const phoneRegex = /^\+91-\d{10}$/;

export const sexEnum = z.enum(["Male", "Female", "Other"]);
export const encounterTypeEnum = z.enum([
  "Initial",
  "Follow-up",
  "Telehealth",
  "HomeVisit",
  "Discharge",
]);
export const confidentialityEnum = z.enum(["Standard", "Sensitive"]);
export const modeOfOnsetEnum = z.enum(["Sudden", "Gradual", "Insidious", "Periodic"]);
export const durationCategoryEnum = z.enum(["Acute", "Subacute", "Chronic"]);
export const painTypeEnum = z.enum(["Muscle", "Joint", "Nerve", "Bone", "Vascular"]);
export const generalConditionEnum = z.enum(["Good", "Fair", "Poor"]);
export const ambulatoryStatusEnum = z.enum([
  "Independent",
  "WithAid",
  "Wheelchair",
  "Bedridden",
]);
export const documentTypeEnum = z.enum(["Consent", "Report", "Image", "Prescription"]);
export const progressSourceEnum = z.enum(["clinic", "patient_report", "device"]);

const vasScore = z.number().min(0).max(10);
const mmtGrade = z.number().min(0).max(5);
const tendernessGrade = z.number().min(0).max(4);

export const emergencyContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(phoneRegex, "Phone must be +91-XXXXXXXXXX"),
  relationship: z.string().min(1),
});

export const caregiverSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(phoneRegex, "Phone must be +91-XXXXXXXXXX"),
  relationship: z.string().min(1),
});

export const patientSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: isoDate,
  sex: sexEnum,
  contact_phone: z.string().regex(phoneRegex, "Phone must be +91-XXXXXXXXXX"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  emergency_contact: emergencyContactSchema.optional().nullable(),
  primary_diagnosis: z.string().min(1, "Primary diagnosis is required"),
  comorbidities: z.array(z.string()).default([]),
  current_medications: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  mobility_aids: z.array(z.string()).default([]),
  caregiver: caregiverSchema.optional().nullable(),
  consent_signed: z.boolean(),
  consent_date: isoDate.optional().nullable(),
});

export const encounterHeaderSchema = z.object({
  patient_id: z.string().uuid(),
  clinician_id: z.string().uuid(),
  date_time: isoDateTime,
  encounter_type: encounterTypeEnum,
  location: z.string().min(1),
  confidentiality_level: confidentialityEnum,
  notes: z.string().optional(),
});

export const subjectiveSchema = z.object({
  chief_complaint: z.string().min(1, "Chief complaint is required"),
  history_of_present_illness: z.object({
    onset_date: isoDate,
    mechanism: z.string(),
    mode_of_onset: modeOfOnsetEnum,
    duration_category: durationCategoryEnum,
  }),
  pain: z.object({
    site: z.string(),
    type: painTypeEnum,
    descriptors: z.array(z.string()).default([]),
    intensity_vas: vasScore,
    aggravating_factors: z.string(),
    relieving_factors: z.string(),
  }),
  past_medical_history: z.string(),
  surgical_history: z.string(),
  medications: z.array(z.string()).default([]),
  social_history: z.object({
    occupation: z.string(),
    tobacco: z.string(),
    alcohol: z.string(),
    living_situation: z.string(),
  }),
  patient_goals: z.string(),
  consent_for_treatment_and_data_sharing: z.literal(true, {
    errorMap: () => ({ message: "Consent for treatment is required" }),
  }),
});

export const objectiveSchema = z.object({
  vitals: z.object({
    heart_rate_bpm: z.number().min(40).max(200).nullable(),
    blood_pressure_mmHg: z.string(),
    respiratory_rate_bpm: z.number().min(8).max(40).nullable(),
    spo2_percent: z.number().min(70).max(100).nullable(),
    temperature_c: z.number().min(35).max(42).nullable(),
  }),
  general_condition: generalConditionEnum,
  ambulatory_status: ambulatoryStatusEnum,
  observation: z.object({
    posture: z.object({
      anterior: z.string(),
      posterior: z.string(),
      lateral: z.string(),
    }),
    gait: z.object({
      barefoot: z.string(),
      with_aids: z.string(),
    }),
  }),
  palpation: z.object({
    tenderness_grade: tendernessGrade,
    tone: z.string(),
    crepitus: z.string(),
  }),
  rom: z.object({
    arom: z.record(z.string()),
    prom: z.record(z.string()),
    end_feel: z.string(),
  }),
  strength: z.object({
    mmt: z.record(mmtGrade),
  }),
  neuro: z.object({
    sensation: z.string(),
    reflexes: z.record(z.string()),
  }),
  functional_tests: z.object({
    tug_sec: z.number().min(0).nullable(),
    six_mwt_m: z.number().min(0).nullable(),
    other: z.string(),
  }),
  measurements: z.object({
    limb_length_true_cm: z.number().nullable(),
    girth_cm: z.record(z.number()),
  }),
  attachments: z.array(z.string()).default([]),
});

export const assessmentSchema = z.object({
  problem_list: z.array(z.string()).min(1, "At least one problem required"),
  working_diagnosis: z.string().min(1, "Working diagnosis is required"),
  red_flags_present: z.boolean(),
  clinical_impression: z.string(),
});

export const goalSchema = z.object({
  goal_id: z.string().uuid(),
  description: z.string().min(1),
  baseline_value: z.string(),
  target_value: z.string(),
  target_date: isoDate,
  owner_clinician_id: z.string().uuid(),
});

export const interventionSchema = z.object({
  exercise_id: z.string().uuid(),
  name: z.string().min(1),
  reps: z.number().min(0),
  sets: z.number().min(0),
  hold_seconds: z.number().min(0),
  progression_rule: z.string(),
  resource_ref: z.string(),
});

export const planSchema = z.object({
  short_term_goals: z.array(goalSchema).default([]),
  long_term_goals: z.array(goalSchema).default([]),
  treatment_plan: z.object({
    treatment_id: z.string().uuid(),
    title: z.string().min(1),
    start_date: isoDate,
    end_date: isoDate,
    frequency_per_week: z.number().min(1).max(7),
    duration_minutes: z.number().min(15).max(180),
    interventions: z.array(interventionSchema).default([]),
    modalities: z.array(z.string()).default([]),
    education: z.array(z.string()).default([]),
    home_program: z.string(),
  }),
  monitoring: z.object({
    metrics_to_track: z.array(z.string()).default([]),
    review_interval_days: z.number().min(1),
  }),
  next_follow_up: isoDate,
});

export const encounterSchema = encounterHeaderSchema.extend({
  subjective: subjectiveSchema,
  objective: objectiveSchema,
  assessment: assessmentSchema,
  plan: planSchema,
});

export const progressEntrySchema = z.object({
  patient_id: z.string().uuid(),
  date_time: isoDateTime,
  metric_key: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  source: progressSourceEnum,
  clinician_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
});

export const documentSchema = z.object({
  patient_id: z.string().uuid(),
  type: documentTypeEnum,
  filename: z.string().min(1),
  storage_reference: z.string().min(1),
  access_restrictions: z.array(z.string()).default([]),
});

export type PatientFormData = z.infer<typeof patientSchema>;
export type EncounterFormData = z.infer<typeof encounterSchema>;
export type ProgressEntryFormData = z.infer<typeof progressEntrySchema>;

export const METRIC_PRESETS = [
  { key: "pain_vas", label: "Pain (VAS)", unit: "score" },
  { key: "rom_knee_flexion_deg", label: "Knee Flexion ROM", unit: "deg" },
  { key: "tug_sec", label: "Timed Up and Go", unit: "sec" },
  { key: "six_mwt_m", label: "6-Minute Walk Test", unit: "m" },
] as const;
