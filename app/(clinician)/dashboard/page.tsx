import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPatients } from "@/lib/actions/patients";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const patients = await getPatients();

  const consented = patients.filter((p) => p.consent_signed).length;
  const pendingConsent = patients.length - consented;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your clinic activity</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/patients">
              <Users className="h-4 w-4" />
              All Patients
            </Link>
          </Button>
          <Button asChild>
            <Link href="/patients/new">
              <Plus className="h-4 w-4" />
              New Patient
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{patients.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Consent Signed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{consented}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Consent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{pendingConsent}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
