"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { patientSchema, type PatientFormData } from "@/lib/validators/schemas";
import {
  createPatient as storeCreatePatient,
  updatePatient as storeUpdatePatient,
  CLINICIAN_ID,
} from "@/lib/data/mock-store";
import {
  findPatientById,
  getAllPatientsForRequest,
  persistPatientCookie,
} from "@/lib/data/request-store";

export async function signIn(formData: FormData) {
  // Demo mode: no real auth. Route to the clinician dashboard.
  redirect("/dashboard");
}

export async function signOut() {
  redirect("/login");
}

export async function getPatients(search?: string) {
  const data = await getAllPatientsForRequest(search);
  // Audit logging is best-effort — don't let it crash the response
  for (const patient of data) {
    try {
      await logAudit({ action: "READ", entity: "Patient", entityId: patient.id });
    } catch {}
  }
  return data;
}

export async function getPatient(id: string) {
  const data = await findPatientById(id);
  if (!data) throw new Error("Patient not found");
  try {
    await logAudit({ action: "READ", entity: "Patient", entityId: id });
  } catch {}
  return data;
}

export async function createPatient(formData: PatientFormData) {
  try {
    const parsed = patientSchema.safeParse(formData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Validation failed" };
    }

    const payload = {
      ...parsed.data,
      email: parsed.data.email || null,
      consent_date: parsed.data.consent_signed
        ? parsed.data.consent_date ?? new Date().toISOString().split("T")[0]
        : null,
      created_by: CLINICIAN_ID,
    };

    const data = storeCreatePatient(payload);
    try {
      await persistPatientCookie(data);
    } catch {}

    try {
      await logAudit({ action: "CREATE", entity: "Patient", entityId: data.id });
    } catch {}

    revalidatePath("/patients");
    revalidatePath("/dashboard");
    return { data };
  } catch (err: any) {
    return { error: err?.message || "Failed to create patient" };
  }
}

export async function updatePatient(id: string, formData: PatientFormData) {
  try {
    const parsed = patientSchema.safeParse(formData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Validation failed" };
    }

    const payload = {
      ...parsed.data,
      email: parsed.data.email || null,
      consent_date: parsed.data.consent_signed
        ? parsed.data.consent_date ?? new Date().toISOString().split("T")[0]
        : null,
    };

    const data = storeUpdatePatient(id, payload);
    if (!data) return { error: "Patient not found" };

    try {
      await persistPatientCookie(data);
    } catch {}

    try {
      await logAudit({ action: "UPDATE", entity: "Patient", entityId: id });
    } catch {}

    revalidatePath(`/patients/${id}`);
    revalidatePath("/patients");
    return { data };
  } catch (err: any) {
    return { error: err?.message || "Failed to update patient" };
  }
}

export async function getPatientForPrint(id: string) {
  const data = await findPatientById(id);
  if (!data) throw new Error("Patient not found");
  try {
    await logAudit({ action: "EXPORT", entity: "Patient", entityId: id });
  } catch {}
  return data;
}
