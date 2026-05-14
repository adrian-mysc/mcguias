
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://iizzeeceqysdfhnkosrc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_X1_nQ6m48h-w7atI8fhECg_Gj9kXQyl';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);
