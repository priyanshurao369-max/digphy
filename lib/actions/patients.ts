"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { patientSchema, type PatientFormData } from "@/lib/validators/schemas";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Login failed" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(profile?.role === "Patient" ? "/my-summary" : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getPatients(search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("patients")
    .select("*")
    .order("last_name", { ascending: true });

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,contact_phone.ilike.%${search}%,primary_diagnosis.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  for (const patient of data ?? []) {
    await logAudit({
      action: "READ",
      entity: "Patient",
      entityId: patient.id,
    });
  }

  return data ?? [];
}

export async function getPatient(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

  await logAudit({ action: "READ", entity: "Patient", entityId: id });
  return data;
}

export async function createPatient(formData: PatientFormData) {
  const parsed = patientSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const payload = {
    ...parsed.data,
    email: parsed.data.email || null,
    consent_date: parsed.data.consent_signed
      ? parsed.data.consent_date ?? new Date().toISOString().split("T")[0]
      : null,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("patients")
    .insert(payload)
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit({ action: "CREATE", entity: "Patient", entityId: data.id });
  revalidatePath("/patients");
  revalidatePath("/dashboard");
  return { data };
}

export async function updatePatient(id: string, formData: PatientFormData) {
  const parsed = patientSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    email: parsed.data.email || null,
    consent_date: parsed.data.consent_signed
      ? parsed.data.consent_date ?? new Date().toISOString().split("T")[0]
      : null,
  };

  const { data, error } = await supabase
    .from("patients")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit({ action: "UPDATE", entity: "Patient", entityId: id });
  revalidatePath(`/patients/${id}`);
  revalidatePath("/patients");
  return { data };
}
