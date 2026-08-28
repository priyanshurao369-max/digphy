import { notFound } from "next/navigation";
import { getPatient } from "@/lib/actions/patients";
import { PatientForm } from "@/components/patients/patient-form";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let patient;
  try {
    patient = await getPatient(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Patient</h1>
        <p className="text-muted-foreground">
          {patient.first_name} {patient.last_name}
        </p>
      </div>
      <PatientForm patient={patient} />
    </div>
  );
}
