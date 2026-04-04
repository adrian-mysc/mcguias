/* ── game.js — Monte o Sanduíche (drag & drop, animated) ── */
'use strict';

export const SANDWICHES = [
  { id:'bigmac',           name:'Big Mac',              emoji:'🍔', color:'#DA291C',
    correct:['Pão Big Mac (3 partes)','Carne 10:1 (2x)','Queijo Cheddar (1 fatia)','Picles (2 fatias)','Alface em tiras','Molho Big Mac'] },
  { id:'bigtasty',         name:'Big Tasty',             emoji:'🔥', color:'#c0392b',
    correct:['Pão Tasty','Carne 4:1 (2x)','Queijo Emental (3 fatias)','Tomate (2 fatias)','Alface em tiras','Cebola fresca','Molho Tasty'] },
  { id:'mcnificobacon',    name:'McNífico Bacon',         emoji:'🥓', color:'#8B4513',
    correct:['Pão Quarterão','Carne 4:1','Queijo Cheddar (1 fatia)','Bacon (2 fatias)','Tomate (2 fatias)','Alface em tiras','Maionese','Cebola fresca','Ketchup','Mostarda'] },
  { id:'chickendeluxe',    name:'Chicken Deluxe',         emoji:'🍗', color:'#e67e22',
    correct:['Pão Crispy','Carne Crispy','Tomate (2 fatias)','Alface em tiras','Maionese'] },
  { id:'chickenlegend',    name:'Chicken Legend',         emoji:'🍗', color:'#d35400',
    correct:['Pão Crispy','Carne Crispy','Queijo Cheddar (1 fatia)','Bacon (2 fatias)','Alface em tiras','Cebola Crispy','Molho CBO'] },
  { id:'chickenbaconranch',name:'Chicken Bacon Ranch',    emoji:'🍗', color:'#27ae60',
    correct:['Pão de Batata','Filé de McCrispy','Bacon (3 fatias)','Tomate (2 fatias)','Alface em tiras','Molho Ranch'] },
  { id:'brabissimobeef',   name:'Brabíssimo Beef',        emoji:'⭐', color:'#2c3e50',
    correct:['Pão Brioche','Carne 4:1 (2x)','Queijo Cheddar (2 fatias)','Bacon (3 fatias)','Alface','Cebola Crispy','Molho CBO'] },
  { id:'brabissimofrango', name:'Brabíssimo Frango',      emoji:'⭐', color:'#16a085',
    correct:['Pão Brioche','Carne Chicken (2x)','Queijo Cheddar (2 fatias)','Bacon (3 fatias)','Alface','Cebola Crispy','Molho CBO'] },
  { id:'brabissimoclubhouse',name:'Brabíssimo Clubhouse', emoji:'⭐', color:'#8e44ad',
    correct:['Pão Brioche','Carne 4:1 (2x)','Queijo Emmental (2 fatias)','Bacon (3 fatias)','Tomate (1 fatia)','Alface em tiras','Cebola shoyu','Molho Méquinese','Molho Big Mac'] },
];

// Emoji map for ingredient icons
const ING_EMOJI = {
  'Pão Big Mac (3 partes)':'🍞','Pão Tasty':'🍞','Pão Quarterão':'🍞','Pão Crispy':'🍞','Pão de Batata':'🍞','Pão Brioche':'🥐',
  'Carne 10:1 (2x)':'🥩','Carne 4:1':'🥩','Carne 4:1 (2x)':'🥩','Carne Best Burger':'🥩',
  'Carne Crispy':'🍗','Filé de McCrispy':'🍗','Carne Chicken (2x)':'🍗',
  'Queijo Cheddar (1 fatia)':'🧀','Queijo Cheddar (2 fatias)':'🧀','Queijo Emental (3 fatias)':'🧀','Queijo Emmental (2 fatias)':'🧀',
  'Alface em tiras':'🥬','Alface':'🥬',
  'Tomate (2 fatias)':'🍅','Tomate (1 fatia)':'🍅',
  'Picles (2 fatias)':'🥒',
  'Cebola fresca':'🧅','Cebola Crispy':'🧅','Cebola shoyu':'🧅',
  'Bacon (2 fatias)':'🥓','Bacon (3 fatias)':'🥓',
  'Maionese':'🫙','Ketchup':'🍅','Mostarda':'🟡',
  'Molho Big Mac':'🫙','Molho Tasty':'🫙','Molho CBO':'🫙','Molho Ranch':'🫙','Molho Méquinese':'🫙',
};
function ingEmoji(name) { return ING_EMOJI[name] || '🧂'; }

