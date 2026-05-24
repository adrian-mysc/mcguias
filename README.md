# 🍔 MC Guias — Estudo Operacional

[![GitHub Pages](https://img.shields.io/badge/Site%20Online-Visit-brightgreen?style=flat&logo=github)](https://adrian-mysc.github.io/guiaoperacional)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Instalável-blue)](https://adrian-mysc.github.io/guiaoperacional)
[![CI](https://img.shields.io/github/actions/workflow/status/adrian-mysc/mcguias/validate.yml?label=CI)](https://github.com/adrian-mysc/mcguias/actions)

**Plataforma de estudos sem fins lucrativos** baseada nos guias rápidos de um fast-food.  
Feita para facilitar o estudo e a memorização de procedimentos — funciona 100% offline como PWA instalável.

---

## ✨ Funcionalidades

### Quiz e Aprendizado
- **Simulado Geral** com 590+ perguntas e filtro por guia
- **3 modos de estudo**: múltipla escolha, flashcard e lacunas (fill-in-the-blank)
- **Timer configurável** por pergunta: 10s, 15s, 20s ou 30s
- **Repetição espaçada** (SM-2): questões com mais erros aparecem com prioridade
- **Revisão de erros**: botão "Revisar só os erros" na tela de resultado, ordenado por taxa de erro
- **Validação fuzzy** nas lacunas: "10:30" = "10min30s", com feedback mostrando a normalização aplicada
- **Auto-avançar** após acerto com barra de progresso visual
- **Streak de acertos** com toasts animados (3, 5, 10, 15, 20 seguidas)
- **Histórico de simulados** com pontuação, data e compartilhamento

### Dashboard e Analytics
- **Dashboard unificado** com resumo geral, acertos vs. erros e desempenho por guia
- **Análise por questão**: top 5 questões mais difíceis com taxa de erro e tempo médio de resposta
- Rastreamento de analytics por questão (`mc_analytics`): tentativas, acertos, erros e tempo médio
- Backup e restauração completa dos dados (inclui analytics)

### Gamificação
- **35+ conquistas** desbloqueáveis por categoria
- **Desafios semanais com backend** — 14 desafios sincronizados no Supabase
- **Sistema de XP** e pontuação por questão
- **Jogo "Monte o Sanduíche"** com 9 sanduíches e ingredientes reais
- **Certificado de conclusão** em PNG para quizzes com ≥ 70% de acerto

### Guias Operacionais
- **20+ guias** com navegação por abas e persistência via `sessionStorage`
- **Checklists interativos** com progresso visual e persistência via `localStorage`
- Guias: Chapa, LOPE, Linha, McFritas, Condimentação, Drive-Thru, McCafé, Limpeza, Fechamento e mais

### PWA e Performance
- **100% offline** via Service Worker com precaching de assets críticos (HTML, CSS, JS, manifest)
- **Instalável** como app no celular e desktop
- **Push notifications** com lembrete diário de estudo
- Página offline exibe guias disponíveis em cache
- **Dark Mode** com detecção automática de `prefers-color-scheme` e toggle persistido

### Performance (v10)
- SR data em cache de memória — sem JSON.parse/stringify a cada resposta
- DOM refs cacheados no loop do quiz — sem `getElementById` repetido
- `renderHistory` e preload de questões diferidos via `requestIdleCallback`

---

## 🗂️ Guias Disponíveis

| Guia | Conteúdo | Abas |
|------|----------|------|
| 🔥 Chapa | Temperaturas, carnes, bacon, limpeza | 5 |
| 🥬 LOPE / LOPE 2 | Pré-pico, cebola, tomate, queijo, rota | 9 / 7 |
| 📋 Linha | Visão geral, qualidade, procedimento | 4 |
| 🍟 McFritas & Fritos | McFritas, frango, tortas | 5 / 4 |
| 🧂 Condimentação | Clássicos, Chicken, Brabíssimo | 5 |
| 🪑 Salão e NGK | NGK, salão, limpeza | 6 |
| 🛎️ Montagem e Entrega | Montagem, entrega, R2P | 5 |
| 🚗 Drive-Thru | COD, tablet, caixa, Meu Méqui | 6 |
| 🥤 Bebidas e Sobremesas | McShake, bebidas, Dessert Center | 7 |
| ☕ McCafé | Café, bebidas, equipamentos | 6 |
| 🧹 Limpeza e Sanitização | Chapa, tostadeira, salão, drive | 7 |
| 🔒 Fechamento | Fritadeiras, chapa, estoque | 8 |
| 🏅 Promoção Interna | Crescimento e especialização | 7 |
| 🎓 Treinadores / Supervisores | Conteúdo avançado | 8 / 6 |
| … e mais 6 guias | Segurança, Estoque, Validades, etc. | — |

---

## 🛠️ Tecnologias

### Frontend
| Tecnologia | Uso |
|-----------|-----|
| HTML5 + CSS3 | 44 páginas, design system com variáveis CSS, dark mode via `[data-theme]` |
| Vanilla JavaScript (ES6) | Sem framework — bundle gerado por `build/concat.sh` a partir de `js/src/` |
| Web Audio API | Sons de feedback gerados em tempo real (sem arquivos externos) |
| Web Share API | Compartilhamento de resultados com fallback para clipboard |

### Armazenamento
| Tecnologia | Uso |
|-----------|-----|
| `McStorage` (wrapper interno) | Abstração do `localStorage` com tratamento de `QuotaExceededError` |
| `localStorage` | Histórico de quizzes, SR data, analytics, checklists, preferências |
| `sessionStorage` | Estado de abas por página |

### PWA
| Tecnologia | Uso |
|-----------|-----|
| Service Worker | Cache network-first, precaching de assets críticos, push notifications |
| Web App Manifest | Instalação como app standalone |
| Cache API | Estratégia offline-first com fallback |

### Qualidade e CI
| Tecnologia | Uso |
|-----------|-----|
| GitHub Actions | Validação automática dos JSONs de questões em cada push |
| ESLint | Linting com regras mínimas (`no-undef`, `no-unused-vars`) |
| `js/tools/validateQuestions.js` | Script de validação local dos dados |

---

## 🚀 Como usar

1. Acesse: **https://adrian-mysc.github.io/guiaoperacional**
2. No celular: Chrome → Menu ⋮ → **"Adicionar à tela inicial"** para instalar como app
3. Estude offline sem problemas — o conteúdo fica em cache automaticamente

---

## 🛠️ Desenvolvimento do JavaScript

O arquivo `js/main.js` é **gerado** — nunca edite diretamente. Edite os módulos em `js/src/` e regenere:

```bash
bash build/concat.sh
```

| Módulo | Responsabilidade |
|--------|-----------------|
| `storage.js` | McStorage, migrations, trackAnswer |
| `audio.js` | Web Audio sound engine |
| `stats.js` | renderStats, initTabs, initChecklist, saveQuizResult |
| `srs.js` | Spaced Repetition: getSRData, updateSRData, prioritizeQuestions |
| `quiz.js` | initQuiz (múltipla escolha completo) |
| `flashcard.js` | initFlashcard + shuffle |
| `utils.js` | Certificado, compartilhar, clipboard, toast |
| `lacunas.js` | initLacuna + normalizeAnswer + answersMatch |
| `onboarding.js` | initOnboarding (carousel de boas-vindas) |
| `sw-init.js` | applyUpdate, DOMContentLoaded, Service Worker |

---

## 🔧 Adicionando um Novo Guia

1. Crie `pages/nome-guia.html` copiando a estrutura de `chapa.html`
2. Adicione o card na grade de guias em `index.html`
3. Crie `data/questions/nome-guia/basico.json` com as perguntas no formato padrão
4. Adicione o botão de filtro correspondente em `pages/quiz.html`
5. Execute `node js/tools/validateQuestions.js` para validar os dados

---

## 📦 Estrutura do Projeto

```
mcguias/
├── index.html              # Página inicial
├── pages/                  # 42 guias e páginas auxiliares
├── js/
│   ├── main.js             # Bundle gerado — NÃO editar diretamente
│   ├── src/                # Módulos-fonte (edite aqui, rode build/concat.sh)
│   │   ├── storage.js      #   McStorage, migrations, trackAnswer
│   │   ├── audio.js        #   Web Audio sound engine
│   │   ├── stats.js        #   renderStats, initTabs, initChecklist, saveQuizResult
│   │   ├── srs.js          #   Spaced Repetition (getSRData, updateSRData)
│   │   ├── quiz.js         #   initQuiz (múltipla escolha)
│   │   ├── flashcard.js    #   initFlashcard + shuffle
│   │   ├── utils.js        #   Certificado, compartilhar, clipboard, toast
│   │   ├── lacunas.js      #   initLacuna + normalizeAnswer
│   │   ├── onboarding.js   #   initOnboarding
│   │   └── sw-init.js      #   applyUpdate, DOMContentLoaded, SW registration
│   ├── theme.js            # Dark mode toggle global
│   ├── gamificacao.js      # Conquistas, desafios e XP
│   ├── game.js             # Jogo Monte o Sanduíche
│   ├── learning/           # Módulos: adaptiveQuiz, spacedRepetition, weaknessMap
│   ├── supabase/           # Integração backend (auth, sync, ranking)
│   └── tools/              # validateQuestions, generateIndexes, autoTag
├── build/
│   └── concat.sh           # Gera js/main.js a partir de js/src/
├── data/questions/         # JSONs de questões por guia e nível
├── css/styles.css          # Design system
├── sw.js                   # Service Worker
├── manifest.json           # PWA manifest
└── .github/workflows/      # CI: validação de questões
```

---

## 📄 Licença

Este projeto está sob a licença **MIT** — sinta-se à vontade para estudar, modificar e usar como base.

*Material de estudo pessoal. Não é oficial e não substitui treinamentos da empresa.*
