import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL      = 'https://iizzeeceqysdfhnkosrc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpenplZWNlcXlzZGZobmtvc3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTM4MDYsImV4cCI6MjA5NDI4OTgwNn0.tdoZWMwPoWz6uxmj1-6QNrYU8tt1u7mF8cGUY0DHHho';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

(async () => {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const inPages = window.location.pathname.includes('/pages/');
      window.location.replace(inPages ? 'login.html' : 'pages/login.html');
    } else {
      document.documentElement.style.visibility = '';
    }
  } catch (e) {
    // Supabase indisponível (offline, CDN bloqueado, etc.) — não trava a página
    document.documentElement.style.visibility = '';
  }
})();
