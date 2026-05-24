# Changelog — MC Guias

## [v10] — 2026-05-24

### Performance
- **SR data em memória** — `getSRData()` passa a cachear o objeto de repetição espaçada em `_srCache`. `updateSRData()` marca dirty e agenda flush via `setTimeout(2000)`. `saveQuizResult()` força flush síncrono ao final do quiz. Elimina N leituras + N escritas de `JSON.parse`/`JSON.stringify` durante o quiz.
- **DOM refs cacheados** — `btnTimer` e `timer-dropdown` capturados uma vez após criação do barra de modos; `.timer-opt-btn` armazenado em NodeList local. Elimina 6+ `getElementById` por clique.
- **`renderHistory` diferido** — chamada envolta em `requestIdleCallback` (fallback `setTimeout 200ms`) para não bloquear a primeira pintura da tela de resultado.
- **Preload de questões** — `QuestionLoader.preloadGuide(guia)` chamado via `requestIdleCallback` após a primeira questão ser renderizada.
- **Guards `_initialized`** — `initTabs()` e `initChecklist()` protegidas por flag de módulo; previne listeners duplicados em re-inicializações.

### Adicionado
- **Dark Mode global** (`js/theme.js`) — detecção de `prefers-color-scheme`, toggle ☀️/🌙 injetado em todas as 44 páginas.
- **Desafios semanais com backend** — tabela `weekly_challenges` no Supabase; 14 desafios sincronizados após cada quiz; merge `Math.max(local, server)` na tela de Conquistas.
- **Certificado de conclusão** — canvas 900×620 px retina, moldura dourada, badge colorido por aproveitamento (≥90% verde, ≥70% azul, <70% âmbar), download automático em PNG.
- **Refatoração modular de `main.js`** — 10 módulos-fonte em `js/src/`; script `build/concat.sh` produz o bundle final `js/main.js` sem alterar nenhum HTML.

### Corrigido
- **Batalha modo misto** — cap por guia (`ceil(n/numGuias)`) evita dominância de guias com banco grande.
- **Guard `_rippleReady`** em batalha — previne acumulação de listeners `pointerdown`.
- **`finishWatcher` leak** — canal Realtime rastreado e limpo corretamente em `goLobby()`.
- **Comparação `parseInt`** no placar de batalha (`parseInt(b.textContent) === 10`).
- **Chave `opts.guia` vs `opts.guide`** em gamificação — aceita ambas.
- Cache SW bumped: `mc-guias-v32` → `mc-guias-v33`.

---

## [v8] — 2026-05-20

### Adicionado
- **McStorage** — abstração de `localStorage` com tratamento de `QuotaExceededError`. Todos os módulos (`main.js`, `gamificacao.js`) migrados para essa camada, eliminando erros silenciosos em dispositivos com pouco armazenamento.
- **Analytics por questão** (`mc_analytics`) — `trackAnswer()` registra tentativas, acertos, erros e tempo de resposta por questão nos modos múltipla escolha, flashcard e lacunas.
- **Dashboard — Seção Análise** — nova seção em `pages/dashboard.html` exibe: total de questões respondidas, taxa de acerto global, tempo médio de resposta e top 5 questões mais difíceis com barra de erro visual.
- **Modo "Revisar só os erros"** — botão na tela de resultado filtra o quiz automaticamente para questões com histórico de erro, ordenadas por taxa de erro (maior → menor).
- **Service Worker — Precaching** — 7 assets críticos pré-cacheados no evento `install` via `PRECACHE_ASSETS`. Cache bumped para `mc-guias-v30`.
- **GitHub Actions CI** (`.github/workflows/validate.yml`) — validação automática dos JSONs de questões em cada push.
- **ESLint** (`.eslintrc.json`) — linting configurado com regras `no-undef` e `no-unused-vars`, globals `McStorage` e `Gamificacao` mapeadas.
- **22 novas conquistas** — total passou de 44 para 66 conquistas: estações do dia (Madrugador, Noturno), jogo perfeito, mestre por guia (Drive-Thru, McFritas, Condimentação), 100% do simulado, milhas (200/500 questões) e mais.

### Alterado
- **Jogo Monte o Sanduíche** — rastreamento de partidas atualizado: `jogosTotais` incrementa em toda partida, `jogosPerfeitos` somente em acerto perfeito. `onJogoComplete` agora recebe `{perfeito, allPlayed}`.
- **README.md** — reescrito com tabelas de tecnologias, badge de CI, estrutura do projeto e instruções de contribuição.

---

## [v7] — 2026-05-10

### Adicionado
- **26 novas perguntas de Best Burger** no simulado geral — cobrindo chapa, UHC, tostadeira, queijo, cebola reidratada, pães, molhos, saleiros, procedimentos e kit de treinamento. Total de perguntas chegou a **697**.
- **5 novas conquistas de Best Burger** — Especialista BB, Mestre do Best Burger, Troféu Best Burger, Expert em Cebola e Padeiro BB.
- **Nova aba Materiais no Guia Best Burger** — Kit de Treinamento completo com 10 itens e preços, Qualidosos 1/2/3, programação da tostadeira HEBT-5V, tabela Chart de ingredientes, procedimento detalhado do tomate e hidratação da cebola com máquina de suco.

