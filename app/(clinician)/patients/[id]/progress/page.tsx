import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/charts/ProgressChart";
import { ProgressForm } from "@/components/progress/progress-form";
import { getPatient } from "@/lib/actions/patients";
import { getProgressEntries } from "@/lib/actions/encounters";
import { createClient } from "@/lib/supabase/server";
import { METRIC_PRESETS } from "@/lib/validators/schemas";

export default async function ProgressPage({
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

  const allProgress = await getProgressEntries(id);

  const metricsData = METRIC_PRESETS.map((preset) => ({
    ...preset,
    data: allProgress.filter((e) => e.metric_key === preset.key),
  })).filter((m) => m.data.length > 0);

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
          <h1 className="text-2xl font-bold tracking-tight">Progress Tracking</h1>
          <p className="text-muted-foreground">
            {patient.first_name} {patient.last_name}
          </p>
        </div>
      </div>

      <ProgressForm patientId={id} clinicianId={user.id} />

      {metricsData.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No progress entries yet. Add one above or record during an encounter.
          </CardContent>
        </Card>
      ) : (
        metricsData.map((metric) => (
          <Card key={metric.key}>
            <CardHeader>
              <CardTitle className="text-base">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressChart
                data={metric.data}
                label={metric.label}
                unit={metric.unit}
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
