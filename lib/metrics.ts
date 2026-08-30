import type { BranchSpecialty, BranchSpecificObjectiveData } from "@/types";
import { METRIC_PRESETS } from "@/lib/validators/schemas";

// ── Metric metadata ──

export interface MetricMeta {
  key: string;
  label: string;
  unit: string;
}

export function describeMetric(key: string): MetricMeta {
  const preset = METRIC_PRESETS.find((p) => p.key === key);
  if (preset) return { key, label: preset.label, unit: preset.unit };

  // Dynamic ROM keys: rom_<joint>[_<motion>]_deg → "<Joint> <Motion> ROM (deg)"
  const romMatch = key.match(/^rom_([a-z0-9_]+)_deg$/);
  if (romMatch) {
    const motion = romMatch[1]!
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return { key, label: `${motion} ROM (AROM)`, unit: "deg" };
  }

  // Dynamic girth keys: girth_<site>_cm → "<Site> Girth (cm)"
  const girthMatch = key.match(/^girth_([a-z0-9_]+)_cm$/);
  if (girthMatch) {
    const site = girthMatch[1]!
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return { key, label: `${site} Girth (cm)`, unit: "cm" };
  }

  return { key, label: key, unit: "" };
}

// ── Branch-recommended metrics ──

export const BRANCH_METRICS: Record<BranchSpecialty, string[]> = {
  Orthopedic: ["pain_vas", "rom_knee_flexion_deg", "rom_lumbar_flexion_deg", "tug_sec", "girth_knee_R_cm"],
  Cardiorespiratory: ["pain_vas", "six_mwt_m", "borg_dyspnea", "chest_expansion_cm"],
  Neurological: ["pain_vas", "berg_balance_score", "mas_spasticity_grade", "tug_sec"],
  Geriatric: ["pain_vas", "tug_sec", "thirty_sec_chair_stand"],
  Pediatric: ["pain_vas", "gmfm_pct", "pedi_score"],
};

// ── Extraction of metric samples from an encounter's objective data ──

export interface MetricSample {
  metric_key: string;
  value: number;
  unit: string;
}

function parseLeadingNumber(raw: string): number | null {
  const m = raw.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const v = Number(m[0]);
  return Number.isFinite(v) ? v : null;
}

/**
 * Permissive objective shape — accepts both the canonical ObjectiveData and
 * Zod-parsed forms (whose nested properties may be optional/undefined).
 */
export interface ObjectiveLike {
  functional_tests?: { tug_sec?: number | null; six_mwt_m?: number | null };
  rom?: { arom?: Record<string, string>; prom?: Record<string, string> };
  measurements?: { girth_cm?: Record<string, number> };
  branch_specific?: {
    cardiorespiratory?: { borg_dyspnea_score?: number | null; chest_expansion_cm?: number | null };
    neurological?: { modified_ashworth_scale?: number | null; berg_balance_score?: number | null };
    geriatric?: { thirty_sec_chair_stand_reps?: number | null };
    pediatric?: { gmfm_percentage?: number | null; pedi_score?: number | null };
  };
}

/**
 * Derive all chartable metric samples from an encounter's objective block.
 * Used to auto-log progress entries when an encounter is saved, and to seed demo data.
 */
