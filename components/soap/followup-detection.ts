/**
 * Follow-up test detection engine.
 *
 * After a patient's FIRST (initial) encounter, the clinician creating a
 * FOLLOW-UP encounter needs to pick which of the tests / blocks / criteria
 * that were filled during the initial assessment should be re-assessed now.
 *
 * This module walks a previous `Encounter.objective` and returns a structured,
 * grouped list of every filled item ("blocks"), together with helpers to
 * carry selected previous values forward into the new encounter's Objective.
 */
import type { Encounter } from "@/types";

export interface FilledItem {
  key: string;
  label: string;
  path: string;
  previous: string;
  kind: "scalar" | "specialTest";
}

export interface FilledBlock {
  id: string;
  title: string;
  items: FilledItem[];
}

export interface FollowupDetection {
  blocks: FilledBlock[];
  itemsById: Map<string, FilledItem>;
  total: number;
}

/* ── Small helpers ── */

function getPath<T = unknown>(obj: Record<string, unknown>, path: string): T | undefined {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur as T;
}

const isEmptyString = (v: unknown) => typeof v === "string" && v.trim() === "";

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

function resultLabel(r: string): string {
  if (r === "positive") return "Positive (+)";
  if (r === "negative") return "Negative (−)";
  return "Not tested (NT)";
}

/* ── Detection ── */

