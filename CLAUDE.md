# CLAUDE.md — Guia para o Assistente de IA

Este arquivo documenta decisões de arquitetura, armadilhas conhecidas e lições aprendidas no projeto **MC Guias**. Leia antes de modificar qualquer código.

---

## Estrutura Geral

- **Frontend**: HTML + CSS + Vanilla JS (sem framework). Cada página é um arquivo `.html` em `pages/`.
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions).
- **PWA**: Service Worker em `pages/sw.js`, manifest em `/manifest.json`.
- **JS do quiz**: `js/main.js` é gerado — edite os módulos em `js/src/` e rode `bash build/concat.sh`.

---

## PWA — Base de caminho dinâmica (dois deploys)

O app roda em **dois lugares com raízes diferentes**:
- **GitHub Pages**: `adrian-mysc.github.io/mcguias/` → raiz `/mcguias/`.
- **Vercel / domínio próprio**: `mcguias.vercel.app` → raiz `/`.

Por isso o PWA **não pode** ter caminho fixo `/mcguias/` (quebra na Vercel:
manifest/SW dão 404, o app não instala e não funciona offline). A base é
resolvida em runtime:

- **`manifest.json`**: URLs **relativas** (`start_url`/`scope` = `"./"`, ícones
  `icons/icon-192.png`). Resolvem relativo à URL do próprio manifest.
- **`<link rel="manifest">` e `apple-touch-icon`**: relativos — `manifest.json`
  / `icons/...` nas páginas da raiz; `../manifest.json` / `../icons/...` nas de
  `pages/`. **Nunca** use `/mcguias/...` absoluto aqui.
- **Registro do SW** (`js/src/sw-init.js`): a base vem de
  `location.pathname.replace(/\/(pages\/)?[^\/]*$/, '/')` → `register(base + 'sw.js')`.
  Depois rode `bash build/concat.sh`.
- **`sw.js`**: `const BASE = self.location.pathname.replace(/sw\.js$/, '')`.
  Todo asset (precache, offline fallback, ícones de push) é prefixado com `BASE`.

⚠️ Outros caminhos absolutos `/mcguias/...` ainda existem fora do PWA (ex.:
`bottom-nav`, `fab`, e `const base = '/mcguias/data/questions/'` em algumas
páginas) — esses quebram navegação/carregamento na Vercel e ainda precisam do
mesmo tratamento relativo/dinâmico.

---

## Supabase — Armadilhas Críticas

### 1. Sempre use `{ onConflict: 'id' }` no upsert de perfis

```javascript
// CORRETO
supabase.from('profiles').upsert(payload, { onConflict: 'id' })

// ERRADO — causa falha silenciosa quando há constraint UNIQUE em outras colunas
supabase.from('profiles').upsert(payload)
```

**Por quê:** A tabela `profiles` tem `username UNIQUE NOT NULL` além da chave primária `id`. Sem especificar `onConflict: 'id'`, o PostgREST tenta resolver o conflito pela constraint errada → upsert falha → save do perfil quebra silenciosamente.

**Descoberto em:** investigação de maio/2026 — os botões "Editar" e "Sair da conta" paravam de funcionar após adicionar a constraint UNIQUE ao username. Causa raiz: o upsert falhava, o `return` antecipado em `saveDados()` impedia o `toggleDadosEdit(false)`, e erros na inicialização do módulo bloqueavam a atribuição de `window.handleLogout` e `window.toggleDadosEdit`.

### 2. Fallback do upsert deve ser outro upsert, não um UPDATE

Para usuários novos (sem linha na tabela), `UPDATE ... WHERE id = userId` retorna 0 linhas com `error = null` — falso sucesso. O perfil nunca é criado.

```javascript
// CORRETO: fallback com username alternativo via upsert
const safeUsername = profile?.username || `u_${user.id.replace(/-/g, '').slice(0, 16)}`;
supabase.from('profiles').upsert({ ...payload, username: safeUsername }, { onConflict: 'id' })

// ERRADO: UPDATE não cria linha nova para usuários novos
supabase.from('profiles').update(payload).eq('id', user.id)
```

