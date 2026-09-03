/**
 * In-memory mock data store for DigPhy demo.
 * Replaces Supabase entirely — data persists in module-level arrays
 * within a single Node.js process (sufficient for `npm run dev`).
 */
import { v4 as uuidv4 } from "uuid";
import type {
  Patient, Encounter, ProgressEntry, Document as Doc,
  AuditLog, Profile, SubjectiveData, ObjectiveData, AssessmentData, PlanData,
  BranchSpecialty,
} from "@/types";
import { extractMetricSamples } from "@/lib/metrics";

// ── Static IDs ──
export const CLINICIAN_ID = "550e8400-e29b-41d4-a716-446655440000";
export const PATIENT_RAJESH_USER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
export const PATIENT_PRIYA_USER_ID = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
export const PATIENT_RAJESH_ID = "72f1fab4-1c6a-4b3d-9254-0a6c7b8e9d01";
export const PATIENT_PRIYA_ID = "72f1fab4-1c6a-4b3d-9254-0a6c7b8e9d02";
// Branch-specific demo patients (Cardiorespiratory, Neurological, Geriatric, Pediatric)
export const PATIENT_MAYA_ID = "72f1fab4-1c6a-4b3d-9254-0a6c7b8e9d03";
export const PATIENT_MAYA_USER_ID = "6ba7b812-9dad-11d1-80b4-00c04fd430c8";
export const PATIENT_ARJUN_ID = "72f1fab4-1c6a-4b3d-9254-0a6c7b8e9d04";
export const PATIENT_ARJUN_USER_ID = "6ba7b813-9dad-11d1-80b4-00c04fd430c8";
export const PATIENT_GOPAL_ID = "72f1fab4-1c6a-4b3d-9254-0a6c7b8e9d05";
export const PATIENT_GOPAL_USER_ID = "6ba7b814-9dad-11d1-80b4-00c04fd430c8";
export const PATIENT_ISHAAN_ID = "72f1fab4-1c6a-4b3d-9254-0a6c7b8e9d06";
export const PATIENT_ISHAAN_USER_ID = "6ba7b815-9dad-11d1-80b4-00c04fd430c8";
export const ROLE_COOKIE = "digphy-role";
export const CLINICIAN_ROLE = "therapist";
export const PATIENT_ROLE = "patient";
export const DEFAULT_PATIENT_ID = PATIENT_RAJESH_ID;

// ── In-memory stores ──
// Cached on globalThis so Next.js dev-mode module re-evaluation (and warm
// serverless invocations) reuse the same data instead of reseeding.
const g = globalThis as unknown as {
  __digphyStore?: {
    profiles: Profile[]; patients: Patient[]; encounters: Encounter[];
    progressEntries: ProgressEntry[]; documents: Doc[]; auditLogs: AuditLog[];
  };
};

const store = (g.__digphyStore ??= {
  profiles: [], patients: [], encounters: [],
  progressEntries: [], documents: [], auditLogs: [],
});
const { profiles, patients, encounters, progressEntries, documents, auditLogs } = store;

const daysAgo = (n: number): string =>
  new Date(Date.now() - n * 86400000).toISOString();
const today = (): string => new Date().toISOString().split("T")[0]!;
const daysFromDate = (from: string, n: number): string =>
  new Date(new Date(from).getTime() + n * 86400000).toISOString().split("T")[0]!;

// ── Minimal valid PDF builder for demo seed documents ──
// Creates a minimal one-page PDF with the supplied title text.
function buildPdfDataUrl(line: string): string {
  // Escape parentheses and backslashes in the text for PDF compatibility
  const escaped = line.replace(/[()\\]/g, "\\$&");
  const stream = `BT /F1 12 Tf 60 100 Td (${escaped}) Tj ET`;
  const obj4 = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;

  const objects: string[] = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    obj4,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefPos = pdf.length;
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  // Encode as Latin-1 (PDF uses single-byte chars) then base64
  const encoded = Buffer.from(pdf, "latin1").toString("base64");
  return `data:application/pdf;base64,${encoded}`;
}

