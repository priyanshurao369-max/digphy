"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  encounterSchema,
  progressEntrySchema,
  type EncounterFormData,
  type ProgressEntryFormData,
} from "@/lib/validators/schemas";

export async function getEncounters(patientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("encounters")
    .select("*, profiles:clinician_id(full_name)")
    .eq("patient_id", patientId)
    .order("date_time", { ascending: false });

  if (error) throw new Error(error.message);

  for (const enc of data ?? []) {
    await logAudit({ action: "READ", entity: "Encounter", entityId: enc.id });
  }

  return data ?? [];
}

export async function getEncounter(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("encounters")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  await logAudit({ action: "READ", entity: "Encounter", entityId: id });
  return data;
}

export async function createEncounter(formData: EncounterFormData) {
  const parsed = encounterSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("consent_signed")
    .eq("id", parsed.data.patient_id)
    .single();

  if (!patient?.consent_signed) {
    return { error: "Patient consent must be signed before creating an encounter" };
  }

  const { subjective, objective, assessment, plan, ...header } = parsed.data;

  const { data, error } = await supabase
    .from("encounters")
    .insert({
      ...header,
      subjective,
      objective,
      assessment,
      plan,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit({ action: "CREATE", entity: "Encounter", entityId: data.id });

  if (subjective.pain.intensity_vas !== undefined) {
    await supabase.from("progress_entries").insert({
      patient_id: parsed.data.patient_id,
      date_time: parsed.data.date_time,
      metric_key: "pain_vas",
      value: subjective.pain.intensity_vas,
      unit: "score",
      source: "clinic",
      clinician_id: parsed.data.clinician_id,
      notes: "Recorded during encounter",
    });
  }

  revalidatePath(`/patients/${parsed.data.patient_id}`);
  return { data };
}

export async function getProgressEntries(patientId: string, metricKey?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("progress_entries")
    .select("*")
    .eq("patient_id", patientId)
    .order("date_time", { ascending: true });

  if (metricKey) {
    query = query.eq("metric_key", metricKey);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  for (const entry of data ?? []) {
    await logAudit({ action: "READ", entity: "ProgressEntry", entityId: entry.id });
  }

  return data ?? [];
}

export async function createProgressEntry(formData: ProgressEntryFormData) {
  const parsed = progressEntrySchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress_entries")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit({ action: "CREATE", entity: "ProgressEntry", entityId: data.id });
  revalidatePath(`/patients/${parsed.data.patient_id}`);
  revalidatePath(`/patients/${parsed.data.patient_id}/progress`);
  return { data };
}

export async function getRecentEncounters(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("encounters")
    .select("*, patients(first_name, last_name)")
    .order("date_time", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