const ALL_INGREDIENTS = [
  'Pão Big Mac (3 partes)','Pão Tasty','Pão Quarterão','Pão Crispy','Pão de Batata','Pão Brioche',
  'Carne 10:1 (2x)','Carne 4:1','Carne 4:1 (2x)','Carne Crispy','Filé de McCrispy','Carne Chicken (2x)',
  'Queijo Cheddar (1 fatia)','Queijo Cheddar (2 fatias)','Queijo Emental (3 fatias)','Queijo Emmental (2 fatias)',
  'Alface em tiras','Alface','Tomate (1 fatia)','Tomate (2 fatias)','Cebola fresca','Cebola Crispy','Cebola shoyu',
  'Picles (2 fatias)','Bacon (2 fatias)','Bacon (3 fatias)',
  'Molho Big Mac','Molho Tasty','Molho CBO','Molho Ranch','Molho Méquinese',
  'Maionese','Ketchup','Mostarda',
  // Distractors
  'Molho tártaro','Cebola reidratada','Queijo Prato','Pepino em conserva',
];

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function buildPool(sw) {
  const correct=new Set(sw.correct);
  const wrong=ALL_INGREDIENTS.filter(i=>!correct.has(i));
  return shuffle([...sw.correct,...shuffle(wrong).slice(0,Math.min(5,wrong.length))]);
}

let state = { phase:'menu', sandwich:null, selected:new Set(), submitted:false, _pool:[], session:[], score:{perfect:0,played:0} };
let root;

export function initGame(rootEl) {
  root = rootEl || document.getElementById('game-root');
  if (!root) return;
  render();
}

function render() {
  if (state.phase==='menu') renderMenu();
  else renderGame();
}

function renderMenu() {
  const hasSession=state.session.length>0;
  root.innerHTML=`
    <div class="jg-header">
      <div class="jg-header-icon">🍔</div>
      <h2 class="jg-title">Monte o Sanduíche</h2>
      <p class="jg-sub">Selecione todos os ingredientes do sanduíche — sem adicionar nenhum errado</p>
    </div>
    ${hasSession?`<div class="jg-score-bar">Sessão: <strong>${state.score.perfect}</strong> perfeito(s) de <strong>${state.score.played}</strong> jogado(s)</div>`:''}
    <div class="jg-grid">
      ${SANDWICHES.map(s=>{
        const entry=state.session.find(e=>e.id===s.id);
        const badge=!entry?'':entry.perfect?'<span class="jg-badge green">⭐</span>':'<span class="jg-badge yellow">✓</span>';
        return `<button class="jg-card" onclick="window._startGame('${s.id}')" style="--card-accent:${s.color}">
          <span class="jg-card-emoji">${s.emoji}</span>
          <span class="jg-card-name">${s.name}</span>${badge}
        </button>`;
      }).join('')}
    </div>
    <button class="jg-btn-random" onclick="window._startRandom()">🎲 Aleatório</button>`;

  window._startGame = id => { const sw=SANDWICHES.find(s=>s.id===id); state={...state,phase:'playing',sandwich:sw,selected:new Set(),submitted:false,_pool:buildPool(sw)}; render(); };
  window._startRandom = () => { const unplayed=SANDWICHES.filter(s=>!state.session.find(e=>e.id===s.id)); const pool=unplayed.length?unplayed:SANDWICHES; window._startGame(pool[Math.floor(Math.random()*pool.length)].id); };
}

