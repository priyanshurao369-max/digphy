import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BranchProgressDashboard } from "@/components/progress/BranchProgressDashboard";
import { getPatient } from "@/lib/actions/patients";
import { getProgressEntries } from "@/lib/actions/encounters";
import { BRANCH_METRICS, describeMetric } from "@/lib/metrics";
import type { BranchSpecialty } from "@/types";

export const dynamic = "force-dynamic";

export default async function ProgressPage({
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

  const allProgress = await getProgressEntries(id);
  const trackedKeys = [...new Set(allProgress.map((e) => e.metric_key))];
  const branch = (patient.branch_specialty ?? "Orthopedic") as BranchSpecialty;
  const recommendedMissing = (BRANCH_METRICS[branch] ?? [])
    .filter((key) => !trackedKeys.includes(key))
    .map((key) => describeMetric(key));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/patients/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinical Progress Analytics</h1>
          <p className="text-muted-foreground">
            {patient.first_name} {patient.last_name} — {branch} Recovery Trajectory
          </p>
        </div>
      </div>

      <BranchProgressDashboard patient={patient} progressEntries={allProgress} />

      {recommendedMissing.length > 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recommended metrics for {branch} care — record these during the next encounter
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {recommendedMissing.map((m) => (
              <span
                key={m.key}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground font-medium"
              >
                {m.label}
                {m.unit ? ` (${m.unit})` : ""}
              </span>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

