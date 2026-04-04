# 🍔 MC Guias — Estudo Operacional

[![GitHub Pages](https://img.shields.io/badge/Site%20Online-Visit-brightgreen?style=flat&logo=github)](https://adrian-mysc.github.io/guiaoperacional)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![HTML](https://img.shields.io/badge/HTML-94.5%25-orange)](https://github.com/adrian-mysc/guiaoperacional)
[![PWA](https://img.shields.io/badge/PWA-Instalável-blue)](https://adrian-mysc.github.io/guiaoperacional)

**Site de estudo pessoal** baseado nos guias rápidos operacionais de um fast-food fictício (estilo McDonald's).  
Feito por **Adrian E. Silva** para facilitar o treinamento e a memorização de procedimentos.


### ✨ Funcionalidades

- ✅ Navegação por abas com persistência (`sessionStorage`)
- ✅ Checklists interativos salvos no navegador (`localStorage`)
- ✅ Simulado Geral com **590+ perguntas** (múltipla escolha, flashcard e lacunas)
- ✅ Timer configurável (10s a 30s)
- ✅ Revisão de erros + repetição espaçada
- ✅ Histórico de simulados e compartilhamento de resultados
- ✅ Jogo “Monte o Sanduíche” (9 sanduíches)
- ✅ Totalmente responsivo (celular e desktop)
- ✅ **PWA instalável** — funciona 100% offline

### 🗂️ Guias Disponíveis

| Guia                        | Abas | Foco Principal                     |
|-----------------------------|------|------------------------------------|
| Chapa                       | 5    | Temperaturas, carnes, limpeza     |
| LOPE / LOPE 2               | 9+7  | Apoio e preparação                 |
| Linha                       | 4    | Qualidade e procedimento           |
| McFritas & Produtos Fritos  | 5+4  | Preparação e fritos                |
| Condimentação               | 5    | Clássicos, Chicken, Brabíssimo     |
| Salão e NGK                 | 6    | Atendimento e limpeza              |
| Montagem e Entrega          | 5    | R2P e entrega                      |
| Drive-Thru                  | 6    | COD, tablet, Meu Méqui             |
| McCafé                      | 6    | Equipamentos e bebidas             |
| Limpeza e Sanitização       | 7    | Todos os equipamentos              |
| Fechamento                  | 8    | Procedimentos de final de turno    |
| ... e mais 8 guias          | —    | Treinadores, Supervisores, etc.    |

**Simulado Geral** com filtro por guia + **Jogo Monte o Sanduíche**

### 🚀 Como usar

1. Acesse: https://adrian-mysc.github.io/guiaoperacional
2. Instale como app no celular (ícone “Adicionar à tela inicial”)
3. Estude offline sem problemas

### 🛠️ Como adicionar um novo guia (para contribuidores)

1. Copie `pages/chapa.html` → `pages/novo-guia.html`
2. Adicione o card na `index.html`
3. Inclua as perguntas no array `ALL_QUESTIONS` em `pages/quiz.html`
4. Adicione o botão de filtro no quiz
5. Registre o novo arquivo no `sw.js` (cache)

### Tecnologias

- HTML5, CSS3, Vanilla JavaScript
- PWA (Manifest + Service Worker)
- localStorage / sessionStorage
- Totalmente estático (GitHub Pages)

### Licença

Este projeto está sob a licença **MIT** — sinta-se à vontade para estudar, modificar e usar como base.

*Material de estudo pessoal. Não é oficial e não substitui treinamentos da empresa.*

---


## 📖 Guias Disponíveis

| Guia | Conteúdo | Abas |
|------|----------|------|
| 🔥 Chapa | Temperaturas, carnes, bacon, limpeza | 5 |
| 🥬 LOPE | Pré-pico, cebola, tomate, queijo, alface, bacon, rota ¼h | 9 |
| 🧺 LOPE 2 — Apoio | Panos, bacon, cebola cheddar, suco/gelo, lixeiras | 7 |
| 📋 Linha | Visão geral, qualidade, procedimento | 4 |
| 🍟 McFritas | Visão geral, preparação | 3 |
| 🍟 McFritas & Fritos | McFritas, fritos, tortas | 5 |
| 🍗 Produtos Fritos | Frango, tortas | 4 |
| 🧂 Condimentação | Clássicos, Chicken, Brabíssimo, Outros | 5 |
| 🪑 Salão e NGK | NGK, salão, limpeza, método preparo | 6 |
| 🛎️ Montagem e Entrega | Montagem, entrega, R2P | 5 |
| 🗣️ Influencer Vendedor | Influencer, pagamento, Meu Méqui | 5 |
| 🚗 Drive-Thru | COD, tablet, caixa, Meu Méqui | 6 |
| 🥤 Bebidas e Sobremesas | Sobremesas, McShake, bebidas, Dessert Center | 7 |
| 📦 McDelivery | Carrinho, procedimento | 4 |
| ☕ McCafé | Café, bebidas, salgados/doces, equipamentos | 6 |
| 🧹 Limpeza e Sanitização | Chapa, tostadeira, salão, pista drive, produtos | 7 |
| 🔒 Fechamento | Fritadeiras, chapa, tostadeira, utensílios, estoque | 8 |
| 🏅 Promoção Interna | — | 7 |
| 🎓 Treinadores | Conteúdo para treinadores | 8 |
| 📊 Supervisores | Conteúdo para supervisores | 6 |
| 🎯 Simulado Geral | 590 perguntas com filtro por guia | — |
| 🍔 Monte o Sanduíche | Jogo de condimentação com 9 sanduíches | — |

## ✨ Funcionalidades

- **Navegação por abas** em cada guia com persistência via `sessionStorage`
- **Checklists interativos** com marcação persistente via `localStorage`
- **Quiz — Múltipla escolha** com perguntas embaralhadas, feedback e explicações
- **Quiz — Flashcard** com revelação por toque e embaralhamento
- **Quiz — Lacunas** (fill-in-the-blank) para respostas numéricas
- **Timer configurável** por pergunta: 10s, 15s, 20s ou 30s
- **Revisão de erros** ao final do simulado, com resposta correta e explicação
- **Repetição espaçada** (spaced repetition): questões com mais erros aparecem primeiro
- **Histórico de simulados** com pontuação e data
- **Compartilhamento de resultado** via Web Share API ou clipboard
- **Jogo Monte o Sanduíche** com 9 sanduíches da condimentação
- **Simulado Geral** com 590 perguntas e filtro por guia
- **Design responsivo** para celular e desktop
- **PWA instalável** — funciona offline via Service Worker

## 🔧 Adicionando um Novo Guia

1. Crie `pages/nome-guia.html` copiando a estrutura de `chapa.html` ou `lope.html`
2. Adicione o card na grade de guias em `index.html`
3. Adicione as perguntas do novo guia em `pages/quiz.html` no array `ALL_QUESTIONS`
4. Adicione o botão de filtro correspondente em `pages/quiz.html`
5. Registre o novo arquivo no cache do `sw.js`

---

*Material de estudo pessoal. Não oficial.*
