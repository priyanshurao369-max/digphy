-- Storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-documents',
  'patient-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: clinicians can upload/read
CREATE POLICY "Clinicians can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND is_clinician(auth.uid())
  );

CREATE POLICY "Clinicians can read documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'patient-documents'
    AND is_clinician(auth.uid())
  );

CREATE POLICY "Clinicians can update documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'patient-documents'
    AND is_clinician(auth.uid())
  );

CREATE POLICY "Clinicians can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'patient-documents'
    AND is_clinician(auth.uid())
  );
