/*
  # File Upload System

  1. New Tables
    - `files`
      - `id` (uuid, primary key)
      - `business_id` (uuid, references profiles) - The business/company that owns the file
      - `uploaded_by` (uuid, references profiles) - User who uploaded
      - `entity_type` (text) - Type of entity: 'client', 'estimate', 'job'
      - `entity_id` (uuid) - ID of the related entity
      - `file_name` (text) - Original filename
      - `file_type` (text) - MIME type (e.g., 'image/jpeg', 'application/pdf')
      - `file_size` (bigint) - File size in bytes
      - `storage_path` (text) - Path in Supabase Storage
      - `category` (text) - Optional category like 'invoice', 'photo', 'contract'
      - `client_visible` (boolean) - Whether clients can see this file
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `files` table
    - Staff (admins/team members) can view/manage all files
    - Clients can only view files where client_visible = true and they're related to the entity
    
  3. Storage Bucket
    - Create 'files' bucket for file storage
    - Public access disabled (use signed URLs)
*/

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES profiles(id),
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'estimate', 'job')),
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'general',
  client_visible BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries by entity
CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_files_business ON files(business_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view all files for their business
CREATE POLICY "Staff can view all files"
  ON files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'team_member')
      AND (files.business_id = profiles.id OR files.business_id IS NULL)
    )
  );

-- Policy: Staff can upload files
CREATE POLICY "Staff can upload files"
  ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'team_member')
    )
    AND uploaded_by = auth.uid()
  );

-- Policy: Staff can delete their own files or admins can delete any
CREATE POLICY "Staff can delete files"
  ON files
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Clients can view files marked as client_visible
-- This assumes clients are related through jobs or other entities
CREATE POLICY "Clients can view client_visible files"
  ON files
  FOR SELECT
  TO authenticated
  USING (
    client_visible = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'customer'
    )
    AND (
      -- Client can see files for jobs they own
      (entity_type = 'job' AND EXISTS (
        SELECT 1 FROM jobs
        WHERE jobs.id = entity_id
        AND jobs.customer_id = auth.uid()
      ))
      -- Add other entity type checks as needed
    )
  );

-- Create storage bucket (this is done via SQL for documentation)
-- Note: In practice, you may need to create the bucket via Supabase Dashboard
-- or using the Supabase Storage API
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Staff can upload files
CREATE POLICY "Staff can upload to files bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'files'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'team_member')
    )
  );

-- Storage policies: Staff can view all files
CREATE POLICY "Staff can view all files in bucket"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'files'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'team_member')
    )
  );

-- Storage policies: Staff can delete files
CREATE POLICY "Staff can delete files from bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'files'
    AND (
      -- Can delete own files
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  );

-- Storage policies: Clients can view client_visible files
CREATE POLICY "Clients can view client_visible files in bucket"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'files'
    AND EXISTS (
      SELECT 1 FROM files
      WHERE files.storage_path = storage.objects.name
      AND files.client_visible = true
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'customer'
      )
    )
  );
