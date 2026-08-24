# CLAUDE.md — Guia para o Assistente de IA

Este arquivo documenta decisões de arquitetura, armadilhas conhecidas e lições aprendidas no projeto **MC Guias**. Leia antes de modificar qualquer código.

---

## Estrutura Geral

- **Frontend**: HTML + CSS + Vanilla JS (sem framework). Cada página é um arquivo `.html` em `pages/`.
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions).
- **PWA**: Service Worker em `pages/sw.js`, manifest em `/manifest.json`.
- **JS do quiz**: `js/main.js` é gerado — edite os módulos em `js/src/` e rode `bash build/concat.sh`.
- **Navbar das páginas de conteúdo**: é **gerada** a partir de `build/partials/navbar.html` + `build/pages.config.json`. NÃO edite a `<nav class="navbar">` direto no HTML (entre `<!-- mc:navbar:start/end -->`) — rode `node build/build-pages.mjs`. Veja `build/README.md`. O `tests/run_tests.js` falha se houver drift.
- **Tema/splash**: `js/theme.js` (síncrono no `<head>`) é a fonte única do `data-theme` (evita FOUC) e esconde o `#splash` no `load`. Não recrie o `<script>` inline de tema/splash nas páginas — ele foi removido por ser redundante.

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

✅ (jun/2026) Não restam caminhos absolutos `/mcguias/...` em código — as
ocorrências remanescentes são apenas comentários. Ao adicionar página/asset
novo, mantenha o padrão relativo/dinâmico acima (nunca hardcode `/mcguias/`).
O **404.html** é caso especial: o GitHub Pages o serve na URL da página
inexistente, então ele injeta um `<base>` dinâmico no `<head>`.

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

### Tudo que o `renderAll()` usa precisa ser declarado ANTES dele

`renderAll()` chama `onEstadoChange()`, que lê o `const CIDADES_BR`. Enquanto
esse `const` ficava **depois** no arquivo, o primeiro load de quem já tinha
`estado` salvo lançava `ReferenceError: Cannot access 'CIDADES_BR' before
initialization` (TDZ) — e o try-catch da seção abaixo **engolia o erro**, então
tudo que vem depois no `renderAll()` (estatísticas, nível, desempenho por guia,
conquistas) simplesmente não renderizava. Sem erro visível na tela.

O try-catch protege os botões, mas **esconde** falhas de render. Ao mover código
no módulo, mantenha `const`/`let` usados pelo `renderAll()` acima dele — há um
teste posicional em `tests/run_tests.js` que trava isso.

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

### `sigla` deve ser gravada junto com `loja`

O campo "Restaurante (sigla)" do perfil **é** a sigla (placeholder `RUI · HGG ·
GBN`). O valor digitado vai para as **duas** colunas, porque cada consumidor lê
uma delas:

| Consumidor | Lê de |
|---|---|
| `get_leaderboard` (RPC do ranking) | `profiles.sigla` |
| `submitScore()` via `sync.js` | `mc_perfil_dados.sigla` (localStorage) |
| Filtro "🏪 Restaurante" do ranking | `profiles.loja` |
| Inicial do avatar em `leaderboard.html` | `p.sigla` |

Até jun/2026 o `saveDados()` só gravava `loja` → `sigla` ficava NULL para
**todos** os usuários e as features baseadas nela nunca funcionaram. Se
adicionar um campo de sigla separado no futuro, atualize os quatro pontos acima
de uma vez. O `syncLeaderboard()` cai para `loja` quando `sigla` não existe,
para não deixar perfis antigos sem identificação.

### Cidade é campo LIVRE, não `<select>`

`CIDADES_BR` lista ~269 das 5.570 cidades do país — só as maiores de cada UF.
Como `<select>` fechado, quem trabalhava fora dessa lista **não conseguia
preencher a cidade de jeito nenhum**, e o cartão de completude cobrava uma
tarefa impossível (o valor salvo por outra via ainda era descartado no
`renderAll()`, porque a `option` não existia). Hoje é `<input list="cidades-list">`
+ `<datalist>`: a lista vira sugestão, não restrição.

Ao salvar, `normalizaCidade()` casa o texto digitado com a lista da UF ignorando
acento/caixa/espaço (`"sao  paulo"` → `"São Paulo"`) e, se a cidade não estiver
lá, aplica title-case mantendo preposições minúsculas. Isso evita a mesma cidade
virar várias linhas diferentes no banco. Trocar de UF limpa o campo via
`dataset.uf` — o `<input>` não descarta o texto sozinho como o `<select>` fazia.

⚠️ A lista é curada à mão e já acumulou erro: `Caruaru` estava duplicada em PE e
listada em SE (é de PE). Há teste que trava duplicata e cidade em UF errada.

### Completude do perfil incentiva o ranking

O cartão `#pc-card` (topo do perfil, logo acima do card de ranking) mede 6
itens; `sigla`, `estado` e `cidade` são marcados `key: true` porque são
exatamente os campos que `pages/leaderboard.html` usa nos filtros
`#filterEstado` e `#filterRestaurante`. Ao mexer nesses filtros, ajuste
`PC_ITENS` junto — senão o cartão promete um benefício que não existe mais
(há teste cobrindo os dois lados).

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

---

## Estética Frontend

Evite o "AI slop" — outputs genéricos e previsíveis. Ao criar ou modificar interfaces:

**Tipografia**: Escolha fontes belas, únicas e interessantes. Evite Arial, Inter, Roboto e fontes de sistema genéricas. Prefira escolhas distintivas que elevem a estética.

**Cor e Tema**: Comprometa-se com uma estética coesa usando variáveis CSS. Cores dominantes com acentos nítidos superam paletas tímidas e uniformemente distribuídas. Inspire-se em temas de IDE e estéticas culturais.

**Motion**: Use animações para efeitos e micro-interações. Priorize soluções CSS puras. Um carregamento de página bem orquestrado com reveals escalonados (`animation-delay`) cria mais deleite do que micro-interações espalhadas.

**Backgrounds**: Crie atmosfera e profundidade em vez de cores sólidas. Use gradientes CSS em camadas, padrões geométricos ou efeitos contextuais que combinem com a estética geral.

**Evite explicitamente**:
- Famílias de fontes superusadas (Inter, Roboto, Arial, Space Grotesk, fontes de sistema)
- Esquemas de cores clichês (gradientes roxos em fundo branco)
- Layouts e padrões de componentes previsíveis
- Design "cookie-cutter" sem caráter específico ao contexto

Interprete criativamente e faça escolhas inesperadas que pareçam genuinamente projetadas para o contexto. Varie entre temas claros e escuros, fontes e estéticas diferentes.
