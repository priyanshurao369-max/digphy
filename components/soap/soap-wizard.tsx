"use client";

import { useMemo, useState } from "react";
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
import type { BranchSpecialty, Encounter } from "@/types";
import { detectFilledBlocks, buildFollowupPatch, type FilledItem, type FilledBlock } from "@/components/soap/followup-detection";

const STEPS = ["Header", "Subjective", "Objective", "Assessment", "Plan"] as const;

// Joint-specific assessment dropdowns (Objective step)
const ROM_JOINTS = [
  // Craniofacial / Spine
  "Temporomandibular Joint", "Cervical Spine", "Thoracic Spine", "Lumbar Spine",
  // Upper limb
  "Sternoclavicular Joint", "Acromioclavicular Joint", "Shoulder", "Scapulothoracic",
  "Elbow", "Forearm", "Wrist", "Hand MCP", "Hand PIP", "Hand DIP", "Thumb CMC", "Thumb MCP", "Thumb IP",
  // Lower limb
  "Hip", "Knee", "Superior Tibiofibular", "Ankle", "Subtalar Joint", "Midtarsal Joint",
  "Foot Tarsometatarsal", "Toes MTP", "Toes PIP", "Great Toe MTP", "Great Toe IP",
] as const;
const ROM_MOTIONS = [
  "Flexion", "Extension", "Abduction", "Adduction", "Internal Rotation",
  "External Rotation", "Rotation", "Lateral Flexion", "Protraction", "Retraction",
  "Elevation", "Depression", "Upward Rotation", "Downward Rotation", "Tilt (Anterior/Posterior)",
  // Forearm / wrist / hand
  "Pronation", "Supination", "Radial Deviation", "Ulnar Deviation", "Opposition",
  // Spine / TMJ
  "Protrusion", "Retrusion", "Lateral Excursion",
  // Ankle / foot
  "Dorsiflexion", "Plantarflexion", "Inversion", "Eversion",
] as const;
const MMT_GROUPS = [
  // Cervical
  "Cervical Flexors", "Cervical Extensors", "Cervical Rotators", "Cervical Lateral Flexors",
  // Scapular
  "Upper Trapezius (Elevators)", "Middle Trapezius (Retractors)", "Lower Trapezius (Depressors)",
  "Serratus Anterior (Protractors)", "Rhomboids (Retractors)",
  // Shoulder
  "Shoulder Flexors (Ant. Deltoid)", "Shoulder Extensors (Lat/Post. Deltoid)",
  "Shoulder Abductors (Mid. Deltoid)", "Shoulder Adductors (Pec/Lat)",
  "Shoulder Internal Rotators", "Shoulder External Rotators",
  // Elbow / forearm
  "Elbow Flexors", "Elbow Extensors", "Forearm Pronators", "Forearm Supinators",
  // Wrist
  "Wrist Flexors", "Wrist Extensors", "Wrist Radial Deviators", "Wrist Ulnar Deviators",
  // Hand / digits
  "Finger Flexors (FDS/FDP)", "Finger Extensors (EDC)", "Finger Abductors (Dorsal Interossei)",
  "Finger Adductors (Palmar Interossei)", "Thumb Flexors", "Thumb Extensors",
  "Thumb Abductors", "Thumb Adductors", "Thumb Opponens",
  // Trunk
  "Trunk Flexors (Abdominals)", "Trunk Extensors (Erector Spinae)", "Trunk Rotators (Obliques)",
  "Trunk Lateral Flexors (QL)",
  // Hip
  "Hip Flexors", "Hip Extensors (Gluteus Maximus)", "Hip Abductors (Gluteus Medius)",
  "Hip Adductors", "Hip Internal Rotators", "Hip External Rotators",
  // Knee
  "Knee Extensors (Quadriceps)", "Knee Flexors (Hamstrings)",
  // Ankle / foot
  "Ankle Dorsiflexors (Tibialis Anterior)", "Ankle Plantarflexors (Gastrocnemius/Soleus)",
  "Ankle Invertors (Tibialis Posterior)", "Ankle Evertors (Peroneals)",
  "Toe Flexors", "Toe Extensors (EHL)",
] as const;

// Slugify a joint/motion/group name into a safe object key
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
// Reverse lookups: "shoulder_knee-style composite key" -> readable label
const ROM_KEY_TO_LABEL = new Map<string, string>(
  ROM_JOINTS.flatMap((j) =>
    ROM_MOTIONS.map((m) => [`${slugify(j)}_${slugify(m)}`, `${j} â€” ${m}`] as const)
  )
);
const MMT_KEY_TO_LABEL = new Map<string, string>(MMT_GROUPS.map((g) => [slugify(g), g]));

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

// Functional Evaluation — specific ICF d-category tasks
const UL_FUNCTIONAL_TASKS = [
  "washing_bathing", "dressing_upper", "eating_feeding", "combing_hair",
  "toileting", "reaching_overhead", "fine_motor_lift_carry",
] as const;
const LL_FUNCTIONAL_TASKS = [
  "walking_distance", "stair_climbing", "cycling", "standing_tolerance",
  "squatting_kneeling", "lifting_carrying", "prolonged_standing",
] as const;

interface SoapWizardProps {
  patientId: string;
  clinicianId: string;
  patientBranchSpecialty?: BranchSpecialty;
  /** The most recent saved encounter — used to offer follow-up test re-assessment. */
  previousEncounter?: Encounter | null;
}

