/*
  # Create Jobs Tracking System

  1. New Tables
    - `jobs`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to profiles)
      - `title` (text)
      - `description` (text)
      - `project_type` (text) - Kitchen, Bathroom, Exterior, etc.
      - `status` (text) - quote, pending, in_progress, on_hold, completed, cancelled
      - `priority` (text) - low, medium, high
      - `budget` (decimal)
      - `spent_to_date` (decimal)
      - `progress_percentage` (integer)
      - `start_date` (date)
      - `due_date` (date)
      - `completed_date` (date)
      - `address` (text)
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `job_milestones`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `title` (text)
      - `status` (text) - pending, active, completed
      - `due_date` (date)
      - `completed_date` (date)
      - `order` (integer)
      - `created_at` (timestamptz)

    - `job_activities`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `user_id` (uuid, foreign key to profiles)
      - `activity_type` (text)
      - `description` (text)
      - `created_at` (timestamptz)

    - `job_team_members`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `user_id` (uuid, foreign key to profiles)
      - `role` (text)
      - `assigned_at` (timestamptz)

    - `job_documents`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `name` (text)
      - `file_path` (text)
      - `file_size` (integer)
      - `uploaded_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access job data
*/

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  project_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority text DEFAULT 'medium',
  budget decimal(12, 2) DEFAULT 0,
  spent_to_date decimal(12, 2) DEFAULT 0,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  start_date date,
  due_date date,
  completed_date date,
  address text,
  city text,
  state text,
  zip_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job_milestones table
CREATE TABLE IF NOT EXISTS job_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  completed_date date,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create job_activities table
CREATE TABLE IF NOT EXISTS job_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create job_team_members table
CREATE TABLE IF NOT EXISTS job_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(job_id, user_id)
);

-- Create job_documents table
CREATE TABLE IF NOT EXISTS job_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size integer DEFAULT 0,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_project_type ON jobs(project_type);
CREATE INDEX IF NOT EXISTS idx_jobs_due_date ON jobs(due_date);
CREATE INDEX IF NOT EXISTS idx_job_milestones_job_id ON job_milestones(job_id);
CREATE INDEX IF NOT EXISTS idx_job_activities_job_id ON job_activities(job_id);
CREATE INDEX IF NOT EXISTS idx_job_team_members_job_id ON job_team_members(job_id);
CREATE INDEX IF NOT EXISTS idx_job_team_members_user_id ON job_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_job_id ON job_documents(job_id);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_documents ENABLE ROW LEVEL SECURITY;

-- Jobs policies
CREATE POLICY "Admins can view all jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Customers can view their own jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Team members can view assigned jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_team_members
      WHERE job_team_members.job_id = jobs.id
      AND job_team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Job milestones policies
CREATE POLICY "Users can view milestones for jobs they can access"
  ON job_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_milestones.job_id
      AND (
        jobs.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
        OR EXISTS (
          SELECT 1 FROM job_team_members
          WHERE job_team_members.job_id = jobs.id
          AND job_team_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins can manage job milestones"
  ON job_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Job activities policies
CREATE POLICY "Users can view activities for jobs they can access"
  ON job_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_activities.job_id
      AND (
        jobs.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
        OR EXISTS (
          SELECT 1 FROM job_team_members
          WHERE job_team_members.job_id = jobs.id
          AND job_team_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins and team members can create activities"
  ON job_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM job_team_members
      WHERE job_team_members.job_id = job_activities.job_id
      AND job_team_members.user_id = auth.uid()
    )
  );

-- Job team members policies
CREATE POLICY "Users can view team members for jobs they can access"
  ON job_team_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_team_members.job_id
      AND (
        jobs.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
        OR job_team_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage team members"
  ON job_team_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Job documents policies
CREATE POLICY "Users can view documents for jobs they can access"
  ON job_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_documents.job_id
      AND (
        jobs.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
        OR EXISTS (
          SELECT 1 FROM job_team_members
          WHERE job_team_members.job_id = jobs.id
          AND job_team_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins and team members can upload documents"
  ON job_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM job_team_members
      WHERE job_team_members.job_id = job_documents.job_id
      AND job_team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete documents"
  ON job_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for jobs table
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
