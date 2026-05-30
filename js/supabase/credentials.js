/* ============================================================
   MC Guias — Credenciais públicas do Supabase
   ------------------------------------------------------------
   Fonte ÚNICA da URL e da anon key. A anon key é pública por
   design (acesso controlado por RLS) — pode ficar no client.

   IMPORTANTE: este módulo NÃO importa o SDK (esm.sh). Por isso
   pode ser importado tanto pelo `config.js` (SDK) quanto pelo
   `rest.js` (caminho crítico, sem SDK) sem reintroduzir a
   dependência de CDN no caminho crítico. Rotação de chave =
   editar apenas aqui.
   ============================================================ */
export const SUPABASE_URL = 'https://iizzeeceqysdfhnkosrc.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpenplZWNlcXlzZGZobmtvc3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTM4MDYsImV4cCI6MjA5NDI4OTgwNn0.tdoZWMwPoWz6uxmj1-6QNrYU8tt1u7mF8cGUY0DHHho';
