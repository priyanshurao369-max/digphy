"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import {
  encounterSchema,
  progressEntrySchema,
  type EncounterFormData,
  type ProgressEntryFormData,
} from "@/lib/validators/schemas";
import {
  getEncountersByPatient,
  getEncounterById,
  createEncounter as storeCreateEncounter,
  getProgressEntries as storeGetProgressEntries,
  createProgressEntry as storeCreateProgressEntry,
  getRecentEncounters as storeGetRecentEncounters,
  addAuditLog,
} from "@/lib/data/mock-store";
import { findPatientById } from "@/lib/data/request-store";

export async function getEncounters(patientId: string) {
  const data = getEncountersByPatient(patientId);
  for (const enc of data) {
    try {
      await logAudit({ action: "READ", entity: "Encounter", entityId: enc.id });
    } catch {}
  }
  return data;
}

export async function getEncounter(id: string) {
  const data = getEncounterById(id);
  if (!data) throw new Error("Encounter not found");
  try {
    await logAudit({ action: "READ", entity: "Encounter", entityId: id });
  } catch {}
  return data;
}

export async function createEncounter(formData: EncounterFormData) {
  try {
    const parsed = encounterSchema.safeParse(formData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Validation failed" };
    }

    const patient = await findPatientById(parsed.data.patient_id);
    if (!patient?.consent_signed) {
      return { error: "Patient consent must be signed before creating an encounter" };
    }

    const { subjective, objective, assessment, plan, ...header } = parsed.data;

    const data = storeCreateEncounter({
      ...header,
      subjective,
      objective,
      assessment,
      plan,
    });

    try {
      await logAudit({ action: "CREATE", entity: "Encounter", entityId: data.id });
    } catch {}

    if (subjective.pain.intensity_vas !== undefined) {
      storeCreateProgressEntry({
        patient_id: parsed.data.patient_id,
        date_time: parsed.data.date_time,
        metric_key: "pain_vas",
        value: subjective.pain.intensity_vas,
        unit: "score",
        source: "clinic",
        clinician_id: parsed.data.clinician_id,
        notes: "Recorded during encounter",
      });
      try {
        addAuditLog({
          user_id: parsed.data.clinician_id,
          action: "CREATE",
          entity: "ProgressEntry",
          entity_id: data.id,
        });
      } catch {}
    }

    revalidatePath(`/patients/${parsed.data.patient_id}`);
    return { data };
  } catch (err: any) {
    return { error: err?.message || "Failed to create encounter" };
  }
}

export async function getProgressEntries(patientId: string, metricKey?: string) {
  const data = storeGetProgressEntries(patientId, metricKey);
  for (const entry of data) {
    await logAudit({ action: "READ", entity: "ProgressEntry", entityId: entry.id });
  }
  return data;
}

export async function createProgressEntry(formData: ProgressEntryFormData) {
  const parsed = progressEntrySchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  const data = storeCreateProgressEntry(parsed.data);

  await logAudit({ action: "CREATE", entity: "ProgressEntry", entityId: data.id });
  revalidatePath(`/patients/${parsed.data.patient_id}`);
  revalidatePath(`/patients/${parsed.data.patient_id}/progress`);
  return { data };
}

export async function getRecentEncounters(limit = 5) {
  return storeGetRecentEncounters(limit);
}