// ── Encounter builder ──
function buildEncounter(
  patientId: string, daysBack: number, type: "Initial" | "Follow-up",
  painVas: number, diagnosis: string, homeProgram: string,
  extra: { tugSec?: number | null; kneeFlex?: number; lumbarFlexion?: number } = {},
): Encounter {
  const dt = daysAgo(daysBack);
  const dateStr = new Date(dt).toISOString().split("T")[0]!;
  const fup = daysFromDate(dt, 7);
  const isRajesh = patientId === PATIENT_RAJESH_ID;

  const rom: ObjectiveData["rom"] = extra.kneeFlex
    ? { arom: { knee_flexion: `${extra.kneeFlex} deg` }, prom: { knee_flexion: `${extra.kneeFlex} deg` }, end_feel: "soft" as const }
    : { arom: { lumbar_flexion: `${extra.lumbarFlexion ?? 40} deg` }, prom: { lumbar_flexion: `${(extra.lumbarFlexion ?? 40) + 10} deg` }, end_feel: "firm" as const };

  const strength: ObjectiveData["strength"] = isRajesh
    ? { mmt: { hip_flexion_L: 4, hip_flexion_R: 5 } }
    : { mmt: { quadriceps_R: 4, hamstrings_R: 4, quadriceps_L: 5 } };

  const functional: ObjectiveData["functional_tests"] = extra.tugSec !== undefined
    ? { tug_sec: extra.tugSec, six_mwt_m: 420, other: "" }
    : { tug_sec: 14.2, six_mwt_m: 380, other: "" };

  const subj: SubjectiveData = {
    chief_complaint: isRajesh ? "Lower back pain with left leg radiation" : "Knee pain and stiffness after ACL reconstruction",
    history_of_present_illness: {
      onset_date: isRajesh ? "2025-12-01" : "2026-01-15",
      mechanism: isRajesh ? "Prolonged sitting, sudden onset when standing" : "Post-surgical rehabilitation",
      mode_of_onset: "Gradual", duration_category: "Subacute",
      condition_course: "Improved",
      current_treatment: isRajesh ? "NSAIDs, physiotherapy" : "Post-op care, physiotherapy",
      investigations: isRajesh ? ["MRI"] : ["X-ray"],
      investigation_findings: isRajesh ? "L4-L5 disc bulge with left S1 nerve root involvement" : "ACL graft intact, no loosening",
    },
    pain: {
      site: isRajesh ? "Lumbar spine, left leg" : "Right knee",
      side: isRajesh ? "Left" : "Right",
      type: isRajesh ? "Nerve" : "Joint",
      frequency: "Periodic",
      descriptors: isRajesh ? ["sharp", "burning"] : ["dull", "tight"],
      intensity_vas: painVas,
      aggravating_factors: isRajesh ? "Sitting, bending" : "Prolonged standing, stairs",
      relieving_factors: isRajesh ? "Walking, heat pack" : "Rest, elevation",
      nature_notes: isRajesh ? "Radiating down left leg to foot" : "Stiffness, worse in morning",
    },
    past_medical_history: isRajesh ? "Hypertension" : "None significant",
    surgical_history: isRajesh ? "None" : "Right ACL reconstruction (2026-01-15)",
    medications: isRajesh ? ["Amlodipine 5mg"] : [],
    social_history: {
      occupation: isRajesh ? "Software engineer" : "Yoga instructor",
      tobacco: "no", tobacco_details: "none",
      smoking_details: "none",
      alcohol: isRajesh ? "occasional" : "social", alcohol_details: isRajesh ? "1-2 drinks/month" : "1-2 drinks/week",
      sleep_habits: isRajesh ? "6-7 hrs, disturbed" : "7-8 hrs, good",
      physical_activity: isRajesh ? "Walking daily" : "Yoga, walking",
      living_situation: isRajesh ? "with family" : "alone",
      family_history: "none significant",
      hereditary_diseases: "none",
      social_status: "middle class",
      educational_status: "graduate",
      environmental_history: "office work",
      consanguinity: "No",
    },
    patient_goals: isRajesh ? "Return to work without pain" : "Return to yoga teaching and normal activities",
    consent_for_treatment_and_data_sharing: true,
  };

  const obj: ObjectiveData = {
    vitals: {
      heart_rate_bpm: isRajesh ? 72 : 68,
      blood_pressure_mmHg: isRajesh ? "128/82" : "110/70",
      respiratory_rate_bpm: isRajesh ? 16 : 14,
      spo2_percent: isRajesh ? 98 : 99,
      temperature_c: isRajesh ? 36.8 : 36.5,
    },
    general_condition: "Good",
    ambulatory_status: isRajesh ? "Independent" : "WithAid",
    observation: {
      sensorium: "Alert",
      body_build: isRajesh ? "Mesomorphic" : "Ectomorphic",
      deformities: isRajesh ? "None" : "None",
      external_aids: isRajesh ? "None" : "Knee brace",
      posture: { anterior: "Normal", posterior: "Normal", lateral: "Normal" },
      gait: { barefoot: "Antalgic gait", with_aids: "N/A" },
    },
    palpation: { tenderness_grade: 2, tone: "normal", crepitus: "none", ligamentous_snaps: "Absent", cracking_distraction: "Absent", capillary_refill: "Normal", nodules: "", pulses: "Palpable & symmetrical", scar_status: "", edema_type: "None", edema_notes: "", swelling_type: "" },
    rom, strength,
    neuro: { sensation: "Normal", reflexes: { patella: "++" } },
    functional_tests: functional,
    gait_parameters: isRajesh
      ? { step_length_cm: 14, stride_length_cm: 28, cadence_steps_min: 100, base_width_cm: 4 }
      : { step_length_cm: 18, stride_length_cm: 36, cadence_steps_min: 110, base_width_cm: 6 },
    skin_and_soft_tissues: isRajesh
      ? {
        swelling: "None",
        callus: "None",
        scar: "None",
        wound: "None",
        temperature: "Minor",
        infection: "None",
        pain: "Important",
        abnormal_sensation: "Important",
      }
      : {
        swelling: "Minor",
        callus: "None",
        scar: "Important",
        wound: "None",
        temperature: "Minor",
        infection: "None",
        pain: "Minor",
        abnormal_sensation: "None",
      },
    sensation_table: isRajesh
      ? {
        superficial: { right: false, left: true, specification: "Diminished over L5 dermatome" },
        deep: { right: false, left: true, specification: "Reduced joint position sense, left great toe" },
        numbness: { right: false, left: true, specification: "Lateral leg and dorsum of foot" },
        paresthesia: { right: false, left: true, specification: "Tingling in left foot, worse with sitting" },
        other: { right: false, left: false, specification: "" },
      }
      : {
        superficial: { right: true, left: false, specification: "Hypoesthesia around infrapatellar scar" },
        deep: { right: false, left: false, specification: "" },
        numbness: { right: true, left: false, specification: "Numb patch lateral to surgical scar" },
        paresthesia: { right: false, left: false, specification: "" },
        other: { right: false, left: false, specification: "" },
      },
    reflexes_table: isRajesh
      ? {
        btr: { right: "normal", left: "normal" },
        ttr: { right: "normal", left: "-" },
        ktr: { right: "normal", left: "normal" },
        atr: { right: "normal", left: "-" },
        babinski: { right: false, left: false },
        comments: "Left TTR and ATR depressed, consistent with L5-S1 radiculopathy. Babinski negative bilaterally.",
      }
      : {
        btr: { right: "normal", left: "normal" },
        ttr: { right: "normal", left: "normal" },
        ktr: { right: "+", left: "normal" },
        atr: { right: "normal", left: "normal" },
        babinski: { right: false, left: false },
        comments: "Right knee jerk slightly brisker than left; symmetrical otherwise.",
      },
    branch_specific: isRajesh
      ? {
        orthopedic: {
          special_tests: [],
          special_test_results: [
            { name: "Straight Leg Raise", result: "positive" as const },
            { name: "Slump Test", result: "positive" as const },
          ],
          end_feel: "Firm",
          joint_play: "Hypomobile",
          swelling_grade: "None",
          limb_length_apparent_cm: null,
        },
      }
      : {
        orthopedic: {
          special_tests: [],
          special_test_results: [
            { name: "Lachman", result: "negative" as const },
            { name: "Anterior Drawer", result: "negative" as const },
            { name: "McMurray", result: "negative" as const },
          ],
          end_feel: "Soft",
          joint_play: "Normal",
          swelling_grade: "Mild",
          limb_length_apparent_cm: null,
        },
      },
    activity_limitations: isRajesh
      ? {
        items: {
          sitting_tolerance: "Severe",
          standing_tolerance: "Moderate",
          walking_distance: "Moderate",
          stair_climbing: "Mild",
          lifting_carrying: "Severe",
          household_tasks: "Mild",
        },
        comments: "Sitting limited to 20 min; avoids lifting > 5 kg due to pain radiation.",
      }
      : {
        items: {
          stair_climbing: "Moderate",
          walking_distance: "Mild",
          squatting: "Severe",
          household_tasks: "Mild",
        },
        comments: "Independent in ADLs; stairs and prolonged walking still affected.",
      },
    participation_restrictions: isRajesh
      ? {
        items: { work_occupation: true, social_leisure: true, sleep_rest: true },
        comments: "Working from home only; unable to commute. Sleep disturbed by night pain.",
      }
      : {
        items: { work_occupation: true, sports_hobbies: true },
        comments: "Paused yoga teaching classes; no sport participation since surgery.",
      },
    measurements: { limb_length_true_cm: null, girth_cm: {} },
    functional_ul: isRajesh
      ? { dressing_upper: "Mild", eating_feeding: "None", combing_hair: "None", toileting: "Mild" }
      : { dressing_upper: "Mild", eating_feeding: "None", combing_hair: "Mild", toileting: "None" },
    functional_ll: isRajesh
      ? { walking_distance: "Moderate", stair_climbing: "Mild", standing_tolerance: "Moderate", lifting_carrying: "Severe", squatting_kneeling: "Severe" }
      : { walking_distance: "Mild", stair_climbing: "Moderate", standing_tolerance: "Mild", squatting_kneeling: "Moderate", cycling: "None" },
    dermatomes: isRajesh ? "L5/S1 dermatome diminished on left" : "No focal sensory level",
    myotomes: isRajesh ? "L5 myotome weak on left (great toe extension)" : "No focal motor deficit",
    capsular_pattern: isRajesh ? "Lumbar: flexion ↓, extension limited" : "Knee: flexion contracture 5°",
    loose_close_packed: "",
    attachments: [],
  };

  const ass: AssessmentData = {
    problem_list: isRajesh
      ? ["1) Lumbar radiculopathy L5", "2) Reduced lumbar ROM"]
      : ["1) Right knee pain post-ACL reconstruction", "2) Reduced ROM and strength"],
    working_diagnosis: diagnosis,
    differential_diagnosis: isRajesh
      ? ["Lumbar disc herniation L4-L5", "Piriformis syndrome", "Spondylolisthesis"]
      : ["Arthrofibrosis", "Graft insufficiency", "Meniscal tear"],
    red_flags_present: false,
    clinical_impression: "Improving with rehabilitation.",
    final_diagnosis: isRajesh
      ? "Lumbar disc herniation L4-L5 with left L5 radiculopathy"
      : "Right knee post-ACL reconstruction with residual stiffness",
  };

  const plan: PlanData = {
    short_term_goals: [{
      goal_id: uuidv4(), description: "Reduce pain VAS to 3/10",
      baseline_value: `${painVas}/10`, target_value: "3/10",
      target_date: fup, owner_clinician_id: CLINICIAN_ID,
    }],
    long_term_goals: [],
    treatment_plan: {
      treatment_id: uuidv4(),
      title: isRajesh ? "Lumbar stabilization program" : "ACL rehabilitation program",
      start_date: isRajesh ? "2026-01-10" : "2026-01-15",
      end_date: dateStr, frequency_per_week: 3, duration_minutes: 45,
      interventions: [{
        exercise_id: uuidv4(),
        name: isRajesh ? "Pelvic tilts" : "Heel slides",
        reps: 10, sets: 3, hold_seconds: 5,
        progression_rule: "Increase ROM as tolerated", resource_ref: "",
      }],
      modalities: isRajesh ? ["heat", "TENS"] : ["ice", "TENS"],
      education: isRajesh ? ["Ergonomics at desk", "Proper lifting"] : ["Knee care post-surgery", "Activity mods"],
      home_program: homeProgram,
    },
    monitoring: {
      metrics_to_track: isRajesh ? ["pain_vas", "tug_sec"] : ["pain_vas", "rom_knee_flexion_deg"],
      review_interval_days: 7,
    },
    next_follow_up: fup,
  };

  return {
    id: uuidv4(), patient_id: patientId, clinician_id: CLINICIAN_ID,
    date_time: dt, encounter_type: type, location: "DigPhy Clinic",
    confidentiality_level: "Standard",
    notes: type === "Initial" ? "Initial assessment." : "Follow-up on treatment plan.",
    subjective: subj, objective: obj, assessment: ass, plan,
    created_at: dt, updated_at: dt,
  };
}

