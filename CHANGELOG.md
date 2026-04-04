# Changelog — MC Guias

Todas as alterações relevantes do projeto estão documentadas aqui.  
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [v3] — 2026-03-24

### Corrigido
- **Condimentação — Big Mac:** removida "Cebola reidratada" das duas camadas do Big Mac em `condimentacao.html` (o Big Mac não leva cebola)
- **Quiz condimentacao.html:** corrigidas 3 perguntas que referenciavam cebola reidratada no Big Mac — a que perguntava a quantidade, a que descrevia os andares e a de ordem de montagem
- **Quiz quiz.html (Simulado Geral):** as mesmas 3 perguntas corrigidas no banco central

### Alterado
- **Jogo Monte o Sanduíche (`jogo-condimentacao.html`):** substituídos os 10 sanduíches genéricos/incorretos pelos 9 sanduíches reais da página de condimentação, com ingredientes exatos:
  - Big Mac, Big Tasty, McNífico Bacon
  - Chicken Deluxe, Chicken Legend, Chicken Bacon Ranch
  - Brabíssimo Beef, Brabíssimo Frango, Brabíssimo Clubhouse
- "Cebola reidratada" movida para a lista de **distratores** do jogo (opção errada, nunca ingrediente correto)

### Adicionado
- `CHANGELOG.md` — este arquivo
- `README.md` atualizado com lista completa de guias, funcionalidades e estrutura real do projeto

---

## [v2] — 2026-03-24

### Adicionado
- **Timer configurável:** o botão de timer do quiz foi expandido com um dropdown que permite escolher o tempo por pergunta — 10s, 15s, 20s ou 30s (anteriormente fixo em 20s)
- **Revisão de erros:** ao finalizar um simulado de múltipla escolha, exibe seção colapsável com todas as perguntas erradas, a resposta do usuário, a resposta correta e a explicação. Erros por tempo esgotado também são capturados

### Corrigido (v2)
- **Bug — Modo Lacunas:** tag `<input id="lacuna-input">` estava duplicada no HTML gerado, causando comportamento imprevisível ao digitar
- **Bug — Histórico Lacunas:** `saveQuizResult()` era chamada com argumentos na ordem errada `(score, total, guia)` em vez de `(guia, score, total)`, corrompendo o histórico após completar o modo Lacunas

---

## [v1] — 2026-03-24 (base recebida)

### Estado inicial
- 20 guias operacionais com navegação por abas
- Simulado Geral com 590 perguntas
- Modos de quiz: múltipla escolha, flashcard e lacunas
- Repetição espaçada (spaced repetition)
- Histórico de simulados
- Compartilhamento de resultado
- Jogo Monte o Sanduíche (dados ainda genéricos — corrigido em v3)
- PWA com Service Worker cobrindo todos os guias para uso offline
- Design responsivo mobile-first