### 3. Logout: não aguarde `signOut()` antes de redirecionar

```javascript
// CORRETO — redireciona imediatamente, signOut limpa sessão local sem rede
function handleLogout() {
  supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  window.location.replace('login.html');
}

// PROBLEMÁTICO — await pode travar se a rede estiver lenta
async function handleLogout() {
  await supabase.auth.signOut();
  window.location.replace('login.html');
}
```

---

## Módulo JS do Perfil (`pages/perfil.html`)

### Variável `profile` é `let`, não `const`

O perfil carregado do Supabase na inicialização é um `let` que deve ser atualizado em memória após cada save bem-sucedido. Isso garante que saves subsequentes usem o username correto sem recarregar a página.

```javascript
// Após save bem-sucedido em saveDados():
profile = { ...(profile || {}), username: newUsername, display_name: nome, ... };
```

### Proteja o `renderAll()` com try-catch na inicialização

O módulo usa `<script type="module">` com top-level `await`. As atribuições `window.handleLogout` e `window.toggleDadosEdit` ficam **depois** da chamada `renderAll()` no fluxo de execução. Se `renderAll()` lançar qualquer exceção não tratada, nenhum dos botões da página funcionará.

```javascript
// CORRETO — erros de renderização não bloqueiam os botões
try { buildEmojiGrid(); renderAll(); } catch(e) { console.error('renderAll error:', e); }
```

---

## Geração de Usernames

Usernames são derivados do apelido ou nome do usuário + sufixo do UUID para garantir unicidade:

```javascript
const baseSlug = (apelido || nome)
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 26) || 'user';

// Preserva username existente para não alterar sem intenção do usuário
const newUsername = profile?.username || `${baseSlug}_${user.id.slice(0, 6)}`;
```

**Regra:** se o usuário já tem um `profile.username` no banco, ele nunca muda automaticamente. Só muda se o próprio usuário editar e o username atual não estiver disponível.

---

## Políticas RLS da Tabela `profiles`

| Operação | Política |
|----------|----------|
| SELECT | Público (qualquer um pode ler) |
| INSERT | `auth.uid() = id` |
| UPDATE | `USING (auth.uid() = id)` |

O upsert precisa das permissões de INSERT e UPDATE simultaneamente. Ambas são satisfeitas quando o usuário está autenticado e edita o próprio perfil.

---

## Colunas da Tabela `profiles`

```
id             uuid  PK → auth.users(id)
username       text  UNIQUE NOT NULL
display_name   text
avatar         text  (URL do Storage)
avatar_emoji   text  DEFAULT '😊'
cargo          text
loja           text
sigla          text
estado         text
cidade         text
created_at     timestamptz
```

Campos salvos **apenas em localStorage** (não no banco): `turno`, `admissao`, `telefone`.

---

## Migrations do Banco (fonte de verdade)

**A fonte de verdade do schema é `supabase/migrations/`, NÃO `sql/schema.sql`.**
O `sql/schema.sql` é legado/incompleto e conflita com as migrations. Para
reconstruir o banco use `supabase db pull`. Toda mudança de schema deve virar
uma migration nova (`supabase migration new ...`).

### Convenções de RLS

- Em policies, **sempre** use `(select auth.uid())` em vez de `auth.uid()` puro
  (evita reavaliação por linha — lint `auth_rls_initplan`).
- **Não** use `FOR ALL` quando já existe uma policy `FOR SELECT` pública na
  mesma tabela: separe em INSERT/UPDATE/DELETE (evita `multiple_permissive_policies`).
- Funções devem ter `SET search_path` fixo (`public` se o corpo referencia
  tabelas sem schema-qualificação).

### Idempotência de `quiz_sessions`

Cada sessão de quiz recebe um `csid` (UUID estável, gerado em `saveQuizResult`
no `js/src/stats.js`) que vai no evento `mc:quizComplete` e é enviado como
`client_session_id`. O `sync.js` faz **upsert com `onConflict:
'user_id,client_session_id'` + `ignoreDuplicates`** — assim, se o ponteiro de
sync (`mc_sessions_synced`) dessincronizar, a sessão não é duplicada (o que
inflaria a pontuação, já que `get_leaderboard` faz `SUM(score)`).