/**
 * Lightweight encounter builder for the branch-specific demo patients
 * (Cardiorespiratory, Neurological, Geriatric, Pediatric). Seeded encounters
 * don't need to pass Zod validation, only satisfy the Encounter type, so we
 * fill a complete but generic ObjectiveData per branch.
 */
function buildBranchEncounter(
  patientId: string,
  branch: BranchSpecialty,
  daysBack: number,
  type: "Initial" | "Follow-up",
  painVas: number,
  diagnosis: string,
  homeProgram: string,
): Encounter {
  const dt = daysAgo(daysBack);
  const isCardio = branch === "Cardiorespiratory";

  const objective = {
    vitals: {
      heart_rate_bpm: isCardio ? 96 : 74,
      blood_pressure_mmHg: "128/82",
      respiratory_rate_bpm: isCardio ? 22 : 16,
      spo2_percent: isCardio ? 91 : 98,
      temperature_c: 36.7,
    },
    general_condition: "Good",
    ambulatory_status: branch === "Geriatric" ? "WithAid" : "Independent",
    observation: {
      sensorium: "Alert",
      body_build: "Mesomorphic",
      deformities: "None",
      external_aids: "None",
      posture: { anterior: "Normal", posterior: "Normal", lateral: "Normal" },
      gait: { barefoot: "Antalgic", with_aids: "N/A" },
    },
    palpation: { tenderness_grade: 1, tone: "normal", crepitus: "none" },
    rom: { arom: { lumbar_flexion: "45 deg" }, prom: { lumbar_flexion: "55 deg" }, end_feel: "firm" },
    strength: { mmt: { hip_flexion_R: 5 } },
    neuro: { sensation: "Normal", reflexes: { patella: "++" } },
    functional_tests: { tug_sec: 12, six_mwt_m: 420, other: "" },
    measurements: { limb_length_true_cm: null, girth_cm: {} },
    functional_ul: {},
    functional_ll: {},
    gait_parameters: { step_length_cm: 40, stride_length_cm: 76, cadence_steps_min: 105, base_width_cm: 8 },
    attachments: [],
  } as unknown as ObjectiveData;

  const subjective: SubjectiveData = {
    chief_complaint: diagnosis,
    history_of_present_illness: {
      onset_date: "2026-01-01",
      mechanism: "Ongoing rehabilitation",
      mode_of_onset: "Gradual",
      duration_category: "Subacute",
      condition_course: "Improved",
      current_treatment: "Physiotherapy",
      investigations: [],
      investigation_findings: "",
    },
    pain: {
      site: "General",
      side: "Right",
      type: "Muscle",
      frequency: "Periodic",
      descriptors: [],
      intensity_vas: painVas,
      aggravating_factors: "",
      relieving_factors: "",
      nature_notes: "",
    },
    past_medical_history: "As per chart",
    surgical_history: "None",
    medications: [],
    social_history: {
      occupation: "General",
      tobacco: "no", tobacco_details: "none",
      smoking_details: "none",
      alcohol: "no", alcohol_details: "none",
      sleep_habits: "",
      physical_activity: "",
      living_situation: "",
      family_history: "",
      hereditary_diseases: "",
      social_status: "",
      educational_status: "",
      environmental_history: "",
      consanguinity: "No",
    },
    patient_goals: "Functional recovery",
    consent_for_treatment_and_data_sharing: true,
  };

  const assessment: AssessmentData = {
    problem_list: [],
    working_diagnosis: diagnosis,
    differential_diagnosis: [],
    red_flags_present: false,
    clinical_impression: "Responding well to rehabilitation.",
    final_diagnosis: diagnosis,
  };

  const plan: PlanData = {
    short_term_goals: [],
    long_term_goals: [],
    treatment_plan: {
      treatment_id: uuidv4(),
      title: `${branch} rehabilitation`,
      start_date: daysFromDate(dt, 0),
      end_date: daysFromDate(dt, 21),
      frequency_per_week: 3,
      duration_minutes: 45,
      interventions: [],
      modalities: [],
      education: [],
      home_program: homeProgram,
    },
    monitoring: { metrics_to_track: [], review_interval_days: 7 },
    next_follow_up: daysFromDate(dt, 7),
  };

  return {
    id: uuidv4(), patient_id: patientId, clinician_id: CLINICIAN_ID,
    date_time: dt, encounter_type: type, location: "DigPhy Clinic",
    confidentiality_level: "Standard",
    notes: type === "Initial" ? "Initial branch assessment." : "Follow-up on treatment plan.",
    subjective, objective, assessment, plan,
    created_at: dt, updated_at: dt,
  };
}

