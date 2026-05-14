
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'sb_publishable_X1_nQ6m48h-w7atI8fhECg_Gj9kXQyl';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpenplZWNlcXlzZGZobmtvc3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTM4MDYsImV4cCI6MjA5NDI4OTgwNn0.tdoZWMwPoWz6uxmj1-6QNrYU8tt1u7mF8cGUY0DHHho';

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
