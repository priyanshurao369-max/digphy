"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createEncounter } from "@/lib/actions/encounters";
import type { EncounterFormData, ProgressMetricSample } from "@/lib/validators/schemas";
import { METRIC_PRESETS } from "@/lib/validators/schemas";
import type { BranchSpecialty } from "@/types";

const STEPS = ["Header", "Subjective", "Objective", "Assessment", "Plan"] as const;

// Joint-specific assessment dropdowns (Objective step)
const ROM_JOINTS = [
  "Cervical Spine", "Thoracic Spine", "Lumbar Spine", "Shoulder", "Elbow",
  "Wrist", "Hip", "Knee", "Ankle", "Foot",
] as const;
const ROM_MOTIONS = [
  "Flexion", "Extension", "Abduction", "Adduction", "Internal Rotation",
  "External Rotation", "Rotation", "Lateral Flexion", "Dorsiflexion", "Plantarflexion",
] as const;
const MMT_GROUPS = [
  "Cervical Flexors", "Shoulder Abductors", "Elbow Flexors", "Elbow Extensors",
  "Wrist Extensors", "Hip Flexors", "Hip Abductors", "Knee Extensors",
  "Knee Flexors", "Ankle Dorsiflexors", "Plantarflexors",
] as const;

// ICF Activity Limitations & Participation Restrictions (Objective step)
const ICF_QUALIFIERS = ["None", "Mild", "Moderate", "Severe", "Complete"] as const;
const ICF_ACTIVITIES = [
  { key: "dressing", label: "Dressing / Undressing" },
  { key: "bathing", label: "Bathing / Showering" },
  { key: "grooming", label: "Grooming & Hygiene" },
  { key: "feeding", label: "Feeding / Eating" },
  { key: "toileting", label: "Toileting" },
  { key: "transfers", label: "Transfers (bed/chair/toilet)" },
  { key: "stair_climbing", label: "Stair Climbing" },
  { key: "sitting_tolerance", label: "Sitting Tolerance" },
  { key: "standing_tolerance", label: "Standing Tolerance" },
  { key: "walking_distance", label: "Walking Distance" },
  { key: "lifting_carrying", label: "Lifting & Carrying" },
  { key: "reaching_overhead", label: "Reaching Overhead" },
  { key: "household_tasks", label: "Household Tasks" },
] as const;
const ICF_PARTICIPATION = [
  { key: "work_occupation", label: "Work / Occupation" },
  { key: "social_leisure", label: "Social & Leisure Activities" },
  { key: "community_access", label: "Community Access / Mobility" },
  { key: "family_roles", label: "Family & Household Roles" },
  { key: "sports_hobbies", label: "Sports & Hobbies" },
  { key: "sleep_rest", label: "Sleep & Rest Quality" },
] as const;

// Branch-specific assessment option sets
const SPECIAL_TESTS = [
  "Lachman", "Anterior Drawer", "Posterior Drawer", "McMurray", "Apley",
  "Hawkins-Kennedy", "Neer", "Thomas Test", "Ober Test",
] as const;
const KATZ_ADL_ITEMS = ["Bathing", "Dressing", "Toileting", "Transferring", "Continence", "Feeding"] as const;
const LAWTON_IADL_ITEMS = ["Telephone", "Shopping", "Food Prep", "Housekeeping", "Laundry", "Transportation", "Medications", "Finances"] as const;
const PEDI_MILESTONES = ["Head Control", "Sitting Independently", "Crawling", "Standing", "Walking"] as const;
const MAS_OPTIONS = [
  { value: "0", label: "0 — No increase in tone" },
  { value: "1", label: "1 — Slight increase (catch & release)" },
  { value: "1.5", label: "1+ — Slight increase (catch, min resistance)" },
  { value: "2", label: "2 — Marked increase in tone" },
  { value: "3", label: "3 — Considerable increase, passive movement difficult" },
  { value: "4", label: "4 — Affected part rigid" },
] as const;

interface SoapWizardProps {
  patientId: string;
  clinicianId: string;
  patientBranchSpecialty?: BranchSpecialty;
}