/**
 * Push a dense multi-session time-series of progress entries for a patient.
 * Used to seed the branch-specific demo patients with rich chart data.
 */
function pushProgressSeries(
  patientId: string,
  dates: string[],
  series: { key: string; vals: number[]; unit: string }[],
  prefix: string,
) {
  for (const item of series) {
    item.vals.forEach((val, idx) => {
      progressEntries.push({
        id: `${prefix}-${item.key}-${idx}`,
        patient_id: patientId,
        date_time: dates[idx]!,
        metric_key: item.key,
        value: val,
        unit: item.unit,
        source: "clinic",
        clinician_id: CLINICIAN_ID,
        notes: `Clinical progress check - session ${idx + 1}`,
        created_at: dates[idx]!,
      });
    });
  }
}

// ── Initialize demo data ──
function initMockData() {
  if (profiles.length > 0) return;

  profiles.push(
    {
      id: CLINICIAN_ID, role: "Physiotherapist", full_name: "Dr. Ananya Sharma",
      clinic_name: "DigPhy Clinic", patient_id: null, created_at: new Date().toISOString()
    },
    {
      id: PATIENT_RAJESH_USER_ID, role: "Patient", full_name: "Rajesh Kumar",
      clinic_name: null, patient_id: PATIENT_RAJESH_ID, created_at: new Date().toISOString()
    },
    {
      id: PATIENT_PRIYA_USER_ID, role: "Patient", full_name: "Priya Mehta",
      clinic_name: null, patient_id: PATIENT_PRIYA_ID, created_at: new Date().toISOString()
    },
    {
      id: PATIENT_MAYA_USER_ID, role: "Patient", full_name: "Maya Iyer",
      clinic_name: null, patient_id: PATIENT_MAYA_ID, created_at: new Date().toISOString()
    },
    {
      id: PATIENT_ARJUN_USER_ID, role: "Patient", full_name: "Arjun Nair",
      clinic_name: null, patient_id: PATIENT_ARJUN_ID, created_at: new Date().toISOString()
    },
    {
      id: PATIENT_GOPAL_USER_ID, role: "Patient", full_name: "Gopal Krishnan",
      clinic_name: null, patient_id: PATIENT_GOPAL_ID, created_at: new Date().toISOString()
    },
    {
      id: PATIENT_ISHAAN_USER_ID, role: "Patient", full_name: "Ishaan Verma",
      clinic_name: null, patient_id: PATIENT_ISHAAN_ID, created_at: new Date().toISOString()
    },
  );

  patients.push(
    {
      id: PATIENT_RAJESH_ID, first_name: "Rajesh", last_name: "Kumar",
      date_of_birth: "1978-03-15", sex: "Male", contact_phone: "+91-9876543210",
      email: "rajesh@patient.demo", address: "12 MG Road, Bangalore",
      emergency_contact: { name: "Sita Kumar", phone: "+91-9876543211", relationship: "Spouse" },
      primary_diagnosis: "Lumbar disc herniation L4-L5",
      branch_specialty: "Orthopedic",
      comorbidities: ["Hypertension"], current_medications: ["Amlodipine 5mg"],
      allergies: ["Penicillin"], mobility_aids: [],
      caregiver: { name: "Sita Kumar", phone: "+91-9876543211", relationship: "Spouse" },
      consent_signed: true, consent_date: "2026-01-10", consent_document_id: "doc-rajesh-consent",
      user_id: PATIENT_RAJESH_USER_ID, created_by: CLINICIAN_ID,
      created_at: daysAgo(30), updated_at: daysAgo(30),
    },
    {
      id: PATIENT_PRIYA_ID, first_name: "Priya", last_name: "Mehta",
      date_of_birth: "1992-07-22", sex: "Female", contact_phone: "+91-9123456789",
      email: "priya@patient.demo", address: "45 Park Street, Mumbai",
      emergency_contact: { name: "Rohan Mehta", phone: "+91-9123456790", relationship: "Brother" },
      primary_diagnosis: "Post-ACL reconstruction rehab",
      branch_specialty: "Orthopedic",
      comorbidities: [], current_medications: [], allergies: [],
      mobility_aids: ["Knee brace"], caregiver: null,
      consent_signed: true, consent_date: "2026-02-01", consent_document_id: "doc-priya-consent",
      user_id: PATIENT_PRIYA_USER_ID, created_by: CLINICIAN_ID,
      created_at: daysAgo(30), updated_at: daysAgo(30),
    },
    {
      id: PATIENT_MAYA_ID, first_name: "Maya", last_name: "Iyer",
      date_of_birth: "1985-11-03", sex: "Female", contact_phone: "+91-9876001122",
      email: "maya@patient.demo", address: "8 Lodi Garden, Delhi",
      emergency_contact: { name: "Sanjay Iyer", phone: "+91-9876001123", relationship: "Husband" },
      primary_diagnosis: "COPD — Pulmonary Rehabilitation",
      branch_specialty: "Cardiorespiratory",
      comorbidities: ["COPD", "Hypertension"], current_medications: ["Salbutamol inhaler", "Amlodipine 5mg"],
      allergies: [], mobility_aids: [], caregiver: null,
      consent_signed: true, consent_date: "2026-01-20", consent_document_id: "doc-maya-consent",
      user_id: PATIENT_MAYA_USER_ID, created_by: CLINICIAN_ID,
      created_at: daysAgo(30), updated_at: daysAgo(30),
    },
    {
      id: PATIENT_ARJUN_ID, first_name: "Arjun", last_name: "Nair",
      date_of_birth: "1969-04-18", sex: "Male", contact_phone: "+91-9887700456",
      email: "arjun@patient.demo", address: "92 Marine Drive, Kochi",
      emergency_contact: { name: "Kavya Nair", phone: "+91-9887700457", relationship: "Spouse" },
      primary_diagnosis: "Post-stroke (CVA) rehabilitation",
      branch_specialty: "Neurological",
      comorbidities: ["Hypertension", "Diabetes"], current_medications: ["Metoprolol", "Metformin"],
      allergies: [], mobility_aids: ["Quad cane"], caregiver: { name: "Kavya Nair", phone: "+91-9887700457", relationship: "Spouse" },
      consent_signed: true, consent_date: "2026-01-25", consent_document_id: "doc-arjun-consent",
      user_id: PATIENT_ARJUN_USER_ID, created_by: CLINICIAN_ID,
      created_at: daysAgo(30), updated_at: daysAgo(30),
    },
    {
      id: PATIENT_GOPAL_ID, first_name: "Gopal", last_name: "Krishnan",
      date_of_birth: "1944-09-09", sex: "Male", contact_phone: "+91-9900112345",
      email: "gopal@patient.demo", address: "17 Residency Road, Chennai",
      emergency_contact: { name: "Lakshmi Krishnan", phone: "+91-9900112346", relationship: "Daughter" },
      primary_diagnosis: "Age-related functional decline / fall risk",
      branch_specialty: "Geriatric",
      comorbidities: ["Osteoarthritis", "Hypertension"], current_medications: ["Paracetamol", "Losartan"],
      allergies: [], mobility_aids: ["Walking stick"], caregiver: null,
      consent_signed: true, consent_date: "2026-01-12", consent_document_id: "doc-gopal-consent",
      user_id: PATIENT_GOPAL_USER_ID, created_by: CLINICIAN_ID,
      created_at: daysAgo(30), updated_at: daysAgo(30),
    },
    {
      id: PATIENT_ISHAAN_ID, first_name: "Ishaan", last_name: "Verma",
      date_of_birth: "2017-02-27", sex: "Male", contact_phone: "+91-9778899001",
      email: "ishaan@patient.demo", address: "5 Shantinagar, Pune",
      emergency_contact: { name: "Nidhi Verma", phone: "+91-9778899002", relationship: "Mother" },
      primary_diagnosis: "Cerebral palsy — gross motor delay",
      branch_specialty: "Pediatric",
      comorbidities: [], current_medications: [], allergies: ["None"],
      mobility_aids: ["Walker"], caregiver: { name: "Nidhi Verma", phone: "+91-9778899002", relationship: "Mother" },
      consent_signed: true, consent_date: "2026-01-30", consent_document_id: "doc-ishaan-consent",
      user_id: PATIENT_ISHAAN_USER_ID, created_by: CLINICIAN_ID,
      created_at: daysAgo(30), updated_at: daysAgo(30),
    },
  );

  documents.push(
    {
      id: "doc-rajesh-consent", patient_id: PATIENT_RAJESH_ID, type: "Consent",
      filename: "Consent_Rajesh.pdf", uploaded_by: CLINICIAN_ID, uploaded_at: daysAgo(30),
      storage_reference: buildPdfDataUrl("Consent Form - Rajesh Kumar"),
      access_restrictions: ["role:Physiotherapist", "role:Admin"], created_at: daysAgo(30)
    },
    {
      id: "doc-priya-consent", patient_id: PATIENT_PRIYA_ID, type: "Consent",
      filename: "Consent_Priya.pdf", uploaded_by: CLINICIAN_ID, uploaded_at: daysAgo(30),
      storage_reference: buildPdfDataUrl("Consent Form - Priya Mehta"),
      access_restrictions: ["role:Physiotherapist", "role:Admin"], created_at: daysAgo(30)
    },
    { id: "doc-maya-consent", patient_id: PATIENT_MAYA_ID, type: "Consent", filename: "Consent_Maya.pdf",
      uploaded_by: CLINICIAN_ID, uploaded_at: daysAgo(30),
      storage_reference: buildPdfDataUrl("Consent Form - Maya Iyer"),
      access_restrictions: ["role:Physiotherapist", "role:Admin"], created_at: daysAgo(30) },
    { id: "doc-arjun-consent", patient_id: PATIENT_ARJUN_ID, type: "Consent", filename: "Consent_Arjun.pdf",
      uploaded_by: CLINICIAN_ID, uploaded_at: daysAgo(30),
      storage_reference: buildPdfDataUrl("Consent Form - Arjun Nair"),
      access_restrictions: ["role:Physiotherapist", "role:Admin"], created_at: daysAgo(30) },
    { id: "doc-gopal-consent", patient_id: PATIENT_GOPAL_ID, type: "Consent", filename: "Consent_Gopal.pdf",
      uploaded_by: CLINICIAN_ID, uploaded_at: daysAgo(30),
      storage_reference: buildPdfDataUrl("Consent Form - Gopal Krishnan"),
      access_restrictions: ["role:Physiotherapist", "role:Admin"], created_at: daysAgo(30) },
    { id: "doc-ishaan-consent", patient_id: PATIENT_ISHAAN_ID, type: "Consent", filename: "Consent_Ishaan.pdf",
      uploaded_by: CLINICIAN_ID, uploaded_at: daysAgo(30),
      storage_reference: buildPdfDataUrl("Consent Form - Ishaan Verma"),
      access_restrictions: ["role:Physiotherapist", "role:Admin"], created_at: daysAgo(30) },
  );

  // ── Encounters ──
  const rajeshEncs = [
    buildEncounter(PATIENT_RAJESH_ID, 21, "Initial", 7,
      "Lumbar disc herniation L4-L5",
      "1. Pelvic tilts — 3x10 daily\n2. Cat-cow stretches — 2x10\n3. Short walks — 15 min twice daily\n4. Avoid prolonged sitting > 30 min",
      { tugSec: 12.5, lumbarFlexion: 40 }),
    buildEncounter(PATIENT_RAJESH_ID, 14, "Follow-up", 5,
      "Lumbar disc herniation L4-L5 — improving",
      "1. Pelvic tilts — 3x15 daily\n2. Bird-dog — 3x8 each side\n3. Walking — 20 min daily\n4. Core bracing during lifts",
      { tugSec: 10.5, lumbarFlexion: 45 }),
    buildEncounter(PATIENT_RAJESH_ID, 7, "Follow-up", 3,
      "Lumbar disc herniation L4-L5 — near resolution",
      "1. Bird-dog — 3x10\n2. Plank — 3x20 sec\n3. Return-to-work exercises\n4. Maintain walking 30 min/day",
      { tugSec: 9.0, lumbarFlexion: 50 }),
  ];

  const priyaEncs = [
    buildEncounter(PATIENT_PRIYA_ID, 21, "Initial", 6,
      "Post-ACL reconstruction",
      "1. Quad sets — 3x15\n2. Heel slides — 3x10\n3. Straight leg raises — 3x10\n4. Ice after exercises — 15 min",
      { kneeFlex: 40 }),
    buildEncounter(PATIENT_PRIYA_ID, 14, "Follow-up", 4,
      "Post-ACL reconstruction — week 4",
      "1. Mini squats — 3x12\n2. Step-ups — 3x10\n3. Balance board — 5 min\n4. Continue ice protocol",
      { kneeFlex: 85 }),
    buildEncounter(PATIENT_PRIYA_ID, 7, "Follow-up", 2,
      "Post-ACL reconstruction — week 6",
      "1. Lunges — 3x10\n2. Single-leg balance — 3x30 sec\n3. Light jogging progression\n4. Sport-specific drills when cleared",
      { kneeFlex: 115 }),
  ];

  encounters.push(...rajeshEncs, ...priyaEncs);

  // Branch-specific demo patients get 3 encounters each so their patient detail
  // and progress analytics have a realistic encounter history.
  const mayaEncs = [
    buildBranchEncounter(PATIENT_MAYA_ID, "Cardiorespiratory", 28, "Initial", 7,
      "COPD — pulmonary rehab", "1. Pursed-lip breathing 4x5 min\\n2. Diaphragmatic breathing 3x5\\n3. Progressive walking 10 min\\n4. Aerobic cycle 5 min"),
    buildBranchEncounter(PATIENT_MAYA_ID, "Cardiorespiratory", 14, "Follow-up", 4,
      "COPD — improving exercise tolerance", "1. Breathing exercises 5x daily\\n2. Interval walking 20 min\\n3. Strength: sit-to-stand 3x8\\n4. Upper-limb theraband 3x10"),
    buildBranchEncounter(PATIENT_MAYA_ID, "Cardiorespiratory", 7, "Follow-up", 2,
      "COPD — maintenance phase", "1. Daily 30 min walk\\n2. Circuit of ADL tasks\\n3. Continue breathing techniques"),
  ];

  const arjunEncs = [
    buildBranchEncounter(PATIENT_ARJUN_ID, "Neurological", 28, "Initial", 5,
      "Post-stroke (CVA) hemiparesis", "1. Passive ROM 10 min\\n2. Bed mobility drills\\n3. Tactile stimulation\\n4. Supported sitting balance"),
    buildBranchEncounter(PATIENT_ARJUN_ID, "Neurological", 14, "Follow-up", 3,
      "Post-stroke — balance improving", "1. Sit-to-stand 3x10\\n2. Weight shifting 3x10\\n3. Standing balance 5 min\\n4. Gait re-education 10 min"),
    buildBranchEncounter(PATIENT_ARJUN_ID, "Neurological", 7, "Follow-up", 1,
      "Post-stroke — community ambulation", "1. Gait training 20 min\\n2. Stair practice\\n3. Dynamic balance 10 min"),
  ];

  const gopalEncs = [
    buildBranchEncounter(PATIENT_GOPAL_ID, "Geriatric", 28, "Initial", 6,
      "Mobility decline / fall risk", "1. Seated march 3x10\\n2. Mini squats 3x8\\n3. Heel raises 3x10\\n4. Balance training 5 min"),
    buildBranchEncounter(PATIENT_GOPAL_ID, "Geriatric", 14, "Follow-up", 4,
      "Fall risk reduced", "1. Sit-to-stand 3x10\\n2. Tandem walking 5 min\\n3. Step-ups 3x8\\n4. Task-specific balance 10 min"),
    buildBranchEncounter(PATIENT_GOPAL_ID, "Geriatric", 7, "Follow-up", 2,
      "Geriatric — near discharge", "1. Gait endurance 20 min\\n2. Lower-limb strength 3x10\\n3. Home safety program"),
  ];

  const ishaanEncs = [
    buildBranchEncounter(PATIENT_ISHAAN_ID, "Pediatric", 28, "Initial", 3,
      "Cerebral palsy — gross motor delay", "1. Play-based stretching 10 min\\n2. Rolling to sit 3x\\n3. Supported sitting 5 min\\n4. Reach & grasp play"),
    buildBranchEncounter(PATIENT_ISHAAN_ID, "Pediatric", 14, "Follow-up", 2,
      "Increased independent sitting", "1. Pull-to-stand 3x\\n2. Cruising along furniture 5 min\\n3. Balance games\\n4. Kicking play"),
    buildBranchEncounter(PATIENT_ISHAAN_ID, "Pediatric", 7, "Follow-up", 1,
      "Pediatric — walking with support", "1. Supported walking 10 min\\n2. Stair step-ups with assist\\n3. Motor skill games"),
  ];

  encounters.push(...mayaEncs, ...arjunEncs, ...gopalEncs, ...ishaanEncs);

  // ── Progress entries ──
  // Auto-derive entries from each encounter's objective (pain, TUG, 6MWT,
  // per-joint ROM, girth, branch-specific numerics) so charts cover every
  // metric relevant to the patient's branch.
  let i = 0;
  for (const enc of [...rajeshEncs, ...priyaEncs]) {
    const dt = enc.date_time;
    const painVas = enc.subjective.pain.intensity_vas;
    progressEntries.push({
      id: `prog-${i++}`, patient_id: enc.patient_id, date_time: dt,
      metric_key: "pain_vas", value: painVas, unit: "score",
      source: "clinic", clinician_id: CLINICIAN_ID,
      notes: "Recorded during encounter", created_at: dt,
    });

    for (const sample of extractMetricSamples(enc.objective)) {
      progressEntries.push({
        id: `prog-${i++}`, patient_id: enc.patient_id, date_time: dt,
        metric_key: sample.metric_key, value: sample.value, unit: sample.unit,
        source: "clinic", clinician_id: CLINICIAN_ID,
        notes: "Recorded during encounter", created_at: dt,
      });
    }
  }

  // Seed multi-session time-series progress for Rajesh (Orthopedic/Neurological)
  const rajeshDates = [daysAgo(21), daysAgo(14), daysAgo(7), daysAgo(1)];
  const rajeshSeries: { key: string; vals: number[]; unit: string }[] = [
    { key: "pain_vas", vals: [7, 5, 3, 2], unit: "score" },
    { key: "rom_lumbar_flexion_deg", vals: [38, 42, 48, 54], unit: "deg" },
    { key: "tug_sec", vals: [13.2, 11.0, 9.4, 8.2], unit: "sec text" },
    { key: "berg_balance_score", vals: [34, 40, 47, 52], unit: "score" },
    { key: "mas_spasticity_grade", vals: [3, 2, 1, 0], unit: "grade" },
    { key: "gait_cadence", vals: [82, 94, 104, 112], unit: "steps/min" },
    { key: "step_length_cm", vals: [32, 40, 46, 52], unit: "cm" },
    { key: "girth_knee_R_cm", vals: [43.5, 42.0, 40.2, 39.0], unit: "cm" },
  ];
  for (const item of rajeshSeries) {
    item.vals.forEach((val, idx) => {
      progressEntries.push({
        id: `prog-rajesh-${item.key}-${idx}`,
        patient_id: PATIENT_RAJESH_ID,
        date_time: rajeshDates[idx]!,
        metric_key: item.key,
        value: val,
        unit: item.unit,
        source: "clinic",
        clinician_id: CLINICIAN_ID,
        notes: `Clinical progress check - session ${idx + 1}`,
        created_at: rajeshDates[idx]!,
      });
    });
  }

  // Seed multi-session time-series progress for Priya (Orthopedic/Neurological)
  const priyaDates = [daysAgo(21), daysAgo(14), daysAgo(7), daysAgo(1)];
  const priyaSeries: { key: string; vals: number[]; unit: string }[] = [
    { key: "pain_vas", vals: [6, 4, 2, 1], unit: "score" },
    { key: "rom_knee_flexion_deg", vals: [40, 75, 98, 120], unit: "deg" },
    { key: "girth_knee_R_cm", vals: [44.0, 42.2, 40.5, 38.8], unit: "cm" },
    { key: "tug_sec", vals: [14.5, 11.2, 9.0, 7.5], unit: "sec" },
    { key: "six_mwt_m", vals: [310, 400, 480, 560], unit: "m font" },
    { key: "berg_balance_score", vals: [40, 46, 51, 55], unit: "score" },
  ];
  for (const item of priyaSeries) {
    item.vals.forEach((val, idx) => {
      progressEntries.push({
        id: `prog-priya-${item.key}-${idx}`,
        patient_id: PATIENT_PRIYA_ID,
        date_time: priyaDates[idx]!,
        metric_key: item.key,
        value: val,
        unit: item.unit,
        source: "clinic",
        clinician_id: CLINICIAN_ID,
        notes: `Clinical progress check - session ${idx + 1}`,
        created_at: priyaDates[idx]!,
      });
    });
  }

  // ── Rich time-series for Cardiorespiratory (Maya) ──
  const mayaDates = [daysAgo(42), daysAgo(35), daysAgo(28), daysAgo(21), daysAgo(14), daysAgo(7)];
  pushProgressSeries(PATIENT_MAYA_ID, mayaDates, [
    { key: "pain_vas", vals: [7, 6, 5, 4, 3, 2], unit: "score" },
    { key: "six_mwt_m", vals: [210, 255, 310, 365, 420, 470], unit: "m" },
    { key: "borg_dyspnea", vals: [7, 6, 5, 4, 3, 2], unit: "score" },
    { key: "chest_expansion_cm", vals: [3.0, 3.5, 4.0, 4.5, 5.1, 5.6], unit: "cm" },
    { key: "heart_rate_bpm", vals: [96, 92, 88, 84, 80, 76], unit: "bpm" },
    { key: "respiratory_rate_bpm", vals: [22, 21, 20, 18, 16, 15], unit: "bpm" },
  ], "prog-maya");

  // ── Rich time-series for Neurological (Arjun) ──
  const arjunDates = mayaDates;
  pushProgressSeries(PATIENT_ARJUN_ID, arjunDates, [
    { key: "pain_vas", vals: [5, 4, 4, 3, 2, 1], unit: "score" },
    { key: "berg_balance_score", vals: [28, 34, 40, 46, 50, 54], unit: "score" },
    { key: "mas_spasticity_grade", vals: [3, 3, 2, 2, 1, 1], unit: "grade" },
    { key: "tug_sec", vals: [24, 20, 18, 15, 12, 10], unit: "sec" },
    { key: "gait_cadence", vals: [60, 72, 82, 92, 100, 106], unit: "steps/min" },
    { key: "step_length_cm", vals: [22, 28, 34, 42, 48, 54], unit: "cm" },
  ], "prog-arjun");

  // ── Rich time-series for Geriatric (Gopal) ──
  pushProgressSeries(PATIENT_GOPAL_ID, mayaDates, [
    { key: "pain_vas", vals: [6, 5, 4, 4, 3, 2], unit: "score" },
    { key: "tug_sec", vals: [16.5, 15.0, 13.5, 12.0, 10.5, 9.0], unit: "sec" },
    { key: "thirty_sec_chair_stand", vals: [6, 7, 9, 10, 12, 14], unit: "reps" },
    { key: "berg_balance_score", vals: [36, 40, 44, 48, 50, 52], unit: "score" },
    { key: "gait_cadence", vals: [70, 78, 86, 92, 96, 100], unit: "steps/min" },
  ], "prog-gopal");

  // ── Rich time-series for Pediatric (Ishaan) ──
  const ishaanDates = [daysAgo(56), daysAgo(49), daysAgo(42), daysAgo(35), daysAgo(28), daysAgo(21)];
  pushProgressSeries(PATIENT_ISHAAN_ID, ishaanDates, [
    { key: "pain_vas", vals: [3, 3, 3, 2, 2, 1], unit: "score" },
    { key: "gmfm_pct", vals: [45, 50, 56, 63, 70, 78], unit: "%" },
    { key: "pedi_score", vals: [30, 36, 42, 50, 58, 66], unit: "score" },
  ], "prog-ishaan");

  // ── Audit logs ──
  auditLogs.push(
    {
      id: uuidv4(), user_id: CLINICIAN_ID, action: "READ", entity: "Patient",
      entity_id: PATIENT_RAJESH_ID, timestamp: daysAgo(21),
      ip_address: "192.168.1.100", metadata: { portal: "patient_detail" }
    },
    {
      id: uuidv4(), user_id: CLINICIAN_ID, action: "CREATE", entity: "Encounter",
      entity_id: encounters[0]?.id ?? uuidv4(), timestamp: daysAgo(21),
      ip_address: "192.168.1.100", metadata: null
    },
    {
      id: uuidv4(), user_id: CLINICIAN_ID, action: "READ", entity: "Patient",
      entity_id: PATIENT_RAJESH_ID, timestamp: daysAgo(14),
      ip_address: "192.168.1.100", metadata: { portal: "patient_detail" }
    },
    {
      id: uuidv4(), user_id: CLINICIAN_ID, action: "READ", entity: "Patient",
      entity_id: PATIENT_RAJESH_ID, timestamp: daysAgo(7),
      ip_address: "192.168.1.100", metadata: { portal: "patient_summary" }
    },
    {
      id: uuidv4(), user_id: CLINICIAN_ID, action: "UPDATE", entity: "ProgressEntry",
      entity_id: progressEntries[0]?.id ?? uuidv4(), timestamp: daysAgo(5),
      ip_address: "192.168.1.100", metadata: null
    },
  );
}

