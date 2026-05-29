/* ============================================================
   auth-guard — protege as páginas SEM depender do SDK (esm.sh).
   Lê/renova a sessão via REST (rest.js). Se o SDK não carregar
   (CDN lenta/bloqueada), a página AINDA funciona — antes ela
   ficava em branco (visibility:hidden) porque o import do SDK
   falhava e nunca restaurava a visibilidade.
   ============================================================ */
import { db } from './supabase/rest.js';

function reveal() {
  document.documentElement.style.visibility = '';
}

(async () => {
  try {
    const sess = await db.getValidSession();
    if (!sess) {
      const inPages = window.location.pathname.includes('/pages/');
      window.location.replace(inPages ? 'login.html' : 'pages/login.html');
      return;
    }
    reveal();
    // Push notifications: best-effort e NÃO-bloqueante. Usa o SDK (push.js),
    // mas se o SDK não carregar, apenas ignora — não afeta a página.
    import('./supabase/push.js')
      .then(m => m.initPush(sess.user && sess.user.id))
      .catch(() => {});
  } catch (e) {
    // Qualquer erro: nunca prende o usuário numa tela em branco.
    reveal();
  }
})();
