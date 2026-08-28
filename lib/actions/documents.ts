"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { documentSchema } from "@/lib/validators/schemas";
import {
  getDocumentsByPatient,
  createDocument as storeCreateDocument,
  getDocumentById,
  updatePatient as storeUpdatePatient,
  CLINICIAN_ID,
} from "@/lib/data/mock-store";
import { findPatientById } from "@/lib/data/request-store";

export async function getDocuments(patientId: string) {
  const data = getDocumentsByPatient(patientId);
  for (const doc of data) {
    await logAudit({ action: "READ", entity: "Document", entityId: doc.id });
  }
  return data;
}

export async function uploadDocument(formData: FormData) {
  const file = formData.get("file") as File;
  const patientId = formData.get("patient_id") as string;
  const type = formData.get("type") as string;
  const linkConsent = formData.get("link_consent") === "true";

  if (!file || !patientId || !type) {
    return { error: "Missing required fields" };
  }

  const patient = await findPatientById(patientId);
  if (!patient) return { error: "Patient not found" };

  // Demo mode: store file as a data URL in memory (PHI-safe demo substitute
  // for Supabase Storage; UUID paths unnecessary here).
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const storageRef = `data:${file.type || "application/octet-stream"};base64,${btoa(binary)}`;

  const docPayload = documentSchema.parse({
    patient_id: patientId,
    type,
    filename: file.name,
    storage_reference: storageRef,
    access_restrictions: ["role:Physiotherapist", "role:Admin"],
  });

  const doc = storeCreateDocument({
    ...docPayload,
    uploaded_by: CLINICIAN_ID,
  });

  await logAudit({ action: "CREATE", entity: "Document", entityId: doc.id });

  if (linkConsent && type === "Consent") {
    storeUpdatePatient(patientId, {
      consent_signed: true,
      consent_date: new Date().toISOString().split("T")[0],
      consent_document_id: doc.id,
    });
  }

  revalidatePath(`/patients/${patientId}`);
  return { data: doc };
}

export async function getDocumentUrl(documentId: string) {
  const doc = getDocumentById(documentId);
  return doc?.storage_reference ?? null;
}
