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
export const painTypeEnum = z.enum(["Muscle", "Ligament", "Joint", "Nerve", "Bone", "Vascular", "Sympathetic"]);
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
    condition_course: z.enum(["Improved", "Stationary", "Worsened"]).default("Stationary"),
    current_treatment: z.string().optional().default(""),
    investigations: z.array(z.string()).default([]),
    investigation_findings: z.string().optional().default(""),
  }).default({
    onset_date: "",
    mechanism: "",
    mode_of_onset: "Gradual",
    duration_category: "Subacute",
    condition_course: "Stationary",
    current_treatment: "",
    investigations: [],
    investigation_findings: "",
  }),
  pain: z.object({
    site: z.string().optional().default(""),
    side: z.string().optional().default(""),
    type: painTypeEnum.default("Muscle"),
    frequency: z.string().optional().default(""),
    descriptors: z.array(z.string()).default([]),
    intensity_vas: z.number().min(0).max(10).default(0),
    aggravating_factors: z.string().optional().default(""),
    relieving_factors: z.string().optional().default(""),
    nature_notes: z.string().optional().default(""),
  }).default({
    site: "",
    side: "",
    type: "Muscle",
    frequency: "",
    descriptors: [],
    intensity_vas: 0,
    aggravating_factors: "",
    relieving_factors: "",
    nature_notes: "",
  }),
  past_medical_history: z.string().optional().default(""),
  surgical_history: z.string().optional().default(""),
  medications: z.array(z.string()).default([]),
  social_history: z.object({
    occupation: z.string().optional().default(""),
    tobacco: z.string().optional().default(""),
    tobacco_details: z.string().optional().default(""),
    smoking_details: z.string().optional().default(""),
    alcohol: z.string().optional().default(""),
    alcohol_details: z.string().optional().default(""),
    sleep_habits: z.string().optional().default(""),
    physical_activity: z.string().optional().default(""),
    living_situation: z.string().optional().default(""),
    family_history: z.string().optional().default(""),
    hereditary_diseases: z.string().optional().default(""),
    consanguinity: z.string().optional().default("No"),
    social_status: z.string().optional().default(""),
    educational_status: z.string().optional().default(""),
    environmental_history: z.string().optional().default(""),
  }).default({
    occupation: "",
    tobacco: "",
    tobacco_details: "",
    smoking_details: "",
    alcohol: "",
    alcohol_details: "",
    sleep_habits: "",
    physical_activity: "",
    living_situation: "",
    family_history: "",
    hereditary_diseases: "",
    consanguinity: "No",
    social_status: "",
    educational_status: "",
    environmental_history: "",
  }),
  patient_goals: z.string().optional().default(""),
  consent_for_treatment_and_data_sharing: z.boolean().default(true),
  // Extended Clinical Header & Branch Specific Subjective Fields
  ip_number: z.string().optional().default(""),
  date_of_admission: z.string().optional().default(""),
  provisional_diagnosis: z.string().optional().default(""),
  referred_by: z.string().optional().default(""),
  laboratory_reports: z.string().optional().default(""),
  handedness_dominance: z.string().optional().default("Right"),
  adl_difficulties: z.object({
    ambulation: z.string().optional().default(""),
    bed_activities: z.string().optional().default(""),
    dressing: z.string().optional().default(""),
    eating: z.string().optional().default(""),
    toilet_activities: z.string().optional().default(""),
  }).optional().default({}),
  weakness_detail: z.object({
    side: z.string().optional().default(""),
    site: z.string().optional().default(""),
    duration_adl: z.string().optional().default(""),
  }).optional().default({}),
  sensory_problems: z.string().optional().default(""),
  balance_problems: z.string().optional().default(""),
  present_history_detailed: z.object({
    mode_of_transportation: z.string().optional().default(""),
    consciousness_status: z.string().optional().default("Conscious"),
    bleeding_sites: z.string().optional().default("None"),
    nature_severity: z.string().optional().default(""),
    associated_symptoms: z.string().optional().default(""),
  }).optional().default({}),
  past_history_detailed: z.object({
    general_health_prior: z.string().optional().default("Good"),
    pregnancies_miscarriages: z.string().optional().default("N/A"),
    past_physio_treatment: z.string().optional().default("None"),
    past_prognosis: z.string().optional().default(""),
  }).optional().default({}),
  personal_history_detailed: z.object({
    marital_history: z.string().optional().default(""),
    habits: z.string().optional().default(""),
  }).optional().default({}),
  family_history_detailed: z.object({
    similar_symptoms: z.string().optional().default("None"),
    hereditary_diseases: z.string().optional().default("None"),
    infectious_diseases: z.string().optional().default("None"),
  }).optional().default({}),
  economical_history: z.object({
    occupation_income: z.string().optional().default(""),
    source_of_income: z.string().optional().default(""),
    family_expenses: z.string().optional().default(""),
  }).optional().default({}),
  social_education: z.object({
    education_patient: z.string().optional().default(""),
    education_spouse: z.string().optional().default(""),
    education_family: z.string().optional().default(""),
  }).optional().default({}),
  environmental_detailed: z.object({
    home_environment: z.string().optional().default(""),
    work_environment: z.string().optional().default(""),
  }).optional().default({}),
  observation_detailed: z.object({
    built: z.string().optional().default("Mesomorphic"),
    posture: z.string().optional().default("Normal alignment"),
    respiration_pattern: z.string().optional().default("Symmetric abdominal-thoracic"),
    appliances: z.string().optional().default("None"),
    trophic_changes: z.string().optional().default("Absent"),
    wounds_edema_sutures: z.string().optional().default("None"),
    limb_attitude: z.string().optional().default("Normal posture"),
    involuntary_movements: z.string().optional().default("Absent"),
    muscle_wasting: z.string().optional().default("None"),
  }).optional().default({}),
  palpation_detailed: z.object({
    tenderness_grade: z.number().optional().default(0),
    temperature: z.string().optional().default("Normal"),
    spasm_tension: z.string().optional().default("Normal"),
    swelling: z.string().optional().default("None"),
    tone: z.string().optional().default("Normal"),
  }).optional().default({}),
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
    sensorium: z.string().optional().default("Alert"),
    body_build: z.string().optional().default("Mesomorphic"),
    deformities: z.string().optional().default(""),
    external_aids: z.string().optional().default(""),
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
    sensorium: "Alert",
    body_build: "Mesomorphic",
    deformities: "",
    external_aids: "",
    posture: { anterior: "", posterior: "", lateral: "" },
    gait: { barefoot: "", with_aids: "" },
  }),
  palpation: z.object({
    tenderness_grade: z.number().default(0),
    tone: z.string().optional().default("normal"),
    crepitus: z.string().optional().default("none"),
    ligamentous_snaps: z.string().optional().default("Absent"),
    cracking_distraction: z.string().optional().default("Absent"),
    capillary_refill: z.string().optional().default("Normal"),
    nodules: z.string().optional().default(""),
    pulses: z.string().optional().default("Palpable & symmetrical"),
    scar_status: z.string().optional().default(""),
    edema_type: z.string().optional().default("None"),
    edema_notes: z.string().optional().default(""),
    swelling_type: z.string().optional().default(""),
  }).default({
    tenderness_grade: 0,
    tone: "normal",
    crepitus: "none",
    ligamentous_snaps: "Absent",
    cracking_distraction: "Absent",
    capillary_refill: "Normal",
    nodules: "",
    pulses: "Palpable & symmetrical",
    scar_status: "",
    edema_type: "None",
    edema_notes: "",
    swelling_type: "",
  }),
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
      evaluation_date: z.string().optional().default(""),
      bp_systolic_resting: z.number().nullable().optional(),
      bp_diastolic_resting: z.number().nullable().optional(),
      bp_systolic_post_exercise: z.number().nullable().optional(),
      bp_diastolic_post_exercise: z.number().nullable().optional(),
      hr_resting_bpm: z.number().nullable().optional(),
      hr_post_exercise_bpm: z.number().nullable().optional(),
      respiratory_rate_bpm: z.number().nullable().optional(),
      spo2_percent: z.number().nullable().optional(),
      ecg_results: z.string().optional().default("Normal Sinus Rhythm"),
      cardiac_auscultation_details: z.string().optional().default("Normal S1, S2; no murmurs, rubs, or gallops"),
      echocardiogram_findings: z.string().optional().default(""),
      stress_test_results: z.string().optional().default(""),
      holter_monitor_data: z.string().optional().default(""),
      coronary_angiography_findings: z.string().optional().default(""),
      cardiac_biomarkers: z.object({
        troponin: z.string().optional().default("Normal"),
        ck_mb: z.string().optional().default("Normal"),
      }).optional().default({ troponin: "Normal", ck_mb: "Normal" }),
      hrv_sdnn_ms: z.number().nullable().optional(),
      exercise_tolerance_test: z.string().optional().default(""),
      lipid_profile: z.object({
        cholesterol: z.number().nullable().optional(),
        hdl: z.number().nullable().optional(),
        ldl: z.number().nullable().optional(),
        triglycerides: z.number().nullable().optional(),
      }).optional().default({ cholesterol: null, hdl: null, ldl: null, triglycerides: null }),
      blood_glucose: z.object({
        fasting_mg_dl: z.number().nullable().optional(),
        hba1c_pct: z.number().nullable().optional(),
      }).optional().default({ fasting_mg_dl: null, hba1c_pct: null }),
      bmi_kg_m2: z.number().nullable().optional(),
      inflammatory_markers: z.object({
        crp_mg_l: z.number().nullable().optional(),
        esr_mm_hr: z.number().nullable().optional(),
      }).optional().default({ crp_mg_l: null, esr_mm_hr: null }),
      chest_pain_characteristics: z.object({
        onset: z.string().optional().default(""),
        duration: z.string().optional().default(""),
        intensity_0_10: z.number().optional().default(0),
        quality: z.string().optional().default(""),
        radiation: z.string().optional().default(""),
      }).optional().default({ onset: "", duration: "", intensity_0_10: 0, quality: "", radiation: "" }),
      dyspnea_assessment: z.object({
        nyha_class: z.string().optional().default("Class I"),
        mmrc_grade: z.string().optional().default("Grade 0"),
        borg_score: z.number().nullable().optional(),
      }).optional().default({ nyha_class: "Class I", mmrc_grade: "Grade 0", borg_score: null }),
      peripheral_edema: z.object({
        presence: z.boolean().default(false),
        pitting_grade: z.string().optional().default("0 (None)"),
        location: z.string().optional().default("None"),
      }).optional().default({ presence: false, pitting_grade: "0 (None)", location: "None" }),
      cardiac_symptoms_history: z.object({
        palpitations: z.boolean().default(false),
        syncope: z.boolean().default(false),
        dizziness: z.boolean().default(false),
        details: z.string().optional().default(""),
      }).optional().default({ palpitations: false, syncope: false, dizziness: false, details: "" }),
      cv_risk_factors: z.object({
        smoking: z.boolean().default(false),
        hypertension: z.boolean().default(false),
        diabetes: z.boolean().default(false),
        family_history: z.boolean().default(false),
        details: z.string().optional().default(""),
      }).optional().default({ smoking: false, hypertension: false, diabetes: false, family_history: false, details: "" }),
      sleep_apnea_screening: z.object({
        stop_bang_score: z.number().nullable().optional(),
        risk_category: z.string().optional().default("Low Risk"),
      }).optional().default({ stop_bang_score: null, risk_category: "Low Risk" }),
      cardiac_medications_and_treatments: z.string().optional().default(""),
    }).partial().optional(),
    neurological: z.object({
      modified_ashworth_scale: z.number().nullable().optional(),
      berg_balance_score: z.number().nullable().optional(),
      coordination_notes: z.string().default("Intact"),
      coordination_result: z.string().default("Normal"),
      higher_mental_functions: z.object({
        level_of_consciousness: z.string().optional().default("Alert"),
        glasgow_coma_scale: z.object({
          eye: z.number().default(4),
          verbal: z.number().default(5),
          motor: z.number().default(6),
          total: z.number().default(15),
        }).optional().default({ eye: 4, verbal: 5, motor: 6, total: 15 }),
        behavior: z.string().optional().default("Cooperative"),
        emotional_status: z.string().optional().default("Stable"),
        orientation: z.object({
          time: z.boolean().default(true),
          place: z.boolean().default(true),
          person: z.boolean().default(true),
          day: z.boolean().default(true),
          year: z.boolean().default(true),
        }).optional().default({ time: true, place: true, person: true, day: true, year: true }),
        memory: z.object({
          immediate: z.string().optional().default("Intact"),
          short_term: z.string().optional().default("Intact"),
          long_term: z.string().optional().default("Intact"),
        }).optional().default({ immediate: "Intact", short_term: "Intact", long_term: "Intact" }),
        calculation: z.string().optional().default("Normal"),
        reasoning_problem_solving: z.string().optional().default("Normal"),
        judgement: z.string().optional().default("Normal"),
        attention: z.string().optional().default("Sustained"),
        cognitive_perceptual: z.string().optional().default("Intact"),
      }).optional().default({}),
      cranial_nerves: z.record(z.object({
        tested: z.boolean().default(true),
        status: z.string().default("Normal"),
        notes: z.string().default("Intact"),
      })).optional().default({}),
      sensory_examination: z.object({
        superficial: z.object({
          pain: z.string().optional().default("Normal"),
          temperature: z.string().optional().default("Normal"),
          light_touch: z.string().optional().default("Normal"),
          pressure: z.string().optional().default("Normal"),
        }).optional().default({ pain: "Normal", temperature: "Normal", light_touch: "Normal", pressure: "Normal" }),
        deep: z.object({
          proprioception: z.string().optional().default("Normal"),
          kinesthesia: z.string().optional().default("Normal"),
          vibration: z.string().optional().default("Normal"),
        }).optional().default({ proprioception: "Normal", kinesthesia: "Normal", vibration: "Normal" }),
        cortical: z.object({
          graphesthesia: z.string().optional().default("Normal"),
          stereognosis: z.string().optional().default("Normal"),
          tactile_localization: z.string().optional().default("Normal"),
          two_point_discrimination: z.string().optional().default("Normal"),
        }).optional().default({ graphesthesia: "Normal", stereognosis: "Normal", tactile_localization: "Normal", two_point_discrimination: "Normal" }),
      }).optional().default({}),
      motor_examination: z.object({
        modified_ashworth_scale: z.number().nullable().optional().default(0),
        spasticity_pattern: z.string().optional().default("None"),
        reflexes_deep_tendon: z.record(z.string()).optional().default({}),
        reflexes_pathological: z.object({
          babinski: z.string().optional().default("Negative"),
          hoffmann: z.string().optional().default("Negative"),
          clonus: z.string().optional().default("Absent"),
        }).optional().default({ babinski: "Negative", hoffmann: "Negative", clonus: "Absent" }),
        oxford_power_grade: z.record(z.number()).optional().default({}),
        rom_summary: z.string().optional().default("Full AROM"),
        muscle_tightness: z.string().optional().default("None"),
        voluntary_control: z.object({
          bobath_stage: z.string().optional().default("Stage 6 — Normal"),
          brunnstrom_stage: z.string().optional().default("Stage 6 — Isolated movements"),
        }).optional().default({ bobath_stage: "Stage 6 — Normal", brunnstrom_stage: "Stage 6 — Isolated movements" }),
      }).optional().default({}),
      balance_and_coordination: z.object({
        balance_static_dynamic: z.object({
          static_sitting: z.string().optional().default("Normal"),
          dynamic_sitting: z.string().optional().default("Normal"),
          static_standing: z.string().optional().default("Normal"),
          dynamic_standing: z.string().optional().default("Normal"),
        }).optional().default({ static_sitting: "Normal", dynamic_sitting: "Normal", static_standing: "Normal", dynamic_standing: "Normal" }),
        functional_balance_scale_score: z.number().nullable().optional(),
        coordination_tests: z.object({
          finger_to_nose: z.string().optional().default("Normal"),
          finger_to_finger: z.string().optional().default("Normal"),
          dysdiadochokinesia: z.string().optional().default("Normal"),
          knee_to_heel: z.string().optional().default("Normal"),
        }).optional().default({ finger_to_nose: "Normal", finger_to_finger: "Normal", dysdiadochokinesia: "Normal", knee_to_heel: "Normal" }),
        equilibrium_tests: z.object({
          tandem_walking: z.string().optional().default("Normal"),
          sideways_walking: z.string().optional().default("Normal"),
          single_leg_standing: z.string().optional().default("Normal"),
        }).optional().default({ tandem_walking: "Normal", sideways_walking: "Normal", single_leg_standing: "Normal" }),
      }).optional().default({}),
      gait_examination: z.object({
        ambulation_mode: z.string().optional().default("Independent"),
        step_length_cm: z.number().nullable().optional(),
        step_width_cm: z.number().nullable().optional(),
        stride_length_cm: z.number().nullable().optional(),
        stance_time_sec: z.number().nullable().optional(),
        cadence_steps_min: z.number().nullable().optional(),
        gait_deviations: z.string().optional().default("None"),
      }).optional().default({}),
      autonomic_system: z.object({
        ninhydrin_sweat_test: z.string().optional().default("Normal sudomotor function"),
        galvanic_skin_resistance: z.string().optional().default("Normal galvanic skin response"),
        vasomotor_sudomotor_notes: z.string().optional().default(""),
      }).optional().default({}),
      functional_evaluation: z.object({
        adl_performance: z.string().optional().default("Independent"),
        bladder_bowel_control: z.string().optional().default("Continent"),
      }).optional().default({ adl_performance: "Independent", bladder_bowel_control: "Continent" }),
    }).partial().optional(),

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
  dermatomes: z.string().optional().default(""),
  myotomes: z.string().optional().default(""),
  capsular_pattern: z.string().optional().default(""),
  loose_close_packed: z.string().optional().default(""),
  gait_parameters: z.object({
    step_length_cm: z.number().nullable().optional(),
    stride_length_cm: z.number().nullable().optional(),
    cadence_steps_min: z.number().nullable().optional(),
    base_width_cm: z.number().nullable().optional(),
    }).default({ step_length_cm: null, stride_length_cm: null, cadence_steps_min: null, base_width_cm: null }),
  functional_ul: z.record(z.string()).default({}),
  functional_ll: z.record(z.string()).default({}),
  attachments: z.array(z.string()).default([]),
});

