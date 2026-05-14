import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ForgeProject = {
  id: string;
  session_id: string;
  app_name: string;
  app_idea: string;
  app_category: string;
  primary_feature: string;
  target_audience: string;
  color_scheme: string;
  custom_notes: string | null;
  package_name: string;
  primary_language: string;
  generated_code: string | null;
  build_status: string;
  download_url: string | null;
  build_logs: string | null;
  build_id: string | null;
  cached: boolean;
  created_at: string;
  updated_at: string;
};
