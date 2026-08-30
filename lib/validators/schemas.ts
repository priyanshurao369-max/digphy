import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");
const isoDateTime = z.string().datetime({ offset: true }).or(
  z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/, "Use ISO 8601 datetime")
);
const phoneRegex = /^\+91-\d{10}$/;

export const sexEnum = z.enum(["Male", "Female", "Other"]);
export const branchSpecialtyEnum = z.enum([
  "Orthopedic",
  "Cardiorespiratory",
  "Neurological",
  "Geriatric",
  "Pediatric",
]);
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
  name: z.string().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  relationship: z.string().optional().nullable().or(z.literal("")),
});

export const caregiverSchema = z.object({
  name: z.string().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  relationship: z.string().optional().nullable().or(z.literal("")),
});

export const patientSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  sex: sexEnum,
  contact_phone: z.string().min(1, "Contact phone is required"),
  email: z.string().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable().or(z.literal("")),
  emergency_contact: emergencyContactSchema.optional().nullable(),
  primary_diagnosis: z.string().min(1, "Primary diagnosis is required"),
  branch_specialty: branchSpecialtyEnum.default("Orthopedic"),
  comorbidities: z.array(z.string()).default([]),
  current_medications: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  mobility_aids: z.array(z.string()).default([]),
  caregiver: caregiverSchema.optional().nullable(),
  consent_signed: z.boolean().default(true),
  consent_date: z.string().optional().nullable(),
});

export const encounterHeaderSchema = z.object({
  patient_id: z.string().min(1),
  clinician_id: z.string().min(1),
  date_time: z.string().min(1),
  encounter_type: encounterTypeEnum,
  location: z.string().default("Clinic"),
  confidentiality_level: confidentialityEnum.default("Standard"),
  notes: z.string().optional().nullable(),
});

export const subjectiveSchema = z.object({
  chief_complaint: z.string().min(1, "Chief complaint is required"),
  history_of_present_illness: z.object({
    onset_date: z.string().optional().default(""),
    mechanism: z.string().optional().default(""),
    mode_of_onset: modeOfOnsetEnum.default("Gradual"),
    duration_category: durationCategoryEnum.default("Subacute"),
  }).default({
    onset_date: "",
    mechanism: "",
    mode_of_onset: "Gradual",
    duration_category: "Subacute",
  }),
  pain: z.object({
    site: z.string().optional().default(""),
    type: painTypeEnum.default("Muscle"),
    descriptors: z.array(z.string()).default([]),
    intensity_vas: z.number().min(0).max(10).default(0),
    aggravating_factors: z.string().optional().default(""),
    relieving_factors: z.string().optional().default(""),
  }),
  past_medical_history: z.string().optional().default(""),
  surgical_history: z.string().optional().default(""),
  medications: z.array(z.string()).default([]),
  social_history: z.object({
    occupation: z.string().optional().default(""),
    tobacco: z.string().optional().default(""),
    alcohol: z.string().optional().default(""),
    living_situation: z.string().optional().default(""),
  }).default({
    occupation: "",
    tobacco: "",
    alcohol: "",
    living_situation: "",
  }),
  patient_goals: z.string().optional().default(""),
  consent_for_treatment_and_data_sharing: z.boolean().default(true),
});

export const skinSoftTissueSeverityEnum = z.enum(["None", "Minor", "Important"]);

export const icfQualifierEnum = z.enum(["None", "Mild", "Moderate", "Severe", "Complete"]);

export const skinSoftTissuesSchema = z.object({
  swelling: skinSoftTissueSeverityEnum.default("None"),
  callus: skinSoftTissueSeverityEnum.default("None"),
  scar: skinSoftTissueSeverityEnum.default("None"),
  wound: skinSoftTissueSeverityEnum.default("None"),
  temperature: skinSoftTissueSeverityEnum.default("None"),
  infection: skinSoftTissueSeverityEnum.default("None"),
  pain: skinSoftTissueSeverityEnum.default("None"),
  abnormal_sensation: skinSoftTissueSeverityEnum.default("None"),
});

export const sensationItemSchema = z.object({
  right: z.boolean().default(false),
  left: z.boolean().default(false),
  specification: z.string().default(""),
});

export const sensationTableSchema = z.object({
  superficial: sensationItemSchema.default({ right: false, left: false, specification: "" }),
  deep: sensationItemSchema.default({ right: false, left: false, specification: "" }),
  numbness: sensationItemSchema.default({ right: false, left: false, specification: "" }),
  paresthesia: sensationItemSchema.default({ right: false, left: false, specification: "" }),
  other: sensationItemSchema.default({ right: false, left: false, specification: "" }),
});

export const reflexGradeEnum = z.enum(["+", "-", "normal"]);