export function SoapWizard({
  patientId,
  clinicianId,
  patientBranchSpecialty = "Orthopedic",
}: SoapWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [activeBranch, setActiveBranch] = useState<BranchSpecialty>(patientBranchSpecialty);

  // Progress metric samples captured inside the wizard (persisted with the encounter)
  const [extraMetrics, setExtraMetrics] = useState<ProgressMetricSample[]>([]);
  const [metricKey, setMetricKey] = useState<string>(METRIC_PRESETS[0].key);
  const [metricValue, setMetricValue] = useState<string>("");
  const [metricNotes, setMetricNotes] = useState<string>("");

  // Joint-specific ROM (goniometry) entry state
  const [romJoint, setRomJoint] = useState<string>("");
  const [romMotion, setRomMotion] = useState<string>("");
  const [romArom, setRomArom] = useState<string>("");
  const [romProm, setRomProm] = useState<string>("");

  // Manual muscle testing entry state
  const [mmtJoint, setMmtJoint] = useState<string>("");
  const [mmtSide, setMmtSide] = useState<"Right" | "Left">("Right");
  const [mmtGrade, setMmtGrade] = useState<string>("");

  const now = new Date().toISOString();
  const today = now.split("T")[0];

  const [form, setForm] = useState<Partial<EncounterFormData>>({
    patient_id: patientId,
    clinician_id: clinicianId,
    date_time: now,
    encounter_type: "Initial",
    location: "Clinic",
    confidentiality_level: "Standard",
    notes: "",
    subjective: {
      chief_complaint: "",
      history_of_present_illness: {
        onset_date: today,
        mechanism: "",
        mode_of_onset: "Gradual",
        duration_category: "Subacute",
      },
      pain: {
        site: "",
        type: "Muscle",
        descriptors: [],
        intensity_vas: 5,
        aggravating_factors: "",
        relieving_factors: "",
      },
      past_medical_history: "",
      surgical_history: "",
      medications: [],
      social_history: {
        occupation: "",
        tobacco: "no",
        alcohol: "no",
        living_situation: "with family",
      },
      patient_goals: "",
      consent_for_treatment_and_data_sharing: true,
    },
    objective: {
      vitals: {
        heart_rate_bpm: null,
        blood_pressure_mmHg: "",
        respiratory_rate_bpm: null,
        spo2_percent: null,
        temperature_c: null,
      },
      general_condition: "Good",
      ambulatory_status: "Independent",
      observation: {
        posture: { anterior: "Symmetrical", posterior: "Normal alignment", lateral: "Normal lordosis/kyphosis" },
        gait: { barefoot: "Normal cadence", with_aids: "N/A" },
      },
      palpation: { tenderness_grade: 0, tone: "normal", crepitus: "none" },
      rom: { arom: {}, prom: {}, end_feel: "firm" },
      strength: { mmt: {} },
      neuro: { sensation: "normal", reflexes: {} },
      skin_and_soft_tissues: {
        swelling: "None",
        callus: "None",
        scar: "None",
        wound: "None",
        temperature: "None",
        infection: "None",
        pain: "None",
        abnormal_sensation: "None",
      },
      sensation_table: {
        superficial: { right: false, left: false, specification: "" },
        deep: { right: false, left: false, specification: "" },
        numbness: { right: false, left: false, specification: "" },
        paresthesia: { right: false, left: false, specification: "" },
        other: { right: false, left: false, specification: "" },
      },
      reflexes_table: {
        btr: { right: "normal", left: "normal" },
        ttr: { right: "normal", left: "normal" },
        ktr: { right: "normal", left: "normal" },
        atr: { right: "normal", left: "normal" },
        babinski: { right: false, left: false },
        comments: "",
      },
      activity_limitations: { items: {}, comments: "" },
      participation_restrictions: { items: {}, comments: "" },
      functional_tests: { tug_sec: null, six_mwt_m: null, other: "" },
      measurements: { limb_length_true_cm: null, girth_cm: {} },
      branch_specific: {
        orthopedic: { special_tests: [], special_test_results: [], end_feel: "Firm", joint_play: "Normal", swelling_grade: "None", limb_length_apparent_cm: null },
        cardiorespiratory: { auscultation_notes: "", auscultation_finding: "Vesicular", cough_strength: "Strong", sputum_characteristics: "Clear", borg_dyspnea_score: 0, chest_expansion_cm: 3, iswt_m: null },
        neurological: { modified_ashworth_scale: 0, berg_balance_score: null, coordination_notes: "Intact", coordination_result: "Normal" },
        geriatric: { thirty_sec_chair_stand_reps: 12, adl_index_score: 100, fall_history_count: 0, katz_items: {}, lawton_items: {} },
        pediatric: { gmfm_percentage: 100, pedi_score: 100, tone_assessment: "Normal", milestones_achieved: [] },
      },
      attachments: [],
    },
    assessment: {
      problem_list: [""],
      working_diagnosis: "",
      red_flags_present: false,
      clinical_impression: "",
    },
    plan: {
      short_term_goals: [],
      long_term_goals: [],
      treatment_plan: {
        treatment_id: uuidv4(),
        title: "",
        start_date: today,
        end_date: today,
        frequency_per_week: 3,
        duration_minutes: 45,
        interventions: [],
        modalities: [],
        education: [],
        home_program: "",
      },
      monitoring: { metrics_to_track: ["pain_vas"], review_interval_days: 7 },
      next_follow_up: today,
    },
  });

  function updateField(path: string, value: unknown) {
    setForm((prev) => {
      const copy = structuredClone(prev);
      const keys = path.split(".");
      let obj: any = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]!]) {
          obj[keys[i]!] = {};
        }
        obj = obj[keys[i]!];
      }
      obj[keys[keys.length - 1]!] = value;
      return copy;
    });
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const result = await createEncounter({ ...form, progress_metrics: extraMetrics } as EncounterFormData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/patients/${patientId}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Encounter Header & Specialty Branch</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.date_time?.slice(0, 16)}
                onChange={(e) =>
                  updateField("date_time", new Date(e.target.value).toISOString())
                }
              />
            </div>
            <div>
              <Label>Encounter Type</Label>
              <Select
                value={form.encounter_type}
                onValueChange={(v) => updateField("encounter_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Initial", "Follow-up", "Telehealth", "HomeVisit", "Discharge"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clinical Branch for Assessment</Label>
              <Select
                value={activeBranch}
                onValueChange={(v) => setActiveBranch(v as BranchSpecialty)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Orthopedic">Orthopedic</SelectItem>
                  <SelectItem value="Cardiorespiratory">Cardiorespiratory</SelectItem>
                  <SelectItem value="Neurological">Neurological</SelectItem>
                  <SelectItem value="Geriatric">Geriatric</SelectItem>
                  <SelectItem value="Pediatric">Pediatric</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
              />
            </div>
            <div>
              <Label>Confidentiality</Label>
              <Select
                value={form.confidentiality_level}
                onValueChange={(v) => updateField("confidentiality_level", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Sensitive">Sensitive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Clinical Notes</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Subjective (S)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Chief Complaint (Today&apos;s Visit) *</Label>
              <Textarea
                value={form.subjective?.chief_complaint}
                onChange={(e) => updateField("subjective.chief_complaint", e.target.value)}
              />
            </div>
            <div>
              <Label>Pain Site</Label>
              <Input
                value={form.subjective?.pain.site}
                onChange={(e) => updateField("subjective.pain.site", e.target.value)}
              />
            </div>
            <div>
              <Label>Pain VAS (0-10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={form.subjective?.pain.intensity_vas}
                onChange={(e) =>
                  updateField("subjective.pain.intensity_vas", Number(e.target.value))
                }
              />
            </div>
            <div>
              <Label>Aggravating Factors</Label>
              <Input
                value={form.subjective?.pain.aggravating_factors}
                onChange={(e) =>
                  updateField("subjective.pain.aggravating_factors", e.target.value)
                }
              />
            </div>
            <div>
              <Label>Relieving Factors</Label>
              <Input
                value={form.subjective?.pain.relieving_factors}
                onChange={(e) =>
                  updateField("subjective.pain.relieving_factors", e.target.value)
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Patient Reported Functional Goals</Label>
              <Textarea
                value={form.subjective?.patient_goals}
                onChange={(e) => updateField("subjective.patient_goals", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox checked={form.subjective?.consent_for_treatment_and_data_sharing} disabled />
              <Label>Consent for treatment confirmed</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Objective (O) — Vitals & Observation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Heart Rate (bpm)</Label>
                <Input
                  type="number"
                  value={form.objective?.vitals.heart_rate_bpm ?? ""}
                  onChange={(e) =>
                    updateField(
                      "objective.vitals.heart_rate_bpm",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
              <div>
                <Label>Blood Pressure (mmHg)</Label>
                <Input
                  placeholder="120/80"
                  value={form.objective?.vitals.blood_pressure_mmHg}
                  onChange={(e) =>
                    updateField("objective.vitals.blood_pressure_mmHg", e.target.value)
                  }
                />
              </div>
              <div>
                <Label>SpO2 (%)</Label>
                <Input
                  type="number"
                  value={form.objective?.vitals.spo2_percent ?? ""}
                  onChange={(e) =>
                    updateField(
                      "objective.vitals.spo2_percent",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
              <div>
                <Label>Respiratory Rate (bpm)</Label>
                <Input
                  type="number"
                  value={form.objective?.vitals.respiratory_rate_bpm ?? ""}
                  onChange={(e) =>
                    updateField(
                      "objective.vitals.respiratory_rate_bpm",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
              <div>
                <Label>General Condition</Label>
                <Select
                  value={form.objective?.general_condition}
                  onValueChange={(v) => updateField("objective.general_condition", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Good", "Fair", "Poor"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ambulatory Status</Label>
                <Select
                  value={form.objective?.ambulatory_status}
                  onValueChange={(v) => updateField("objective.ambulatory_status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Independent", "WithAid", "Wheelchair", "Bedridden"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Posture Analysis from ASSESSMENT.pdf */}
              <div className="sm:col-span-2 pt-2 border-t">
                <Label className="font-semibold text-primary">Posture Observation (Anterior / Posterior / Lateral)</Label>
                <div className="grid gap-2 sm:grid-cols-3 mt-2">
                  <div>
                    <Label className="text-xs">Anterior View</Label>
                    <Input
                      placeholder="Shoulder level, pelvic tilt..."
                      value={form.objective?.observation.posture.anterior}
                      onChange={(e) =>
                        updateField("objective.observation.posture.anterior", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Posterior View</Label>
                    <Input
                      placeholder="Spine alignment, scapular asymmetry..."
                      value={form.objective?.observation.posture.posterior}
                      onChange={(e) =>
                        updateField("objective.observation.posture.posterior", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Lateral View</Label>
                    <Input
                      placeholder="Head posture, lordosis/kyphosis..."
                      value={form.objective?.observation.posture.lateral}
                      onChange={(e) =>
                        updateField("objective.observation.posture.lateral", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Branch Specific Assessment Card */}
          <Card className="border-primary/50 shadow-sm">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Branch-Specific Assessment: <strong className="text-primary">{activeBranch}</strong></span>
                <span className="text-xs font-normal text-muted-foreground">Select branch in Header to change</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid gap-4 sm:grid-cols-2">
              {activeBranch === "Orthopedic" && (
                <>
                  <div className="sm:col-span-2">
                    <Label>Special Tests (+ = positive, − = negative, NT = not tested)</Label>
                    <div className="border rounded-md divide-y overflow-hidden text-sm">
                      {SPECIAL_TESTS.map((test) => {
                        const results = form.objective?.branch_specific?.orthopedic?.special_test_results ?? [];
                        const entry = results.find((r) => r.name === test);
                        return (
                          <div key={test} className="grid grid-cols-12 px-3 py-1.5 items-center">
                            <div className="col-span-6 font-medium text-xs sm:text-sm">{test}</div>
                            <div className="col-span-6 flex gap-1 justify-end">
                              {([
                                { v: "positive" as const, label: "+" },
                                { v: "negative" as const, label: "−" },
                                { v: "nt" as const, label: "NT" },
                              ]).map(({ v, label }) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() =>
                                    updateField(
                                      "objective.branch_specific.orthopedic.special_test_results",
                                      [...results.filter((r) => r.name !== test), { name: test, result: v }]
                                    )
                                  }
                                  className={`w-8 py-0.5 text-xs rounded border transition-colors ${
                                    entry?.result === v
                                      ? v === "positive"
                                        ? "bg-red-100 text-red-800 border-red-300 font-semibold"
                                        : v === "negative"
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"
                                          : "bg-muted text-muted-foreground border"
                                      : "bg-background hover:bg-muted text-muted-foreground border"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Input
                      className="mt-2"
                      placeholder="Add custom test (e.g. Thessaly, Clarke's) — press Enter"
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        const name = e.currentTarget.value.trim();
                        if (!name) return;
                        const results = form.objective?.branch_specific?.orthopedic?.special_test_results ?? [];
                        if (!results.some((r) => r.name === name)) {
                          updateField("objective.branch_specific.orthopedic.special_test_results", [...results, { name, result: "nt" }]);
                        }
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  <div>
                    <Label>End Feel</Label>
                    <Select
                      value={form.objective?.branch_specific?.orthopedic?.end_feel ?? "Firm"}
                      onValueChange={(v) => updateField("objective.branch_specific.orthopedic.end_feel", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Soft", "Firm", "Hard", "Empty"].map((e) => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Joint Play / Mobility</Label>
                    <Select
                      value={form.objective?.branch_specific?.orthopedic?.joint_play ?? "Normal"}
                      onValueChange={(v) => updateField("objective.branch_specific.orthopedic.joint_play", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Hypermobile", "Normal", "Hypomobile"].map((j) => (
                          <SelectItem key={j} value={j}>{j}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Swelling Grade</Label>
                    <Select
                      value={form.objective?.branch_specific?.orthopedic?.swelling_grade ?? "None"}
                      onValueChange={(v) => updateField("objective.branch_specific.orthopedic.swelling_grade", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["None", "Mild", "Moderate", "Severe"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 grid gap-2 sm:grid-cols-3">
                    <div>
                      <Label>True Limb Length (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 92"
                        value={form.objective?.measurements?.limb_length_true_cm ?? ""}
                        onChange={(e) =>
                          updateField("objective.measurements.limb_length_true_cm", e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </div>
                    <div>
                      <Label>Apparent Limb Length (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 90"
                        value={form.objective?.branch_specific?.orthopedic?.limb_length_apparent_cm ?? ""}
                        onChange={(e) =>
                          updateField("objective.branch_specific.orthopedic.limb_length_apparent_cm", e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </div>
                    <div>
                      <Label>Girth Entry — site: cm</Label>
                      <Input
                        placeholder="e.g. thigh_R: 42.5 (Enter)"
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          const m = e.currentTarget.value.trim().match(/^(.+?):\s*(\d+(\.\d+)?)$/);
                          if (!m) return;
                          const site = m[1]!.trim().replace(/\s+/g, "_").toLowerCase();
                          updateField(`objective.measurements.girth_cm.${site}`, Number(m[2]));
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeBranch === "Cardiorespiratory" && (
                <>
                  <div>
                    <Label>6-Minute Walk Distance (meters)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 420"
                      value={form.objective?.functional_tests.six_mwt_m ?? ""}
                      onChange={(e) =>
                        updateField(
                          "objective.functional_tests.six_mwt_m",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Incremental Shuttle Walk Test (m)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 350"
                      value={form.objective?.branch_specific?.cardiorespiratory?.iswt_m ?? ""}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.cardiorespiratory.iswt_m",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Borg Dyspnea Scale (0-10)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      placeholder="0 (none) - 10 (maximal)"
                      value={form.objective?.branch_specific?.cardiorespiratory?.borg_dyspnea_score ?? 0}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.cardiorespiratory.borg_dyspnea_score",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Chest Expansion (cm)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 3.5"
                      value={form.objective?.branch_specific?.cardiorespiratory?.chest_expansion_cm ?? 3}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.cardiorespiratory.chest_expansion_cm",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Auscultation Finding</Label>
                    <Select
                      value={form.objective?.branch_specific?.cardiorespiratory?.auscultation_finding ?? "Vesicular"}
                      onValueChange={(v) => updateField("objective.branch_specific.cardiorespiratory.auscultation_finding", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Vesicular", "Crackles", "Wheeze", "Absent"].map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cough Strength</Label>
                    <Select
                      value={form.objective?.branch_specific?.cardiorespiratory?.cough_strength ?? "Strong"}
                      onValueChange={(v) => updateField("objective.branch_specific.cardiorespiratory.cough_strength", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Strong", "Weak", "Absent"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sputum</Label>
                    <Select
                      value={form.objective?.branch_specific?.cardiorespiratory?.sputum_characteristics ?? "Clear"}
                      onValueChange={(v) => updateField("objective.branch_specific.cardiorespiratory.sputum_characteristics", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Clear", "White", "Yellow", "Green", "Purulent", "Blood-streaked"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Auscultation / Chest Exam Notes</Label>
                    <Input
                      placeholder="e.g. Bilateral basal crackles, reduced breath sounds right lower lobe"
                      value={form.objective?.branch_specific?.cardiorespiratory?.auscultation_notes ?? ""}
                      onChange={(e) =>
                        updateField("objective.branch_specific.cardiorespiratory.auscultation_notes", e.target.value)
                      }
                    />
                  </div>
                </>
              )}

              {activeBranch === "Neurological" && (
                <>
                  <div>
                    <Label>Modified Ashworth Scale (Spasticity)</Label>
                    <Select
                      value={String(form.objective?.branch_specific?.neurological?.modified_ashworth_scale ?? 0)}
                      onValueChange={(v) =>
                        updateField(
                          "objective.branch_specific.neurological.modified_ashworth_scale",
                          Number(v)
                        )
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MAS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Berg Balance Scale Score (0-56)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={56}
                      placeholder="0-56"
                      value={form.objective?.branch_specific?.neurological?.berg_balance_score ?? ""}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.neurological.berg_balance_score",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                    {typeof form.objective?.branch_specific?.neurological?.berg_balance_score === "number" &&
                      form.objective.branch_specific.neurological.berg_balance_score < 45 && (
                        <p className="text-xs text-red-600 font-medium mt-1">
                          ⚠ Score &lt; 45 — high fall risk
                        </p>
                      )}
                  </div>
                  <div>
                    <Label>Coordination (Finger-to-Nose)</Label>
                    <Select
                      value={form.objective?.branch_specific?.neurological?.coordination_result ?? "Normal"}
                      onValueChange={(v) => updateField("objective.branch_specific.neurological.coordination_result", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Normal", "Dysmetria", "Intention Tremor", "Ataxia"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Coordination & Reflex Notes</Label>
                    <Input
                      placeholder="Finger-to-nose intact, patellar reflex 2+"
                      value={form.objective?.branch_specific?.neurological?.coordination_notes ?? "Intact"}
                      onChange={(e) =>
                        updateField("objective.branch_specific.neurological.coordination_notes", e.target.value)
                      }
                    />
                  </div>
                </>
              )}

              {activeBranch === "Geriatric" && (
                <>
                  <div>
                    <Label>Timed Up & Go (TUG seconds)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 11.5"
                      value={form.objective?.functional_tests.tug_sec ?? ""}
                      onChange={(e) =>
                        updateField(
                          "objective.functional_tests.tug_sec",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                    {typeof form.objective?.functional_tests.tug_sec === "number" &&
                      form.objective.functional_tests.tug_sec > 12 && (
                        <p className="text-xs text-red-600 font-medium mt-1">
                          ⚠ TUG &gt; 12s — fall risk indicator
                        </p>
                      )}
                  </div>
                  <div>
                    <Label>30-Second Chair Stand Reps</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 12"
                      value={form.objective?.branch_specific?.geriatric?.thirty_sec_chair_stand_reps ?? 12}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.geriatric.thirty_sec_chair_stand_reps",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Past Falls Count (Last 6 Months)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.objective?.branch_specific?.geriatric?.fall_history_count ?? 0}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.geriatric.fall_history_count",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Katz Index of ADL (tick = independent) — Score: {KATZ_ADL_ITEMS.filter((i) => (form.objective?.branch_specific?.geriatric?.katz_items as any)?.[i]).length}/6</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                      {KATZ_ADL_ITEMS.map((item) => (
                        <div key={item} className="flex items-center gap-2 border rounded-md px-2 py-1.5">
                          <Checkbox
                            checked={(form.objective?.branch_specific?.geriatric?.katz_items as any)?.[item] || false}
                            onCheckedChange={(v) => {
                              const items = { ...((form.objective?.branch_specific?.geriatric?.katz_items as any) ?? {}), [item]: Boolean(v) };
                              updateField("objective.branch_specific.geriatric.katz_items", items);
                              updateField(
                                "objective.branch_specific.geriatric.adl_index_score",
                                Math.round((KATZ_ADL_ITEMS.filter((i) => items[i]).length / KATZ_ADL_ITEMS.length) * 100)
                              );
                            }}
                          />
                          <span className="text-xs font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Lawton IADL (tick = independent) — Score: {LAWTON_IADL_ITEMS.filter((i) => (form.objective?.branch_specific?.geriatric?.lawton_items as any)?.[i]).length}/8</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                      {LAWTON_IADL_ITEMS.map((item) => (
                        <div key={item} className="flex items-center gap-2 border rounded-md px-2 py-1.5">
                          <Checkbox
                            checked={(form.objective?.branch_specific?.geriatric?.lawton_items as any)?.[item] || false}
                            onCheckedChange={(v) =>
                              updateField("objective.branch_specific.geriatric.lawton_items", {
                                ...((form.objective?.branch_specific?.geriatric?.lawton_items as any) ?? {}),
                                [item]: Boolean(v),
                              })
                            }
                          />
                          <span className="text-xs font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeBranch === "Pediatric" && (
                <>
                  <div>
                    <Label>GMFM-88/66 Percent Score (0-100%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="e.g. 85"
                      value={form.objective?.branch_specific?.pediatric?.gmfm_percentage ?? 100}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.pediatric.gmfm_percentage",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>PEDI Functional Score (0-100)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="e.g. 90"
                      value={form.objective?.branch_specific?.pediatric?.pedi_score ?? 100}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.pediatric.pedi_score",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Tone & Milestone Attainment Notes</Label>
                    <Input
                      placeholder="Normal tone, independent walking achieved"
                      value={form.objective?.branch_specific?.pediatric?.tone_assessment ?? "Normal"}
                      onChange={(e) =>
                        updateField("objective.branch_specific.pediatric.tone_assessment", e.target.value)
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Developmental Milestones Achieved (tick = achieved)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-1">
                      {PEDI_MILESTONES.map((m) => (
                        <div key={m} className="flex items-center gap-2 border rounded-md px-2 py-1.5">
                          <Checkbox
                            checked={form.objective?.branch_specific?.pediatric?.milestones_achieved?.includes(m) ?? false}
                            onCheckedChange={(v) => {
                              const cur = form.objective?.branch_specific?.pediatric?.milestones_achieved ?? [];
                              updateField(
                                "objective.branch_specific.pediatric.milestones_achieved",
                                v === true ? [...cur, m] : cur.filter((x) => x !== m)
                              );
                            }}
                          />
                          <span className="text-xs font-medium">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Joint-Specific ROM (Goniometry) Card */}
          <Card className="shadow-sm border-primary/40">
            <CardHeader className="bg-primary/5 pb-3">
              <CardTitle className="text-base font-semibold">Joint-Specific ROM — Goniometry</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-12 items-end">
                <div className="sm:col-span-4">
                  <Label className="text-xs">Joint</Label>
                  <Select value={romJoint} onValueChange={setRomJoint}>
                    <SelectTrigger><SelectValue placeholder="Select joint" /></SelectTrigger>
                    <SelectContent>
                      {ROM_JOINTS.map((j) => (
                        <SelectItem key={j} value={j}>{j}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-4">
                  <Label className="text-xs">Motion</Label>
                  <Select value={romMotion} onValueChange={setRomMotion}>
                    <SelectTrigger><SelectValue placeholder="Select motion" /></SelectTrigger>
                    <SelectContent>
                      {ROM_MOTIONS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">AROM (deg)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={360}
                    placeholder="e.g. 120"
                    value={romArom}
                    onChange={(e) => setRomArom(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">PROM (deg)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={360}
                    placeholder="e.g. 135"
                    value={romProm}
                    onChange={(e) => setRomProm(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!romArom || !romJoint || !romMotion}
                onClick={() => {
                  const key = `${romJoint.toLowerCase().replace(/\s+/g, "_")}_${romMotion.toLowerCase().replace(/\s+/g, "_")}`;
                  if (romArom) updateField(`objective.rom.arom.${key}`, `${romArom} deg`);
                  if (romProm) updateField(`objective.rom.prom.${key}`, `${romProm} deg`);
                  setRomArom("");
                  setRomProm("");
                }}
              >
                Add ROM Entry
              </Button>

              {Object.keys(form.objective?.rom?.arom ?? {}).length > 0 && (
                <div className="border rounded-md divide-y overflow-hidden text-sm">
                  <div className="grid grid-cols-12 bg-muted/60 px-3 py-1.5 font-medium text-xs text-muted-foreground uppercase">
                    <div className="col-span-4">Joint / Motion</div>
                    <div className="col-span-3">AROM</div>
                    <div className="col-span-3">PROM</div>
                    <div className="col-span-2 text-right">Action</div>
                  </div>
                  {Object.entries(form.objective?.rom?.arom ?? {}).map(([key, aromVal]) => (
                    <div key={key} className="grid grid-cols-12 px-3 py-1.5 items-center">
                      <div className="col-span-4 font-medium text-xs sm:text-sm">
                        {key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      </div>
                      <div className="col-span-3">{aromVal}</div>
                      <div className="col-span-3">{(form.objective?.rom?.prom as any)?.[key] ?? "—"}</div>
                      <div className="col-span-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-destructive"
                          onClick={() =>
                            setForm((prev) => {
                              const copy = structuredClone(prev);
                              if (copy.objective) {
                                delete copy.objective.rom.arom[key];
                                if (copy.objective.rom.prom) delete copy.objective.rom.prom[key];
                              }
                              return copy;
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Entries are saved with the encounter and auto-tracked on the patient&apos;s progress charts (e.g. &quot;Knee Flexion ROM&quot;).
              </p>
            </CardContent>
          </Card>

          {/* Manual Muscle Testing (MMT) Card */}
          <Card className="shadow-sm border-primary/40">
            <CardHeader className="bg-primary/5 pb-3">
              <CardTitle className="text-base font-semibold">Manual Muscle Testing (MMT 0–5)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-12 items-end">
                <div className="sm:col-span-5">
                  <Label className="text-xs">Joint / Muscle Group</Label>
                  <Select value={mmtJoint} onValueChange={setMmtJoint}>
                    <SelectTrigger><SelectValue placeholder="Select joint / muscle" /></SelectTrigger>
                    <SelectContent>
                      {MMT_GROUPS.map((j) => (
                        <SelectItem key={j} value={j}>{j}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-4">
                  <Label className="text-xs">Side</Label>
                  <Select value={mmtSide} onValueChange={(v) => setMmtSide(v as "Right" | "Left")}>
                    <SelectTrigger><SelectValue placeholder="Select side" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Right">Right (R)</SelectItem>
                      <SelectItem value="Left">Left (L)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs">MMT Grade (0–5)</Label>
                  <Select
                    value={mmtGrade === "" ? undefined : mmtGrade}
                    onValueChange={(v) => setMmtGrade(v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                      {["0", "1", "2", "3", "4", "5"].map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!mmtJoint || mmtGrade === ""}
                onClick={() => {
                  const key = `${mmtJoint.toLowerCase().replace(/\s+/g, "_")}_${mmtSide === "Right" ? "R" : "L"}`;
                  updateField(`objective.strength.mmt.${key}`, Number(mmtGrade));
                  setMmtGrade("");
                }}
              >
                Add MMT Entry
              </Button>

              {Object.keys(form.objective?.strength?.mmt ?? {}).length > 0 && (
                <div className="border rounded-md divide-y overflow-hidden text-sm">
                  <div className="grid grid-cols-12 bg-muted/60 px-3 py-1.5 font-medium text-xs text-muted-foreground uppercase">
                    <div className="col-span-6">Muscle Group (Side)</div>
                    <div className="col-span-3">Grade</div>
                    <div className="col-span-3 text-right">Action</div>
                  </div>
                  {Object.entries(form.objective?.strength?.mmt ?? {}).map(([key, grade]) => (
                    <div key={key} className="grid grid-cols-12 px-3 py-1.5 items-center">
                      <div className="col-span-6 font-medium text-xs sm:text-sm">
                        {key.replace(/_(R|L)$/, "").split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                        <span className="ml-1 text-muted-foreground">({key.endsWith("_R") ? "R" : "L"})</span>
                      </div>
                      <div className="col-span-3 font-semibold">{grade as number} / 5</div>
                      <div className="col-span-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-destructive"
                          onClick={() =>
                            setForm((prev) => {
                              const copy = structuredClone(prev);
                              if (copy.objective) delete copy.objective.strength.mmt[key];
                              return copy;
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ICF: Activity Limitations Card */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/40 pb-3">
              <CardTitle className="text-base font-semibold">
                Activity Limitations <span className="text-xs font-normal text-muted-foreground">(ICF — &quot;d&quot; domain)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="border rounded-md divide-y overflow-hidden text-sm">
                <div className="grid grid-cols-12 bg-muted/60 px-3 py-2 font-medium text-xs text-muted-foreground uppercase">
                  <div className="col-span-12 sm:col-span-5">Activity</div>
                  <div className="hidden sm:block sm:col-span-7">Difficulty (ICF Qualifier)</div>
                </div>
                {ICF_ACTIVITIES.map(({ key, label }) => {
                  const current = (form.objective?.activity_limitations?.items as any)?.[key] || "None";
                  return (
                    <div key={key} className="grid grid-cols-12 px-3 py-2 items-center gap-2">
                      <div className="col-span-12 sm:col-span-5 font-medium text-xs sm:text-sm">{label}</div>
                      <div className="col-span-12 sm:col-span-7 flex flex-wrap gap-1">
                        {ICF_QUALIFIERS.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => updateField(`objective.activity_limitations.items.${key}`, q)}
                            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                              current === q
                                ? q === "None"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold"
                                  : q === "Complete"
                                    ? "bg-red-100 text-red-800 border border-red-300 font-semibold"
                                    : "bg-amber-100 text-amber-800 border border-amber-300 font-semibold"
                                : "bg-background hover:bg-muted text-muted-foreground border"
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <Label>Activity Limitations Comments</Label>
                <Input
                  placeholder="e.g. Requires supervision for stair climbing; sitting tolerance limited to 20 min..."
                  value={form.objective?.activity_limitations?.comments || ""}
                  onChange={(e) => updateField("objective.activity_limitations.comments", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* ICF: Participation Restrictions Card */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/40 pb-3">
              <CardTitle className="text-base font-semibold">
                Participation Restrictions <span className="text-xs font-normal text-muted-foreground">(ICF — &quot;p&quot; domain)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {ICF_PARTICIPATION.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2 border rounded-md px-3 py-2">
                    <Checkbox
                      checked={(form.objective?.participation_restrictions?.items as any)?.[key] || false}
                      onCheckedChange={(v) => updateField(`objective.participation_restrictions.items.${key}`, Boolean(v))}
                    />
                    <span className="text-xs sm:text-sm font-medium">{label} restricted</span>
                  </div>
                ))}
              </div>
              <div>
                <Label>Participation Restrictions Comments</Label>
                <Input
                  placeholder="e.g. Unable to resume yoga teaching; avoids community outings due to pain..."
                  value={form.objective?.participation_restrictions?.comments || ""}
                  onChange={(e) => updateField("objective.participation_restrictions.comments", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Skin & Soft Tissues Problem Card */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/40 pb-3">
              <CardTitle className="text-base font-semibold">Skin & Soft Tissues Problem</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="border rounded-md divide-y overflow-hidden text-sm">
                <div className="grid grid-cols-12 bg-muted/60 px-3 py-2 font-medium text-xs text-muted-foreground uppercase">
                  <div className="col-span-6 sm:col-span-5">Disorders</div>
                  <div className="col-span-6 sm:col-span-7 text-right sm:text-center">Severity Rating</div>
                </div>
                {[
                  { key: "swelling", label: "Swelling" },
                  { key: "callus", label: "Callus" },
                  { key: "scar", label: "Scar" },
                  { key: "wound", label: "Wound" },
                  { key: "temperature", label: "Temperature" },
                  { key: "infection", label: "Infection" },
                  { key: "pain", label: "Pain" },
                  { key: "abnormal_sensation", label: "Abnormal Sensation" },
                ].map(({ key, label }) => {
                  const current = (form.objective?.skin_and_soft_tissues as any)?.[key] || "None";
                  return (
                    <div key={key} className="grid grid-cols-12 px-3 py-2 items-center gap-2">
                      <span className="col-span-6 sm:col-span-5 font-medium">{label}</span>
                      <div className="col-span-6 sm:col-span-7 flex justify-end sm:justify-center gap-1.5">
                        {["None", "Minor", "Important"].map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => updateField(`objective.skin_and_soft_tissues.${key}`, sev)}
                            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                              current === sev
                                ? sev === "Important"
                                  ? "bg-destructive text-destructive-foreground font-semibold"
                                  : sev === "Minor"
                                    ? "bg-amber-500 text-white font-semibold"
                                    : "bg-primary text-primary-foreground font-semibold"
                                : "bg-muted hover:bg-accent text-muted-foreground"
                            }`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sensation Assessment Card */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/40 pb-3">
              <CardTitle className="text-base font-semibold">Sensation Assessment</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="border rounded-md divide-y overflow-hidden text-sm">
                <div className="grid grid-cols-12 bg-muted/60 px-3 py-2 font-medium text-xs text-muted-foreground uppercase gap-2 items-center">
                  <div className="col-span-4 sm:col-span-3">Sensitivity</div>
                  <div className="col-span-2 text-center">R</div>
                  <div className="col-span-2 text-center">L</div>
                  <div className="col-span-4 sm:col-span-5">Specification / Notes</div>
                </div>
                {[
                  { key: "superficial", label: "Superficial (Touch)" },
                  { key: "deep", label: "Deep (Proprio/Vib)" },
                  { key: "numbness", label: "Numbness" },
                  { key: "paresthesia", label: "Paresthesia" },
                  { key: "other", label: "Other Sensation" },
                ].map(({ key, label }) => {
                  const item = (form.objective?.sensation_table as any)?.[key] || { right: false, left: false, specification: "" };
                  return (
                    <div key={key} className="grid grid-cols-12 px-3 py-2 items-center gap-2">
                      <div className="col-span-4 sm:col-span-3 font-medium text-xs sm:text-sm">{label}</div>
                      <div className="col-span-2 flex justify-center">
                        <Checkbox
                          checked={item.right}
                          onCheckedChange={(v) => updateField(`objective.sensation_table.${key}.right`, Boolean(v))}
                        />
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <Checkbox
                          checked={item.left}
                          onCheckedChange={(v) => updateField(`objective.sensation_table.${key}.left`, Boolean(v))}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-5">
                        <Input
                          placeholder="Specification..."
                          className="h-8 text-xs"
                          value={item.specification || ""}
                          onChange={(e) => updateField(`objective.sensation_table.${key}.specification`, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Reflexes Assessment Card */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/40 pb-3">
              <CardTitle className="text-base font-semibold">Reflexes Assessment</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="border rounded-md divide-y overflow-hidden text-sm">
                <div className="grid grid-cols-12 bg-muted/60 px-3 py-2 font-medium text-xs text-muted-foreground uppercase gap-2 items-center">
                  <div className="col-span-4 sm:col-span-3">Reflex Test</div>
                  <div className="col-span-4">Right (R) Grade</div>
                  <div className="col-span-4">Left (L) Grade</div>
                </div>
                {[
                  { key: "btr", label: "BTR (Biceps Tendon)" },
                  { key: "ttr", label: "TTR (Triceps Tendon)" },
                  { key: "ktr", label: "KTR (Knee Tendon / Patellar)" },
                  { key: "atr", label: "ATR (Ankle Tendon / Achilles)" },
                ].map(({ key, label }) => {
                  const reflex = (form.objective?.reflexes_table as any)?.[key] || { right: "normal", left: "normal" };
                  return (
                    <div key={key} className="grid grid-cols-12 px-3 py-2 items-center gap-2">
                      <div className="col-span-4 sm:col-span-3 font-medium text-xs sm:text-sm">{label}</div>
                      <div className="col-span-4 flex gap-1">
                        {["+", "-", "normal"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => updateField(`objective.reflexes_table.${key}.right`, g)}
                            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                              reflex.right === g
                                ? "bg-primary text-primary-foreground font-semibold border-primary"
                                : "bg-background hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                      <div className="col-span-4 flex gap-1">
                        {["+", "-", "normal"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => updateField(`objective.reflexes_table.${key}.left`, g)}
                            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                              reflex.left === g
                                ? "bg-primary text-primary-foreground font-semibold border-primary"
                                : "bg-background hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Babinski row */}
                <div className="grid grid-cols-12 px-3 py-2 items-center gap-2">
                  <div className="col-span-4 sm:col-span-3 font-medium text-xs sm:text-sm">Babinsky (Plantar)</div>
                  <div className="col-span-4 flex items-center gap-2">
                    <Checkbox
                      checked={form.objective?.reflexes_table?.babinski?.right || false}
                      onCheckedChange={(v) => updateField("objective.reflexes_table.babinski.right", Boolean(v))}
                    />
                    <span className="text-xs">R Positive (+)</span>
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <Checkbox
                      checked={form.objective?.reflexes_table?.babinski?.left || false}
                      onCheckedChange={(v) => updateField("objective.reflexes_table.babinski.left", Boolean(v))}
                    />
                    <span className="text-xs">L Positive (+)</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Reflex Comments & Clinical Interpretation</Label>
                <Input
                  placeholder="e.g. Symmetrical deep tendon reflexes, Babinski negative bilaterally..."
                  value={form.objective?.reflexes_table?.comments || ""}
                  onChange={(e) => updateField("objective.reflexes_table.comments", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Working Diagnosis *</Label>
              <Input
                value={form.assessment?.working_diagnosis}
                onChange={(e) => updateField("assessment.working_diagnosis", e.target.value)}
              />
            </div>
            <div>
              <Label>Problem List (one per line)</Label>
              <Textarea
                value={form.assessment?.problem_list.join("\n")}
                onChange={(e) =>
                  updateField(
                    "assessment.problem_list",
                    e.target.value.split("\n").filter(Boolean)
                  )
                }
              />
            </div>
            <div>
              <Label>Clinical Impression</Label>
              <Textarea
                value={form.assessment?.clinical_impression}
                onChange={(e) => updateField("assessment.clinical_impression", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.assessment?.red_flags_present}
                onCheckedChange={(c) => updateField("assessment.red_flags_present", c === true)}
              />
              <Label>Red flags present</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Treatment Title</Label>
              <Input
                value={form.plan?.treatment_plan.title}
                onChange={(e) => updateField("plan.treatment_plan.title", e.target.value)}
              />
            </div>
            <div>
              <Label>Frequency per Week</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={form.plan?.treatment_plan.frequency_per_week}
                onChange={(e) =>
                  updateField("plan.treatment_plan.frequency_per_week", Number(e.target.value))
                }
              />
            </div>
            <div>
              <Label>Session Duration (min)</Label>
              <Input
                type="number"
                value={form.plan?.treatment_plan.duration_minutes}
                onChange={(e) =>
                  updateField("plan.treatment_plan.duration_minutes", Number(e.target.value))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Home Program</Label>
              <Textarea
                value={form.plan?.treatment_plan.home_program}
                onChange={(e) => updateField("plan.treatment_plan.home_program", e.target.value)}
              />
            </div>
            <div>
              <Label>Next Follow-up</Label>
              <Input
                type="date"
                value={form.plan?.next_follow_up}
                onChange={(e) => updateField("plan.next_follow_up", e.target.value)}
              />
            </div>
            <div>
              <Label>Review Interval (days)</Label>
              <Input
                type="number"
                value={form.plan?.monitoring.review_interval_days}
                onChange={(e) =>
                  updateField("plan.monitoring.review_interval_days", Number(e.target.value))
                }
              />
            </div>

            {/* Progress Metrics data entry — feeds the patient's progress charts */}
            <div className="sm:col-span-2 border-t pt-4">
              <Label className="font-semibold text-primary">Progress Metrics (Track Improvement)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Objective findings above (ROM, TUG, 6MWT, girth, branch scales) are auto-tracked. Add any additional
                outcome measurements here — they are saved with the encounter and appear on the patient&apos;s progress charts.
              </p>
              <div className="grid gap-3 sm:grid-cols-12 mb-3">
                <div className="sm:col-span-5">
                  <Select
                    value={metricKey}
                    onValueChange={(v) => {
                      setMetricKey(v);
                      setMetricValue("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRIC_PRESETS.map((m) => (
                        <SelectItem key={m.key} value={m.key}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-3">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={`Value (${METRIC_PRESETS.find((m) => m.key === metricKey)?.unit ?? ""})`}
                    value={metricValue}
                    onChange={(e) => setMetricValue(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-4 flex gap-2">
                  <Input
                    placeholder="Notes (optional)"
                    value={metricNotes}
                    onChange={(e) => setMetricNotes(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={metricValue === ""}
                    onClick={() => {
                      const preset = METRIC_PRESETS.find((m) => m.key === metricKey);
                      setExtraMetrics((prev) => [
                        ...prev,
                        {
                          metric_key: metricKey,
                          value: Number(metricValue),
                          unit: preset?.unit ?? "",
                          notes: metricNotes,
                        },
                      ]);
                      setMetricValue("");
                      setMetricNotes("");
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              {extraMetrics.length > 0 ? (
                <div className="rounded-md border divide-y text-sm">
                  {extraMetrics.map((m, idx) => (
                    <div key={`${m.metric_key}-${idx}`} className="flex items-center justify-between px-3 py-1.5">
                      <span>
                        {METRIC_PRESETS.find((p) => p.key === m.metric_key)?.label ?? m.metric_key}
                        <span className="ml-2 font-medium">
                          {m.value} {m.unit}
                        </span>
                        {m.notes ? <span className="ml-2 text-xs text-muted-foreground">{m.notes}</span> : null}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive"
                        onClick={() => setExtraMetrics((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No additional metrics added yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Previous
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep(step + 1)}>
            Next
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Encounter"}
          </Button>
        )}
      </div>
    </div>
  );
}
