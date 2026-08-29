/**
 * In-memory mock data store for DigPhy demo.
 * Replaces Supabase entirely — data persists in module-level arrays
 * within a single Node.js process (sufficient for `npm run dev`).
 */
import { v4 as uuidv4 } from "uuid";
import type {
  Patient, Encounter, ProgressEntry, Document as Doc,
  AuditLog, Profile, SubjectiveData, ObjectiveData, AssessmentData, PlanData,
} from "@/types";

// ── Static IDs ──
export const CLINICIAN_ID = "550e8400-e29b-41d4-a716-446655440000";
export const PATIENT_RAJESH_USER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
export const PATIENT_PRIYA_USER_ID = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
export const PATIENT_RAJESH_ID = "72f1fab4-1c6a-4b3d-9254-0a6c7b8e9d01";
export const PATIENT_PRIYA_ID = "72f1fab4-1c6a-4b3d-9254-0a6c7b8e9d02";
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
  extra: { tugSec?: number | null; kneeFlex?: number } = {},
): Encounter {
  const dt = daysAgo(daysBack);
  const dateStr = new Date(dt).toISOString().split("T")[0]!;
  const fup = daysFromDate(dt, 7);
  const isRajesh = patientId === PATIENT_RAJESH_ID;

  const rom: ObjectiveData["rom"] = extra.kneeFlex
    ? { arom: { knee_flexion: `${extra.kneeFlex} deg` }, prom: { knee_flexion: `${extra.kneeFlex} deg` }, end_feel: "soft" as const }
    : { arom: { lumbar_flexion: "40 deg" }, prom: { lumbar_flexion: "50 deg" }, end_feel: "firm" as const };

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
    },
    pain: {
      site: isRajesh ? "Lumbar spine, left leg" : "Right knee",
      type: isRajesh ? "Nerve" : "Joint",
      descriptors: isRajesh ? ["sharp", "burning"] : ["dull", "tight"],
      intensity_vas: painVas,
      aggravating_factors: isRajesh ? "Sitting, bending" : "Prolonged standing, stairs",
      relieving_factors: isRajesh ? "Walking, heat pack" : "Rest, elevation",
    },
    past_medical_history: isRajesh ? "Hypertension" : "None significant",
    surgical_history: isRajesh ? "None" : "Right ACL reconstruction (2026-01-15)",
    medications: isRajesh ? ["Amlodipine 5mg"] : [],
    social_history: {
      occupation: isRajesh ? "Software engineer" : "Yoga instructor",
      tobacco: "no", alcohol: isRajesh ? "occasional" : "social",
      living_situation: isRajesh ? "with family" : "alone",
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
      posture: { anterior: "Normal", posterior: "Normal", lateral: "Normal" },
      gait: { barefoot: "Antalgic gait", with_aids: "N/A" },
    },
    palpation: { tenderness_grade: 2, tone: "normal", crepitus: "none" },
    rom, strength,
    neuro: { sensation: "Normal", reflexes: { patella: "++" } },
    functional_tests: functional,
    measurements: { limb_length_true_cm: null, girth_cm: {} },
    attachments: [],
  };

  const ass: AssessmentData = {
    problem_list: isRajesh
      ? ["1) Lumbar radiculopathy L5", "2) Reduced lumbar ROM"]
      : ["1) Right knee pain post-ACL reconstruction", "2) Reduced ROM and strength"],
    working_diagnosis: diagnosis,
    red_flags_present: false,
    clinical_impression: "Improving with rehabilitation.",
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

// ── Initialize demo data ──
function initMockData() {
  if (profiles.length > 0) return;

  profiles.push(
    { id: CLINICIAN_ID, role: "Physiotherapist", full_name: "Dr. Ananya Sharma",
      clinic_name: "DigPhy Clinic", patient_id: null, created_at: new Date().toISOString() },
    { id: PATIENT_RAJESH_USER_ID, role: "Patient", full_name: "Rajesh Kumar",
      clinic_name: null, patient_id: PATIENT_RAJESH_ID, created_at: new Date().toISOString() },
    { id: PATIENT_PRIYA_USER_ID, role: "Patient", full_name: "Priya Mehta",
      clinic_name: null, patient_id: PATIENT_PRIYA_ID, created_at: new Date().toISOString() },
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
  );

  documents.push(
    { id: "doc-rajesh-consent", patient_id: PATIENT_RAJESH_ID, type: "Consent",
      filename: "Consent_Rajesh.pdf", uploaded_by: CLINICIAN_ID, uploaded_at: daysAgo(30),
      storage_reference: buildPdfDataUrl("Consent Form - Rajesh Kumar"),
      access_restrictions: ["role:Physiotherapist", "role:Admin"], created_at: daysAgo(30) },
    { id: "doc-priya-consent", patient_id: PATIENT_PRIYA_ID, type: "Consent",
      filename: "Consent_Priya.pdf", uploaded_by: CLINICIAN_ID, uploaded_at: daysAgo(30),
      storage_reference: buildPdfDataUrl("Consent Form - Priya Mehta"),
      access_restrictions: ["role:Physiotherapist", "role:Admin"], created_at: daysAgo(30) },
  );

  // ── Encounters ──
  const rajeshEncs = [
    buildEncounter(PATIENT_RAJESH_ID, 21, "Initial", 7,
      "Lumbar disc herniation L4-L5",
      "1. Pelvic tilts — 3x10 daily\n2. Cat-cow stretches — 2x10\n3. Short walks — 15 min twice daily\n4. Avoid prolonged sitting > 30 min",
      { tugSec: 12.5 }),
    buildEncounter(PATIENT_RAJESH_ID, 14, "Follow-up", 5,
      "Lumbar disc herniation L4-L5 — improving",
      "1. Pelvic tilts — 3x15 daily\n2. Bird-dog — 3x8 each side\n3. Walking — 20 min daily\n4. Core bracing during lifts",
      { tugSec: 10.5 }),
    buildEncounter(PATIENT_RAJESH_ID, 7, "Follow-up", 3,
      "Lumbar disc herniation L4-L5 — near resolution",
      "1. Bird-dog — 3x10\n2. Plank — 3x20 sec\n3. Return-to-work exercises\n4. Maintain walking 30 min/day",
      { tugSec: 9.0 }),
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

  // ── Progress entries ──
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

    const tug = enc.objective.functional_tests.tug_sec;
    if (tug !== null && tug !== undefined) {
      progressEntries.push({
        id: `prog-${i++}`, patient_id: enc.patient_id, date_time: dt,
        metric_key: "tug_sec", value: tug, unit: "sec",
        source: "clinic", clinician_id: CLINICIAN_ID, notes: "", created_at: dt,
      });
    }

    const romStr = enc.objective.rom.arom;
    const kneeKey = Object.keys(romStr).find((k) => k.includes("knee"));
    if (kneeKey) {
      const val = parseInt((romStr as Record<string, string>)[kneeKey]?.split(" ")[0] ?? "0");
      if (val > 0) {
        progressEntries.push({
          id: `prog-${i++}`, patient_id: enc.patient_id, date_time: dt,
          metric_key: "rom_knee_flexion_deg", value: val, unit: "deg",
                    source: "clinic", clinician_id: CLINICIAN_ID, notes: "", created_at: dt,
        });
      }
    }
  }

  // ── Audit logs ──
  auditLogs.push(
    { id: uuidv4(), user_id: CLINICIAN_ID, action: "READ", entity: "Patient",
      entity_id: PATIENT_RAJESH_ID, timestamp: daysAgo(21),
      ip_address: "192.168.1.100", metadata: { portal: "patient_detail" } },
    { id: uuidv4(), user_id: CLINICIAN_ID, action: "CREATE", entity: "Encounter",
      entity_id: encounters[0]?.id ?? uuidv4(), timestamp: daysAgo(21),
      ip_address: "192.168.1.100", metadata: null },
    { id: uuidv4(), user_id: CLINICIAN_ID, action: "READ", entity: "Patient",
      entity_id: PATIENT_RAJESH_ID, timestamp: daysAgo(14),
      ip_address: "192.168.1.100", metadata: { portal: "patient_detail" } },
    { id: uuidv4(), user_id: CLINICIAN_ID, action: "READ", entity: "Patient",
      entity_id: PATIENT_RAJESH_ID, timestamp: daysAgo(7),
      ip_address: "192.168.1.100", metadata: { portal: "patient_summary" } },
    { id: uuidv4(), user_id: CLINICIAN_ID, action: "UPDATE", entity: "ProgressEntry",
      entity_id: progressEntries[0]?.id ?? uuidv4(), timestamp: daysAgo(5),
      ip_address: "192.168.1.100", metadata: null },
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
    latestPain: latestPain !== null ? Number(latestPain) : null,
    homeProgram: plan?.treatment_plan?.home_program ?? "No home program assigned yet.",
    nextFollowUp: plan?.next_follow_up ?? null,
  };
}


