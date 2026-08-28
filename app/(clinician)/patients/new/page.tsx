import { PatientForm } from "@/components/patients/patient-form";

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Patient</h1>
        <p className="text-muted-foreground">Register a new patient record</p>
      </div>
      <PatientForm />
    </div>
  );
}
