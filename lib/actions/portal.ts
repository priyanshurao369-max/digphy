"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function getAuditLogs(limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*, profiles(full_name)")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function getPatientSummary() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("patient_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.patient_id) return null;

  const patientId = profile.patient_id;

  const [patientRes, progressRes, encounterRes] = await Promise.all([
    supabase.from("patients").select("*").eq("id", patientId).single(),
    supabase
      .from("progress_entries")
      .select("*")
      .eq("patient_id", patientId)
      .eq("metric_key", "pain_vas")
      .order("date_time", { ascending: true }),
    supabase
      .from("encounters")
      .select("plan, date_time")
      .eq("patient_id", patientId)
      .order("date_time", { ascending: false })
      .limit(1),
  ]);

  await logAudit({
    action: "READ",
    entity: "Patient",
    entityId: patientId,
    metadata: { portal: "patient_summary" },
  });

  const latestEncounter = encounterRes.data?.[0];
  const plan = latestEncounter?.plan as {
    treatment_plan?: { home_program?: string };
    next_follow_up?: string;
  } | null;

  const latestPain = progressRes.data?.[progressRes.data.length - 1];

  return {
    patient: patientRes.data,
    painHistory: progressRes.data ?? [],
    latestPain: latestPain?.value ?? null,
    homeProgram: plan?.treatment_plan?.home_program ?? "No home program assigned yet.",
    nextFollowUp: plan?.next_follow_up ?? null,
  };
}
