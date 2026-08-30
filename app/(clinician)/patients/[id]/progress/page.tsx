import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/charts/ProgressChart";
import { getPatient } from "@/lib/actions/patients";
import { getProgressEntries } from "@/lib/actions/encounters";
import { BRANCH_METRICS, computeMetricStats, describeMetric } from "@/lib/metrics";
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

  // Every metric that actually has data — labeled via presets or derived
  // from dynamic keys (rom_<joint>_deg, girth_<site>_cm).
  const trackedKeys = [...new Set(allProgress.map((e) => e.metric_key))];
  const metricsData = trackedKeys
    .map((key) => {
      const meta = describeMetric(key);
      const data = allProgress
        .filter((e) => e.metric_key === key)
        .map((e) => ({ value: e.value, date_time: e.date_time }));
      return {
        ...meta,
        data,
        stats: computeMetricStats(key, data),
      };
    })
    // Branch-relevant metrics first, then the rest in first-seen order.
    .sort((a, b) => {
      const branchKeys = patient.branch_specialty
        ? BRANCH_METRICS[patient.branch_specialty] ?? []
        : [];
      const rank = (k: string) => {
        const i = branchKeys.indexOf(k);
        return i === -1 ? branchKeys.length : i;
      };
      return rank(a.key) - rank(b.key);
    });

  // Branch-recommended metrics with no data yet — shown as tracking suggestions.
  const branch = (patient.branch_specialty ?? "Orthopedic") as BranchSpecialty;
  const recommendedMissing = (BRANCH_METRICS[branch] ?? [])
    .filter((key) => !trackedKeys.includes(key))
    .map((key) => describeMetric(key));

  const improvingCount = metricsData.filter((m) => m.stats.improving === true).length;
  const decliningCount = metricsData.filter((m) => m.stats.improving === false).length;

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
            {patient.first_name} {patient.last_name} — {branch} care
          </p>
        </div>
      </div>

      {metricsData.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{metricsData.length}</div>
              <div className="text-xs text-muted-foreground">Metrics tracked</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{improvingCount}</div>
              <div className="text-xs text-muted-foreground">Improving</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className={`text-2xl font-bold ${decliningCount > 0 ? "text-red-600" : ""}`}>
                {decliningCount}
              </div>
              <div className="text-xs text-muted-foreground">Declining</div>
            </CardContent>
          </Card>
        </div>
      )}

      {metricsData.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No progress data yet. Metrics are recorded during encounters (Objective findings and
            Plan → Progress Metrics), and charts appear here automatically.
          </CardContent>
        </Card>
      ) : (
        metricsData.map((metric) => {
          const { stats } = metric;
          const TrendIcon =
            stats.improving === true ? ArrowUpRight : stats.improving === false ? ArrowDownRight : Minus;
          const changeClass =
            stats.improving === true ? "text-emerald-600" : stats.improving === false ? "text-red-600" : "";
          return (
            <Card key={metric.key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base">{metric.label}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={
                      stats.improving === true
                        ? "bg-emerald-100 text-emerald-700"
                        : stats.improving === false
                          ? "bg-red-100 text-red-700"
                          : ""
                    }
                  >
                    <TrendIcon className="h-3.5 w-3.5 mr-1" />
                    {stats.improving === true
                      ? "Improving"
                      : stats.improving === false
                        ? "Declining"
                        : "Baseline"}
                  </Badge>
                </div>
                {stats.count > 1 && (
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
                    <span>
                      Baseline: <strong>{stats.first!.value} {metric.unit}</strong>
                    </span>
                    <span>
                      Latest: <strong>{stats.latest!.value} {metric.unit}</strong>
                    </span>
                    {stats.change !== null && (
                      <span>
                        Change:{" "}
                        <strong className={changeClass}>
                          {stats.change > 0 ? "+" : ""}
                          {Number(stats.change.toFixed(2))} {metric.unit}
                        </strong>
                      </span>
                    )}
                    {stats.changePct !== null && (
                      <span>
                        Δ:{" "}
                        <strong className={changeClass}>
                          {stats.changePct > 0 ? "+" : ""}
                          {Number(stats.changePct.toFixed(1))}%
                        </strong>
                      </span>
                    )}
                    <span>{stats.count} entries</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <ProgressChart
                  data={metric.data}
                  label={metric.label}
                  unit={metric.unit}
                />
              </CardContent>
            </Card>
          );
        })
      )}

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
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
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