export const reflexItemSchema = z.object({
  right: reflexGradeEnum.default("normal"),
  left: reflexGradeEnum.default("normal"),
});

export const reflexesTableSchema = z.object({
  btr: reflexItemSchema.default({ right: "normal", left: "normal" }),
  ttr: reflexItemSchema.default({ right: "normal", left: "normal" }),
  ktr: reflexItemSchema.default({ right: "normal", left: "normal" }),
  atr: reflexItemSchema.default({ right: "normal", left: "normal" }),
  babinski: z.object({
    right: z.boolean().default(false),
    left: z.boolean().default(false),
  }).default({ right: false, left: false }),
  comments: z.string().default(""),
});

export const objectiveSchema = z.object({
  vitals: z.object({
    heart_rate_bpm: z.number().nullable().optional(),
    blood_pressure_mmHg: z.string().optional().default(""),
    respiratory_rate_bpm: z.number().nullable().optional(),
    spo2_percent: z.number().nullable().optional(),
    temperature_c: z.number().nullable().optional(),
  }).default({
    heart_rate_bpm: null,
    blood_pressure_mmHg: "",
    respiratory_rate_bpm: null,
    spo2_percent: null,
    temperature_c: null,
  }),
  general_condition: generalConditionEnum.default("Good"),
  ambulatory_status: ambulatoryStatusEnum.default("Independent"),
  observation: z.object({
    posture: z.object({
      anterior: z.string().optional().default(""),
      posterior: z.string().optional().default(""),
      lateral: z.string().optional().default(""),
    }).default({ anterior: "", posterior: "", lateral: "" }),
    gait: z.object({
      barefoot: z.string().optional().default(""),
      with_aids: z.string().optional().default(""),
    }).default({ barefoot: "", with_aids: "" }),
  }).default({
    posture: { anterior: "", posterior: "", lateral: "" },
    gait: { barefoot: "", with_aids: "" },
  }),
  palpation: z.object({
    tenderness_grade: z.number().default(0),
    tone: z.string().optional().default("normal"),
    crepitus: z.string().optional().default("none"),
  }).default({ tenderness_grade: 0, tone: "normal", crepitus: "none" }),
  rom: z.object({
    arom: z.record(z.string()).default({}),
    prom: z.record(z.string()).default({}),
    end_feel: z.string().optional().default("firm"),
  }).default({ arom: {}, prom: {}, end_feel: "firm" }),
  strength: z.object({
    mmt: z.record(z.number()).default({}),
  }).default({ mmt: {} }),
  neuro: z.object({
    sensation: z.string().optional().default("normal"),
    reflexes: z.record(z.string()).default({}),
  }).default({ sensation: "normal", reflexes: {} }),
  skin_and_soft_tissues: skinSoftTissuesSchema.optional(),
  sensation_table: sensationTableSchema.optional(),
  reflexes_table: reflexesTableSchema.optional(),
  activity_limitations: z.object({
    items: z.record(icfQualifierEnum).default({}),
    comments: z.string().optional().default(""),
  }).default({ items: {}, comments: "" }),
  participation_restrictions: z.object({
    items: z.record(z.boolean()).default({}),
    comments: z.string().optional().default(""),
  }).default({ items: {}, comments: "" }),
  functional_tests: z.object({
    tug_sec: z.number().nullable().optional(),
    six_mwt_m: z.number().nullable().optional(),
    other: z.string().optional().default(""),
  }).default({ tug_sec: null, six_mwt_m: null, other: "" }),
  measurements: z.object({
    limb_length_true_cm: z.number().nullable().optional(),
    girth_cm: z.record(z.number()).default({}),
  }).default({ limb_length_true_cm: null, girth_cm: {} }),
  branch_specific: z.object({
    orthopedic: z.object({
      special_tests: z.array(z.string()).default([]),
      special_test_results: z.array(z.object({
        name: z.string().min(1),
        result: z.enum(["positive", "negative", "nt"]).default("nt"),
      })).default([]),
      end_feel: z.string().default("Firm"),
      joint_play: z.string().default("Normal"),
      swelling_grade: z.string().default("None"),
      limb_length_apparent_cm: z.number().nullable().optional(),
    }).optional(),
    cardiorespiratory: z.object({
      auscultation_notes: z.string().default("Vesicular breath sounds"),
      auscultation_finding: z.string().default("Vesicular"),
      cough_strength: z.string().default("Strong"),
      sputum_characteristics: z.string().default("Clear"),
      borg_dyspnea_score: z.number().nullable().optional(),
      chest_expansion_cm: z.number().nullable().optional(),
      iswt_m: z.number().nullable().optional(),
    }).optional(),
    neurological: z.object({
      modified_ashworth_scale: z.number().nullable().optional(),
      berg_balance_score: z.number().nullable().optional(),
      coordination_notes: z.string().default("Intact"),
      coordination_result: z.string().default("Normal"),
    }).optional(),
    geriatric: z.object({
      thirty_sec_chair_stand_reps: z.number().nullable().optional(),
      adl_index_score: z.number().nullable().optional(),
      fall_history_count: z.number().nullable().optional(),
      katz_items: z.record(z.boolean()).default({}),
      lawton_items: z.record(z.boolean()).default({}),
    }).optional(),
    pediatric: z.object({
      gmfm_percentage: z.number().nullable().optional(),
      pedi_score: z.number().nullable().optional(),
      tone_assessment: z.string().default("Normal"),
      milestones_achieved: z.array(z.string()).default([]),
    }).optional(),
  }).optional(),
  attachments: z.array(z.string()).default([]),
});

