# CLAUDE.md — Guia para o Assistente de IA

Este arquivo documenta decisões de arquitetura, armadilhas conhecidas e lições aprendidas no projeto **MC Guias**. Leia antes de modificar qualquer código.

---

## Estrutura Geral

- **Frontend**: HTML + CSS + Vanilla JS (sem framework). Cada página é um arquivo `.html` em `pages/`.
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions).
- **PWA**: Service Worker em `pages/sw.js`, manifest em `/manifest.json`.
- **JS do quiz**: `js/main.js` é gerado — edite os módulos em `js/src/` e rode `bash build/concat.sh`.

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

## Padrões de Código

- **Sem frameworks**: tudo Vanilla JS. Não introduza React, Vue, etc.
- **Sem bundler**: assets são servidos diretamente. A exceção é `js/main.js` (gerado por `build/concat.sh`).
- **`pages/perfil.html`** é uma página monolítica com o script inline — intencional para evitar dependências extras.
- **Dark mode**: controlado por `data-theme` no `<html>` via `js/theme.js`. Use variáveis CSS (`var(--bg)`, `var(--text)`, etc.).
