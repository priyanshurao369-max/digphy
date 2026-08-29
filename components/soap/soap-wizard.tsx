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
import type { EncounterFormData } from "@/lib/validators/schemas";
import type { BranchSpecialty } from "@/types";

const STEPS = ["Header", "Subjective", "Objective", "Assessment", "Plan"] as const;

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
      functional_tests: { tug_sec: null, six_mwt_m: null, other: "" },
      measurements: { limb_length_true_cm: null, girth_cm: {} },
      branch_specific: {
        orthopedic: { special_tests: [], joint_play: "Normal", swelling_grade: "None" },
        cardiorespiratory: { auscultation_notes: "Vesicular breath sounds", cough_strength: "Strong", sputum_characteristics: "Clear", borg_dyspnea_score: 0, chest_expansion_cm: 3 },
        neurological: { modified_ashworth_scale: 0, berg_balance_score: 56, coordination_notes: "Intact" },
        geriatric: { thirty_sec_chair_stand_reps: 12, adl_index_score: 100, fall_history_count: 0 },
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
    const result = await createEncounter(form as EncounterFormData);
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
                    <Label>Special Tests (e.g., Lachman, McMurray, Drawer, Hawkins)</Label>
                    <Input
                      placeholder="Lachman (-), McMurray (+), Hawkins-Kennedy (-)"
                      value={form.objective?.branch_specific?.orthopedic?.special_tests?.join(", ") ?? ""}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.orthopedic.special_tests",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Joint Play / Mobility</Label>
                    <Input
                      placeholder="Normal / Hypermobile / Hypomobile"
                      value={form.objective?.branch_specific?.orthopedic?.joint_play ?? "Normal"}
                      onChange={(e) =>
                        updateField("objective.branch_specific.orthopedic.joint_play", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Swelling Grade</Label>
                    <Input
                      placeholder="None / Mild / Moderate / Severe"
                      value={form.objective?.branch_specific?.orthopedic?.swelling_grade ?? "None"}
                      onChange={(e) =>
                        updateField("objective.branch_specific.orthopedic.swelling_grade", e.target.value)
                      }
                    />
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
                    <Label>Cough Strength & Sputum</Label>
                    <Input
                      placeholder="Strong cough / Clear sputum"
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
                    <Label>Modified Ashworth Scale (MAS Spasticity 0-4)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={4}
                      placeholder="0 (normal) to 4 (rigid)"
                      value={form.objective?.branch_specific?.neurological?.modified_ashworth_scale ?? 0}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.neurological.modified_ashworth_scale",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Berg Balance Scale Score (0-56)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={56}
                      placeholder="0-56"
                      value={form.objective?.branch_specific?.neurological?.berg_balance_score ?? 56}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.neurological.berg_balance_score",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
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
                    <Label>Katz ADL / Lawton IADL Score (0-100)</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={form.objective?.branch_specific?.geriatric?.adl_index_score ?? 100}
                      onChange={(e) =>
                        updateField(
                          "objective.branch_specific.geriatric.adl_index_score",
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
                </>
              )}
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
