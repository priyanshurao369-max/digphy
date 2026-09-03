export type UserRole = "Physiotherapist" | "Assistant" | "Admin" | "Patient";

export type Sex = "Male" | "Female" | "Other";

export type EncounterType =
  | "Initial"
  | "Follow-up"
  | "Telehealth"
  | "HomeVisit"
  | "Discharge";

export type ConfidentialityLevel = "Standard" | "Sensitive";

export type ModeOfOnset = "Sudden" | "Gradual" | "Insidious" | "Periodic";

export type DurationCategory = "Acute" | "Subacute" | "Chronic";

export type PainType = "Muscle" | "Ligament" | "Joint" | "Nerve" | "Bone" | "Vascular" | "Sympathetic";

export type ConditionCourse = "Improved" | "Stationary" | "Worsened";

export type GeneralCondition = "Good" | "Fair" | "Poor";

export type AmbulatoryStatus =
  | "Independent"
  | "WithAid"
  | "Wheelchair"
  | "Bedridden";

export type DocumentType = "Consent" | "Report" | "Image" | "Prescription";

export type BranchSpecialty =
  | "Orthopedic"
  | "Cardiorespiratory"
  | "Neurological"
  | "Geriatric"
  | "Pediatric";

export type AuditAction = "CREATE" | "READ" | "UPDATE" | "DELETE" | "EXPORT";

export type AuditEntity = "Patient" | "Encounter" | "Document" | "ProgressEntry";

