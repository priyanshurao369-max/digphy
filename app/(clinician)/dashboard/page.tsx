import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPatients } from "@/lib/actions/patients";
import { getRecentEncounters } from "@/lib/actions/encounters";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const [patients, recentEncounters] = await Promise.all([
    getPatients(),
    getRecentEncounters(5),
  ]);

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

      <Card>
        <CardHeader>
          <CardTitle>Recent Encounters</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEncounters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No encounters yet.</p>
          ) : (
            <div className="divide-y">
              {recentEncounters.map((enc) => {
                const patient = enc.patients as { first_name: string; last_name: string } | null;
                const assessment = enc.assessment as { working_diagnosis?: string } | null;
                return (
                  <Link
                    key={enc.id}
                    href={`/patients/${enc.patient_id}`}
                    className="flex items-center justify-between py-3 transition-colors hover:bg-muted/50 -mx-2 px-2 rounded-md"
                  >
                    <div>
                      <p className="font-medium">
                        {patient?.first_name} {patient?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {assessment?.working_diagnosis ?? "No diagnosis"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{enc.encounter_type}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(enc.date_time)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