export function extractMetricSamples(objective: ObjectiveLike): MetricSample[] {
  const samples: MetricSample[] = [];

  // Functional tests
  const tug = objective.functional_tests?.tug_sec;
  if (tug !== null && tug !== undefined) samples.push({ metric_key: "tug_sec", value: tug, unit: "sec" });
  const sixMwt = objective.functional_tests?.six_mwt_m;
  if (sixMwt !== null && sixMwt !== undefined) samples.push({ metric_key: "six_mwt_m", value: sixMwt, unit: "m" });

  // ROM — every AROM joint entry becomes a rom_<joint>_deg time-series
  const arom = objective.rom?.arom ?? {};
  for (const [joint, raw] of Object.entries(arom)) {
    if (!joint || typeof raw !== "string") continue;
    const val = parseLeadingNumber(raw);
    if (val === null || val === 0) continue;
    samples.push({ metric_key: `rom_${joint}_deg`, value: val, unit: "deg" });
  }

  // Girth measurements — girth_<site>_cm
  const girth = objective.measurements?.girth_cm ?? {};
  for (const [site, val] of Object.entries(girth)) {
    if (!site || typeof val !== "number" || !Number.isFinite(val) || val <= 0) continue;
    samples.push({ metric_key: `girth_${site}_cm`, value: val, unit: "cm" });
  }

  // Branch-specific numerics
  const bs = objective.branch_specific;
  if (bs?.cardiorespiratory) {
    if (bs.cardiorespiratory.borg_dyspnea_score !== null && bs.cardiorespiratory.borg_dyspnea_score !== undefined)
      samples.push({ metric_key: "borg_dyspnea", value: bs.cardiorespiratory.borg_dyspnea_score, unit: "score" });
    if (bs.cardiorespiratory.chest_expansion_cm !== null && bs.cardiorespiratory.chest_expansion_cm !== undefined)
      samples.push({ metric_key: "chest_expansion_cm", value: bs.cardiorespiratory.chest_expansion_cm, unit: "cm" });
  }
  if (bs?.neurological) {
    if (bs.neurological.modified_ashworth_scale !== null && bs.neurological.modified_ashworth_scale !== undefined)
      samples.push({ metric_key: "mas_spasticity_grade", value: bs.neurological.modified_ashworth_scale, unit: "grade" });
    if (bs.neurological.berg_balance_score !== null && bs.neurological.berg_balance_score !== undefined)
      samples.push({ metric_key: "berg_balance_score", value: bs.neurological.berg_balance_score, unit: "score" });
  }
  if (bs?.geriatric) {
    if (bs.geriatric.thirty_sec_chair_stand_reps !== null && bs.geriatric.thirty_sec_chair_stand_reps !== undefined)
      samples.push({ metric_key: "thirty_sec_chair_stand", value: bs.geriatric.thirty_sec_chair_stand_reps, unit: "reps" });
  }
  if (bs?.pediatric) {
    if (bs.pediatric.gmfm_percentage !== null && bs.pediatric.gmfm_percentage !== undefined)
      samples.push({ metric_key: "gmfm_pct", value: bs.pediatric.gmfm_percentage, unit: "%" });
    if (bs.pediatric.pedi_score !== null && bs.pediatric.pedi_score !== undefined)
      samples.push({ metric_key: "pedi_score", value: bs.pediatric.pedi_score, unit: "score" });
  }

  return samples;
}

// ── Improvement statistics ──

/** Metrics where a decreasing value means improvement. */
const LOWER_IS_BETTER = new Set([
  "pain_vas",
  "tug_sec",
  "borg_dyspnea",
  "mas_spasticity_grade",
  "girth_",
]);

export function isLowerBetter(metricKey: string): boolean {
  if (metricKey.startsWith("girth_")) return true;
  return LOWER_IS_BETTER.has(metricKey);
}

export interface MetricStats {
  first: { value: number; date_time: string } | null;
  latest: { value: number; date_time: string } | null;
  change: number | null; // latest - first
  changePct: number | null; // relative to first baseline
  improving: boolean | null; // null when no clear trend / insufficient data
  count: number;
}

export function computeMetricStats(
  metricKey: string,
  data: { value: number; date_time: string }[],
): MetricStats {
  const count = data.length;
  if (count === 0) {
    return { first: null, latest: null, change: null, changePct: null, improving: null, count: 0 };
  }
  const first = { value: data[0]!.value, date_time: data[0]!.date_time };
  const latest = { value: data[count - 1]!.value, date_time: data[count - 1]!.date_time };
  if (count === 1) {
    return { first, latest, change: null, changePct: null, improving: null, count };
  }
  const change = latest.value - first.value;
  const changePct = first.value === 0 ? null : (change / Math.abs(first.value)) * 100;
  const significant = changePct === null ? Math.abs(change) > 0 : Math.abs(changePct) >= 2;
  const improving = significant
    ? change < 0 === isLowerBetter(metricKey)
    : null;
  return { first, latest, change, changePct, improving, count };
}