### Modelo de pontos

**Fonte de verdade: `quiz_sessions`.** A tabela `leaderboard` é um **cache
derivado**, mantido pelo trigger `update_leaderboard_cached_points` (nome
legado) em cada INSERT de `quiz_sessions`: `points = SUM(score)`,
`total_xp = COUNT(*)`.

Regras:
- O cliente NOVO (`js/supabase/leaderboard.js`) só faz `submitScore(username,
  loja, sigla)` — não escreve points/total_xp (o trigger é o dono).
- As RPCs `get_leaderboard`/`get_user_rank` usam `GREATEST(SUM(quiz_sessions),
  leaderboard.points)`. Esse "GREATEST" é uma **rede de segurança** porque o
  cliente ANTIGO (ainda em produção no GitHub Pages) escreve `points` direto —
  assim o ranking fica correto com ambos os clientes. Quando o novo cliente
  estiver 100% deployado, dá para simplificar para leitura direta do cache.
- `cached_points` é uma **coluna gerada** (`= points`) só para compatibilidade
  com o código antigo que ainda faz `.select('cached_points')`.

⚠️ **Lição (deploy lag):** migrations no banco de produção entram em vigor na
hora, mas o front no GitHub Pages só atualiza no merge. NUNCA aplique uma
migration que quebre o código atualmente deployado (ex.: `DROP COLUMN` usada
pelo cliente). Mantenha compatibilidade retroativa até o front novo subir.

### Cliente REST sem SDK (`js/supabase/rest.js`) — caminho crítico

⚠️ **O caminho crítico NÃO depende do SDK (`esm.sh`).** O import do
`@supabase/supabase-js` via CDN era o ponto de falha que deixava ~72/85
usuários sem sync (e a página em branco quando o `auth-guard` não carregava).

- `js/supabase/rest.js`: cliente REST puro (fetch ao PostgREST `/rest/v1` e ao
  GoTrue `/auth/v1`). Lê a sessão do `localStorage` (`sb-<ref>-auth-token`,
  gravada pelo supabase-js) e **renova o token via REST** quando expira.
  Expõe `db` com `select/count/insert/upsert/rpc/getUserId/getValidSession`.
- `auth-guard.js`, `sync.js` e `leaderboard.js` usam **só** o `rest.js` — não
  importam `config.js` (SDK). Assim a página carrega e o quiz sincroniza mesmo
  se o `esm.sh` estiver lento/bloqueado.
- O **SDK (`config.js`) só fica** para features de realtime (batalha/arena,
  inline nas páginas) e push (`push.js`, carregado de forma não-bloqueante).
- `login.html` ainda usa SDK inline (login é o 1º acesso; quando falha, o
  usuário simplesmente não entra — não fica preso em tela branca).
- Teste: bloquear `**/esm.sh/**` no Playwright e validar que auth-guard +
  `mc:quizComplete` → `POST /rest/v1/quiz_sessions` continuam funcionando.

### Telemetria (`js/telemetry.js`)

Telemetria leve, **sem SDK** (fetch direto ao PostgREST). Eventos:
`app_open`, `quiz_started`, `quiz_finished` → tabela `app_events`.
Use `window.mcTrack('evento', {meta})`. É best-effort: nunca lança/bloqueia.
Carregada como `<script defer>` clássico nas páginas (roda mesmo se o SDK
falhar). Diagnóstico que motivou: ~85 usuários, mas só 4 com `quiz_sessions` —
o sync via SDK estava falhando para a maioria.

---

## Padrões de Código

- **Sem frameworks**: tudo Vanilla JS. Não introduza React, Vue, etc.
- **Sem bundler**: assets são servidos diretamente. A exceção é `js/main.js` (gerado por `build/concat.sh`).
- **`pages/perfil.html`** é uma página monolítica com o script inline — intencional para evitar dependências extras.
- **Dark mode**: controlado por `data-theme` no `<html>` via `js/theme.js`. Use variáveis CSS (`var(--bg)`, `var(--text)`, etc.).