### Corrigido
- **Cards do Index** — Best Burger e Assistente IA agora exibem título e descrição legíveis em modo claro e escuro.

---

## [v6] — 2026-05-08

### Adicionado
- **Dashboard unificado** (`pages/dashboard.html`) — estatísticas consolidadas de `mc_quiz_history`, `mc_sr_data` e `gamificacao`. Cards de resumo, gráfico de acertos vs erros por SR, desempenho por guia (pior → melhor), histórico recente (10 últimos) e grade visual de conquistas. Backup unificado exporta e importa todos os dados em um único `.json`.
- **Push Notifications aprimoradas** — lembrete diário às 20h agendado localmente via `setTimeout`, entregue pelo Service Worker (`reg.showNotification`) para maior compatibilidade com Android/iOS. Conquistas desbloqueadas em background também disparam notificação via SW. Fallback para `Notification` API direta quando SW não está ativo.

### Corrigido
- **Bug crítico no Service Worker** — variável `CACHE_NAME` (undefined) no evento `install` substituída por `CACHE`. O SW agora instala sem erros silenciosos. Cache bumped `mc-guias-v27` → `mc-guias-v28`.
- **SW não cacheia mais cross-origin** — requisições para CDNs externos (Google Fonts, etc.) não são mais interceptadas pelo fetch handler, eliminando falhas de cache offline.

### Alterado
- **Roadmap "Em Breve"** atualizado para V12: Dashboard e Lembrete diário marcados como ✅ entregues.
- **Badge de versão** no overlay de atualização atualizado para `mc-guias-v28`.

---

## [v5.26] — 2026-04-30

### Corrigido

* **sw.js** — sistema de atualização PWA reescrito:
  * Cache bumped: `mc-guias-v25` → `mc-guias-v26`
  * Evento `activate` corrigido: `clients.claim()` + `postMessage(SW_UPDATED)`
  * Listener `SKIP_WAITING` adicionado
* **js/main.js** — registro do Service Worker corrigido:
  * `updatefound` → `statechange` (banner só quando realmente pronto)
  * `applyUpdate()` envia `postMessage(SKIP_WAITING)` ao invés de reload direto
  * Listener `SW_UPDATED` adicionado para reload automático após ativação
  * `setInterval` de 60s para checar atualizações periodicamente

---


Todas as alterações relevantes do projeto estão documentadas aqui.  
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [v4] — 2026-04-25

### Adicionado
- **Guia: Validades Secundárias** (`pages/validades-secundarias.html`) — ~90 produtos com Validade Primária, Ambientação, Validade Secundária do Fornecedor e Guia MCD. Inclui busca em tempo real e filtro por segmento (Restaurante, McCafé, Quiosque, Café da Manhã, Break). Dados consolidados dos documentos oficiais "Validades Produtos MCD" e "Validades Secundárias"

### Corrigido
- **Service Worker** atualizado para `mc-guias-v23`: adicionados `validades-secundarias.html`, `provas-testes.html` e `quiz.html` (raiz) que estavam fora do cache offline

---

## [v3] — 2026-03-24

### Corrigido
- **Condimentação — Big Mac:** removida "Cebola reidratada" das duas camadas do Big Mac em `condimentacao.html` (o Big Mac não leva cebola)
- **Quiz condimentacao.html:** corrigidas 3 perguntas que referenciavam cebola reidratada no Big Mac — a que perguntava a quantidade, a que descrevia os andares e a de ordem de montagem
- **Quiz quiz.html (Simulado Geral):** as mesmas 3 perguntas corrigidas no banco central

### Alterado
- **Jogo Monte o Sanduíche (`jogo-condimentacao.html`):** substituídos os 10 sanduíches genéricos/incorretos pelos 9 sanduíches reais da página de condimentação, com ingredientes exatos: Big Mac, Big Tasty, McNífico Bacon, Chicken Deluxe, Chicken Legend, Chicken Bacon Ranch, Brabíssimo Beef, Brabíssimo Frango e Brabíssimo Clubhouse
- "Cebola reidratada" movida para a lista de **distratores** do jogo

### Adicionado
- `CHANGELOG.md` — este arquivo
- `README.md` atualizado com lista completa de guias, funcionalidades e estrutura real do projeto

---

## [v2] — 2026-03-24

### Adicionado
- **Timer configurável:** dropdown para escolher 10s, 15s, 20s ou 30s por pergunta
- **Revisão de erros:** seção colapsável ao final do simulado com perguntas erradas, resposta do usuário, correta e explicação

### Corrigido
- **Bug — Modo Lacunas:** `<input id="lacuna-input">` duplicado no DOM
- **Bug — Histórico Lacunas:** `saveQuizResult()` com argumentos na ordem errada

---

## [v1] — 2026-03-24 (base recebida)

### Estado inicial
- 20 guias operacionais com navegação por abas
- Simulado Geral com 590 perguntas (múltipla escolha, flashcard, lacunas)
- Repetição espaçada, histórico, compartilhamento de resultado
- Jogo Monte o Sanduíche (dados genéricos — corrigido em v3)
- PWA com Service Worker, design responsivo mobile-first