// Initialize on module load
initMockData();

// ── Profiles ──
export function getCurrentProfile(): Profile {
  return profiles[0];
}

export function getProfileById(userId: string): Profile | undefined {
  return profiles.find((p) => p.id === userId);
}

// ── Patients ──
export function getAllPatients(search?: string): Patient[] {
  const all = [...patients].sort((a, b) =>
    (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name),
  );
  if (!search) return all;
  const s = search.toLowerCase();
  return all.filter(
    (p) =>
      p.first_name.toLowerCase().includes(s) ||
      p.last_name.toLowerCase().includes(s) ||
      p.contact_phone.includes(s) ||
      p.primary_diagnosis.toLowerCase().includes(s),
  );
}

export function getPatientById(id: string): Patient | undefined {
  return patients.find((p) => p.id === id);
}

/**
 * Demo patient accounts for the patient portal — patients that have a linked
 * login identity (`user_id`). Used to switch between "accounts" and let each
 * patient view their own development.
 */
export function getPatientAccounts(): Patient[] {
  const accs = patients.filter((p) => p.user_id !== null && p.user_id !== "");
  return [...accs].sort((a, b) =>
    (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name),
  );
}

export function createPatient(data: Record<string, unknown>): Patient {
  const now = new Date().toISOString();
  const patient = {
    id: uuidv4(),
    first_name: data.first_name, last_name: data.last_name,
    date_of_birth: data.date_of_birth, sex: data.sex,
    contact_phone: data.contact_phone, email: data.email || null,
    address: data.address || null,
    emergency_contact: data.emergency_contact ?? null,
    primary_diagnosis: data.primary_diagnosis,
    branch_specialty: (data.branch_specialty as any) || "Orthopedic",
    comorbidities: data.comorbidities || [],
    current_medications: data.current_medications || [],
    allergies: data.allergies || [],
    mobility_aids: data.mobility_aids || [],
    caregiver: data.caregiver ?? null,
    consent_signed: data.consent_signed,
    consent_date: data.consent_date ?? null,
    consent_document_id: data.consent_document_id ?? null,
    user_id: data.user_id ?? null,
    created_by: data.created_by || CLINICIAN_ID,
    created_at: now, updated_at: now,
  } as Patient;
  patients.push(patient);
  return patient;
}

