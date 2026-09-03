import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, LineChart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressChart } from "@/components/charts/ProgressChart";
import { BranchProgressDashboard } from "@/components/progress/BranchProgressDashboard";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentLibrary } from "@/components/documents/document-library";
import { getPatient } from "@/lib/actions/patients";
import { getEncounters, getProgressEntries } from "@/lib/actions/encounters";
import { getDocuments } from "@/lib/actions/documents";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { AssessmentData, PlanData, SubjectiveData } from "@/types";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({
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

  const [encounters, allProgress, documents] = await Promise.all([
    getEncounters(id),
    getProgressEntries(id),
    getDocuments(id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {patient.first_name} {patient.last_name}
            </h1>
            <Badge variant={patient.consent_signed ? "success" : "warning"}>
              {patient.consent_signed ? "Consent ✓" : "No consent"}
            </Badge>
          </div>
          <p className="text-muted-foreground">{patient.primary_diagnosis}</p>
          <p className="text-sm text-muted-foreground">
            {patient.contact_phone} · DOB {formatDate(patient.date_of_birth)} · {patient.sex}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/patients/${id}/edit`}>
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/patients/${id}/progress`}>
              <LineChart className="h-4 w-4" />
              Progress
            </Link>
          </Button>
          <Button asChild size="sm" disabled={!patient.consent_signed}>
            <Link href={`/patients/${id}/encounters/new`}>
              <Plus className="h-4 w-4" />
              New Encounter
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="encounters">Encounters ({encounters.length})</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clinical Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Allergies:</span>{" "}
                  {patient.allergies?.length ? patient.allergies.join(", ") : "None recorded"}
                </p>
                <p>
                  <span className="font-medium">Medications:</span>{" "}
                  {patient.current_medications?.length
                    ? patient.current_medications.join(", ")
                    : "None recorded"}
                </p>
                <p>
                  <span className="font-medium">Comorbidities:</span>{" "}
                  {patient.comorbidities?.length
                    ? patient.comorbidities.join(", ")
                    : "None recorded"}
                </p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold">Branch Recovery Progress ({patient.branch_specialty ?? "Orthopedic"})</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/patients/${id}/progress`}>Full Analytics</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <BranchProgressDashboard patient={patient} progressEntries={allProgress} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="encounters" className="space-y-4">
          {encounters.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No encounters yet.
              </CardContent>
            </Card>
          ) : (
            encounters.map((enc) => {
              const subjective = enc.subjective as SubjectiveData;
              const assessment = enc.assessment as AssessmentData;
              const plan = enc.plan as PlanData;
              return (
                <Card key={enc.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {enc.encounter_type} — {formatDateTime(enc.date_time)}
                      </CardTitle>
                      <div className="flex gap-2">
                        {assessment.red_flags_present && (
                          <Badge variant="destructive">Red Flags</Badge>
                        )}
                        <Badge variant="secondary">{enc.location}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Chief complaint:</span>{" "}
                      {subjective.chief_complaint}
                    </p>
                    <p>
                      <span className="font-medium">Working diagnosis:</span>{" "}
                      {assessment.working_diagnosis}
                    </p>
                    <p>
                      <span className="font-medium">Pain VAS:</span>{" "}
                      {subjective.pain?.intensity_vas}/10
                    </p>
                    <p>
                      <span className="font-medium">Next follow-up:</span>{" "}
                      {plan.next_follow_up ? formatDate(plan.next_follow_up) : "—"}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="progress">
          <BranchProgressDashboard patient={patient} progressEntries={allProgress} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DocumentUpload patientId={id} />
          <DocumentLibrary patientId={id} serverDocs={documents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