export function SoapWizard({
  patientId,
  clinicianId,
  patientBranchSpecialty = "Orthopedic",
  previousEncounter = null,
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

  // ── Follow-up re-assessment selection ──
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

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
        condition_course: "Improved",
        current_treatment: "",
        investigations: [],
        investigation_findings: "",
      },
      pain: {
        site: "",
        side: "",
        type: "Muscle",
        frequency: "Not specified",
        descriptors: [],
        intensity_vas: 5,
        aggravating_factors: "",
        relieving_factors: "",
        nature_notes: "",
      },
      past_medical_history: "",
      surgical_history: "",
      medications: [],
      social_history: {
        occupation: "",
        tobacco: "no", tobacco_details: "",
        smoking_details: "",
        alcohol: "no", alcohol_details: "",
        sleep_habits: "",
        physical_activity: "",
        living_situation: "with family",
        family_history: "",
        hereditary_diseases: "",
        social_status: "",
        educational_status: "",
        environmental_history: "",
        consanguinity: "",
      },
      patient_goals: "",
      consent_for_treatment_and_data_sharing: true,
      ip_number: "",
      date_of_admission: "",
      provisional_diagnosis: "",
      referred_by: "",
      laboratory_reports: "",
      handedness_dominance: "Right",
      adl_difficulties: { ambulation: "", bed_activities: "", dressing: "", eating: "", toilet_activities: "" },
      weakness_detail: { side: "", site: "", duration_adl: "" },
      sensory_problems: "",
      balance_problems: "",
      present_history_detailed: { mode_of_transportation: "", consciousness_status: "Conscious", bleeding_sites: "None", nature_severity: "", associated_symptoms: "" },
      past_history_detailed: { general_health_prior: "Good", pregnancies_miscarriages: "N/A", past_physio_treatment: "None", past_prognosis: "" },
      personal_history_detailed: { marital_history: "", habits: "" },
      family_history_detailed: { similar_symptoms: "None", hereditary_diseases: "None", infectious_diseases: "None" },
      economical_history: { occupation_income: "", source_of_income: "", family_expenses: "" },
      social_education: { education_patient: "", education_spouse: "", education_family: "" },
      environmental_detailed: { home_environment: "", work_environment: "" },
      observation_detailed: { built: "Mesomorphic", posture: "Normal alignment", respiration_pattern: "Symmetric abdominal-thoracic", appliances: "None", trophic_changes: "Absent", wounds_edema_sutures: "None", limb_attitude: "Normal posture", involuntary_movements: "Absent", muscle_wasting: "None" },
      palpation_detailed: { tenderness_grade: 0, temperature: "Normal", spasm_tension: "Normal", swelling: "None", tone: "Normal" },
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
        sensorium: "Alert",
        body_build: "Mesomorphic",
        deformities: "",
        external_aids: "",
        posture: { anterior: "Symmetrical", posterior: "Normal alignment", lateral: "Normal lordosis/kyphosis" },
        gait: { barefoot: "Normal cadence", with_aids: "N/A" },
      },
      palpation: { tenderness_grade: 0, tone: "normal", crepitus: "none", ligamentous_snaps: "Absent", cracking_distraction: "Absent", capillary_refill: "Normal", nodules: "", pulses: "Palpable & symmetrical", scar_status: "", edema_type: "None", edema_notes: "", swelling_type: "" },
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
      functional_ul: {},
      functional_ll: {},
      measurements: { limb_length_true_cm: null, girth_cm: {} },
      gait_parameters: { step_length_cm: null, stride_length_cm: null, cadence_steps_min: null, base_width_cm: null },
      dermatomes: "",
      myotomes: "",
      capsular_pattern: "",
      loose_close_packed: "",
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
      differential_diagnosis: [],
      red_flags_present: false,
      clinical_impression: "",
      final_diagnosis: "",
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
    // For follow-ups, pre-fill the objective with the previously-selected tests.
    if (isFollowUp && previousEncounter && detection) applyReassessment();
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

  // ── Follow-up re-assessment helpers ──
  const isFollowUp = form.encounter_type === "Follow-up" || form.encounter_type === "HomeVisit";
  const detection = useMemo(
    () => (previousEncounter ? detectFilledBlocks(previousEncounter) : null),
    [previousEncounter]
  );
  const steps = useMemo(
    () =>
      isFollowUp
        ? ["Header", "Follow-up Tests", "Subjective", "Objective", "Assessment", "Plan"]
        : ["Header", "Subjective", "Objective", "Assessment", "Plan"],
    [isFollowUp]
  );
  const reassessIdx = isFollowUp ? 1 : -1;
  const subjIdx = isFollowUp ? 2 : 1;
  const objIdx = isFollowUp ? 3 : 2;
  const assessIdx = isFollowUp ? 4 : 3;
  const planIdx = isFollowUp ? 5 : 4;

  const selectedCount = selectedKeys.size;

  function toggleItem(key: string, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function toggleBlock(block: FilledBlock, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const it of block.items) {
        if (checked) next.add(it.key);
        else next.delete(it.key);
      }
      return next;
    });
  }

  function selectAllFilled() {
    const keys = (detection?.blocks ?? []).flatMap((b) => b.items.map((i) => i.key));
    setSelectedKeys(new Set(keys));
  }

  function selectNone() {
    setSelectedKeys(new Set());
  }

  function applyReassessment() {
    if (!isFollowUp || !previousEncounter || !detection || selectedKeys.size === 0) return;
    const patch = buildFollowupPatch(
      previousEncounter.objective as unknown as Record<string, unknown>,
      selectedKeys,
      detection.itemsById
    );
    for (const entry of patch) {
      updateField(`objective.${entry.path}`, entry.value);
    }
  }

  function goNext() {
    // Apply selected follow-up tests when leaving the re-assessment step.
    if (step === reassessIdx) applyReassessment();
    setStep(step + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ${i === step
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

      {step === reassessIdx && (
        <Card>
          <CardHeader>
            <CardTitle>Follow-up: Select Tests to Re-assess</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tick the specific tests / blocks / criteria that were filled during
              the previous encounter and should be re-assessed now. Only the selected
              items will be carried into the Objective step — all others are skipped.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!previousEncounter ? (
              <div className="rounded-md border-dashed border p-6 text-sm text-muted-foreground">
                No previous encounter found for this patient. Complete an{" "}
                <span className="font-medium text-foreground">Initial</span> assessment
                before creating a follow-up with re-assessment selection.
              </div>
            ) : detection && detection.total === 0 ? (
              <div className="rounded-md border-dashed border p-6 text-sm text-muted-foreground">
                No measurable tests were recorded in the previous encounter. Fill
                quantitative findings during the next assessment to enable re-assessment selection.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={selectAllFilled}>
                    Select all filled tests
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={selectNone}>
                    Clear selection
                  </Button>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {selectedCount} of {detection?.total ?? 0} tests selected
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {detection?.blocks.map((block) => {
                    const allChecked =
                      block.items.length > 0 && block.items.every((it) => selectedKeys.has(it.key));
                    const someChecked = block.items.some((it) => selectedKeys.has(it.key));
                    return (
                      <Card key={block.id} className="border bg-card shadow-sm">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-sm font-semibold">{block.title}</CardTitle>
                          <Checkbox
                            checked={allChecked}
                            onCheckedChange={(c) => toggleBlock(block, c === true)}
                            aria-label={`Select all ${block.title}`}
                          />
                        </CardHeader>
                        <CardContent className="pt-1 space-y-1.5 max-h-56 overflow-auto">
                          {block.items.map((it) => (
                            <label
                              key={it.key}
                              className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/60 cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedKeys.has(it.key)}
                                  onCheckedChange={(c) => toggleItem(it.key, c === true)}
                                />
                                <span className="font-medium">{it.label}</span>
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {it.previous}
                              </span>
                            </label>
                          ))}
                        </CardContent>
                        {someChecked && !allChecked ? (
                          <p className="px-4 pb-3 text-xs text-muted-foreground">
                            Partially selected
                          </p>
                        ) : null}
                      </Card>
                    );
                  })}
                </div>

                {selectedCount > 0 && (
                  <div className="rounded-md bg-primary/5 border border-primary/30 p-3 text-sm">
                    <span className="font-semibold">{selectedCount} test(s)</span> selected will be
                    pre-filled into the Objective step with their previous values — edit them as
                    the patient&apos;s current status requires.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {step === subjIdx && (
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
            <div className="sm:col-span-2 pt-2 border-t">
              <Label className="font-semibold text-primary">History of Present Illness</Label>
            </div>
            <div>
              <Label>Date of Onset of Injury</Label>
              <Input
                type="date"
                value={form.subjective?.history_of_present_illness?.onset_date ?? ""}
                onChange={(e) => updateField("subjective.history_of_present_illness.onset_date", e.target.value)}
              />
            </div>
            <div>
              <Label>Mechanism of Injury</Label>
              <Input
                placeholder="e.g. RTA, direct/indirect blow, bending, twisting, rotational"
                value={form.subjective?.history_of_present_illness?.mechanism ?? ""}
                onChange={(e) => updateField("subjective.history_of_present_illness.mechanism", e.target.value)}
              />
            </div>
            <div>
              <Label>Mode of Onset</Label>
              <Select
                value={form.subjective?.history_of_present_illness?.mode_of_onset ?? "Gradual"}
                onValueChange={(v) => updateField("subjective.history_of_present_illness.mode_of_onset", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Sudden", "Gradual", "Insidious", "Periodic"].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (Acute / Sub-acute / Chronic)</Label>
              <Select
                value={form.subjective?.history_of_present_illness?.duration_category ?? "Subacute"}
                onValueChange={(v) => updateField("subjective.history_of_present_illness.duration_category", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Acute", "Subacute", "Chronic"].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition Since Onset</Label>
              <Select
                value={form.subjective?.history_of_present_illness?.condition_course ?? "Stationary"}
                onValueChange={(v) => updateField("subjective.history_of_present_illness.condition_course", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Improved", "Stationary", "Worsened"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current Treatment (if any)</Label>
              <Input
                placeholder="e.g. NSAIDs, physiotherapy elsewhere"
                value={form.subjective?.history_of_present_illness?.current_treatment ?? ""}
                onChange={(e) => updateField("subjective.history_of_present_illness.current_treatment", e.target.value)}
              />
            </div>
            <div>
              <Label>Investigations Done</Label>
              <Input
                placeholder="e.g. X-ray, MRI, CT, bone scan (comma separated)"
                value={form.subjective?.history_of_present_illness?.investigations?.join(", ") ?? ""}
                onChange={(e) =>
                  updateField(
                    "subjective.history_of_present_illness.investigations",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
              />
            </div>
            <div>
              <Label>Pathological / Radiological Findings</Label>
              <Input
                placeholder="e.g. L4-L5 disc bulge on MRI"
                value={form.subjective?.history_of_present_illness?.investigation_findings ?? ""}
                onChange={(e) => updateField("subjective.history_of_present_illness.investigation_findings", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 pt-2 border-t">
              <Label className="font-semibold text-primary">Pain Assessment</Label>
            </div>
            <div>
              <Label>Pain Site</Label>
              <Input
                value={form.subjective?.pain.site}
                onChange={(e) => updateField("subjective.pain.site", e.target.value)}
              />
            </div>
            <div>
              <Label>Pain Side</Label>
              <Select
                value={form.subjective?.pain.side || "Not specified"}
                onValueChange={(v) => updateField("subjective.pain.side", v === "Not specified" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Not specified", "Right", "Left", "Bilateral", "Central"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pain Type</Label>
              <Select
                value={form.subjective?.pain.type ?? "Muscle"}
                onValueChange={(v) => updateField("subjective.pain.type", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Muscle", "Ligament", "Joint", "Nerve", "Bone", "Vascular", "Sympathetic"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pain Frequency</Label>
              <Select
                value={form.subjective?.pain.frequency || "Not specified"}
                onValueChange={(v) => updateField("subjective.pain.frequency", v === "Not specified" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Not specified", "Constant", "Periodic", "Episodic"].map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Pain Nature / Character</Label>
              <Input
                placeholder="e.g. dull aching, sharp, burning, throbbing"
                value={form.subjective?.pain.nature_notes ?? ""}
                onChange={(e) => updateField("subjective.pain.nature_notes", e.target.value)}
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
              <Label>Operations & Hospitalizations / Surgical History</Label>
              <Input
                placeholder="e.g. Appendectomy 2015, right knee arthroscopy 2024"
                value={form.subjective?.surgical_history ?? ""}
                onChange={(e) => updateField("subjective.surgical_history", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 pt-2 border-t">
              <Label className="font-semibold text-primary">Personal History</Label>
            </div>
            <div>
              <Label>Sleeping Habits</Label>
              <Input
                placeholder="e.g. 6-7 hrs, disturbed by pain"
                value={form.subjective?.social_history?.sleep_habits ?? ""}
                onChange={(e) => updateField("subjective.social_history.sleep_habits", e.target.value)}
              />
            </div>
            <div>
              <Label>Physical Activities (occupational / recreational / exercise)</Label>
              <Input
                placeholder="e.g. sedentary work, walks 30 min daily"
                value={form.subjective?.social_history?.physical_activity ?? ""}
                onChange={(e) => updateField("subjective.social_history.physical_activity", e.target.value)}
              />
            </div>
            <div>
              <Label>Tobacco Use (duration, frequency, amount)</Label>
              <Input
                placeholder="e.g. no / 10 yrs, 5 cigarettes/day"
                value={form.subjective?.social_history?.tobacco_details ?? ""}
                onChange={(e) => updateField("subjective.social_history.tobacco_details", e.target.value)}
              />
            </div>
            <div>
              <Label>Alcohol Use (duration, frequency, amount)</Label>
              <Input
                placeholder="e.g. no / social, 2-3 drinks/week"
                value={form.subjective?.social_history?.alcohol_details ?? ""}
                onChange={(e) => updateField("subjective.social_history.alcohol_details", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 pt-2 border-t">
              <Label className="font-semibold text-primary">Family & Social History</Label>
            </div>
            <div>
              <Label>Similar Problems in Relatives / Hereditary Diseases</Label>
              <Input
                placeholder="e.g. father had low back pain; no hereditary disease"
                value={form.subjective?.social_history?.family_history ?? ""}
                onChange={(e) => updateField("subjective.social_history.family_history", e.target.value)}
              />
            </div>
            <div>
              <Label>Consanguinity</Label>
              <Select
                value={form.subjective?.social_history?.consanguinity ?? "No"}
                onValueChange={(v) => updateField("subjective.social_history.consanguinity", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["No", "Yes"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Social Status</Label>
              <Input
                placeholder="e.g. middle class, married, 2 children"
                value={form.subjective?.social_history?.social_status ?? ""}
                onChange={(e) => updateField("subjective.social_history.social_status", e.target.value)}
              />
            </div>
            <div>
              <Label>Educational Status</Label>
              <Input
                placeholder="e.g. graduate"
                value={form.subjective?.social_history?.educational_status ?? ""}
                onChange={(e) => updateField("subjective.social_history.educational_status", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Environmental History (home & workplace)</Label>
              <Input
                placeholder="e.g. 2nd floor walk-up; desk job with dual monitors"
                value={form.subjective?.social_history?.environmental_history ?? ""}
                onChange={(e) => updateField("subjective.social_history.environmental_history", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Patient Reported Functional Goals</Label>
              <Textarea
                value={form.subjective?.patient_goals}
                onChange={(e) => updateField("subjective.patient_goals", e.target.value)}
              />
            </div>

            {/* Branch-Specific Extended Subjective Assessment */}
            {activeBranch === "Neurological" && (
              <div className="sm:col-span-2 space-y-4 pt-4 border-t">
                <h3 className="text-base font-bold text-primary flex items-center gap-2">
                  🧠 Neurological Branch — Subjective & Clinical Intake
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 bg-muted/20 p-4 rounded-lg border">
                  <div>
                    <Label>Handedness / Dominance</Label>
                    <Select
                      value={form.subjective?.handedness_dominance ?? "Right"}
                      onValueChange={(v) => updateField("subjective.handedness_dominance", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Right">Right-handed</SelectItem>
                        <SelectItem value="Left">Left-handed</SelectItem>
                        <SelectItem value="Ambidextrous">Ambidextrous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>IP No. / DOA (Date of Admission)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="IP No. e.g. IP-9874"
                        value={form.subjective?.ip_number ?? ""}
                        onChange={(e) => updateField("subjective.ip_number", e.target.value)}
                      />
                      <Input
                        type="date"
                        value={form.subjective?.date_of_admission ?? ""}
                        onChange={(e) => updateField("subjective.date_of_admission", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Provisional Diagnosis</Label>
                    <Input
                      placeholder="e.g. Right Hemiparesis secondary to MCA Infarct"
                      value={form.subjective?.provisional_diagnosis ?? ""}
                      onChange={(e) => updateField("subjective.provisional_diagnosis", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Referred By & Lab Reports Summary</Label>
                    <Input
                      placeholder="e.g. Dr. Sharma (Neurologist) / CT Brain, MRI, CSF workup"
                      value={form.subjective?.referred_by ?? ""}
                      onChange={(e) => updateField("subjective.referred_by", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 font-medium text-sm pt-2 text-foreground/80 border-t">
                    Detailed ADL Difficulties
                  </div>
                  <div>
                    <Label>Bed Activities & Transfers</Label>
                    <Input
                      placeholder="e.g. Difficulty rolling to right, needs assistance bridging"
                      value={form.subjective?.adl_difficulties?.bed_activities ?? ""}
                      onChange={(e) => updateField("subjective.adl_difficulties.bed_activities", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Ambulation & Stair Climbing</Label>
                    <Input
                      placeholder="e.g. Gait scissoring, circumduction, max assist 1"
                      value={form.subjective?.adl_difficulties?.ambulation ?? ""}
                      onChange={(e) => updateField("subjective.adl_difficulties.ambulation", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Dressing & Eating</Label>
                    <Input
                      placeholder="e.g. Buttoning shirt difficult, uses non-dominant hand for spoon"
                      value={form.subjective?.adl_difficulties?.dressing ?? ""}
                      onChange={(e) => updateField("subjective.adl_difficulties.dressing", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Toilet Activities</Label>
                    <Input
                      placeholder="e.g. Needs grab bars, assistance for perineal care"
                      value={form.subjective?.adl_difficulties?.toilet_activities ?? ""}
                      onChange={(e) => updateField("subjective.adl_difficulties.toilet_activities", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 font-medium text-sm pt-2 text-foreground/80 border-t">
                    Motor Weakness & Neurological Complaints
                  </div>
                  <div>
                    <Label>Weakness Side & Site</Label>
                    <Input
                      placeholder="e.g. Right upper and lower limb (Hemiparesis)"
                      value={form.subjective?.weakness_detail?.site ?? ""}
                      onChange={(e) => updateField("subjective.weakness_detail.site", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Weakness Duration (in terms of ADL)</Label>
                    <Input
                      placeholder="e.g. 3 weeks, acute onset following stroke"
                      value={form.subjective?.weakness_detail?.duration_adl ?? ""}
                      onChange={(e) => updateField("subjective.weakness_detail.duration_adl", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Sensory Problems (Partial / Total)</Label>
                    <Input
                      placeholder="e.g. Numbness right hand, hypoesthesia C6-C8 dermatome"
                      value={form.subjective?.sensory_problems ?? ""}
                      onChange={(e) => updateField("subjective.sensory_problems", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Balance Problems (Falls, Dizziness, Visual)</Label>
                    <Input
                      placeholder="e.g. 2 falls past month, postural dizziness, diplopia"
                      value={form.subjective?.balance_problems ?? ""}
                      onChange={(e) => updateField("subjective.balance_problems", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 font-medium text-sm pt-2 text-foreground/80 border-t">
                    Detailed History (Mode of Transport, Bleeding, Symptoms, Family/Social)
                  </div>
                  <div>
                    <Label>Mode of Transport & Consciousness at Onset</Label>
                    <Input
                      placeholder="e.g. Ambulance / Conscious, transient loss of consciousness 5 mins"
                      value={form.subjective?.present_history_detailed?.mode_of_transportation ?? ""}
                      onChange={(e) => updateField("subjective.present_history_detailed.mode_of_transportation", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Bleeding (Nose, Eyes, Ears) & Associated Symptoms</Label>
                    <Input
                      placeholder="e.g. No ENT bleeding / Headache, nausea, projectile vomiting"
                      value={form.subjective?.present_history_detailed?.associated_symptoms ?? ""}
                      onChange={(e) => updateField("subjective.present_history_detailed.associated_symptoms", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Past General Health & Operations</Label>
                    <Input
                      placeholder="e.g. Hypertensive 10 yrs, prior angioplasty 2020"
                      value={form.subjective?.past_history_detailed?.general_health_prior ?? ""}
                      onChange={(e) => updateField("subjective.past_history_detailed.general_health_prior", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Past Physiotherapy & Prognosis</Label>
                    <Input
                      placeholder="e.g. 2 weeks outpatient rehab post-discharge, good recovery potential"
                      value={form.subjective?.past_history_detailed?.past_physio_treatment ?? ""}
                      onChange={(e) => updateField("subjective.past_history_detailed.past_physio_treatment", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Family History (Hereditary / Infectious TB, MD)</Label>
                    <Input
                      placeholder="e.g. No muscular dystrophy, history of TB in uncle 2018"
                      value={form.subjective?.family_history_detailed?.hereditary_diseases ?? ""}
                      onChange={(e) => updateField("subjective.family_history_detailed.hereditary_diseases", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Economical History (Occupation, Income, Expenses)</Label>
                    <Input
                      placeholder="e.g. Accountant, sole breadwinner, moderate medical expense strain"
                      value={form.subjective?.economical_history?.occupation_income ?? ""}
                      onChange={(e) => updateField("subjective.economical_history.occupation_income", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Environmental & Home History (Steps, Toilet Type, Width)</Label>
                    <Input
                      placeholder="e.g. 15 steps to 1st floor apartment, Indian toilet, doorway 75 cm"
                      value={form.subjective?.environmental_detailed?.home_environment ?? ""}
                      onChange={(e) => updateField("subjective.environmental_detailed.home_environment", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeBranch === "Cardiorespiratory" && (
              <div className="sm:col-span-2 space-y-4 pt-4 border-t">
                <h3 className="text-base font-bold text-primary flex items-center gap-2">
                  🫀 Cardiorespiratory / Cardiovascular Branch — Subjective Intake
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 bg-muted/20 p-4 rounded-lg border">
                  <div>
                    <Label>Date of Cardiovascular Evaluation</Label>
                    <Input
                      type="date"
                      value={form.objective?.branch_specific?.cardiorespiratory?.evaluation_date ?? ""}
                      onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.evaluation_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Chest Pain Characteristics (Onset, Quality, Radiation)</Label>
                    <Input
                      placeholder="e.g. Retrosternal pressure radiating to left arm on exertion"
                      value={form.objective?.branch_specific?.cardiorespiratory?.chest_pain_characteristics?.quality ?? ""}
                      onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.chest_pain_characteristics.quality", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>History of Cardiac Symptoms (Palpitations, Syncope)</Label>
                    <Input
                      placeholder="e.g. Occasional nocturnal palpitations, 1 episode presyncope during stairs"
                      value={form.objective?.branch_specific?.cardiorespiratory?.cardiac_symptoms_history?.details ?? ""}
                      onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.cardiac_symptoms_history.details", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Cardiovascular Risk Factors</Label>
                    <Input
                      placeholder="e.g. Smoker 15 pack-yrs, HTN, Type 2 DM, Father had CABG at 55"
                      value={form.objective?.branch_specific?.cardiorespiratory?.cv_risk_factors?.details ?? ""}
                      onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.cv_risk_factors.details", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Cardiac Medication & Cardiac Rehab History</Label>
                    <Input
                      placeholder="e.g. Aspirin 75mg, Metoprolol 25mg, Atorvastatin 20mg; Phase II Cardiac Rehab"
                      value={form.objective?.branch_specific?.cardiorespiratory?.cardiac_medications_and_treatments ?? ""}
                      onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.cardiac_medications_and_treatments", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox checked={form.subjective?.consent_for_treatment_and_data_sharing} disabled />
              <Label>Consent for treatment confirmed</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {step === objIdx && (
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

              <div>
                <Label>Sensorium</Label>
                <Select
                  value={form.objective?.observation?.sensorium ?? "Alert"}
                  onValueChange={(v) => updateField("objective.observation.sensorium", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Alert", "Lethargic", "Stupor", "Coma"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Body Build</Label>
                <Select
                  value={form.objective?.observation?.body_build ?? "Mesomorphic"}
                  onValueChange={(v) => updateField("objective.observation.body_build", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Ectomorphic", "Mesomorphic", "Endomorphic"].map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deformities (congenital / acquired)</Label>
                <Input
                  placeholder="e.g. kyphosis, genu valgum, none"
                  value={form.objective?.observation?.deformities ?? ""}
                  onChange={(e) => updateField("objective.observation.deformities", e.target.value)}
                />
              </div>
              <div>
                <Label>Use of External Aids (orthotics, prosthesis, walking aids)</Label>
                <Input
                  placeholder="e.g. knee brace, single-point cane"
                  value={form.objective?.observation?.external_aids ?? ""}
                  onChange={(e) => updateField("objective.observation.external_aids", e.target.value)}
                />
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

          {/* Gait Parameters — structured measurement */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/40 pb-3">
              <CardTitle className="text-base font-semibold">Gait Parameters (Kinematics)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Step Length (cm) — R</Label>
                <Input
                  type="number" step="0.1" placeholder="e.g. 40"
                  value={form.objective?.gait_parameters?.step_length_cm ?? ""}
                  onChange={(e) => updateField("objective.gait_parameters.step_length_cm", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div>
                <Label>Stride Length (cm)</Label>
                <Input
                  type="number" step="0.1" placeholder="e.g. 80"
                  value={form.objective?.gait_parameters?.stride_length_cm ?? ""}
                  onChange={(e) => updateField("objective.gait_parameters.stride_length_cm", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div>
                <Label>Cadence (steps/min)</Label>
                <Input
                  type="number" placeholder="e.g. 110"
                  value={form.objective?.gait_parameters?.cadence_steps_min ?? ""}
                  onChange={(e) => updateField("objective.gait_parameters.cadence_steps_min", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div>
                <Label>Base Width (cm)</Label>
                <Input
                  type="number" step="0.1" placeholder="e.g. 5"
                  value={form.objective?.gait_parameters?.base_width_cm ?? ""}
                  onChange={(e) => updateField("objective.gait_parameters.base_width_cm", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dermatomes / Myotomes / Capsular Pattern */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/40 pb-3">
              <CardTitle className="text-base font-semibold">Neurological Mapping</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Dermatomes (sensory level / distribution)</Label>
                <Input
                  placeholder="e.g. L4-L5, S1 dermatome diminished on left"
                  value={form.objective?.dermatomes ?? ""}
                  onChange={(e) => updateField("objective.dermatomes", e.target.value)}
                />
              </div>
              <div>
                <Label>Myotomes (motor level / strength pattern)</Label>
                <Input
                  placeholder="e.g. L5 myotome weak on left, L4 intact"
                  value={form.objective?.myotomes ?? ""}
                  onChange={(e) => updateField("objective.myotomes", e.target.value)}
                />
              </div>
              <div>
                <Label>Capsular Pattern (joint-specific restriction)</Label>
                <Input
                  placeholder="e.g. Hip: flexion + IR, extension + ER; lumbar: flexion ↓"
                  value={form.objective?.capsular_pattern ?? ""}
                  onChange={(e) => updateField("objective.capsular_pattern", e.target.value)}
                />
              </div>
              <div>
                <Label>Loose / Close-Packed Position</Label>
                <Input
                  placeholder="e.g. Glenohumeral: loose-packed 15° abduction/30° forward flexion"
                  value={form.objective?.loose_close_packed ?? ""}
                  onChange={(e) => updateField("objective.loose_close_packed", e.target.value)}
                />
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
                                  className={`w-8 py-0.5 text-xs rounded border transition-colors ${entry?.result === v
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
                <div className="sm:col-span-2 space-y-4 pt-2">
                  <h4 className="font-semibold text-primary text-sm flex items-center gap-2">
                    🫀 Cardiorespiratory / Cardiovascular Objective Examination
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 bg-muted/20 p-4 rounded-lg border">
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
                      <Label>Resting BP (Systolic/Diastolic mmHg)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Systolic e.g. 120"
                          value={form.objective?.branch_specific?.cardiorespiratory?.bp_systolic_resting ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.bp_systolic_resting", e.target.value ? Number(e.target.value) : null)}
                        />
                        <Input
                          type="number"
                          placeholder="Diastolic e.g. 80"
                          value={form.objective?.branch_specific?.cardiorespiratory?.bp_diastolic_resting ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.bp_diastolic_resting", e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Post-Exercise BP (Systolic/Diastolic mmHg)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Systolic e.g. 140"
                          value={form.objective?.branch_specific?.cardiorespiratory?.bp_systolic_post_exercise ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.bp_systolic_post_exercise", e.target.value ? Number(e.target.value) : null)}
                        />
                        <Input
                          type="number"
                          placeholder="Diastolic e.g. 85"
                          value={form.objective?.branch_specific?.cardiorespiratory?.bp_diastolic_post_exercise ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.bp_diastolic_post_exercise", e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Heart Rate (Resting vs Post-Exercise bpm)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Resting e.g. 72"
                          value={form.objective?.branch_specific?.cardiorespiratory?.hr_resting_bpm ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.hr_resting_bpm", e.target.value ? Number(e.target.value) : null)}
                        />
                        <Input
                          type="number"
                          placeholder="Post-Ex e.g. 115"
                          value={form.objective?.branch_specific?.cardiorespiratory?.hr_post_exercise_bpm ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.hr_post_exercise_bpm", e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>
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
                      <Label>NYHA Functional Class & mMRC Dyspnea</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={form.objective?.branch_specific?.cardiorespiratory?.dyspnea_assessment?.nyha_class ?? "Class I"}
                          onValueChange={(v) => updateField("objective.branch_specific.cardiorespiratory.dyspnea_assessment.nyha_class", v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Class I", "Class II", "Class III", "Class IV"].map((n) => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={form.objective?.branch_specific?.cardiorespiratory?.dyspnea_assessment?.mmrc_grade ?? "Grade 0"}
                          onValueChange={(v) => updateField("objective.branch_specific.cardiorespiratory.dyspnea_assessment.mmrc_grade", v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Grade 0", "Grade 1", "Grade 2", "Grade 3", "Grade 4"].map((g) => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
                      <Label>Auscultation Breath Sounds & Cardiac Auscultation</Label>
                      <div className="grid grid-cols-2 gap-2">
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
                        <Input
                          placeholder="Murmurs, Gallops S3/S4, Rubs"
                          value={form.objective?.branch_specific?.cardiorespiratory?.cardiac_auscultation_details ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.cardiac_auscultation_details", e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Cough Strength & Sputum</Label>
                      <div className="grid grid-cols-2 gap-2">
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
                    </div>
                    <div>
                      <Label>Peripheral Edema Presence & Pitting Grade</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={form.objective?.branch_specific?.cardiorespiratory?.peripheral_edema?.pitting_grade ?? "0 (None)"}
                          onValueChange={(v) => updateField("objective.branch_specific.cardiorespiratory.peripheral_edema.pitting_grade", v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["0 (None)", "1+ (2mm)", "2+ (4mm)", "3+ (6mm)", "4+ (8mm)"].map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Location e.g. Bilateral ankle/pretibial"
                          value={form.objective?.branch_specific?.cardiorespiratory?.peripheral_edema?.location ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.peripheral_edema.location", e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Electrocardiogram (ECG) Results</Label>
                      <Input
                        placeholder="e.g. Normal Sinus Rhythm, ST-segment depression in V4-V6"
                        value={form.objective?.branch_specific?.cardiorespiratory?.ecg_results ?? ""}
                        onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.ecg_results", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Echocardiogram Findings (EF %, Valves)</Label>
                      <Input
                        placeholder="e.g. LVEF 55%, mild mitral regurgitation, normal LV wall thickness"
                        value={form.objective?.branch_specific?.cardiorespiratory?.echocardiogram_findings ?? ""}
                        onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.echocardiogram_findings", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Stress Test & Exercise Tolerance Test</Label>
                      <Input
                        placeholder="e.g. Completed 7.5 METs on Bruce protocol, no angina or ischemic ECG"
                        value={form.objective?.branch_specific?.cardiorespiratory?.stress_test_results ?? ""}
                        onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.stress_test_results", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Holter Monitor & Coronary Angiography</Label>
                      <Input
                        placeholder="e.g. 24h Holter: sinus rhythm, <1% SVEs; Angio: 70% LAD stenosis s/p PCI"
                        value={form.objective?.branch_specific?.cardiorespiratory?.holter_monitor_data ?? ""}
                        onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.holter_monitor_data", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Cardiac Biomarkers (Troponin / CK-MB)</Label>
                      <Input
                        placeholder="e.g. Troponin I: <0.01 ng/mL (Normal), CK-MB: 2.1 ng/mL"
                        value={form.objective?.branch_specific?.cardiorespiratory?.cardiac_biomarkers?.troponin ?? ""}
                        onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.cardiac_biomarkers.troponin", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Lipid Profile & Blood Glucose (Fasting / HbA1c)</Label>
                      <Input
                        placeholder="e.g. Total Chol 180, HDL 45, LDL 105, Fasting Glucose 95 mg/dL, HbA1c 5.8%"
                        value={form.objective?.branch_specific?.cardiorespiratory?.lipid_profile?.cholesterol ? String(form.objective.branch_specific.cardiorespiratory.lipid_profile.cholesterol) : ""}
                        onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.lipid_profile.cholesterol", e.target.value ? Number(e.target.value) : null)}
                      />
                    </div>
                    <div>
                      <Label>BMI (kg/m²), Inflammatory Markers (hs-CRP, ESR), HRV</Label>
                      <Input
                        placeholder="e.g. BMI 26.4 kg/m², hs-CRP 1.2 mg/L, ESR 12 mm/hr, HRV SDNN 45 ms"
                        value={form.objective?.branch_specific?.cardiorespiratory?.bmi_kg_m2 ? String(form.objective.branch_specific.cardiorespiratory.bmi_kg_m2) : ""}
                        onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.bmi_kg_m2", e.target.value ? Number(e.target.value) : null)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Sleep Apnea Screening (STOP-Bang Score)</Label>
                      <Input
                        placeholder="e.g. STOP-Bang Score: 2 (Low Risk)"
                        value={form.objective?.branch_specific?.cardiorespiratory?.sleep_apnea_screening?.risk_category ?? ""}
                        onChange={(e) => updateField("objective.branch_specific.cardiorespiratory.sleep_apnea_screening.risk_category", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeBranch === "Neurological" && (
                <div className="sm:col-span-2 space-y-6 pt-2">
                  <h4 className="font-semibold text-primary text-sm flex items-center gap-2">
                    🧠 Neurological Comprehensive Examination (Domains 6–13)
                  </h4>

                  {/* 6. Higher Mental Functions */}
                  <div className="bg-muted/20 p-4 rounded-lg border space-y-3">
                    <div className="font-semibold text-sm text-foreground">6. Higher Mental Functions & GCS</div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Level of Consciousness</Label>
                        <Select
                          value={form.objective?.branch_specific?.neurological?.higher_mental_functions?.level_of_consciousness ?? "Alert"}
                          onValueChange={(v) => updateField("objective.branch_specific.neurological.higher_mental_functions.level_of_consciousness", v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Alert", "Drowsy", "Stupor", "Coma"].map((l) => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Glasgow Coma Scale (Eye, Verbal, Motor = Total /15)</Label>
                        <div className="grid grid-cols-4 gap-1">
                          <Input
                            type="number" min={1} max={4} placeholder="E (4)"
                            value={form.objective?.branch_specific?.neurological?.higher_mental_functions?.glasgow_coma_scale?.eye ?? 4}
                            onChange={(e) => updateField("objective.branch_specific.neurological.higher_mental_functions.glasgow_coma_scale.eye", Number(e.target.value))}
                          />
                          <Input
                            type="number" min={1} max={5} placeholder="V (5)"
                            value={form.objective?.branch_specific?.neurological?.higher_mental_functions?.glasgow_coma_scale?.verbal ?? 5}
                            onChange={(e) => updateField("objective.branch_specific.neurological.higher_mental_functions.glasgow_coma_scale.verbal", Number(e.target.value))}
                          />
                          <Input
                            type="number" min={1} max={6} placeholder="M (6)"
                            value={form.objective?.branch_specific?.neurological?.higher_mental_functions?.glasgow_coma_scale?.motor ?? 6}
                            onChange={(e) => updateField("objective.branch_specific.neurological.higher_mental_functions.glasgow_coma_scale.motor", Number(e.target.value))}
                          />
                          <Input
                            type="number" readOnly placeholder="Total"
                            value={(form.objective?.branch_specific?.neurological?.higher_mental_functions?.glasgow_coma_scale?.eye ?? 4) +
                              (form.objective?.branch_specific?.neurological?.higher_mental_functions?.glasgow_coma_scale?.verbal ?? 5) +
                              (form.objective?.branch_specific?.neurological?.higher_mental_functions?.glasgow_coma_scale?.motor ?? 6)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Behavior & Emotional Status</Label>
                        <Input
                          placeholder="Cooperative, stable / depressed, fearful, labile"
                          value={form.objective?.branch_specific?.neurological?.higher_mental_functions?.behavior ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.higher_mental_functions.behavior", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Orientation (Time, Place, Person, Day, Year)</Label>
                        <Input
                          placeholder="Oriented to time, place, and person x3"
                          value={form.objective?.branch_specific?.neurological?.higher_mental_functions?.reasoning_problem_solving ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.higher_mental_functions.reasoning_problem_solving", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Memory (Immediate, Short-term, Long-term)</Label>
                        <Input
                          placeholder="Immediate intact (3 words), short-term intact, long-term intact"
                          value={form.objective?.branch_specific?.neurological?.higher_mental_functions?.memory?.short_term ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.higher_mental_functions.memory.short_term", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Cognitive/Perceptual Abilities (Speech, Agnosia, Apraxia)</Label>
                        <Input
                          placeholder="No expressive/receptive aphasia, no ideomotor apraxia"
                          value={form.objective?.branch_specific?.neurological?.higher_mental_functions?.cognitive_perceptual ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.higher_mental_functions.cognitive_perceptual", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 7. Cranial Nerve Examination */}
                  <div className="bg-muted/20 p-4 rounded-lg border space-y-3">
                    <div className="font-semibold text-sm text-foreground">7. Cranial Nerve Examination (CN I–XII)</div>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      {[
                        { key: "cn1", label: "CN I: Olfactory (Smell)" },
                        { key: "cn2", label: "CN II: Optic (Visual acuity/fields)" },
                        { key: "cn3", label: "CN III: Oculomotor (Pupils, EOM)" },
                        { key: "cn4", label: "CN IV: Trochlear (Superior oblique)" },
                        { key: "cn5", label: "CN V: Trigeminal (Facial sensation, Mastication)" },
                        { key: "cn6", label: "CN VI: Abducens (Lateral rectus)" },
                        { key: "cn7", label: "CN VII: Facial (Facial expression, Taste)" },
                        { key: "cn8", label: "CN VIII: Vestibulocochlear (Hearing, Balance)" },
                        { key: "cn9", label: "CN IX: Glossopharyngeal (Gag reflex, Palate)" },
                        { key: "cn10", label: "CN X: Vagus (Swallowing, Speech)" },
                        { key: "cn11", label: "CN XI: Spinal Accessory (Trapezius, SCM)" },
                        { key: "cn12", label: "CN XII: Hypoglossal (Tongue protrusion)" },
                      ].map((cn) => (
                        <div key={cn.key} className="flex items-center gap-2 border p-2 rounded bg-background">
                          <span className="font-medium min-w-[160px]">{cn.label}</span>
                          <Select
                            value={form.objective?.branch_specific?.neurological?.cranial_nerves?.[cn.key]?.status ?? "Normal"}
                            onValueChange={(v) => updateField(`objective.branch_specific.neurological.cranial_nerves.${cn.key}.status`, v)}
                          >
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["Normal", "Impaired", "Absent", "Not Tested"].map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 8. Sensory Examination */}
                  <div className="bg-muted/20 p-4 rounded-lg border space-y-3">
                    <div className="font-semibold text-sm text-foreground">8. Sensory Examination</div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <Label className="text-xs">Superficial Sensations (Pain, Temp, Touch, Pressure)</Label>
                        <Input
                          placeholder="Light touch intact, pain impaired R L4 dermatome"
                          value={form.objective?.branch_specific?.neurological?.sensory_examination?.superficial?.light_touch ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.sensory_examination.superficial.light_touch", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Deep Sensations (Proprioception, Kinesthesia, Vibration)</Label>
                        <Input
                          placeholder="Proprioception impaired at R great toe, 128Hz vibration normal"
                          value={form.objective?.branch_specific?.neurological?.sensory_examination?.deep?.proprioception ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.sensory_examination.deep.proprioception", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Cortical Sensations (Graphesthesia, Stereognosis, 2-pt)</Label>
                        <Input
                          placeholder="Stereognosis intact, 2-point discrimination 4mm at fingertips"
                          value={form.objective?.branch_specific?.neurological?.sensory_examination?.cortical?.stereognosis ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.sensory_examination.cortical.stereognosis", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 9. Motor Examination & Synergy */}
                  <div className="bg-muted/20 p-4 rounded-lg border space-y-3">
                    <div className="font-semibold text-sm text-foreground">9. Motor Examination & Voluntary Control</div>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                        <Label>Pathological Reflexes (Babinski, Hoffmann, Clonus)</Label>
                        <Input
                          placeholder="Babinski positive on right, Hoffmann negative, ankle clonus 2 beats"
                          value={form.objective?.branch_specific?.neurological?.motor_examination?.reflexes_pathological?.babinski ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.motor_examination.reflexes_pathological.babinski", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Voluntary Control — Brunnstrom Stage (1–6)</Label>
                        <Select
                          value={form.objective?.branch_specific?.neurological?.motor_examination?.voluntary_control?.brunnstrom_stage ?? "Stage 4"}
                          onValueChange={(v) => updateField("objective.branch_specific.neurological.motor_examination.voluntary_control.brunnstrom_stage", v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[
                              "Stage 1 — Flaccidity",
                              "Stage 2 — Synergies developing",
                              "Stage 3 — Voluntary synergy",
                              "Stage 4 — Movement deviating from synergy",
                              "Stage 5 — Independent movement combinations",
                              "Stage 6 — Normal isolated movement",
                            ].map((b) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Muscle Power (Oxford MMT 0-5) & Muscle Tightness</Label>
                        <Input
                          placeholder="Oxford Grade 3+ shoulder flexors, tightness in hamstring & gastrocnemius"
                          value={form.objective?.branch_specific?.neurological?.motor_examination?.muscle_tightness ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.motor_examination.muscle_tightness", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 10. Balance & Coordination */}
                  <div className="bg-muted/20 p-4 rounded-lg border space-y-3">
                    <div className="font-semibold text-sm text-foreground">10. Balance & Coordination Examination</div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Berg Balance Scale Score (0-56)</Label>
                        <Input
                          type="number" min={0} max={56} placeholder="0-56"
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
                        <Label>Coordination Tests (Finger-to-Nose, Dysdiadochokinesia)</Label>
                        <Select
                          value={form.objective?.branch_specific?.neurological?.coordination_result ?? "Normal"}
                          onValueChange={(v) => updateField("objective.branch_specific.neurological.coordination_result", v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Normal", "Dysmetria", "Intention Tremor", "Dysdiadochokinesia", "Ataxia"].map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Static & Dynamic Balance (Sitting & Standing)</Label>
                        <Input
                          placeholder="Static sitting Good, dynamic sitting Fair; Standing static Fair, dynamic Poor"
                          value={form.objective?.branch_specific?.neurological?.balance_and_coordination?.balance_static_dynamic?.static_standing ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.balance_and_coordination.balance_static_dynamic.static_standing", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Equilibrium Tests (Tandem, Sideways, Single Leg)</Label>
                        <Input
                          placeholder="Tandem walking impaired, single leg stance < 3 seconds"
                          value={form.objective?.branch_specific?.neurological?.balance_and_coordination?.equilibrium_tests?.tandem_walking ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.balance_and_coordination.equilibrium_tests.tandem_walking", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 11 & 12 & 13. Gait, Autonomic & Functional */}
                  <div className="bg-muted/20 p-4 rounded-lg border space-y-3">
                    <div className="font-semibold text-sm text-foreground">11, 12 & 13. Gait, Autonomic & Functional Assessment</div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Gait Parameters (Step length, Stride, Cadence)</Label>
                        <Input
                          placeholder="Step length 42cm, stride 85cm, cadence 82 steps/min"
                          value={form.objective?.branch_specific?.neurological?.gait_examination?.gait_deviations ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.gait_examination.gait_deviations", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Autonomic Sweat Function (Ninhydrin / Galvanic)</Label>
                        <Input
                          placeholder="Ninhydrin test normal sudomotor response; galvanic resistance intact"
                          value={form.objective?.branch_specific?.neurological?.autonomic_system?.ninhydrin_sweat_test ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.autonomic_system.ninhydrin_sweat_test", e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Functional Evaluation & Bladder/Bowel Control</Label>
                        <Input
                          placeholder="ADL FIM score 78/126; Bladder continent with urgency, bowel intact"
                          value={form.objective?.branch_specific?.neurological?.functional_evaluation?.adl_performance ?? ""}
                          onChange={(e) => updateField("objective.branch_specific.neurological.functional_evaluation.adl_performance", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
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
                  const key = `${slugify(romJoint)}_${slugify(romMotion)}`;
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
                        {ROM_KEY_TO_LABEL.get(key) ?? key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
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
                  const key = `${slugify(mmtJoint)}_${mmtSide === "Right" ? "R" : "L"}`;
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
                        {MMT_KEY_TO_LABEL.get(key.replace(/_(R|L)$/, "")) ?? key.replace(/_(R|L)$/, "").split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
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

          {/* Functional Evaluation — specific UL/LL tasks (ICF d-category) */}
          <Card className="shadow-sm border-primary/40">
            <CardHeader className="bg-primary/5 pb-3">
              <CardTitle className="text-base font-semibold">Functional Evaluation</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label className="font-medium text-sm text-primary">Upper Limb Functional Tasks</Label>
                <p className="text-xs text-muted-foreground mb-2">Rate difficulty on ICF qualifier scale</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {UL_FUNCTIONAL_TASKS.map((task) => (
                    <div key={task} className="flex items-center gap-2">
                      <span className="text-xs font-medium w-1/2">{task.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                      <Select
                        value={form.objective?.functional_ul?.[task] ?? "None"}
                        onValueChange={(v) => updateField(`objective.functional_ul.${task}`, v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICF_QUALIFIERS.map((q) => (
                            <SelectItem key={q} value={q}>{q}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="font-medium text-sm text-primary">Lower Limb Functional Tasks</Label>
                <p className="text-xs text-muted-foreground mb-2">Rate difficulty on ICF qualifier scale</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {LL_FUNCTIONAL_TASKS.map((task) => (
                    <div key={task} className="flex items-center gap-2">
                      <span className="text-xs font-medium w-1/2">{task.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                      <Select
                        value={form.objective?.functional_ll?.[task] ?? "None"}
                        onValueChange={(v) => updateField(`objective.functional_ll.${task}`, v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICF_QUALIFIERS.map((q) => (
                            <SelectItem key={q} value={q}>{q}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
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
                            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${current === q
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
                            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${current === sev
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
                            className={`px-2 py-0.5 text-xs rounded border transition-colors ${reflex.right === g
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
                            className={`px-2 py-0.5 text-xs rounded border transition-colors ${reflex.left === g
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

      {step === assessIdx && (
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
              <Label>Differential Diagnosis (one per line)</Label>
              <Textarea
                placeholder="List alternative diagnoses being considered"
                value={form.assessment?.differential_diagnosis?.join("\n") ?? ""}
                onChange={(e) =>
                  updateField(
                    "assessment.differential_diagnosis",
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
            <div>
              <Label>Final Diagnosis (confirmed after assessment)</Label>
              <Input
                placeholder="e.g. Lumbar disc herniation L4-L5 with L5 radiculopathy"
                value={form.assessment?.final_diagnosis ?? ""}
                onChange={(e) => updateField("assessment.final_diagnosis", e.target.value)}
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

      {step === planIdx && (
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
        {step < steps.length - 1 ? (
          <Button type="button" onClick={goNext}>
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