export type ProgressSource = "clinic" | "patient_report" | "device";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  clinic_name: string | null;
  patient_id: string | null;
  created_at: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Caregiver {
  name: string;
  phone: string;
  relationship: string;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: Sex;
  contact_phone: string;
  email: string | null;
  address: string | null;
  emergency_contact: EmergencyContact | null;
  primary_diagnosis: string;
  branch_specialty?: BranchSpecialty;
  comorbidities: string[];
  current_medications: string[];
  allergies: string[];
  mobility_aids: string[];
  caregiver: Caregiver | null;
  consent_signed: boolean;
  consent_date: string | null;
  consent_document_id: string | null;
  user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PainData {
  site: string;
  side: string;
  type: PainType;
  frequency: string;
  descriptors: string[];
  intensity_vas: number;
  aggravating_factors: string;
  relieving_factors: string;
  nature_notes: string;
}

export interface DetailedAdlDifficulties {
  ambulation?: string;
  bed_activities?: string;
  dressing?: string;
  eating?: string;
  toilet_activities?: string;
}

export interface DetailedWeakness {
  side?: string;
  site?: string;
  duration_adl?: string;
}

export interface DetailedPresentHistory {
  mode_of_transportation?: string;
  consciousness_status?: string;
  bleeding_sites?: string;
  nature_severity?: string;
  associated_symptoms?: string;
}

export interface DetailedPastHistory {
  general_health_prior?: string;
  pregnancies_miscarriages?: string;
  past_physio_treatment?: string;
  past_prognosis?: string;
}

export interface DetailedPersonalHistory {
  marital_history?: string;
  habits?: string;
}

export interface DetailedFamilyHistory {
  similar_symptoms?: string;
  hereditary_diseases?: string;
  infectious_diseases?: string;
}

export interface DetailedEconomicalHistory {
  occupation_income?: string;
  source_of_income?: string;
  family_expenses?: string;
}

export interface DetailedSocialEducation {
  education_patient?: string;
  education_spouse?: string;
  education_family?: string;
}

export interface DetailedEnvironmentalHistory {
  home_environment?: string;
  work_environment?: string;
}

export interface DetailedGeneralObservation {
  built?: string;
  posture?: string;
  respiration_pattern?: string;
  appliances?: string;
  trophic_changes?: string;
  wounds_edema_sutures?: string;
  limb_attitude?: string;
  involuntary_movements?: string;
  muscle_wasting?: string;
}

export interface DetailedPalpation {
  tenderness_grade?: number;
  temperature?: string;
  spasm_tension?: string;
  swelling?: string;
  tone?: string;
}

export interface SubjectiveData {
  chief_complaint: string;
  history_of_present_illness: {
    onset_date: string;
    mechanism: string;
    mode_of_onset: ModeOfOnset;
    duration_category: DurationCategory;
    condition_course: ConditionCourse;
    current_treatment: string;
    investigations: string[];
    investigation_findings: string;
  };
  pain: PainData;
  past_medical_history: string;
  surgical_history: string;
  medications: string[];
  social_history: {
    occupation: string;
    tobacco: string;
    tobacco_details: string;
    smoking_details: string;
    alcohol: string;
    alcohol_details: string;
    sleep_habits: string;
    physical_activity: string;
    living_situation: string;
    family_history: string;
    hereditary_diseases: string;
    consanguinity: string;
    social_status: string;
    educational_status: string;
    environmental_history: string;
  };
  patient_goals: string;
  consent_for_treatment_and_data_sharing: boolean;
  // Extended Clinical Header & Branch Specific Subjective Fields
  ip_number?: string;
  date_of_admission?: string;
  provisional_diagnosis?: string;
  referred_by?: string;
  laboratory_reports?: string;
  handedness_dominance?: string;
  adl_difficulties?: DetailedAdlDifficulties;
  weakness_detail?: DetailedWeakness;
  sensory_problems?: string;
  balance_problems?: string;
  present_history_detailed?: DetailedPresentHistory;
  past_history_detailed?: DetailedPastHistory;
  personal_history_detailed?: DetailedPersonalHistory;
  family_history_detailed?: DetailedFamilyHistory;
  economical_history?: DetailedEconomicalHistory;
  social_education?: DetailedSocialEducation;
  environmental_detailed?: DetailedEnvironmentalHistory;
  observation_detailed?: DetailedGeneralObservation;
  palpation_detailed?: DetailedPalpation;
}

export type SpecialTestResultStatus = "positive" | "negative" | "nt";

export interface SpecialTestResult {
  name: string;
  result: SpecialTestResultStatus;
}

export interface OrthopedicObjectiveData {
  special_tests: string[];
  special_test_results?: SpecialTestResult[];
  end_feel?: string;
  joint_play: string;
  swelling_grade: string;
  limb_length_apparent_cm?: number | null;
}

export interface CardiorespiratoryObjectiveData {
  auscultation_notes: string;
  auscultation_finding?: string;
  cough_strength: string;
  sputum_characteristics: string;
  borg_dyspnea_score: number | null;
  chest_expansion_cm: number | null;
  iswt_m?: number | null;
  // Extended Cardiovascular Evaluation Fields
  evaluation_date?: string;
  bp_systolic_resting?: number | null;
  bp_diastolic_resting?: number | null;
  bp_systolic_post_exercise?: number | null;
  bp_diastolic_post_exercise?: number | null;
  hr_resting_bpm?: number | null;
  hr_post_exercise_bpm?: number | null;
  respiratory_rate_bpm?: number | null;
  spo2_percent?: number | null;
  ecg_results?: string;
  cardiac_auscultation_details?: string;
  echocardiogram_findings?: string;
  stress_test_results?: string;
  holter_monitor_data?: string;
  coronary_angiography_findings?: string;
  cardiac_biomarkers?: { troponin?: string; ck_mb?: string };
  hrv_sdnn_ms?: number | null;
  exercise_tolerance_test?: string;
  lipid_profile?: { cholesterol?: number | null; hdl?: number | null; ldl?: number | null; triglycerides?: number | null };
  blood_glucose?: { fasting_mg_dl?: number | null; hba1c_pct?: number | null };
  bmi_kg_m2?: number | null;
  inflammatory_markers?: { crp_mg_l?: number | null; esr_mm_hr?: number | null };
  chest_pain_characteristics?: { onset?: string; duration?: string; intensity_0_10?: number; quality?: string; radiation?: string };
  dyspnea_assessment?: { nyha_class?: string; mmrc_grade?: string; borg_score?: number | null };
  peripheral_edema?: { presence?: boolean; pitting_grade?: string; location?: string };
  cardiac_symptoms_history?: { palpitations?: boolean; syncope?: boolean; dizziness?: boolean; details?: string };
  cv_risk_factors?: { smoking?: boolean; hypertension?: boolean; diabetes?: boolean; family_history?: boolean; details?: string };
  sleep_apnea_screening?: { stop_bang_score?: number | null; risk_category?: string };
  cardiac_medications_and_treatments?: string;
}

export interface HigherMentalFunctionsData {
  level_of_consciousness?: string;
  glasgow_coma_scale?: { eye?: number; verbal?: number; motor?: number; total?: number };
  behavior?: string;
  emotional_status?: string;
  orientation?: { time?: boolean; place?: boolean; person?: boolean; day?: boolean; year?: boolean };
  memory?: { immediate?: string; short_term?: string; long_term?: string };
  calculation?: string;
  reasoning_problem_solving?: string;
  judgement?: string;
  attention?: string;
  cognitive_perceptual?: string;
}

export interface CranialNerveDetail {
  tested?: boolean;
  status?: string;
  notes?: string;
}

export interface CranialNerveExamData {
  cn1_olfactory?: CranialNerveDetail;
  cn2_optic?: CranialNerveDetail;
  cn3_oculomotor?: CranialNerveDetail;
  cn4_trochlear?: CranialNerveDetail;
  cn5_trigeminal?: CranialNerveDetail;
  cn6_abducens?: CranialNerveDetail;
  cn7_facial?: CranialNerveDetail;
  cn8_vestibulocochlear?: CranialNerveDetail;
  cn9_glossopharyngeal?: CranialNerveDetail;
  cn10_vagus?: CranialNerveDetail;
  cn11_spinal_accessory?: CranialNerveDetail;
  cn12_hypoglossal?: CranialNerveDetail;
}

export interface SensoryExamDetailedData {
  superficial?: { pain?: string; temperature?: string; light_touch?: string; pressure?: string };
  deep?: { proprioception?: string; kinesthesia?: string; vibration?: string };
  cortical?: { graphesthesia?: string; stereognosis?: string; tactile_localization?: string; two_point_discrimination?: string };
}

export interface MotorExamDetailedData {
  modified_ashworth_scale?: number | null;
  spasticity_pattern?: string;
  reflexes_deep_tendon?: Record<string, string>;
  reflexes_pathological?: { babinski?: string; hoffmann?: string; clonus?: string };
  oxford_power_grade?: Record<string, number>;
  rom_summary?: string;
  muscle_tightness?: string;
  voluntary_control?: { bobath_stage?: string; brunnstrom_stage?: string };
}

export interface BalanceCoordinationDetailedData {
  balance_static_dynamic?: { static_sitting?: string; dynamic_sitting?: string; static_standing?: string; dynamic_standing?: string };
  functional_balance_scale_score?: number | null;
  coordination_tests?: { finger_to_nose?: string; finger_to_finger?: string; dysdiadochokinesia?: string; knee_to_heel?: string };
  equilibrium_tests?: { tandem_walking?: string; sideways_walking?: string; single_leg_standing?: string };
}

export interface GaitExamDetailedData {
  ambulation_mode?: string;
  step_length_cm?: number | null;
  step_width_cm?: number | null;
  stride_length_cm?: number | null;
  stance_time_sec?: number | null;
  cadence_steps_min?: number | null;
  gait_deviations?: string;
}

export interface AutonomicExamData {
  ninhydrin_sweat_test?: string;
  galvanic_skin_resistance?: string;
  vasomotor_sudomotor_notes?: string;
}

export interface NeurologicalObjectiveData {
  modified_ashworth_scale: number | null;
  berg_balance_score: number | null;
  coordination_notes: string;
  coordination_result?: string;
  // Extended 13-domain Neurological fields
  higher_mental_functions?: HigherMentalFunctionsData;
  cranial_nerves?: CranialNerveExamData;
  sensory_examination?: SensoryExamDetailedData;
  motor_examination?: MotorExamDetailedData;
  balance_and_coordination?: BalanceCoordinationDetailedData;
  gait_examination?: GaitExamDetailedData;
  autonomic_system?: AutonomicExamData;
  functional_evaluation?: {
    adl_performance?: string;
    bladder_bowel_control?: string;
  };
}

export interface GeriatricObjectiveData {
  thirty_sec_chair_stand_reps: number | null;
  adl_index_score: number | null;
  fall_history_count: number | null;
  katz_items?: Record<string, boolean>;
  lawton_items?: Record<string, boolean>;
}

export interface PediatricObjectiveData {
  gmfm_percentage: number | null;
  pedi_score: number | null;
  tone_assessment: string;
  milestones_achieved: string[];
}

export interface BranchSpecificObjectiveData {
  orthopedic?: OrthopedicObjectiveData;
  cardiorespiratory?: CardiorespiratoryObjectiveData;
  neurological?: NeurologicalObjectiveData;
  geriatric?: GeriatricObjectiveData;
  pediatric?: PediatricObjectiveData;
}

export type SkinSoftTissueSeverity = "None" | "Minor" | "Important";

export interface SkinSoftTissuesProblem {
  swelling?: SkinSoftTissueSeverity;
  callus?: SkinSoftTissueSeverity;
  scar?: SkinSoftTissueSeverity;
  wound?: SkinSoftTissueSeverity;
  temperature?: SkinSoftTissueSeverity;
  infection?: SkinSoftTissueSeverity;
  pain?: SkinSoftTissueSeverity;
  abnormal_sensation?: SkinSoftTissueSeverity;
}

export interface SensationItemDetail {
  right: boolean;
  left: boolean;
  specification: string;
}

export interface SensationTableData {
  superficial: SensationItemDetail;
  deep: SensationItemDetail;
  numbness: SensationItemDetail;
  paresthesia: SensationItemDetail;
  other: SensationItemDetail;
}

export type ReflexGradeStatus = "+" | "-" | "normal";

export interface ReflexItemDetail {
  right: ReflexGradeStatus;
  left: ReflexGradeStatus;
}

export interface ReflexesTableData {
  btr: ReflexItemDetail;
  ttr: ReflexItemDetail;
  ktr: ReflexItemDetail;
  atr: ReflexItemDetail;
  babinski: { right: boolean; left: boolean };
  comments: string;
}

// ── ICF: Activity Limitations & Participation Restrictions ──

export type IcfQualifier = "None" | "Mild" | "Moderate" | "Severe" | "Complete";

export interface ActivityLimitationsData {
  /** activity key -> ICF performance qualifier */
  items?: Record<string, IcfQualifier>;
  comments?: string;
}

export interface ParticipationRestrictionsData {
  /** restriction key -> whether the restriction is present */
  items?: Record<string, boolean>;
  comments?: string;
}

export interface ObjectiveData {
  vitals: {
    heart_rate_bpm: number | null;
    blood_pressure_mmHg: string;
    respiratory_rate_bpm: number | null;
    spo2_percent: number | null;
    temperature_c: number | null;
  };
  general_condition: GeneralCondition;
  ambulatory_status: AmbulatoryStatus;
  observation: {
    sensorium: string;
    body_build: string;
    deformities: string;
    external_aids: string;
    posture: { anterior: string; posterior: string; lateral: string };
    gait: { barefoot: string; with_aids: string };
  };
  palpation: {
    tenderness_grade: number;
    tone: string;
    crepitus: string;
    ligamentous_snaps: string;
    cracking_distraction: string;
    capillary_refill: string;
    nodules: string;
    pulses: string;
    scar_status: string;
    edema_type: string;
    edema_notes: string;
    swelling_type: string;
  };
  dermatomes: string;
  myotomes: string;
  capsular_pattern: string;
  loose_close_packed: string;
    gait_parameters: {
    step_length_cm: number | null;
    stride_length_cm: number | null;
    cadence_steps_min: number | null;
    base_width_cm: number | null;
  };
  functional_ul: Record<string, string>;
  functional_ll: Record<string, string>;
  rom: {
    arom: Record<string, string>;
    prom: Record<string, string>;
    end_feel: string;
  };
  strength: {
    mmt: Record<string, number>;
  };
  neuro: {
    sensation: string;
    reflexes: Record<string, string>;
  };
  skin_and_soft_tissues?: SkinSoftTissuesProblem;
  sensation_table?: SensationTableData;
  reflexes_table?: ReflexesTableData;
  activity_limitations?: ActivityLimitationsData;
  participation_restrictions?: ParticipationRestrictionsData;
  functional_tests: {
    tug_sec: number | null;
    six_mwt_m: number | null;
    other: string;
  };
  measurements: {
    limb_length_true_cm: number | null;
    girth_cm: Record<string, number>;
  };
  branch_specific?: BranchSpecificObjectiveData;
  attachments: string[];
}

export interface AssessmentData {
  problem_list: string[];
  working_diagnosis: string;
  differential_diagnosis: string[];
  red_flags_present: boolean;
  clinical_impression: string;
  final_diagnosis: string;
}

export interface Goal {
  goal_id: string;
  description: string;
  baseline_value: string;
  target_value: string;
  target_date: string;
  owner_clinician_id: string;
}

export interface Intervention {
  exercise_id: string;
  name: string;
  reps: number;
  sets: number;
  hold_seconds: number;
  progression_rule: string;
  resource_ref: string;
}

export interface PlanData {
  short_term_goals: Goal[];
  long_term_goals: Goal[];
  treatment_plan: {
    treatment_id: string;
    title: string;
    start_date: string;
    end_date: string;
    frequency_per_week: number;
    duration_minutes: number;
    interventions: Intervention[];
    modalities: string[];
    education: string[];
    home_program: string;
  };
  monitoring: {
    metrics_to_track: string[];
    review_interval_days: number;
  };
  next_follow_up: string;
}

export interface Encounter {
  id: string;
  patient_id: string;
  clinician_id: string;
  date_time: string;
  encounter_type: EncounterType;
  location: string;
  confidentiality_level: ConfidentialityLevel;
  notes: string | null;
  subjective: SubjectiveData;
  objective: ObjectiveData;
  assessment: AssessmentData;
  plan: PlanData;
  created_at: string;
  updated_at: string;
}

export interface ProgressEntry {
  id: string;
  patient_id: string;
  date_time: string;
  metric_key: string;
  value: number;
  unit: string;
  source: ProgressSource;
  clinician_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  patient_id: string;
  type: DocumentType;
  filename: string;
  uploaded_by: string;
  uploaded_at: string;
  storage_reference: string;
  access_restrictions: string[];
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  entity: AuditEntity;
  entity_id: string;
  timestamp: string;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
}
