
import { createClient } from '@supabase/supabase-js';

// Use fallback values to prevent build crashes in CI if secrets are missing
// In production, these should be set in environment variables or configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("Supabase URL or Anon Key is missing. Using placeholder values.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);