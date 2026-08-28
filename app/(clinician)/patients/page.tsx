import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getPatients } from "@/lib/actions/patients";
import { formatDate } from "@/lib/utils";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const patients = await getPatients(q);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">{patients.length} registered patients</p>
        </div>
        <Button asChild>
          <Link href="/patients/new">
            <Plus className="h-4 w-4" />
            New Patient
          </Link>
        </Button>
      </div>

      <form method="get" className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Search by name, phone, diagnosis..." className="pl-9" />
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {patients.map((patient) => (
          <Link key={patient.id} href={`/patients/${patient.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">
                    {patient.first_name} {patient.last_name}
                  </CardTitle>
                  <Badge variant={patient.consent_signed ? "success" : "warning"}>
                    {patient.consent_signed ? "Consent ✓" : "No consent"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>{patient.primary_diagnosis}</p>
                <p>{patient.contact_phone}</p>
                <p>DOB: {formatDate(patient.date_of_birth)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {patients.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No patients found.{" "}
            <Link href="/patients/new" className="text-primary underline">
              Add your first patient
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
