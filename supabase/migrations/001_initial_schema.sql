-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE user_role AS ENUM ('Physiotherapist', 'Assistant', 'Admin', 'Patient');
CREATE TYPE sex_type AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE encounter_type AS ENUM ('Initial', 'Follow-up', 'Telehealth', 'HomeVisit', 'Discharge');
CREATE TYPE confidentiality_level AS ENUM ('Standard', 'Sensitive');
CREATE TYPE document_type AS ENUM ('Consent', 'Report', 'Image', 'Prescription');
CREATE TYPE audit_action AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT');
CREATE TYPE audit_entity AS ENUM ('Patient', 'Encounter', 'Document', 'ProgressEntry');
CREATE TYPE progress_source AS ENUM ('clinic', 'patient_report', 'device');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'Physiotherapist',
  full_name TEXT NOT NULL,
  clinic_name TEXT,
  patient_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  sex sex_type NOT NULL,
  contact_phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  emergency_contact JSONB,
  primary_diagnosis TEXT NOT NULL,
  comorbidities TEXT[] DEFAULT '{}',
  current_medications TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  mobility_aids TEXT[] DEFAULT '{}',
  caregiver JSONB,
  consent_signed BOOLEAN NOT NULL DEFAULT FALSE,
  consent_date DATE,
  consent_document_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from profiles to patients after patients table exists
ALTER TABLE profiles
  ADD CONSTRAINT profiles_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

-- Encounters with SOAP as JSONB
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  date_time TIMESTAMPTZ NOT NULL,
  encounter_type encounter_type NOT NULL,
  location TEXT NOT NULL,
  confidentiality_level confidentiality_level NOT NULL DEFAULT 'Standard',
  notes TEXT,
  subjective JSONB NOT NULL DEFAULT '{}',
  objective JSONB NOT NULL DEFAULT '{}',
  assessment JSONB NOT NULL DEFAULT '{}',
  plan JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Progress entries (time series)
CREATE TABLE progress_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date_time TIMESTAMPTZ NOT NULL,
  metric_key TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  source progress_source NOT NULL DEFAULT 'clinic',
  clinician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  filename TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  storage_reference TEXT NOT NULL,
  access_restrictions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE patients
  ADD CONSTRAINT patients_consent_document_id_fkey
  FOREIGN KEY (consent_document_id) REFERENCES documents(id) ON DELETE SET NULL;

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action audit_action NOT NULL,
  entity audit_entity NOT NULL,
  entity_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_patients_name ON patients (last_name, first_name);
CREATE INDEX idx_encounters_patient ON encounters (patient_id, date_time DESC);
CREATE INDEX idx_progress_patient_metric ON progress_entries (patient_id, metric_key, date_time DESC);
CREATE INDEX idx_documents_patient ON documents (patient_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id, timestamp DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER encounters_updated_at
  BEFORE UPDATE ON encounters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'Physiotherapist')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper: get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is clinician role
CREATE OR REPLACE FUNCTION is_clinician(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_uuid
    AND role IN ('Physiotherapist', 'Assistant', 'Admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get patient id for patient user
CREATE OR REPLACE FUNCTION get_patient_id_for_user(user_uuid UUID)
RETURNS UUID AS $$
  SELECT patient_id FROM profiles WHERE id = user_uuid AND role = 'Patient';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Clinicians can read all profiles"
  ON profiles FOR SELECT
  USING (is_clinician(auth.uid()));

-- Patients policies
CREATE POLICY "Clinicians full access to patients"
  ON patients FOR ALL
  USING (is_clinician(auth.uid()));

CREATE POLICY "Patients read own record"
  ON patients FOR SELECT
  USING (id = get_patient_id_for_user(auth.uid()));

-- Encounters policies
CREATE POLICY "Clinicians full access to encounters"
  ON encounters FOR ALL
  USING (is_clinician(auth.uid()));

CREATE POLICY "Patients read own encounters summary fields"
  ON encounters FOR SELECT
  USING (patient_id = get_patient_id_for_user(auth.uid()));

-- Progress entries policies
CREATE POLICY "Clinicians full access to progress"
  ON progress_entries FOR ALL
  USING (is_clinician(auth.uid()));

CREATE POLICY "Patients read own progress"
  ON progress_entries FOR SELECT
  USING (patient_id = get_patient_id_for_user(auth.uid()));

-- Documents policies
CREATE POLICY "Clinicians full access to documents"
  ON documents FOR ALL
  USING (is_clinician(auth.uid()));

-- Audit logs - clinicians only
CREATE POLICY "Clinicians read audit logs"
  ON audit_logs FOR SELECT
  USING (is_clinician(auth.uid()));

CREATE POLICY "Authenticated users insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket for documents (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('patient-documents', 'patient-documents', false);
