-- Seed demo data for DigPhy
-- Prerequisites: Run 001_initial_schema.sql and 002_storage.sql first
-- Then create auth users: clinician@digphy.demo, rajesh@patient.demo, priya@patient.demo

-- Get user IDs from auth.users (replace these UUIDs with actual user IDs from Supabase Auth → Users)
-- You'll see the UUID for each user in the Supabase dashboard

-- For now, using placeholder UUIDs - replace with actual auth user IDs:
-- Get them from: Supabase Dashboard → Auth → Users (click each user to see ID)

-- Insert or update profiles for clinician
INSERT INTO profiles (id, role, full_name, clinic_name)
VALUES (
  'REPLACE_WITH_CLINICIAN_UUID',  -- Replace with actual clinician user ID
  'Physiotherapist',
  'Dr. Ananya Sharma',
  'DigPhy Clinic'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'Physiotherapist',
  full_name = 'Dr. Ananya Sharma',
  clinic_name = 'DigPhy Clinic';

-- Insert demo patients
INSERT INTO patients (
  first_name, last_name, date_of_birth, sex, contact_phone, email, address,
  primary_diagnosis, comorbidities, current_medications, allergies, mobility_aids,
  consent_signed, consent_date, created_by, user_id
)
VALUES
(
  'Rajesh', 'Kumar', '1978-03-15', 'Male', '+91-9876543210', 'rajesh@patient.demo',
  '12 MG Road, Bangalore', 'Lumbar disc herniation L4-L5',
  ARRAY['Hypertension'], ARRAY['Amlodipine 5mg'], ARRAY['Penicillin'], ARRAY[]::text[],
  true, '2026-01-10', 'REPLACE_WITH_CLINICIAN_UUID', 'REPLACE_WITH_PATIENT1_UUID'
),
(
  'Priya', 'Mehta', '1992-07-22', 'Female', '+91-9123456789', 'priya@patient.demo',
  '45 Park Street, Mumbai', 'Post-ACL reconstruction rehab',
  ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY['Knee brace'],
  true, '2026-02-01', 'REPLACE_WITH_CLINICIAN_UUID', 'REPLACE_WITH_PATIENT2_UUID'
)
ON CONFLICT (contact_phone) DO NOTHING;

-- Link patient profiles
UPDATE profiles
SET role = 'Patient', patient_id = (SELECT id FROM patients WHERE contact_phone = '+91-9876543210' LIMIT 1)
WHERE id = 'REPLACE_WITH_PATIENT1_UUID';

UPDATE profiles
SET role = 'Patient', patient_id = (SELECT id FROM patients WHERE contact_phone = '+91-9123456789' LIMIT 1)
WHERE id = 'REPLACE_WITH_PATIENT2_UUID';