function renderGame() {
  const sw=state.sandwich, pool=state._pool, correct=new Set(sw.correct), sub=state.submitted;

  let feedback='';
  if (sub) {
    const missed=sw.correct.filter(i=>!state.selected.has(i)), wrong=[...state.selected].filter(i=>!correct.has(i)), perfect=!missed.length&&!wrong.length;
    feedback = perfect
      ? `<div class="jg-feedback perfect"><span class="jg-fb-icon">🎉</span><strong>Perfeito!</strong> Todos os ingredientes corretos!</div>`
      : `<div class="jg-feedback wrong">${wrong.length?`<span class="jg-err">❌ ${wrong.length} errado(s)</span> `:''}${missed.length?`<span class="jg-miss">⚠️ ${missed.length} faltando</span>`:''}</div>`;
  }

  const btns=pool.map(ing=>{
    const isSel=state.selected.has(ing), isCorrect=correct.has(ing);
    let cls='jg-ing', extra='';
    if (sub) {
      if (isCorrect&&isSel)  {cls+=' correct'; extra='<span class="jg-check">✓</span>';}
      if (isCorrect&&!isSel) {cls+=' missed';  extra='<span class="jg-check">!</span>';}
      if (!isCorrect&&isSel) {cls+=' wrong-sel';extra='<span class="jg-check">✗</span>';}
    } else if (isSel) cls+=' selected';
    return `<button class="${cls}" onclick="window._toggleIng('${ing.replace(/'/g,"\\'")}');void 0" ${sub?'disabled':''}>${ingEmoji(ing)} ${ing}${extra}</button>`;
  }).join('');

  const chosen=state.selected.size;
  const confirmBtn=!sub
    ? `<button class="jg-btn-confirm${chosen===0?' disabled':''}" onclick="window._confirmSel()" ${chosen===0?'disabled':''}>Confirmar seleção (${chosen} selecionado${chosen!==1?'s':''})</button>`
    : `<div class="jg-after-btns"><button class="jg-btn-next" onclick="window._nextSw()">Próximo →</button><button class="jg-btn-replay" onclick="window._startGame('${sw.id}')">🔄 Repetir</button><button class="jg-btn-menu" onclick="window._goMenu()">🏠 Menu</button></div>`;

  root.innerHTML=`
    <div class="jg-game-top">
      <button class="jg-back" onclick="window._goMenu()">← Voltar</button>
      <span class="jg-game-name">${sw.emoji} ${sw.name}</span>
    </div>
    <div class="jg-instruction">Toque em <strong>todos</strong> os ingredientes deste sanduíche</div>
    <div class="jg-ings-wrap">${btns}</div>
    ${feedback}
    ${confirmBtn}
    ${sub?`<div class="jg-recipe-box"><div class="jg-recipe-title">📋 Composição oficial</div><div class="jg-recipe-list">${sw.correct.map(i=>`<span class="jg-recipe-item">${ingEmoji(i)} ${i}</span>`).join('')}</div></div>`:''}`;

  window._toggleIng=ing=>{if(state.submitted)return;if(state.selected.has(ing))state.selected.delete(ing);else state.selected.add(ing);renderGame();};
  window._confirmSel=()=>{if(!state.selected.size)return;const correct2=new Set(sw.correct),missed=sw.correct.filter(i=>!state.selected.has(i)),wrong=[...state.selected].filter(i=>!correct2.has(i)),perfect=!missed.length&&!wrong.length;state.submitted=true;const ex=state.session.find(e=>e.id===sw.id);if(!ex){state.session.push({id:sw.id,perfect});state.score.played++;if(perfect)state.score.perfect++;}else if(perfect&&!ex.perfect){ex.perfect=true;state.score.perfect++;}renderGame();};
  window._nextSw=()=>{const idx=SANDWICHES.findIndex(s=>s.id===sw.id);window._startGame(SANDWICHES[(idx+1)%SANDWICHES.length].id);};
  window._goMenu=()=>{state.phase='menu';render();};
}