export function updatePatient(id: string, data: Record<string, unknown>): Patient | null {
  const idx = patients.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  patients[idx] = { ...patients[idx]!, ...data, updated_at: new Date().toISOString() } as Patient;
  return patients[idx]!;
}

// ── Encounters ──
export function getEncountersByPatient(patientId: string): Encounter[] {
  return [...encounters]
    .filter((e) => e.patient_id === patientId)
    .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())
    .map((e) => ({
      ...e,
      profiles: { full_name: getProfileById(e.clinician_id)?.full_name ?? "Unknown" },
    }));
}

export function getEncounterById(id: string): Encounter | undefined {
  return encounters.find((e) => e.id === id);
}

/**
 * The most recent encounter for a patient (newest first). Used by the
 * follow-up wizard to detect which previously-filled tests to re-assess.
 */
export function getPreviousEncounter(patientId: string): Encounter | undefined {
  return [...encounters]
    .filter((e) => e.patient_id === patientId)
    .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())[0];
}

export function createEncounter(data: Record<string, unknown>): Encounter {
  const now = new Date().toISOString();
  const enc = {
    id: uuidv4(),
    patient_id: data.patient_id, clinician_id: data.clinician_id,
    date_time: data.date_time, encounter_type: data.encounter_type,
    location: data.location, confidentiality_level: data.confidentiality_level,
    notes: data.notes ?? null,
    subjective: data.subjective, objective: data.objective,
    assessment: data.assessment, plan: data.plan,
    created_at: now, updated_at: now,
  } as Encounter;
  encounters.push(enc);
  return enc;
}

