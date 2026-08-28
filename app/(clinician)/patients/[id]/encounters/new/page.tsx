import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SoapWizard } from "@/components/soap/soap-wizard";
import { getPatient } from "@/lib/actions/patients";
import { createClient } from "@/lib/supabase/server";

export default async function NewEncounterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let patient;
  try {
    patient = await getPatient(id);
  } catch {
    notFound();
  }

  if (!patient.consent_signed) {
    redirect(`/patients/${id}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/patients/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Encounter</h1>
          <p className="text-muted-foreground">
            {patient.first_name} {patient.last_name} — SOAP Assessment
          </p>
        </div>
      </div>
      <SoapWizard patientId={id} clinicianId={user.id} />
    </div>
  );
}
