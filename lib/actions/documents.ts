"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { documentSchema } from "@/lib/validators/schemas";

export async function getDocuments(patientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("patient_id", patientId)
    .order("uploaded_at", { ascending: false });

  if (error) throw new Error(error.message);

  for (const doc of data ?? []) {
    await logAudit({ action: "READ", entity: "Document", entityId: doc.id });
  }

  return data ?? [];
}

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const file = formData.get("file") as File;
  const patientId = formData.get("patient_id") as string;
  const type = formData.get("type") as string;
  const linkConsent = formData.get("link_consent") === "true";

  if (!file || !patientId || !type) {
    return { error: "Missing required fields" };
  }

  const storageRef = `${patientId}/${uuidv4()}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("patient-documents")
    .upload(storageRef, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { error: uploadError.message };

  const docPayload = documentSchema.parse({
    patient_id: patientId,
    type,
    filename: file.name,
    storage_reference: storageRef,
    access_restrictions: ["role:Physiotherapist", "role:Admin"],
  });

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      ...docPayload,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (docError) return { error: docError.message };

  await logAudit({ action: "CREATE", entity: "Document", entityId: doc.id });

  if (linkConsent && type === "Consent") {
    await supabase
      .from("patients")
      .update({
        consent_signed: true,
        consent_date: new Date().toISOString().split("T")[0],
        consent_document_id: doc.id,
      })
      .eq("id", patientId);
  }

  revalidatePath(`/patients/${patientId}`);
  return { data: doc };
}

export async function getDocumentUrl(storageReference: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("patient-documents")
    .createSignedUrl(storageReference, 3600);

  return data?.signedUrl ?? null;
}
