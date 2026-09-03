"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  LineChart as LineChartIcon,
  TrendingUp,
  Award,
  Minus,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BRANCH_METRICS, computeMetricStats, describeMetric } from "@/lib/metrics";
import { formatDateTime } from "@/lib/utils";
import type { BranchSpecialty, Patient, ProgressEntry } from "@/types";

interface BranchProgressDashboardProps {
  patient: Patient;
  progressEntries: ProgressEntry[];
  isPatientView?: boolean;
}

export function BranchProgressDashboard({
  patient,
  progressEntries,
  isPatientView = false,
}: BranchProgressDashboardProps) {
  const branch = (patient.branch_specialty ?? "Orthopedic") as BranchSpecialty;
  const [selectedMetric, setSelectedMetric] = useState<string | "all">("all");

  // Filter progress entries for this patient
  const patientEntries = progressEntries.filter((e) => e.patient_id === patient.id);
  const trackedKeys = [...new Set(patientEntries.map((e) => e.metric_key))];

  // Derive branch-recommended metric keys
  const branchKeys = BRANCH_METRICS[branch] ?? ["pain_vas"];

  // Always render a graph for EVERY metric recommended for the patient's branch,
  // plus any additional tracked metrics. This guarantees a detailed, branch-specific
  // dashboard even when the clinician hasn't recorded every metric yet.
  const metricKeys = [...new Set([...branchKeys, ...trackedKeys])];

  // Prepare metric data objects
  const allMetricsData = metricKeys
    .map((key) => {
      const meta = describeMetric(key);
      const data = patientEntries
        .filter((e) => e.metric_key === key)
        .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
        .map((e) => ({ value: Number(e.value), date_time: e.date_time }));
      const stats = computeMetricStats(key, data);
      const isBranchKey = branchKeys.includes(key);
      return {
        ...meta,
        data,
        stats,
        isBranchKey,
      };
    })
    .sort((a, b) => {
      const rank = (k: string) => {
        const idx = branchKeys.indexOf(k);
        return idx === -1 ? 99 : idx;
      };
      return rank(a.key) - rank(b.key);
    });

  // Filter metrics if specific one selected
  const displayedMetrics =
    selectedMetric === "all"
      ? allMetricsData
      : allMetricsData.filter((m) => m.key === selectedMetric);

  // Overall Recovery Score calculation (average improvement % across metrics)
  const validImprovements = allMetricsData
    .map((m) => {
      if (m.stats.changePct === null) return null;
      return m.stats.improving === true
        ? Math.abs(m.stats.changePct)
        : m.stats.improving === false
        ? -Math.abs(m.stats.changePct)
        : 0;
    })
    .filter((v): v is number => v !== null);

  const avgImprovement =
    validImprovements.length > 0
      ? validImprovements.reduce((a, b) => a + b, 0) / validImprovements.length
      : 0;

  const improvingCount = allMetricsData.filter((m) => m.stats.improving === true).length;
  const stableCount = allMetricsData.filter((m) => m.stats.improving === null).length;
  const totalSessions = Math.max(
    ...allMetricsData.map((m) => m.data.length),
    patientEntries.length > 0 ? 1 : 0
  );

  // Branch icons & themes
  const branchMeta: Record<
    BranchSpecialty,
    { title: string; emoji: string; color: string; desc: string }
  > = {
    Neurological: {
      title: "Neurological Recovery Dashboard",
      emoji: "🧠",
      color: "from-purple-500 to-indigo-600",
      desc: "Motor control, spasticity (MAS), balance (Berg), and gait spatiotemporal trajectory.",
    },
    Cardiorespiratory: {
      title: "Cardiorespiratory Rehabilitation Progress",
      emoji: "🫀",
      color: "from-rose-500 to-red-600",
      desc: "Functional walk capacity (6MWT), dyspnea rating (Borg), and exercise tolerance.",
    },
    Orthopedic: {
      title: "Orthopedic Rehabilitation & ROM Tracker",
      emoji: "🦴",
      color: "from-blue-500 to-cyan-600",
      desc: "Joint Range of Motion (AROM/PROM), muscle strength (MMT), and swelling/girth.",
    },
    Geriatric: {
      title: "Geriatric Functional Mobility & Fall Risk",
      emoji: "👴",
      color: "from-amber-500 to-orange-600",
      desc: "Timed Up & Go (TUG), 30s chair stand reps, and ADL functional index.",
    },
    Pediatric: {
      title: "Pediatric Motor Development & Milestones",
      emoji: "👶",
      color: "from-emerald-500 to-teal-600",
      desc: "Gross Motor Function Measure (GMFM), PEDI functional skills, and milestone attainment.",
    },
  };

  const meta = branchMeta[branch];

  return (
    <div className="space-y-6">
      {/* ── Branch Header & Overall Recovery Index ── */}
      <Card className="overflow-hidden border-2 shadow-sm">
        <div className={`bg-gradient-to-r ${meta.color} p-6 text-white`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{meta.emoji}</span>
                <h2 className="text-xl font-bold tracking-tight">{meta.title}</h2>
              </div>
              <p className="text-sm opacity-90">{meta.desc}</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-md">
              <div className="text-right">
                <div className="text-xs font-medium uppercase tracking-wider opacity-80">
                  {isPatientView ? "Your Recovery Score" : "Branch Improvement Score"}
                </div>
                <div className="text-2xl font-black">
                  {avgImprovement > 0 ? "+" : ""}
                  {avgImprovement.toFixed(1)}%
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar / Development Trajectory Strip */}
        <CardContent className="p-4 pt-4 bg-card">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">
                Overall Goal Trajectory & Clinical Development
              </span>
              <span className="text-primary font-bold">
                {Math.min(Math.max(Math.round(50 + avgImprovement), 10), 100)}% Milestone Target
              </span>
            </div>
            <div className="h-3.5 w-full rounded-full bg-muted overflow-hidden p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${meta.color}`}
                style={{
                  width: `${Math.min(Math.max(Math.round(50 + avgImprovement), 10), 100)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>Baseline Assessment</span>
              <span>Mid-Rehab Progress</span>
              <span className="font-semibold text-foreground">Target Discharge</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Key Performance Indicators Summary Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Metrics Monitored
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{allMetricsData.length}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Across {totalSessions} documented encounters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Improving Indicators
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-emerald-600 flex items-center gap-1">
              <Sparkles className="h-5 w-5 fill-emerald-500 text-emerald-500" />
              {improvingCount} / {allMetricsData.length}
            </div>
            <p className="text-xs text-emerald-700 font-medium pt-1">
              Showing positive functional recovery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Primary Diagnosis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm font-bold truncate">{patient.primary_diagnosis}</div>
            <Badge variant="outline" className="mt-1 text-[11px]">
              {branch} Specialty
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Patient Caregiver Portal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <Award className="h-4 w-4" /> Active Tracking
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {isPatientView ? "Your progress is updated live" : "Visible in patient account"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Metric Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Button
          variant={selectedMetric === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedMetric("all")}
          className="rounded-full text-xs"
        >
          All {branch} Graphs ({allMetricsData.length})
        </Button>
        {allMetricsData.map((m) => (
          <Button
            key={m.key}
            variant={selectedMetric === m.key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMetric(m.key)}
            className="rounded-full text-xs whitespace-nowrap"
          >
            {m.label}
          </Button>
        ))}
      </div>

      {/* ── Detailed Branch Graphs Grid ── */}
      {displayedMetrics.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <Activity className="h-10 w-10 mx-auto opacity-40 stroke-1" />
            <div>
              <p className="font-semibold text-foreground">No progress data recorded yet</p>
              <p className="text-sm">
                Quantitative findings logged during encounters will automatically render here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {displayedMetrics.map((metric) => {
            const { stats, data } = metric;
            const isImproving = stats.improving === true;
            const isDeclining = stats.improving === false;

            // Branch-recommended metric with no readings yet → show a placeholder
            // card instead of rendering an empty/broken chart.
            if (data.length === 0) {
              return (
                <Card key={metric.key} className="overflow-hidden border-dashed shadow-sm">
                  <CardHeader className="pb-2 bg-muted/10 border-b">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <LineChartIcon className="h-4 w-4 text-muted-foreground" />
                      {metric.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-10 text-center text-muted-foreground space-y-2">
                    <Activity className="mx-auto h-8 w-8 opacity-30 stroke-1" />
                    <p className="text-sm font-medium text-foreground">No readings logged</p>
                    <p className="text-xs max-w-xs mx-auto">
                      {metric.isBranchKey
                        ? `Recommended ${branch} metric — record it during the next encounter to start this chart.`
                        : "No progress entries have been logged for this metric yet."}
                    </p>
                  </CardContent>
                </Card>
              );
            }

            const chartData = data.map((d) => ({
              date: formatDateTime(d.date_time),
              val: d.value,
            }));

            const firstVal = stats.first?.value ?? 0;
            const latestVal = stats.latest?.value ?? 0;

            return (
              <Card key={metric.key} className="overflow-hidden border shadow-sm">
                <CardHeader className="pb-2 bg-muted/10 border-b">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        {metric.label}
                        {metric.isBranchKey && (
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            Core {branch}
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>
                          Baseline: <strong className="text-foreground">{firstVal} {metric.unit}</strong>
                        </span>
                        <span>
                          Current: <strong className="text-primary font-bold">{latestVal} {metric.unit}</strong>
                        </span>
                        {stats.change !== null && (
                          <span>
                            Δ:{" "}
                            <strong
                              className={
                                isImproving
                                  ? "text-emerald-600 font-bold"
                                  : isDeclining
                                  ? "text-red-600 font-bold"
                                  : "text-foreground"
                              }
                            >
                              {stats.change > 0 ? "+" : ""}
                              {Number(stats.change.toFixed(2))} {metric.unit}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant={isImproving ? "success" : isDeclining ? "destructive" : "secondary"}
                      className="flex items-center gap-1 font-semibold"
                    >
                      {isImproving ? (
                        <>
                          <ArrowUpRight className="h-3.5 w-3.5" /> Improving
                        </>
                      ) : isDeclining ? (
                        <>
                          <ArrowDownRight className="h-3.5 w-3.5" /> Attention
                        </>
                      ) : (
                        <>
                          <Minus className="h-3.5 w-3.5" /> Baseline
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor={isImproving ? "#10b981" : "#3b82f6"}
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor={isImproving ? "#10b981" : "#3b82f6"}
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                        <Tooltip
                          formatter={(val: number) => [`${val} ${metric.unit}`, metric.label]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        {firstVal > 0 && (
                          <ReferenceLine
                            y={firstVal}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: "Baseline",
                              fill: "#64748b",
                              fontSize: 10,
                              position: "insideTopRight",
                            }}
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="val"
                          stroke={isImproving ? "#10b981" : "#3b82f6"}
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill={`url(#grad-${metric.key})`}
                          dot={{ r: 4, fill: isImproving ? "#10b981" : "#3b82f6" }}
                          activeDot={{ r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {stats.changePct !== null && (
                    <div className="mt-3 flex items-center justify-between text-xs border-t pt-2 text-muted-foreground">
                      <span>Relative Development:</span>
                      <span className={`font-bold ${isImproving ? "text-emerald-600" : isDeclining ? "text-red-600" : ""}`}>
                        {stats.changePct > 0 ? "+" : ""}
                        {stats.changePct.toFixed(1)}% improvement since initial session
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