export const assessmentSchema = z.object({
  problem_list: z.array(z.string()).min(1, "At least one problem required"),
  working_diagnosis: z.string().min(1, "Working diagnosis is required"),
  differential_diagnosis: z.array(z.string()).default([]),
  red_flags_present: z.boolean().default(false),
  clinical_impression: z.string().optional().default(""),
  final_diagnosis: z.string().optional().default(""),
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
  { key: "rom_lumbar_flexion_deg", label: "Lumbar Flexion ROM (Orthopedic)", unit: "deg" },
  { key: "girth_knee_R_cm", label: "Knee Girth – Right (Orthopedic)", unit: "cm" },
  { key: "six_mwt_m", label: "6-Minute Walk Distance (Cardiorespiratory)", unit: "m" },
  { key: "borg_dyspnea", label: "Borg Dyspnea Scale (Cardiorespiratory)", unit: "score" },
  { key: "chest_expansion_cm", label: "Chest Expansion (Cardiorespiratory)", unit: "cm" },
  { key: "berg_balance_score", label: "Berg Balance Score (Neurological)", unit: "score" },
  { key: "mas_spasticity_grade", label: "Modified Ashworth Scale (Neurological)", unit: "grade" },
  { key: "tug_sec", label: "Timed Up & Go (Geriatric)", unit: "sec" },
  { key: "thirty_sec_chair_stand", label: "30s Chair Stand Reps (Geriatric)", unit: "reps" },
  { key: "gmfm_pct", label: "GMFM-88/66 Score (Pediatric)", unit: "%" },
  { key: "pedi_score", label: "PEDI Functional Score (Pediatric)", unit: "score" },
  { key: "heart_rate_bpm", label: "Heart Rate (Rest)", unit: "bpm" },
  { key: "respiratory_rate_bpm", label: "Respiratory Rate (Rest)", unit: "bpm" },
  { key: "gait_cadence", label: "Gait Cadence", unit: "steps/min" },
  { key: "step_length_cm", label: "Step Length", unit: "cm" },
] as const;