export const assessmentSchema = z.object({
  problem_list: z.array(z.string()).min(1, "At least one problem required"),
  working_diagnosis: z.string().min(1, "Working diagnosis is required"),
  red_flags_present: z.boolean().default(false),
  clinical_impression: z.string().optional().default(""),
});

export const goalSchema = z.object({
  goal_id: z.string().min(1),
  description: z.string().min(1),
  baseline_value: z.string().default(""),
  target_value: z.string().default(""),
  target_date: z.string().default(""),
  owner_clinician_id: z.string().min(1),
});

export const interventionSchema = z.object({
  exercise_id: z.string().min(1),
  name: z.string().min(1),
  reps: z.number().min(0).default(10),
  sets: z.number().min(0).default(3),
  hold_seconds: z.number().min(0).default(0),
  progression_rule: z.string().default(""),
  resource_ref: z.string().default(""),
});

export const planSchema = z.object({
  short_term_goals: z.array(goalSchema).default([]),
  long_term_goals: z.array(goalSchema).default([]),
  treatment_plan: z.object({
    treatment_id: z.string().min(1),
    title: z.string().optional().default("Rehabilitation Plan"),
    start_date: z.string().optional().default(""),
    end_date: z.string().optional().default(""),
    frequency_per_week: z.number().min(1).max(7).default(3),
    duration_minutes: z.number().min(15).max(180).default(45),
    interventions: z.array(interventionSchema).default([]),
    modalities: z.array(z.string()).default([]),
    education: z.array(z.string()).default([]),
    home_program: z.string().optional().default(""),
  }),
  monitoring: z.object({
    metrics_to_track: z.array(z.string()).default([]),
    review_interval_days: z.number().min(1).default(7),
  }).default({
    metrics_to_track: ["pain_vas"],
    review_interval_days: 7,
  }),
  next_follow_up: z.string().optional().default(""),
});

// Manual progress metric samples captured inside the encounter wizard
export const progressMetricSampleSchema = z.object({
  metric_key: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  notes: z.string().optional().default(""),
});

export const encounterSchema = encounterHeaderSchema.extend({
  subjective: subjectiveSchema,
  objective: objectiveSchema,
  assessment: assessmentSchema,
  plan: planSchema,
  progress_metrics: z.array(progressMetricSampleSchema).default([]),
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

export type ProgressMetricSample = z.infer<typeof progressMetricSampleSchema>;

export type PatientFormData = z.infer<typeof patientSchema>;
export type EncounterFormData = z.infer<typeof encounterSchema>;
export type ProgressEntryFormData = z.infer<typeof progressEntrySchema>;

export const METRIC_PRESETS = [
  { key: "pain_vas", label: "Pain (VAS 0-10)", unit: "score" },
  { key: "rom_knee_flexion_deg", label: "Knee Flexion ROM (Orthopedic)", unit: "deg" },
  { key: "six_mwt_m", label: "6-Minute Walk Distance (Cardiorespiratory)", unit: "m" },
  { key: "borg_dyspnea", label: "Borg Dyspnea Scale (Cardiorespiratory)", unit: "score" },
  { key: "berg_balance_score", label: "Berg Balance Score (Neurological)", unit: "score" },
  { key: "mas_spasticity_grade", label: "Modified Ashworth Scale (Neurological)", unit: "grade" },
  { key: "tug_sec", label: "Timed Up & Go (Geriatric)", unit: "sec" },
  { key: "thirty_sec_chair_stand", label: "30s Chair Stand Reps (Geriatric)", unit: "reps" },
  { key: "gmfm_pct", label: "GMFM-88/66 Score (Pediatric)", unit: "%" },
  { key: "pedi_score", label: "PEDI Functional Score (Pediatric)", unit: "score" },
] as const;
