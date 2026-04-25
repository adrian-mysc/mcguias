# Changelog — MC Guias

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