export function detectFilledBlocks(encounter: Encounter): FollowupDetection {
  const blocks: FilledBlock[] = [];
  const itemsById = new Map<string, FilledItem>();
  const objective = encounter.objective as unknown as Record<string, unknown>;

  const push = (blockId: string, title: string, item: FilledItem) => {
    let block = blocks.find((b) => b.id === blockId);
    if (!block) {
      block = { id: blockId, title, items: [] };
      blocks.push(block);
    }
    block.items.push(item);
    itemsById.set(item.key, item);
  };

  /* Vitals */
  const vitals = getPath<Record<string, unknown>>(objective, "vitals") ?? {};
  const vitalFields: [string, string][] = [
    ["heart_rate_bpm", "Heart Rate"],
    ["blood_pressure_mmHg", "Blood Pressure"],
    ["respiratory_rate_bpm", "Respiratory Rate"],
    ["spo2_percent", "SpO₂"],
    ["temperature_c", "Temperature"],
  ];
  for (const [field, label] of vitalFields) {
    const v = vitals[field];
    if (isFilled(v)) {
      push("vitals", "Vitals & Observation", {
        key: `vitals.${field}`,
        label,
        path: `vitals.${field}`,
        previous: String(v),
        kind: "scalar",
      });
    }
  }
  if (isFilled(getPath(objective, "observation.sensorium"))) {
    push("vitals", "Vitals & Observation", {
      key: "observation.sensorium",
      label: "Sensorium / Level of Consciousness",
      path: "observation.sensorium",
      previous: String(getPath(objective, "observation.sensorium")),
      kind: "scalar",
    });
  }
  if (isFilled(getPath(objective, "ambulatory_status"))) {
    push("vitals", "Vitals & Observation", {
      key: "ambulatory_status",
      label: "Ambulatory Status",
      path: "ambulatory_status",
      previous: String(getPath(objective, "ambulatory_status")),
      kind: "scalar",
    });
  }
  if (isFilled(getPath(objective, "general_condition"))) {
    push("vitals", "Vitals & Observation", {
      key: "general_condition",
      label: "General Condition",
      path: "general_condition",
      previous: String(getPath(objective, "general_condition")),
      kind: "scalar",
    });
  }

  /* ROM (each recorded joint/motion) */
  const arom = getPath<Record<string, unknown>>(objective, "rom.arom") ?? {};
  for (const [key, val] of Object.entries(arom)) {
    if (!isFilled(val)) continue;
    const title = key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const prom = getPath<Record<string, unknown>>(objective, "rom.prom")?.[key];
    push("rom", "Range of Motion (AROM/PROM)", {
      key: `rom.${key}`,
      label: `${title} ROM`,
      path: `rom.arom.${key}`,
      previous: `AROM ${val}${isFilled(prom) ? ` · PROM ${prom}` : ""}`,
      kind: "scalar",
    });
  }

  /* MMT (each recorded muscle group) */
  const mmt = getPath<Record<string, unknown>>(objective, "strength.mmt") ?? {};
  for (const [key, val] of Object.entries(mmt)) {
    if (!isFilled(val)) continue;
    const title = key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    push("mmt", "Manual Muscle Testing (MMT)", {
      key: `mmt.${key}`,
      label: title,
      path: `strength.mmt.${key}`,
      previous: `MMT ${val}/5`,
      kind: "scalar",
    });
  }

  /* Functional tests */
  const funcTests: [string, string][] = [
    ["tug_sec", "Timed Up & Go (TUG)"],
    ["six_mwt_m", "6-Minute Walk Test (6MWT)"],
  ];
  for (const [field, label] of funcTests) {
    const v = getPath<number>(objective, `functional_tests.${field}`);
    if (isFilled(v)) {
      const unit = field === "tug_sec" ? "s" : "m";
      push("functional", "Functional Tests", {
        key: `functional.${field}`,
        label,
        path: `functional_tests.${field}`,
        previous: `${v} ${unit}`,
        kind: "scalar",
      });
    }
  }

  /* Gait parameters */
  const gait = getPath<Record<string, unknown>>(objective, "gait_parameters") ?? {};
  const gaitLabels: [string, string][] = [
    ["step_length_cm", "Step Length"],
    ["stride_length_cm", "Stride Length"],
    ["cadence_steps_min", "Cadence"],
    ["base_width_cm", "Base Width"],
  ];
  for (const [field, label] of gaitLabels) {
    const v = gait[field];
    if (isFilled(v)) {
      const unit = field === "cadence_steps_min" ? "steps/min" : "cm";
      push("gait", "Gait Parameters", {
        key: `gait.${field}`,
        label,
        path: `gait_parameters.${field}`,
        previous: `${v} ${unit}`,
        kind: "scalar",
      });
    }
  }

  /* Neurological mapping */
  const neuroMapping: [string, string][] = [
    ["dermatomes", "Dermatomes"],
    ["myotomes", "Myotomes"],
    ["capsular_pattern", "Capsular Pattern"],
    ["loose_close_packed", "Loose / Close-Packed Position"],
  ];
  for (const [field, label] of neuroMapping) {
    const v = getPath(objective, field);
    if (isFilled(v) && !isEmptyString(v)) {
      push("neuro-mapping", "Neurological Mapping", {
        key: `neuroMap.${field}`,
        label,
        path: field,
        previous: String(v),
        kind: "scalar",
      });
    }
  }

  /* Skin & soft tissues (non-"None") */
  const skin = getPath<Record<string, unknown>>(objective, "skin_and_soft_tissues") ?? {};
  for (const [key, val] of Object.entries(skin)) {
    if (typeof val !== "string" || val === "None") continue;
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
    push("skin", "Skin & Soft Tissues", {
      key: `skin.${key}`,
      label,
      path: `skin_and_soft_tissues.${key}`,
      previous: String(val),
      kind: "scalar",
    });
  }

  /* Sensation table */
  const sensation = getPath<Record<string, unknown>>(objective, "sensation_table") ?? {};
  for (const [kind, detail] of Object.entries(sensation)) {
    if (kind === "other") continue;
    const d = detail as { right?: boolean; left?: boolean; specification?: string };
    if (!d || (!d.right && !d.left && !isFilled(d.specification))) continue;
    const side = [d.right ? "R" : "", d.left ? "L" : ""].filter(Boolean).join("/") || "—";
    push("sensation", "Sensation Examination", {
      key: `sens.${kind}`,
      label: kind.charAt(0).toUpperCase() + kind.slice(1),
      path: `sensation_table.${kind}`,
      previous: `${side}${isFilled(d.specification as unknown) ? ` · ${d.specification}` : ""}`,
      kind: "scalar",
    });
  }

  /* Reflexes (non-normal) */
  const reflexes = getPath<Record<string, unknown>>(objective, "reflexes_table") ?? {};
  const reflexNames: [string, string][] = [
    ["btr", "Biceps (BTR)"],
    ["ttr", "Triceps (TTR)"],
    ["ktr", "Knee (KTR)"],
    ["atr", "Ankle (ATR)"],
  ];
  for (const [key, label] of reflexNames) {
    const r = reflexes[key] as { right?: string; left?: string } | undefined;
    if (!r) continue;
    const sides = [r.right, r.left].filter((s): s is string => !!s && s !== "normal" && s !== "−");
    if (sides.length > 0) {
      push("reflexes", "Deep Tendon Reflexes", {
        key: `reflex.${key}`,
        label,
        path: `reflexes_table.${key}`,
        previous: sides.join(" / "),
        kind: "scalar",
      });
    }
  }

  /* ICF activity limitations (non "None") */
  const activities = getPath<Record<string, unknown>>(objective, "activity_limitations.items") ?? {};
  for (const [key, val] of Object.entries(activities)) {
    if (typeof val === "string" && (val === "None" || val === "")) continue;
    if (!isFilled(val)) continue;
    push("icf-activity", "ICF Activity Limitations", {
      key: `icfA.${key}`,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      path: `activity_limitations.items.${key}`,
      previous: String(val),
      kind: "scalar",
    });
  }

  /* ICF participation restrictions (true) */
  const participation = getPath<Record<string, unknown>>(objective, "participation_restrictions.items") ?? {};
  for (const [key, val] of Object.entries(participation)) {
    if (val !== true) continue;
    push("icf-participation", "ICF Participation Restrictions", {
      key: `icfP.${key}`,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      path: `participation_restrictions.items.${key}`,
      previous: "Restricted",
      kind: "scalar",
    });
  }

  const bs = getPath<Record<string, unknown>>(objective, "branch_specific") ?? {};

  /* ── Branch-specific blocks ── */

  /* Orthopedic */
  const ortho = getPath<Record<string, unknown>>(bs, "orthopedic") ?? {};
  const orthoResults = (ortho.special_test_results as { name?: string; result?: string }[] | undefined) ?? [];
  for (const t of orthoResults) {
    if (!t?.name) continue;
    push("ortho", "Orthopedic — Special Tests", {
      key: `ortho:${t.name}`,
      label: t.name,
      path: "branch_specific.orthopedic.special_test_results",
      previous: resultLabel(t.result ?? "nt"),
      kind: "specialTest",
    });
  }
  if (ortho.joint_play && ortho.joint_play !== "Normal" && isFilled(ortho.joint_play)) {
    push("ortho", "Orthopedic — Special Tests", {
      key: "ortho:joint_play",
      label: "Joint Play / Mobility",
      path: "branch_specific.orthopedic.joint_play",
      previous: String(ortho.joint_play),
      kind: "scalar",
    });
  }
  if (ortho.swelling_grade && ortho.swelling_grade !== "None" && isFilled(ortho.swelling_grade)) {
    push("ortho", "Orthopedic — Special Tests", {
      key: "ortho:swelling_grade",
      label: "Swelling Grade",
      path: "branch_specific.orthopedic.swelling_grade",
      previous: String(ortho.swelling_grade),
      kind: "scalar",
    });
  }
  if (isFilled(ortho.limb_length_apparent_cm)) {
    push("ortho", "Orthopedic — Special Tests", {
      key: "ortho:limb_length",
      label: "Apparent Limb Length",
      path: "branch_specific.orthopedic.limb_length_apparent_cm",
      previous: `${ortho.limb_length_apparent_cm} cm`,
      kind: "scalar",
    });
  }

  /* Cardiorespiratory */
  const cardio = getPath<Record<string, unknown>>(bs, "cardiorespiratory") ?? {};
  const cardioFields: [string, string, (n: number) => string][] = [
    ["iswt_m", "Incremental Shuttle Walk (ISWT)", (n) => `${n} m`],
    ["borg_dyspnea_score", "Borg Dyspnea Score", (n) => `${n}/10`],
    ["chest_expansion_cm", "Chest Expansion", (n) => `${n} cm`],
    ["hr_resting_bpm", "Resting Heart Rate", (n) => `${n} bpm`],
    ["hr_post_exercise_bpm", "Post-Exercise Heart Rate", (n) => `${n} bpm`],
    ["bp_systolic_resting", "Resting BP Systolic", (n) => `${n} mmHg`],
    ["bp_diastolic_resting", "Resting BP Diastolic", (n) => `${n} mmHg`],
    ["bp_systolic_post_exercise", "Post-Exercise BP Systolic", (n) => `${n} mmHg`],
    ["bp_diastolic_post_exercise", "Post-Exercise BP Diastolic", (n) => `${n} mmHg`],
    ["bmi_kg_m2", "BMI", (n) => `${n} kg/m²`],
  ];
  for (const [field, label, fmt] of cardioFields) {
    const v = cardio[field] as number | null | undefined;
    if (isFilled(v)) {
      push("cardio", "Cardiorespiratory — Tests", {
        key: `cardio.${field}`,
        label,
        path: `branch_specific.cardiorespiratory.${field}`,
        previous: fmt(v as number),
        kind: "scalar",
      });
    }
  }

  /* Neurological */
  const neuro = getPath<Record<string, unknown>>(bs, "neurological") ?? {};
  const neuroFields: [string, string, (n: number) => string][] = [
    ["modified_ashworth_scale", "Modified Ashworth Scale (MAS)", (n) => `Grade ${n}`],
    ["berg_balance_score", "Berg Balance Score", (n) => `${n}/56`],
  ];
  for (const [field, label, fmt] of neuroFields) {
    const v = neuro[field] as number | null | undefined;
    if (isFilled(v)) {
      push("neuro", "Neurological — Tests", {
        key: `neuro.${field}`,
        label,
        path: `branch_specific.neurological.${field}`,
        previous: fmt(v as number),
        kind: "scalar",
      });
    }
  }
  const gcs = getPath<Record<string, unknown>>(neuro, "higher_mental_functions.glasgow_coma_scale");
  if (gcs && isFilled(gcs)) {
    push("neuro", "Neurological — Tests", {
      key: "neuro:gcs",
      label: "Glasgow Coma Scale (GCS)",
      path: "branch_specific.neurological.higher_mental_functions.glasgow_coma_scale",
      previous: `E${gcs.eye ?? "?"}/V${gcs.verbal ?? "?"}/M${gcs.motor ?? "?"}`,
      kind: "scalar",
    });
  }
  const gaitExam = getPath<Record<string, unknown>>(neuro, "gait_examination");
  if (gaitExam && isFilled(gaitExam.gait_deviations) && !isEmptyString(gaitExam.gait_deviations)) {
    push("neuro", "Neurological — Tests", {
      key: "neuro:gait_deviations",
      label: "Gait Examination — Deviations",
      path: "branch_specific.neurological.gait_examination.gait_deviations",
      previous: String(gaitExam.gait_deviations),
      kind: "scalar",
    });
  }

  /* Geriatric */
  const gero = getPath<Record<string, unknown>>(bs, "geriatric") ?? {};
  const geroFields: [string, string, (n: number) => string][] = [
    ["thirty_sec_chair_stand_reps", "30-Second Chair Stand", (n) => `${n} reps`],
    ["adl_index_score", "ADL Index Score", (n) => `${n}`],
    ["fall_history_count", "Falls (past 12 months)", (n) => `${n}`],
  ];
  for (const [field, label, fmt] of geroFields) {
    const v = gero[field] as number | null | undefined;
    if (isFilled(v)) {
      push("geriatric", "Geriatric — Tests", {
        key: `geriatric.${field}`,
        label,
        path: `branch_specific.geriatric.${field}`,
        previous: fmt(v as number),
        kind: "scalar",
      });
    }
  }
  const katz = gero.katz_items as Record<string, boolean> | undefined;
  if (katz && Object.values(katz).some(Boolean)) {
    push("geriatric", "Geriatric — Tests", {
      key: "geriatric:katz",
      label: "Katz ADL Index (independent items)",
      path: "branch_specific.geriatric.katz_items",
      previous: Object.entries(katz)
        .filter(([, v]) => v)
        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(", "),
      kind: "scalar",
    });
  }

  /* Pediatric */
  const pedi = getPath<Record<string, unknown>>(bs, "pediatric") ?? {};
  const pediFields: [string, string, (n: number) => string][] = [
    ["gmfm_percentage", "GMFM-88/66 Score", (n) => `${n}%`],
    ["pedi_score", "PEDI Functional Score", (n) => `${n}`],
  ];
  for (const [field, label, fmt] of pediFields) {
    const v = pedi[field] as number | null | undefined;
    if (isFilled(v)) {
      push("pediatric", "Pediatric — Development", {
        key: `pediatric.${field}`,
        label,
        path: `branch_specific.pediatric.${field}`,
        previous: fmt(v as number),
        kind: "scalar",
      });
    }
  }
  if (isFilled(pedi.milestones_achieved)) {
    push("pediatric", "Pediatric — Development", {
      key: "pediatric:milestones",
      label: "Motor Milestones Achieved",
      path: "branch_specific.pediatric.milestones_achieved",
      previous: String((pedi.milestones_achieved as string[]).length) + " milestone(s)",
      kind: "scalar",
    });
  }

  const total = blocks.reduce((n, b) => n + b.items.length, 0);
  return { blocks, itemsById, total };
}

/**
 * Builds the list of field patches to pre-fill a follow-up encounter's
 * objective, based on the tests the clinician ticked on the re-assessment
 * step. Each entry carries the dotted path (relative to `objective`) and the
 * raw previous value so the field is pre-filled for editing.
 */
export function buildFollowupPatch(
  prevObjective: Record<string, unknown>,
  selectedKeys: Set<string>,
  itemsById: Map<string, FilledItem>
): { path: string; value: unknown }[] {
  const patch: { path: string; value: unknown }[] = [];
  for (const key of selectedKeys) {
    const item = itemsById.get(key);
    if (!item) continue;
    const raw = getPath(prevObjective, item.path);
    if (raw === undefined) continue;
    patch.push({ path: item.path, value: raw });

    // When re-assessing a ROM motion, carry the matching PROM value too.
    if (item.path.startsWith("rom.arom.")) {
      const motion = item.path.slice("rom.arom.".length);
      const prom = getPath(prevObjective, `rom.prom.${motion}`);
      if (prom !== undefined) {
        patch.push({ path: `rom.prom.${motion}`, value: prom });
      }
    }
  }
  return patch;
}