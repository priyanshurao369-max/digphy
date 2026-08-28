/**
 * Seed script for DigPhy demo data.
 *
 * Prerequisites:
 * 1. Run supabase/migrations/*.sql in your Supabase SQL editor
 * 2. Set env vars in .env.local (copy from .env.example)
 * 3. Run: npm run seed
 */

import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CLINICIAN_EMAIL = "clinician@digphy.demo";
const CLINICIAN_PASSWORD = "demo123456";
const PATIENT1_EMAIL = "rajesh@patient.demo";
const PATIENT2_EMAIL = "priya@patient.demo";
const PATIENT_PASSWORD = "demo123456";

async function ensureUser(
  email: string,
  password: string,
  meta: { full_name: string; role: string }
) {
  try {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users.find((u) => u.email === email);
    if (found) {
      console.log(`✓ User ${email} already exists`);
      return found;
    }
  } catch (err) {
    console.log(`Note: Could not check existing users, proceeding with creation...`);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: meta,
  });
  if (error) {
    console.error(`Error creating user ${email}:`, error);
    throw error;
  }
  console.log(`✓ Created user ${email}`);
  return data.user!;
}

async function main() {
  console.log("Seeding DigPhy demo data...\n");

  const clinician = await ensureUser(CLINICIAN_EMAIL, CLINICIAN_PASSWORD, {
    full_name: "Dr. Ananya Sharma",
    role: "Physiotherapist",
  });

  await supabase
    .from("profiles")
    .update({ role: "Physiotherapist", full_name: "Dr. Ananya Sharma", clinic_name: "DigPhy Clinic" })
    .eq("id", clinician.id);

  const patientUser1 = await ensureUser(PATIENT1_EMAIL, PATIENT_PASSWORD, {
    full_name: "Rajesh Kumar",
    role: "Patient",
  });
  const patientUser2 = await ensureUser(PATIENT2_EMAIL, PATIENT_PASSWORD, {
    full_name: "Priya Mehta",
    role: "Patient",
  });

  const patients: Array<{
    first_name: string;
    last_name: string;
    date_of_birth: string;
    sex: string;
    contact_phone: string;
    email: string;
    address: string;
    primary_diagnosis: string;
    comorbidities: string[];
    current_medications: string[];
    allergies: string[];
    mobility_aids: string[];
    consent_signed: boolean;
    consent_date: string;
    created_by: string;
    user_id: string;
  }> = [
      {
        first_name: "Rajesh",
        last_name: "Kumar",
        date_of_birth: "1978-03-15",
        sex: "Male",
        contact_phone: "+91-9876543210",
        email: "rajesh@patient.demo",
        address: "12 MG Road, Bangalore",
        primary_diagnosis: "Lumbar disc herniation L4-L5",
        comorbidities: ["Hypertension"],
        current_medications: ["Amlodipine 5mg"],
        allergies: ["Penicillin"],
        mobility_aids: [],
        consent_signed: true,
        consent_date: "2026-01-10",
        created_by: clinician.id,
        user_id: patientUser1.id,
      },
      {
        first_name: "Priya",
        last_name: "Mehta",
        date_of_birth: "1992-07-22",
        sex: "Female",
        contact_phone: "+91-9123456789",
        email: "priya@patient.demo",
        address: "45 Park Street, Mumbai",
        primary_diagnosis: "Post-ACL reconstruction rehab",
        comorbidities: [],
        current_medications: [],
        allergies: [],
        mobility_aids: ["Knee brace"],
        consent_signed: true,
        consent_date: "2026-02-01",
        created_by: clinician.id,
        user_id: patientUser2.id,
      },
    ];

  const insertedPatients = [];
  for (const p of patients) {
    const { data: existing } = await supabase
      .from("patients")
      .select("id")
      .eq("contact_phone", p.contact_phone)
      .maybeSingle();

    if (existing) {
      insertedPatients.push(existing);
      continue;
    }

    const { data, error } = await supabase.from("patients").insert(p).select().single();
    if (error) throw error;
    insertedPatients.push(data);
  }

  await supabase
    .from("profiles")
    .update({ role: "Patient", patient_id: insertedPatients[0]!.id })
    .eq("id", patientUser1.id);

  await supabase
    .from("profiles")
    .update({ role: "Patient", patient_id: insertedPatients[1]!.id })
    .eq("id", patientUser2.id);

  const makeEncounter = (
    patientId: string,
    daysAgo: number,
    type: "Initial" | "Follow-up",
    painVas: number,
    diagnosis: string,
    homeProgram: string
  ) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().split("T")[0]!;

    return {
      patient_id: patientId,
      clinician_id: clinician.id,
      date_time: date.toISOString(),
      encounter_type: type,
      location: "DigPhy Clinic",
      confidentiality_level: "Standard" as const,
      notes: `${type} visit`,
      subjective: {
        chief_complaint: "Lower back pain radiating to left leg",
        history_of_present_illness: {
          onset_date: "2025-11-01",
          mechanism: "Lifting heavy object",
          mode_of_onset: "Sudden",
          duration_category: "Subacute",
        },
        pain: {
          site: "Lumbar spine, left leg",
          type: "Nerve",
          descriptors: ["sharp", "burning"],
          intensity_vas: painVas,
          aggravating_factors: "Sitting, bending",
          relieving_factors: "Walking, heat pack",
        },
        past_medical_history: "Hypertension",
        surgical_history: "None",
        medications: ["Amlodipine 5mg"],
        social_history: {
          occupation: "Software engineer",
          tobacco: "no",
          alcohol: "occasional",
          living_situation: "with family",
        },
        patient_goals: "Return to work without pain",
        consent_for_treatment_and_data_sharing: true,
      },
      objective: {
        vitals: {
          heart_rate_bpm: 72,
          blood_pressure_mmHg: "128/82",
          respiratory_rate_bpm: 16,
          spo2_percent: 98,
          temperature_c: 36.8,
        },
        general_condition: "Good",
        ambulatory_status: "Independent",
        observation: {
          posture: { anterior: "Slight lateral shift", posterior: "Flat lumbar lordosis", lateral: "Forward head" },
          gait: { barefoot: "Antalgic gait", with_aids: "N/A" },
        },
        palpation: { tenderness_grade: 2, tone: "hypertonia", crepitus: "none" },
        rom: { arom: { "lumbar_flexion": "40 deg" }, prom: { "lumbar_flexion": "50 deg" }, end_feel: "firm" },
        strength: { mmt: { "hip_flexion_L": 4, "hip_flexion_R": 5 } },
        neuro: { sensation: "Reduced L5 dermatomal", reflexes: { patella: "++" } },
        functional_tests: { tug_sec: 12.5, six_mwt_m: 420, other: "" },
        measurements: { limb_length_true_cm: null, girth_cm: {} },
        attachments: [],
      },
      assessment: {
        problem_list: ["1) Lumbar radiculopathy L5", "2) Reduced lumbar ROM"],
        working_diagnosis: diagnosis,
        red_flags_present: false,
        clinical_impression: "Mechanical low back pain with nerve root irritation, improving with rehab",
      },
      plan: {
        short_term_goals: [
          {
            goal_id: uuidv4(),
            description: "Reduce pain VAS to 3/10",
            baseline_value: `${painVas}/10`,
            target_value: "3/10",
            target_date: dateStr,
            owner_clinician_id: clinician.id,
          },
        ],
        long_term_goals: [],
        treatment_plan: {
          treatment_id: uuidv4(),
          title: "Lumbar stabilization program",
          start_date: dateStr,
          end_date: dateStr,
          frequency_per_week: 3,
          duration_minutes: 45,
          interventions: [
            {
              exercise_id: uuidv4(),
              name: "Pelvic tilts",
              reps: 10,
              sets: 3,
              hold_seconds: 5,
              progression_rule: "Increase hold to 10s when pain-free",
              resource_ref: "",
            },
          ],
          modalities: ["heat", "TENS"],
          education: ["Ergonomics at desk", "Proper lifting technique"],
          home_program: homeProgram,
        },
        monitoring: { metrics_to_track: ["pain_vas", "tug_sec"], review_interval_days: 7 },
        next_follow_up: new Date(date.getTime() + 7 * 86400000).toISOString().split("T")[0]!,
      },
    };
  };

  for (const [i, patient] of insertedPatients.entries()) {
    const encounters = [
      makeEncounter(
        patient.id,
        21,
        "Initial",
        7,
        i === 0 ? "Lumbar disc herniation L4-L5" : "Post-ACL reconstruction",
        i === 0
          ? "1. Pelvic tilts — 3x10 daily\n2. Cat-cow stretches — 2x10\n3. Short walks — 15 min twice daily\n4. Avoid prolonged sitting > 30 min"
          : "1. Quad sets — 3x15\n2. Heel slides — 3x10\n3. Straight leg raises — 3x10\n4. Ice after exercises — 15 min"
      ),
      makeEncounter(
        patient.id,
        14,
        "Follow-up",
        5,
        i === 0 ? "Lumbar disc herniation L4-L5 — improving" : "Post-ACL reconstruction — week 4",
        i === 0
          ? "1. Pelvic tilts — 3x15 daily\n2. Bird-dog — 3x8 each side\n3. Walking — 20 min daily\n5. Core bracing during lifts"
          : "1. Mini squats — 3x12\n2. Step-ups — 3x10\n3. Balance board — 5 min\n4. Continue ice protocol"
      ),
      makeEncounter(
        patient.id,
        7,
        "Follow-up",
        3,
        i === 0 ? "Lumbar disc herniation L4-L5 — near resolution" : "Post-ACL reconstruction — week 6",
        i === 0
          ? "1. Bird-dog — 3x10\n2. Plank — 3x20 sec\n3. Return-to-work exercises\n4. Maintain walking 30 min/day"
          : "1. Lunges — 3x10\n2. Single-leg balance — 3x30 sec\n3. Light jogging progression\n4. Sport-specific drills when cleared"
      ),
    ];

    for (const enc of encounters) {
      const { data: existing } = await supabase
        .from("encounters")
        .select("id")
        .eq("patient_id", enc.patient_id)
        .eq("date_time", enc.date_time)
        .maybeSingle();

      if (existing) continue;

      const { data: encData, error } = await supabase
        .from("encounters")
        .insert(enc)
        .select()
        .single();
      if (error) throw error;

      const painVas = (enc.subjective as { pain: { intensity_vas: number } }).pain.intensity_vas;
      await supabase.from("progress_entries").insert({
        patient_id: enc.patient_id,
        date_time: enc.date_time,
        metric_key: "pain_vas",
        value: painVas,
        unit: "score",
        source: "clinic",
        clinician_id: clinician.id,
        notes: "Recorded during encounter",
      });

      if (enc.objective.functional_tests.tug_sec) {
        await supabase.from("progress_entries").insert({
          patient_id: enc.patient_id,
          date_time: enc.date_time,
          metric_key: "tug_sec",
          value: enc.objective.functional_tests.tug_sec,
          unit: "sec",
          source: "clinic",
          clinician_id: clinician.id,
        });
      }

      console.log(`  Created encounter for patient ${enc.patient_id.slice(0, 8)} on ${enc.date_time.split("T")[0]}`);
      void encData;
    }
  }

  console.log("\n✅ Seed complete!\n");
  console.log("Demo accounts:");
  console.log(`  Clinician: ${CLINICIAN_EMAIL} / ${CLINICIAN_PASSWORD}`);
  console.log(`  Patient 1: ${PATIENT1_EMAIL} / ${PATIENT_PASSWORD}`);
  console.log(`  Patient 2: ${PATIENT2_EMAIL} / ${PATIENT_PASSWORD}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
