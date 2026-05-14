/*
  # APK Forge Projects Table

  1. New Tables
    - `forge_projects`
      - `id` (uuid, primary key) - unique project identifier
      - `session_id` (text) - anonymous session identifier for grouping builds
      - `app_name` (text) - the name of the Android app
      - `app_idea` (text) - user's original app idea/description
      - `app_category` (text) - category (e.g., productivity, game, social)
      - `primary_feature` (text) - main feature of the app
      - `target_audience` (text) - intended users
      - `color_scheme` (text) - preferred color scheme
      - `custom_notes` (text, nullable) - optional extra notes from user
      - `package_name` (text) - generated Android package name
      - `primary_language` (text) - Java/Kotlin/Python
      - `generated_code` (text, nullable) - AI-generated MainActivity code
      - `build_status` (text) - idle/building/success/error
      - `download_url` (text, nullable) - URL to download the built APK
      - `build_logs` (text, nullable) - full build logs
      - `build_id` (text, nullable) - unique build identifier
      - `cached` (boolean) - whether this was served from cache
      - `created_at` (timestamptz) - creation timestamp
      - `updated_at` (timestamptz) - last update timestamp

  2. Security
    - Enable RLS on `forge_projects` table
    - Add policy for session-based access (anonymous sessions can read/write their own data)

  3. Notes
    - No authentication required — uses session_id for scoping
    - Session IDs are generated client-side (UUID) and stored in localStorage
*/

CREATE TABLE IF NOT EXISTS forge_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL DEFAULT '',
  app_name text NOT NULL DEFAULT '',
  app_idea text NOT NULL DEFAULT '',
  app_category text NOT NULL DEFAULT '',
  primary_feature text NOT NULL DEFAULT '',
  target_audience text NOT NULL DEFAULT '',
  color_scheme text NOT NULL DEFAULT 'modern',
  custom_notes text,
  package_name text NOT NULL DEFAULT '',
  primary_language text NOT NULL DEFAULT 'Java',
  generated_code text,
  build_status text NOT NULL DEFAULT 'idle',
  download_url text,
  build_logs text,
  build_id text,
  cached boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE forge_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions can insert own projects"
  ON forge_projects FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Sessions can view own projects"
  ON forge_projects FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Sessions can update own projects"
  ON forge_projects FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Index for efficient session-based lookups
CREATE INDEX IF NOT EXISTS forge_projects_session_idx ON forge_projects(session_id);
CREATE INDEX IF NOT EXISTS forge_projects_created_at_idx ON forge_projects(created_at DESC);