export function getRecentEncounters(limit = 5): Encounter[] {
  return [...encounters]
    .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())
    .slice(0, limit)
    .map((e) => ({
      ...e,
      profiles: { full_name: getProfileById(e.clinician_id)?.full_name ?? "Unknown" },
      patients: {
        first_name: getPatientById(e.patient_id)?.first_name ?? "",
        last_name: getPatientById(e.patient_id)?.last_name ?? "",
      },
    }));
}

// ── Progress entries ──
export function getProgressEntries(patientId: string, metricKey?: string): ProgressEntry[] {
  let result = progressEntries.filter((e) => e.patient_id === patientId);
  if (metricKey) result = result.filter((e) => e.metric_key === metricKey);
  return [...result].sort(
    (a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime(),
  );
}

export function createProgressEntry(data: Record<string, unknown>): ProgressEntry {
  const now = new Date().toISOString();
  const entry = {
    id: uuidv4(),
    patient_id: data.patient_id, date_time: data.date_time,
    metric_key: data.metric_key, value: data.value, unit: data.unit,
    source: data.source, clinician_id: data.clinician_id ?? null,
    notes: data.notes ?? null, created_at: now,
  } as ProgressEntry;
  progressEntries.push(entry);
  return entry;
}

// ── Documents ──
export function getDocumentsByPatient(patientId: string): Doc[] {
  return [...documents]
    .filter((d) => d.patient_id === patientId)
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
}

export function createDocument(data: Record<string, unknown>): Doc {
  const now = new Date().toISOString();
  const doc = {
    id: uuidv4(),
    patient_id: data.patient_id, type: data.type, filename: data.filename,
    uploaded_by: data.uploaded_by, uploaded_at: now,
    storage_reference: data.storage_reference,
    access_restrictions: data.access_restrictions || [],
    created_at: now,
  } as Doc;
  documents.push(doc);
  return doc;
}

export function getDocumentById(id: string): Doc | undefined {
  return documents.find((d) => d.id === id);
}

// ── Audit logs ──
export function getAuditLogs(limit = 50): AuditLog[] {
  return [...auditLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
    .map((log) => ({
      ...log,
      profiles: { full_name: getProfileById(log.user_id)?.full_name ?? "Unknown" },
    }));
}

export function addAuditLog(data: {
  user_id: string; action: AuditLog["action"]; entity: AuditLog["entity"];
  entity_id: string; ip_address?: string | null;
  metadata?: Record<string, unknown> | null;
}): void {
  auditLogs.push({
    id: uuidv4(),
    user_id: data.user_id, action: data.action, entity: data.entity,
    entity_id: data.entity_id, timestamp: new Date().toISOString(),
    ip_address: data.ip_address ?? null, metadata: data.metadata ?? null,
  });
}

// ── Patient summary (for /my-summary portal) ──
export function getPatientSummaryData(patientId: string) {
  const patient = getPatientById(patientId) ?? null;
  const painHistory = getProgressEntries(patientId, "pain_vas");
  const allProgressEntries = getProgressEntries(patientId);
  const latestPain = painHistory.length > 0
    ? painHistory[painHistory.length - 1]!.value
    : null;
  const latestEnc = [...encounters]
    .filter((e) => e.patient_id === patientId)
    .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())[0];
  const plan = latestEnc?.plan as PlanData | undefined;
  return {
    patient,
    painHistory,
    progressEntries: allProgressEntries,
    latestPain: latestPain !== null ? Number(latestPain) : null,
    homeProgram: plan?.treatment_plan?.home_program ?? "No home program assigned yet.",
    nextFollowUp: plan?.next_follow_up ?? null,
  };
}


